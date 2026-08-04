from app.core.base_class import Base
from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, Text, Boolean
from sqlalchemy.orm import relationship

class Answer(Base):
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)

    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    is_verified = Column(Boolean, default=False)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_accepted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # relationship link to User (via author_id)
    author = relationship("User", back_populates="answers", foreign_keys=[author_id])
    question = relationship("Question", back_populates="answers")
    comments = relationship("Comment", back_populates="answer", cascade="all, delete-orphan")
    verifier = relationship("User", foreign_keys=[verified_by_id])