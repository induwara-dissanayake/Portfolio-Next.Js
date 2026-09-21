// ─── API config ──────────────────────────────────────────────────────────────
const API_BASE = window.API_BASE_URL || "http://localhost:3000/api";

function grnGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

async function grnRequest(path, options = {}) {
  const token = grnGetAuthToken();
  if (!token) throw new Error("Authentication required. Please login first.");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const raw = await res.text();
  let json = null;
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      if (!res.ok) {
        throw new Error(raw.slice(0, 200) || `Request failed (${res.status})`);
      }
      throw new Error("Invalid JSON response from server.");
    }
  }

  if (!res.ok || !json?.success) {
    throw new Error(
      json?.message || raw?.slice(0, 200) || `Request failed (${res.status})`
    );
  }
  return json.data;
}

function grnEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function grnEscapeAttr(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ");
}

function isGrnVoided(grn) {
  if (grn?.isVoided === true) return true;
  const status = String(grn?.paymentStatus?.name || "").toLowerCase();
  if (status === "voided") return true;
  return String(grn?.note || "").includes("[VOIDED");
}

function getGrnCompleteButton() {
  return document.querySelector('button[type="submit"][form="new-grn-form"]');
}

// ─── Module state ─────────────────────────────────────────────────────────────
let grnListData = [];
let grnSuppliers = [];
let grnPaymentTypes = [];
let grnPaymentStatuses = [];
let grnModalItems = [];
let grnSearchTimers = {};
let currentViewedGrn = null;
const GRN_PAGE_SIZE = 25;
let grnListPage = 1;
let grnBankAccounts = [];
let grnLastSellingPrice = null;

