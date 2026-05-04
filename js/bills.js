// js/bills.js
const user = BankingService.getCurrentUser();
if (!user) window.location.href = "login.html";

let billType = "airtime";

document.querySelectorAll(".bill-cat").forEach(btn => {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".bill-cat").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    billType = this.dataset.type;
    document.getElementById("billerAccount").placeholder =
      billType === "airtime" || billType === "data" ? "Phone number" : "Meter number";
  });
});

document.getElementById("billsForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const account = document.getElementById("billerAccount").value.trim();
  const rawAmount = document.getElementById("billAmount").value;
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) return alert("Enter a valid amount");

  try {
    BankingService.payBill(user.email, account, amount, billType.charAt(0).toUpperCase() + billType.slice(1));
    alert("Payment successful!");
    window.location.reload();
  } catch (err) {
    alert(err.message);
  }
});

// Load recent bill payments
(function loadRecentBills() {
  const list = document.getElementById("billsTransactionList");
  if (!list) return;
  const txns = BankingService.getTransactions().filter(t => t.type === "bill" && t.from === user.accountNumber);
  list.innerHTML = txns.length === 0 ? '<p class="empty-state">No bill payments yet</p>' : '';
  txns.slice(0,5).forEach(txn => {
    const div = document.createElement("div");
    div.className = "txn";
    div.innerHTML = `
      <span class="txn-status success"></span>
      <div class="txn-icon"><i class="fas fa-file-invoice"></i></div>
      <div class="txn-info">
        <div class="txn-name">${txn.name}</div>
        <div class="txn-date">${new Date(txn.date).toLocaleDateString()}</div>
      </div>
      <div class="debit-amount">-₦${txn.amount.toLocaleString()}</div>
    `;
    list.appendChild(div);
  });
})();
