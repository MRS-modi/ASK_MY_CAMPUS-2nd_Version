from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.question import QuestionCreate, QuestionResponse
from app.services.question_service import (
    create_question,
    delete_question,
    get_all_questions,
    get_my_questions,
    get_question_by_id,
    get_trending_questions,
    search_questions,
)

router = APIRouter(prefix="/questions", tags=["Questions"])


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


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def ask_question(
    payload: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = create_question(db, current_user, payload)
    return serialize_question(question)


@router.get("", response_model=list[QuestionResponse])
def list_questions(db: Session = Depends(get_db)):
    questions = get_all_questions(db)
    return [serialize_question(question) for question in questions]


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


@router.get("/{question_id}", response_model=QuestionResponse)
def question_details(question_id: int, db: Session = Depends(get_db)):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )
    return serialize_question(question)


@router.delete("/{question_id}")
def remove_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )

    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own question."
        )

    delete_question(db, question)
    return {"success": True, "message": "Question deleted successfully."}

@router.get("/questions", response_model=list[QuestionResponse])
def list_questions(
    query: str | None = None,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    questions = search_questions(db, query)

    return questions[skip : skip + limit]

@router.get("/questions/trending", response_model=list[QuestionResponse])
def trending_questions(
    db: Session = Depends(get_db)
):
    return get_trending_questions(db)