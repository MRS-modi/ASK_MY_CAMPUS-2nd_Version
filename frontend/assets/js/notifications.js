async function markNotificationAsRead(notificationId) {
  try {
    await apiRequest(`/notifications/read/${notificationId}`, "POST");
    loadNotifications();
  } catch (error) {
    console.error(error);
  }
}

async function loadNotifications() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("notificationsList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `
      <div class="empty-screen">
        Login required to view notifications.
      </div>
    `;
    return;
  }

  try {
    const notifications = await apiRequest("/notifications");
    container.innerHTML = "";

    if (!Array.isArray(notifications) || notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-screen">
          No notifications yet.
        </div>
      `;
      return;
    }

    notifications.forEach((item) => {
      const card = document.createElement("article");
      card.className = "notification-card";

      card.innerHTML = `
        <div class="notification-main">
          <div class="notification-title">${item.title}</div>
          <div class="notification-message">${item.message}</div>
          <div class="notification-meta">${item.type}</div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${item.is_read
            ? '<span class="read-badge">Read</span>'
            : '<button class="btn-secondary" onclick="markNotificationAsRead(' + item.id + ')">Mark Read</button>'}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    container.innerHTML = `
      <div class="empty-screen" style="color:#f87171;">
        Failed to load notifications.
      </div>
    `;
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", loadNotifications);