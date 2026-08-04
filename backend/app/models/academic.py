from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.core.database import Base

class AcademicHierarchy(Base):
    __tablename__ = "academic_hierarchy"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(String(50), nullable=False)
    branch = Column(String(50), nullable=False)
    course_name = Column(String(200), nullable=False)

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    users = relationship("User", back_populates="department")
    branches = relationship("Branch", back_populates="department")

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    dept_id = Column(Integer, ForeignKey('departments.id'))

    department = relationship("Department", back_populates="branches")
    users = relationship("User", back_populates="branch")

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    branch_id = Column(Integer, ForeignKey('branches.id'))
    teacher_id = Column(Integer, ForeignKey('users.id')) 

class FacultyCourse(Base):
    __tablename__ = "faculty_courses"
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))

class AcademicCalendar(Base):
    __tablename__ = "academic_calendar"
    id = Column(Integer, primary_key=True)
    event_name = Column(String, nullable=False)
    event_date = Column(Date, nullable=True) # Deadline/Date
    importance_level = Column(String, default="normal") # normal, high, urgent