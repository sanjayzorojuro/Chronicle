/* ===========================
   CHRONICLE — Journey Page JS
   Dynamic timeline linked to active capsule + forwarding to available users
   =========================== */

var currentCapsule = null;
var unlockedCapsules = [];
var registeredUsersList = [];

/**
 * Basic HTML escaping to prevent XSS.
 */
function escapeHTML(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Helper: check if a capsule is unlocked
 */
function isCapsuleUnlocked(c) {
  return c.status === "unlocked" ||
         c.status === "ready" ||
         (c.unlockDate && new Date(c.unlockDate).getTime() <= Date.now());
}

/**
 * Initialize Journey page:
 * 1. Load ONLY unlocked capsules (sealed/locked capsules are excluded)
 * 2. Render unlocked capsule cards
 * 3. Render journey timeline (names only, no messages)
 * 4. Populate recipient dropdown with available users on the site
 */
function initJourneyPage() {
  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  if (!activeUser) {
    window.location.replace("login.html");
    return;
  }

  // Load all capsules belonging to this user from ChronicleDB
  var allCapsules = [];
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getVaultCapsules) {
    allCapsules = ChronicleDB.getVaultCapsules(activeUser) || [];
  }

  // Also merge any capsules from localStorage if not already present
  try {
    var storedVault = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
    storedVault.forEach(function (svc) {
      var exists = allCapsules.some(function (c) { return c.id === svc.id; });
      if (!exists) {
        allCapsules.push(svc);
      }
    });
  } catch (e) {}

  // ONLY unlocked capsules are available on the journey page
  unlockedCapsules = allCapsules.filter(isCapsuleUnlocked);

  // Determine active capsule to display (must be unlocked)
  var targetId = new URLSearchParams(window.location.search).get("id");
  if (targetId) {
    currentCapsule = unlockedCapsules.find(function (c) { return c.id === targetId; });
    if (!currentCapsule && typeof ChronicleDB !== "undefined" && ChronicleDB.getCapsuleById) {
      var direct = ChronicleDB.getCapsuleById(targetId);
      if (direct) {
        var mapped = {
          id: direct.capsule_id,
          title: direct.title,
          category: direct.category,
          creator: direct.creator_name,
          dateCreated: new Date(direct.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          message: direct.message,
          chainCount: direct.chain_count || 1,
          status: direct.status || "sealed"
        };
        // Only allow if it's actually unlocked
        if (isCapsuleUnlocked(mapped)) {
          currentCapsule = mapped;
        }
      }
    }
  }

  // Fallback: prefer the first unlocked capsule
  if (!currentCapsule && unlockedCapsules.length > 0) {
    currentCapsule = unlockedCapsules[0];
  }

  // Fallback to cached active capsule in localStorage (only if unlocked)
  if (!currentCapsule) {
    try {
      var stored = localStorage.getItem("chronicle_active_journey_capsule") || localStorage.getItem("chronicle_active_capsule");
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.id && isCapsuleUnlocked(parsed)) {
          currentCapsule = parsed;
        }
      }
    } catch (e) {}
  }

  renderTopUnlockedCapsules();
  renderCapsuleHeader();
  renderTimeline();
  setupRecipientSelect();

  // Announce page ready to screen readers via live region
  var liveRegion = document.getElementById("live-region");
  if (liveRegion) {
    liveRegion.textContent = "Journey page loaded. " + unlockedCapsules.length + " unlocked capsule" + (unlockedCapsules.length !== 1 ? "s" : "") + " available.";
  }
}

/**
 * Render all unlocked capsules prominently at the top of the Journey page
 */
function renderTopUnlockedCapsules() {
  var grid = document.getElementById("unlocked-capsules-grid");
  var emptyBox = document.getElementById("unlocked-capsules-empty");
  var countBadge = document.getElementById("unlocked-count-badge");
  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = unlockedCapsules.length + (unlockedCapsules.length === 1 ? " Capsule Unlocked" : " Capsules Unlocked");
  }

  if (unlockedCapsules.length === 0) {
    grid.style.display = "none";
    if (emptyBox) emptyBox.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  if (emptyBox) emptyBox.style.display = "none";
  grid.innerHTML = "";

  unlockedCapsules.forEach(function (cap) {
    var isCurrent = currentCapsule && currentCapsule.id === cap.id;
    var card = document.createElement("div");
    card.className = "unlocked-card" + (isCurrent ? " is-active-capsule" : "");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Select " + cap.title + " to pass forward");

    var snippet = cap.message ? cap.message.replace(/\n/g, " ") : "No message preserved";
    if (snippet.length > 85) snippet = snippet.slice(0, 85) + "…";

    card.innerHTML =
      '<div class="unlocked-card-top">' +
      '  <span class="unlocked-tag">' + escapeHTML(cap.category || "Memory") + '</span>' +
      '  <span class="unlocked-status-badge"><span aria-hidden="true">🔓</span> Unlocked</span>' +
      '</div>' +
      '<div class="unlocked-card-title">' + escapeHTML(cap.title) + '</div>' +
      '<div class="unlocked-card-meta">From <strong>' + escapeHTML(cap.creator || "Author") + '</strong> • <span aria-hidden="true">#</span>' + escapeHTML(cap.id) + '</div>' +
      '<div class="unlocked-card-excerpt">"' + escapeHTML(snippet) + '"</div>' +
      '<div class="unlocked-card-footer">' +
      '  <span class="unlocked-chain-badge"><span aria-hidden="true">⛓️</span> ' + ((cap.chainCount && cap.chainCount > 1) ? cap.chainCount + ' hops' : '1 hop (Root)') + '</span>' +
      '  ' + (isCurrent
             ? '<span class="btn btn-primary" aria-hidden="true" style="font-size:0.75rem;padding:0.35rem 0.75rem;cursor:default;">✓ Selected</span>'
             : '<span class="btn btn-outline" aria-hidden="true" style="font-size:0.75rem;padding:0.35rem 0.75rem;">Pass Forward →</span>'
           ) +
      '</div>';

    card.addEventListener("click", function () {
      selectCapsuleForJourney(cap.id, true);
    });

    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectCapsuleForJourney(cap.id, true);
      }
    });

    grid.appendChild(card);
  });
}

/**
 * Select a capsule to be viewed and forwarded in the journey
 * Only unlocked capsules can be selected
 */
