// =====================================================================
// INVENTORY STOCK MODULE
// =====================================================================

window.API_BASE_URL = window.API_BASE_URL || "http://localhost:3000/api";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function invGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

async function invMakeRequest(url, options = {}) {
  const token = invGetAuthToken();
  if (!token) throw new Error("Authentication required. Please login first.");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    if (response.status === 401)
      throw new Error("Authentication failed. Please login again.");
    if (response.status === 403)
      throw new Error("Access denied. Insufficient permissions.");
    if (response.status === 404) throw new Error("Resource not found.");
    throw new Error(
      errData.message || `HTTP error! status: ${response.status}`
    );
  }

  return await response.json();
}

// ─── Module state ─────────────────────────────────────────────────────────────

let invStockData = [];
let invBatchData = [];
let invMovementsData = [];
let invLowStockData = [];
let invSelectedStock = null;
let invCurrentStockType = "Main";

function invEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plain-text product title: Brand · Model · Product – Variant */
function invProductTitleText(item) {
  const brand = item?.brand?.name ? String(item.brand.name).trim() : "";
  const model = item?.modelNumber ? String(item.modelNumber).trim() : "";
  const name = item?.productName ? String(item.productName).trim() : "";
  const variant = item?.variantName ? String(item.variantName).trim() : "";

  const parts = [];
  if (brand) parts.push(brand);
  if (model && model.toLowerCase() !== brand.toLowerCase()) parts.push(model);
  if (
    name &&
    name.toLowerCase() !== model.toLowerCase() &&
    name.toLowerCase() !== brand.toLowerCase()
  ) {
    parts.push(name);
  }
  if (!parts.length && name) parts.push(name);

  let text = parts.join(" · ");
  if (variant && variant.toLowerCase() !== name.toLowerCase()) {
    text += ` – ${variant}`;
  }
  return text || "—";
}

/** HTML product title with brand/model before product name */
function invProductTitleHtml(item) {
  const brand = item?.brand?.name ? invEscapeHtml(String(item.brand.name).trim()) : "";
  const model = item?.modelNumber
    ? invEscapeHtml(String(item.modelNumber).trim())
    : "";
  const name = invEscapeHtml(String(item?.productName || "").trim());
  const variant = item?.variantName
    ? invEscapeHtml(String(item.variantName).trim())
    : "";

  const leadBits = [brand, model].filter(Boolean);
  const leadHtml = leadBits.length
    ? `<span class="text-gray-500 font-semibold">${leadBits.join(
        " · "
      )}</span><span class="text-gray-300 mx-1">·</span>`
    : "";

  // Avoid repeating model/product when they are identical
  const showName =
    name &&
    name.toLowerCase() !== (model || "").toLowerCase() &&
    name.toLowerCase() !== (brand || "").toLowerCase();

  const nameHtml = showName
    ? `<span class="text-gray-900">${name}</span>`
    : !leadBits.length
    ? `<span class="text-gray-900">${name || "—"}</span>`
    : "";

  const variantHtml =
    variant && variant.toLowerCase() !== name.toLowerCase()
      ? `<span class="text-gray-400 font-normal"> – ${variant}</span>`
      : "";

  return `${leadHtml}${nameHtml}${variantHtml}`;
}

const INV_STATUS_BADGE = {
  "In Stock": "bg-green-100 text-green-800",
  "Low Stock": "bg-yellow-100 text-yellow-800",
  "Out of Stock": "bg-red-100 text-red-800",
};

const INV_PRIORITY_BADGE = {
  Critical: "bg-red-100 text-red-800",
  Low: "bg-orange-100 text-orange-800",
  Watch: "bg-yellow-100 text-yellow-800",
};

const INV_MOVEMENT_BADGE = {
  IN: "bg-green-100 text-green-800",
  OUT: "bg-red-100 text-red-800",
  ADJUSTMENT: "bg-blue-100 text-blue-800",
  SALE: "bg-indigo-100 text-indigo-800",
  RETURN: "bg-teal-100 text-teal-800",
};

// ─── Module entry points ──────────────────────────────────────────────────────

function initializeInventoryStockModule() {
  // Prefer initializeInventoryStockPage after HTML inject (see main.js loadPage).
  initializeInventoryStockPage();
}

