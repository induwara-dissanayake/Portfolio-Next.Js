// Repair Management Module
const REPAIR_API = window.API_BASE_URL || "http://localhost:3000/api";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REPAIR_FAULT_CATEGORIES = [
  "Power",
  "Software",
  "Display",
  "Touch pad",
  "Audio",
  "Key Pad",
  "Charging",
  "Signal",
  "Accessory",
  "Functionality",
  "Other",
];
const REPAIR_PHYSICAL_CONDITIONS = [
  "Front/Back Cover Faded",
  "Front/Back Cover Scratched",
  "Scratches on front window",
  "Water Lodged",
  "Covering Caps/Side Keys Missing",
  "Dropped/Dent Damaged",
];
const REPAIR_ACCESSORIES = [
  "Warranty Card",
  "Battery",
  "Back Cover",
  "Charger",
  "Hands-free Kit",
  "Memory Card",
  "SIM",
  "Data Cable",
];

function repairCheckboxGridHtml(className, items) {
  return items
    .map(
      (item) => `
      <label class="inline-flex items-center gap-1.5 text-sm text-gray-700">
        <input type="checkbox" class="${className}" value="${escapeHtml(item)}" />
        <span>${escapeHtml(item)}</span>
      </label>`
    )
    .join("");
}

function getRepairCheckedValues(className) {
  return Array.from(document.querySelectorAll(`.${className}:checked`)).map(
    (el) => el.value
  );
}

function setRepairCheckedValues(className, values) {
  const selected = new Set(values || []);
  document.querySelectorAll(`.${className}`).forEach((el) => {
    el.checked = selected.has(el.value);
  });
}

function getRepairYesNo(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  if (!el) return null;
  return el.value === "true";
}

function setRepairYesNo(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
    el.checked = false;
  });
  if (value === true || value === false) {
    const el = document.querySelector(
      `input[name="${name}"][value="${value}"]`
    );
    if (el) el.checked = true;
  }
}

function formatDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateTimeLocalValue(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function repairYesNoHtml(name, label) {
  return `
    <div>
      <span class="block text-sm font-medium text-gray-700 mb-1">${label}</span>
      <div class="flex items-center gap-4">
        <label class="inline-flex items-center text-sm text-gray-700">
          <input type="radio" name="${name}" value="true" class="mr-1" /> YES
        </label>
        <label class="inline-flex items-center text-sm text-gray-700">
          <input type="radio" name="${name}" value="false" class="mr-1" /> NO
        </label>
      </div>
    </div>`;
}

function repairGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    null
  );
}

async function repairRequest(path, options = {}) {
  const token = repairGetAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${REPAIR_API}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      body.message || body.error || `Request failed (${res.status})`
    );
  return body.data !== undefined ? body.data : body;
}

// --- State ---
let repairsData = [];
let filteredRepairs = [];
let repairStats = {
  activeRepairs: 0,
  completedToday: 0,
  pendingParts: 0,
  monthlyRevenue: 0,
};
let customerSearchTimeout = null;
let techniciansCache = [];
let invoiceItemSearchTimeout = null;
let repairPaymentTypes = [];
let repairBankAccounts = [];
let repairTransferSearchTimeout = null;
let repairTransferCandidates = [];

// --- Init ---
function initializeRepairsModule() {
  initializeRepairsPage();
}

function initializeRepairsPage(
  containerId = "dynamic-content",
  skipLoad = false
) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const posMode = containerId !== "dynamic-content";
  container.innerHTML = generateRepairsContent(posMode);

  setTimeout(() => {
    if (!skipLoad) loadRepairsData();
    if (typeof feather !== "undefined") feather.replace();
    const form = document.getElementById("repair-form");
    if (form) form.addEventListener("submit", saveRepair);
  }, 50);

  window.downloadRepairOrdersPDF = downloadRepairOrdersPDF;
  window.downloadRepairOrdersXL = downloadRepairOrdersXL;
  window.filterRepairs = filterRepairs;
  window.clearRepairsFilters = clearRepairsFilters;
  window.openNewRepairModal = openNewRepairModal;
  window.closeRepairModal = closeRepairModal;
  window.saveRepair = saveRepair;
  window.editRepair = editRepair;
  window.deleteRepair = deleteRepair;
  window.viewRepair = viewRepair;
  window.closeRepairDetailsModal = closeRepairDetailsModal;
  window.openStatusModal = openStatusModal;
  window.closeStatusModal = closeStatusModal;
  window.submitStatusUpdate = submitStatusUpdate;
  window.openRepairInvoiceModal = openRepairInvoiceModal;
  window.closeRepairInvoiceModal = closeRepairInvoiceModal;
  window.handleUpdateRepairInvoice = handleUpdateRepairInvoice;
  window.printRepairInvoice = printRepairInvoice;
  window.printRepairAcknowledgement = printRepairAcknowledgement;
  window.printRepairAcknowledgementById = printRepairAcknowledgementById;
  window.submitRepairPayment = submitRepairPayment;
  window.addRepairInvoiceRow = addRepairInvoiceRow;
  window.removeInvoiceRow = removeInvoiceRow;
  window.recalcInvoiceTotals = recalcInvoiceTotals;
  window.searchRepairCustomers = searchRepairCustomers;
  window.selectRepairCustomer = selectRepairCustomer;
  window.openRepairAddCustomerModal = openRepairAddCustomerModal;
  window.closeRepairAddCustomerModal = closeRepairAddCustomerModal;
  window.saveRepairNewCustomer = saveRepairNewCustomer;
  window.searchInvoiceItemInput = searchInvoiceItemInput;
  window.selectInvoiceItemEl = selectInvoiceItemEl;
  window.loadTechnicianSelect = loadTechnicianSelect;
  window.toggleRepairAdvancePaymentFields = toggleRepairAdvancePaymentFields;
  window.openRepairStockTransferModal = openRepairStockTransferModal;
  window.closeRepairStockTransferModal = closeRepairStockTransferModal;
  window.searchMainStockForTransfer = searchMainStockForTransfer;
  window.selectMainStockForTransfer = selectMainStockForTransfer;
  window.submitRepairStockTransfer = submitRepairStockTransfer;
}

