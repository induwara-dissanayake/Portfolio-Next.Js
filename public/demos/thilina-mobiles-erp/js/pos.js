// ============================================================
//  POS - Point of Sale (Fully API-driven, no mock data)
// ============================================================

const API_BASE = window.API_BASE_URL || "http://localhost:3000/api";

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
function getToken() {
  return (
    sessionStorage.getItem("authToken") || localStorage.getItem("authToken")
  );
}

function getCurrentUserRole() {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) return "";
    const user = JSON.parse(raw);
    return String(user?.userRoleName || user?.role || "")
      .trim()
      .toLowerCase();
  } catch (e) {
    return "";
  }
}

function canAccessPOS() {
  const role = getCurrentUserRole();
  return ["admin", "administrator", "cashier", "manager"].includes(role);
}

function enforcePOSAccess() {
  const token = getToken();
  if (!token) {
    window.location.href = "login.html";
    return false;
  }

  if (!canAccessPOS()) {
    alert("Access denied: You do not have permission to access POS System.");
    window.location.href = "Dashboard.html";
    return false;
  }

  return true;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

// ─── State ────────────────────────────────────────────────────────────────────
let cart = [];
let currentCustomer = null;
let currentPaymentMethod = "cash";
let currentPOSTab = "shop";
let posProductsCache = []; // All POS products fetched
let categoriesCache = [];
let brandsCache = [];
let customersCache = [];
let repairCustomerSearchTimeout = null;
let posRepairPaymentTypes = [];
let lastInvoiceData = null; // Last completed invoice for receipt/reprint
let currentSale = { customer: null };
let posBankAccounts = [];
let customerInstallmentsCache = [];
let isCreditSale = false;
let posCustomerDetailsState = {
  customer: null,
  invoices: [],
  repairs: [],
  creditInvoices: [],
};
let posAllCustomersList = [];
let posRepairTransferCandidates = [];
let posTransferSearchTimeout = null;
let posInvoiceItemSearchTimeout = null;
let posInstallmentSearchDebounce = null;
let isProcessingSale = false;
let searchInvoicesForReturnDebounced = null;

// ─── Initialisation ──────────────────────────────────────────────────────────
async function initializePOS() {
  setupEventListeners();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  setupRoleBasedUI();
  selectPaymentMethod("cash");

  const discountTypeEl = document.getElementById("discount-type");
  if (discountTypeEl) discountTypeEl.value = "fixed";

  // Load filters first, then products
  await Promise.all([
    loadCategoryFilter(),
    loadBrandFilter(),
    loadPOSBankAccounts(),
  ]);
  await loadProducts();

  if (typeof initializeRepairsPage === "function") {
    initializeRepairsPage("pos-content-repair", true);
  }
  if (typeof initializeCustomersModule === "function") {
    initializeCustomersModule("pos-content-customer", true);
  }
  updateHeldSalesBadge();
}

function canOverrideInvoiceDate() {
  const role = getCurrentUserRole();
  return role === "admin" || role === "administrator";
}

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function resetAdminInvoiceDateField() {
  const input = document.getElementById("admin-invoice-date");
  if (!input) return;
  input.value = toDatetimeLocalValue(new Date());
}

function setupRoleBasedUI() {
  const section = document.getElementById("admin-invoice-date-section");
  if (!section) return;
  if (canOverrideInvoiceDate()) {
    section.classList.remove("hidden");
    resetAdminInvoiceDateField();
  } else {
    section.classList.add("hidden");
    const input = document.getElementById("admin-invoice-date");
    if (input) input.value = "";
  }
}

function updateDateTime() {
  const now = new Date();
  const dateEl = document.getElementById("current-date");
  const timeEl = document.getElementById("current-time");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  // Legacy single-element fallback
  const legacy = document.getElementById("current-datetime");
  if (legacy) {
    legacy.textContent = now.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

function setupEventListeners() {
  // Search bar — Enter triggers barcode scan, typing triggers filter
  const searchInput = document.getElementById("product-search");
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const term = searchInput.value.trim();
        if (!term) return;

        const exact = posProductsCache.find(
          (p) => p.barcode === term || p.sku === term
        );

        if (exact) {
          addProductToCart(exact);
          searchInput.value = "";
          filterProducts();
        } else {
          // Keep Enter useful for normal text search too
          filterProducts();
        }
      }
    });
    searchInput.addEventListener("input", debounce(filterProducts, 300));
  }

  // Category / brand filters
  const catFilter = document.getElementById("category-filter");
  if (catFilter) catFilter.addEventListener("change", filterProducts);
  const brandFilter = document.getElementById("brand-filter");
  if (brandFilter) brandFilter.addEventListener("change", filterProducts);

  // Return tab search (debounced; HTML oninput removed to avoid double-fire)
  const returnSearch = document.getElementById("return-search-input");
  if (returnSearch) {
    returnSearch.addEventListener("input", debounce(handleReturnSearch, 300));
  }
  const returnStatusFilter = document.getElementById("return-status-filter");
  if (returnStatusFilter) {
    returnStatusFilter.addEventListener("change", handleReturnSearch);
  }

  // Cart customer search
  const cartCustomerSearch = document.getElementById("customer-search");
  if (cartCustomerSearch) {
    cartCustomerSearch.addEventListener(
      "input",
      debounce(handleCartCustomerSearch, 300)
    );
  }

  // Discount inputs
  const discountInput = document.getElementById("discount-input");
  if (discountInput) discountInput.addEventListener("input", updateTotals);
  const discountType = document.getElementById("discount-type");
  if (discountType) discountType.addEventListener("change", updateTotals);

  // Cash received
  const cashInput = document.getElementById("cash-received");
  if (cashInput) cashInput.addEventListener("input", calculateChange);

  const paidNowInput = document.getElementById("amount-paid-now");
  if (paidNowInput) paidNowInput.addEventListener("input", updateCreditPreview);

  // Hide customer dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const results = document.getElementById("customer-results");
    const search = document.getElementById("customer-search");
    if (
      results &&
      search &&
      !search.contains(e.target) &&
      !results.contains(e.target)
    ) {
      results.classList.add("hidden");
    }

    const repairResults = document.getElementById("repair-customer-results");
    const repairSearch = document.getElementById("repair-customer-search");
    if (
      repairResults &&
      repairSearch &&
      !repairSearch.contains(e.target) &&
      !repairResults.contains(e.target)
    ) {
      repairResults.classList.add("hidden");
    }
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        processPayment();
        break;
      case "Delete":
        e.preventDefault();
        clearCart();
        break;
      case "k":
        e.preventDefault();
        document.getElementById("product-search")?.focus();
        break;
    }
  }
  if (e.key === "F2") {
    e.preventDefault();
    document.getElementById("product-search")?.focus();
  }
  if (e.key === "F4") {
    e.preventDefault();
    if (cart.length) holdSale();
    else openHeldSalesModal();
  }
  if (e.key === "Escape") {
    closeShortcutsModal();
    closeHeldSalesModal();
    closeReturnDetailsModal();
    closeProductModal();
  }
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function switchPOSTab(tab) {
  currentPOSTab = tab;
  const tabs = ["shop", "repair", "return", "customer"];

  tabs.forEach((t) => {
    const btn = document.getElementById(`pos-tab-${t}`);
    const content = document.getElementById(`pos-content-${t}`);
    if (btn) {
      btn.classList.toggle("border-blue-500", t === tab);
      btn.classList.toggle("text-blue-600", t === tab);
      btn.classList.toggle("border-transparent", t !== tab);
      btn.classList.toggle("text-gray-500", t !== tab);
    }
    if (content) content.classList.toggle("hidden", t !== tab);
  });

  // Show top product search/filter bar only on Shop tab
  const shopFilters = document.getElementById("search-filters-section");
  const sectionHeader = document.getElementById("section-header");
  if (shopFilters) shopFilters.classList.toggle("hidden", tab !== "shop");
  if (sectionHeader) sectionHeader.classList.toggle("hidden", tab !== "shop");

  // Hide cart on Customer and Return tabs
  const cartArea = document.getElementById("cart-area");
  if (cartArea) cartArea.classList.toggle("hidden", tab !== "shop");

  // Update cart UI mode and load tab data
  if (tab === "shop") {
    updateUIForShopMode();
    filterProducts();
  } else if (tab === "repair") {
    updateUIForRepairMode();
    if (typeof loadRepairsData === "function") loadRepairsData();
  } else if (tab === "return") {
    updateUIForReturnMode();
    loadReturnTable();
  } else if (tab === "customer") {
    updateUIForCustomerMode();
    const sub =
      typeof currentCustomerManagementTab !== "undefined"
        ? currentCustomerManagementTab || "customers"
        : "customers";
    if (typeof switchCustomerManagementTab === "function") {
      switchCustomerManagementTab(sub);
    }
  }
}

function updateUIForShopMode() {
  setCartModeLabel("Shopping Cart");
}
function updateUIForRepairMode() {
  setCartModeLabel("Repair Invoice");
}
function updateUIForReturnMode() {
  setCartModeLabel("Return");
}
function updateUIForCustomerMode() {
  setCartModeLabel("Customer");
}

function setCartModeLabel(label) {
  const el =
    document.getElementById("cart-header") ||
    document.getElementById("cart-mode-label");
  if (el) el.textContent = label;
}

// ─── Products ─────────────────────────────────────────────────────────────────
async function loadProducts() {
  const tbody = document.getElementById("product-table-body");
  if (tbody)
    tbody.innerHTML =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Loading products...</td></tr>';

  try {
    const res = await apiFetch("/invoices/pos/products");
    posProductsCache = res.data || [];
    filterProducts();
  } catch (err) {
    console.error("loadProducts error:", err);
    showNotification("Failed to load products: " + err.message, "error");
    if (tbody)
      tbody.innerHTML =
        '<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">Failed to load products</td></tr>';
  }
}

async function loadCategoryFilter() {
  try {
    const res = await apiFetch("/category");
    categoriesCache = (res.data || res || []).filter(
      (c) => c.isActive !== false
    );
    const select = document.getElementById("category-filter");
    if (!select) return;
    // Remove all options except the first "All" option
    while (select.options.length > 1) select.remove(1);
    categoriesCache.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn("Could not load categories:", err.message);
  }
}

