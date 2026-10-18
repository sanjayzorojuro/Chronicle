/* ==========================================================
   CHRONICLE — Auth JS
   Strict Authentication & Registration Validation
   ========================================================== */

// Empty user database — accounts are created through the Registration page
var defaultAuthUsers = [];

// RFC 5322 compliant email regex
var EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Handle Login Form Submission
 * Only logs in if user exists in the registered database and password matches
 */
function handleLogin(event) {
  event.preventDefault();

  var usernameInput = document.getElementById("username");
  var passwordInput = document.getElementById("password");
  var groupUsername = document.getElementById("group-username");
  var groupPassword = document.getElementById("group-password");
  var usernameError = document.getElementById("username-error");
  var passwordError = document.getElementById("password-error");

  var username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  var password = passwordInput ? passwordInput.value : "";

  var hasError = false;

  // Reset errors
  if (groupUsername) groupUsername.classList.remove("has-error");
  if (groupPassword) groupPassword.classList.remove("has-error");

  if (!username) {
    if (groupUsername) groupUsername.classList.add("has-error");
    if (usernameError) usernameError.textContent = "Please enter your username or email.";
    hasError = true;
  }

  if (!password) {
    if (groupPassword) groupPassword.classList.add("has-error");
    if (passwordError) passwordError.textContent = "Please enter your password.";
    hasError = true;
  }

  if (hasError) return;

  // Check against registered users database
  var registeredUsers = getRegisteredUsers();
  var matchedUser = registeredUsers.find(function (u) {
    return (
      (u.username && u.username.toLowerCase() === username) ||
      (u.email && u.email.toLowerCase() === username)
    );
  });

  // Strict check: User MUST exist in database
  if (!matchedUser) {
    if (groupUsername) groupUsername.classList.add("has-error");
    if (usernameError) {
      usernameError.textContent = "No account found with this username or email. Please register first.";
    }
    showToast("User not found. Please create a new account to continue.", "info", 4000);
    return;
  }

  // Strict check: Password verification
  if (matchedUser.password && matchedUser.password !== password) {
    if (groupPassword) groupPassword.classList.add("has-error");
    if (passwordError) {
      passwordError.textContent = "Incorrect password. Please try again.";
    }
    showToast("Incorrect password. Please verify your credentials.", "info", 3500);
    return;
  }

  // Session user object (omit raw password from session storage for security)
  var dbUser = (typeof ChronicleDB !== "undefined" && ChronicleDB.findUser) ? ChronicleDB.findUser(matchedUser.username) : null;
  var sessionUser = {
    id: (dbUser && dbUser.user_id) ? dbUser.user_id : (matchedUser.id || matchedUser.user_id || Date.now()),
    username: matchedUser.username,
    name: matchedUser.name || matchedUser.full_name || matchedUser.username,
    email: matchedUser.email,
    avatar: matchedUser.avatar || matchedUser.username.slice(0, 2).toUpperCase()
  };

  // Save active authenticated session
  try {
    localStorage.setItem("chronicle_active_user", JSON.stringify(sessionUser));
  } catch (e) {
    console.warn("Storage warning:", e);
  }

  showToast("Welcome back, " + sessionUser.name + "! Opening Chronicle...", "success", 2000);

  setTimeout(function () {
    window.location.href = "discover.html";
  }, 750);
}

/**
 * Handle Registration Form Submission
 * Requires real valid email and prevents duplicate accounts
 */
