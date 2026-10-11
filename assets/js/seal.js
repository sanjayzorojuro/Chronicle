/* ===========================
   CHRONICLE — Seal Page JS
   Recipient selection + Wax Seal sequence
   =========================== */

// Mock registered users list (aligned with project team & synopsis)
var registeredUsers = [
  { id: 1, username: "mounika.shetty", name: "Mounika Shetty", avatar: "MS" },
  { id: 2, username: "sanjay.patil", name: "Sanjay Patil", avatar: "SP" },
  { id: 3, username: "kishan.kumar", name: "Kishan Kumar", avatar: "KK" },
  { id: 4, username: "ananya.rao", name: "Ananya Rao", avatar: "AR" },
  { id: 5, username: "rahul.nair", name: "Rahul Nair", avatar: "RN" },
  { id: 6, username: "daron.john", name: "Daron John (You)", avatar: "DJ" }
];

// Active state
var currentDraft = {
  id: "CHR-" + Math.floor(1000 + Math.random() * 9000),
  title: "A Letter for My Future Self",
  message: "Remember the challenges you conquered, the dreams you chased, and never forget where this journey started.",
  category: "Friendship",
  unlockDate: "2027-09-01",
  displayUnlockDate: "01 September 2027",
  creator: "Daron John",
  dateCreated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
  isPublic: false
};

var selectedMode = "myself";
var selectedRecipients = [];

/**
 * Initialize draft data from localStorage if available, or query params.
 */
function loadDraftData() {
  try {
    var storedDraft = localStorage.getItem("chronicle_current_draft");
    if (storedDraft) {
      var parsed = JSON.parse(storedDraft);
      currentDraft = Object.assign(currentDraft, parsed);
    }
  } catch (e) {
    console.warn("Could not read draft from localStorage:", e);
  }

  // Update preview UI
  var titleEl = document.getElementById("preview-title");
  var catEl = document.getElementById("preview-category");
  var dateEl = document.getElementById("preview-unlock-date");
  var msgEl = document.getElementById("preview-message");

  if (titleEl) titleEl.textContent = currentDraft.title;
  if (catEl) catEl.textContent = currentDraft.category;
  if (dateEl) dateEl.textContent = currentDraft.displayUnlockDate || currentDraft.unlockDate;
  if (msgEl) msgEl.textContent = '"' + currentDraft.message + '"';
}

/**
 * Handle Recipient Mode change (myself, single, multiple).
 */
function handleModeChange(mode) {
  selectedMode = mode;
  var selectorGroup = document.getElementById("recipient-selector-group");
  var labelMyself = document.getElementById("label-myself");
  var labelSingle = document.getElementById("label-single");
  var labelMultiple = document.getElementById("label-multiple");
  var searchHelp = document.getElementById("user-search-help");

  [labelMyself, labelSingle, labelMultiple].forEach(function (el) {
    if (el) el.classList.remove("active");
  });

  if (mode === "myself") {
    if (labelMyself) labelMyself.classList.add("active");
    if (selectorGroup) selectorGroup.style.display = "none";
    selectedRecipients = [{ username: "daron.john", name: "Myself (Daron John)" }];
  } else if (mode === "single") {
    if (labelSingle) labelSingle.classList.add("active");
    if (selectorGroup) selectorGroup.style.display = "block";
    if (searchHelp) searchHelp.textContent = "Search and select a single registered friend to receive this capsule.";
    // If previously multiple, keep only the first
    if (selectedRecipients.length > 1) {
      selectedRecipients = [selectedRecipients[0]];
    }
  } else if (mode === "multiple") {
    if (labelMultiple) labelMultiple.classList.add("active");
    if (selectorGroup) selectorGroup.style.display = "block";
    if (searchHelp) searchHelp.textContent = "Search and add multiple friends. They will each receive this capsule.";
  }

  clearRecipientError();
  renderSelectedRecipients();
}

/**
 * Render selected recipient tags.
 */
function renderSelectedRecipients() {
  var container = document.getElementById("selected-recipients-box");
  if (!container) return;

  if (selectedMode === "myself") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";
  selectedRecipients.forEach(function (user, index) {
    var chip = document.createElement("div");
    chip.className = "recipient-chip";
    chip.innerHTML =
      '<span>👤 ' + escapeHTML(user.name) + ' (' + escapeHTML(user.username) + ')</span>' +
      '<button type="button" class="chip-remove-btn" aria-label="Remove ' + escapeHTML(user.name) + '" data-index="' + index + '">&times;</button>';
    container.appendChild(chip);
  });

  // Attach removal event listeners
  var removeBtns = container.querySelectorAll(".chip-remove-btn");
  removeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var idx = parseInt(this.getAttribute("data-index"), 10);
      selectedRecipients.splice(idx, 1);
      renderSelectedRecipients();
    });
  });
}

/**
 * Filter and show autocomplete results.
 */
function handleUserSearch(query) {
  var list = document.getElementById("user-autocomplete-list");
  if (!list) return;

  query = query.trim().toLowerCase();
  if (!query) {
    list.style.display = "none";
    list.innerHTML = "";
    return;
  }

  var matches = registeredUsers.filter(function (u) {
    // Exclude currently logged in user if sending to others
    if (u.username === "daron.john") return false;
    // Exclude already selected users
    var alreadyAdded = selectedRecipients.some(function (sel) {
      return sel.username === u.username;
    });
    if (alreadyAdded) return false;

    return u.username.toLowerCase().includes(query) || u.name.toLowerCase().includes(query);
  });

  if (matches.length === 0) {
    list.innerHTML = '<li class="autocomplete-item" style="color:var(--color-text-secondary);cursor:default;">No registered users found</li>';
    list.style.display = "block";
    return;
  }

  list.innerHTML = "";
  matches.forEach(function (user) {
    var item = document.createElement("li");
    item.className = "autocomplete-item";
    item.setAttribute("role", "option");
    item.innerHTML =
      '<div class="user-avatar-small">' + escapeHTML(user.avatar) + '</div>' +
      '<div class="autocomplete-info">' +
      '  <strong>' + escapeHTML(user.name) + '</strong>' +
      '  <span>@' + escapeHTML(user.username) + '</span>' +
      '</div>';

    item.addEventListener("click", function () {
      addRecipient(user);
    });

    list.appendChild(item);
  });

  list.style.display = "block";
}

