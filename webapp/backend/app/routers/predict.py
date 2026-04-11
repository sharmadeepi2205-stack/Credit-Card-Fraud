"""
/api/predict  — single transaction scoring with SHAP
/api/predict/explain/:id — SHAP for a stored transaction
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.database import get_db
from app.models import User, Transaction
from app.auth import get_current_user
from app.ml_engine import score, compute_shap, build_features

router = APIRouter(prefix="/api/predict", tags=["predict"])


class PredictRequest(BaseModel):
    amount: float
    merchant_name: Optional[str] = None
    merchant_category: Optional[str] = None
    country: Optional[str] = None
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    ml_features: Optional[Dict[str, float]] = None


@router.post("")
async def predict(
    body: PredictRequest,
    user: User = Depends(get_current_user),
):
    txn = {
        "user_id": user.id,
        **body.model_dump(exclude_none=True),
    }
    result = score(txn)
    return {
        "fraud_score": result["fraud_score"],
        "risk_level": result["risk_level"],
        "reason": result["reason"],
        "shap": result["shap"],
        "ml_score": result["ml_score"],
        "rule_score": result["rule_score"],
        "features": result["features"],
    }


@router.get("/explain/{txn_id}")
async def explain(
    txn_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(Transaction.id == txn_id, Transaction.user_id == user.id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    txn_data = {
        "user_id": user.id,
        "amount": txn.amount,
        "merchant_category": txn.merchant_category,
        "country": txn.country,
        "ip_address": txn.ip_address,
        "device_id": txn.device_id,
        "latitude": txn.latitude,
        "longitude": txn.longitude,
        "ml_features": txn.ml_features,
    }
    features = build_features(txn_data)
    shap_vals = compute_shap(features, txn.fraud_score or 0)

    return {
        "transaction_id": txn_id,
        "fraud_score": txn.fraud_score,
        "risk_level": txn.risk_level,
        "reason": txn.merchant_name,
        "shap": shap_vals,
        "features": features,
    }
