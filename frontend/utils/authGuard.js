function requireAuth() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/login.html";
  }
}

function requireAdmin() {
  const user = JSON.parse(localStorage.getItem("amc_user"));

  if (!user || user.role !== "admin") {
    alert("Admin access required");
    window.location.href = "/home.html";
  }
}