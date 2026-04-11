"""Pydantic request/response schemas."""
from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field
from app.models import RiskLevel, AlertStatus, CardStatus


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str


# ── Users ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    is_admin: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationPrefOut(BaseModel):
    email_alerts: bool
    sms_alerts: bool
    in_app_alerts: bool
    min_risk_level: RiskLevel

    class Config:
        from_attributes = True

class NotificationPrefUpdate(BaseModel):
    email_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None
    in_app_alerts: Optional[bool] = None
    min_risk_level: Optional[RiskLevel] = None


# ── Cards ──────────────────────────────────────────────────────────────────────

class CardCreate(BaseModel):
    last_four: str = Field(min_length=4, max_length=4)
    card_type: str = "VISA"
    bin_prefix: Optional[str] = Field(None, min_length=6, max_length=6)
    credit_limit: float = 5000.0

class CardOut(BaseModel):
    id: str
    token: str
    last_four: str
    card_type: str
    bin_prefix: Optional[str]
    credit_limit: float
    status: CardStatus
    created_at: datetime

    class Config:
        from_attributes = True

class CardStatusUpdate(BaseModel):
    status: CardStatus


# ── Transactions ───────────────────────────────────────────────────────────────

class TransactionIn(BaseModel):
    card_id: str
    amount: float
    merchant_name: Optional[str] = None
    merchant_category: Optional[str] = None
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    user_agent: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    country: Optional[str] = None
    # Optional raw ML features (V1-V28 + Time) for direct model scoring
    ml_features: Optional[Dict[str, float]] = None

class TransactionOut(BaseModel):
    id: str
    card_id: str
    user_id: str
    amount: float
    merchant_name: Optional[str]
    merchant_category: Optional[str]
    ip_address: Optional[str]
    device_id: Optional[str]
    country: Optional[str]
    fraud_score: Optional[float]
    risk_level: Optional[RiskLevel]
    is_fraud: bool
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Alerts ─────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: str
    user_id: str
    card_id: str
    transaction_id: Optional[str]
    fraud_score: float
    risk_level: RiskLevel
    reason: Optional[str]
    status: AlertStatus
    tag: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

class AlertResolve(BaseModel):
    status: AlertStatus
    tag: Optional[str] = None


# ── Fraud Rules ────────────────────────────────────────────────────────────────

class FraudRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str
    parameters: Dict[str, Any]
    is_active: bool = True

class FraudRuleOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    rule_type: str
    parameters: Dict[str, Any]
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Travel Notices ─────────────────────────────────────────────────────────────

class TravelNoticeCreate(BaseModel):
    country: str
    start_date: datetime
    end_date: datetime

class TravelNoticeOut(BaseModel):
    id: str
    country: str
    start_date: datetime
    end_date: datetime

    class Config:
        from_attributes = True


# ── Admin Analytics ────────────────────────────────────────────────────────────

class DailyStats(BaseModel):
    date: str
    total_transactions: int
    fraud_alerts: int
    fraud_rate: float

class ModelMetrics(BaseModel):
    precision: float
    recall: float
    f1: float
    roc_auc: float
    false_positive_rate: float

class TopMerchant(BaseModel):
    merchant_name: str
    alert_count: int

class TopCountry(BaseModel):
    country: str
    alert_count: int
