from app.models.academic import Branch
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, or_

from app.schemas import answer
from app.models.question import Question
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionResponse
from app.services.ai_service import post_ai_answer_task
from app.core.security import censor_content  # Imported safely here
from app.services.question_service import (
    create_question,
    delete_question,
    get_all_questions,
    get_my_questions,
    get_question_by_id,
    get_trending_questions,
    search_questions,
    get_trending_tags,
)

router = APIRouter(prefix="/questions", tags=["Questions"])


def serialize_question(question) -> QuestionResponse:
    tag_list_data = []
    if hasattr(question, 'tag_relations') and question.tag_relations:
        tag_list_data = [{"id": tag.id, "name": tag.name} for tag in question.tag_relations]
    elif hasattr(question, 'tags') and question.tags:
        tag_list_data = [{"id": i, "name": t.strip()} for i, t in enumerate(question.tags.split(",")) if t.strip()]

    return QuestionResponse(
        id=question.id,
        title=question.title,
        content=question.content,
        subject=question.subject,
        tags=question.tags or "",
        created_at=question.created_at,
        author_id=question.author.id if question.author else question.author_id,
        author_name=question.author.name if question.author else "Anonymous",
        author_role=question.author.role if question.author else "student",
        tag_list=tag_list_data,
        author_branch=question.author.branch.name if (question.author and question.author.branch) else "General",
        author_year=question.author.year if question.author else "N/A",
    )

def serialize_answer_with_comments(answer) -> dict:
    return {
        "id": answer.id,
        "content": answer.content,
        "question_id": answer.question_id,
        "author_id": answer.author_id,
        "author_name": answer.author.name if answer.author else "Anonymous",
        "author_role": answer.author.role if answer.author else "student",
        "is_verified": answer.is_verified,
        "is_accepted": answer.is_accepted,
        "created_at": str(answer.created_at),
        # 💬 Dynamic public comments parsing mapping channels
        "comments": [
            {
                "id": c.id,
                "content": c.content,
                "author_name": c.author.name if c.author else "Anonymous",
                "author_role": c.author.role if c.author else "student"
            }
            for comment in (answer.comments or [])
        ]
    }

