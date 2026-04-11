"""Travel notice management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, TravelNotice
from app.schemas import TravelNoticeCreate, TravelNoticeOut
from app.auth import get_current_user

router = APIRouter(prefix="/api/travel", tags=["travel"])


@router.post("", response_model=TravelNoticeOut, status_code=201)
async def create_travel_notice(
    body: TravelNoticeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    notice = TravelNotice(
        user_id=user.id,
        country=body.country,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(notice)
    await db.flush()
    return notice


@router.get("", response_model=list[TravelNoticeOut])
async def list_travel_notices(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TravelNotice).where(TravelNotice.user_id == user.id)
    )
    return result.scalars().all()


@router.delete("/{notice_id}", status_code=204)
async def delete_travel_notice(
    notice_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TravelNotice).where(TravelNotice.id == notice_id, TravelNotice.user_id == user.id)
    )
    notice = result.scalar_one_or_none()
    if not notice:
        raise HTTPException(404, "Travel notice not found")
    await db.delete(notice)
