import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.core.config import settings
from app.core.database import Base, engine
from app.models.answer import Answer
from app.models.answer_vote import AnswerVote
from app.models.inquiry import Inquiry
from app.models.notification import Notification
from app.models.question import Question
from app.models.saved_question import SavedQuestion
from app.models.user import User
from app.routes.answers import router as answers_router
from app.routes.auth import router as auth_router
from app.routes.inquiries import router as inquiries_router
from app.routes.notifications import router as notifications_router
from app.routes.questions import router as questions_router
from app.routes.saved import router as saved_router
from app.routes.admin import router as admin_router
from app.routes.comments import router as comments_router
from app.routes.faculty import router as faculty_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "https://ask-my-campus.netlify.app",
        "https://askmycampus-2ndversion-frontend.vercel.app",  # <--- Aapka naya Vercel frontend
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(questions_router)
app.include_router(answers_router)
app.include_router(saved_router)
app.include_router(notifications_router)
app.include_router(inquiries_router)
app.include_router(admin_router)
app.include_router(comments_router)
app.include_router(faculty_router)

@app.get("/")
def redirect_to_login():
    return RedirectResponse(url="/health")

@app.get("/health")
def health_check():
    return {
        "success": True,
        "environment": settings.APP_ENV
    }

@app.on_event("startup")
def startup_event():
    from app.core.database import engine, Base
    Base.metadata.create_all(bind=engine)
    print("Tables created in Supabase PostgreSQL!")