// frontend/assets/js/faculty.js - HIGH RESPONSIVE LIFE-CYCLE CONTROL ENGINE

let currentFacultyUser = null;

// 🎛️ CORE TAB SWITCH ROUTER FOR FACULTY MATRIX
function switchFacultyTab(targetTab) {
    const tabs = {
        assigned: document.getElementById("assignedTabBtn"),
        reviews: document.getElementById("reviewsTabBtn"),
        insights: document.getElementById("insightsTabBtn"),
        discussions: document.getElementById("discussionsTabBtn")
    };

    const sections = {
        assigned: document.getElementById("assignedSection"),
        reviews: document.getElementById("reviewsSection"),
        insights: document.getElementById("insightsSection"),
        discussions: document.getElementById("discussionsSection")
    };

    Object.values(tabs).forEach(btn => {
        if (btn) {
            btn.style.background = "transparent";
            btn.style.borderColor = "transparent";
            btn.style.color = "#94a3b8";
        }
    });

    Object.values(sections).forEach(sec => {
        if (sec) sec.style.display = "none";
    });

    if (tabs[targetTab]) {
        tabs[targetTab].style.background = "var(--bg-card, #1e293b)";
        tabs[targetTab].style.borderColor = "var(--border-color, #334155)";
        tabs[targetTab].style.color = "#fff";
    }

    if (sections[targetTab]) {
        sections[targetTab].style.display = "block";
    }

    if (targetTab === "assigned") loadAssignedCourseDoubtsPipeline();
    if (targetTab === "reviews") loadPendingReviewsQueuePipeline();
    if (targetTab === "insights") loadFacultyGamifiedInsights();
    if (targetTab === "discussions") loadLiveDiscussionsTimelineFeed();
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadBaseLayout();
    
    const rawUser = localStorage.getItem("amc_user");
    currentFacultyUser = rawUser ? JSON.parse(rawUser) : null;

    if (!currentFacultyUser || (currentFacultyUser.role !== "teacher" && currentFacultyUser.role !== "admin")) {
        window.location.href = "index.html"; 
        return;
    }

    await populateFacultySpecificCoursesDropdown();
    await syncFacultyAnalyticsNumbers();
    switchFacultyTab("assigned");
});

async function populateFacultySpecificCoursesDropdown() {
    const selector = document.getElementById("facultyCourseScopeSelector");
    if (!selector) return;

    try {
        const data = await apiRequest("/admin/academic/all-data");
        const facultyCoursesLink = data.faculty_courses || [];
        const allCourses = data.courses || [];

        const myAssignedCourseIds = facultyCoursesLink
            .filter(fc => fc.teacher_id == currentFacultyUser.id)
            .map(fc => fc.course_id);

        allCourses.forEach(course => {
            if (myAssignedCourseIds.includes(course.id)) {
                const opt = document.createElement("option");
                opt.value = `course_${course.id}`; 
                opt.textContent = `🎯 Only: ${course.name}`;
                selector.appendChild(opt);
            }
        });
    } catch (err) {
        console.error("Dropdown hydration pipeline crash:", err);
    }
}

async function syncFacultyAnalyticsNumbers() {
    try {
        const stats = await apiRequest("/questions/faculty/analytics-summary");
        document.getElementById("facultyAssignedQuestions").textContent = stats.assigned_count ?? "0";
        document.getElementById("facultyTotalClaims").textContent = stats.active_claims_count ?? "0";
        document.getElementById("facultyVerifiedAnswers").textContent = stats.verified_count ?? "0";

        const alertBanner = document.getElementById("autoEscalationAlertBanner");
        if (stats.has_escalated_threats && alertBanner) {
            alertBanner.style.display = "block";
        }
    } catch (err) {
        console.error("Analytics syncing error execution:", err);
    }
}

