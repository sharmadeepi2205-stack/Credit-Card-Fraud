"""Auth router — register, login (step 1 + OTP step 2), refresh, logout."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, NotificationPreference, AuditLog, AuditAction
from app.schemas import RegisterRequest, LoginRequest, OTPVerifyRequest, TokenResponse, RefreshRequest
from app.auth import (
    hash_password, verify_password, create_access_token,
    create_refresh_token, decode_token, create_otp, verify_otp,
)
from app.notifications import send_otp_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
        phone=body.phone,
    )
    db.add(user)
    await db.flush()

    # Default notification prefs
    db.add(NotificationPreference(user_id=user.id))
    return {"message": "Registration successful. Please log in."}


@router.post("/login")
async def login_step1(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Step 1: validate credentials, send OTP."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    if user.mfa_enabled:
        otp = await create_otp(db, user.id, purpose="LOGIN")
        send_otp_email(user.email, otp, purpose="login")
        # In development, return OTP directly so no email setup is needed
        return {"mfa_required": True, "otp_code": otp, "message": f"OTP sent to {user.email}"}

    # MFA disabled — issue tokens directly
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/verify-otp", response_model=TokenResponse)
async def login_step2(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Step 2: verify OTP and issue JWT tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    ok = await verify_otp(db, user.id, body.otp_code, purpose="LOGIN")
    if not ok:
        raise HTTPException(401, "Invalid or expired OTP")

    db.add(AuditLog(user_id=user.id, action=AuditAction.MFA_VERIFIED))
    access = create_access_token({"sub": user.id})
    refresh = create_refresh_token({"sub": user.id})
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Not a refresh token")
    access = create_access_token({"sub": payload["sub"]})
    refresh = create_refresh_token({"sub": payload["sub"]})
    return TokenResponse(access_token=access, refresh_token=refresh)
