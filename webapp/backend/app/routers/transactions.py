"""Transaction submission and history."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from app.database import get_db
from app.models import User, Card, CardStatus, Transaction, FraudAlert, AlertStatus, NotificationPreference
from app.schemas import TransactionIn, TransactionOut
from app.auth import get_current_user
from app.ml_service import score_transaction
from app.notifications import send_in_app, send_fraud_alert_email
from app.websocket_manager import manager

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.post("", response_model=TransactionOut, status_code=201)
async def submit_transaction(
    body: TransactionIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validate card ownership
    result = await db.execute(
        select(Card).where(Card.id == body.card_id, Card.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")
    if card.status == CardStatus.BLOCKED:
        raise HTTPException(403, "Card is blocked")

    # Score the transaction
    txn_data = {
        "user_id": user.id,
        "amount": body.amount,
        "merchant_name": body.merchant_name,
        "merchant_category": body.merchant_category,
        "ip_address": body.ip_address,
        "device_id": body.device_id,
        "user_agent": body.user_agent,
        "latitude": body.latitude,
        "longitude": body.longitude,
        "country": body.country,
        "bin_prefix": card.bin_prefix,
        "ml_features": body.ml_features,
    }
    score_result = score_transaction(txn_data)

    txn = Transaction(
        card_id=card.id,
        user_id=user.id,
        amount=body.amount,
        merchant_name=body.merchant_name,
        merchant_category=body.merchant_category,
        ip_address=body.ip_address,
        device_id=body.device_id,
        user_agent=body.user_agent,
        latitude=body.latitude,
        longitude=body.longitude,
        country=body.country,
        fraud_score=score_result["fraud_score"],
        risk_level=score_result["risk_level"],
        is_fraud=score_result["risk_level"] == "HIGH",
        ml_features=body.ml_features,
    )
    db.add(txn)
    await db.flush()

    # Create alert for MEDIUM/HIGH risk
    if score_result["risk_level"] in ("MEDIUM", "HIGH"):
        alert = FraudAlert(
            user_id=user.id,
            card_id=card.id,
            transaction_id=txn.id,
            fraud_score=score_result["fraud_score"],
            risk_level=score_result["risk_level"],
            reason=score_result["reason"],
            status=AlertStatus.PENDING,
        )
        db.add(alert)
        await db.flush()

        # Check notification prefs
        pref_result = await db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user.id)
        )
        prefs = pref_result.scalar_one_or_none()

        if prefs and prefs.in_app_alerts:
            await send_in_app(
                user.id, alert.id, score_result["risk_level"],
                body.amount, score_result["reason"], score_result["fraud_score"],
            )
        if prefs and prefs.email_alerts:
            send_fraud_alert_email(
                user.email, body.amount, body.merchant_name,
                score_result["risk_level"], score_result["fraud_score"], score_result["reason"],
            )

    # Push live transaction update over WebSocket
    await manager.send_to_user(user.id, {
        "type": "TRANSACTION_UPDATE",
        "transaction": {
            "id": txn.id,
            "amount": txn.amount,
            "merchant_name": txn.merchant_name,
            "country": txn.country,
            "risk_level": txn.risk_level,
            "fraud_score": txn.fraud_score,
            "timestamp": txn.timestamp.isoformat(),
        }
    })
    return txn


@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user.id)
        .order_by(desc(Transaction.timestamp))
        .limit(limit).offset(offset)
    )
    return result.scalars().all()


@router.get("/live", response_model=list[TransactionOut])
async def live_transactions(
    since: str = Query(None, description="ISO timestamp — return only newer transactions"),
    limit: int = Query(20, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Polling endpoint — returns transactions newer than `since`."""
    q = select(Transaction).where(Transaction.user_id == user.id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            q = q.where(Transaction.timestamp > since_dt)
        except ValueError:
            pass
    q = q.order_by(desc(Transaction.timestamp)).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/velocity", tags=["transactions"])
async def velocity_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Live velocity counters for the dashboard."""
    now = datetime.utcnow()
    w10 = now - timedelta(minutes=10)
    w60 = now - timedelta(hours=1)
    w1440 = now - timedelta(hours=24)

    async def count_and_sum(since):
        r = await db.execute(
            select(func.count(), func.coalesce(func.sum(Transaction.amount), 0))
            .where(Transaction.user_id == user.id, Transaction.timestamp >= since)
        )
        return r.one()

    c10, s10 = await count_and_sum(w10)
    c60, s60 = await count_and_sum(w60)
    c1440, s1440 = await count_and_sum(w1440)

    # Thresholds (match fraud rules)
    return {
        "last_10min": {"count": c10, "amount": float(s10), "alert": c10 >= 5},
        "last_1hour": {"count": c60, "amount": float(s60), "alert": float(s60) >= 2000},
        "last_24hours": {"count": c1440, "amount": float(s1440), "alert": float(s1440) >= 5000},
    }
