// Accounts Module - Part 2: Transaction Mapping, Journal Entries, and Reports
// All data fetched from real API

// ============================================
// TRANSACTION MAPPING TAB
// ============================================

let currentJEFilters = { from: "", to: "", referenceType: "", page: 1, limit: 50 };
let currentReportFilters = { from: "", to: "" };
let activeReportType = "trial-balance";
let journalEntriesMeta = { total: 0, page: 1, limit: 50, pages: 1 };

function escapeAccountsAttr(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;");
}

async function loadTransactionMappingTab() {
  try {
    const [mappings, accounts, accountTypes] = await Promise.all([
      accountsRequest("/accounts/mappings"),
      accountsRequest("/accounts/accounts"),
      accountsRequest("/accounts/account-types"),
    ]);
    accountsData.mappings = mappings;
    accountsData.accounts = accounts;
    accountsData.accountTypes = accountTypes;

    const tabContent = document.getElementById("accounts-tab-content");
    tabContent.innerHTML = generateTransactionMappingTab();
    feather.replace();
  } catch (err) {
    throw err;
  }
}

function generateTransactionMappingTab() {
  const modules = ["GRN", "INVOICE", "INVENTORY", "PAYROLL", "REPAIRS"];
  const moduleIcons = {
    GRN: "package",
    INVOICE: "file-text",
    INVENTORY: "box",
    PAYROLL: "dollar-sign",
    REPAIRS: "tool",
  };
  const moduleNames = {
    GRN: "Goods Received Note",
    INVOICE: "Sales & Invoicing",
    INVENTORY: "Inventory Management",
    PAYROLL: "Payroll & Salaries",
    REPAIRS: "Repair Services",
  };

  return `
    <div>
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Transaction Mapping Configuration</h2>
        <p class="text-sm text-gray-600 mt-1">Configure which accounts are debited and credited for each system transaction point. Changes are saved automatically to the database.</p>
        <p class="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded px-3 py-2 mt-2">Mappings control automatic postings from system transactions (GRN, invoice, payroll, repairs). Manual Journal Entries are still available for one-off or adjustment entries.</p>
      </div>

      ${modules
        .map((module) => {
          const moduleMappings = accountsData.mappings.filter(
            (m) => m.module === module
          );
          if (moduleMappings.length === 0) return "";

          return `
          <div class="card p-6 mb-6">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 cursor-pointer" onclick="toggleModuleSection('${module}')">
              <div class="flex items-center">
                <i data-feather="${
                  moduleIcons[module]
                }" class="w-6 h-6 text-blue-600 mr-3"></i>
                <div>
                  <h3 class="text-lg font-semibold text-gray-800">${
                    moduleNames[module]
                  }</h3>
                  <p class="text-xs text-gray-500">${
                    moduleMappings.length
                  } transaction point${moduleMappings.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <button class="p-2 hover:bg-gray-100 rounded transition-colors">
                <i data-feather="chevron-down" id="icon-${module}" class="w-5 h-5 text-gray-600"></i>
              </button>
            </div>

            <div id="section-${module}" class="space-y-4">
              ${moduleMappings
                .map((mapping) => generateMappingRow(mapping))
                .join("")}
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function generateMappingRow(mapping) {
  const { accounts, accountTypes } = accountsData;

  const accountOptions = accounts
    .filter((acc) => acc.isActive)
    .map((acc) => {
      const type = accountTypes.find((t) => t.id === acc.accountTypeId);
      const typeName = type ? type.name : "";
      return `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName} (${typeName})</option>`;
    })
    .join("");

  const makeOptions = (selectedId) =>
    accounts
      .filter((acc) => acc.isActive)
      .map((acc) => {
        const type = accountTypes.find((t) => t.id === acc.accountTypeId);
        const typeName = type ? type.name : "";
        return `<option value="${acc.id}" ${
          acc.id === selectedId ? "selected" : ""
        }>${acc.accountCode} - ${acc.accountName} (${typeName})</option>`;
      })
      .join("");

  return `
    <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors" id="mapping-row-${
      mapping.id
    }">
      <!-- Header -->
      <div class="flex items-start justify-between mb-4">
        <div class="flex-1">
          <div class="flex items-center space-x-2">
            <h4 class="font-semibold text-gray-800">${
              mapping.transactionPoint
            }</h4>
            <span class="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">${
              mapping.isSystemDefined ? "System" : "Custom"
            }</span>
            ${
              mapping.hasThirdAccount
                ? '<span class="three-acc-badge px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">3-Account Entry</span>'
                : ""
            }
          </div>
          <p class="text-xs text-gray-500 mt-1">${mapping.description || ""}</p>
          ${
            mapping.isConfigured
              ? ""
              : `<div class="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">⚠ ${(
                  mapping.warnings || ["Mapping is incomplete."]
                ).join(" ")}</div>`
          }
        </div>
        <div id="mapping-save-status-${
          mapping.id
        }" class="text-xs text-gray-400 ml-4"></div>
      </div>

      <!-- Primary Debit & Credit Accounts -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-2 h-2 bg-green-500 rounded-full"></span>
              Debit Account <span class="text-gray-400 font-normal">(Primary)</span>
            </span>
          </label>
          <select id="debit-${mapping.id}"
                  onchange="updateMappingAccount(${
                    mapping.id
                  }, 'debit', this.value)"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            ${makeOptions(mapping.debitAccountId)}
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 mb-1.5">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-2 h-2 bg-red-500 rounded-full"></span>
              Credit Account <span class="text-gray-400 font-normal">(Primary)</span>
            </span>
          </label>
          <select id="credit-${mapping.id}"
                  onchange="updateMappingAccount(${
                    mapping.id
                  }, 'credit', this.value)"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            ${makeOptions(mapping.creditAccountId)}
          </select>
        </div>
      </div>

      <!-- Optional 3rd Account Section -->
      <div class="mt-4 pt-3 border-t border-dashed border-gray-200">
        <div class="flex items-center gap-3 mb-2">
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox"
                   id="toggle-third-${mapping.id}"
                   ${mapping.hasThirdAccount ? "checked" : ""}
                   onchange="toggleThirdAccount(${mapping.id}, this.checked)"
                   class="sr-only peer">
            <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer
                        peer-checked:bg-purple-600
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                        after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all
                        peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
          </label>
          <span class="text-xs font-semibold text-gray-700">Enable Optional 3rd Account</span>
          <span class="text-xs text-gray-400">(e.g., Discount, Tax, Contra)</span>
        </div>

        <div id="third-account-section-${mapping.id}" class="${
    mapping.hasThirdAccount ? "" : "hidden"
  } mt-2">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Account Side</label>
              <select id="third-side-${mapping.id}"
                      onchange="updateMappingAccount(${
                        mapping.id
                      }, 'thirdSide', this.value)"
                      class="w-full border border-purple-200 rounded px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-400">
                <option value="DEBIT" ${
                  mapping.thirdAccountSide === "DEBIT" ? "selected" : ""
                }>Debit (DR)</option>
                <option value="CREDIT" ${
                  mapping.thirdAccountSide === "CREDIT" ? "selected" : ""
                }>Credit (CR)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">
                <span class="inline-flex items-center gap-1">
                  <span class="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Account
                </span>
              </label>
              <select id="third-account-${mapping.id}"
                      onchange="updateMappingAccount(${
                        mapping.id
                      }, 'thirdAccount', this.value)"
                      class="w-full border border-purple-200 rounded px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-400">
                <option value="">Select Account</option>
                ${accounts
                  .filter((acc) => acc.isActive)
                  .map((acc) => {
                    const type = accountTypes.find(
                      (t) => t.id === acc.accountTypeId
                    );
                    return `<option value="${acc.id}" ${
                      acc.id === mapping.thirdAccountId ? "selected" : ""
                    }>${acc.accountCode} - ${acc.accountName} (${
                      type ? type.name : ""
                    })</option>`;
                  })
                  .join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-600 mb-1">Label / Purpose</label>
              <input type="text"
                     id="third-label-${mapping.id}"
                     value="${mapping.thirdAccountLabel || ""}"
                     placeholder="e.g., Sales Discount, VAT..."
                     onblur="updateMappingAccount(${
                       mapping.id
                     }, 'thirdLabel', this.value)"
                     class="w-full border border-purple-200 rounded px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-purple-400">
            </div>
          </div>
        </div>
      </div>

      <!-- Journal Entry Preview -->
      <div class="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <i data-feather="file-text" class="w-3 h-3"></i>
          Journal Entry Preview
        </p>
        <div id="je-preview-${mapping.id}">
          ${generateJEPreview(mapping)}
        </div>
      </div>
    </div>
  `;
}

function generateJEPreview(mapping) {
  const { accounts } = accountsData;
  const debitAcc = accounts.find((a) => a.id === mapping.debitAccountId);
  const creditAcc = accounts.find((a) => a.id === mapping.creditAccountId);
  const thirdAcc =
    mapping.hasThirdAccount && mapping.thirdAccountId
      ? accounts.find((a) => a.id === mapping.thirdAccountId)
      : null;

  const debitLines = [{ acc: debitAcc, label: null }];
  const creditLines = [{ acc: creditAcc, label: null }];

  if (thirdAcc) {
    if (mapping.thirdAccountSide === "DEBIT") {
      debitLines.push({ acc: thirdAcc, label: mapping.thirdAccountLabel });
    } else {
      creditLines.push({ acc: thirdAcc, label: mapping.thirdAccountLabel });
    }
  }

  const rows = [
    ...debitLines.map((l) => ({ ...l, side: "DR", isDebit: true })),
    ...creditLines.map((l) => ({ ...l, side: "CR", isDebit: false })),
  ];

  return rows
    .map((row, i) => {
      const name = row.acc ? row.acc.accountName : "— not selected —";
      const indent = row.isDebit ? "" : "pl-5";
      const sideColor = row.isDebit ? "text-green-600" : "text-red-600";
      const bg = row.isDebit
        ? "bg-green-50 border-green-100"
        : "bg-red-50 border-red-100";
      const badge = row.label
        ? `<span class="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">${row.label}</span>`
        : "";
      return `
      <div class="flex items-center text-xs border rounded px-2 py-1 ${bg} ${indent} ${
        i > 0 ? "mt-1" : ""
      }">
        <span class="font-bold w-6 shrink-0 ${sideColor}">${row.side}</span>
        <span class="text-gray-700">${name}</span>
        ${badge}
      </div>`;
    })
    .join("");
}

function toggleModuleSection(module) {
  const section = document.getElementById(`section-${module}`);
  const icon = document.getElementById(`icon-${module}`);
  if (section.style.display === "none") {
    section.style.display = "block";
    icon.setAttribute("data-feather", "chevron-down");
  } else {
    section.style.display = "none";
    icon.setAttribute("data-feather", "chevron-right");
  }
  feather.replace();
}

// Save mapping to backend (debounced)
const mappingSaveTimers = {};
async function saveMappingToBackend(mappingId) {
  const mapping = accountsData.mappings.find((m) => m.id === mappingId);
  if (!mapping) return;

  const statusEl = document.getElementById(`mapping-save-status-${mappingId}`);
  if (statusEl) statusEl.textContent = "Saving...";

  try {
    await accountsRequest(`/accounts/mappings/${mappingId}`, {
      method: "PUT",
      body: JSON.stringify({
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        hasThirdAccount: mapping.hasThirdAccount,
        thirdAccountId: mapping.thirdAccountId || null,
        thirdAccountSide: mapping.thirdAccountSide,
        thirdAccountLabel: mapping.thirdAccountLabel || "",
      }),
    });
    if (statusEl) {
      statusEl.textContent = "✓ Saved";
      statusEl.className = "text-xs text-green-600 ml-4";
      setTimeout(() => {
        statusEl.textContent = "";
        statusEl.className = "text-xs text-gray-400 ml-4";
      }, 2000);
    }
  } catch (err) {
    console.error("Failed to save mapping:", err);
    if (statusEl) {
      statusEl.textContent = "⚠ Save failed";
      statusEl.className = "text-xs text-red-600 ml-4";
    }
    showNotification("Failed to save mapping: " + err.message, "error");
  }
}

function scheduleMappingSave(mappingId) {
  if (mappingSaveTimers[mappingId]) clearTimeout(mappingSaveTimers[mappingId]);
  mappingSaveTimers[mappingId] = setTimeout(
    () => saveMappingToBackend(mappingId),
    800
  );
}

// Update mapping account inline
function updateMappingAccount(mappingId, type, value) {
  const mapping = accountsData.mappings.find((m) => m.id === mappingId);
  if (!mapping) return;

  if (type === "debit") {
    const newId = parseInt(value);
    if (newId === mapping.creditAccountId) {
      showNotification(
        "Debit and Credit accounts cannot be the same!",
        "error"
      );
      document.getElementById(`debit-${mappingId}`).value =
        mapping.debitAccountId;
      return;
    }
    if (mapping.hasThirdAccount && newId === mapping.thirdAccountId) {
      showNotification(
        "Debit account cannot be the same as the 3rd account!",
        "error"
      );
      document.getElementById(`debit-${mappingId}`).value =
        mapping.debitAccountId;
      return;
    }
    mapping.debitAccountId = newId;
    const acc = accountsData.accounts.find((a) => a.id === newId);
    if (acc)
      showNotification(
        `"${mapping.transactionPoint}" — Debit updated to "${acc.accountName}"`,
        "success"
      );
  } else if (type === "credit") {
    const newId = parseInt(value);
    if (newId === mapping.debitAccountId) {
      showNotification(
        "Debit and Credit accounts cannot be the same!",
        "error"
      );
      document.getElementById(`credit-${mappingId}`).value =
        mapping.creditAccountId;
      return;
    }
    if (mapping.hasThirdAccount && newId === mapping.thirdAccountId) {
      showNotification(
        "Credit account cannot be the same as the 3rd account!",
        "error"
      );
      document.getElementById(`credit-${mappingId}`).value =
        mapping.creditAccountId;
      return;
    }
    mapping.creditAccountId = newId;
    const acc = accountsData.accounts.find((a) => a.id === newId);
    if (acc)
      showNotification(
        `"${mapping.transactionPoint}" — Credit updated to "${acc.accountName}"`,
        "success"
      );
  } else if (type === "thirdAccount") {
    const newId = value ? parseInt(value) : null;
    if (
      newId &&
      (newId === mapping.debitAccountId || newId === mapping.creditAccountId)
    ) {
      showNotification(
        "3rd account cannot be the same as Debit or Credit account!",
        "error"
      );
      document.getElementById(`third-account-${mappingId}`).value =
        mapping.thirdAccountId || "";
      return;
    }
    mapping.thirdAccountId = newId;
    if (newId) {
      const acc = accountsData.accounts.find((a) => a.id === newId);
      if (acc)
        showNotification(
          `"${mapping.transactionPoint}" — 3rd account set to "${acc.accountName}"`,
          "success"
        );
    }
  } else if (type === "thirdSide") {
    mapping.thirdAccountSide = value;
  } else if (type === "thirdLabel") {
    mapping.thirdAccountLabel = value;
  }

  // Update just the preview panel
  const previewEl = document.getElementById(`je-preview-${mappingId}`);
  if (previewEl) {
    previewEl.innerHTML = generateJEPreview(mapping);
    feather.replace();
  }

  // Schedule save to backend
  scheduleMappingSave(mappingId);
}

// Toggle the optional 3rd account section
function toggleThirdAccount(mappingId, enabled) {
  const mapping = accountsData.mappings.find((m) => m.id === mappingId);
  if (!mapping) return;

  mapping.hasThirdAccount = enabled;
  if (!enabled) mapping.thirdAccountId = null;

  const section = document.getElementById(`third-account-section-${mappingId}`);
  if (section) section.classList.toggle("hidden", !enabled);

  const previewEl = document.getElementById(`je-preview-${mappingId}`);
  if (previewEl) {
    previewEl.innerHTML = generateJEPreview(mapping);
    feather.replace();
  }

  scheduleMappingSave(mappingId);
}

// ============================================
// JOURNAL ENTRIES TAB
// ============================================

async function loadJournalEntriesTab(filters = {}, loadToken = null) {
  try {
    currentJEFilters = {
      from: filters.from || "",
      to: filters.to || "",
      referenceType: filters.referenceType || "",
      page: Math.max(1, parseInt(filters.page, 10) || 1),
      limit: Math.max(1, parseInt(filters.limit, 10) || 50),
    };

    let query = "";
    const params = [];
    if (currentJEFilters.from) params.push(`dateFrom=${currentJEFilters.from}`);
    if (currentJEFilters.to) params.push(`dateTo=${currentJEFilters.to}`);
    if (currentJEFilters.referenceType)
      params.push(`referenceType=${currentJEFilters.referenceType}`);
    params.push(`page=${currentJEFilters.page}`);
    params.push(`limit=${currentJEFilters.limit}`);
    if (params.length) query = "?" + params.join("&");

    const result = await accountsRequest(`/accounts/journal-entries${query}`);
    if (
      loadToken != null &&
      typeof accountsTabLoadToken !== "undefined" &&
      loadToken !== accountsTabLoadToken
    ) {
      return;
    }

    // API returns { entries: [], total, page, limit } - extract entries array
    accountsData.journalEntries = Array.isArray(result)
      ? result
      : result.entries || [];
    journalEntriesMeta = Array.isArray(result)
      ? {
          total: accountsData.journalEntries.length,
          page: 1,
          limit: accountsData.journalEntries.length || 50,
          pages: 1,
        }
      : {
          total: Number(result.total || 0),
          page: Number(result.page || currentJEFilters.page),
          limit: Number(result.limit || currentJEFilters.limit),
          pages: Math.max(1, Number(result.pages || 1)),
        };

    if (
      typeof currentAccountsTab !== "undefined" &&
      currentAccountsTab !== "journal-entries"
    ) {
      return;
    }

    const tabContent = document.getElementById("accounts-tab-content");
    tabContent.innerHTML = generateJournalEntriesTab();
    feather.replace();
  } catch (err) {
    throw err;
  }
}

function generateJournalEntriesTab() {
  const { journalEntries } = accountsData;
  const escapeDesc = (text) =>
    String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Journal Entries</h2>
          <p class="text-sm text-gray-600 mt-1">View and create manual journal entries</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button onclick="exportJournalEntriesXL()" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
            <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
            XL
          </button>
          <button onclick="exportJournalEntriesPDF()" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
            <i data-feather="download" class="w-4 h-4 mr-2"></i>
            PDF
          </button>
          <button onclick="openAddJournalEntryModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
            <i data-feather="plus" class="w-4 h-4 mr-2"></i>
            New Entry
          </button>
        </div>
      </div>

      <!-- Filter Section -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" id="je-filter-from" value="${
              currentJEFilters.from || ""
            }" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" id="je-filter-to" value="${
              currentJEFilters.to || ""
            }" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
            <select id="je-filter-type" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">All Types</option>
              <option value="INVOICE" ${
                currentJEFilters.referenceType === "INVOICE" ? "selected" : ""
              }>Invoice</option>
              <option value="GRN" ${
                currentJEFilters.referenceType === "GRN" ? "selected" : ""
              }>GRN</option>
              <option value="PAYROLL" ${
                currentJEFilters.referenceType === "PAYROLL" ? "selected" : ""
              }>Payroll</option>
              <option value="INVENTORY" ${
                currentJEFilters.referenceType === "INVENTORY" ? "selected" : ""
              }>Inventory</option>
              <option value="JE_REVERSAL" ${
                currentJEFilters.referenceType === "JE_REVERSAL"
                  ? "selected"
                  : ""
              }>JE Reversal</option>
              <option value="Repair" ${
                currentJEFilters.referenceType === "Repair" ? "selected" : ""
              }>Repair</option>
              <option value="MANUAL" ${
                currentJEFilters.referenceType === "MANUAL" ? "selected" : ""
              }>Manual</option>
            </select>
          </div>
          <div class="flex items-end gap-2">
            <button onclick="applyJEFilters()" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center justify-center flex-1 min-h-[42px]">
              <i data-feather="filter" class="w-4 h-4 inline mr-2"></i>
              Filter
            </button>
            <button onclick="clearJEFilters()" type="button" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center min-h-[42px]">
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Journal Entries Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entry #</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Debit</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Credit</th>
              <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
              <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${
              journalEntries.length === 0
                ? '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No journal entries found</td></tr>'
                : journalEntries
                    .map((entry) => {
                      const desc = escapeDesc(entry.description || "");
                      return `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-blue-600">${
                  escapeDesc(entry.entryNumber)
                }</td>
                <td class="px-4 py-3 text-sm text-gray-600">${new Date(
                  entry.entryDate
                ).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-sm text-gray-800 max-w-[220px]">
                  <span class="block truncate" title="${desc}">${desc}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  ${
                    entry.referenceType
                      ? `<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">${
                          escapeDesc(entry.referenceType)
                        }</span>
                    ${
                      entry.referenceId
                        ? `<span class="text-xs text-gray-500 ml-1">#${escapeDesc(
                            entry.referenceId
                          )}</span>`
                        : ""
                    }`
                      : '<span class="text-gray-400 text-xs">Manual</span>'
                  }
                </td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-green-600">${Number(
                  entry.totalDebit
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-red-600">${Number(
                  entry.totalCredit
                ).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-2 py-1 text-xs font-semibold rounded ${
                    entry.isReversal
                      ? "bg-purple-100 text-purple-700"
                      : entry.isReversed
                      ? "bg-amber-100 text-amber-700"
                      : entry.isPosted
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }">
                    ${
                      entry.isReversal
                        ? "Reversal"
                        : entry.isReversed
                        ? "Reversed"
                        : entry.isPosted
                        ? "Posted"
                        : "Draft"
                    }
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button onclick="viewJournalEntry(${
                    entry.id
                  })" class="p-1 text-blue-600 hover:bg-blue-50 rounded">
                    <i data-feather="eye" class="w-4 h-4"></i>
                  </button>
                  ${
                    !entry.isReversal && !entry.isReversed
                      ? `<button onclick="reverseJournalEntry(${entry.id}, '${escapeAccountsAttr(
                          entry.entryNumber
                        )}')" class="p-1 text-amber-600 hover:bg-amber-50 rounded ml-1" title="Reverse Entry">
                    <i data-feather="rotate-ccw" class="w-4 h-4"></i>
                  </button>`
                      : ""
                  }
                </td>
              </tr>
            `;
                    })
                    .join("")
            }
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p class="text-sm text-gray-600">
          Showing page ${journalEntriesMeta.page} of ${journalEntriesMeta.pages}
          (${journalEntriesMeta.total} entries)
        </p>
        <div class="flex items-center gap-2">
          <button type="button"
            onclick="changeJEPage(${journalEntriesMeta.page - 1})"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              journalEntriesMeta.page <= 1
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }"
            ${journalEntriesMeta.page <= 1 ? "disabled" : ""}>
            Previous
          </button>
          <button type="button"
            onclick="changeJEPage(${journalEntriesMeta.page + 1})"
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm ${
              journalEntriesMeta.page >= journalEntriesMeta.pages
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-50"
            }"
            ${
              journalEntriesMeta.page >= journalEntriesMeta.pages
                ? "disabled"
                : ""
            }>
            Next
          </button>
        </div>
      </div>
    </div>
  `;
}

function changeJEPage(page) {
  const next = Math.max(1, Math.min(journalEntriesMeta.pages, parseInt(page, 10) || 1));
  if (next === journalEntriesMeta.page) return;
  const tabContent = document.getElementById("accounts-tab-content");
  if (tabContent) {
    tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-gray-400"><p>Loading...</p></div>`;
  }
  loadJournalEntriesTab({
    ...currentJEFilters,
    page: next,
  }).catch((err) => {
    showNotification("Failed to load journal entries: " + err.message, "error");
  });
}

