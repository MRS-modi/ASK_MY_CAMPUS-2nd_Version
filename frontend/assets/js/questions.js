if (typeof Swal === 'undefined') {
    window.Swal = { fire: (options) => { alert(options.text || options.title); return Promise.resolve({ isConfirmed: true }); } };
}

// ✅ Sirf EK BAAR declare karo
let cachedHomeQuestions = [];

// 1️⃣ PARSE TAGS: Array aur Relational Object dono handle karne ke liye
function parseTags(q) {
  if (!q) return [];
  if (q.tag_list && Array.isArray(q.tag_list)) {
    return q.tag_list.map(t => t.name);
  }
  if (!q.tags) return [];
  return String(q.tags)
    .split(",")
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag && !tag.includes("resolved_lock") && !tag.includes("claimed_by_") && !tag.includes("reported"));
}

// 2️⃣ CARD RENDERER: Optimized to prevent blinking using DocumentFragment
function renderQuestionCards(containerId, questions, emptyText = "No questions found.") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const fragment = document.createDocumentFragment();

  if (!Array.isArray(questions) || questions.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 20px; border-radius: 8px; background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, #334155);">
        <p style="color:var(--text-soft); text-align:center; margin:0;">${emptyText}</p>
      </div>
    `;
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("amc_user") || "null");
  const isStaff = currentUser && (currentUser.role === "admin" || currentUser.role === "teacher");

  questions.forEach((q) => {
    console.log("Rendering Question:", q);
    try {
      const card = document.createElement("article");
      card.className = "question-card";
      card.style.cursor = "pointer";
      
      card.addEventListener("click", () => {
        window.location.href = `question.html?id=${q.id}`;
      });

      const tagsArray = parseTags(q);
      let tagsHTML = "";
      tagsArray.forEach((tag) => {
        tagsHTML += `<span class="tag-pill" data-tag="${tag}" style="cursor:pointer; transition: transform 0.2s;">#${tag}</span>`;
      });

      const canDelete = currentUser && (currentUser.id === q.author_id || currentUser.role === "admin");
      const deleteButtonHTML = canDelete 
        ? `<button class="small-btn" style="background:#f8717115; color:#f87171; border:1px solid #f8717133; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="deleteQuestionAction(event, ${q.id})">🗑️ Delete</button>`
        : "";

      const authorInlineStyle = isStaff 
        ? "cursor: pointer; text-decoration: underline dotted var(--accent-color, #a78bfa);" 
        : "cursor: default; text-decoration: none;";

      // Renders structural elements safely
      card.innerHTML = `
        <div class="question-header-row" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <h3 class="question-title" style="margin: 0; font-size: 18px; color: var(--text-main);">${q.title || "Untitled Doubt"}</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            ${deleteButtonHTML}
            <a href="question.html?id=${q.id}" style="color:var(--primary); font-weight:600; text-decoration: none;" onclick="event.stopPropagation();">View →</a>
          </div>
        </div>
        <div class="question-meta" style="font-size: 13px; color: var(--text-soft); margin-bottom: 12px; display:flex; justify-content:space-between; align-items:center;">
          <div>Asked by <strong class="author-profile-trigger" style="color: var(--text-main); font-weight: 700; ${authorInlineStyle}" onclick="openUserProfileModal(event, ${q.author_id})">${q.author_name || "Anonymous"}</strong> • ${q.subject || "General"}</div>
          <span style="font-size:12px; color:var(--text-muted); cursor:pointer;" onclick="reportQuestionAction(event, ${q.id})">🚩 Report</span>
        </div>
        <div class="question-tags" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">${tagsHTML || '<span class="tag-pill">#General</span>'}</div>
        <div class="question-footer" style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 8px;">
          <div class="question-actions"><span style="font-size: 12px; color: var(--text-muted);">📝 ${q.author_role || "student"}</span></div>
        </div>
      `;
      
      fragment.appendChild(card);
    } catch (err) {
      console.error("Error rendering individual question card:", err, q);
    }
  });

  container.innerHTML = "";
  container.appendChild(fragment);
}

