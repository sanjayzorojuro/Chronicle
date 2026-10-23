var DB_STORAGE_KEY = "chronicle_local_db_v2";
var profileDb = null;
var profileUser = null;
var activityEvents = [];

/**
 * Load database from ChronicleDB with fallback to localStorage
 */
function loadDb() {
  try {
    if (typeof ChronicleDB !== "undefined" && ChronicleDB.exportJSON) {
      return JSON.parse(ChronicleDB.exportJSON());
    }
  } catch (e) {}

  try {
    var raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return { users: [], capsules: [], capsule_recipients: [] };
}

/**
 * Identify currently active user profile
 */
function findProfileUser(db) {
  var active = null;
  try {
    if (typeof getActiveUser === "function") {
      active = getActiveUser();
    } else {
      active = JSON.parse(localStorage.getItem("chronicle_active_user"));
    }
  } catch (e) {}

  if (!active) return { user: null, signedIn: false };

  // Pure session values take absolute precedence:
  var actUser = (active.username || "").trim();
  var actName = (active.name || active.full_name || active.username || "").trim();
  var actEmail = (active.email || "").trim();
  var actId = active.id || active.user_id || 1;

  // Try to find matching user in db to align ID:
  var users = db.users || [];
  var dbMatch = users.filter(function (u) {
    if (actUser && u.username && u.username.toLowerCase() === actUser.toLowerCase()) return true;
    if (actEmail && u.email && u.email.toLowerCase() === actEmail.toLowerCase()) return true;
    if (actId && u.user_id && String(u.user_id) === String(actId)) return true;
    return false;
  })[0];

  var userObj = {
    user_id: (dbMatch && dbMatch.user_id) ? dbMatch.user_id : actId,
    username: actUser || (dbMatch && dbMatch.username) || "user",
    full_name: actName || (dbMatch && (dbMatch.full_name || dbMatch.name)) || actUser,
    email: actEmail || (dbMatch && dbMatch.email) || "",
    avatar: active.avatar || (dbMatch && dbMatch.avatar) || (actName ? actName.slice(0, 2).toUpperCase() : "CH")
  };
  return { user: userObj, signedIn: true };
}

function isUnlocked(c) {
  if (c.status === "unlocked") return true;
  var unlockDate = c.unlock_date || c.unlockDate;
  if (!unlockDate) return false;
  var t = new Date(unlockDate).getTime();
  return !isNaN(t) && t <= Date.now();
}

/**
 * Load vault capsules and harmonize DB + localStorage
 */
function getUnifiedVaultCapsules(db, activeUser) {
  var list = [];
  var seenIds = {};
  var seenKeys = {};

  function makeKey(cap) {
    var t = (cap.title || "").trim().toLowerCase();
    var u = (cap.unlockDate || cap.unlock_date || "").trim();
    var m = (cap.message || "").trim().toLowerCase().slice(0, 30);
    return t + "|" + u + "|" + m;
  }

  // 1. First, load ChronicleDB vault capsules
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getVaultCapsules) {
    var dbCaps = ChronicleDB.getVaultCapsules(activeUser) || [];
    dbCaps.forEach(function (c) {
      if (c && c.id) {
        var key = makeKey(c);
        if (!seenIds[c.id] && !seenKeys[key]) {
          seenIds[c.id] = true;
          if (key !== "||") seenKeys[key] = true;
          list.push(c);
        }
      }
    });
  }

  // 2. Also merge from localStorage chronicle_vault_capsules without duplicating
  try {
    var stored = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
    if (Array.isArray(stored)) {
      stored.forEach(function (c) {
        if (c && c.id) {
          var key = makeKey(c);
          if (seenIds[c.id] || (key !== "||" && seenKeys[key])) {
            // Update unlocked status if already seen
            if (c.status === "unlocked") {
              list.forEach(function (item) {
                if (item.id === c.id || makeKey(item) === key) item.status = "unlocked";
              });
            }
          } else {
            seenIds[c.id] = true;
            if (key !== "||") seenKeys[key] = true;
            list.push(c);
          }
        }
      });
    }
  } catch (e) {}

  return list;
}

/**
 * Calculate user stats matching exact vault and recipient logic
 */
