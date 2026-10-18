// Token Management
function setToken(token) {
    localStorage.setItem("token", token);
}

function getToken() {
    return localStorage.getItem("token");
}

function removeToken() {
    localStorage.removeItem("token");
}

// User Session Management
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

// Fetch current user details with error safety
async function fetchCurrentUser() {
    try {
        const user = await apiRequest("/auth/me");
        setCurrentUser(user);
        return user;
    } catch (error) {
        console.error("Session fetch failed:", error);
        removeCurrentUser();
        removeToken();
        throw error;
    }
}

// Login Process with Role-Based Redirection
async function loginUser() {
    const message = document.getElementById("authMessage");
    const btn = document.querySelector("button[onclick='loginUser()']");
    
    message.textContent = "Authenticating...";
    if (btn) btn.disabled = true;

    const payload = {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value.trim()
    };

    if (!payload.email || !payload.password) {
        message.textContent = "Error: Email and password are required.";
        if (btn) btn.disabled = false;
        return;
    }

    try {
        const result = await apiRequest("/auth/login", "POST", payload);
        if (result.access_token) {
            setToken(result.access_token);
            const user = await fetchCurrentUser();
            message.textContent = "Login successful! Redirecting...";
            
            // Check role or is_faculty flag for redirection
            const role = (user.role || "").toLowerCase();
            if (role === "faculty" || role === "teacher" || user.is_faculty === true) {
                window.location.href = "faculty.html";
            } else if (role === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }
        }
    } catch (error) {
        message.style.color = "#f87171";
        message.textContent = error.message || "Invalid credentials. Please try again.";
        if (btn) btn.disabled = false;
    }
}

// Register page load hote hi departments fetch karo
document.addEventListener("DOMContentLoaded", async () => {
    if (document.getElementById("signupDept")) {
        await initSignupFilters();
    }
});

async function initSignupFilters() {
    try {
        const data = await apiRequest("/admin/academic/all-data");
        const deptSelect = document.getElementById("signupDept");
        
        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">Select Department</option>';
            data.departments.forEach(d => {
                deptSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
            });
        }
        window.allBranches = data.branches; // Global store for branch filtering
    } catch (err) {
        console.error("Signup filter sync failed", err);
    }
}

function updateBranchesForSignup() {
    const deptId = document.getElementById("signupDept").value;
    const branchSelect = document.getElementById("signupBranch");
    
    if (branchSelect && window.allBranches) {
        branchSelect.innerHTML = '<option value="">Select Branch</option>';
        const filtered = window.allBranches.filter(b => b.dept_id == deptId);
        
        filtered.forEach(b => {
            branchSelect.innerHTML += `<option value="${b.name}">${b.name}</option>`;
        });
    }
}

function logoutUser() {
    removeToken();
    removeCurrentUser();
    window.location.href = "login.html";
}