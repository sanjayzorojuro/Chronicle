var wallState = { year: "all", query: "", category: "all", sort: "newest" };
var wallItems = [];
var liked = {};
var modalOpener = null;
var modalItem = null;

function formatDate(iso) {
  var d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

function yearOf(item) {
  return String(new Date(item.unlockedOn).getFullYear());
}

function toWallItem(c) {
  var unlockMs = new Date(c.unlock_date).getTime();
  if (!c.is_public || isNaN(unlockMs) || unlockMs > Date.now()) return null;
  return {
    id: c.capsule_id,
    title: c.title,
    message: c.message || "",
    category: c.category,
    creator: c.creator_name,
    unlockedOn: new Date(unlockMs).toISOString().split("T")[0]
  };
}

function collectItems(capsules, items, seen) {
  (capsules || []).forEach(function (c) {
    var item = toWallItem(c);
    if (item && !seen[item.id]) {
      seen[item.id] = true;
      items.push(item);
    }
  });
}

function loadWallItems(callback) {
  var items = [];
  var seen = {};
  try {
    collectItems(JSON.parse(ChronicleDB.exportJSON()).capsules, items, seen);
  } catch (e) {
    console.warn("Could not read ChronicleDB:", e);
  }
  try { liked = JSON.parse(localStorage.getItem("chronicle_wall_likes") || "{}") || {}; } catch (e) { liked = {}; }

  fetch("../data/time_wall.json")
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (json) { collectItems(json.capsules, items, seen); })
    .catch(function () {})
    .then(function () { callback(items); });
}

function renderYearChips() {
  var wrap = document.getElementById("year-chips");
  var years = [];
  wallItems.forEach(function (i) { var y = yearOf(i); if (years.indexOf(y) === -1) years.push(y); });
  years.sort();
  wrap.innerHTML = "";
  ["all"].concat(years).forEach(function (y, idx) {
    if (idx > 1) {
      var arrow = document.createElement("span");
      arrow.className = "year-arrow"; arrow.setAttribute("aria-hidden", "true"); arrow.textContent = "→";
      wrap.appendChild(arrow);
    }
    var b = document.createElement("button");
    b.type = "button";
    b.className = "year-chip" + (wallState.year === y ? " active" : "");
    b.setAttribute("aria-pressed", wallState.year === y ? "true" : "false");
    b.textContent = y === "all" ? "All years" : y;
    b.addEventListener("click", function () { wallState.year = y; renderYearChips(); renderWall(); });
    wrap.appendChild(b);
  });
}

function getFiltered() {
  var q = wallState.query.toLowerCase();
  var list = wallItems.filter(function (i) {
    if (wallState.year !== "all" && yearOf(i) !== wallState.year) return false;
    if (wallState.category !== "all") {
      if (wallState.category === "Other") {
        var isStandard = i.category === "Personal" || i.category === "Friendship" || i.category === "Family";
        if (i.category !== "Other" && isStandard) return false;
      } else if (i.category !== wallState.category) {
        return false;
      }
    }
    if (q && (i.title + " " + i.message + " " + i.creator).toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  list.sort(function (a, b) {
    var diff = new Date(b.unlockedOn) - new Date(a.unlockedOn);
    return wallState.sort === "newest" ? diff : -diff;
  });
  return list;
}

function renderWall() {
  var grid = document.getElementById("wall-grid");
  var empty = document.getElementById("wall-empty");
  var count = document.getElementById("wall-count");
  var list = getFiltered();
  grid.innerHTML = "";

  list.forEach(function (item) {
    var card = document.createElement("article");
    card.className = "wall-card";

    var eyebrow = document.createElement("p"); eyebrow.className = "wall-eyebrow"; eyebrow.textContent = item.category || "";
    var h = document.createElement("h3"); h.textContent = item.title;
    var q = document.createElement("p"); q.className = "wall-quote"; q.textContent = "“" + item.message + "”";
    var a = document.createElement("p"); a.className = "wall-author";
    a.appendChild(document.createTextNode("Sealed by "));
    var s = document.createElement("strong"); s.textContent = item.creator; a.appendChild(s);

    var foot = document.createElement("div"); foot.className = "wall-card-foot";
    var badge = document.createElement("span"); badge.className = "wall-badge"; badge.textContent = "Unlocked · " + yearOf(item);
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn-primary"; btn.textContent = "Read";
    btn.addEventListener("click", function () { openModal(item, btn); });
    foot.appendChild(badge); foot.appendChild(btn);

    card.appendChild(eyebrow); card.appendChild(h); card.appendChild(q); card.appendChild(a); card.appendChild(foot);
    grid.appendChild(card);
  });

  empty.style.display = list.length ? "none" : "flex";
  grid.style.display = list.length ? "grid" : "none";
  count.textContent = list.length + (list.length === 1 ? " capsule" : " capsules") + " on the wall";
}

function openModal(item, opener) {
  modalItem = item; modalOpener = opener;
  document.getElementById("wm-badge").textContent = "Unlocked · " + yearOf(item);
  document.getElementById("wm-title").textContent = item.title;
  document.getElementById("wm-meta").textContent = "Sealed by " + item.creator + " · " + item.category + " · Opened " + formatDate(item.unlockedOn);
  document.getElementById("wm-message").textContent = item.message;
  updateLikeButton();
  document.getElementById("wall-modal").style.display = "flex";
  document.getElementById("wm-close").focus();
}

function closeModal() {
  document.getElementById("wall-modal").style.display = "none";
  if (modalOpener) modalOpener.focus();
}

function updateLikeButton() {
  var btn = document.getElementById("wm-like");
  var on = !!(modalItem && liked[modalItem.id]);
  btn.textContent = on ? "♥ Appreciated" : "♡ Appreciate";
  btn.classList.toggle("liked", on);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
}

function resetFilters() {
  wallState = { year: "all", query: "", category: "all", sort: "newest" };
  document.getElementById("wall-search").value = "";
  document.getElementById("wall-category").value = "all";
  document.getElementById("wall-sort").value = "newest";
  renderYearChips(); renderWall();
}

document.addEventListener("DOMContentLoaded", function () {
  loadWallItems(function (items) {
    wallItems = items;
    renderYearChips();
    renderWall();
  });

  document.getElementById("wall-search").addEventListener("input", function (e) { wallState.query = e.target.value.trim(); renderWall(); });
  document.getElementById("wall-category").addEventListener("change", function (e) { wallState.category = e.target.value; renderWall(); });
  document.getElementById("wall-sort").addEventListener("change", function (e) { wallState.sort = e.target.value; renderWall(); });
  document.getElementById("wall-reset").addEventListener("click", resetFilters);

  document.getElementById("wm-close").addEventListener("click", closeModal);
  document.getElementById("wall-modal").addEventListener("click", function (e) { if (e.target.id === "wall-modal") closeModal(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.getElementById("wall-modal").style.display !== "none") closeModal();
  });
  document.getElementById("wm-like").addEventListener("click", function () {
    if (!modalItem) return;
    liked[modalItem.id] = !liked[modalItem.id];
    try { localStorage.setItem("chronicle_wall_likes", JSON.stringify(liked)); } catch (e) {}
    updateLikeButton();
    if (liked[modalItem.id]) showToast("Thanks for appreciating this memory!", "success");
  });
});