// --- HTML Template ---
function generateRepairsContent(posMode = false) {
  const adminHeaderAndStats = posMode
    ? ""
    : `
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Repair Management</h1>
            <p class="text-gray-600 mt-1">Track device repairs and service orders</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="downloadRepairOrdersPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
              <i data-feather="download" class="w-4 h-4 mr-2"></i>PDF
            </button>
            <button onclick="downloadRepairOrdersXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center" title="Opens in Excel">
              <i data-feather="file-text" class="w-4 h-4 mr-2"></i>XL
            </button>
            <button onclick="openRepairAddCustomerModal()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
              <i data-feather="user-plus" class="w-4 h-4 mr-2"></i>Add Customer
            </button>
            <button onclick="openNewRepairModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>New Repair
            </button>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Active Repairs</p>
              <p class="text-3xl font-bold text-gray-800" id="stat-active">0</p>
              <p class="text-sm text-gray-500 mt-1">In progress</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full"><i data-feather="tool" class="w-6 h-6 text-blue-600"></i></div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Completed Today</p>
              <p class="text-3xl font-bold text-green-600" id="stat-today">0</p>
              <p class="text-sm text-gray-500 mt-1">Ready for pickup</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full"><i data-feather="check-circle" class="w-6 h-6 text-green-600"></i></div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Pending Parts</p>
              <p class="text-3xl font-bold text-orange-600" id="stat-parts">0</p>
              <p class="text-sm text-gray-500 mt-1">Awaiting delivery</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full"><i data-feather="clock" class="w-6 h-6 text-orange-600"></i></div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Monthly Revenue</p>
              <p class="text-3xl font-bold text-purple-600" id="stat-revenue">Rs. 0</p>
              <p class="text-sm text-gray-500 mt-1">This month</p>
            </div>
            <div class="bg-purple-100 p-3 rounded-full"><i data-feather="dollar-sign" class="w-6 h-6 text-purple-600"></i></div>
          </div>
        </div>
      </div>
    `;

  const posToolbarButtons = posMode
    ? `
            <div class="shrink-0 ml-auto flex gap-2">
              <button type="button" onclick="openRepairAddCustomerModal()" class="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm text-white">
                <i data-feather="user-plus" class="w-4 h-4 mr-2"></i>Add Customer
              </button>
              <button type="button" onclick="openNewRepairModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center text-sm">
                <i data-feather="plus" class="w-4 h-4 mr-2"></i>New Repair
              </button>
            </div>
            `
    : "";

  const repairRootClass = posMode
    ? "content-fade-in px-3 pt-3 pb-2 h-full min-h-0 flex flex-col overflow-hidden"
    : "content-fade-in p-6";
  const repairCardClass = posMode
    ? "card flex-1 min-h-0 flex flex-col overflow-hidden"
    : "card";
  const repairToolbarClass = posMode
    ? "p-4 border-b border-gray-200 shrink-0"
    : "p-6 border-b border-gray-200";
  const repairTableScrollClass = posMode
    ? "overflow-x-auto flex-1 min-h-0 overflow-y-auto"
    : "overflow-x-auto";

  return `
    <div class="${repairRootClass}">
      ${adminHeaderAndStats}

      <!-- Table -->
      <div class="${repairCardClass}">
        <div class="${repairToolbarClass}">
          <div class="flex w-full flex-wrap items-center gap-3 justify-between">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
              <input type="text" id="repairSearchInput" placeholder="Search repairs..." oninput="filterRepairs()"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <select id="repairStatusFilter" onchange="filterRepairs()"
                class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">All Status</option>
                <option value="Received">Received</option>
                <option value="Repairing">Repairing</option>
                <option value="Pending Parts">Pending Parts</option>
                <option value="Completed">Completed</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button type="button" onclick="clearRepairsFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
              ${posToolbarButtons}
            </div>
        </div>
        <div class="${repairTableScrollClass}">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repair ID</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody id="repairs-table-body" class="bg-white divide-y divide-gray-200"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New / Edit Repair Modal -->
    <div id="repair-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-5 border-b flex-shrink-0">
          <h2 id="repair-modal-title" class="text-xl font-semibold">Create New Repair Order</h2>
          <button onclick="closeRepairModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-6 h-6"></i></button>
        </div>
        <form id="repair-form" class="flex-1 overflow-y-auto p-5 space-y-5">
          <input type="hidden" id="repair-id" />
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Job No</label>
              <input type="text" id="repair-job-no-display" readonly
                class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600"
                value="Assigned after save" />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input type="datetime-local" id="repair-received-display" readonly
                class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-600" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h3 class="text-base font-medium text-gray-800 mb-3">Customer Information</h3>
              <label class="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <input type="hidden" id="repair-customer-id" />
              <div class="relative">
                <input type="text" id="repair-customer-search" autocomplete="off"
                  placeholder="Search by name or mobile..." oninput="searchRepairCustomers()"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                <div id="repair-customer-results"
                  class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto hidden z-10"></div>
              </div>
              <button type="button" onclick="openRepairAddCustomerModal()"
                class="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800">
                <i data-feather="user-plus" class="w-4 h-4 mr-1"></i>
                Add New Customer
              </button>
              <p id="selected-repair-customer" class="text-sm text-green-600 mt-1 hidden font-medium"></p>
              <div id="repair-customer-preview" class="hidden mt-3 text-sm text-gray-700 space-y-1 border border-gray-200 rounded p-3 bg-white">
                <div><span class="text-gray-500">Name:</span> <span id="repair-customer-name-display">—</span></div>
                <div><span class="text-gray-500">Address:</span> <span id="repair-customer-address-display">—</span></div>
                <div><span class="text-gray-500">Contact No:</span> <span id="repair-customer-phone-display">—</span></div>
              </div>
            </div>
            <div>
              <h3 class="text-base font-medium text-gray-800 mb-3">Device Information</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                  <input type="text" id="repair-device-make"
                    class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. OPPO" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                  <input type="text" id="repair-device-model"
                    class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. A37fw" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">IMEI No</label>
                  <input type="text" id="repair-device-imei"
                    class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
                  <input type="text" id="repair-device-serial"
                    class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  ${repairYesNoHtml("repair-company-warranty", "Company Warranty")}
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date of Purchase</label>
                  <input type="date" id="repair-purchase-date"
                    class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-base font-medium text-gray-800 mb-3">Fault Diagnosis</h3>
            <div class="mb-3">${repairYesNoHtml("repair-phone-power-on", "Phone Power On")}</div>
            <p class="text-sm font-medium text-gray-700 mb-2">Fault Category</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              ${repairCheckboxGridHtml("repair-fault-category", REPAIR_FAULT_CATEGORIES)}
            </div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Fault Description *</label>
            <textarea id="repair-issue" required rows="3"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the fault…"></textarea>
          </div>

          <div>
            <h3 class="text-base font-medium text-gray-800 mb-3">Physical Condition</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              ${repairCheckboxGridHtml("repair-physical-condition", REPAIR_PHYSICAL_CONDITIONS)}
            </div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Other</label>
            <input type="text" id="repair-physical-other"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. no SIM Tray / no SIM" />
          </div>

          <div>
            <h3 class="text-base font-medium text-gray-800 mb-3">Items Taken With Phone</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              ${repairCheckboxGridHtml("repair-accessory", REPAIR_ACCESSORIES)}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Other</label>
                <input type="text" id="repair-accessories-other"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea id="repair-notes" rows="2"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional remarks…"></textarea>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-base font-medium text-gray-800 mb-3">Estimate & Delivery</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                ${repairYesNoHtml("repair-prior-estimate", "Prior estimate given?")}
                <label class="block text-sm font-medium text-gray-700 mt-3 mb-1">Estimated Cost (Rs.)</label>
                <input type="number" id="repair-estimated-cost" step="1" min="0"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                ${repairYesNoHtml("repair-notify-charge", "Need to know the repair charge before work done?")}
                <label class="block text-sm font-medium text-gray-700 mt-3 mb-1">Approximate Delivery Date</label>
                <input type="date" id="repair-approx-delivery"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-base font-medium text-gray-800 mb-3">Shop Use</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Accepted By</label>
                <input type="text" id="repair-accepted-by"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Staff name" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select id="repair-priority"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="low">Low</option>
                  <option value="normal" selected>Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                <select id="repair-technician"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">— Select Technician —</option>
                </select>
              </div>
            </div>
            <div class="pt-3">
              <label class="inline-flex items-center text-sm text-gray-700">
                <input type="checkbox" id="repair-has-advance" class="mr-2" onchange="toggleRepairAdvancePaymentFields()">
                Collect Advance Now
              </label>
            </div>
            <div id="repair-advance-fields" class="hidden space-y-2 border border-blue-100 bg-blue-50 rounded p-3 mt-2">
              <input type="number" id="repair-advance-amount" min="0" step="0.01" placeholder="Advance amount"
                class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              <select id="repair-advance-payment-type" onchange="toggleRepairAdvancePaymentFields()"
                class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option value="">Select Payment Type</option>
              </select>
              <div id="repair-advance-bank-wrap" class="hidden">
                <select id="repair-advance-bank-account"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Bank Account</option>
                </select>
              </div>
              <div id="repair-advance-cheque-wrap" class="hidden">
                <input type="text" id="repair-advance-cheque-number" maxlength="50" placeholder="Cheque number *"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
              <input type="text" id="repair-advance-note" placeholder="Advance note (optional)"
                class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </form>
        <div class="flex justify-end items-center p-4 border-t bg-white flex-shrink-0 space-x-3">
          <button type="button" onclick="closeRepairModal()" class="btn-secondary px-4 py-2">Cancel</button>
          <button type="submit" form="repair-form" id="repair-save-btn" class="btn-primary px-6 py-2 text-white">Create Repair Order</button>
        </div>
      </div>
    </div>

    <!-- Add Customer Modal (Repair) -->
    <div id="repair-add-customer-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-[60]">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="flex justify-between items-center p-5 border-b">
          <h3 class="text-lg font-semibold text-gray-900">Add New Customer</h3>
          <button type="button" onclick="closeRepairAddCustomerModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>
        <form id="repair-add-customer-form" class="p-5 space-y-4" onsubmit="saveRepairNewCustomer(event)">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
            <input type="text" id="repair-new-customer-mobile" required maxlength="10"
              placeholder="07XXXXXXXX"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" id="repair-new-customer-name"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Customer name" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="repair-new-customer-email"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="customer@example.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea id="repair-new-customer-address" rows="2"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Address (optional)"></textarea>
          </div>
          <div class="flex justify-end space-x-3 pt-1">
            <button type="button" onclick="closeRepairAddCustomerModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" id="repair-add-customer-save-btn" class="btn-primary px-4 py-2 text-white">Add Customer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Repair Details Modal -->
    <div id="repair-details-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 id="repair-details-title" class="text-xl font-semibold">Repair Details</h2>
          <button onclick="closeRepairDetailsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <div id="repair-details-content" class="p-6"></div>
      </div>
    </div>

    <!-- Update Status Modal -->
    <div id="status-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div class="flex justify-between items-center p-5 border-b">
          <h3 class="font-semibold text-gray-900">Update Repair Status</h3>
          <button onclick="closeStatusModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
        </div>
        <div class="p-5 space-y-4">
          <input type="hidden" id="status-repair-id">
          <p class="text-sm text-gray-600" id="status-repair-label"></p>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Status</label>
            <select id="status-select"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
              <option value="Received">Received</option>
              <option value="Repairing">Repairing</option>
              <option value="Pending Parts">Pending Parts</option>
              <option value="Completed">Completed</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="flex justify-end space-x-3 pt-1">
            <button onclick="closeStatusModal()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Cancel</button>
            <button onclick="submitStatusUpdate()" id="status-submit-btn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Repair Invoice Modal -->
    <div id="repair-invoice-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div class="flex justify-between items-center p-6 border-b flex-shrink-0">
          <h2 id="repair-invoice-title" class="text-xl font-semibold">Repair Invoice</h2>
          <div class="flex items-center space-x-2">
            <button type="button" onclick="openRepairStockTransferModal()" class="btn-secondary px-3 py-1.5 text-sm">
              Transfer Main → Repair Stock
            </button>
            <button onclick="closeRepairInvoiceModal()" class="text-gray-400 hover:text-gray-600">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
        </div>
        <div id="repair-invoice-content" class="flex-1 overflow-y-auto p-6"></div>
        <div class="flex justify-between items-center p-4 border-t bg-white flex-shrink-0">
          <div class="text-sm text-gray-600" id="repair-invoice-totals">Totals: Cost Rs. 0 | Pricing Rs. 0</div>
          <div class="flex space-x-3">
            <button type="button" id="repair-invoice-save-btn" onclick="handleUpdateRepairInvoice()" class="btn-primary px-4 py-2 text-white">Save Items</button>
            <button type="button" onclick="printRepairInvoice()" class="btn-secondary px-4 py-2">Print</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main to Repair Transfer Modal -->
    <div id="repair-stock-transfer-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-[70]">
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div class="flex justify-between items-center p-5 border-b">
          <h3 class="text-lg font-semibold text-gray-900">Transfer Main to Repair Stock</h3>
          <button type="button" onclick="closeRepairStockTransferModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div class="p-5 space-y-3">
          <div class="relative">
            <input id="repair-transfer-main-search" type="text" oninput="searchMainStockForTransfer()"
              placeholder="Search main stock by product, barcode, or batch..."
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            <div id="repair-transfer-main-results"
              class="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-52 overflow-y-auto hidden z-20"></div>
          </div>
          <input type="hidden" id="repair-transfer-source-stock-id" />
          <p id="repair-transfer-selected-info" class="text-sm text-gray-600 hidden"></p>
          <div class="grid grid-cols-2 gap-3">
            <input id="repair-transfer-qty" type="number" min="1" value="1"
              class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
            <input id="repair-transfer-note" type="text" placeholder="Note (optional)"
              class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="closeRepairStockTransferModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="button" id="repair-transfer-submit-btn" onclick="submitRepairStockTransfer()" class="btn-primary px-4 py-2 text-white">Transfer</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Data Loading ---

async function loadRepairsData() {
  const tbody = document.getElementById("repairs-table-body");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  try {
    const [stats, repairs] = await Promise.all([
      repairRequest("/repairs/stats"),
      repairRequest("/repairs"),
    ]);
    repairStats = stats;
    repairsData = repairs;
    renderRepairsStats();
    filterRepairs();
  } catch (err) {
    console.error("loadRepairsData error:", err);
    showNotification("Failed to load repair data", "error");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-400">Failed to load repairs</td></tr>`;
  }
}

function renderRepairsStats() {
  const sa = document.getElementById("stat-active");
  const st = document.getElementById("stat-today");
  const sp = document.getElementById("stat-parts");
  const sr = document.getElementById("stat-revenue");
  if (sa) sa.textContent = repairStats.activeRepairs;
  if (st) st.textContent = repairStats.completedToday;
  if (sp) sp.textContent = repairStats.pendingParts;
  if (sr)
    sr.textContent = `Rs. ${Number(
      repairStats.monthlyRevenue
    ).toLocaleString()}`;
}

