from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.admin import AdminActionResponse, PlatformStats
from app.services.admin_service import (
    get_all_users,
    get_user_by_id,
    promote_teacher,
    promote_admin,
    suspend_user,
    get_platform_stats,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


def admin_guard(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)
    return get_all_users(db)


@router.patch("/users/{user_id}/make-teacher", response_model=AdminActionResponse)
def make_teacher(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    promote_teacher(db, user)

    return AdminActionResponse(
        success=True,
        message="User promoted to teacher"
    )


@router.patch("/users/{user_id}/make-admin", response_model=AdminActionResponse)
def make_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    promote_admin(db, user)

    return AdminActionResponse(
        success=True,
        message="User promoted to admin"
    )


@router.patch("/users/{user_id}/ban", response_model=AdminActionResponse)
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot ban your own account.")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    suspend_user(db, user)

    return AdminActionResponse(
        success=True,
        message="User banned"
    )


@router.get("/analytics", response_model=PlatformStats)
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)
    return get_platform_stats(db)