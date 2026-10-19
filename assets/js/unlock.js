/* ==========================================================
   CHRONICLE — Unlock Page JS
   Unlock animation sequence + Built-in Photo Album Modal
   ========================================================== */

// Demo capsule data (simulates backend response)
var demoCapsule = {
  title: "A Letter to My Future Self",
  message:
    "Dear Future Me,\n\nIf you're reading this, you've made it. I hope the world is kinder now, and that you've become someone I'd be proud of.\n\nRemember the late nights, the doubts, the small wins that kept you going. None of it was wasted.\n\nKeep creating. Keep caring.\n\n— Past You",
  creator: "Mounika Shetty",
  category: "Personal",
  dateCreated: "15 August 2026",
  dateOpened: "9 October 2027",
  link: null,
  media_url: null,
  linkLabel: "Attached Photo Album"
};

// Resolve capsule: prefer ?id= URL param → localStorage fallback → demo defaults
try {
  // 1. Try reading capsule ID from ?id= query parameter (supports direct links and page refreshes)
  var urlParams = new URLSearchParams(window.location.search);
  var urlCapsuleId = urlParams.get("id");

  var parsedActive = null;

  if (urlCapsuleId && typeof ChronicleDB !== "undefined" && ChronicleDB.getCapsuleById) {
    // Look up the capsule directly from the database using the URL id
    var dbCapsule = ChronicleDB.getCapsuleById(urlCapsuleId);
    if (dbCapsule) {
      parsedActive = {
        id: dbCapsule.capsule_id,
        capsule_id: dbCapsule.capsule_id,
        title: dbCapsule.title,
        message: dbCapsule.message,
        creator: dbCapsule.creator_name,
        category: dbCapsule.category,
        created_at: dbCapsule.created_at,
        media_url: dbCapsule.media_url || null,
        link: null
      };
    }
  }

  // 2. Fall back to localStorage (set by vault navigateToUnlock)
  if (!parsedActive) {
    var storedActive = localStorage.getItem("chronicle_active_capsule");
    if (storedActive) {
      parsedActive = JSON.parse(storedActive);
    }
  }

  if (parsedActive) {
    demoCapsule.title = parsedActive.title || demoCapsule.title;
    demoCapsule.message = parsedActive.message || demoCapsule.message;
    demoCapsule.creator = parsedActive.creator || parsedActive.creator_name || demoCapsule.creator;
    demoCapsule.category = parsedActive.category || demoCapsule.category;
    demoCapsule.dateCreated = parsedActive.dateCreated || parsedActive.created_at || demoCapsule.dateCreated;
    demoCapsule.dateOpened = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    demoCapsule.id = parsedActive.id || parsedActive.capsule_id || demoCapsule.id || null;
    demoCapsule.media_url = parsedActive.media_url || parsedActive.image || null;
    demoCapsule.link = parsedActive.link || null;
  }
} catch (e) {
  console.warn("Storage access warning in unlock.js:", e);
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

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    lockIcon.textContent = "🔓";
    lockIcon.classList.add("unlocked");
    statusText.textContent = "✓ Access Granted";
    statusText.classList.add("granted");
    if (liveRegion) liveRegion.textContent = "Capsule unlocked. Content is now visible.";
    renderCapsule();
    capsuleContent.classList.add("visible");
    return;
  }

  // Step 1: Sealed
  if (liveRegion) liveRegion.textContent = "Capsule is sealed.";

  // Step 2: Checking
  setTimeout(function () {
    statusText.textContent = "Checking unlock date…";
    spinner.classList.add("active");
    if (liveRegion) liveRegion.textContent = "Checking unlock date.";
  }, 1000);

  // Step 3: Unlocked
  setTimeout(function () {
    spinner.classList.remove("active");
    lockIcon.textContent = "🔓";
    lockIcon.classList.add("unlocked");
    statusText.textContent = "✓ Access Granted";
    statusText.classList.add("granted");
    if (liveRegion) liveRegion.textContent = "Capsule unlocked. Content is now visible.";

    renderCapsule();

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

  // Convert newlines to <br>
  document.getElementById("cap-message").innerHTML = demoCapsule.message.replace(/\n/g, "<br>");

  document.getElementById("cap-creator").textContent = demoCapsule.creator;
  document.getElementById("cap-category").textContent = demoCapsule.category;
  document.getElementById("cap-date-created").textContent = demoCapsule.dateCreated;
  document.getElementById("cap-date-opened").textContent = demoCapsule.dateOpened;

  // Mark capsule as officially unlocked in ChronicleDB and localStorage
  if (demoCapsule.id && typeof ChronicleDB !== "undefined" && ChronicleDB.unlockCapsule) {
    ChronicleDB.unlockCapsule(demoCapsule.id);
  }
  try {
    var vaultCaps = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
    vaultCaps.forEach(function (c) {
      if (c.id === demoCapsule.id) {
        c.status = "unlocked";
      }
    });
    localStorage.setItem("chronicle_vault_capsules", JSON.stringify(vaultCaps));
  } catch (e) {}

  // Update verified email notification dispatch notice
  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  var userEmail = (activeUser && activeUser.email) ? activeUser.email : (demoCapsule.recipientEmail || "your registered email");
  var emailBox = document.getElementById("email-dispatch-notice");
  var emailEl = document.getElementById("dispatch-recipient-email");
  if (emailEl) emailEl.textContent = userEmail;
  if (emailBox) emailBox.style.display = "flex";

  // Link Continue Journey button with capsule context
  var journeyBtn = document.querySelector(".capsule-actions a[href*='journey.html']");
  if (journeyBtn && demoCapsule.id) {
    journeyBtn.href = "journey.html?id=" + encodeURIComponent(demoCapsule.id);
    journeyBtn.onclick = function () {
      try {
        localStorage.setItem("chronicle_active_journey_capsule", JSON.stringify(demoCapsule));
      } catch (e) {}
    };
  }

  // Show/hide photo album attachment based on media_url
  var attachmentEl = document.getElementById("cap-attachment");
  if (attachmentEl) {
    attachmentEl.style.display = demoCapsule.media_url ? "block" : "none";
  }

  setupPhotoAlbumModal();
}

/**
 * Sets up the interactive Photo Album Modal
 */
function setupPhotoAlbumModal() {
  var openBtn = document.getElementById("btn-open-album");
  var closeBtn = document.getElementById("btn-close-album");
  var dismissBtn = document.getElementById("btn-dismiss-album");
  var modal = document.getElementById("album-modal");
  var authorEl = document.getElementById("album-author");
  var gallery = document.getElementById("album-gallery");

  if (authorEl) {
    authorEl.textContent = demoCapsule.creator;
  }

  function openAlbum() {
    renderAlbumPhotos();
    if (modal) modal.style.display = "flex";
  }

  function closeAlbum() {
    if (modal) modal.style.display = "none";
  }

  if (openBtn) openBtn.onclick = openAlbum;
  if (closeBtn) closeBtn.onclick = closeAlbum;
  if (dismissBtn) dismissBtn.onclick = closeAlbum;

  // Close when clicking backdrop
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeAlbum();
    });
  }

  // Close with Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeAlbum();
    }
  });
}

