from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_enrollment(db: Session, enrollment_number: str) -> User | None:
    return db.query(User).filter(User.enrollment_number == enrollment_number).first()


def register_user(db: Session, payload) -> User:
    # Safely extract incoming email configuration in normalized lower parameters
    email_clean = payload.email.strip().lower()
    
    # 🛡️ 🚀 SERVER SECURITY POLICY: Block execution if domain pattern mapping violates rule
    if not email_clean.endswith("@mitsgwl.ac.in"):
        raise ValueError("Registration rejected. You must provide a verified @mitsgwl.ac.in identity.")

    existing_user = get_user_by_email(db, email_clean)
    if existing_user:
        raise ValueError("Email is already registered.")

    if payload.enrollment_number:
        existing_enrollment = get_user_by_enrollment(db, payload.enrollment_number)
        if existing_enrollment:
            raise ValueError("Enrollment or Employee number is already registered.")

    # 🔒 ROLE EVALUATOR SHIELD: Make sure incoming data payloads cannot hijack master roles
    account_role = "student"
    if hasattr(payload, 'role') and str(payload.role).lower().strip() in ["student", "teacher"]:
        account_role = str(payload.role).lower().strip()

    user_branch_id = payload.branch_id if account_role == "student" else None
    user_year = payload.year if account_role == "student" else 0

    user = User(
        name=payload.name,
        email=email_clean,
        password_hash=hash_password(payload.password),
        dept_id=payload.dept_id,
        branch_id=user_branch_id, # <--- Yahan 'branch_id' use karo, 'branch' nahi
        year=payload.year,
        enrollment_number=payload.enrollment_number,
        phone=payload.phone,
        address=payload.address,
        role=account_role,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> str:
    user = get_user_by_email(db, email)
    if not user:
        raise ValueError("Invalid email or password.")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password.")

    if not user.is_active:
        raise ValueError("Your account is inactive.")

    return create_access_token(subject=str(user.id))