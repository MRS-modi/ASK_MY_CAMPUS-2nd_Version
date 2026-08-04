from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.base_class import Base # Base class yahan se aayega

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    content = Column(Text, nullable=False)
    subject = Column(String(100), nullable=True, index=True)
    tags = Column(String(255), nullable=True)

    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    author = relationship("User", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    saved_by = relationship("SavedQuestion", back_populates="question")
    tag_relations = relationship("Tag", secondary="question_tags", back_populates="questions")

    # NEW FIELDS: Question posting time par user ki current branch/dept yahan store hogi
    dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)