function buildStats(db, uid, vaultCapsules) {
  var myName = profileUser ? (profileUser.full_name || profileUser.name || "").trim().toLowerCase() : "";
  var myUser = profileUser ? (profileUser.username || "").trim().toLowerCase() : "";
  var myEmail = profileUser ? (profileUser.email || "").trim().toLowerCase() : "";

  var created = [];
  var received = [];
  var opened = [];
  var journeys = [];

  vaultCapsules.forEach(function (cap) {
    var creator = (cap.creator || "").trim().toLowerCase();
    var creatorId = cap.creatorId ? String(cap.creatorId) : "";
    var recipient = (cap.recipient || "").trim().toLowerCase();

    var isCreated = false;
    if (creator === "myself" || creator === "you") isCreated = true;
    if (myName && (creator === myName || creator.includes(myName))) isCreated = true;
    if (myUser && (creator === myUser || creator.includes(myUser))) isCreated = true;
    if (uid && creatorId && creatorId === String(uid)) isCreated = true;

    var isReceived = false;
    if (!isCreated) {
      if (myUser && recipient.includes(myUser)) isReceived = true;
      if (myName && recipient.includes(myName)) isReceived = true;
      if (myEmail && recipient.includes(myEmail)) isReceived = true;
    }

    if (isCreated) {
      created.push(cap);
    } else if (isReceived) {
      received.push(cap);
    }

    // Check if opened / unlocked
    if (cap.status === "unlocked" || isUnlocked(cap)) {
      opened.push(cap);
    }

    if (cap.parentCapsuleId || cap.parent_capsule_id) {
      journeys.push(cap);
    }
  });

  return {
    created: created,
    received: received,
    opened: opened,
    journeys: journeys
  };
}

/**
 * Construct chronological activity items for the timeline
 */
function buildEvents(stats, db) {
  var ev = [];

  stats.created.forEach(function (c) {
    var isJourney = !!(c.parentCapsuleId || c.parent_capsule_id);
    var dateStr = c.created_at || c.dateCreated;
    var ts = dateStr ? new Date(dateStr).getTime() : Date.now();
    if (isNaN(ts)) ts = Date.now();

    ev.push({
      type: isJourney ? "journey" : "created",
      label: isJourney ? "Continued journey of" : "Created capsule",
      title: c.title,
      ts: ts
    });
  });

  stats.opened.forEach(function (c) {
    var dateStr = c.opened_at || c.unlock_date || c.unlockDate;
    var ts = dateStr ? new Date(dateStr).getTime() : Date.now();
    if (isNaN(ts)) ts = Date.now();

    ev.push({
      type: "opened",
      label: "Opened capsule",
      title: c.title,
      ts: ts
    });
  });

  // Filter valid timestamps and sort newest first
  ev = ev.filter(function (e) { return !isNaN(e.ts); });
  ev.sort(function (a, b) { return b.ts - a.ts; });
  return ev;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Render activity items based on active chip filter
 */
function renderTimeline(filter) {
  var list = document.getElementById("activity-list");
  var empty = document.getElementById("activity-empty");
  if (!list || !empty) return;

  list.innerHTML = "";
  var currentFilter = filter || "all";
  var shown = activityEvents.filter(function (e) {
    return currentFilter === "all" || e.type === currentFilter;
  });

  shown.forEach(function (e) {
    var li = document.createElement("li");
    li.className = "timeline-item type-" + e.type;

    var text = document.createElement("div");
    text.className = "timeline-text";
    text.appendChild(document.createTextNode(e.label + " "));

    var em = document.createElement("em");
    em.textContent = "“" + (e.title || "Untitled Capsule") + "”";
    text.appendChild(em);

    var date = document.createElement("div");
    date.className = "timeline-date";
    date.textContent = formatDate(e.ts);

    li.appendChild(text);
    li.appendChild(date);
    list.appendChild(li);
  });

  empty.style.display = shown.length ? "none" : "block";
}

/**
 * Populate Share on Time Wall section
 */
function renderShareList(vaultCapsules) {
  var list = document.getElementById("share-list");
  var empty = document.getElementById("share-empty");
  if (!list || !empty) return;

  list.innerHTML = "";
  var mine = (vaultCapsules || []).filter(function (c) {
    return isUnlocked(c);
  });

  mine.forEach(function (c) {
    var li = document.createElement("li");
    var info = document.createElement("div");
    var t = document.createElement("strong");
    t.textContent = c.title;

    var d = document.createElement("span");
    d.className = "timeline-date";
    var unlockDateStr = c.displayUnlockDate || c.display_unlock_date || formatDate(new Date(c.unlockDate || c.unlock_date).getTime());
    d.textContent = "Unlocked " + unlockDateStr + " · " + (c.isPublic || c.is_public ? "Public" : "Private");
    info.appendChild(t);
    info.appendChild(d);

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline";
    var isPublic = !!(c.isPublic || c.is_public);
    btn.textContent = isPublic ? "Make private" : "Make public";
    btn.addEventListener("click", function () {
      setCapsulePublic(c.id, !isPublic);
    });

    li.appendChild(info);
    li.appendChild(btn);
    list.appendChild(li);
  });

  empty.style.display = mine.length ? "none" : "block";
}

function setCapsulePublic(capsuleId, makePublic) {
  var db = loadDb();
  (db.capsules || []).forEach(function (c) {
    if (c.capsule_id === capsuleId) c.is_public = makePublic;
  });
  try { localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db)); } catch (e) {}

  try {
    var vaultCaps = JSON.parse(localStorage.getItem("chronicle_vault_capsules") || "[]");
    vaultCaps.forEach(function (c) {
      if (c.id === capsuleId) c.isPublic = makePublic;
    });
    localStorage.setItem("chronicle_vault_capsules", JSON.stringify(vaultCaps));
  } catch (e) {}

  var vaultCapsules = getUnifiedVaultCapsules(db, profileUser);
  renderShareList(vaultCapsules);
  if (typeof showToast === "function") {
    showToast(makePublic ? "Capsule is now public on the Time Wall." : "Capsule is now private.", "success");
  }
}

