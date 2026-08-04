// 🔄 CORE TAB ROUTER ENGINE WITH SYSTEM ACCENT COLORS (FIXED CLICKABLE NODE)
function switchAdminTab(targetTab) {
  // 1. Select all buttons
  const buttons = {
    users: document.getElementById("usersTabBtn"),
    inquiries: document.getElementById("inquiriesTabBtn"),
    reports: document.getElementById("reportsTabBtn"),
    words: document.getElementById("wordsTabBtn"),
    academics: document.getElementById("academicsTabBtn"),
    moderation: document.getElementById("moderationTabBtn"),
    facultyTracker: document.getElementById("facultyTrackerTabBtn"),
    logs: document.getElementById("logsTabBtn")
  };

  // 2. Select all sections (🚀 FIXED: Added facultyTracker section mapping safely)
  const sections = {
    users: document.getElementById("usersSection"),
    inquiries: document.getElementById("inquiriesSection"),
    reports: document.getElementById("reportsSection"),
    words: document.getElementById("wordsSection"),
    academics: document.getElementById("academicsSection"),
    moderation: document.getElementById("moderationSection"),
    facultyTracker: document.getElementById("facultyTrackerSection"),
    logs: document.getElementById("logsSection")
  };

  // 3. Reset visual states (Buttons to transparent, Sections to hidden)
  Object.values(buttons).forEach(btn => {
    if (btn) {
      btn.style.background = "transparent";
      btn.style.borderColor = "transparent";
      btn.style.color = "#94a3b8";
    }
  });

  Object.values(sections).forEach(sec => {
    if (sec) sec.style.display = "none";
  });

  // 4. Activate target tab
  if (buttons[targetTab]) {
    buttons[targetTab].style.background = "var(--bg-card, #1e293b)";
    buttons[targetTab].style.borderColor = "var(--border-color, #334155)";
    buttons[targetTab].style.color = "#fff";
  }

  if (sections[targetTab]) {
    sections[targetTab].style.display = "block";
  }

  // 5. Trigger load functions for specific dynamic tabs
  if (targetTab === "reports") loadReportedAuditsDashboard();
  if (targetTab === "words") loadBannedWordsDashboardQueue();
  if (targetTab === "moderation") loadModerationQueue();
  if (targetTab === "logs") loadAuditLogs();
  
  // 🚀 FIXED: Dynamic load trigger hook for Faculty Performance Ledger Table Matrix
  if (targetTab === "facultyTracker" && typeof loadAdminFacultyTrackerMatrix === "function") {
    loadAdminFacultyTrackerMatrix();
  }
}

