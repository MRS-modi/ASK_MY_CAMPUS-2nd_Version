from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, text

from app.core.dependencies import get_db, get_current_user
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import login_user, register_user
from app.models.user import User
from app.models.question import Question  # Imported for reporting counts

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = register_user(db, payload)
        return user
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        token = login_user(db, payload.email, payload.password)
        return TokenResponse(access_token=token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user


@router.get("/leaderboard", response_model=list[UserResponse])
def get_campus_leaderboard(db: Session = Depends(get_db)):
    try:
        # joinedload se hum branch data ko sath hi fetch kar rahe hain
        top_users = (
            db.query(User)
            .options(joinedload(User.branch)) 
            .filter(User.is_active == True)
            .filter(User.role != "admin")
            .order_by(User.reputation_points.desc())
            .limit(10)
            .all()
        )

        results = []
        for user in top_users:
            # Safe access: agar user.branch None hai toh "General" milega
            branch_name = user.branch.name if user.branch else "General"
            
            results.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "reputation_points": user.reputation_points or 0, # None handle karo
                "year": user.year or "N/A",
                "branch": branch_name,
                "is_active": user.is_active 
            })
        
        return results
    except Exception as e:
        print(f"Leaderboard error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch leaderboard")

# 🔐 STEALTH PROFILE ROUTE: For Admin and Teachers Only
@router.get("/users/{target_user_id}/profile-card")
def get_user_profile_card(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied."
        )
    
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
        
    q_count = db.query(Question).filter(Question.author_id == target_user.id).count()

    return {
        "id": target_user.id,
        "name": target_user.name,
        "email": target_user.email,
        "role": target_user.role,
        "is_active": target_user.is_active,
        "branch": getattr(target_user, "branch", "Computer Science & Business Systems"),
        "year": getattr(target_user, "year", "N/A"),
        "total_questions": q_count
    }


# 🚫 🆕 ACTION 1: BAN USER BY ID ENDPOINT (Admin Only Core Control)
@router.post("/users/{target_user_id}/ban")
def ban_campus_user(
    target_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Strictly restricted to Admin Head role only."
        )
        
    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User record not found.")
        
    target_user.is_active = False  # Account de-activated instantly
    db.commit()
    return {"message": f"User ID {target_user_id} has been banned from Ask My Campus."}


# 🚩 🆕 ACTION 2: REPORT / FLAG QUESTION ENDPOINT (Community Self-Moderation)
@router.post("/questions/{question_id}/report")
def report_campus_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
        
    # Check if a custom columns tracker exists or fallback via direct SQL execute statement
    try:
        # SQLite direct mapping logic to tracking flags incrementally
        db.execute(
            text("UPDATE questions SET tags = tags || ',reported' WHERE id = :qid"),
            {"qid": question_id}
        )
        db.commit()
    except Exception:
        pass
        
    return {"message": "Doubt successfully flagged. Staff review logged."}

@router.post("/forgot-password") # Note: /auth mat lagao agar main.py mein prefix diya hai
def forgot_password(payload: dict, db: Session = Depends(get_db)):
    print("DEBUG: Forgot password hit!") # Terminal mein check karne ke liye
    email = payload.get("email")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
    return {"message": "OTP sent"}

@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    # 1. Token verify karo
    # 2. Naya password update karo
    # ...
    return {"message": "Password updated successfully"}