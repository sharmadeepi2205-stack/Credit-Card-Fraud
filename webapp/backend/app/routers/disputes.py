"""Dispute management — raise, track, resolve disputes."""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user

router = APIRouter(prefix="/api/disputes", tags=["disputes"])

# In-memory store (extend DB model for production)
_disputes: dict = {}


class DisputeCreate(BaseModel):
    transaction_id: str
    reason: str
    description: Optional[str] = None


class DisputeUpdate(BaseModel):
    status: str   # OPEN | UNDER_REVIEW | RESOLVED | REJECTED
    resolution_note: Optional[str] = None


@router.post("", status_code=201)
async def raise_dispute(
    body: DisputeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(Transaction.id == body.transaction_id,
                                  Transaction.user_id == user.id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    dispute_id = str(uuid.uuid4())
    _disputes[dispute_id] = {
        "id": dispute_id,
        "user_id": user.id,
        "transaction_id": body.transaction_id,
        "amount": txn.amount,
        "merchant": txn.merchant_name,
        "reason": body.reason,
        "description": body.description,
        "status": "OPEN",
        "created_at": datetime.utcnow().isoformat(),
        "resolution_note": None,
        "resolved_at": None,
    }
    return _disputes[dispute_id]


@router.get("")
async def list_disputes(user: User = Depends(get_current_user)):
    return [d for d in _disputes.values() if d["user_id"] == user.id]


@router.get("/{dispute_id}")
async def get_dispute(dispute_id: str, user: User = Depends(get_current_user)):
    d = _disputes.get(dispute_id)
    if not d or d["user_id"] != user.id:
        raise HTTPException(404, "Dispute not found")
    return d


@router.patch("/{dispute_id}")
async def update_dispute(
    dispute_id: str,
    body: DisputeUpdate,
    user: User = Depends(get_current_user),
):
    d = _disputes.get(dispute_id)
    if not d or d["user_id"] != user.id:
        raise HTTPException(404, "Dispute not found")
    d["status"] = body.status
    if body.resolution_note:
        d["resolution_note"] = body.resolution_note
    if body.status in ("RESOLVED", "REJECTED"):
        d["resolved_at"] = datetime.utcnow().isoformat()
    return d
