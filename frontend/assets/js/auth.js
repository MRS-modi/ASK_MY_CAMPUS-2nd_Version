function setToken(token) {
  localStorage.setItem("token", token);
}

function getToken() {
  return localStorage.getItem("token");
}

function removeToken() {
  localStorage.removeItem("token");
}

function setCurrentUser(user) {
  localStorage.setItem("amc_user", JSON.stringify(user));
}

function getCurrentUser() {
  const raw = localStorage.getItem("amc_user");
  return raw ? JSON.parse(raw) : null;
}

function removeCurrentUser() {
  localStorage.removeItem("amc_user");
}

async function fetchCurrentUser() {
  try {
    const user = await apiRequest("/auth/me");
    setCurrentUser(user);
    return user;
  } catch (error) {
    removeCurrentUser();
    throw error;
  }
}

async function signupUser() {
  const message = document.getElementById("authMessage");
  message.textContent = "";

  const payload = {
    name: document.getElementById("signupName").value.trim(),
    email: document.getElementById("signupEmail").value.trim(),
    password: document.getElementById("signupPassword").value.trim(),
    branch: document.getElementById("signupBranch").value.trim() || null,
    year: document.getElementById("signupYear").value.trim() || null,
    enrollment_number: document.getElementById("signupEnrollment").value.trim() || null,
    phone: document.getElementById("signupPhone").value.trim() || null,
    address: document.getElementById("signupAddress").value.trim() || null
  };

  if (!payload.name || !payload.email || !payload.password) {
    message.textContent = "Name, email, and password are required.";
    return;
  }

  try {
    await apiRequest("/auth/register", "POST", payload);
    message.textContent = "Account created successfully. Redirecting to login...";
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  } catch (error) {
    message.textContent = error.message || "Signup failed.";
  }
}

async function loginUser() {
  const message = document.getElementById("authMessage");
  message.textContent = "";

  const payload = {
    email: document.getElementById("loginEmail").value.trim(),
    password: document.getElementById("loginPassword").value.trim()
  };

  if (!payload.email || !payload.password) {
    message.textContent = "Email and password are required.";
    return;
  }

  try {
    const result = await apiRequest("/auth/login", "POST", payload);
    setToken(result.access_token);
    await fetchCurrentUser();

    message.textContent = "Login successful. Redirecting...";
    setTimeout(() => {
      window.location.href = "index.html";
    }, 700);
  } catch (error) {
    message.textContent = error.message || "Login failed.";
  }
}

function logoutUser() {
  removeToken();
  removeCurrentUser();
  window.location.href = "login.html";
}