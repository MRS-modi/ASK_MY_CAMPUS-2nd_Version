function getStoredUser() {
  const raw = localStorage.getItem("amc_user");
  return raw ? JSON.parse(raw) : null;
}

function isAdmin() {
  const user = getStoredUser();
  return user && user.role === "admin";
}

function isTeacherOrAdmin() {
  const user = getStoredUser();
  return user && (user.role === "teacher" || user.role === "admin");
}

function applyRoleVisibility() {
  const user = getStoredUser();

  const adminLinks = document.querySelectorAll('[data-role="admin"]');
  const teacherActions = document.querySelectorAll('[data-role="teacher-admin"]');

  adminLinks.forEach((el) => {
    el.style.display = user && user.role === "admin" ? "" : "none";
  });

  teacherActions.forEach((el) => {
    el.style.display =
      user && (user.role === "teacher" || user.role === "admin") ? "" : "none";
  });
}