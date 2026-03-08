from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint

from app.core.database import Base


class AnswerVote(Base):
    __tablename__ = "answer_votes"

    id = Column(Integer, primary_key=True, index=True)
    answer_id = Column(Integer, ForeignKey("answers.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("answer_id", "user_id", name="uq_answer_user_vote"),
    )