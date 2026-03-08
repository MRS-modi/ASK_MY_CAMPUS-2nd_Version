function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return String(tags)
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function renderQuestionCards(containerId, questions, emptyText = "No questions found.") {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(questions) || questions.length === 0) {
    container.innerHTML = `
      <div class="card">
        <p style="color:var(--text-soft);">${emptyText}</p>
      </div>
    `;
    return;
  }

  questions.forEach((q) => {
    const card = document.createElement("article");
    card.className = "question-card";

    const tagsArray = parseTags(q.tags);

    let tagsHTML = "";
    tagsArray.forEach((tag) => {
      tagsHTML += `<span class="tag-pill">#${tag}</span>`;
    });

    card.innerHTML = `
      <div class="question-footer" style="margin-top:0; margin-bottom:12px;">
        <h3 class="question-title">${q.title}</h3>
        <a href="question.html?id=${q.id}" style="color:#a78bfa;font-weight:600;">View →</a>
      </div>

      <div class="question-meta">
        Asked by ${q.author_name} • ${q.subject ? q.subject : "General"}
      </div>

      <div class="question-tags">
        ${tagsHTML || '<span class="tag-pill">#General</span>'}
      </div>

      <div class="question-footer">
        <div class="question-actions">
          <span>📝 ${q.author_role}</span>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function loadQuestions(type = "recent") {
  try {
    let endpoint = "/questions";

    if (type === "trending") {
      endpoint = "/questions/trending";
    }

    const questions = await apiRequest(endpoint);
    renderQuestionCards("questionsList", questions, "No questions found.");
    updateFilterButtons(type);
  } catch (error) {
    const container = document.getElementById("questionsList");
    if (container) {
      container.innerHTML = `
        <div class="card">
          <p style="color:#f87171;">Failed to load questions.</p>
        </div>
      `;
    }
    console.error(error);
  }
}

function updateFilterButtons(type) {
  const recentBtn = document.getElementById("recentBtn");
  const trendingBtn = document.getElementById("trendingBtn");

  if (recentBtn && trendingBtn) {
    recentBtn.classList.remove("active");
    trendingBtn.classList.remove("active");

    if (type === "recent") {
      recentBtn.classList.add("active");
    } else {
      trendingBtn.classList.add("active");
    }
  }
}

function setQuestionFilter(type) {
  loadQuestions(type);
}

async function loadQuestionStats() {
  try {
    const allQuestions = await apiRequest("/questions");
    const trendingQuestions = await apiRequest("/questions/trending");

    const totalQuestionsStat = document.getElementById("totalQuestionsStat");
    const trendingQuestionsStat = document.getElementById("trendingQuestionsStat");
    const myQuestionsStat = document.getElementById("myQuestionsStat");

    if (totalQuestionsStat) {
      totalQuestionsStat.textContent = Array.isArray(allQuestions) ? allQuestions.length : 0;
    }

    if (trendingQuestionsStat) {
      trendingQuestionsStat.textContent = Array.isArray(trendingQuestions) ? trendingQuestions.length : 0;
    }

    if (myQuestionsStat) {
      try {
        const myQuestions = await apiRequest("/questions/mine");
        myQuestionsStat.textContent = Array.isArray(myQuestions) ? myQuestions.length : "--";
      } catch {
        myQuestionsStat.textContent = "--";
      }
    }
  } catch (error) {
    console.error("Failed to load stats", error);
  }
}

async function loadMyQuestions() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("myQuestionsList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `
      <div class="card">
        <p style="color:var(--text-soft);">Login required to view your questions.</p>
      </div>
    `;
    return;
  }

  try {
    const myQuestions = await apiRequest("/questions/mine");
    renderQuestionCards("myQuestionsList", myQuestions, "You haven't posted any questions yet.");
  } catch (error) {
    container.innerHTML = `
      <div class="card">
        <p style="color:#f87171;">Failed to load your questions.</p>
      </div>
    `;
    console.error(error);
  }
}

async function loadSavedQuestions() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("savedQuestionsList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `
      <div class="card">
        <p style="color:var(--text-soft);">Login required to view saved questions.</p>
      </div>
    `;
    return;
  }

  try {
    const savedQuestions = await apiRequest("/saved");
    renderQuestionCards("savedQuestionsList", savedQuestions, "No saved questions yet.");
  } catch (error) {
    container.innerHTML = `
      <div class="card">
        <p style="color:#f87171;">Failed to load saved questions.</p>
      </div>
    `;
    console.error(error);
  }
}