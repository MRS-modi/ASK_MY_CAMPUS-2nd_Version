import os
import httpx
import asyncio
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import or_, text

from app.models.user import User
from app.models.answer import Answer
from app.models.question import Question

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AI_ANSWER_ENABLED = os.getenv("AI_ANSWER_ENABLED", "true").lower() == "true"

# GROQ CLOUD ENDPOINT CONFIGURATION
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def fetch_local_campus_context(db: Session, question_title: str, current_question_id: int) -> str:
    """1️⃣ SEMANTIC DATABASE LOOKUP: Fetch historical campus context (RAG)."""
    context_str = ""
    try:
        keywords = [kw.strip() for kw in question_title.split() if len(kw.strip()) > 3]
        if not keywords:
            keywords = [question_title]

        filters = [Question.title.ilike(f"%{kw}%") for kw in keywords]
        
        similar_questions = (
            db.query(Question)
            .filter(Question.id != current_question_id)
            .filter(or_(*filters))
            .limit(3)
            .all()
        )

        if similar_questions:
            context_str += "Here is the relevant historical data and verified knowledge from our campus database:\n"
            for q in similar_questions:
                best_answer = (
                    db.query(Answer)
                    .filter(Answer.question_id == q.id)
                    .order_by(Answer.is_verified.desc(), Answer.is_accepted.desc())
                    .first()
                )
                if best_answer:
                    context_str += f"- Past Question: '{q.title}' (ID: {q.id})\n"
                    context_str += f"  Verified Campus Solution: {best_answer.content[:300]}\n\n"
    except Exception as e:
        print(f"⚠️ Context Fetcher non-critical warning: {str(e)}")
    
    return context_str


async def generate_ai_tags(question_title: str, question_content: str, needed_count: int = 2) -> list[str]:
    """2️⃣ AUTO-TAGGING ENGINE: Groq High-Speed Parser with High-Limit 8B Model."""
    if not GROQ_API_KEY or not AI_ANSWER_ENABLED or needed_count <= 0:
        return []

    prompt = (
        f"Analyze this doubt title: '{question_title}' and content: '{question_content}'. "
        f"Return ONLY a comma-separated list of EXACTLY {needed_count} highly relevant, distinct, "
        f"lowercase tech/academic tags/hashtags matching the context. Do NOT include formatting, prefixes, or spaces."
    )
    
    payload = {
        "model": "llama-3.1-8b-instant",  # 🚀 Switched to high rate-limit model
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.2
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(GROQ_URL, json=payload, headers=headers, timeout=10.0)
            if response.status_code == 200:
                text_content = response.json()['choices'][0]['message']['content']
                ai_tags = [t.strip().replace("#", "").lower() for t in text_content.split(",") if t.strip()]
                return ai_tags[:needed_count]
            else:
                print(f"⚠️ Groq Auto-Tagging Status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"⚠️ Groq Auto-Tagging network delay: {str(e)}")
    return []

async def generate_ai_suggestion(question_title: str, question_content: str, local_context: str = "") -> str:
    """3️⃣ CORE AI GENERATOR: Groq Llama-3.1 8B Instant Execution Engine."""
    if not GROQ_API_KEY or not AI_ANSWER_ENABLED:
        return "AI Assistant is currently offline."

    system_prompt = (
        "You are 'Campus AI', a premium engineering mentor. Your response must be extremely professional, "
        "structured, and clean. DO NOT write long paragraphs. Use clear line breaks and short bullet points. "
        "Bold key terms so they stand out instantly. Keep it highly readable at a single glance."
    )
    
    user_content = f"""
    Please answer this college student query using clean bullet points and proper spacing.
    
    Student Query: {question_title}
    Details: {question_content}
    
    {local_context}
    
    Provide the answer now:
    """
    
    payload = {
        "model": "llama-3.1-8b-instant",  # 🚀 Switched to high rate-limit model
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.3
    }
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(GROQ_URL, json=payload, headers=headers, timeout=20.0)
                if response.status_code == 200:
                    raw_content = response.json()['choices'][0]['message']['content'].strip()
                    
                    formatted_content = (
                        raw_content
                        .replace("\n", "<br>")
                        .replace("### ", "<br><strong>")
                        .replace("#### ", "<br><strong>")
                        .replace("**", "<strong>")
                        .replace("<strong>\n", "<strong><br>")
                    )
                    return formatted_content
                else:
                    print(f"❌ GROQ API ERROR {response.status_code}: {response.text}")
        except Exception as e:
            print(f"⚠️ Connection attempt {attempt + 1} to Groq failed: {str(e)}")
        await asyncio.sleep(1.0)

    return "Campus AI is temporarily calibrating under heavy workload. Please try checking back later!"


async def post_ai_answer_task(db_session_factory, question_id: int, title: str, content: str):
    """4️⃣ ORCHESTRATION PIPELINE: Transaction management flow."""
    db_context_session = db_session_factory()
    local_campus_data = ""
    try:
        local_campus_data = fetch_local_campus_context(db_context_session, title, question_id)
    finally:
        db_context_session.close()

    ai_response = await generate_ai_suggestion(title, content, local_campus_data)
    ai_tags = await generate_ai_tags(title, content)

    db = db_session_factory()
    try:
        ai_bot = db.query(User).filter(User.email == "ai.bot@campus.edu").first()
        if not ai_bot:
            ai_bot = User(
                name="Campus AI ✨", email="ai.bot@campus.edu", role="teacher",
                password_hash="secured_system_bot_hash", branch_id=1, year="AI Engine"
            )
            db.add(ai_bot); db.commit(); db.refresh(ai_bot)

        ai_answer = Answer(content=ai_response, question_id=question_id, author_id=ai_bot.id, is_verified=True)
        db.add(ai_answer); db.commit()
        print(f"🚀 SUCCESS: Next-Gen Contextual AI Response saved via Groq for Question ID {question_id}")

        if ai_tags:
            from app.models.tag import Tag, question_tags
            current_q = db.query(Question).filter(Question.id == question_id).first()
            if current_q:
                existing_tags = current_q.tags.split(",") if current_q.tags else []
                updated_set = set([t.strip().lower() for t in existing_tags if t.strip()])
                
                for tag_name in ai_tags:
                    tag_obj = db.query(Tag).filter(Tag.name == tag_name).first()
                    if not tag_obj:
                        tag_obj = Tag(name=tag_name)
                        db.add(tag_obj); db.flush()
                    try:
                        link_exists = db.execute(
                            text("SELECT 1 FROM question_tags WHERE question_id = :qid AND tag_id = :tid"),
                            {"qid": question_id, "tid": tag_obj.id}
                        ).fetchone()
                        if not link_exists:
                            db.execute(question_tags.insert().values(question_id=question_id, tag_id=tag_obj.id))
                        updated_set.add(tag_name)
                    except: pass
                current_q.tags = ",".join(list(updated_set))
                db.add(current_q); db.commit()
                print(f"🏷️ SUCCESS: Automated Tag links synchronized for Question ID {question_id}")
    except Exception as e:
        db.rollback()
        print(f"❌ DB Worker execution failure: {str(e)}")
    finally:
        db.close()