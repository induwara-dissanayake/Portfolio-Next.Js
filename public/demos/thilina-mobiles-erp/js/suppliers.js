// Supplier Management Module
const SUPP_API = window.API_BASE_URL || "http://localhost:3000/api";

function suppEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSuppGrnVoided(grn) {
  if (grn?.isVoided === true) return true;
  const status =
    typeof grn?.paymentStatus === "string"
      ? grn.paymentStatus
      : grn?.paymentStatus?.name || "";
  if (String(status).toLowerCase() === "voided") return true;
  return String(grn?.note || "").includes("[VOIDED");
}

function canPaySuppGrn(grn) {
  if (!grn || isSuppGrnVoided(grn)) return false;
  const statusName =
    typeof grn.paymentStatus === "string"
      ? grn.paymentStatus
      : grn.paymentStatus?.name || "";
  if (String(statusName).toLowerCase() === "paid") return false;
  return Number(grn.balance) > 0;
}

function validateSuppMobile(mobile, { required = true } = {}) {
  const m = String(mobile || "").trim();
  if (!m) {
    if (required) return "Mobile number is required";
    return null;
  }
  if (!/^0\d{9}$/.test(m)) {
    return "Mobile number must be exactly 10 digits and start with 0";
  }
  return null;
}

function suppGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    null
  );
}

async function suppRequest(path, options = {}) {
  const token = suppGetAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${SUPP_API}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      body.message || body.error || `Request failed (${res.status})`
    );
  return body.data !== undefined ? body.data : body;
}

// --- State ---
let suppliersData = [];
let filteredSuppliers = [];
let supplierStats = {
  totalSuppliers: 0,
  pendingPayments: 0,
  thisMonthPurchases: 0,
};
let paymentsData = [];
let filteredPayments = [];
let currentSupplierGrns = [];
let currentSupplierDetailId = null;
/** @type {{ id: number, name?: string, mobileNumber?: string } | null} */
let currentSupplierDetail = null;

