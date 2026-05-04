// js/send.js
const user = BankingService.getCurrentUser();
if (!user) window.location.href = "login.html";

let pendingTransfer = null;
let pinAttempts = 0;
let throttleTimer = null;
const MAX_PIN_ATTEMPTS = 3;
const THROTTLE_SECONDS = 30;

const confirmBtn = document.getElementById("confirmTransfer");
const pinDigits = [
  document.getElementById("pinDigit1"),
  document.getElementById("pinDigit2"),
  document.getElementById("pinDigit3"),
  document.getElementById("pinDigit4")
];
const pinErrorEl = document.getElementById("pinError");
const throttleMsgEl = document.getElementById("throttleMsg");

function sanitizeAmount(raw) {
  let cleaned = raw.replace(/[^0-9.]+/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return { valid: false, value: NaN };
  return { valid: true, value: num };
}

pinDigits.forEach((input, idx) => {
  input.addEventListener("input", (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val.slice(0,1);
    if (val && idx < 3) pinDigits[idx+1].focus();
    checkPIN();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !e.target.value && idx > 0) {
      pinDigits[idx-1].focus();
    }
  });
});

function checkPIN() {
  const complete = pinDigits.every(inp => inp.value.trim() !== '');
  confirmBtn.disabled = !complete || throttleTimer !== null;
  pinErrorEl.textContent = '';
}

function resetPIN() {
  pinDigits.forEach(inp => inp.value = '');
  pinDigits[0].focus();
}

function startThrottle() {
  confirmBtn.disabled = true;
  throttleMsgEl.style.display = 'block';
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    throttleMsgEl.style.display = 'none';
    pinAttempts = 0;
    checkPIN();
  }, THROTTLE_SECONDS * 1000);
}

function logSecurityAlert(message) {
  BankingService.recordTransaction({
    type: 'security_alert',
    from: user.accountNumber,
    to: null,
    amount: 0,
    name: message,
    category: 'Security',
    status: 'alert'
  });
}

document.getElementById("sendForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const recipientAcc = document.getElementById("recipientAccount").value.trim();
  const rawAmount = document.getElementById("amount").value;
  const sanitized = sanitizeAmount(rawAmount);
  if (!sanitized.valid) return alert("Please enter a valid positive amount.");
  const amount = sanitized.value;

  const users = BankingService.getUsers();
  const receiver = users.find(u => u.accountNumber === recipientAcc);
  if (!receiver) return alert("Recipient account not found");
  if (receiver.email === user.email) return alert("You cannot send to yourself");

  try {
    BankingService.validateFunds(user.email, amount);
  } catch (err) {
    return alert(err.message);
  }

  pendingTransfer = {
    recipientAcc,
    amount,
    receiverName: receiver.name,
    receiverEmail: receiver.email
  };

  document.getElementById("confirmRecipient").textContent = receiver.name;
  document.getElementById("confirmAmount").textContent = `₦${amount.toLocaleString()}`;
  document.getElementById("confirmModal").style.display = "flex";
  resetPIN();
  pinAttempts = 0;
  checkPIN();
});

document.getElementById("cancelTransfer").addEventListener("click", () => {
  document.getElementById("confirmModal").style.display = "none";
  pendingTransfer = null;
  resetPIN();
});

confirmBtn.addEventListener("click", function() {
  if (!pendingTransfer || confirmBtn.disabled) return;
  const pin = pinDigits.map(inp => inp.value).join('');
  const storedPin = user.transactionPin || "0000";

  if (pin !== storedPin) {
    pinAttempts++;
    pinErrorEl.textContent = `Incorrect PIN. ${MAX_PIN_ATTEMPTS - pinAttempts} attempts left.`;
    resetPIN();
    if (pinAttempts >= MAX_PIN_ATTEMPTS) {
      logSecurityAlert("Multiple failed PIN attempts on transfer");
      startThrottle();
    }
    return;
  }

  try {
    BankingService.executeTransfer(user.email, pendingTransfer.recipientAcc, pendingTransfer.amount, 'Transfer');
    document.getElementById("confirmModal").style.display = "none";
    alert("Transfer successful!");
    window.location.href = "dashboard.html";
  } catch (err) {
    alert("Transfer failed: " + err.message);
  }
});

// Close modal on background click
window.addEventListener("click", function(e) {
  const modal = document.getElementById("confirmModal");
  if (e.target === modal) {
    modal.style.display = "none";
    pendingTransfer = null;
    resetPIN();
  }
});
