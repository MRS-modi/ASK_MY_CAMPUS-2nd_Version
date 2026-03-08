from pydantic import BaseModel


class AdminActionResponse(BaseModel):
    success: bool
    message: str


class PlatformStats(BaseModel):
    total_users: int
    total_questions: int
    total_answers: int