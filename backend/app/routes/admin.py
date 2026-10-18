import csv
import io
import pandas as pd
from app.models import user
from app.services.audit_service import log_admin_action
from fastapi import UploadFile, File
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.question import Question
from app.models.academic import AcademicHierarchy, Department, Branch, Course, AcademicCalendar, FacultyCourse
from app.schemas.admin import AdminActionResponse, PlatformStats
from app.core import security
from app.models.audit import AuditLog
from app.services.admin_service import (
    get_all_users,
    get_user_by_id,
    promote_teacher,
    promote_admin,
    suspend_user,
    get_platform_stats,
)
router = APIRouter(prefix="/admin", tags=["Admin"])


def admin_guard(current_user: User):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin access required. Operation rejected."
        )


# --- Admin User Management (Simplified) ---
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    users = get_all_users(db)
    return [{"id": u.id, "name": u.name, "email": u.email, "role": u.role} for u in users]

@router.patch("/users/{user_id}/make-teacher", response_model=AdminActionResponse)
def make_teacher(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role configuration.")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Target user account not found.")

    promote_teacher(db, user)
    return AdminActionResponse(
        success=True,
        message=f"User {user.name} promoted to teacher successfully."
    )


@router.patch("/users/{user_id}/make-admin", response_model=AdminActionResponse)
def make_admin(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    user = get_user_by_id(db, user_id)
    if not user: raise HTTPException(status_code=404, detail="User not found.")
    promote_admin(db, user)
    log_admin_action(db, current_user.id, "PROMOTE_ADMIN", user_id, f"Promoted {user.name} to admin")
    return AdminActionResponse(success=True, message="Admin promoted.")

@router.patch("/users/{user_id}/ban", response_model=AdminActionResponse)
def ban_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)

    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot ban your own account.")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Target user account not found.")

    # TOGGLE LOGIC
    if user.role == "banned":
        user.role = "student"
        msg = f"User {user.name} access has been restored to student profile."
    else:
        # Assuming suspend_user sets role to 'banned'
        suspend_user(db, user)
        msg = f"User {user.name} has been suspended from the platform dashboard."

    db.commit()
    db.refresh(user)
    log_admin_action(db, current_user.id, action, user_id, f"User {user.name} status toggled")
    return AdminActionResponse(
        success=True,
        message=msg
    )