async function loadBrandFilter() {
  try {
    const res = await apiFetch("/brands");
    brandsCache = (res.data || res || []).filter((b) => b.isActive !== false);
    const select = document.getElementById("brand-filter");
    if (!select) return;
    while (select.options.length > 1) select.remove(1);
    brandsCache.forEach((brand) => {
      const opt = document.createElement("option");
      opt.value = brand.id;
      opt.textContent = brand.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.warn("Could not load brands:", err.message);
  }
}

async function loadPOSBankAccounts() {
  try {
    const res = await apiFetch("/accounts/accounts");
    const accounts = res.data || [];
    posBankAccounts =
      typeof filterBankSubAccounts === "function"
        ? filterBankSubAccounts(accounts)
        : accounts;

    const select = document.getElementById("pos-bank-account");
    if (!select) return;
    select.innerHTML =
      '<option value="">Select Bank Account</option>' +
      posBankAccounts
        .map(
          (acc) =>
            `<option value="${acc.id}">${escHtml(acc.accountCode)} - ${escHtml(
              acc.accountName || ""
            )}</option>`
        )
        .join("");
  } catch (err) {
    console.warn("Could not load bank accounts:", err.message);
  }
}

function filterProducts() {
  const search = (
    document.getElementById("product-search")?.value || ""
  ).toLowerCase();
  const categoryId = document.getElementById("category-filter")?.value || "";
  const brandId = document.getElementById("brand-filter")?.value || "";

  const filtered = posProductsCache.filter((p) => {
    const matchSearch =
      !search ||
      (p.name || "").toLowerCase().includes(search) ||
      (p.productName || "").toLowerCase().includes(search) ||
      (p.variantName || "").toLowerCase().includes(search) ||
      (p.barcode || "").toLowerCase().includes(search) ||
      (p.sku || "").toLowerCase().includes(search) ||
      (p.categoryName || "").toLowerCase().includes(search) ||
      (p.brandName || "").toLowerCase().includes(search);
    const matchCat = !categoryId || String(p.categoryId) === String(categoryId);
    const matchBrand = !brandId || String(p.brandId) === String(brandId);
    return matchSearch && matchCat && matchBrand;
  });

  renderProductTable(filtered);
}

function renderProductTable(products) {
  const tbody = document.getElementById("product-table-body");
  if (!tbody) return;

  if (!products.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = products.map((p) => createProductRow(p)).join("");
}

function createProductRow(product) {
  const stockClass =
    product.stock > 10
      ? "text-green-600"
      : product.stock > 0
      ? "text-yellow-600"
      : "text-red-600";
  const stockLabel =
    product.stock > 10
      ? "In Stock"
      : product.stock > 0
      ? "Low Stock"
      : "Out of Stock";

  const variantText = product.variantName
    ? `<div class="text-xs text-gray-500 mt-0.5">Variant: ${escHtml(
        product.variantName
      )}</div>`
    : "";
  const warrantyText = product.warrantyLabel
    ? `<div class="text-xs text-gray-500 mt-0.5">Warranty: ${escHtml(
        product.warrantyLabel
      )}</div>`
    : "";
  const productKey = escAttr(String(product.id));

  return `<tr class="hover:bg-blue-50 cursor-pointer transition-colors" data-product-id="${productKey}" onclick="addProductToCartById(this.dataset.productId)">
    <td class="px-4 py-3 text-sm font-medium text-gray-900">${escHtml(
      product.name
    )}${variantText}${warrantyText}</td>
    <td class="px-4 py-3 text-sm text-gray-600">${escHtml(
      product.categoryName || ""
    )}</td>
    <td class="px-4 py-3 text-sm text-gray-600">${escHtml(
      product.brandName || ""
    )}</td>
    <td class="px-4 py-3 text-sm font-semibold text-blue-600">Rs.${Number(
      product.price
    ).toLocaleString()}</td>
    <td class="px-4 py-3 text-sm font-medium ${stockClass}">${stockLabel} (${
    product.stock
  })</td>
    <td class="px-4 py-3 text-sm">
      <button
        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        data-product-id="${productKey}"
        onclick="event.stopPropagation(); addProductToCartById(this.dataset.productId)"
      >
        Add
      </button>
    </td>
  </tr>`;
}

function addProductToCartById(productId) {
  const product = posProductsCache.find(
    (p) => String(p.id) === String(productId)
  );
  if (!product) {
    showNotification("Product not found in catalog", "error");
    return;
  }
  addProductToCart(product);
}

function clearFilters() {
  const search = document.getElementById("product-search");
  if (search) search.value = "";
  const cat = document.getElementById("category-filter");
  if (cat) cat.value = "";
  const brand = document.getElementById("brand-filter");
  if (brand) brand.value = "";
  filterProducts();
}

async function addProductByBarcode(barcode) {
  if (!barcode) return;

  // First check local cache
  const found = posProductsCache.find(
    (p) => p.barcode === barcode || p.sku === barcode
  );
  if (found) {
    addProductToCart(found);
    document.getElementById("product-search").value = "";
    return;
  }

  // If not found locally, reload all products first
  try {
    showNotification("Searching barcode…", "info");
    const res = await apiFetch(`/invoices/pos/products`);
    posProductsCache = res.data || [];
    const product = posProductsCache.find(
      (p) => p.barcode === barcode || p.sku === barcode
    );
    if (product) {
      addProductToCart(product);
      document.getElementById("product-search").value = "";
    } else {
      showNotification(`No product found for barcode: ${barcode}`, "warning");
    }
  } catch (err) {
    showNotification("Barcode lookup failed: " + err.message, "error");
  }
}

// ─── Repairs (POS) ───────────────────────────────────────────────────────────
function parseInstallmentEntriesFromNotes(notes) {
  const raw = String(notes || "");
  const matches = [...raw.matchAll(/\[INST\|([^\]]+)\]/g)];
  return matches
    .map((m) => {
      const parts = String(m[1] || "").split("|");
      const [paidAt, amount, methodMeta, userNote] = parts;
      const methodMetaText = String(methodMeta || "");
      const [paymentMethod, bankAccount] = methodMetaText.split("::");
      return {
        paidAt: paidAt ? new Date(paidAt) : null,
        amount: Number(amount || 0),
        paymentMethod: paymentMethod || null,
        bankAccount: bankAccount || null,
        note: userNote || null,
      };
    })
    .filter((x) => x.paidAt && x.amount > 0)
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
}

function isCreditPurchaseInvoiceFront(inv) {
  const notes = String(inv?.notes || "");
  return (
    Number(inv?.balance || 0) > 0 ||
    notes.includes("[CREDIT_PURCHASE]") ||
    notes.includes("[INST|")
  );
}

function buildPOSPurchaseCardsHtml(invoices = []) {
  if (!invoices.length) {
    return '<div class="px-2 py-3 text-center text-gray-400 text-xs border border-dashed border-gray-300 rounded">No purchases found</div>';
  }

  return invoices
    .map((inv) => {
      const creditBalance = Number(inv.balance || 0);
      const hasCreditBalance = creditBalance > 0;
      return `<div class="border rounded-lg p-3 mb-3 ${
        hasCreditBalance
          ? "border-amber-200 bg-amber-50"
          : "border-gray-200 bg-white"
      }">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h6 class="font-medium text-gray-900">${escHtml(
            inv.invoiceNumber
          )}</h6>
          <p class="text-xs text-gray-500">${new Date(
            inv.createdAt || inv.date
          ).toLocaleDateString()}</p>
        </div>
        <div class="flex items-center space-x-2">
          <div class="text-right text-xs">
            <div class="text-gray-600">Status: ${escHtml(
              inv.paymentStatus || "—"
            )}</div>
            <div class="font-semibold text-gray-900">Total: Rs.${Number(
              inv.totalAmount || 0
            ).toLocaleString()}</div>
            ${
              hasCreditBalance
                ? `<div class="font-semibold text-amber-800">Credit Balance: Rs.${creditBalance.toLocaleString()}</div>`
                : ""
            }
          </div>
          <button type="button" onclick="reprintCustomerPurchaseInvoice(${Number(
            inv.id
          )})" class="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center transition-colors shadow-sm ml-2" title="Print Invoice / Receipt">
            <i data-feather="printer" class="w-3.5 h-3.5 mr-1"></i> Print
          </button>
        </div>
      </div>

      <div class="space-y-1.5 mb-2">
        ${(inv.items || [])
          .map(
            (item) => `<div class="flex justify-between text-sm">
              <span class="text-gray-700">${escHtml(
                item.productName || "Unknown Product"
              )}${
              item.variantName ? " — " + escHtml(item.variantName) : ""
            }${
              item.warrantyLabel
                ? " · " + escHtml(item.warrantyLabel)
                : ""
            } x${Number(item.quantity || 0)}</span>
              <span class="text-gray-900">Rs.${Number(
                item.subtotal || 0
              ).toLocaleString()}</span>
            </div>`
          )
          .join("")}
      </div>

      <div class="pt-2 border-t border-gray-100 text-xs text-gray-600 flex justify-between">
        <span>Payment: ${escHtml(inv.paymentType || "—")}</span>
        <span>Paid: Rs.${Number(
          inv.paidAmount || 0
        ).toLocaleString()} | Balance: Rs.${Number(
        inv.balance || 0
      ).toLocaleString()}</span>
      </div>
    </div>`;
    })
    .join("");
}

function buildPOSRepairCardsHtml(repairs = []) {
  if (!repairs.length) {
    return '<div class="px-2 py-3 text-center text-gray-400 text-xs border border-dashed border-gray-300 rounded">No repairs found</div>';
  }

  return repairs
    .map(
      (r) => `<div class="border border-gray-200 rounded-lg p-3 mb-3">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h6 class="font-medium text-gray-900">${escHtml(
            r.repairNumber || "—"
          )}</h6>
          <p class="text-sm text-gray-700">${escHtml(r.deviceName || "—")}</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">${escHtml(
          r.status || "—"
        )}</span>
      </div>
      <p class="text-sm text-gray-600 mb-2"><span class="font-medium">Issue:</span> ${escHtml(
        r.issue || "—"
      )}</p>
      <div class="text-xs text-gray-600 pt-2 border-t border-gray-100 flex justify-between">
        <span>Est: Rs.${Number(r.estimatedCost || 0).toLocaleString()}</span>
        <span>${
          r.actualCost != null
            ? `Actual: Rs.${Number(r.actualCost).toLocaleString()}`
            : "Pending completion"
        }</span>
      </div>
    </div>`
    )
    .join("");
}

function filterPOSCustomerPurchases() {
  const search = (document.getElementById("pos-purchase-search")?.value || "")
    .toLowerCase()
    .trim();
  const fromVal = document.getElementById("pos-purchase-from")?.value;
  const toVal = document.getElementById("pos-purchase-to")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  const filtered = (posCustomerDetailsState.invoices || []).filter((inv) => {
    const invDate = new Date(inv.createdAt || inv.date);
    if (from && invDate < from) return false;
    if (to && invDate > to) return false;
    if (!search) return true;

    const inInvoice = String(inv.invoiceNumber || "")
      .toLowerCase()
      .includes(search);
    const inItems = (inv.items || []).some(
      (it) =>
        String(it.productName || "")
          .toLowerCase()
          .includes(search) ||
        String(it.variantName || "")
          .toLowerCase()
          .includes(search)
    );
    return inInvoice || inItems;
  });

  const list = document.getElementById("pos-customer-purchase-list");
  if (list) list.innerHTML = buildPOSPurchaseCardsHtml(filtered);
}

function clearPOSCustomerPurchaseFilters() {
  const search = document.getElementById("pos-purchase-search");
  const from = document.getElementById("pos-purchase-from");
  const to = document.getElementById("pos-purchase-to");
  if (search) search.value = "";
  if (from) from.value = "";
  if (to) to.value = "";
  const list = document.getElementById("pos-customer-purchase-list");
  if (list)
    list.innerHTML = buildPOSPurchaseCardsHtml(
      posCustomerDetailsState.invoices || []
    );
}

function filterPOSCustomerRepairs() {
  const search = (document.getElementById("pos-repair-search")?.value || "")
    .toLowerCase()
    .trim();
  const status = document.getElementById("pos-repair-status")?.value || "";
  const fromVal = document.getElementById("pos-repair-from")?.value;
  const toVal = document.getElementById("pos-repair-to")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  const filtered = (posCustomerDetailsState.repairs || []).filter((rep) => {
    const d = new Date(rep.receivedAt || rep.createdAt || Date.now());
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (status && String(rep.status || "") !== status) return false;
    if (!search) return true;
    return (
      String(rep.repairNumber || "")
        .toLowerCase()
        .includes(search) ||
      String(rep.deviceName || "")
        .toLowerCase()
        .includes(search) ||
      String(rep.issue || "")
        .toLowerCase()
        .includes(search)
    );
  });

  const list = document.getElementById("pos-customer-repair-list");
  if (list) list.innerHTML = buildPOSRepairCardsHtml(filtered);
}

function clearPOSCustomerRepairFilters() {
  const search = document.getElementById("pos-repair-search");
  const status = document.getElementById("pos-repair-status");
  const from = document.getElementById("pos-repair-from");
  const to = document.getElementById("pos-repair-to");
  if (search) search.value = "";
  if (status) status.value = "";
  if (from) from.value = "";
  if (to) to.value = "";
  const list = document.getElementById("pos-customer-repair-list");
  if (list)
    list.innerHTML = buildPOSRepairCardsHtml(
      posCustomerDetailsState.repairs || []
    );
}

async function selectCustomerFromTable(customerId) {
  try {
    const res = await apiFetch(`/customers/${customerId}`);
    const c = res.data;

    // Set customer in cart
    currentCustomer = {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
    };
    currentSale.customer = currentCustomer;
    document.getElementById("customer-search").value = c.name;
    document.getElementById("selected-customer-id").value = c.id;

    // Switch to shop tab
    switchPOSTab("shop");
    showNotification(`Customer "${c.name}" selected`, "success");

    // Show quick details inline
    showPosCustomerDetailsModal(c);
  } catch (err) {
    showNotification("Failed to load customer: " + err.message, "error");
  }
}

async function viewPosCustomerDetails(customerId, initialTab = "purchases") {
  try {
    const res = await apiFetch(`/customers/${customerId}`);
    const allowed = ["purchases", "repairs", "credit"];
    const tab = allowed.includes(initialTab) ? initialTab : "purchases";
    showPosCustomerDetailsModal(res.data, tab);
  } catch (err) {
    showNotification("Failed to load customer: " + err.message, "error");
  }
}

function showPosCustomerDetailsModal(c, initialTab = "purchases") {
  const creditInvoices = (c.invoices || [])
    .filter(isCreditPurchaseInvoiceFront)
    .map((inv) => ({
      ...inv,
      installments:
        inv.installments && inv.installments.length > 0
          ? inv.installments
          : parseInstallmentEntriesFromNotes(inv.notes),
    }));

  const invoicesHtml = buildPOSPurchaseCardsHtml(c.invoices || []);
  const repairsHtml = buildPOSRepairCardsHtml(c.repairs || []);

  const creditHtml = creditInvoices
    .map((inv) => {
      const installmentsHtml = (inv.installments || []).length
        ? `<div class="mt-2 bg-gray-50 rounded p-2">
            <div class="text-xs font-semibold text-gray-600 mb-1">Installments</div>
            ${(inv.installments || [])
              .slice(0, 6)
              .map(
                (
                  ins
                ) => `<div class="text-xs text-gray-700 flex justify-between py-0.5">
                  <span>${new Date(
                    ins.paidAt
                  ).toLocaleDateString()} - ${escHtml(
                  ins.paymentMethod || "—"
                )}${
                  ins.bankAccount ? ` (${escHtml(ins.bankAccount)})` : ""
                }</span>
                  <span class="font-medium">Rs.${Number(
                    ins.amount || 0
                  ).toLocaleString()}</span>
                </div>${
                  ins.note
                    ? `<div class="text-[11px] text-gray-500">Note: ${escHtml(
                        ins.note
                      )}</div>`
                    : ""
                }`
              )
              .join("")}
          </div>`
        : '<div class="mt-2 text-xs text-gray-400">No installment records yet</div>';

      return `<div class="border border-gray-200 rounded-lg p-3 mb-3">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-sm font-semibold text-gray-800">${escHtml(
              inv.invoiceNumber
            )}</div>
            <div class="text-xs text-gray-500">${new Date(
              inv.createdAt || inv.date
            ).toLocaleDateString()}</div>
          </div>
          <div class="text-right text-xs">
            <div>Total: <span class="font-semibold">Rs.${Number(
              inv.totalAmount || 0
            ).toLocaleString()}</span></div>
            <div class="text-green-700">Paid: Rs.${Number(
              inv.paidAmount || 0
            ).toLocaleString()}</div>
            <div class="text-red-700">Balance: Rs.${Number(
              inv.balance || 0
            ).toLocaleString()}</div>
          </div>
        </div>
        ${installmentsHtml}
        <div class="mt-3 flex justify-end">
          ${
            Number(inv.balance || 0) > 0
              ? `<button onclick="openInstallmentPaymentModal(${Number(
                  inv.id
                )}, ${Number(inv.balance || 0)}, ${Number(
                  c.id
                )});" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Add Payment</button>`
              : '<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Fully Paid</span>'
          }
        </div>
      </div>`;
    })
    .join("");

  const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closePOSCustomerDetailsOverlay()">
    <div class="bg-white rounded-xl p-6 w-[92vw] max-w-6xl mx-4 max-h-[92vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800">Customer Details</h2>
        <button onclick="closePOSCustomerDetailsOverlay()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div><span class="text-sm text-gray-500">Name</span><p class="font-semibold">${escHtml(
          c.name
        )}</p></div>
        <div><span class="text-sm text-gray-500">Phone</span><p class="font-semibold">${escHtml(
          c.phone || "—"
        )}</p></div>
        <div><span class="text-sm text-gray-500">Email</span><p class="font-semibold">${escHtml(
          c.email || "—"
        )}</p></div>
        <div><span class="text-sm text-gray-500">Total Spent</span><p class="font-semibold text-green-600">Rs.${Number(
          c.totalSpent || 0
        ).toLocaleString()}</p></div>
        <div><span class="text-sm text-gray-500">Orders</span><p class="font-semibold">${
          c.invoiceCount || 0
        }</p></div>
        <div><span class="text-sm text-gray-500">Since</span><p class="font-semibold">${
          c.joinDate ? new Date(c.joinDate).toLocaleDateString() : "—"
        }</p></div>
      </div>
      <div class="border-b border-gray-200 mb-3 flex gap-2">
        <button id="customer-details-tab-purchases" onclick="switchCustomerDetailsTab('purchases')" class="px-3 py-2 text-sm border-b-2 border-blue-500 text-blue-600">Purchases</button>
        <button id="customer-details-tab-repairs" onclick="switchCustomerDetailsTab('repairs')" class="px-3 py-2 text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700">Repairs</button>
        <button id="customer-details-tab-credit" onclick="switchCustomerDetailsTab('credit')" class="px-3 py-2 text-sm border-b-2 border-transparent text-gray-500 hover:text-gray-700">Credit</button>
      </div>

      <div id="customer-details-content-purchases" class="mb-4"><h3 class="font-semibold text-gray-700 mb-2">Purchase History</h3>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
          <input type="text" id="pos-purchase-search" oninput="filterPOSCustomerPurchases()" placeholder="Search item or invoice..." class="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="date" id="pos-purchase-from" onchange="filterPOSCustomerPurchases()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
          <input type="date" id="pos-purchase-to" onchange="filterPOSCustomerPurchases()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
          <button onclick="clearPOSCustomerPurchaseFilters()" class="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Clear</button>
        </div>
        <div id="pos-customer-purchase-list">${invoicesHtml}</div>
      </div>

      <div id="customer-details-content-repairs" class="hidden mb-4"><h3 class="font-semibold text-gray-700 mb-2">Repair History</h3>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
          <input type="text" id="pos-repair-search" oninput="filterPOSCustomerRepairs()" placeholder="Search repair, device, issue..." class="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select id="pos-repair-status" onchange="filterPOSCustomerRepairs()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Repairing">Repairing</option>
            <option value="Pending Parts">Pending Parts</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <input type="date" id="pos-repair-from" onchange="filterPOSCustomerRepairs()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
          <input type="date" id="pos-repair-to" onchange="filterPOSCustomerRepairs()" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
          <button onclick="clearPOSCustomerRepairFilters()" class="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Clear</button>
        </div>
        <div id="pos-customer-repair-list">${repairsHtml}</div>
      </div>

      <div id="customer-details-content-credit" class="hidden mb-4">
        <h3 class="font-semibold text-gray-700 mb-2">Credit Purchases & Installments</h3>
        ${
          creditHtml ||
          '<div class="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-300 rounded">No credit purchases found</div>'
        }
      </div>
      <div class="flex justify-end space-x-3 mt-4">
        <button onclick="closePOSCustomerDetailsOverlay()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
        <button onclick="closePOSCustomerDetailsOverlay(); editPosCustomerDetails(${
          c.id
        })" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Edit</button>
      </div>
    </div>
  </div>`;

  const div = document.createElement("div");
  div.id = "customer-details-modal";
  div.innerHTML = html;
  document.body.appendChild(div);
  posCustomerDetailsState = {
    customer: c,
    invoices: c.invoices || [],
    repairs: c.repairs || [],
    creditInvoices,
  };
  feather.replace();
  clearPOSCustomerPurchaseFilters();
  clearPOSCustomerRepairFilters();
  const allowed = ["purchases", "repairs", "credit"];
  const tab = allowed.includes(initialTab) ? initialTab : "purchases";
  switchCustomerDetailsTab(tab);
}

