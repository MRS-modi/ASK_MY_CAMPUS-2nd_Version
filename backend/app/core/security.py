from datetime import datetime, timedelta, timezone
from typing import Any, Optional
import re  

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


# 👑 🔒 ✅ MEMORY GLOBAL CONTROLLER: Baseline words tracking catalog
BANNED_WORDS = ["scam", "cheat", "abuse"]


def censor_content(text_content: str) -> str:
    """
    Automatic Compliance Scanner: Global BANNED_WORDS list ko access karke 
    saare restricted terms ko asterisks (****) me convert karta h case-insensitively.
    """
    if not text_content or not isinstance(text_content, str):
        return text_content
        
    cleaned_text = text_content
    for word in BANNED_WORDS:
        word_len = len(word)
        asterisks = "*" * word_len
        
        insensitive_pattern = re.compile(re.escape(word), re.IGNORECASE)
        cleaned_text = insensitive_pattern.sub(asterisks, cleaned_text)
        
    return cleaned_text