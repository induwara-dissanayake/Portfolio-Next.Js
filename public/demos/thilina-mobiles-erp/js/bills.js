// Bills & Utilities Module Controller

let currentBillsTab = "bills-list";
let billsFilterTimeout = null;
let billsData = {
  bills: [],
  billers: [],
  payments: [],
  stats: {
    totalUnpaidAmount: 0,
    unpaidCount: 0,
    overdueCount: 0,
    paidThisMonthAmount: 0,
    activeBillersCount: 0,
  },
  filters: {
    search: "",
    billerId: "",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    page: 1,
  },
};

function billsGetAuthToken() {
  return sessionStorage.getItem("authToken") || localStorage.getItem("authToken") || "";
}

async function billsRequest(path, options = {}) {
  const token = billsGetAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${window.API_BASE_URL}/bills${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Request failed with status ${response.status}`);
  }
  return body;
}

function formatCardNumber(val) {
  const num = Math.round(parseFloat(val) || 0);
  return num.toLocaleString("en-US");
}

function formatCurrency(val) {
  const num = parseFloat(val) || 0;
  return `Rs. ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(val) {
  const num = parseFloat(val) || 0;
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── INITIALIZE MODULE ─────────────────────────────────────────────────────────

async function initializeBillsModule() {
  const dynamicContent = document.getElementById("dynamic-content");
  if (!dynamicContent) return;

  dynamicContent.innerHTML = generateBillsModuleLayout();
  feather.replace();

  await loadBillsData();
  await loadBillersData(false);
}

function generateBillsModuleLayout() {
  return `
    <div class="content-fade-in p-6 space-y-6">
      <!-- Top Action & Title Bar (Product Module Header Style) -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Bills & Utilities</h1>
          <p class="text-sm text-gray-500 mt-1">Manage utility billers, accrual bill invoices, and payment settlements</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button onclick="downloadBillsPDF()" class="btn-secondary px-3 py-2 rounded-lg inline-flex items-center text-sm" title="Export PDF">
            <i data-feather="download" class="w-4 h-4 mr-1.5"></i> PDF
          </button>
          <button onclick="downloadBillsXL()" class="btn-secondary px-3 py-2 rounded-lg inline-flex items-center text-sm" title="Export XL">
            <i data-feather="file-text" class="w-4 h-4 mr-1.5"></i> XL
          </button>
          <button onclick="openBillerModal()" class="btn-secondary px-4 py-2 rounded-lg inline-flex items-center text-sm font-medium">
            <i data-feather="plus" class="w-4 h-4 mr-1.5"></i> Add Biller
          </button>
          <button onclick="openCreateBillModal()" class="btn-primary px-4 py-2 text-white rounded-lg inline-flex items-center text-sm font-medium shadow-sm">
            <i data-feather="plus-circle" class="w-4 h-4 mr-1.5"></i> Receive / Create Bill
          </button>
        </div>
      </div>

      <!-- Header Stats Summary Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between transition hover:shadow-md">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Unpaid Bills Balance</p>
            <h3 id="stat-unpaid-amount" class="text-2xl font-bold text-red-600 mt-1">0</h3>
            <p id="stat-unpaid-count" class="text-xs text-gray-500 mt-1">0 pending bills</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
            <i data-feather="alert-circle" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between transition hover:shadow-md">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Overdue Bills</p>
            <h3 id="stat-overdue-count" class="text-2xl font-bold text-amber-600 mt-1">0</h3>
            <p class="text-xs text-gray-500 mt-1">Past due date</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
            <i data-feather="clock" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between transition hover:shadow-md">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid This Month</p>
            <h3 id="stat-paid-month" class="text-2xl font-bold text-emerald-600 mt-1">0</h3>
            <p class="text-xs text-gray-500 mt-1">Settled payments</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <i data-feather="check-circle" class="w-6 h-6"></i>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center justify-between transition hover:shadow-md">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Billers</p>
            <h3 id="stat-active-billers" class="text-2xl font-bold text-blue-600 mt-1">0</h3>
            <p class="text-xs text-gray-500 mt-1">CEB, Water, Rent, etc.</p>
          </div>
          <div class="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <i data-feather="users" class="w-6 h-6"></i>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs (Product Module Tab Bar Style) -->
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button id="tab-bills-list" onclick="switchBillsTab('bills-list')" class="tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-blue-500 text-blue-600">
            <i data-feather="file-text" class="w-4 h-4 mr-2"></i> Bills & Invoices
          </button>
          <button id="tab-billers-list" onclick="switchBillsTab('billers-list')" class="tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            <i data-feather="briefcase" class="w-4 h-4 mr-2"></i> Saved Billers
          </button>
        </nav>
      </div>

      <!-- Tab Content Area -->
      <div id="bills-tab-content">
        <!-- Dynamic content injected here -->
      </div>
    </div>

    <!-- Modals Container -->
    <div id="bills-modal-container"></div>
  `;
}

// ─── TAB SWITCHING ─────────────────────────────────────────────────────────────

function switchBillsTab(tabName) {
  currentBillsTab = tabName;

  const btnBills = document.getElementById("tab-bills-list");
  const btnBillers = document.getElementById("tab-billers-list");

  if (btnBills) {
    btnBills.className = tabName === "bills-list"
      ? "tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-blue-500 text-blue-600"
      : "tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
  }

  if (btnBillers) {
    btnBillers.className = tabName === "billers-list"
      ? "tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-blue-500 text-blue-600"
      : "tab-button border-b-2 font-medium text-sm py-3 px-1 inline-flex items-center border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";
  }

  if (tabName === "bills-list") {
    loadBillsData();
  } else if (tabName === "billers-list") {
    loadBillersData();
  }
}

// ─── LOAD BILLS LIST ──────────────────────────────────────────────────────────

async function loadBillsData(page = 1) {
  billsData.filters.page = page;
  const container = document.getElementById("bills-tab-content");
  if (!container) return;

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-400">
      <div class="loading-spinner mx-auto mb-3"></div>
      <p>Loading bill invoices...</p>
    </div>
  `;

  try {
    const query = new URLSearchParams();
    if (billsData.filters.search) query.append("search", billsData.filters.search);
    if (billsData.filters.billerId) query.append("billerId", billsData.filters.billerId);
    if (billsData.filters.status && billsData.filters.status !== "ALL") query.append("status", billsData.filters.status);
    query.append("page", page);

    const res = await billsRequest(`?${query.toString()}`);
    billsData.bills = res.data || [];
    billsData.stats = res.stats || billsData.stats;

    updateHeaderStats();
    renderBillsListLayout(container, res);
    feather.replace();
  } catch (err) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center text-red-500">
        <i data-feather="alert-circle" class="w-8 h-8 mx-auto mb-2"></i>
        <p class="font-semibold">Error loading bills</p>
        <p class="text-sm mt-1 text-gray-500">${err.message}</p>
      </div>
    `;
    feather.replace();
  }
}

function updateHeaderStats() {
  const stats = billsData.stats;
  const elUnpaid = document.getElementById("stat-unpaid-amount");
  const elUnpaidCount = document.getElementById("stat-unpaid-count");
  const elOverdue = document.getElementById("stat-overdue-count");
  const elPaidMonth = document.getElementById("stat-paid-month");
  const elActiveBillers = document.getElementById("stat-active-billers");

  if (elUnpaid) elUnpaid.textContent = formatCardNumber(stats.totalUnpaidAmount);
  if (elUnpaidCount) elUnpaidCount.textContent = `${stats.unpaidCount} pending bills`;
  if (elOverdue) elOverdue.textContent = stats.overdueCount;
  if (elPaidMonth) elPaidMonth.textContent = formatCardNumber(stats.paidThisMonthAmount);
  if (elActiveBillers) elActiveBillers.textContent = stats.activeBillersCount;
}

function renderBillsListLayout(container, resData) {
  const bills = resData.data || [];

  let billerOptions = `<option value="">All Billers</option>`;
  (billsData.billers || []).forEach((b) => {
    const sel = String(billsData.filters.billerId) === String(b.id) ? "selected" : "";
    billerOptions += `<option value="${b.id}" ${sel}>${escapeHtml(b.name)}</option>`;
  });

  const searchVal = billsData.filters.search || "";
  const statusVal = billsData.filters.status || "ALL";

  let tableRows = "";
  if (bills.length === 0) {
    tableRows = `
      <tr>
        <td colspan="7" class="px-6 py-12 text-center text-gray-400">
          <i data-feather="inbox" class="w-10 h-10 mx-auto mb-3 text-gray-300"></i>
          <p class="text-base font-medium text-gray-600">No bill invoices found</p>
          <p class="text-xs text-gray-400 mt-1">Receive a new bill from CEB, Water, Rent, or vendors to get started.</p>
          <button onclick="openCreateBillModal()" class="mt-4 btn-primary px-4 py-2 text-white text-xs font-medium inline-flex items-center rounded-lg">
            <i data-feather="plus" class="w-3.5 h-3.5 mr-1"></i> Create First Bill
          </button>
        </td>
      </tr>
    `;
  } else {
    bills.forEach((bill) => {
      const total = Number(bill.totalAmount || 0);
      const paid = Number(bill.paidAmount || 0);
      const balance = Number(bill.balance || 0);

      // Status pill
      let statusBadge = "";
      if (bill.status === "Paid") {
        statusBadge = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">Paid</span>`;
      } else if (bill.status === "Partial") {
        statusBadge = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">Partially Paid</span>`;
      } else if (bill.status === "Cancelled") {
        statusBadge = `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Cancelled</span>`;
      } else {
        // Unpaid
        const isOverdue = bill.dueDate && new Date(bill.dueDate) < new Date();
        statusBadge = isOverdue
          ? `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center w-max"><i data-feather="alert-circle" class="w-3 h-3 mr-1"></i> Overdue</span>`
          : `<span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">Unpaid</span>`;
      }

      // Icon action buttons (matching Product section design)
      let actionButtons = `
        <button onclick="openViewBillModal(${bill.id})" class="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center" title="View Details & History">
          <i data-feather="eye" class="w-4 h-4"></i>
        </button>
      `;

      if (bill.status !== "Paid" && bill.status !== "Cancelled") {
        actionButtons += `
          <button onclick="openRecordBillPaymentModal(${bill.id})" class="p-1.5 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center ml-1" title="Record Settlement / Pay Bill">
            <i data-feather="dollar-sign" class="w-4 h-4"></i>
          </button>
        `;
      }

      if (bill.status === "Unpaid") {
        actionButtons += `
          <button onclick="cancelBillHandler(${bill.id})" class="p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center ml-1" title="Cancel Invoice">
            <i data-feather="x-circle" class="w-4 h-4"></i>
          </button>
        `;
      }

      tableRows += `
        <tr class="hover:bg-gray-50 group border-b border-gray-100 transition">
          <td class="px-6 py-4 text-sm font-semibold text-blue-600 whitespace-nowrap">
            ${escapeHtml(bill.billNumber)}
            ${bill.billingPeriod ? `<div class="text-xs font-normal text-gray-400">${escapeHtml(bill.billingPeriod)}</div>` : ""}
          </td>
          <td class="px-6 py-4 text-sm text-gray-900 font-medium">
            ${escapeHtml(bill.biller?.name || "Unknown Biller")}
            <div class="text-xs text-gray-400">${escapeHtml(bill.biller?.category || "")}</div>
          </td>
          <td class="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
            <div><span class="text-gray-400">Bill:</span> ${formatDate(bill.billDate)}</div>
            ${bill.dueDate ? `<div class="mt-0.5"><span class="text-gray-400">Due:</span> ${formatDate(bill.dueDate)}</div>` : ""}
          </td>
          <td class="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
            ${formatNumber(total)}
          </td>
          <td class="px-6 py-4 text-sm whitespace-nowrap">
            <div class="font-semibold text-gray-800">${formatNumber(balance)}</div>
            ${paid > 0 ? `<div class="text-xs text-emerald-600">Paid: ${formatNumber(paid)}</div>` : ""}
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            ${statusBadge}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 z-10 shadow-[-6px_0_8px_rgba(0,0,0,0.04)]">
            <div class="flex items-center justify-end space-x-1">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <!-- Filter Controls Bar -->
      <div class="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <!-- Search Input with live typing filter -->
          <div class="relative min-w-[220px]">
            <i data-feather="search" class="w-4 h-4 absolute left-3 top-2.5 text-gray-400"></i>
            <input
              type="text"
              id="bills-search-input"
              value="${escapeHtml(searchVal)}"
              placeholder="Search bill #, period..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              oninput="onBillsFilterChange()"
            />
          </div>

          <!-- Biller Filter -->
          <select id="bills-biller-filter" onchange="onBillsFilterChange()" class="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            ${billerOptions}
          </select>

          <!-- Status Filter -->
          <select id="bills-status-filter" onchange="onBillsFilterChange()" class="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="ALL" ${statusVal === "ALL" ? "selected" : ""}>All Statuses</option>
            <option value="Unpaid" ${statusVal === "Unpaid" ? "selected" : ""}>Unpaid</option>
            <option value="Partial" ${statusVal === "Partial" ? "selected" : ""}>Partially Paid</option>
            <option value="Paid" ${statusVal === "Paid" ? "selected" : ""}>Fully Paid</option>
            <option value="Cancelled" ${statusVal === "Cancelled" ? "selected" : ""}>Cancelled</option>
          </select>

          <!-- Clear Filters Button -->
          <button onclick="resetBillsFilters()" class="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition inline-flex items-center" title="Clear Search and Filters">
            <i data-feather="x" class="w-3.5 h-3.5 mr-1"></i> Clear
          </button>
        </div>

        <div class="text-xs text-gray-500">
          Showing <span class="font-semibold text-gray-800">${bills.length}</span> of <span class="font-semibold text-gray-800">${resData.total || bills.length}</span> bills
        </div>
      </div>

      <!-- Table (Product Module Style) -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biller</th>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Held</th>
              <th class="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 shadow-[-6px_0_8px_rgba(0,0,0,0.04)]">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function onBillsFilterChange() {
  if (billsFilterTimeout) clearTimeout(billsFilterTimeout);

  billsFilterTimeout = setTimeout(() => {
    const search = document.getElementById("bills-search-input")?.value || "";
    const billerId = document.getElementById("bills-biller-filter")?.value || "";
    const status = document.getElementById("bills-status-filter")?.value || "ALL";

    billsData.filters.search = search;
    billsData.filters.billerId = billerId;
    billsData.filters.status = status;

    loadBillsData(1);
  }, 250);
}

function resetBillsFilters() {
  billsData.filters.search = "";
  billsData.filters.billerId = "";
  billsData.filters.status = "ALL";
  loadBillsData(1);
}

async function cancelBillHandler(id) {
  if (!confirm("Are you sure you want to cancel this bill invoice? This will reverse the Accounts Payable journal entry.")) return;
  try {
    await billsRequest(`/${id}/cancel`, { method: "POST" });
    if (typeof showNotification === "function") showNotification("Bill invoice cancelled successfully", "success");
    await loadBillsData();
  } catch (err) {
    if (typeof showNotification === "function") showNotification(err.message, "error");
  }
}

// ─── LOAD SAVED BILLERS ────────────────────────────────────────────────────────

async function loadBillersData(renderInTab = true) {
  try {
    const res = await billsRequest("/billers");
    billsData.billers = res.data || [];

    if (renderInTab && currentBillsTab === "billers-list") {
      const container = document.getElementById("bills-tab-content");
      if (container) renderBillersListLayout(container);
    }
  } catch (err) {
    if (renderInTab && currentBillsTab === "billers-list") {
      const container = document.getElementById("bills-tab-content");
      if (container) {
        container.innerHTML = `
          <div class="bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center text-red-500">
            <p class="font-semibold">Error loading billers</p>
            <p class="text-sm mt-1 text-gray-500">${err.message}</p>
          </div>
        `;
      }
    }
  }
}

function renderBillersListLayout(container) {
  const billers = billsData.billers || [];

  let gridCards = "";
  if (billers.length === 0) {
    gridCards = `
      <div class="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <i data-feather="briefcase" class="w-10 h-10 mx-auto mb-3 text-gray-300"></i>
        <p class="text-base font-medium text-gray-600">No saved billers</p>
        <p class="text-xs text-gray-400 mt-1">Add billers like CEB Electricity, Water Board, Landlord Rent, Dialog Telecom.</p>
        <button onclick="openBillerModal()" class="mt-4 btn-primary px-4 py-2 text-white text-xs font-medium inline-flex items-center rounded-lg">
          <i data-feather="plus" class="w-3.5 h-3.5 mr-1"></i> Add Biller
        </button>
      </div>
    `;
  } else {
    billers.forEach((biller) => {
      gridCards += `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div class="flex items-start justify-between">
              <div>
                <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-blue-50 text-blue-700">${escapeHtml(biller.category || "General")}</span>
                <h4 class="text-base font-bold text-gray-900 mt-1.5">${escapeHtml(biller.name)}</h4>
                ${biller.code ? `<p class="text-xs text-gray-400">Account #: ${escapeHtml(biller.code)}</p>` : ""}
              </div>
              <div class="w-9 h-9 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center">
                <i data-feather="briefcase" class="w-5 h-5"></i>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-400">Default Payment:</span>
                <span class="font-semibold text-gray-700">${escapeHtml(biller.defaultPaymentType?.name || "Cash")}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Default Expense:</span>
                <span class="font-semibold text-gray-700">${biller.defaultExpenseAccount ? `${biller.defaultExpenseAccount.accountCode} - ${escapeHtml(biller.defaultExpenseAccount.accountName)}` : "Utilities Expense"}</span>
              </div>
              ${biller.contactNumber ? `
                <div class="flex justify-between">
                  <span class="text-gray-400">Contact #:</span>
                  <span class="font-medium text-gray-600">${escapeHtml(biller.contactNumber)}</span>
                </div>
              ` : ""}
            </div>
          </div>

          <div class="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
            <button onclick="openCreateBillModal(${biller.id})" class="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center text-xs font-semibold" title="Receive Bill Invoice">
              <i data-feather="plus-circle" class="w-4 h-4 mr-1"></i> Receive Bill
            </button>
            <div class="flex items-center space-x-1">
              <button onclick="openBillerModal(${biller.id})" class="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center" title="Edit Biller">
                <i data-feather="edit-2" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteBillerHandler(${biller.id})" class="p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center" title="Delete Biller">
                <i data-feather="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      ${gridCards}
    </div>
  `;

  feather.replace();
}

async function deleteBillerHandler(id) {
  if (!confirm("Are you sure you want to delete this biller?")) return;
  try {
    await billsRequest(`/billers/${id}`, { method: "DELETE" });
    if (typeof showNotification === "function") showNotification("Biller deleted successfully", "success");
    await loadBillersData();
  } catch (err) {
    if (typeof showNotification === "function") showNotification(err.message, "error");
  }
}

// ─── EXPORT PDF & EXCEL ────────────────────────────────────────────────────────

function downloadBillsPDF() {
  try {
    const bills = billsData.bills || [];
    const tableData = bills.map((b) => [
      b.billNumber || "",
      b.biller?.name || "Unknown",
      b.billingPeriod || "-",
      formatDate(b.billDate),
      formatDate(b.dueDate),
      formatNumber(b.totalAmount),
      formatNumber(b.balance),
      b.status || "Unpaid",
    ]);

    const ok = typeof exportPdfWithTable === "function" ? exportPdfWithTable({
      title: "Bills & Utilities Report",
      filters: `Status: ${billsData.filters.status || "ALL"} | Biller: ${billsData.filters.billerId || "ALL"}`,
      head: ["Bill #", "Biller Name", "Period", "Bill Date", "Due Date", "Total", "Balance", "Status"],
      body: tableData,
      fileName: `bills-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Unpaid Amount: LKR ${billsData.stats.totalUnpaidAmount?.toLocaleString() || '0'} | Total Bills: ${bills.length}`,
      emptyMessage: "No bill records available to export",
    }) : false;

    if (ok && typeof showNotification === "function") {
      showNotification("Bills PDF downloaded successfully", "success");
    }
  } catch (err) {
    console.error("Error generating Bills PDF:", err);
    if (typeof showNotification === "function") showNotification("Error generating PDF", "error");
  }
}

async function downloadBillsXL() {
  try {
    const bills = billsData.bills || [];
    const tableData = bills.map((b) => [
      b.billNumber || "",
      b.biller?.name || "Unknown",
      b.billingPeriod || "-",
      formatDate(b.billDate),
      formatDate(b.dueDate),
      Number(b.totalAmount || 0),
      Number(b.paidAmount || 0),
      Number(b.balance || 0),
      b.status || "Unpaid",
    ]);

    const headers = ["Bill #", "Biller Name", "Billing Period", "Bill Date", "Due Date", "Total Amount", "Paid Amount", "Balance Held", "Status"];

    const ok = typeof exportToExcel === "function" ? exportToExcel({
      title: "Bills & Utilities Report",
      filename: `bills-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      headers,
      data: tableData,
    }) : false;

    if (ok && typeof showNotification === "function") {
      showNotification("Bills Excel downloaded successfully", "success");
    }
  } catch (err) {
    console.error("Error generating Bills Excel:", err);
    if (typeof showNotification === "function") showNotification("Error generating Excel file", "error");
  }
}

window.initializeBillsModule = initializeBillsModule;
window.switchBillsTab = switchBillsTab;
window.loadBillsData = loadBillsData;
window.loadBillersData = loadBillersData;
window.onBillsFilterChange = onBillsFilterChange;
window.resetBillsFilters = resetBillsFilters;
window.openBillerModal = openBillerModal;
window.openCreateBillModal = openCreateBillModal;
window.openRecordBillPaymentModal = openRecordBillPaymentModal;
window.openViewBillModal = openViewBillModal;
window.cancelBillHandler = cancelBillHandler;
window.deleteBillerHandler = deleteBillerHandler;
window.downloadBillsPDF = downloadBillsPDF;
window.downloadBillsXL = downloadBillsXL;