function closePOSCustomerDetailsOverlay() {
  document.getElementById("customer-details-modal")?.remove();
}

function switchCustomerDetailsTab(tab) {
  const tabs = ["purchases", "repairs", "credit"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`customer-details-tab-${t}`);
    const content = document.getElementById(`customer-details-content-${t}`);
    if (btn) {
      btn.classList.toggle("border-blue-500", t === tab);
      btn.classList.toggle("text-blue-600", t === tab);
      btn.classList.toggle("border-transparent", t !== tab);
      btn.classList.toggle("text-gray-500", t !== tab);
    }
    if (content) content.classList.toggle("hidden", t !== tab);
  });
}

/** Cash, cheque, and bank transfer only — excludes card, credit, etc. */
function filterInstallmentEligiblePaymentTypes(paymentTypes) {
  return (paymentTypes || []).filter((pt) => {
    const n = String(pt?.name || "")
      .trim()
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ");
    if (!n) return false;
    if (/\bcredit\b|\bcard\b/.test(n)) return false;
    return (
      n === "cash" ||
      n === "cheque" ||
      n === "bank transfer" ||
      /^bank\s+transfer$/.test(n)
    );
  });
}

async function openInstallmentPaymentModal(invoiceId, maxBalance, customerId) {
  const safeBalance = Number(maxBalance || 0);
  try {
    const paymentTypesRes = await apiFetch("/invoices/payment-types");
    const rawTypes = paymentTypesRes.data || [];
    const paymentTypes = filterInstallmentEligiblePaymentTypes(rawTypes);

    const options = paymentTypes
      .map(
        (pt) =>
          `<option value="${Number(pt.id)}">${escHtml(pt.name || "")}</option>`
      )
      .join("");

    const bankOptions = posBankAccounts
      .map(
        (acc) =>
          `<option value="${Number(acc.id)}">${escHtml(
            acc.accountCode
          )} - ${escHtml(acc.accountName || "")}</option>`
      )
      .join("");

    const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeInstallmentPaymentModal()">
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold text-gray-800">Record Installment Payment</h2>
          <button onclick="closeInstallmentPaymentModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
        </div>
        <form onsubmit="submitInstallmentPayment(event, ${Number(
          invoiceId
        )}, ${safeBalance}, ${Number(customerId || 0)})" class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
            <input type="number" id="installment-payment-amount" min="0.01" max="${safeBalance.toFixed(
              2
            )}" step="0.01" value="${safeBalance.toFixed(
      2
    )}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
            <p class="text-xs text-gray-500 mt-1">Remaining balance: Rs.${safeBalance.toLocaleString()}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select id="installment-payment-type" onchange="toggleInstallmentBankAccount()" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select payment method</option>
              ${options}
            </select>
          </div>
          <div id="installment-bank-account-wrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
            <select id="installment-bank-account" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Select bank account</option>
              ${bankOptions}
            </select>
          </div>
          <div id="installment-cheque-wrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Cheque Number *</label>
            <input type="text" id="installment-cheque-number" maxlength="50" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. 123456"/>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" id="installment-payment-note" maxlength="150" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Optional" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" onclick="closeInstallmentPaymentModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Payment</button>
          </div>
        </form>
      </div>
    </div>`;

    const div = document.createElement("div");
    div.id = "installment-payment-modal";
    div.innerHTML = html;
    document.body.appendChild(div);
    feather.replace();
  } catch (err) {
    showNotification("Failed to load payment options: " + err.message, "error");
  }
}

function toggleInstallmentBankAccount() {
  const select = document.getElementById("installment-payment-type");
  const wrap = document.getElementById("installment-bank-account-wrap");
  const chqWrap = document.getElementById("installment-cheque-wrap");
  const bankSelect = document.getElementById("installment-bank-account");
  const chqInput = document.getElementById("installment-cheque-number");
  if (!select || !wrap || !bankSelect) return;

  const selectedText = (
    select.options[select.selectedIndex]?.text || ""
  ).trim();
  const isBt = /^bank\s*transfer$/i.test(selectedText);
  const isChq = /^cheque$/i.test(selectedText);
  const needsBank = isBt || isChq;
  wrap.classList.toggle("hidden", !needsBank);
  bankSelect.required = needsBank;
  if (chqWrap) chqWrap.classList.toggle("hidden", !isChq);
  if (chqInput) {
    chqInput.required = isChq;
    if (!isChq) chqInput.value = "";
  }
  if (!needsBank) bankSelect.value = "";
}

async function submitInstallmentPayment(
  event,
  invoiceId,
  maxBalance,
  customerId
) {
  event.preventDefault();
  const amount = Number(
    document.getElementById("installment-payment-amount")?.value || 0
  );
  const paymentTypeId = Number(
    document.getElementById("installment-payment-type")?.value || 0
  );
  const bankAccountId = Number(
    document.getElementById("installment-bank-account")?.value || 0
  );
  const payTypeName = (
    document.getElementById("installment-payment-type")?.options[
      document.getElementById("installment-payment-type")?.selectedIndex
    ]?.text || ""
  ).trim();
  const isBt = /^bank\s*transfer$/i.test(payTypeName);
  const isChq = /^cheque$/i.test(payTypeName);
  const chq = String(
    document.getElementById("installment-cheque-number")?.value || ""
  ).trim();
  const note = document.getElementById("installment-payment-note")?.value || "";

  if (!amount || amount <= 0) {
    showNotification("Enter a valid payment amount", "warning");
    return;
  }

  if (amount > Number(maxBalance || 0)) {
    showNotification("Amount cannot exceed remaining balance", "warning");
    return;
  }

  if (!paymentTypeId) {
    showNotification("Select a payment method", "warning");
    return;
  }
  if ((isBt || isChq) && !bankAccountId) {
    showNotification("Select a bank account", "warning");
    return;
  }
  if (isChq && !chq) {
    showNotification("Enter the cheque number", "warning");
    return;
  }

  try {
    await apiFetch(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        paymentTypeId,
        bankAccountId: bankAccountId || null,
        chequeNumber: isChq ? chq : null,
        note,
      }),
    });

    closeInstallmentPaymentModal();
    showNotification("Installment payment recorded", "success");

    if (currentCustomerManagementTab === "installments") {
      if (typeof loadCustomerInstallments === "function") {
        loadCustomerInstallments();
      }
    }

    if (Number(customerId || 0) > 0) {
      const activeTab = document
        .getElementById("customer-details-tab-credit")
        ?.classList.contains("border-blue-500")
        ? "credit"
        : document
            .getElementById("customer-details-tab-repairs")
            ?.classList.contains("border-blue-500")
        ? "repairs"
        : "purchases";

      closePOSCustomerDetailsOverlay();
      await viewPosCustomerDetails(Number(customerId), activeTab);
    }
  } catch (err) {
    showNotification("Failed to record payment: " + err.message, "error");
  }
}

function closeInstallmentPaymentModal() {
  document.getElementById("installment-payment-modal")?.remove();
}

async function editPosCustomerDetails(customerId) {
  try {
    const res = await apiFetch(`/customers/${customerId}`);
    const c = res.data;

    const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closePosEditCustomerModal()">
      <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4" onclick="event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800">Edit Customer</h2>
          <button onclick="closePosEditCustomerModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
        </div>
        <form onsubmit="savePosCustomerEdit(event, ${c.id})" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" id="ecust-name" value="${escHtml(
                c.name
              )}" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="tel" id="ecust-phone" value="${escHtml(
                c.phone || ""
              )}" required pattern="0[0-9]{9}" minlength="10" maxlength="10" inputmode="numeric"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="ecust-email" value="${escHtml(
                c.email || ""
              )}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
            <div class="col-span-2"><label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" id="ecust-address" value="${escHtml(
                c.address || ""
              )}"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/></div>
          </div>
          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="closePosEditCustomerModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Changes</button>
          </div>
        </form>
      </div>
    </div>`;

    const div = document.createElement("div");
    div.id = "edit-customer-modal";
    div.innerHTML = html;
    document.body.appendChild(div);
    feather.replace();
  } catch (err) {
    showNotification("Failed to load customer: " + err.message, "error");
  }
}

