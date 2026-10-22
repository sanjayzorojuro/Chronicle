/* ===========================
   CHRONICLE — Journey Page JS
   Dynamic timeline linked to active capsule + forwarding to available users
   =========================== */

var currentCapsule = null;
var availableCapsules = [];
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
 * Initialize Journey page:
 * 1. Identify which capsule is being viewed/forwarded
 * 2. Populate capsule switcher
 * 3. Render journey timeline
 * 4. Populate recipient dropdown with available users on the site
 */
function initJourneyPage() {
  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  if (!activeUser) {
    window.location.replace("login.html");
    return;
  }

  // Load all capsules belonging to this user from ChronicleDB
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getVaultCapsules) {
    availableCapsules = ChronicleDB.getVaultCapsules(activeUser) || [];
  }

  // Also merge any capsules from localStorage if not already present
  try {
    var storedVault = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
    storedVault.forEach(function (svc) {
      var exists = availableCapsules.some(function (c) { return c.id === svc.id; });
      if (!exists) {
        availableCapsules.push(svc);
      }
    });
  } catch (e) {}

  // Filter for unlocked capsules
  var unlockedCapsules = availableCapsules.filter(function (c) {
    return c.status === "unlocked" ||
           c.status === "ready" ||
           (c.unlockDate && new Date(c.unlockDate).getTime() <= Date.now());
  });

  // Determine active capsule to display
  var targetId = new URLSearchParams(window.location.search).get("id");
  if (targetId) {
    currentCapsule = availableCapsules.find(function (c) { return c.id === targetId; });
    if (!currentCapsule && typeof ChronicleDB !== "undefined" && ChronicleDB.getCapsuleById) {
      var direct = ChronicleDB.getCapsuleById(targetId);
      if (direct) {
        currentCapsule = {
          id: direct.capsule_id,
          title: direct.title,
          category: direct.category,
          creator: direct.creator_name,
          dateCreated: new Date(direct.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          message: direct.message,
          chainCount: direct.chain_count || 1,
          status: direct.status || "unlocked"
        };
      }
    }
  }

  // Fallback: prefer the first unlocked capsule if no target specified
  if (!currentCapsule && unlockedCapsules.length > 0) {
    currentCapsule = unlockedCapsules[0];
  }

  // Fallback to cached active capsule in localStorage
  if (!currentCapsule) {
    try {
      var stored = localStorage.getItem("chronicle_active_journey_capsule") || localStorage.getItem("chronicle_active_capsule");
      if (stored) {
        var parsed = JSON.parse(stored);
        if (parsed && parsed.id) {
          currentCapsule = parsed;
        }
      }
    } catch (e) {}
  }

  // Fallback to first available capsule
  if (!currentCapsule && availableCapsules.length > 0) {
    currentCapsule = availableCapsules[0];
  }

  renderTopUnlockedCapsules();
  setupCapsuleSwitcher();
  renderCapsuleHeader();
  renderTimeline();
  setupRecipientSelect();

  // Announce page ready to screen readers via live region
  var liveRegion = document.getElementById("live-region");
  if (liveRegion) {
    var capsuleCount = availableCapsules.filter(function (c) {
      return c.status === "unlocked" || c.status === "ready" || (c.unlockDate && new Date(c.unlockDate).getTime() <= Date.now());
    }).length;
    liveRegion.textContent = "Journey page loaded. " + capsuleCount + " unlocked capsule" + (capsuleCount !== 1 ? "s" : "") + " available.";
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

  var unlocked = availableCapsules.filter(function (c) {
    return c.status === "unlocked" ||
           c.status === "ready" ||
           (c.unlockDate && new Date(c.unlockDate).getTime() <= Date.now());
  });

  if (countBadge) {
    countBadge.textContent = unlocked.length + (unlocked.length === 1 ? " Capsule Unlocked" : " Capsules Unlocked");
  }

  if (unlocked.length === 0) {
    grid.style.display = "none";
    if (emptyBox) emptyBox.style.display = "block";
    return;
  }

  grid.style.display = "grid";
  if (emptyBox) emptyBox.style.display = "none";
  grid.innerHTML = "";

  unlocked.forEach(function (cap) {
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
 */
function selectCapsuleForJourney(capsuleId, shouldScroll) {
  var found = availableCapsules.find(function (c) { return c.id === capsuleId; });
  if (found) {
    currentCapsule = found;
    try {
      localStorage.setItem("chronicle_active_journey_capsule", JSON.stringify(found));
    } catch (e) {}

    renderCapsuleHeader();
    renderTimeline();
    renderTopUnlockedCapsules();

    // Update switcher select
    var select = document.getElementById("journey-capsule-select");
    if (select) select.value = capsuleId;

    if (shouldScroll) {
      var contSec = document.querySelector(".continue-section");
      if (contSec) {
        contSec.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
}

/**
 * Set up the capsule switcher dropdown
 */
function setupCapsuleSwitcher() {
  var select = document.getElementById("journey-capsule-select");
  var wrapper = document.getElementById("journey-selector-wrapper");
  if (!select) return;

  if (availableCapsules.length === 0) {
    if (wrapper) wrapper.style.display = "none";
    return;
  }

  if (wrapper) wrapper.style.display = "block";
  select.innerHTML = "";

  availableCapsules.forEach(function (cap) {
    var opt = document.createElement("option");
    opt.value = cap.id;
    var isUnlocked = cap.status === "unlocked" || cap.status === "ready" || (cap.unlockDate && new Date(cap.unlockDate).getTime() <= Date.now());
    opt.textContent = (isUnlocked ? "🔓 " : "🔒 ") + cap.title + " (#" + cap.id + ")";
    if (currentCapsule && currentCapsule.id === cap.id) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  select.onchange = function () {
    selectCapsuleForJourney(this.value, false);
  };
}

/**
 * Render the active capsule information header and forward indicator
 */
function renderCapsuleHeader() {
  var titleEl = document.getElementById("journey-cap-title");
  var catEl = document.getElementById("journey-cap-category");
  var metaEl = document.getElementById("journey-cap-meta");
  var continueSection = document.querySelector(".continue-section");
  var forwardName = document.getElementById("forward-cap-name");
  var forwardDetails = document.getElementById("forward-cap-details");
  var submitBtn = document.getElementById("btn-submit-journey");

  if (!currentCapsule) {
    if (titleEl) titleEl.textContent = "No Capsule Selected";
    if (catEl) catEl.textContent = "Vault";
    if (metaEl) metaEl.innerHTML = "You don't have any sealed capsules yet. <a href='create.html' style='color:var(--color-accent);font-weight:600;'>Create a capsule</a> in your vault to start its journey!";
    if (continueSection) continueSection.style.display = "none";
    return;
  }

  if (continueSection) continueSection.style.display = "block";
  if (titleEl) titleEl.textContent = '“' + currentCapsule.title + '”';
  if (catEl) catEl.textContent = currentCapsule.category || "Personal";
  if (metaEl) {
    metaEl.innerHTML =
      'Original Creator: <strong>' + escapeHTML(currentCapsule.creator || "You") + '</strong> &bull; ' +
      'ID: <code>' + escapeHTML(currentCapsule.id) + '</code> &bull; ' +
      'Sealed on: ' + escapeHTML(currentCapsule.dateCreated || "Recently");
  }

  // Update Forward Target Indicator
  if (forwardName) {
    forwardName.textContent = '“' + currentCapsule.title + '” (' + currentCapsule.id + ')';
  }
  if (forwardDetails) {
    forwardDetails.innerHTML =
      'Category: <strong>' + escapeHTML(currentCapsule.category || "Personal") + '</strong> &bull; ' +
      'Originator: <strong>' + escapeHTML(currentCapsule.creator || "You") + '</strong> &bull; ' +
      'Unlock Schedule: ' + escapeHTML(currentCapsule.displayUnlockDate || currentCapsule.unlockDate || "Locked in Vault");
  }

  // Update submit button text to clearly state the capsule
  if (submitBtn) {
    var shortTitle = currentCapsule.title.length > 22
      ? currentCapsule.title.slice(0, 22) + "…"
      : currentCapsule.title;
    submitBtn.textContent = 'Forward “' + shortTitle + '” →';
  }
}

/**
 * Render timeline chain nodes
 */
function renderTimeline() {
  var list = document.getElementById("timeline-list");
  if (!list) return;

  var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
  list.innerHTML = "";

  if (!currentCapsule) {
    list.innerHTML = '<li class="timeline-item"><div class="timeline-dot"></div><div class="timeline-card"><div class="timeline-name">No Journey Data</div><div class="timeline-action">Create or receive a capsule to view its chain here.</div></div></li>';
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
        action: "Created and Sealed Capsule",
        date: currentCapsule.dateCreated || "Day 1",
        active: false,
        message: currentCapsule.message
      },
      {
        name: (activeUser ? activeUser.name : "You") + " (Current Holder)",
        action: "Holding capsule — ready to forward",
        date: "Today",
        active: true,
        message: null
      }
    ];
  } else {
    // Add recorded hops
    rawChain.forEach(function (h) {
      chain.push({
        name: h.name,
        action: h.action,
        date: h.date,
        active: false,
        message: h.message
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
      active: true,
      message: null
    });
  }

  for (var i = 0; i < chain.length; i++) {
    var node = chain[i];
    var li = document.createElement("li");
    li.className = "timeline-item" + (node.active ? " active" : "");

    var messageSnippet = node.message
      ? '<p style="margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--color-text); font-style: italic; background: #fafafa; padding: 0.5rem 0.75rem; border-radius: 4px; border-left: 3px solid var(--color-accent);">' + escapeHTML(node.message) + '</p>'
      : '';

    li.innerHTML =
      '<div class="timeline-dot" aria-hidden="true"></div>' +
      '<div class="timeline-card">' +
      '  <div class="timeline-name">' + escapeHTML(node.name) + '</div>' +
      '  <div class="timeline-action"><span>' + escapeHTML(node.action) + '</span></div>' +
      '  <div class="timeline-date" style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.25rem;">📅 ' + escapeHTML(node.date) + '</div>' +
      messageSnippet +
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
    showToast("Please select a capsule first.", "info");
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
    availableCapsules = ChronicleDB.getVaultCapsules(activeUser) || availableCapsules;
  }

  // Update displays
  renderTopUnlockedCapsules();
  setupCapsuleSwitcher();
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
