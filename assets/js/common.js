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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileNav);
} else {
  initMobileNav();
}

