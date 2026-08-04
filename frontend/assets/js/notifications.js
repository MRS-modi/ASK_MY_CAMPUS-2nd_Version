async function markNotificationAsRead(notificationId) {
    try {
        await apiRequest(`/notifications/read/${notificationId}`, "POST");
        loadNotifications(); 
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
    }
}

async function loadNotifications() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("notificationsList");

  if (!container) return;

  if (!token) {
    container.innerHTML = `
      <div class="card" style="padding:24px; text-align:center;">
        <p style="color:var(--text-soft);">Login required to view notifications.</p>
      </div>
    `;
    return;
  }

  try {
    container.innerHTML = `<div class="card" style="padding:24px;"><p style="color:var(--text-soft);">Checking campus logs...</p></div>`;
    const notifications = await apiRequest("/notifications");
    container.innerHTML = "";

    if (!Array.isArray(notifications) || notifications.length === 0) {
      container.innerHTML = `
        <div class="card" style="padding: 32px; text-align: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;">
          <p style="color: var(--text-soft); font-size: 15px; margin: 0;">
            🔔 All quiet here! No new notifications found today.
          </p>
        </div>
      `;
      return;
    }

    notifications.forEach((item) => {
      const card = document.createElement("article");
      card.className = "notification-card";
      
      // Inline styling to align with premium layout
      card.style.background = "var(--bg-card)";
      card.style.border = "1px solid var(--border-color)";
      card.style.borderRadius = "12px";
      card.style.padding = "20px";
      card.style.marginBottom = "12px";
      card.style.display = "flex";
      card.style.justifyContent = "between";
      card.style.alignItems = "center";
      card.style.gap = "16px";

      // Badge highlights for action types
      const badgeColor = item.type.includes("upvoted") ? "#a78bfa" : (item.type.includes("verified") ? "#34d399" : "#60a5fa");

      card.innerHTML = `
        <div class="notification-main" style="flex-grow: 1;">
          <div class="notification-title" style="font-weight: 700; font-size: 16px; color: #fff; margin-bottom: 4px;">
            ${item.title} <span style="font-size:10px; color:${badgeColor}; background:${badgeColor}22; padding:2px 6px; border-radius:4px; margin-left:8px; text-transform:uppercase;">${item.type.replace("answer_", "")}</span>
          </div>
          <div class="notification-message" style="font-size: 14px; color: var(--text-soft); margin-bottom: 2px;">${item.message}</div>
        </div>

        <div style="display:flex; gap:10px; flex-shrink: 0;">
          ${item.is_read
            ? '<span class="read-badge" style="color: var(--text-soft); font-size: 13px; font-weight:500;">✓ Read</span>'
            : `<button class="filter-chip active" style="cursor:pointer; font-size:12px; padding:6px 12px;" onclick="markNotificationAsRead(${item.id})">Mark Read</button>`
          }
        </div>
      `;

      container.appendChild(card);
    });
    if (typeof updateNotificationBadge === 'function') {
        updateNotificationBadge();
    }
  } catch (error) {
    console.error("Error fetching notification items:", error);
    container.innerHTML = `
      <div class="card" style="padding:24px; text-align:center;">
        <p style="color:#f87171;">Failed to load server notifications. Please try again.</p>
      </div>
    `;
  }
}