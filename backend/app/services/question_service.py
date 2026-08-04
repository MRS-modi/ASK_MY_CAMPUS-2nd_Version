from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy import func

from app.models.answer import Answer
from app.models.answer_vote import AnswerVote
from app.models.question import Question
from app.models.user import User
from app.models.tag import Tag  # 👇 YEH IMPORT EXTRA ADD KIYA HAI

def create_question(db: Session, current_user: User, payload) -> Question:
    """
    🎯 EXACT ACADEMIC COUPLING ENGINE
    ask.html ke manual select dropdowns (Dept, Branch, Course) ko payload se 
    read karke database ke matching columns mein tightly link karta hai.
    """
    # Payload se data nikalenge, agar empty ho toh fallback user profile par jayega
    assigned_dept = payload.dept_id if hasattr(payload, 'dept_id') and payload.dept_id else current_user.dept_id
    assigned_branch = payload.branch_id if hasattr(payload, 'branch_id') and payload.branch_id else current_user.branch_id
    assigned_course = payload.course_id if hasattr(payload, 'course_id') and payload.course_id else None

    question = Question(
        title=payload.title,
        content=payload.content,
        subject=payload.subject,  # Course select value standard tracking attribute
        tags=payload.tags,
        author_id=current_user.id,
        
        # 🚀 REPLACED: Ab user select kiye hue dynamic IDs hi save honge
        dept_id=assigned_dept, 
        branch_id=assigned_branch,
        course_id=assigned_course
    )
    
    # Main question transaction save queue
    db.add(question)
    db.flush() # Isse question.id safely mil jayegi tags linking ke liye

    # Association tags compilation handler
    if payload.tags:
        tag_names = list(set([t.strip().lower() for t in payload.tags.split(",") if t.strip()]))
        
        for name in tag_names:
            tag = db.query(Tag).filter(Tag.name == name).first()
            if not tag:
                tag = Tag(name=name)
                db.add(tag)
                db.flush()
            
            # Link via Association Table Explicitly to avoid SAWarning
            from app.models.tag import question_tags
            db.execute(question_tags.insert().values(question_id=question.id, tag_id=tag.id))

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


# services/question_services.py ke andar delete_question ko badal kar aisa karo:

# backend/app/services/question_service.py ke andar delete_question ko isse replace karo:

def delete_question(db: Session, question: Question):
    try:
        # 🔗 1. Sabse pehle saved_questions table se entries saaf karenge direct SQL text se
        # Isse kisi model dependency ka jhanjhat hi nahi rahega!
        from sqlalchemy import text
        db.execute(
            text("DELETE FROM saved_questions WHERE question_id = :qid"), 
            {"qid": question.id}
        )
        
        # 🔗 2. Agar koi 'question_tags' association table entries hain, unhe bhi safe side uda dete hain
        db.execute(
            text("DELETE FROM question_tags WHERE question_id = :qid"), 
            {"qid": question.id}
        )
    except Exception as e:
        print(f"Non-critical clear constraint skip: {e}")

    # 💬 3. Is question par aaye saare answers ko delete karo (Answer model imported h tumhari file me upar)
    db.query(Answer).filter(Answer.question_id == question.id).delete(synchronize_session=False)

    # 🗑️ 4. Ab main question ko safely delete karo
    db.delete(question)
    db.commit()

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


def get_trending_tags(db: Session, limit: int = 5):
    """
    Sabse zyada questions me use hone wale tags nikalne ke liye
    """
    from app.models.tag import question_tags
    
    return (
        db.query(Tag.id, Tag.name, func.count(question_tags.c.question_id).label("count"))
        .join(question_tags, Tag.id == question_tags.c.tag_id)
        .group_by(Tag.id)
        .order_by(func.count(question_tags.c.question_id).desc())
        .limit(limit)
        .all()
    )

def get_recent_questions(db: Session):
    # .desc() se naye questions top par aayenge
    return db.query(Question).order_by(Question.created_at.desc()).all()