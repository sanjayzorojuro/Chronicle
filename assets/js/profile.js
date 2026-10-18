var DB_STORAGE_KEY = "chronicle_local_db";
var profileDb = null;
var profileUser = null;
var activityEvents = [];

function loadDb() {
  try { return JSON.parse(ChronicleDB.exportJSON()); } catch (e) { return { users: [], capsules: [], capsule_recipients: [] }; }
}

function findProfileUser(db) {
  var active = null;
  try { active = JSON.parse(localStorage.getItem("chronicle_active_user")); } catch (e) {}
  var users = db.users || [];
  var found = null;
  if (active) {
    found = users.filter(function (u) { return u.username === active.username; })[0] ||
            users.filter(function (u) { return u.email === active.email; })[0] || null;
    if (!found) {
      found = {
        user_id: active.id || 999,
        username: active.username,
        full_name: active.name || active.username,
        email: active.email || "",
        avatar: active.avatar || active.username.slice(0, 2).toUpperCase()
      };
    }
  }
  return { user: found, signedIn: !!found };
}

function isUnlocked(c) {
  var t = new Date(c.unlock_date).getTime();
  return !isNaN(t) && t <= Date.now();
}

function buildStats(db, uid) {
  var capsules = db.capsules || [];
  var recipients = db.capsule_recipients || [];
  var byId = {};
  capsules.forEach(function (c) { byId[c.capsule_id] = c; });

  var myName = profileUser ? (profileUser.full_name || profileUser.name || "").trim().toLowerCase() : "";
  var myUser = profileUser ? (profileUser.username || "").trim().toLowerCase() : "";

  var created = capsules.filter(function (c) {
    if (uid && c.creator_id && String(c.creator_id) === String(uid)) return true;
    if (myName && (c.creator_name || "").trim().toLowerCase() === myName) return true;
    if (myUser && (c.creator_name || "").trim().toLowerCase() === myUser) return true;
    return false;
  });

  var received = recipients.filter(function (r) {
    var isSelf = (r.recipient_name || "").trim().toLowerCase().startsWith("myself");
    if (isSelf) return false;
    var matchesUser = (uid && r.user_id && String(r.user_id) === String(uid)) ||
                      (myUser && (r.recipient_name || "").toLowerCase().includes(myUser)) ||
                      (myName && (r.recipient_name || "").toLowerCase().includes(myName));
    var cap = byId[r.capsule_id];
    var isNotMyOwn = cap ? (String(cap.creator_id) !== String(uid) && (cap.creator_name || "").toLowerCase() !== myName) : true;
    return matchesUser && isNotMyOwn;
  });

  var opened = recipients.filter(function (r) {
    var matchesUser = (uid && r.user_id && String(r.user_id) === String(uid)) ||
                      (myUser && (r.recipient_name || "").toLowerCase().includes(myUser)) ||
                      (myName && (r.recipient_name || "").toLowerCase().includes(myName));
    return matchesUser && r.status === "unlocked";
  });

  var journeys = created.filter(function (c) { return c.parent_capsule_id; });
  return { created: created, received: received, opened: opened, journeys: journeys, byId: byId };
}

function buildEvents(stats) {
  var ev = [];
  stats.created.forEach(function (c) {
    ev.push({ type: c.parent_capsule_id ? "journey" : "created", label: c.parent_capsule_id ? "Continued journey of" : "Created", title: c.title, ts: new Date(c.created_at).getTime() });
  });
  stats.opened.forEach(function (r) {
    var c = stats.byId[r.capsule_id];
    if (c && r.opened_at) ev.push({ type: "opened", label: "Opened", title: c.title, ts: new Date(r.opened_at).getTime() });
  });
  ev = ev.filter(function (e) { return !isNaN(e.ts); });
  ev.sort(function (a, b) { return b.ts - a.ts; });
  return ev;
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function renderTimeline(filter) {
  var list = document.getElementById("activity-list");
  var empty = document.getElementById("activity-empty");
  list.innerHTML = "";
  var shown = activityEvents.filter(function (e) { return filter === "all" || e.type === filter; });

  shown.forEach(function (e) {
    var li = document.createElement("li");
    li.className = "timeline-item type-" + e.type;
    var text = document.createElement("div"); text.className = "timeline-text";
    text.appendChild(document.createTextNode(e.label + " "));
    var em = document.createElement("em"); em.textContent = "“" + e.title + "”"; text.appendChild(em);
    var date = document.createElement("div"); date.className = "timeline-date"; date.textContent = formatDate(e.ts);
    li.appendChild(text); li.appendChild(date);
    list.appendChild(li);
  });
  empty.style.display = shown.length ? "none" : "block";
}

function renderShareList() {
  var list = document.getElementById("share-list");
  var empty = document.getElementById("share-empty");
  list.innerHTML = "";
  var mine = (profileDb.capsules || []).filter(function (c) {
    return c.creator_id === profileUser.user_id && isUnlocked(c);
  });

  mine.forEach(function (c) {
    var li = document.createElement("li");
    var info = document.createElement("div");
    var t = document.createElement("strong"); t.textContent = c.title;
    var d = document.createElement("span"); d.className = "timeline-date";
    d.textContent = "Unlocked " + formatDate(new Date(c.unlock_date).getTime()) + " · " + (c.is_public ? "Public" : "Private");
    info.appendChild(t); info.appendChild(d);

    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn-outline";
    btn.textContent = c.is_public ? "Make private" : "Make public";
    btn.addEventListener("click", function () { setCapsulePublic(c.capsule_id, !c.is_public); });

    li.appendChild(info); li.appendChild(btn);
    list.appendChild(li);
  });
  empty.style.display = mine.length ? "none" : "block";
}

function setCapsulePublic(capsuleId, makePublic) {
  var db = loadDb();
  (db.capsules || []).forEach(function (c) {
    if (c.capsule_id === capsuleId && c.creator_id === profileUser.user_id) c.is_public = makePublic;
  });
  try { localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.warn(e); }
  profileDb = db;
  renderShareList();
  showToast(makePublic ? "Capsule is now public on the Time Wall." : "Capsule is now private.", "success");
}

function animateCount(el, target) {
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
    document.getElementById("profile-content").style.display = "none";
    document.getElementById("signin-prompt").style.display = "block";
    return;
  }

  var name = profileUser.full_name;
  var initials = profileUser.avatar || name.split(" ").map(function (p) { return p.charAt(0); }).join("").slice(0, 2).toUpperCase();
  document.getElementById("pf-avatar").textContent = initials;
  document.getElementById("pf-name").textContent = name;
  document.getElementById("pf-username").textContent = "@" + profileUser.username;
  document.getElementById("pf-email").textContent = profileUser.email || "";

  var stats = buildStats(profileDb, profileUser.user_id);
  animateCount(document.getElementById("pf-created"), stats.created.length);
  animateCount(document.getElementById("pf-received"), stats.received.length);
  animateCount(document.getElementById("pf-opened"), stats.opened.length);
  animateCount(document.getElementById("pf-journeys"), stats.journeys.length);

  activityEvents = buildEvents(stats);
  renderTimeline("all");
  renderShareList();

  document.querySelectorAll(".activity-filter .chip").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".activity-filter .chip").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      renderTimeline(btn.getAttribute("data-type"));
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
