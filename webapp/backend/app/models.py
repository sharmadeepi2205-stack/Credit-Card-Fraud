"""SQLAlchemy ORM models — SQLite compatible (String columns for enums)."""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship, DeclarativeBase
import enum


class Base(DeclarativeBase):
    pass


def gen_uuid():
    return str(uuid.uuid4())


# ── Python enums (used in code, stored as strings in DB) ──────────────────────

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class AlertStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    BLOCKED = "BLOCKED"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    IGNORED = "IGNORED"

class CardStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"
    ONLINE_ONLY = "ONLINE_ONLY"

class AuditAction(str, enum.Enum):
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    CARD_BLOCKED = "CARD_BLOCKED"
    CARD_UNBLOCKED = "CARD_UNBLOCKED"
    PREFS_CHANGED = "PREFS_CHANGED"
    RULE_CHANGED = "RULE_CHANGED"
    CASE_CLOSED = "CASE_CLOSED"
    MFA_VERIFIED = "MFA_VERIFIED"


# ── Users ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cards = relationship("Card", back_populates="user", cascade="all, delete-orphan")
    notification_prefs = relationship("NotificationPreference", back_populates="user", uselist=False)
    alerts = relationship("FraudAlert", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    travel_notices = relationship("TravelNotice", back_populates="user")


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    otp_code = Column(String, nullable=False)
    purpose = Column(String, default="LOGIN")
    transaction_id = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Cards ──────────────────────────────────────────────────────────────────────

class Card(Base):
    __tablename__ = "cards"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False)
    last_four = Column(String, nullable=False)
    card_type = Column(String, default="VISA")
    bin_prefix = Column(String, nullable=True)
    credit_limit = Column(Float, default=5000.0)
    status = Column(String, default=CardStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="cards")
    transactions = relationship("Transaction", back_populates="card")


# ── Transactions ───────────────────────────────────────────────────────────────

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    card_id = Column(String, ForeignKey("cards.id"), nullable=False)
    user_id = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    merchant_name = Column(String, nullable=True)
    merchant_category = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    device_id = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    country = Column(String, nullable=True)
    fraud_score = Column(Float, nullable=True)
    risk_level = Column(String, nullable=True)
    is_fraud = Column(Boolean, default=False)
    ml_features = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    card = relationship("Card", back_populates="transactions")
    alert = relationship("FraudAlert", back_populates="transaction", uselist=False)


# ── Alerts ─────────────────────────────────────────────────────────────────────

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    card_id = Column(String, ForeignKey("cards.id"), nullable=False)
    transaction_id = Column(String, ForeignKey("transactions.id"), nullable=True)
    fraud_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(String, default=AlertStatus.PENDING)
    tag = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="alerts")
    transaction = relationship("Transaction", back_populates="alert")


# ── Notification Preferences ───────────────────────────────────────────────────

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    email_alerts = Column(Boolean, default=True)
    sms_alerts = Column(Boolean, default=False)
    in_app_alerts = Column(Boolean, default=True)
    min_risk_level = Column(String, default=RiskLevel.MEDIUM)

    user = relationship("User", back_populates="notification_prefs")


# ── Fraud Rules ────────────────────────────────────────────────────────────────

class FraudRule(Base):
    __tablename__ = "fraud_rules"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    rule_type = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ── Audit Logs ─────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    target_id = Column(String, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# ── Travel Notices ─────────────────────────────────────────────────────────────

class TravelNotice(Base):
    __tablename__ = "travel_notices"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    country = Column(String, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="travel_notices")
