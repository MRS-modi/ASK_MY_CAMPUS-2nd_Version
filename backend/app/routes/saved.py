from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.question import QuestionResponse
from app.schemas.saved import SaveToggleResponse
from app.services.question_service import get_question_by_id
from app.services.saved_service import get_saved_questions_for_user, is_question_saved, toggle_saved_question

router = APIRouter(prefix="/saved", tags=["Saved Questions"])


def serialize_question(question) -> QuestionResponse:
    return QuestionResponse(
        id=question.id,
        title=question.title,
        content=question.content,
        subject=question.subject,
        tags=question.tags,
        created_at=question.created_at,
        author_id=question.author.id,
        author_name=question.author.name,
        author_role=question.author.role,
    )


@router.post("/questions/{question_id}", response_model=SaveToggleResponse)
def save_or_unsave_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    saved = toggle_saved_question(db, question_id, current_user.id)

    return SaveToggleResponse(
        success=True,
        message="Question saved successfully." if saved else "Question removed from saved list.",
        is_saved=saved,
    )


@router.get("", response_model=list[QuestionResponse])
def my_saved_questions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = get_saved_questions_for_user(db, current_user.id)
    questions = [record.question for record in records if record.question]
    return [serialize_question(question) for question in questions]