function closePosEditCustomerModal() {
  document.getElementById("edit-customer-modal")?.remove();
}

async function savePosCustomerEdit(event, customerId) {
  event.preventDefault();
  const name = document.getElementById("ecust-name").value.trim();
  const phone = document.getElementById("ecust-phone").value.trim();
  const email = document.getElementById("ecust-email").value.trim();
  const address = document.getElementById("ecust-address").value.trim();

  if (!/^0\d{9}$/.test(phone)) {
    showNotification(
      "Mobile number must be exactly 10 digits and start with 0",
      "warning"
    );
    document.getElementById("ecust-phone")?.focus();
    return;
  }

  try {
    await apiFetch(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({
        name,
        mobileNumber: phone,
        email: email || null,
        address: address || null,
      }),
    });
    closePosEditCustomerModal();
    showNotification(`Customer "${name}" updated successfully`, "success");
    if (typeof loadCustomersData === "function") loadCustomersData();
  } catch (err) {
    showNotification("Failed to update customer: " + err.message, "error");
  }
}

// ─── Return Table ─────────────────────────────────────────────────────────────
async function loadReturnTable() {
  const tbody = document.getElementById("return-table-body");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">Loading returns...</td></tr>';

  try {
    const search = document.getElementById("return-search-input")?.value || "";
    const status = document.getElementById("return-status-filter")?.value || "";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const res = await apiFetch(`/invoices/returns?${params}`);
    renderReturnTable(res.data || []);
  } catch (err) {
    console.error("loadReturnTable error:", err);
    tbody.innerHTML =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">Failed to load returns</td></tr>';
  }
}

function renderReturnTable(returns) {
  const tbody = document.getElementById("return-table-body");
  if (!tbody) return;

  if (!returns.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400">No returns found</td></tr>';
    return;
  }

  const statusColors = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };

  tbody.innerHTML = returns
    .map(
      (r) => `<tr class="hover:bg-gray-50">
    <td class="px-4 py-3 text-sm font-medium text-gray-900">${escHtml(
      r.returnNumber
    )}</td>
    <td class="px-4 py-3 text-sm text-gray-700">${escHtml(
      r.invoiceNumber || "—"
    )}</td>
    <td class="px-4 py-3 text-sm text-gray-700">${escHtml(
      r.customerName || "Walk-in"
    )}</td>
    <td class="px-4 py-3 text-sm text-gray-700">Rs.${Number(
      r.totalAmount
    ).toLocaleString()}</td>
    <td class="px-4 py-3"><span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
      statusColors[r.status] || "bg-gray-100 text-gray-800"
    }">${escHtml(r.status)}</span></td>
    <td class="px-4 py-3">
      <div class="flex space-x-1">
        <button onclick="viewReturnDetails(${
          r.id
        })" class="text-blue-600 hover:text-blue-800 p-1" title="View">
          <i data-feather="eye" class="w-4 h-4"></i>
        </button>
        ${
          r.status === "Pending"
            ? `<button onclick="processReturnAction(${r.id}, 'Approved')" class="text-green-600 hover:text-green-800 p-1" title="Approve"><i data-feather="check" class="w-4 h-4"></i></button>
               <button onclick="processReturnAction(${r.id}, 'Rejected')" class="text-red-600 hover:text-red-800 p-1" title="Reject"><i data-feather="x" class="w-4 h-4"></i></button>`
            : ""
        }
        ${
          r.status === "Approved"
            ? `<button onclick="processReturnAction(${r.id}, 'Completed')" class="text-purple-600 hover:text-purple-800 p-1" title="Complete"><i data-feather="check-circle" class="w-4 h-4"></i></button>`
            : ""
        }
      </div>
    </td>
  </tr>`
    )
    .join("");
  feather.replace();
}

function handleReturnSearch() {
  loadReturnTable();
}