function formatGrnDueDateLabel(grn) {
  const raw = grn?.dueDate ?? grn?.due_date;
  if (!raw) return "—";
  const iso =
    typeof raw === "string" && raw.length >= 10 ? raw.slice(0, 10) : null;
  try {
    const d = iso ? new Date(`${iso}T12:00:00`) : new Date(raw);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

function supplierDetailMetaLines() {
  const name =
    currentSupplierDetail?.name && String(currentSupplierDetail.name).trim()
      ? String(currentSupplierDetail.name).trim()
      : "—";
  const mob =
    currentSupplierDetail?.mobileNumber &&
    String(currentSupplierDetail.mobileNumber).trim()
      ? String(currentSupplierDetail.mobileNumber).trim()
      : "—";
  return { name, mobile: mob };
}
let supplierPaymentTypes = [];
let supplierBankAccounts = [];
let paymentsFilterDebounce = null;

// --- Init ---
function initializeSuppliersModule() {
  const container = document.getElementById("dynamic-content");
  if (!container) return;
  container.innerHTML = generateSuppliersContent();

  setTimeout(async () => {
    loadPaymentOptions();
    await loadSuppliersData();
    await populatePaymentStatusSelectForGrn();
    await loadPaymentsData();
    if (typeof feather !== "undefined") feather.replace();
  }, 50);

  window.downloadSupplierDirectoryPDF = downloadSupplierDirectoryPDF;
  window.downloadSupplierDirectoryXL = downloadSupplierDirectoryXL;
  window.downloadPaymentsPDF = downloadPaymentsPDF;
  window.downloadPaymentsCSV = downloadPaymentsCSV;
  window.exportSupplierDetailsPDF = exportSupplierDetailsPDF;
  window.exportSupplierDetailsXL = exportSupplierDetailsXL;
  window.clearPaymentsFilters = clearPaymentsFilters;
  window.scheduleReloadPayments = scheduleReloadPayments;
  window.switchSupplierTab = switchSupplierTab;
  window.filterSuppliers = filterSuppliers;
  window.filterPayments = filterPayments;
  window.openAddSupplierModal = openAddSupplierModal;
  window.closeSupplierModal = closeSupplierModal;
  window.saveSupplier = saveSupplier;
  window.openEditSupplierModal = openEditSupplierModal;
  window.deleteSupplier = deleteSupplier;
  window.viewSupplier = viewSupplier;
  window.closeSupplierHistoryModal = closeSupplierHistoryModal;
  window.filterSupplierGrnHistory = filterSupplierGrnHistory;
  window.clearSupplierGrnFilter = clearSupplierGrnFilter;
  window.viewPaymentDetails = viewPaymentDetails;
  window.closePaymentModal = closePaymentModal;
  window.openAddPaymentModal = openAddPaymentModal;
  window.closeAddPaymentModal = closeAddPaymentModal;
  window.submitAddPayment = submitAddPayment;
  window.toggleSupplierPaymentBankAccount = toggleSupplierPaymentBankAccount;
}

// --- HTML Template ---
function generateSuppliersContent() {
  return `
    <div class="content-fade-in p-6">
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Company Sales REP</h1>
            <p class="text-gray-600 mt-1">Manage Sales REP information, purchase history, and payments</p>
          </div>
          <button onclick="openAddSupplierModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
            <i data-feather="plus" class="w-4 h-4 mr-2"></i>Add Sales REP
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div><p class="text-gray-600 text-sm">Total Sales REPs</p>
              <p class="text-3xl font-bold text-gray-800" id="totalSuppliers">0</p></div>
            <div class="bg-blue-100 p-3 rounded-full"><i data-feather="truck" class="w-6 h-6 text-blue-600"></i></div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div><p class="text-gray-600 text-sm">Pending Payments</p>
              <p class="text-3xl font-bold text-orange-600" id="pendingPayments">0</p></div>
            <div class="bg-orange-100 p-3 rounded-full"><i data-feather="clock" class="w-6 h-6 text-orange-600"></i></div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div><p class="text-gray-600 text-sm">This Month Purchases</p>
              <p class="text-3xl font-bold text-purple-600" id="monthSpend">Rs. 0</p></div>
            <div class="bg-purple-100 p-3 rounded-full"><i data-feather="shopping-cart" class="w-6 h-6 text-purple-600"></i></div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="card mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6">
            <button onclick="switchSupplierTab('suppliers')" class="tab-button active py-4 px-1 border-b-2 font-medium text-sm" id="suppliers-tab">Sales REPs</button>
            <button onclick="switchSupplierTab('payments')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="payments-tab">Payments</button>
          </nav>
        </div>

        <!-- Suppliers Tab -->
        <div id="suppliers-content" class="tab-content">
          <div class="p-6 border-b border-gray-200">
            <div class="flex w-full flex-wrap items-center gap-3 justify-between">
              <div class="flex items-center flex-wrap gap-3 justify-start flex-1 min-w-0">
                <div class="relative flex-1 min-w-[180px] max-w-md">
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-3"></i>
                  <input id="supplierSearch" type="text" placeholder="Search Sales REPs..." oninput="filterSuppliers()" class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                </div>
              </div>
                <div class="shrink-0 ml-auto flex gap-2">
                <button onclick="downloadSupplierDirectoryPDF()" class="btn-secondary px-3 py-2 rounded-lg flex items-center text-sm">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>PDF
                </button>
                <button onclick="downloadSupplierDirectoryXL()" class="btn-secondary px-3 py-2 rounded-lg flex items-center text-sm" title="Opens in Excel">
                  <i data-feather="file-text" class="w-4 h-4 mr-2"></i>XL
                </button>
                </div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales REP</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchased</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Owed</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRNs</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="suppliersTableBody" class="bg-white divide-y divide-gray-200"></tbody>
            </table>
          </div>
        </div>

        <!-- Payments Tab -->
        <div id="payments-content" class="tab-content" style="display:none;">
          <div class="p-4 border-b border-gray-200">
            <div class="flex flex-wrap justify-between items-center gap-2 w-full">
              <div class="flex flex-wrap gap-2 items-center justify-start flex-1 min-w-0">
              <div class="relative flex-1 min-w-[200px] max-w-md">
                <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-3"></i>
                <input id="paymentsSearch" type="text" placeholder="Search GRN or sales REP..." oninput="scheduleReloadPayments()" class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              </div>
              <input type="date" id="paymentsDateFrom" title="From date" onchange="loadPaymentsData()" class="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <input type="date" id="paymentsDateTo" title="To date" onchange="loadPaymentsData()" class="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              <select id="paymentStatusFilter" onchange="loadPaymentsData()" class="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[120px]">
                <option value="">All status</option>
              </select>
              <button type="button" onclick="clearPaymentsFilters()" class="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Clear</button>
              </div>
              <div class="flex gap-2 shrink-0 ml-auto justify-end flex-wrap">
              <button onclick="downloadPaymentsPDF()" class="btn-secondary px-3 py-2 rounded-lg flex items-center text-sm whitespace-nowrap">
                <i data-feather="download" class="w-4 h-4 mr-2"></i>PDF
              </button>
              <button onclick="downloadPaymentsCSV()" class="btn-secondary px-3 py-2 rounded-lg flex items-center text-sm whitespace-nowrap" title="Opens in Excel">
                <i data-feather="file-text" class="w-4 h-4 mr-2"></i>XL
              </button>
              </div>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
                  <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN No</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales REP</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid Amount</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="paymentsTableBody" class="bg-white divide-y divide-gray-200"></tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    <!-- Payment Details Modal -->
    <div id="paymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-[60]">
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900" id="paymentModalTitle">Payment Details</h3>
          <button onclick="closePaymentModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-6 h-6"></i></button>
        </div>
        <div class="p-6"><div id="paymentDetails" class="space-y-4"></div></div>
      </div>
    </div>

    <!-- Add Payment Modal (above Supplier Details / Payment Details) -->
    <div id="addPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-[70]">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Add Payment</h3>
          <button onclick="closeAddPaymentModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-6 h-6"></i></button>
        </div>
        <form id="addPaymentForm" class="p-6 space-y-4" onsubmit="submitAddPayment(event)">
          <input type="hidden" id="addPaymentGrnId">
          <div id="addPaymentInfo" class="bg-blue-50 rounded-lg p-3 text-sm text-blue-800"></div>
          <div>
            <label class="block text-sm font-medium mb-1">Amount (Rs.) *</label>
            <input id="addPaymentAmount" required type="number" min="0.01" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Enter payment amount" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Payment Method *</label>
            <select id="addPaymentMethod" onchange="toggleSupplierPaymentBankAccount()" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Select payment method</option>
            </select>
          </div>
          <div id="addPaymentBankWrap" class="hidden">
            <label class="block text-sm font-medium mb-1">Bank Account *</label>
            <select id="addPaymentBankAccount" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Select bank account</option>
            </select>
          </div>
          <div id="addPaymentChequeWrap" class="hidden">
            <label class="block text-sm font-medium mb-1">Cheque Number *</label>
            <input id="addPaymentChequeNumber" type="text" maxlength="50" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="e.g. 123456" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Note (optional)</label>
            <input id="addPaymentNote" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="e.g. Second installment" />
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="closeAddPaymentModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" id="addPaymentSubmitBtn" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Submit Payment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add/Edit Supplier Modal -->
    <div id="supplierModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900" id="supplierModalTitle">Add Sales REP</h3>
          <button onclick="closeSupplierModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-6 h-6"></i></button>
        </div>
        <form id="supplierForm" class="p-6 space-y-4" onsubmit="saveSupplier(event)">
          <input type="hidden" id="supplierId">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <input id="supplierName" required maxlength="100" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Sales REP name" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Company Name</label>
            <input id="supplierCompanyName" maxlength="100" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Company / business name (optional)" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Mobile Number *</label>
            <input id="supplierMobile" type="tel" required pattern="0[0-9]{9}" minlength="10" maxlength="10" inputmode="numeric" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="0712345678" />
            <p class="text-xs text-gray-500 mt-1">Must be 10 digits and start with 0</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Alternate Mobile</label>
            <input id="supplierAltMobile" type="tel" pattern="0[0-9]{9}" maxlength="10" inputmode="numeric" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Alternate number (optional)" />
            <p class="text-xs text-gray-500 mt-1">If provided, must be 10 digits and start with 0</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input id="supplierEmail" type="email" maxlength="100" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Email address (optional)" />
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="closeSupplierModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Supplier Details Modal -->
    <div id="supplierHistoryModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-[94vw] max-w-6xl mx-4 max-h-[92vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Sales REP Details</h3>
          <button onclick="closeSupplierHistoryModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-6 h-6"></i></button>
        </div>
        <div class="p-6 space-y-6">
          <div>
            <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div class="flex flex-wrap gap-2 items-center justify-start min-w-0 flex-1">
                <div class="relative">
                  <input type="text" id="grnHistorySearch" placeholder="Search GRN or item..." oninput="filterSupplierGrnHistory()"
                    class="w-full sm:w-48 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-2 top-2"></i>
                </div>
                <select id="grnStatusFilter" onchange="filterSupplierGrnHistory()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500">
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                  <option value="Voided">Voided</option>
                </select>
                <input type="date" id="grnDateFrom" onchange="filterSupplierGrnHistory()" title="From date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500">
                <input type="date" id="grnDateTo" onchange="filterSupplierGrnHistory()" title="To date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500">
                <button onclick="clearSupplierGrnFilter()" class="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Clear</button>
              </div>
              <div class="flex gap-3 shrink-0 justify-end self-end sm:self-auto w-full sm:w-auto ml-0 sm:ml-auto">
                <button type="button" onclick="exportSupplierDetailsPDF()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="download" class="w-4 h-4 mr-1"></i>PDF</button>
                <button type="button" onclick="exportSupplierDetailsXL()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="file-text" class="w-4 h-4 mr-1"></i>XL</button>
              </div>
            </div>
            <div id="supplierDetailHeader" class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200"></div>
            <div id="supplierHistoryList" class="space-y-4"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Data Loading ---

async function loadSuppliersData() {
  const tbody = document.getElementById("suppliersTableBody");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  try {
    const [stats, suppliers] = await Promise.all([
      suppRequest("/suppliers/stats"),
      suppRequest("/suppliers"),
    ]);
    supplierStats = stats;
    suppliersData = suppliers;
    filterSuppliers();
    updateSupplierStats();
  } catch (err) {
    console.error("loadSuppliersData error:", err);
    showNotification("Failed to load Sales REP data", "error");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-400">Failed to load Sales REPs</td></tr>`;
  }
}

function getPaymentsQueryString() {
  const qs = new URLSearchParams();
  const s = (document.getElementById("paymentsSearch")?.value || "").trim();
  if (s) qs.set("search", s);
  const from = document.getElementById("paymentsDateFrom")?.value || "";
  const to = document.getElementById("paymentsDateTo")?.value || "";
  if (from) qs.set("dateFrom", from);
  if (to) qs.set("dateTo", to);
  const psid = document.getElementById("paymentStatusFilter")?.value || "";
  if (psid) qs.set("paymentStatusId", psid);
  qs.set("limit", "2000");
  return `?${qs.toString()}`;
}

function scheduleReloadPayments() {
  if (paymentsFilterDebounce) clearTimeout(paymentsFilterDebounce);
  paymentsFilterDebounce = setTimeout(() => {
    paymentsFilterDebounce = null;
    loadPaymentsData();
  }, 400);
}

async function populatePaymentStatusSelectForGrn() {
  const sel = document.getElementById("paymentStatusFilter");
  if (!sel) return;
  const v = sel.value;
  try {
    const rows = await suppRequest("/grn/payment-statuses");
    sel.innerHTML =
      '<option value="">All status</option>' +
      (Array.isArray(rows) ? rows : [])
        .map((s) => {
          const name = suppEscapeHtml(s.name || "");
          return `<option value="${s.id}">${name}</option>`;
        })
        .join("");
  } catch (e) {
    console.error("payment-statuses", e);
  }
  if (v && sel.querySelector(`option[value="${v}"]`)) sel.value = v;
}

function clearPaymentsFilters() {
  "paymentsSearch,paymentsDateFrom,paymentsDateTo,paymentStatusFilter"
    .split(",")
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  loadPaymentsData();
}

async function loadPaymentsData() {
  const tbody = document.getElementById("paymentsTableBody");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  try {
    const grns = await suppRequest(`/grn${getPaymentsQueryString()}`);
    paymentsData = grns;
    filteredPayments = [...paymentsData];
    renderPaymentsTable();
  } catch (err) {
    console.error("loadPaymentsData error:", err);
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-red-400">Failed to load payments</td></tr>`;
  }
}

// --- Render Functions ---

function renderSuppliersTable() {
  const tbody = document.getElementById("suppliersTableBody");
  if (!tbody) return;

  if (filteredSuppliers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No Sales REPs found</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredSuppliers
    .map((s) => {
      const initials = String(s.name || "")
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
      const owedColor =
        s.totalOwed > 0 ? "text-red-600 font-semibold" : "text-gray-700";
      return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span class="text-blue-600 font-medium text-sm">${suppEscapeHtml(
              initials
            )}</span>
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">${suppEscapeHtml(
              s.name
            )}</div>
            <div class="text-sm text-gray-500">${suppEscapeHtml(
              s.companyName || "—"
            )}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        ${suppEscapeHtml(s.mobileNumber)}<br>
        <span class="text-gray-400">${suppEscapeHtml(s.email || "—")}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${Number(
        s.totalPurchased
      ).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm ${owedColor}">Rs. ${Number(
        s.totalOwed
      ).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${
        s.grnCount
      }</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex items-center space-x-3">
          <button title="View" onclick="viewSupplier(${
            s.id
          })" class="text-blue-600 hover:text-blue-800"><i data-feather="eye" class="w-4 h-4"></i></button>
          <button title="Edit" onclick="openEditSupplierModal(${
            s.id
          })" class="text-green-600 hover:text-green-800"><i data-feather="edit-2" class="w-4 h-4"></i></button>
          <button title="Delete" onclick="deleteSupplier(${
            s.id
          })" class="text-red-600 hover:text-red-800"><i data-feather="trash-2" class="w-4 h-4"></i></button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