function generateInventoryStockContent() {
  return `
    <div class="content-fade-in p-6">
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex flex-wrap justify-between items-center gap-3">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-gray-900">Inventory</h1>
            <p class="text-gray-600 mt-1">Track stock levels, batch pricing, and inventory movements</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="inline-flex h-9 rounded-lg border border-gray-300 overflow-hidden">
              <button id="inventory-stock-type-main" onclick="setInventoryStockType('Main')"
                class="px-4 h-full text-sm font-medium bg-blue-600 text-white">Main</button>
              <button id="inventory-stock-type-repair" onclick="setInventoryStockType('Repair')"
                class="px-4 h-full text-sm font-medium bg-white text-gray-700 border-l border-gray-300">Repair</button>
            </div>
            <button onclick="openStockAdjustmentModal()" class="btn-primary h-9 px-4 text-sm text-white rounded-lg inline-flex items-center">
              <i data-feather="edit" class="w-4 h-4 mr-2"></i>
              Stock Adjustment
            </button>
          </div>
        </div>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Total Stock Value</p>
              <p class="text-3xl font-bold text-blue-600" id="total-stock-value">—</p>
              <p class="text-sm text-gray-500 mt-1">Current inventory</p>
            </div>
            <div class="bg-blue-100 p-3 rounded-full">
              <i data-feather="dollar-sign" class="w-6 h-6 text-blue-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Low Stock Items</p>
              <p class="text-3xl font-bold text-red-600" id="low-stock-items">—</p>
              <p class="text-sm text-gray-500 mt-1">Need reorder</p>
            </div>
            <div class="bg-red-100 p-3 rounded-full">
              <i data-feather="alert-triangle" class="w-6 h-6 text-red-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Out of Stock</p>
              <p class="text-3xl font-bold text-orange-600" id="out-of-stock">—</p>
              <p class="text-sm text-gray-500 mt-1">Zero quantity</p>
            </div>
            <div class="bg-orange-100 p-3 rounded-full">
              <i data-feather="x-circle" class="w-6 h-6 text-orange-600"></i>
            </div>
          </div>
        </div>
        <div class="card p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm">Stock Batches</p>
              <p class="text-3xl font-bold text-green-600" id="total-batches">—</p>
              <p class="text-sm text-gray-500 mt-1">Active batches</p>
            </div>
            <div class="bg-green-100 p-3 rounded-full">
              <i data-feather="layers" class="w-6 h-6 text-green-600"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Management Tabs -->
      <div class="card mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button onclick="switchStockTab('stock')" class="tab-button active py-4 px-1 border-b-2 font-medium text-sm" id="stock-tab">
              Stock
            </button>
            <button onclick="switchStockTab('stock-batch')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="stock-batch-tab">
              Stock Batch
            </button>
            <button onclick="switchStockTab('stock-movements')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="stock-movements-tab">
              Stock Movements
            </button>
            <button onclick="switchStockTab('low-stock')" class="tab-button py-4 px-1 border-b-2 font-medium text-sm" id="low-stock-tab">
              Low Stock Alert
            </button>
          </nav>
        </div>

        <!-- ── Stock Tab ── -->
        <div id="stock-content" class="tab-content p-6">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <input type="text" id="stock-search" placeholder="Search products…"
                class="min-w-[200px] flex-1 basis-[220px] max-w-md h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                oninput="debounceLoadStock()" />
              <select id="stock-brand-filter"
                class="h-9 min-w-[140px] px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onchange="loadStockLevelsData()">
                <option value="">All Brands</option>
              </select>
              <select id="stock-category-filter"
                class="h-9 min-w-[150px] px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onchange="loadStockLevelsData()">
                <option value="">All Categories</option>
              </select>
              <select id="stock-status-filter"
                class="h-9 min-w-[130px] px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onchange="loadStockLevelsData()">
                <option value="">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              <button type="button" onclick="clearStockListFilters()" class="h-9 px-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              <button onclick="downloadStockLevelsPDF()" class="btn-secondary h-9 px-3 rounded-lg inline-flex items-center text-sm ml-auto">
                <i data-feather="download" class="w-4 h-4 mr-1.5"></i>
                PDF
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[220px]">Product / Variant</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Sell</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Batches</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="stock-table-body" class="bg-white divide-y divide-gray-200">
                  <tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── Stock Batch Tab ── -->
        <div id="stock-batch-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <div class="flex space-x-4">
                <input type="text" id="batch-search" placeholder="Search by batch ID, product or barcode..."
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  oninput="debounceLoadBatches()" />
              </div>
              <div class="flex space-x-2">
                <button onclick="downloadStockBatchesPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales REP</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="stock-batches-table-body" class="bg-white divide-y divide-gray-200">
                  <tr><td colspan="10" class="px-6 py-4 text-center text-gray-400">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── Stock Movements Tab ── -->
        <div id="stock-movements-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex w-full flex-wrap items-center gap-3">
              <div class="flex flex-wrap gap-3 items-center justify-start flex-1 min-w-0">
              <input type="date" id="movement-date-from" class="px-4 py-2 border border-gray-300 rounded-lg"
                onchange="loadStockMovementsData()" />
              <input type="date" id="movement-date-to" class="px-4 py-2 border border-gray-300 rounded-lg"
                onchange="loadStockMovementsData()" />
              <select id="movement-type-filter" class="px-4 py-2 border border-gray-300 rounded-lg"
                onchange="loadStockMovementsData()">
                <option value="">All Types</option>
                <option value="IN">Stock In</option>
                <option value="OUT">Stock Out</option>
                <option value="ADJUSTMENT">Adjustment</option>
                <option value="SALE">Sale</option>
                <option value="RETURN">Return</option>
              </select>
              <button type="button" onclick="clearStockMovementsFilters()" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Clear</button>
              </div>
              <div class="shrink-0 ml-auto flex gap-2">
              <button onclick="downloadStockMovementsPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                <i data-feather="download" class="w-4 h-4 mr-2"></i>
                PDF
              </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Before</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">After</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                  </tr>
                </thead>
                <tbody id="stock-movements-table-body" class="bg-white divide-y divide-gray-200">
                  <tr><td colspan="9" class="px-6 py-4 text-center text-gray-400">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ── Low Stock Alert Tab ── -->
        <div id="low-stock-content" class="tab-content p-6 hidden">
          <div class="space-y-6">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
              <div class="flex space-x-2">
                <button onclick="downloadLowStockPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i>
                  PDF
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-center">
                  <i data-feather="alert-triangle" class="w-5 h-5 text-red-500 mr-2"></i>
                  <h4 class="text-red-800 font-medium">Critical (0–5 units)</h4>
                </div>
                <p class="text-2xl font-bold text-red-600 mt-2" id="critical-count">—</p>
              </div>
              <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div class="flex items-center">
                  <i data-feather="alert-circle" class="w-5 h-5 text-orange-500 mr-2"></i>
                  <h4 class="text-orange-800 font-medium">Low (6–15 units)</h4>
                </div>
                <p class="text-2xl font-bold text-orange-600 mt-2" id="low-count">—</p>
              </div>
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div class="flex items-center">
                  <i data-feather="info" class="w-5 h-5 text-yellow-500 mr-2"></i>
                  <h4 class="text-yellow-800 font-medium">Watch (16–25 units)</h4>
                </div>
                <p class="text-2xl font-bold text-yellow-600 mt-2" id="watch-count">—</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barcode</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Qty</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sale</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody id="low-stock-table-body" class="bg-white divide-y divide-gray-200">
                  <tr><td colspan="8" class="px-6 py-4 text-center text-gray-400">Loading…</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Stock Adjustment Modal ── -->
    <div id="stock-adjustment-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Stock Adjustment</h2>
          <button onclick="closeStockAdjustmentModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="stock-adjustment-form" class="p-6" onsubmit="handleStockAdjustment(event)">
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Stock Batch *</label>
              <div class="relative">
                <input type="text" id="adjustment-product-search"
                  placeholder="Search by product name, variant or barcode…"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  oninput="searchAdjustmentProducts()" />
                <div id="adjustment-product-results"
                  class="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg hidden max-h-64 overflow-y-auto">
                </div>
              </div>
              <div id="selected-adjustment-info" class="mt-3 p-3 bg-blue-50 rounded-lg hidden">
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-medium text-gray-900" id="selected-product-name"></h4>
                    <p class="text-sm text-gray-600" id="selected-batch-info"></p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-gray-600">Current Stock: <span id="selected-current-stock" class="font-medium"></span></p>
                    <p class="text-sm text-gray-600">Cost Price: Rs. <span id="selected-cost-price" class="font-medium"></span></p>
                  </div>
                </div>
              </div>
              <input type="hidden" id="selected-batch-id" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Adjustment Type *</label>
                <select id="adjustment-type" required
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Type</option>
                  <option value="increase">Increase (+)</option>
                  <option value="decrease">Decrease (−)</option>
                  <option value="set">Set to Specific Amount</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" id="adjustment-quantity" required min="0"
                  class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
              <select id="adjustment-reason" required
                class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option value="">Select Reason</option>
                <option value="damage">Damaged Items</option>
                <option value="theft">Theft / Loss</option>
                <option value="return">Customer Return</option>
                <option value="count">Physical Count Adjustment</option>
                <option value="supplier-return">Return to Sales REP</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea id="adjustment-notes" rows="3"
                class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Additional details about the adjustment…"></textarea>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-6">
            <button type="button" onclick="closeStockAdjustmentModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" id="adjustment-submit-btn" class="btn-primary px-4 py-2 text-white">Apply Adjustment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Update Min Level Modal ── -->
    <div id="min-level-modal" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center hidden z-50">
      <div class="modal-content bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="flex justify-between items-center p-6 border-b">
          <h2 class="text-xl font-semibold">Update Minimum Stock Level</h2>
          <button onclick="closeMinLevelModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form id="min-level-form" class="p-6" onsubmit="handleMinLevelUpdate(event)">
          <input type="hidden" id="min-level-variant-id" />
          <div class="mb-4">
            <p class="text-sm text-gray-500">Product</p>
            <p class="text-sm font-medium text-gray-900" id="min-level-product-name"></p>
          </div>
          <div class="mb-4">
            <p class="text-sm text-gray-500">Current Stock</p>
            <p class="text-sm font-medium text-gray-900" id="min-level-current-stock"></p>
          </div>
          <div class="mb-4">
            <p class="text-sm text-gray-500">Current Minimum Level</p>
            <p class="text-sm font-medium text-gray-900" id="min-level-current-min"></p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Minimum Stock Level *</label>
            <input type="number" id="min-level-value" required min="0"
              class="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="flex justify-end space-x-3 pt-6">
            <button type="button" onclick="closeMinLevelModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-4 py-2 text-white">Update</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ─── Page initialisation ──────────────────────────────────────────────────────

function initializeInventoryStockPage() {
  setInventoryStockType("Main", false);
  loadInventoryStats();
  loadCategoryOptions();
  loadBrandOptions();
  loadStockLevelsData();
  loadStockBatchesData();
  loadStockMovementsData();
  loadLowStockData();

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 100);
}

function getSelectedStockTypeQuery() {
  return String(invCurrentStockType || "Main").toLowerCase();
}

function updateStockTypeToggleUI() {
  const mainBtn = document.getElementById("inventory-stock-type-main");
  const repairBtn = document.getElementById("inventory-stock-type-repair");

  const setActive = (el, active) => {
    if (!el) return;
    el.classList.toggle("bg-blue-600", active);
    el.classList.toggle("text-white", active);
    el.classList.toggle("bg-white", !active);
    el.classList.toggle("text-gray-700", !active);
  };

  setActive(mainBtn, invCurrentStockType === "Main");
  setActive(repairBtn, invCurrentStockType === "Repair");
}

function setInventoryStockType(type, reload = true) {
  const normalized = String(type || "Main").toLowerCase();
  invCurrentStockType = normalized === "repair" ? "Repair" : "Main";
  updateStockTypeToggleUI();

  if (reload) {
    loadInventoryStats();
    loadStockLevelsData();
    loadStockBatchesData();
    loadStockMovementsData();
    loadLowStockData();
  }
}

// ─── Statistics ───────────────────────────────────────────────────────────────

async function loadInventoryStats() {
  try {
    const params = new URLSearchParams({
      stockType: getSelectedStockTypeQuery(),
    });
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/stats?${params}`
    );
    if (res.success) {
      const { totalStockValue, lowStockItems, outOfStock, totalBatches } =
        res.data;

      const fmtValue = (v) => {
        if (v >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}M`;
        if (v >= 1_000) return `Rs. ${(v / 1_000).toFixed(0)}K`;
        return `Rs. ${v.toLocaleString()}`;
      };

      const el = (id) => document.getElementById(id);
      if (el("total-stock-value"))
        el("total-stock-value").textContent = fmtValue(totalStockValue);
      if (el("low-stock-items"))
        el("low-stock-items").textContent = lowStockItems;
      if (el("out-of-stock")) el("out-of-stock").textContent = outOfStock;
      if (el("total-batches")) el("total-batches").textContent = totalBatches;
    }
  } catch (error) {
    console.error("Error loading inventory stats:", error);
  }
}

// ─── Category dropdown ────────────────────────────────────────────────────────

async function loadCategoryOptions() {
  try {
    const res = await invMakeRequest(`${window.API_BASE_URL}/category`);
    if (res.success) {
      const select = document.getElementById("stock-category-filter");
      if (!select) return;
      const opts = (res.data || [])
        .filter((c) => c && c.isActive !== false)
        .map(
          (c) =>
            `<option value="${c.id}">${invEscapeHtml(c.name || "")}</option>`
        )
        .join("");
      select.innerHTML = `<option value="">All Categories</option>${opts}`;
    }
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

// ─── Brand dropdown ───────────────────────────────────────────────────────────

async function loadBrandOptions() {
  try {
    const res = await invMakeRequest(`${window.API_BASE_URL}/brands`);
    if (res.success) {
      const select = document.getElementById("stock-brand-filter");
      if (!select) return;
      const opts = (res.data || [])
        .filter((b) => b && b.isActive !== false)
        .map(
          (b) =>
            `<option value="${b.id}">${invEscapeHtml(b.name || "")}</option>`
        )
        .join("");
      select.innerHTML = `<option value="">All Brands</option>${opts}`;
    }
  } catch (err) {
    console.error("Error loading brands:", err);
  }
}

// ─── Variant dropdown (batch filter) ─────────────────────────────────────────

async function loadVariantOptions() {
  try {
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/variants`
    );
    if (res.success) {
      const select = document.getElementById("batch-variant-filter");
      if (!select) return;
      const opts = (res.data || [])
        .map(
          (v) =>
            `<option value="${v.id}">${v.productName}${
              v.variantName ? ` – ${v.variantName}` : ""
            }</option>`
        )
        .join("");
      select.innerHTML = `<option value="">All Products</option>${opts}`;
    }
  } catch (err) {
    console.error("Error loading variants:", err);
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────

function switchStockTab(tab) {
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document.querySelectorAll(".tab-button").forEach((b) => {
    b.classList.remove("active", "border-blue-500", "text-blue-600");
    b.classList.add("border-transparent", "text-gray-500");
  });

  const content = document.getElementById(`${tab}-content`);
  if (content) content.classList.remove("hidden");

  const btn = document.getElementById(`${tab}-tab`);
  if (btn) {
    btn.classList.add("active", "border-blue-500", "text-blue-600");
    btn.classList.remove("border-transparent", "text-gray-500");
  }

  setTimeout(() => {
    if (typeof feather !== "undefined") feather.replace();
  }, 50);
}

// ─── Debounce helpers ─────────────────────────────────────────────────────────

let _stockDebounce = null;
function debounceLoadStock() {
  clearTimeout(_stockDebounce);
  _stockDebounce = setTimeout(loadStockLevelsData, 350);
}

function clearStockListFilters() {
  const s = document.getElementById("stock-search");
  if (s) s.value = "";
  const bf = document.getElementById("stock-brand-filter");
  if (bf) bf.value = "";
  const cf = document.getElementById("stock-category-filter");
  if (cf) cf.value = "";
  const sf = document.getElementById("stock-status-filter");
  if (sf) sf.value = "";
  loadStockLevelsData();
}

function clearStockMovementsFilters() {
  const df = document.getElementById("movement-date-from");
  const dt = document.getElementById("movement-date-to");
  const tf = document.getElementById("movement-type-filter");
  if (df) df.value = "";
  if (dt) dt.value = "";
  if (tf) tf.value = "";
  loadStockMovementsData();
}

let _batchDebounce = null;
function debounceLoadBatches() {
  clearTimeout(_batchDebounce);
  _batchDebounce = setTimeout(loadStockBatchesData, 350);
}

// ─── Stock Levels ─────────────────────────────────────────────────────────────

async function loadStockLevelsData() {
  const tbody = document.getElementById("stock-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-400">Loading stock levels…</td></tr>`;

  try {
    const params = new URLSearchParams();
    const search = document.getElementById("stock-search")?.value || "";
    const brandId = document.getElementById("stock-brand-filter")?.value || "";
    const categoryId =
      document.getElementById("stock-category-filter")?.value || "";
    const statusFilter =
      document.getElementById("stock-status-filter")?.value || "";

    if (search) params.append("search", search);
    if (brandId) params.append("brandId", brandId);
    if (categoryId) params.append("categoryId", categoryId);
    if (statusFilter) params.append("statusFilter", statusFilter);
    params.append("stockType", getSelectedStockTypeQuery());

    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/stock?${params}`
    );

    if (res.success) {
      invStockData = res.data || [];
      renderStockTable(invStockData);
    }
  } catch (error) {
    console.error("Error loading stock levels:", error);
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-red-500">
      Failed to load stock levels: ${error.message}
    </td></tr>`;
    showNotification("Failed to load stock levels: " + error.message, "error");
  }
}

function renderStockTable(data) {
  const tbody = document.getElementById("stock-table-body");
  if (!tbody) return;

  // Only list variants that have batches for the selected stock type
  // (avoids a wall of zero rows for products never received into Main/Repair).
  const rows = (data || []).filter((item) => Number(item.batchCount || 0) > 0);

  if (rows.length === 0) {
    const stockType = invCurrentStockType || "Main";
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">
      No ${invEscapeHtml(stockType)} stock batches found.
      <span class="block text-sm text-gray-400 mt-1">Receive stock via GRN or switch Main/Repair.</span>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((item) => {
      const badgeClass =
        INV_STATUS_BADGE[item.status] || "bg-gray-100 text-gray-800";
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">
            <div class="text-sm font-medium leading-snug">${invProductTitleHtml(
              item
            )}</div>
            <div class="text-xs text-gray-400 mt-0.5">${invEscapeHtml(
              item.category?.name || ""
            )}</div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">${invEscapeHtml(
            item.barcode || "—"
          )}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">${
            item.currentStock
          }</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rs. ${Number(
            item.avgCostPrice || 0
          ).toLocaleString()}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">Rs. ${Number(
            item.avgSellingPrice ?? item.sellingPrice ?? 0
          ).toLocaleString()}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">Rs. ${Number(
            item.stockValue || 0
          ).toLocaleString()}</td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center">${
            item.batchCount
          }</td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
        item.status
      )}</span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
            <button onclick="editStockLevel(${
              item.id
            })" class="text-blue-600 hover:text-blue-900 mr-2 p-1 rounded inline-flex" title="Adjust Stock">
              <i data-feather="edit" class="w-4 h-4"></i>
            </button>
            <button onclick="viewBatches(${
              item.id
            })" class="text-green-600 hover:text-green-900 p-1 rounded inline-flex" title="View Batches">
              <i data-feather="layers" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

// ─── Stock Batches ────────────────────────────────────────────────────────────

async function loadStockBatchesData() {
  const tbody = document.getElementById("stock-batches-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-8 text-center text-gray-400">Loading batches…</td></tr>`;

  try {
    const params = new URLSearchParams();
    const search = document.getElementById("batch-search")?.value || "";

    if (search) params.append("search", search);
    params.append("stockType", getSelectedStockTypeQuery());

    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/batches?${params}`
    );

    if (res.success) {
      invBatchData = res.data || [];
      renderBatchTable(invBatchData);
    }
  } catch (error) {
    console.error("Error loading stock batches:", error);
    tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-4 text-center text-red-500">
      Failed to load batches: ${error.message}
    </td></tr>`;
    showNotification("Failed to load stock batches: " + error.message, "error");
  }
}

function renderBatchTable(data) {
  const tbody = document.getElementById("stock-batches-table-body");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-8 text-center text-gray-500">No stock batches found</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map((batch) => {
      const badgeClass =
        INV_STATUS_BADGE[batch.status] || "bg-gray-100 text-gray-800";
      const date = batch.receivedDate
        ? new Date(batch.receivedDate).toLocaleDateString("en-GB")
        : "—";
      const safeStockId = invEscapeHtml(batch.stockId);
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">${safeStockId}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${invProductTitleHtml(
              batch
            )}</div>
            <div class="text-xs text-gray-400">${invEscapeHtml(
              batch.category?.name || ""
            )}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${invEscapeHtml(
            batch.barcode || "—"
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">${
            batch.quantity
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${batch.buyingPrice.toLocaleString()}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rs. ${batch.sellingPrice.toLocaleString()}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invEscapeHtml(
            batch.supplier || "—"
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
        batch.status
      )}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="editBatch('${safeStockId.replace(
              /'/g,
              "\\'"
            )}')" class="text-blue-600 hover:text-blue-900 p-1 rounded" title="Adjust this batch">
              <i data-feather="edit" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