function renderRepairsTable() {
  const tbody = document.getElementById("repairs-table-body");
  if (!tbody) return;

  if (filteredRepairs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No repairs found</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredRepairs
    .map((r) => {
      const badge = getStatusBadge(r.status);
      const issue =
        r.issue.length > 50 ? r.issue.substring(0, 50) + "…" : r.issue;
      const itemsTotal = Array.isArray(r.items)
        ? r.items.reduce(
            (sum, it) =>
              sum +
              Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
            0
          )
        : 0;
      const hasInvoiceItems = Array.isArray(r.items) && r.items.length > 0;
      const costValue = hasInvoiceItems
        ? itemsTotal
        : Number(r.estimatedCost || 0);
      const advancePaid = Array.isArray(r.payments)
        ? r.payments.reduce((sum, p) => {
            const isAdvance =
              !!p?.isAdvance || /advance/i.test(String(p?.note || ""));
            return isAdvance ? sum + Number(p?.amount || 0) : sum;
          }, 0)
        : 0;
      return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">${escapeHtml(
        r.repairNumber
      )}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${escapeHtml(
          r.deviceName
        )}</div>
        ${
          r.imei
            ? `<div class="text-xs text-gray-400">IMEI: ${escapeHtml(
                r.imei
              )}</div>`
            : ""
        }
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${escapeHtml(
          r.customer?.name || "—"
        )}</div>
        <div class="text-xs text-gray-400">${escapeHtml(
          r.customer?.mobileNumber || ""
        )}</div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-600 max-w-xs">${escapeHtml(
        issue
      )}</td>
      <td class="px-6 py-4 whitespace-nowrap">${badge}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${costValue > 0 ? `Rs. ${costValue.toLocaleString()}` : "—"}
        ${
          advancePaid > 0
            ? `<div class="text-xs text-gray-500 mt-1">Advance: Rs. ${advancePaid.toLocaleString()}</div>`
            : ""
        }
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex items-center space-x-2">
          <button onclick="viewRepair(${
            r.id
          })" title="View" class="text-blue-600 hover:text-blue-800 p-1"><i data-feather="eye" class="w-4 h-4"></i></button>
          <button onclick="editRepair(${
            r.id
          })" title="Edit" class="text-green-600 hover:text-green-800 p-1"><i data-feather="edit-2" class="w-4 h-4"></i></button>
          <button onclick="openStatusModal(${
            r.id
          })" title="Update Status" class="text-orange-600 hover:text-orange-800 p-1"><i data-feather="refresh-cw" class="w-4 h-4"></i></button>
          <button onclick="printRepairAcknowledgementById(${
            r.id
          })" title="Print Acknowledgement" class="text-teal-600 hover:text-teal-800 p-1"><i data-feather="file-text" class="w-4 h-4"></i></button>
          <button onclick="openRepairInvoiceModal(${
            r.id
          })" title="Invoice" class="text-purple-600 hover:text-purple-800 p-1"><i data-feather="printer" class="w-4 h-4"></i></button>
          <button onclick="deleteRepair(${
            r.id
          })" title="Delete" class="text-red-600 hover:text-red-800 p-1"><i data-feather="trash-2" class="w-4 h-4"></i></button>
        </div>
      </td>
    </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
}

function getStatusBadge(status) {
  const map = {
    Received: "bg-blue-100 text-blue-800",
    Repairing: "bg-orange-100 text-orange-800",
    "Pending Parts": "bg-amber-100 text-amber-800",
    Completed: "bg-green-100 text-green-800",
    Delivered: "bg-gray-100 text-gray-800",
    Cancelled: "bg-red-100 text-red-800",
  };
  const cls = map[status] || "bg-gray-100 text-gray-700";
  return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${cls}">${escapeHtml(
    status || "—"
  )}</span>`;
}

// --- Filter ---
function filterRepairs() {
  const q = (
    document.getElementById("repairSearchInput")?.value || ""
  ).toLowerCase();
  const status = document.getElementById("repairStatusFilter")?.value || "";

  filteredRepairs = repairsData.filter((r) => {
    const matchQ =
      !q ||
      r.repairNumber.toLowerCase().includes(q) ||
      r.deviceName.toLowerCase().includes(q) ||
      (r.customer?.name || "").toLowerCase().includes(q) ||
      (r.customer?.mobileNumber || "").includes(q) ||
      r.issue.toLowerCase().includes(q) ||
      (r.technician || "").toLowerCase().includes(q) ||
      (r.imei || "").toLowerCase().includes(q);
    const matchStatus = !status || r.status === status;
    return matchQ && matchStatus;
  });

  renderRepairsTable();
}

function clearRepairsFilters() {
  const s = document.getElementById("repairSearchInput");
  if (s) s.value = "";
  const f = document.getElementById("repairStatusFilter");
  if (f) f.value = "";
  filteredRepairs = [...repairsData];
  renderRepairsTable();
}

// --- Customer Autocomplete ---
function searchRepairCustomers() {
  clearTimeout(customerSearchTimeout);
  const input = document.getElementById("repair-customer-search");
  const resultsEl = document.getElementById("repair-customer-results");
  const query = (input?.value || "").trim();

  if (!query) {
    resultsEl.classList.add("hidden");
    return;
  }

  customerSearchTimeout = setTimeout(async () => {
    try {
      const customers = await repairRequest(
        `/customers?search=${encodeURIComponent(query)}`
      );
      const list = Array.isArray(customers) ? customers : customers.data || [];
      if (list.length === 0) {
        resultsEl.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">No customers found</div>`;
      } else {
        resultsEl.innerHTML = list
          .slice(0, 8)
          .map((c) => {
            const name = escapeHtml(c.name || "");
            const phone = escapeHtml(c.phone || c.mobileNumber || "");
            const address = escapeHtml(c.address || "");
            return `<div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm" data-cid="${Number(
              c.id
            )}" data-name="${name}" data-phone="${phone}" data-address="${address}">
            ${name} <span class="text-gray-400">(${phone})</span>
          </div>`;
          })
          .join("");
        resultsEl.querySelectorAll("[data-cid]").forEach((el) => {
          el.addEventListener("click", () => {
            selectRepairCustomer(
              Number(el.dataset.cid),
              el.getAttribute("data-name") || "",
              el.getAttribute("data-phone") || "",
              el.getAttribute("data-address") || ""
            );
          });
        });
      }
      resultsEl.classList.remove("hidden");
    } catch (err) {
      resultsEl.innerHTML = `<div class="px-3 py-2 text-sm text-red-400">Search failed</div>`;
      resultsEl.classList.remove("hidden");
    }
  }, 300);
}

function selectRepairCustomer(id, name, mobile, address = "") {
  document.getElementById("repair-customer-id").value = id;
  const sel = document.getElementById("selected-repair-customer");
  sel.textContent = `Selected: ${name} (${mobile})`;
  sel.classList.remove("hidden");
  const preview = document.getElementById("repair-customer-preview");
  if (preview) preview.classList.remove("hidden");
  const nameEl = document.getElementById("repair-customer-name-display");
  const addrEl = document.getElementById("repair-customer-address-display");
  const phoneEl = document.getElementById("repair-customer-phone-display");
  if (nameEl) nameEl.textContent = name || "—";
  if (addrEl) addrEl.textContent = address || "—";
  if (phoneEl) phoneEl.textContent = mobile || "—";
  document.getElementById("repair-customer-results").classList.add("hidden");
  document.getElementById("repair-customer-search").value = "";
}

function openRepairAddCustomerModal() {
  document
    .getElementById("repair-add-customer-modal")
    ?.classList.remove("hidden");
  document.getElementById("repair-add-customer-modal")?.classList.add("flex");
  document.getElementById("repair-add-customer-form")?.reset();
  setTimeout(() => {
    document.getElementById("repair-new-customer-mobile")?.focus();
    if (typeof feather !== "undefined") feather.replace();
  }, 20);
}

function closeRepairAddCustomerModal() {
  document.getElementById("repair-add-customer-modal")?.classList.add("hidden");
  document
    .getElementById("repair-add-customer-modal")
    ?.classList.remove("flex");
  document.getElementById("repair-add-customer-form")?.reset();
}

async function saveRepairNewCustomer(event) {
  event.preventDefault();

  const mobile =
    document.getElementById("repair-new-customer-mobile")?.value?.trim() || "";
  const name =
    document.getElementById("repair-new-customer-name")?.value?.trim() || "";
  const email =
    document.getElementById("repair-new-customer-email")?.value?.trim() || "";
  const address =
    document.getElementById("repair-new-customer-address")?.value?.trim() || "";

  if (!/^0\d{9}$/.test(mobile)) {
    showNotification(
      "Mobile number must be exactly 10 digits and start with 0",
      "warning"
    );
    document.getElementById("repair-new-customer-mobile")?.focus();
    return;
  }

  const saveBtn = document.getElementById("repair-add-customer-save-btn");
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = "Adding...";
  }

  try {
    const created = await repairRequest("/customers", {
      method: "POST",
      body: JSON.stringify({
        mobileNumber: mobile,
        name: name || undefined,
        email: email || null,
        address: address || null,
      }),
    });

    const customerName = created?.name || name || `Customer ${mobile}`;
    const customerPhone = created?.phone || mobile;

    const customerAddress = created?.address || address || "";
    selectRepairCustomer(created.id, customerName, customerPhone, customerAddress);
    closeRepairAddCustomerModal();
    showNotification("Customer added successfully", "success");
  } catch (err) {
    showNotification(err.message || "Failed to add customer", "error");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Add Customer";
    }
  }
}

// --- Technician Select ---
async function loadTechnicianSelect(currentValue = "") {
  const sel = document.getElementById("repair-technician");
  if (!sel) return;
  if (techniciansCache.length === 0) {
    try {
      const employees = await repairRequest("/employee");
      const list = Array.isArray(employees) ? employees : [];
      techniciansCache = list
        .filter((e) => {
          const isActive = (e.status?.name || "").toLowerCase() === "active";
          const roleName = (
            e.role?.name ||
            e.roleName ||
            e.position ||
            ""
          ).toLowerCase();
          return isActive && roleName.includes("technician");
        })
        .map((e) => `${e.firstName} ${e.lastName}`.trim())
        .filter(Boolean);
    } catch (err) {
      console.error("Failed to load technicians:", err);
    }
  }
  const opts = ['<option value="">\u2014 Select Technician \u2014</option>'];
  techniciansCache.forEach((name) => {
    opts.push(
      `<option value="${escapeHtml(name)}" ${
        name === currentValue ? "selected" : ""
      }>${escapeHtml(name)}</option>`
    );
  });
  sel.innerHTML = opts.join("");
}

// --- Invoice Item Search ---
async function searchInvoiceItemInput(inputEl) {
  clearTimeout(invoiceItemSearchTimeout);
  const query = inputEl.value.trim();
  const td = inputEl.closest("td");
  const resultsEl = td ? td.querySelector(".invoice-item-results") : null;
  if (!resultsEl) return;
  if (query.length < 1) {
    resultsEl.classList.add("hidden");
    return;
  }
  invoiceItemSearchTimeout = setTimeout(async () => {
    try {
      const stocks = await repairRequest(
        `/inventory/search-stock?term=${encodeURIComponent(
          query
        )}&stockType=repair`
      );
      const list = Array.isArray(stocks) ? stocks : [];
      if (list.length === 0) {
        resultsEl.innerHTML = `<div class="px-3 py-2 text-sm text-gray-400 italic">No repair stock found. Transfer from Main stock first.</div>`;
      } else {
        resultsEl.innerHTML = list
          .slice(0, 6)
          .map((s) => {
            const cost = Number(s.buyingPrice || 0);
            const price = Number(s.sellingPrice || 0);
            const name = `${s.productName || ""}${
              s.variantName ? ` - ${s.variantName}` : ""
            }`;
            return `<div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              data-name="${escapeHtml(name)}" data-cost="${cost}" data-price="${price}" data-stock-id="${escapeHtml(
              s.stockId
            )}" data-max-qty="${Number(s.quantityInStock || 0)}"
              onmousedown="event.preventDefault(); selectInvoiceItemEl(this)">
              <span class="font-medium">${escapeHtml(name)}</span>
              <span class="text-gray-400 text-xs ml-2">${escapeHtml(
                s.stockId
              )}</span>
              <span class="text-blue-600 text-xs ml-2">Qty ${Number(
                s.quantityInStock || 0
              )}</span>
              <span class="text-green-600 text-xs ml-2">Rs. ${price.toLocaleString()}</span>
            </div>`;
          })
          .join("");
      }
      resultsEl.classList.remove("hidden");
    } catch (err) {
      resultsEl.classList.add("hidden");
    }
  }, 250);
}

