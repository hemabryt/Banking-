// js/dashboard.js
const user = BankingService.getCurrentUser();
if (!user) window.location.href = "login.html";

let privacy = false;

window.addEventListener("load", () => {
  setTimeout(() => {
    document.getElementById("balanceSkeleton").style.display = "none";
    document.getElementById("balanceCard").style.display = "block";
    document.getElementById("txnSkeleton").style.display = "none";
    document.getElementById("transactionsSection").style.display = "block";
    document.getElementById("insightsSection").style.display = "block";
    document.getElementById("txnSearchContainer").style.display = "block";
    populateDashboard();
  }, 1000);
});

function populateDashboard() {
  document.getElementById("userName").textContent = user.name;
  updateBalanceDisplay();
  generateSparkline();
  generateInsights();
  loadTransactions();
}

function updateBalanceDisplay() {
  const balEl = document.getElementById("balance");
  const acctEl = document.getElementById("accountNumber");
  if (privacy) {
    balEl.textContent = "₦****";
    acctEl.textContent = "*********";
  } else {
    balEl.textContent = `₦${user.balance.toLocaleString()}`;
    acctEl.textContent = user.accountNumber;
  }
}

function togglePrivacy() {
  privacy = !privacy;
  updateBalanceDisplay();
  const icon = document.getElementById("toggleBalance");
  icon.classList.toggle("fa-eye-slash", !privacy);
  icon.classList.toggle("fa-eye", privacy);
}

function copyAccount() {
  navigator.clipboard.writeText(user.accountNumber).then(() => alert("Account number copied!"));
}

function fundAccount() {
  const amount = parseFloat(prompt("How much do you want to add?"));
  if (isNaN(amount) || amount <= 0) return alert("Enter a valid amount");
  try {
    BankingService.fundAccount(user.email, amount);
    // Update local user object
    const updatedUser = BankingService.getCurrentUser();
    if (updatedUser) {
      user.balance = updatedUser.balance;
      localStorage.setItem("currentUser", JSON.stringify(user));
    }
    window.location.reload();
  } catch (err) {
    alert(err.message);
  }
}

function generateSparkline() {
  const svg = document.getElementById("sparkline");
  if (!svg) return;
  const points = [];
  let val = user.balance - 20000;
  for (let i = 0; i < 6; i++) {
    val += (Math.random() - 0.3) * 5000;
    points.push(val);
  }
  points.push(user.balance);
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const polyPoints = points.map((p, i) => `${(i/(points.length-1))*100},${30 - ((p-min)/range)*20}`).join(' ');
  svg.innerHTML = `<polyline points="${polyPoints}" fill="none" stroke="rgba(0,0,0,0.7)" stroke-width="2"/>`;
}

function generateInsights() {
  const txns = BankingService.getTransactions();
  const categories = { "Bills": 0, "Transfers": 0, "Top-ups": 0, "Others": 0 };
  txns.forEach(t => {
    if (t.from === user.accountNumber) {
      if (t.category === "Utilities" || t.type === "bill") categories["Bills"] += t.amount;
      else if (t.category === "Transfer") categories["Transfers"] += t.amount;
      else if (t.category === "Top-up" || t.type === "fund") categories["Top-ups"] += t.amount;
      else categories["Others"] += t.amount;
    }
  });
  const total = Object.values(categories).reduce((a,b)=>a+b,0);
  document.getElementById("totalSpent").textContent = total.toLocaleString();
  const legend = document.getElementById("legend");
  legend.innerHTML = "";
  const colors = ["#F87171", "#60A5FA", "#4ADE80", "#FACC15"];
  const keys = Object.keys(categories);
  keys.forEach((key,i) => {
    if (categories[key] > 0 || total === 0) {
      legend.innerHTML += `<div class="legend-item"><span class="legend-color" style="background:${colors[i]}"></span>${key} ‒ ₦${categories[key].toLocaleString()}</div>`;
    }
  });
  // Basic donut visualization
  const circle = document.querySelector(".donut-svg circle");
  if (circle && total > 0) {
    let cumulative = 0;
    const conicParts = keys.map((key,i) => {
      const percent = (categories[key]/total)*100;
      const start = cumulative;
      cumulative += percent;
      return `${colors[i]} ${start}% ${cumulative}%`;
    });
    circle.style.background = `conic-gradient(${conicParts.join(",")})`;
    circle.setAttribute("stroke", "transparent");
    circle.style.strokeDasharray = "251.2";
    circle.style.strokeDashoffset = "0";
  }
}