async function loadStockMovementsData() {
  const tbody = document.getElementById("stock-movements-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-400">Loading movements…</td></tr>`;

  try {
    const params = new URLSearchParams();
    const dateFrom = document.getElementById("movement-date-from")?.value || "";
    const dateTo = document.getElementById("movement-date-to")?.value || "";
    const movementType =
      document.getElementById("movement-type-filter")?.value || "";

    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    if (movementType) params.append("movementType", movementType);
    params.append("stockType", getSelectedStockTypeQuery());

    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/movements?${params}`
    );

    if (res.success) {
      invMovementsData = res.data || [];
      renderMovementsTable(invMovementsData);
    }
  } catch (error) {
    console.error("Error loading stock movements:", error);
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-4 text-center text-red-500">
      Failed to load movements: ${error.message}
    </td></tr>`;
    showNotification(
      "Failed to load stock movements: " + error.message,
      "error"
    );
  }
}

function renderMovementsTable(data) {
  const tbody = document.getElementById("stock-movements-table-body");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No stock movements found</td></tr>`;
    return;
  }

  const typeLabels = {
    IN: "Stock In",
    OUT: "Stock Out",
    ADJUSTMENT: "Adjustment",
    SALE: "Sale",
    RETURN: "Return",
  };

  tbody.innerHTML = data
    .map((m) => {
      const badgeClass =
        INV_MOVEMENT_BADGE[m.movementType] || "bg-gray-100 text-gray-800";
      const label = typeLabels[m.movementType] || m.movementType;
      const date = m.date
        ? new Date(m.date).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";
      const isNegative =
        m.movementType === "OUT" ||
        m.movementType === "SALE" ||
        (m.movementType === "ADJUSTMENT" &&
          Number(m.quantityAfter) < Number(m.quantityBefore));
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${invProductTitleHtml(
              m
            )}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">${invEscapeHtml(
            m.stockId
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
        label
      )}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
            isNegative ? "-" : "+"
          }${m.quantity}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
            m.quantityBefore
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
            m.quantityAfter
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${invEscapeHtml(
            m.reason || "—"
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">${invEscapeHtml(
            m.reference || "—"
          )}</td>
        </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