function applyJEFilters() {
  const from = document.getElementById("je-filter-from")?.value || "";
  const to = document.getElementById("je-filter-to")?.value || "";
  const referenceType = document.getElementById("je-filter-type")?.value || "";

  if (from && to && from > to) {
    showNotification("From date must be on or before To date", "error");
    return;
  }

  const tabContent = document.getElementById("accounts-tab-content");
  tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-gray-400"><p>Loading...</p></div>`;

  loadJournalEntriesTab({ from, to, referenceType, page: 1 }).catch((err) => {
    showNotification("Filter failed: " + err.message, "error");
  });
}

function clearJEFilters() {
  currentJEFilters = { from: "", to: "", referenceType: "", page: 1, limit: 50 };
  const tabContent = document.getElementById("accounts-tab-content");
  if (tabContent) {
    tabContent.innerHTML = `<div class="bg-white rounded-lg shadow-md p-10 text-center text-gray-400"><p>Loading...</p></div>`;
  }
  loadJournalEntriesTab({ page: 1 }).catch((err) => {
    showNotification("Failed to load journal entries: " + err.message, "error");
  });
}

function openAccountsReasonModal({
  title,
  message,
  placeholder = "Enter reason (optional)",
  confirmText = "Continue",
}) {
  return new Promise((resolve) => {
    const existing = document.getElementById("accounts-reason-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "accounts-reason-modal";
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
        </div>
        <div class="px-6 py-4">
          <p class="text-sm text-gray-600 mb-3">${message}</p>
          <textarea id="accounts-reason-input" rows="4" placeholder="${placeholder}"
            class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"></textarea>
        </div>
        <div class="px-6 py-4 border-t flex justify-end space-x-2">
          <button type="button" id="accounts-reason-cancel" class="px-4 py-2 border border-gray-300 rounded text-sm">Cancel</button>
          <button type="button" id="accounts-reason-confirm" class="btn-primary px-4 py-2 text-white rounded text-sm">${confirmText}</button>
        </div>
      </div>
    `;

    const cleanup = (value) => {
      modal.remove();
      resolve(value);
    };

    modal.addEventListener("click", () => cleanup(null));
    modal
      .querySelector("#accounts-reason-cancel")
      .addEventListener("click", () => cleanup(null));
    modal
      .querySelector("#accounts-reason-confirm")
      .addEventListener("click", () => {
        const val =
          modal.querySelector("#accounts-reason-input")?.value?.trim() || "";
        cleanup(val);
      });

    document.body.appendChild(modal);
    modal.querySelector("#accounts-reason-input")?.focus();
  });
}

async function reverseJournalEntry(entryId, entryNumber) {
  const reason = await openAccountsReasonModal({
    title: `Reverse Entry: ${entryNumber}`,
    message:
      "This will post a reversal journal entry that offsets the original entry.",
    placeholder: "Reason for reversal (optional)",
    confirmText: "Continue",
  });
  if (reason === null) return;
  if (!confirm(`Are you sure you want to reverse ${entryNumber}?`)) return;

  try {
    await accountsRequest(`/accounts/journal-entries/${entryId}/reverse`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || "" }),
    });
    showNotification(`${entryNumber} reversed successfully.`, "success");
    await loadJournalEntriesTab({
      from: currentJEFilters.from,
      to: currentJEFilters.to,
      referenceType: currentJEFilters.referenceType,
    });
  } catch (err) {
    showNotification("Failed to reverse entry: " + err.message, "error");
  }
}

async function exportJournalEntriesXL() {
  const rows = accountsData.journalEntries || [];
  const filters = [];
  if (currentJEFilters.from) filters.push({ label: "From", value: currentJEFilters.from });
  if (currentJEFilters.to) filters.push({ label: "To", value: currentJEFilters.to });
  if (currentJEFilters.referenceType) {
    filters.push({ label: "Reference type", value: currentJEFilters.referenceType });
  }

  const ok = await exportXlsxWithTable({
    title: "Journal Entries",
    filters,
    headers: [
      "Entry Number",
      "Date",
      "Description",
      "Reference Type",
      "Reference ID",
      "Total Debit",
      "Total Credit",
      "Status",
    ],
    rows: rows.map((e) => {
      const status = e.isReversal
        ? "Reversal"
        : e.isReversed
        ? "Reversed"
        : e.isPosted
        ? "Posted"
        : "Draft";
      return [
        e.entryNumber,
        new Date(e.entryDate).toISOString().slice(0, 10),
        e.description || "",
        e.referenceType || "",
        e.referenceId || "",
        Number(e.totalDebit).toFixed(2),
        Number(e.totalCredit).toFixed(2),
        status,
      ];
    }),
    sheetName: "Journal Entries",
    fileName: `journal-entries-${new Date().toISOString().split("T")[0]}.xlsx`,
    emptyMessage: "No journal entries to export",
  });
  if (ok) showNotification("Journal entries exported successfully.", "success");
}

function exportJournalEntriesPDF() {
  const rows = accountsData.journalEntries || [];
  const filters = [];
  if (currentJEFilters.from) filters.push({ label: "From", value: currentJEFilters.from });
  if (currentJEFilters.to) filters.push({ label: "To", value: currentJEFilters.to });
  if (currentJEFilters.referenceType) {
    filters.push({ label: "Reference type", value: currentJEFilters.referenceType });
  }

  const ok = exportPdfWithTable({
    title: "Journal Entries",
    filters,
    head: ["Entry #", "Date", "Description", "Debit", "Credit", "Status"],
    body: rows.map((e) => [
      e.entryNumber,
      new Date(e.entryDate).toLocaleDateString(),
      e.description || "",
      Number(e.totalDebit).toLocaleString(),
      Number(e.totalCredit).toLocaleString(),
      e.isReversal ? "Reversal" : e.isReversed ? "Reversed" : "Posted",
    ]),
    fileName: `journal-entries-${new Date().toISOString().split("T")[0]}.pdf`,
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
    emptyMessage: "No journal entries to export",
  });
  if (ok) showNotification("Journal entries PDF exported successfully.", "success");
}

// ============================================
// REPORTS TAB
// ============================================

async function loadReportsTab() {
  // Load accounts data first (needed for report generation)
  if (!accountsData.accounts.length || !accountsData.accountTypes.length) {
    const [accounts, accountTypes] = await Promise.all([
      accountsRequest("/accounts/accounts"),
      accountsRequest("/accounts/account-types"),
    ]);
    accountsData.accounts = accounts;
    accountsData.accountTypes = accountTypes;
  }

  const tabContent = document.getElementById("accounts-tab-content");
  tabContent.innerHTML = generateReportsTab();
  feather.replace();

  // Auto-load trial balance
  await showReport("trial-balance");
}

function generateReportsTab() {
  return `
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" id="report-filter-from" value="${
              currentReportFilters.from || ""
            }" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" id="report-filter-to" value="${
              currentReportFilters.to || ""
            }" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div class="flex items-end">
            <button onclick="applyReportFilters()" class="btn-secondary px-4 py-2 text-white rounded-lg w-full">
              <i data-feather="filter" class="w-4 h-4 inline mr-2"></i>
              Apply Filters
            </button>
          </div>
          <div class="flex items-end">
            <button onclick="clearReportFilters()" class="px-4 py-2 border border-gray-300 rounded-lg w-full text-sm text-gray-700 hover:bg-gray-50">
              Clear
            </button>
          </div>
        </div>
      </div>

      <!-- Report Selection Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <div onclick="showReport('trial-balance')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-blue-100 rounded-full shrink-0">
              <i data-feather="list" class="w-5 h-5 text-blue-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Trial Balance</h3>
              <p class="text-xs text-gray-500">Debits = credits</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('general-ledger')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-green-100 rounded-full shrink-0">
              <i data-feather="book-open" class="w-5 h-5 text-green-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">General Ledger</h3>
              <p class="text-xs text-gray-500">All transactions</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('balance-sheet')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-purple-100 rounded-full shrink-0">
              <i data-feather="file-text" class="w-5 h-5 text-purple-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Balance Sheet</h3>
              <p class="text-xs text-gray-500">Financial position</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('income-statement')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-orange-100 rounded-full shrink-0">
              <i data-feather="trending-up" class="w-5 h-5 text-orange-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Income Statement</h3>
              <p class="text-xs text-gray-500">Profit & Loss</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('cashflow')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-teal-100 rounded-full shrink-0">
              <i data-feather="activity" class="w-5 h-5 text-teal-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Cashflow</h3>
              <p class="text-xs text-gray-500">Cash & bank</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('aging')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-amber-100 rounded-full shrink-0">
              <i data-feather="clock" class="w-5 h-5 text-amber-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Aging Report</h3>
              <p class="text-xs text-gray-500">Customer & Supplier</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('bank-reconciliation')" class="card p-4 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-3">
            <div class="p-2.5 bg-indigo-100 rounded-full shrink-0">
              <i data-feather="check-square" class="w-5 h-5 text-indigo-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-sm text-gray-800">Bank Rec</h3>
              <p class="text-xs text-gray-500">Bank ledger check</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Display Area -->
      <div id="report-display-area" class="bg-white rounded-lg shadow-md p-6">
        <div class="text-center text-gray-400 py-8">Select a report above to view</div>
      </div>
    </div>
  `;
}

// Show specific report (fetches from API)
async function showReport(reportType) {
  activeReportType = reportType;
  const reportArea = document.getElementById("report-display-area");
  if (!reportArea) return;
  reportArea.innerHTML = `<div class="text-center text-gray-400 py-8">Loading report...</div>`;

  try {
    const params = new URLSearchParams();
    if (currentReportFilters.from)
      params.append("dateFrom", currentReportFilters.from);
    if (currentReportFilters.to)
      params.append("dateTo", currentReportFilters.to);
    const query = params.toString() ? `?${params.toString()}` : "";

    switch (reportType) {
      case "trial-balance": {
        const data = await accountsRequest(
          `/accounts/reports/trial-balance${query}`
        );
        reportArea.innerHTML = generateTrialBalanceReport(data);
        break;
      }
      case "balance-sheet": {
        const data = await accountsRequest(
          `/accounts/reports/balance-sheet${query}`
        );
        reportArea.innerHTML = generateBalanceSheetReport(data);
        break;
      }
      case "income-statement": {
        const data = await accountsRequest(
          `/accounts/reports/income-statement${query}`
        );
        reportArea.innerHTML = generateIncomeStatementReport(data);
        break;
      }
      case "general-ledger": {
        const data = await accountsRequest(
          `/accounts/reports/general-ledger${query}`
        );
        reportArea.innerHTML = generateGeneralLedgerReport(data);
        break;
      }
      case "cashflow": {
        const data = await accountsRequest(
          `/accounts/reports/cashflow${query}`
        );
        reportArea.innerHTML = generateCashflowReport(data);
        break;
      }
      case "aging": {
        const type = currentAgingType || "customer";
        const data = await accountsRequest(`/accounts/reports/aging?type=${type}`);
        reportArea.innerHTML = generateAgingReport(data);
        break;
      }
      case "bank-reconciliation": {
        const accId = currentBankRecAccountId || "";
        let url = `/accounts/reports/bank-reconciliation${query}`;
        if (accId) {
          url += (query ? "&" : "?") + `accountId=${accId}`;
        }
        const data = await accountsRequest(url);
        reportArea.innerHTML = generateBankReconciliationReport(data);
        break;
      }
    }
    feather.replace();
  } catch (err) {
    reportArea.innerHTML = `<div class="text-center text-red-500 py-8">Failed to load report: ${err.message}</div>`;
  }
}

async function applyReportFilters() {
  currentReportFilters = {
    from: document.getElementById("report-filter-from")?.value || "",
    to: document.getElementById("report-filter-to")?.value || "",
  };
  await showReport(activeReportType || "trial-balance");
}

async function clearReportFilters() {
  currentReportFilters = { from: "", to: "" };
  const fromEl = document.getElementById("report-filter-from");
  const toEl = document.getElementById("report-filter-to");
  if (fromEl) fromEl.value = "";
  if (toEl) toEl.value = "";
  await showReport(activeReportType || "trial-balance");
}

// Toolbar: XL / PDF exports (reports)
function reportToolbarHtml(reportType) {
  return `
    <div class="flex gap-2 flex-shrink-0 ml-auto">
      <button type="button" onclick="exportReportXL('${reportType}')" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
        <i data-feather="file-text" class="w-4 h-4 mr-2"></i>
        XL
      </button>
      <button type="button" onclick="exportReportPDF('${reportType}')" class="btn-secondary px-4 py-2 rounded-lg flex items-center">
        <i data-feather="download" class="w-4 h-4 mr-2"></i>
        PDF
      </button>
    </div>
  `;
}

function generateTrialBalanceReport(data) {
  const { accounts, totalDebit, totalCredit, isBalanced } = data;
  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Trial Balance</h2>
          <p class="text-sm text-gray-600">As of ${new Date().toLocaleDateString()}</p>
        </div>
        ${reportToolbarHtml("trial-balance")}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account Code</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account Name</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Debit</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Credit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${accounts
              .map(
                (acc) => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-mono text-gray-600">${
                  acc.accountCode
                }</td>
                <td class="px-4 py-3 text-sm text-gray-800">${
                  acc.accountName
                }</td>
                <td class="px-4 py-3 text-sm text-gray-500">${
                  acc.typeName || ""
                }</td>
                <td class="px-4 py-3 text-sm text-right ${
                  acc.debit > 0
                    ? "font-semibold text-green-600"
                    : "text-gray-400"
                }">
                  ${
                    acc.debit > 0
                      ? "Rs. " + Number(acc.debit).toLocaleString()
                      : "-"
                  }
                </td>
                <td class="px-4 py-3 text-sm text-right ${
                  acc.credit > 0
                    ? "font-semibold text-red-600"
                    : "text-gray-400"
                }">
                  ${
                    acc.credit > 0
                      ? "Rs. " + Number(acc.credit).toLocaleString()
                      : "-"
                  }
                </td>
              </tr>
            `
              )
              .join("")}
            <tr class="bg-gray-100 font-bold">
              <td colspan="3" class="px-4 py-3 text-sm text-right">TOTAL</td>
              <td class="px-4 py-3 text-sm text-right text-green-600">Rs. ${Number(
                totalDebit
              ).toLocaleString()}</td>
              <td class="px-4 py-3 text-sm text-right text-red-600">Rs. ${Number(
                totalCredit
              ).toLocaleString()}</td>
            </tr>
            <tr class="bg-blue-50">
              <td colspan="3" class="px-4 py-3 text-sm text-right font-semibold">DIFFERENCE</td>
              <td colspan="2" class="px-4 py-3 text-sm text-center font-bold ${
                isBalanced ? "text-green-600" : "text-red-600"
              }">
                ${
                  isBalanced
                    ? "Balanced"
                    : "Rs. " +
                      Math.abs(totalDebit - totalCredit).toLocaleString() +
                      " Out of Balance"
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function generateBalanceSheetReport(data) {
  const {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced,
  } = data;

  const renderSection = (items, totalLabel, total) => `
    <div class="space-y-2">
      ${items
        .map(
          (acc) => `
        <div class="flex justify-between py-2">
          <span class="text-sm text-gray-700">${acc.accountName}</span>
          <span class="text-sm font-semibold text-gray-800">Rs. ${Number(
            acc.balance
          ).toLocaleString()}</span>
        </div>
      `
        )
        .join("")}
      <div class="flex justify-between py-3 border-t-2 font-bold">
        <span>${totalLabel}</span>
        <span>Rs. ${Number(total).toLocaleString()}</span>
      </div>
    </div>
  `;

  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Balance Sheet</h2>
          <p class="text-sm text-gray-600">As of ${new Date().toLocaleDateString()}</p>
        </div>
        ${reportToolbarHtml("balance-sheet")}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-bold text-blue-600 mb-4 pb-2 border-b-2 border-blue-600">ASSETS</h3>
          ${renderSection(assets, "Total Assets", totalAssets)}
        </div>
        <div>
          <h3 class="text-lg font-bold text-red-600 mb-4 pb-2 border-b-2 border-red-600">LIABILITIES</h3>
          <div class="mb-6">${renderSection(
            liabilities,
            "Total Liabilities",
            totalLiabilities
          )}</div>
          <h3 class="text-lg font-bold text-purple-600 mb-4 pb-2 border-b-2 border-purple-600">EQUITY</h3>
          ${renderSection(equity, "Total Equity", totalEquity)}
          <div class="flex justify-between py-3 border-t-2 border-purple-600 font-bold">
            <span class="text-purple-600">Total Liabilities & Equity</span>
            <span class="text-purple-600">Rs. ${Number(
              totalLiabilities + totalEquity
            ).toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div class="mt-6 p-4 rounded-lg ${
        isBalanced
          ? "bg-green-50 border border-green-200"
          : "bg-red-50 border border-red-200"
      }">
        <p class="text-center font-bold ${
          isBalanced ? "text-green-600" : "text-red-600"
        }">
          ${
            isBalanced
              ? "Balance Sheet is Balanced"
              : "Balance Sheet is Out of Balance"
          }
        </p>
      </div>
    </div>
  `;
}

function generateIncomeStatementReport(data) {
  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = data;

  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Income Statement</h2>
          <p class="text-sm text-gray-600">For the period ending ${new Date().toLocaleDateString()}</p>
        </div>
        ${reportToolbarHtml("income-statement")}
      </div>
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-bold text-green-600 mb-4 pb-2 border-b-2 border-green-600">REVENUE</h3>
          <div class="space-y-2">
            ${revenue
              .map(
                (acc) => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${Number(
                  acc.balance
                ).toLocaleString()}</span>
              </div>
            `
              )
              .join("")}
            <div class="flex justify-between py-3 border-t-2 border-green-600 font-bold">
              <span class="text-green-600">Total Revenue</span>
              <span class="text-green-600">Rs. ${Number(
                totalRevenue
              ).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div>
          <h3 class="text-lg font-bold text-orange-600 mb-4 pb-2 border-b-2 border-orange-600">EXPENSES</h3>
          <div class="space-y-2">
            ${expenses
              .map(
                (acc) => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${Number(
                  acc.balance
                ).toLocaleString()}</span>
              </div>
            `
              )
              .join("")}
            <div class="flex justify-between py-3 border-t-2 border-orange-600 font-bold">
              <span class="text-orange-600">Total Expenses</span>
              <span class="text-orange-600">Rs. ${Number(
                totalExpenses
              ).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div class="p-6 rounded-lg ${
          netIncome >= 0
            ? "bg-green-50 border-2 border-green-500"
            : "bg-red-50 border-2 border-red-500"
        }">
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold ${
              netIncome >= 0 ? "text-green-600" : "text-red-600"
            }">
              ${netIncome >= 0 ? "NET PROFIT" : "NET LOSS"}
            </span>
            <span class="text-2xl font-bold ${
              netIncome >= 0 ? "text-green-600" : "text-red-600"
            }">
              Rs. ${Math.abs(Number(netIncome)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateCashflowReport(data) {
  const {
    byReferenceType = [],
    netCashMovement = 0,
    cashAccounts = [],
    period = {},
    note = "",
  } = data || {};
  const periodLabel =
    period.dateFrom || period.dateTo
      ? `${period.dateFrom || "…"} – ${period.dateTo || "…"}`
      : "All dates (no date filter)";

  const rowsHtml =
    !byReferenceType.length
      ? '<tr><td colspan="2" class="px-4 py-6 text-center text-gray-400">No cash movements in this period</td></tr>'
      : byReferenceType
          .map(
            (r) => `
        <tr class="hover:bg-gray-50 border-b border-gray-100">
          <td class="px-4 py-3 text-sm font-medium text-gray-800">${
            r.referenceType || ""
          }</td>
          <td class="px-4 py-3 text-sm text-right font-semibold ${
            r.amount >= 0 ? "text-green-600" : "text-red-600"
          }">Rs. ${Number(r.amount).toLocaleString()}</td>
        </tr>`
          )
          .join("");

  const cashList =
    !(cashAccounts && cashAccounts.length)
      ? ""
      : `<div class="mb-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
          <span class="font-semibold text-gray-800">Cash / bank ledger accounts:</span>
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            ${cashAccounts
              .map(
                (c) =>
                  `<span>${c.accountCode} — ${c.accountName || ""}</span>`
              )
              .join("")}
          </div>
        </div>`;

  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Cashflow (approx.)</h2>
          <p class="text-sm text-gray-600">${periodLabel}</p>
          <p class="text-xs text-gray-500 mt-1">${note || ""}</p>
        </div>
        ${reportToolbarHtml("cashflow")}
      </div>
      ${cashList}
      <div class="p-4 rounded-lg border-2 mb-6 flex justify-between items-center flex-wrap gap-2 ${
        netCashMovement >= 0
          ? "border-teal-200 bg-teal-50"
          : "border-amber-200 bg-amber-50"
      }">
        <span class="text-lg font-bold text-gray-800">Net movement (cash accounts)</span>
        <span class="text-xl font-bold ${
          netCashMovement >= 0 ? "text-teal-700" : "text-amber-700"
        }">Rs. ${Number(netCashMovement).toLocaleString()}</span>
      </div>
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference type</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Impact on cash (Rs.)</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}

function generateGeneralLedgerReport(data) {
  const { entries, accounts: allAccounts } = data;

  // Build account options for filter dropdown
  const accountOptionsHtml = allAccounts
    ? allAccounts
        .map(
          (acc) =>
            `<option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>`
        )
        .join("")
    : "";

  // Helper: transform a journal entry's lines (which have debitAccountName/creditAccountName)
  // into flat display rows [{accountName, debitAmount, creditAmount}]
  function flattenLines(lines) {
    const displayLines = [];
    (lines || []).forEach((line) => {
      if ((line.debitAmount || 0) > 0 && line.debitAccountName) {
        displayLines.push({
          accountName: line.debitAccountName,
          debitAmount: line.debitAmount,
          creditAmount: 0,
        });
      }
      if ((line.creditAmount || 0) > 0 && line.creditAccountName) {
        displayLines.push({
          accountName: line.creditAccountName,
          debitAmount: 0,
          creditAmount: line.creditAmount,
        });
      }
    });
    return displayLines;
  }

  return `
    <div>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">General Ledger</h2>
          <p class="text-sm text-gray-600">All account transactions</p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <select class="border border-gray-300 rounded px-3 py-2 text-sm" onchange="filterGeneralLedger(this.value)">
            <option value="">All Accounts</option>
            ${accountOptionsHtml}
          </select>
          ${reportToolbarHtml("general-ledger")}
        </div>
      </div>

      <div class="space-y-6" id="gl-entries-container">
        ${
          !entries || entries.length === 0
            ? '<p class="text-center text-gray-400 py-8">No journal entries found</p>'
            : entries
                .map(
                  (entry) => `
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <div>
                <span class="font-semibold text-blue-600">${
                  entry.entryNumber
                }</span>
                <span class="text-sm text-gray-500 ml-3">${new Date(
                  entry.entryDate
                ).toLocaleDateString()}</span>
              </div>
              <span class="text-sm text-gray-600">${
                entry.description || ""
              }</span>
            </div>
            <div class="space-y-2">
              ${flattenLines(entry.lines)
                .map(
                  (line) => `
                <div class="flex justify-between items-center py-2 px-3 ${
                  line.debitAmount > 0 ? "bg-green-50" : "bg-red-50"
                } rounded">
                  <span class="text-sm font-medium">${
                    line.accountName || ""
                  }</span>
                  <div class="flex items-center space-x-4">
                    <span class="text-sm ${
                      line.debitAmount > 0
                        ? "text-green-600 font-semibold"
                        : "text-gray-400"
                    }">
                      ${
                        line.debitAmount > 0
                          ? "Rs. " + Number(line.debitAmount).toLocaleString()
                          : "-"
                      }
                    </span>
                    <span class="text-sm ${
                      line.creditAmount > 0
                        ? "text-red-600 font-semibold"
                        : "text-gray-400"
                    }">
                      ${
                        line.creditAmount > 0
                          ? "Rs. " + Number(line.creditAmount).toLocaleString()
                          : "-"
                      }
                    </span>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
                )
                .join("")
        }
      </div>
    </div>
  `;
}

async function filterGeneralLedger(accountId) {
  const reportArea = document.getElementById("report-display-area");
  if (!reportArea) return;

  const params = new URLSearchParams();
  if (accountId) params.append("accountId", accountId);
  if (currentReportFilters.from)
    params.append("dateFrom", currentReportFilters.from);
  if (currentReportFilters.to) params.append("dateTo", currentReportFilters.to);
  let url = "/accounts/reports/general-ledger";
  if (params.toString()) url += `?${params.toString()}`;

  reportArea.querySelector("#gl-entries-container") &&
    (reportArea.querySelector("#gl-entries-container").innerHTML =
      '<p class="text-center text-gray-400 py-4">Loading...</p>');

  try {
    const data = await accountsRequest(url);
    reportArea.innerHTML = generateGeneralLedgerReport(data);
    feather.replace();
    if (accountId) {
      const acc = accountsData.accounts.find(
        (a) => a.id === parseInt(accountId)
      );
      if (acc) showNotification(`Filtered by: ${acc.accountName}`, "info");
    }
  } catch (err) {
    showNotification("Failed to filter: " + err.message, "error");
  }
}

// ─── Aging & Bank Reconciliation UI Generators & Exports ─────────────────────
let currentAgingType = "customer";
let currentBankRecAccountId = null;
let currentLastReportData = null;

async function switchAgingType(type) {
  currentAgingType = type;
  await showReport("aging");
}

async function filterBankReconciliation(accountId) {
  currentBankRecAccountId = accountId;
  await showReport("bank-reconciliation");
}

let reconciledBankTxIds = new Set();
let currentIndividualStatementData = null;

function filterAgingTable() {
  const query = (document.getElementById("aging-search-input")?.value || "")
    .toLowerCase()
    .trim();
  const rows = document.querySelectorAll("#aging-report-table-body tr[data-search]");
  rows.forEach((row) => {
    const text = row.getAttribute("data-search") || "";
    if (!query || text.includes(query)) {
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
  });
}

function generateAgingReport(data) {
  currentLastReportData = data;
  const { type = "customer", totals = {}, rows = [] } = data || {};
  const isCustomer = type === "customer";

  const rowsHtml = !rows.length
    ? `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No outstanding ${isCustomer ? "customer" : "supplier"} accounts found</td></tr>`
    : rows
        .map(
          (r) => {
            const name = isCustomer ? r.customerName : r.supplierName;
            const personId = isCustomer ? r.customerId : r.supplierId;
            const searchText = escHtml(`${name} ${r.mobileNumber || ""}`.toLowerCase());
            return `
        <tr class="hover:bg-gray-50 border-b border-gray-100" data-search="${searchText}">
          <td class="px-4 py-3 text-sm font-medium text-gray-900">${escHtml(name)}</td>
          <td class="px-4 py-3 text-sm text-gray-500">${escHtml(r.mobileNumber || "—")}</td>
          <td class="px-4 py-3 text-sm text-right text-green-600">Rs. ${Number(r.current || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right text-blue-600">Rs. ${Number(r.days31To60 || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right text-amber-600">Rs. ${Number(r.days61To90 || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right text-red-600 font-semibold">Rs. ${Number(r.over90 || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right font-bold text-gray-900">Rs. ${Number(r.totalOutstanding || 0).toLocaleString()}</td>
          <td class="px-4 py-3 text-center text-sm">
            <button onclick="openIndividualAgingModal('${personId}', '${type}')" class="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded text-xs inline-flex items-center gap-1">
              <i data-feather="file-text" class="w-3.5 h-3.5"></i> Statement
            </button>
          </td>
        </tr>`;
          }
        )
        .join("");

  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Accounts ${isCustomer ? "Receivable" : "Payable"} Aging Report</h2>
          <p class="text-sm text-gray-600">Outstanding balance breakdown by age bucket</p>
        </div>
        ${reportToolbarHtml("aging")}
      </div>

      <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div class="flex space-x-3">
          <button onclick="switchAgingType('customer')" class="px-4 py-2 text-sm font-medium rounded-lg ${
            isCustomer ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }">
            Customer Aging (Receivables)
          </button>
          <button onclick="switchAgingType('supplier')" class="px-4 py-2 text-sm font-medium rounded-lg ${
            !isCustomer ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }">
            Supplier Aging (Payables)
          </button>
        </div>

        <div class="relative flex-1 max-w-md">
          <input type="text" id="aging-search-input" onkeyup="filterAgingTable()" placeholder="Search single person by name or phone..." class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
          <i data-feather="search" class="w-4 h-4 text-gray-400 absolute left-3 top-2.5"></i>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <p class="text-xs text-green-700 font-semibold">0 - 30 Days (Current)</p>
          <p class="text-lg font-bold text-green-800 mt-1">Rs. ${Number(totals.current || 0).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p class="text-xs text-blue-700 font-semibold">31 - 60 Days</p>
          <p class="text-lg font-bold text-blue-800 mt-1">Rs. ${Number(totals.days31To60 || 0).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p class="text-xs text-amber-700 font-semibold">61 - 90 Days</p>
          <p class="text-lg font-bold text-amber-800 mt-1">Rs. ${Number(totals.days61To90 || 0).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-red-50 rounded-lg border border-red-200">
          <p class="text-xs text-red-700 font-semibold">90+ Days (Overdue)</p>
          <p class="text-lg font-bold text-red-800 mt-1">Rs. ${Number(totals.over90 || 0).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-gray-100 rounded-lg border border-gray-300">
          <p class="text-xs text-gray-700 font-semibold">Total Outstanding</p>
          <p class="text-lg font-bold text-gray-900 mt-1">Rs. ${Number(totals.totalOutstanding || 0).toLocaleString()}</p>
        </div>
      </div>

      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">${isCustomer ? "Customer Name" : "Supplier Name"}</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">0-30 Days</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">31-60 Days</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">61-90 Days</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">90+ Days</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Due</th>
              <th class="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody id="aging-report-table-body">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function toggleReconciledRow(checkboxEl, txId) {
  const row = checkboxEl.closest("tr");
  if (!row) return;

  if (checkboxEl.checked) {
    reconciledBankTxIds.add(String(txId));
    row.classList.add("opacity-40", "filter", "blur-[0.6px]", "bg-emerald-50/50");
  } else {
    reconciledBankTxIds.delete(String(txId));
    row.classList.remove("opacity-40", "filter", "blur-[0.6px]", "bg-emerald-50/50");
  }
}

function generateBankReconciliationReport(data) {
  currentLastReportData = data;
  const {
    bankAccounts = [],
    selectedAccount = null,
    openingBalance = 0,
    totalDebits = 0,
    totalCredits = 0,
    netChange = 0,
    closingBalance = 0,
    transactions = [],
  } = data || {};

  const optionsHtml = bankAccounts
    .map(
      (acc) =>
        `<option value="${acc.id}" ${
          selectedAccount && selectedAccount.id === acc.id ? "selected" : ""
        }>${acc.accountCode} - ${escHtml(acc.accountName)}</option>`
    )
    .join("");

  const rowsHtml = !transactions.length
    ? `<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400">No transactions found for this account/period</td></tr>`
    : transactions
        .map((tx) => {
          const isReconciled = !tx.isOpening && reconciledBankTxIds.has(String(tx.id));
          const rowClass = isReconciled
            ? "hover:bg-gray-50 border-b border-gray-100 opacity-40 filter blur-[0.6px] bg-emerald-50/50 transition-all"
            : tx.isOpening
            ? "bg-amber-50/60 font-semibold border-b border-amber-200"
            : "hover:bg-gray-50 border-b border-gray-100 transition-all";

          return `
        <tr class="${rowClass}">
          <td class="px-3 py-3 text-center">
            ${
              tx.isOpening
                ? `<i data-feather="lock" class="w-4 h-4 text-amber-500 mx-auto" title="Opening Balance Row"></i>`
                : `<input type="checkbox" onchange="toggleReconciledRow(this, '${tx.id}')" ${
                    isReconciled ? "checked" : ""
                  } class="w-4 h-4 text-blue-600 rounded cursor-pointer" title="Mark as Reconciled">`
            }
          </td>
          <td class="px-4 py-3 text-sm text-gray-600">${
            tx.entryDate ? new Date(tx.entryDate).toLocaleDateString() : "—"
          }</td>
          <td class="px-4 py-3 text-sm font-mono text-gray-800">${escHtml(
            tx.entryNumber || "—"
          )}</td>
          <td class="px-4 py-3 text-sm text-gray-800">${escHtml(
            tx.description || "—"
          )}</td>
          <td class="px-4 py-3 text-sm text-gray-500">${escHtml(
            tx.counterpartAccount || "—"
          )}</td>
          <td class="px-4 py-3 text-sm text-right ${
            tx.debit > 0 ? "text-green-600 font-semibold" : "text-gray-400"
          }">
            ${tx.debit > 0 ? "Rs. " + Number(tx.debit).toLocaleString() : "-"}
          </td>
          <td class="px-4 py-3 text-sm text-right ${
            tx.credit > 0 ? "text-red-600 font-semibold" : "text-gray-400"
          }">
            ${tx.credit > 0 ? "Rs. " + Number(tx.credit).toLocaleString() : "-"}
          </td>
          <td class="px-4 py-3 text-sm text-right font-bold text-gray-800">Rs. ${Number(
            tx.balance || 0
          ).toLocaleString()}</td>
        </tr>`;
        })
        .join("");

  return `
    <div>
      <div class="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Bank Reconciliation Report</h2>
          <p class="text-sm text-gray-600">Reconcile deposits, withdrawals, and ledger balances for bank/cash accounts</p>
        </div>
        ${reportToolbarHtml("bank-reconciliation")}
      </div>

      <div class="mb-6 bg-gray-50 p-4 rounded-lg flex items-center gap-4 flex-wrap">
        <label class="text-sm font-medium text-gray-700">Select Account:</label>
        <select onchange="filterBankReconciliation(this.value)" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
          ${optionsHtml}
        </select>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p class="text-xs text-gray-600 font-semibold">Opening Balance</p>
          <p class="text-lg font-bold text-gray-800 mt-1">Rs. ${Number(openingBalance).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <p class="text-xs text-green-700 font-semibold">Total Debits (Deposits)</p>
          <p class="text-lg font-bold text-green-800 mt-1">Rs. ${Number(totalDebits).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-red-50 rounded-lg border border-red-200">
          <p class="text-xs text-red-700 font-semibold">Total Credits (Withdrawals)</p>
          <p class="text-lg font-bold text-red-800 mt-1">Rs. ${Number(totalCredits).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p class="text-xs text-indigo-700 font-semibold">Net Movement</p>
          <p class="text-lg font-bold text-indigo-800 mt-1">Rs. ${Number(netChange).toLocaleString()}</p>
        </div>
        <div class="p-4 bg-blue-100 rounded-lg border border-blue-300">
          <p class="text-xs text-blue-800 font-semibold">Closing Book Balance</p>
          <p class="text-lg font-bold text-blue-900 mt-1">Rs. ${Number(closingBalance).toLocaleString()}</p>
        </div>
      </div>

      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-3 py-3 text-center text-sm font-semibold text-gray-700 w-10">Check</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">JE #</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Counterpart Account</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Debit (Deposit)</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Credit (Withdrawal)</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Running Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ─── Individual Statement Modal Implementation ────────────────────────────────
async function openIndividualAgingModal(personId, personType) {
  try {
    showNotification("Loading individual statement...", "info");
    const data = await accountsRequest(
      `/accounts/reports/individual-statement?personType=${personType}&personId=${personId}`
    );

    currentIndividualStatementData = { ...data, personType, personId };

    let modalEl = document.getElementById("individual-statement-modal");
    if (!modalEl) {
      modalEl = document.createElement("div");
      modalEl.id = "individual-statement-modal";
      modalEl.className = "fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4";
      document.body.appendChild(modalEl);
    }

    renderIndividualStatementModal();
    modalEl.classList.remove("hidden");
    if (typeof feather !== "undefined") feather.replace();
  } catch (err) {
    showNotification("Failed to load individual statement: " + err.message, "error");
  }
}

function closeIndividualAgingModal() {
  const modalEl = document.getElementById("individual-statement-modal");
  if (modalEl) modalEl.classList.add("hidden");
}

function renderIndividualStatementModal() {
  const modalEl = document.getElementById("individual-statement-modal");
  if (!modalEl || !currentIndividualStatementData) return;

  const { person = {}, summary = {}, items = [] } = currentIndividualStatementData;
  const isCustomer = person.type === "Customer";

  const rowsHtml = !items.length
    ? `<tr><td colspan="7" class="px-4 py-6 text-center text-gray-400">No transactions recorded for this ${person.type.toLowerCase()}</td></tr>`
    : items
        .map(
          (item) => `
        <tr class="hover:bg-gray-50 border-b border-gray-100">
          <td class="px-4 py-3 text-sm font-mono font-medium text-gray-800">${escHtml(item.docNumber)}</td>
          <td class="px-4 py-3 text-sm text-gray-600">${new Date(item.date).toLocaleDateString()}</td>
          <td class="px-4 py-3 text-sm text-right text-gray-800 font-semibold">Rs. ${Number(item.totalAmount).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right text-green-600">Rs. ${Number(item.paidAmount).toLocaleString()}</td>
          <td class="px-4 py-3 text-sm text-right font-bold text-red-600">Rs. ${Number(item.balance).toLocaleString()}</td>
          <td class="px-4 py-3 text-center text-sm text-gray-600">${item.ageDays} days</td>
          <td class="px-4 py-3 text-center text-sm">
            <span class="px-2 py-0.5 text-xs rounded-full font-medium ${
              item.balance <= 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }">${escHtml(item.status)}</span>
          </td>
        </tr>`
        )
        .join("");

  modalEl.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <h3 class="text-xl font-bold text-gray-800">${escHtml(person.name)} — Statement</h3>
          <p class="text-xs text-gray-500">${person.type} Statement | Mobile: ${escHtml(person.mobileNumber || "N/A")} ${person.email ? "| Email: " + escHtml(person.email) : ""}</p>
        </div>
        <button onclick="closeIndividualAgingModal()" class="text-gray-400 hover:text-gray-600 text-2xl font-bold p-1">&times;</button>
      </div>

      <!-- Summary Cards & Actions -->
      <div class="p-6 overflow-y-auto flex-1">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p class="text-xs font-semibold text-blue-700">Total ${isCustomer ? "Billed" : "Purchased"}</p>
            <p class="text-lg font-bold text-blue-800 mt-1">Rs. ${Number(summary.totalBilled || 0).toLocaleString()}</p>
          </div>
          <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p class="text-xs font-semibold text-green-700">Total Paid</p>
            <p class="text-lg font-bold text-green-800 mt-1">Rs. ${Number(summary.totalPaid || 0).toLocaleString()}</p>
          </div>
          <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p class="text-xs font-semibold text-red-700">Net Outstanding Balance</p>
            <p class="text-lg font-bold text-red-800 mt-1">Rs. ${Number(summary.totalOutstanding || 0).toLocaleString()}</p>
          </div>
        </div>

        <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div class="relative flex-1 max-w-xs">
            <input type="text" id="ind-statement-search" oninput="filterIndividualStatementTable()" placeholder="Search statement..." class="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500">
            <i data-feather="search" class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2"></i>
          </div>
          <div class="flex space-x-2">
            <button onclick="downloadIndividualStatementXL()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
              <i data-feather="file-text" class="w-3.5 h-3.5"></i> XL
            </button>
            <button onclick="downloadIndividualStatementPDF()" class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1">
              <i data-feather="download" class="w-3.5 h-3.5"></i> PDF
            </button>
          </div>
        </div>

        <div class="overflow-x-auto border border-gray-200 rounded-lg">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Document #</th>
                <th class="px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Date</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">Total Amount</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">Paid Amount</th>
                <th class="px-4 py-2.5 text-right text-xs font-semibold text-gray-700">Balance</th>
                <th class="px-4 py-2.5 text-center text-xs font-semibold text-gray-700">Age</th>
                <th class="px-4 py-2.5 text-center text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody id="ind-statement-table-body">
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>

      <div class="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button onclick="closeIndividualAgingModal()" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-medium">Close</button>
      </div>
    </div>
  `;

  if (typeof feather !== "undefined") feather.replace();
}

function filterIndividualStatementTable() {
  const query = (document.getElementById("ind-statement-search")?.value || "")
    .toLowerCase()
    .trim();
  const rows = document.querySelectorAll("#ind-statement-table-body tr");
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    if (!query || text.includes(query)) {
      row.classList.remove("hidden");
    } else {
      row.classList.add("hidden");
    }
  });
}

async function downloadIndividualStatementXL() {
  if (!currentIndividualStatementData) return;
  const { person = {}, summary = {}, items = [] } = currentIndividualStatementData;
  const isCustomer = person.type === "Customer";
  try {
    await exportXlsxWithTable({
      title: `${person.name} (${person.type}) Statement`,
      headers: ["Document #", "Date", "Total Amount", "Paid Amount", "Balance", "Age (Days)", "Status"],
      rows: items.map((i) => [
        i.docNumber,
        new Date(i.date).toLocaleDateString(),
        i.totalAmount,
        i.paidAmount,
        i.balance,
        i.ageDays,
        i.status,
      ]),
      sheetName: "Statement",
      fileName: `statement-${person.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
    showNotification("Individual statement exported to XL", "success");
  } catch (err) {
    showNotification("Failed to export statement XL: " + err.message, "error");
  }
}

function downloadIndividualStatementPDF() {
  if (!currentIndividualStatementData) return;
  const { person = {}, summary = {}, items = [] } = currentIndividualStatementData;
  try {
    exportPdfWithTable({
      title: `${person.name} (${person.type}) Statement`,
      head: ["Document #", "Date", "Total Amount", "Paid Amount", "Balance", "Age", "Status"],
      body: items.map((i) => [
        i.docNumber,
        new Date(i.date).toLocaleDateString(),
        Number(i.totalAmount),
        Number(i.paidAmount),
        Number(i.balance),
        `${i.ageDays} days`,
        i.status,
      ]),
      fileName: `statement-${person.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
      summary: `Total: ${items.length} records | Total Outstanding: Rs. ${Number(summary.totalOutstanding || 0).toLocaleString()}`,
    });
    showNotification("Individual statement PDF generated", "success");
  } catch (err) {
    showNotification("Failed to export statement PDF: " + err.message, "error");
  }
}

async function exportReportXL(reportType) {
  if (!currentLastReportData) {
    showNotification("No report data available to export.", "warning");
    return;
  }
  try {
    if (reportType === "aging") {
      const isCustomer = currentLastReportData.type === "customer";
      await exportXlsxWithTable({
        title: `${isCustomer ? "Customer" : "Supplier"} Aging Report`,
        headers: [
          isCustomer ? "Customer" : "Supplier",
          "Phone",
          "0-30 Days",
          "31-60 Days",
          "61-90 Days",
          "90+ Days",
          "Total Due",
        ],
        rows: (currentLastReportData.rows || []).map((r) => [
          isCustomer ? r.customerName : r.supplierName,
          r.mobileNumber || "",
          r.current || 0,
          r.days31To60 || 0,
          r.days61To90 || 0,
          r.over90 || 0,
          r.totalOutstanding || 0,
        ]),
        sheetName: "Aging",
        fileName: `aging-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      showNotification("Aging report exported to Excel", "success");
    } else if (reportType === "bank-reconciliation") {
      const acc = currentLastReportData.selectedAccount;
      await exportXlsxWithTable({
        title: `Bank Reconciliation (${acc?.accountCode || ""} ${acc?.accountName || ""})`,
        headers: ["Date", "JE #", "Description", "Counterpart Account", "Debit", "Credit", "Balance"],
        rows: (currentLastReportData.transactions || []).map((tx) => [
          tx.entryDate ? new Date(tx.entryDate).toISOString().slice(0, 10) : "",
          tx.entryNumber || "",
          tx.description || "",
          tx.counterpartAccount || "",
          tx.debit || 0,
          tx.credit || 0,
          tx.balance || 0,
        ]),
        sheetName: "BankReconciliation",
        fileName: `bank-reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
      showNotification("Bank reconciliation exported to Excel", "success");
    } else {
      showNotification("Excel export prepared.", "info");
    }
  } catch (err) {
    showNotification("Export failed: " + err.message, "error");
  }
}

function exportReportPDF(reportType) {
  if (!currentLastReportData) {
    showNotification("No report data available to export.", "warning");
    return;
  }
  try {
    if (reportType === "aging") {
      const isCustomer = currentLastReportData.type === "customer";
      exportPdfWithTable({
        title: `${isCustomer ? "Customer" : "Supplier"} Aging Report`,
        head: [
          isCustomer ? "Customer" : "Supplier",
          "Phone",
          "0-30 Days",
          "31-60 Days",
          "61-90 Days",
          "90+ Days",
          "Total Due",
        ],
        body: (currentLastReportData.rows || []).map((r) => [
          isCustomer ? r.customerName : r.supplierName,
          r.mobileNumber || "—",
          Number(r.current || 0),
          Number(r.days31To60 || 0),
          Number(r.days61To90 || 0),
          Number(r.over90 || 0),
          Number(r.totalOutstanding || 0),
        ]),
        fileName: `aging-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      showNotification("Aging report PDF generated", "success");
    } else if (reportType === "bank-reconciliation") {
      const acc = currentLastReportData.selectedAccount;
      exportPdfWithTable({
        title: `Bank Reconciliation (${acc?.accountCode || ""} ${acc?.accountName || ""})`,
        head: ["Date", "JE #", "Description", "Counterpart", "Debit", "Credit", "Balance"],
        body: (currentLastReportData.transactions || []).map((tx) => [
          tx.entryDate ? new Date(tx.entryDate).toLocaleDateString() : "—",
          tx.entryNumber || "—",
          tx.description || "—",
          tx.counterpartAccount || "—",
          Number(tx.debit || 0),
          Number(tx.credit || 0),
          Number(tx.balance || 0),
        ]),
        fileName: `bank-reconciliation-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      showNotification("Bank reconciliation PDF generated", "success");
    } else {
      window.print();
    }
  } catch (err) {
    showNotification("Export failed: " + err.message, "error");
  }
}

// Export functions to global scope
window.generateTransactionMappingTab = generateTransactionMappingTab;
window.loadTransactionMappingTab = loadTransactionMappingTab;
window.generateJournalEntriesTab = generateJournalEntriesTab;
window.loadJournalEntriesTab = loadJournalEntriesTab;
window.changeJEPage = changeJEPage;
window.generateReportsTab = generateReportsTab;
window.loadReportsTab = loadReportsTab;
window.showReport = showReport;
window.updateMappingAccount = updateMappingAccount;
window.toggleModuleSection = toggleModuleSection;
window.toggleThirdAccount = toggleThirdAccount;
window.generateJEPreview = generateJEPreview;
window.applyJEFilters = applyJEFilters;
window.filterGeneralLedger = filterGeneralLedger;
window.reverseJournalEntry = reverseJournalEntry;
window.exportJournalEntriesXL = exportJournalEntriesXL;
window.exportJournalEntriesExcel = exportJournalEntriesXL;
window.exportJournalEntriesPDF = exportJournalEntriesPDF;
window.applyReportFilters = applyReportFilters;
window.clearReportFilters = clearReportFilters;
window.clearJEFilters = clearJEFilters;
window.switchAgingType = switchAgingType;
window.filterAgingTable = filterAgingTable;
window.openIndividualAgingModal = openIndividualAgingModal;
window.closeIndividualAgingModal = closeIndividualAgingModal;
window.filterIndividualStatementTable = filterIndividualStatementTable;
window.downloadIndividualStatementXL = downloadIndividualStatementXL;
window.downloadIndividualStatementPDF = downloadIndividualStatementPDF;
window.toggleReconciledRow = toggleReconciledRow;
window.filterBankReconciliation = filterBankReconciliation;
window.exportReportXL = exportReportXL;
window.exportReportPDF = exportReportPDF;
window.exportExtendedReportXL = exportReportXL;
window.exportExtendedReportPDF = exportReportPDF;
