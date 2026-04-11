"""Model metrics, version history, drift stats."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models import Transaction, FraudAlert, User
from app.auth import require_admin

router = APIRouter(prefix="/api/model", tags=["model"])


class DriftStat(BaseModel):
    feature: str
    mean_recent: float
    mean_baseline: float
    drift_pct: float


@router.get("/metrics")
async def get_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Compute live model metrics from stored transactions."""
    result = await db.execute(select(Transaction))
    txns = result.scalars().all()

    if not txns:
        return {"precision": 0, "recall": 0, "f1": 0, "auc_roc": 0,
                "false_positive_rate": 0, "total": 0}

    tp = sum(1 for t in txns if t.is_fraud and t.risk_level == "HIGH")
    fp = sum(1 for t in txns if not t.is_fraud and t.risk_level == "HIGH")
    fn = sum(1 for t in txns if t.is_fraud and t.risk_level != "HIGH")
    tn = sum(1 for t in txns if not t.is_fraud and t.risk_level != "HIGH")

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "auc_roc": round((precision + recall) / 2, 4),  # approximation
        "false_positive_rate": round(fpr, 4),
        "total": len(txns),
        "fraud_count": sum(1 for t in txns if t.is_fraud),
        "tp": tp, "fp": fp, "fn": fn, "tn": tn,
    }


@router.get("/history")
async def model_history(_: User = Depends(require_admin)):
    """Mock model version history."""
    return [
        {"version": "v1.0", "trained_at": "2026-01-15", "dataset_size": 284807,
         "precision": 0.91, "recall": 0.78, "f1": 0.84, "auc_roc": 0.97, "is_active": False},
        {"version": "v1.1", "trained_at": "2026-02-20", "dataset_size": 284807,
         "precision": 0.93, "recall": 0.81, "f1": 0.87, "auc_roc": 0.98, "is_active": False},
        {"version": "v2.0", "trained_at": "2026-03-10", "dataset_size": 312000,
         "precision": 0.95, "recall": 0.83, "f1": 0.89, "auc_roc": 0.99, "is_active": True},
    ]


@router.get("/drift")
async def drift_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Compare recent vs baseline transaction feature distributions."""
    cutoff = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(select(Transaction))
    all_txns = result.scalars().all()

    recent = [t for t in all_txns if t.timestamp and t.timestamp > cutoff]
    baseline = [t for t in all_txns if t.timestamp and t.timestamp <= cutoff]

    if not recent or not baseline:
        return []

    def safe_mean(lst):
        return round(sum(lst) / len(lst), 2) if lst else 0

    r_amounts = [t.amount for t in recent]
    b_amounts = [t.amount for t in baseline]
    r_scores = [t.fraud_score for t in recent if t.fraud_score]
    b_scores = [t.fraud_score for t in baseline if t.fraud_score]

    stats = []
    for feat, r_vals, b_vals in [
        ("amount", r_amounts, b_amounts),
        ("fraud_score", r_scores, b_scores),
    ]:
        rm, bm = safe_mean(r_vals), safe_mean(b_vals)
        drift = round(abs(rm - bm) / (bm or 1) * 100, 1)
        stats.append({"feature": feat, "mean_recent": rm,
                      "mean_baseline": bm, "drift_pct": drift})
    return stats


@router.post("/retrain")
async def trigger_retrain(_: User = Depends(require_admin)):
    """Trigger model retraining (mock — returns job ID)."""
    import uuid
    return {"job_id": str(uuid.uuid4()), "status": "queued",
            "message": "Retraining job queued. Check back in ~5 minutes."}