// ─── Low Stock ────────────────────────────────────────────────────────────────

async function loadLowStockData() {
  const tbody = document.getElementById("low-stock-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-400">Loading low stock alerts…</td></tr>`;

  try {
    const params = new URLSearchParams({
      stockType: getSelectedStockTypeQuery(),
    });
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/low-stock?${params}`
    );

    if (res.success) {
      invLowStockData = res.data || [];

      const criticalCount = invLowStockData.filter(
        (i) => i.priority === "Critical"
      ).length;
      const lowCount = invLowStockData.filter(
        (i) => i.priority === "Low"
      ).length;
      const watchCount = invLowStockData.filter(
        (i) => i.priority === "Watch"
      ).length;

      const el = (id) => document.getElementById(id);
      if (el("critical-count"))
        el("critical-count").textContent = `${criticalCount} item${
          criticalCount !== 1 ? "s" : ""
        }`;
      if (el("low-count"))
        el("low-count").textContent = `${lowCount} item${
          lowCount !== 1 ? "s" : ""
        }`;
      if (el("watch-count"))
        el("watch-count").textContent = `${watchCount} item${
          watchCount !== 1 ? "s" : ""
        }`;

      renderLowStockTable(invLowStockData);
    }
  } catch (error) {
    console.error("Error loading low stock:", error);
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-red-500">
      Failed to load low stock alerts: ${error.message}
    </td></tr>`;
    showNotification(
      "Failed to load low stock alerts: " + error.message,
      "error"
    );
  }
}

function renderLowStockTable(data) {
  const tbody = document.getElementById("low-stock-table-body");
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">
      All stock levels are healthy!
    </td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map((item) => {
      const badgeClass =
        INV_PRIORITY_BADGE[item.priority] || "bg-gray-100 text-gray-800";
      const lastSale = item.lastSaleDate
        ? new Date(item.lastSaleDate).toLocaleDateString("en-GB")
        : "No sales yet";
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">${invProductTitleHtml(
              item
            )}</div>
            <div class="text-xs text-gray-400">${invEscapeHtml(
              item.category?.name || ""
            )}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">${invEscapeHtml(
            item.barcode || "—"
          )}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${
            item.currentStock
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
            item.minStockLevel
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${
            item.reorderQty
          }</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastSale}</td>
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
        item.priority
      )}</span>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="createPurchaseOrder(${
              item.id
            })" class="text-blue-600 hover:text-blue-900 mr-3 p-1 rounded" title="Create GRN">
              <i data-feather="shopping-bag" class="w-4 h-4"></i>
            </button>
            <button onclick="adjustMinLevel(${
              item.id
            })" class="text-green-600 hover:text-green-900 p-1 rounded" title="Adjust Minimum Level">
              <i data-feather="settings" class="w-4 h-4"></i>
            </button>
          </td>
        </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

// ─── Stock Adjustment Modal ───────────────────────────────────────────────────

function openStockAdjustmentModal() {
  const modal = document.getElementById("stock-adjustment-modal");
  if (modal) modal.classList.remove("hidden");
  if (typeof feather !== "undefined") feather.replace();
}

function closeStockAdjustmentModal() {
  const modal = document.getElementById("stock-adjustment-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("stock-adjustment-form");
  if (form) form.reset();
  const info = document.getElementById("selected-adjustment-info");
  if (info) info.classList.add("hidden");
  const results = document.getElementById("adjustment-product-results");
  if (results) results.classList.add("hidden");
  const hiddenId = document.getElementById("selected-batch-id");
  if (hiddenId) hiddenId.value = "";
  invSelectedStock = null;
}

let _adjSearchDebounce = null;
async function searchAdjustmentProducts() {
  clearTimeout(_adjSearchDebounce);
  _adjSearchDebounce = setTimeout(async () => {
    const term =
      document.getElementById("adjustment-product-search")?.value || "";
    const resultsDiv = document.getElementById("adjustment-product-results");
    if (!resultsDiv) return;

    if (term.trim().length < 2) {
      resultsDiv.classList.add("hidden");
      return;
    }

    resultsDiv.innerHTML = `<div class="p-3 text-gray-400 text-sm">Searching…</div>`;
    resultsDiv.classList.remove("hidden");

    try {
      const params = new URLSearchParams({
        term: term.trim(),
        stockType: getSelectedStockTypeQuery(),
      });
      const res = await invMakeRequest(
        `${window.API_BASE_URL}/inventory/search-stock?${params}`
      );

      if (res.success) {
        const stocks = res.data || [];

        if (stocks.length === 0) {
          resultsDiv.innerHTML = `<div class="p-3 text-gray-500 text-sm">No stock batches found</div>`;
          return;
        }

        resultsDiv.innerHTML = stocks
          .map((s) => {
            const badgeClass =
              INV_STATUS_BADGE[s.status] || "bg-gray-100 text-gray-800";
            const safeId = invEscapeHtml(s.stockId);
            return `
              <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                onclick="selectAdjustmentBatch('${safeId.replace(/'/g, "\\'")}')">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-medium text-gray-900 text-sm">${invEscapeHtml(
                      s.productName
                    )}${
              s.variantName ? ` – ${invEscapeHtml(s.variantName)}` : ""
            }</h4>
                    <p class="text-xs text-gray-600 mt-0.5">Batch: <span class="font-mono font-medium">${safeId}</span> | Qty: <strong>${
              s.quantityInStock
            }</strong></p>
                    ${
                      s.barcode
                        ? `<p class="text-xs text-gray-400 font-mono">${invEscapeHtml(
                            s.barcode
                          )}</p>`
                        : ""
                    }
                  </div>
                  <div class="text-right ml-4">
                    <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
              s.status
            )}</span>
                    <p class="text-xs text-gray-500 mt-1">Rs. ${s.buyingPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>`;
          })
          .join("");
      }
    } catch (error) {
      resultsDiv.innerHTML = `<div class="p-3 text-red-500 text-sm">Error searching: ${error.message}</div>`;
    }
  }, 300);
}

async function selectAdjustmentBatch(stockId) {
  const resultsDiv = document.getElementById("adjustment-product-results");
  if (resultsDiv) resultsDiv.classList.add("hidden");

  try {
    const params = new URLSearchParams({
      term: stockId,
      stockType: getSelectedStockTypeQuery(),
    });
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/search-stock?${params}`
    );

    if (res.success && res.data.length > 0) {
      const stock = res.data.find((s) => s.stockId === stockId) || res.data[0];
      invSelectedStock = stock;

      const el = (id) => document.getElementById(id);
      if (el("adjustment-product-search")) {
        el("adjustment-product-search").value = `${stock.productName}${
          stock.variantName ? ` – ${stock.variantName}` : ""
        } | ${stock.stockId}`;
      }
      if (el("selected-product-name"))
        el("selected-product-name").textContent =
          stock.productName +
          (stock.variantName ? ` – ${stock.variantName}` : "");
      if (el("selected-batch-info"))
        el("selected-batch-info").textContent = `Batch ID: ${stock.stockId}${
          stock.barcode ? ` | Barcode: ${stock.barcode}` : ""
        }`;
      if (el("selected-current-stock"))
        el("selected-current-stock").textContent = stock.quantityInStock;
      if (el("selected-cost-price"))
        el("selected-cost-price").textContent =
          stock.buyingPrice.toLocaleString();
      if (el("selected-batch-id"))
        el("selected-batch-id").value = stock.stockId;
      if (el("selected-adjustment-info"))
        el("selected-adjustment-info").classList.remove("hidden");
    }
  } catch (err) {
    showNotification("Could not load batch details: " + err.message, "error");
  }
}

