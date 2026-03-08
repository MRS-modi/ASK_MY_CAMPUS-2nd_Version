from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_enrollment(db: Session, enrollment_number: str) -> User | None:
    return db.query(User).filter(User.enrollment_number == enrollment_number).first()


def register_user(db: Session, payload) -> User:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise ValueError("Email is already registered.")

    if payload.enrollment_number:
        existing_enrollment = get_user_by_enrollment(db, payload.enrollment_number)
        if existing_enrollment:
            raise ValueError("Enrollment number is already registered.")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        branch=payload.branch,
        year=payload.year,
        enrollment_number=payload.enrollment_number,
        phone=payload.phone,
        address=payload.address,
        role="student",
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