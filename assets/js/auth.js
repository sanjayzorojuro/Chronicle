/* ===========================
   CHRONICLE — Auth JS
   Login & Registration validation & state
   =========================== */

var defaultAuthUsers = [
  { id: 1, username: "daron.john", name: "Daron John", email: "daron@example.com", avatar: "DJ" },
  { id: 2, username: "sanjay.patil", name: "Sanjay Patil", email: "sanjay@example.com", avatar: "SP" },
  { id: 3, username: "mounika.shetty", name: "Mounika Shetty", email: "mounika@example.com", avatar: "MS" },
  { id: 4, username: "kishan.kumar", name: "Kishan Kumar", email: "kishan@example.com", avatar: "KK" },
  { id: 5, username: "ananya.rao", name: "Ananya Rao", email: "ananya@example.com", avatar: "AR" }
];

/**
 * Handle Login Form Submission
 */
function handleLogin(event) {
  event.preventDefault();

  var usernameInput = document.getElementById("username");
  var passwordInput = document.getElementById("password");

  var username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  var password = passwordInput ? passwordInput.value.trim() : "";

  var hasError = false;

  // Validate Username
  var groupUsername = document.getElementById("group-username");
  if (!username) {
    if (groupUsername) groupUsername.classList.add("has-error");
    hasError = true;
  } else {
    if (groupUsername) groupUsername.classList.remove("has-error");
  }

  // Validate Password
  var groupPassword = document.getElementById("group-password");
  if (!password) {
    if (groupPassword) groupPassword.classList.add("has-error");
    hasError = true;
  } else {
    if (groupPassword) groupPassword.classList.remove("has-error");
  }

  if (hasError) return;

  // Find or create session profile
  var registeredUsers = getRegisteredUsers();
  var matchedUser = registeredUsers.find(function (u) {
    return u.username.toLowerCase() === username || u.email.toLowerCase() === username;
  });

  var sessionUser = matchedUser || {
    id: Date.now(),
    username: username,
    name: username.charAt(0).toUpperCase() + username.slice(1),
    email: username + "@example.com",
    avatar: username.slice(0, 2).toUpperCase()
  };

  // Save session
  try {
    localStorage.setItem("chronicle_active_user", JSON.stringify(sessionUser));
  } catch (e) {
    console.warn("Storage warning:", e);
  }

  showToast("Welcome back, " + sessionUser.name + "! Unlocking vault...", "success", 2000);

  setTimeout(function () {
    window.location.href = "vault.html";
  }, 750);
}

/**
 * Handle Registration Form Submission
 */
function handleRegister(event) {
  event.preventDefault();

  var nameInput = document.getElementById("fullname");
  var usernameInput = document.getElementById("reg-username");
  var emailInput = document.getElementById("email");
  var passInput = document.getElementById("reg-password");
  var confirmInput = document.getElementById("confirm-password");
  var termsCheckbox = document.getElementById("agree-terms");

  var name = nameInput ? nameInput.value.trim() : "";
  var username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  var email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  var pass = passInput ? passInput.value : "";
  var confirm = confirmInput ? confirmInput.value : "";
  var agree = termsCheckbox ? termsCheckbox.checked : false;

  var hasError = false;

  // Full Name
  var gName = document.getElementById("group-fullname");
  if (!name) {
    if (gName) gName.classList.add("has-error");
    hasError = true;
  } else {
    if (gName) gName.classList.remove("has-error");
  }

  // Username
  var gUser = document.getElementById("group-reg-username");
  if (!username || username.length < 3) {
    if (gUser) gUser.classList.add("has-error");
    hasError = true;
  } else {
    if (gUser) gUser.classList.remove("has-error");
  }

  // Email
  var gEmail = document.getElementById("group-email");
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailPattern.test(email)) {
    if (gEmail) gEmail.classList.add("has-error");
    hasError = true;
  } else {
    if (gEmail) gEmail.classList.remove("has-error");
  }

  // Password
  var gPass = document.getElementById("group-reg-password");
  if (!pass || pass.length < 6) {
    if (gPass) gPass.classList.add("has-error");
    hasError = true;
  } else {
    if (gPass) gPass.classList.remove("has-error");
  }

  // Confirm Password
  var gConfirm = document.getElementById("group-confirm-password");
  if (confirm !== pass) {
    if (gConfirm) gConfirm.classList.add("has-error");
    hasError = true;
  } else {
    if (gConfirm) gConfirm.classList.remove("has-error");
  }

  // Terms
  var termsErr = document.getElementById("terms-error");
  if (!agree) {
    if (termsErr) termsErr.style.display = "block";
    hasError = true;
  } else {
    if (termsErr) termsErr.style.display = "none";
  }

  if (hasError) return;

  var newUser = {
    id: Date.now(),
    username: username,
    name: name,
    email: email,
    avatar: name.split(" ").map(function (n) { return n[0]; }).join("").toUpperCase()
  };

  // Append to registered users list
  var currentUsers = getRegisteredUsers();
  currentUsers.push(newUser);
  try {
    localStorage.setItem("chronicle_registered_users", JSON.stringify(currentUsers));
    localStorage.setItem("chronicle_active_user", JSON.stringify(newUser));
  } catch (e) {
    console.warn("Storage warning:", e);
  }

  showToast("Account created successfully! Entering your vault...", "success", 2500);

  setTimeout(function () {
    window.location.href = "vault.html";
  }, 800);
}

/**
 * Retrieve registered users list from storage or defaults
 */
function getRegisteredUsers() {
  try {
    var stored = localStorage.getItem("chronicle_registered_users");
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {}
  return defaultAuthUsers.slice();
}

/**
 * Demo autofill chips helper
 */
function setupDemoChips() {
  var chips = document.querySelectorAll(".btn-demo-chip");
  chips.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var username = this.getAttribute("data-user");
      var userInput = document.getElementById("username");
      var passInput = document.getElementById("password");
      if (userInput) userInput.value = username;
      if (passInput) passInput.value = "chronicle2026";

      // Clear previous error states
      var gUser = document.getElementById("group-username");
      var gPass = document.getElementById("group-password");
      if (gUser) gUser.classList.remove("has-error");
      if (gPass) gPass.classList.remove("has-error");
    });
  });
}

// Bind event handlers on load
document.addEventListener("DOMContentLoaded", function () {
  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    setupDemoChips();
  }

  var registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Forgot password link stub
  var forgotLink = document.getElementById("link-forgot");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showToast("Demo: Password reset instructions sent to your email.", "info", 3000);
    });
  }
});