async function handleStockAdjustment(event) {
  event.preventDefault();

  const stockId = document.getElementById("selected-batch-id")?.value;
  const adjustmentType = document.getElementById("adjustment-type")?.value;
  const quantity = parseInt(
    document.getElementById("adjustment-quantity")?.value
  );
  const reason = document.getElementById("adjustment-reason")?.value;
  const notes = document.getElementById("adjustment-notes")?.value || "";

  if (!stockId) {
    showNotification("Please select a stock batch first", "error");
    return;
  }
  if (!adjustmentType) {
    showNotification("Please select an adjustment type", "error");
    return;
  }
  if (isNaN(quantity) || quantity < 0) {
    showNotification("Please enter a valid quantity", "error");
    return;
  }
  if (
    (adjustmentType === "increase" || adjustmentType === "decrease") &&
    quantity <= 0
  ) {
    showNotification("Quantity must be greater than zero", "error");
    return;
  }
  if (!reason) {
    showNotification("Please select a reason", "error");
    return;
  }

  const submitBtn = document.getElementById("adjustment-submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Applying…";
  }

  try {
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/adjustment`,
      {
        method: "POST",
        body: JSON.stringify({
          stockId,
          adjustmentType,
          quantity,
          reason,
          notes,
        }),
      }
    );

    if (res.success) {
      showNotification(res.message, "success");
      closeStockAdjustmentModal();
      loadInventoryStats();
      loadStockLevelsData();
      loadStockBatchesData();
      loadStockMovementsData();
      loadLowStockData();
    }
  } catch (error) {
    showNotification("Failed to apply adjustment: " + error.message, "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Apply Adjustment";
    }
  }
}

// ─── Action helpers ───────────────────────────────────────────────────────────

async function editStockLevel(variantId) {
  openStockAdjustmentModal();
  try {
    const params = new URLSearchParams({
      productVariantId: variantId,
      stockType: getSelectedStockTypeQuery(),
    });
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/batches?${params}`
    );

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const preferredBatch =
        res.data.find((b) => Number(b.quantity) > 0) || res.data[0];
      await selectAdjustmentBatch(preferredBatch.stockId);
      return;
    }
  } catch (error) {
    console.error("Failed to auto-select stock batch:", error);
  }

  const item = invStockData.find((i) => i.id === variantId);
  if (item) {
    const searchEl = document.getElementById("adjustment-product-search");
    if (searchEl) {
      searchEl.value =
        item.productName + (item.variantName ? ` ${item.variantName}` : "");
      searchAdjustmentProducts();
    }
  }
}