// 👑 🛡️ STEALTH PROFILE LOOKUP ENGINE (With In-Built Ban Capabilities)
async function openUserProfileModal(event, authorId) {
  event.stopPropagation(); 

  const currentUser = JSON.parse(localStorage.getItem("amc_user") || "null");
  const isStaff = currentUser && (currentUser.role === "admin" || currentUser.role === "teacher");

  if (!isStaff) return;

  try {
    const profile = await apiRequest(`/auth/users/${authorId}/profile-card`);
    const isAdmin = currentUser.role === "admin";

    const banButtonHTML = (isAdmin && profile.role !== "admin")
      ? `<button id="swalBanUserBtn" class="swal2-confirm swal2-styled" style="background-color: #ef4444; margin-top: 15px; width: 100%; border-radius: 6px;" onclick="executeBanPipeline(${profile.id}, '${profile.name}')">🚫 Ban This User</button>`
      : "";

    Swal.fire({
      title: `👤 Profile Summary`,
      html: `
        <div style="text-align: left; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.8; color: #cbd5e1; padding: 5px 0;">
          <p style="margin: 6px 0; border-bottom: 1px solid #334155; padding-bottom:6px;"><strong>Full Name:</strong> <span style="color:#fff; font-weight:600;">${profile.name}</span></p>
          <p style="margin: 6px 0;"><strong>User ID (UID):</strong> <span style="color:#a78bfa; font-weight:700;">${profile.id}</span></p>
          <p style="margin: 6px 0;"><strong>Official Email:</strong> <span style="color:#fff;">${profile.email}</span></p>
          <p style="margin: 6px 0;"><strong>System Role:</strong> <span style="text-transform: uppercase; padding: 2px 6px; border-radius:4px; font-size:11px; font-weight:800; background:#3b82f625; color:#60a5fa;">${profile.role}</span></p>
          <p style="margin: 6px 0;"><strong>Account Status:</strong> ${profile.is_active ? '<span style="color:#10b981;">Active User</span>' : '<span style="color:#ef4444;">Banned</span>'}</p>
          <p style="margin: 6px 0;"><strong>Branch Stream:</strong> ${profile.branch}</p>
          <p style="margin: 6px 0;"><strong>Academic Year:</strong> ${profile.year}</p>
          <p style="margin: 6px 0; margin-top:10px; padding-top:6px; border-top: 1px solid #334155;"><strong>Campus Activity:</strong> <span style="color:#f43f5e; font-weight:700;">${profile.total_questions} Questions Posted</span></p>
          ${banButtonHTML}
        </div>
      `,
      background: '#1e293b',
      color: '#fff',
      showConfirmButton: true,
      confirmButtonColor: '#334155',
      confirmButtonText: 'Dismiss Panel'
    });

  } catch (err) {
    console.error(err);
  }
}

// 🚫 PIPELINE TRIGGER: Executioner module for banning user accounts
async function executeBanPipeline(targetUserId, username) {
  const confirmBan = await Swal.fire({
    title: 'Confirm Strict Ban?',
    text: `Are you sure you want to ban "${username}"? They will lose platform login access immediately.`,
    icon: 'error',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#334155',
    confirmButtonText: 'Yes, Ban Account',
    background: '#1e293b',
    color: '#fff'
  });

  if (confirmBan.isConfirmed) {
    try {
      await apiRequest(`/auth/users/${targetUserId}/ban`, "POST");
      await Swal.fire({
        title: 'User Banned',
        text: 'The account has been blacklisted successfully.',
        icon: 'success',
        background: '#1e293b',
        color: '#fff'
      });
    } catch (err) {
      Swal.fire({ title: 'Operation Failed', text: err.message, icon: 'error', background: '#1e293b', color: '#fff' });
    }
  }
}

// 🚩 PIPELINE TRIGGER: Community logging for flagging questions
async function reportQuestionAction(event, questionId) {
  event.stopPropagation(); 
  try {
    await apiRequest(`/questions/${questionId}/report`, "POST");
    await Swal.fire({
      title: 'Report Submitted',
      text: 'Thank you. This doubt has been flagged for review.',
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      background: '#1e293b',
      color: '#fff'
    });
  } catch (err) {
    console.error(err);
  }
}