function selectInvoiceItemEl(el) {
  const name = el.dataset.name || "";
  const cost = parseFloat(el.dataset.cost) || 0;
  const price = parseFloat(el.dataset.price) || 0;
  const stockId = el.dataset.stockId || "";
  const maxQty = parseInt(el.dataset.maxQty || "0");
  // Walk up: result-item → .invoice-item-results → td → tr
  const resultsEl = el.closest(".invoice-item-results");
  const td = resultsEl?.closest("td");
  const row = td?.closest("tr");
  if (td) {
    const inputEl = td.querySelector(".invoice-item-search");
    if (inputEl) inputEl.value = name;
  }
  if (resultsEl) resultsEl.classList.add("hidden");
  if (row) {
    const costInput = row.querySelector(".invoice-cost-input");
    const priceInput = row.querySelector(".invoice-price-input");
    const stockInput = row.querySelector(".invoice-stock-id-input");
    const qtyInput = row.querySelector(".invoice-qty-input");
    if (costInput) costInput.value = cost;
    if (priceInput) priceInput.value = price;
    if (stockInput) stockInput.value = stockId;
    if (qtyInput) {
      qtyInput.max = String(Math.max(1, maxQty));
      qtyInput.value = "1";
    }
    recalcInvoiceTotals();
  }
}

// --- New / Edit Repair Modal ---
function resetRepairAcknowledgementFields() {
  setRepairYesNo("repair-company-warranty", null);
  setRepairYesNo("repair-phone-power-on", null);
  setRepairYesNo("repair-prior-estimate", null);
  setRepairYesNo("repair-notify-charge", null);
  setRepairCheckedValues("repair-fault-category", []);
  setRepairCheckedValues("repair-physical-condition", []);
  setRepairCheckedValues("repair-accessory", []);
  const preview = document.getElementById("repair-customer-preview");
  if (preview) preview.classList.add("hidden");
  const jobNo = document.getElementById("repair-job-no-display");
  if (jobNo) jobNo.value = "Assigned after save";
  const received = document.getElementById("repair-received-display");
  if (received) received.value = formatDateTimeLocalValue(new Date());
}

function openNewRepairModal() {
  document.getElementById("repair-modal-title").textContent =
    "Create New Repair Order";
  document.getElementById("repair-save-btn").textContent =
    "Create Repair Order";
  document.getElementById("repair-form").reset();
  document.getElementById("repair-id").value = "";
  document.getElementById("repair-customer-id").value = "";
  document.getElementById("selected-repair-customer").classList.add("hidden");
  document.getElementById("selected-repair-customer").textContent = "";
  document.getElementById("repair-customer-results").classList.add("hidden");
  resetRepairAcknowledgementFields();
  document.getElementById("repair-modal").classList.remove("hidden");
  document.getElementById("repair-modal").classList.add("flex");
  ensureRepairPaymentResourcesLoaded().then(() =>
    toggleRepairAdvancePaymentFields()
  );
  const advCheckbox = document.getElementById("repair-has-advance");
  if (advCheckbox) advCheckbox.checked = false;
  toggleRepairAdvancePaymentFields();
  loadTechnicianSelect();
  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
}

function closeRepairModal() {
  document.getElementById("repair-modal").classList.add("hidden");
  document.getElementById("repair-modal").classList.remove("flex");
}