async function viewBatches(variantId) {
  try {
    const params = new URLSearchParams({
      productVariantId: variantId,
      stockType: getSelectedStockTypeQuery(),
    });
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/batches?${params}`
    );

    if (!res.success) throw new Error("Failed to load batches");

    const batches = res.data || [];
    const item = invStockData.find((i) => i.id === variantId);
    const title = item ? invProductTitleText(item) : "Product";

    const rowsHtml =
      batches.length > 0
        ? batches
            .map((b) => {
              const badgeClass =
                INV_STATUS_BADGE[b.status] || "bg-gray-100 text-gray-800";
              return `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-2 font-mono text-sm">${invEscapeHtml(
                  b.stockId
                )}</td>
                <td class="px-4 py-2 text-sm font-mono">${invEscapeHtml(
                  b.barcode || "—"
                )}</td>
                <td class="px-4 py-2 text-sm">${
                  b.receivedDate
                    ? new Date(b.receivedDate).toLocaleDateString("en-GB")
                    : "—"
                }</td>
                <td class="px-4 py-2 text-sm font-semibold">${b.quantity}</td>
                <td class="px-4 py-2 text-sm">Rs. ${b.buyingPrice.toLocaleString()}</td>
                <td class="px-4 py-2 text-sm">Rs. ${b.sellingPrice.toLocaleString()}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${invEscapeHtml(
                  b.supplier || "—"
                )}</td>
                <td class="px-4 py-2">
                  <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${badgeClass}">${invEscapeHtml(
                b.status
              )}</span>
                </td>
              </tr>`;
            })
            .join("")
        : `<tr><td colspan="8" class="px-4 py-4 text-center text-gray-500">No batches found</td></tr>`;

    const modalHtml = `
      <div id="view-batches-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeViewModal()">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex justify-between items-center p-6 border-b">
            <h2 class="text-xl font-semibold">Batches for ${title}</h2>
            <button onclick="closeViewModal()" class="text-gray-400 hover:text-gray-600">
              <i data-feather="x" class="w-6 h-6"></i>
            </button>
          </div>
          <div class="p-6 overflow-x-auto">
            <table class="min-w-full bg-white">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch ID</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Selling</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sales REP</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
    if (typeof feather !== "undefined") feather.replace();
  } catch (error) {
    showNotification("Failed to load batches: " + error.message, "error");
  }
}

function closeViewModal() {
  const modal = document.getElementById("view-batches-modal");
  if (modal) modal.remove();
}

async function editBatch(stockId) {
  openStockAdjustmentModal();
  const searchEl = document.getElementById("adjustment-product-search");
  if (searchEl) searchEl.value = stockId;
  try {
    await selectAdjustmentBatch(stockId);
  } catch (error) {
    console.error("Failed to auto-select batch:", error);
    searchAdjustmentProducts();
  }
}

function createPurchaseOrder(variantId) {
  const lowStockItem = invLowStockData.find((i) => i.id === variantId);

  window.__grnInventoryPrefill = lowStockItem
    ? {
        source: "low-stock",
        supplierId: lowStockItem.supplierId || null,
        supplierName: lowStockItem.supplierName || null,
        productVariantId: lowStockItem.id,
        productName: lowStockItem.productName,
        variantName: lowStockItem.variantName || "",
        quantity: lowStockItem.reorderQty || 1,
        buyingPrice: Number(lowStockItem.lastBuyingPrice || 0),
        sellingPrice: Number(lowStockItem.lastSellingPrice || 0),
        stockType: lowStockItem.stockType || invCurrentStockType || "Main",
      }
    : null;

  if (typeof window.loadPage === "function") {
    window.loadPage("purchase");
  }
}

// ─── Min Level Modal ──────────────────────────────────────────────────────────

