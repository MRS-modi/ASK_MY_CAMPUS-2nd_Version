function getStatusClass(status) {
  if (status === "submitted") return "status-submitted";
  if (status === "under_review") return "status-under_review";
  if (status === "resolved") return "status-resolved";
  if (status === "rejected") return "status-rejected";
  return "status-submitted";
}

async function submitInquiry() {
  const token = localStorage.getItem("token");
  const msg = document.getElementById("inquiryMessage");

  msg.textContent = "";

  if (!token) {
    msg.textContent = "You must login first before submitting an inquiry.";
    return;
  }

  const payload = {
    name: document.getElementById("inqName").value.trim(),
    father_name: document.getElementById("inqFatherName").value.trim() || null,
    enrollment_number: document.getElementById("inqEnrollment").value.trim(),
    email: document.getElementById("inqEmail").value.trim(),
    branch: document.getElementById("inqBranch").value.trim() || null,
    year: document.getElementById("inqYear").value.trim() || null,
    inquiry_department: document.getElementById("inqDepartment").value.trim(),
    subject: document.getElementById("inqSubject").value.trim(),
    message: document.getElementById("inqMessage").value.trim()
  };

  if (
    !payload.name ||
    !payload.enrollment_number ||
    !payload.email ||
    !payload.inquiry_department ||
    !payload.subject ||
    !payload.message
  ) {
    msg.textContent = "Please fill all required fields.";
    return;
  }

  try {
    await apiRequest("/inquiries", "POST", payload);
    msg.textContent = "Inquiry submitted successfully.";
  } catch (error) {
    msg.textContent = error.message || "Failed to submit inquiry.";
    console.error("Inquiry payload error:", payload);
    console.error(error);
  }
}

async function loadMyInquiries() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("myInquiriesList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `
      <div class="card">
        <p style="color:var(--text-soft);">Login required to view your inquiries.</p>
      </div>
    `;
    return;
  }

  try {
    const inquiries = await apiRequest("/inquiries/mine");
    container.innerHTML = "";

    if (!Array.isArray(inquiries) || inquiries.length === 0) {
      container.innerHTML = `
        <div class="card">
          <p style="color:var(--text-soft);">No inquiries submitted yet.</p>
        </div>
      `;
      return;
    }

    inquiries.forEach((item) => {
      const card = document.createElement("article");
      card.className = "inquiry-card";

      card.innerHTML = `
        <div class="inquiry-title">${item.subject}</div>

        <div class="inquiry-meta">
          ${item.inquiry_department} • ${item.email}
        </div>

        <div class="inquiry-message">
          ${item.message}
        </div>

        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center;">
          <span class="status-pill ${getStatusClass(item.status)}">
            ${item.status}
          </span>

          <span style="color:var(--text-muted);font-size:0.9rem;">
            Enrollment: ${item.enrollment_number}
          </span>
        </div>

        ${
          item.admin_note
            ? `<div style="margin-top:14px;color:var(--text-soft);"><strong>Admin Note:</strong> ${item.admin_note}</div>`
            : ""
        }
      `;

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `
      <div class="card">
        <p style="color:#f87171;">Failed to load inquiries.</p>
      </div>
    `;
    console.error(error);
  }
}