function loadTransactions() {
  const list = document.getElementById("transactionList");
  list.innerHTML = "";
  const allTxns = BankingService.getTransactions();
  let userTxns = allTxns.filter(t => t.from === user.accountNumber || t.to === user.accountNumber);
  userTxns.sort((a,b) => new Date(b.date) - new Date(a.date));

  if (userTxns.length === 0) {
    document.getElementById("emptyTransactions").style.display = "block";
    return;
  }
  document.getElementById("emptyTransactions").style.display = "none";
  userTxns.forEach(txn => renderTransaction(txn));
}

function renderTransaction(txn) {
  const isFromMe = txn.from === user.accountNumber;
  const isToMe = txn.to === user.accountNumber;
  let direction, sign, amountClass, statusText;

  if (isFromMe) {
    direction = 'sent';
    sign = '-';
    amountClass = 'debit-amount';
    statusText = 'Sent';
  } else if (isToMe) {
    direction = 'received';
    sign = '+';
    amountClass = 'credit-amount';
    statusText = 'Received';
  } else {
    direction = 'alert';
    sign = '';
    amountClass = '';
    statusText = 'Alert';
  }

  const displayName = isFromMe ? (txn.name || txn.to) : (txn.name || txn.from);
  const icon = isFromMe ? 'fa-arrow-up' : (isToMe ? 'fa-arrow-down' : 'fa-exclamation-triangle');
  const date = new Date(txn.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' });

  const div = document.createElement("div");
  div.className = "txn";
  div.setAttribute("data-id", txn.id);
  div.onclick = () => showReceipt(txn);

  div.innerHTML = `
    <span class="txn-status ${txn.status === 'successful' ? 'success' : txn.status === 'pending' ? 'pending' : 'failed'}"></span>
    <div class="txn-icon"><i class="fas ${icon}"></i></div>
    <div class="txn-info">
      <div class="txn-name">${displayName}</div>
      <div class="txn-date">${date} • ${statusText}</div>
    </div>
    <div class="${amountClass}">${sign}₦${txn.amount.toLocaleString()}</div>
  `;
  document.getElementById("transactionList").appendChild(div);
}

function filterTransactions() {
  const search = document.getElementById("transactionSearch").value.toLowerCase();
  document.querySelectorAll(".txn").forEach(item => {
    item.style.display = item.querySelector(".txn-name").textContent.toLowerCase().includes(search) ? "flex" : "none";
  });
}

// Notification panel
document.getElementById("notificationBell").addEventListener("click", (e) => {
  e.stopPropagation();
  const panel = document.getElementById("notificationPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});
document.getElementById("closeNotifications").addEventListener("click", () => {
  document.getElementById("notificationPanel").style.display = "none";
});

// QR modal
function showQR() {
  const modal = document.getElementById("qrModal");
  modal.style.display = "flex";
  if (window.QRCode) {
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
      text: user.accountNumber,
      width: 150,
      height: 150,
      colorDark: "#000",
      colorLight: "#fff",
    });
  }
}
function hideQR() { document.getElementById("qrModal").style.display = "none"; }

// Receipt modal
function showReceipt(txn) {
  const modal = document.getElementById("receiptModal");
  const body = document.getElementById("receiptBody");
  const direction = (txn.from === user.accountNumber) ? 'Sent' : (txn.to === user.accountNumber) ? 'Received' : 'Alert';
  const statusMap = { successful: 'Success', pending: 'Pending', failed: 'Failed', alert: 'Alert' };
  body.innerHTML = `
    <div><span class="label">Reference</span><span class="value">${txn.reference || 'N/A'}</span></div>
    <div><span class="label">Date</span><span class="value">${new Date(txn.date).toLocaleString()}</span></div>
    <div><span class="label">Type</span><span class="value">${direction}</span></div>
    <div><span class="label">Amount</span><span class="value">₦${txn.amount.toLocaleString()}</span></div>
    <div><span class="label">Category</span><span class="value">${txn.category || 'Transfer'}</span></div>
    <div><span class="label">Status</span><span class="value status-badge status-${direction.toLowerCase()}">${statusMap[txn.status] || txn.status}</span></div>
  `;
  modal.style.display = "flex";
}
function closeReceipt() { document.getElementById("receiptModal").style.display = "none"; }

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}
