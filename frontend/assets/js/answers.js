const params = new URLSearchParams(window.location.search);
const qid = params.get("id");
let currentQuestion = null;
let currentUser = null;

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return String(tags)
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function loadCurrentUserFromStorage() {
    const raw = localStorage.getItem("amc_user");
    currentUser = raw ? JSON.parse(raw) : null;
}

async function loadQuestion() {
  const questionBox = document.getElementById("questionData");
  if (!questionBox) return;

  try {
    const q = await apiRequest(`/questions/${qid}`);
    currentQuestion = q;

    const tagsArray = parseTags(q.tags);

    let tagsHTML = "";
    tagsArray.forEach(tag => {
      tagsHTML += `<span class="tag-pill">#${tag}</span>`;
    });

    const token = localStorage.getItem("token");
    const canSave = !!token;

    // Smart Bookmark lookup configurations
    let isAlreadySaved = false;
    if (canSave) {
      try {
        const savedQuestions = await apiRequest("/questions/saved");
        if (Array.isArray(savedQuestions)) {
          isAlreadySaved = savedQuestions.some(sq => sq.id === parseInt(qid));
        }
      } catch (err) {
        console.error("Saved status check failed, falling back to default:", err);
      }
    }

    const initialText = isAlreadySaved ? "⭐ Question Saved" : "⭐ Save Question";
    const initialBg = isAlreadySaved ? "var(--accent-color, #a78bfa)" : "transparent";
    const initialColor = isAlreadySaved ? "#fff" : "var(--text-main, #e2e8f0)";
    const initialBorder = isAlreadySaved ? "1px solid var(--accent-color, #a78bfa)" : "1px solid var(--border-color, #334155)";

    // 🔐 GUARD SWITCH: User owner h ya role admin h tabhi Main Question Thread delete ho sake
    const canDeleteMainQuestion = currentUser && (currentUser.id === q.author_id || currentUser.role === "admin");
    const mainDeleteButtonHTML = canDeleteMainQuestion
      ? `<button class="btn-secondary" style="background:#f8717111; color:#f87171; border:1px solid #f8717133; transition: all 0.2s;" onclick="deleteMainQuestionAction(${q.id})">🗑️ Delete Thread</button>`
      : "";

    questionBox.innerHTML = `
      <div class="detail-title">${q.title}</div>

      <div class="detail-meta">
        Asked by <strong>${q.author_name}</strong> • ${q.author_role}
        ${q.subject ? `• ${q.subject}` : ""}
      </div>

      <div class="detail-content">
        ${q.content}
      </div>

      <div class="question-tags">
        ${tagsHTML || '<span class="tag-pill">#General</span>'}
      </div>

      <div style="margin-top:18px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        ${canSave ? `<button id="saveQuestionBtn" class="btn-secondary" style="background:${initialBg}; color:${initialColor}; border:${initialBorder}; transition: all 0.2s ease;" onclick="saveQuestion()">${initialText}</button>` : ""}
        ${mainDeleteButtonHTML}
      </div>
    `;
  } catch (error) {
    questionBox.innerHTML = `
      <div class="empty-state" style="color:#f87171;">Failed to load question details.</div>
    `;
    console.error(error);
  }
}