async function processReturnAction(returnId, newStatus) {
  try {
    await apiFetch(`/invoices/returns/${returnId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    showNotification(`Return status updated to ${newStatus}`, "success");
    loadReturnTable();
  } catch (err) {
    showNotification("Failed to update return: " + err.message, "error");
  }
}

async function viewReturnDetails(returnId) {
  try {
    const res = await apiFetch(`/invoices/returns/${returnId}`);
    const r = res.data;

    const itemsHtml = (r.items || [])
      .map(
        (it) => `<tr>
        <td class="px-3 py-2 text-sm">${escHtml(it.productName)}</td>
        <td class="px-3 py-2 text-sm text-center">${it.quantity}</td>
        <td class="px-3 py-2 text-sm text-right">Rs.${Number(
          it.unitPrice
        ).toLocaleString()}</td>
        <td class="px-3 py-2 text-sm text-right">Rs.${Number(
          it.subtotal
        ).toLocaleString()}</td>
      </tr>`
      )
      .join("");

    const statusClassMap = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
    };
    const statusClass =
      statusClassMap[r.status] || "bg-gray-100 text-gray-800";

    const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeReturnDetailsModal()">
      <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-800">Return Details</h2>
          <button onclick="closeReturnDetailsModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
        </div>
        <div class="flex items-center justify-between pb-3 border-b mb-4">
          <div>
            <h3 class="text-lg font-semibold">${escHtml(r.returnNumber)}</h3>
            <p class="text-sm text-gray-500">Invoice: ${escHtml(
              r.invoiceNumber || "—"
            )} | Customer: ${escHtml(r.customerName || "Walk-in")}</p>
          </div>
          <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusClass}">${escHtml(
      r.status
    )}</span>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div><span class="text-gray-500">Reason:</span> <span class="font-medium">${escHtml(
            r.reason
          )}</span></div>
          <div><span class="text-gray-500">Total:</span> <span class="font-bold text-red-600">Rs.${Number(
            r.totalAmount
          ).toLocaleString()}</span></div>
          <div><span class="text-gray-500">Date:</span> <span>${new Date(
            r.createdAt
          ).toLocaleDateString()}</span></div>
          ${
            r.notes
              ? `<div class="col-span-2"><span class="text-gray-500">Notes:</span> <span>${escHtml(
                  r.notes
                )}</span></div>`
              : ""
          }
        </div>
        <table class="w-full text-sm mb-4">
          <thead><tr class="bg-gray-50"><th class="px-3 py-2 text-left">Product</th><th class="px-3 py-2 text-center">Qty</th><th class="px-3 py-2 text-right">Unit Price</th><th class="px-3 py-2 text-right">Subtotal</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="flex justify-end space-x-3">
          <button onclick="closeReturnDetailsModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
          ${
            r.status === "Pending"
              ? `<button onclick="closeReturnDetailsModal(); processReturnAction(${r.id}, 'Rejected')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Reject</button>
                 <button onclick="closeReturnDetailsModal(); processReturnAction(${r.id}, 'Approved')" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">Approve</button>`
              : ""
          }
          ${
            r.status === "Approved"
              ? `<button onclick="closeReturnDetailsModal(); processReturnAction(${r.id}, 'Completed')" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Complete</button>`
              : ""
          }
        </div>
      </div>
    </div>`;

    const div = document.createElement("div");
    div.id = "return-details-modal";
    div.innerHTML = html;
    document.body.appendChild(div);
    feather.replace();
  } catch (err) {
    showNotification("Failed to load return: " + err.message, "error");
  }
}

function closeReturnDetailsModal() {
  document.getElementById("return-details-modal")?.remove();
}

// New Return Modal
function openNewReturnForm() {
  const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeNewReturnModalBackdrop(event)">
    <div class="bg-white rounded-xl p-8 w-[75vw] max-w-5xl min-h-[80vh] max-h-[95vh] overflow-y-auto" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800">Create New Return</h2>
        <button onclick="closeNewReturnModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
      </div>
      <form onsubmit="saveNewReturn(event)" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Invoice Number or Customer *</label>
          <div class="relative">
            <input type="text" id="return-invoice-search" placeholder="Search by invoice number or customer..."
              oninput="debouncedSearchInvoicesForReturn()" autocomplete="off" required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
            <div id="invoice-dropdown" class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto hidden"></div>
          </div>
          <input type="hidden" id="selected-invoice-id">
        </div>
        <div id="selected-invoice-info" class="hidden bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-sm font-medium text-blue-900">Invoice: <span id="display-invoice-number"></span></p>
              <p class="text-sm text-blue-700">Customer: <span id="display-customer-name"></span></p>
              <p class="text-sm text-blue-700">Date: <span id="display-invoice-date"></span></p>
            </div>
            <button type="button" onclick="clearSelectedInvoice()" class="text-blue-600 hover:text-blue-800 text-sm">Change</button>
          </div>
        </div>
        <div id="invoice-items-section" class="hidden">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select Items to Return</label>
          <div class="border border-gray-300 rounded-lg divide-y max-h-64 overflow-y-auto" id="invoice-items-list"></div>
          <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between">
            <span class="text-sm font-medium text-gray-700">Return Total:</span>
            <span id="return-total-amount" class="text-lg font-bold text-blue-600">Rs. 0</span>
          </div>
        </div>
        <div id="return-details-section" class="hidden space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Return Reason *</label>
              <select id="return-reason" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Select Reason</option>
                <option value="Defective">Defective</option>
                <option value="Changed Mind">Changed Mind</option>
                <option value="Wrong Item">Wrong Item</option>
                <option value="Not as Described">Not as Described</option>
                <option value="Damaged">Damaged</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select id="return-status" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea id="return-notes" rows="3" placeholder="Additional details..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>
        <div class="flex justify-end space-x-3 pt-4">
          <button type="button" onclick="closeNewReturnModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
          <button type="submit" id="submit-return-btn" disabled class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">Create Return</button>
        </div>
      </form>
    </div>
  </div>`;

  const div = document.createElement("div");
  div.id = "new-return-modal";
  div.innerHTML = html;
  document.body.appendChild(div);
  feather.replace();
}

function closeNewReturnModal() {
  document.getElementById("new-return-modal")?.remove();
}
function closeNewReturnModalBackdrop(event) {
  if (event.target === event.currentTarget) closeNewReturnModal();
}

// Invoice search for return
let returnInvoicesCache = [];

function debouncedSearchInvoicesForReturn() {
  if (!searchInvoicesForReturnDebounced) {
    searchInvoicesForReturnDebounced = debounce(searchInvoicesForReturn, 300);
  }
  searchInvoicesForReturnDebounced();
}

async function searchInvoicesForReturn() {
  const term = document.getElementById("return-invoice-search")?.value.trim();
  const dropdown = document.getElementById("invoice-dropdown");
  if (!dropdown) return;

  if (!term || term.length < 2) {
    dropdown.classList.add("hidden");
    return;
  }

  try {
    const res = await apiFetch(`/invoices?search=${encodeURIComponent(term)}`);
    returnInvoicesCache = res.data || [];

    if (!returnInvoicesCache.length) {
      dropdown.innerHTML =
        '<div class="px-4 py-3 text-sm text-gray-500 text-center">No invoices found</div>';
      dropdown.classList.remove("hidden");
      return;
    }

    dropdown.innerHTML = returnInvoicesCache
      .map(
        (
          inv
        ) => `<div class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
          onmousedown="event.preventDefault(); selectInvoiceForReturn(${
            inv.id
          })">
          <div class="flex justify-between">
            <div>
              <p class="text-sm font-medium">${escHtml(inv.invoiceNumber)}</p>
              <p class="text-xs text-gray-500">${escHtml(
                inv.customerName || "Walk-in"
              )}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium">Rs.${Number(
                inv.totalAmount
              ).toLocaleString()}</p>
              <p class="text-xs text-gray-400">${new Date(
                inv.createdAt
              ).toLocaleDateString()}</p>
            </div>
          </div>
        </div>`
      )
      .join("");
    dropdown.classList.remove("hidden");
  } catch (err) {
    dropdown.innerHTML =
      '<div class="px-4 py-3 text-sm text-red-500">Failed to search invoices</div>';
    dropdown.classList.remove("hidden");
  }
}

async function selectInvoiceForReturn(invoiceId) {
  const invoice = returnInvoicesCache.find((inv) => inv.id === invoiceId);
  if (!invoice) return;

  document.getElementById("invoice-dropdown")?.classList.add("hidden");
  document.getElementById("selected-invoice-id").value = invoiceId;
  document.getElementById("return-invoice-search").value =
    invoice.invoiceNumber;
  document.getElementById("display-invoice-number").textContent =
    invoice.invoiceNumber;
  document.getElementById("display-customer-name").textContent =
    invoice.customerName || "Walk-in";
  document.getElementById("display-invoice-date").textContent = new Date(
    invoice.createdAt
  ).toLocaleDateString();
  document.getElementById("selected-invoice-info")?.classList.remove("hidden");

  // Load invoice items
  loadInvoiceItemsForReturn(invoice);
  document.getElementById("invoice-items-section")?.classList.remove("hidden");
  document.getElementById("return-details-section")?.classList.remove("hidden");
  document.getElementById("submit-return-btn").disabled = true;
}

function loadInvoiceItemsForReturn(invoice) {
  const list = document.getElementById("invoice-items-list");
  if (!list) return;

  list.innerHTML = (invoice.items || [])
    .map(
      (item, idx) => `<div class="p-3 hover:bg-gray-50">
      <div class="flex items-start gap-3">
        <input type="checkbox" class="return-item-checkbox w-4 h-4 mt-1 text-blue-600 rounded"
          data-stock-id="${escAttr(item.stockId)}"
          data-product-name="${escAttr(item.productName)}"
          data-max-quantity="${item.quantity}"
          data-unit-price="${item.unitPrice}"
          onchange="updateReturnTotal()"/>
        <div class="flex-1">
          <div class="flex justify-between gap-3">
            <div>
              <p class="text-sm font-medium">${escHtml(item.productName)}${
        item.variantName ? ` (${escHtml(item.variantName)})` : ""
      }</p>
              <p class="text-xs text-gray-500">Sold: ${
                item.quantity
              } × Rs.${Number(item.unitPrice).toLocaleString()}</p>
            </div>
            <p class="text-sm font-semibold whitespace-nowrap">Rs.${Number(
              item.subtotal
            ).toLocaleString()}</p>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <label class="text-xs text-gray-600">Return qty</label>
            <input type="number" min="1" max="${item.quantity}" value="${
        item.quantity
      }"
              class="return-item-qty w-20 px-2 py-1 text-sm border border-gray-300 rounded"
              data-idx="${idx}"
              oninput="updateReturnTotal()"/>
          </div>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function clearSelectedInvoice() {
  document.getElementById("selected-invoice-id").value = "";
  document.getElementById("return-invoice-search").value = "";
  document.getElementById("selected-invoice-info")?.classList.add("hidden");
  document.getElementById("invoice-items-section")?.classList.add("hidden");
  document.getElementById("return-details-section")?.classList.add("hidden");
  document.getElementById("invoice-items-list").innerHTML = "";
  document.getElementById("submit-return-btn").disabled = true;
}

function updateReturnTotal() {
  const boxes = document.querySelectorAll(".return-item-checkbox:checked");
  let total = 0;
  let valid = true;
  boxes.forEach((cb) => {
    const row = cb.closest(".p-3") || cb.parentElement;
    const qtyInput = row?.querySelector(".return-item-qty");
    const maxQty = parseInt(cb.dataset.maxQuantity) || 0;
    let qty = parseInt(qtyInput?.value) || 0;
    if (qty < 1 || qty > maxQty) {
      valid = false;
      qty = Math.min(Math.max(qty, 1), maxQty || 1);
      if (qtyInput) qtyInput.value = String(qty);
    }
    total += qty * Number(cb.dataset.unitPrice);
  });
  const totalEl = document.getElementById("return-total-amount");
  if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
  const btn = document.getElementById("submit-return-btn");
  if (btn) btn.disabled = boxes.length === 0 || !valid;
}

async function saveNewReturn(event) {
  event.preventDefault();

  const invoiceId = document.getElementById("selected-invoice-id")?.value;
  if (!invoiceId) {
    showNotification("Please select an invoice", "error");
    return;
  }

  const boxes = document.querySelectorAll(".return-item-checkbox:checked");
  if (!boxes.length) {
    showNotification("Please select at least one item", "error");
    return;
  }

  const reason = document.getElementById("return-reason").value;
  const status = document.getElementById("return-status").value;
  const notes = document.getElementById("return-notes").value;

  const items = [];
  for (const cb of boxes) {
    const row = cb.closest(".p-3") || cb.parentElement;
    const qtyInput = row?.querySelector(".return-item-qty");
    const maxQty = parseInt(cb.dataset.maxQuantity) || 0;
    const qty = parseInt(qtyInput?.value) || 0;
    if (qty < 1 || qty > maxQty) {
      showNotification(
        `Return qty must be between 1 and ${maxQty} for selected items`,
        "error"
      );
      return;
    }
    items.push({
      stockId: cb.dataset.stockId,
      quantity: qty,
      unitPrice: Number(cb.dataset.unitPrice),
    });
  }

  try {
    const res = await apiFetch("/invoices/returns", {
      method: "POST",
      body: JSON.stringify({
        invoiceId: parseInt(invoiceId),
        items,
        reason,
        status,
        notes,
      }),
    });
    closeNewReturnModal();
    loadReturnTable();
    showNotification(
      `Return ${res.data.returnNumber} created successfully`,
      "success"
    );
  } catch (err) {
    showNotification("Failed to create return: " + err.message, "error");
  }
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
function addProductToCart(product) {
  if (product.stock <= 0) {
    showNotification("Product is out of stock", "error");
    return;
  }

  // Ensure shop tab is active
  if (currentPOSTab !== "shop") switchPOSTab("shop");

  const existing = cart.find(
    (item) => item.type === "product" && item.id === product.id
  );

  if (existing) {
    const totalInCart = existing.quantity;
    if (totalInCart >= product.stock) {
      showNotification("Maximum stock reached", "warning");
      return;
    }
    existing.quantity++;
    existing.total = existing.quantity * existing.price;
  } else {
    cart.push({
      id: product.id,
      variantId: product.variantId || product.id,
      type: "product",
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      stock: product.stock,
      total: Number(product.price),
      warrantyLabel: product.warrantyLabel || null,
    });
  }

  updateCartDisplay();
  updateTotals();
  showNotification(`${product.name} added to cart`, "success");
}

function addToCart(product) {
  addProductToCart(product);
}

function addRepairToCart(repairId) {
  showNotification(
    "Use the Repair module to manage repair invoices and payments. Repairs cannot be mixed into the product cart.",
    "warning"
  );
}

function viewRepairInvoice(repairId) {
  if (typeof openRepairInvoiceModal === "function") {
    openRepairInvoiceModal(Number(repairId) || repairId);
    return;
  }
  showNotification(
    "Open the Repair tab to view and manage repair invoices.",
    "info"
  );
}

function removeFromCart(itemId) {
  cart = cart.filter((item) => String(item.id) !== String(itemId));
  updateCartDisplay();
  updateTotals();
}

function updateQuantity(itemId, newQty) {
  const item = cart.find((i) => String(i.id) === String(itemId));
  if (!item) return;

  const qty = parseInt(newQty);
  if (isNaN(qty) || qty < 1) {
    removeFromCart(itemId);
    return;
  }

  if (item.type === "product" && qty > item.stock) {
    showNotification(`Only ${item.stock} units in stock`, "warning");
    return;
  }

  item.quantity = qty;
  item.total = item.price * qty;
  updateCartDisplay();
  updateTotals();
}

function updateCartDisplay() {
  const container = document.getElementById("cart-items");
  if (!container) return;

  if (!cart.length) {
    container.innerHTML =
      '<div class="text-center py-8 text-gray-400"><i data-feather="shopping-cart" class="w-12 h-12 mx-auto mb-2 opacity-50"></i><p>Cart is empty</p></div>';
    feather.replace();
    updateTotals();
    return;
  }

  container.innerHTML = cart.map((item) => createCartItemHTML(item)).join("");
  feather.replace();
}

function createCartItemHTML(item) {
  if (item.type === "repair") {
    return `<div class="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg mb-2">
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">${escHtml(
          item.name
        )}</p>
        <p class="text-xs text-gray-500">${escHtml(
          item.customer || ""
        )} • Repair</p>
        <button onclick="viewRepairInvoice('${
          item.repairId
        }')" class="text-xs text-blue-600 hover:underline">View Invoice</button>
      </div>
      <div class="text-right">
        <p class="text-sm font-bold text-gray-900">Rs.${Number(
          item.price
        ).toLocaleString()}</p>
        <button onclick="removeFromCart('${
          item.id
        }')" class="text-red-500 hover:text-red-700 mt-1">
          <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>`;
  }

  return `<div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg mb-2">
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-gray-900 truncate">${escHtml(
        item.name
      )}</p>
      ${
        item.warrantyLabel
          ? `<p class="text-xs text-gray-500">Warranty: ${escHtml(
              item.warrantyLabel
            )}</p>`
          : ""
      }
      <p class="text-xs text-gray-500">Rs.${Number(
        item.price
      ).toLocaleString()} each</p>
      <div class="flex items-center mt-1 space-x-2">
        <button onclick="updateQuantity('${item.id}', ${
    item.quantity - 1
  })" class="w-6 h-6 bg-gray-200 rounded text-gray-700 flex items-center justify-center hover:bg-gray-300 text-base font-bold leading-none">−</button>
        <input type="number" value="${item.quantity}" min="1" max="${
    item.stock
  }"
          onchange="updateQuantity('${item.id}', this.value)"
          class="w-12 text-center border border-gray-300 rounded text-sm py-0.5"/>
        <button onclick="updateQuantity('${item.id}', ${
    item.quantity + 1
  })" class="w-6 h-6 bg-gray-200 rounded text-gray-700 flex items-center justify-center hover:bg-gray-300 text-base font-bold leading-none">+</button>
      </div>
    </div>
    <div class="text-right">
      <p class="text-sm font-bold text-gray-900">Rs.${Number(
        item.total || item.price * item.quantity
      ).toLocaleString()}</p>
      <button onclick="removeFromCart('${
        item.id
      }')" class="text-red-500 hover:text-red-700 mt-1">
        <i data-feather="trash-2" class="w-4 h-4"></i>
      </button>
    </div>
  </div>`;
}

function clearCart() {
  cart = [];
  currentCustomer = null;
  currentSale = { customer: null };
  const csrch = document.getElementById("customer-search");
  if (csrch) csrch.value = "";
  const hid = document.getElementById("selected-customer-id");
  if (hid) hid.value = "";
  const custDisplay = document.getElementById("selected-customer-display");
  if (custDisplay) {
    custDisplay.textContent = "";
    custDisplay.classList.add("hidden");
  }
  const discInput = document.getElementById("discount-input");
  if (discInput) discInput.value = "";
  const cashInput = document.getElementById("cash-received");
  if (cashInput) cashInput.value = "";
  const bankAcc = document.getElementById("pos-bank-account");
  if (bankAcc) bankAcc.value = "";
  const posChqEl = document.getElementById("pos-cheque-number");
  if (posChqEl) posChqEl.value = "";
  const creditToggle = document.getElementById("credit-sale-toggle");
  if (creditToggle) creditToggle.checked = false;
  const paidNowInput = document.getElementById("amount-paid-now");
  if (paidNowInput) paidNowInput.value = "";
  isCreditSale = false;
  toggleCreditSale();
  selectPaymentMethod("cash");
  if (canOverrideInvoiceDate()) resetAdminInvoiceDateField();
  updateCartDisplay();
  updateTotals();
}

// ─── Totals ───────────────────────────────────────────────────────────────────
function updateTotals() {
  const subtotal = cart.reduce((sum, item) => {
    return sum + (Number(item.total) || Number(item.price) * item.quantity);
  }, 0);

  const discInput = document.getElementById("discount-input");
  const discType = document.getElementById("discount-type");
  let discount = 0;

  if (discInput && discInput.value) {
    const discVal = parseFloat(discInput.value) || 0;
    const dtype = discType ? discType.value : "percentage";
    if (dtype === "percentage") {
      discount = (subtotal * Math.min(discVal, 100)) / 100;
    } else {
      discount = Math.min(discVal, subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount);

  const subtotalEl = document.getElementById("subtotal");
  if (subtotalEl) subtotalEl.textContent = `Rs.${subtotal.toLocaleString()}`;

  const discountEl = document.getElementById("discount-amount");
  if (discountEl) discountEl.textContent = `-Rs.${discount.toLocaleString()}`;

  const totalEl = document.getElementById("total");
  if (totalEl) totalEl.textContent = `Rs.${total.toLocaleString()}`;

  const totalEditable = document.getElementById("total-editable");
  if (totalEditable) totalEditable.value = total.toFixed(2);

  calculateChange();
  updateCreditPreview();
}

function getDisplayedTotalAmount() {
  const totalEl = document.getElementById("total");
  return totalEl
    ? parseFloat(totalEl.textContent.replace("Rs.", "").replace(/,/g, "")) || 0
    : 0;
}

function toggleCreditSale() {
  isCreditSale = !!document.getElementById("credit-sale-toggle")?.checked;
  const section = document.getElementById("credit-sale-section");
  if (section) section.classList.toggle("hidden", !isCreditSale);
  if (isCreditSale) {
    selectPaymentMethod("cash");
  } else {
    selectPaymentMethod(currentPaymentMethod);
  }

  if (isCreditSale) {
    const total = getDisplayedTotalAmount();
    const paidNowInput = document.getElementById("amount-paid-now");
    const cashReceived =
      parseFloat(document.getElementById("cash-received")?.value || "0") || 0;
    const suggested =
      currentPaymentMethod === "cash" && cashReceived > 0 && cashReceived < total
        ? cashReceived
        : 0;
    if (paidNowInput) {
      paidNowInput.value = suggested.toFixed(2);
    }
  }

  updateCreditPreview();
}

function updateCreditPreview() {
  const hint = document.getElementById("credit-balance-preview");
  if (!hint) return;

  if (!isCreditSale) {
    hint.textContent = "";
    return;
  }

  const total = getDisplayedTotalAmount();
  const paid =
    parseFloat(document.getElementById("amount-paid-now")?.value || "0") || 0;
  const balance = Math.max(0, total - paid);
  hint.textContent = `Balance after sale: Rs.${balance.toLocaleString()}`;
}

function calculateChange() {
  const totalEl = document.getElementById("total");
  const total = totalEl
    ? parseFloat(totalEl.textContent.replace("Rs.", "").replace(/,/g, "")) || 0
    : 0;
  const cashInput = document.getElementById("cash-received");
  const cashReceived = cashInput ? parseFloat(cashInput.value) || 0 : 0;
  const change = Math.max(0, cashReceived - total);
  const changeEl = document.getElementById("change");
  if (changeEl) changeEl.textContent = `Rs.${change.toLocaleString()}`;
}

function handleManualTotalChange() {
  const totalEditable = document.getElementById("total-editable");
  const subtotal = cart.reduce((sum, item) => {
    return sum + (Number(item.total) || Number(item.price) * item.quantity);
  }, 0);

  let manualTotal = parseFloat(totalEditable?.value);
  if (Number.isNaN(manualTotal) || manualTotal < 0) manualTotal = 0;
  manualTotal = Math.min(manualTotal, subtotal);

  const discountAmount = Math.max(0, subtotal - manualTotal);
  const discType = document.getElementById("discount-type");
  const discInput = document.getElementById("discount-input");
  if (discType) discType.value = "fixed";
  if (discInput) discInput.value = discountAmount.toFixed(2);

  // Recompute from discount so payload and displays stay in sync
  updateTotals();
}

function selectPaymentMethod(method) {
  if (isCreditSale && method !== "cash") {
    showNotification(
      "Credit sales use cash only for the amount paid now.",
      "warning"
    );
    method = "cash";
  }
  currentPaymentMethod = method;
  const cashBtn = document.getElementById("pay-cash-btn");
  const chequeBtn = document.getElementById("pay-cheque-btn");
  const bankBtn = document.getElementById("pay-bank-transfer-btn");
  const cashSection = document.getElementById("cash-section");
  const bankSection = document.getElementById("bank-transfer-section");
  const posChequeWrap = document.getElementById("pos-cheque-number-wrap");

  const buttons = [
    { el: cashBtn, key: "cash" },
    { el: chequeBtn, key: "cheque" },
    { el: bankBtn, key: "bank_transfer" },
  ];
  buttons.forEach(({ el, key }) => {
    if (!el) return;
    const active = method === key;
    el.classList.toggle("active", active);
    const lock = isCreditSale && key !== "cash";
    el.disabled = lock;
    el.setAttribute("aria-disabled", lock ? "true" : "false");
    el.classList.toggle("opacity-50", lock);
    el.classList.toggle("pointer-events-none", lock);
    el.classList.toggle("cursor-not-allowed", lock);
  });

  if (cashSection)
    cashSection.classList.toggle("hidden", method !== "cash" || isCreditSale);
  if (bankSection) {
    const needBank = method === "bank_transfer" || method === "cheque";
    bankSection.classList.toggle("hidden", !needBank);
  }
  if (posChequeWrap) {
    posChequeWrap.classList.toggle("hidden", method !== "cheque");
  }

  updateCreditPreview();
}

// ─── Customer Search (Cart) ───────────────────────────────────────────────────
async function handleCartCustomerSearch() {
  const input = document.getElementById("customer-search");
  const resultsDiv = document.getElementById("customer-results");
  if (!input || !resultsDiv) return;

  const term = input.value.trim();
  if (term.length < 1) {
    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");
    return;
  }

  try {
    const res = await apiFetch(`/customers?search=${encodeURIComponent(term)}`);
    const customers = res.data || [];

    if (!customers.length) {
      resultsDiv.innerHTML =
        '<div class="p-2 text-gray-500 text-sm">No customers found</div>';
      resultsDiv.classList.remove("hidden");
      return;
    }

    resultsDiv.innerHTML = customers
      .map(
        (
          c
        ) => `<div class="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
          data-customer-id="${escAttr(String(c.id))}"
          onmousedown="event.preventDefault(); selectCustomerById(this.dataset.customerId)">
          <div class="font-medium text-gray-900 text-sm">${escHtml(
            c.name
          )}</div>
          <div class="text-xs text-gray-500">${escHtml(c.phone || "")}${
          c.email ? " • " + escHtml(c.email) : ""
        }</div>
        </div>`
      )
      .join("");
    customersCache = customers;
    resultsDiv.classList.remove("hidden");
  } catch (err) {
    resultsDiv.innerHTML =
      '<div class="p-2 text-red-500 text-sm">Search failed</div>';
    resultsDiv.classList.remove("hidden");
  }
}

function selectCustomerById(customerId) {
  const c =
    (customersCache || []).find((x) => String(x.id) === String(customerId)) ||
    null;
  if (!c) {
    showNotification("Customer not found", "error");
    return;
  }
  selectCustomer(
    c.id,
    c.name,
    c.phone || c.mobileNumber || "",
    c.email || ""
  );
}

function selectCustomer(id, name, phone, email) {
  currentCustomer = { id, name, phone, email };
  currentSale.customer = currentCustomer;
  const input = document.getElementById("customer-search");
  if (input) input.value = name;
  const hidden = document.getElementById("selected-customer-id");
  if (hidden) hidden.value = id;
  const results = document.getElementById("customer-results");
  if (results) results.classList.add("hidden");
  const display = document.getElementById("selected-customer-display");
  if (display) {
    display.textContent = phone
      ? `Selected: ${name} (${phone})`
      : `Selected: ${name}`;
    display.classList.remove("hidden");
  }
}

// ─── New Customer (shop cart — do not shadow customers.js addNewCustomer) ───
function openShopAddCustomerModal() {
  document.getElementById("add-customer-modal")?.classList.remove("hidden");
}

function closePOSCartAddCustomerModal() {
  document.getElementById("add-customer-modal")?.classList.add("hidden");
  const nm = document.getElementById("customer-name");
  const ph = document.getElementById("customer-phone");
  const em = document.getElementById("customer-email");
  const ad = document.getElementById("customer-address");
  if (nm) nm.value = "";
  if (ph) ph.value = "";
  if (em) em.value = "";
  if (ad) ad.value = "";
}

async function saveNewCustomer(event) {
  event.preventDefault();
  const name = document.getElementById("customer-name").value.trim();
  const phone = document.getElementById("customer-phone").value.trim();
  const email = document.getElementById("customer-email").value.trim();
  const address =
    document.getElementById("customer-address")?.value.trim() || "";

  if (!/^0\d{9}$/.test(phone)) {
    showNotification(
      "Mobile number must be exactly 10 digits and start with 0",
      "warning"
    );
    document.getElementById("customer-phone")?.focus();
    return;
  }

  try {
    const res = await apiFetch("/customers", {
      method: "POST",
      body: JSON.stringify({ name, mobileNumber: phone, email, address }),
    });
    const newCustomer = res.data;
    closePOSCartAddCustomerModal();
    if (!newCustomer?.id) {
      showNotification("Customer added", "success");
      return;
    }
    showNotification(`Customer "${newCustomer.name}" added`, "success");

    // Auto-select the new customer in cart
    selectCustomer(
      newCustomer.id,
      newCustomer.name,
      newCustomer.phone || newCustomer.mobileNumber || "",
      newCustomer.email || ""
    );

    // Refresh customer tab if active
    if (currentPOSTab === "customer" && typeof loadCustomersData === "function") {
      loadCustomersData();
    }
  } catch (err) {
    showNotification("Failed to add customer: " + err.message, "error");
  }
}

// ─── Payment Processing ───────────────────────────────────────────────────────
async function processPayment() {
  if (isProcessingSale) return;

  if (!hasPermission("pos")) {
    showNotification("You do not have permission to process payments", "error");
    return;
  }
  if (!cart.length) {
    showNotification("Cart is empty", "error");
    return;
  }

  const _custIdVal = document.getElementById("selected-customer-id")?.value;
  if (!currentCustomer && !_custIdVal) {
    showNotification(
      "Please select a customer before completing the sale",
      "warning"
    );
    return;
  }

  // Only product items go as invoice items; repair items are separate
  const productItems = cart.filter((item) => item.type === "product");
  const repairItems = cart.filter((item) => item.type === "repair");

  if (productItems.length > 0 && repairItems.length > 0) {
    showNotification(
      "Remove repair items from the cart before checking out, or complete repairs from the Repair tab. Product checkout cannot include repair lines.",
      "error"
    );
    return;
  }

  // Get total from the display
  const totalEl = document.getElementById("total");
  const total = totalEl
    ? parseFloat(totalEl.textContent.replace("Rs.", "").replace(/,/g, "")) || 0
    : 0;

  const cashReceived =
    parseFloat(document.getElementById("cash-received")?.value) || 0;
  const paidNowInputAmount =
    parseFloat(document.getElementById("amount-paid-now")?.value) || 0;

  if (
    currentPaymentMethod === "cash" &&
    !isCreditSale &&
    cashReceived < total
  ) {
    showNotification("Insufficient cash received", "error");
    return;
  }

  let selectedBankAccountId = null;
  const posChq = document
    .getElementById("pos-cheque-number")
    ?.value?.trim();
  if (
    currentPaymentMethod === "bank_transfer" ||
    currentPaymentMethod === "cheque"
  ) {
    selectedBankAccountId =
      parseInt(document.getElementById("pos-bank-account")?.value) || null;
    if (!selectedBankAccountId) {
      showNotification("Please select a bank account", "error");
      return;
    }
    if (currentPaymentMethod === "cheque" && !posChq) {
      showNotification("Please enter the cheque number", "error");
      return;
    }
  }

  // Calculate discount
  const discInput = document.getElementById("discount-input");
  const discType = document.getElementById("discount-type");
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.total) || item.price * item.quantity),
    0
  );
  let discount = 0;
  if (discInput && discInput.value) {
    const dv = parseFloat(discInput.value) || 0;
    discount =
      discType?.value === "percentage"
        ? (subtotal * Math.min(dv, 100)) / 100
        : Math.min(dv, subtotal);
  }

  // Build invoice items (only product-type cart items)
  const invoiceItems = productItems.map((item) => ({
    variantId: item.variantId || item.id,
    quantity: item.quantity,
    unitPrice: item.price,
  }));

  // If cart has only repairs, skip invoice creation
  if (!invoiceItems.length && repairItems.length > 0) {
    showNotification(
      "Repair orders are invoiced separately. Please process repairs through the Repair module.",
      "warning"
    );
    return;
  }

  if (!invoiceItems.length) {
    showNotification("No product items in cart", "error");
    return;
  }

  const customerId =
    document.getElementById("selected-customer-id")?.value || null;
  let effectivePaidAmount = total;
  if (isCreditSale) {
    effectivePaidAmount = paidNowInputAmount;
  } else {
    effectivePaidAmount = currentPaymentMethod === "cash" ? total : total;
  }

  if (effectivePaidAmount < 0 || effectivePaidAmount > total) {
    showNotification("Paid amount must be between 0 and total", "error");
    return;
  }

  let invoiceDateIso = null;
  if (canOverrideInvoiceDate()) {
    const rawDate = document.getElementById("admin-invoice-date")?.value;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        showNotification("Invalid invoice date", "error");
        return;
      }
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 1);
      maxFuture.setHours(23, 59, 59, 999);
      if (parsed.getTime() > maxFuture.getTime()) {
        showNotification(
          "Invoice date cannot be more than 1 day in the future",
          "error"
        );
        return;
      }
      invoiceDateIso = parsed.toISOString();
    }
  }

  const completeBtn = document.getElementById("complete-sale-btn");
  isProcessingSale = true;
  if (completeBtn) {
    completeBtn.disabled = true;
    completeBtn.classList.add("opacity-60", "cursor-not-allowed");
  }

  try {
    const payload = {
      customerId: customerId ? parseInt(customerId) : null,
      items: invoiceItems,
      paymentMethod: currentPaymentMethod,
      bankAccountId: selectedBankAccountId,
      chequeNumber: currentPaymentMethod === "cheque" ? posChq : undefined,
      paidAmount: effectivePaidAmount,
      discount,
      notes: `POS Sale`,
    };
    if (invoiceDateIso) payload.invoiceDate = invoiceDateIso;

    const res = await apiFetch("/invoices", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const invoice = res.data;
    lastInvoiceData = invoice;

    // Show success modal
    const invNumEl = document.getElementById("invoice-number");
    if (invNumEl) invNumEl.textContent = invoice.invoiceNumber;
    const payTotalEl = document.getElementById("payment-total");
    if (payTotalEl)
      payTotalEl.textContent = `Rs.${Number(
        invoice.totalAmount
      ).toLocaleString()}`;
    const payChangeEl = document.getElementById("payment-change");
    if (payChangeEl) {
      const change =
        currentPaymentMethod === "cash"
          ? Math.max(0, cashReceived - invoice.totalAmount)
          : 0;
      payChangeEl.textContent = `Rs.${change.toLocaleString()}`;
    }

    document
      .getElementById("payment-success-modal")
      ?.classList.remove("hidden");

    // Clear cart but keep products fresh
    clearCart();
    await loadProducts(); // Reload to reflect updated stock
    showNotification("Payment processed successfully", "success");
  } catch (err) {
    showNotification("Payment failed: " + err.message, "error");
  } finally {
    isProcessingSale = false;
    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.classList.remove("opacity-60", "cursor-not-allowed");
    }
  }
}

// ─── Hold Sale ────────────────────────────────────────────────────────────────
const HELD_SALES_STORAGE_KEY = "heldSales";

function getHeldSalesArray() {
  try {
    return JSON.parse(localStorage.getItem(HELD_SALES_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function updateHeldSalesBadge() {
  const n = getHeldSalesArray().length;
  const badge = document.getElementById("held-sales-count-badge");
  if (!badge) return;
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n === 0);
}

function closeHeldSalesModal() {
  document.getElementById("held-sales-modal")?.classList.add("hidden");
}

function openHeldSalesModal() {
  const modal = document.getElementById("held-sales-modal");
  const list = document.getElementById("held-sales-list");
  if (!modal || !list) return;
  const held = getHeldSalesArray();
  if (!held.length) {
    list.innerHTML =
      '<p class="text-gray-500 text-center py-6">No held sales. Use Hold Sale on the Shop tab.</p>';
  } else {
    list.innerHTML = held
      .slice()
      .reverse()
      .map((h) => {
        const dt = new Date(h.date).toLocaleString();
        const itemCount = (h.items || []).length;
        const cust = h.customer?.name || "Walk-in";
        const sub = (h.items || []).reduce((s, it) => {
          const line =
            Number(it.total) ||
            Number(it.price) * Number(it.quantity) ||
            0;
          return s + line;
        }, 0);
        const hid = Number(h.id);
        return `<div class="border border-gray-200 rounded-lg p-3 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div class="font-medium text-gray-900">${itemCount} item(s) · ${escHtml(
          cust
        )}</div>
            <div class="text-xs text-gray-500">${escHtml(dt)}</div>
            <div class="text-sm text-gray-700 mt-1">Rs.${Number(sub).toLocaleString()}</div>
          </div>
          <div class="flex gap-2 shrink-0">
            <button type="button" onclick="recallHeldSale(${hid})" class="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600">Restore</button>
            <button type="button" onclick="deleteHeldSale(${hid})" class="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300">Delete</button>
          </div>
        </div>`;
      })
      .join("");
  }
  modal.classList.remove("hidden");
  if (typeof feather !== "undefined") feather.replace();
}

function recallHeldSale(id) {
  const held = getHeldSalesArray();
  const idx = held.findIndex((h) => Number(h.id) === Number(id));
  if (idx < 0) {
    showNotification("Held sale not found", "error");
    return;
  }
  if (cart.length) {
    if (!confirm("Cart has items. Replace cart with this held sale?")) {
      return;
    }
  }
  const entry = held[idx];
  held.splice(idx, 1);
  localStorage.setItem(HELD_SALES_STORAGE_KEY, JSON.stringify(held));
  cart.length = 0;
  (entry.items || []).forEach((it) => cart.push({ ...it }));
  currentCustomer = entry.customer ? { ...entry.customer } : null;
  if (currentCustomer) {
    currentSale.customer = currentCustomer;
    const input = document.getElementById("customer-search");
    if (input) input.value = currentCustomer.name || "";
    const hid = document.getElementById("selected-customer-id");
    if (hid) hid.value = currentCustomer.id || "";
  } else {
    currentSale.customer = null;
    const cs = document.getElementById("customer-search");
    if (cs) cs.value = "";
    const hid = document.getElementById("selected-customer-id");
    if (hid) hid.value = "";
  }
  updateCartDisplay();
  updateTotals();
  updateHeldSalesBadge();
  closeHeldSalesModal();
  showNotification("Held sale restored to cart", "success");
}

function deleteHeldSale(id) {
  const held = getHeldSalesArray().filter(
    (h) => Number(h.id) !== Number(id)
  );
  localStorage.setItem(HELD_SALES_STORAGE_KEY, JSON.stringify(held));
  updateHeldSalesBadge();
  openHeldSalesModal();
  showNotification("Removed held sale", "success");
}

function holdSale() {
  if (!cart.length) {
    showNotification("Cart is empty", "error");
    return;
  }
  const held = getHeldSalesArray();
  held.push({
    id: Date.now(),
    date: new Date().toISOString(),
    items: cart.map((it) => ({ ...it })),
    customer: currentCustomer ? { ...currentCustomer } : null,
  });
  localStorage.setItem(HELD_SALES_STORAGE_KEY, JSON.stringify(held));
  clearCart();
  updateHeldSalesBadge();
  showNotification("Sale held. Cart cleared.", "success");
}

// ─── Print Receipt ────────────────────────────────────────────────────────────
function printReceipt() {
  const inv = lastInvoiceData;
  if (!inv && !cart.length) {
    showNotification("Nothing to print", "warning");
    return;
  }

  const invoiceNumber = inv ? inv.invoiceNumber : `DRAFT-${Date.now()}`;
  const items = inv
    ? inv.items
    : cart.map((c) => ({
        productName: c.name,
        warrantyLabel: c.warrantyLabel || null,
        quantity: c.quantity,
        unitPrice: c.price,
        subtotal: c.total || c.price * c.quantity,
      }));
  const total = inv
    ? Number(inv.totalAmount)
    : cart.reduce((s, c) => s + (c.total || c.price * c.quantity), 0);
  const customerName = inv
    ? inv.customerName || "Walk-in"
    : currentCustomer?.name || "Walk-in";
  const receiptDate = inv?.createdAt || inv?.date
    ? new Date(inv.createdAt || inv.date)
    : new Date();
  const receiptDateLabel = Number.isNaN(receiptDate.getTime())
    ? new Date().toLocaleString()
    : receiptDate.toLocaleString();

  const rowsHtml = items
    .map(
      (it) => `<div class="item"><span>${escHtmlStr(
        it.productName
      )}</span></div>
      ${
        it.warrantyLabel
          ? `<div class="item"><span>Warranty: ${escHtmlStr(
              it.warrantyLabel
            )}</span><span></span></div>`
          : ""
      }
      <div class="item"><span>${it.quantity} × Rs.${Number(
        it.unitPrice
      ).toLocaleString()}</span><span>Rs.${Number(
        it.subtotal
      ).toLocaleString()}</span></div>`
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html><head><title>Receipt</title>
<style>
  body{font-family:'Courier New',monospace;font-size:11px;margin:10px;}
  .header{text-align:center;border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;}
  .item{display:flex;justify-content:space-between;margin-bottom:3px;}
  .total{border-top:1px dashed #000;padding-top:8px;margin-top:8px;font-weight:bold;}
  .center{text-align:center;}
</style></head>
<body>
<div class="header">
  <h2 style="margin:0">Thilina Mobile</h2>
  <p>No. 75/5, Athurugiriya Rd, Rukamale, pannipitiya.</p>
  <p>Tel: 074 175 6567</p>
  <p>Date: ${receiptDateLabel}</p>
  <p>Invoice: ${invoiceNumber}</p>
  <p>Customer: ${customerName}</p>
</div>
<div class="items">${rowsHtml}</div>
<div class="total">
  <div class="item"><span>TOTAL:</span><span>Rs.${total.toLocaleString()}</span></div>
  ${
    inv?.discount > 0
      ? `<div class="item"><span>Discount:</span><span>-Rs.${Number(
          inv.discount
        ).toLocaleString()}</span></div>`
      : ""
  }
</div>
<div class="center" style="margin-top:16px;">
  <p>Thank you for your business!</p>
  <p>Visit us again</p>
</div>
</body></html>`;

  if (typeof printHtmlContent === "function") {
    printHtmlContent(htmlContent);
  } else {
    const printWin = window.open("", "_blank", "width=350,height=700");
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.print();
    }
  }
}