/**
 * Renders polaroids into the album gallery
 */
function renderAlbumPhotos() {
  var gallery = document.getElementById("album-gallery");
  if (!gallery) return;

  gallery.innerHTML = "";

  // 1. If user uploaded a custom photo during Studio creation
  if (demoCapsule.media_url) {
    var userPolaroid = document.createElement("div");
    userPolaroid.className = "polaroid-card";
    userPolaroid.innerHTML =
      '<div class="polaroid-img-wrapper">' +
      '  <img src="' + demoCapsule.media_url + '" alt="Sealed capsule memory" />' +
      '</div>' +
      '<div class="polaroid-caption">Your Attached Memory</div>' +
      '<div class="polaroid-date">Sealed on ' + demoCapsule.dateCreated + '</div>';
    gallery.appendChild(userPolaroid);
  }

  // 2. Curated nostalgic milestone polaroids
  var polaroidMemories = [
    {
      title: "Graduation & Late Night Sprints",
      caption: "The evening we finished our final project prototype together.",
      date: "15 August 2026",
      accent: "#e8600a",
      icon: "🎓"
    },
    {
      title: "Campus Coffee Landmark",
      caption: "Planning our dreams and what we wanted to achieve by 2028.",
      date: "28 August 2026",
      accent: "#2b7a78",
      icon: "☕"
    },
    {
      title: "Sealing Day Celebration",
      caption: "Moments worth keeping forever in our Chronicle vault.",
      date: "09 October 2026",
      accent: "#3a6073",
      icon: "🔒"
    }
  ];

  polaroidMemories.forEach(function (p) {
    var card = document.createElement("div");
    card.className = "polaroid-card";
    card.innerHTML =
      '<div class="polaroid-img-wrapper" style="background: linear-gradient(135deg, ' + p.accent + '22, ' + p.accent + '44);">' +
      '  <div style="font-size: 3.5rem;" aria-hidden="true">' + p.icon + '</div>' +
      '</div>' +
      '<div class="polaroid-caption">' + p.title + '</div>' +
      '<p style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 0.25rem;">' + p.caption + '</p>' +
      '<div class="polaroid-date">' + p.date + '</div>';
    gallery.appendChild(card);
  });
}

// Run on page load
document.addEventListener("DOMContentLoaded", function () {
  runUnlockSequence();
});
