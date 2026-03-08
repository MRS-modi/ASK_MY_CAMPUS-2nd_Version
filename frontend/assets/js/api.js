const API_BASE = "http://127.0.0.1:8000";

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