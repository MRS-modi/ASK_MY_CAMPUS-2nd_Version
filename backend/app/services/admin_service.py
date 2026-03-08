from sqlalchemy.orm import Session

from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer


def get_all_users(db: Session):
    return db.query(User).order_by(User.id.desc()).all()


def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()


def promote_teacher(db: Session, user: User):
    user.role = "teacher"
    db.commit()
    db.refresh(user)
    return user


def promote_admin(db: Session, user: User):
    user.role = "admin"
    db.commit()
    db.refresh(user)
    return user


def suspend_user(db: Session, user: User):
    user.role = "banned"
    db.commit()
    db.refresh(user)
    return user


def get_platform_stats(db: Session):

    total_users = db.query(User).count()
    total_questions = db.query(Question).count()
    total_answers = db.query(Answer).count()

    return {
        "total_users": total_users,
        "total_questions": total_questions,
        "total_answers": total_answers,
    }