function toggleRepairAdvancePaymentFields() {
  const checked = !!document.getElementById("repair-has-advance")?.checked;
  const wrap = document.getElementById("repair-advance-fields");
  if (wrap) wrap.classList.toggle("hidden", !checked);

  const typeSelect = document.getElementById("repair-advance-payment-type");
  const selectedTypeId = typeSelect?.value || "";
  if (typeSelect) {
    typeSelect.innerHTML = [
      '<option value="">Select Payment Type</option>',
      ...repairPaymentTypes.map(
        (pt) => `<option value="${pt.id}">${pt.name}</option>`
      ),
    ].join("");
    typeSelect.value = selectedTypeId;
  }

  const bankSelect = document.getElementById("repair-advance-bank-account");
  const selectedBankId = bankSelect?.value || "";
  if (bankSelect) {
    bankSelect.innerHTML = [
      '<option value="">Select Bank Account</option>',
      ...repairBankAccounts.map(
        (acc) =>
          `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
      ),
    ].join("");
    bankSelect.value = selectedBankId;
  }

  const selectedType = repairPaymentTypes.find(
    (pt) => String(pt.id) === String(typeSelect?.value || "")
  );
  const isBt = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isChq = /^cheque$/i.test(selectedType?.name || "");
  const showBank = (isBt || isChq) && checked;
  const bankWrap = document.getElementById("repair-advance-bank-wrap");
  const chqWrap = document.getElementById("repair-advance-cheque-wrap");
  if (bankWrap) bankWrap.classList.toggle("hidden", !showBank);
  if (chqWrap) {
    chqWrap.classList.toggle("hidden", !isChq || !checked);
    const chq = document.getElementById("repair-advance-cheque-number");
    if (chq && !isChq) chq.value = "";
  }
}

async function editRepair(id) {
  try {
    await ensureRepairPaymentResourcesLoaded();
    const r = await repairRequest(`/repairs/${id}`);
    document.getElementById("repair-modal-title").textContent =
      "Edit Repair Order";
    document.getElementById("repair-save-btn").textContent = "Save Changes";
    document.getElementById("repair-id").value = r.id;
    selectRepairCustomer(
      r.customer?.id || "",
      r.customer?.name || "",
      r.customer?.mobileNumber || "",
      r.customer?.address || ""
    );
    document.getElementById("repair-job-no-display").value =
      r.repairNumber || "";
    document.getElementById("repair-received-display").value =
      formatDateTimeLocalValue(r.receivedAt);
    document.getElementById("repair-device-make").value = r.deviceMake || "";
    const deviceName = String(r.deviceName || "");
    const make = String(r.deviceMake || "");
    const fallbackModel =
      make && deviceName.toLowerCase().startsWith(make.toLowerCase())
        ? deviceName.slice(make.length).trim()
        : deviceName;
    document.getElementById("repair-device-model").value = fallbackModel;
    document.getElementById("repair-device-imei").value = r.imei || "";
    document.getElementById("repair-device-serial").value = r.serialNumber || "";
    setRepairYesNo("repair-company-warranty", r.companyWarranty);
    document.getElementById("repair-purchase-date").value = formatDateInputValue(
      r.purchaseDate
    );
    setRepairYesNo("repair-phone-power-on", r.phonePowerOn);
    setRepairCheckedValues("repair-fault-category", r.faultCategories);
    document.getElementById("repair-issue").value = r.issue;
    setRepairCheckedValues("repair-physical-condition", r.physicalConditions);
    document.getElementById("repair-physical-other").value =
      r.physicalConditionOther || "";
    setRepairCheckedValues("repair-accessory", r.accessoriesReceived);
    document.getElementById("repair-accessories-other").value =
      r.accessoriesOther || "";
    setRepairYesNo("repair-prior-estimate", r.priorEstimateGiven);
    document.getElementById("repair-estimated-cost").value =
      r.estimatedCost || "";
    setRepairYesNo("repair-notify-charge", r.notifyChargeBeforeWork);
    document.getElementById("repair-approx-delivery").value =
      formatDateInputValue(r.approxDeliveryDate);
    document.getElementById("repair-accepted-by").value = r.acceptedBy || "";
    document.getElementById("repair-priority").value = r.priority || "normal";
    await loadTechnicianSelect(r.technician || "");
    document.getElementById("repair-notes").value = getPublicRepairNotes(
      r.notes
    );
    const advCheckbox = document.getElementById("repair-has-advance");
    if (advCheckbox) advCheckbox.checked = false;
    toggleRepairAdvancePaymentFields();
    document.getElementById("repair-modal").classList.remove("hidden");
    document.getElementById("repair-modal").classList.add("flex");
    if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
  } catch (err) {
    showNotification("Failed to load repair", "error");
  }
}

async function saveRepair(e) {
  e.preventDefault();
  const id = document.getElementById("repair-id").value;
  const customerId = document.getElementById("repair-customer-id").value;

  if (!customerId) {
    showNotification("Please select a customer first", "error");
    return;
  }

  const deviceMake = document.getElementById("repair-device-make")?.value?.trim() || "";
  const deviceModel = document.getElementById("repair-device-model")?.value?.trim() || "";
  if (!deviceMake && !deviceModel) {
    showNotification("Please enter device make or model", "error");
    return;
  }

  const payload = {
    customerId: parseInt(customerId),
    deviceMake: deviceMake || null,
    deviceModel: deviceModel || null,
    imei: document.getElementById("repair-device-imei").value.trim() || null,
    serialNumber:
      document.getElementById("repair-device-serial")?.value?.trim() || null,
    companyWarranty: getRepairYesNo("repair-company-warranty"),
    purchaseDate:
      document.getElementById("repair-purchase-date")?.value || null,
    phonePowerOn: getRepairYesNo("repair-phone-power-on"),
    faultCategories: getRepairCheckedValues("repair-fault-category"),
    issue: document.getElementById("repair-issue").value.trim(),
    physicalConditions: getRepairCheckedValues("repair-physical-condition"),
    physicalConditionOther:
      document.getElementById("repair-physical-other")?.value?.trim() || null,
    accessoriesReceived: getRepairCheckedValues("repair-accessory"),
    accessoriesOther:
      document.getElementById("repair-accessories-other")?.value?.trim() || null,
    priorEstimateGiven: getRepairYesNo("repair-prior-estimate"),
    estimatedCost:
      document.getElementById("repair-estimated-cost").value || null,
    notifyChargeBeforeWork: getRepairYesNo("repair-notify-charge"),
    approxDeliveryDate:
      document.getElementById("repair-approx-delivery")?.value || null,
    acceptedBy:
      document.getElementById("repair-accepted-by")?.value?.trim() || null,
    priority: document.getElementById("repair-priority").value,
    technician:
      document.getElementById("repair-technician").value.trim() || null,
    notes: document.getElementById("repair-notes").value.trim() || null,
  };

  const hasAdvance = !!document.getElementById("repair-has-advance")?.checked;
  if (!id && hasAdvance) {
    payload.advanceAmount =
      parseFloat(
        document.getElementById("repair-advance-amount")?.value || "0"
      ) || 0;
    payload.advancePaymentTypeId =
      parseInt(document.getElementById("repair-advance-payment-type")?.value) ||
      null;
    payload.advanceBankAccountId =
      parseInt(document.getElementById("repair-advance-bank-account")?.value) ||
      null;
    payload.advanceNote =
      document.getElementById("repair-advance-note")?.value?.trim() || null;
    payload.advanceChequeNumber =
      document
        .getElementById("repair-advance-cheque-number")
        ?.value?.trim() || null;

    if (payload.advanceAmount > 0 && !payload.advancePaymentTypeId) {
      showNotification("Please select advance payment type", "error");
      return;
    }

    const selectedType = repairPaymentTypes.find(
      (pt) => String(pt.id) === String(payload.advancePaymentTypeId || "")
    );
    const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
    const isCheque = /^cheque$/i.test(selectedType?.name || "");
    if (
      payload.advanceAmount > 0 &&
      (isBankTransfer || isCheque) &&
      !payload.advanceBankAccountId
    ) {
      showNotification("Please select bank account for advance payment", "error");
      return;
    }
    if (payload.advanceAmount > 0 && isCheque && !payload.advanceChequeNumber) {
      showNotification("Please enter the cheque number for advance", "error");
      return;
    }
  }

  const btn = document.getElementById("repair-save-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  try {
    if (id) {
      await repairRequest(`/repairs/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showNotification("Repair updated successfully", "success");
      closeRepairModal();
    } else {
      const created = await repairRequest("/repairs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showNotification("Repair order created successfully", "success");
      closeRepairModal();
      if (created) printRepairAcknowledgement(created);
    }
    await loadRepairsData();
  } catch (err) {
    showNotification(err.message || "Failed to save repair", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = id ? "Save Changes" : "Create Repair Order";
    }
  }
}

async function deleteRepair(id) {
  const row = repairsData.find(
    (r) => String(r.id) === String(id)
  );
  const code = row?.repairNumber || `#${id}`;
  const msg =
    `Delete repair ${code}?\n\n` +
    "This will reverse related journal entries, restore consumed repair stock batches, and remove the repair record.\n\n" +
    "Continue?";
  if (!confirm(msg)) return;
  if (
    !confirm(
      `Final confirmation: permanently delete ${code}? This cannot be undone.`
    )
  )
    return;
  try {
    await repairRequest(`/repairs/${id}`, { method: "DELETE" });
    showNotification("Repair deleted and transactions reversed.", "success");
    await loadRepairsData();
  } catch (err) {
    showNotification(err.message || "Failed to delete repair", "error");
  }
}

// --- View Details Modal ---
async function viewRepair(id) {
  try {
    const r = await repairRequest(`/repairs/${id}`);
    const titleEl = document.getElementById("repair-details-title");
    const contentEl = document.getElementById("repair-details-content");
    if (titleEl) titleEl.textContent = `Repair — ${r.repairNumber}`;
    if (!contentEl) return;

    const itemsHtml = (r.items || []).length
      ? `<ul class="list-disc pl-5 text-sm">${r.items
          .map(
            (it) =>
              `<li>${escapeHtml(it.name)} — Rs.${Number(
                it.price
              ).toLocaleString()}</li>`
          )
          .join("")}</ul>`
      : '<p class="text-sm text-gray-500">No items</p>';

    const receivedDate = r.receivedAt
      ? new Date(r.receivedAt).toLocaleDateString()
      : "—";
    const paymentSummary = r.paymentSummary || {
      totalAmount: Number(r.actualCost || r.estimatedCost || 0),
      paidAmount: 0,
      balance: Number(r.actualCost || r.estimatedCost || 0),
      paymentStatus: "Pending",
    };
    const paymentHistoryHtml = buildPaymentHistoryHtml(r.payments || []);
    const publicNotes = getPublicRepairNotes(r.notes);

    contentEl.innerHTML = `
      <div class="grid grid-cols-2 gap-4 text-sm mb-4">
        <div><strong>Customer:</strong> ${escapeHtml(
          r.customer?.name || "—"
        )}</div>
        <div><strong>Phone:</strong> ${escapeHtml(
          r.customer?.mobileNumber || "—"
        )}</div>
        <div><strong>Make:</strong> ${escapeHtml(r.deviceMake || "—")}</div>
        <div><strong>Model:</strong> ${escapeHtml(r.deviceName || "—")}</div>
        <div><strong>IMEI:</strong> ${escapeHtml(r.imei || "—")}</div>
        <div><strong>Serial:</strong> ${escapeHtml(r.serialNumber || "—")}</div>
        <div><strong>Status:</strong> ${escapeHtml(r.status || "—")}</div>
        <div><strong>Priority:</strong> ${escapeHtml(r.priority || "—")}</div>
        <div><strong>Technician:</strong> ${escapeHtml(
          r.technician || "—"
        )}</div>
        <div><strong>Estimated:</strong> Rs.${Number(
          r.estimatedCost || 0
        ).toLocaleString()}</div>
        <div><strong>Actual Cost:</strong> Rs.${Number(
          r.actualCost || 0
        ).toLocaleString()}</div>
        <div><strong>Received:</strong> ${receivedDate}</div>
      </div>
      <div class="mb-4"><strong class="text-sm">Issue:</strong><p class="text-sm text-gray-700 mt-1">${escapeHtml(
        r.issue || "—"
      )}</p></div>
      <div class="mb-4 text-sm grid grid-cols-2 gap-2">
        <div><strong>Company Warranty:</strong> ${
          r.companyWarranty === true ? "YES" : r.companyWarranty === false ? "NO" : "—"
        }</div>
        <div><strong>Phone Power On:</strong> ${
          r.phonePowerOn === true ? "YES" : r.phonePowerOn === false ? "NO" : "—"
        }</div>
        <div class="col-span-2"><strong>Faults:</strong> ${escapeHtml(
          (r.faultCategories || []).join(", ") || "—"
        )}</div>
        <div class="col-span-2"><strong>Condition:</strong> ${escapeHtml(
          [...(r.physicalConditions || []), r.physicalConditionOther]
            .filter(Boolean)
            .join(", ") || "—"
        )}</div>
        <div class="col-span-2"><strong>Accessories:</strong> ${escapeHtml(
          [...(r.accessoriesReceived || []), r.accessoriesOther]
            .filter(Boolean)
            .join(", ") || "—"
        )}</div>
      </div>
      <div class="mb-4"><strong class="text-sm">Items:</strong><div class="mt-1">${itemsHtml}</div></div>
      <div class="mb-4">
        <strong class="text-sm">Payment History:</strong>
        <div class="mt-2">${paymentHistoryHtml}</div>
      </div>
      ${
        publicNotes
          ? `<div class="mb-4"><strong class="text-sm">Notes:</strong><p class="text-sm text-gray-600 mt-1">${escapeHtml(
              publicNotes
            )}</p></div>`
          : ""
      }
      <div class="flex justify-end space-x-3">
        <button onclick="printRepairAcknowledgementById(${
          r.id
        })" class="btn-secondary px-4 py-2 text-sm">Print Acknowledgement</button>
        <button onclick="openRepairInvoiceModal(${
          r.id
        }); closeRepairDetailsModal();" class="btn-primary px-4 py-2 text-white text-sm">Open Invoice</button>
        <button onclick="closeRepairDetailsModal()" class="btn-secondary px-4 py-2 text-sm">Close</button>
      </div>`;

    document.getElementById("repair-details-modal").classList.remove("hidden");
    document.getElementById("repair-details-modal").classList.add("flex");
    if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 60);
  } catch (err) {
    showNotification("Failed to load repair details", "error");
  }
}

function closeRepairDetailsModal() {
  document.getElementById("repair-details-modal").classList.add("hidden");
  document.getElementById("repair-details-modal").classList.remove("flex");
}

// --- Status Modal ---
function openStatusModal(id) {
  const repair = repairsData.find((r) => r.id === id);
  document.getElementById("status-repair-id").value = id;
  document.getElementById("status-repair-label").textContent = repair
    ? `${repair.repairNumber} — ${repair.deviceName}`
    : `Repair #${id}`;
  document.getElementById("status-select").value = repair?.status || "Received";
  document.getElementById("status-modal").classList.remove("hidden");
  document.getElementById("status-modal").classList.add("flex");
  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
}

function closeStatusModal() {
  document.getElementById("status-modal").classList.add("hidden");
  document.getElementById("status-modal").classList.remove("flex");
}

async function submitStatusUpdate() {
  const id = document.getElementById("status-repair-id").value;
  const status = document.getElementById("status-select").value;
  const btn = document.getElementById("status-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Updating…";
  }
  try {
    await repairRequest(`/repairs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    showNotification(`Status updated to "${status}"`, "success");
    closeStatusModal();
    await loadRepairsData();
  } catch (err) {
    showNotification(err.message || "Failed to update status", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Update";
    }
  }
}

// --- Invoice Modal ---
let invoiceRepairId = null;
let currentRepairInvoiceData = null;

async function ensureRepairPaymentResourcesLoaded() {
  if (repairPaymentTypes.length > 0 && repairBankAccounts.length > 0) return;
  const [payTypes, accounts] = await Promise.all([
    repairRequest("/repairs/payment-types"),
    repairRequest("/accounts/accounts"),
  ]);
  repairPaymentTypes = (Array.isArray(payTypes) ? payTypes : []).filter((pt) =>
    /^(cash|cheque|bank\s*transfer)$/i.test((pt.name || "").trim())
  );

  const accountList = Array.isArray(accounts) ? accounts : [];
  repairBankAccounts =
    typeof filterBankSubAccounts === "function"
      ? filterBankSubAccounts(accountList)
      : accountList;
}

async function openRepairInvoiceModal(id) {
  invoiceRepairId = id;
  try {
    const r = await repairRequest(`/repairs/${id}`);
    await ensureRepairPaymentResourcesLoaded();

    document.getElementById(
      "repair-invoice-title"
    ).textContent = `Repair Invoice — ${r.repairNumber}`;
    currentRepairInvoiceData = r;
    document.getElementById("repair-invoice-modal").classList.remove("hidden");
    document.getElementById("repair-invoice-modal").classList.add("flex");
    renderRepairInvoice(r);
    if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 60);
  } catch (err) {
    showNotification("Failed to load repair invoice", "error");
  }
}

function closeRepairInvoiceModal() {
  document.getElementById("repair-invoice-modal").classList.add("hidden");
  document.getElementById("repair-invoice-modal").classList.remove("flex");
  document.getElementById("repair-invoice-content").innerHTML = "";
  invoiceRepairId = null;
  currentRepairInvoiceData = null;
}

function getPaymentStatusBadge(status) {
  const s = status || "Pending";
  const map = {
    Paid: "bg-green-100 text-green-800",
    Partial: "bg-yellow-100 text-yellow-800",
    Pending: "bg-red-100 text-red-800",
    "Not Ready": "bg-gray-100 text-gray-700",
  };
  return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${
    map[s] || "bg-gray-100 text-gray-700"
  }">${escapeHtml(s)}</span>`;
}

function getPublicRepairNotes(notes) {
  return String(notes || "")
    .replace(/\s*\[RPAY\|[^\]]+\]/g, "")
    .trim();
}

function buildPaymentHistoryHtml(payments) {
  if (!Array.isArray(payments) || payments.length === 0) {
    return '<p class="text-sm text-gray-500">No payments recorded yet.</p>';
  }

  return `
    <div class="overflow-x-auto border border-gray-200 rounded-lg">
      <table class="min-w-full text-sm">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-3 py-2 text-left">Date</th>
            <th class="px-3 py-2 text-left">Type</th>
            <th class="px-3 py-2 text-left">Note</th>
            <th class="px-3 py-2 text-right">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${payments
            .map((p) => {
              const paidAt = p.paidAt
                ? new Date(p.paidAt).toLocaleString()
                : "—";
              const typeLabel = p.isAdvance
                ? `${p.paymentType || "—"} (Advance)`
                : p.paymentType || "—";
              return `<tr class="border-t border-gray-100">
                <td class="px-3 py-2">${escapeHtml(paidAt)}</td>
                <td class="px-3 py-2">${escapeHtml(typeLabel)}</td>
                <td class="px-3 py-2">${escapeHtml(p.note || "—")}</td>
                <td class="px-3 py-2 text-right">${Number(
                  p.amount || 0
                ).toLocaleString()}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderRepairInvoice(r) {
  const paymentSummary = r.paymentSummary || {
    totalAmount: Number(r.actualCost || r.estimatedCost || 0),
    paidAmount: 0,
    balance: Number(r.actualCost || r.estimatedCost || 0),
    paymentStatus: "Pending",
  };
  const payments = Array.isArray(r.payments) ? r.payments : [];
  const isFullyPaid = Number(paymentSummary.balance || 0) <= 0.01;
  const validItems = (r.items || []).filter((it) =>
    String(it?.name || "").trim()
  );
  const itemsTotal = validItems.reduce(
    (sum, it) =>
      sum + Number(it.price || 0) * Math.max(1, Number(it.quantity || 1)),
    0
  );
  const estimatedTotal = Number(r.estimatedCost || 0);
  const invoiceTotal = Number(
    paymentSummary.totalAmount ||
      (validItems.length > 0 ? itemsTotal : estimatedTotal)
  );
  const paidTotal = Number(paymentSummary.paidAmount || 0);
  const balanceTotal = Math.max(
    0,
    Number(paymentSummary.balance ?? invoiceTotal - paidTotal)
  );
  const paymentHistoryHtml = buildPaymentHistoryHtml(payments);

  const rows = (r.items || [])
    .map((item, idx) => buildInvoiceRow(idx + 1, item, isFullyPaid))
    .join("");
  const paymentTypeOptions = [
    '<option value="">Select Payment Type</option>',
    ...repairPaymentTypes.map(
      (pt) =>
        `<option value="${Number(pt.id)}">${escapeHtml(pt.name)}</option>`
    ),
  ].join("");
  const bankOptions = [
    '<option value="">Select Bank Account</option>',
    ...repairBankAccounts.map(
      (acc) =>
        `<option value="${Number(acc.id)}">${escapeHtml(
          `${acc.accountCode} - ${acc.accountName}`
        )}</option>`
    ),
  ].join("");

  const paymentSectionHtml = isFullyPaid
    ? `<div class="border border-emerald-200 bg-emerald-50 rounded-lg p-4 text-sm text-emerald-800">
        This repair is fully paid.
      </div>`
    : `<div class="border border-gray-200 rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select id="repair-payment-type" onchange="toggleRepairPaymentBankAccount()" class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
            ${paymentTypeOptions}
          </select>
          <input id="repair-payment-amount" type="number" min="0" step="0.01" value="${Number(
            balanceTotal || 0
          ).toFixed(2)}" data-auto="1"
            class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          <input id="repair-payment-note" type="text" placeholder="Payment note (optional)"
            class="border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          <button type="button" id="repair-payment-btn" onclick="submitRepairPayment()"
            class="btn-primary text-white px-4 py-2 rounded">Record Payment</button>
        </div>
        <div id="repair-payment-bank-wrap" class="hidden mt-3 max-w-md">
          <label class="block text-xs text-gray-600 mb-1">Bank Account *</label>
          <select id="repair-payment-bank-account" class="border border-gray-300 rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500">
            ${bankOptions}
          </select>
        </div>
        <div id="repair-payment-cheque-wrap" class="hidden mt-3 max-w-md">
          <label class="block text-xs text-gray-600 mb-1">Cheque Number *</label>
          <input id="repair-payment-cheque-number" type="text" maxlength="50" class="border border-gray-300 rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500" placeholder="e.g. 123456" />
        </div>
      </div>`;

  document.getElementById("repair-invoice-content").innerHTML = `
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 p-4 rounded-lg text-sm">
          <h3 class="font-semibold text-gray-700 mb-2">Customer</h3>
          <p><strong>Name:</strong> ${escapeHtml(
            r.customer?.name || "—"
          )}</p>
          <p><strong>Mobile:</strong> ${escapeHtml(
            r.customer?.mobileNumber || "—"
          )}</p>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg text-sm">
          <h3 class="font-semibold text-gray-700 mb-2">Device</h3>
          <p><strong>Model:</strong> ${escapeHtml(r.deviceName)}</p>
          <p><strong>IMEI:</strong> ${escapeHtml(r.imei || "—")}</p>
          <p><strong>Issue:</strong> ${escapeHtml(r.issue)}</p>
        </div>
      </div>
      <div>
        <div class="flex justify-between items-center mb-3">
          <h3 class="text-base font-semibold text-gray-800">Parts / Materials</h3>
          ${
            isFullyPaid
              ? ""
              : '<button type="button" onclick="addRepairInvoiceRow()" class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Add Item</button>'
          }
        </div>
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-3 py-2 text-left">#</th>
                <th class="px-3 py-2 text-left">Item</th>
                <th class="px-3 py-2 text-left">Cost (Rs.)</th>
                <th class="px-3 py-2 text-left">Price (Rs.)</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody id="repair-invoice-items-body">
              ${
                rows ||
                '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-400">No items yet — click Add Item</td></tr>'
              }
            </tbody>
            <tfoot class="bg-gray-50">
              <tr>
                <td colspan="2" class="px-3 py-2 font-semibold">Totals</td>
                <td class="px-3 py-2 font-semibold" id="invoice-total-cost">0</td>
                <td class="px-3 py-2 font-semibold" id="invoice-total-price">0</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div>
        <h3 class="text-base font-semibold text-gray-800 mb-2">Payment History</h3>
        ${paymentHistoryHtml}
      </div>
      ${paymentSectionHtml}
      <input type="hidden" id="repair-estimated-total" value="${estimatedTotal}" />
    </div>`;

  const saveBtn = document.getElementById("repair-invoice-save-btn");
  if (saveBtn) {
    saveBtn.classList.toggle("hidden", isFullyPaid);
    saveBtn.disabled = isFullyPaid;
  }

  toggleRepairPaymentBankAccount();
  recalcInvoiceTotals();
  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 50);
}

function toggleRepairPaymentBankAccount() {
  const typeEl = document.getElementById("repair-payment-type");
  const wrapEl = document.getElementById("repair-payment-bank-wrap");
  const chqEl = document.getElementById("repair-payment-cheque-wrap");
  if (!typeEl || !wrapEl) return;

  const selectedType = repairPaymentTypes.find(
    (pt) => String(pt.id) === String(typeEl.value)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const needBank = isBankTransfer || isCheque;
  wrapEl.classList.toggle("hidden", !needBank);
  if (chqEl) {
    chqEl.classList.toggle("hidden", !isCheque);
    const c = document.getElementById("repair-payment-cheque-number");
    if (c && !isCheque) c.value = "";
  }
}

async function submitRepairPayment() {
  if (!invoiceRepairId) return;

  const serverBalance = Number(
    currentRepairInvoiceData?.paymentSummary?.balance || 0
  );
  if (serverBalance <= 0.01) {
    showNotification("This repair is already fully paid", "warning");
    return;
  }

  // Block payment against unsaved invoice edits (live total vs saved total)
  const tbody = document.getElementById("repair-invoice-items-body");
  if (tbody) {
    let liveTotal = 0;
    let hasNamed = false;
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      const name = row.querySelector(".invoice-item-search")?.value?.trim();
      if (!name) return;
      hasNamed = true;
      const price =
        parseFloat(row.querySelector(".invoice-price-input")?.value) || 0;
      const qty = Math.max(
        1,
        parseInt(row.querySelector(".invoice-qty-input")?.value || "1")
      );
      liveTotal += price * qty;
    });
    const savedTotal = Number(
      currentRepairInvoiceData?.paymentSummary?.totalAmount || 0
    );
    if (hasNamed && Math.abs(liveTotal - savedTotal) > 0.01) {
      showNotification(
        "Save invoice items before recording a payment.",
        "warning"
      );
      return;
    }
  }

  const paymentTypeId = document.getElementById("repair-payment-type")?.value;
  const bankAccountId =
    document.getElementById("repair-payment-bank-account")?.value || "";
  const amount = parseFloat(
    document.getElementById("repair-payment-amount")?.value || "0"
  );
  const note = document.getElementById("repair-payment-note")?.value || "";

  const selectedType = repairPaymentTypes.find(
    (pt) => String(pt.id) === String(paymentTypeId)
  );
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedType?.name || "");
  const isCheque = /^cheque$/i.test(selectedType?.name || "");
  const chq = String(
    document.getElementById("repair-payment-cheque-number")?.value || ""
  ).trim();

  if (!paymentTypeId) {
    showNotification("Please select a payment type", "error");
    return;
  }
  if (!amount || amount <= 0) {
    showNotification("Enter a valid payment amount", "error");
    return;
  }
  if ((isBankTransfer || isCheque) && !bankAccountId) {
    showNotification("Please select a bank account", "error");
    return;
  }
  if (isCheque && !chq) {
    showNotification("Please enter the cheque number", "error");
    return;
  }

  const btn = document.getElementById("repair-payment-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Recording…";
  }

  try {
    const updated = await repairRequest(
      `/repairs/${invoiceRepairId}/payments`,
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          paymentTypeId,
          bankAccountId: isBankTransfer || isCheque ? bankAccountId : null,
          chequeNumber: isCheque ? chq : null,
          note,
        }),
      }
    );
    currentRepairInvoiceData = updated;
    showNotification("Repair payment recorded successfully", "success");
    renderRepairInvoice(updated);
    await loadRepairsData();
  } catch (err) {
    showNotification(err.message || "Failed to record payment", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Record Payment";
    }
  }
}

