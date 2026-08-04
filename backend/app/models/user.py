from app.core.base_class import Base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func 
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    enrollment_number = Column(String(100), nullable=True, index=True)
    dept_id = Column(Integer, ForeignKey("departments.id"), nullable=True) # Yeh add karo
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True) # Yeh add karo
    year = Column(String(20), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    
    role = Column(String(20), nullable=False, default="student")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reputation_points = Column(Integer, default=0, nullable=False)

    # Relationship link to Answer
    answers = relationship("Answer", back_populates="author", foreign_keys="[Answer.author_id]")
    questions = relationship("Question", back_populates="author")

    department = relationship("Department", back_populates="users")
    branch = relationship("Branch", back_populates="users")