// Accounts Module - Main Entry Point
// All data is fetched from the real backend API

// ─── API config ──────────────────────────────────────────────────────────────
const ACCOUNTS_API_BASE = window.API_BASE_URL || "http://localhost:3000/api";

function accountsGetAuthToken() {
  return (
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    ""
  );
}

async function accountsRequest(path, options = {}) {
  const token = accountsGetAuthToken();
  if (!token) throw new Error("Authentication required. Please login first.");
  const res = await fetch(`${ACCOUNTS_API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      text?.slice(0, 120) || `Request failed (${res.status})`
    );
  }
  if (!res.ok || !json?.success)
    throw new Error(json?.message || `Request failed (${res.status})`);
  return json.data;
}

// ─── Module State ─────────────────────────────────────────────────────────────
let accountsData = {
  accountTypes: [],
  accounts: [],
  mappings: [],
  journalEntries: [],
};

// Current active tab
let currentAccountsTab = "chart-of-accounts";
const TRANSACTION_MAPPING_TAB_ENABLED = false;
let accountsTabLoadToken = 0;

// ─── Initialize Module ───────────────────────────────────────────────────────
function initializeAccountsModule() {
  const dynamicContent = document.getElementById("dynamic-content");
  if (dynamicContent) {
    dynamicContent.innerHTML = generateAccountsContent();
    setTimeout(() => {
      feather.replace();
      loadAccountsData();
    }, 100);
  }
}

// Load accounts + account types from API
async function loadAccountsData(loadToken = accountsTabLoadToken) {
  try {
    const fetchWithRetry = async (fn, retries = 1) => {
      let lastError;
      for (let i = 0; i <= retries; i++) {
        try {
          return await fn();
        } catch (err) {
          lastError = err;
          if (i < retries) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
      throw lastError;
    };

    const [types, accounts] = await Promise.all([
      fetchWithRetry(() => accountsRequest("/accounts/account-types"), 1),
      fetchWithRetry(() => accountsRequest("/accounts/accounts"), 1),
    ]);

    if (loadToken !== accountsTabLoadToken) return;

    accountsData.accountTypes = types;
    accountsData.accounts = accounts;
    if (currentAccountsTab === "chart-of-accounts") {
      renderChartOfAccountsTab();
    }
  } catch (err) {
    if (loadToken !== accountsTabLoadToken) return;
    console.error("Failed to load accounts data:", err);
    showNotification(
      "Failed to load accounts: " + (err.message || err),
      "error"
    );
    const tabContent = document.getElementById("accounts-tab-content");
    if (tabContent)
      tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-red-500">Failed to load accounts data. ${
        err?.message
          ? `<br/><span class="text-sm text-gray-600">${err.message}</span>`
          : "Please try again."
      }</div>`;
  }
}

// Generate main accounts page content (shell with tabs)
function generateAccountsContent() {
  return `
    <div class="content-fade-in">
      <!-- Tabs Navigation -->
      <div class="bg-white rounded-lg shadow-md mb-6">
        <div class="border-b border-gray-200">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button onclick="switchAccountsTab('chart-of-accounts')" 
                    class="accounts-tab-btn py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap active" 
                    data-tab="chart-of-accounts">
              <i data-feather="list" class="w-4 h-4 inline mr-2"></i>
              Chart of Accounts
            </button>
            <button type="button"
                    onclick="switchAccountsTab('transaction-mapping')"
                    class="accounts-tab-btn accounts-tab-btn-disabled py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap"
                    data-tab="transaction-mapping"
                    aria-disabled="true"
                    title="Temporarily unavailable">
              <i data-feather="git-branch" class="w-4 h-4 inline mr-2"></i>
              Transaction Mapping
            </button>
            <button onclick="switchAccountsTab('journal-entries')" 
                    class="accounts-tab-btn py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                    data-tab="journal-entries">
              <i data-feather="book" class="w-4 h-4 inline mr-2"></i>
              Journal Entries
            </button>
            <button onclick="switchAccountsTab('reports')" 
                    class="accounts-tab-btn py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap" 
                    data-tab="reports">
              <i data-feather="bar-chart-2" class="w-4 h-4 inline mr-2"></i>
              Reports
            </button>
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      <div id="accounts-tab-content">
        <div class="bg-white rounded-lg shadow-md p-10 text-center text-gray-400">
          <p>Loading accounts...</p>
        </div>
      </div>
    </div>
  `;
}

