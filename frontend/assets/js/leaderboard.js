async function loadLeaderboard() {
  const rowsContainer = document.getElementById("leaderboardRows");
  if (!rowsContainer) return;

  try {
    // Backend leaderboard route calling: /auth/leaderboard
    const topUsers = await apiRequest("/auth/leaderboard");
    
    rowsContainer.innerHTML = "";

    if (!Array.isArray(topUsers) || topUsers.length === 0) {
      rowsContainer.innerHTML = `
        <tr>
          <td colspan="5" style="padding: 24px; text-align: center; color: var(--text-soft);">
            No contributors found yet. Be the first one!
          </td>
        </tr>
      `;
      return;
    }

    topUsers.forEach((user, index) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid var(--border-color)";
      row.style.fontSize = "15px";

      // Top 3 ranks ko thoda special icons dene ke liye
      let rankBadge = index + 1;
      if (index === 0) rankBadge = "🥇";
      else if (index === 1) rankBadge = "🥈";
      else if (index === 2) rankBadge = "🥉";

      // Role style badge mapping
      const roleColor = user.role === "admin" ? "#f87171" : (user.role === "teacher" ? "#34d399" : "#60a5fa");

      row.innerHTML = `
        <td style="padding: 16px 8px; font-weight: bold; font-size: 16px;">${rankBadge}</td>
        <td style="padding: 16px 8px; font-weight: 600; color: #fff;">${user.name}</td>
        <td style="padding: 16px 8px; color: var(--text-soft);">
          ${user.branch || "General"} ${user.year ? `• ${user.year}` : ""}
        </td>
        <td style="padding: 16px 8px;">
          <span style="color: ${roleColor}; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
            ${user.role}
          </span>
        </td>
        <td style="padding: 16px 8px; text-align: right; font-weight: 700; color: #a78bfa;">
          ⚡ ${user.reputation_points}
        </td>
      `;
      
      rowsContainer.appendChild(row);
    });

  } catch (error) {
    console.error("Failed to fetch leaderboard data:", error);
    rowsContainer.innerHTML = `
      <tr>
        <td colspan="5" style="padding: 24px; text-align: center; color: #f87171;">
          Failed to load leaderboard. Please try again later.
        </td>
      </tr>
    `;
  }
}

// Dom content load hone par automatically check execute karega
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
});