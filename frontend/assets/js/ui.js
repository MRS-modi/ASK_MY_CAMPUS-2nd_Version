async function loadComponent(targetId, filePath) {
    const target = document.getElementById(targetId);
    
    if (!target) {
        console.warn(`Component target #${targetId} nahi mila.`);
        return;
    }
    
    try {
        // Safe check: Agar filePath direct "/" se start ho raha hai aur network error aaye
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const html = await response.text();
        
        if (target.innerHTML.trim() !== html.trim()) {
            target.innerHTML = html;
        }
    } catch (error) {
        console.error(`Failed to load component from: ${filePath}`, error);
        
        // 🔄 AUTOMATIC FALLBACK: Agar dynamic absolute url block ho, toh relative direct call karo
        if (filePath.startsWith('http')) {
            const relativePath = '/' + filePath.split('/').slice(3).join('/');
            console.log(`Trying fallback relative path: ${relativePath}`);
            try {
                const retryResponse = await fetch(relativePath);
                if (retryResponse.ok) {
                    target.innerHTML = await retryResponse.text();
                }
            } catch (retryErr) {
                console.error("Fallback route also failed:", retryErr);
            }
        }
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

// 👤 👑 NAVBAR USER ENGINE (Updated for multi-tab stability)
function applyNavbarUser() {
  const profileName = document.getElementById("profileName");
  const profileAvatar = document.getElementById("profileAvatar");

  // Agar baki tabs par abhi tak elements DOM mein render nahi hue hain, toh thoda wait karke re-try karega
  if (!profileName && !profileAvatar) {
    console.log("Navbar profile elements not found yet, retrying setup...");
    return;
  }

  const raw = localStorage.getItem("amc_user");
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    
    if (profileName) {
      profileName.textContent = user.name || "Profile";
      profileName.style.cursor = "pointer";
      profileName.style.textDecoration = "none"; 
      profileName.style.transition = "color 0.2s ease";
      
      // Duplicate event listeners prevent karne ke liye pehle remove karo (Best Practice)
      profileName.onclick = null; 
      
      profileName.addEventListener("mouseenter", () => { profileName.style.color = "var(--accent-color, #a78bfa)"; });
      profileName.addEventListener("mouseleave", () => { profileName.style.color = "#fff"; });
      
      profileName.addEventListener("click", (e) => {
        e.preventDefault();
        openMyPersonalProfileModal();
      });
    }
    
    if (profileAvatar) {
      const initial = user.name ? user.name.charAt(0).toUpperCase() : "U";
      profileAvatar.textContent = initial;
      profileAvatar.style.cursor = "pointer";
      
      profileAvatar.onclick = null;
      
      profileAvatar.addEventListener("click", (e) => {
        e.preventDefault();
        openMyPersonalProfileModal();
      });
    }
    console.log("👤 Profile modal triggers tightly attached to navbar.");
  } catch (error) {
    console.error("Failed to parse user info", error);
  }
}

// 👤 🚀 MY DYNAMIC PERSONAL PROFILE MODAL LOOKUP ENGINE
async function openMyPersonalProfileModal() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const myProfile = await apiRequest("/auth/me");

    const branchName = myProfile.branch || "Computer Science & Business Systems";
    const academicYear = myProfile.year || "N/A";
    const repPoints = myProfile.reputation_points ?? 0;

    Swal.fire({
      title: `👤 My Campus Profile`,
      html: `
        <div style="text-align: left; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.8; color: #cbd5e1; padding: 5px 0;">
          <p style="margin: 6px 0; border-bottom: 1px solid #334155; padding-bottom:6px;"><strong>Name:</strong> <span style="color:#fff; font-weight:600;">${myProfile.name}</span></p>
          <p style="margin: 6px 0;"><strong>User ID (UID):</strong> <span style="color:#a78bfa; font-weight:700;">#${myProfile.id}</span></p>
          <p style="margin: 6px 0;"><strong>Email Address:</strong> <span style="color:#fff;">${myProfile.email}</span></p>
          <p style="margin: 6px 0;"><strong>Account Role:</strong> <span style="text-transform: uppercase; padding: 2px 6px; border-radius:4px; font-size:11px; font-weight:800; background:#34d39925; color:#34d399;">${myProfile.role}</span></p>
          <p style="margin: 6px 0;"><strong>Branch Stream:</strong> ${branchName}</p>
          <p style="margin: 6px 0;"><strong>Current Year:</strong> ${academicYear}</p>
          <p style="margin: 6px 0; margin-top:10px; padding-top:6px; border-top: 1px solid #334155;"><strong>Contribution Score:</strong> <span style="color:#eab308; font-weight:700;">✨ ${repPoints} Reputation Points</span></p>
        </div>
      `,
      background: '#1e293b',
      color: '#fff',
      confirmButtonColor: '#a78bfa',
      confirmButtonText: 'Close Profile'
    });

  } catch (err) {
    console.error(err);
  }
}

function disableBackButton() {
    window.history.pushState(null, "", window.location.href);
    window.onpopstate = function () {
        window.history.pushState(null, "", window.location.href);
    };
}

function attachNavbarActions() {
  // Laptop/Navbar Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("amc_user");
      window.location.href = "login.html";
    });
  }

  // Mobile/Sidebar Logout
  const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
  if (mobileLogoutBtn) {
    mobileLogoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("amc_user");
      window.location.href = "login.html";
    });
  }
}