function openRepairStockTransferModal() {
  const modal = document.getElementById("repair-stock-transfer-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.getElementById("repair-transfer-main-search").value = "";
  document.getElementById("repair-transfer-source-stock-id").value = "";
  document.getElementById("repair-transfer-qty").value = "1";
  document.getElementById("repair-transfer-note").value = "";
  document
    .getElementById("repair-transfer-selected-info")
    .classList.add("hidden");
  document
    .getElementById("repair-transfer-main-results")
    .classList.add("hidden");
  repairTransferCandidates = [];
  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 30);
}

function closeRepairStockTransferModal() {
  const modal = document.getElementById("repair-stock-transfer-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function searchMainStockForTransfer() {
  clearTimeout(repairTransferSearchTimeout);
  const input = document.getElementById("repair-transfer-main-search");
  const results = document.getElementById("repair-transfer-main-results");
  const q = (input?.value || "").trim();
  if (!results) return;
  if (q.length < 2) {
    results.classList.add("hidden");
    return;
  }

  repairTransferSearchTimeout = setTimeout(async () => {
    try {
      const list = await repairRequest(
        `/inventory/search-stock?term=${encodeURIComponent(q)}&stockType=main`
      );
      repairTransferCandidates = Array.isArray(list) ? list : [];
      if (repairTransferCandidates.length === 0) {
        results.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">No main stock found</div>`;
      } else {
        results.innerHTML = repairTransferCandidates
          .slice(0, 8)
          .map((s) => {
            const label = `${s.productName || ""}${
              s.variantName ? ` - ${s.variantName}` : ""
            }`;
            return `<div class="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
              data-stock-id="${escapeHtml(s.stockId)}">
              ${escapeHtml(label)}
              <span class="text-gray-500">(${escapeHtml(s.stockId)})</span>
              <span class="text-blue-600 ml-2">Qty ${Number(
                s.quantityInStock || 0
              )}</span>
            </div>`;
          })
          .join("");
        results.querySelectorAll("[data-stock-id]").forEach((el) => {
          el.addEventListener("click", () => {
            selectMainStockForTransfer(el.getAttribute("data-stock-id"));
          });
        });
      }
      results.classList.remove("hidden");
    } catch (err) {
      results.innerHTML = `<div class="px-3 py-2 text-sm text-red-500">Search failed</div>`;
      results.classList.remove("hidden");
    }
  }, 250);
}

function selectMainStockForTransfer(stockId) {
  const item = repairTransferCandidates.find((s) => s.stockId === stockId);
  if (!item) return;
  document.getElementById("repair-transfer-source-stock-id").value =
    item.stockId;
  document.getElementById("repair-transfer-main-search").value = `${
    item.productName
  }${item.variantName ? ` - ${item.variantName}` : ""} (${item.stockId})`;
  const info = document.getElementById("repair-transfer-selected-info");
  info.textContent = `Selected: ${item.stockId} | Available in Main: ${item.quantityInStock}`;
  info.classList.remove("hidden");
  document
    .getElementById("repair-transfer-main-results")
    .classList.add("hidden");
}

async function submitRepairStockTransfer() {
  const sourceStockId = document.getElementById(
    "repair-transfer-source-stock-id"
  )?.value;
  const quantity = parseInt(
    document.getElementById("repair-transfer-qty")?.value || "0"
  );
  const note =
    document.getElementById("repair-transfer-note")?.value?.trim() || null;
  if (!sourceStockId) {
    showNotification("Select a main stock batch to transfer", "error");
    return;
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    showNotification("Enter a valid quantity", "error");
    return;
  }

  const btn = document.getElementById("repair-transfer-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Transferring…";
  }

  try {
    await repairRequest("/inventory/transfer-main-to-repair", {
      method: "POST",
      body: JSON.stringify({ sourceStockId, quantity, note }),
    });
    showNotification("Stock transferred to repair inventory", "success");
    closeRepairStockTransferModal();
  } catch (err) {
    showNotification(err.message || "Transfer failed", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Transfer";
    }
  }
}

function buildInvoiceRow(lineNo, item, readOnly = false) {
  const qty = Math.max(1, Number(item.quantity || 1));
  return `<tr data-line="${lineNo}">
    <td class="px-3 py-2 text-gray-500">${lineNo}</td>
    <td class="px-3 py-2 relative">
      <input type="text" class="invoice-item-search w-full border border-gray-300 rounded px-2 py-1 text-sm"
        value="${escapeHtml(item.name || "")}"
        placeholder="Search product or type name..."
        autocomplete="off" ${readOnly ? "readonly" : ""}
        oninput="${readOnly ? "" : "searchInvoiceItemInput(this)"}"
        onblur="setTimeout(() => { const r = this.closest('td')?.querySelector('.invoice-item-results'); if(r) r.classList.add('hidden'); }, 200)" />
      <div class="invoice-item-results absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto hidden z-50"></div>
      <input type="hidden" class="invoice-stock-id-input" value="${escapeHtml(
        item.stockId || ""
      )}" />
    </td>
    <td class="px-3 py-2">
      <div class="flex items-center gap-1">
        <input type="number" class="invoice-cost-input w-20 border border-gray-300 rounded px-2 py-1 text-sm" ${
          readOnly ? "readonly" : ""
        } value="${Number(item.cost || 0)}" min="0" oninput="recalcInvoiceTotals()" />
        <input type="number" class="invoice-qty-input w-14 border border-gray-300 rounded px-2 py-1 text-sm" ${
          readOnly ? "readonly" : ""
        } value="${qty}" min="1" oninput="recalcInvoiceTotals()" />
      </div>
    </td>
    <td class="px-3 py-2"><input type="number" class="invoice-price-input w-24 rounded px-2 py-1 text-sm" style="border:2px solid #16a34a" ${
      readOnly ? "readonly" : ""
    } value="${Number(item.price || 0)}" min="0" oninput="recalcInvoiceTotals()" /></td>
    <td class="px-3 py-2 text-right">${
      readOnly
        ? ""
        : `<button type="button" onclick="removeInvoiceRow(${lineNo})" class="text-red-500 hover:text-red-700"><i data-feather="trash" class="w-4 h-4"></i></button>`
    }</td>
  </tr>`;
}

function addRepairInvoiceRow() {
  const balance = Number(
    currentRepairInvoiceData?.paymentSummary?.balance || 0
  );
  if (balance <= 0.01) {
    showNotification(
      "Repair invoice cannot be edited after full payment",
      "warning"
    );
    return;
  }

  const tbody = document.getElementById("repair-invoice-items-body");
  if (!tbody) return;
  if (
    tbody.children.length === 1 &&
    tbody.children[0].querySelector("td[colspan]")
  )
    tbody.innerHTML = "";
  const lineNo = tbody.children.length + 1;
  tbody.insertAdjacentHTML(
    "beforeend",
    buildInvoiceRow(lineNo, { name: "", cost: 0, price: 0 })
  );
  recalcInvoiceTotals();
  if (typeof feather !== "undefined") setTimeout(() => feather.replace(), 30);
}

function removeInvoiceRow(lineNo) {
  const balance = Number(
    currentRepairInvoiceData?.paymentSummary?.balance || 0
  );
  if (balance <= 0.01) {
    showNotification(
      "Repair invoice cannot be edited after full payment",
      "warning"
    );
    return;
  }

  const tbody = document.getElementById("repair-invoice-items-body");
  if (!tbody) return;
  const row = Array.from(tbody.children).find((r) => r.dataset.line == lineNo);
  if (row) row.remove();
  Array.from(tbody.children).forEach((r, idx) => {
    r.dataset.line = idx + 1;
    const firstCell = r.querySelector("td:first-child");
    if (firstCell && !firstCell.querySelector("input"))
      firstCell.textContent = idx + 1;
  });
  if (tbody.children.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-3 py-4 text-center text-gray-400">No items yet — click Add Item</td></tr>';
  }
  recalcInvoiceTotals();
}

function recalcInvoiceTotals() {
  const tbody = document.getElementById("repair-invoice-items-body");
  let totalCost = 0,
    totalPrice = 0;
  if (tbody) {
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      const cost =
        parseFloat(row.querySelector(".invoice-cost-input")?.value) || 0;
      const price =
        parseFloat(row.querySelector(".invoice-price-input")?.value) || 0;
      const qty = Math.max(
        1,
        parseInt(row.querySelector(".invoice-qty-input")?.value || "1")
      );
      totalCost += cost * qty;
      totalPrice += price * qty;
    });
  }
  const costEl = document.getElementById("invoice-total-cost");
  const priceEl = document.getElementById("invoice-total-price");
  if (costEl) costEl.textContent = totalCost.toLocaleString();
  if (priceEl) priceEl.textContent = totalPrice.toLocaleString();
  const summary = document.getElementById("repair-invoice-totals");
  if (summary)
    summary.textContent = `Totals: Cost Rs. ${totalCost.toLocaleString()} | Pricing Rs. ${totalPrice.toLocaleString()}`;

  const paymentAmountEl = document.getElementById("repair-payment-amount");
  if (!paymentAmountEl || paymentAmountEl.dataset.auto !== "1") return;

  const balance = Number(
    currentRepairInvoiceData?.paymentSummary?.balance || 0
  );
  paymentAmountEl.value = Math.max(0, balance).toFixed(2);
}