// Switch between tabs
async function switchAccountsTab(tabName) {
  if (tabName === "transaction-mapping" && !TRANSACTION_MAPPING_TAB_ENABLED) {
    if (typeof showNotification === "function") {
      showNotification(
        "Transaction Mapping is temporarily unavailable.",
        "info"
      );
    }
    return;
  }

  currentAccountsTab = tabName;
  const loadToken = ++accountsTabLoadToken;

  // Update tab buttons
  document.querySelectorAll(".accounts-tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) btn.classList.add("active");
  });

  const tabContent = document.getElementById("accounts-tab-content");
  tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-gray-400"><p>Loading...</p></div>`;

  try {
    switch (tabName) {
      case "chart-of-accounts":
        await loadAccountsData(loadToken);
        break;
      case "transaction-mapping":
        if (loadToken !== accountsTabLoadToken) return;
        await loadTransactionMappingTab();
        break;
      case "journal-entries":
        if (loadToken !== accountsTabLoadToken) return;
        await loadJournalEntriesTab({}, loadToken);
        break;
      case "reports":
        if (loadToken !== accountsTabLoadToken) return;
        await loadReportsTab();
        break;
    }
  } catch (err) {
    if (loadToken !== accountsTabLoadToken) return;
    console.error("Tab load error:", err);
    tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-red-500">Failed to load tab: ${err.message}</div>`;
  }
}

// ─── Chart of Accounts Tab ────────────────────────────────────────────────────
const ACCOUNT_TYPE_COLORS = {
  Assets: "#197BBD",
  Liabilities: "#E14942",
  Equity: "#8B5CF6",
  Revenue: "#3EAF3F",
  Expenses: "#FF8D28",
};
const ACCOUNT_TYPE_ICONS = {
  Assets: "trending-up",
  Liabilities: "trending-down",
  Equity: "pie-chart",
  Revenue: "dollar-sign",
  Expenses: "credit-card",
};

function renderChartOfAccountsTab() {
  const tabContent = document.getElementById("accounts-tab-content");
  if (!tabContent) return;
  tabContent.innerHTML = generateChartOfAccountsTab();
  feather.replace();
}

function generateChartOfAccountsTab() {
  const { accountTypes, accounts } = accountsData;

  return `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-800">Chart of Accounts</h2>
        <button onclick="openAddAccountModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="plus" class="w-4 h-4 mr-2"></i>
          Add Account
        </button>
      </div>

      <!-- Account Type Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        ${accountTypes
          .map((type) => {
            const color = ACCOUNT_TYPE_COLORS[type.name] || "#6B7280";
            const icon = ACCOUNT_TYPE_ICONS[type.name] || "circle";
            const count = accounts.filter(
              (acc) => acc.accountTypeId === type.id
            ).length;
            return `
          <div class="stat-card card p-4 border-l-4" style="border-left-color: ${color}">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-gray-600 text-sm font-medium">${type.name}</p>
                <p class="text-2xl font-bold text-gray-800">${count}</p>
                <p class="text-xs text-gray-500 mt-1">${type.normalSide} side</p>
              </div>
              <div class="p-3 rounded-full" style="background-color: ${color}20">
                <i data-feather="${icon}" class="w-6 h-6" style="color: ${color}"></i>
              </div>
            </div>
          </div>
        `;
          })
          .join("")}
      </div>

      <!-- Accounts Tree View -->
      <div class="space-y-4">
        ${accountTypes
          .map((type) => {
            const color = ACCOUNT_TYPE_COLORS[type.name] || "#6B7280";
            const icon = ACCOUNT_TYPE_ICONS[type.name] || "circle";
            return generateAccountTypeSection(type, color, icon);
          })
          .join("")}
      </div>
    </div>
  `;
}