function applyRoleVisibility() {
  const raw = localStorage.getItem("amc_user");
  if (!raw) return;

  try {
    const user = JSON.parse(raw);
    const role = (user.role || "").toLowerCase().trim();
    const allLinks = document.querySelectorAll(".sidebar-link");

    allLinks.forEach(link => {
      const linkText = link.textContent.toLowerCase().trim();
      const linkHref = (link.getAttribute("href") || "").toLowerCase();
      let shouldRemove = false;

      // 👑 1. MASTER ADMIN RESTRICTIONS
      if (role === "admin") {
        // 🚀 FIXED: 'faculty dashboard' aur 'faculty.html' ko forbidden list se hata diya taaki Admin ko dikhe
        const forbiddenKeywords = ["ask question", "my questions", "saved questions", "official inquiry", "my inquiries"];
        shouldRemove = forbiddenKeywords.some(keyword => linkText.includes(keyword) || linkHref.includes(keyword.replace(" ", "-")));
      }
      
      // 🎓 2. FACULTY / TEACHER RESTRICTIONS
      else if (role === "teacher") {
        const forbiddenKeywords = ["admin panel", "official inquiry", "my inquiries"];
        shouldRemove = forbiddenKeywords.some(keyword => linkText.includes(keyword) || linkHref.includes(keyword.replace(" ", "-")) || linkHref.includes("admin.html"));
      }
      
      // 👤 3. STANDARD STUDENT RESTRICTIONS
      else {
        const forbiddenKeywords = ["admin panel", "faculty dashboard"];
        shouldRemove = forbiddenKeywords.some(keyword => linkText.includes(keyword) || linkHref.includes(keyword.replace(" ", "-")) || linkHref.includes("admin.html") || linkHref.includes("faculty.html"));
      }

      // ✂️ REMOVAL LAYER: Safe node execution channel without reduction
      if (shouldRemove) {
        const parentWrapper = link.parentElement;
        if (parentWrapper && (parentWrapper.tagName === 'LI' || parentWrapper.classList.contains('sidebar-item'))) {
          parentWrapper.remove();
        } else {
          link.remove();
        }
      }
    });

  } catch (error) { 
    console.error("Role visibility pipeline propagation error:", error); 
  }
}

// ⏱️ 🚫 ✅ NEW: INACTIVITY AUTO-LOGOUT GUARD ENGINE (Session Security Guardian)
function initializeAutoLogoutGuard() {
  const token = localStorage.getItem("token");
  if (!token) return; // User pehle se hi logged out h, skip tracker

  let inactivityTimeout;
  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 Minutes (Miliseconds format me)

  function resetSessionTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(executeSecureAutoLogout, INACTIVITY_LIMIT);
  }

  async function executeSecureAutoLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("amc_user");
    
    // Popup standard professional alert trigger message before page redirection
    if (typeof Swal !== "undefined" && Swal.fire) {
      await Swal.fire({
        title: 'Session Expired',
        text: 'Bhai, tum kaafi der se inactive the. Security ke liye auto-logout kiya gaya h.',
        icon: 'info',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#a78bfa'
      });
    }
    window.location.href = "login.html";
  }

  // Activity listeners array setup matrix mapping
  window.onload = resetSessionTimer;
  window.onmousemove = resetSessionTimer;
  window.onmousedown = resetSessionTimer; 
  window.ontouchstart = resetSessionTimer;
  window.onclick = resetSessionTimer;
  window.onkeydown = resetSessionTimer;
  
  console.log("🔒 Security Core: Auto-Logout tracker armed securely.");
}

function checkAuthGuard() {
    const token = localStorage.getItem("token");
    const currentPage = window.location.pathname.split("/").pop();

    if (!token && currentPage !== "login.html" && currentPage !== "signup.html") {
        // Data fetch hone hi mat do!
        window.location.replace("login.html"); 
        return false; // Stop further execution
    }
    return true;
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebar = document.querySelector(".sidebar");
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("open");
        });
    }
}

// Global click event to close sidebar when clicking outside
document.addEventListener('click', (e) => {
  const sidebar = document.querySelector(".sidebar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  
  if (sidebar && sidebar.classList.contains('open') && 
      !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
    sidebar.classList.remove('open');
  }
});

// ui.js mein is function ko replace karo (Bina kisi logic ko reduce kiye)
async function loadBaseLayout() {
    // Sabse safe: window.location.origin ka use karo jo automatically port 5500 (frontend) 
    // ya ngrok domain ko default base URL bana deta hai.
    const currentOrigin = window.location.origin;

    const sidebarMount = document.getElementById("sidebarMount");
    const navbarMount = document.getElementById("navbarMount");

    if (sidebarMount && navbarMount) {
        // 🚀 DOUBLE-STRETCH ROUTING: Frontend port aur FastAPI mount patterns dono ko fallback support
        // Pehle direct relative files check karega jo frontend layout par safe hain
        await Promise.all([
            loadComponent("sidebarMount", `${currentOrigin}/components/sidebar.html`), 
            loadComponent("navbarMount", `${currentOrigin}/components/navbar.html`)
        ]);
        
        const appShell = document.querySelector('.app-shell');
        if (appShell) appShell.classList.add('loaded');
        
        // 🚀 CRITICAL EXECUTION: Component mount hone ke turant baad call lagao
        setupMobileMenu();
        applyActiveSidebarLink();
        applyNavbarUser(); // <--- Yeh line zaroor check karna yahan par ho
        attachNavbarActions();
        applyRoleVisibility();
        initializeAutoLogoutGuard();
        
        if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    }
}

async function updateNotificationBadge() {
    const badge = document.getElementById("notificationCountBadge");
    // Agar navbar load nahi hua hai ya badge nahi mila, toh silent return karo
    if (!badge) return; 

    try {
        const notifications = await apiRequest("/notifications");
        const unreadCount = Array.isArray(notifications) 
            ? notifications.filter(n => !n.is_read).length 
            : 0;

        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    } catch (err) {
        console.warn("Notification badge update skipped:", err);
    }
}

