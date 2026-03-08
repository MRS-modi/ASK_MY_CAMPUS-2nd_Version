from sqlalchemy.orm import Session

from app.models.saved_question import SavedQuestion


def get_saved_record(db: Session, question_id: int, user_id: int) -> SavedQuestion | None:
    return (
        db.query(SavedQuestion)
        .filter(
            SavedQuestion.question_id == question_id,
            SavedQuestion.user_id == user_id,
        )
        .first()
    )


def toggle_saved_question(db: Session, question_id: int, user_id: int) -> bool:
    existing = get_saved_record(db, question_id, user_id)

    if existing:
        db.delete(existing)
        db.commit()
        return False

    saved = SavedQuestion(question_id=question_id, user_id=user_id)
    db.add(saved)
    db.commit()
    return True


def is_question_saved(db: Session, question_id: int, user_id: int) -> bool:
    return get_saved_record(db, question_id, user_id) is not None


def get_saved_questions_for_user(db: Session, user_id: int):
    return (
        db.query(SavedQuestion)
        .filter(SavedQuestion.user_id == user_id)
        .order_by(SavedQuestion.id.desc())
        .all()
    )