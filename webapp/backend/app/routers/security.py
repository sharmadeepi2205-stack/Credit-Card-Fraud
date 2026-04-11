"""Security controls per user — geo-lock, spend limits, trusted merchants, OTP threshold."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

from app.database import get_db
from app.models import User, Card, CardStatus, AuditLog, AuditAction
from app.auth import get_current_user

router = APIRouter(prefix="/api/security", tags=["security"])


class SecuritySettings(BaseModel):
    geo_allowlist: Optional[List[str]] = None       # ["US", "GB", "IN"]
    travel_mode: Optional[bool] = None
    travel_start: Optional[datetime] = None
    travel_end: Optional[datetime] = None
    otp_threshold: Optional[float] = None           # min amount requiring OTP
    spend_limits: Optional[Dict[str, float]] = None # {"Shopping": 500, "Gambling": 0}
    trusted_merchants: Optional[List[str]] = None


# In-memory store (replace with DB column in production)
_settings: Dict[str, dict] = {}

DEFAULTS = {
    "geo_allowlist": ["US"],
    "travel_mode": False,
    "travel_start": None,
    "travel_end": None,
    "otp_threshold": 1000.0,
    "spend_limits": {"Gambling": 0, "Crypto": 0, "Cash": 500},
    "trusted_merchants": ["Netflix", "Spotify", "Amazon"],
}


@router.get("")
async def get_security(user: User = Depends(get_current_user)):
    return _settings.get(user.id, DEFAULTS)


@router.put("")
async def update_security(
    body: SecuritySettings,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current = _settings.get(user.id, dict(DEFAULTS))
    patch = body.model_dump(exclude_none=True)
    # Serialize datetime fields
    for k in ("travel_start", "travel_end"):
        if k in patch and patch[k]:
            patch[k] = patch[k].isoformat()
    current.update(patch)
    _settings[user.id] = current
    db.add(AuditLog(user_id=user.id, action=AuditAction.PREFS_CHANGED,
                    details={"section": "security", **patch}))
    return current


@router.post("/freeze/{card_id}")
async def freeze_card(
    card_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")
    card.status = CardStatus.BLOCKED
    db.add(AuditLog(user_id=user.id, action=AuditAction.CARD_BLOCKED, target_id=card_id))
    return {"status": "BLOCKED", "card_id": card_id}


@router.post("/unfreeze/{card_id}")
async def unfreeze_card(
    card_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Card).where(Card.id == card_id, Card.user_id == user.id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Card not found")
    card.status = CardStatus.ACTIVE
    db.add(AuditLog(user_id=user.id, action=AuditAction.CARD_UNBLOCKED, target_id=card_id))
    return {"status": "ACTIVE", "card_id": card_id}