async function loadAnswers() {
    const container = document.getElementById("answersList");
    if (!container) return;

    try {
        const answers = await apiRequest(`/questions/${qid}/answers`);
        container.innerHTML = "";

        if (!Array.isArray(answers) || answers.length === 0) {
            container.innerHTML = `<div class="card"><p class="empty-state">No answers yet. Be the first to help.</p></div>`;
            return;
        }

        // Latest answers on top
        answers.sort((a, b) => b.id - a.id);

        answers.forEach((a) => {
            const isAI = a.author_email === "ai.bot@campus.edu";
            
            // Badges Layout
            const verified = a.is_verified ? `<span class="badge-verified" style="font-size:11px; padding:2px 6px;">✔ Verified</span>` : "";
            const accepted = a.is_accepted ? `<span class="badge-accepted" style="font-size:11px; padding:2px 6px;">Accepted ✔</span>` : "";
            
            const canVerify = currentUser && (currentUser.role === "teacher" || currentUser.role === "admin");
            const canAccept = currentUser && currentQuestion && currentUser.id === currentQuestion.author_id && !a.is_accepted;
            const canDeleteAnswer = currentUser && (currentUser.id === a.author_id || currentUser.role === "admin");
            const deleteAnsBtnHTML = canDeleteAnswer ? `<button class="btn-secondary compact-action-btn" style="color:#f87171; border:1px solid #f8717133;" onclick="deleteAnswerAction(${a.id})">🗑️ Delete</button>` : "";

            // Loop comments
            let commentsHTML = "";
            if (a.comments && a.comments.length > 0) {
                a.comments.forEach(c => {
                    commentsHTML += `
                        <div class="comment-item" style="background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; font-size: 13px;">
                            <span style="font-weight:700; color:var(--accent-color, #a78bfa); display:block; font-size:12px; margin-bottom:2px;">${c.author_name}</span>
                            <p style="color: var(--text-soft); margin: 0; line-height: 1.4;">${c.content}</p>
                        </div>`;
                });
            } else {
                commentsHTML = `<p class="no-comments-yet" style="font-size: 11px; color: var(--text-muted); margin: 4px 0;">No suggestions yet.</p>`;
            }

            // 🚀 FIX: Secure Check if parent question is marked resolved in tags string scope
            const isQuestionResolved = currentQuestion && (
                currentQuestion.is_resolved || 
                (currentQuestion.tags && currentQuestion.tags.includes("resolved_lock"))
            );

            let commentFormHTML = "";

            if (isQuestionResolved) {
                // 🔒 CASE 0: Thread marked locked and closed
                commentFormHTML = `
                    <div style="margin-top: 10px; padding: 8px 12px; background: rgba(16, 185, 129, 0.05); border: 1px dashed #10b981; border-radius: 6px; font-size: 12px; color: #10b981; font-weight: 600; text-align: center;">
                        🔒 This discussion thread has been marked as resolved and locked by Faculty.
                    </div>`;
            } else {
                // Comment input panel logic guard
                const hasCommentAccess = currentUser && (
                    currentUser.id === currentQuestion.author_id || 
                    currentUser.id === a.author_id || 
                    currentUser.role === "teacher" || 
                    currentUser.role === "admin"
                );

                // FIX 1: INLINE COMPACT ARROW BUTTON (No layout break)
                commentFormHTML = hasCommentAccess ? `
                    <div class="inline-comment-form" style="display: flex; gap: 6px; margin-top: 10px; align-items: center; width: 100%; box-sizing: border-box;">
                        <input type="text" id="commentInput-${a.id}" placeholder="Type a suggestion..." style="flex-grow: 1; min-width: 0; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: #fff; font-size: 13px;" />
                        <button class="btn-primary" style="padding: 8px 14px; font-size: 14px; font-weight:700; cursor:pointer; flex-shrink: 0; border-radius: 6px;" title="Post Comment" onclick="postNewComment(event, ${a.id})">➤</button>
                    </div>` : `
                    <div style="margin-top: 10px; font-size: 11px; color: var(--text-muted); font-style: italic; opacity: 0.7;">
                        🔒 Only authors or faculty can comment.
                    </div>`;
            }

            const card = document.createElement("article");
            card.className = `answer-card ${isAI ? 'ai-answer-card' : ''}`;
            
            card.innerHTML = `
                <div class="answer-top">
                    <div>
                        <div class="answer-author" style="font-weight: 700; font-size: 15px;">
                            ${isAI ? '🤖 Campus AI' : a.author_name} 
                            ${verified} ${accepted}
                        </div>
                        <div class="answer-role" style="opacity: 0.8; font-size: 12px;">${isAI ? 'System Engine' : a.author_role}</div>
                    </div>
                </div>
                
                <div class="answer-content" style="white-space: pre-wrap; line-height: 1.6; color: #f1f5f9; font-weight: 500; font-size: 15px; margin-bottom: 14px;">${a.content}</div>
                
                <div class="answer-comments-wrapper" style="border-top: 1px solid var(--border-color, #334155); padding-top: 12px; margin-top: 12px;">
                    <h5 style="margin: 0 0 8px 0; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Discussion & Suggestions</h5>
                    <div id="commentsBoxList-${a.id}" class="comments-section" style="max-height: 160px; overflow-y: auto;">
                        ${commentsHTML}
                    </div>
                    ${commentFormHTML}
                </div>

                <div class="answer-actions flex-button-container" style="margin-top:14px; display:flex; gap:6px; width: 100%;">
                  <button class="vote-btn compact-action-btn" onclick="upvote(${a.id})">⬆ Upvote (${a.votes_count ?? 0})</button>
                  ${canVerify && !a.is_verified ? `<button class="btn-secondary compact-action-btn" onclick="verifyAnswer(${a.id})">✔ Verify</button>` : ""}
                  ${canAccept ? `<button class="btn-secondary compact-action-btn" onclick="acceptAnswer(${a.id})">✅ Accept</button>` : ""}
                  ${deleteAnsBtnHTML}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="card"><p style="color:#f87171;">Failed to load answers.</p></div>`;
    }
}

async function postNewComment(event, answerId) {
    event.preventDefault();
    const inputElement = document.getElementById(`commentInput-${answerId}`);
    if (!inputElement) return;

    const commentText = inputElement.value.trim();
    if (!commentText) return;

    try {
        await apiRequest(`/answers/${answerId}/comment`, "POST", { content: commentText });
        inputElement.value = "";
        await loadAnswers(); 
    } catch (err) {
        console.error("Error matching comments insertion:", err);
    }
}
// 🗑️ WORKFLOW FOR DELETING MAIN THREAD FROM DETAILS PAGE
async function deleteMainQuestionAction(questionId) {
  if (!confirm("Bhai, kya sach me is poore question thread ko udaana chahte ho?")) return;
  try {
    await apiRequest(`/questions/${questionId}`, "DELETE");
    alert("Question thread successfully deleted!");
    window.location.href = "index.html"; // Redirect to feed after deletion
  } catch (err) {
    console.error(err);
    alert(err.message || "Failed to execute question removal.");
  }
}

// 🗑️ WORKFLOW FOR DELETING INDIVIDUAL ANSWERS
async function deleteAnswerAction(answerId) {
  if (!confirm("Bhai, kya sach me is answer ko delete karna chahte ho?")) return;
  try {
    await apiRequest(`/answers/${answerId}`, "DELETE");
    alert("Answer successfully removed!");
    loadAnswers(); // Fresh list rendering reload
  } catch (err) {
    console.error(err);
    alert(err.message || "Answer deletion execution timed out.");
  }
}

async function postAnswer() {
  const text = document.getElementById("answerText").value.trim();
  const msg = document.getElementById("answerMessage");
  const postBtn = document.getElementById("answerPostBtn"); // Ensure your HTML button has this ID
  const token = localStorage.getItem("token");

  if (!text) { msg.textContent = "Answer cannot be empty."; return; }
  if (!token) { msg.textContent = "You must login first."; return; }

  // Double-post prevent logic
  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  try {
    await apiRequest(`/questions/${qid}/answers`, "POST", { content: text });
    // Page reload to ensure fresh state and stop duplicate submissions
    window.location.reload();
  } catch (error) {
    msg.textContent = error.message || "Failed to post answer.";
    postBtn.disabled = false;
    postBtn.textContent = "Post Answer";
  }
}

async function upvote(id) {
  const token = localStorage.getItem("token");
  if (!token) { alert("You must login first before upvoting."); return; }
  try {
    await apiRequest(`/answers/${id}/upvote`, "POST");
    loadAnswers();
  } catch (error) { console.error(error); }
}

async function verifyAnswer(id) {
  try {
    await apiRequest(`/answers/${id}/verify`, "PATCH");
    loadAnswers();
  } catch (error) { console.error(error); }
}

function renderAnswer(answer, currentUser) {
    let verifyBtn = '';
    // Agar current user teacher/admin hai aur answer verify nahi hua hai
    if ((currentUser.role === 'teacher' || currentUser.role === 'admin') && !answer.is_verified) {
        verifyBtn = `<button onclick="verifyAnswer(${answer.id})" class="verify-btn">✅ Verify Answer</button>`;
    }

    return `
        <div class="answer-card">
            <p>${answer.content}</p>
            ${answer.is_verified ? '<span class="verified-badge">✔ Verified by Expert</span>' : ''}
            ${verifyBtn}
        </div>
    `;
}

async function acceptAnswer(id) {
  try {
    await apiRequest(`/answers/${id}/accept`, "PATCH");
    loadAnswers();
  } catch (error) { console.error(error); }
}

async function saveQuestion() {
  const saveBtn = document.getElementById("saveQuestionBtn");
  if (!saveBtn) return;

  try {
    const response = await apiRequest(`/questions/${qid}/save`, "POST");
    if (response) {
      if (response.is_saved) {
        saveBtn.innerHTML = "⭐ Question Saved";
        saveBtn.style.background = "var(--accent-color, #a78bfa)";
        saveBtn.style.color = "#fff";
        saveBtn.style.border = "1px solid var(--accent-color, #a78bfa)";
      } else {
        saveBtn.innerHTML = "⭐ Save Question";
        saveBtn.style.background = "transparent";
        saveBtn.style.color = "var(--text-main, #e2e8f0)";
        saveBtn.style.border = "1px solid var(--border-color, #334155)";
      }
    }
  } catch (error) {
    console.error("Save toggle error:", error);
  }
}

async function postFacultyComment(answerId) {
    const textarea = document.getElementById(`comment-${answerId}`);
    const content = textarea.value.trim();
    
    if (!content) {
        alert("Feedback box khali hai!");
        return;
    }

    try {
        await apiRequest(`/answers/${answerId}/comment`, "POST", { content: content });
        alert("Feedback posted!");
        textarea.value = ""; 
        loadAnswers();
    } catch (err) {
        console.error("Feedback error:", err);
        alert("Feedback post karne mein error aaya. Check console.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCurrentUserFromStorage();
    if (qid) {
        loadQuestion().then(loadAnswers);
    }
});

// Function to render each answer
function renderSingleAnswer(answer, currentUser) {
    const isTeacherOrAdmin = (currentUser.role === 'teacher' || currentUser.role === 'admin');
    
    // Verified Badge
    const badge = answer.is_verified 
        ? `<span style="background:#dcfce7; color:#166534; padding:4px 8px; border-radius:4px; font-size:12px; font-weight:700; margin-left:10px;">✔ Verified Expert</span>` 
        : '';

    // Verify Button
    const verifyBtn = (isTeacherOrAdmin && !answer.is_verified) 
        ? `<button onclick="verifyAnswer(${answer.id})" style="background:#8b5cf6; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:12px;">Verify Answer</button>` 
        : '';

    return `
        <div class="answer-card" style="margin-bottom:15px; padding:15px; border:1px solid #334155; border-radius:8px;">
            <p>${answer.content}</p>
            <div style="margin-top:10px;">
                <strong>${answer.author_name}</strong> ${badge}
                <div style="margin-top:5px;">${verifyBtn}</div>
            </div>
        </div>
    `;
}

window.verifyAnswer = async function(answerId) {
    try {
        const response = await apiRequest(`/answers/${answerId}/verify`, "PATCH");
        if (response.id) { // Backend se updated answer object mil raha hai
            Swal.fire("Verified!", "Answer ab trusted mark ho gaya hai.", "success");
            // Yahan wapas se list load kar lo
            location.reload(); 
        }
    } catch (err) {
        Swal.fire("Error", "Verify karne mein dikkat aayi.", "error");
    }
};