/*
 * Chronicle — Create a time capsule
 * Handles the form, live preview, photo, and local draft.
 * This is a front-end demo, not a secure time-lock service.
 */
const DRAFT_KEY = "chronicleDraft";
const RECIPIENT_PAGE = "seal.html"; // Connected to Member 2's Recipient & Seal page

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("capsule-form");
  const title = document.getElementById("capsule-title");
  const message = document.getElementById("capsule-message");
  const category = document.getElementById("capsule-category");
  const date = document.getElementById("unlock-date");
  const link = document.getElementById("capsule-link");
  const imageInput = document.getElementById("capsule-image");
  const extras = document.getElementById("optional-extras");
  const status = document.getElementById("draft-status");
  const summary = document.getElementById("form-summary");
  const dialog = document.getElementById("next-step-dialog");

  let imageData = "";
  let imageName = "";
  let createdAt = "";
  let lastSavedDraft = null;
  let imageReadId = 0;
  let readingImage = false;

  // Use local dates to avoid timezone shifts.
  function dateValue(value) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  function readDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const result = new Date(year, month - 1, day);
    return dateValue(result) === value ? result : null;
  }

  function setMinimumDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date.min = dateValue(tomorrow);
  }

  function dateAfterMonths(months) {
    const today = new Date();
    const result = new Date(today.getFullYear(), today.getMonth() + months, 1);
    const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(today.getDate(), lastDay));
    return dateValue(result);
  }

  function displayDate(value) {
    const parsed = readDate(value);
    return parsed
      ? parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "Choose a date";
  }

  function isWebLink(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  function showError(input, text) {
    input.closest(".form-group").classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    document.getElementById(`${input.id}-error`).textContent = text;
  }

  function clearError(input) {
    input.closest(".form-group").classList.remove("has-error");
    input.removeAttribute("aria-invalid");
    document.getElementById(`${input.id}-error`).textContent = "";
  }

  function markChanged() {
    status.textContent = "Unsaved changes — use Save draft to keep them.";
    summary.hidden = true;
  }

  function updatePreview() {
    document.getElementById("title-count").textContent = `${title.value.length} / 80`;
    document.getElementById("message-count").textContent =
      `${message.value.length.toLocaleString("en-IN")} / 5,000`;

    document.getElementById("preview-title").textContent =
      title.value.trim() || "Your story starts here.";
    const words = message.value.trim();
    document.getElementById("preview-message").textContent = words
      ? words.slice(0, 260) + (words.length > 260 ? "…" : "")
      : "A few words today can mean a whole lot tomorrow. Your message will appear here as you write.";
    document.getElementById("preview-category").textContent = category.value || "Not selected";
    document.getElementById("preview-date").textContent = displayDate(date.value);

    const selectedDate = readDate(date.value);
    const today = new Date();
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

    const previewImage = document.getElementById("preview-image");
    previewImage.hidden = !imageData;
    if (imageData) previewImage.src = imageData;
    else previewImage.removeAttribute("src");

    document.getElementById("selected-image").hidden = !imageName;
    document.getElementById("image-name").textContent = imageName;

    const previewLink = document.getElementById("preview-link");
    const url = link.value.trim();
    previewLink.hidden = !isWebLink(url);
    if (isWebLink(url)) previewLink.href = url;
    else previewLink.removeAttribute("href");
  }

  function buildDraft() {
    const now = new Date().toISOString();
    return {
      title: title.value.trim(),
      message: message.value.trim(),
      category: category.value,
      unlockDate: date.value,
      link: link.value.trim(),
      image: imageData,
      imageName,
      status: "draft",
      createdAt: createdAt || now,
      updatedAt: now
    };
  }

  function saveDraft(quiet = false) {
    if (readingImage || imageInput.getAttribute("aria-invalid") === "true") {
      showToast(readingImage ? "Please wait for your photo to finish loading." : "Remove or replace the invalid photo before saving.", "info");
      return null;
    }

    const draft = buildDraft();
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      // Sync with Member 2 (seal.js) storage format
      const sealDraft = {
        id: "CHR-" + Math.floor(1000 + Math.random() * 9000),
        title: draft.title || "A Letter to My Future Self",
        message: draft.message || "",
        category: draft.category || "Personal",
        unlockDate: draft.unlockDate,
        displayUnlockDate: displayDate(draft.unlockDate),
        creator: "Daron John",
        dateCreated: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
        isPublic: false,
        media_url: draft.link || draft.image || null
      };
      localStorage.setItem("chronicle_current_draft", JSON.stringify(sealDraft));
      createdAt = draft.createdAt;
      lastSavedDraft = draft;
      status.textContent = "Draft saved in this browser. You can come back to it.";
      if (!quiet) showToast("Draft saved. A little piece of now, kept for later.");
      return draft;
    } catch {
      status.textContent = "Couldn't save. Browser storage may be full or blocked. Try a smaller photo.";
      showToast("Draft wasn't saved. Check browser storage or remove the photo.", "info", 4500);
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
      link.value = typeof saved.link === "string" ? saved.link : "";

      if (typeof saved.image === "string" &&
          /^data:image\/(jpeg|png|webp);base64,/.test(saved.image)) {
        imageData = saved.image;
        imageName = typeof saved.imageName === "string" ? saved.imageName : "Saved photo";
      }
      createdAt = typeof saved.createdAt === "string" ? saved.createdAt : "";
      lastSavedDraft = saved;
      extras.open = Boolean(imageData || link.value);
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
      [date, !readDate(date.value) || date.value < date.min, "Choose tomorrow or a later date."],
      [link, Boolean(link.value.trim()) && !isWebLink(link.value.trim()), "Use a full link starting with https:// or http://."]
    ];
    const errors = [];
    [title, message, category, date, link].forEach(clearError);

    checks.forEach(([input, invalid, text]) => {
      if (invalid) {
        showError(input, text);
        errors.push(input);
      }
    });

    if (imageInput.getAttribute("aria-invalid") === "true") errors.push(imageInput);
    summary.hidden = errors.length === 0;
    if (errors.length) {
      if (errors[0] === link || errors[0] === imageInput) extras.open = true;
      errors[0].focus();
    }
    return errors.length === 0;
  }

  [title, message, category, date, link].forEach(input => {
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

  function setImageLoading(isLoading) {
    readingImage = isLoading;
    document.getElementById("save-draft").disabled = isLoading;
    document.getElementById("continue-button").disabled = isLoading;
  }

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    const currentRead = ++imageReadId;
    clearError(imageInput);
    imageData = "";
    imageName = file.name;
    markChanged();
    updatePreview();

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showError(imageInput, "Choose a JPG, PNG or WebP photo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showError(imageInput, "Your photo must be 2 MB or smaller.");
      return;
    }

    setImageLoading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (currentRead !== imageReadId) return;
      imageData = String(reader.result);
      setImageLoading(false);
      updatePreview();
    };
    reader.onerror = () => {
      if (currentRead !== imageReadId) return;
      setImageLoading(false);
      showError(imageInput, "This photo couldn't be read. Please choose it again.");
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("remove-image").addEventListener("click", () => {
    imageReadId++;
    setImageLoading(false);
    imageInput.value = "";
    imageData = "";
    imageName = "";
    clearError(imageInput);
    markChanged();
    updatePreview();
  });

  document.getElementById("save-draft").addEventListener("click", () => saveDraft());

  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validateForm()) return;
    const draft = saveDraft(true);
    if (!draft) return;

    if (RECIPIENT_PAGE) {
      window.location.href = RECIPIENT_PAGE;
      return;
    }
    document.getElementById("ready-title").textContent = draft.title;
    document.getElementById("ready-date").textContent = displayDate(draft.unlockDate);
    dialog.showModal();
  });

  ["close-dialog", "keep-editing"].forEach(id => {
    document.getElementById(id).addEventListener("click", () => dialog.close());
  });

  document.getElementById("download-draft").addEventListener("click", () => {
    if (!lastSavedDraft) return;
    const file = new Blob([JSON.stringify(lastSavedDraft, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const download = document.createElement("a");
    download.href = url;
    download.download = "chronicle-draft.json";
    download.click();
    URL.revokeObjectURL(url);
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
    [title, message, category, date, link, imageInput].forEach(clearError);
    imageReadId++;
    setImageLoading(false);
    imageData = "";
    imageName = "";
    createdAt = "";
    lastSavedDraft = null;
    extras.open = false;
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
  const restored = restoreDraft();
  const template = templates[new URLSearchParams(location.search).get("template")];
  if (template && (!restored || confirm("Use this starting idea instead of your current draft? The saved draft won't change until you save again."))) {
    form.reset();
    imageData = "";
    imageName = "";
    createdAt = "";
    extras.open = false;
    title.value = template.title;
    message.value = template.message;
    category.value = template.category;
    status.textContent = "A starting idea, just for you. Make it your own, then save.";
  }

  updatePreview();
});