// ─── New Sale (after payment) ─────────────────────────────────────────────────
function newSale() {
  document.getElementById("payment-success-modal")?.classList.add("hidden");
  clearCart();
  lastInvoiceData = null;
}

// ─── Keyboard Shortcuts Modal ─────────────────────────────────────────────────
function showKeyboardShortcuts() {
  document.getElementById("shortcuts-modal")?.classList.remove("hidden");
}
function closeShortcutsModal() {
  document.getElementById("shortcuts-modal")?.classList.add("hidden");
}

// ─── Product Details Popup ────────────────────────────────────────────────────
function viewProductDetails(variantId) {
  const product = posProductsCache.find(
    (p) => p.id === variantId || p.variantId === variantId
  );
  if (!product) {
    showNotification("Product not found", "error");
    return;
  }

  const stockClass =
    product.stock > 10
      ? "text-green-600"
      : product.stock > 0
      ? "text-yellow-600"
      : "text-red-600";
  const stockLabel =
    product.stock > 10
      ? "In Stock"
      : product.stock > 0
      ? "Low Stock"
      : "Out of Stock";

  const html = `<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="closeProductModal()">
    <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold text-gray-800">Product Details</h2>
        <button onclick="closeProductModal()" class="text-gray-400 hover:text-gray-600"><i data-feather="x" class="w-5 h-5"></i></button>
      </div>
      <div class="space-y-3 text-sm">
        <div><span class="font-medium text-gray-600">Name:</span> <span class="ml-2">${escHtml(
          product.name
        )}</span></div>
        <div><span class="font-medium text-gray-600">SKU:</span> <span class="ml-2 font-mono">${escHtml(
          product.sku || "—"
        )}</span></div>
        <div><span class="font-medium text-gray-600">Category:</span> <span class="ml-2">${escHtml(
          product.categoryName || "—"
        )}</span></div>
        <div><span class="font-medium text-gray-600">Brand:</span> <span class="ml-2">${escHtml(
          product.brandName || "—"
        )}</span></div>
        <div><span class="font-medium text-gray-600">Price:</span> <span class="ml-2 text-blue-600 font-semibold">Rs.${Number(
          product.price
        ).toLocaleString()}</span></div>
        <div><span class="font-medium text-gray-600">Stock:</span> <span class="ml-2 ${stockClass} font-medium">${stockLabel} (${
    product.stock
  } units)</span></div>
        <div><span class="font-medium text-gray-600">Barcode:</span> <span class="ml-2 font-mono">${escHtml(
          product.barcode || "—"
        )}</span></div>
      </div>
      <div class="flex justify-end space-x-3 mt-6">
        <button onclick="closeProductModal()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Close</button>
        ${
          product.stock > 0
            ? `<button data-product-id="${escAttr(
                String(product.id)
              )}" onclick="addProductToCartById(this.dataset.productId); closeProductModal();" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Add to Cart</button>`
            : ""
        }
      </div>
    </div>
  </div>`;

  const div = document.createElement("div");
  div.id = "product-modal";
  div.innerHTML = html;
  document.body.appendChild(div);
  feather.replace();
}

function closeProductModal() {
  document.getElementById("product-modal")?.remove();
}

// ─── Customer Tab Tabs (inside customer section) ───────────────────────────────
function switchPosCustomerSectionTab(tabName) {
  ["overview", "purchases", "repairs"].forEach((t) => {
    const content = document.getElementById(
      `posCustomer${t.charAt(0).toUpperCase() + t.slice(1)}Content`
    );
    const tab = document.getElementById(
      `posCustomer${t.charAt(0).toUpperCase() + t.slice(1)}Tab`
    );
    if (content) content.classList.toggle("hidden", t !== tabName);
    if (tab) {
      tab.classList.toggle("border-blue-500", t === tabName);
      tab.classList.toggle("text-blue-600", t === tabName);
      tab.classList.toggle("border-transparent", t !== tabName);
      tab.classList.toggle("text-gray-500", t !== tabName);
    }
  });
}

// ─── Auth & Navigation ────────────────────────────────────────────────────────
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("user");
    localStorage.removeItem("authToken");
    showNotification("Logged out successfully", "info");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
  }
}

function goToDashboard() {
  const role = getCurrentUserRole();
  if (role === "cashier") {
    showNotification("Cashier role has access only to POS System", "warning");
    return;
  }

  window.location.href = "Dashboard.html";
}

function hasPermission(action) {
  const role = getCurrentUserRole();
  const perms = {
    admin: ["all"],
    administrator: ["all"],
    cashier: ["pos", "customers_add"],
    manager: ["pos", "customers_add"],
    accountant: [],
  };

  const allowed = perms[role] || [];
  return allowed.includes("all") || allowed.includes(action);
}

// ─── Notifications ────────────────────────────────────────────────────────────
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `pos-notification fixed top-4 right-4 z-[9999] px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-all`;

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
    info: "bg-blue-500",
  };
  notification.classList.add(colors[type] || "bg-blue-500");
  notification.textContent = message;

  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ─── HTML Escape Helpers ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escHtmlStr(str) {
  return escHtml(str);
}

function escAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (!enforcePOSAccess()) return;
  initializePOS();
  selectPaymentMethod("cash");
});
