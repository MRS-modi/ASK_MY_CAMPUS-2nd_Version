from sqlalchemy.orm import Session

from app.models.answer_vote import AnswerVote


def get_vote(db: Session, answer_id: int, user_id: int) -> AnswerVote | None:
    return (
        db.query(AnswerVote)
        .filter(AnswerVote.answer_id == answer_id, AnswerVote.user_id == user_id)
        .first()
    )


def toggle_vote(db: Session, answer_id: int, user_id: int):
    existing_vote = get_vote(db, answer_id, user_id)

    if existing_vote:
        db.delete(existing_vote)
        db.commit()
        return False

    vote = AnswerVote(answer_id=answer_id, user_id=user_id)
    db.add(vote)
    db.commit()
    return True


def count_votes(db: Session, answer_id: int) -> int:
    return db.query(AnswerVote).filter(AnswerVote.answer_id == answer_id).count()


def has_user_voted(db: Session, answer_id: int, user_id: int) -> bool:
    return get_vote(db, answer_id, user_id) is not None