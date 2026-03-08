from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(120), nullable=False)
    father_name = Column(String(120), nullable=True)
    enrollment_number = Column(String(50), nullable=False)
    email = Column(String(150), nullable=False)
    branch = Column(String(100), nullable=True)
    year = Column(String(20), nullable=True)

    inquiry_department = Column(String(100), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)

    status = Column(String(30), nullable=False, default="submitted")
    admin_note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")