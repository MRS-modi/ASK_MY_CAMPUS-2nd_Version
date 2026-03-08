from app.services.auth_service import register_user, login_user
from app.services.question_service import (
    create_question,
    get_all_questions,
    get_question_by_id,
    get_my_questions,
    delete_question,
    get_trending_questions,
)
from app.services.answer_service import (
    create_answer,
    get_answers_by_question,
    get_answer_by_id,
    delete_answer,
    verify_answer,
    accept_answer,
)
from app.services.vote_service import (
    get_vote,
    toggle_vote,
    count_votes,
    has_user_voted,
)
from app.services.saved_service import (
    get_saved_record,
    toggle_saved_question,
    is_question_saved,
    get_saved_questions_for_user,
)
from app.services.notification_service import (
    create_notification,
    get_notifications_for_user,
    get_notification_by_id,
    mark_notification_as_read,
)
from app.services.inquiry_service import (
    create_inquiry,
    get_my_inquiries,
    get_all_inquiries,
    get_inquiry_by_id,
    update_inquiry_status,
)