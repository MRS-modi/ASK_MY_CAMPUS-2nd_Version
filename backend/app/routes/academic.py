from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.service import academic_service

router = APIRouter(prefix="/admin/academics", tags=["Academics"])

@router.get("/")
def get_hierarchy(db: Session = Depends(get_db)):
    return academic_service.get_all_hierarchy(db)

@router.post("/")
def add_new_rule(payload: dict, db: Session = Depends(get_db), user = Depends(get_current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Forbidden")
    return academic_service.add_hierarchy(db, payload['year'], payload['branch'], payload['course'])

@router.delete("/{item_id}")
def delete_rule(item_id: int, db: Session = Depends(get_db), user = Depends(get_current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Forbidden")
    return academic_service.delete_hierarchy(db, item_id)