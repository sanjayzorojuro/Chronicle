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
