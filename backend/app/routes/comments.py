from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.comment import Comment
from app.models.answer import Answer       
from app.models.question import Question   
from app.core.dependencies import get_current_user 

router = APIRouter(prefix="/answers", tags=["comments"])

@router.post("/{answer_id}/comment")
async def add_comment(
    answer_id: int, 
    comment_data: dict, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    # 1. Content validation check
    content = comment_data.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Comment content cannot be empty")
        
    # 2. Check if Answer exists in database
    answer = db.query(Answer).filter(Answer.id == answer_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")

    # 3. Fetch the parent Question to check who asked it
    question = db.query(Question).filter(Question.id == answer.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Parent question thread not found.")

    # 🚀 4. EXCLUSIVE DOUBLE-GUARD: Block processing if discussion is marked resolved/locked
    if question.tags and "resolved_lock" in question.tags:
        raise HTTPException(
            status_code=403,
            detail="🔒 Permission Denied: This thread has been marked as resolved and comments are closed."
        )

    # 🔐 5. BACKEND SECURITY SHIELD (Strict match with your frontend logic)
    # Allows only: Question Owner, Answer Owner, or Teachers/Admins
    is_question_author = (question.author_id == current_user.id)
    is_answer_author = (answer.author_id == current_user.id)
    is_staff = (current_user.role in ["teacher", "admin"])

    if not (is_question_author or is_answer_author or is_staff):
        raise HTTPException(
            status_code=403, 
            detail="🔒 Permission Denied: Only question/answer authors or faculty can comment here."
        )

    # 6. Core operations database save pipeline
    new_comment = Comment(
        answer_id=answer_id, 
        user_id=current_user.id, 
        content=content
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return {"message": "Comment added successfully"}