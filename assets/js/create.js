/*
 * Chronicle — Create a time capsule
 * Handles the form, live preview, and local draft.
 * This is a front-end demo, not a secure time-lock service.
 */
const DRAFT_KEY = "chronicleDraft";
const RECIPIENT_PAGE = "seal.html"; // Connected to Member 2's Recipient Selection & Seal page.

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("capsule-form");
  const title = document.getElementById("capsule-title");
  const message = document.getElementById("capsule-message");
  const category = document.getElementById("capsule-category");
  const date = document.getElementById("unlock-date");
  const status = document.getElementById("draft-status");
  const summary = document.getElementById("form-summary");
  const dialog = document.getElementById("next-step-dialog");

  let createdAt = "";
  let lastSavedDraft = null;

  // Use local dates to avoid timezone shifts.
  function dateValue(value) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function readDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null;
  }

  function dateAfterMonths(months) {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    const currentDay = target.getDate();
    target.setMonth(target.getMonth() + months);
    if (target.getDate() !== currentDay) target.setDate(0);
    return dateValue(target);
  }

  function displayDate(value) {
    const parsed = readDate(value);
    return parsed
      ? parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Choose a date";
  }

  function setMinimumDate() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    date.min = dateValue(tomorrow);
  }

  function showError(input, text) {
    if (!input) return;
    input.setAttribute("aria-invalid", "true");
    const error = document.getElementById(`${input.id}-error`);
    if (error) {
      error.textContent = text;
      error.style.display = "block";
    }
  }

  function clearError(input) {
    if (!input) return;
    input.removeAttribute("aria-invalid");
    const error = document.getElementById(`${input.id}-error`);
    if (error) {
      error.textContent = "";
      error.style.display = "none";
    }
  }

  function markChanged() {
    status.textContent = "Unsaved changes — use Save draft to keep them.";
  }

  function updatePreview() {
    document.getElementById("title-count").textContent = `${title.value.length} / 80`;
    document.getElementById("message-count").textContent = `${message.value.length} / 3000`;

    document.getElementById("preview-title").textContent = title.value.trim() || "Your story starts here.";
    document.getElementById("preview-message").textContent =
      message.value.trim() || "A few words today can mean a whole lot tomorrow. Your message will appear here as you write.";

    const categoryText = category.options[category.selectedIndex]?.text;
    document.getElementById("preview-category").textContent = category.value ? categoryText : "Not selected";
    document.getElementById("preview-date").textContent = displayDate(date.value);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = readDate(date.value);
    const days = selectedDate
      ? Math.round((Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) -
          Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000)
      : 0;
    document.getElementById("countdown-text").textContent = days > 0
      ? `${days} ${days === 1 ? "day" : "days"} until this memory can open.`
      : "A future date makes it a time capsule.";

    document.querySelectorAll("[data-months]").forEach(button => {
      button.setAttribute("aria-pressed", String(date.value === dateAfterMonths(Number(button.dataset.months))));
    });
  }

  function buildDraft() {
    const now = new Date().toISOString();
    return {
      title: title.value.trim(),
      message: message.value.trim(),
      category: category.value,
      unlockDate: date.value,
      status: "draft",
      createdAt: createdAt || now,
      updatedAt: now
    };
  }

  function saveDraft(quiet = false) {
    const draft = buildDraft();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));

      // Also sync to Member 2's seal page schema
      var activeUser = typeof getActiveUser === "function" ? getActiveUser() : null;
      var sealDraft = {
        id: "CHR-" + Math.floor(1000 + Math.random() * 9000),
        title: draft.title,
        message: draft.message,
        category: draft.category,
        unlockDate: draft.unlockDate,
        displayUnlockDate: displayDate(draft.unlockDate),
        creator: (activeUser && activeUser.name) ? activeUser.name : "You",
        dateCreated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        isPublic: false
      };
      try {
        localStorage.setItem("chronicle_current_draft", JSON.stringify(sealDraft));
      } catch (err) {}

      createdAt = draft.createdAt;
      lastSavedDraft = draft;
      status.textContent = "Draft saved in this browser. You can come back to it.";
      if (!quiet) showToast("Draft saved. A little piece of now, kept for later.");
      return draft;
    } catch {
      status.textContent = "Couldn't save. Browser storage may be full or blocked.";
      showToast("Draft wasn't saved. Check browser storage.", "info", 4500);
      return null;
    }
  }

  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) return false;

      title.value = typeof saved.title === "string" ? saved.title : "";
      message.value = typeof saved.message === "string" ? saved.message : "";
      category.value = typeof saved.category === "string" ? saved.category : "";
      date.value = typeof saved.unlockDate === "string" ? saved.unlockDate : "";

      createdAt = typeof saved.createdAt === "string" ? saved.createdAt : "";
      lastSavedDraft = saved;
      status.textContent = "Your saved draft has been restored.";
      return true;
    } catch {
      status.textContent = "Saved draft couldn't be read. You can still write a new capsule.";
      return false;
    }
  }

  function validateForm() {
    setMinimumDate();
    const checks = [
      [title, !title.value.trim(), "Add a title."],
      [message, !message.value.trim(), "Write a message."],
      [category, !category.value, "Choose a category."],
      [date, !readDate(date.value) || date.value < date.min, "Choose tomorrow or a later date."]
    ];
    const errors = [];
    [title, message, category, date].forEach(clearError);

    checks.forEach(([input, invalid, text]) => {
      if (invalid) {
        showError(input, text);
        errors.push(input);
      }
    });

    summary.hidden = errors.length === 0;
    if (errors.length) {
      errors[0].focus();
    }
    return errors.length === 0;
  }

  [title, message, category, date].forEach(input => {
    ["input", "change"].forEach(eventName => {
      input.addEventListener(eventName, () => {
        clearError(input);
        markChanged();
        updatePreview();
      });
    });
  });

  document.querySelectorAll("[data-months]").forEach(button => {
    button.addEventListener("click", () => {
      date.value = dateAfterMonths(Number(button.dataset.months));
      clearError(date);
      markChanged();
      updatePreview();
    });
  });

  document.getElementById("save-draft").addEventListener("click", () => saveDraft());

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateForm()) return;
    const draft = saveDraft(true);
    if (!draft) return;

    // Transition directly to Member 2's Recipient Selection & Sealing Page
    window.location.href = RECIPIENT_PAGE;
  });

  document.getElementById("download-draft").addEventListener("click", () => {
    if (!lastSavedDraft) return;
    const file = new Blob([JSON.stringify(lastSavedDraft, null, 2)], { type: "application/json" });
    const download = document.createElement("a");
    download.href = URL.createObjectURL(file);
    download.download = "chronicle-draft.json";
    download.click();
    URL.revokeObjectURL(download.href);
  });

  document.getElementById("reset-draft").addEventListener("click", () => {
    if (!confirm("Clear this capsule and its saved browser draft? This cannot be undone.")) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      showToast("Couldn't clear browser storage.", "info");
      return;
    }

    form.reset();
    [title, message, category, date].forEach(clearError);
    createdAt = "";
    lastSavedDraft = null;
    summary.hidden = true;
    status.textContent = "A fresh start. Not saved yet.";
    updatePreview();
  });

  const templates = {
    future: { title: "A letter to my future self", category: "Personal", message: "Dear future me,\n\nToday, I want you to remember…\n\n" },
    friend: { title: "A note for a good friend", category: "Friendship", message: "Hey you,\n\nThere's something I don't want us to forget…\n\n" },
    milestone: { title: "Remember this moment", category: "Milestone", message: "Today marks a new chapter.\n\nHere's what this moment means to me…\n\n" }
  };

  setMinimumDate();

  // If previous capsule was sealed, reset form and clear storage
  if (localStorage.getItem("chronicle_draft_sealed")) {
    try {
      localStorage.removeItem("chronicle_draft_sealed");
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem("chronicle_current_draft");
    } catch (e) {}
    form.reset();
    createdAt = "";
    lastSavedDraft = null;
    summary.hidden = true;
    status.textContent = "A fresh start. Not saved yet.";
  }

  const restored = restoreDraft();
  const template = templates[new URLSearchParams(location.search).get("template")];
  if (template && (!restored || confirm("Use this starting idea instead of your current draft? The saved draft won't change until you save again."))) {
    form.reset();
    createdAt = "";
    title.value = template.title;
    message.value = template.message;
    category.value = template.category;
  }

  updatePreview();
});
