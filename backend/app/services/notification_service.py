from sqlalchemy.orm import Session

from app.models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str,
    related_question_id: int | None = None,
    related_answer_id: int | None = None,
):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_question_id=related_question_id,
        related_answer_id=related_answer_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications_for_user(db: Session, user_id: int):
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def get_notification_by_id(db: Session, notification_id: int) -> Notification | None:
    return db.query(Notification).filter(Notification.id == notification_id).first()


def mark_notification_as_read(db: Session, notification: Notification):
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification