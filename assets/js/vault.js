/* ===========================
   CHRONICLE — My Vault JS
   Dynamic countdowns, tab filters, modal inspector
   =========================== */

// Base seed data matching project synopsis & team roles
var defaultSeedCapsules = [
  {
    id: "CHR-2026-001",
    title: "Graduation Day",
    message: "Reflecting on our journey through web technologies, late night coding sessions, and building Chronicle together. Don't forget where it all began!",
    category: "Milestone",
    creator: "Daron John",
    recipient: "Myself",
    recipientMode: "myself",
    // 126 days from current date (as described in project synopsis)
    unlockDate: new Date(Date.now() + 126 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    displayUnlockDate: "14 February 2027",
    dateCreated: "11 October 2026",
    isPublic: true,
    status: "sealed",
    chainCount: 1
  },
  {
    id: "CHR-2026-002",
    title: "Open When You're 30",
    message: "A milestone checkpoint for your future self. Are you still coding? Have you traveled to Japan? Stay true to your principles.",
    category: "Personal",
    creator: "Daron John",
    recipient: "Myself",
    recipientMode: "myself",
    // ~2 years from now (as described in project synopsis)
    unlockDate: "2028-10-11",
    displayUnlockDate: "11 October 2028",
    dateCreated: "01 September 2026",
    isPublic: false,
    status: "sealed",
    chainCount: 1
  },
  {
    id: "CHR-2026-003",
    title: "A Letter to My Future Self",
    message: "Dear Future Me,\n\nIf you're reading this, you've made it. I hope the world is kinder now, and that you've become someone I'd be proud of.\n\nRemember the late nights, the doubts, the small wins that kept you going. None of it was wasted.\n\nKeep creating. Keep caring.\n\n— Past You",
    category: "Friendship",
    creator: "Mounika Shetty",
    recipient: "Daron John",
    recipientMode: "single",
    // Arrived / ready to unlock (today)
    unlockDate: new Date(Date.now() - 3600 * 1000).toISOString().split("T")[0],
    displayUnlockDate: "Today (Ready to Unlock)",
    dateCreated: "15 August 2026",
    isPublic: true,
    status: "ready",
    chainCount: 3
  },
  {
    id: "CHR-2026-004",
    title: "Sprint Retrospective & Secret Project Milestone",
    message: "Great work completing the 10-page Chronicle platform with 2NF MySQL database integration! Cheers to the team.",
    category: "Milestone",
    creator: "Sanjay Patil",
    recipient: "Daron John",
    recipientMode: "single",
    // Unlocks in 2 hours for demonstration countdown
    unlockDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    displayUnlockDate: "Today at 16:30",
    dateCreated: "05 October 2026",
    isPublic: false,
    status: "sealed",
    chainCount: 2
  }
];

// Active State
var allCapsules = [];
var currentTabFilter = "all"; // all | created | received
var activeModalCapsule = null;
var timerInterval = null;

/**
 * Initialize capsule list from localStorage or seed
 */
function initVaultData() {
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getVaultCapsules) {
    allCapsules = ChronicleDB.getVaultCapsules();
  } else {
    try {
      var stored = localStorage.getItem("chronicle_vault_capsules");
      if (stored) {
        var parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allCapsules = parsed;
        } else {
          allCapsules = defaultSeedCapsules.slice();
        }
      } else {
        allCapsules = defaultSeedCapsules.slice();
      }
    } catch (err) {
      allCapsules = defaultSeedCapsules.slice();
    }
  }

  updateMetrics();
  renderCapsules();
  startGlobalCountdownTicker();
}

/**
 * Calculates remaining time breakdown for a given target date
 */
