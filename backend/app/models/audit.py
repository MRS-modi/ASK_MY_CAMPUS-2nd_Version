from sqlalchemy import Column, Integer, String, DateTime, func
from app.core.base_class import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, index=True) 
    action = Column(String) 
    target_id = Column(Integer, nullable=True) 
    details = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())