function renderPaymentsTable() {
  const tbody = document.getElementById("paymentsTableBody");
  if (!tbody) return;

  if (filteredPayments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No GRN payment records found</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredPayments
    .map((grn) => {
      const statusName = grn.paymentStatus?.name || "—";
      const badge = getStatusBadge(statusName);
      const date = grn.date ? new Date(grn.date).toLocaleDateString() : "—";
      const dueStr = formatGrnDueDateLabel(grn);
      const canPay = canPaySuppGrn(grn);
      return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap font-semibold text-blue-600">${suppEscapeHtml(
        grn.grnCode
      )}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${suppEscapeHtml(
        grn.supplier?.name || "—"
      )}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${Number(
        grn.totalAmount
      ).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${Number(
        grn.amountPaid
      ).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${
        Number(grn.balance) > 0 && !isSuppGrnVoided(grn)
          ? "text-red-600"
          : "text-gray-500"
      }">Rs. ${Number(grn.balance).toLocaleString()}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">${badge}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${dueStr}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex items-center space-x-3">
          <button title="View" onclick="viewPaymentDetails(${
            grn.grnId
          })" class="text-blue-600 hover:text-blue-800"><i data-feather="eye" class="w-4 h-4"></i></button>
          ${
            canPay
              ? `<button title="Add Payment" onclick="openAddPaymentModal(${grn.grnId})" class="text-green-600 hover:text-green-800"><i data-feather="plus-circle" class="w-4 h-4"></i></button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
}

function updateSupplierStats() {
  const t = document.getElementById("totalSuppliers");
  const p = document.getElementById("pendingPayments");
  const m = document.getElementById("monthSpend");
  if (t) t.textContent = supplierStats.totalSuppliers;
  if (p) p.textContent = supplierStats.pendingPayments;
  if (m)
    m.textContent = `Rs. ${Number(
      supplierStats.thisMonthPurchases
    ).toLocaleString()}`;
}

function getStatusBadge(status) {
  const badges = {
    Pending:
      '<span class="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>',
    Partial:
      '<span class="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Partial</span>',
    Paid: '<span class="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Paid</span>',
    Voided:
      '<span class="px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full">Voided</span>',
  };
  return (
    badges[status] ||
    `<span class="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">${suppEscapeHtml(
      status
    )}</span>`
  );
}

// --- Filter Functions ---

function filterSuppliers() {
  const q = (
    document.getElementById("supplierSearch")?.value || ""
  ).toLowerCase();
  filteredSuppliers = suppliersData.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.mobileNumber || "").includes(q) ||
      (s.companyName || "").toLowerCase().includes(q)
  );
  renderSuppliersTable();
}

function filterPayments() {
  scheduleReloadPayments();
}

// --- Tab Switching ---

function switchSupplierTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active", "border-blue-500", "text-blue-600");
    btn.classList.add("border-transparent", "text-gray-500");
  });
  const activeTab = document.getElementById(`${tabName}-tab`);
  if (activeTab) {
    activeTab.classList.add("active", "border-blue-500", "text-blue-600");
    activeTab.classList.remove("border-transparent", "text-gray-500");
  }

  document
    .querySelectorAll(".tab-content")
    .forEach((c) => (c.style.display = "none"));
  const activeContent = document.getElementById(`${tabName}-content`);
  if (activeContent) activeContent.style.display = "block";

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 100);

  if (tabName === "payments") {
    loadPaymentsData();
  }
}

// --- Supplier CRUD ---

function openAddSupplierModal() {
  document.getElementById("supplierModalTitle").textContent = "Add Sales REP";
  document.getElementById("supplierForm").reset();
  document.getElementById("supplierId").value = "";
  document.getElementById("supplierModal").classList.remove("hidden");
  document.getElementById("supplierModal").classList.add("flex");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function openEditSupplierModal(id) {
  const s = suppliersData.find((x) => x.id === id);
  if (!s) return;
  document.getElementById("supplierModalTitle").textContent = "Edit Sales REP";
  document.getElementById("supplierId").value = s.id;
  document.getElementById("supplierName").value = s.name;
  document.getElementById("supplierCompanyName").value = s.companyName || "";
  document.getElementById("supplierMobile").value = s.mobileNumber;
  document.getElementById("supplierAltMobile").value = s.alternateMobile || "";
  document.getElementById("supplierEmail").value = s.email || "";
  document.getElementById("supplierModal").classList.remove("hidden");
  document.getElementById("supplierModal").classList.add("flex");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeSupplierModal() {
  document.getElementById("supplierModal").classList.add("hidden");
  document.getElementById("supplierModal").classList.remove("flex");
}

async function saveSupplier(e) {
  e.preventDefault();
  const id = document.getElementById("supplierId").value;
  const mobile = document.getElementById("supplierMobile").value.trim();
  const altMobile = document.getElementById("supplierAltMobile").value.trim();
  const mobileErr = validateSuppMobile(mobile, { required: true });
  if (mobileErr) {
    showNotification(mobileErr, "error");
    return;
  }
  const altErr = validateSuppMobile(altMobile, { required: false });
  if (altErr) {
    showNotification(altErr, "error");
    return;
  }

  const payload = {
    name: document.getElementById("supplierName").value.trim(),
    companyName:
      document.getElementById("supplierCompanyName").value.trim() || null,
    mobileNumber: mobile,
    alternateMobile: altMobile || null,
    email: document.getElementById("supplierEmail").value.trim() || null,
  };

  if (!payload.name) {
    showNotification("Sales REP name is required", "error");
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    if (id) {
      await suppRequest(`/suppliers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showNotification("Sales REP updated successfully", "success");
    } else {
      await suppRequest("/suppliers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showNotification("Sales REP added successfully", "success");
    }
    closeSupplierModal();
    await loadSuppliersData();
  } catch (err) {
    showNotification(err.message || "Failed to save Sales REP", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save";
    }
  }
}

async function deleteSupplier(id) {
  if (!confirm("Delete this Sales REP? This cannot be undone.")) return;
  try {
    await suppRequest(`/suppliers/${id}`, { method: "DELETE" });
    showNotification("Sales REP deleted successfully", "success");
    await loadSuppliersData();
  } catch (err) {
    showNotification(err.message || "Failed to delete Sales REP", "error");
  }
}

// --- Supplier Details Modal ---

async function viewSupplier(id) {
  try {
    currentSupplierDetailId = id;
    currentSupplierDetail = null;
    const s = await suppRequest(`/suppliers/${id}`);

    currentSupplierDetail = {
      id: s.id,
      name: s.name || "",
      mobileNumber: s.mobileNumber || "",
      companyName: s.companyName || "",
      email: s.email || "",
      totalPurchased: s.totalPurchased,
      totalOwed: s.totalOwed,
      grnCount: s.grnCount,
    };

    const header = document.getElementById("supplierDetailHeader");
    if (header) {
      header.innerHTML = `
        <div class="flex flex-wrap justify-between gap-4">
          <div>
            <h4 class="text-lg font-semibold text-gray-900">${suppEscapeHtml(
              s.name || "—"
            )}</h4>
            <p class="text-sm text-gray-600">${suppEscapeHtml(
              s.companyName || "—"
            )}</p>
            <p class="text-sm text-gray-600 mt-1">${suppEscapeHtml(
              s.mobileNumber || "—"
            )}${
              s.alternateMobile
                ? ` · Alt: ${suppEscapeHtml(s.alternateMobile)}`
                : ""
            }</p>
            <p class="text-sm text-gray-500">${suppEscapeHtml(s.email || "—")}</p>
          </div>
          <div class="text-sm text-right space-y-1">
            <p>Total purchased: <span class="font-semibold">Rs. ${Number(
              s.totalPurchased || 0
            ).toLocaleString()}</span></p>
            <p>Balance owed: <span class="font-semibold ${
              Number(s.totalOwed) > 0 ? "text-red-600" : "text-gray-800"
            }">Rs. ${Number(s.totalOwed || 0).toLocaleString()}</span></p>
            <p>GRNs: <span class="font-semibold">${Number(
              s.grnCount || 0
            )}</span></p>
          </div>
        </div>`;
    }

    currentSupplierGrns = s.grns || [];
    clearSupplierGrnFilter();
    renderSupplierGrnHistory(currentSupplierGrns);

    document.getElementById("supplierHistoryModal").classList.remove("hidden");
    document.getElementById("supplierHistoryModal").classList.add("flex");
    if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 80);
  } catch (err) {
    console.error("viewSupplier error:", err);
    showNotification("Failed to load Sales REP details", "error");
  }
}

