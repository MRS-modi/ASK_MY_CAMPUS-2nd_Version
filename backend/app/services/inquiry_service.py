from sqlalchemy.orm import Session

from app.models.inquiry import Inquiry
from app.models.user import User


def create_inquiry(db: Session, current_user: User, payload) -> Inquiry:
    inquiry = Inquiry(
        user_id=current_user.id,
        name=payload.name,
        father_name=payload.father_name,
        enrollment_number=payload.enrollment_number,
        email=payload.email,
        branch=payload.branch,
        year=payload.year,
        inquiry_department=payload.inquiry_department,
        subject=payload.subject,
        message=payload.message,
        status="submitted",
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)
    return inquiry


def get_my_inquiries(db: Session, user_id: int):
    return (
        db.query(Inquiry)
        .filter(Inquiry.user_id == user_id)
        .order_by(Inquiry.created_at.desc())
        .all()
    )


def get_all_inquiries(db: Session):
    return db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()


def get_inquiry_by_id(db: Session, inquiry_id: int) -> Inquiry | None:
    return db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()


def update_inquiry_status(db: Session, inquiry: Inquiry, status: str, admin_note: str | None = None) -> Inquiry:
    inquiry.status = status
    inquiry.admin_note = admin_note
    db.commit()
    db.refresh(inquiry)
    return inquiry