// 🧱 TAB A: FEEDS RENDERING LIST WITH MOBILE RESPONSIVE WRAPPER (WITHOUT REDUCTION)
async function loadAssignedCourseDoubtsPipeline() {
    const container = document.getElementById("facultyAssignedDoubtsContainer");
    const scopeSelector = document.getElementById("facultyCourseScopeSelector");
    if (!container) return;

    try {
        container.innerHTML = `<p style="color:var(--text-soft);">Syncing channels feed context mapping...</p>`;
        const selectionMode = scopeSelector ? scopeSelector.value : "assigned";
        
        let endpoint = `/questions/faculty/feeds?scope=${selectionMode}`;
        if (selectionMode.startsWith("course_")) {
            const courseId = selectionMode.split("course_")[1];
            endpoint = `/questions/faculty/feeds?scope=particular&course_id=${courseId}`;
        }
        
        const questions = await apiRequest(endpoint);
        container.innerHTML = "";

        if (!Array.isArray(questions) || questions.length === 0) {
            container.innerHTML = `<div class="card" style="padding:20px; text-align:center; color:var(--text-soft);">No active questions found in this view scope context.</div>`;
            return;
        }

        questions.forEach(q => {
            const card = document.createElement("div");
            card.id = `faculty-question-row-${q.id}`;
            
            // 🚀 FIXED: Mobile layout flex wrap pattern with dynamic media boundary simulation
            card.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); padding:16px; border-radius:8px; display:flex; flex-direction:row; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:16px; width:100%; box-sizing:border-box; margin-bottom:12px;";
            
            const claimBtnHTML = q.claimed_by_id 
                ? `<span class="badge-claimed" style="font-size:12px; color:var(--text-soft); opacity:0.8; background:rgba(59,130,246,0.15); padding:6px 10px; border-radius:4px; border:1px solid #3b82f633; white-space:nowrap; display:inline-block;">🎫 Claimed</span>`
                : `<button class="small-btn filter-chip claim-action-btn" style="background:#3b82f622; color:#3b82f6; border:1px solid #3b82f633; white-space:nowrap; padding:6px 12px; cursor:pointer;" onclick="executeClaimDoubtAction(event, ${q.id})">🎫 Claim Doubt</button>`;

            const resolvedBadgeHTML = q.is_resolved 
                ? `<span class="badge-resolved" style="font-size:11px; font-weight:800; background:#10b98122; color:#10b981; padding:4px 8px; border-radius:4px; border:1px solid #10b98133; white-space:nowrap; display:inline-block;">RESOLVED LOCK</span>`
                : `<button class="small-btn filter-chip resolve-action-btn" style="background:#10b98115; color:#10b981; padding:4px 8px; cursor:pointer; white-space:nowrap;" onclick="executeMarkAsResolvedSecureToggle(${q.id})">🔒 Close & Resolve</button>`;

            // Flex-grow property links components nicely inside mobile viewpoints
            card.innerHTML = `
                <div style="flex: 1; min-width: 250px;">
                    <div class="status-badge-container" style="display:flex; gap:8px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
                        <span class="tag-pill" style="font-size:11px; background:rgba(167,139,250,0.15); color:#a78bfa; padding:2px 8px; border-radius:4px;">${q.course_name || 'General Stream'}</span>
                        <span class="resolve-slot-mount">${resolvedBadgeHTML}</span>
                    </div>
                    <h4 style="margin:6px 0; color:#fff; font-size:16px; line-height:1.4;">${q.title}</h4>
                    <small style="color:var(--text-soft); display:block; margin-top:4px;">Asked by: ${q.author_name} • ${q.subject || 'General'}</small>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-shrink:0; flex-wrap:wrap; margin-top:4px;" class="action-buttons-mount">
                    <a href="question.html?id=${q.id}" class="small-btn" style="text-decoration:none; padding:6px 12px; font-weight:600; display:inline-block; border:1px solid var(--border-color); color:#fff; border-radius:4px; font-size:13px; white-space:nowrap;">Open Feed</a>
                    <span class="claim-slot-mount" style="display:inline-block;">${claimBtnHTML}</span>
                </div>`;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:#ef4444;">Failed to compile assigned stream channel feeds loop entries.</p>`;
    }
}

// 🧱 TAB B: REVIEW QUEUE (FIXED: Added Question Context & Parent Context Tracing)
async function loadPendingReviewsQueuePipeline() {
    const container = document.getElementById("facultyReviewsQueueContainer");
    if (!container) return;

    try {
        container.innerHTML = `<p style="color:var(--text-soft);">Auditing moderation queue and content matrix...</p>`;
        
        const [pendingAnswers, escalatedQuestions] = await Promise.all([
            apiRequest("/questions/faculty/pending-reviews"),
            apiRequest("/questions/faculty/feeds?scope=all")
        ]);

        container.innerHTML = "";

        const highRiskThreats = escalatedQuestions.filter(q => q.tags && q.tags.includes("reportedreported"));

        // 🛑 SECTION A: HIGH-RISK THREATS QUEUE
        if (highRiskThreats.length > 0) {
            const threatHeader = document.createElement("div");
            threatHeader.innerHTML = `<h3 style="color:#ef4444; font-size:15px; margin: 10px 0 8px 0; font-weight:700;">⚠️ PRIORITY ACTION: Flagged Campus Doubts</h3>`;
            container.appendChild(threatHeader);

            highRiskThreats.forEach(q => {
                const threatRow = document.createElement("div");
                threatRow.id = `faculty-threat-row-${q.id}`;
                threatRow.style.cssText = "background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.2); padding: 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 10px; width:100%; box-sizing:border-box;";
                
                threatRow.innerHTML = `
                    <div style="flex:1; min-width:0;">
                        <span style="font-size:10px; font-weight:800; background:#ef444422; color:#ef4444; padding:2px 6px; border-radius:4px; text-transform:uppercase;">🚨 Auto-Escalated</span>
                        <h4 style="margin:4px 0; color:#fff; font-size:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${q.title}</h4>
                        <small style="color:var(--text-soft);">Course Stream: ${q.course_name} • Asked by: ${q.author_name}</small>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button class="small-btn" style="background:#10b98115; color:#10b981; border:1px solid #10b98125;" onclick="executeDismissThreatAction(event, ${q.id})">✔ Safe</button>
                        <button class="small-btn" style="background:#ef444422; color:#ef4444; border:1px solid #ef444425;" onclick="executeFacultyDeleteQuestionAction(event, ${q.id})">🗑️ Delete</button>
                    </div>`;
                container.appendChild(threatRow);
            });
        }

        // 📝 SECTION B: UNVERIFIED STUDENT ANSWERS QUEUE
        const answerHeader = document.createElement("h3");
        answerHeader.style.cssText = "font-size:15px; color:#fff; margin-top:20px; font-weight:700; margin-bottom:12px;";
        answerHeader.textContent = "📝 Pending Answers Verification";
        container.appendChild(answerHeader);

        if (!Array.isArray(pendingAnswers) || pendingAnswers.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.innerHTML = `<p style="color:var(--text-soft); padding:15px; text-align:center; font-size:13px;">🎉 No unverified answers pending review.</p>`;
            container.appendChild(emptyDiv);
        } else {
            for (const ans of pendingAnswers) {
                // Fetch context question dynamically using API fallbacks
                let contextQuestionHTML = `<span style="color:var(--text-muted); font-size:12px;">Syncing target thread context...</span>`;
                try {
                    if (ans.question_id) {
                        const qDetails = await apiRequest(`/questions/${ans.question_id}`);
                        contextQuestionHTML = `💬 <strong style="color:#fff;">Question Context:</strong> <a href="question.html?id=${qDetails.id}" style="color:var(--accent-color, #a78bfa); text-decoration:underline;">${qDetails.title}</a>`;
                    } else {
                        contextQuestionHTML = `💡 <em>General Domain Response (Direct Verification Option Active)</em>`;
                    }
                } catch(e) {
                    contextQuestionHTML = `💡 <em>Domain Verification Track (ID: ${ans.id})</em>`;
                }

                const row = document.createElement("div");
                row.id = `faculty-review-row-${ans.id}`;
                row.style.cssText = "background:var(--bg-card); border:1px solid var(--border-color); padding:16px; border-radius:8px; display:flex; flex-direction:column; gap:12px; width:100%; box-sizing:border-box; margin-bottom:12px;";
                row.innerHTML = `
                    <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border-left:3px solid var(--border-color); font-size:13px;">
                        ${contextQuestionHTML}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:20px;">
                        <div style="flex:1; min-width:0;">
                            <strong style="color:#60a5fa; font-size:13px; display:block; margin-bottom:4px;">Proposed Answer by: ${ans.author_name} (${ans.author_role})</strong>
                            <p style="margin:4px 0; color:#f1f5f9; font-weight:500; font-size:14px; white-space:pre-wrap;">"${ans.content}"</p>
                        </div>
                        <div style="display:flex; gap:6px; flex-shrink:0;">
                            <button class="small-btn" style="background:#10b98122; color:#10b981; border:1px solid #10b98133; padding:8px 14px; font-weight:700;" onclick="executeVerifyAnswerActionFromDashboard(${ans.id})">✔ Approve & Verify</button>
                        </div>
                    </div>`;
                container.appendChild(row);
            }
        }

        if (highRiskThreats.length === 0 && (!pendingAnswers || pendingAnswers.length === 0)) {
            container.innerHTML = `<div class="card" style="padding:30px; text-align:center; color:var(--text-soft);">🎉 Queue complete! Platform content is 100% compliant.</div>`;
        }

    } catch (err) {
        console.error(err);
        container.innerHTML = `<p style="color:#ef4444;">Failed to load moderation queue elements.</p>`;
    }
}

// 🧱 TAB C: INSIGHTS DISPLAYS (FIXED: Added Live Distribution Trends Grid Metrics)
async function loadFacultyGamifiedInsights() {
    const target = document.getElementById("facultyGamifiedInsightsBox");
    if (!target) return;

    try {
        const stats = await apiRequest("/questions/faculty/analytics-summary");
        const assigned = stats.assigned_count ?? 0;
        const claims = stats.active_claims_count ?? 0;
        const verified = stats.verified_count ?? 0;

        // Generate dynamic relative metrics bar heights mapping weights
        const total = (assigned + claims + verified) || 1;
        const pAssigned = Math.max(((assigned / total) * 100), 10).toFixed(0);
        const pClaims = Math.max(((claims / total) * 100), 10).toFixed(0);
        const pVerified = Math.max(((verified / total) * 100), 10).toFixed(0);

        target.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:20px; width:100%;">
                <div class="card" style="padding:20px; background:var(--bg-card); border:1px solid var(--border-color); border-top: 4px solid #a78bfa;">
                    <h5 style="margin:0 0 12px 0; color:#a78bfa; font-size:12px; text-transform:uppercase;">Assigned Workload Ratio</h5>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:8px;">
                        <div style="width:${pAssigned}%; height:100%; background:#a78bfa; border-radius:4px;"></div>
                    </div>
                    <span style="font-size:13px; color:var(--text-soft); font-weight:600;">Distribution: ${pAssigned}% weight</span>
                </div>
                <div class="card" style="padding:20px; background:var(--bg-card); border:1px solid var(--border-color); border-top: 4px solid #3b82f6;">
                    <h5 style="margin:0 0 12px 0; color:#3b82f6; font-size:12px; text-transform:uppercase;">Resolution Claim Velocity</h5>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:8px;">
                        <div style="width:${pClaims}%; height:100%; background:#3b82f6; border-radius:4px;"></div>
                    </div>
                    <span style="font-size:13px; color:var(--text-soft); font-weight:600;">Active Queue: ${claims} doubts claim logs</span>
                </div>
                <div class="card" style="padding:20px; background:var(--bg-card); border:1px solid var(--border-color); border-top: 4px solid #10b981;">
                    <h5 style="margin:0 0 12px 0; color:#10b981; font-size:12px; text-transform:uppercase;">Accuracy Contribution Rank</h5>
                    <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:8px;">
                        <div style="width:${pVerified}%; height:100%; background:#10b981; border-radius:4px;"></div>
                    </div>
                    <span style="font-size:13px; color:var(--text-soft); font-weight:600;">Authenticated: ${verified} answers set</span>
                </div>
            </div>
            <div class="card" style="padding:24px; background:var(--bg-card); border:1px solid var(--border-color); text-align:center; width:100%; box-sizing:border-box;">
                <h4 style="color:#fff; margin:0 0 10px 0;">🎯 Performance Matrix Insights Roster</h4>
                <p style="color:var(--text-soft); font-size:14px; max-width:600px; margin:0 auto; line-height:1.6;">Great work Professor! Your verification accuracy and real-time response time are performing optimal. Keep solving doubts to keep up the dynamic stats badge level.</p>
            </div>`;
    } catch(err) {
        console.error(err);
    }
}

// 🧱 TAB D: TIMELINE COMMENTS FEEDS (FIXED: Added Direct Jump Trigger Link Box)
async function loadLiveDiscussionsTimelineFeed() {
    const container = document.getElementById("facultyLiveCommentsTrackingBox");
    if (!container) return;

    try {
        container.innerHTML = `<p style="color:var(--text-soft);">Tracking live thread changes history metrics...</p>`;
        const activities = await apiRequest("/questions/faculty/comments-activity-feed");
        container.innerHTML = "";

        if (!Array.isArray(activities) || activities.length === 0) {
            container.innerHTML = `<p style="color:var(--text-soft); font-size:13px; padding:10px;">No recent discussion follow-ups or replies tracking activity recorded yet.</p>`;
            return;
        }

        activities.forEach(log => {
            const element = document.createElement("div");
            element.style.cssText = "padding:14px; background:var(--bg-card); border:1px solid var(--border-color); border-left:4px solid var(--accent-color, #a78bfa); border-radius:8px; font-size:14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; gap:15px; width:100%; box-sizing:border-box;";
            
            // Extracts link destination mapping properties if answer_id link structure targets are present
            const targetLinkHTML = log.id 
                ? `<a href="index.html" class="small-btn" style="text-decoration:none; color:#fff; border:1px solid var(--border-color); font-weight:600; padding:6px 12px; white-space:nowrap;">Open Thread</a>`
                : "";

            element.innerHTML = `
                <div style="min-width:0; flex:1;">
                    <span style="color:var(--text-muted); font-size:11px; font-weight:700; display:block; text-transform:uppercase; margin-bottom:2px;">💬 Follow-up Alert</span>
                    <span style="color:var(--text-soft); line-height:1.5;">New tracking suggestion posted: <span style="color:#fff; font-weight:600;">"${log.content}"</span> by scholar <strong style="color:var(--accent-color);">${log.author_name}</strong></span>
                </div>
                ${targetLinkHTML}`;
            container.appendChild(element);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:#ef4444;">Failed to sync real-time conversations log stream nodes.</p>`;
    }
}

// 🎫 FEATURE 2: CLAIM DOUBT ACTION WITH INSTANT OPTIMISTIC UI TRANSITION
async function executeClaimDoubtAction(event, questionId) {
    event.stopPropagation();
    
    const targetRow = document.getElementById(`faculty-question-row-${questionId}`);
    const slotMount = targetRow ? targetRow.querySelector(".claim-slot-mount") : null;
    const originalHTML = slotMount ? slotMount.innerHTML : "";

    try {
        if (slotMount) {
            slotMount.innerHTML = `<span style="font-size:12px; color:var(--text-muted); opacity:0.5;">Processing...</span>`;
        }

        await apiRequest(`/questions/faculty/claim/${questionId}`, "POST");
        
        if (slotMount) {
            slotMount.innerHTML = `<span class="badge-claimed" style="font-size:12px; color:var(--text-soft); opacity:0.8; background:rgba(59,130,246,0.15); padding:4px 8px; border-radius:4px; border:1px solid #3b82f633;">🎫 Claimed</span>`;
        }
        
        Swal.fire({ text: "Doubt verification token successfully claimed!", icon: "success", toast: true, position: "top-end", showConfirmButton: false, timer: 1500, background: "#1e293b", color: "#fff" });
        await syncFacultyAnalyticsNumbers();
    } catch (err) {
        if (slotMount) slotMount.innerHTML = originalHTML;
        Swal.fire({ text: err.message || "Operation failed", icon: "error", background: "#1e293b", color: "#fff" });
    }
}

// 🔒 RESOLVE OPTION FEATURE WITH INSTANT OPTIMISTIC TRANSITION
async function executeMarkAsResolvedSecureToggle(questionId) {
    const targetRow = document.getElementById(`faculty-question-row-${questionId}`);
    const resolveMount = targetRow ? targetRow.querySelector(".resolve-slot-mount") : null;
    const originalHTML = resolveMount ? resolveMount.innerHTML : "";

    const confirmation = await Swal.fire({
        title: 'Lock & Close Discussion?',
        text: "Are you sure you want to mark this doubt as resolved? This action permanent locks the inline comments box for everyone.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Yes, Resolve Doubt',
        background: '#1e293b',
        color: '#fff'
    });

    if (confirmation.isConfirmed) {
        try {
            if (resolveMount) {
                resolveMount.innerHTML = `<span style="font-size:11px; opacity:0.5;">Locking thread...</span>`;
            }

            await apiRequest(`/questions/faculty/resolve-lock/${questionId}`, "PATCH");
            
            if (resolveMount) {
                resolveMount.innerHTML = `<span class="badge-resolved" style="font-size:11px; font-weight:800; background:#10b98122; color:#10b981; padding:2px 6px; border-radius:4px; border:1px solid #10b98133;">RESOLVED LOCK</span>`;
            }

            Swal.fire({ text: "Discussion thread locked and marked resolved!", icon: "success", background: "#1e293b", color: "#fff" });
            await syncFacultyAnalyticsNumbers();
        } catch (err) {
            if (resolveMount) resolveMount.innerHTML = originalHTML;
            Swal.fire({ text: err.message, icon: "error", background: "#1e293b", color: "#fff" });
        }
    }
}

// 🚀 EXCLUSIVE ACTION 1: DISMISS THREAT (MARK AS SAFE)
async function executeDismissThreatAction(event, questionId) {
    event.stopPropagation();
    const targetRow = document.getElementById(`faculty-threat-row-${questionId}`);
    try {
        await apiRequest(`/questions/faculty/dismiss-threat/${questionId}`, "PATCH");
        
        if (targetRow) {
            targetRow.style.transition = "all 0.3s ease";
            targetRow.style.opacity = "0";
            setTimeout(() => { targetRow.remove(); }, 300);
        }
        Swal.fire({ text: "Threat content dismissed and marked safe!", icon: "success", toast: true, position: "top-end", showConfirmButton: false, timer: 1500, background: "#1e293b", color: "#fff" });
        await syncFacultyAnalyticsNumbers();
    } catch (err) {
        Swal.fire({ text: err.message || "Action failed", icon: "error", background: "#1e293b", color: "#fff" });
    }
}

// 🚀 EXCLUSIVE ACTION 2: FACULTY FORCE DELETE CONTENT THREAD
async function executeFacultyDeleteQuestionAction(event, questionId) {
    event.stopPropagation();
    const targetRow = document.getElementById(`faculty-threat-row-${questionId}`);

    const result = await Swal.fire({
        title: 'Delete Reported Doubt?',
        text: "Bhai, kya sach me is flagged question ko platform se permanently delete karna chahte ho?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Yes, Delete Post',
        background: '#1e293b',
        color: '#fff'
    });

    if (result.isConfirmed) {
        try {
            await apiRequest(`/questions/${questionId}`, "DELETE");
            if (targetRow) {
                targetRow.style.transition = "all 0.3s ease";
                targetRow.style.opacity = "0";
                setTimeout(() => { targetRow.remove(); }, 300);
            }
            Swal.fire({ text: "High-Risk doubt permanently removed!", icon: "success", background: "#1e293b", color: "#fff" });
            await syncFacultyAnalyticsNumbers();
        } catch (err) {
            Swal.fire({ title: 'Error', text: err.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    }
}

// Dashboard helper function to direct resolve unverified items actions
async function executeVerifyAnswerActionFromDashboard(answerId) {
    const targetRow = document.getElementById(`faculty-review-row-${answerId}`);
    try {
        await apiRequest(`/answers/${answerId}/verify`, "PATCH");
        
        if (targetRow) {
            targetRow.style.transition = "all 0.3s ease";
            targetRow.style.opacity = "0";
            setTimeout(() => {
                targetRow.remove();
                const queue = document.getElementById("facultyReviewsQueueContainer");
                if (queue && queue.children.length === 0) {
                    queue.innerHTML = `<p style="color:var(--text-soft); padding:15px; text-align:center;">🎉 Everything clear! No unverified answers waiting review.</p>`;
                }
            }, 300);
        }

        Swal.fire({ text: "Answer successfully authenticated!", icon: "success", toast: true, position: "top-end", showConfirmButton: false, timer: 1500, background: "#1e293b", color: "#fff" });
        await syncFacultyAnalyticsNumbers();
    } catch (err) {
        Swal.fire({ text: err.message || "Failed execution", icon: "error", background: "#1e293b", color: "#fff" });
    }
}