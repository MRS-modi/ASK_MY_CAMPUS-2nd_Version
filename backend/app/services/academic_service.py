from sqlalchemy.orm import Session
from app.models.academic import AcademicHierarchy

def get_all_hierarchy(db: Session):
    return db.query(AcademicHierarchy).all()

def add_hierarchy(db: Session, year: str, branch: str, course: str):
    new_entry = AcademicHierarchy(year=year, branch=branch, course_name=course)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

def delete_hierarchy(db: Session, item_id: int):
    item = db.query(AcademicHierarchy).filter(AcademicHierarchy.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()
    return item