@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
async def ask_question(
    payload: QuestionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Duplicate check logic (As-it-is exact copy preserved)
    existing = db.query(Question).filter(Question.content == payload.content).first()
    if existing:
        raise HTTPException(status_code=400, detail="Yeh sawal pehle hi post kiya ja chuka hai.")

    # 🚀 2. SMART TAG BALANCING LAYER (Max 4 slots strict enforcement)
    incoming_tags_str = payload.tags or ""
    # Split incoming string dynamically by commas
    raw_user_tags = [t.strip().lower() for t in incoming_tags_str.split(",") if t.strip()]
    
    # Maintain unique input array sequence elements
    final_tags_list = []
    for tag in raw_user_tags:
        if tag not in final_tags_list:
            final_tags_list.append(tag)

    total_slots = 4
    current_user_count = len(final_tags_list)

    if current_user_count < total_slots:
        # 🔹 CASE 1: User tags less than 4 -> Fulfill remaining tags through Groq AI Engine
        slots_to_fill = total_slots - current_user_count
        # Dynamic import resolution pattern to match your project architecture mapping
        try:
            from app.services.ai_service import generate_ai_tags
        except ImportError:
            pass # Uses local fallback reference safely
            
        ai_generated = await generate_ai_tags(payload.title, payload.content, needed_count=slots_to_fill)
        
        # Hydrate missing slots array mapping values securely
        for ai_tag in ai_generated:
            if ai_tag not in final_tags_list and len(final_tags_list) < total_slots:
                final_tags_list.append(ai_tag)
                
        # Hard Fallback verification metrics validation bounds constraints matching
        while len(final_tags_list) < total_slots:
            final_tags_list.append("campus")

    elif current_user_count >= total_slots:
        # 🔸 CASE 2: User filled all 4 slots (or more) -> Retain top 2, drop 2, inject 2 core fresh AI tags
        final_tags_list = final_tags_list[:2] # Top 2 user choices preserved strictly
        
        try:
            from app.services.ai_service import generate_ai_tags
        except ImportError:
            pass
            
        ai_generated = await generate_ai_tags(payload.title, payload.content, needed_count=2)
        
        for ai_tag in ai_generated:
            if ai_tag not in final_tags_list and len(final_tags_list) < total_slots:
                final_tags_list.append(ai_tag)
                
        # Final safety normalization layer 
        while len(final_tags_list) < total_slots:
            fallback_options = ["academic", "doubt", "help"]
            for f_tag in fallback_options:
                if f_tag not in final_tags_list and len(final_tags_list) < total_slots:
                    final_tags_list.append(f_tag)

    # Convert finalized list back into clean uniform comma separated string notation elements
    processed_tags_string = ", ".join(final_tags_list[:total_slots])

    # 3. Content Censor & Validation pipeline instantiation wrapper mapping logic
    censored_payload = QuestionCreate(
        title=censor_content(payload.title),
        content=censor_content(payload.content),
        subject=payload.subject,
        tags=processed_tags_string,  # <--- Integrated processed optimized balanced string layer safely
        dept_id=payload.dept_id,
        branch_id=payload.branch_id,
        course_id=payload.course_id
    )
    
    # 4. Standard Core operations save mapping triggers execution channels
    question = create_question(db, current_user, censored_payload)
    
    try:
        from app.core.database import SessionLocal
        session_factory = SessionLocal
    except ImportError:
        from app.core.database import SessionMaker
        session_factory = SessionMaker

    background_tasks.add_task(post_ai_answer_task, session_factory, question.id, question.title, question.content)
    return serialize_question(question)

@router.get("", response_model=list[QuestionResponse])
def list_questions(
    dept_id: int = None,
    branch_id: int = None,
    course_id: int = None,
    teacher_id: int = None,
    only_ai: str = "false",  # Toggle control flag string ("true" / "false")
    db: Session = Depends(get_db)
) -> list[QuestionResponse]:
    """
    🎯 ADVANCED MATRIX FILTRATION ENGINE
    Admin dynamic actions aur dynamic combinations (Dept, Branch, Course, Faculty, AI)
    ko backend layer par optimize karke precise lookup return karta hai.
    """
    from app.models.answer import Answer
    from app.models.user import User

    # 1. Base Query builder instance with eager loading configuration
    query = db.query(Question).outerjoin(User, Question.author_id == User.id)

    # 2. Strict ID matching checks (Direct schema attributes from admin nodes)
    if dept_id:
        query = query.filter(Question.dept_id == dept_id)
    if branch_id:
        query = query.filter(Question.branch_id == branch_id)
    if course_id:
        query = query.filter(Question.course_id == course_id)

    # 3. ADVANCED RELATIONAL FACULTY FILTER MODE
    # Agar user specific faculty select karta hai, toh hum checking layer
    # lagayenge ki us teacher ne answer diya ho YA evaluate/verify kiya ho.
    if teacher_id:
        query = query.join(Question.answers).filter(
            or_(
                Answer.author_id == teacher_id,     # Faculty has written the answer
                Answer.verified_by_id == teacher_id # Faculty verified the answer
            )
        )

    # 4. CUSTOM "ONLY AI DOUBTS" FILTER CLAUSE
    # Agar toggle true hai, toh sirf wahi threads bachenge jahan AI ka robot id links hai,
    # aur extra human replies pipeline exist nahi karti.
    if only_ai.lower() == "true":
        # Subquery to identify bot user database configuration
        bot_user = db.query(User).filter(User.email == "ai.bot@campus.edu").first()
        bot_id = bot_user.id if bot_user else -1

        # Question has an answer by AI Bot
        query = query.filter(Question.answers.any(Answer.author_id == bot_id))
        
        # Core restriction condition: Total answers pool must only equal to the bot account entity
        # (Koi bhi standard human answer schema table linkage structure validation contain na kare)
        query = query.filter(~Question.answers.any(Answer.author_id != bot_id))

    # 5. Execute compilation sequence in descending chronological sequence
    questions = query.order_by(Question.created_at.desc()).all()
    
    return [serialize_question(q) for q in questions]

@router.get("/trending", response_model=list[QuestionResponse])
def trending_questions(db: Session = Depends(get_db)):
    questions = get_trending_questions(db)
    return [serialize_question(question) for question in questions]


@router.get("/mine", response_model=list[QuestionResponse])
def my_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    questions = get_my_questions(db, current_user.id)
    return [serialize_question(question) for question in questions]


@router.get("/saved", response_model=list[QuestionResponse])
def get_saved_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.models.question import Question
        from app.models.saved_question import SavedQuestion

        saved_records = db.query(Question).join(
            SavedQuestion, SavedQuestion.question_id == Question.id
        ).filter(SavedQuestion.user_id == current_user.id).all()
        
        return [serialize_question(q) for q in saved_records]
    except Exception as e:
        print(f"⚠️ Error loading saved questions pipeline: {str(e)}")
        return []


@router.get("/search/query", response_model=list[QuestionResponse])
def search_questions_route(
    query: str | None = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    questions = search_questions(db, query)
    return [serialize_question(q) for q in questions[skip : skip + limit]]


@router.get("/tags/trending")
def get_popular_tags(limit: int = 5, db: Session = Depends(get_db)):
    tags = get_trending_tags(db, limit)
    return [{"id": t.id, "name": t.name, "count": t.count} for t in tags]


@router.get("/tags/{tag_name}/questions", response_model=list[QuestionResponse])
def get_questions_by_tag(tag_name: str, db: Session = Depends(get_db)):
    from app.models.tag import Tag
    tag = db.query(Tag).filter(Tag.name == tag_name.lower().strip()).first()
    if not tag:
        return []
    return [serialize_question(q) for q in tag.questions]

@router.post("/{question_id}/save")
def toggle_save_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    try:
        from app.models.saved_question import SavedQuestion

        existing = db.query(SavedQuestion).filter(
            SavedQuestion.question_id == question_id,
            SavedQuestion.user_id == current_user.id
        ).first()

        if existing:
            db.delete(existing)
            db.commit()
            return {"success": True, "message": "Removed from bookmarks.", "is_saved": False}
        else:
            new_save = SavedQuestion(question_id=question_id, user_id=current_user.id)
            db.add(new_save)
            db.commit()
            return {"success": True, "message": "Saved to bookmarks successfully!", "is_saved": True}
            
    except Exception as e:
        db.rollback()  # ✅ Ye line tumhari original thi, ise zaroor rakhna hai
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reported-list")
def get_reported_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")
        
    try:
        from app.models.question import Question
        raw_list = db.query(Question).filter(Question.tags.ilike("%reported%")).all()
        
        def count_reports_weight(q_obj):
            if not q_obj.tags:
                return 0
            return str(q_obj.tags).lower().count("reported")

        sorted_reported_posts = sorted(raw_list, key=count_reports_weight, reverse=True)
        
        response_data = []
        for q in sorted_reported_posts:
            response_data.append({
                "id": int(q.id),
                "title": str(q.title) if q.title else "Untitled Doubt",
                "content": str(q.content) if q.content else "",
                "subject": str(q.subject) if q.subject else "General",
                "tags": str(q.tags) if q.tags else "",
                "author_id": int(q.author_id) if q.author_id else 0,
                "reports_count": int(count_reports_weight(q))
            })
            
        return JSONResponse(content=response_data)
        
    except Exception as e:
        print(f"❌ Core Report Engine Failure: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal reports processing failed.")

# 🚨 🚀 NEW ADDON FEATURE: EXPLICIT AUTO-ESCALATION ENGINE TRIGGER REPORT ENDPOINT
@router.post("/{question_id}/report")
def report_question_pipeline(
    question_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question thread not found.")

    current_tags = question.tags or ""
    
    # Append report flag metadata context
    if "reported" not in current_tags:
        new_tags = f"{current_tags},reported".strip(",")
    else:
        new_tags = f"{current_tags},reported"

    question.tags = new_tags
    db.commit()

    # Calculate report threshold weights dynamic constraints
    report_count = question.tags.count("reported")

    # If threshold reaches 3 flags, trigger auto-escalation alert key
    if report_count >= 3:
        if "reportedreported" not in question.tags:
            question.tags = f"{question.tags},reportedreported".strip(",")
            db.commit()

    return {
        "success": True, 
        "message": "Question flagged successfully.", 
        "current_report_weight": report_count
    }

@router.get("/{question_id}", response_model=QuestionResponse)
def question_details(question_id: int, db: Session = Depends(get_db)):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    return serialize_question(question)


@router.delete("/{question_id}")
def remove_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")

    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can delete only your own question.")

    delete_question(db, question)
    return {"success": True, "message": "Question deleted successfully."}