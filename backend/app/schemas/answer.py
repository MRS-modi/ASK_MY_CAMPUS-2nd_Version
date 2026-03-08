from datetime import datetime

from pydantic import BaseModel, Field


class AnswerCreate(BaseModel):
    content: str = Field(..., min_length=5)


class VoteResponse(BaseModel):
    success: bool
    message: str
    votes_count: int
    has_voted: bool


class ActionMessageResponse(BaseModel):
    success: bool
    message: str


class AnswerResponse(BaseModel):
    id: int
    content: str
    question_id: int
    author_id: int
    author_name: str
    author_role: str
    is_verified: bool
    is_accepted: bool
    created_at: datetime
    votes_count: int
    has_voted: bool = False

    class Config:
        from_attributes = True