// 🗑️ GLOBAL QUESTIONS MODERATION REMOVAL HANDLER
async function deleteQuestionAction(event, questionId) {
  event.stopPropagation(); 
  
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "Bhai, kya sach me is question ko platform se delete karna chahte ho?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f87171', 
    cancelButtonColor: '#334155',  
    confirmButtonText: 'Yes, delete it!',
    background: '#1e293b',        
    color: '#fff',
    iconColor: '#f87171'
  });

  if (result.isConfirmed) {
    try {
      await apiRequest(`/questions/${questionId}`, "DELETE");
      
      const cardElement = event.target.closest('.question-card');
      if (cardElement) {
        cardElement.style.transition = "opacity 0.3s ease";
        cardElement.style.opacity = "0"; 
        setTimeout(() => cardElement.remove(), 300);
      }

      await Swal.fire({
        title: 'Deleted!',
        text: 'Question successfully uda diya gaya h!',
        icon: 'success',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#a78bfa'
      });

    } catch (err) {
      console.error(err);
      Swal.fire({ title: 'Error', text: 'Delete karne mein dikkat aayi!', icon: 'error', background: '#1e293b', color: '#fff' });
    }
  }
}

async function loadQuestions(filterType = "recent") {
    const container = document.getElementById("questionsList");
    if (!container) return;

    try {
        container.innerHTML = `<div class="card" style="padding:20px; text-align:center;">Loading ${filterType} questions...</div>`;
        
        const endpoint = filterType === "trending" ? "/questions/trending" : "/questions";
        let questions = await apiRequest(endpoint);
        
        console.log("API Response (Questions):", questions);

        if (Array.isArray(questions)) {
            if (filterType === "recent") {
                questions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (filterType === "trending") {
                questions.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
            }
            
            cachedHomeQuestions = questions;
            
            if (questions.length > 0) {
                renderQuestionCards("questionsList", questions, "No questions found.");
            } else {
                container.innerHTML = `<div class="card" style="padding: 20px; text-align:center;">No questions found yet. Be the first to ask!</div>`;
            }
        } else {
            console.error("Data is not an array:", questions);
            container.innerHTML = `<div class="card" style="padding:20px; color:#f87171;">Data format error.</div>`;
        }
    } catch (error) {
        console.error("Load error:", error);
        container.innerHTML = `<div class="card" style="padding:20px; color:#f87171;">Failed to load data.</div>`;
    }
}

async function setQuestionFilter(type) {
    const recentBtn = document.getElementById("recentBtn");
    const trendingBtn = document.getElementById("trendingBtn");
    const container = document.getElementById("questionsList");

    if (type === "recent" && recentBtn && trendingBtn) {
        recentBtn.classList.add("active");
        trendingBtn.classList.remove("active");
    } else if (trendingBtn && recentBtn) {
        trendingBtn.classList.add("active");
        recentBtn.classList.remove("active");
    }

    if (container) container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Loading...</div>';
    await loadQuestions(type);
}

async function filterQuestionsByTag(tagName) {
  try {
    const container = document.getElementById("questionsList"); 
    if (container) container.innerHTML = `<div class="card" style="padding:20px;"><p style="color:var(--text-soft); margin:0;">Filtering by #${tagName}...</p></div>`;
    const filteredQuestions = await apiRequest(`/questions/tags/${tagName}/questions`); 
    renderQuestionCards("questionsList", filteredQuestions, `No questions found with tag #${tagName}`);
  } catch (error) { console.error(error); }
}

async function loadTrendingTags(containerId = "trendingTagsContainer") {
  const container = document.getElementById(containerId); if (!container) return; 
  try {
    const popularTags = await apiRequest("/questions/tags/trending"); container.innerHTML = "";
    if (!Array.isArray(popularTags) || popularTags.length === 0) { container.innerHTML = '<p style="color:var(--text-soft); font-size:14px; margin:0;">No tags trending today.</p>'; return; }
    popularTags.forEach(tag => {
      const tagChip = document.createElement("span"); tagChip.className = "tag-chip"; tagChip.style.cursor = "pointer"; tagChip.style.marginRight = "6px"; tagChip.style.marginBottom = "6px"; tagChip.style.display = "inline-block";
      tagChip.innerHTML = `#${tag.name} <small style="opacity:0.6; font-size:11px;">(${tag.count})</small>`;
      tagChip.addEventListener("click", () => { filterQuestionsByTag(tag.name); }); container.appendChild(tagChip);
    });
  } catch (error) { console.error(error); }
}

async function loadQuestionStats() {
  try {
    const allQuestions = await apiRequest("/questions"); const myQuestions = await apiRequest("/questions/mine"); const trendingQuestions = await apiRequest("/questions/trending");
    const totalCount = Array.isArray(allQuestions) ? allQuestions.length : 0; const myCount = Array.isArray(myQuestions) ? myQuestions.length : 0;
    if (document.getElementById("totalQuestionsStat")) document.getElementById("totalQuestionsStat").textContent = totalCount;
    if (document.getElementById("myQuestionsStat")) document.getElementById("myQuestionsStat").textContent = myCount;
    const trendingStatEl = document.getElementById("trendingQuestionsStat");
    if (trendingStatEl) {
      if (Array.isArray(trendingQuestions) && trendingQuestions.length > 0) {
        const topQ = trendingQuestions[0];
        trendingStatEl.innerHTML = `<a href="question.html?id=${topQ.id}" style="color:#a78bfa; text-decoration:none; font-size:14px; font-weight:700; display:block; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; margin:0 auto;" title="${topQ.title}">🔥 ${topQ.title}</a>`;
      } else { trendingStatEl.textContent = "No Activity"; }
    }
  } catch (err) { console.error(err); }
}

function initializeSearchPipeline() {
  const searchInterval = setInterval(() => {
    const searchInput = document.querySelector('input[placeholder*="Search questions"]');
    if (searchInput) {
      clearInterval(searchInterval); searchInput.addEventListener("input", async (e) => {
        const rawQuery = e.target.value.trim(); 
        if (rawQuery.length === 0) { renderQuestionCards("questionsList", cachedHomeQuestions, "No questions asked yet."); return; }
        
        try { 
            let filteredResult;
            // 🚀 FIXED: Direct tag routing logic when using "#"
            if (rawQuery.startsWith("#")) {
                const tagSearch = rawQuery.replace("#", "").trim();
                filteredResult = await apiRequest(`/questions/tags/${tagSearch}/questions`);
            } else {
                filteredResult = await apiRequest(`/questions/search/query?query=${encodeURIComponent(rawQuery)}`); 
            }
            renderQuestionCards("questionsList", filteredResult, `No campus doubts matched for: "${rawQuery}"`); 
        } catch (err) { console.error(err); }
      });
    }
  }, 200); 
}

async function loadMyQuestionsPage() {
  const container = document.getElementById("myQuestionsList") || document.getElementById("questionsList"); if (!container) return;
  try { container.innerHTML = `<div class="card" style="padding:20px;"><p style="color:var(--text-soft); margin:0;">Loading your doubts...</p></div>`; const myQuestions = await apiRequest("/questions/mine"); renderQuestionCards(container.id, myQuestions, "You haven't posted any questions yet."); } catch (error) { console.error(error); }
}

async function loadSavedQuestions() {
  const container = document.getElementById("savedQuestionsList") || document.getElementById("questionsList"); if (!container) return;
  try { container.innerHTML = `<div class="card" style="padding:20px;"><p style="color:var(--text-soft); margin:0;">Loading your bookmarks...</p></div>`; const savedQuestions = await apiRequest("/questions/saved"); renderQuestionCards(container.id, savedQuestions, "You haven't saved any questions yet."); } catch (error) { console.error(error); }
}

async function saveQuestionToggle(questionId) {
  try {
    const response = await apiRequest(`/questions/${questionId}/save`, "POST"); const saveBtn = document.getElementById("saveQuestionBtn"); 
    if (saveBtn) {
      if (response.is_saved) { saveBtn.innerHTML = "⭐ Question Saved"; saveBtn.style.background = "var(--accent-color)"; saveBtn.style.color = "#fff"; } 
      else { saveBtn.innerHTML = "🔖 Save Question"; saveBtn.style.background = "transparent"; }
    }
  } catch (error) { console.error(error); }
}

function toggleFilterDrawer() {
    const drawer = document.getElementById('filterDrawer');
    const filterBtn = document.getElementById('filterBtn');
    
    if (!drawer) return;

    const isHidden = drawer.style.display === 'none' || drawer.style.display === '';
    drawer.style.display = isHidden ? 'block' : 'none';

    if (isHidden && filterBtn) {
        filterBtn.classList.add('active');
    } else if (filterBtn) {
        const dept = document.getElementById('deptFilter')?.value;
        const branch = document.getElementById('branchFilter')?.value;
        const course = document.getElementById('courseFilter')?.value;
        const teacher = document.getElementById('teacherFilter')?.value;
        
        if (!dept && !branch && !course && !teacher) {
            filterBtn.classList.remove('active');
        }
    }
}

function closeFilterDrawer() {
    const drawer = document.getElementById('filterDrawer');
    if (drawer) drawer.style.display = 'none';
}

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "login.html"; return; 
    }
    if (typeof initFilters === 'function') {
        await initFilters(); 
    }
    await loadQuestions("recent");
    loadTrendingTags("trendingTagsContainer");
    loadQuestionStats();
    initializeSearchPipeline();
    loadAcademicCalendar();
});