async function handleUpdateRepairInvoice() {
  if (!invoiceRepairId) return;

  const balance = Number(
    currentRepairInvoiceData?.paymentSummary?.balance || 0
  );
  if (balance <= 0.01) {
    showNotification(
      "Repair invoice cannot be edited after full payment",
      "warning"
    );
    return;
  }

  const tbody = document.getElementById("repair-invoice-items-body");
  const items = [];
  if (tbody) {
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      const name = row.querySelector(".invoice-item-search")?.value.trim();
      if (!name) return;
      const cost =
        parseFloat(row.querySelector(".invoice-cost-input")?.value) || 0;
      const price =
        parseFloat(row.querySelector(".invoice-price-input")?.value) || 0;
      const quantity = Math.max(
        1,
        parseInt(row.querySelector(".invoice-qty-input")?.value || "1")
      );
      const stockId =
        row.querySelector(".invoice-stock-id-input")?.value || null;
      items.push({ name, cost, price, quantity, stockId });
    });
  }
  const btn = document.getElementById("repair-invoice-save-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }
  try {
    const updated = await repairRequest(`/repairs/${invoiceRepairId}/items`, {
      method: "PUT",
      body: JSON.stringify({ items }),
    });
    currentRepairInvoiceData = updated;
    showNotification("Invoice items saved successfully", "success");
    renderRepairInvoice(updated);
    await loadRepairsData();
  } catch (err) {
    showNotification(err.message || "Failed to save items", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Save Items";
    }
  }
}

function repairAckMark(selected, key) {
  return (selected || []).includes(key) ? "[x]" : "[ ]";
}

function repairAckYesNo(value) {
  if (value === true) return "YES [x] &nbsp; NO [ ]";
  if (value === false) return "YES [ ] &nbsp; NO [x]";
  return "YES [ ] &nbsp; NO [ ]";
}

function repairAckGridHtml(items, selected) {
  return items
    .map(
      (item) =>
        `<span style="display:inline-block;min-width:32%;margin:2px 0;font-size:11px;">${repairAckMark(
          selected,
          item
        )} ${escapeHtml(item)}</span>`
    )
    .join("");
}

async function printRepairAcknowledgementById(id) {
  try {
    const repair = await repairRequest(`/repairs/${id}`);
    printRepairAcknowledgement(repair);
  } catch (err) {
    showNotification("Failed to load repair for print", "error");
  }
}

