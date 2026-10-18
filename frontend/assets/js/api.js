// Local testing ke waqt localhost, production me Render domain:
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://ask-my-campus.onrender.com"; // Render Backend URL

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

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("amc_user");
    window.location.href = "login.html"; 
    throw new Error("Session expired. Please login again.");
  }

  let result = {};
  try {
    result = await response.json();
  } catch (e) {
    result = {};
  }

  if (!response.ok) {
    // 🚀 FIXED: Handle FastAPI Validation arrays preventing [object Object]
    let errorMsg = "Request failed";
    if (result.detail) {
        if (typeof result.detail === 'string') {
            errorMsg = result.detail;
        } else if (Array.isArray(result.detail)) {
            errorMsg = result.detail.map(e => e.msg).join(", "); // Extract specific messages
        } else {
            errorMsg = JSON.stringify(result.detail);
        }
    } else if (result.message) {
        errorMsg = result.message;
    }
    throw new Error(errorMsg);
  }

  return result;
}