async function initFilters() {
    try {
        const data = await apiRequest("/admin/academic/all-data");
        
        const selectors = [
            { id: "deptFilter", list: data.departments, label: "Department" },
            { id: "branchFilter", list: data.branches, label: "Branch" },
            { id: "courseFilter", list: data.courses, label: "Course" },
            { id: "teacherFilter", list: data.teachers, label: "Faculty" }
        ];

        selectors.forEach(s => {
            const el = document.getElementById(s.id);
            if(el) {
                el.innerHTML = `<option value="">All ${s.label}s</option>`;
                s.list.forEach(item => {
                    el.innerHTML += `<option value="${item.id}">${item.name}</option>`;
                });
            }
        });
    } catch (err) {
        console.error("Filter sync failed:", err);
    }
}

async function applyFilters() {
    const deptId = document.getElementById("deptFilter")?.value || "";
    const branchId = document.getElementById("branchFilter")?.value || "";
    const courseId = document.getElementById("courseFilter")?.value || "";
    const teacherId = document.getElementById("teacherFilter")?.value || "";
    
    const onlyAIElement = document.getElementById("onlyAIToggle");
    const onlyAiParam = onlyAIElement && onlyAIElement.checked ? "true" : "false";

    const container = document.getElementById("questionsList");
    if (container) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Filtering campus doubts matrix...</div>';
    }

    try {
        let queryPath = `/questions?only_ai=${onlyAiParam}`;
        if (deptId) queryPath += `&dept_id=${deptId}`;
        if (branchId) queryPath += `&branch_id=${branchId}`;
        if (courseId) queryPath += `&course_id=${courseId}`;
        if (teacherId) queryPath += `&teacher_id=${teacherId}`;

        const filteredResult = await apiRequest(queryPath);
        renderQuestionCards("questionsList", filteredResult, "No questions match your filter constraints.");
        toggleFilterDrawer(); 
    } catch (err) {
        console.error("Matrix filter propagation lifecycle execution failure:", err);
        if (container) {
            container.innerHTML = '<div class="card" style="padding:20px; color:#f87171; text-align:center;">Filter apply karne mein error aaya.</div>';
        }
    }
}

