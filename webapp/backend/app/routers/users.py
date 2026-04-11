"""User profile & notification preferences."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, NotificationPreference, AuditLog, AuditAction
from app.schemas import UserOut, NotificationPrefOut, NotificationPrefUpdate
from app.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.get("/me/notifications", response_model=NotificationPrefOut)
async def get_notification_prefs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        await db.flush()
    return prefs


@router.patch("/me/notifications", response_model=NotificationPrefOut)
async def update_notification_prefs(
    body: NotificationPrefUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    )
    prefs = result.scalar_one_or_none()
    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)

    for field, val in body.model_dump(exclude_none=True).items():
        setattr(prefs, field, val)

    db.add(AuditLog(user_id=user.id, action=AuditAction.PREFS_CHANGED,
                    details=body.model_dump(exclude_none=True)))
    return prefs
