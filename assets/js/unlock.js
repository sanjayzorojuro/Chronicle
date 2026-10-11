/* ===========================
   CHRONICLE — Unlock Page JS
   Demo data + unlock animation
   =========================== */

// Demo capsule data (simulates backend response)
var demoCapsule = {
  title: "A Letter to My Future Self",
  message:
    "Dear Future Me,\n\nIf you're reading this, you've made it. I hope the world is kinder now, and that you've become someone I'd be proud of.\n\nRemember the late nights, the doubts, the small wins that kept you going. None of it was wasted.\n\nKeep creating. Keep caring.\n\n— Past You",
  creator: "Mounika Shetty",
  category: "Personal",
  dateCreated: "15 August 2026",
  dateOpened: "9 October 2027",
  link: "https://example.com/photo-album",
  linkLabel: "Attached Photo Album"
};

// Check if an active capsule was selected from My Vault
try {
  var storedActive = localStorage.getItem("chronicle_active_capsule");
  if (storedActive) {
    var parsedActive = JSON.parse(storedActive);
    demoCapsule.title = parsedActive.title || demoCapsule.title;
    demoCapsule.message = parsedActive.message || demoCapsule.message;
    demoCapsule.creator = parsedActive.creator || demoCapsule.creator;
    demoCapsule.category = parsedActive.category || demoCapsule.category;
    demoCapsule.dateCreated = parsedActive.dateCreated || demoCapsule.dateCreated;
    demoCapsule.dateOpened = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
} catch (e) {
  console.warn("Storage access failed in unlock.js:", e);
}

/**
 * Runs the 3-step unlock animation sequence:
 * 1. Sealed  (1s)
 * 2. Checking unlock date  (1.5s)
 * 3. Access Granted + reveal content
 */
function runUnlockSequence() {
  var lockIcon = document.getElementById("lock-icon");
  var statusText = document.getElementById("status-text");
  var spinner = document.getElementById("spinner");
  var capsuleContent = document.getElementById("capsule-content");
  var liveRegion = document.getElementById("live-region");

  // Check for reduced motion preference
  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    // Skip animation entirely
    lockIcon.textContent = "🔓";
    lockIcon.classList.add("unlocked");
    statusText.textContent = "✓ Access Granted";
    statusText.classList.add("granted");
    liveRegion.textContent = "Capsule unlocked. Content is now visible.";
    renderCapsule();
    capsuleContent.classList.add("visible");
    return;
  }

  // Step 1: Sealed (already shown in HTML)
  liveRegion.textContent = "Capsule is sealed.";

  // Step 2: Checking
  setTimeout(function () {
    statusText.textContent = "Checking unlock date…";
    spinner.classList.add("active");
    liveRegion.textContent = "Checking unlock date.";
  }, 1000);

  // Step 3: Unlocked
  setTimeout(function () {
    spinner.classList.remove("active");
    lockIcon.textContent = "🔓";
    lockIcon.classList.add("unlocked");
    statusText.textContent = "✓ Access Granted";
    statusText.classList.add("granted");
    liveRegion.textContent = "Capsule unlocked. Content is now visible.";

    renderCapsule();

    // Fade in content
    setTimeout(function () {
      capsuleContent.classList.add("visible");
    }, 100);
  }, 2500);
}

/**
 * Renders the capsule data into the DOM.
 */
function renderCapsule() {
  document.getElementById("cap-title").textContent = demoCapsule.title;

  // Convert newlines to <br> for the message
  document.getElementById("cap-message").innerHTML = demoCapsule.message.replace(
    /\n/g,
    "<br>"
  );

  document.getElementById("cap-creator").textContent = demoCapsule.creator;
  document.getElementById("cap-category").textContent = demoCapsule.category;
  document.getElementById("cap-date-created").textContent =
    demoCapsule.dateCreated;
  document.getElementById("cap-date-opened").textContent =
    demoCapsule.dateOpened;

  if (demoCapsule.link) {
    var linkEl = document.getElementById("cap-link");
    linkEl.href = demoCapsule.link;
    linkEl.textContent = demoCapsule.linkLabel || "View Attachment";
    document.getElementById("cap-attachment").style.display = "block";
  }
}

// Run on page load
document.addEventListener("DOMContentLoaded", function () {
  runUnlockSequence();
});
