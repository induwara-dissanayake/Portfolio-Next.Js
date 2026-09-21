// Customer Management Module
const CUST_API = window.API_BASE_URL || "http://localhost:3000/api";

function custGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    null
  );
}

function getCustomerUserRole() {
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

function canDeleteCustomers() {
  const role = getCustomerUserRole();
  return ["admin", "administrator", "manager"].includes(role);
}

async function custRequest(path, options = {}) {
  const token = custGetAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${CUST_API}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      body.message || body.error || `Request failed (${res.status})`
    );
  return body.data !== undefined ? body.data : body;
}

let customersData = [];
let filteredCustomers = [];
let customerStats = { totalCustomers: 0, activeThisMonth: 0, totalRevenue: 0 };
let currentCustomerInvoices = []; // raw invoices for the open Customer Details modal
let currentCustomerRepairs = []; // raw repairs for the open Customer Details modal
let currentCustomerCreditInvoices = []; // credit invoices for details modal credit tab
let currentCustomerDetailsId = 0; // currently opened customer id in details modal
let currentCustomerManagementTab = "customers";
let customerInstallmentsData = [];
let customerInstallmentSearchDebounce = null;

function initializeCustomersModule(
  containerId = "dynamic-content",
  skipLoad = false
) {
  const posMode = containerId !== "dynamic-content";
  const content = generateCustomersContent(posMode);
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Customer module: #${containerId} not found`);
    return;
  }
  container.innerHTML = content;

  // Initialize after DOM is ready
  setTimeout(() => {
    if (!skipLoad) loadCustomersData();
    if (typeof feather !== "undefined") {
      feather.replace();
    }
  }, 100);

  // Export all interactive functions to window scope
  window.openAddCustomerModal = openAddCustomerModal;
  window.closeAddCustomerModal = closeAddCustomerModal;
  window.addNewCustomer = addNewCustomer;
  window.viewCustomerDetails = viewCustomerDetails;
  window.viewCustomerCreditDetails = viewCustomerCreditDetails;
  window.editCustomer = editCustomer;
  window.closeEditCustomerModal = closeEditCustomerModal;
  window.updateCustomer = updateCustomer;
  window.deleteCustomer = deleteCustomer;
  window.closeCustomerDetailsModal = closeCustomerDetailsModal;
  window.filterCustomers = filterCustomers;
  window.switchCustomerTab = switchCustomerTab;
  window.filterCustomerHistory = filterCustomerHistory;
  window.clearCustomerHistoryFilter = clearCustomerHistoryFilter;
  window.filterRepairHistory = filterRepairHistory;
  window.clearRepairHistoryFilter = clearRepairHistoryFilter;
  window.switchCustomerManagementTab = switchCustomerManagementTab;
  window.handleCustomerInstallmentSearch = scheduleReloadCustomerInstallments;
  window.openCustomerInstallmentPaymentModal =
    openCustomerInstallmentPaymentModal;
  window.closeCustomerInstallmentPaymentModal =
    closeCustomerInstallmentPaymentModal;
  window.toggleCustomerInstallmentBankAccount =
    toggleCustomerInstallmentBankAccount;
  window.submitCustomerInstallmentPayment = submitCustomerInstallmentPayment;
  window.downloadCustomerDirectoryPDF = downloadCustomerDirectoryPDF;
  window.downloadCustomerDirectoryXL = downloadCustomerDirectoryXL;
  window.loadCustomerInstallments = loadCustomerInstallments;
  window.filterCustomerCreditHistory = filterCustomerCreditHistory;
  window.clearCustomerCreditHistoryFilter = clearCustomerCreditHistoryFilter;
  window.exportCustomerDetailsPurchasesPDF = exportCustomerDetailsPurchasesPDF;
  window.exportCustomerDetailsPurchasesXL = exportCustomerDetailsPurchasesXL;
  window.exportCustomerDetailsRepairsPDF = exportCustomerDetailsRepairsPDF;
  window.exportCustomerDetailsRepairsXL = exportCustomerDetailsRepairsXL;
  window.exportCustomerDetailsCreditPDF = exportCustomerDetailsCreditPDF;
  window.exportCustomerDetailsCreditXL = exportCustomerDetailsCreditXL;
  window.clearCustomerInstallmentFilters = clearCustomerInstallmentFilters;
  window.scheduleReloadCustomerInstallments = scheduleReloadCustomerInstallments;
  window.downloadCustomerInstallmentsPDF = downloadCustomerInstallmentsPDF;
  window.downloadCustomerInstallmentsCSV = downloadCustomerInstallmentsCSV;
}

