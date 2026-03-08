from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import func

from app.models.answer import Answer
from app.models.answer_vote import AnswerVote
from app.models.question import Question
from app.models.user import User


def create_question(db: Session, current_user: User, payload) -> Question:
    question = Question(
        title=payload.title,
        content=payload.content,
        subject=payload.subject,
        tags=payload.tags,
        author_id=current_user.id,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def search_questions(db: Session, query: str | None = None):

    q = db.query(Question)

    if query:
        q = q.filter(
            or_(
                Question.title.ilike(f"%{query}%"),
                Question.content.ilike(f"%{query}%"),
                Question.subject.ilike(f"%{query}%"),
                Question.tags.ilike(f"%{query}%"),
            )
        )

    return q.order_by(Question.created_at.desc()).all()

def get_question_by_id(db: Session, question_id: int) -> Question | None:
    return db.query(Question).filter(Question.id == question_id).first()


def get_my_questions(db: Session, user_id: int):
    return (
        db.query(Question)
        .filter(Question.author_id == user_id)
        .order_by(Question.created_at.desc())
        .all()
    )


def delete_question(db: Session, question: Question):
    db.delete(question)
    db.commit()


def get_trending_questions(db: Session):
    return db.query(Question).order_by(Question.created_at.desc()).limit(5).all()


def get_trending_questions(db: Session):

    return (
        db.query(Question)
        .outerjoin(Answer)
        .group_by(Question.id)
        .order_by(func.count(Answer.id).desc(), Question.created_at.desc())
        .limit(10)
        .all()
    )

def get_all_questions(db: Session):
    return db.query(Question).order_by(Question.created_at.desc()).all()