function adjustMinLevel(variantId) {
  const item = invLowStockData.find((i) => i.id === variantId);
  if (!item) return showNotification("Item not found", "error");

  const el = (id) => document.getElementById(id);
  if (el("min-level-variant-id")) el("min-level-variant-id").value = variantId;
  if (el("min-level-product-name"))
    el("min-level-product-name").textContent =
      item.productName + (item.variantName ? ` – ${item.variantName}` : "");
  if (el("min-level-current-stock"))
    el("min-level-current-stock").textContent = item.currentStock;
  if (el("min-level-current-min"))
    el("min-level-current-min").textContent = item.minStockLevel;
  if (el("min-level-value")) el("min-level-value").value = item.minStockLevel;

  const modal = document.getElementById("min-level-modal");
  if (modal) modal.classList.remove("hidden");
  if (typeof feather !== "undefined") feather.replace();
}

function closeMinLevelModal() {
  const modal = document.getElementById("min-level-modal");
  if (modal) modal.classList.add("hidden");
  const form = document.getElementById("min-level-form");
  if (form) form.reset();
}

async function handleMinLevelUpdate(event) {
  event.preventDefault();

  const variantId = document.getElementById("min-level-variant-id")?.value;
  const minStockLevel = parseInt(
    document.getElementById("min-level-value")?.value
  );

  if (!variantId || isNaN(minStockLevel) || minStockLevel < 0) {
    showNotification("Please enter a valid minimum stock level", "error");
    return;
  }

  try {
    const res = await invMakeRequest(
      `${window.API_BASE_URL}/inventory/variant/${variantId}/min-stock-level`,
      {
        method: "PATCH",
        body: JSON.stringify({ minStockLevel }),
      }
    );

    if (res.success) {
      showNotification(res.message, "success");
      closeMinLevelModal();
      loadInventoryStats();
      loadStockLevelsData();
      loadLowStockData();
    }
  } catch (error) {
    showNotification(
      "Failed to update minimum stock level: " + error.message,
      "error"
    );
  }
}

// ─── PDF Downloads ────────────────────────────────────────────────────────────

function getStockLevelsExportFilters() {
  const search = document.getElementById("stock-search")?.value?.trim();
  const brandId = document.getElementById("stock-brand-filter")?.value;
  const categoryId = document.getElementById("stock-category-filter")?.value;
  const status = document.getElementById("stock-status-filter")?.value;
  const brandLabel = brandId
    ? document.querySelector(
        `#stock-brand-filter option[value="${CSS.escape(brandId)}"]`
      )?.textContent?.trim() || brandId
    : "";
  const categoryLabel = categoryId
    ? document.querySelector(
        `#stock-category-filter option[value="${CSS.escape(categoryId)}"]`
      )?.textContent?.trim() || categoryId
    : "";
  return [
    search ? { label: "Search", value: search } : null,
    brandId ? { label: "Brand", value: brandLabel } : null,
    categoryId ? { label: "Category", value: categoryLabel } : null,
    status ? { label: "Status", value: status } : null,
  ].filter(Boolean);
}

function getStockLevelsExportData() {
  return (invStockData || []).filter(
    (item) => Number(item.batchCount || 0) > 0
  );
}

function getStockLevelsExportRows(data) {
  return data.map((s) => [
    invProductTitleText(s),
    s.barcode || "—",
    String(s.currentStock),
    Number(s.avgCostPrice || 0).toLocaleString(),
    Number(s.avgSellingPrice ?? s.sellingPrice ?? 0).toLocaleString(),
    Number(s.stockValue || 0).toLocaleString(),
    String(s.batchCount),
    s.status,
  ]);
}