// 👑 MAIN DASHBOARD DATA LIFECYCLE INITIALIZER
async function loadAdminDashboard() {
  const token = localStorage.getItem("token");

  const totalUsersEl = document.getElementById("adminTotalUsers");
  const totalQuestionsEl = document.getElementById("adminTotalQuestions");
  const totalAnswersEl = document.getElementById("adminTotalAnswers");
  const tableBody = document.getElementById("adminUsersTableBody");
  const inquiryBody = document.getElementById("adminInquiryTableBody");

  if (!token) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-soft); padding:20px;">Login required to access admin panel.</td></tr>`;
    if (inquiryBody) inquiryBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-soft); padding:20px;">Login required to access inquiry management.</td></tr>`;
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("amc_user") || "null");

  // 📈 Analytics Tracker Link up
  try {
    const analytics = await apiRequest("/admin/analytics");
    if (totalUsersEl) totalUsersEl.textContent = analytics.total_users ?? "0";
    if (totalQuestionsEl) totalQuestionsEl.textContent = analytics.total_questions ?? "0";
    if (totalAnswersEl) totalAnswersEl.textContent = analytics.total_answers ?? "0";
  } catch (error) {
    console.error("Analytics fetch engine failed:", error);
  }

  if (document.getElementById("academicNoticesList")) {
    loadAcademicNotices();
  }
  if (document.getElementById("academicMasterTable")) {
    await loadAcademicMasterTable();
  }

  // 👥 Users Management Pipeline
  try {
    const users = await apiRequest("/admin/users");

    if (tableBody) {
      tableBody.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-soft);">No platform users registered yet.</td></tr>`;
      } else {
        users.forEach((user) => {
  const isSelf = currentUser && currentUser.id === user.id;
  const row = document.createElement("tr");

  let roleBadgeColor = "#60a5fa"; 
  if (user.role === "admin") roleBadgeColor = "#f87171";
  else if (user.role === "teacher") roleBadgeColor = "#34d399";
  else if (user.role === "banned") roleBadgeColor = "#9ca3af";

  // ✅ LOGIC: Current role ko skip karo, baki 3 buttons dikhao
  const studentBtn = user.role !== 'student' ? `<button class="small-btn filter-chip" onclick="makeStudent(${user.id})">Student</button>` : "";
  const teacherBtn = user.role !== 'teacher' ? `<button class="small-btn filter-chip" onclick="makeTeacher(${user.id})">Teacher</button>` : "";
  const adminBtn = user.role !== 'admin' ? `<button class="small-btn filter-chip" onclick="makeAdmin(${user.id})">Admin</button>` : "";
  
  // Ban button hamesha dikhega (ya Unban)
const banBtn = `<button class="small-btn filter-chip" 
                  style="background:${user.role === 'banned' ? '#f87171' : ''}; color:${user.role === 'banned' ? '#fff' : ''};" 
                  onclick="banUser(${user.id})">
                  ${user.role === 'banned' ? 'Unban' : 'Ban'}
                </button>`;

  row.innerHTML = `
    <td style="padding: 12px 10px; font-weight:600; color:var(--text-soft);">${user.id}</td>
    <td style="padding: 12px 10px; font-weight:700; color:#fff;">${user.name}</td>
    <td style="padding: 12px 10px;">${user.email}</td>
    <td style="padding: 12px 10px;">
      <span style="font-size:11px; font-weight:700; background:${roleBadgeColor}22; color:${roleBadgeColor}; padding:4px 8px; border-radius:4px; text-transform:uppercase;">
        ${user.role}
      </span>
    </td>
    <td style="padding: 12px 10px;">
      <div class="action-row" style="display:flex; gap:8px;">
        ${isSelf ? `<span style="opacity:0.6; font-size:13px; font-weight:500; color:var(--text-soft);">👑 Master Admin</span>` : 
          `${studentBtn}${teacherBtn}${adminBtn}${banBtn}`}
      </div>
    </td>
  `;
  tableBody.appendChild(row);
});
      }
    }
  } catch (error) {
    console.error("Users list parsing operations failed:", error);
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" style="color:#f87171; text-align:center;">Failed to load users.</td></tr>`;
  }

  // 📂 Inquiry Management Interface Sync
  try {
    const inquiries = await apiRequest("/inquiries/admin/all");

    if (inquiryBody) {
      inquiryBody.innerHTML = "";

      if (!Array.isArray(inquiries) || inquiries.length === 0) {
        inquiryBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-soft);">No active campus inquiries found.</td></tr>`;
      } else {
        inquiries.forEach((item) => {
          const row = document.createElement("tr");

          let statusColor = "#60a5fa"; 
          if (item.status === "resolved") statusColor = "#34d399";
          else if (item.status === "rejected") statusColor = "#f87171";

          row.innerHTML = `
            <td style="padding: 12px 10px; font-weight:600; color:var(--text-soft);">${item.id}</td>
            <td style="padding: 12px 10px; font-weight:600; color:#fff;">${item.name || "Anonymous Scholar"}</td>
            <td style="padding: 12px 10px;"><span class="tag-pill" style="font-size:12px;">${item.inquiry_department || "General"}</span></td>
            <td style="padding: 12px 10px;"><div style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.subject}</div></td>
            <td style="padding: 12px 10px;">
              <span style="font-size:11px; font-weight:700; background:${statusColor}22; color:${statusColor}; padding:4px 8px; border-radius:4px; text-transform:uppercase;">
                ${item.status.replace("_", " ")}
              </span>
            </td>
            <td style="padding: 12px 10px;">
              <div class="action-row" style="display:flex; gap:6px;">
                <button class="small-btn" style="cursor:pointer; font-size:11px; padding:4px 8px;" onclick="updateInquiryStatus(${item.id}, 'under_review')">Review</button>
                <button class="small-btn" style="cursor:pointer; font-size:11px; padding:4px 8px; background:#34d39922; color:#34d399;" onclick="updateInquiryStatus(${item.id}, 'resolved')">Resolve</button>
                <button class="small-btn" style="cursor:pointer; font-size:11px; padding:4px 8px; background:#f8717122; color:#f87171;" onclick="updateInquiryStatus(${item.id}, 'rejected')">Reject</button>
              </div>
            </td>
          `;
          inquiryBody.appendChild(row);
        });
      }
    }
  } catch (error) {
    console.error(error);
    if (inquiryBody) inquiryBody.innerHTML = `<tr><td colspan="6" style="color:var(--text-soft); text-align:center;">Failed to load inquiries.</td></tr>`;
  }
}

