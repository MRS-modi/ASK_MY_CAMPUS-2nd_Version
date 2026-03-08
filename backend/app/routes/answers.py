from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.answer import (
    ActionMessageResponse,
    AnswerCreate,
    AnswerResponse,
    VoteResponse,
)
from app.services.answer_service import (
    accept_answer,
    create_answer,
    delete_answer,
    get_answer_by_id,
    get_answers_by_question,
    verify_answer,
)
from app.services.notification_service import create_notification
from app.services.question_service import get_question_by_id
from app.services.vote_service import count_votes, has_user_voted, toggle_vote

router = APIRouter(tags=["Answers"])


def serialize_answer(answer, db: Session, current_user: User | None = None) -> AnswerResponse:
    voted = False
    if current_user:
        voted = has_user_voted(db, answer.id, current_user.id)

    return AnswerResponse(
        id=answer.id,
        content=answer.content,
        question_id=answer.question_id,
        author_id=answer.author.id,
        author_name=answer.author.name,
        author_role=answer.author.role,
        is_verified=answer.is_verified,
        is_accepted=answer.is_accepted,
        created_at=answer.created_at,
        votes_count=count_votes(db, answer.id),
        has_voted=voted,
    )


@router.post("/questions/{question_id}/answers", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED)
def post_answer(
    question_id: int,
    payload: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    question = get_question_by_id(db, question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )

    answer = create_answer(db, current_user, question, payload.content)

    if question.author_id != current_user.id:
        create_notification(
            db=db,
            user_id=question.author_id,
            title="New answer on your question",
            message=f"{current_user.name} answered your question: {question.title}",
            type="answer_posted",
            related_question_id=question.id,
            related_answer_id=answer.id,
        )

    return serialize_answer(answer, db, current_user)


@router.get("/questions/{question_id}/answers", response_model=list[AnswerResponse])
def list_answers(
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

    answers = get_answers_by_question(db, question_id)
    return [serialize_answer(answer, db, current_user) for answer in answers]


@router.delete("/answers/{answer_id}", response_model=ActionMessageResponse)
def remove_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer = get_answer_by_id(db, answer_id)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found."
        )

    if answer.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your own answer."
        )

    delete_answer(db, answer)
    return ActionMessageResponse(success=True, message="Answer deleted successfully.")


@router.post("/answers/{answer_id}/upvote", response_model=VoteResponse)
def upvote_answer(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer = get_answer_by_id(db, answer_id)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found."
        )

    voted = toggle_vote(db, answer_id, current_user.id)
    votes_count = count_votes(db, answer_id)

    if voted and answer.author_id != current_user.id:
        create_notification(
            db=db,
            user_id=answer.author_id,
            title="Your answer got an upvote",
            message=f"{current_user.name} upvoted your answer.",
            type="answer_upvoted",
            related_question_id=answer.question_id,
            related_answer_id=answer.id,
        )

    return VoteResponse(
        success=True,
        message="Upvote added." if voted else "Upvote removed.",
        votes_count=votes_count,
        has_voted=voted,
    )


@router.patch("/answers/{answer_id}/verify", response_model=AnswerResponse)
def verify_answer_route(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["teacher", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teacher or admin can verify answers."
        )

    answer = get_answer_by_id(db, answer_id)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found."
        )

    updated = verify_answer(db, answer)

    if updated.is_verified and answer.author_id != current_user.id:
        create_notification(
            db=db,
            user_id=answer.author_id,
            title="Your answer was verified",
            message=f"{current_user.name} verified your answer.",
            type="answer_verified",
            related_question_id=answer.question_id,
            related_answer_id=answer.id,
        )

    return serialize_answer(updated, db, current_user)


@router.patch("/answers/{answer_id}/accept", response_model=AnswerResponse)
def accept_answer_route(
    answer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    answer = get_answer_by_id(db, answer_id)
    if not answer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Answer not found."
        )

    question = get_question_by_id(db, answer.question_id)
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found."
        )

    if question.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only question owner can accept an answer."
        )

    updated = accept_answer(db, answer)

    if answer.author_id != current_user.id:
        create_notification(
            db=db,
            user_id=answer.author_id,
            title="Your answer was accepted",
            message=f"{current_user.name} accepted your answer.",
            type="answer_accepted",
            related_question_id=answer.question_id,
            related_answer_id=answer.id,
        )

    return serialize_answer(updated, db, current_user)