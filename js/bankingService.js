// js/bankingService.js
const BankingService = (() => {
  const USERS_KEY = "users";
  const TRANSACTIONS_KEY = "transactions";

  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const getTransactions = () => JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) || [];
  const saveTransactions = (txns) => localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns));

  const executeAtomically = (operation) => {
    const usersBackup = getUsers();
    const txnsBackup = getTransactions();
    try {
      operation();
    } catch (error) {
      localStorage.setItem(USERS_KEY, JSON.stringify(usersBackup));
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txnsBackup));
      throw error;
    }
  };

  const validateFunds = (senderEmail, amount) => {
    const users = getUsers();
    const sender = users.find(u => u.email === senderEmail);
    if (!sender) throw new Error("Sender not found");
    if (sender.balance < amount) throw new Error("Insufficient balance");
    return sender;
  };

  const generateRef = () => {
    const prefix = "FB";
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const datePart = new Date().toISOString().slice(0,10).replace(/-/g,'');
    return `${prefix}-${randomPart}-${datePart}`;
  };

  const recordTransaction = (data) => {
    const txns = getTransactions();
    txns.push({
      id: Date.now(),
      reference: generateRef(),
      type: data.type || 'transfer',
      from: data.from || null,
      to: data.to || null,
      amount: data.amount,
      date: new Date().toISOString(),
      name: data.name || 'Unknown',
      category: data.category || 'Transfer',
      status: data.status || 'successful',
      metadata: data.metadata || {}
    });
    saveTransactions(txns);
    return txns[txns.length-1];
  };

  const executeTransfer = (senderEmail, recipientAcc, amount, category = 'Transfer') => {
    executeAtomically(() => {
      const users = getUsers();
      const sender = users.find(u => u.email === senderEmail);
      const receiver = users.find(u => u.accountNumber === recipientAcc);
      if (!receiver) throw new Error("Recipient not found");
      if (sender.accountNumber === recipientAcc) throw new Error("Cannot send to self");
      if (sender.balance < amount) throw new Error("Insufficient balance");

      sender.balance -= amount;
      receiver.balance += amount;

      const updatedUsers = users.map(u =>
        u.email === senderEmail ? sender :
        u.accountNumber === recipientAcc ? receiver : u
      );
      saveUsers(updatedUsers);

      recordTransaction({
        type: 'transfer',
        from: sender.accountNumber,
        to: receiver.accountNumber,
        amount,
        name: receiver.name,
        category,
        status: 'successful'
      });
    });
  };

  const payBill = (userEmail, billerAccount, amount, billType) => {
    executeAtomically(() => {
      const users = getUsers();
      const user = users.find(u => u.email === userEmail);
      if (!user) throw new Error("User not found");
      if (user.balance < amount) throw new Error("Insufficient funds");
      user.balance -= amount;
      saveUsers(users);
      recordTransaction({
        type: 'bill',
        from: user.accountNumber,
        to: null,
        amount,
        name: `${billType} (${billerAccount})`,
        category: 'Utilities',
        status: 'successful'
      });
    });
  };

  const fundAccount = (userEmail, amount) => {
    executeAtomically(() => {
      const users = getUsers();
      const user = users.find(u => u.email === userEmail);
      if (!user) throw new Error("User not found");
      user.balance += amount;
      saveUsers(users);
      recordTransaction({
        type: 'fund',
        from: null,
        to: user.accountNumber,
        amount,
        name: 'Wallet Top-up',
        category: 'Top-up',
        status: 'successful'
      });
    });
  };

  return {
    getUsers,
    getCurrentUser: () => JSON.parse(localStorage.getItem("currentUser")),
    validateFunds,
    executeTransfer,
    payBill,
    fundAccount,
    recordTransaction,
    getTransactions,
    generateRef
  };
})();