function renderSupplierGrnHistory(grns) {
  const list = document.getElementById("supplierHistoryList");
  if (!list) return;

  if (!grns || grns.length === 0) {
    list.innerHTML = `<div class="text-center py-8 text-gray-500">No purchase history found</div>`;
    return;
  }

  list.innerHTML = grns
    .map((g) => {
      const statusName =
        typeof g.paymentStatus === "string"
          ? g.paymentStatus
          : g.paymentStatus?.name || "—";
      const badge = getStatusBadge(statusName);
      const date = g.date ? new Date(g.date).toLocaleDateString() : "—";
      const dueLabel = formatGrnDueDateLabel(g);
      const canPay = canPaySuppGrn(g);
      return `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h6 class="font-medium text-gray-900">${suppEscapeHtml(g.grnCode)}</h6>
          <span class="text-xs text-gray-500">${date}${
            dueLabel !== "—" ? ` • Due ${dueLabel}` : ""
          }</span>
        </div>
        <div class="text-right space-y-1">
          ${badge}
          ${
            g.paymentType
              ? `<div class="text-xs text-gray-500 mt-1">${suppEscapeHtml(
                  g.paymentType
                )}</div>`
              : ""
          }
        </div>
      </div>

      <div class="space-y-1 mb-3 text-sm">
        ${(g.items || [])
          .map(
            (item) => `
          <div class="flex justify-between text-gray-700">
            <span>${suppEscapeHtml(item.productName)}${
              item.variantName
                ? " — " + suppEscapeHtml(item.variantName)
                : ""
            } x${item.quantity}</span>
            <span>Rs. ${Number(item.subtotal).toLocaleString()}</span>
          </div>`
          )
          .join("")}
      </div>

      <div class="flex items-center pt-2 border-t border-gray-100 text-sm flex-wrap gap-2 justify-between">
        <div class="space-x-4">
          <span class="text-gray-600">Total: <span class="font-semibold text-gray-900">Rs. ${Number(
            g.totalAmount
          ).toLocaleString()}</span></span>
          <span class="text-gray-600">Paid: <span class="font-semibold text-green-700">Rs. ${Number(
            g.amountPaid
          ).toLocaleString()}</span></span>
          ${
            Number(g.balance) > 0 && !isSuppGrnVoided(g)
              ? `<span class="text-gray-600">Balance: <span class="font-semibold text-red-600">Rs. ${Number(
                  g.balance
                ).toLocaleString()}</span></span>`
              : ""
          }
        </div>
        ${
          canPay
            ? `<button type="button" onclick="openAddPaymentModal(${g.grnId})" class="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Add Payment</button>`
            : ""
        }
      </div>

      ${
        g.payments && g.payments.length > 0
          ? `
      <div class="mt-3 pt-3 border-t border-gray-100">
        <p class="text-xs font-medium text-gray-500 mb-1">Payment Installments</p>
        <div class="space-y-1">
          ${g.payments
            .map(
              (p) => `
            <div class="flex justify-between text-xs text-gray-600">
              <span>${new Date(p.date).toLocaleDateString()}${
                p.note ? " — " + suppEscapeHtml(p.note) : ""
              }</span>
              <span class="font-medium text-green-700">Rs. ${Number(
                p.amount
              ).toLocaleString()}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>`
          : ""
      }
    </div>`;
    })
    .join("");
}