function printRepairAcknowledgement(repair) {
  if (!repair) return;
  const received = repair.receivedAt ? new Date(repair.receivedAt) : new Date();
  const receivedDate = received.toLocaleDateString("en-GB");
  const receivedTime = received.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const purchaseDate = repair.purchaseDate
    ? new Date(repair.purchaseDate).toLocaleDateString("en-GB")
    : "";
  const deliveryDate = repair.approxDeliveryDate
    ? new Date(repair.approxDeliveryDate).toLocaleDateString("en-GB")
    : "";
  const make = repair.deviceMake || "";
  const model =
    make &&
    String(repair.deviceName || "")
      .toLowerCase()
      .startsWith(make.toLowerCase())
      ? String(repair.deviceName).slice(make.length).trim()
      : repair.deviceName || "";
  const faults = Array.isArray(repair.faultCategories)
    ? repair.faultCategories
    : [];
  const conditions = Array.isArray(repair.physicalConditions)
    ? repair.physicalConditions
    : [];
  const accessories = Array.isArray(repair.accessoriesReceived)
    ? repair.accessoriesReceived
    : [];
  const estimateAmount =
    repair.estimatedCost != null
      ? `Rs. ${Number(repair.estimatedCost).toLocaleString()}`
      : "";

  const htmlContent = `
    <html><head><title>Repair Acknowledgement — ${escapeHtml(
      repair.repairNumber || ""
    )}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:16px;font-size:12px;color:#111;}
      .sheet{border:2px solid #111;padding:12px;}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #111;padding-bottom:8px;margin-bottom:8px;}
      .shop h1{margin:0;font-size:20px;letter-spacing:1px;}
      .shop p{margin:2px 0;font-size:11px;}
      .job{font-size:14px;font-weight:bold;border:1px solid #111;padding:6px 10px;}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;}
      .row{margin:3px 0;}
      .section{border-top:1px solid #111;margin-top:8px;padding-top:6px;}
      .section h3{margin:0 0 6px;font-size:12px;text-transform:uppercase;}
      .terms{font-size:10px;line-height:1.35;}
      .signs{display:flex;justify-content:space-between;margin-top:28px;}
      .sign{width:45%;text-align:center;}
      .sign-line{border-top:1px solid #111;margin-top:40px;padding-top:4px;font-size:11px;}
      @media print{body{padding:0;}}
    </style></head>
    <body>
    <div class="sheet">
      <div class="header">
        <div class="shop">
          <h1>TM THILINA MOBILE</h1>
          <p>No. 75/5, Athurugiriya Rd, Rukamale, Pannipitiya.</p>
          <p>Tel: 074 175 6567</p>
          <p style="font-weight:bold;margin-top:6px;">REPAIR ACKNOWLEDGEMENT FORM</p>
        </div>
        <div class="job">j.No: ${escapeHtml(repair.repairNumber || "")}</div>
      </div>
      <div class="grid2">
        <div class="row"><strong>Customer Name:</strong> ${escapeHtml(
          repair.customer?.name || ""
        )}</div>
        <div class="row"><strong>Date:</strong> ${receivedDate} &nbsp; <strong>Time:</strong> ${receivedTime}</div>
        <div class="row"><strong>Address:</strong> ${escapeHtml(
          repair.customer?.address || ""
        )}</div>
        <div class="row"><strong>Make:</strong> ${escapeHtml(
          make
        )} &nbsp; <strong>Model:</strong> ${escapeHtml(model)}</div>
        <div class="row"><strong>Contact No:</strong> ${escapeHtml(
          repair.customer?.mobileNumber || ""
        )}</div>
        <div class="row"><strong>IMEI No:</strong> ${escapeHtml(
          repair.imei || ""
        )} &nbsp; <strong>Serial No:</strong> ${escapeHtml(
          repair.serialNumber || ""
        )}</div>
        <div class="row"><strong>Company Warranty:</strong> ${repairAckYesNo(
          repair.companyWarranty
        )}</div>
        <div class="row"><strong>Date of Purchased:</strong> ${escapeHtml(
          purchaseDate
        )}</div>
      </div>
      <div class="section">
        <h3>Fault Diagnosis</h3>
        <div class="row"><strong>PHONE POWER ON:</strong> ${repairAckYesNo(
          repair.phonePowerOn
        )}</div>
        <div>${repairAckGridHtml(REPAIR_FAULT_CATEGORIES, faults)}</div>
        <div class="row"><strong>Fault Description:</strong> ${escapeHtml(
          repair.issue || ""
        )}</div>
      </div>
      <div class="section">
        <h3>Physical Condition</h3>
        <div>${repairAckGridHtml(REPAIR_PHYSICAL_CONDITIONS, conditions)}</div>
        <div class="row"><strong>Other:</strong> ${escapeHtml(
          repair.physicalConditionOther || ""
        )}</div>
      </div>
      <div class="section">
        <h3>Items Taken With Phone</h3>
        <div>${repairAckGridHtml(REPAIR_ACCESSORIES, accessories)}</div>
        <div class="row"><strong>Other:</strong> ${escapeHtml(
          repair.accessoriesOther || ""
        )}</div>
        <div class="row"><strong>Remarks:</strong> ${escapeHtml(
          repair.notes || ""
        )}</div>
      </div>
      <div class="section">
        <h3>Estimate &amp; Delivery</h3>
        <div class="row"><strong>Prior estimate given?</strong> ${repairAckYesNo(
          repair.priorEstimateGiven
        )} &nbsp; <strong>Amount:</strong> ${escapeHtml(estimateAmount)}</div>
        <div class="row"><strong>Need to know the repair charge before work done?</strong> ${repairAckYesNo(
          repair.notifyChargeBeforeWork
        )}</div>
        <div class="row"><strong>Approximately Delivery Date:</strong> ${escapeHtml(
          deliveryDate
        )}</div>
      </div>
      <div class="section terms">
        <p><strong>IMPORTANT</strong></p>
        <p>Equipment can be collected only with this original form. We are not responsible for any equipment not collected within 30 days.</p>
        <p><strong>No Warranty for DISPLAY / TOUCH PAD / RIBBON / MIC / SPEAKER / RINGER.</strong></p>
        <p>උපකරණය භාරගත හැක්කේ මෙම මුල් පෝරමය සමඟ පමණි. දින 30ක් ඇතුළත භාර නොගත් උපකරණ සම්බන්ධයෙන් අප වගකීමක් නොදරමු.</p>
        <p>DISPLAY / TOUCH PAD / RIBBON / MIC / SPEAKER / RINGER සඳහා වගකීමක් නොමැත.</p>
      </div>
      <div class="signs">
        <div class="sign">
          <div class="sign-line">Accepted By${
            repair.acceptedBy
              ? ` — ${escapeHtml(repair.acceptedBy)}`
              : ""
          }</div>
        </div>
        <div class="sign">
          <div class="sign-line">Customer</div>
        </div>
      </div>
    </div>
    </body></html>
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

function printRepairInvoice() {
  const repair =
    currentRepairInvoiceData ||
    repairsData.find((r) => r.id === invoiceRepairId);
  if (!repair) return;

  // Collect current items from the invoice form
  const tbody = document.getElementById("repair-invoice-items-body");
  const items = [];
  if (tbody) {
    Array.from(tbody.querySelectorAll("tr")).forEach((row) => {
      const name = row.querySelector(".invoice-item-search")?.value.trim();
      if (!name) return;
      const price =
        parseFloat(row.querySelector(".invoice-price-input")?.value) || 0;
      const quantity = Math.max(
        1,
        parseInt(row.querySelector(".invoice-qty-input")?.value || "1")
      );
      items.push({ name, price, quantity });
    });
  }

  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
  const rowsHtml = items
    .map(
      (it, i) =>
        `<tr><td>${i + 1}</td><td>${escapeHtml(it.name)} (x${
          it.quantity
        })</td><td style="text-align:right">Rs. ${(
          it.price * it.quantity
        ).toLocaleString()}</td></tr>`
    )
    .join("");

  const htmlContent = `
    <html><head><title>Thilina Mobile — Repair Invoice</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px;}
    h1{font-size:18px;margin:0 0 4px;}
    .shop-info{font-size:11px;color:#333;margin-bottom:12px;}
    table{width:100%;border-collapse:collapse;margin-top:10px;}
    th,td{border:1px solid #ccc;padding:6px;text-align:left;}
    th{background:#f0f0f0;}</style></head>
    <body>
    <h1>Thilina Mobile — Repair Invoice</h1>
    <p class="shop-info">No. 75/5, Athurugiriya Rd, Rukamale, pannipitiya.<br>Tel: 074 175 6567</p>
    <p style="margin:0 0 12px;font-size:12px;"><strong>Job No:</strong> ${escapeHtml(
      repair.repairNumber
    )}</p>
    <table>
      <tr><th>Customer</th><td>${escapeHtml(
        repair.customer?.name || "—"
      )}</td></tr>
      <tr><th>Mobile</th><td>${escapeHtml(
        repair.customer?.mobileNumber || "—"
      )}</td></tr>
      <tr><th>Device</th><td>${escapeHtml(repair.deviceName)}</td></tr>
      <tr><th>IMEI</th><td>${escapeHtml(repair.imei || "—")}</td></tr>
      <tr><th>Issue</th><td>${escapeHtml(repair.issue)}</td></tr>
      <tr><th>Status</th><td>${escapeHtml(repair.status)}</td></tr>
      <tr><th>Technician</th><td>${escapeHtml(
        repair.technician || "—"
      )}</td></tr>
      <tr><th>Received</th><td>${
        repair.receivedAt
          ? new Date(repair.receivedAt).toLocaleDateString()
          : "—"
      }</td></tr>
    </table>
    <table style="margin-top:16px">
      <thead><tr><th>#</th><th>Item / Service</th><th style="text-align:right">Price (Rs.)</th></tr></thead>
      <tbody>${
        rowsHtml ||
        '<tr><td colspan="3" style="text-align:center;color:#999">No items</td></tr>'
      }</tbody>
      <tfoot><tr><td colspan="2" style="font-weight:bold">Total</td><td style="font-weight:bold;text-align:right">Rs. ${total.toLocaleString()}</td></tr></tfoot>
    </table>
    </body></html>`;

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

// --- PDF / XL Download ---
function getRepairOrdersExportData() {
  return filteredRepairs.length > 0 ? filteredRepairs : repairsData;
}

function getRepairOrdersExportFilters() {
  const filters = [];
  const search = document.getElementById("repairSearchInput")?.value?.trim();
  const statusEl = document.getElementById("repairStatusFilter");
  const status = statusEl?.value || "";
  if (search) filters.push({ label: "Search", value: search });
  if (status) {
    filters.push({
      label: "Status",
      value: statusEl.options[statusEl.selectedIndex]?.textContent?.trim() || status,
    });
  }
  return filters;
}

function mapRepairOrderExportRow(r) {
  return [
    r.repairNumber,
    r.deviceName,
    r.customer?.name || "—",
    r.issue.length > 40 ? r.issue.substring(0, 40) + "…" : r.issue,
    r.status,
    r.technician || "—",
    r.estimatedCost !== null
      ? `Rs. ${r.estimatedCost.toLocaleString()}`
      : "—",
    r.actualCost !== null ? `Rs. ${r.actualCost.toLocaleString()}` : "—",
    r.receivedAt ? new Date(r.receivedAt).toLocaleDateString() : "—",
  ];
}

function downloadRepairOrdersPDF() {
  try {
    const data = getRepairOrdersExportData();
    const totalRevenue = data.reduce((s, r) => s + (r.actualCost || 0), 0);
    const ok = exportPdfWithTable({
      title: "Repair Orders Report",
      filters: getRepairOrdersExportFilters(),
      head: [
        "ID",
        "Device",
        "Customer",
        "Issue",
        "Status",
        "Technician",
        "Est. Cost",
        "Actual Cost",
        "Received",
      ],
      body: data.map(mapRepairOrderExportRow),
      fileName: `repair-orders-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Repairs: ${data.length}  |  Total Actual Revenue: Rs. ${totalRevenue.toLocaleString()}`,
      emptyMessage: "No repair orders to export",
    });
    if (ok) showNotification("Repair orders PDF downloaded!", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Failed to generate PDF", "error");
  }
}

async function downloadRepairOrdersXL() {
  try {
    const data = getRepairOrdersExportData();
    const ok = await exportXlsxWithTable({
      title: "Repair Orders Report",
      filters: getRepairOrdersExportFilters(),
      headers: [
        "ID",
        "Device",
        "Customer",
        "Issue",
        "Status",
        "Technician",
        "Est. Cost",
        "Actual Cost",
        "Received",
      ],
      rows: data.map((r) => [
        r.repairNumber,
        r.deviceName,
        r.customer?.name || "",
        r.issue,
        r.status,
        r.technician || "",
        r.estimatedCost !== null ? r.estimatedCost : "",
        r.actualCost !== null ? r.actualCost : "",
        r.receivedAt ? new Date(r.receivedAt).toISOString().slice(0, 10) : "",
      ]),
      sheetName: "Repair Orders",
      fileName: `repair-orders-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No repair orders to export",
    });
    if (ok) showNotification("Repair orders XL downloaded!", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Failed to generate XL", "error");
  }
}

window.generateRepairsContent = generateRepairsContent;
window.initializeRepairsModule = initializeRepairsModule;
window.initializeRepairsPage = initializeRepairsPage;

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateRepairsContent,
    initializeRepairsModule,
    initializeRepairsPage,
  };
}
