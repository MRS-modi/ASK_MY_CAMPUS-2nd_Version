from sqlalchemy.orm import Session

from app.models.answer import Answer
from app.models.question import Question
from app.models.user import User
from app.models.answer_vote import AnswerVote


def create_answer(db: Session, current_user: User, question: Question, content: str) -> Answer:
    answer = Answer(
        content=content,
        question_id=question.id,
        author_id=current_user.id,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)
    return answer


def get_answers_by_question(db: Session, question_id: int):
    answers = (
        db.query(Answer)
        .filter(Answer.question_id == question_id)
        .all()
    )

    def vote_count(answer: Answer) -> int:
        return db.query(AnswerVote).filter(AnswerVote.answer_id == answer.id).count()

    return sorted(
        answers,
        key=lambda a: (
            a.is_accepted,
            a.is_verified,
            vote_count(a),
            a.created_at,
        ),
        reverse=True,
    )


def get_answer_by_id(db: Session, answer_id: int) -> Answer | None:
    return db.query(Answer).filter(Answer.id == answer_id).first()


def delete_answer(db: Session, answer: Answer):
    db.delete(answer)
    db.commit()


def verify_answer(db: Session, answer: Answer) -> Answer:
    answer.is_verified = not answer.is_verified
    db.commit()
    db.refresh(answer)
    return answer


def accept_answer(db: Session, answer: Answer) -> Answer:
    db.query(Answer).filter(Answer.question_id == answer.question_id).update(
        {"is_accepted": False}
    )
    answer.is_accepted = True
    db.commit()
    db.refresh(answer)
    return answer