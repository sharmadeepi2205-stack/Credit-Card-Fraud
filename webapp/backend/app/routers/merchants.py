"""Merchant risk profiling — fraud rate, chargeback rate, volume per merchant."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Transaction, FraudAlert
from app.auth import get_current_user, require_admin

router = APIRouter(prefix="/api/merchants", tags=["merchants"])


@router.get("/risk")
async def merchant_risk(
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return per-merchant fraud stats for the current user."""
    result = await db.execute(
        select(Transaction).where(Transaction.user_id == user.id)
    )
    txns = result.scalars().all()

    # Aggregate by merchant
    merchants: dict = {}
    for t in txns:
        m = t.merchant_name or "Unknown"
        if m not in merchants:
            merchants[m] = {
                "merchant": m,
                "category": t.merchant_category or "Other",
                "total_txns": 0,
                "total_amount": 0.0,
                "fraud_count": 0,
                "high_risk_count": 0,
                "avg_score": 0.0,
                "scores": [],
            }
        merchants[m]["total_txns"] += 1
        merchants[m]["total_amount"] += t.amount
        if t.is_fraud:
            merchants[m]["fraud_count"] += 1
        if t.risk_level == "HIGH":
            merchants[m]["high_risk_count"] += 1
        if t.fraud_score is not None:
            merchants[m]["scores"].append(t.fraud_score)

    result_list = []
    for m, d in merchants.items():
        scores = d.pop("scores")
        d["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
        d["fraud_rate"] = round(d["fraud_count"] / d["total_txns"] * 100, 1)
        d["risk_tier"] = (
            "HIGH" if d["avg_score"] >= 60 or d["fraud_rate"] >= 30
            else "MEDIUM" if d["avg_score"] >= 35 or d["fraud_rate"] >= 10
            else "LOW"
        )
        d["total_amount"] = round(d["total_amount"], 2)
        result_list.append(d)

    result_list.sort(key=lambda x: x["avg_score"], reverse=True)
    return result_list[:limit]