function getTimeRemaining(targetDateStr) {
  var target = new Date(targetDateStr).getTime();
  var now = Date.now();
  var difference = target - now;

  if (isNaN(target) || difference <= 0) {
    return { isReady: true, total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  var seconds = Math.floor((difference / 1000) % 60);
  var minutes = Math.floor((difference / 1000 / 60) % 60);
  var hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  var days = Math.floor(difference / (1000 * 60 * 60 * 24));

  return {
    isReady: false,
    total: difference,
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: seconds
  };
}

/**
 * Formats countdown string cleanly
 */
function formatCountdownString(t) {
  if (t.isReady) {
    return "00d 00h 00m 00s";
  }

  if (t.days > 365) {
    var years = (t.days / 365).toFixed(1);
    return years + " years (" + t.days + " days)";
  }

  var pad = function (num) { return (num < 10 ? "0" : "") + num; };
  return t.days + "d " + pad(t.hours) + "h " + pad(t.minutes) + "m " + pad(t.seconds) + "s";
}

/**
 * Update Header Metrics & Tab Count Badges
 */
function updateMetrics() {
  var sealedCount = 0;
  var readyCount = 0;
  var journeyCount = 0;

  var createdCount = 0;
  var receivedCount = 0;

  allCapsules.forEach(function (c) {
    var timer = getTimeRemaining(c.unlockDate);
    var isActuallyReady = timer.isReady || c.status === "ready";

    if (isActuallyReady) {
      readyCount++;
    } else {
      sealedCount++;
    }

    if (c.chainCount && c.chainCount > 1) {
      journeyCount++;
    }

    var isCreatedByMe = (c.creator === "Daron John" || c.creator === "Myself");
    if (isCreatedByMe) {
      createdCount++;
    } else {
      receivedCount++;
    }
  });

  // Update DOM counts
  var statSealed = document.getElementById("stat-sealed-count");
  var statReady = document.getElementById("stat-ready-count");
  var statJourney = document.getElementById("stat-journey-count");

  if (statSealed) statSealed.textContent = sealedCount;
  if (statReady) statReady.textContent = readyCount;
  if (statJourney) statJourney.textContent = journeyCount;

  var countAll = document.getElementById("count-all");
  var countCreated = document.getElementById("count-created");
  var countReceived = document.getElementById("count-received");

  if (countAll) countAll.textContent = allCapsules.length;
  if (countCreated) countCreated.textContent = createdCount;
  if (countReceived) countReceived.textContent = receivedCount;
}

/**
 * Filter capsules based on active tab, search query, category, and status
 */
function getFilteredCapsules() {
  var searchInput = document.getElementById("vault-search-input");
  var categorySelect = document.getElementById("category-select");
  var statusSelect = document.getElementById("status-select");

  var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
  var selectedCategory = categorySelect ? categorySelect.value : "all";
  var selectedStatus = statusSelect ? statusSelect.value : "all";

  return allCapsules.filter(function (capsule) {
    // 1. Tab Filter
    var isCreatedByMe = (capsule.creator === "Daron John" || capsule.creator === "Myself");
    if (currentTabFilter === "created" && !isCreatedByMe) return false;
    if (currentTabFilter === "received" && isCreatedByMe) return false;

    // 2. Category Filter
    if (selectedCategory !== "all" && capsule.category !== selectedCategory) return false;

    // 3. Status Filter
    var timer = getTimeRemaining(capsule.unlockDate);
    var isReady = timer.isReady || capsule.status === "ready";
    if (selectedStatus === "sealed" && isReady) return false;
    if (selectedStatus === "ready" && !isReady) return false;

    // 4. Search Filter
    if (query) {
      var titleMatch = capsule.title.toLowerCase().includes(query);
      var creatorMatch = capsule.creator.toLowerCase().includes(query);
      var recipientMatch = (capsule.recipient || "").toLowerCase().includes(query);
      if (!titleMatch && !creatorMatch && !recipientMatch) return false;
    }

    return true;
  });
}

/**
 * Render capsules into the DOM
 */
function renderCapsules() {
  var grid = document.getElementById("capsules-grid");
  var emptyState = document.getElementById("empty-state");
  if (!grid) return;

  var filtered = getFilteredCapsules();

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  grid.innerHTML = "";

  filtered.forEach(function (capsule) {
    var timer = getTimeRemaining(capsule.unlockDate);
    var isReady = timer.isReady || capsule.status === "ready";

    var card = document.createElement("article");
    card.className = "capsule-card " + (isReady ? "ready-state" : "sealed-state");
    card.setAttribute("aria-label", "Capsule: " + capsule.title);

    // Status Badge
    var statusBadgeHtml = isReady
      ? '<span class="status-badge ready">🔓 Ready to Unlock</span>'
      : '<span class="status-badge sealed">🔒 Sealed</span>';

    // Countdown / Ready status UI
    var countdownHtml = isReady
      ? '<div class="countdown-box ready-ticker">' +
        '  <span class="countdown-title">Vault Door Status</span>' +
        '  <div class="countdown-digits ready-text">✓ Access Permitted Now</div>' +
        '  <span class="target-date-subtext">Unsealed on ' + escapeHTML(capsule.displayUnlockDate) + '</span>' +
        '</div>'
      : '<div class="countdown-box">' +
        '  <span class="countdown-title">Unlocks In</span>' +
        '  <div class="countdown-digits" data-unlock-date="' + escapeHTML(capsule.unlockDate) + '">' +
             formatCountdownString(timer) +
        '  </div>' +
        '  <span class="target-date-subtext">Target: ' + escapeHTML(capsule.displayUnlockDate) + '</span>' +
        '</div>';

    // Journey link badge
    var journeyBadge = (capsule.chainCount && capsule.chainCount > 1)
      ? '<a href="journey.html" class="journey-link-badge">⛓️ Chain (' + capsule.chainCount + ' hops)</a>'
      : '';

    // Action button
    var actionBtnHtml = isReady
      ? '<button type="button" class="btn btn-primary btn-open-capsule" data-id="' + capsule.id + '">🔓 Unlock & Read →</button>'
      : '<button type="button" class="btn btn-outline btn-inspect-seal" data-id="' + capsule.id + '">Inspect Seal</button>';

    card.innerHTML =
      '<div class="card-top-bar">' +
        statusBadgeHtml +
        '<span class="category-tag">' + escapeHTML(capsule.category) + '</span>' +
      '</div>' +
      '<div class="card-content">' +
        '<h3>' + escapeHTML(capsule.title) + '</h3>' +
        '<p class="card-participants">' +
          '<strong>From:</strong> ' + escapeHTML(capsule.creator) + ' &bull; ' +
          '<strong>To:</strong> ' + escapeHTML(capsule.recipient || "Myself") +
        '</p>' +
      '</div>' +
      countdownHtml +
      '<div class="card-actions">' +
        actionBtnHtml +
        journeyBadge +
      '</div>';

    grid.appendChild(card);
  });

  // Bind Card Action Listeners
  attachCardEvents();
}

/**
 * Attach click handlers for Unlock & Inspect buttons
 */
function attachCardEvents() {
  // Inspect Seal buttons
  var inspectBtns = document.querySelectorAll(".btn-inspect-seal");
  inspectBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = this.getAttribute("data-id");
      openInspectModal(id);
    });
  });

  // Open / Read Capsule buttons
  var openBtns = document.querySelectorAll(".btn-open-capsule");
  openBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = this.getAttribute("data-id");
      navigateToUnlock(id);
    });
  });
}

