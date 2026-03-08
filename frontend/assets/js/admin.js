async function loadAdminDashboard() {
  const token = localStorage.getItem("token");

  const totalUsersEl = document.getElementById("adminTotalUsers");
  const totalQuestionsEl = document.getElementById("adminTotalQuestions");
  const totalAnswersEl = document.getElementById("adminTotalAnswers");
  const tableBody = document.getElementById("adminUsersTableBody");
  const inquiryBody = document.getElementById("adminInquiryTableBody");

  if (!token) {
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5">Login required to access admin panel.</td></tr>`;
    }
    if (inquiryBody) {
      inquiryBody.innerHTML = `<tr><td colspan="6">Login required to access inquiry management.</td></tr>`;
    }
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("amc_user") || "null");

  try {
    const analytics = await apiRequest("/admin/analytics");
    if (totalUsersEl) totalUsersEl.textContent = analytics.total_users ?? "--";
    if (totalQuestionsEl) totalQuestionsEl.textContent = analytics.total_questions ?? "--";
    if (totalAnswersEl) totalAnswersEl.textContent = analytics.total_answers ?? "--";
  } catch (error) {
    console.error("Analytics failed:", error);
  }

  try {
    const users = await apiRequest("/admin/users");

    if (tableBody) {
      tableBody.innerHTML = "";

      if (!Array.isArray(users) || users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
      } else {
        users.forEach((user) => {
          const isSelf = currentUser && currentUser.id === user.id;
          const row = document.createElement("tr");

          row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>
              <div class="action-row">
                ${
                  isSelf
                    ? `<span style="opacity:0.7;">Current User</span>`
                    : `
                      <button class="small-btn" onclick="makeTeacher(${user.id})">Make Teacher</button>
                      <button class="small-btn" onclick="makeAdmin(${user.id})">Make Admin</button>
                      <button class="small-btn" onclick="banUser(${user.id})">Ban</button>
                    `
                }
              </div>
            </td>
          `;

          tableBody.appendChild(row);
        });
      }
    }
  } catch (error) {
    console.error("Users failed:", error);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="5">Failed to load users.</td></tr>`;
    }
  }

  try {
    const inquiries = await apiRequest("/inquiries/admin/all");

    if (inquiryBody) {
      inquiryBody.innerHTML = "";

      if (!Array.isArray(inquiries) || inquiries.length === 0) {
        inquiryBody.innerHTML = `<tr><td colspan="6">No inquiries found.</td></tr>`;
      } else {
        inquiries.forEach((item) => {
          const row = document.createElement("tr");

          row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.inquiry_department}</td>
            <td>${item.subject}</td>
            <td>${item.status}</td>
            <td>
              <div class="action-row">
                <button class="small-btn" onclick="updateInquiryStatus(${item.id}, 'under_review')">Under Review</button>
                <button class="small-btn" onclick="updateInquiryStatus(${item.id}, 'resolved')">Resolve</button>
                <button class="small-btn" onclick="updateInquiryStatus(${item.id}, 'rejected')">Reject</button>
              </div>
            </td>
          `;

          inquiryBody.appendChild(row);
        });
      }
    }
  } catch (error) {
    console.error("Inquiries failed:", error);
    if (inquiryBody) {
      inquiryBody.innerHTML = `<tr><td colspan="6">Failed to load inquiries.</td></tr>`;
    }
  }
}

async function makeTeacher(userId) {
  try {
    await apiRequest(`/admin/users/${userId}/make-teacher`, "PATCH");
    loadAdminDashboard();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to make teacher");
  }
}

async function makeAdmin(userId) {
  try {
    await apiRequest(`/admin/users/${userId}/make-admin`, "PATCH");
    loadAdminDashboard();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to make admin");
  }
}

async function banUser(userId) {
  try {
    await apiRequest(`/admin/users/${userId}/ban`, "PATCH");
    loadAdminDashboard();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to ban user");
  }
}

async function updateInquiryStatus(inquiryId, status) {
  try {
    await apiRequest(`/inquiries/admin/${inquiryId}`, "PATCH", {
      status,
      admin_note: `Status updated to ${status}`
    });
    loadAdminDashboard();
  } catch (error) {
    console.error(error);
    alert(error.message || "Failed to update inquiry");
  }
}