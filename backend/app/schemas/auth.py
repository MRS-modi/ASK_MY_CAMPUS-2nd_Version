from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    branch: str | None = None
    year: str | None = None
    enrollment_number: str | None = None
    phone: str | None = None
    address: str | None = None


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
    branch: str | None = None
    year: str | None = None
    enrollment_number: str | None = None
    phone: str | None = None
    address: str | None = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True