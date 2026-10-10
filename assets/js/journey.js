/* ===========================
   CHRONICLE — Journey Page JS
   Timeline renderer + form logic
   =========================== */

// Demo journey data (simulates a capsule's chain)
var journeyData = {
  capsuleTitle: "A Letter to My Future Self",
  chain: [
    {
      name: "Mounika Shetty",
      action: "Created",
      date: "15 August 2026",
      active: false,
    },
    {
      name: "Ananya Rao",
      action: "Opened",
      date: "9 January 2027",
      active: false,
    },
    {
      name: "Rahul Nair",
      action: "Continued",
      date: "22 June 2027",
      active: false,
    },
    {
      name: "You",
      action: "Received",
      date: "9 October 2027",
      active: true,
    },
  ],
};

/**
 * Renders the journey timeline into the DOM.
 */
function renderTimeline() {
  var list = document.getElementById("timeline-list");
  if (!list) return;

  list.innerHTML = "";

  for (var i = 0; i < journeyData.chain.length; i++) {
    var node = journeyData.chain[i];

    var li = document.createElement("li");
    li.className = "timeline-item" + (node.active ? " active" : "");

    li.innerHTML =
      '<div class="timeline-dot" aria-hidden="true"></div>' +
      '<div class="timeline-card">' +
      '  <div class="timeline-name">' + escapeHTML(node.name) + "</div>" +
      '  <div class="timeline-action"><span>' + escapeHTML(node.action) + "</span></div>" +
      '  <div class="timeline-date">' + escapeHTML(node.date) + "</div>" +
      "</div>";

    list.appendChild(li);
  }
}

/**
 * Basic HTML escaping to prevent XSS with dynamic content.
 */
function escapeHTML(str) {
  var div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Handles the Continue Journey form submission.
 */
function handleContinueForm(event) {
  event.preventDefault();

  var recipientInput = document.getElementById("recipient");
  var messageInput = document.getElementById("journey-message");
  var recipientGroup = recipientInput.closest(".form-group");

  // Reset previous errors
  recipientGroup.classList.remove("has-error");

  // Validate recipient
  var recipient = recipientInput.value.trim();
  if (!recipient) {
    recipientGroup.classList.add("has-error");
    recipientInput.focus();
    return;
  }

  // Simulate success — add new node to timeline
  journeyData.chain.forEach(function (node) {
    node.active = false;
  });

  journeyData.chain.push({
    name: recipient,
    action: "Continued",
    date: "9 October 2027",
    active: true,
  });

  renderTimeline();

  // Show success toast
  showToast("Journey continued to " + recipient + "!");

  // Reset form
  recipientInput.value = "";
  messageInput.value = "";
}

// Set up on page load
document.addEventListener("DOMContentLoaded", function () {
  renderTimeline();

  var form = document.getElementById("continue-form");
  if (form) {
    form.addEventListener("submit", handleContinueForm);
  }

  // Clear error state on input
  var recipientInput = document.getElementById("recipient");
  if (recipientInput) {
    recipientInput.addEventListener("input", function () {
      this.closest(".form-group").classList.remove("has-error");
    });
  }
});
