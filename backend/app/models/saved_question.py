from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class SavedQuestion(Base):
    __tablename__ = "saved_questions"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    question = relationship("Question", back_populates="saved_by")

    __table_args__ = (
        UniqueConstraint("question_id", "user_id", name="uq_saved_question_user"),
    )