# app/routes/admin.py mein add karo:
@router.patch("/users/{user_id}/make-student", response_model=AdminActionResponse)
def make_student(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    user = get_user_by_id(db, user_id)
    if not user: 
        raise HTTPException(status_code=404, detail="User not found.")
    
    user.role = "student"
    db.commit()
    db.refresh(user)
    return AdminActionResponse(success=True, message="Role updated to student.")

@router.get("/analytics")
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_guard(current_user)
    try:
        from app.models.user import User as UserModel
        from app.models.question import Question as QuestionModel
        from app.models.answer import Answer as AnswerModel

        u_count = db.query(UserModel).count()
        q_count = db.query(QuestionModel).count()
        a_count = db.query(AnswerModel).count()

        return JSONResponse(content={
            "total_users": int(u_count),
            "total_questions": int(q_count),
            "total_answers": int(a_count)
        })
    except Exception as e:
        stats = get_platform_stats(db)
        return JSONResponse(content={
            "total_users": getattr(stats, "total_users", 0),
            "total_questions": getattr(stats, "total_questions", 0),
            "total_answers": getattr(stats, "total_answers", 0)
        })


# 🚫 🆕 ACTION 1: LIST WORDS
@router.get("/banned-words")
def get_all_banned_words(current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    return JSONResponse(content={"words": security.BANNED_WORDS})


# 🚫 🆕 ACTION 2: ADD WORD
@router.post("/banned-words")
def add_new_banned_word(payload: dict, current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    new_word = payload.get("word", "").strip().lower()
    if not new_word:
        raise HTTPException(status_code=400, detail="Word cannot be blank.")
    if new_word not in security.BANNED_WORDS:
        security.BANNED_WORDS.append(new_word)
    return {"success": True, "message": f"'{new_word}' added to compliance filter rules."}


# 🚫 🆕 ACTION 3: REMOVE WORD
@router.delete("/banned-words/{word}")
def remove_banned_word(word: str, current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    target_word = word.strip().lower()
    if target_word in security.BANNED_WORDS:
        security.BANNED_WORDS.remove(target_word)
        return {"success": True, "message": f"'{target_word}' removed from memory rules list."}
    raise HTTPException(status_code=404, detail="Word not found in active list context.")

@router.get("/academic/filters")
def get_academic_filters(db: Session = Depends(get_db)):
    # Saara data DB se uthao
    departments = db.query(Department).all()
    branches = db.query(Branch).all()
    courses = db.query(Course).all()
    
    return {
        "departments": [{"id": d.id, "name": d.name} for d in departments],
        "branches": [{"id": b.id, "name": b.name, "dept_id": b.dept_id} for b in branches],
        "courses": [{"id": c.id, "name": c.name, "branch_id": c.branch_id} for c in courses]
    }

# 🎓 GET DYNAMIC HIERARCHY FOR FRONTEND FILTERS
@router.get("/academic/hierarchy")
def get_academic_hierarchy(db: Session = Depends(get_db)):
    # Saari hierarchy DB se uthao
    hierarchy = db.query(AcademicHierarchy).all()
    return [
        {
            "year": h.year,
            "branch": h.branch,
            "course_name": h.course_name
        } for h in hierarchy
    ]

# --- Filters & Data Endpoints ---
@router.get("/academic/all-data")
def get_all_academic_data(db: Session = Depends(get_db)):
    return {
        "departments": db.query(Department).all(),
        "branches": db.query(Branch).all(),
        "courses": db.query(Course).all(),
        "teachers": db.query(User).filter(User.role == "teacher").all(),
        "faculty_courses": db.query(FacultyCourse).all() # Yeh line add karo
    }

# routes/admin.py mein temporary
@router.get("/setup-db")
def setup_db(db: Session = Depends(get_db)):
    from app.core.database import Base, engine
    Base.metadata.create_all(bind=engine)
    return {"message": "Tables created successfully in Supabase!"}

@router.get("/academic/departments")
def get_depts(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("/academic/branches/{dept_id}")
def get_branches(dept_id: int, db: Session = Depends(get_db)):
    return db.query(Branch).filter(Branch.dept_id == dept_id).all()

@router.get("/academic/courses/{branch_id}")
def get_courses(branch_id: int, db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.branch_id == branch_id).all()

# app/routes/admin.py

@router.post("/academic/assign-faculty")
def assign_faculty_to_course(
    teacher_id: int, 
    course_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    admin_guard(current_user)
    
    # Check if assignment already exists
    existing = db.query(FacultyCourse).filter_by(teacher_id=teacher_id, course_id=course_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Teacher already assigned to this course.")
    
    new_assignment = FacultyCourse(teacher_id=teacher_id, course_id=course_id)
    db.add(new_assignment)
    db.commit()
    return {"success": True, "message": "Teacher assigned successfully."}

# app/routes/admin.py

@router.post("/academic/add-department")
def add_department(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    name = payload.get("name")
    if not name: raise HTTPException(status_code=400, detail="Name required")
    if db.query(Department).filter(Department.name == name).first():
        return {"success": False, "message": "Department already exists."}
    db.add(Department(name=name))
    db.commit()
    return {"success": True, "message": f"Department '{name}' added."}

@router.post("/academic/add-branch")
def add_branch(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    name = payload.get("name")
    dept_id = payload.get("dept_id")
    if not name or not dept_id: raise HTTPException(status_code=400, detail="Incomplete data")
    db.add(Branch(name=name, dept_id=int(dept_id)))
    db.commit()
    return {"success": True, "message": f"Branch '{name}' added."}

@router.post("/academic/add-course")
def add_course(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    name = payload.get("name")
    branch_id = payload.get("branch_id")
    if not name or not branch_id: raise HTTPException(status_code=400, detail="Incomplete data")
    db.add(Course(name=name, branch_id=int(branch_id)))
    db.commit()
    log_admin_action(db, current_user.id, "ADD_COURSE", None, f"Added course: {name}")
    return {"success": True, "message": f"Course '{name}' added."}

@router.post("/academic/link-faculty")
def link_faculty(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    t_id = payload.get("teacher_id")
    c_id = payload.get("course_id")
    if not t_id or not c_id: raise HTTPException(status_code=400, detail="IDs required")
    
    # Check duplicate
    if db.query(FacultyCourse).filter_by(teacher_id=int(t_id), course_id=int(c_id)).first():
        return {"success": False, "message": "Already linked."}
        
    db.add(FacultyCourse(teacher_id=int(t_id), course_id=int(c_id)))
    db.commit()
    log_admin_action(db, current_user.id, "ADD_FACULTY_LINK", None, f"Added link-faculty: {id(t_id)} to course: {id(c_id)}")
    return {"success": True, "message": "Faculty linked successfully."}

@router.post("/academic/add-notice")
def add_notice(payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    new_notice = AcademicCalendar(
        event_name=payload.get("notice"),
        importance_level=payload.get("level", "normal")
    )
    db.add(new_notice)
    db.commit()
    log_admin_action(db, current_user.id, "ADD_NOTICE", None, f"Added notice: {new_notice.event_name}")
    return {"success": True, "message": "Notice added successfully."}

# Student feed ke liye (Bina admin_guard ke)
@router.get("/academic/notices")
def get_notices(db: Session = Depends(get_db)):
    return db.query(AcademicCalendar).all()

@router.delete("/academic/notice/{notice_id}")
def delete_notice(notice_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    notice = db.query(AcademicCalendar).filter(AcademicCalendar.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found.")
    
    db.delete(notice)
    db.commit()
    log_admin_action(db, current_user.id, "DELETE_NOTICE", None, f"Deleted notice: {notice.event_name}")
    return {"success": True, "message": "Notice deleted successfully."}

@router.post("/academic/bulk-upload")
async def bulk_upload(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    admin_guard(current_user)
    
    # 1. File Type Check
    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file.file)
        else:
            raise HTTPException(status_code=400, detail="Sirf CSV ya Excel (.xlsx) files allow hain.")
        
        # 2. Validation: Columns Check
        required = ['name', 'branch_id']
        if not all(col in df.columns for col in required):
            raise HTTPException(
                status_code=400, 
                detail=f"Error: File mein '{required}' columns hona zaroori hai. Check kar lo!"
            )

        # 3. Data Processing
        count = 0
        for _, row in df.iterrows():
            new_course = Course(name=str(row['name']), branch_id=int(row['branch_id']))
            db.add(new_course)
            count += 1
            
        db.commit()
        log_admin_action(db, current_user.id, "BULK_UPLOAD", None, f"Uploaded file: {file.filename}")
        return {"success": True, "message": f"{count} courses successfully import ho gaye."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import fail ho gaya: {str(e)}")
    
@router.get("/admin/uncategorized-questions")
def get_uncategorized_questions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Sirf admin access
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Sirf admin access kar sakta hai.")
    
    # Jo questions uncategorized hain (course_id NULL hai)
    questions = db.query(Question).filter(Question.course_id == None).all()
    return questions

@router.get("/moderation-queue")
def get_moderation_queue(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    # Sirf wo questions jo "General" (0) ya NULL hain
    questions = db.query(Question).filter(
        (Question.course_id == 0) | (Question.course_id == None)
    ).all()
    return questions

@router.patch("/admin/questions/{question_id}/assign-course")
def assign_course(question_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
        
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # 🚀 FIXED: Removed the buggy 'user' variables that were causing the crash
    # New category assign karo
    question.course_id = payload.get("course_id")
    db.commit()
    log_admin_action(db, current_user.id, "ASSIGN_COURSE", question_id, f"Moved to course_id: {payload.get('course_id')}")
    return {"success": True}

@router.get("/audit-logs")
def get_audit_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    admin_guard(current_user)
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

# 🚀 app/routes/admin.py ke bottom mein ye control pipeline append karo:

@router.get("/faculty-performance-ledger")
def get_faculty_performance_ledger(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Strict Admin Security Guard Check
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied. Admins only.")
        
    try:
        from app.models.user import User
        from app.models.question import Question
        from app.models.answer import Answer
        
        # 1. Fetch all users registered under 'teacher' role identity
        teachers = db.query(User).filter(User.role == "teacher").all()
        
        ledger_report = []
        for t in teachers:
            # 2. Calculate actual real-time database entry weights
            # Total claims are tracked via "claimed_by_UID" format inside question tags string
            claim_pattern = f"%claimed_by_{t.id}%"
            active_claims = db.query(Question).filter(Question.tags.ilike(claim_pattern)).count()
            
            # Total verifications are tracked directly via verified_by_id on answers matrix
            verified_count = db.query(Answer).filter(Answer.verified_by_id == t.id, Answer.is_verified == True).count()
            
            ledger_report.append({
                "id": int(t.id),
                "name": str(t.name),
                "email": str(t.email),
                "active_claims": int(active_claims),
                "verified_count": int(verified_count),
                "status": "Active" if t.is_active else "Banned"
            })
            
        return JSONResponse(content=ledger_report)
        
    except Exception as e:
        print(f"❌ Admin Faculty Monitoring Engine Failure: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch faculty performance data metrics.")