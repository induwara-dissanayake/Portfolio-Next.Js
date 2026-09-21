// Bills Modals Handler

let cachedAccountList = [];
let cachedPaymentTypes = [];

async function fetchAccountsAndPaymentTypes() {
  try {
    const token = billsGetAuthToken();
    const headers = { Authorization: `Bearer ${token}` };

    const [accRes, payRes] = await Promise.all([
      fetch(`${window.API_BASE_URL}/accounts/accounts`, { headers }).then((r) => r.json()).catch(() => ({})),
      fetch(`${window.API_BASE_URL}/repairs/payment-types`, { headers }).then((r) => r.json()).catch(() => ({})),
    ]);

    cachedAccountList = Array.isArray(accRes.data) ? accRes.data : (Array.isArray(accRes) ? accRes : []);

    let pts = Array.isArray(payRes) ? payRes : (Array.isArray(payRes?.data) ? payRes.data : []);
    if (!pts || pts.length === 0) {
      pts = [
        { id: 1, name: "Cash" },
        { id: 2, name: "Cheque" },
        { id: 3, name: "Bank Transfer" },
        { id: 4, name: "Card" },
      ];
    }
    cachedPaymentTypes = pts;
  } catch (err) {
    console.warn("Error fetching accounts list for bill modals:", err.message);
  }
}

function closeBillsModal() {
  const container = document.getElementById("bills-modal-container");
  if (container) container.innerHTML = "";
}

// ─── ADD / EDIT BILLER MODAL ───────────────────────────────────────────────────

