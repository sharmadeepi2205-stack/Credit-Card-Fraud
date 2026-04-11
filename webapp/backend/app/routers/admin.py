"""Admin portal — analytics, case management, fraud rules, audit logs, reports."""
import csv
import io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.database import get_db
from app.models import (
    User, Transaction, FraudAlert, FraudRule, AuditLog,
    AlertStatus, RiskLevel, AuditAction
)
from app.schemas import (
    FraudRuleCreate, FraudRuleOut, AlertOut, AlertResolve,
    DailyStats, ModelMetrics, TopMerchant, TopCountry
)
from app.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Analytics ──────────────────────────────────────────────────────────────────

@router.get("/stats/daily", response_model=list[DailyStats])
async def daily_stats(
    days: int = Query(30, le=90),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    since = datetime.utcnow() - timedelta(days=days)
    txn_result = await db.execute(
        select(
            func.date(Transaction.timestamp).label("date"),
            func.count().label("total"),
        )
        .where(Transaction.timestamp >= since)
        .group_by(func.date(Transaction.timestamp))
        .order_by(func.date(Transaction.timestamp))
    )
    alert_result = await db.execute(
        select(
            func.date(FraudAlert.created_at).label("date"),
            func.count().label("alerts"),
        )
        .where(FraudAlert.created_at >= since)
        .group_by(func.date(FraudAlert.created_at))
    )
    alert_map = {str(r.date): r.alerts for r in alert_result}
    stats = []
    for row in txn_result:
        date_str = str(row.date)
        alerts = alert_map.get(date_str, 0)
        stats.append(DailyStats(
            date=date_str,
            total_transactions=row.total,
            fraud_alerts=alerts,
            fraud_rate=round(alerts / row.total, 4) if row.total else 0.0,
        ))
    return stats


@router.get("/stats/top-merchants", response_model=list[TopMerchant])
async def top_merchants(
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Transaction.merchant_name, func.count().label("cnt"))
        .join(FraudAlert, FraudAlert.transaction_id == Transaction.id)
        .where(Transaction.merchant_name.isnot(None))
        .group_by(Transaction.merchant_name)
        .order_by(desc("cnt"))
        .limit(limit)
    )
    return [TopMerchant(merchant_name=r.merchant_name, alert_count=r.cnt) for r in result]


@router.get("/stats/top-countries", response_model=list[TopCountry])
async def top_countries(
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(
        select(Transaction.country, func.count().label("cnt"))
        .join(FraudAlert, FraudAlert.transaction_id == Transaction.id)
        .where(Transaction.country.isnot(None))
        .group_by(Transaction.country)
        .order_by(desc("cnt"))
        .limit(limit)
    )
    return [TopCountry(country=r.country, alert_count=r.cnt) for r in result]


@router.get("/stats/model-metrics", response_model=ModelMetrics)
async def model_metrics(_: User = Depends(require_admin)):
    """Return pre-computed or live model metrics."""
    try:
        import sys, os
        sys.path.insert(0, os.path.abspath("../../../"))
        from fraud_detection_app.predict import load_model
        from fraud_detection_app.data_preprocessing import load_data, preprocess_data
        import numpy as np
        from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score

        model, scaler, features = load_model()
        csv_path = os.path.abspath("../../../data/creditcard.csv")
        df = load_data(csv_path)
        data = preprocess_data(df)
        y_pred = model.predict(data["X_test"])
        y_proba = model.predict_proba(data["X_test"])[:, 1]
        fp = int(((y_pred == 1) & (data["y_test"] == 0)).sum())
        tn = int(((y_pred == 0) & (data["y_test"] == 0)).sum())
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        return ModelMetrics(
            precision=round(precision_score(data["y_test"], y_pred), 4),
            recall=round(recall_score(data["y_test"], y_pred), 4),
            f1=round(f1_score(data["y_test"], y_pred), 4),
            roc_auc=round(roc_auc_score(data["y_test"], y_proba), 4),
            false_positive_rate=round(fpr, 4),
        )
    except Exception:
        return ModelMetrics(precision=0, recall=0, f1=0, roc_auc=0, false_positive_rate=0)


# ── Case management ────────────────────────────────────────────────────────────

@router.get("/cases", response_model=list[AlertOut])
async def list_cases(
    status: str = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(FraudAlert)
    if status:
        q = q.where(FraudAlert.status == status)
    q = q.order_by(desc(FraudAlert.created_at)).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/cases/{alert_id}", response_model=AlertOut)
async def review_case(
    alert_id: str,
    body: AlertResolve,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(FraudAlert).where(FraudAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Case not found")
    alert.status = body.status
    alert.tag = body.tag
    alert.reviewed_by = admin.id
    alert.resolved_at = datetime.utcnow()
    db.add(AuditLog(user_id=admin.id, action=AuditAction.CASE_CLOSED,
                    target_id=alert_id, details={"status": body.status, "tag": body.tag}))
    return alert


# ── Fraud rules ────────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[FraudRuleOut])
async def list_rules(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(FraudRule))
    return result.scalars().all()


@router.post("/rules", response_model=FraudRuleOut, status_code=201)
async def create_rule(
    body: FraudRuleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    rule = FraudRule(**body.model_dump(), created_by=admin.id)
    db.add(rule)
    await db.flush()
    db.add(AuditLog(user_id=admin.id, action=AuditAction.RULE_CHANGED,
                    target_id=rule.id, details={"action": "created", "name": rule.name}))
    return rule


@router.patch("/rules/{rule_id}", response_model=FraudRuleOut)
async def update_rule(
    rule_id: str,
    body: FraudRuleCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(FraudRule).where(FraudRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    for k, v in body.model_dump().items():
        setattr(rule, k, v)
    db.add(AuditLog(user_id=admin.id, action=AuditAction.RULE_CHANGED,
                    target_id=rule_id, details={"action": "updated"}))
    return rule


# ── Export ─────────────────────────────────────────────────────────────────────

@router.get("/export/alerts")
async def export_alerts_csv(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(FraudAlert).order_by(desc(FraudAlert.created_at)))
    alerts = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "user_id", "card_id", "fraud_score", "risk_level",
                     "status", "reason", "tag", "created_at", "resolved_at"])
    for a in alerts:
        writer.writerow([a.id, a.user_id, a.card_id, a.fraud_score, a.risk_level,
                         a.status, a.reason, a.tag, a.created_at, a.resolved_at])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fraud_alerts.csv"},
    )