function suppCsvEsc(x) {
  const s = String(x ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function getSupplierGrnsFiltered() {
  const search = (document.getElementById("grnHistorySearch")?.value || "")
    .toLowerCase()
    .trim();
  const status = document.getElementById("grnStatusFilter")?.value || "";
  const fromVal = document.getElementById("grnDateFrom")?.value;
  const toVal = document.getElementById("grnDateTo")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  return currentSupplierGrns.filter((g) => {
    const gDate = new Date(g.date);
    if (from && gDate < from) return false;
    if (to && gDate > to) return false;
    const ps =
      typeof g.paymentStatus === "string"
        ? g.paymentStatus
        : g.paymentStatus?.name || "";
    if (status && ps !== status) return false;
    if (search) {
      const inGrn = (g.grnCode || "").toLowerCase().includes(search);
      const inItems = (g.items || []).some(
        (it) =>
          (it.productName || "").toLowerCase().includes(search) ||
          (it.variantName || "").toLowerCase().includes(search)
      );
      if (!inGrn && !inItems) return false;
    }
    return true;
  });
}

function filterSupplierGrnHistory() {
  renderSupplierGrnHistory(getSupplierGrnsFiltered());
}

function getSupplierGrnHistoryExportFilters() {
  const filters = [];
  const { name, mobile } = supplierDetailMetaLines();
  if (name) filters.push({ label: "Sales REP", value: name });
  if (mobile) filters.push({ label: "Mobile", value: mobile });
  const search = document.getElementById("grnHistorySearch")?.value?.trim();
  const status = document.getElementById("grnStatusFilter")?.value;
  const from = document.getElementById("grnDateFrom")?.value;
  const to = document.getElementById("grnDateTo")?.value;
  if (search) filters.push({ label: "Search", value: search });
  if (status) filters.push({ label: "Status", value: status });
  if (from) filters.push({ label: "From", value: from });
  if (to) filters.push({ label: "To", value: to });
  return filters;
}

function mapSupplierGrnExportPdfRow(g) {
  const statusName =
    typeof g.paymentStatus === "string"
      ? g.paymentStatus
      : g.paymentStatus?.name || "—";
  const dueLabel = formatGrnDueDateLabel(g);
  const items =
    (g.items || [])
      .map((it) =>
        `${it.productName || ""}${it.variantName ? " — " + it.variantName : ""} ×${it.quantity}`
      )
      .join("; ") || "—";
  return [
    g.grnCode || "—",
    g.date ? new Date(g.date).toLocaleDateString() : "—",
    dueLabel,
    statusName,
    `Rs.${Number(g.totalAmount || 0).toLocaleString()}`,
    `Rs.${Number(g.amountPaid || 0).toLocaleString()}`,
    `Rs.${Number(g.balance || 0).toLocaleString()}`,
    items.slice(0, 80) + (items.length > 80 ? "…" : ""),
  ];
}

function mapSupplierGrnExportCsvRow(g) {
  const statusName =
    typeof g.paymentStatus === "string"
      ? g.paymentStatus
      : g.paymentStatus?.name || "";
  const dueIso =
    typeof g.dueDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(g.dueDate)
      ? g.dueDate.slice(0, 10)
      : "";
  const items =
    (g.items || [])
      .map((it) =>
        `${it.productName || ""}${it.variantName ? " — " + it.variantName : ""} ×${it.quantity}`
      )
      .join("; ") || "";
  return [
    g.grnCode || "",
    g.date ? new Date(g.date).toISOString().slice(0, 10) : "",
    dueIso,
    statusName,
    Number(g.totalAmount || 0),
    Number(g.amountPaid || 0),
    Number(g.balance || 0),
    items,
  ];
}

function exportSupplierDetailsPDF() {
  const rows = getSupplierGrnsFiltered();
  const ok = exportPdfWithTable({
    title: "Sales REP GRN History",
    filters: getSupplierGrnHistoryExportFilters(),
    head: [
      "GRN",
      "Date",
      "Due date",
      "Status",
      "Total",
      "Paid",
      "Balance",
      "Items",
    ],
    body: rows.map(mapSupplierGrnExportPdfRow),
    fileName: `supplier-${currentSupplierDetailId || "detail"}-grns.pdf`,
    emptyMessage: "No GRN rows to export for current filters",
  });
  if (ok) showNotification("Sales REP GRN PDF downloaded.", "success");
}

async function exportSupplierDetailsXL() {
  const rows = getSupplierGrnsFiltered();
  const ok = await exportXlsxWithTable({
    title: "Sales REP GRN History",
    filters: getSupplierGrnHistoryExportFilters(),
    headers: [
      "GRN",
      "Date",
      "Due date",
      "Status",
      "Total",
      "Paid",
      "Balance",
      "Items",
    ],
    rows: rows.map(mapSupplierGrnExportCsvRow),
    sheetName: "GRN History",
    fileName: `sales-rep-${currentSupplierDetailId || "detail"}-grns.xlsx`,
    emptyMessage: "No GRN rows to export",
  });
  if (ok) showNotification("XL downloaded.", "success");
}



function clearSupplierGrnFilter() {
  ["grnHistorySearch", "grnStatusFilter", "grnDateFrom", "grnDateTo"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
  );
  renderSupplierGrnHistory(currentSupplierGrns);
}

function closeSupplierHistoryModal() {
  currentSupplierDetailId = null;
  currentSupplierDetail = null;
  document.getElementById("supplierHistoryModal").classList.add("hidden");
  document.getElementById("supplierHistoryModal").classList.remove("flex");
}

// --- Payment Modal (view installments) ---

async function viewPaymentDetails(grnId) {
  const modal = document.getElementById("paymentModal");
  const title = document.getElementById("paymentModalTitle");
  const details = document.getElementById("paymentDetails");

  title.textContent = `Payment Details`;
  details.innerHTML = `<div class="text-center py-8 text-gray-400">Loading...</div>`;
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  try {
    const [grn, payments] = await Promise.all([
      suppRequest(`/grn/${grnId}`),
      suppRequest(`/grn/${grnId}/payments`),
    ]);

    const statusName = grn.paymentStatus?.name || "—";
    title.textContent = `Payment Details — ${grn.grnCode}`;
    const canPay = canPaySuppGrn(grn);

    details.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-700 mb-3">Payment Summary</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span>Total Amount:</span><span class="font-semibold">Rs. ${Number(
              grn.totalAmount
            ).toLocaleString()}</span></div>
            <div class="flex justify-between"><span>Paid Amount:</span><span class="font-semibold text-green-600">Rs. ${Number(
              grn.amountPaid
            ).toLocaleString()}</span></div>
            <div class="flex justify-between"><span>Balance:</span><span class="font-semibold text-red-600">Rs. ${Number(
              grn.balance
            ).toLocaleString()}</span></div>
            <div class="flex justify-between items-center"><span>Status:</span>${getStatusBadge(
              statusName
            )}</div>
          </div>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-700 mb-3">Sales REP Info</h4>
          <p class="font-medium text-sm">${suppEscapeHtml(
            grn.supplier?.name || "—"
          )}</p>
          ${
            grn.supplier?.mobileNumber
              ? `<p class="text-gray-500 text-sm">${suppEscapeHtml(
                  grn.supplier.mobileNumber
                )}</p>`
              : ""
          }
          ${
            grn.supplier?.companyName
              ? `<p class="text-gray-500 text-sm">${suppEscapeHtml(
                  grn.supplier.companyName
                )}</p>`
              : ""
          }
          <p class="text-gray-500 text-sm mt-1">GRN: ${suppEscapeHtml(
            grn.grnCode
          )}</p>
          <p class="text-gray-500 text-sm">GRN date: ${
            grn.date ? new Date(grn.date).toLocaleDateString() : "—"
          }</p>
          <p class="text-gray-500 text-sm">Due date: ${formatGrnDueDateLabel(
            grn
          )}</p>
          ${
            grn.note
              ? `<p class="text-gray-500 text-sm mt-1 italic">${suppEscapeHtml(
                  grn.note
                )}</p>`
              : ""
          }
        </div>
      </div>

      <div class="mb-4">
        <h4 class="font-semibold text-gray-700 mb-3">Payment Installments</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100"><tr>
              <th class="text-left p-2 rounded-tl">Date</th>
              <th class="text-left p-2">Amount</th>
              <th class="text-left p-2 rounded-tr">Note</th>
            </tr></thead>
            <tbody>
              ${
                payments.length > 0
                  ? payments
                      .map(
                        (p) => `
                  <tr class="border-b">
                    <td class="p-2">${
                      p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "—"
                    }</td>
                    <td class="p-2 font-medium text-green-700">Rs. ${Number(
                      p.amount
                    ).toLocaleString()}</td>
                    <td class="p-2 text-gray-500">${suppEscapeHtml(
                      p.note || "—"
                    )}</td>
                  </tr>`
                      )
                      .join("")
                  : `<tr><td colspan="3" class="p-4 text-center text-gray-500">No installments recorded yet</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      ${
        canPay
          ? `
      <div class="flex justify-end">
        <button onclick="openAddPaymentModal(${grnId})" class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
          Add Payment
        </button>
      </div>`
          : ""
      }
    `;

    if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
  } catch (err) {
    console.error("viewPaymentDetails error:", err);
    details.innerHTML = `<div class="text-center py-8 text-red-400">Failed to load payment details</div>`;
  }
}

async function loadPaymentOptions() {
  try {
    const [types, accounts] = await Promise.all([
      suppRequest("/grn/payment-types"),
      suppRequest("/accounts/accounts"),
    ]);

    supplierPaymentTypes = (types || []).filter((pt) =>
      /^(cash|cheque|bank\s*transfer)$/i.test((pt.name || "").trim())
    );
    const accountList = accounts || [];
    supplierBankAccounts =
      typeof filterBankSubAccounts === "function"
        ? filterBankSubAccounts(accountList)
        : accountList;

    const methodSel = document.getElementById("addPaymentMethod");
    if (methodSel) {
      methodSel.innerHTML =
        '<option value="">Select payment method</option>' +
        supplierPaymentTypes
          .map((pt) => `<option value="${pt.id}">${pt.name}</option>`)
          .join("");

      const cashType = supplierPaymentTypes.find((pt) =>
        /^cash$/i.test(pt.name)
      );
      if (cashType) methodSel.value = String(cashType.id);
    }

    const bankSel = document.getElementById("addPaymentBankAccount");
    if (bankSel) {
      bankSel.innerHTML =
        '<option value="">Select bank account</option>' +
        supplierBankAccounts
          .map(
            (acc) =>
              `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
          )
          .join("");
    }

    toggleSupplierPaymentBankAccount();
  } catch (err) {
    console.warn("Failed to load payment options:", err.message);
  }
}

function toggleSupplierPaymentBankAccount() {
  const methodSel = document.getElementById("addPaymentMethod");
  const wrap = document.getElementById("addPaymentBankWrap");
  const chqWrap = document.getElementById("addPaymentChequeWrap");
  if (!methodSel || !wrap) return;

  const selectedType = supplierPaymentTypes.find(
    (pt) => String(pt.id) === String(methodSel.value)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const needBank = isBankTransfer || isCheque;
  wrap.classList.toggle("hidden", !needBank);
  if (chqWrap) {
    chqWrap.classList.toggle("hidden", !isCheque);
    const chq = document.getElementById("addPaymentChequeNumber");
    if (chq) {
      if (!isCheque) chq.value = "";
    }
  }
}

function closePaymentModal() {
  document.getElementById("paymentModal").classList.add("hidden");
  document.getElementById("paymentModal").classList.remove("flex");
}

// --- Add Payment Modal ---

function openAddPaymentModal(grnId) {
  openAddPaymentModalAsync(grnId);
}

async function openAddPaymentModalAsync(grnId) {
  const numericId =
    typeof grnId === "number" && !Number.isNaN(grnId)
      ? grnId
      : parseInt(String(grnId), 10);
  if (!numericId || Number.isNaN(numericId)) {
    showNotification("Invalid GRN", "error");
    return;
  }

  if (!supplierPaymentTypes?.length) {
    await loadPaymentOptions();
  }

  let grn =
    paymentsData.find(
      (g) => g.grnId === numericId || String(g.grnId) === String(grnId)
    ) ||
    (Array.isArray(currentSupplierGrns) &&
      currentSupplierGrns.find(
        (g) => g.grnId === numericId || String(g.grnId) === String(grnId)
      ));

  if (!grn) {
    try {
      grn = await suppRequest(`/grn/${numericId}`);
    } catch (_) {
      showNotification("Could not load GRN for payment.", "error");
      return;
    }
  }

  const balance = grn != null ? Number(grn.balance) : null;
  const grnCode = grn?.grnCode || `GRN-${String(numericId).padStart(4, "0")}`;

  if (isSuppGrnVoided(grn) || !canPaySuppGrn(grn)) {
    showNotification("This GRN cannot accept payments.", "error");
    return;
  }
  document.getElementById("addPaymentGrnId").value = String(numericId);
  const amountInput = document.getElementById("addPaymentAmount");
  if (amountInput) {
    amountInput.value = "";
    if (balance != null && !Number.isNaN(balance) && balance > 0) {
      amountInput.max = String(balance);
    } else {
      amountInput.removeAttribute("max");
    }
  }
  document.getElementById("addPaymentNote").value = "";
  const paymentSel = document.getElementById("addPaymentMethod");
  if (paymentSel) {
    const cashType = supplierPaymentTypes.find((pt) =>
      /^cash$/i.test(pt.name)
    );
    paymentSel.value = cashType ? String(cashType.id) : "";
  }
  const bankSel = document.getElementById("addPaymentBankAccount");
  if (bankSel) bankSel.value = "";
  toggleSupplierPaymentBankAccount();

  const info = document.getElementById("addPaymentInfo");
  if (info) {
    const supplierName =
      typeof grn?.supplier === "object" && grn.supplier?.name != null
        ? String(grn.supplier.name)
        : "—";
    const supplierMobile =
      typeof grn?.supplier === "object" && grn.supplier?.mobileNumber
        ? String(grn.supplier.mobileNumber)
        : "";
    const dueTxt = formatGrnDueDateLabel(grn);

    info.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "space-y-1";

    const p1 = document.createElement("p");
    const supLbl = document.createElement("span");
    supLbl.className = "font-medium";
    supLbl.textContent = "Sales REP: ";
    p1.appendChild(supLbl);
    p1.appendChild(document.createTextNode(supplierName));
    if (supplierMobile)
      p1.appendChild(document.createTextNode(` · ${supplierMobile}`));

    const p2 = document.createElement("p");
    const codeSpan = document.createElement("span");
    codeSpan.className = "font-medium";
    codeSpan.textContent = grnCode;
    p2.appendChild(codeSpan);
    const balText =
      balance != null && !Number.isNaN(balance)
        ? ` — Remaining balance: Rs. ${balance.toLocaleString()}`
        : "";
    if (balText) p2.appendChild(document.createTextNode(balText));

    const p3 = document.createElement("p");
    p3.className = "text-xs text-blue-900/90";
    p3.textContent = `Due date: ${dueTxt}`;

    wrap.appendChild(p1);
    wrap.appendChild(p2);
    wrap.appendChild(p3);
    info.appendChild(wrap);
  }

  document.getElementById("addPaymentModal").classList.remove("hidden");
  document.getElementById("addPaymentModal").classList.add("flex");
  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeAddPaymentModal() {
  document.getElementById("addPaymentModal").classList.add("hidden");
  document.getElementById("addPaymentModal").classList.remove("flex");
}

async function submitAddPayment(e) {
  e.preventDefault();
  const grnId = parseInt(document.getElementById("addPaymentGrnId").value);
  const amount = parseFloat(document.getElementById("addPaymentAmount").value);
  const note = document.getElementById("addPaymentNote").value.trim();
  const paymentTypeId = parseInt(
    document.getElementById("addPaymentMethod")?.value
  );
  const selectedType = supplierPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentTypeId)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const bankAccountId = parseInt(
    document.getElementById("addPaymentBankAccount")?.value
  );
  const chequeNumber = String(
    document.getElementById("addPaymentChequeNumber")?.value || ""
  ).trim();

  if (!grnId || isNaN(amount) || amount <= 0) {
    showNotification("Enter a valid amount", "error");
    return;
  }

  const balanceHint = parseFloat(
    document.getElementById("addPaymentAmount")?.max || ""
  );
  if (!isNaN(balanceHint) && amount > balanceHint + 1e-9) {
    showNotification(
      `Payment exceeds remaining balance (Rs. ${balanceHint.toLocaleString()})`,
      "error"
    );
    return;
  }

  if (!paymentTypeId) {
    showNotification("Select a payment method", "error");
    return;
  }

  if ((isBankTransfer || isCheque) && !bankAccountId) {
    showNotification("Select a bank account", "error");
    return;
  }
  if (isCheque && !chequeNumber) {
    showNotification("Enter the cheque number", "error");
    return;
  }

  const btn = document.getElementById("addPaymentSubmitBtn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Submitting...";
  }

  try {
    await suppRequest(`/grn/${grnId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        note: note || null,
        paymentTypeId,
        bankAccountId: isBankTransfer || isCheque ? bankAccountId : null,
        chequeNumber: isCheque ? chequeNumber : null,
      }),
    });

    showNotification("Payment recorded successfully!", "success");
    closeAddPaymentModal();

    // Refresh supplier list, stats, and payments tab
    await Promise.all([loadSuppliersData(), loadPaymentsData()]);

    // If payment details modal is open, refresh it
    const paymentModal = document.getElementById("paymentModal");
    if (paymentModal && !paymentModal.classList.contains("hidden")) {
      viewPaymentDetails(grnId);
    }

    // Refresh supplier history if open
    if (
      currentSupplierDetailId &&
      document.getElementById("supplierHistoryModal") &&
      !document
        .getElementById("supplierHistoryModal")
        .classList.contains("hidden")
    ) {
      await viewSupplier(currentSupplierDetailId);
    }
  } catch (err) {
    showNotification(err.message || "Failed to record payment", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Submit Payment";
    }
  }
}