async function resetFilters() {
    document.querySelectorAll('#filterDrawer select').forEach(sel => sel.value = "");
    const onlyAIElement = document.getElementById("onlyAIToggle");
    if (onlyAIElement) onlyAIElement.checked = false;

    const container = document.getElementById("questionsList");
    if (container) {
        container.innerHTML = '<div class="card" style="padding:20px; text-align:center;">Reloading core platform stream...</div>';
    }

    if (Array.isArray(cachedHomeQuestions) && cachedHomeQuestions.length > 0) {
        renderQuestionCards("questionsList", cachedHomeQuestions);
    } else {
        await loadQuestions("recent");
    }
}

async function populateFilterDropdowns() {
    try {
        const hierarchy = await apiRequest("/admin/academic/hierarchy"); 
        const yearSelect = document.getElementById("yearFilter");
        const branchSelect = document.getElementById("branchFilter");
        const courseSelect = document.getElementById("courseFilter");

        if (yearSelect) yearSelect.innerHTML = '<option value="">All Years</option>';
        if (branchSelect) branchSelect.innerHTML = '<option value="">All Branches</option>';
        if (courseSelect) courseSelect.innerHTML = '<option value="">All Courses</option>';

        const years = [...new Set(hierarchy.map(item => item.year))];
        const branches = [...new Set(hierarchy.map(item => item.branch))];
        const courses = [...new Set(hierarchy.map(item => item.course_name))];

        years.forEach(y => { if (yearSelect) yearSelect.innerHTML += `<option value="${y}">${y} Year</option>`; });
        branches.forEach(b => { if (branchSelect) branchSelect.innerHTML += `<option value="${b}">${b}</option>`; });
        courses.forEach(c => { if (courseSelect) courseSelect.innerHTML += `<option value="${c}">${c}</option>`; });
    } catch (err) {
        console.error("Filter sync error:", err);
    }
}