function openGrnReasonModal({
  title,
  message,
  placeholder = "Enter reason (optional)",
  confirmText = "Continue",
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById("grn-reason-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "grn-reason-modal";
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
        </div>
        <div class="px-6 py-4">
          <p class="text-sm text-gray-600 mb-3">${message}</p>
          <textarea id="grn-reason-input" rows="4" placeholder="${placeholder}"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div class="px-6 py-4 border-t flex justify-end space-x-2">
          <button type="button" id="grn-reason-cancel" class="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
          <button type="button" id="grn-reason-confirm" class="btn-primary px-4 py-2 text-white rounded text-sm">${confirmText}</button>
        </div>
      </div>
    `;

    const cleanup = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.addEventListener("click", () => cleanup(null));
    modal
      .querySelector("#grn-reason-cancel")
      .addEventListener("click", () => cleanup(null));
    modal.querySelector("#grn-reason-confirm").addEventListener("click", () => {
      const val = modal.querySelector("#grn-reason-input")?.value?.trim() || "";
      cleanup(val);
    });

    document.body.appendChild(modal);
    modal.querySelector("#grn-reason-input")?.focus();
  });
}

function initializeGRNModule() {}

function generateGRNContent() {
  return `
    <div class="content-fade-in p-6">
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">GRN</h1>
            <p class="text-gray-600 mt-1">Manage incoming goods receipt and verification</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="openNewGRNModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>
              New GRN
            </button>
            <button onclick="downloadGRNPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
              <i data-feather="download" class="w-4 h-4 mr-2"></i>
              PDF
            </button>
            <button onclick="downloadGRNXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center" title="Opens in Excel">
              <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
              XL
            </button>
          </div>
        </div>
      </div>

      <!-- GRN Statistics -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Total GRNs</p>
              <p class="text-3xl font-bold text-gray-800" id="total-grns">—</p>
              <p class="text-sm text-gray-500 mt-1">This month</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i data-feather="clipboard" class="w-6 h-6 text-blue-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Pending Payments</p>
              <p class="text-3xl font-bold text-orange-600" id="pending-receipts">—</p>
              <p class="text-sm text-gray-500 mt-1">Unpaid balances</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full">
              <i data-feather="clock" class="w-6 h-6 text-orange-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Received Today</p>
              <p class="text-3xl font-bold text-green-600" id="received-today">—</p>
              <p class="text-sm text-gray-500 mt-1">Items processed</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i data-feather="check-circle" class="w-6 h-6 text-green-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Value Received</p>
              <p class="text-2xl font-bold text-purple-600" id="value-received">—</p>
              <p class="text-sm text-gray-500 mt-1">This month</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full">
              <i data-feather="package" class="w-6 h-6 text-purple-600"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- GRN Management Section -->
      <div class="card mb-6">
        <!-- Search and Filter Bar -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 md:space-x-4">
            <div class="flex-1 max-w-lg">
              <div class="relative">
                <input type="text" id="grn-search" placeholder="Search GRNs by ID, sales REP, or items..." 
                       class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i data-feather="search" class="w-5 h-5 text-gray-400"></i>
                </div>
              </div>
            </div>
            <div class="flex space-x-3">
              <select id="supplier-filter" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option value="">All Sales REPs</option>
              </select>
              <select id="status-filter" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option value="">All Statuses</option>
              </select>
              <div class="flex space-x-2 items-center">
                <input type="date" id="date-from" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="From">
                <span class="text-gray-500">to</span>
                <input type="date" id="date-to" class="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500" placeholder="To">
              </div>
              <button type="button" onclick="clearGrnFilters()" class="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Clear</button>
            </div>
          </div>
        </div>

        <!-- GRN Table -->
        <div class="overflow-x-auto rounded-b-lg">
          <table class="min-w-full divide-y divide-gray-200 table-auto">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">GRN ID</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sales REP</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Items</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Value</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Stock Types</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Paid Amount</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Balance</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody id="grn-table-body" class="bg-white divide-y divide-gray-200">
              <!-- GRN entries will be populated here -->
            </tbody>
          </table>
        </div>

        <!-- Count / Pagination -->
        <div class="px-6 py-3 bg-gray-50 border-t border-gray-200" id="grn-pagination">
          <div class="text-sm text-gray-700" id="grn-count-label"></div>
        </div>
      </div>
    </div>

    <!-- New GRN Modal -->
    <div id="new-grn-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-7xl w-full mx-3 max-h-[92vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 class="text-xl font-semibold">Create New GRN</h2>
          <button onclick="closeNewGRNModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="new-grn-form" class="flex-1 overflow-y-auto" onsubmit="completeGRN(event)">
          <div class="p-6">
          <!-- GRN Header Information -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">GRN Date *</label>
              <input type="date" id="grn-date" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Sales REP *</label>
              <select id="grn-supplier" required class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option value="">Select Sales REP</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
              <input type="text" id="grn-invoice" placeholder="INV-2024-001" class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <!-- Items Section -->
          <div class="mb-6" style="overflow: visible !important;">
            <div class="flex justify-between items-center mb-4">
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-medium text-gray-900">Received Items</h3>
              </div>
              <button type="button" onclick="addGRNItem(true)" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                <i data-feather="plus" class="w-4 h-4 mr-2"></i>
                Add Item
              </button>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full border border-gray-300" style="min-width: 1020px;">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase" style="min-width: 16rem;">Product</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 6rem;">Received Qty</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 7rem;">Cost Price</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 7rem;">Selling Price</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 6rem;" title="Profit % from cost and selling price (view only)">Selling %</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 7rem;">Total</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="min-width: 6rem;">Stock Type</th>
                    <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style="width: 3.5rem;">Action</th>
                  </tr>
                </thead>
                <tbody id="grn-items-container" style="position: relative;">
                  <!-- Items will be added dynamically -->
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quality Check Section removed per request -->

          <!-- Credit Terms -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Credit Terms</h3>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="grid grid-cols-1 gap-4 items-end">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Credit Duration</label>
                  <div class="flex gap-2">
                    <input
                      type="text"
                      id="grn-credit-duration"
                      inputmode="numeric"
                      placeholder="e.g. 30"
                      class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      id="grn-credit-duration-unit"
                      class="w-36 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          </div>
        </form>
        <!-- Action Buttons -->
        <div class="flex justify-between items-center p-6 border-t bg-white flex-shrink-0">
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-700">Total: <span id="modal-total-value" class="font-medium">0.00</span></div>
          </div>
          <div class="flex space-x-3">
            <button type="button" onclick="closeNewGRNModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" form="new-grn-form" class="btn-primary px-6 py-2 text-white">Complete GRN</button>
          </div>
        </div>
      </div>
    </div>

    ${typeof getCatalogQuickAddModalsHtml === "function" ? getCatalogQuickAddModalsHtml() : ""}

  `;
}

async function initializeGRNPage() {
  try {
    await Promise.all([loadGrnStats(), loadGrnDropdowns(), loadGrnList()]);
  } catch (err) {
    console.error("GRN page init error:", err);
  }

  if (typeof bindCatalogQuickAddForms === "function") {
    bindCatalogQuickAddForms();
  }

  bindGRNItemFocusBehavior();

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 100);

  const searchInput = document.getElementById("grn-search");
  if (searchInput) {
    let timer;
    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(applyGrnFilters, 400);
    });
  }
  const supplierFilter = document.getElementById("supplier-filter");
  if (supplierFilter)
    supplierFilter.addEventListener("change", applyGrnFilters);

  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) statusFilter.addEventListener("change", applyGrnFilters);

  const dateFromFilter = document.getElementById("date-from");
  if (dateFromFilter)
    dateFromFilter.addEventListener("change", applyGrnFilters);

  const dateToFilter = document.getElementById("date-to");
  if (dateToFilter) dateToFilter.addEventListener("change", applyGrnFilters);

  if (
    window.__grnInventoryPrefill &&
    window.__grnInventoryPrefill.source === "low-stock"
  ) {
    openNewGRNModal();
  }
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

async function loadGrnStats() {
  try {
    const stats = await grnRequest("/grn/stats");
    const el = (id) => document.getElementById(id);
    if (el("total-grns")) el("total-grns").textContent = stats.totalGrns;
    if (el("pending-receipts"))
      el("pending-receipts").textContent = stats.pendingPayments;
    if (el("received-today"))
      el("received-today").textContent = stats.receivedToday;
    if (el("value-received"))
      el("value-received").textContent = fmtGrnNum(stats.valueReceived);
  } catch (err) {
    console.error("Failed to load GRN stats:", err);
  }
}

// ─── Dropdowns ─────────────────────────────────────────────────────────────────

async function loadGrnDropdowns() {
  try {
    const [suppliers, payTypes, payStatuses, accounts] = await Promise.all([
      grnRequest("/grn/suppliers"),
      grnRequest("/grn/payment-types"),
      grnRequest("/grn/payment-statuses"),
      grnRequest("/accounts/accounts"),
    ]);
    grnSuppliers = suppliers;
    grnPaymentTypes = payTypes;
    grnPaymentStatuses = payStatuses;
    const accountList = accounts || [];
    grnBankAccounts =
      typeof filterBankSubAccounts === "function"
        ? filterBankSubAccounts(accountList)
        : accountList;

    const filterSup = document.getElementById("supplier-filter");
    if (filterSup) {
      filterSup.innerHTML =
        '<option value="">All Sales REPs</option>' +
        grnSuppliers
          .map(
            (s) =>
              `<option value="${s.id}">${s.name}${
                s.companyName ? " (" + s.companyName + ")" : ""
              }</option>`
          )
          .join("");
    }
    const filterStat = document.getElementById("status-filter");
    if (filterStat) {
      filterStat.innerHTML =
        '<option value="">All Statuses</option>' +
        grnPaymentStatuses
          .map((ps) => `<option value="${ps.id}">${ps.name}</option>`)
          .join("");
    }
  } catch (err) {
    console.error("Failed to load GRN dropdowns:", err);
  }
}

// ─── List ──────────────────────────────────────────────────────────────────────

async function loadGrnList(params) {
  params = params || {};
  const tbody = document.getElementById("grn-table-body");
  if (tbody)
    tbody.innerHTML =
      '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">Loading…</td></tr>';
  try {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.supplierId) qs.set("supplierId", params.supplierId);
    if (params.paymentStatusId)
      qs.set("paymentStatusId", params.paymentStatusId);
    if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params.dateTo) qs.set("dateTo", params.dateTo);
    const query = qs.toString();
    grnListData = await grnRequest("/grn" + (query ? "?" + query : ""));
    grnListPage = 1;
    renderGRNTable(grnListData);
  } catch (err) {
    console.error("Failed to load GRN list:", err);
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-8 text-center text-red-400">${err.message}</td></tr>`;
  }
}

function applyGrnFilters() {
  return loadGrnList({
    search: document.getElementById("grn-search")?.value || "",
    supplierId: document.getElementById("supplier-filter")?.value || "",
    paymentStatusId: document.getElementById("status-filter")?.value || "",
    dateFrom: document.getElementById("date-from")?.value || "",
    dateTo: document.getElementById("date-to")?.value || "",
  });
}

function clearGrnFilters() {
  const s = document.getElementById("grn-search");
  if (s) s.value = "";
  const sup = document.getElementById("supplier-filter");
  if (sup) sup.value = "";
  const st = document.getElementById("status-filter");
  if (st) st.value = "";
  const df = document.getElementById("date-from");
  const dt = document.getElementById("date-to");
  if (df) df.value = "";
  if (dt) dt.value = "";
  applyGrnFilters();
}

// kept for compatibility
function filterGRNs() {
  applyGrnFilters();
}

// ─── Render ────────────────────────────────────────────────────────────────────

function renderGRNTable(data) {
  const tbody = document.getElementById("grn-table-body");
  const label = document.getElementById("grn-count-label");
  const pagerHost = document.getElementById("grn-pagination");
  if (!tbody) return;
  const list = data || [];
  if (list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">No GRNs found.</td></tr>';
    if (label) label.textContent = "";
    if (pagerHost) {
      pagerHost.innerHTML =
        '<div class="text-sm text-gray-700" id="grn-count-label"></div>';
    }
    return;
  }

  const pages = Math.max(1, Math.ceil(list.length / GRN_PAGE_SIZE));
  grnListPage = Math.min(Math.max(1, grnListPage || 1), pages);
  const start = (grnListPage - 1) * GRN_PAGE_SIZE;
  const pageRows = list.slice(start, start + GRN_PAGE_SIZE);

  tbody.innerHTML = pageRows
    .map((grn) => {
      const badge = paymentStatusBadge(grn.paymentStatus?.name);
      const supplierName = grn.supplier?.name || "—";
      const supplierCo = grn.supplier?.companyName
        ? `<div class="text-xs text-gray-400">${grn.supplier.companyName}</div>`
        : "";
      const balanceCell =
        grn.balance > 0
          ? `<span class="text-orange-600 font-medium">${fmtGrnNum(
              grn.balance
            )}</span>`
          : `<span class="text-gray-400">—</span>`;
      const stockBadges = (grn.stockTypes || ["Main"])
        .map((t) =>
          String(t || "").toLowerCase() === "repair" ||
          String(t || "").toLowerCase() === "repair stock"
            ? `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Repair</span>`
            : `<span class="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Main</span>`
        )
        .join(" ");
      const isVoided = isGrnVoided(grn);
      const safeCode = grnEscapeAttr(grn.grnCode);
      const voidBtn = isVoided
        ? ""
        : `<button onclick="voidGRN(${grn.grnId}, '${safeCode}')" class="text-red-600 hover:text-red-900 mr-2 p-1 rounded" title="Void GRN">
            <i data-feather="slash" class="w-4 h-4"></i>
          </button>`;
      return `
      <tr class="hover:bg-gray-50">
        <td class="px-4 py-3 whitespace-nowrap"><span class="text-sm font-medium text-gray-900">${grnEscapeHtml(
          grn.grnCode
        )}</span></td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${fmtGrnDate(
          grn.date
        )}</td>
        <td class="px-4 py-3 whitespace-nowrap"><div class="text-sm text-gray-900">${grnEscapeHtml(
          supplierName
        )}</div>${supplierCo}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${
          grn.itemCount
        } items</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium text-right">${fmtGrnNum(
          grn.totalAmount
        )}</td>
        <td class="px-4 py-3 whitespace-nowrap">${stockBadges}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-green-700 font-medium text-right">${fmtGrnNum(
          grn.amountPaid
        )}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm text-right">${balanceCell}</td>
        <td class="px-4 py-3 whitespace-nowrap">${badge}</td>
        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">
          <button onclick="viewGRN(${
            grn.grnId
          })" class="text-blue-600 hover:text-blue-900 mr-2 p-1 rounded" title="View GRN">
            <i data-feather="eye" class="w-4 h-4"></i>
          </button>
          ${voidBtn}
          <button onclick="printGRN(${
            grn.grnId
          })" class="text-purple-600 hover:text-purple-900 p-1 rounded" title="Print GRN">
            <i data-feather="printer" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  if (pagerHost) {
    pagerHost.innerHTML = `
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-sm text-gray-600" id="grn-count-label">
          Showing page ${grnListPage} of ${pages} (${list.length} entries)
        </p>
        <div class="flex items-center gap-2">
          <button type="button"
            onclick="changeGrnPage(${grnListPage - 1})"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              grnListPage <= 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }"
            ${grnListPage <= 1 ? "disabled" : ""}>
            Previous
          </button>
          <button type="button"
            onclick="changeGrnPage(${grnListPage + 1})"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              grnListPage >= pages
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }"
            ${grnListPage >= pages ? "disabled" : ""}>
            Next
          </button>
        </div>
      </div>
    `;
  } else if (label) {
    label.textContent = `Showing page ${grnListPage} of ${pages} (${list.length} entries)`;
  }

  if (typeof feather !== "undefined") feather.replace();
}

function changeGrnPage(page) {
  const pages = Math.max(1, Math.ceil((grnListData || []).length / GRN_PAGE_SIZE));
  grnListPage = Math.min(Math.max(1, parseInt(page, 10) || 1), pages);
  renderGRNTable(grnListData);
}

// kept for compatibility
function renderGRNRow() {}
function loadGRNData() {
  return applyGrnFilters();
}
function loadPendingReceipts() {
  // Pending receipts / PO flow is not supported; stub kept for compatibility.
}
function openPendingReceiptsModal() {
  grnToast("Pending receipts are not supported", "info");
}
function closePendingReceiptsModal() {
  document.getElementById("pending-receipts-modal")?.classList.add("hidden");
}
// Modal Functions
function applyInventoryPrefillToNewGRNModal() {
  const prefill = window.__grnInventoryPrefill;
  if (!prefill || prefill.source !== "low-stock") return;

  const supplierSelect = document.getElementById("grn-supplier");
  if (supplierSelect) {
    if (prefill.supplierId) {
      supplierSelect.value = String(prefill.supplierId);
    }

    if (!supplierSelect.value && prefill.supplierName) {
      const matchingOption = Array.from(supplierSelect.options).find((opt) =>
        (opt.textContent || "")
          .toLowerCase()
          .includes(prefill.supplierName.toLowerCase())
      );
      if (matchingOption) supplierSelect.value = matchingOption.value;
    }
  }

  addGRNItem();

  const row = document.getElementById("grn-items-container")?.children[0];
  const productName = `${prefill.productName || ""}${
    prefill.variantName ? ` — ${prefill.variantName}` : ""
  }`.trim();

  const productInput = document.getElementById("product-search-0");
  if (productInput) productInput.value = productName;

  const selectedProductInput = document.getElementById("selected-product-0");
  if (selectedProductInput)
    selectedProductInput.value = String(prefill.productVariantId || "");

  if (row) {
    const qtyInput = row.cells[1]?.querySelector("input");
    const costInput = row.cells[2]?.querySelector("input");
    const sellingPriceInput = row.cells[3]?.querySelector("input");
    const stockTypeSelect = row.querySelector(".grn-stock-type");

    if (qtyInput) qtyInput.value = Number(prefill.quantity || 1);
    if (costInput) costInput.value = Number(prefill.buyingPrice || 0);
    const prefillSelling = Number(prefill.sellingPrice || 0);
    if (sellingPriceInput) {
      sellingPriceInput.value =
        prefillSelling > 0
          ? prefillSelling
          : grnLastSellingPrice !== null
          ? grnLastSellingPrice
          : "";
      if (prefillSelling > 0) grnLastSellingPrice = prefillSelling;
    }
    if (stockTypeSelect) {
      const normalizedType = String(prefill.stockType || "")
        .toLowerCase()
        .startsWith("repair")
        ? "Repair"
        : "Main";
      stockTypeSelect.value = normalizedType;
    }

    calculateItemTotal(0);
  }

  window.__grnInventoryPrefill = null;
}

function openNewGRNModal() {
  grnModalItems = [];

  // Populate supplier dropdown from real API data
  const supSel = document.getElementById("grn-supplier");
  if (supSel) {
    supSel.innerHTML =
      '<option value="">Select Sales REP</option>' +
      grnSuppliers
        .map(
          (s) =>
            `<option value="${s.id}">${s.name}${
              s.companyName ? " (" + s.companyName + ")" : ""
            }</option>`
        )
        .join("");
  }
  // Set today's date
  const today = new Date().toISOString().split("T")[0];
  const grnDate = document.getElementById("grn-date");
  if (grnDate) grnDate.value = today;

  // Reset fields
  const invoiceEl = document.getElementById("grn-invoice");
  if (invoiceEl) invoiceEl.value = "";
  const creditDurationEl = document.getElementById("grn-credit-duration");
  if (creditDurationEl) creditDurationEl.value = "";
  const creditUnitEl = document.getElementById("grn-credit-duration-unit");
  if (creditUnitEl) creditUnitEl.value = "day";
  const container = document.getElementById("grn-items-container");
  if (container) container.innerHTML = "";
  grnLastSellingPrice = null;

  updateGRNTotals();
  document.getElementById("new-grn-modal").classList.remove("hidden");

  applyInventoryPrefillToNewGRNModal();

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

function closeNewGRNModal() {
  document.getElementById("new-grn-modal").classList.add("hidden");
  document.getElementById("new-grn-form")?.reset();
  const container = document.getElementById("grn-items-container");
  if (container) container.innerHTML = "";
  grnModalItems = [];
  grnSearchTimers = {};
}

// ─── Helper / Formatter Functions ────────────────────────────────────────────

function fmtGrnNum(n) {
  return Number(n || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtGrnDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCreditDuration(grn) {
  const value = Number(grn?.creditDurationValue);
  const unit = String(grn?.creditDurationUnit || "").toLowerCase();
  if (Number.isInteger(value) && value > 0 && unit) {
    const labels = {
      day: ["day", "days"],
      week: ["week", "weeks"],
      month: ["month", "months"],
      year: ["year", "years"],
    };
    const pair = labels[unit];
    if (pair) return `${value} ${value === 1 ? pair[0] : pair[1]}`;
  }
  if (grn?.creditDurationDays) return `${grn.creditDurationDays} days`;
  return "—";
}

function addCreditDurationToDate(startDate, value, unit) {
  const d = new Date(startDate);
  if (unit === "week") d.setDate(d.getDate() + value * 7);
  else if (unit === "month") d.setMonth(d.getMonth() + value);
  else if (unit === "year") d.setFullYear(d.getFullYear() + value);
  else d.setDate(d.getDate() + value);
  return d;
}

function paymentStatusBadge(name) {
  const n = (name || "").toLowerCase();
  if (n === "paid")
    return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>`;
  if (n === "partial")
    return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Partial</span>`;
  if (n === "pending")
    return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Pending</span>`;
  return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">${
    name || "—"
  }</span>`;
}

function grnToast(msg, type = "success") {
  if (typeof showNotification === "function") {
    showNotification(msg, type);
  } else {
    console.log(`[GRN ${type}] ${msg}`);
  }
}

function onSellingPriceInput(itemIndex) {
  const container = document.getElementById("grn-items-container");
  const row = container?.children[itemIndex];
  if (!row) return;

  const sellingPrice =
    parseFloat(row.querySelector(".grn-selling-price")?.value) || 0;
  if (sellingPrice > 0) grnLastSellingPrice = sellingPrice;
  calculateItemTotal(itemIndex);
}

/** View-only profit %: ((selling - cost) / cost) * 100 */
function calcGrnSellingPct(costPrice, sellingPrice) {
  const cost = Number(costPrice) || 0;
  const selling = Number(sellingPrice) || 0;
  if (cost <= 0 || selling <= 0) return null;
  return ((selling - cost) / cost) * 100;
}

function fmtGrnSellingPct(costPrice, sellingPrice) {
  const pct = calcGrnSellingPct(costPrice, sellingPrice);
  if (pct === null) return "—";
  return `${pct.toFixed(2)}%`;
}

// ─── GRN Item Management ──────────────────────────────────────────────────────

const GRN_EDITABLE_CELL_SELECTOR =
  ".grn-qty, .grn-cost-price, .grn-selling-price";

function bindGRNItemFocusBehavior() {
  const container = document.getElementById("grn-items-container");
  if (!container || container.dataset.focusBehaviorBound === "true") return;
  container.dataset.focusBehaviorBound = "true";

  container.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!target?.matches?.(GRN_EDITABLE_CELL_SELECTOR)) return;
    requestAnimationFrame(() => {
      if (document.activeElement === target) target.select();
    });
  });
}

function reindexGRNItemRows() {
  const container = document.getElementById("grn-items-container");
  if (!container) return;

  Array.from(container.children).forEach((row, itemIndex) => {
    row.dataset.itemIndex = String(itemIndex);

    const searchInput = row.querySelector(".grn-product-search");
    if (searchInput) {
      searchInput.id = `product-search-${itemIndex}`;
      searchInput.setAttribute("oninput", `searchGRNProducts(${itemIndex})`);
      searchInput.setAttribute("onfocus", `positionDropdown(${itemIndex})`);
      searchInput.setAttribute(
        "onkeydown",
        `handleGRNSearchKeydown(event, ${itemIndex})`
      );
    }

    const resultsDiv = row.querySelector(".grn-product-results");
    if (resultsDiv) resultsDiv.id = `product-results-${itemIndex}`;

    const hiddenInput = row.querySelector(".grn-selected-product");
    if (hiddenInput) {
      hiddenInput.id = `selected-product-${itemIndex}`;
      hiddenInput.name = `product-${itemIndex}`;
    }

    const qtyInput = row.cells[1]?.querySelector("input");
    if (qtyInput) {
      qtyInput.setAttribute("oninput", `calculateItemTotal(${itemIndex})`);
    }
    const costInput = row.cells[2]?.querySelector("input");
    if (costInput) {
      costInput.setAttribute("oninput", `calculateItemTotal(${itemIndex})`);
    }
    const sellingInput = row.cells[3]?.querySelector("input");
    if (sellingInput) {
      sellingInput.setAttribute("oninput", `onSellingPriceInput(${itemIndex})`);
    }
  });
}

function addGRNItem(focusSearch = false) {
  const container = document.getElementById("grn-items-container");
  const itemIndex = container.children.length;
  bindGRNItemFocusBehavior();
  const defaultSelling =
    grnLastSellingPrice !== null ? grnLastSellingPrice : "";

  const itemRow = document.createElement("tr");
  itemRow.className = "border-t grn-item-row";
  itemRow.dataset.itemIndex = String(itemIndex);
  itemRow.innerHTML = `
    <td class="px-3 py-2 relative" style="min-width: 16rem;">
      <div class="relative">
        <input type="text" id="product-search-${itemIndex}" class="grn-product-search w-full border border-gray-300 rounded px-2 py-1 text-sm" 
               placeholder="Search product..." required oninput="searchGRNProducts(${itemIndex})" onfocus="positionDropdown(${itemIndex})" onkeydown="handleGRNSearchKeydown(event, ${itemIndex})" />
        <div id="product-results-${itemIndex}" class="grn-product-results fixed z-[9999] w-72 bg-white border border-gray-200 rounded-md shadow-xl hidden max-h-48 overflow-y-auto">
        </div>
        <input type="hidden" id="selected-product-${itemIndex}" class="grn-selected-product" name="product-${itemIndex}" />
      </div>
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 6rem;">
      <input type="number" class="grn-qty w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" min="0" required oninput="calculateItemTotal(${itemIndex})" />
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 7rem;">
      <input type="number" class="grn-cost-price w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" step="0.01" min="0" required oninput="calculateItemTotal(${itemIndex})" />
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 7rem;">
      <input type="number" class="grn-selling-price w-full border border-gray-300 rounded px-2 py-1 text-sm text-right" step="0.01" min="0" required placeholder="0.00" value="${defaultSelling}" oninput="onSellingPriceInput(${itemIndex})" />
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 6rem;">
      <input type="text" class="grn-selling-pct w-full border border-gray-300 rounded px-2 py-1 text-sm bg-gray-100 text-right text-gray-700" readonly tabindex="-1" value="—" title="Auto-calculated profit % (not saved)" />
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 7rem;">
      <input type="text" class="grn-line-total w-full border border-gray-300 rounded px-2 py-1 text-sm bg-gray-100 text-right" readonly tabindex="-1" value="0.00" />
    </td>
    <td class="px-3 py-2 whitespace-nowrap" style="min-width: 6rem;">
      <select class="grn-stock-type w-full border border-gray-300 rounded px-2 py-1 text-sm font-medium">
        <option value="Main" class="text-blue-700">Main</option>
        <option value="Repair" class="text-orange-700">Repair</option>
      </select>
    </td>
    <td class="px-3 py-2 text-center whitespace-nowrap">
      <button type="button" tabindex="-1" onclick="removeGRNItem(this)" class="text-red-600 hover:text-red-900">
        <i data-feather="trash-2" class="w-4 h-4"></i>
      </button>
    </td>
  `;

  container.appendChild(itemRow);
  if (typeof feather !== "undefined") feather.replace();
  calculateItemTotal(itemIndex);

  if (focusSearch) {
    document.getElementById(`product-search-${itemIndex}`)?.focus();
  }
}

function removeGRNItem(button) {
  button.closest("tr")?.remove();
  reindexGRNItemRows();
  updateGRNTotals();
}

// Product search functionality for GRN items
function searchGRNProducts(itemIndex) {
  const input = document.getElementById(`product-search-${itemIndex}`);
  const resultsDiv = document.getElementById(`product-results-${itemIndex}`);
  const term = (input?.value || "").trim();

  if (term.length < 2) {
    resultsDiv?.classList.add("hidden");
    return;
  }

  // Debounce
  if (grnSearchTimers[itemIndex]) clearTimeout(grnSearchTimers[itemIndex]);
  grnSearchTimers[itemIndex] = setTimeout(async () => {
    try {
      const data = await grnRequest(
        `/grn/search-variants?term=${encodeURIComponent(term)}`
      );
      if (!Array.isArray(data) || data.length === 0) {
        resultsDiv.innerHTML =
          '<div class="p-3 text-gray-500 text-sm">No products found</div>';
        positionDropdown(itemIndex);
        resultsDiv.classList.remove("hidden");
        return;
      }

      resultsDiv.innerHTML = data
        .map((v) => {
          const display = v.productName;
          const brandModelParts = [];
          if (v.brandName) brandModelParts.push(String(v.brandName).trim());
          if (
            v.modelNumber &&
            String(v.modelNumber).trim().toLowerCase() !==
              String(v.brandName || "")
                .trim()
                .toLowerCase()
          ) {
            brandModelParts.push(String(v.modelNumber).trim());
          }
          const brandModelText = brandModelParts.filter(Boolean).join(" · ");
          const specText = Object.values(v.specifications || {})
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .join(" • ");
          const selectedText = v.variantName
            ? `${v.productName} — ${v.variantName}`
            : specText
            ? `${v.productName} — ${specText}`
            : brandModelText
            ? `${v.productName} — ${brandModelText}`
            : v.productName;
          const price = v.lastBuyingPrice
            ? ` <span class="text-gray-400">(${fmtGrnNum(
                v.lastBuyingPrice
              )})</span>`
            : "";
          const safeSelectedText = grnEscapeAttr(selectedText);
          const safeDisplay = grnEscapeHtml(display);
          const safeBrandModel = grnEscapeHtml(brandModelText);
          const safeSpec = grnEscapeHtml(specText);
          const safeBarcodeLabel = grnEscapeHtml(v.barcode || "");
          return `<div class="grn-result-item p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onclick="selectGRNProduct(${itemIndex}, ${
            v.id
          }, '${safeSelectedText}', ${v.lastBuyingPrice || 0}, ${
            v.lastSellingPrice || 0
          })">
            <div class="font-medium text-gray-900 text-sm">${safeDisplay}${price}</div>
            ${
              brandModelText
                ? `<div class="text-xs text-gray-600 mt-0.5">${safeBrandModel}</div>`
                : ""
            }
            ${
              specText
                ? `<div class="text-xs text-blue-600 mt-0.5">${safeSpec}</div>`
                : ""
            }
            ${
              v.barcode
                ? `<div class="text-xs text-gray-400">${safeBarcodeLabel}</div>`
                : ""
            }
          </div>`;
        })
        .join("");

      positionDropdown(itemIndex);
      resultsDiv.classList.remove("hidden");
      setGRNActiveResult(resultsDiv, 0);
    } catch (err) {
      console.error("Product search error:", err);
      resultsDiv.innerHTML =
        '<div class="p-3 text-red-500 text-sm">Search failed</div>';
      positionDropdown(itemIndex);
      resultsDiv.classList.remove("hidden");
    }
  }, 300);
}

const GRN_ACTIVE_RESULT_CLASSES = ["bg-blue-50", "ring-1", "ring-blue-200"];

function setGRNActiveResult(resultsDiv, index) {
  if (!resultsDiv) return null;
  const items = resultsDiv.querySelectorAll(".grn-result-item");
  if (items.length === 0) {
    delete resultsDiv.dataset.activeIndex;
    return null;
  }

  const nextIndex = ((index % items.length) + items.length) % items.length;
  items.forEach((item, i) => {
    item.classList.toggle(GRN_ACTIVE_RESULT_CLASSES[0], i === nextIndex);
    item.classList.toggle(GRN_ACTIVE_RESULT_CLASSES[1], i === nextIndex);
    item.classList.toggle(GRN_ACTIVE_RESULT_CLASSES[2], i === nextIndex);
  });

  resultsDiv.dataset.activeIndex = String(nextIndex);
  items[nextIndex].scrollIntoView({ block: "nearest" });
  return items[nextIndex];
}

function handleGRNSearchKeydown(event, itemIndex) {
  const resultsDiv = document.getElementById(`product-results-${itemIndex}`);
  const isOpen = resultsDiv && !resultsDiv.classList.contains("hidden");
  const items = isOpen
    ? resultsDiv.querySelectorAll(".grn-result-item")
    : [];
  const activeIndex = Number(resultsDiv?.dataset.activeIndex ?? 0) || 0;

  switch (event.key) {
    case "ArrowDown":
      if (!isOpen || items.length === 0) return;
      event.preventDefault();
      setGRNActiveResult(resultsDiv, activeIndex + 1);
      break;
    case "ArrowUp":
      if (!isOpen || items.length === 0) return;
      event.preventDefault();
      setGRNActiveResult(resultsDiv, activeIndex - 1);
      break;
    case "Enter":
      // Always block submit here: the GRN modal is a form
      event.preventDefault();
      if (isOpen && items.length > 0) {
        (items[activeIndex] || items[0]).click();
      }
      break;
    case "Escape":
      if (!isOpen) return;
      event.preventDefault();
      resultsDiv.classList.add("hidden");
      break;
    case "Tab":
      if (isOpen) resultsDiv.classList.add("hidden");
      break;
    default:
      break;
  }
}

function selectGRNProduct(
  itemIndex,
  productId,
  selectedText,
  lastBuyingPrice,
  lastSellingPrice
) {
  // Set display name
  const searchInput = document.getElementById(`product-search-${itemIndex}`);
  if (searchInput) searchInput.value = selectedText;

  // Store variant ID in hidden field
  const hiddenInput = document.getElementById(`selected-product-${itemIndex}`);
  if (hiddenInput) hiddenInput.value = productId;

  // Pre-fill price columns if last known prices exist
  const container = document.getElementById("grn-items-container");
  const row = container?.children[itemIndex];
  if (row) {
    const qtyInput = row.cells[1]?.querySelector("input");
    const costInput = row.cells[2]?.querySelector("input");
    const sellingPriceInput = row.cells[3]?.querySelector("input");

    if (qtyInput) qtyInput.value = 1;
    const resolvedCost = Number(lastBuyingPrice) || 0;
    if (costInput) costInput.value = resolvedCost;

    const resolvedSelling = Number(lastSellingPrice) || 0;
    const finalSelling =
      resolvedSelling > 0
        ? resolvedSelling
        : grnLastSellingPrice !== null
        ? grnLastSellingPrice
        : "";
    if (sellingPriceInput) sellingPriceInput.value = finalSelling;
    if (Number(finalSelling) > 0) grnLastSellingPrice = Number(finalSelling);
  }

  // Recalculate totals
  calculateItemTotal(itemIndex);

  // Hide dropdown
  document
    .getElementById(`product-results-${itemIndex}`)
    ?.classList.add("hidden");

  // Move straight into Received Qty; the focusin handler highlights the value
  const qtyInput = row?.querySelector(".grn-qty");
  if (qtyInput) setTimeout(() => qtyInput.focus(), 0);
}

function positionDropdown(itemIndex) {
  const input = document.getElementById(`product-search-${itemIndex}`);
  const dropdown = document.getElementById(`product-results-${itemIndex}`);

  if (input && dropdown) {
    const rect = input.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + 2}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.width = `${Math.max(rect.width, 250)}px`;
  }
}

// Add click outside handler to close dropdowns
document.addEventListener("click", function (event) {
  // Check if click is outside any product search dropdown
  const searchInputs = document.querySelectorAll('[id^="product-search-"]');
  searchInputs.forEach((input, index) => {
    const resultsDiv = document.getElementById(`product-results-${index}`);
    if (resultsDiv && !resultsDiv.classList.contains("hidden")) {
      const searchContainer = input.closest(".relative");
      if (searchContainer && !searchContainer.contains(event.target)) {
        resultsDiv.classList.add("hidden");
      }
    }
  });
});

function calculateItemTotal(itemIndex) {
  const container = document.getElementById("grn-items-container");
  const row = container.children[itemIndex];
  if (row) {
    const receivedQty =
      parseFloat(row.cells[1].querySelector("input").value) || 0;
    const unitCost = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const sellingPrice =
      parseFloat(row.querySelector(".grn-selling-price")?.value) || 0;
    const total = receivedQty * unitCost;
    const totalInput = row.querySelector(".grn-line-total");
    if (totalInput) totalInput.value = fmtGrnNum(total);
    const pctInput = row.querySelector(".grn-selling-pct");
    if (pctInput) pctInput.value = fmtGrnSellingPct(unitCost, sellingPrice);
  }
  updateGRNTotals();
}

function updateGRNTotals() {
  const container = document.getElementById("grn-items-container");
  let totalValue = 0;

  for (let i = 0; i < container.children.length; i++) {
    const row = container.children[i];
    const receivedQty =
      parseFloat(row.cells[1]?.querySelector("input")?.value) || 0;
    const unitCost =
      parseFloat(row.cells[2]?.querySelector("input")?.value) || 0;
    totalValue += receivedQty * unitCost;
  }

  // Update modal footer total
  const modalTotalEl = document.getElementById("modal-total-value");
  if (modalTotalEl) modalTotalEl.textContent = fmtGrnNum(totalValue);
}

// Action Functions
function viewGRNLegacy(id) {
  const grn = [...grnData, ...draftGRNs].find(
    (g) => g.grnId === id || g.id === id
  );
  if (grn) {
    let statusColor = "bg-yellow-100 text-yellow-800";
    if (grn.status === "Completed") statusColor = "bg-green-100 text-green-800";
    else if (grn.status === "Draft") statusColor = "bg-gray-100 text-gray-800";

    const items = grn.items || [];
    const itemsHtml = Array.isArray(items)
      ? items
          .map((item) => {
            const stockBadge =
              item.stockType === "Repair" || item.stockType === "Repair Stock"
                ? `<span class="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">Repair</span>`
                : `<span class="inline-flex px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">Main</span>`;
            return `
              <tr class="border-t">
                <td class="px-4 py-2">${item.product || item}</td>
                <td class="px-4 py-2">${item.receivedQty || "N/A"}</td>
                <td class="px-4 py-2">${
                  item.unitCost
                    ? `Rs. ${Number(item.unitCost).toLocaleString()}`
                    : "N/A"
                }</td>
                <td class="px-4 py-2">${
                  item.sellingPrice
                    ? `Rs. ${Number(item.sellingPrice).toLocaleString()}`
                    : "N/A"
                }</td>
                <td class="px-4 py-2">${item.barcode || "-"}</td>
                <td class="px-4 py-2">${item.condition || "Good"}</td>
                <td class="px-4 py-2">${stockBadge}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="7" class="px-4 py-2 text-center text-gray-500">No items data</td></tr>`;

    // Payment summary section
    const payBadge =
      grn.paymentStatus === "Paid"
        ? `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Paid</span>`
        : grn.paymentStatus === "Credit"
        ? `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Credit</span>`
        : `<span class="text-xs text-gray-400">—</span>`;

    const paymentHtml = `
      <div class="mb-6">
        <h3 class="font-medium mb-3">Payment Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Payment Type</p>
            <p class="text-sm font-semibold">${grn.paymentType || "—"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
            <p>${payBadge}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Paid Amount</p>
            <p class="text-sm font-semibold text-green-700">Rs. ${(
              grn.paidAmount || 0
            ).toLocaleString()}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Balance</p>
            <p class="text-sm font-semibold ${
              grn.balance > 0 ? "text-red-600" : "text-gray-500"
            }">Rs. ${(grn.balance || 0).toLocaleString()}</p>
          </div>
          ${
            grn.nextPaymentDate
              ? `<div class="md:col-span-4"><p class="text-xs text-gray-500 uppercase font-medium mb-1">Next Payment Date</p><p class="text-sm font-semibold">${grn.nextPaymentDate}</p></div>`
              : ""
          }
        </div>
      </div>
    `;

    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeViewModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-xl font-semibold">GRN Details - ${
              grn.grnId || grn.id
            }</h2>
            <button onclick="closeViewModal()" class="text-gray-400 hover:text-gray-600">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 class="font-medium mb-3">Basic Information</h3>
                <p><strong>Date:</strong> ${grn.date}</p>
                <p><strong>Sales REP:</strong> ${grn.supplier}</p>
                <p><strong>PO Reference:</strong> ${
                  grn.poReference || "N/A"
                }</p>
                <p><strong>Status:</strong> <span class="inline-flex px-2 py-1 text-xs rounded-full ${statusColor}">${
      grn.status
    }</span></p>
              </div>
              <div>
                <h3 class="font-medium mb-3">Additional Details</h3>
                <p><strong>Invoice:</strong> ${grn.invoice || "N/A"}</p>
                <p><strong>Received By:</strong> ${grn.receivedBy || "N/A"}</p>
                <p><strong>Total Value:</strong> Rs. ${(
                  grn.totalValue || 0
                ).toLocaleString()}</p>
              </div>
            </div>
            ${paymentHtml}
            <div class="mb-6">
              <h3 class="font-medium mb-3">Items</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full border border-gray-300">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left">Product</th>
                      <th class="px-4 py-2 text-left">Quantity</th>
                      <th class="px-4 py-2 text-left">Cost Price</th>
                      <th class="px-4 py-2 text-left">Selling Price</th>
                      <th class="px-4 py-2 text-left">Barcode</th>
                      <th class="px-4 py-2 text-left">Condition</th>
                      <th class="px-4 py-2 text-left">Stock Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    feather.replace();
  }
}

function editGRNLegacy(id) {
  const grn = [...grnData, ...draftGRNs].find(
    (g) => g.grnId === id || g.id === id
  );
  if (grn) {
    if (grn.status === "Completed") {
      showNotification("Cannot edit completed GRNs", "error");
      return;
    }

    // Open the new GRN modal with pre-filled data
    openNewGRNModal();

    // Pre-fill the form with existing data
    setTimeout(() => {
      if (grn.date) document.getElementById("grn-date").value = grn.date;
      if (grn.supplier)
        document.getElementById("grn-supplier").value = grn.supplier;
      if (grn.poReference && document.getElementById("grn-po-ref"))
        document.getElementById("grn-po-ref").value = grn.poReference;
      if (grn.invoice && document.getElementById("grn-invoice"))
        document.getElementById("grn-invoice").value = grn.invoice;
      if (grn.receivedBy && document.getElementById("grn-received-by"))
        document.getElementById("grn-received-by").value = grn.receivedBy;

      // Remove existing items and add the saved ones
      document.getElementById("grn-items-container").innerHTML = "";
      if (grn.items && Array.isArray(grn.items)) {
        grn.items.forEach((item, index) => {
          addGRNItem();
          if (item.product)
            document.getElementById(`product-search-${index}`).value =
              item.product;
          if (item.productId)
            document.getElementById(`selected-product-${index}`).value =
              item.productId;
        });
        // Update totals after items are added
        setTimeout(() => updateGRNTotals(), 50);
      }

      showNotification(`Editing GRN: ${grn.grnId || grn.id}`, "info");
    }, 100);
  }
}

function printGRNLegacy(id) {
  const grn = [...grnData, ...draftGRNs].find(
    (g) => g.grnId === id || g.id === id
  );
  if (grn) {
    const items = grn.items || [];
    const itemsHtml = Array.isArray(items)
      ? items
          .map(
            (item) => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.product || item
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.receivedQty || "N/A"
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.unitCost
                ? `Rs. ${Number(item.unitCost).toLocaleString()}`
                : "N/A"
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.sellingPrice
                ? `Rs. ${Number(item.sellingPrice).toLocaleString()}`
                : "N/A"
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.barcode || "-"
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.condition || "Good"
            }</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${
              item.stockType || "Main"
            }</td>
          </tr>
        `
          )
          .join("")
      : '<tr><td colspan="7" style="border: 1px solid #ccc; padding: 8px; text-align: center;">No items</td></tr>';

    const htmlContent = `
      <html>
        <head>
          <title>GRN - ${grn.grnId || grn.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .payment-box { background: #f9f9f9; border: 1px solid #ddd; border-radius: 6px; padding: 12px; margin-bottom: 20px; }
            .payment-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            .payment-item label { font-size: 11px; color: #888; text-transform: uppercase; display: block; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Goods Received Note</h1>
            <h2>GRN ID: ${grn.grnId || grn.id}</h2>
          </div>
          <div class="info">
            <div>
              <p><strong>Date:</strong> ${grn.date}</p>
              <p><strong>Sales REP:</strong> ${grn.supplier}</p>
              <p><strong>PO Reference:</strong> ${grn.poReference || "N/A"}</p>
            </div>
            <div>
              <p><strong>Invoice:</strong> ${grn.invoice || "N/A"}</p>
              <p><strong>Received By:</strong> ${grn.receivedBy || "N/A"}</p>
              <p><strong>Status:</strong> ${grn.status}</p>
            </div>
          </div>
          <div class="payment-box">
            <strong>Payment Summary</strong>
            <div class="payment-grid" style="margin-top:8px;">
              <div><label>Payment Type</label>${grn.paymentType || "—"}</div>
              <div><label>Payment Status</label>${
                grn.paymentStatus || "—"
              }</div>
              <div><label>Paid Amount</label>Rs. ${(
                grn.paidAmount || 0
              ).toLocaleString()}</div>
              <div><label>Balance</label>Rs. ${(
                grn.balance || 0
              ).toLocaleString()}</div>
              ${
                grn.nextPaymentDate
                  ? `<div style="grid-column:span 4"><label>Next Payment Date</label>${grn.nextPaymentDate}</div>`
                  : ""
              }
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Barcode</th>
                <th>Condition</th>
                <th>Stock Type</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;
    if (typeof printHtmlContent === "function") {
      printHtmlContent(htmlContent);
    } else {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    }
  }
}

function receiveItemsLegacy(id) {
  const receipt = pendingReceiptsData.find((r) => r.poNumber === id);
  if (receipt) {
    // Open new GRN modal with PO data pre-filled
    openNewGRNModal();

    setTimeout(() => {
      // Pre-fill supplier and PO reference (if field exists)
      if (document.getElementById("grn-po-ref")) {
        document.getElementById("grn-po-ref").value = receipt.poNumber;
      }

      // Set today's date
      const today = new Date().toISOString().split("T")[0];
      document.getElementById("grn-date").value = today;

      // Refresh totals in modal
      setTimeout(() => updateGRNTotals(), 50);
      showNotification(`Started GRN for PO: ${receipt.poNumber}`, "info");
    }, 100);
  }
}

function viewPOLegacy(id) {
  const po = pendingReceiptsData.find((p) => p.poNumber === id);
  if (po) {
    const modalHtml = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeViewModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-xl font-semibold">Purchase Order - ${
              po.poNumber
            }</h2>
            <button onclick="closeViewModal()" class="text-gray-400 hover:text-gray-600">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-6">
              <div>
                <p><strong>PO Number:</strong> ${po.poNumber}</p>
                <p><strong>Sales REP:</strong> ${po.supplier}</p>
                <p><strong>Expected Date:</strong> ${po.expectedDate}</p>
              </div>
              <div>
                <p><strong>Items Count:</strong> ${po.items}</p>
                <p><strong>Total Value:</strong> Rs. ${po.value.toLocaleString()}</p>
                <p><strong>Status:</strong> <span class="bg-orange-100 text-orange-800 px-2 py-1 text-xs rounded-full">Pending Receipt</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    feather.replace();
  }
}

// Function to close view modals
function closeViewModalLegacy() {
  const modals = document.querySelectorAll(
    ".fixed.inset-0.bg-black.bg-opacity-50"
  );
  modals.forEach((modal) => {
    if (modal.onclick && modal.onclick.toString().includes("closeViewModal")) {
      modal.remove();
    }
  });
}

function saveDraftGRNLegacy() {
  // Collect form data
  const grnDate = document.getElementById("grn-date").value;
  const supplier = document.getElementById("grn-supplier").value;
  const poRef = document.getElementById("grn-po-ref")?.value || "";
  const invoice = document.getElementById("grn-invoice")?.value || "";
  const receivedBy = document.getElementById("grn-received-by")?.value || "";

  if (!grnDate || !supplier) {
    showNotification(
      "Please fill in required fields (Date and Sales REP)",
      "error"
    );
    return;
  }

  // Collect items data
  const itemsContainer = document.getElementById("grn-items-container");
  const items = [];
  const stockTypeSet = new Set();

  for (let i = 0; i < itemsContainer.children.length; i++) {
    const row = itemsContainer.children[i];
    const productSearch = document.getElementById(`product-search-${i}`);
    const selectedProduct = document.getElementById(`selected-product-${i}`);
    const receivedQty = row.cells[1].querySelector("input").value;
    const unitCost = row.cells[2].querySelector("input").value;
    const sellingPrice = row.cells[3].querySelector("input").value;
    const barcode = row.cells[4].querySelector("input").value;
    const condition = row.cells[6].querySelector("select").value;
    const stockType = row.cells[7].querySelector("select").value;

    if (productSearch && productSearch.value) {
      stockTypeSet.add(stockType);
      items.push({
        product: productSearch.value,
        productId: selectedProduct ? selectedProduct.value : "",
        receivedQty: receivedQty || 0,
        unitCost: unitCost || 0,
        sellingPrice: sellingPrice || 0,
        barcode: barcode || "",
        condition: condition,
        stockType: stockType,
      });
    }
  }

  // Collect payment data
  const paymentType =
    document.getElementById("grn-payment-type")?.value || "Full Payment";
  const paidAmountRaw =
    parseFloat(document.getElementById("grn-paid-amount")?.value) || 0;
  const nextPaymentDate =
    document.getElementById("grn-next-payment-date")?.value || "";
  const totalValue = items.reduce(
    (sum, it) => sum + parseFloat(it.receivedQty) * parseFloat(it.unitCost),
    0
  );
  const paidAmount =
    paymentType === "Full Payment" ? totalValue : paidAmountRaw;
  const balance = Math.max(0, totalValue - paidAmount);

  const draftGRN = {
    id: `DRAFT-${Date.now()}`,
    date: grnDate,
    supplier: supplier,
    poReference: poRef,
    invoice: invoice,
    receivedBy: receivedBy,
    items: items,
    qualityCheck: {
      physicalInspection:
        document.getElementById("physical-inspection")?.value || null,
      documentation:
        document.getElementById("documentation-check")?.value || null,
      notes: document.getElementById("quality-notes")?.value || null,
    },
    status: "Draft",
    paymentStatus: paymentType === "Full Payment" ? "Paid" : "Credit",
    paymentType: paymentType,
    paidAmount: paidAmount,
    balance: balance,
    nextPaymentDate: nextPaymentDate,
    stockTypes: Array.from(stockTypeSet),
    totalValue: totalValue,
    createdAt: new Date().toISOString(),
  };

  // Add to drafts array
  draftGRNs.push(draftGRN);

  // Close modal and show success
  closeNewGRNModal();
  showNotification(`GRN saved as draft (ID: ${draftGRN.id})`, "success");

  // Refresh data
  loadGRNData();
}

function completeGRNLegacy(event) {
  event.preventDefault();

  const grnDate = document.getElementById("grn-date").value;
  const supplier = document.getElementById("grn-supplier").value;
  const poRef = document.getElementById("grn-po-ref")?.value || "";
  const invoice = document.getElementById("grn-invoice")?.value || "";
  const receivedBy = document.getElementById("grn-received-by")?.value || "";

  if (!grnDate || !supplier) {
    showNotification(
      "Please fill in required fields (Date and Sales REP)",
      "error"
    );
    return;
  }

  // Collect items
  const itemsContainer = document.getElementById("grn-items-container");
  if (!itemsContainer.children.length) {
    showNotification("Please add at least one item", "error");
    return;
  }

  const items = [];
  const stockTypeSet = new Set();

  for (let i = 0; i < itemsContainer.children.length; i++) {
    const row = itemsContainer.children[i];
    const productSearch = document.getElementById(`product-search-${i}`);
    const selectedProduct = document.getElementById(`selected-product-${i}`);
    const receivedQty =
      parseFloat(row.cells[1].querySelector("input").value) || 0;
    const unitCost = parseFloat(row.cells[2].querySelector("input").value) || 0;
    const sellingPrice =
      parseFloat(row.cells[3].querySelector("input").value) || 0;
    const barcode = row.cells[4].querySelector("input").value;
    const condition = row.cells[6].querySelector("select").value;
    const stockType = row.cells[7].querySelector("select").value;

    if (productSearch && productSearch.value) {
      stockTypeSet.add(stockType);
      items.push({
        product: productSearch.value,
        productId: selectedProduct ? selectedProduct.value : "",
        receivedQty: receivedQty,
        unitCost: unitCost,
        sellingPrice: sellingPrice,
        barcode: barcode || "",
        condition: condition,
        stockType: stockType,
      });
    }
  }

  // Collect payment data
  const paymentType =
    document.getElementById("grn-payment-type")?.value || "Full Payment";
  const paidAmountRaw =
    parseFloat(document.getElementById("grn-paid-amount")?.value) || 0;
  const nextPaymentDate =
    document.getElementById("grn-next-payment-date")?.value || "";
  const totalValue = items.reduce(
    (sum, it) => sum + it.receivedQty * it.unitCost,
    0
  );

  let paidAmount, balance;
  if (paymentType === "Full Payment") {
    paidAmount = totalValue;
    balance = 0;
  } else {
    if (paidAmountRaw <= 0) {
      showNotification("Please enter the amount paid for credit GRN", "error");
      return;
    }
    if (paidAmountRaw > totalValue) {
      showNotification(
        "Paid amount cannot exceed the total GRN value",
        "error"
      );
      return;
    }
    paidAmount = paidAmountRaw;
    balance = totalValue - paidAmountRaw;
  }

  const newGrnId = `GRN-${new Date().getFullYear()}-${String(
    grnData.length + draftGRNs.length + 1
  ).padStart(3, "0")}`;

  const completedGRN = {
    id: grnData.length + draftGRNs.length + 1,
    grnId: newGrnId,
    date: grnDate,
    supplier: supplier,
    poReference: poRef,
    invoice: invoice,
    receivedBy: receivedBy,
    items: items,
    status: "Completed",
    paymentStatus: paymentType === "Full Payment" ? "Paid" : "Credit",
    paymentType: paymentType,
    paidAmount: paidAmount,
    balance: balance,
    nextPaymentDate: nextPaymentDate,
    stockTypes: Array.from(stockTypeSet),
    totalValue: totalValue,
    createdAt: new Date().toISOString(),
  };

  grnData.unshift(completedGRN);

  // If credit payment, add to suppliers payments data
  if (paymentType === "Credit" && typeof paymentsData !== "undefined") {
    paymentsData.push({
      grnNo: newGrnId,
      supplier: supplier,
      totalAmount: totalValue,
      paidAmount: paidAmount,
      balance: balance,
      status: paidAmount === 0 ? "Pending" : "Partial",
      nextPayment: nextPaymentDate || "-",
      installments:
        paidAmount > 0
          ? [{ date: grnDate, amount: paidAmount, type: "Advance" }]
          : [],
    });
  }

  closeNewGRNModal();
  loadGRNData();
  showNotification(`GRN ${newGrnId} completed successfully!`, "success");
}

function togglePaymentFields() {
  // Payment fields are removed from Create GRN; kept as no-op for backward compatibility.
}

function updatePaymentBalanceDisplay() {
  // Payment details are removed from Create GRN; kept as no-op for backward compatibility.
}

// ─── Action Functions ─────────────────────────────────────────────────────────

async function viewGRN(id) {
  try {
    const [grn, payments] = await Promise.all([
      grnRequest(`/grn/${id}`),
      grnRequest(`/grn/${id}/payments`),
    ]);
    if (!grn) {
      grnToast("GRN not found", "error");
      return;
    }

    const statusName = grn.paymentStatus?.name || "";
    const payBadge = paymentStatusBadge(statusName);
    const hasBalance = Number(grn.balance) > 0;

    const items = grn.items || [];
    const itemsHtml = items.length
      ? items
          .map(
            (item) => `
          <tr class="border-t">
            <td class="px-4 py-2">${grnEscapeHtml(item.productName || "")}${
              item.variantName
                ? ` — ${grnEscapeHtml(item.variantName)}`
                : ""
            }</td>
            <td class="px-4 py-2 whitespace-nowrap text-right">${item.quantity}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right">${fmtGrnNum(
              item.buyingPrice
            )}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right">${fmtGrnNum(
              item.sellingPrice
            )}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right text-gray-700">${fmtGrnSellingPct(
              item.buyingPrice,
              item.sellingPrice
            )}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right">${fmtGrnNum(
              item.subtotal
            )}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">No items</td></tr>`;

    // Payment installments history
    const paymentRows = Array.isArray(payments) ? [...payments] : [];
    const recordedPaidTotal = paymentRows.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const createdPaidAmount = Number(grn.amountPaid || 0);
    const missingInitialPayment = Number(
      (createdPaidAmount - recordedPaidTotal).toFixed(2)
    );

    if (missingInitialPayment > 0) {
      paymentRows.unshift({
        createdAt: grn.date,
        amount: missingInitialPayment,
        note: "Initial payment at GRN creation",
      });
    }

    const paymentsHtml = paymentRows.length
      ? paymentRows
          .map(
            (p, i) => `
          <tr class="border-t text-sm">
            <td class="px-4 py-2 text-gray-500">#${i + 1}</td>
            <td class="px-4 py-2">${fmtGrnDate(p.createdAt)}</td>
            <td class="px-4 py-2 whitespace-nowrap text-right font-semibold text-green-700">${fmtGrnNum(
              p.amount
            )}</td>
            <td class="px-4 py-2 text-gray-500">${p.note || "—"}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="px-4 py-3 text-center text-gray-400 text-sm">No additional payments recorded</td></tr>`;

    const paymentTypeOptions = grnPaymentTypes
      .filter((pt) => /^(cash|cheque|bank\s*transfer)$/i.test(pt.name || ""))
      .map((pt) => `<option value="${pt.id}">${pt.name}</option>`)
      .join("");

    const bankAccountOptions = grnBankAccounts
      .map(
        (acc) =>
          `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
      )
      .join("");

    const recordPaymentForm = hasBalance
      ? `<div class="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 class="text-sm font-semibold text-blue-800 mb-3">Record New Payment</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-gray-600 mb-1">Payment Method *</label>
              <select id="grn-pay-method-${id}" onchange="toggleGrnPaymentBankAccount(${id})"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                ${paymentTypeOptions}
              </select>
            </div>
            <div id="grn-pay-bank-wrap-${id}" class="hidden">
              <label class="block text-xs text-gray-600 mb-1">Bank Account *</label>
              <select id="grn-pay-bank-account-${id}"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                <option value="">Select Bank Account</option>
                ${bankAccountOptions}
              </select>
            </div>
            <div id="grn-pay-cheque-wrap-${id}" class="hidden">
              <label class="block text-xs text-gray-600 mb-1">Cheque Number *</label>
              <input type="text" id="grn-pay-cheque-number-${id}" maxlength="50"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="e.g. 123456" />
            </div>
          </div>
          <div class="flex gap-3 items-end">
            <div class="flex-1">
              <label class="block text-xs text-gray-600 mb-1">Amount (Rs.) *</label>
              <input type="number" id="grn-pay-amount-${id}" min="0.01" step="0.01"
                max="${grn.balance}"
                placeholder="Max: ${fmtGrnNum(grn.balance)}"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <div class="flex-1">
              <label class="block text-xs text-gray-600 mb-1">Note (optional)</label>
              <input type="text" id="grn-pay-note-${id}" placeholder="e.g. Bank transfer"
                class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onclick="recordGrnPayment(${id})" class="btn-primary px-4 py-2 text-sm text-white whitespace-nowrap">
              Record Payment
            </button>
          </div>
        </div>`
      : `<div class="mt-4 text-center text-sm text-green-600 font-medium">✓ Fully paid</div>`;

    const paymentHtml = `
      <div class="mb-6">
        <h3 class="font-medium mb-3">Payment Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-6 gap-4 bg-gray-50 rounded-lg p-4">
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Payment Type</p>
            <p class="text-sm font-semibold">${grn.paymentType?.name || "—"}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Status</p>
            <p>${payBadge}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Total Paid</p>
            <p class="text-sm font-semibold text-green-700">${fmtGrnNum(
              grn.amountPaid
            )}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Balance</p>
            <p class="text-sm font-semibold ${
              hasBalance ? "text-red-600" : "text-gray-500"
            }">
              ${fmtGrnNum(grn.balance)}
            </p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Credit Duration</p>
            <p class="text-sm font-semibold">${fmtCreditDuration(grn)}</p>
          </div>
          <div>
            <p class="text-xs text-gray-500 uppercase font-medium mb-1">Due Date</p>
            <p class="text-sm font-semibold">${
              grn.dueDate ? fmtGrnDate(grn.dueDate) : "—"
            }</p>
          </div>
        </div>
        <div class="mt-4">
          <h4 class="text-sm font-semibold text-gray-700 mb-2">Payment History</h4>
          <table class="min-w-full border border-gray-200 rounded">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 text-left text-xs text-gray-500">#</th>
                <th class="px-4 py-2 text-left text-xs text-gray-500">Date</th>
                <th class="px-4 py-2 text-right text-xs text-gray-500">Amount</th>
                <th class="px-4 py-2 text-left text-xs text-gray-500">Note</th>
              </tr>
            </thead>
            <tbody>${paymentsHtml}</tbody>
          </table>
          ${recordPaymentForm}
        </div>
      </div>`;

    const modalHtml = `
      <div id="grn-view-modal-${id}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeViewModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-3 max-h-[92vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-xl font-semibold">GRN Details — ${grn.grnCode}</h2>
            <button onclick="closeViewModal()" class="text-gray-400 hover:text-gray-600">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h3 class="font-medium mb-3">Basic Information</h3>
                <p><strong>Date:</strong> ${fmtGrnDate(grn.date)}</p>
                <p><strong>Sales REP:</strong> ${grnEscapeHtml(
                  grn.supplier?.name || "—"
                )}${
      grn.supplier?.companyName
        ? ` (${grnEscapeHtml(grn.supplier.companyName)})`
        : ""
    }</p>
                <p><strong>Sales REP Invoice:</strong> ${grnEscapeHtml(
                  grn.supplierInvoice || "—"
                )}</p>
                <p><strong>Note:</strong> ${grnEscapeHtml(grn.note || "N/A")}</p>
              </div>
              <div>
                <h3 class="font-medium mb-3">Summary</h3>
                <p><strong>Created By:</strong> ${
                  grn.createdBy?.username || "—"
                }</p>
                <p><strong>Items:</strong> ${grn.itemCount}</p>
                <p><strong>Total Value:</strong> ${fmtGrnNum(
                  grn.totalAmount
                )}</p>
              </div>
            </div>
            ${paymentHtml}
            <div class="mb-6">
              <h3 class="font-medium mb-3">Items</h3>
              <div class="overflow-x-auto">
                <table class="min-w-full border border-gray-300" style="min-width: 820px;">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-2 text-left">Product</th>
                      <th class="px-4 py-2 text-right whitespace-nowrap">Quantity</th>
                      <th class="px-4 py-2 text-right whitespace-nowrap">Cost Price</th>
                      <th class="px-4 py-2 text-right whitespace-nowrap">Selling Price</th>
                      <th class="px-4 py-2 text-right whitespace-nowrap" title="Profit % (view only)">Selling %</th>
                      <th class="px-4 py-2 text-right whitespace-nowrap">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    feather.replace();
    if (hasBalance) {
      toggleGrnPaymentBankAccount(id);
    }
  } catch (err) {
    console.error("viewGRN error:", err);
    grnToast("Failed to load GRN details", "error");
  }
}