function generateAccountTypeSection(accountType, color, icon) {
  const { accounts } = accountsData;
  const topLevel = accounts.filter(
    (acc) => acc.accountTypeId === accountType.id && !acc.parentId
  );
  // Sum only root display balances once (each root rolls up its children) to avoid double-count
  const totalBalance = topLevel.reduce(
    (sum, acc) => sum + getAccountDisplayBalance(acc.id),
    0
  );

  return `
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" 
           style="background: linear-gradient(135deg, ${color}15 0%, ${color}05 100%)"
           onclick="toggleAccountSection('section-${accountType.id}')">
        <div class="flex items-center space-x-3">
          <i data-feather="chevron-down" class="w-5 h-5 transition-transform" id="chevron-${
            accountType.id
          }"></i>
          <i data-feather="${icon}" class="w-5 h-5" style="color: ${color}"></i>
          <h3 class="text-lg font-semibold" style="color: ${color}">${
    accountType.name
  }</h3>
          <span class="text-sm text-gray-500">(${accountType.normalSide})</span>
        </div>
        <div class="text-right">
          <p class="text-sm font-medium text-gray-600">Total Balance</p>
          <p class="text-lg font-bold" style="color: ${color}">
            Rs. ${totalBalance.toLocaleString()}
          </p>
        </div>
      </div>
      <div id="section-${accountType.id}" class="account-section">
        <div class="p-4 space-y-2">
          ${topLevel.map((acc) => generateAccountRow(acc, color, 0)).join("")}
          ${
            topLevel.length === 0
              ? '<p class="text-sm text-gray-400 text-center py-2">No accounts in this category</p>'
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

function getAccountDisplayBalance(accountId, visited = new Set()) {
  if (visited.has(accountId)) return 0;
  visited.add(accountId);

  const { accounts } = accountsData;
  const account = accounts.find((acc) => acc.id === accountId);
  if (!account) return 0;

  const ownBalance = Number(account.balance || 0);
  const children = accounts.filter((acc) => acc.parentId === accountId);
  const childTotal = children.reduce(
    (sum, child) => sum + getAccountDisplayBalance(child.id, visited),
    0
  );

  return ownBalance + childTotal;
}

function generateAccountRow(account, color, level) {
  const { accounts } = accountsData;
  const children = accounts.filter((acc) => acc.parentId === account.id);
  const hasChildren = children.length > 0;
  const indent = level * 24;
  const displayBalance = hasChildren
    ? getAccountDisplayBalance(account.id)
    : Number(account.balance || 0);

  return `
    <div class="account-row">
      <div class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
           style="margin-left: ${indent}px">
        <div class="flex items-center space-x-3 flex-1">
          ${
            hasChildren
              ? `<button onclick="toggleAccountChildren('children-${account.id}')" class="p-1">
              <i data-feather="chevron-right" class="w-4 h-4 text-gray-400 transition-transform" id="chevron-acc-${account.id}"></i>
            </button>`
              : '<div class="w-6"></div>'
          }
          <div class="flex-1">
            <div class="flex items-center space-x-2">
              <span class="font-mono text-sm text-gray-500">${
                account.accountCode
              }</span>
              <span class="font-medium text-gray-800">${
                account.accountName
              }</span>
              ${
                !account.isActive
                  ? '<span class="text-xs px-2 py-1 bg-red-100 text-red-600 rounded">Inactive</span>'
                  : ""
              }
            </div>
            ${
              account.description
                ? `<p class="text-xs text-gray-400 mt-0.5">${account.description}</p>`
                : ""
            }
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="text-right">
            <p class="font-semibold text-gray-800">Rs. ${Number(
              displayBalance
            ).toLocaleString()}</p>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="viewAccountDetails(${
              account.id
            })" class="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="View Ledger Details">
              <i data-feather="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="editAccount(${
              account.id
            })" class="p-2 text-blue-600 hover:bg-blue-50 rounded">
              <i data-feather="edit-2" class="w-4 h-4"></i>
            </button>
            <button onclick="deleteAccount(${
              account.id
            })" class="p-2 text-red-600 hover:bg-red-50 rounded">
              <i data-feather="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      </div>
      ${
        hasChildren
          ? `<div id="children-${account.id}" class="account-children hidden">
          ${children
            .map((child) => generateAccountRow(child, color, level + 1))
            .join("")}
        </div>`
          : ""
      }
    </div>
  `;
}

// Toggle account section collapse/expand
function toggleAccountSection(sectionId) {
  const section = document.getElementById(sectionId);
  const chevronId = sectionId.replace("section-", "chevron-");
  const chevron = document.getElementById(chevronId);
  if (section.classList.contains("hidden")) {
    section.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(0deg)";
  } else {
    section.classList.add("hidden");
    if (chevron) chevron.style.transform = "rotate(-90deg)";
  }
}

// Toggle account children
function toggleAccountChildren(childrenId) {
  const children = document.getElementById(childrenId);
  const accountId = childrenId.replace("children-", "");
  const chevron = document.getElementById(`chevron-acc-${accountId}`);
  if (children.classList.contains("hidden")) {
    children.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(90deg)";
  } else {
    children.classList.add("hidden");
    if (chevron) chevron.style.transform = "rotate(0deg)";
  }
}

// Export functions to global scope
window.initializeAccountsModule = initializeAccountsModule;
window.switchAccountsTab = switchAccountsTab;
window.toggleAccountSection = toggleAccountSection;
window.toggleAccountChildren = toggleAccountChildren;
window.accountsRequest = accountsRequest;
window.accountsData = accountsData;
window.loadAccountsData = loadAccountsData;
window.renderChartOfAccountsTab = renderChartOfAccountsTab;
