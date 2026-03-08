from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)

    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    is_verified = Column(Boolean, default=False)
    is_accepted = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("User")
    question = relationship("Question")