async function loadAcademicCalendar() {
    const container = document.getElementById("calendarNoticesList");
    if (!container) return;
    
    try {
        const notices = await apiRequest("/admin/academic/notices");
        if (!Array.isArray(notices) || notices.length === 0) {
            container.innerHTML = '<p style="color:var(--text-soft); font-size:13px;">No upcoming notices.</p>';
            return;
        }
        container.innerHTML = notices.map(n => `
            <div style="padding:8px 0; border-bottom:1px solid #334155; font-size:13px; display:flex; align-items:center; gap:8px;">
                <span style="color:#a78bfa;">●</span> 
                <span style="color:var(--text-main);">${n.event_name}</span>
            </div>
        `).join('');
    } catch (err) {
        console.error("Calendar load failed", err);
        container.innerHTML = '<p style="color:#ef4444; font-size:13px;">Failed to load.</p>';
    }
}

// 🎫 NEW FUNCTION: Student-side detail view initialization sequence
async function loadQuestionDetails(questionId) {
    const container = document.getElementById("questionData");
    const mountContainer = document.getElementById("studentViewQuestionClaimStatusMount");
    if (!container) return;

    try {
        const q = await apiRequest(`/questions/${questionId}`);
        if (!q) throw new Error("Question details record dropped.");

        // Cache globally for tracking checks inside answers components
        window.currentQuestion = q;

        // 🚀 SYNC WRAPPER: Render real-time faculty claim token alert banner box
        if (mountContainer) {
            const tagsStr = q.tags || "";
            let claimedById = q.claimed_by_id || null;

            if (!claimedById && tagsStr.includes("claimed_by_")) {
                try {
                    const parts = tagsStr.split("claimed_by_");
                    if (parts.length > 1) claimedById = parseInt(parts[1].split(",")[0].trim());
                } catch (e) {}
            }

            if (claimedById) {
                try {
                    const profile = await apiRequest(`/auth/users/${claimedById}/profile-card`);
                    const tName = profile && profile.name ? profile.name : `Faculty (UID: ${claimedById})`;
                    mountContainer.innerHTML = `
                        <div class="card" style="margin: 16px 0; padding: 12px 16px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.1) 100%); border-left: 4px solid #3b82f6; border-radius: 6px; display: flex; align-items: center; gap: 10px; width:100%; box-sizing:border-box;">
                            <span style="font-size: 18px;">🎫</span>
                            <div style="font-size: 14px; font-family: 'Inter', sans-serif;">
                                <span style="color: #93c5fd; font-weight: 500;">This doubt is under active evaluation by:</span> 
                                <strong style="color: #fff; font-weight: 700; margin-left: 4px;">Prof. ${tName}</strong>
                            </div>
                        </div>`;
                } catch (err) {
                    mountContainer.innerHTML = `
                        <div class="card" style="margin: 16px 0; padding: 12px 16px; background: rgba(59, 130, 246, 0.05); border-left: 4px solid #3b82f6; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 18px;">🎫</span>
                            <div style="font-size: 14px; color: #93c5fd; font-weight: 500;">Under Active Verification by <strong style="color: #fff;">Assigned Faculty (UID: ${claimedById})</strong></div>
                        </div>`;
                }
            } else {
                mountContainer.innerHTML = "";
            }
        }

        // Render main layout content card view parameters safely
        container.innerHTML = `
            <div class="question-header-row" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                <h1 class="question-title" style="margin:0; font-size:22px; color:var(--text-main);">${q.title || "Untitled Doubt"}</h1>
                <button id="saveQuestionBtn" class="small-btn" style="border:1px solid var(--border-color); padding:6px 12px;" onclick="saveQuestionToggle(${q.id})">🔖 Save Question</button>
            </div>
            <div class="question-meta" style="font-size:13px; color:var(--text-soft); margin-bottom:16px;">
                Asked by <strong style="color:var(--text-main);">${q.author_name || "Anonymous"}</strong> • ${q.subject || "General"} • ${new Date(q.created_at).toLocaleDateString()}
            </div>
            <div class="question-content" style="white-space:pre-wrap; color:#f1f5f9; line-height:1.7; font-size:15px; margin-bottom:16px;">${q.content}</div>
        `;
        
        // Update bookmarks visual states toggle values
        const checkSaved = await apiRequest("/questions/saved");
        if (Array.isArray(checkSaved) && checkSaved.some(item => item.id === q.id)) {
            const btn = document.getElementById("saveQuestionBtn");
            if (btn) { btn.innerHTML = "⭐ Question Saved"; btn.style.background = "var(--accent-color)"; btn.style.color = "#fff"; }
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = `<p style="color:#ef4444;">Failed to compile question details views loop context.</p>`;
    }
}