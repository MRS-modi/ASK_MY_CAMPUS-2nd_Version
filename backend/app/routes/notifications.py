from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.notification import NotificationActionResponse, NotificationResponse
from app.services.notification_service import (
    get_notification_by_id,
    get_notifications_for_user,
    mark_notification_as_read,
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_notifications_for_user(db, current_user.id)


@router.post("/read/{notification_id}", response_model=NotificationActionResponse)
def read_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = get_notification_by_id(db, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found.")

    if notification.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access this notification.")

    mark_notification_as_read(db, notification)
    return NotificationActionResponse(
        success=True,
        message="Notification marked as read.",
    )