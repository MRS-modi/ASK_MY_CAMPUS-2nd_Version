from sqlalchemy.orm import Session

from app.models.answer_vote import AnswerVote
from app.models.answer import Answer  # 👇 YEH DO IMPORTS EXTRA ADD KIYE HAIN
from app.models.user import User


def get_vote(db: Session, answer_id: int, user_id: int) -> AnswerVote | None:
    return (
        db.query(AnswerVote)
        .filter(AnswerVote.answer_id == answer_id, AnswerVote.user_id == user_id)
        .first()
    )


def toggle_vote(db: Session, answer_id: int, user_id: int):
    existing_vote = get_vote(db, answer_id, user_id)

    # Pehle find kar lete hain ki yeh answer kisne likha hai taaki points update kar sakein
    answer = db.query(Answer).filter(Answer.id == answer_id).first()

    if existing_vote:
        # 👇 1. UPVOTE REMOVE LOGIC: User ne upvote wapas le liya -> Author ke -5 points
        if answer and answer.author_id:
            author = db.query(User).filter(User.id == answer.author_id).first()
            if author:
                author.reputation_points = max(0, author.reputation_points - 5) # max(0, ...) lagaya h taaki minus (-) me na jaye points

        db.delete(existing_vote)
        db.commit()
        return False

    # 👇 2. NEW UPVOTE LOGIC: User ne upvote kiya -> Author ke +5 points
    if answer and answer.author_id:
        author = db.query(User).filter(User.id == answer.author_id).first()
        if author:
            author.reputation_points += 5

    vote = AnswerVote(answer_id=answer_id, user_id=user_id)
    db.add(vote)
    db.commit()
    return True


def count_votes(db: Session, answer_id: int) -> int:
    return db.query(AnswerVote).filter(AnswerVote.answer_id == answer_id).count()


def has_user_voted(db: Session, answer_id: int, user_id: int) -> bool:
    return get_vote(db, answer_id, user_id) is not None