function downloadStockLevelsPDF() {
  try {
    const data = getStockLevelsExportData();
    const tableData = getStockLevelsExportRows(data);
    const total = data.reduce((s, i) => s + (i.stockValue || 0), 0);
    const ok = exportPdfWithTable({
      title: "Stock Levels Report",
      filters: getStockLevelsExportFilters(),
      head: [
        "Product / Variant",
        "Barcode",
        "Stock",
        "Avg Cost",
        "Avg Sell",
        "Value",
        "Batches",
        "Status",
      ],
      body: tableData,
      fileName: `stock-levels-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Items: ${data.length}  |  Total Value: Rs. ${total.toLocaleString()}`,
      emptyMessage: "No stock data available to export",
    });
    if (ok) showNotification("Stock Levels PDF downloaded", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadStockLevelsXL() {
  try {
    const data = getStockLevelsExportData();
    const ok = await exportXlsxWithTable({
      title: "Stock Levels Report",
      filters: getStockLevelsExportFilters(),
      headers: [
        "Product / Variant",
        "Barcode",
        "Stock",
        "Avg Cost",
        "Avg Sell",
        "Value",
        "Batches",
        "Status",
      ],
      rows: getStockLevelsExportRows(data),
      sheetName: "Stock Levels",
      fileName: `stock-levels-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No stock data available to export",
    });
    if (ok) showNotification("Stock Levels XL downloaded", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Error generating XL", "error");
  }
}

function downloadStockBatchesPDF() {
  try {
    const data = invBatchData || [];
    const tableData = data.map((b) => [
      b.stockId,
      invProductTitleText(b),
      b.barcode || "—",
      b.receivedDate
        ? new Date(b.receivedDate).toLocaleDateString("en-GB")
        : "—",
      String(b.quantity),
      Number(b.buyingPrice || 0).toLocaleString(),
      Number(b.sellingPrice || 0).toLocaleString(),
      b.supplier || "—",
      b.status,
    ]);
    const totalQty = data.reduce((s, b) => s + (b.quantity || 0), 0);
    const totalVal = data.reduce(
      (s, b) => s + (b.quantity || 0) * (b.buyingPrice || 0),
      0
    );
    const ok = exportPdfWithTable({
      title: "Stock Batches Report",
      filters: [],
      head: [
        "Batch ID",
        "Product",
        "Barcode",
        "Received",
        "Qty",
        "Cost",
        "Selling",
        "Sales REP",
        "Status",
      ],
      body: tableData,
      fileName: `stock-batches-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Batches: ${data.length}  |  Qty: ${totalQty}  |  Cost Value: Rs. ${totalVal.toLocaleString()}`,
      headStyles: { fillColor: [34, 197, 94] },
      emptyMessage: "No batch data available to export",
    });
    if (ok) showNotification("Stock Batches PDF downloaded", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadStockBatchesXL() {
  try {
    const data = invBatchData || [];
    const rows = data.map((b) => [
      b.stockId,
      invProductTitleText(b),
      b.barcode || "—",
      b.receivedDate
        ? new Date(b.receivedDate).toLocaleDateString("en-GB")
        : "—",
      String(b.quantity),
      Number(b.buyingPrice || 0).toLocaleString(),
      Number(b.sellingPrice || 0).toLocaleString(),
      b.supplier || "—",
      b.status,
    ]);
    const ok = await exportXlsxWithTable({
      title: "Stock Batches Report",
      filters: [],
      headers: [
        "Batch ID",
        "Product",
        "Barcode",
        "Received",
        "Qty",
        "Cost",
        "Selling",
        "Sales REP",
        "Status",
      ],
      rows,
      sheetName: "Stock Batches",
      fileName: `stock-batches-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No batch data available to export",
    });
    if (ok) showNotification("Stock Batches XL downloaded", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Error generating XL", "error");
  }
}

function downloadStockMovementsPDF() {
  try {
    const data = invMovementsData || [];
    const typeLabels = {
      IN: "Stock In",
      OUT: "Stock Out",
      ADJUSTMENT: "Adjustment",
      SALE: "Sale",
      RETURN: "Return",
    };
    const tableData = data.map((m) => [
      m.date ? new Date(m.date).toLocaleDateString("en-GB") : "—",
      invProductTitleText(m),
      m.stockId,
      typeLabels[m.movementType] || m.movementType,
      String(m.quantity),
      String(m.quantityBefore),
      String(m.quantityAfter),
      m.reason || "—",
      m.reference || "—",
    ]);
    const ok = exportPdfWithTable({
      title: "Stock Movements Report",
      filters: [],
      head: [
        "Date",
        "Product",
        "Batch ID",
        "Type",
        "Qty",
        "Before",
        "After",
        "Reason",
        "Reference",
      ],
      body: tableData,
      fileName: `stock-movements-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Movements: ${data.length}`,
      headStyles: { fillColor: [147, 51, 234] },
      emptyMessage: "No movement data available to export",
    });
    if (ok) showNotification("Stock Movements PDF downloaded", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadStockMovementsXL() {
  try {
    const data = invMovementsData || [];
    const typeLabels = {
      IN: "Stock In",
      OUT: "Stock Out",
      ADJUSTMENT: "Adjustment",
      SALE: "Sale",
      RETURN: "Return",
    };
    const rows = data.map((m) => [
      m.date ? new Date(m.date).toLocaleDateString("en-GB") : "—",
      invProductTitleText(m),
      m.stockId,
      typeLabels[m.movementType] || m.movementType,
      String(m.quantity),
      String(m.quantityBefore),
      String(m.quantityAfter),
      m.reason || "—",
      m.reference || "—",
    ]);
    const ok = await exportXlsxWithTable({
      title: "Stock Movements Report",
      filters: [],
      headers: [
        "Date",
        "Product",
        "Batch ID",
        "Type",
        "Qty",
        "Before",
        "After",
        "Reason",
        "Reference",
      ],
      rows,
      sheetName: "Stock Movements",
      fileName: `stock-movements-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No movement data available to export",
    });
    if (ok) showNotification("Stock Movements XL downloaded", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Error generating XL", "error");
  }
}

function downloadLowStockPDF() {
  try {
    const data = invLowStockData || [];
    const criticalCount = data.filter((i) => i.priority === "Critical").length;
    const lowCount = data.filter((i) => i.priority === "Low").length;
    const watchCount = data.filter((i) => i.priority === "Watch").length;
    const tableData = data.map((item) => [
      invProductTitleText(item),
      item.barcode || "—",
      String(item.currentStock),
      String(item.minStockLevel),
      String(item.reorderQty),
      item.lastSaleDate
        ? new Date(item.lastSaleDate).toLocaleDateString("en-GB")
        : "—",
      item.priority,
    ]);
    const ok = exportPdfWithTable({
      title: "Low Stock Alert Report",
      filters: [
        { label: "Critical (0–5)", value: String(criticalCount) },
        { label: "Low (6–15)", value: String(lowCount) },
        { label: "Watch (16–25)", value: String(watchCount) },
      ],
      head: [
        "Product",
        "Barcode",
        "Stock",
        "Min Level",
        "Reorder Qty",
        "Last Sale",
        "Priority",
      ],
      body: tableData,
      fileName: `low-stock-alert-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Low Stock Items: ${data.length}  |  Immediate Action: ${criticalCount}`,
      headStyles: { fillColor: [239, 68, 68] },
      emptyMessage: "No low stock data available to export",
    });
    if (ok) showNotification("Low Stock Alert PDF downloaded", "success");
  } catch (err) {
    console.error("PDF error:", err);
    showNotification("Error generating PDF", "error");
  }
}

async function downloadLowStockXL() {
  try {
    const data = invLowStockData || [];
    const criticalCount = data.filter((i) => i.priority === "Critical").length;
    const lowCount = data.filter((i) => i.priority === "Low").length;
    const watchCount = data.filter((i) => i.priority === "Watch").length;
    const rows = data.map((item) => [
      invProductTitleText(item),
      item.barcode || "—",
      String(item.currentStock),
      String(item.minStockLevel),
      String(item.reorderQty),
      item.lastSaleDate
        ? new Date(item.lastSaleDate).toLocaleDateString("en-GB")
        : "—",
      item.priority,
    ]);
    const ok = await exportXlsxWithTable({
      title: "Low Stock Alert Report",
      filters: [
        { label: "Critical (0–5)", value: String(criticalCount) },
        { label: "Low (6–15)", value: String(lowCount) },
        { label: "Watch (16–25)", value: String(watchCount) },
      ],
      headers: [
        "Product",
        "Barcode",
        "Stock",
        "Min Level",
        "Reorder Qty",
        "Last Sale",
        "Priority",
      ],
      rows,
      sheetName: "Low Stock",
      fileName: `low-stock-alert-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No low stock data available to export",
    });
    if (ok) showNotification("Low Stock Alert XL downloaded", "success");
  } catch (err) {
    console.error("XL error:", err);
    showNotification("Error generating XL", "error");
  }
}

// ─── Global exports ───────────────────────────────────────────────────────────

window.initializeInventoryStockModule = initializeInventoryStockModule;
window.generateInventoryStockContent = generateInventoryStockContent;
window.switchStockTab = switchStockTab;
window.setInventoryStockType = setInventoryStockType;
window.openStockAdjustmentModal = openStockAdjustmentModal;
window.closeStockAdjustmentModal = closeStockAdjustmentModal;
window.handleStockAdjustment = handleStockAdjustment;
window.searchAdjustmentProducts = searchAdjustmentProducts;
window.selectAdjustmentBatch = selectAdjustmentBatch;
window.editStockLevel = editStockLevel;
window.viewBatches = viewBatches;
window.closeViewModal = closeViewModal;
window.editBatch = editBatch;
window.createPurchaseOrder = createPurchaseOrder;
window.adjustMinLevel = adjustMinLevel;
window.closeMinLevelModal = closeMinLevelModal;
window.handleMinLevelUpdate = handleMinLevelUpdate;
window.downloadStockLevelsPDF = downloadStockLevelsPDF;
window.downloadStockLevelsXL = downloadStockLevelsXL;
window.downloadStockBatchesPDF = downloadStockBatchesPDF;
window.downloadStockBatchesXL = downloadStockBatchesXL;
window.downloadStockMovementsPDF = downloadStockMovementsPDF;
window.downloadStockMovementsXL = downloadStockMovementsXL;
window.downloadLowStockPDF = downloadLowStockPDF;
window.downloadLowStockXL = downloadLowStockXL;
window.debounceLoadStock = debounceLoadStock;
window.clearStockListFilters = clearStockListFilters;
window.clearStockMovementsFilters = clearStockMovementsFilters;
window.debounceLoadBatches = debounceLoadBatches;
window.loadStockLevelsData = loadStockLevelsData;
window.loadStockBatchesData = loadStockBatchesData;
window.loadStockMovementsData = loadStockMovementsData;
window.loadLowStockData = loadLowStockData;
