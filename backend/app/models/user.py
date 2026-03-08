from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    branch = Column(String(100), nullable=True)
    year = Column(String(20), nullable=True)
    enrollment_number = Column(String(50), nullable=True, unique=True)
    phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)

    role = Column(String(20), nullable=False, default="student")
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())