function animateCount(el, target) {
  if (!el) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || target === 0) { el.textContent = target; return; }
  var n = 0, step = Math.max(1, Math.ceil(target / 20));
  var iv = setInterval(function () {
    n = Math.min(target, n + step);
    el.textContent = n;
    if (n >= target) clearInterval(iv);
  }, 30);
}

document.addEventListener("DOMContentLoaded", function () {
  profileDb = loadDb();
  var res = findProfileUser(profileDb);
  profileUser = res.user;

  if (!profileUser) {
    var contentEl = document.getElementById("profile-content");
    var promptEl = document.getElementById("signin-prompt");
    if (contentEl) contentEl.style.display = "none";
    if (promptEl) promptEl.style.display = "block";
    return;
  }

  var name = profileUser.full_name || profileUser.name || profileUser.username;
  var initials = profileUser.avatar || name.split(" ").map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
  var avatarEl = document.getElementById("pf-avatar");
  var nameEl = document.getElementById("pf-name");
  var userEl = document.getElementById("pf-username");
  var emailEl = document.getElementById("pf-email");

  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (userEl) userEl.textContent = "@" + profileUser.username;
  if (emailEl) emailEl.textContent = profileUser.email || "";

  // Unify vault capsules across ChronicleDB and localStorage
  var vaultCapsules = getUnifiedVaultCapsules(profileDb, profileUser);
  var stats = buildStats(profileDb, profileUser.user_id, vaultCapsules);

  animateCount(document.getElementById("pf-created"), stats.created.length);
  animateCount(document.getElementById("pf-received"), stats.received.length);
  animateCount(document.getElementById("pf-opened"), stats.opened.length);
  animateCount(document.getElementById("pf-journeys"), stats.journeys.length);

  activityEvents = buildEvents(stats, profileDb);
  renderTimeline("all");
  renderShareList(vaultCapsules);

  // Filter chip buttons
  var filterChips = document.querySelectorAll(".activity-filter .chip");
  filterChips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterChips.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var filterType = btn.getAttribute("data-type") || "all";
      renderTimeline(filterType);
    });
  });

  // Sign out confirmation modal handlers
  var signoutBtn = document.getElementById("btn-profile-signout");
  var modal = document.getElementById("signout-modal");
  var cancelBtn = document.getElementById("btn-cancel-signout");
  var confirmBtn = document.getElementById("btn-confirm-signout");

  function openSignoutModal() {
    if (modal) modal.style.display = "flex";
  }

  function closeSignoutModal() {
    if (modal) modal.style.display = "none";
  }

  if (signoutBtn) signoutBtn.addEventListener("click", openSignoutModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeSignoutModal);
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeSignoutModal();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeSignoutModal();
    }
  });

  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      try {
        localStorage.removeItem("chronicle_active_user");
      } catch (e) {}
      window.location.href = "login.html";
    });
  }
});