async function voidGRN(id, code) {
  const reason = await openGrnReasonModal({
    title: `Void GRN: ${code}`,
    message:
      "This will create accounting reversal entries and zero related stock batches.",
    placeholder: "Reason for void (optional)",
    confirmText: "Continue",
  });
  if (reason === null) return;
  if (!confirm(`Confirm void for ${code}? This action cannot be undone.`)) {
    return;
  }

  try {
    await grnRequest(`/grn/${id}/void`, {
      method: "POST",
      body: JSON.stringify({ confirm: true, reason: reason || "" }),
    });
    grnToast(`${code} voided successfully.`, "success");
    await loadGRNData();
  } catch (err) {
    grnToast(`Failed to void ${code}: ${err.message}`, "error");
  }
}

async function recordGrnPayment(grnId) {
  const amountInput = document.getElementById(`grn-pay-amount-${grnId}`);
  const noteInput = document.getElementById(`grn-pay-note-${grnId}`);
  const paymentMethodInput = document.getElementById(`grn-pay-method-${grnId}`);
  const bankAccountInput = document.getElementById(
    `grn-pay-bank-account-${grnId}`
  );
  const amount = parseFloat(amountInput?.value);
  const note = noteInput?.value?.trim() || "";
  const paymentTypeId = parseInt(paymentMethodInput?.value) || null;
  const selectedType = grnPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentTypeId)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const bankAccountId = parseInt(bankAccountInput?.value) || null;
  const chequeNumber = String(
    document.getElementById(`grn-pay-cheque-number-${grnId}`)?.value || ""
  ).trim();

  if (!amount || amount <= 0) {
    grnToast("Please enter a valid payment amount", "error");
    return;
  }

  if (!paymentTypeId) {
    grnToast("Please select a payment method", "error");
    return;
  }

  if ((isBankTransfer || isCheque) && !bankAccountId) {
    grnToast("Please select a bank account", "error");
    return;
  }
  if (isCheque && !chequeNumber) {
    grnToast("Please enter the cheque number", "error");
    return;
  }

  try {
    const btn = amountInput?.closest(".bg-blue-50")?.querySelector("button");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    await grnRequest(`/grn/${grnId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        note,
        paymentTypeId,
        bankAccountId,
        chequeNumber: isCheque ? chequeNumber : null,
      }),
    });

    grnToast("Payment recorded successfully!", "success");
    closeViewModal();
    // Refresh GRN list and stats (respect active filters)
    await Promise.all([loadGrnStats(), applyGrnFilters()]);
    // Re-open the modal with updated data
    viewGRN(grnId);
  } catch (err) {
    console.error("recordGrnPayment error:", err);
    grnToast(err.message || "Failed to record payment", "error");
    const btn = amountInput?.closest(".bg-blue-50")?.querySelector("button");
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Record Payment";
    }
  }
}

function toggleGrnPaymentBankAccount(grnId) {
  const methodEl = document.getElementById(`grn-pay-method-${grnId}`);
  const wrapEl = document.getElementById(`grn-pay-bank-wrap-${grnId}`);
  const chqEl = document.getElementById(`grn-pay-cheque-wrap-${grnId}`);
  if (!methodEl || !wrapEl) return;

  const selectedType = grnPaymentTypes.find(
    (pt) => String(pt.id) === String(methodEl.value)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const needBank = isBankTransfer || isCheque;
  wrapEl.classList.toggle("hidden", !needBank);
  if (chqEl) chqEl.classList.toggle("hidden", !isCheque);
}

function editGRN(id) {
  grnToast("Editing GRNs is not supported", "error");
}

async function printGRN(id) {
  try {
    const grn = await grnRequest(`/grn/${id}`);
    if (!grn) {
      grnToast("GRN not found", "error");
      return;
    }

    const items = grn.items || [];
    const itemsHtml = items.length
      ? items
          .map(
            (item) => `
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">${
              item.productName || ""
            }${item.variantName ? ` — ${item.variantName}` : ""}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:right;white-space:nowrap;">${item.quantity}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:right;white-space:nowrap;">${fmtGrnNum(
              item.buyingPrice
            )}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:right;white-space:nowrap;">${fmtGrnNum(
              item.sellingPrice
            )}</td>
            <td style="border:1px solid #ccc;padding:8px;text-align:right;white-space:nowrap;">${fmtGrnNum(
              item.subtotal
            )}</td>
          </tr>`
          )
          .join("")
      : `<tr><td colspan="5" style="border:1px solid #ccc;padding:8px;text-align:center;">No items</td></tr>`;

    const htmlContent = `
      <html>
        <head>
          <title>GRN — ${grn.grnCode}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .payment-box { background:#f9f9f9; border:1px solid #ddd; border-radius:6px; padding:12px; margin-bottom:20px; }
            .payment-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
            .payment-item label { font-size:11px; color:#888; text-transform:uppercase; display:block; margin-bottom:4px; }
            table { width:100%; border-collapse:collapse; margin-top:20px; }
            th, td { border:1px solid #ccc; padding:8px; text-align:left; }
            th { background-color:#f5f5f5; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Goods Received Note</h1>
            <h2>${grn.grnCode}</h2>
          </div>
          <div class="info">
            <div>
              <p><strong>Date:</strong> ${fmtGrnDate(grn.date)}</p>
              <p><strong>Sales REP:</strong> ${grn.supplier?.name || "—"}</p>
            </div>
            <div>
              <p><strong>Created By:</strong> ${
                grn.createdBy?.username || "—"
              }</p>
              <p><strong>Sales REP Invoice:</strong> ${
                grn.supplierInvoice || "—"
              }</p>
              <p><strong>Note:</strong> ${grn.note || "N/A"}</p>
            </div>
          </div>
          <div class="payment-box">
            <strong>Payment Summary</strong>
            <div class="payment-grid" style="margin-top:8px;">
              <div><label>Payment Type</label>${
                grn.paymentType?.name || "—"
              }</div>
              <div><label>Payment Status</label>${
                grn.paymentStatus?.name || "—"
              }</div>
              <div><label>Paid Amount</label>${fmtGrnNum(
                grn.amountPaid
              )}</div>
              <div><label>Balance</label>${fmtGrnNum(grn.balance)}</div>
              <div><label>Credit Duration</label>${fmtCreditDuration(
                grn
              )}</div>
              <div><label>Due Date</label>${
                grn.dueDate ? fmtGrnDate(grn.dueDate) : "—"
              }</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <p style="margin-top:20px;text-align:right;"><strong>Total: ${fmtGrnNum(
            grn.totalAmount
          )}</strong></p>
        </body>
      </html>`;

    if (typeof printHtmlContent === "function") {
      printHtmlContent(htmlContent);
    } else {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    }
  } catch (err) {
    console.error("printGRN error:", err);
    grnToast("Failed to print GRN", "error");
  }
}

function receiveItems(id) {
  grnToast("Receive from PO is not yet supported", "error");
}

function viewPO(id) {
  grnToast("View PO is not yet supported", "error");
}

// Function to close view modals
function closeViewModal() {
  const modals = document.querySelectorAll(
    ".fixed.inset-0.bg-black.bg-opacity-50"
  );
  modals.forEach((modal) => {
    if (modal.onclick && modal.onclick.toString().includes("closeViewModal")) {
      modal.remove();
    }
  });
}

function saveDraftGRN() {
  grnToast("Draft saving is not yet supported", "error");
}

async function completeGRN(event) {
  event.preventDefault();

  const grnDate = document.getElementById("grn-date")?.value;
  const supplierId = document.getElementById("grn-supplier")?.value;
  const creditDurationRaw =
    document.getElementById("grn-credit-duration")?.value?.trim() || "";
  const creditDurationUnit =
    document.getElementById("grn-credit-duration-unit")?.value || "day";
  let creditDurationValue = null;
  if (creditDurationRaw) {
    creditDurationValue = parseInt(creditDurationRaw, 10);
    if (!Number.isInteger(creditDurationValue) || creditDurationValue <= 0) {
      grnToast("Credit duration must be a positive number", "error");
      return;
    }
  }
  const invoice = document.getElementById("grn-invoice")?.value?.trim() || "";
  const note = document.getElementById("grn-note")?.value?.trim() || "";

  if (!grnDate || !supplierId) {
    grnToast("Please fill in required fields (Date and Sales REP)", "error");
    return;
  }

  const itemsContainer = document.getElementById("grn-items-container");
  if (!itemsContainer.children.length) {
    grnToast("Please add at least one item", "error");
    return;
  }

  const items = [];
  for (let i = 0; i < itemsContainer.children.length; i++) {
    const row = itemsContainer.children[i];
    const productVariantId =
      row.querySelector(".grn-selected-product")?.value ||
      document.getElementById(`selected-product-${i}`)?.value;
    const quantity =
      parseFloat(row.cells[1]?.querySelector("input")?.value) || 0;
    const buyingPrice =
      parseFloat(row.cells[2]?.querySelector("input")?.value) || 0;
    const sellingPrice =
      parseFloat(
        row.querySelector(".grn-selling-price")?.value ||
          row.cells[3]?.querySelector("input")?.value
      ) || 0;
    const stockType =
      row.querySelector(".grn-stock-type")?.value ||
      row.cells[5]?.querySelector("select")?.value ||
      "Main";

    if (!productVariantId) {
      grnToast(
        `Row ${i + 1}: Please select a product from the search list`,
        "error"
      );
      return;
    }
    if (quantity <= 0) {
      grnToast(`Row ${i + 1}: Quantity must be greater than 0`, "error");
      return;
    }
    if (buyingPrice <= 0) {
      grnToast(`Row ${i + 1}: Cost price must be greater than 0`, "error");
      return;
    }
    if (sellingPrice <= 0) {
      grnToast(`Row ${i + 1}: Selling price must be greater than 0`, "error");
      return;
    }

    items.push({
      productVariantId,
      quantity,
      buyingPrice,
      sellingPrice,
      stockType,
    });
  }

  const totalValue = items.reduce(
    (sum, it) => sum + it.quantity * it.buyingPrice,
    0
  );
  let creditSummary = "Credit Duration: —";
  if (creditDurationValue) {
    const dueDateObj = addCreditDurationToDate(
      grnDate,
      creditDurationValue,
      creditDurationUnit
    );
    const dueDate = dueDateObj.toISOString().split("T")[0];
    creditSummary = `Credit Duration: ${fmtCreditDuration({
      creditDurationValue,
      creditDurationUnit,
    })}\nDue Date: ${dueDate}`;
  }

  const proceed = confirm(
    `Confirm GRN completion?\n\nTotal: ${fmtGrnNum(
      totalValue
    )}\nPayment Mode: FULL CREDIT\n${creditSummary}`
  );
  if (!proceed) {
    return;
  }

  const completeBtn = getGrnCompleteButton();
  const previousBtnText = completeBtn?.textContent;
  try {
    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.textContent = "Saving...";
    }

    await grnRequest("/grn", {
      method: "POST",
      body: JSON.stringify({
        supplierId,
        grnDate,
        creditDurationValue,
        creditDurationUnit: creditDurationValue ? creditDurationUnit : null,
        supplierInvoice: invoice || null,
        invoice: invoice || null,
        note: note || null,
        items,
      }),
    });

    closeNewGRNModal();
    grnToast("GRN completed successfully!", "success");
    await loadGrnStats();
    await applyGrnFilters();
  } catch (err) {
    console.error("completeGRN error:", err);
    grnToast(err.message || "Failed to save GRN", "error");
  } finally {
    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.textContent = previousBtnText || "Complete GRN";
    }
  }
}

// ─── PDF / XL Export ──────────────────────────────────────────────────────────

function getGrnExportFilters() {
  const filters = [];
  const searchTerm = document.getElementById("grn-search")?.value?.trim();
  const supplierFilter = document.getElementById("supplier-filter")?.value;
  const statusFilter = document.getElementById("status-filter")?.value;
  const dateFrom = document.getElementById("date-from")?.value;
  const dateTo = document.getElementById("date-to")?.value;

  if (searchTerm) filters.push({ label: "Search", value: searchTerm });
  if (supplierFilter) {
    const supplierOpt = document.querySelector(
      `#supplier-filter option[value="${CSS.escape(supplierFilter)}"]`
    );
    filters.push({
      label: "Sales REP",
      value: supplierOpt?.textContent?.trim() || supplierFilter,
    });
  }
  if (statusFilter) {
    const statusOpt = document.querySelector(
      `#status-filter option[value="${CSS.escape(statusFilter)}"]`
    );
    filters.push({
      label: "Status",
      value: statusOpt?.textContent?.trim() || statusFilter,
    });
  }
  if (dateFrom || dateTo) {
    filters.push({
      label: "Date range",
      value: `${dateFrom || "Start"} to ${dateTo || "End"}`,
    });
  }
  return filters;
}

function getGrnExportRows(data) {
  return (data || []).map((grn) => [
    grn.grnCode,
    fmtGrnDate(grn.date),
    grn.supplier?.name || "—",
    grn.itemCount?.toString() || "0",
    fmtGrnNum(grn.totalAmount),
    grn.paymentStatus?.name || "—",
  ]);
}

function downloadGRNPDF() {
  try {
    const filteredGRNs = grnListData || [];
    const totalValue = filteredGRNs.reduce(
      (sum, grn) => sum + (grn.totalAmount || 0),
      0
    );
    const ok = exportPdfWithTable({
      title: "GRN Report",
      filters: getGrnExportFilters(),
      head: [
        "GRN Code",
        "Date",
        "Sales REP",
        "Items",
        "Total Value",
        "Payment Status",
      ],
      body: getGrnExportRows(filteredGRNs),
      fileName: `grn-report-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total GRNs: ${filteredGRNs.length}  |  Total Value: ${fmtGrnNum(totalValue)}`,
      emptyMessage: "No GRN data available to export",
    });
    if (ok) grnToast("GRN PDF downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating PDF:", error);
    grnToast("Error generating PDF", "error");
  }
}

async function downloadGRNXL() {
  try {
    const filteredGRNs = grnListData || [];
    const ok = await exportXlsxWithTable({
      title: "GRN Report",
      filters: getGrnExportFilters(),
      headers: [
        "GRN Code",
        "Date",
        "Sales REP",
        "Items",
        "Total Value",
        "Payment Status",
      ],
      rows: getGrnExportRows(filteredGRNs),
      sheetName: "GRN",
      fileName: `grn-report-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No GRN data available to export",
    });
    if (ok) grnToast("GRN XL downloaded successfully", "success");
  } catch (error) {
    console.error("Error generating XL:", error);
    grnToast("Error generating XL", "error");
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

window.generateGRNContent = generateGRNContent;
window.initializeGRNPage = initializeGRNPage;
window.openNewGRNModal = openNewGRNModal;
window.closeNewGRNModal = closeNewGRNModal;
window.openPendingReceiptsModal = openPendingReceiptsModal;
window.closePendingReceiptsModal = closePendingReceiptsModal;
window.downloadGRNPDF = downloadGRNPDF;
window.downloadGRNXL = downloadGRNXL;
window.addGRNItem = addGRNItem;
window.removeGRNItem = removeGRNItem;
window.calculateItemTotal = calculateItemTotal;
window.updateGRNTotals = updateGRNTotals;
window.onSellingPriceInput = onSellingPriceInput;
window.updatePaymentBalanceDisplay = updatePaymentBalanceDisplay;
window.viewGRN = viewGRN;
window.voidGRN = voidGRN;
window.editGRN = editGRN;
window.printGRN = printGRN;
window.receiveItems = receiveItems;
window.viewPO = viewPO;
window.saveDraftGRN = saveDraftGRN;
window.completeGRN = completeGRN;
window.togglePaymentFields = togglePaymentFields;
window.searchGRNProducts = searchGRNProducts;
window.handleGRNSearchKeydown = handleGRNSearchKeydown;
window.selectGRNProduct = selectGRNProduct;
window.positionDropdown = positionDropdown;
window.closeViewModal = closeViewModal;
window.recordGrnPayment = recordGrnPayment;
window.toggleGrnPaymentBankAccount = toggleGrnPaymentBankAccount;
window.renderGRNTable = renderGRNTable;
window.renderGRNRow = renderGRNRow;
window.loadGrnStats = loadGrnStats;
window.loadGrnDropdowns = loadGrnDropdowns;
window.loadGrnList = loadGrnList;
window.applyGrnFilters = applyGrnFilters;
window.changeGrnPage = changeGrnPage;
window.clearGrnFilters = clearGrnFilters;
window.filterGRNs = filterGRNs;