async function openBillerModal(billerId = null) {
  await fetchAccountsAndPaymentTypes();

  let biller = {
    name: "",
    code: "",
    category: "Electricity",
    defaultPaymentTypeId: 1, // Cash default
    defaultExpenseAccountId: "",
    contactNumber: "",
    notes: "",
  };

  if (billerId) {
    try {
      const res = await billsRequest(`/billers/${billerId}`);
      biller = res.data || biller;
    } catch (err) {
      if (typeof showNotification === "function") showNotification("Failed to fetch biller details", "error");
      return;
    }
  }

  // Categories
  const categories = ["Electricity", "Water", "Rent", "Telecom", "Internet", "Maintenance", "Vendor", "Other"];
  let catOptions = "";
  categories.forEach((cat) => {
    catOptions += `<option value="${cat}" ${biller.category === cat ? "selected" : ""}>${cat}</option>`;
  });

  // Default Payment Methods from cached payment types
  let payTypeOptions = "";
  (cachedPaymentTypes || []).forEach((pt) => {
    const sel = String(biller.defaultPaymentTypeId) === String(pt.id) ? "selected" : "";
    payTypeOptions += `<option value="${pt.id}" ${sel}>${escapeHtml(pt.name)}</option>`;
  });

  // Bank subaccounts
  const bankAccs = typeof filterBankSubAccounts === "function"
    ? filterBankSubAccounts(cachedAccountList)
    : cachedAccountList.filter((a) => a.accountCode && a.accountCode.startsWith("11"));

  let bankAccOptions = `<option value="">Select Default Bank Account...</option>`;
  bankAccs.forEach((acc) => {
    bankAccOptions += `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`;
  });

  // Expense Accounts (Type = Expenses, 5000 series)
  const expenseAccs = cachedAccountList.filter(
    (a) => a.accountType?.name === "Expenses" || (a.accountCode && a.accountCode.startsWith("5"))
  );
  let expAccOptions = `<option value="">Select Expense Account...</option>`;
  expenseAccs.forEach((acc) => {
    const sel = String(biller.defaultExpenseAccountId) === String(acc.id) || (!biller.defaultExpenseAccountId && acc.accountCode === "5300") ? "selected" : "";
    expAccOptions += `<option value="${acc.id}" ${sel}>${acc.accountCode} - ${acc.accountName}</option>`;
  });

  const modalHtml = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto content-fade-in">
      <div class="bg-white rounded-xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${billerId ? "Edit Saved Biller" : "Add New Saved Biller"}</h3>
            <p class="text-xs text-gray-500">Configure default payment method and expense ledger account</p>
          </div>
          <button onclick="closeBillsModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="biller-form" onsubmit="submitBillerForm(event, ${billerId || 'null'})" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Biller / Service Provider Name <span class="text-red-500">*</span></label>
            <input type="text" id="biller-name" value="${biller.name || ''}" placeholder="e.g. CEB Electricity, NWSDB Water, Office Rent" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select id="biller-category" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                ${catOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Account / Consumer #</label>
              <input type="text" id="biller-code" value="${biller.code || ''}" placeholder="e.g. ACC-883719" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Default Payment Method <span class="text-red-500">*</span></label>
              <select id="biller-payment-type" onchange="onBillerPaymentTypeChange()" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                ${payTypeOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Contact Number</label>
              <input type="text" id="biller-contact" value="${biller.contactNumber || ''}" placeholder="0712345678" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- Dynamic Bank Account Container for Saved Biller -->
          <div id="biller-bank-account-container" class="hidden">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Default Bank Account <span class="text-red-500">*</span></label>
            <select id="biller-bank-select" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${bankAccOptions}
            </select>
          </div>

          <!-- Dynamic Cheque Container for Saved Biller -->
          <div id="biller-cheque-container" class="hidden">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Cheque Number / Reference</label>
            <input type="text" id="biller-cheque-input" placeholder="e.g. Default Cheque Info" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Default Expense Account (Chart of Accounts)</label>
            <select id="biller-expense-account" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${expAccOptions}
            </select>
            <p class="text-[11px] text-gray-400 mt-1">This account will be debited automatically when receiving bills from this biller.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Notes / Remarks</label>
            <textarea id="biller-notes" rows="2" placeholder="Optional internal notes..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">${biller.notes || ''}</textarea>
          </div>

          <!-- Buttons -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button type="button" onclick="closeBillsModal()" class="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" class="btn-primary px-5 py-2 text-sm text-white">
              ${billerId ? "Update Biller" : "Save Biller"}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("bills-modal-container").innerHTML = modalHtml;
  feather.replace();
  onBillerPaymentTypeChange();
}

function onBillerPaymentTypeChange() {
  const selectEl = document.getElementById("biller-payment-type");
  const bankWrap = document.getElementById("biller-bank-account-container");
  const chequeWrap = document.getElementById("biller-cheque-container");

  if (!selectEl) return;

  const typeId = selectEl.value;
  const found = (cachedPaymentTypes || []).find((pt) => String(pt.id) === String(typeId));
  const typeName = (found?.name || selectEl.options[selectEl.selectedIndex]?.text || "").trim();

  const isBankTransfer = /^bank\s*transfer$/i.test(typeName);
  const isCheque = /^cheque$/i.test(typeName);
  const isCard = /^card$/i.test(typeName);

  const needBank = isBankTransfer || isCheque || isCard;

  if (bankWrap) {
    bankWrap.classList.toggle("hidden", !needBank);
  }

  if (chequeWrap) {
    chequeWrap.classList.toggle("hidden", !isCheque);
  }
}

async function submitBillerForm(event, billerId) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("biller-name").value,
    category: document.getElementById("biller-category").value,
    code: document.getElementById("biller-code").value,
    defaultPaymentTypeId: document.getElementById("biller-payment-type").value,
    defaultExpenseAccountId: document.getElementById("biller-expense-account").value,
    contactNumber: document.getElementById("biller-contact").value,
    notes: document.getElementById("biller-notes").value,
  };

  try {
    if (billerId) {
      await billsRequest(`/billers/${billerId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (typeof showNotification === "function") showNotification("Biller updated successfully", "success");
    } else {
      await billsRequest("/billers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (typeof showNotification === "function") showNotification("Biller added successfully", "success");
    }

    closeBillsModal();
    await loadBillersData();
  } catch (err) {
    if (typeof showNotification === "function") showNotification(err.message, "error");
  }
}

// ─── RECEIVE / CREATE BILL INVOICE MODAL ───────────────────────────────────────

async function openCreateBillModal(preselectedBillerId = null) {
  await fetchAccountsAndPaymentTypes();

  if (!billsData.billers || billsData.billers.length === 0) {
    await loadBillersData(false);
  }

  const billers = billsData.billers || [];

  let billerOptions = `<option value="">-- Select Biller --</option>`;
  billers.forEach((b) => {
    const sel = String(preselectedBillerId) === String(b.id) ? "selected" : "";
    billerOptions += `<option value="${b.id}" ${sel}>${b.name} (${b.category || 'Vendor'})</option>`;
  });

  const todayDate = new Date();
  const todayStr = todayDate.toISOString().slice(0, 10);
  const currentMonthStr = todayDate.toISOString().slice(0, 7); // e.g. "2026-08"

  const nextMonthDate = new Date();
  nextMonthDate.setDate(nextMonthDate.getDate() + 30);
  const dueStr = nextMonthDate.toISOString().slice(0, 10);

  // Default expense accounts
  const expenseAccs = cachedAccountList.filter(
    (a) => a.accountType?.name === "Expenses" || (a.accountCode && a.accountCode.startsWith("5"))
  );
  let expAccOptions = `<option value="">Select Expense Account...</option>`;
  expenseAccs.forEach((acc) => {
    expAccOptions += `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`;
  });

  const modalHtml = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto content-fade-in">
      <div class="bg-white rounded-xl shadow-xl border border-gray-100 max-w-xl w-full overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Receive / Create Bill Invoice</h3>
            <p class="text-xs text-gray-500">Record a bill received from vendor/biller and hold for payment</p>
          </div>
          <button onclick="closeBillsModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Form -->
        <form id="create-bill-form" onsubmit="submitCreateBillForm(event)" class="p-6 space-y-4">
          <!-- Biller Selection -->
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Biller / Service Provider <span class="text-red-500">*</span></label>
            <select id="bill-biller-select" onchange="onBillerSelectionChange()" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${billerOptions}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Bill Reference / Number</label>
              <input type="text" id="bill-number-input" placeholder="Auto-generated if blank" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Billing Period <span class="text-red-500">*</span></label>
              <input type="month" id="bill-period-input" value="${currentMonthStr}" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Bill Received Date <span class="text-red-500">*</span></label>
              <input type="date" id="bill-date-input" value="${todayStr}" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Payment Due Date</label>
              <input type="date" id="bill-due-input" value="${dueStr}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Expense Account <span class="text-red-500">*</span></label>
              <select id="bill-expense-account-select" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                ${expAccOptions}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Total Bill Amount (LKR) <span class="text-red-500">*</span></label>
              <input type="number" step="0.01" id="bill-amount-input" placeholder="0.00" required class="w-full px-3 py-2 text-sm font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          <!-- Default Payment Info Hint -->
          <div id="biller-info-box" class="hidden p-3 bg-blue-50/70 border border-blue-100 rounded-lg text-xs text-blue-800">
            <span class="font-bold">Default Payment Method:</span> <span id="biller-default-payment-name">-</span>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Notes / Description</label>
            <textarea id="bill-notes-input" rows="2" placeholder="e.g. Monthly electricity reading bill received today..." class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
          </div>

          <!-- Buttons -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button type="button" onclick="closeBillsModal()" class="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" class="btn-primary px-5 py-2 text-sm text-white">
              Save Bill Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("bills-modal-container").innerHTML = modalHtml;
  feather.replace();

  if (preselectedBillerId) {
    onBillerSelectionChange();
  }
}

function onBillerSelectionChange() {
  const billerId = document.getElementById("bill-biller-select")?.value;
  const billers = billsData.billers || [];
  const selected = billers.find((b) => String(b.id) === String(billerId));

  const infoBox = document.getElementById("biller-info-box");
  const payNameEl = document.getElementById("biller-default-payment-name");
  const expAccSelect = document.getElementById("bill-expense-account-select");

  if (selected) {
    if (selected.defaultExpenseAccountId && expAccSelect) {
      expAccSelect.value = selected.defaultExpenseAccountId;
    }
    if (infoBox && payNameEl) {
      payNameEl.textContent = selected.defaultPaymentType?.name || "Cash";
      infoBox.classList.remove("hidden");
    }
  } else if (infoBox) {
    infoBox.classList.add("hidden");
  }
}

async function submitCreateBillForm(event) {
  event.preventDefault();

  const payload = {
    billerId: document.getElementById("bill-biller-select").value,
    billNumber: document.getElementById("bill-number-input").value,
    billingPeriod: document.getElementById("bill-period-input").value,
    billDate: document.getElementById("bill-date-input").value,
    dueDate: document.getElementById("bill-due-input").value,
    expenseAccountId: document.getElementById("bill-expense-account-select").value,
    totalAmount: document.getElementById("bill-amount-input").value,
    notes: document.getElementById("bill-notes-input").value,
  };

  try {
    await billsRequest("/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (typeof showNotification === "function") showNotification("Bill invoice recorded successfully", "success");
    closeBillsModal();
    await loadBillsData();
  } catch (err) {
    if (typeof showNotification === "function") showNotification(err.message, "error");
  }
}

// ─── RECORD BILL PAYMENT MODAL ────────────────────────────────────────────────

async function openRecordBillPaymentModal(billId) {
  await fetchAccountsAndPaymentTypes();

  let bill = null;
  try {
    const res = await billsRequest(`/${billId}`);
    bill = res.data?.bill || res.data;
  } catch (err) {
    if (typeof showNotification === "function") showNotification("Failed to fetch bill details", "error");
    return;
  }

  if (!bill) return;

  const total = Number(bill.totalAmount || 0);
  const paid = Number(bill.paidAmount || 0);
  const balance = Number(bill.balance || 0);

  // Bank subaccounts (children of Bank 1100 or Code 11xx)
  const bankAccs = typeof filterBankSubAccounts === "function"
    ? filterBankSubAccounts(cachedAccountList)
    : cachedAccountList.filter((a) => a.accountCode && a.accountCode.startsWith("11"));

  let bankAccOptions = `<option value="">Select Bank Account...</option>`;
  bankAccs.forEach((acc) => {
    bankAccOptions += `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`;
  });

  // Payment type dropdown options
  const defaultPayTypeId = bill.biller?.defaultPaymentTypeId || 1;
  let payTypeOptions = "";
  (cachedPaymentTypes || []).forEach((pt) => {
    const sel = String(defaultPayTypeId) === String(pt.id) ? "selected" : "";
    payTypeOptions += `<option value="${pt.id}" ${sel}>${escapeHtml(pt.name)}</option>`;
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  // Determine initial visibility
  const defaultPtObj = (cachedPaymentTypes || []).find((pt) => String(pt.id) === String(defaultPayTypeId));
  const defaultPtName = (defaultPtObj?.name || "").toLowerCase();
  const isDefaultBankTransfer = /^bank\s*transfer$/i.test(defaultPtName);
  const isDefaultCheque = /^cheque$/i.test(defaultPtName);
  const isDefaultCard = /^card$/i.test(defaultPtName);
  const needBankInit = isDefaultBankTransfer || isDefaultCheque || isDefaultCard;

  const modalHtml = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto content-fade-in">
      <div class="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Record Bill Settlement</h3>
            <p class="text-xs text-gray-500">Bill #${bill.billNumber} • ${bill.biller?.name || ''}</p>
          </div>
          <button onclick="closeBillsModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Bill Amount Summary Card -->
        <div class="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs">
          <div>
            <span class="text-gray-500">Total Bill:</span> <span class="font-semibold text-gray-800">${formatCurrency(total)}</span>
            ${paid > 0 ? `<div class="text-emerald-700">Already Paid: ${formatCurrency(paid)}</div>` : ""}
          </div>
          <div class="text-right">
            <span class="text-gray-500 block">Remaining Balance:</span>
            <span class="text-base font-bold text-emerald-800">${formatCurrency(balance)}</span>
          </div>
        </div>

        <!-- Form -->
        <form id="pay-bill-form" onsubmit="submitRecordBillPaymentForm(event, ${bill.id})" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Payment Date <span class="text-red-500">*</span></label>
              <input type="date" id="pay-date-input" value="${todayStr}" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 mb-1">Payment Amount (LKR) <span class="text-red-500">*</span></label>
              <input type="number" step="0.01" id="pay-amount-input" value="${balance}" max="${balance}" required class="w-full px-3 py-2 text-sm font-bold text-emerald-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Payment Method <span class="text-red-500">*</span></label>
            <select id="pay-type-select" onchange="onPaymentTypeChange()" required class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              ${payTypeOptions}
            </select>
          </div>

          <!-- Bank Account Selection -->
          <div id="bank-account-container" class="${needBankInit ? '' : 'hidden'}">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Bank Account <span class="text-red-500">*</span></label>
            <select id="pay-bank-select" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              ${bankAccOptions}
            </select>
          </div>

          <!-- Cheque Number Field (ONLY for Cheque) -->
          <div id="cheque-number-container" class="${isDefaultCheque ? '' : 'hidden'}">
            <label class="block text-xs font-semibold text-gray-700 mb-1">Cheque Number <span class="text-red-500">*</span></label>
            <input type="text" id="pay-cheque-number-input" placeholder="e.g. CHQ-991823" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Reference / Transaction #</label>
            <input type="text" id="pay-ref-input" placeholder="Optional transaction reference" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
          </div>

          <!-- Buttons -->
          <div class="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button type="button" onclick="closeBillsModal()" class="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition">
              Settle Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById("bills-modal-container").innerHTML = modalHtml;
  feather.replace();
}

function onPaymentTypeChange() {
  const selectEl = document.getElementById("pay-type-select");
  const bankWrap = document.getElementById("bank-account-container");
  const chequeWrap = document.getElementById("cheque-number-container");
  const chequeInput = document.getElementById("pay-cheque-number-input");

  if (!selectEl) return;

  const typeId = selectEl.value;
  const found = (cachedPaymentTypes || []).find((pt) => String(pt.id) === String(typeId));
  const typeName = (found?.name || selectEl.options[selectEl.selectedIndex]?.text || "").trim();

  const isBankTransfer = /^bank\s*transfer$/i.test(typeName);
  const isCheque = /^cheque$/i.test(typeName);
  const isCard = /^card$/i.test(typeName);

  const needBank = isBankTransfer || isCheque || isCard;

  if (bankWrap) {
    bankWrap.classList.toggle("hidden", !needBank);
  }

  if (chequeWrap) {
    chequeWrap.classList.toggle("hidden", !isCheque);
    if (!isCheque && chequeInput) {
      chequeInput.value = "";
    }
  }
}

async function submitRecordBillPaymentForm(event, billId) {
  event.preventDefault();

  const selectEl = document.getElementById("pay-type-select");
  const typeId = selectEl ? selectEl.value : null;
  const found = (cachedPaymentTypes || []).find((pt) => String(pt.id) === String(typeId));
  const typeName = (found?.name || selectEl?.options[selectEl?.selectedIndex]?.text || "").trim();

  const isBankTransfer = /^bank\s*transfer$/i.test(typeName);
  const isCheque = /^cheque$/i.test(typeName);
  const isCard = /^card$/i.test(typeName);

  const bankAccountId = document.getElementById("pay-bank-select")?.value;
  const chequeNumber = document.getElementById("pay-cheque-number-input")?.value?.trim();

  if ((isBankTransfer || isCheque || isCard) && !bankAccountId) {
    if (typeof showNotification === "function") showNotification("Please select a bank account", "error");
    return;
  }

  if (isCheque && !chequeNumber) {
    if (typeof showNotification === "function") showNotification("Please enter the cheque number", "error");
    return;
  }

  const payload = {
    paymentDate: document.getElementById("pay-date-input").value,
    amount: document.getElementById("pay-amount-input").value,
    paymentTypeId: typeId,
    bankAccountId: isBankTransfer || isCheque || isCard ? bankAccountId : null,
    chequeNumber: isCheque ? chequeNumber : null,
    referenceNo: document.getElementById("pay-ref-input")?.value || null,
  };

  try {
    await billsRequest(`/${billId}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (typeof showNotification === "function") showNotification("Bill payment recorded successfully", "success");
    closeBillsModal();
    await loadBillsData();
  } catch (err) {
    if (typeof showNotification === "function") showNotification(err.message, "error");
  }
}

// ─── VIEW BILL DETAILS MODAL ───────────────────────────────────────────────────

async function openViewBillModal(billId) {
  let bill = null;

  try {
    const res = await billsRequest(`/${billId}`);
    bill = res.data?.bill || res.data;
  } catch (err) {
    if (typeof showNotification === "function") showNotification("Failed to fetch bill details", "error");
    return;
  }

  if (!bill) return;

  const total = Number(bill.totalAmount || 0);
  const paid = Number(bill.paidAmount || 0);
  const balance = Number(bill.balance || 0);
  const payments = bill.payments || [];

  // Payments timeline
  let paymentRows = "";
  if (payments.length === 0) {
    paymentRows = `<tr><td colspan="4" class="px-4 py-4 text-center text-xs text-gray-400">No payment transactions recorded yet.</td></tr>`;
  } else {
    payments.forEach((p) => {
      const details = [];
      if (p.bankAccount) details.push(p.bankAccount.accountName);
      if (p.chequeNumber) details.push(`Chq: ${p.chequeNumber}`);
      if (p.referenceNo) details.push(`Ref: ${p.referenceNo}`);

      paymentRows += `
        <tr class="border-b border-gray-100 text-xs">
          <td class="px-4 py-2.5 text-gray-600">${formatDate(p.paymentDate)}</td>
          <td class="px-4 py-2.5 font-semibold text-gray-800">${p.paymentType?.name || 'Cash'} ${details.length ? `(${details.join(', ')})` : ''}</td>
          <td class="px-4 py-2.5 text-gray-500">${p.chequeNumber || p.referenceNo || '-'}</td>
          <td class="px-4 py-2.5 text-right font-bold text-emerald-600">${formatCurrency(p.amount)}</td>
        </tr>
      `;
    });
  }

  const modalHtml = `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto content-fade-in">
      <div class="bg-white rounded-xl shadow-xl border border-gray-100 max-w-2xl w-full overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900">Bill Invoice Details</h3>
            <p class="text-xs text-gray-500">Bill #${bill.billNumber} • ${bill.biller?.name || ''}</p>
          </div>
          <button onclick="closeBillsModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200 transition">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <!-- Overview Cards -->
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p class="text-[11px] text-gray-400 uppercase font-semibold">Total Amount</p>
              <p class="text-base font-bold text-gray-900 mt-0.5">${formatCurrency(total)}</p>
            </div>
            <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <p class="text-[11px] text-emerald-600 uppercase font-semibold">Paid Amount</p>
              <p class="text-base font-bold text-emerald-700 mt-0.5">${formatCurrency(paid)}</p>
            </div>
            <div class="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <p class="text-[11px] text-rose-600 uppercase font-semibold">Balance Held</p>
              <p class="text-base font-bold text-rose-700 mt-0.5">${formatCurrency(balance)}</p>
            </div>
          </div>

          <!-- Bill Meta -->
          <div class="grid grid-cols-2 gap-4 text-xs bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div>
              <span class="text-gray-400">Biller Name:</span> <span class="font-semibold text-gray-800">${bill.biller?.name || '-'}</span>
            </div>
            <div>
              <span class="text-gray-400">Billing Period:</span> <span class="font-semibold text-gray-800">${bill.billingPeriod || '-'}</span>
            </div>
            <div>
              <span class="text-gray-400">Received Date:</span> <span class="font-semibold text-gray-800">${formatDate(bill.billDate)}</span>
            </div>
            <div>
              <span class="text-gray-400">Due Date:</span> <span class="font-semibold text-gray-800">${formatDate(bill.dueDate)}</span>
            </div>
            <div class="col-span-2">
              <span class="text-gray-400">Expense Account:</span> <span class="font-semibold text-gray-800">${bill.expenseAccount ? `${bill.expenseAccount.accountCode} - ${bill.expenseAccount.accountName}` : '-'}</span>
            </div>
          </div>

          <!-- Payment History -->
          <div>
            <h4 class="text-sm font-bold text-gray-900 mb-2">Payment Settlement History</h4>
            <div class="border border-gray-100 rounded-xl overflow-hidden">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase">
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Method</th>
                    <th class="px-4 py-2">Reference</th>
                    <th class="px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button onclick="closeBillsModal()" class="btn-secondary px-4 py-2 text-sm">
            Close
          </button>
          ${bill.status !== "Paid" && bill.status !== "Cancelled" ? `
            <button onclick="closeBillsModal(); openRecordBillPaymentModal(${bill.id});" class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm">
              Settle Payment Now
            </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  document.getElementById("bills-modal-container").innerHTML = modalHtml;
  feather.replace();
}

window.onBillerPaymentTypeChange = onBillerPaymentTypeChange;
