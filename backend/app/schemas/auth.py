from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    dept_id: int | None = None
    branch_id: int | None = None
    year: int | None = None  # Frontend se int aa raha hai, toh int rakho
    enrollment_number: str | None = None
    phone: str | None = None
    address: str | None = None
    role: str # Frontend se 'student' ya 'teacher' aa raha hai


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    branch: Optional[str] | None = None
    year: Optional[str] | None = None
    enrollment_number: str | None = None
    phone: str | None = None
    address: str | None = None
    role: str
    is_active: Optional[bool] = True

    reputation_points: int

    class Config:
        from_attributes = True