function generateCustomersContent(posMode = false) {
  const adminHeader = posMode
    ? ""
    : `
      <!-- Page Header -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 -m-6 mb-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Customer Management</h1>
            <p class="text-gray-600 mt-1">Manage customer database, purchase history, and repair records</p>
          </div>
          <div class="flex space-x-3">
            <button onclick="openAddCustomerModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
              <i data-feather="plus" class="w-4 h-4 mr-2"></i>
              Add Customer
            </button>
          </div>
        </div>
      </div>
    `;

  const statsSection = posMode
    ? ""
    : `
      <!-- Stats Section -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-lg p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500">Total Customers</p>
              <h3 class="text-2xl font-bold text-gray-900" id="totalCustomers">0</h3>
            </div>
            <i data-feather="users" class="w-8 h-8 text-gray-400"></i>
          </div>
        </div>
        
        <div class="bg-white rounded-lg p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500">Active This Month</p>
              <h3 class="text-2xl font-bold text-gray-900" id="activeCustomers">0</h3>
            </div>
            <i data-feather="activity" class="w-8 h-8 text-gray-400"></i>
          </div>
        </div>
        
        
        <div class="bg-white rounded-lg p-6 border border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500">Total Revenue</p>
              <h3 class="text-2xl font-bold text-gray-900" id="totalRevenue">Rs. 0</h3>
            </div>
            <i data-feather="plus" class="w-8 h-8 text-gray-400"></i>
          </div>
        </div>
      </div>
    `;

  const posAddCustomerBtn = posMode
    ? `
            <div class="shrink-0 ml-auto flex gap-2">
              <button type="button" onclick="openAddCustomerModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center text-sm shrink-0">
                <i data-feather="plus" class="w-4 h-4 mr-2"></i>
                Add Customer
              </button>
            </div>
            `
    : "";

  const directoryExportBtns = posMode
    ? ""
    : `
            <div class="flex gap-2 shrink-0 flex-wrap justify-end md:justify-end ml-0 md:ml-auto">
                <button type="button" onclick="downloadCustomerDirectoryPDF()" class="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm">
                  <i data-feather="download" class="w-4 h-4 mr-2"></i> PDF
                </button>
                <button type="button" onclick="downloadCustomerDirectoryXL()" class="btn-secondary px-4 py-2 rounded-lg flex items-center text-sm">
                  <i data-feather="file-text" class="w-4 h-4 mr-2"></i> XL
                </button>
            </div>
            `;

  const installmentExportBtns = posMode
    ? ""
    : `
            <div class="flex gap-2 shrink-0 flex-wrap justify-end sm:justify-end ml-0 sm:ml-auto">
            <button type="button" onclick="downloadCustomerInstallmentsPDF()" class="btn-secondary px-3 py-2 rounded-lg text-sm flex items-center whitespace-nowrap">
              <i data-feather="download" class="w-4 h-4 mr-1"></i> PDF
            </button>
            <button type="button" onclick="downloadCustomerInstallmentsCSV()" class="btn-secondary px-3 py-2 rounded-lg text-sm flex items-center whitespace-nowrap" title="Opens in Excel">
              <i data-feather="file-text" class="w-4 h-4 mr-1"></i> XL
            </button>
            </div>
            `;

  const rootClass = posMode
    ? "content-fade-in px-3 pt-3 pb-2 h-full min-h-0 flex flex-col overflow-hidden"
    : "content-fade-in p-6";
  const subNavClass = posMode
    ? "border-b border-gray-200 mb-3 shrink-0"
    : "border-b border-gray-200 mb-6";
  const customersPaneClass = posMode
    ? "customer-mgmt-tab-content flex-1 min-h-0 flex flex-col overflow-hidden"
    : "customer-mgmt-tab-content";
  const installmentsPaneClass = posMode
    ? "customer-mgmt-tab-content hidden flex-1 min-h-0 flex flex-col overflow-hidden"
    : "customer-mgmt-tab-content hidden";
  const customersSearchCardClass = posMode
    ? "bg-white rounded-lg shadow-sm p-4 mb-3 shrink-0"
    : "bg-white rounded-lg shadow-sm p-6 mb-6";
  const customersTableWrapClass = posMode
    ? "bg-white rounded-lg shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden border border-gray-100"
    : "bg-white rounded-lg shadow-sm";
  const customersTableScrollClass = posMode
    ? "flex-1 min-h-0 overflow-y-auto overflow-x-auto"
    : "overflow-x-auto";
  const installmentsFiltersClass = posMode
    ? "bg-white rounded-lg shadow-sm p-3 mb-3 shrink-0"
    : "bg-white rounded-lg shadow-sm p-4 mb-6";
  const installmentsTableWrapClass = posMode
    ? "bg-white rounded-lg shadow-sm flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-100"
    : "bg-white rounded-lg shadow-sm overflow-x-auto";

  return `
    <div class="${rootClass}">
      ${adminHeader}
      ${statsSection}

      <div class="${subNavClass}">
        <nav class="-mb-px flex space-x-8">
          <button onclick="switchCustomerManagementTab('customers')" id="customerManagementCustomersTab" class="customer-mgmt-tab-btn border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
            Customers
          </button>
          <button onclick="switchCustomerManagementTab('installments')" id="customerManagementInstallmentsTab" class="customer-mgmt-tab-btn border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
            Installment
          </button>
        </nav>
      </div>

      <div id="customerManagementCustomersContent" class="${customersPaneClass}">
        <!-- Search and Filter Section -->
        <div class="${customersSearchCardClass}">
          <div class="flex flex-col md:flex-row md:items-center w-full gap-3 mb-4 justify-between">
            <div class="relative flex-1 min-w-0 max-w-xl">
              <input
                  type="text"
                  id="customerSearchInput"
                  placeholder="Search by mobile number, name, or email..."
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  oninput="filterCustomers()"
                >
              <i data-feather="search" class="w-5 h-5 text-gray-400 absolute left-3 top-2.5"></i>
            </div>
            ${directoryExportBtns}
            ${posAddCustomerBtn}
          </div>
        </div>

        <!-- Customers Table -->
        <div class="${customersTableWrapClass}">
          
          <div class="${customersTableScrollClass}">
            <table class="w-full min-w-[720px]">
              <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Purchase</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody id="customersTableBody" class="bg-white divide-y divide-gray-200">
                <!-- Customer rows will be populated here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="customerManagementInstallmentsContent" class="${installmentsPaneClass}">
        <div class="${installmentsFiltersClass}">
          <div class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap gap-2 items-center justify-start flex-1 min-w-0">
            <div class="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              id="customerInstallmentSearchInput"
              placeholder="Search by invoice, customer, phone..."
              class="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              oninput="scheduleReloadCustomerInstallments()"
            >
            <i data-feather="search" class="w-5 h-5 text-gray-400 absolute left-3 top-2.5"></i>
            </div>
            <input type="date" id="installmentDateFrom" title="From date" onchange="loadCustomerInstallments()" class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            <input type="date" id="installmentDateTo" title="To date" onchange="loadCustomerInstallments()" class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
            <select id="installmentPaymentStatusFilter" onchange="loadCustomerInstallments()" class="px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[120px]">
              <option value="">All statuses</option>
            </select>
            <button type="button" onclick="clearCustomerInstallmentFilters()" class="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Clear</button>
            </div>
            ${installmentExportBtns}
          </div>
        </div>

        <div class="${installmentsTableWrapClass}">
          <table class="w-full text-sm min-w-[800px]">
            <thead class="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody id="customerInstallmentsTableBody" class="bg-white divide-y divide-gray-200">
              <tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">Loading installments...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- Add Customer Modal -->
    <div id="addCustomerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Add New Customer</h3>
          <button onclick="closeAddCustomerModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <form id="addCustomerForm" class="p-6 space-y-4" onsubmit="addNewCustomer(event)">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
            <input type="tel" id="newCustomerMobile" required pattern="0[0-9]{9}" minlength="10" maxlength="10" inputmode="numeric" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="0712345678">
            <p class="text-xs text-gray-500 mt-1">Must be 10 digits and start with 0</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="newCustomerName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Enter customer name (optional)">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="newCustomerEmail" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Enter email address (optional)">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea id="newCustomerAddress" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Enter address (optional)"></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeAddCustomerModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Customer Details Modal -->
    <div id="customerDetailsModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-[92vw] max-w-6xl mx-4 max-h-[92vh] overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Customer Details</h3>
          <button onclick="closeCustomerDetailsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <div class="p-6">
          <!-- Customer Info Header -->
          <div class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-xl font-semibold text-gray-900" id="customerDetailsName">Customer Name</h4>
                <p class="text-gray-600" id="customerDetailsPhone">Phone Number</p>
                <p class="text-gray-600" id="customerDetailsEmail">Email</p>
                <p class="text-gray-600" id="customerDetailsAddress">Address</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600 mt-1">Total Spent: <span class="font-semibold" id="customerDetailsTotal">Rs. 0</span></p>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="border-b border-gray-200 mb-6">
            <nav class="-mb-px flex space-x-8">
              <button onclick="switchCustomerTab('purchases')" id="purchasesTab" class="customer-tab-btn active border-b-2 border-blue-500 py-2 px-1 text-sm font-medium text-blue-600">
                Purchases
              </button>
              <button onclick="switchCustomerTab('repairs')" id="repairsTab" class="customer-tab-btn border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                Repairs
              </button>
              <button onclick="switchCustomerTab('credit')" id="creditTab" class="customer-tab-btn border-b-2 border-transparent py-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700">
                Credit
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div id="purchasesContent" class="customer-tab-content">
            <div class="flex w-full flex-col gap-3 mb-4 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between">
              <div class="flex flex-wrap gap-2 items-center justify-start min-w-0 flex-1">
                <div class="relative">
                  <input
                    type="text"
                    id="historySearchInput"
                    placeholder="Search item or invoice…"
                    oninput="filterCustomerHistory()"
                    class="w-full sm:w-52 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-2 top-2"></i>
                </div>
                <input
                  type="date"
                  id="historyDateFrom"
                  onchange="filterCustomerHistory()"
                  title="From date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                <input
                  type="date"
                  id="historyDateTo"
                  onchange="filterCustomerHistory()"
                  title="To date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                <button
                  onclick="clearCustomerHistoryFilter()"
                  class="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                >Clear</button>
              </div>
              <div class="flex gap-2 shrink-0 flex-wrap justify-end ml-0 sm:ml-auto self-end sm:self-auto w-full sm:w-auto">
                <button type="button" onclick="exportCustomerDetailsPurchasesPDF()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="download" class="w-4 h-4 mr-1"></i>PDF</button>
                <button type="button" onclick="exportCustomerDetailsPurchasesXL()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="file-text" class="w-4 h-4 mr-1"></i>XL</button>
              </div>
            </div>
            <div id="customerPurchasesList" class="space-y-4">
              <!-- Purchase items will be populated here -->
            </div>
          </div>

          <div id="repairsContent" class="customer-tab-content hidden">
            <div class="flex w-full flex-col gap-3 mb-4 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between">
              <div class="flex flex-wrap gap-2 items-center justify-start min-w-0 flex-1">
                <div class="relative">
                  <input
                    type="text"
                    id="repairSearchInput"
                    placeholder="Search device or issue…"
                    oninput="filterRepairHistory()"
                    class="w-full sm:w-52 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-2 top-2"></i>
                </div>
                <select
                  id="repairStatusFilter"
                  onchange="filterRepairHistory()"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Received">Received</option>
                  <option value="Repairing">Repairing</option>
                  <option value="Pending Parts">Pending Parts</option>
                  <option value="Completed">Completed</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <input
                  type="date"
                  id="repairDateFrom"
                  onchange="filterRepairHistory()"
                  title="From date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                <input
                  type="date"
                  id="repairDateTo"
                  onchange="filterRepairHistory()"
                  title="To date"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                <button
                  onclick="clearRepairHistoryFilter()"
                  class="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap"
                >Clear</button>
              </div>
              <div class="flex gap-2 shrink-0 flex-wrap justify-end ml-0 sm:ml-auto self-end sm:self-auto w-full sm:w-auto">
                <button type="button" onclick="exportCustomerDetailsRepairsPDF()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="download" class="w-4 h-4 mr-1"></i>PDF</button>
                <button type="button" onclick="exportCustomerDetailsRepairsXL()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="file-text" class="w-4 h-4 mr-1"></i>XL</button>
              </div>
            </div>
            <div id="customerRepairsList" class="space-y-4">
              <!-- Repair items will be populated here -->
            </div>
          </div>

          <div id="creditContent" class="customer-tab-content hidden">
            <div class="flex w-full flex-col gap-3 mb-4 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between">
              <div class="flex flex-wrap gap-2 items-center justify-start min-w-0 flex-1">
                <div class="relative">
                  <input
                    type="text"
                    id="creditSearchInput"
                    placeholder="Search invoice or items…"
                    oninput="filterCustomerCreditHistory()"
                    class="w-full sm:w-52 pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                  <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-2 top-2"></i>
                </div>
                <select
                  id="creditStatusFilter"
                  onchange="filterCustomerCreditHistory()"
                  class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="outstanding">Outstanding</option>
                  <option value="settled">Settled</option>
                </select>
                <input type="date" id="creditDateFrom" onchange="filterCustomerCreditHistory()" title="From date" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500">
                <input type="date" id="creditDateTo" onchange="filterCustomerCreditHistory()" title="To date" class="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500">
                <button type="button" onclick="clearCustomerCreditHistoryFilter()" class="text-sm px-3 py-1.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 whitespace-nowrap">Clear</button>
              </div>
              <div class="flex gap-2 shrink-0 flex-wrap justify-end ml-0 sm:ml-auto self-end sm:self-auto w-full sm:w-auto">
                <button type="button" onclick="exportCustomerDetailsCreditPDF()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="download" class="w-4 h-4 mr-1"></i>PDF</button>
                <button type="button" onclick="exportCustomerDetailsCreditXL()" class="btn-secondary px-3 py-1.5 rounded-lg text-sm flex items-center whitespace-nowrap"><i data-feather="file-text" class="w-4 h-4 mr-1"></i>XL</button>
              </div>
            </div>
            <div id="customerCreditList" class="space-y-4">
              <!-- Credit items will be populated here -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="customerInstallmentPaymentModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Record Installment Payment</h3>
          <button onclick="closeCustomerInstallmentPaymentModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        <form class="p-6 space-y-4" id="customerInstallmentPaymentForm" onsubmit="submitCustomerInstallmentPayment(event)">
          <input type="hidden" id="customerInstallmentInvoiceId">
          <input type="hidden" id="customerInstallmentCustomerId">
          <input type="hidden" id="customerInstallmentMaxBalance">

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
            <input type="number" id="customerInstallmentAmount" min="0.01" step="0.01" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1" id="customerInstallmentBalanceHint"></p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
            <select id="customerInstallmentPaymentType" onchange="toggleCustomerInstallmentBankAccount()" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Select payment method</option>
            </select>
          </div>

          <div id="customerInstallmentBankAccountWrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Bank Account *</label>
            <select id="customerInstallmentBankAccount" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
              <option value="">Select bank account</option>
            </select>
          </div>

          <div id="customerInstallmentChequeWrap" class="hidden">
            <label class="block text-sm font-medium text-gray-700 mb-1">Cheque Number *</label>
            <input type="text" id="customerInstallmentChequeNumber" maxlength="50" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="e.g. 123456">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input type="text" id="customerInstallmentNote" maxlength="150" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" placeholder="Optional">
          </div>

          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="closeCustomerInstallmentPaymentModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Payment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Customer Modal -->
    <div id="editCustomerModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 hidden items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Edit Customer</h3>
          <button onclick="closeEditCustomerModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <form id="editCustomerForm" class="p-6 space-y-4" onsubmit="updateCustomer(event)">
          <input type="hidden" id="editCustomerId">
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
            <input type="tel" id="editCustomerMobile" required pattern="0[0-9]{9}" minlength="10" maxlength="10" inputmode="numeric" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
            <p class="text-xs text-gray-500 mt-1">Must be 10 digits and start with 0</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" id="editCustomerName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" id="editCustomerEmail" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea id="editCustomerAddress" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="closeEditCustomerModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Update Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Data Loading Functions
async function loadCustomersData() {
  const tbody = document.getElementById("customersTableBody");
  if (tbody)
    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Loading...</td></tr>`;

  try {
    const [stats, customers] = await Promise.all([
      custRequest("/customers/stats"),
      custRequest("/customers"),
    ]);
    customerStats = stats;
    customersData = customers;
    filterCustomers();
    updateDashboardStats();
    await populateInstallmentPaymentStatusSelect();
    if (currentCustomerManagementTab === "installments") {
      await loadCustomerInstallments();
    }
  } catch (err) {
    console.error("loadCustomersData error:", err);
    showNotification("Failed to load customer data", "error");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-400">Failed to load customers</td></tr>`;
  }
}

