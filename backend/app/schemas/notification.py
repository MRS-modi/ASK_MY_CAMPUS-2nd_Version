from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    related_question_id: int | None = None
    related_answer_id: int | None = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationActionResponse(BaseModel):
    success: bool
    message: str