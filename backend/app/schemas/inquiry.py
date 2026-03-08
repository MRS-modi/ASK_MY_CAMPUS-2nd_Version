from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    father_name: str | None = Field(default=None, max_length=120)
    enrollment_number: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    branch: str | None = Field(default=None, max_length=100)
    year: str | None = Field(default=None, max_length=20)
    inquiry_department: str = Field(..., min_length=2, max_length=100)
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10)


class InquiryUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(submitted|under_review|resolved|rejected)$")
    admin_note: str | None = None


class InquiryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    father_name: str | None = None
    enrollment_number: str
    email: EmailStr
    branch: str | None = None
    year: str | None = None
    inquiry_department: str
    subject: str
    message: str
    status: str
    admin_note: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True