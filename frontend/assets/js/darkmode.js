function applySavedTheme() {
  const savedTheme = localStorage.getItem("amc_theme") || "dark";
  if (savedTheme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
}

function toggleDarkMode() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem("amc_theme", isLight ? "light" : "dark");

  const themeIcon = document.getElementById("themeToggleIcon");
  if (themeIcon) {
    themeIcon.textContent = isLight ? "🌙" : "☀";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applySavedTheme();
  const themeIcon = document.getElementById("themeToggleIcon");
  if (themeIcon) {
    themeIcon.textContent = document.body.classList.contains("light") ? "🌙" : "☀";
  }
});