// 🚩 📊 DASHBOARD 3: Fetch sorted community flagged doubts queue
async function loadReportedAuditsDashboard() {
  const container = document.getElementById("reportedItemsQueue");
  if (!container) return;

  try {
    container.innerHTML = `<p style="color:var(--text-soft); padding:10px;">Auditing platform flag queues...</p>`;
    const reportedQuestions = await apiRequest("/questions/reported-list");
    
    container.innerHTML = "";
    if (!Array.isArray(reportedQuestions) || reportedQuestions.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; border: 1px dashed var(--border-color, #334155); border-radius:6px; background: var(--bg-card, #1e293b); width: 100%;">
          <p style="color:var(--text-soft); margin:0;">🎉 Clean Slate! No unresolved reports pending review.</p>
        </div>
      `;
      return;
    }

    reportedQuestions.forEach(q => {
      const itemRow = document.createElement("div");
      itemRow.style.cssText = "background: var(--bg-card, #1e293b); border: 1px solid #ef444444; border-radius: 6px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom:10px; width: 100%; box-sizing: border-box;";
      
      itemRow.innerHTML = `
        <div style="flex:1;">
          <div style="display:flex; gap:8px; align-items:center; margin-bottom:6px;">
            <span style="color:#ef4444; font-size:10px; font-weight:800; background:#ef444415; padding:2px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.5px;">⚠️ Flagged Post</span>
            <span style="color:#f43f5e; font-size:11px; font-weight:700; background:#f43f5e15; padding:2px 8px; border-radius:4px;">🔥 Reports Weight: ${q.reports_count ?? 1}</span>
          </div>
          <h4 style="color:#fff; margin:4px 0; font-size:16px;">${q.title || 'Untitled Doubt'}</h4>
          <p style="color:var(--text-soft); font-size:13px; margin:0; max-width:550px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${q.content || ''}</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <a href="question.html?id=${q.id}" target="_blank" style="color:#a78bfa; font-size:13px; font-weight:600; text-decoration:none; padding:6px 12px; border:1px solid #a78bfa33; border-radius:4px;">View</a>
          <button style="background:#ef4444; color:#fff; border:none; padding:7px 14px; border-radius:4px; font-size:13px; cursor:pointer; font-weight:600;" onclick="adminDeleteReportedAction(event, ${q.id})">🗑️ Delete</button>
        </div>
      `;
      container.appendChild(itemRow);
    });
  } catch (err) {
    console.error("Fetcher error catch stream logic:", err);
    container.innerHTML = `<p style="color:#ef4444; font-weight:500; padding:10px;">Failed to sync server reports data loops.</p>`;
  }
}

// 🚫 🆕 DASHBOARD 4: Load banned words chips dynamic loop template
async function loadBannedWordsDashboardQueue() {
  const container = document.getElementById("adminBannedWordsChipsBox");
  if (!container) return;

  try {
    container.innerHTML = `<p style="color:var(--text-soft); font-size:13px;">Syncing active words filter matrix...</p>`;
    const response = await apiRequest("/admin/banned-words");
    
    container.innerHTML = "";
    if (!response || !Array.isArray(response.words) || response.words.length === 0) {
      container.innerHTML = `<p style="color:var(--text-soft); font-size:13px; margin:0;">No compliance words filtered. Whole text streams accepted.</p>`;
      return;
    }

    response.words.forEach(word => {
      const chip = document.createElement("span");
      chip.style.cssText = "background:#ef444415; border:1px solid #ef444433; color:#ef4444; font-size:13px; font-weight:600; padding:6px 12px; border-radius:20px; display:inline-flex; align-items:center; gap:8px;";
      chip.innerHTML = `
        <span>${word}</span>
        <strong style="cursor:pointer; color:#f87171; font-size:14px;" onclick="executeDeleteWordRulePipeline('${word}')">×</strong>
      `;
      container.appendChild(chip);
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:#ef4444;">Failed to sync words rules roster.</p>`;
  }
}

// 🚫 🆕 PIPELINE CHIP ACTION 1: SUBMIT WORD
async function submitNewBannedWordPipeline() {
  const input = document.getElementById("newBannedWordInput");
  if (!input) return;
  const wordVal = input.value.trim();
  
  if (!wordVal) {
    Swal.fire({ text: "Word text cannot be blank bhai!", icon: "warning", background: "#1e293b", color: "#fff" });
    return;
  }

  try {
    await apiRequest("/admin/banned-words", "POST", { word: wordVal });
    input.value = ""; // Flush input box
    loadBannedWordsDashboardQueue(); // Reload chips array stream
    Swal.fire({ text: "Rule deployed successfully!", icon: "success", toast: true, position: "top-end", showConfirmButton: false, timer: 2000, background: "#1e293b", color: "#fff" });
  } catch (err) {
    Swal.fire({ text: err.message, icon: "error", background: "#1e293b", color: "#fff" });
  }
}

// 🚫 🆕 PIPELINE CHIP ACTION 2: DROP WORD
async function executeDeleteWordRulePipeline(word) {
  try {
    await apiRequest(`/admin/banned-words/${encodeURIComponent(word)}`, "DELETE");
    loadBannedWordsDashboardQueue(); // Refresh tracking logs
  } catch (err) {
    console.error(err);
  }
}

// 🚫 ACTION: Delete execution trigger for flagged doubts
async function adminDeleteReportedAction(event, questionId) {
  event.stopPropagation();
  
  const confirmation = await Swal.fire({
    title: 'Confirm Deletion?',
    text: "Bhai, kya sach me is flagged question ko platform se permanent delete karna chahte ho?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#334155',
    confirmButtonText: 'Yes, Delete Post',
    background: '#1e293b',
    color: '#fff'
  });

  if (confirmation.isConfirmed) {
    try {
      await apiRequest(`/questions/${questionId}`, "DELETE");
      await Swal.fire({ title: 'Removed!', text: 'Flagged thread removed successfully.', icon: 'success', background: '#1e293b', color: '#fff' });
      loadReportedAuditsDashboard(); 
    } catch (err) {
      Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#1e293b', color: '#fff' });
    }
  }
}

// ✅ YE FUNCTION ADD KARO admin.js mein
async function makeStudent(userId) {
  try {
    const res = await apiRequest(`/admin/users/${userId}/make-student`, "PATCH");
    Swal.fire({ 
      text: res.message || "User role updated to Student.", 
      icon: 'success', 
      background: "#1e293b", 
      color: "#fff" 
    });
    loadAdminDashboard(); // Table ko refresh karne ke liye
  } catch (error) { 
    Swal.fire({ 
      text: error.message || "Failed to update role.", 
      icon: 'error', 
      background: "#1e293b", 
      color: "#fff" 
    }); 
  }
}

// User Actions Core Methods Mapping Preserved Safely
async function makeTeacher(userId) {
  try {
    const res = await apiRequest(`/admin/users/${userId}/make-teacher`, "PATCH");
    Swal.fire({ text: res.message || "User role updated to Teacher.", icon: 'success', background: '#1e293b', color: '#fff' });
    loadAdminDashboard();
  } catch (error) { Swal.fire({ text: error.message, icon: 'error', background: '#1e293b', color: '#fff' }); }
}

async function makeAdmin(userId) {
  try {
    const res = await apiRequest(`/admin/users/${userId}/make-admin`, "PATCH");
    Swal.fire({ text: res.message || "User role updated to Admin.", icon: 'success', background: '#1e293b', color: '#fff' });
    loadAdminDashboard();
  } catch (error) { Swal.fire({ text: error.message, icon: 'error', background: '#1e293b', color: '#fff' }); }
}

async function banUser(userId) {
  try {
    // API request wahi rahegi, backend toggle handle karega
    const res = await apiRequest(`/admin/users/${userId}/ban`, "PATCH");
    
    // Success message
    Swal.fire({ 
      text: res.message || "User account status updated successfully.", 
      icon: 'success', 
      background: "#1e293b", 
      color: "#fff" 
    });
    
    // UI refresh
    loadAdminDashboard();
  } catch (error) { 
    Swal.fire({ 
      text: error.message || "Operation failed.", 
      icon: 'error', 
      background: "#1e293b", 
      color: "#fff" 
    }); 
  }
}

async function updateInquiryStatus(inquiryId, status) {
  try {
    await apiRequest(`/inquiries/admin/${inquiryId}`, "PATCH", { status, admin_note: "Updated via master control panel." });
    Swal.fire({ text: `Inquiry state updated to ${status.replace("_", " ")}`, icon: 'success', background: '#1e293b', color: '#fff' });
    loadAdminDashboard();
  } catch (error) { Swal.fire({ text: error.message, icon: 'error', background: '#1e293b', color: '#fff' }); }
}

async function submitNewDepartment() {
  // Input field ko function ke andar get karo
  const input = document.getElementById("newDepartmentInput");
  
  // Safe check
  if (!input) {
    console.error("Input field 'newDepartmentInput' nahi mila!");
    Swal.fire({ text: "Error: Input field missing!", icon: "error", background: "#1e293b", color: "#fff" });
    return;
  }

  const deptName = input.value.trim();
  if (!deptName) {
    Swal.fire({ text: "Department name cannot be empty!", icon: "warning", background: "#1e293b", color: "#fff" });
    return;
  }

  try {
    // URL ko backend ke route se match kiya
    await apiRequest("/admin/departments", "POST", { name: deptName });
    
    input.value = ""; 
    Swal.fire({ text: "Department added successfully!", icon: "success", background: "#1e293b", color: "#fff" });
  } catch (err) {
    console.error(err);
    Swal.fire({ text: "Backend error, check terminal.", icon: "error", background: "#1e293b", color: "#fff" });
  }
}

async function submitAcademicData(endpoint, data) {
    try {
        await apiRequest(`/admin/academic/${endpoint}`, "POST", data);
        Swal.fire({ text: "Updated successfully!", icon: "success", background: "#1e293b", color: "#fff" });
    } catch (err) {
        Swal.fire({ text: "Error: " + err.message, icon: "error", background: "#1e293b", color: "#fff" });
    }
}

async function populateFacultyDropdowns(tSelect, cSelect) {
    const data = await apiRequest("/admin/academic/all-data");
    
    tSelect.innerHTML = '<option value="">Select Teacher</option>';
    data.teachers.forEach(t => {
        tSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
    
    cSelect.innerHTML = '<option value="">Select Course</option>';
    data.courses.forEach(c => {
        cSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
    });
}

// 🎓 DYNAMIC UI UPDATER
// 🎓 DYNAMIC UI UPDATER (Dropdowns ke saath)
// 🎓 DYNAMIC UI UPDATER: Dropdowns handle karega
window.updateAcademicUI = async function() {
    const action = document.getElementById("academicActionSelect").value;
    const fields = document.getElementById("dynamicFields");
    const input = document.getElementById("academicInput");
    
    // Purane extra inputs hatao
    document.querySelectorAll('.dynamic-extra').forEach(el => el.remove());

    if (!action) { fields.style.display = "none"; return; }
    fields.style.display = "flex";

    // Action: Add Branch
    if (action === 'add-branch') {
        const depts = await apiRequest("/admin/academic/departments");
        const select = document.createElement("select");
        select.id = "deptSelect"; select.className = "dynamic-extra";
        select.innerHTML = depts.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
        fields.insertBefore(select, fields.querySelector('button'));
    }

    // Action: Add Course
    if (action === 'add-course') {
        const data = await apiRequest("/admin/academic/all-data");
        const select = document.createElement("select");
        select.id = "branchSelect"; select.className = "dynamic-extra";
        select.innerHTML = data.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        fields.insertBefore(select, fields.querySelector('button'));
    }

    // Action: Link Faculty
    if (action === 'link-faculty') {
        input.style.display = "none";
        const tSelect = document.createElement("select");
        tSelect.id = "teacherSelect"; tSelect.className = "dynamic-extra";
        
        const cSelect = document.createElement("select");
        cSelect.id = "courseSelect"; cSelect.className = "dynamic-extra";
        
        fields.insertBefore(tSelect, fields.querySelector('button'));
        fields.insertBefore(cSelect, fields.querySelector('button'));
        populateFacultyDropdowns(tSelect, cSelect);
    } else {
        input.style.display = "block";
    }
};

// 🚀 EXECUTE ACADEMIC ACTION: Submit Button Logic
window.executeAcademicAction = async function() {
    const action = document.getElementById("academicActionSelect").value;
    const input = document.getElementById("academicInput");
    
    let payload = { name: input.value };
    
    // Mapping keys to Element IDs
    const selectors = { dept_id: "deptSelect", branch_id: "branchSelect", teacher_id: "teacherSelect", course_id: "courseSelect" };
    
    Object.keys(selectors).forEach(key => {
        const el = document.getElementById(selectors[key]);
        if (el) payload[key] = el.value;
    });

    if (action === 'add-notice') payload = { notice: input.value };

    try {
        const response = await apiRequest(`/admin/academic/${action}`, "POST", payload);
        if (response.success !== false) {
            Swal.fire("Success", "Updated successfully!", "success");
            input.value = "";
            loadAcademicMasterTable(); 
        } else {
            Swal.fire("Warning", response.message, "warning");
        }
    } catch (err) {
        Swal.fire("Error", err.message, "error");
    }
};

// Helper: Populate dropdowns
async function populateFacultyDropdowns(tSelect, cSelect) {
    const data = await apiRequest("/admin/academic/all-data");
    tSelect.innerHTML = '<option value="">Select Teacher</option>' + data.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    cSelect.innerHTML = '<option value="">Select Course</option>' + data.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadAcademicFilters() {
    try {
        const response = await apiRequest("/admin/academic/filters", "GET");
        const deptDropdown = document.getElementById("deptDropdown");
        
        // Purane options saaf karo aur naye bharo
        deptDropdown.innerHTML = '<option value="">Select Department</option>';
        response.departments.forEach(dept => {
            deptDropdown.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
        });
    } catch (err) {
        console.error("Filter load failed:", err);
    }
}

// Add this if it's missing in admin.js
async function initFilters() {
    console.log("Admin Dashboard: Initializing filters...");
    // Yeh function admin panel ke liye hai
}

// Academic Table Load
// ✅ REPLACED: Academic Master Table with Nested Hierarchy
window.loadAcademicMasterTable = async function() {
    const container = document.getElementById("academicMasterTable");
    try {
        const data = await apiRequest("/admin/academic/all-data");
        
        // 1. Hierarchy Table (Display Only)
        let html = `<h4 style="color:#fff;">Academic Hierarchy</h4>
            <table style="width:100%; border-collapse:collapse; margin-bottom:30px; color:white;">
                <tr style="background:#1e293b;"><th style="padding:10px;">Dept</th><th>Branch</th><th>Course</th></tr>`;
        
        data.courses.forEach(c => {
            const branch = data.branches.find(b => b.id == c.branch_id) || { name: 'N/A', dept_id: null };
            const dept = data.departments.find(d => d.id == branch.dept_id) || { name: 'N/A' };
            html += `<tr style="border-bottom:1px solid #334155;">
                <td style="padding:10px;">${dept.name}</td><td>${branch.name}</td><td>${c.name}</td>
            </tr>`;
        });
        html += `</table>`;

        // 2. Re-Assign Faculty Table
        html += `<h4 style="color:#fff;">Faculty Assignments</h4>
            <table style="width:100%; border-collapse:collapse; color:white;">
                <tr style="background:#1e293b;"><th style="padding:10px;">Course</th><th>Current Faculty</th><th>Action</th></tr>`;
        
        data.courses.forEach(c => {
            const link = data.faculty_courses?.find(fc => fc.course_id == c.id);
            const teacher = link ? data.teachers.find(t => t.id == link.teacher_id) : {name: 'Unassigned', id: 0};
            
            html += `<tr>
                <td style="padding:10px;">${c.name}</td>
                <td>${teacher.name}</td>
                <td>
                    <select id="teacherSelect_${c.id}" style="background:#0f172a; color:white; border:1px solid #334155;">
                        <option value="0">Change Teacher</option>
                        ${data.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                    </select>
                    <button onclick="reassignFaculty(${c.id})" style="margin-left:10px; cursor:pointer; background:#4f46e5; border:none; color:white; padding:2px 8px;">Update</button>
                </td>
            </tr>`;
        });
        html += `</table>`;
        container.innerHTML = html;
    } catch (err) { container.innerHTML = "Error: " + err.message; }
};

// Re-assign Action Function
window.reassignFaculty = async function(courseId) {
    const tId = document.getElementById(`teacherSelect_${courseId}`).value;
    if (tId == 0) return alert("Select a teacher!");
    
    const response = await apiRequest("/admin/academic/link-faculty", "POST", {
        teacher_id: parseInt(tId),
        course_id: courseId
    });
    
    if (response.success) {
        alert("Faculty updated!");
        loadAcademicMasterTable(); // Refresh the table
    } else {
        alert(response.message);
    }
};

// Helper to count rows for rowspan (zaroori hai table clean dikhne ke liye)
function countTotalRows(dept, data) {
    let count = 0;
    const branches = data.branches.filter(b => b.dept_id === dept.id);
    branches.forEach(b => {
        count += data.courses.filter(c => c.branch_id === b.id).length;
    });
    return count || 1;
}

// Academic Notices Load
async function loadAcademicNotices() {
    const container = document.getElementById("academicNoticesList");
    try {
        const notices = await apiRequest("/admin/academic/notices", "GET");
        container.innerHTML = "";
        notices.forEach(n => {
            const div = document.createElement("div");
            div.style.cssText = "padding:10px; border-bottom:1px solid #334155; display:flex; justify-content:space-between;";
            div.innerHTML = `
                <span>${n.event_name}</span>
                <button onclick="deleteNotice(${n.id})" style="background:red; color:white; border:none; border-radius:4px; cursor:pointer;">Delete</button>
            `;
            container.appendChild(div);
        });
    } catch (err) { container.innerHTML = "Error loading notices."; }
}

async function deleteNotice(id) {
    try {
        // Backend route se matching URL: /admin/academic/notice/{id}
        const response = await apiRequest(`/admin/academic/notice/${id}`, "DELETE");
        if(response.success) {
            Swal.fire("Deleted!", "Notice removed.", "success");
            loadAcademicNotices();
        }
    } catch (err) { 
        Swal.fire("Error", "Could not delete notice.", "error"); 
    }
}

window.uploadCSV = async function() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) return Swal.fire("Oops!", "Pehle file select karo!", "warning");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/admin/academic/bulk-upload", {
            method: "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            Swal.fire("Done!", result.message, "success");
            loadAcademicMasterTable();
        } else {
            // Backend se aane wala 'detail' message yahan dikhega
            Swal.fire("Format Error", result.detail, "error");
        }
    } catch (err) {
        Swal.fire("Error", "Server connect nahi ho raha.", "error");
    }
};

async function verifyAnswer(answerId) {
    try {
        const response = await apiRequest(`/answers/${answerId}/verify`, "PATCH");
        if (response.success) {
            Swal.fire("Verified!", "Answer ab trusted mark ho gaya hai.", "success");
            // Refresh logic yahan dalna
        }
    } catch (err) {
        Swal.fire("Error", "Verify karne mein dikkat aayi.", "error");
    }
}

async function loadModerationQueue() {
    const queueContainer = document.getElementById("moderationQueue");
    queueContainer.innerHTML = "<p>Loading pending items...</p>";
    
    try {
        const questions = await apiRequest("/admin/moderation-queue");
        queueContainer.innerHTML = "";
        
        if (questions.length === 0) {
            queueContainer.innerHTML = `<p style="padding:20px; color:#94a3b8;">Sab clear hai! Koi pending moderation nahi hai. 🎉</p>`;
            return;
        }
        
        questions.forEach(q => {
            const card = document.createElement("div");
            card.className = "queue-card";
            card.innerHTML = `
                <div style="flex:1;">
                    <p style="margin:0; font-weight:600;">${q.title}</p>
                    <small style="color:#64748b;">ID: ${q.id} | Status: Needs Categorization</small>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <select id="course-select-${q.id}" style="padding:8px; background:#0f172a; color:#fff; border:1px solid #334155; border-radius:4px;">
                        <option value="1">B.Tech CS</option>
                        <option value="2">B.Tech IT</option>
                        <option value="3">Business Systems</option>
                    </select>
                    <button onclick="assignCourse(${q.id})" style="background:#8b5cf6; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Move</button>
                </div>
            `;
            queueContainer.appendChild(card);
        });
    } catch (err) {
        queueContainer.innerHTML = `<p style="color:#f87171;">Failed to load queue. Try again.</p>`;
        console.error(err);
    }
}

window.assignCourse = async function(qid) {
    const courseId = document.getElementById(`course-select-${qid}`).value;
    if (!courseId) { alert("Please select a valid course!"); return; }
    
    try {
        await apiRequest(`/admin/questions/${qid}/assign-course`, "PATCH", { course_id: parseInt(courseId) });
        Swal.fire("Success!", "Question successfully moved.", "success");
        loadModerationQueue(); 
    } catch (err) {
        Swal.fire("Error", "Failed to update category.", "error");
    }
};

async function loadAuditLogs() {
    const tbody = document.getElementById("adminLogsTableBody");
    try {
        const logs = await apiRequest("/admin/audit-logs"); // Naya backend route
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${log.admin_id}</td>
                <td><span class="badge">${log.action}</span></td>
                <td>${log.target_id || '-'}</td>
                <td>${log.details || '-'}</td>
                <td>${new Date(log.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5">Failed to load logs.</td></tr>`;
    }
}

// 🚀 assets/js/admin.js ke andar ye dedicated analytics visualizer inject karo:

async function loadAdminFacultyTrackerMatrix() {
    const targetContainer = document.getElementById("adminFacultyTrackerSection");
    if (!targetContainer) return;

    try {
        targetContainer.innerHTML = `<p style="color:var(--text-soft); font-size:13px;">Auditing faculty engagement matrix across campus networks...</p>`;
        
        const data = await apiRequest("/admin/faculty-performance-ledger");
        targetContainer.innerHTML = "";

        if (!Array.isArray(data) || data.length === 0) {
            targetContainer.innerHTML = `<p style="color:var(--text-soft); text-align:center;">No faculty members registered on the platform yet.</p>`;
            return;
        }

        // Create an elegant table component wrapper
        let tableHTML = `
            <div style="overflow-x:auto; width:100%; margin-top:15px; border-radius:8px; border:1px solid var(--border-color, #334155);">
                <table style="width:100%; border-collapse:collapse; font-size:14px; text-align:left; background:var(--bg-card, #1e293b);">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-color, #334155); color:#a78bfa;">
                            <th style="padding:12px;">Faculty Name</th>
                            <th style="padding:12px;">UID</th>
                            <th style="padding:12px; text-align:center;">Active Claims</th>
                            <th style="padding:12px; text-align:center;">Verified Answers</th>
                            <th style="padding:12px; text-align:center;">System Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        data.forEach(t => {
            tableHTML += `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.02); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.01)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px; font-weight:600; color:#fff;">
                        Prof. ${t.name}
                        <br><span style="font-size:11px; color:var(--text-soft); font-weight:400;">${t.email}</span>
                    </td>
                    <td style="padding:12px; color:var(--text-soft); font-family:monospace;">#${t.id}</td>
                    <td style="padding:12px; text-align:center; color:#3b82f6; font-weight:700;">🎫 ${t.active_claims}</td>
                    <td style="padding:12px; text-align:center; color:#10b981; font-weight:700;">✔ ${t.verified_count}</td>
                    <td style="padding:12px; text-align:center;">
                        <span style="padding:2px 8px; border-radius:4px; font-size:11px; font-weight:700; ${t.status === 'Active' ? 'background:#10b98115; color:#10b981;' : 'background:#ef444415; color:#ef4444;'}">
                            ${t.status}
                        </span>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        targetContainer.innerHTML = tableHTML;

    } catch (err) {
        console.error("Faculty tracking node engine exception:", err);
        targetContainer.innerHTML = `<p style="color:#ef4444; font-size:13px;">Failed to compile faculty system tracking audit data.</p>`;
    }
}