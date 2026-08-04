from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
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
    # Pehle find kar lete hain ki answer dene wala student kaun hai
    author = db.query(User).filter(User.id == answer.author_id).first()
    
    # Toggle logic chalne se pehle state check kar rahe hain
    if not answer.is_verified:
        # 👇 1. VERIFIED STATUS ADDED: Student ko +20 points milenge
        if author:
            author.reputation_points += 20
    else:
        # 👇 2. VERIFIED STATUS REMOVED: Student ke profile se -20 points hatenge
        if author:
            author.reputation_points = max(0, author.reputation_points - 20)

    # Tumhara purana status toggle code as it is chalega
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

def get_all_questions(db: Session):
    """
    Saare questions nikalne ke liye complete with author aur unke tags relationships
    """
    return (
        db.query(Question)
        .options(
            joinedload(Question.author),
            joinedload(Question.tag_relations)
        )
        .order_by(Question.created_at.desc())
        .all()
    )

def get_my_questions(db: Session, user_id: int):
    """
    Specific user ke questions complete components ke sath load karne ke liye
    """
    return (
        db.query(Question)
        .filter(Question.author_id == user_id)
        .options(
            joinedload(Question.author),
            joinedload(Question.tag_relations)
        )
        .order_by(Question.created_at.desc())
        .all()
    )