async function loadComponent(targetId, filePath) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(filePath);
    const html = await response.text();
    target.innerHTML = html;
  } catch (error) {
    console.error(`Failed to load component: ${filePath}`, error);
  }
}

function applyActiveSidebarLink() {
  const currentPage = window.location.pathname.split("/").pop();
  const links = document.querySelectorAll(".sidebar-link");

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

function applyThemeIcon() {
  const themeIcon = document.getElementById("themeToggleIcon");
  if (themeIcon) {
    themeIcon.textContent = document.body.classList.contains("light") ? "🌙" : "☀";
  }
}

function applyNavbarUser() {
  const profileName = document.getElementById("profileName");
  const profileAvatar = document.getElementById("profileAvatar");

  const raw = localStorage.getItem("amc_user");
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    if (profileName) {
      profileName.textContent = user.name || "Profile";
    }
    if (profileAvatar) {
      const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
      profileAvatar.textContent = initial;
    }
  } catch (error) {
    console.error("Failed to parse user info", error);
  }
}

function attachNavbarActions() {
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("amc_user");
      window.location.href = "login.html";
    });
  }
}

async function loadBaseLayout() {
  await loadComponent("sidebarMount", "components/sidebar.html");
  await loadComponent("navbarMount", "components/navbar.html");

  applyActiveSidebarLink();
  applyThemeIcon();
  applyNavbarUser();
  attachNavbarActions();

  if (typeof applyRoleVisibility === "function") {
    applyRoleVisibility();
  }
}

document.addEventListener("DOMContentLoaded", loadBaseLayout);