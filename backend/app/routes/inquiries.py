from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.inquiry import InquiryCreate, InquiryResponse, InquiryUpdateStatus
from app.services.inquiry_service import (
    create_inquiry,
    get_all_inquiries,
    get_inquiry_by_id,
    get_my_inquiries,
    update_inquiry_status,
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/inquiries", tags=["Inquiries"])


@router.post("", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def submit_inquiry(
    payload: InquiryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inquiry = create_inquiry(db, current_user, payload)
    return inquiry


@router.get("/mine", response_model=list[InquiryResponse])
def my_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_my_inquiries(db, current_user.id)


@router.get("/admin/all", response_model=list[InquiryResponse])
def admin_all_inquiries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access all inquiries."
        )

    return get_all_inquiries(db)


@router.patch("/admin/{inquiry_id}", response_model=InquiryResponse)
def admin_update_inquiry(
    inquiry_id: int,
    payload: InquiryUpdateStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update inquiry status."
        )

    inquiry = get_inquiry_by_id(db, inquiry_id)
    if not inquiry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found."
        )

    updated = update_inquiry_status(db, inquiry, payload.status, payload.admin_note)

    if inquiry.user_id != current_user.id:
        create_notification(
            db=db,
            user_id=inquiry.user_id,
            title="Inquiry status updated",
            message=f"Your inquiry '{inquiry.subject}' is now '{payload.status}'.",
            type="inquiry_status_updated",
            related_question_id=None,
            related_answer_id=None,
        )

    return updated