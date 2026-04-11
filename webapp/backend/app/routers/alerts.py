"""Fraud alert management — list, resolve, card-lost action."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import User, Card, CardStatus, FraudAlert, AlertStatus, AuditLog, AuditAction
from app.schemas import AlertOut, AlertResolve
from app.auth import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(
    status: str = Query(None),
    limit: int = Query(50, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(FraudAlert).where(FraudAlert.user_id == user.id)
    if status:
        q = q.where(FraudAlert.status == status)
    q = q.order_by(desc(FraudAlert.created_at)).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/{alert_id}", response_model=AlertOut)
async def resolve_alert(
    alert_id: str,
    body: AlertResolve,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FraudAlert).where(FraudAlert.id == alert_id, FraudAlert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    alert.status = body.status
    alert.tag = body.tag
    alert.resolved_at = datetime.utcnow()
    return alert


@router.post("/{alert_id}/block-card", response_model=AlertOut)
async def block_card_from_alert(
    alert_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One-click 'card lost/stolen' — blocks the card and closes the alert."""
    result = await db.execute(
        select(FraudAlert).where(FraudAlert.id == alert_id, FraudAlert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    card_result = await db.execute(select(Card).where(Card.id == alert.card_id))
    card = card_result.scalar_one_or_none()
    if card:
        card.status = CardStatus.BLOCKED

    alert.status = AlertStatus.BLOCKED
    alert.resolved_at = datetime.utcnow()
    db.add(AuditLog(user_id=user.id, action=AuditAction.CARD_BLOCKED,
                    target_id=alert.card_id, details={"reason": "card_lost_stolen"}))
    return alert


@router.post("/{alert_id}/respond", response_model=AlertOut)
async def respond_to_alert(
    alert_id: str,
    action: str = Query(..., description="approve | soft_block | hard_block"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One-click response: approve / soft-block / hard-block."""
    result = await db.execute(
        select(FraudAlert).where(FraudAlert.id == alert_id, FraudAlert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    card_result = await db.execute(select(Card).where(Card.id == alert.card_id))
    card = card_result.scalar_one_or_none()

    if action == "approve":
        alert.status = AlertStatus.APPROVED
        alert.tag = "user_confirmed_safe"
    elif action == "soft_block":
        alert.status = AlertStatus.BLOCKED
        alert.tag = "soft_block"
        if card:
            card.status = CardStatus.ONLINE_ONLY   # restrict but don't fully block
    elif action == "hard_block":
        alert.status = AlertStatus.BLOCKED
        alert.tag = "hard_block"
        if card:
            card.status = CardStatus.BLOCKED
    else:
        raise HTTPException(400, "action must be approve | soft_block | hard_block")

    alert.resolved_at = datetime.utcnow()
    return alert


@router.post("/{alert_id}/feedback", response_model=AlertOut)
async def submit_feedback(
    alert_id: str,
    label: str = Query(..., description="false_positive | true_fraud"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """User feedback for model improvement."""
    result = await db.execute(
        select(FraudAlert).where(FraudAlert.id == alert_id, FraudAlert.user_id == user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")

    if label == "false_positive":
        alert.status = AlertStatus.FALSE_POSITIVE
        alert.tag = "user_feedback:false_positive"
    elif label == "true_fraud":
        alert.status = AlertStatus.APPROVED
        alert.tag = "user_feedback:true_fraud"
    else:
        raise HTTPException(400, "label must be false_positive | true_fraud")

    alert.resolved_at = datetime.utcnow()
    return alert
