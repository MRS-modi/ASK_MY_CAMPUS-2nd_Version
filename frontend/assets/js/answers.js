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

    const canSave = !!localStorage.getItem("token");

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

      <div style="margin-top:18px; display:flex; gap:12px; flex-wrap:wrap;">
        ${canSave ? `<button class="btn-secondary" onclick="saveQuestion()">⭐ Save Question</button>` : ""}
      </div>
    `;
  } catch (error) {
    questionBox.innerHTML = `
      <div class="empty-state" style="color:#f87171;">
        Failed to load question details.
      </div>
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
      container.innerHTML = `
        <div class="card">
          <p class="empty-state">No answers yet. Be the first to help.</p>
        </div>
      `;
      return;
    }

    answers.forEach((a) => {
      const verified = a.is_verified
        ? `<span class="verified-badge">Verified ✅</span>`
        : "";

      const accepted = a.is_accepted
        ? `<span class="accepted-badge">Accepted ✔</span>`
        : "";

      const canVerify = currentUser && (currentUser.role === "teacher" || currentUser.role === "admin");
      const canAccept = currentUser && currentQuestion && currentUser.id === currentQuestion.author_id;

      const card = document.createElement("article");
      card.className = "answer-card";

      card.innerHTML = `
        <div class="answer-top">
          <div>
            <div class="answer-author">${a.author_name}</div>
            <div class="answer-role">${a.author_role}</div>
          </div>

          <div class="answer-right-badges">
            ${verified}
            ${accepted}
          </div>
        </div>

        <div class="answer-content">
          ${a.content}
        </div>

        <div class="answer-actions">
          <div class="answer-left-actions">
            <button class="vote-btn" onclick="upvote(${a.id})">
              ⬆ Upvote (${a.votes_count ?? 0})
            </button>

            ${canVerify ? `<button class="btn-secondary" onclick="verifyAnswer(${a.id})">✔ Verify</button>` : ""}
            ${canAccept ? `<button class="btn-secondary" onclick="acceptAnswer(${a.id})">✅ Accept</button>` : ""}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `
      <div class="card">
        <p style="color:#f87171;">Failed to load answers.</p>
      </div>
    `;
    console.error(error);
  }
}

async function postAnswer() {
  const text = document.getElementById("answerText").value.trim();
  const msg = document.getElementById("answerMessage");
  const token = localStorage.getItem("token");

  msg.textContent = "";

  if (!text) {
    msg.textContent = "Answer cannot be empty.";
    return;
  }

  if (!token) {
    msg.textContent = "You must login first before posting an answer.";
    return;
  }

  try {
    await apiRequest(`/questions/${qid}/answers`, "POST", {
      content: text
    });

    document.getElementById("answerText").value = "";
    msg.textContent = "Answer posted successfully.";
    loadAnswers();
  } catch (error) {
    msg.textContent = error.message || "Failed to post answer.";
  }
}

async function upvote(id) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You must login first before upvoting.");
    return;
  }

  try {
    await apiRequest(`/answers/${id}/upvote`, "POST");
    loadAnswers();
  } catch (error) {
    console.error(error);
  }
}

async function verifyAnswer(id) {
  try {
    await apiRequest(`/answers/${id}/verify`, "PATCH");
    loadAnswers();
  } catch (error) {
    console.error(error);
  }
}

async function acceptAnswer(id) {
  try {
    await apiRequest(`/answers/${id}/accept`, "PATCH");
    loadAnswers();
  } catch (error) {
    console.error(error);
  }
}

async function saveQuestion() {
  try {
    await apiRequest(`/saved/questions/${qid}`, "POST");
    alert("Save action completed.");
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUserFromStorage();
  if (qid) {
    loadQuestion().then(loadAnswers);
  }
});