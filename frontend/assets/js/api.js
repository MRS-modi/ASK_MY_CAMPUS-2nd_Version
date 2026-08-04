const API_BASE_URL = "https://ask-my-campus.onrender.com";
//const API_BASE = "http://127.0.0.1:8000";

async function apiRequest(endpoint, method = "GET", data = null) {
  const token = localStorage.getItem("token");

  const options = {
    method,
    headers: {
      "Content-Type": "application/json"
    }
  };

  if (token) {
    options.headers["Authorization"] = "Bearer " + token;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(API_BASE + endpoint, options);

  // --- Yahan update karo ---
  // Agar Backend se 401 Unauthorized aaye, toh token invalid hai
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("amc_user");
    window.location.href = "login.html"; // Forceful redirection
    throw new Error("Session expired. Please login again.");
  }
  // -------------------------

  let result = {};
  try {
    result = await response.json();
  } catch (e) {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result.detail || "Request failed");
  }

  return result;
}