function selectCapsuleForJourney(capsuleId, shouldScroll) {
  var found = unlockedCapsules.find(function (c) { return c.id === capsuleId; });
  if (found) {
    currentCapsule = found;
    try {
      localStorage.setItem("chronicle_active_journey_capsule", JSON.stringify(found));
    } catch (e) {}

    renderCapsuleHeader();
    renderTimeline();
    renderTopUnlockedCapsules();

    if (shouldScroll) {
      var contSec = document.querySelector(".continue-section");
      if (contSec) {
        contSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
}

/**
 * Render the active capsule information in the forward indicator
 */
function renderCapsuleHeader() {
  var continueSection = document.querySelector(".continue-section");
  var forwardName = document.getElementById("forward-cap-name");
  var forwardDetails = document.getElementById("forward-cap-details");
  var submitBtn = document.getElementById("btn-submit-journey");

  if (!currentCapsule) {
    if (continueSection) continueSection.style.display = "none";
    return;
  }

  if (continueSection) continueSection.style.display = "block";

  // Update Forward Target Indicator
  if (forwardName) {
    forwardName.textContent = '"' + currentCapsule.title + '" (' + currentCapsule.id + ')';
  }
  if (forwardDetails) {
    forwardDetails.innerHTML =
      'Category: <strong>' + escapeHTML(currentCapsule.category || "Personal") + '</strong> &bull; ' +
      'Originator: <strong>' + escapeHTML(currentCapsule.creator || "You") + '</strong> &bull; ' +
      'Unlock Schedule: ' + escapeHTML(currentCapsule.displayUnlockDate || currentCapsule.unlockDate || "Ready to Unlock");
  }

  // Update submit button text to clearly state the capsule
  if (submitBtn) {
    var shortTitle = currentCapsule.title.length > 22
      ? currentCapsule.title.slice(0, 22) + "…"
      : currentCapsule.title;
    submitBtn.textContent = 'Forward "' + shortTitle + '" →';
  }
}

/**
 * Render timeline chain nodes — simplified to names and actions only (no messages)
 */
function renderTimeline() {
  var list = document.getElementById("timeline-list");
  if (!list) return;

  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  list.innerHTML = "";

  if (!currentCapsule) {
    list.innerHTML = '<li class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><div class="timeline-name">No Journey Data</div><div class="timeline-action">Select an unlocked capsule above to view its chain.</div></div></li>';
    return;
  }

  // Get dynamic chain from ChronicleDB
  var rawChain = [];
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getJourneyChain) {
    rawChain = ChronicleDB.getJourneyChain(currentCapsule.id);
  }

  var chain = [];

  if (!rawChain || rawChain.length === 0) {
    // Brand new capsule with no hops
    chain = [
      {
        name: currentCapsule.creator || (activeUser ? activeUser.name : "Author"),
        action: "Created capsule",
        date: currentCapsule.dateCreated || "Day 1",
        active: false
      },
      {
        name: (activeUser ? activeUser.name : "You") + " (Current Holder)",
        action: "Holding capsule — ready to forward",
        date: "Today",
        active: true
      }
    ];
  } else {
    // Add recorded hops — names and action only, no messages
    rawChain.forEach(function (h) {
      chain.push({
        name: h.name,
        action: h.action,
        date: h.date,
        active: false
      });
    });

    // Determine current holder
    var lastHop = rawChain[rawChain.length - 1];
    var currentHolderName = activeUser ? activeUser.name : "Current Holder";
    if (lastHop && lastHop.action && lastHop.action.indexOf("Forwarded to ") === 0) {
      currentHolderName = lastHop.action.replace("Forwarded to ", "");
    }

    chain.push({
      name: currentHolderName + " (Current Holder)",
      action: "Holding capsule — ready to continue the journey",
      date: "Active Now",
      active: true
    });
  }

  for (var i = 0; i < chain.length; i++) {
    var node = chain[i];
    var li = document.createElement("li");
    li.className = "timeline-item" + (node.active ? " active" : "");

    li.innerHTML =
      '<div class="timeline-dot" aria-hidden="true"></div>' +
      '<div class="timeline-card">' +
      '  <div class="timeline-name">' + escapeHTML(node.name) + '</div>' +
      '  <div class="timeline-action"><span>' + escapeHTML(node.action) + '</span></div>' +
      '  <div class="timeline-date" style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;"><span aria-hidden="true">📅</span> ' + escapeHTML(node.date) + '</div>' +
      '</div>';

    list.appendChild(li);
  }
}

/**
 * Populate recipient select with available users on the website
 */
function setupRecipientSelect() {
  var select = document.getElementById("recipient");
  var help = document.getElementById("recipient-help");
  var submitBtn = document.getElementById("btn-submit-journey");
  if (!select) return;

  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  var currentUsername = activeUser ? (activeUser.username || "").toLowerCase() : "";

  // Get all registered users from ChronicleDB + localStorage backup
  var users = [];
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getUsers) {
    users = ChronicleDB.getUsers().slice();
  }
  try {
    var storedUsers = JSON.parse(localStorage.getItem("chronicle_registered_users_v2") || "[]");
    storedUsers.forEach(function (su) {
      if (!users.some(function (u) { return (u.username || "").toLowerCase() === (su.username || "").toLowerCase(); })) {
        users.push({
          user_id: su.id,
          username: su.username,
          full_name: su.name,
          email: su.email,
          avatar: su.avatar
        });
      }
    });
  } catch (e) {}

  // Filter out the currently logged-in user
  var availableUsers = users.filter(function (u) {
    return (u.username || "").toLowerCase() !== currentUsername;
  });
  registeredUsersList = availableUsers;

  select.innerHTML = "";

  if (availableUsers.length === 0) {
    select.innerHTML = '<option value="" disabled selected>No other registered users found on the website</option>';
    if (help) {
      help.innerHTML = '<span style="color: #c44b00; font-weight: 600;">ℹ No other accounts exist yet.</span> Register a second account on Chronicle (e.g. <code>bob</code>) and that user will immediately appear here to forward to!';
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.title = "Register at least one other user on the website to forward capsules.";
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.title = "";
  }
  if (help) {
    help.textContent = "Choose from " + availableUsers.length + " other registered user(s) on Chronicle to forward this capsule to.";
  }

  var defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Choose an available registered user (" + availableUsers.length + " available)...";
  select.appendChild(defaultOpt);

  availableUsers.forEach(function (u) {
    var opt = document.createElement("option");
    opt.value = u.username;
    opt.textContent = "👤 " + (u.full_name || u.name || u.username) + " (@" + u.username + ") — " + (u.email || "");
    select.appendChild(opt);
  });
}

/**
 * Handles the Continue Journey form submission
 */
function handleContinueForm(event) {
  event.preventDefault();

  var recipientSelect = document.getElementById("recipient");
  var messageInput = document.getElementById("journey-message");
  var recipientGroup = document.getElementById("recipient-group");
  var recipientError = document.getElementById("recipient-error");

  if (!recipientSelect) return;
  if (recipientGroup) recipientGroup.classList.remove("has-error");
  recipientSelect.removeAttribute("aria-invalid");

  var recipientUsername = recipientSelect.value.trim();
  if (!recipientUsername) {
    if (recipientGroup) recipientGroup.classList.add("has-error");
    if (recipientError) recipientError.textContent = "Please select a registered user to forward this capsule to.";
    recipientSelect.setAttribute("aria-invalid", "true");
    recipientSelect.focus();
    return;
  }

  if (!currentCapsule) {
    showToast("Please select an unlocked capsule first.", "info");
    return;
  }

  // Double-check capsule is unlocked before forwarding
  if (!isCapsuleUnlocked(currentCapsule)) {
    showToast("This capsule is still sealed and cannot be forwarded.", "info");
    return;
  }

  var targetUser = registeredUsersList.find(function (u) {
    return u.username.toLowerCase() === recipientUsername.toLowerCase();
  });

  if (!targetUser) {
    if (recipientGroup) recipientGroup.classList.add("has-error");
    if (recipientError) recipientError.textContent = "Selected user not found.";
    recipientSelect.setAttribute("aria-invalid", "true");
    return;
  }

  var forwardMessage = messageInput ? messageInput.value.trim() : "";
  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;

  // Persist chained hop to ChronicleDB
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.continueJourney) {
    ChronicleDB.continueJourney(currentCapsule.id, targetUser, forwardMessage, activeUser);

    // Reload unlocked capsules
    var allCaps = ChronicleDB.getVaultCapsules(activeUser) || [];
    unlockedCapsules = allCaps.filter(isCapsuleUnlocked);
  }

  // Update displays
  renderTopUnlockedCapsules();
  renderTimeline();

  // Show friendly success toast
  var recipientDisplayName = targetUser.full_name || targetUser.name || targetUser.username;
  showToast("Capsule forwarded to " + recipientDisplayName + "! They will find it in their vault.", "success", 4500);

  // Announce to screen readers via live region
  var liveRegion = document.getElementById("live-region");
  if (liveRegion) {
    liveRegion.textContent = "Capsule successfully forwarded to " + recipientDisplayName + ".";
  }

  // Reset form
  recipientSelect.value = "";
  recipientSelect.removeAttribute("aria-invalid");
  if (messageInput) messageInput.value = "";
}

// Set up on page load
document.addEventListener("DOMContentLoaded", function () {
  initJourneyPage();

  var form = document.getElementById("continue-form");
  if (form) {
    form.addEventListener("submit", handleContinueForm);
  }

  var recipientSelect = document.getElementById("recipient");
  if (recipientSelect) {
    recipientSelect.addEventListener("change", function () {
      var grp = document.getElementById("recipient-group");
      if (grp) grp.classList.remove("has-error");
    });
  }
});
