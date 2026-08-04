from datetime import datetime
from pydantic import BaseModel, Field

class TagResponse(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class QuestionCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    content: str = Field(..., min_length=10)
    subject: str | None = Field(default=None, max_length=100)
    tags: str | None = Field(default=None, max_length=255)
    
    # 🚀 NEW: Add structural parameter constraints mapping fields
    dept_id: int | None = Field(default=None)
    branch_id: int | None = Field(default=None)
    course_id: int | None = Field(default=None)

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
    
    author_year: str | int | None = None
    author_branch: str | int | None = None
    
    tag_list: list[TagResponse] = []

    class Config:
        from_attributes = True