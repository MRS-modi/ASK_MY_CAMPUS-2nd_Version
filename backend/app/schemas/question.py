from datetime import datetime

from pydantic import BaseModel, Field


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=10)
    subject: str | None = Field(default=None, max_length=100)
    tags: str | None = Field(default=None, max_length=255)


class QuestionResponse(BaseModel):
    id: int
    title: str
    content: str
    subject: str | None = None
    tags: str | None = None
    created_at: datetime

    author_id: int
    author_name: str
    author_role: str

    class Config:
        from_attributes = True