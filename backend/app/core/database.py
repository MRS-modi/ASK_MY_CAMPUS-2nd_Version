from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.base_class import Base # Yahan se Base lo

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Har query se pehle connection health verify karta hai
    pool_recycle=300,        # 5 mins me stale connection drop karta hai
    pool_size=5,             # Limit connections to prevent Supabase drops
    max_overflow=10
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()