// --- PDF / XL Downloads ---

function getSupplierDirectoryExportData() {
  return filteredSuppliers.length > 0 ? filteredSuppliers : suppliersData;
}

function getSupplierDirectoryExportFilters() {
  const search = document.getElementById("supplierSearch")?.value?.trim();
  return search ? [{ label: "Search", value: search }] : [];
}

function downloadSupplierDirectoryPDF() {
  try {
    const data = getSupplierDirectoryExportData();
    const totalOwed = data.reduce((s, x) => s + Number(x.totalOwed || 0), 0);
    const ok = exportPdfWithTable({
      title: "Sales REP Directory",
      filters: getSupplierDirectoryExportFilters(),
      head: [
        "Name",
        "Company",
        "Mobile",
        "Email",
        "Total Purchased",
        "Balance Owed",
        "GRNs",
      ],
      body: data.map((s) => [
        s.name,
        s.companyName || "—",
        s.mobileNumber,
        s.email || "—",
        `Rs. ${Number(s.totalPurchased).toLocaleString()}`,
        `Rs. ${Number(s.totalOwed).toLocaleString()}`,
        s.grnCount,
      ]),
      fileName: `supplier-directory-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Sales REPs: ${data.length}  |  Total Balance Owed: Rs. ${totalOwed.toLocaleString()}`,
      emptyMessage: "No Sales REP data to export",
    });
    if (ok) showNotification("Sales REP directory PDF downloaded!", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Failed to generate PDF", "error");
  }
}

async function downloadSupplierDirectoryXL() {
  try {
    const data = getSupplierDirectoryExportData();
    const ok = await exportXlsxWithTable({
      title: "Sales REP Directory",
      filters: getSupplierDirectoryExportFilters(),
      headers: [
        "Name",
        "Company",
        "Mobile",
        "Email",
        "Total Purchased",
        "Balance Owed",
        "GRNs",
      ],
      rows: data.map((s) => [
        s.name,
        s.companyName || "",
        s.mobileNumber,
        s.email || "",
        Number(s.totalPurchased || 0),
        Number(s.totalOwed || 0),
        s.grnCount,
      ]),
      sheetName: "Sales REPs",
      fileName: `sales-rep-directory-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No Sales REP data to export",
    });
    if (ok) showNotification("Sales REP directory XL downloaded!", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Failed to generate XL", "error");
  }
}


function getPaymentsExportFilters() {
  const filters = [];
  const from = document.getElementById("paymentsDateFrom")?.value;
  const to = document.getElementById("paymentsDateTo")?.value;
  const search = (document.getElementById("paymentsSearch")?.value || "").trim();
  const st = document.getElementById("paymentStatusFilter");
  if (from) filters.push({ label: "From", value: from });
  if (to) filters.push({ label: "To", value: to });
  if (search) filters.push({ label: "Search", value: search });
  if (st?.value) {
    filters.push({
      label: "Status",
      value: st.options[st.selectedIndex]?.textContent?.trim() || st.value,
    });
  }
  return filters;
}

function getPaymentsExportData() {
  return filteredPayments.length > 0 ? filteredPayments : paymentsData;
}

function downloadPaymentsPDF() {
  try {
    const data = getPaymentsExportData();
    const totalBalance = data.reduce((s, g) => s + Number(g.balance || 0), 0);
    const ok = exportPdfWithTable({
      title: "Sales REP Payments Report",
      filters: getPaymentsExportFilters(),
      head: [
        "GRN No",
        "Sales REP",
        "Total",
        "Paid",
        "Balance",
        "Status",
        "GRN Date",
        "Due Date",
      ],
      body: data.map((g) => [
        g.grnCode,
        g.supplier?.name || "—",
        `Rs. ${Number(g.totalAmount).toLocaleString()}`,
        `Rs. ${Number(g.amountPaid).toLocaleString()}`,
        `Rs. ${Number(g.balance).toLocaleString()}`,
        g.paymentStatus?.name || "—",
        g.date ? new Date(g.date).toLocaleDateString() : "—",
        formatGrnDueDateLabel(g),
      ]),
      fileName: `supplier-payments-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total GRNs: ${data.length}  |  Total Outstanding: Rs. ${totalBalance.toLocaleString()}`,
      emptyMessage: "No payment data to export",
    });
    if (ok) showNotification("Payments PDF downloaded!", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Failed to generate Payments PDF", "error");
  }
}

async function downloadPaymentsCSV() {
  const data = getPaymentsExportData();
  const ok = await exportXlsxWithTable({
    title: "Sales REP Payments Report",
    filters: getPaymentsExportFilters(),
    headers: [
      "GRN",
      "Sales REP",
      "Total",
      "Paid",
      "Balance",
      "Status",
      "GRN Date",
      "Due Date",
    ],
    rows: data.map((g) => [
      g.grnCode || g.grnId,
      g.supplier?.name || "",
      g.totalAmount,
      g.amountPaid,
      g.balance,
      g.paymentStatus?.name || "",
      g.date ? new Date(g.date).toISOString().slice(0, 10) : "",
      typeof g.dueDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(g.dueDate)
        ? g.dueDate.slice(0, 10)
        : "",
    ]),
    sheetName: "Payments",
    fileName: `sales-rep-payments-${new Date().toISOString().split("T")[0]}.xlsx`,
    emptyMessage: "No payment data to export",
  });
  if (ok) showNotification("Payments XL downloaded", "success");
}

function initializeSuppliersPage() {
  console.log("Suppliers page initialized");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateSuppliersContent,
    initializeSuppliersModule,
    initializeSuppliersPage,
  };
}
