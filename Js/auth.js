// js/auth.js
function generateAccountNumber() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

// SIGNUP
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    let users = getUsers();
    if (users.find(user => user.email === email)) {
      alert("User already exists");
      return;
    }

    const newUser = {
      name,
      email,
      password,
      accountNumber: generateAccountNumber(),
      balance: 50000,
      transactionPin: "0000" // default PIN for demo
    };

    users.push(newUser);
    saveUsers(users);
    alert("Account created! Redirecting to login...");
    window.location.href = "login.html";
  });
}

// LOGIN
const loginForm = document.getElementById("loginForm");
const biometricBtn = document.getElementById("biometricBtn");
const biometricSection = document.getElementById("biometricSection");
const rememberMeCheckbox = document.getElementById("rememberMe");

function updateBiometricUI() {
  const rememberedEmail = localStorage.getItem("rememberedEmail");
  if (rememberedEmail && biometricSection) {
    biometricSection.style.display = "block";
  }
}
updateBiometricUI();

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      alert("Invalid email or password");
      return;
    }

    if (rememberMeCheckbox && rememberMeCheckbox.checked) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    localStorage.setItem("currentUser", JSON.stringify(user));
    window.location.href = "dashboard.html";
  });
}

// Biometric login
if (biometricBtn) {
  biometricBtn.addEventListener("click", function () {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (!rememberedEmail) {
      alert("No remembered account. Log in manually first.");
      return;
    }

    const modal = document.getElementById("biometricModal");
    if (modal) modal.style.display = "flex";

    setTimeout(() => {
      const users = getUsers();
      const user = users.find(u => u.email === rememberedEmail);
      if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        window.location.href = "dashboard.html";
      } else {
        alert("Stored account not found. Please log in manually.");
        modal.style.display = "none";
      }
    }, 2000);
  });

  window.addEventListener("click", function (e) {
    const modal = document.getElementById("biometricModal");
    if (e.target === modal) modal.style.display = "none";
  });
}