function handleRegister(event) {
  event.preventDefault();

  var nameInput = document.getElementById("fullname");
  var usernameInput = document.getElementById("reg-username");
  var emailInput = document.getElementById("email");
  var passInput = document.getElementById("reg-password");
  var confirmInput = document.getElementById("confirm-password");
  var termsCheckbox = document.getElementById("agree-terms");

  var gName = document.getElementById("group-fullname");
  var gUser = document.getElementById("group-reg-username");
  var gEmail = document.getElementById("group-email");
  var gPass = document.getElementById("group-reg-password");
  var gConfirm = document.getElementById("group-confirm-password");

  var nameErr = document.getElementById("fullname-error");
  var userErr = document.getElementById("reg-username-error");
  var emailErr = document.getElementById("email-error");
  var passErr = document.getElementById("reg-password-error");
  var confirmErr = document.getElementById("confirm-password-error");
  var termsErr = document.getElementById("terms-error");

  // Reset errors
  [gName, gUser, gEmail, gPass, gConfirm].forEach(function (g) {
    if (g) g.classList.remove("has-error");
  });
  if (termsErr) termsErr.style.display = "none";

  var name = nameInput ? nameInput.value.trim() : "";
  var username = usernameInput ? usernameInput.value.trim().toLowerCase() : "";
  var email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  var pass = passInput ? passInput.value : "";
  var confirm = confirmInput ? confirmInput.value : "";
  var agree = termsCheckbox ? termsCheckbox.checked : false;

  var hasError = false;

  // 1. Full Name: at least 2 chars
  if (!name || name.length < 2) {
    if (gName) gName.classList.add("has-error");
    if (nameErr) nameErr.textContent = "Please enter your full name (at least 2 characters).";
    hasError = true;
  }

  // 2. Username: 3-20 alphanumeric characters, dots, underscores
  var usernamePattern = /^[a-zA-Z0-9._]{3,20}$/;
  if (!username || !usernamePattern.test(username)) {
    if (gUser) gUser.classList.add("has-error");
    if (userErr) userErr.textContent = "Username must be 3-20 characters (letters, numbers, dots, underscores only).";
    hasError = true;
  }

  // 3. Email: strict format check
  if (!email || !EMAIL_REGEX.test(email)) {
    if (gEmail) gEmail.classList.add("has-error");
    if (emailErr) emailErr.textContent = "Please enter a valid email address (e.g. name@domain.com).";
    hasError = true;
  }

  // 4. Password: min 6 chars
  if (!pass || pass.length < 6) {
    if (gPass) gPass.classList.add("has-error");
    if (passErr) passErr.textContent = "Password must be at least 6 characters long.";
    hasError = true;
  }

  // 5. Confirm Password: exact match
  if (confirm !== pass) {
    if (gConfirm) gConfirm.classList.add("has-error");
    if (confirmErr) confirmErr.textContent = "Passwords do not match.";
    hasError = true;
  }

  // 6. Terms: must accept
  if (!agree) {
    if (termsErr) termsErr.style.display = "block";
    hasError = true;
  }

  if (hasError) return;

  // 7. Check if Username or Email is already registered
  var registeredUsers = getRegisteredUsers();
  var existingUser = registeredUsers.find(function (u) {
    return u.username && u.username.toLowerCase() === username;
  });
  if (existingUser) {
    if (gUser) gUser.classList.add("has-error");
    if (userErr) userErr.textContent = "Username is already taken. Please choose another.";
    showToast("This username is already taken.", "info", 3500);
    return;
  }

  var existingEmail = registeredUsers.find(function (u) {
    return u.email && u.email.toLowerCase() === email;
  });
  if (existingEmail) {
    if (gEmail) gEmail.classList.add("has-error");
    if (emailErr) emailErr.textContent = "An account with this email already exists. Please sign in.";
    showToast("An account with this email already exists. Please sign in.", "info", 3500);
    return;
  }

  // Build new user record with password
  var initials = name.split(" ").map(function (n) { return n[0]; }).join("").slice(0, 2).toUpperCase() || "U";
  var newUser = {
    id: Date.now(),
    username: username,
    name: name,
    email: email,
    password: pass,
    avatar: initials
  };

  // Save to registered users database
  registeredUsers.push(newUser);
  try {
    localStorage.setItem("chronicle_registered_users_v2", JSON.stringify(registeredUsers));
  } catch (e) {
    console.warn("Storage warning:", e);
  }

  // Sync with ChronicleDB if loaded
  var dbUser = null;
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.addUser) {
    dbUser = ChronicleDB.addUser({
      username: username,
      full_name: name,
      email: email,
      password: pass,
      avatar: initials
    });
  }

  // Automatically log in newly registered user
  var sessionUser = {
    id: (dbUser && dbUser.user_id) ? dbUser.user_id : newUser.id,
    username: newUser.username,
    name: newUser.name,
    email: newUser.email,
    avatar: newUser.avatar
  };

  try {
    localStorage.setItem("chronicle_active_user", JSON.stringify(sessionUser));
  } catch (e) {}

  showToast("Account created successfully! Welcome to Chronicle, " + name + "!", "success", 2500);

  setTimeout(function () {
    window.location.href = "discover.html";
  }, 800);
}

/**
 * Retrieve registered users list from storage or defaults (merges with ChronicleDB)
 */
function getRegisteredUsers() {
  var usersList = [];
  try {
    var stored = localStorage.getItem("chronicle_registered_users_v2");
    if (stored) {
      var parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        usersList = parsed;
      }
    }
  } catch (e) {}

  // Merge with users in ChronicleDB (loaded from JSON seed)
  if (typeof ChronicleDB !== "undefined" && ChronicleDB.getUsers) {
    try {
      var dbUsers = ChronicleDB.getUsers();
      if (Array.isArray(dbUsers)) {
        dbUsers.forEach(function (du) {
          var exists = usersList.some(function (u) {
            return (u.username && du.username && u.username.toLowerCase() === du.username.toLowerCase()) ||
                   (u.email && du.email && u.email.toLowerCase() === du.email.toLowerCase());
          });
          if (!exists) {
            usersList.push({
              id: du.user_id || Date.now(),
              user_id: du.user_id,
              username: du.username,
              name: du.full_name || du.name || du.username,
              email: du.email,
              password: du.password || "password123",
              avatar: du.avatar || (du.username ? du.username.slice(0, 2).toUpperCase() : "U")
            });
          }
        });
      }
    } catch (err) {}
  }

  return usersList;
}

/**
 * Password reveal toggle buttons
 */
function setupPasswordToggles() {
  var toggles = [
    { btnId: "toggle-password", inputId: "password" },
    { btnId: "toggle-reg-password", inputId: "reg-password" },
    { btnId: "toggle-confirm-password", inputId: "confirm-password" }
  ];

  toggles.forEach(function (item) {
    var btn = document.getElementById(item.btnId);
    var input = document.getElementById(item.inputId);
    if (!btn || !input) return;

    btn.addEventListener("click", function () {
      var isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.textContent = isPassword ? "🙈" : "👁";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
      btn.setAttribute("title", isPassword ? "Hide password" : "Show password");
    });
  });
}

// Bind event handlers on load
document.addEventListener("DOMContentLoaded", function () {
  setupPasswordToggles();

  var loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  var registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  // Clear errors when typing
  var inputs = document.querySelectorAll("input");
  inputs.forEach(function (input) {
    input.addEventListener("input", function () {
      var group = this.closest(".form-group");
      if (group) group.classList.remove("has-error");
    });
  });

  // Forgot password link
  var forgotLink = document.getElementById("link-forgot");
  if (forgotLink) {
    forgotLink.addEventListener("click", function (e) {
      e.preventDefault();
      showToast("Password recovery: Please register a new account or sign in with your credentials.", "info", 3500);
    });
  }
});
