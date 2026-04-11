"""Card management — link, list, update status."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Card, CardStatus, AuditLog, AuditAction
from app.schemas import CardCreate, CardOut, CardStatusUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.post("", response_model=CardOut, status_code=201)
async def add_card(
    body: CardCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Tokenize — never store raw PAN
    token = f"tok_{uuid.uuid4().hex}"
    card = Card(
        user_id=user.id,
        token=token,
        last_four=body.last_four,
        card_type=body.card_type,
        bin_prefix=body.bin_prefix,
        credit_limit=body.credit_limit,
    )
    db.add(card)
    await db.flush()
    return card


@router.get("", response_model=list[CardOut])
async def list_cards(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Card).where(Card.user_id == user.id))
    return result.scalars().all()


@router.patch("/{card_id}/status", response_model=CardOut)
async def update_card_status(
    card_id: str,
    body: CardStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")

    card.status = body.status
    action = AuditAction.CARD_BLOCKED if body.status == CardStatus.BLOCKED else AuditAction.CARD_UNBLOCKED
    db.add(AuditLog(user_id=user.id, action=action, target_id=card_id,
                    details={"new_status": body.status}))
    return card


@router.post("/{card_id}/toggle-freeze", response_model=CardOut)
async def toggle_freeze(
    card_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Instant freeze/unfreeze toggle — no confirmation needed."""
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")

    if card.status == CardStatus.BLOCKED:
        card.status = CardStatus.ACTIVE
        action = AuditAction.CARD_UNBLOCKED
    else:
        card.status = CardStatus.BLOCKED
        action = AuditAction.CARD_BLOCKED

    db.add(AuditLog(user_id=user.id, action=action, target_id=card_id,
                    details={"toggled": True}))
    return card