// Display Functions
function renderCustomersTable() {
  const tbody = document.getElementById("customersTableBody");
  if (!tbody) return;

  if (filteredCustomers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-8 text-center text-gray-500">
          No customers found matching your criteria
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredCustomers
    .map((customer) => {
      const lastPurchase = customer.lastPurchaseDate
        ? new Date(customer.lastPurchaseDate).toLocaleDateString()
        : "Never";
      const deleteBtn = canDeleteCustomers()
        ? `<button onclick="deleteCustomer(${customer.id})" class="text-red-600 hover:text-red-900" title="Delete Customer">
              <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>`
        : "";

      return `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="h-10 w-10 flex-shrink-0">
              <div class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span class="text-blue-600 font-medium text-sm">
                  ${escHtml(getInitials(customer.name))}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${escHtml(
                customer.name
              )}</div>
              <div class="text-sm text-gray-500">ID: C${String(
                customer.id
              ).padStart(3, "0")}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm text-gray-900">${escHtml(
            customer.phone || ""
          )}</div>
          <div class="text-sm text-gray-500">${escHtml(
            customer.email || "No email"
          )}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          Rs. ${Number(customer.totalSpent || 0).toLocaleString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${lastPurchase}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <div class="flex space-x-2">
            <button onclick="viewCustomerDetails(${
              customer.id
            })" class="text-blue-600 hover:text-blue-900" title="View Details">
              <i data-feather="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="editCustomer(${
              customer.id
            })" class="text-green-600 hover:text-green-900" title="Edit Customer">
              <i data-feather="edit-2" class="w-4 h-4"></i>
            </button>
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
    })
    .join("");

  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function updateDashboardStats() {
  const totalEl = document.getElementById("totalCustomers");
  const activeEl = document.getElementById("activeCustomers");
  const revenueEl = document.getElementById("totalRevenue");

  if (totalEl) totalEl.textContent = customerStats.totalCustomers;
  if (activeEl) activeEl.textContent = customerStats.activeThisMonth;
  if (revenueEl)
    revenueEl.textContent = `Rs. ${customerStats.totalRevenue.toLocaleString()}`;
}

// Filter Functions
function filterCustomers() {
  const searchTerm =
    document
      .getElementById("customerSearchInput")
      ?.value.toLowerCase()
      .trim() || "";
  filteredCustomers = customersData.filter(
    (c) =>
      String(c.name || "")
        .toLowerCase()
        .includes(searchTerm) ||
      String(c.phone || "").includes(searchTerm) ||
      (c.email && String(c.email).toLowerCase().includes(searchTerm))
  );
  renderCustomersTable();
}

function resetFilters() {
  const el = document.getElementById("customerSearchInput");
  if (el) el.value = "";
  filteredCustomers = [...customersData];
  renderCustomersTable();
}

function switchCustomerManagementTab(tabName) {
  currentCustomerManagementTab = tabName;

  ["customers", "installments"].forEach((tab) => {
    const cap = tab.charAt(0).toUpperCase() + tab.slice(1);
    const btn = document.getElementById(`customerManagement${cap}Tab`);
    const content = document.getElementById(`customerManagement${cap}Content`);

    if (btn) {
      btn.classList.toggle("border-blue-500", tab === tabName);
      btn.classList.toggle("text-blue-600", tab === tabName);
      btn.classList.toggle("border-transparent", tab !== tabName);
      btn.classList.toggle("text-gray-500", tab !== tabName);
    }
    if (content) content.classList.toggle("hidden", tab !== tabName);
  });

  if (tabName === "installments") {
    loadCustomerInstallments();
  } else {
    loadCustomersData();
  }

  if (typeof feather !== "undefined") feather.replace();
}

function getCustomerInstallmentQueryParams() {
  const search =
    (document.getElementById("customerInstallmentSearchInput")?.value || "")
      .trim() || "";
  const dateFrom = document.getElementById("installmentDateFrom")?.value || "";
  const dateTo = document.getElementById("installmentDateTo")?.value || "";
  const paymentStatusId =
    document.getElementById("installmentPaymentStatusFilter")?.value || "";
  return { search, dateFrom, dateTo, paymentStatusId };
}

function buildCustomerInstallmentQueryString() {
  const p = getCustomerInstallmentQueryParams();
  const qs = new URLSearchParams();
  if (p.search) qs.set("search", p.search);
  if (p.dateFrom) qs.set("dateFrom", p.dateFrom);
  if (p.dateTo) qs.set("dateTo", p.dateTo);
  if (p.paymentStatusId) qs.set("paymentStatusId", p.paymentStatusId);
  return qs.toString() ? `?${qs.toString()}` : "";
}

function scheduleReloadCustomerInstallments() {
  if (customerInstallmentSearchDebounce) {
    clearTimeout(customerInstallmentSearchDebounce);
  }
  customerInstallmentSearchDebounce = setTimeout(() => {
    customerInstallmentSearchDebounce = null;
    loadCustomerInstallments();
  }, 400);
}

function populateInstallmentCustomerSelect() {}

async function populateInstallmentPaymentStatusSelect() {
  const sel = document.getElementById("installmentPaymentStatusFilter");
  if (!sel) return;
  const v = sel.value;
  try {
    const rows = await custRequest("/invoices/payment-statuses");
    sel.innerHTML =
      '<option value="">All statuses</option>' +
      (Array.isArray(rows) ? rows : [])
        .map(
          (s) => `<option value="${s.id}">${escHtml(s.name || "Status")}</option>`
        )
        .join("");
  } catch (e) {
    console.error("payment-statuses", e);
  }
  if (v && sel.querySelector(`option[value="${v}"]`)) sel.value = v;
}

function clearCustomerInstallmentFilters() {
  "customerInstallmentSearchInput,installmentDateFrom,installmentDateTo,installmentPaymentStatusFilter"
    .split(",")
    .forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  loadCustomerInstallments();
}


function getCustomerDirectoryExportData() {
  return filteredCustomers.length > 0 ? filteredCustomers : customersData;
}

function getCustomerDirectoryExportFilters() {
  const searchTerm = document.getElementById("customerSearchInput")?.value?.trim();
  return searchTerm ? [{ label: "Search", value: searchTerm }] : [];
}

function getCustomerInstallmentExportFilters() {
  const p = getCustomerInstallmentQueryParams();
  const filters = [];
  if (p.search) filters.push({ label: "Search", value: p.search });
  if (p.dateFrom) filters.push({ label: "From", value: p.dateFrom });
  if (p.dateTo) filters.push({ label: "To", value: p.dateTo });
  if (p.paymentStatusId) {
    const sel = document.getElementById("installmentPaymentStatusFilter");
    filters.push({
      label: "Status",
      value: sel?.options[sel.selectedIndex]?.textContent?.trim() || p.paymentStatusId,
    });
  }
  return filters;
}

function getCustomerDetailsExportName() {
  return document.getElementById("customerDetailsName")?.textContent || "Customer";
}

function getCustomerDetailsBaseFilters() {
  const filters = [];
  const name = getCustomerDetailsExportName();
  if (name) filters.push({ label: "Customer", value: name });
  if (currentCustomerDetailsId) {
    filters.push({ label: "Customer ID", value: String(currentCustomerDetailsId) });
  }
  return filters;
}

function getCustomerPurchasesExportFilters() {
  const filters = getCustomerDetailsBaseFilters();
  const search = document.getElementById("historySearchInput")?.value?.trim();
  const from = document.getElementById("historyDateFrom")?.value;
  const to = document.getElementById("historyDateTo")?.value;
  if (search) filters.push({ label: "Search", value: search });
  if (from) filters.push({ label: "From", value: from });
  if (to) filters.push({ label: "To", value: to });
  return filters;
}

function getCustomerRepairsExportFilters() {
  const filters = getCustomerDetailsBaseFilters();
  const search = document.getElementById("repairSearchInput")?.value?.trim();
  const status = document.getElementById("repairStatusFilter")?.value;
  const from = document.getElementById("repairDateFrom")?.value;
  const to = document.getElementById("repairDateTo")?.value;
  if (search) filters.push({ label: "Search", value: search });
  if (status) filters.push({ label: "Status", value: status });
  if (from) filters.push({ label: "From", value: from });
  if (to) filters.push({ label: "To", value: to });
  return filters;
}

function getCustomerCreditExportFilters() {
  const filters = getCustomerDetailsBaseFilters();
  const search = document.getElementById("creditSearchInput")?.value?.trim();
  const status = document.getElementById("creditStatusFilter")?.value;
  const from = document.getElementById("creditDateFrom")?.value;
  const to = document.getElementById("creditDateTo")?.value;
  if (search) filters.push({ label: "Search", value: search });
  if (status) filters.push({ label: "Status", value: status });
  if (from) filters.push({ label: "From", value: from });
  if (to) filters.push({ label: "To", value: to });
  return filters;
}

function formatCustomerPurchaseItems(inv) {
  return (
    (inv.items || [])
      .map((it) =>
        `${it.productName || ""}${it.variantName ? " — " + it.variantName : ""}${
          it.warrantyLabel ? " · " + it.warrantyLabel : ""
        } ×${it.quantity}`
      )
      .join("; ") || "—"
  );
}

function downloadCustomerInstallmentsPDF() {
  try {
    const ok = exportPdfWithTable({
      title: "Customer Installment / Credit Sales",
      filters: getCustomerInstallmentExportFilters(),
      head: ["Invoice", "Date", "Customer", "Total", "Paid", "Balance", "Status"],
      body: (customerInstallmentsData || []).map((r) => [
        r.invoiceNumber || "—",
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—",
        r.customerName || "—",
        Number(r.totalAmount) || 0,
        Number(r.paidAmount) || 0,
        Number(r.balance) || 0,
        r.paymentStatus || "—",
      ]),
      fileName: `customer-installments-${new Date().toISOString().slice(0, 10)}.pdf`,
      emptyMessage: "No installment rows to export. Adjust filters or wait for data.",
    });
    if (ok) showNotification("Installments PDF downloaded.", "success");
  } catch (e) {
    showNotification("PDF error: " + (e.message || "unknown"), "error");
  }
}

async function downloadCustomerInstallmentsCSV() {
  const ok = await exportXlsxWithTable({
    title: "Customer Installment / Credit Sales",
    filters: getCustomerInstallmentExportFilters(),
    headers: [
      "Invoice",
      "Date",
      "Customer",
      "Phone",
      "Total",
      "Paid",
      "Balance",
      "Status",
    ],
    rows: (customerInstallmentsData || []).map((r) => [
      r.invoiceNumber || "",
      r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : "",
      r.customerName || "",
      r.customerPhone || "",
      r.totalAmount,
      r.paidAmount,
      r.balance,
      r.paymentStatus || "",
    ]),
    sheetName: "Installments",
    fileName: `customer-installments-${new Date().toISOString().slice(0, 10)}.xlsx`,
    emptyMessage: "No data to export.",
  });
  if (ok) showNotification("Installments XL downloaded.", "success");
}

async function loadCustomerInstallments() {
  const tbody = document.getElementById("customerInstallmentsTableBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-400">Loading installments...</td></tr>`;
  }

  try {
    const q = buildCustomerInstallmentQueryString();
    const data = await custRequest(`/invoices/credit${q}`);
    customerInstallmentsData = data || [];
    renderCustomerInstallmentsTable(customerInstallmentsData);
  } catch (err) {
    console.error("loadCustomerInstallments error:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-red-400">Failed to load installments</td></tr>`;
    }
  }
}

function customerInstallmentStatusStyle(statusName) {
  const s = (statusName || "").toLowerCase();
  if (s.includes("paid") && !s.includes("unpaid")) {
    return "bg-green-100 text-green-800";
  }
  if (s.includes("overdue")) return "bg-red-100 text-red-800";
  if (s.includes("partial")) return "bg-blue-100 text-blue-800";
  if (s.includes("pending")) return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-800";
}

function renderCustomerInstallmentsTable(data) {
  const tbody = document.getElementById("customerInstallmentsTableBody");
  if (!tbody) return;

  const rows = data || [];
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No credit purchases found</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((inv) => {
      const bal = Number(inv.balance || 0);
      const isPending = bal > 0.01;
      const statusLabel =
        inv.paymentStatus || (isPending ? "Pending" : "Paid");
      const stClass = customerInstallmentStatusStyle(statusLabel);
      return `<tr class="hover:bg-gray-50">
        <td class="px-6 py-3 text-sm font-medium text-gray-900">${escHtml(
          inv.invoiceNumber || "—"
        )}</td>
        <td class="px-6 py-3 text-sm text-gray-700">${escHtml(
          inv.customerName || "Walk-in"
        )}<br><span class="text-xs text-gray-500">${escHtml(
        inv.customerPhone || ""
      )}</span></td>
        <td class="px-6 py-3 text-sm text-gray-700">Rs.${Number(
          inv.totalAmount || 0
        ).toLocaleString()}</td>
        <td class="px-6 py-3 text-sm text-green-700">Rs.${Number(
          inv.paidAmount || 0
        ).toLocaleString()}</td>
        <td class="px-6 py-3 text-sm text-red-700">Rs.${Number(
          inv.balance || 0
        ).toLocaleString()}</td>
        <td class="px-6 py-3">
          <span class="inline-flex px-2 py-1 text-xs rounded-full font-semibold ${stClass}">${escHtml(
        statusLabel
      )}</span>
        </td>
        <td class="px-6 py-3">
          <div class="flex items-center space-x-2">
            <button onclick="viewCustomerCreditDetails(${Number(
              inv.customerId
            )})" class="text-blue-600 hover:text-blue-800" title="Details">
              <i data-feather="eye" class="w-4 h-4"></i>
            </button>
            ${
              isPending
                ? `<button onclick="openCustomerInstallmentPaymentModal(${Number(
                    inv.id
                  )}, ${Number(inv.balance || 0)}, ${Number(
                    inv.customerId || 0
                  )})" class="text-green-600 hover:text-green-800" title="Add Payment"><i data-feather="plus" class="w-4 h-4"></i></button>`
                : ""
            }
          </div>
        </td>
      </tr>`;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

// Modal Functions
function openAddCustomerModal() {
  const modal = document.getElementById("addCustomerModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAddCustomerModal() {
  const modal = document.getElementById("addCustomerModal");
  const form = document.getElementById("addCustomerForm");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  form?.reset();
}

async function addNewCustomer(event) {
  event?.preventDefault?.();

  const mobile = document.getElementById("newCustomerMobile").value.trim();
  const name = document.getElementById("newCustomerName").value.trim();
  const email = document.getElementById("newCustomerEmail").value.trim();
  const address = document.getElementById("newCustomerAddress").value.trim();

  if (!/^0\d{9}$/.test(mobile)) {
    showNotification(
      "Mobile number must be exactly 10 digits and start with 0",
      "warning"
    );
    document.getElementById("newCustomerMobile")?.focus();
    return;
  }

  const btn = event?.target?.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Adding...";
  }

  try {
    await custRequest("/customers", {
      method: "POST",
      body: JSON.stringify({
        mobileNumber: mobile,
        name: name || undefined,
        email: email || null,
        address: address || null,
      }),
    });
    closeAddCustomerModal();
    showNotification("Customer added successfully", "success");
    await loadCustomersData();
  } catch (err) {
    showNotification(err.message || "Failed to add customer", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Add Customer";
    }
  }
}

async function viewCustomerDetails(customerId, initialTab = "purchases") {
  try {
    const customer = await custRequest(
      `/customers/${customerId}?_=${Date.now()}`
    );
    currentCustomerDetailsId = Number(customer?.id || customerId || 0);

    document.getElementById("customerDetailsName").textContent = customer.name;
    document.getElementById("customerDetailsPhone").textContent =
      customer.phone;
    document.getElementById("customerDetailsEmail").textContent =
      customer.email || "No email provided";
    document.getElementById("customerDetailsAddress").textContent =
      customer.address || "No address provided";
    document.getElementById(
      "customerDetailsTotal"
    ).textContent = `Rs. ${customer.totalSpent.toLocaleString()}`;

    // Store raw invoices and clear any previous filters
    currentCustomerInvoices = customer.invoices || [];
    currentCustomerRepairs = customer.repairs || [];
    currentCustomerCreditInvoices = (customer.invoices || [])
      .filter(isCreditPurchaseInvoice)
      .map((inv) => ({
        ...inv,
        installments:
          inv.installments && inv.installments.length > 0
            ? inv.installments
            : parseInstallmentEntriesFromNotes(inv.notes),
      }));
    clearCustomerHistoryFilter();
    clearRepairHistoryFilter();
    clearCustomerCreditHistoryFilter();
    populateCustomerPurchases(currentCustomerInvoices);
    populateCustomerRepairs(currentCustomerRepairs);
    populateCustomerCredit(currentCustomerCreditInvoices);

    document.getElementById("customerDetailsModal").classList.remove("hidden");
    document.getElementById("customerDetailsModal").classList.add("flex");

    switchCustomerTab(
      ["credit", "repairs", "purchases"].includes(initialTab)
        ? initialTab
        : "purchases"
    );
    if (typeof feather !== "undefined") feather.replace();
  } catch (err) {
    console.error("viewCustomerDetails error:", err);
    showNotification("Failed to load customer details", "error");
  }
}

async function viewCustomerCreditDetails(customerId) {
  return viewCustomerDetails(customerId, "credit");
}

function populateCustomerPurchases(invoices) {
  const container = document.getElementById("customerPurchasesList");
  if (!container) return;

  if (!invoices || invoices.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        No purchase history found
      </div>
    `;
    return;
  }

  container.innerHTML = invoices
    .map((inv) => {
      const creditBalance = Number(inv.balance || 0);
      const hasCreditBalance = creditBalance > 0;
      return `
    <div class="border rounded-lg p-4 ${
      hasCreditBalance
        ? "border-amber-200 bg-amber-50"
        : "border-gray-200 bg-white"
    }">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h6 class="font-medium text-gray-900">${escHtml(
            inv.invoiceNumber
          )}</h6>
          <span class="text-sm text-gray-500">${new Date(
            inv.date || inv.createdAt
          ).toLocaleDateString()}</span>
        </div>
        <button type="button" onclick="reprintCustomerPurchaseInvoice(${Number(
          inv.id
        )})" class="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center transition-colors shadow-sm" title="Print Invoice / Receipt">
          <i data-feather="printer" class="w-3.5 h-3.5 mr-1"></i> Print
        </button>
      </div>

      <div class="space-y-2 mb-3">
        ${(inv.items || [])
          .map(
            (item) => `
          <div class="flex justify-between text-sm">
            <span>${escHtml(item.productName)}${
              item.variantName ? " — " + escHtml(item.variantName) : ""
            }${
              item.warrantyLabel ? " · " + escHtml(item.warrantyLabel) : ""
            } x${item.quantity}</span>
            <span>Rs. ${Number(item.subtotal || 0).toLocaleString()}</span>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="flex justify-between items-center pt-2 border-t border-gray-100">
        <span class="text-sm text-gray-600">Payment: ${escHtml(
          inv.paymentType
        )}</span>
        <div class="text-right">
          <span class="font-semibold text-gray-900 block">Total: Rs. ${Number(
            inv.totalAmount || 0
          ).toLocaleString()}</span>
          ${
            hasCreditBalance
              ? `<span class="text-xs font-semibold text-amber-800">Credit Balance: Rs. ${creditBalance.toLocaleString()}</span>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
    })
    .join("");

  if (typeof feather !== "undefined") feather.replace();
}

function populateCustomerRepairs(repairs) {
  const container = document.getElementById("customerRepairsList");
  if (!container) return;

  if (!repairs || repairs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        No repair history found
      </div>
    `;
    return;
  }

  const statusColors = {
    Received: "bg-yellow-100 text-yellow-800",
    Repairing: "bg-blue-100 text-blue-800",
    "Pending Parts": "bg-amber-100 text-amber-800",
    Completed: "bg-green-100 text-green-800",
    Delivered: "bg-purple-100 text-purple-800",
    Cancelled: "bg-red-100 text-red-800",
  };

  container.innerHTML = repairs
    .map((rep) => {
      const badge = statusColors[rep.status] || "bg-gray-100 text-gray-800";
      const receivedDate = new Date(rep.receivedAt).toLocaleDateString();
      const completedDate = rep.completedAt
        ? new Date(rep.completedAt).toLocaleDateString()
        : null;

      return `
    <div class="border border-gray-200 rounded-lg p-4">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h6 class="font-medium text-gray-900">${escHtml(
            rep.repairNumber
          )}</h6>
          <p class="text-sm font-medium text-gray-700 mt-0.5">${escHtml(
            rep.deviceName
          )}</p>
        </div>
        <div class="text-right">
          <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge}">${escHtml(
            rep.status
          )}</span>
          <p class="text-xs text-gray-500 mt-1">Received: ${receivedDate}</p>
          ${
            completedDate
              ? `<p class="text-xs text-green-600 mt-0.5">Completed: ${completedDate}</p>`
              : ""
          }
        </div>
      </div>

      <p class="text-sm text-gray-600 mb-3"><span class="font-medium">Issue:</span> ${escHtml(
        rep.issue
      )}</p>

      <div class="flex justify-between items-center pt-2 border-t border-gray-100 text-sm">
        <span class="text-gray-600">Est: Rs. ${
          rep.estimatedCost != null
            ? Number(rep.estimatedCost).toLocaleString()
            : "—"
        }</span>
        ${
          rep.actualCost != null
            ? `<span class="font-semibold text-gray-900">Actual: Rs. ${Number(
                rep.actualCost
              ).toLocaleString()}</span>`
            : `<span class="text-gray-400 italic">Pending completion</span>`
        }
      </div>
      ${
        rep.notes
          ? `<p class="text-xs text-gray-500 mt-2 italic">${escHtml(
              rep.notes
            )}</p>`
          : ""
      }
    </div>
  `;
    })
    .join("");
}

function parseInstallmentEntriesFromNotes(notes) {
  const raw = String(notes || "");
  const matches = [...raw.matchAll(/\[INST\|([^\]]+)\]/g)];
  return matches
    .map((m) => {
      const parts = String(m[1] || "").split("|");
      const [paidAt, amount, methodMeta, userNote] = parts;
      const [paymentMethod, bankAccount] = String(methodMeta || "").split("::");
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

function isCreditPurchaseInvoice(inv) {
  const notes = String(inv?.notes || "");
  return (
    Number(inv?.balance || 0) > 0 ||
    notes.includes("[CREDIT_PURCHASE]") ||
    notes.includes("[INST|")
  );
}

function populateCustomerCredit(invoices) {
  const container = document.getElementById("customerCreditList");
  if (!container) return;

  if (!invoices || invoices.length === 0) {
    container.innerHTML = `<div class="text-center py-8 text-gray-500">No credit purchases found</div>`;
    return;
  }

  container.innerHTML = invoices
    .map((inv) => {
      const installments = inv.installments || [];
      return `<div class="border border-gray-200 rounded-lg p-4">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h6 class="font-medium text-gray-900">${escHtml(
              inv.invoiceNumber || "—"
            )}</h6>
            <p class="text-sm text-gray-500">${new Date(
              inv.date
            ).toLocaleDateString()}</p>
          </div>
          <div class="text-right text-sm">
            <p class="text-gray-700">Total: Rs. ${Number(
              inv.totalAmount || 0
            ).toLocaleString()}</p>
            <p class="text-green-700">Paid: Rs. ${Number(
              inv.paidAmount || 0
            ).toLocaleString()}</p>
            <p class="text-red-700">Balance: Rs. ${Number(
              inv.balance || 0
            ).toLocaleString()}</p>
          </div>
        </div>

        <div class="bg-gray-50 rounded p-3">
          <p class="text-xs font-semibold text-gray-600 mb-2">Installments</p>
          ${
            installments.length
              ? installments
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
                      <span class="font-medium">Rs. ${Number(
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
                  .join("")
              : '<div class="text-xs text-gray-400">No installment records yet</div>'
          }
        </div>

        <div class="mt-3 flex justify-end">
          ${
            Number(inv.balance || 0) > 0
              ? `<button onclick="openCustomerInstallmentPaymentModal(${Number(
                  inv.id
                )}, ${Number(inv.balance || 0)}, ${Number(
                  inv.customerId || currentCustomerDetailsId || 0
                )}, true)" class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Add Payment</button>`
              : '<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Fully Paid</span>'
          }
        </div>
      </div>`;
    })
    .join("");
}

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

async function openCustomerInstallmentPaymentModal(
  invoiceId,
  maxBalance,
  customerId = 0,
  keepCreditTab = false
) {
  try {
    const [paymentTypes, accounts] = await Promise.all([
      custRequest("/invoices/payment-types"),
      custRequest("/accounts/accounts"),
    ]);

    const bankAccounts =
      typeof filterBankSubAccounts === "function"
        ? filterBankSubAccounts(accounts || [])
        : [];

    const typeSelect = document.getElementById(
      "customerInstallmentPaymentType"
    );
    const bankSelect = document.getElementById(
      "customerInstallmentBankAccount"
    );

    const allowedInstallmentTypes = filterInstallmentEligiblePaymentTypes(
      paymentTypes || []
    );
    typeSelect.innerHTML =
      '<option value="">Select payment method</option>' +
      allowedInstallmentTypes
        .map(
          (pt) =>
            `<option value="${Number(pt.id)}">${escHtml(
              pt.name || ""
            )}</option>`
        )
        .join("");

    bankSelect.innerHTML =
      '<option value="">Select bank account</option>' +
      bankAccounts
        .map(
          (acc) =>
            `<option value="${Number(acc.id)}">${escHtml(
              acc.accountCode
            )} - ${escHtml(acc.accountName || "")}</option>`
        )
        .join("");

    document.getElementById("customerInstallmentInvoiceId").value =
      Number(invoiceId);
    document.getElementById("customerInstallmentCustomerId").value = Number(
      customerId || 0
    );
    document.getElementById("customerInstallmentMaxBalance").value = Number(
      maxBalance || 0
    );
    document.getElementById("customerInstallmentAmount").value = Number(
      maxBalance || 0
    ).toFixed(2);
    document.getElementById(
      "customerInstallmentBalanceHint"
    ).textContent = `Remaining balance: Rs. ${Number(
      maxBalance || 0
    ).toLocaleString()}`;
    document.getElementById("customerInstallmentNote").value = "";
    document.getElementById(
      "customerInstallmentPaymentForm"
    ).dataset.keepCreditTab = keepCreditTab ? "1" : "0";

    const modal = document.getElementById("customerInstallmentPaymentModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    toggleCustomerInstallmentBankAccount();
    if (typeof feather !== "undefined") feather.replace();
  } catch (err) {
    console.error("openCustomerInstallmentPaymentModal error:", err);
    showNotification("Failed to load payment options", "error");
  }
}

function closeCustomerInstallmentPaymentModal() {
  const modal = document.getElementById("customerInstallmentPaymentModal");
  modal?.classList.add("hidden");
  modal?.classList.remove("flex");
}

function toggleCustomerInstallmentBankAccount() {
  const select = document.getElementById("customerInstallmentPaymentType");
  const wrap = document.getElementById("customerInstallmentBankAccountWrap");
  const chqWrap = document.getElementById("customerInstallmentChequeWrap");
  const bankSelect = document.getElementById("customerInstallmentBankAccount");
  const chqInput = document.getElementById("customerInstallmentChequeNumber");
  if (!select || !wrap || !bankSelect) return;

  const selectedText = (
    select.options[select.selectedIndex]?.text || ""
  ).trim();
  const isBankTransfer = /^bank\s*transfer$/i.test(selectedText);
  const isCheque = /^cheque$/i.test(selectedText);
  const needsBank = isBankTransfer || isCheque;
  wrap.classList.toggle("hidden", !needsBank);
  bankSelect.required = needsBank;
  if (chqWrap) chqWrap.classList.toggle("hidden", !isCheque);
  if (chqInput) {
    chqInput.required = isCheque;
    if (!isCheque) chqInput.value = "";
  }
  if (!needsBank) bankSelect.value = "";
}

async function submitCustomerInstallmentPayment(event) {
  event.preventDefault();

  const invoiceId = Number(
    document.getElementById("customerInstallmentInvoiceId")?.value || 0
  );
  const customerId = Number(
    document.getElementById("customerInstallmentCustomerId")?.value || 0
  );
  const maxBalance = Number(
    document.getElementById("customerInstallmentMaxBalance")?.value || 0
  );
  const amount = Number(
    document.getElementById("customerInstallmentAmount")?.value || 0
  );
  const paymentTypeId = Number(
    document.getElementById("customerInstallmentPaymentType")?.value || 0
  );
  const bankAccountId = Number(
    document.getElementById("customerInstallmentBankAccount")?.value || 0
  );
  const chequeNumber = String(
    document.getElementById("customerInstallmentChequeNumber")?.value || ""
  ).trim();
  const note = document.getElementById("customerInstallmentNote")?.value || "";
  const ptypeName = (
    document.getElementById("customerInstallmentPaymentType")
      ?.options[
      document.getElementById("customerInstallmentPaymentType")?.selectedIndex
    ]?.text || ""
  ).trim();
  const isChq = /^cheque$/i.test(ptypeName);
  const isBt = /^bank\s*transfer$/i.test(ptypeName);
  const keepCreditTab =
    document.getElementById("customerInstallmentPaymentForm")?.dataset
      ?.keepCreditTab === "1";
  const refreshCustomerId = Number(customerId || currentCustomerDetailsId || 0);

  if (!amount || amount <= 0) {
    showNotification("Enter a valid amount", "warning");
    return;
  }
  if (amount > maxBalance) {
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
  if (isChq && !chequeNumber) {
    showNotification("Enter the cheque number", "warning");
    return;
  }

  try {
    await custRequest(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        paymentTypeId,
        bankAccountId: bankAccountId || null,
        chequeNumber: isChq ? chequeNumber : null,
        note,
      }),
    });

    closeCustomerInstallmentPaymentModal();
    showNotification("Installment payment recorded", "success");

    await loadCustomerInstallments();
    handleCustomerInstallmentSearch();

    if (refreshCustomerId) {
      await viewCustomerDetails(
        refreshCustomerId,
        keepCreditTab ? "credit" : "purchases"
      );
    }
  } catch (err) {
    console.error("submitCustomerInstallmentPayment error:", err);
    showNotification(
      err.message || "Failed to record installment payment",
      "error"
    );
  }
}

function switchCustomerTab(tabName) {
  // Hide all tab contents
  document
    .querySelectorAll(
      "#customerDetailsModal .customer-tab-content, .customer-tab-content"
    )
    .forEach((content) => {
      content.classList.add("hidden");
    });

  // Remove active class from all tabs
  document
    .querySelectorAll(
      "#customerDetailsModal .customer-tab-btn, .customer-tab-btn"
    )
    .forEach((btn) => {
      btn.classList.remove("active", "border-blue-500", "text-blue-600");
      btn.classList.add("border-transparent", "text-gray-500");
    });

  // Show selected tab content
  const targetContent = document.getElementById(`${tabName}Content`);
  if (targetContent) targetContent.classList.remove("hidden");

  // Add active class to selected tab
  const activeTab = document.getElementById(`${tabName}Tab`);
  if (activeTab) {
    activeTab.classList.add("active", "border-blue-500", "text-blue-600");
    activeTab.classList.remove("border-transparent", "text-gray-500");
  }
}

function closeCustomerDetailsModal() {
  document.getElementById("customerDetailsModal").classList.add("hidden");
  document.getElementById("customerDetailsModal").classList.remove("flex");
  currentCustomerDetailsId = 0;
}

function getCustomerPurchasesFiltered() {
  const search = (document.getElementById("historySearchInput")?.value || "")
    .toLowerCase()
    .trim();
  const fromVal = document.getElementById("historyDateFrom")?.value;
  const toVal = document.getElementById("historyDateTo")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  return currentCustomerInvoices.filter((inv) => {
    const invDate = new Date(inv.date);
    if (from && invDate < from) return false;
    if (to && invDate > to) return false;
    if (search) {
      const inInvoiceNum = (inv.invoiceNumber || "")
        .toLowerCase()
        .includes(search);
      const inItems = (inv.items || []).some(
        (it) =>
          (it.productName || "").toLowerCase().includes(search) ||
          (it.variantName && it.variantName.toLowerCase().includes(search))
      );
      if (!inInvoiceNum && !inItems) return false;
    }
    return true;
  });
}

function filterCustomerHistory() {
  populateCustomerPurchases(getCustomerPurchasesFiltered());
}

function clearCustomerHistoryFilter() {
  const searchEl = document.getElementById("historySearchInput");
  const fromEl = document.getElementById("historyDateFrom");
  const toEl = document.getElementById("historyDateTo");
  if (searchEl) searchEl.value = "";
  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  populateCustomerPurchases(currentCustomerInvoices);
}

function getCustomerRepairsFiltered() {
  const search = (document.getElementById("repairSearchInput")?.value || "")
    .toLowerCase()
    .trim();
  const statusFilter =
    document.getElementById("repairStatusFilter")?.value || "";
  const fromVal = document.getElementById("repairDateFrom")?.value;
  const toVal = document.getElementById("repairDateTo")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  return currentCustomerRepairs.filter((rep) => {
    const repDate = new Date(rep.receivedAt);
    if (from && repDate < from) return false;
    if (to && repDate > to) return false;
    if (statusFilter && rep.status !== statusFilter) return false;
    if (search) {
      const inNum = rep.repairNumber.toLowerCase().includes(search);
      const inDevice = rep.deviceName.toLowerCase().includes(search);
      const inIssue = rep.issue.toLowerCase().includes(search);
      if (!inNum && !inDevice && !inIssue) return false;
    }
    return true;
  });
}

function filterRepairHistory() {
  populateCustomerRepairs(getCustomerRepairsFiltered());
}

function clearRepairHistoryFilter() {
  const searchEl = document.getElementById("repairSearchInput");
  const statusEl = document.getElementById("repairStatusFilter");
  const fromEl = document.getElementById("repairDateFrom");
  const toEl = document.getElementById("repairDateTo");
  if (searchEl) searchEl.value = "";
  if (statusEl) statusEl.value = "";
  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  populateCustomerRepairs(currentCustomerRepairs);
}

function getCustomerCreditFiltered() {
  const search = (document.getElementById("creditSearchInput")?.value || "")
    .toLowerCase()
    .trim();
  const statusFilter =
    document.getElementById("creditStatusFilter")?.value || "";
  const fromVal = document.getElementById("creditDateFrom")?.value;
  const toVal = document.getElementById("creditDateTo")?.value;
  const from = fromVal ? new Date(fromVal) : null;
  const to = toVal ? new Date(toVal + "T23:59:59") : null;

  return currentCustomerCreditInvoices.filter((inv) => {
    const invDate = new Date(inv.date);
    if (from && invDate < from) return false;
    if (to && invDate > to) return false;
    const bal = Number(inv.balance || 0);
    if (statusFilter === "outstanding" && bal <= 0) return false;
    if (statusFilter === "settled" && bal > 0) return false;
    if (search) {
      const inNum = (inv.invoiceNumber || "").toLowerCase().includes(search);
      const inItems = (inv.items || []).some(
        (it) =>
          (it.productName || "").toLowerCase().includes(search) ||
          (it.variantName &&
            String(it.variantName).toLowerCase().includes(search))
      );
      if (!inNum && !inItems) return false;
    }
    return true;
  });
}

function filterCustomerCreditHistory() {
  populateCustomerCredit(getCustomerCreditFiltered());
}

function clearCustomerCreditHistoryFilter() {
  ["creditSearchInput", "creditStatusFilter", "creditDateFrom", "creditDateTo"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    }
  );
  populateCustomerCredit(currentCustomerCreditInvoices);
}

function editCustomer(customerId) {
  const customer = customersData.find((c) => c.id === customerId);
  if (!customer) return;

  document.getElementById("editCustomerId").value = customer.id;
  document.getElementById("editCustomerMobile").value = customer.phone;
  document.getElementById("editCustomerName").value = customer.name;
  document.getElementById("editCustomerEmail").value = customer.email || "";
  document.getElementById("editCustomerAddress").value = customer.address || "";

  document.getElementById("editCustomerModal").classList.remove("hidden");
  document.getElementById("editCustomerModal").classList.add("flex");
}

function closeEditCustomerModal() {
  document.getElementById("editCustomerModal").classList.add("hidden");
  document.getElementById("editCustomerModal").classList.remove("flex");
  document.getElementById("editCustomerForm").reset();
}

async function updateCustomer(event) {
  event.preventDefault();

  const customerId = document.getElementById("editCustomerId").value;
  const mobile = document.getElementById("editCustomerMobile").value.trim();
  const name = document.getElementById("editCustomerName").value.trim();
  const email = document.getElementById("editCustomerEmail").value.trim();
  const address = document.getElementById("editCustomerAddress").value.trim();

  if (!/^0\d{9}$/.test(mobile)) {
    showNotification(
      "Mobile number must be exactly 10 digits and start with 0",
      "warning"
    );
    document.getElementById("editCustomerMobile")?.focus();
    return;
  }

  const btn = event.target.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Updating...";
  }

  try {
    await custRequest(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({
        mobileNumber: mobile,
        name: name || undefined,
        email: email || null,
        address: address || null,
      }),
    });
    closeEditCustomerModal();
    showNotification("Customer updated successfully", "success");
    await loadCustomersData();
  } catch (err) {
    showNotification(err.message || "Failed to update customer", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Update Customer";
    }
  }
}

async function deleteCustomer(customerId) {
  if (!canDeleteCustomers()) {
    showNotification("You do not have permission to delete customers", "error");
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this customer? This action cannot be undone."
    )
  )
    return;

  try {
    await custRequest(`/customers/${customerId}`, { method: "DELETE" });
    showNotification("Customer deleted successfully", "success");
    await loadCustomersData();
  } catch (err) {
    showNotification(err.message || "Failed to delete customer", "error");
  }
}

// Utility Functions
function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getInitials(name) {
  if (!name) return "C";
  const words = name.split(" ");
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Loyalty functionality removed

function getRepairStatusColor(status) {
  switch (status) {
    case "Received":
      return "bg-yellow-100 text-yellow-800";
    case "Repairing":
      return "bg-blue-100 text-blue-800";
    case "Pending Parts":
      return "bg-amber-100 text-amber-800";
    case "Completed":
      return "bg-green-100 text-green-800";
    case "Delivered":
      return "bg-purple-100 text-purple-800";
    case "Cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

// Notification function (assuming it exists globally)
// Use global showNotification from utils/notifications.js

function initializeCustomersPage() {
  console.log("👥 Customers page initialized");
}

// PDF Download Functions
// PDF Download Functions
function csvExportLine(cells) {
  const esc = (x) => {
    const s = String(x ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return cells.map(esc).join(",");
}

async function downloadCustomerDirectoryXL() {
  try {
    const dataToExport = getCustomerDirectoryExportData();
    const ok = await exportXlsxWithTable({
      title: "Customer Directory Report",
      filters: getCustomerDirectoryExportFilters(),
      headers: [
        "ID",
        "Name",
        "Phone",
        "Email",
        "Address",
        "Total Spent",
        "Last Purchase",
        "Status",
      ],
      rows: dataToExport.map((customer) => [
        `C${String(customer.id).padStart(3, "0")}`,
        customer.name || "N/A",
        customer.phone || "N/A",
        customer.email || "N/A",
        customer.address || "N/A",
        customer.totalSpent || 0,
        customer.lastPurchaseDate
          ? new Date(customer.lastPurchaseDate).toISOString().slice(0, 10)
          : "",
        customer.invoiceCount > 0 ? "Active" : "New",
      ]),
      sheetName: "Customers",
      fileName: `customer-directory-${new Date().toISOString().split("T")[0]}.xlsx`,
      emptyMessage: "No customer data to export.",
    });
    if (ok) showNotification("XL file downloaded.", "success");
  } catch (err) {
    console.error(err);
    showNotification("Failed to export XL.", "error");
  }
}

function exportCustomerDetailsPurchasesPDF() {
  const rows = getCustomerPurchasesFiltered();
  const name = getCustomerDetailsExportName();
  const ok = exportPdfWithTable({
    title: `Purchases — ${name}`,
    filters: getCustomerPurchasesExportFilters(),
    head: ["Invoice", "Date", "Items", "Total", "Payment", "Credit bal."],
    body: rows.map((inv) => {
      const items = formatCustomerPurchaseItems(inv);
      return [
        inv.invoiceNumber || "—",
        new Date(inv.date).toLocaleDateString(),
        items.slice(0, 120) + (items.length > 120 ? "…" : ""),
        `Rs.${Number(inv.totalAmount || 0).toLocaleString()}`,
        String(inv.paymentType || "—"),
        `Rs.${Number(inv.balance || 0).toLocaleString()}`,
      ];
    }),
    fileName: `customer-${currentCustomerDetailsId}-purchases.pdf`,
    emptyMessage: "No purchases to export for current filters.",
  });
  if (ok) showNotification("Purchases PDF downloaded.", "success");
}

async function exportCustomerDetailsPurchasesXL() {
  const rows = getCustomerPurchasesFiltered();
  const name = getCustomerDetailsExportName();
  const ok = await exportXlsxWithTable({
    title: `Purchases — ${name}`,
    filters: getCustomerPurchasesExportFilters(),
    headers: ["Invoice", "Date", "Items", "Total", "Payment", "Credit balance"],
    rows: rows.map((inv) => [
      inv.invoiceNumber || "",
      new Date(inv.date).toISOString().slice(0, 10),
      formatCustomerPurchaseItems(inv).replace(/^—$/, ""),
      Number(inv.totalAmount || 0),
      inv.paymentType || "",
      Number(inv.balance || 0),
    ]),
    sheetName: "Purchases",
    fileName: `customer-${currentCustomerDetailsId}-purchases.xlsx`,
    emptyMessage: "No purchases to export for current filters.",
  });
  if (ok) showNotification("XL downloaded.", "success");
}

function exportCustomerDetailsRepairsPDF() {
  const rows = getCustomerRepairsFiltered();
  const name = getCustomerDetailsExportName();
  const ok = exportPdfWithTable({
    title: `Repairs — ${name}`,
    filters: getCustomerRepairsExportFilters(),
    head: ["ID", "Status", "Device", "Issue", "Received", "Completed", "Cost"],
    body: rows.map((r) => [
      r.repairNumber || "—",
      r.status || "—",
      r.deviceName || "—",
      (r.issue || "").slice(0, 80),
      new Date(r.receivedAt).toLocaleDateString(),
      r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—",
      r.actualCost != null
        ? `Rs.${Number(r.actualCost).toLocaleString()}`
        : `Est Rs.${Number(r.estimatedCost || 0).toLocaleString()}`,
    ]),
    fileName: `customer-${currentCustomerDetailsId}-repairs.pdf`,
    emptyMessage: "No repairs to export for current filters.",
  });
  if (ok) showNotification("Repairs PDF downloaded.", "success");
}

async function exportCustomerDetailsRepairsXL() {
  const rows = getCustomerRepairsFiltered();
  const name = getCustomerDetailsExportName();
  const ok = await exportXlsxWithTable({
    title: `Repairs — ${name}`,
    filters: getCustomerRepairsExportFilters(),
    headers: [
      "Repair ID",
      "Status",
      "Device",
      "Issue",
      "Received",
      "Completed",
      "Estimated",
      "Actual",
    ],
    rows: rows.map((r) => [
      r.repairNumber || "",
      r.status || "",
      r.deviceName || "",
      r.issue || "",
      new Date(r.receivedAt).toISOString().slice(0, 10),
      r.completedAt ? new Date(r.completedAt).toISOString().slice(0, 10) : "",
      r.estimatedCost != null ? Number(r.estimatedCost) : "",
      r.actualCost != null ? Number(r.actualCost) : "",
    ]),
    sheetName: "Repairs",
    fileName: `customer-${currentCustomerDetailsId}-repairs.xlsx`,
    emptyMessage: "No repairs to export for current filters.",
  });
  if (ok) showNotification("XL downloaded.", "success");
}

function exportCustomerDetailsCreditPDF() {
  const rows = getCustomerCreditFiltered();
  const name = getCustomerDetailsExportName();
  const ok = exportPdfWithTable({
    title: `Credit — ${name}`,
    filters: getCustomerCreditExportFilters(),
    head: ["Invoice", "Date", "Total", "Paid", "Balance", "Installments"],
    body: rows.map((inv) => {
      const installments = inv.installments || [];
      const instText = installments.length
        ? installments
            .map(
              (i) =>
                `${new Date(i.paidAt).toLocaleDateString()}: Rs.${Number(i.amount || 0).toLocaleString()}`
            )
            .join("; ")
        : "—";
      return [
        inv.invoiceNumber || "—",
        new Date(inv.date).toLocaleDateString(),
        `Rs.${Number(inv.totalAmount || 0).toLocaleString()}`,
        `Rs.${Number(inv.paidAmount || 0).toLocaleString()}`,
        `Rs.${Number(inv.balance || 0).toLocaleString()}`,
        instText.slice(0, 100) + (instText.length > 100 ? "…" : ""),
      ];
    }),
    fileName: `customer-${currentCustomerDetailsId}-credit.pdf`,
    emptyMessage: "No credit records for current filters.",
  });
  if (ok) showNotification("Credit PDF downloaded.", "success");
}

async function exportCustomerDetailsCreditXL() {
  const rows = getCustomerCreditFiltered();
  const name = getCustomerDetailsExportName();
  const ok = await exportXlsxWithTable({
    title: `Credit — ${name}`,
    filters: getCustomerCreditExportFilters(),
    headers: [
      "Invoice",
      "Date",
      "Total",
      "Paid",
      "Balance",
      "Installment lines",
    ],
    rows: rows.map((inv) => {
      const installments = inv.installments || [];
      const instText = installments.length
        ? installments
            .map(
              (i) =>
                `${new Date(i.paidAt).toISOString().slice(0, 10)}|${Number(i.amount || 0)}`
            )
            .join("; ")
        : "";
      return [
        inv.invoiceNumber || "",
        new Date(inv.date).toISOString().slice(0, 10),
        Number(inv.totalAmount || 0),
        Number(inv.paidAmount || 0),
        Number(inv.balance || 0),
        instText,
      ];
    }),
    sheetName: "Credit",
    fileName: `customer-${currentCustomerDetailsId}-credit.xlsx`,
    emptyMessage: "No credit records for current filters.",
  });
  if (ok) showNotification("XL downloaded.", "success");
}

function downloadCustomerDirectoryPDF() {
  try {
    const dataToExport = getCustomerDirectoryExportData();
    const totalRevenue = dataToExport.reduce(
      (sum, c) => sum + (c.totalSpent || 0),
      0
    );
    const ok = exportPdfWithTable({
      title: "Customer Directory Report",
      filters: getCustomerDirectoryExportFilters(),
      head: [
        "ID",
        "Name",
        "Phone",
        "Email",
        "Address",
        "Total Spent",
        "Last Purchase",
        "Status",
      ],
      body: dataToExport.map((customer) => [
        `C${String(customer.id).padStart(3, "0")}`,
        customer.name || "N/A",
        customer.phone || "N/A",
        customer.email || "N/A",
        customer.address || "N/A",
        `Rs. ${(customer.totalSpent || 0).toLocaleString()}`,
        customer.lastPurchaseDate
          ? new Date(customer.lastPurchaseDate).toLocaleDateString()
          : "Never",
        customer.invoiceCount > 0 ? "Active" : "New",
      ]),
      fileName: `customer-directory-${new Date().toISOString().split("T")[0]}.pdf`,
      summary: `Total Customers: ${dataToExport.length}  |  Total Revenue: Rs. ${totalRevenue.toLocaleString()}`,
      emptyMessage: "No customer data available to export",
    });
    if (ok) {
      showNotification("Customer directory PDF downloaded successfully!", "success");
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    showNotification("Failed to generate PDF. Please try again.", "error");
  }
}

function reprintCustomerPurchaseInvoice(invoiceId, customerNameOverride) {
  let inv = null;

  if (typeof currentCustomerInvoices !== "undefined" && Array.isArray(currentCustomerInvoices)) {
    inv = currentCustomerInvoices.find((i) => Number(i.id) === Number(invoiceId));
  }
  if (!inv && typeof posCustomerDetailsState !== "undefined" && posCustomerDetailsState?.invoices) {
    inv = posCustomerDetailsState.invoices.find((i) => Number(i.id) === Number(invoiceId));
  }

  if (inv && inv.items && inv.items.length > 0) {
    doPrintInvoiceReceipt(inv, customerNameOverride);
    return;
  }

  const reqFn = typeof custRequest === "function" ? custRequest : (typeof apiFetch === "function" ? apiFetch : null);
  if (!reqFn) {
    showNotification("Unable to fetch invoice for printing", "error");
    return;
  }

  reqFn(`/invoices/${invoiceId}`)
    .then((res) => {
      const fetchedInv = res.data || res;
      doPrintInvoiceReceipt(fetchedInv, customerNameOverride);
    })
    .catch((err) => {
      console.error("reprintCustomerPurchaseInvoice error:", err);
      showNotification("Failed to load invoice for printing", "error");
    });
}

function doPrintInvoiceReceipt(inv, customerNameOverride) {
  if (!inv) {
    showNotification("Invoice not found", "error");
    return;
  }

  const invoiceNumber = inv.invoiceNumber || `INV-${inv.id}`;
  const custName =
    customerNameOverride ||
    inv.customerName ||
    (typeof getCustomerDetailsExportName === "function" ? getCustomerDetailsExportName() : null) ||
    "Customer";

  const rawDate = inv.createdAt || inv.date;
  const receiptDate = rawDate ? new Date(rawDate) : new Date();
  const receiptDateLabel = Number.isNaN(receiptDate.getTime())
    ? new Date().toLocaleString()
    : receiptDate.toLocaleString();
  const total = Number(inv.totalAmount || 0);

  const rowsHtml = (inv.items || [])
    .map(
      (it) => `<div class="item"><span>${escHtml(
        it.productName || "Product"
      )}${it.variantName ? " — " + escHtml(it.variantName) : ""}</span></div>
      ${
        it.warrantyLabel
          ? `<div class="item"><span>Warranty: ${escHtml(
              it.warrantyLabel
            )}</span><span></span></div>`
          : ""
      }
      <div class="item"><span>${it.quantity} × Rs.${Number(
        it.unitPrice || 0
      ).toLocaleString()}</span><span>Rs.${Number(
        it.subtotal || 0
      ).toLocaleString()}</span></div>`
    )
    .join("");

  const htmlContent = `<!DOCTYPE html>
<html><head><title>Receipt - ${invoiceNumber}</title>
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
  <p>Customer: ${escHtml(custName)}</p>
</div>
<div class="items">${rowsHtml}</div>
<div class="total">
  <div class="item"><span>TOTAL:</span><span>Rs.${total.toLocaleString()}</span></div>
  ${
    inv.discount > 0
      ? `<div class="item"><span>Discount:</span><span>-Rs.${Number(
          inv.discount
        ).toLocaleString()}</span></div>`
      : ""
  }
  ${
    inv.paidAmount != null
      ? `<div class="item"><span>Paid:</span><span>Rs.${Number(inv.paidAmount).toLocaleString()}</span></div>`
      : ""
  }
  ${
    inv.balance > 0
      ? `<div class="item"><span>Balance:</span><span>Rs.${Number(inv.balance).toLocaleString()}</span></div>`
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

window.reprintCustomerPurchaseInvoice = reprintCustomerPurchaseInvoice;

// Module exports for compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    generateCustomersContent,
    initializeCustomersModule,
    initializeCustomersPage,
  };
}