/**
 * Add user to recipients list.
 */
function addRecipient(user) {
  var searchInput = document.getElementById("user-search-input");
  var list = document.getElementById("user-autocomplete-list");

  if (selectedMode === "single") {
    selectedRecipients = [user];
  } else {
    selectedRecipients.push(user);
  }

  if (searchInput) searchInput.value = "";
  if (list) list.style.display = "none";

  clearRecipientError();
  renderSelectedRecipients();
}

/**
 * Error state handling
 */
function setRecipientError(message) {
  var group = document.getElementById("recipient-selector-group");
  var errEl = document.getElementById("recipient-error");
  if (group) group.classList.add("has-error");
  if (errEl) {
    errEl.textContent = message;
    errEl.style.display = "block";
  }
}

function clearRecipientError() {
  var group = document.getElementById("recipient-selector-group");
  var errEl = document.getElementById("recipient-error");
  if (group) group.classList.remove("has-error");
  if (errEl) errEl.style.display = "none";
}

/**
 * Execute Wax Seal Sequence and save capsule.
 */
function sealCapsule(event) {
  event.preventDefault();

  // Validate recipients if not "myself"
  if (selectedMode !== "myself" && selectedRecipients.length === 0) {
    setRecipientError("Please select at least one recipient to receive this capsule.");
    var searchInput = document.getElementById("user-search-input");
    if (searchInput) searchInput.focus();
    return;
  }

  var isPublic = document.getElementById("setting-public") ? document.getElementById("setting-public").checked : false;
  var liveRegion = document.getElementById("live-region");

  // Show Sealing Modal
  var modal = document.getElementById("seal-modal");
  var modalTitle = document.getElementById("seal-modal-title");
  var modalDesc = document.getElementById("seal-modal-desc");
  var modalActions = document.getElementById("seal-success-actions");

  if (modal) modal.style.display = "flex";
  if (liveRegion) liveRegion.textContent = "Sealing capsule in progress...";

  // Prepare sealed capsule object for Vault
  var recipientLabels = selectedMode === "myself"
    ? "Myself"
    : selectedRecipients.map(function (u) { return u.name; }).join(", ");

  var capsuleRecord = {
    id: currentDraft.id,
    title: currentDraft.title,
    message: currentDraft.message,
    category: currentDraft.category,
    creator: "Daron John",
    recipient: recipientLabels,
    recipientMode: selectedMode,
    recipients: selectedRecipients,
    unlockDate: currentDraft.unlockDate,
    displayUnlockDate: currentDraft.displayUnlockDate || currentDraft.unlockDate,
    dateCreated: currentDraft.dateCreated,
    isPublic: isPublic,
    status: "sealed", // sealed | unlocked
    chainCount: 1
  };

  // Persist into localStorage vault collection
  saveCapsuleToVault(capsuleRecord);

  // Animation progression
  setTimeout(function () {
    if (modalTitle) modalTitle.textContent = "✓ Capsule Sealed Successfully!";
    if (modalDesc) {
      modalDesc.innerHTML = "Capsule <strong>#" + capsuleRecord.id + "</strong> is now permanently locked and encrypted.<br>Stored safely in your vault until <strong>" + escapeHTML(capsuleRecord.displayUnlockDate) + "</strong>.";
    }
    if (modalActions) modalActions.style.display = "flex";
    if (liveRegion) liveRegion.textContent = "Capsule sealed successfully.";
    showToast("Capsule sealed and archived into My Vault!", "success", 4000);
  }, 1200);
}

/**
 * Save record into localStorage vault collection
 */
function saveCapsuleToVault(newCapsule) {
  try {
    var vaultData = [];
    var existing = localStorage.getItem("chronicle_vault_capsules");
    if (existing) {
      vaultData = JSON.parse(existing);
    }
    // Prepend new capsule
    vaultData.unshift(newCapsule);
    localStorage.setItem("chronicle_vault_capsules", JSON.stringify(vaultData));
  } catch (err) {
    console.error("Error saving capsule to vault:", err);
  }
}

/**
 * Helper to escape HTML characters.
 */
function escapeHTML(str) {
  if (!str) return "";
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// DOM Setup
document.addEventListener("DOMContentLoaded", function () {
  loadDraftData();

  // Mode radio listeners
  var modeRadios = document.querySelectorAll('input[name="recipient-mode"]');
  modeRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      handleModeChange(this.value);
    });
  });

  // Search input listeners
  var searchInput = document.getElementById("user-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      handleUserSearch(this.value);
    });

    // Close autocomplete when clicking outside
    document.addEventListener("click", function (e) {
      var list = document.getElementById("user-autocomplete-list");
      if (list && !list.contains(e.target) && e.target !== searchInput) {
        list.style.display = "none";
      }
    });
  }

  // Form submit listener
  var form = document.getElementById("seal-form");
  if (form) {
    form.addEventListener("submit", sealCapsule);
  }

  // Initial recipient setup
  handleModeChange("myself");
});
