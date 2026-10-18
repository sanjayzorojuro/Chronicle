/* ===========================
   CHRONICLE — Common JS
   Shared utilities
   =========================== */

/**
 * Show a toast notification.
 * @param {string} message - Text to display
 * @param {string} type - 'success' or 'info'
 * @param {number} duration - How long to show (ms)
 */
function showToast(message, type, duration) {
  type = type || "success";
  duration = duration || 3000;

  var toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = "toast " + type;

  // Small delay so the browser registers the class change for transition
  setTimeout(function () {
    toast.classList.add("visible");
  }, 10);

  setTimeout(function () {
    toast.classList.remove("visible");
  }, duration);
}

/**
 * Globally available mobile navigation toggle function
 */
function toggleMobileNav(e) {
  if (e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
  }
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (!nav) return;

  var isOpen = nav.classList.toggle("is-open");
  if (toggle) {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.textContent = isOpen ? "✕" : "☰";
  }
}
window.toggleMobileNav = toggleMobileNav;

/**
 * Initialize accessible mobile navigation drawer
 */
function initMobileNav() {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (!nav) return;

  if (toggle) {
    toggle.onclick = function (e) {
      toggleMobileNav(e);
    };
  }

  // Close when clicking any nav link
  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      nav.classList.remove("is-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰";
      }
    });
  });

  // Close when clicking outside
  document.addEventListener("click", function (e) {
    if (toggle && nav && !nav.contains(e.target) && !toggle.contains(e.target) && nav.classList.contains("is-open")) {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "☰";
    }
  });
}

// Delegated click handler so clicking .nav-toggle works even before or without manual binding
document.addEventListener("click", function (e) {
  var toggleBtn = e.target && e.target.closest && e.target.closest(".nav-toggle");
  if (toggleBtn) {
    toggleMobileNav(e);
  }
});

/**
 * Synchronize the shared 8-page navigation bar across all pages:
 * 1. My Vault (vault.html)
 * 2. Create Capsule (create.html)
 * 3. Discover (discover.html)
 * 4. Time Wall (wall.html)
 * 5. Journey (journey.html)
 * 6. Profile (profile.html)
 * 7. Register (register.html)
 * 8. Sign Out (when logged in) / Sign In (when logged out)
 */
/**
 * Synchronize navigation bar:
 * - When not logged in (on login/register/index): ONLY 2 pages appear: Sign In and Register.
 * - After login: ALL 8 pages appear: My Vault, Create Capsule, Discover, Time Wall, Journey, Profile, Register, Sign Out.
 */
function syncNavigation() {
  var nav = document.getElementById("primary-nav");
  if (!nav) return;

  var user = getActiveUser();
  var currentPath = window.location.pathname.replace(/\\/g, "/");
  var pageName = currentPath.substring(currentPath.lastIndexOf("/") + 1).toLowerCase() || "index.html";
  if (pageName === "index.html" || pageName === "") pageName = "login.html";

  // While on login/index or when logged out: ONLY those 2 pages are shown
  if (!user) {
    var authLinks = [
      { href: "login.html", label: "Sign In" },
      { href: "register.html", label: "Register" }
    ];

    var authHtml = "";
    authLinks.forEach(function (item) {
      var isCurrent = (pageName === item.href);
      var classAttr = isCurrent ? ' class="active"' : '';
      var currentAttr = isCurrent ? ' aria-current="page"' : '';
      authHtml += '<a href="' + item.href + '"' + classAttr + currentAttr + '>' + item.label + '</a>';
    });

    nav.innerHTML = authHtml;
    return;
  }

  // After login: authenticated application pages in required sequence:
  // Discover -> Create Capsule -> My Vault -> Journey -> Unlock -> Profile
  var links = [
    { href: "discover.html", label: "Discover" },
    { href: "create.html", label: "Create Capsule" },
    { href: "vault.html", label: "My Vault" },
    { href: "journey.html", label: "Journey" },
    { href: "unlock.html", label: "Unlock" },
    { href: "profile.html", label: "Profile" }
  ];

  var html = "";
  links.forEach(function (item) {
    var isCurrent = (pageName === item.href) ||
                    (pageName === "seal.html" && item.href === "create.html");

    var classNames = [];
    if (isCurrent) classNames.push("active");
    if (item.className) classNames.push(item.className);

    var classAttr = classNames.length ? ' class="' + classNames.join(" ") + '"' : "";
    var currentAttr = isCurrent ? ' aria-current="page"' : "";
    var clickAttr = item.onClick ? ' onclick="' + item.onClick + '"' : "";

    html += '<a href="' + item.href + '"' + classAttr + currentAttr + clickAttr + '>' + item.label + '</a>';
  });

  nav.innerHTML = html;

  // Ensure site logo links to Discover when logged in
  var logo = document.querySelector(".site-logo");
  if (logo) {
    logo.setAttribute("href", "discover.html");
  }
}
window.syncNavigation = syncNavigation;

function setupNavigation() {
  syncNavigation();
  initMobileNav();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupNavigation);
} else {
  setupNavigation();
}

/**
 * Get the currently logged-in user from localStorage
 * @returns {object|null} The active user object or null
 */
function getActiveUser() {
  try {
    var stored = localStorage.getItem("chronicle_active_user");
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return null;
}
window.getActiveUser = getActiveUser;

/**
 * Auth guard: redirect to login if no active user session exists.
 * Call this on pages that require authentication.
 */
function requireAuth() {
  var user = getActiveUser();
  if (!user) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}
window.requireAuth = requireAuth;

/**
 * Sign out: prompts for confirmation before clearing active user session and redirecting to login
 */
function signOut(e) {
  if (e && e.preventDefault) e.preventDefault();
  var confirmed = window.confirm("Are you sure you want to sign out of Chronicle?");
  if (!confirmed) return false;

  try {
    localStorage.removeItem("chronicle_active_user");
  } catch (ex) {}
  window.location.href = "login.html";
  return true;
}
window.signOut = signOut;