/**
 * Open Inspect Modal for a sealed capsule
 */
function openInspectModal(id) {
  var cap = allCapsules.find(function (c) { return c.id === id; });
  if (!cap) return;

  activeModalCapsule = cap;
  var modal = document.getElementById("inspect-modal");
  var titleEl = document.getElementById("modal-cap-title");
  var creatorEl = document.getElementById("modal-cap-creator");
  var recEl = document.getElementById("modal-cap-recipient");
  var catEl = document.getElementById("modal-cap-category");
  var sealedDateEl = document.getElementById("modal-cap-date-created");
  var targetDateEl = document.getElementById("modal-cap-target-date");
  var actionWrapper = document.getElementById("modal-action-wrapper");

  if (titleEl) titleEl.textContent = cap.title;
  if (creatorEl) creatorEl.textContent = cap.creator;
  if (recEl) recEl.textContent = cap.recipient || "Myself";
  if (catEl) catEl.textContent = cap.category;
  if (sealedDateEl) sealedDateEl.textContent = cap.dateCreated || "Recorded";
  if (targetDateEl) targetDateEl.textContent = cap.displayUnlockDate;

  var timer = getTimeRemaining(cap.unlockDate);
  var countdownEl = document.getElementById("modal-cap-countdown");
  if (countdownEl) countdownEl.textContent = formatCountdownString(timer);

  if (actionWrapper) {
    if (timer.isReady) {
      actionWrapper.innerHTML = '<button type="button" class="btn btn-primary" id="btn-modal-open">🔓 Unlock Capsule Now</button>';
      var modalOpenBtn = document.getElementById("btn-modal-open");
      if (modalOpenBtn) {
        modalOpenBtn.addEventListener("click", function () {
          navigateToUnlock(cap.id);
        });
      }
    } else {
      actionWrapper.innerHTML = '';
    }
  }

  if (modal) modal.style.display = "flex";
}

