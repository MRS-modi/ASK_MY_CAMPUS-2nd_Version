from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.question import Question
from app.models.answer import Answer
from app.models.comment import Comment

router = APIRouter(prefix="/questions/faculty", tags=["Faculty Dashboard"])

def verify_faculty_access(user: User):
    if user.role not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="🔒 Access Denied: Faculty permissions required.")

# 📈 1. ANALYTICS SUMMARY ENDPOINT (SMART TAGS LOOKUP MATCH)
@router.get("/analytics-summary")
def get_faculty_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    
    assigned_courses_query = db.execute(
        text("SELECT course_id FROM faculty_courses WHERE teacher_id = :tid"), 
        {"tid": current_user.id}
    ).fetchall()
    assigned_course_ids = [row[0] for row in assigned_courses_query]

    if assigned_course_ids:
        assigned_q_count = db.query(Question).filter(Question.course_id.in_(assigned_course_ids)).count()
        escalated_threats_exist = db.query(Question).filter(
            Question.course_id.in_(assigned_course_ids),
            Question.tags.ilike("%reported%reported%")
        ).count() > 0
        
        # 🚀 SMART CHANNELS MATCH: Parse claims from tags column
        claim_string = f"claimed_by_{current_user.id}"
        active_claims = db.query(Question).filter(
            Question.course_id.in_(assigned_course_ids),
            Question.tags.ilike(f"%{claim_string}%")
        ).count()
    else:
        assigned_q_count = 0
        escalated_threats_exist = False
        active_claims = 0

    verified_ans = db.query(Answer).filter(Answer.author_id == current_user.id, Answer.is_verified == True).count()

    return {
        "assigned_count": assigned_q_count,
        "active_claims_count": active_claims,
        "verified_count": verified_ans,
        "has_escalated_threats": escalated_threats_exist
    }

# 📚 2. ASSIGNED COURSE FEEDS OR EXPLORE ALL FEEDS (FIXED CRASH)
@router.get("/feeds")
def get_faculty_feeds(
    scope: str = "assigned", 
    course_id: int = None,  # 🚀 Option for individual course lookup preserved
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    verify_faculty_access(current_user)
    
    # 🚀 FIXED: Safely fetch 'tags' metadata instead of non-existent table fields
    sql_base = "SELECT id, title, subject, author_id, course_id, tags FROM questions"
    
    if scope == "assigned":
        assigned_courses_query = db.execute(
            text("SELECT course_id FROM faculty_courses WHERE teacher_id = :tid"), 
            {"tid": current_user.id}
        ).fetchall()
        assigned_course_ids = [row[0] for row in assigned_courses_query]
        
        if not assigned_course_ids:
            return []
            
        sql_base += " WHERE course_id IN :course_ids ORDER BY created_at DESC"
        questions_rows = db.execute(text(sql_base), {"course_ids": tuple(assigned_course_ids)}).fetchall()
        
    elif scope == "particular" and course_id:
        # 🎯 STRICT SINGLE COURSE SELECTION FILTER
        sql_base += " WHERE course_id = :cid ORDER BY created_at DESC"
        questions_rows = db.execute(text(sql_base), {"cid": course_id}).fetchall()
        
    else: # scope == "all"
        sql_base += " ORDER BY created_at DESC"
        questions_rows = db.execute(text(sql_base)).fetchall()
    
    response_data = []
    for row in questions_rows:
        q_id, title, subject, author_id, c_id, tags_str = row
        tags_str = tags_str or ""
        
        author_row = db.execute(text("SELECT name FROM users WHERE id = :uid"), {"uid": author_id}).fetchone()
        course_name_row = db.execute(text("SELECT name FROM courses WHERE id = :cid"), {"cid": c_id}).fetchone()

        # 🚀 PARSE META-STATES ON-THE-FLY FROM TAGS STRING
        is_resolved = "resolved_lock" in tags_str
        
        claimed_by_id = None
        if "claimed_by_" in tags_str:
            try:
                parts = tags_str.split("claimed_by_")
                if len(parts) > 1:
                    # Extracts integer segment tightly bounded by commas
                    claimed_by_id = int(parts[1].split(",")[0].strip())
            except Exception:
                pass

        response_data.append({
            "id": q_id,
            "title": title,
            "subject": subject or "General",
            "author_name": author_row[0] if author_row else "Anonymous",
            "course_name": course_name_row[0] if course_name_row else "General",
            "is_resolved": is_resolved,
            "claimed_by_id": claimed_by_id # Enforces exact integer response channel
        })
    return response_data

# 🔍 3. PENDING UNVERIFIED ANSWERS REVIEWS QUEUE
@router.get("/pending-reviews")
def get_pending_reviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    unverified_answers = db.query(Answer).filter(Answer.is_verified == False).order_by(Answer.created_at.desc()).all()
    return [
        {
            "id": ans.id,
            "content": ans.content,
            "author_name": ans.author.name if ans.author else "Anonymous User",
            "author_role": ans.author.role if ans.author else "student"
        }
        for ans in unverified_answers
    ]

# 🎫 4. CLAIM DOUBT INTERCEPT ROUTE (APPEND TO TAGS STRING)
@router.post("/claim/{question_id}")
def claim_doubt_token(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
        
    current_tags = question.tags or ""
    claim_marker = f"claimed_by_{current_user.id}"
    
    if claim_marker not in current_tags:
        question.tags = f"{current_tags},{claim_marker}".strip(",")
        db.commit()
        
    return {"success": True, "message": "Question token claimed successfully."}

# 🔒 5. SECURE RESOLVE LOCK ROUTE (APPEND TO TAGS STRING)
@router.patch("/resolve-lock/{question_id}")
def patch_resolve_lock_thread(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question thread mapping row missing.")

    current_tags = question.tags or ""
    if "resolved_lock" not in current_tags:
        question.tags = f"{current_tags},resolved_lock".strip(",")
        db.commit()
        
    return {"success": True, "message": "Discussion thread successfully locked."}

# 💬 6. LIVE CONVERSATIONS COMMENT REPLIES TIMELINE DISCUSSIONS TRACKER FEED
@router.get("/comments-activity-feed")
def get_comments_activity_feed(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    
    # 🚀 FIXED: Direct extraction pattern to completely eliminate SQLAlchemy select() warnings
    teacher_answers_query = db.query(Answer.id).filter(Answer.author_id == current_user.id)
    
    recent_comments = db.query(Comment).filter(
        Comment.answer_id.in_(teacher_answers_query),  # Clean select evaluation wrapper
        Comment.user_id != current_user.id
    ).order_by(Comment.id.desc()).limit(15).all()
    
    return [
        {
            "id": c.id,
            "content": c.content,
            "author_name": c.author.name if c.author else "Scholar Identity"
        }
        for c in recent_comments
    ]


@router.patch("/dismiss-threat/{question_id}")
def dismiss_question_threat_pipeline(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    verify_faculty_access(current_user)
    
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Target doubt post missing.")

    # Clean and restore tags back to pristine state without report logs
    if question.tags:
        clean_tags = [
            tag.strip() for tag in question.tags.split(",") 
            if "reported" not in tag.lower() and "escalated_threat" not in tag.lower()
        ]
        question.tags = ", ".join(clean_tags)
        db.commit()
        
    return {"success": True, "message": "Doubt tracking clean synced successfully."}