/**
 * Close Inspect Modal
 */
function closeInspectModal() {
  activeModalCapsule = null;
  var modal = document.getElementById("inspect-modal");
  if (modal) modal.style.display = "none";
}

/**
 * Directs to Member 3's unlock reader page with capsule context
 */
function navigateToUnlock(id) {
  var cap = allCapsules.find(function (c) { return c.id === id; });
  if (cap) {
    // Cache active capsule for unlock page to pick up seamlessly
    try {
      localStorage.setItem("chronicle_active_capsule", JSON.stringify(cap));
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }
  window.location.href = "unlock.html?id=" + encodeURIComponent(id);
}

/**
 * Global 1-second interval to update countdown displays live
 */
function startGlobalCountdownTicker() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(function () {
    // Update all countdown boxes on the page
    var tickers = document.querySelectorAll(".countdown-digits[data-unlock-date]");
    tickers.forEach(function (el) {
      var dateStr = el.getAttribute("data-unlock-date");
      var t = getTimeRemaining(dateStr);
      if (t.isReady) {
        // Rerender to show ready state badge and button
        renderCapsules();
        updateMetrics();
      } else {
        el.textContent = formatCountdownString(t);
      }
    });

    // Update modal ticker if open
    if (activeModalCapsule) {
      var modalTicker = document.getElementById("modal-cap-countdown");
      if (modalTicker) {
        var mt = getTimeRemaining(activeModalCapsule.unlockDate);
        modalTicker.textContent = formatCountdownString(mt);
      }
    }
  }, 1000);
}

/**
 * Helper to escape HTML characters
 */
function escapeHTML(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Setup Event Listeners
document.addEventListener("DOMContentLoaded", function () {
  initVaultData();

  // Tab filtering
  var tabBtns = document.querySelectorAll(".tab-btn");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabBtns.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-selected", "true");
      currentTabFilter = this.getAttribute("data-filter");
      renderCapsules();
    });
  });

  // Search input filter
  var searchInput = document.getElementById("vault-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderCapsules();
    });
  }

  // Dropdown filters
  var catSelect = document.getElementById("category-select");
  if (catSelect) {
    catSelect.addEventListener("change", function () {
      renderCapsules();
    });
  }

  var statusSelect = document.getElementById("status-select");
  if (statusSelect) {
    statusSelect.addEventListener("change", function () {
      renderCapsules();
    });
  }

  // Modal close handlers
  var closeBtn = document.getElementById("btn-close-modal");
  var dismissBtn = document.getElementById("btn-modal-dismiss");
  var modalOverlay = document.getElementById("inspect-modal");

  if (closeBtn) closeBtn.addEventListener("click", closeInspectModal);
  if (dismissBtn) dismissBtn.addEventListener("click", closeInspectModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeInspectModal();
    });
  }
});
