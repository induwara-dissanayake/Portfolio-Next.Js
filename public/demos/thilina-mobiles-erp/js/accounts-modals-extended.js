// Accounts Module - Part 4: Additional Modals (Journal Entry Add/View)
// Edit Mapping is done inline via accounts-extended.js
// All operations use real backend API

// ============================================
// ADD JOURNAL ENTRY MODAL
// ============================================

let journalEntryLines = [];

async function openAddJournalEntryModal() {
  if (!document.getElementById("add-journal-entry-modal")) {
    createAddJournalEntryModal();
  }
  // Ensure chart of accounts is available for the searchable picker
  if (!accountsData.accounts?.length || !accountsData.accountTypes?.length) {
    try {
      const [types, accounts] = await Promise.all([
        accountsRequest("/accounts/account-types"),
        accountsRequest("/accounts/accounts"),
      ]);
      accountsData.accountTypes = types;
      accountsData.accounts = accounts;
    } catch (err) {
      showNotification(
        "Failed to load accounts for picker: " + (err.message || err),
        "error"
      );
    }
  }
  journalEntryLines = [];
  document.getElementById("add-journal-entry-modal").classList.remove("hidden");
  document.getElementById("add-journal-entry-form").reset();
  const btn = document.getElementById("post-journal-btn");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<i data-feather="save" class="w-4 h-4 inline mr-2"></i>Post Entry';
  }
  // Set today's date
  const dateInput = document.getElementById("entry-date");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  updateJournalEntryLinesDisplay();
  feather.replace();
}

function createAddJournalEntryModal() {
  const modalHTML = `
    <div id="add-journal-entry-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Create Journal Entry</h3>
          <button onclick="closeAddJournalEntryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <form id="add-journal-entry-form" onsubmit="handleAddJournalEntry(event)">
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Entry Date *</label>
                <input type="date" id="entry-date" name="entryDate" required 
                       class="w-full border border-gray-300 rounded px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
                <select id="reference-type" name="referenceType" class="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">Manual Entry</option>
                  <option value="INVOICE">Invoice</option>
                  <option value="GRN">GRN</option>
                  <option value="PAYROLL">Payroll</option>
                  <option value="INVENTORY">Inventory</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea id="entry-description" name="description" rows="2" required
                        placeholder="Describe this journal entry..."
                        class="w-full border border-gray-300 rounded px-3 py-2"></textarea>
            </div>

            <!-- Header row for lines -->
            <div class="grid grid-cols-12 gap-2 px-3">
              <div class="col-span-5 text-xs font-semibold text-gray-600">Account</div>
              <div class="col-span-3 text-xs font-semibold text-green-600">Debit (DR)</div>
              <div class="col-span-3 text-xs font-semibold text-red-600">Credit (CR)</div>
              <div class="col-span-1"></div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-3">
                <h4 class="text-md font-semibold text-gray-800">Entry Lines</h4>
                <button type="button" onclick="addJournalEntryLine()" class="btn-secondary px-3 py-1 text-sm text-white rounded">
                  <i data-feather="plus" class="w-4 h-4 inline mr-1"></i>
                  Add Line
                </button>
              </div>
              
              <div id="journal-entry-lines-container" class="space-y-2">
              </div>
              
              <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <p class="text-sm text-gray-600">Total Debits</p>
                    <p id="total-debits" class="text-lg font-bold text-green-600">Rs. 0.00</p>
                  </div>
                  <div>
                    <p class="text-sm text-gray-600">Total Credits</p>
                    <p id="total-credits" class="text-lg font-bold text-red-600">Rs. 0.00</p>
                  </div>
                </div>
                <div class="mt-2">
                  <p id="balance-status" class="text-sm font-semibold text-center text-gray-500">Add entry lines</p>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeAddJournalEntryModal()" class="btn-secondary px-4 py-2 text-white rounded-lg">
              Cancel
            </button>
            <button type="submit" id="post-journal-btn" class="btn-primary px-4 py-2 text-white rounded-lg">
              <i data-feather="save" class="w-4 h-4 inline mr-2"></i>
              Post Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeAddJournalEntryModal() {
  document.getElementById("add-journal-entry-modal").classList.add("hidden");
  journalEntryLines = [];
}

function addJournalEntryLine() {
  const lineId = Date.now(); // unique id
  journalEntryLines.push({
    id: lineId,
    accountId: null,
    debitAmount: 0,
    creditAmount: 0,
  });
  updateJournalEntryLinesDisplay();
}

function removeJournalEntryLine(lineId) {
  journalEntryLines = journalEntryLines.filter((l) => l.id !== lineId);
  updateJournalEntryLinesDisplay();
}

function getJournalAccountLabel(acc) {
  if (!acc) return "";
  const { accountTypes } = accountsData;
  const type = accountTypes.find((t) => t.id === acc.accountTypeId);
  const typeName = type ? type.name : "";
  return `${acc.accountCode} - ${acc.accountName}${
    typeName ? ` (${typeName})` : ""
  }`;
}

function getSelectedJournalAccountLabel(accountId) {
  if (!accountId) return "";
  const acc = (accountsData.accounts || []).find(
    (a) => a.id === parseInt(accountId)
  );
  return getJournalAccountLabel(acc);
}

function filterJournalAccounts(query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  const { accounts, accountTypes } = accountsData;
  return (accounts || [])
    .filter((acc) => acc.isActive)
    .filter((acc) => {
      if (!q) return true;
      const type = accountTypes.find((t) => t.id === acc.accountTypeId);
      const hay = `${acc.accountCode} ${acc.accountName} ${
        type?.name || ""
      }`.toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 80);
}

function buildJournalAccountDropdownHtml(lineId, query) {
  const matches = filterJournalAccounts(query);
  if (!matches.length) {
    return `<div class="px-3 py-2 text-sm text-gray-400">No accounts found</div>`;
  }
  return matches
    .map((acc) => {
      const label = getJournalAccountLabel(acc).replace(/"/g, "&quot;");
      return `<button type="button"
        class="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-50 last:border-0"
        onclick="selectJournalEntryAccount(${lineId}, ${acc.id})">${label}</button>`;
    })
    .join("");
}

function filterJournalAccountPicker(lineId, query) {
  const dropdown = document.getElementById(`je-account-dropdown-${lineId}`);
  if (!dropdown) return;
  dropdown.innerHTML = buildJournalAccountDropdownHtml(lineId, query);
  dropdown.classList.remove("hidden");
}

function openJournalAccountPicker(lineId) {
  const dropdown = document.getElementById(`je-account-dropdown-${lineId}`);
  const input = document.getElementById(`je-account-search-${lineId}`);
  if (!dropdown || !input) return;
  dropdown.innerHTML = buildJournalAccountDropdownHtml(lineId, input.value);
  dropdown.classList.remove("hidden");
}

function closeJournalAccountPicker(lineId) {
  const dropdown = document.getElementById(`je-account-dropdown-${lineId}`);
  if (dropdown) dropdown.classList.add("hidden");
}

function selectJournalEntryAccount(lineId, accountId) {
  const line = journalEntryLines.find((l) => l.id === lineId);
  if (!line) return;
  line.accountId = parseInt(accountId) || null;
  const input = document.getElementById(`je-account-search-${lineId}`);
  if (input) input.value = getSelectedJournalAccountLabel(line.accountId);
  closeJournalAccountPicker(lineId);
  updateJournalEntryTotals();
}

function clearJournalEntryAccount(lineId) {
  const line = journalEntryLines.find((l) => l.id === lineId);
  if (!line) return;
  line.accountId = null;
  const input = document.getElementById(`je-account-search-${lineId}`);
  if (input) input.value = "";
  openJournalAccountPicker(lineId);
  updateJournalEntryTotals();
}

function updateJournalEntryLine(lineId, field, value) {
  const line = journalEntryLines.find((l) => l.id === lineId);
  if (!line) return;
  if (field === "accountId") {
    line.accountId = parseInt(value) || null;
  } else if (field === "debitAmount") {
    line.debitAmount = parseFloat(value) || 0;
    if (line.debitAmount > 0) line.creditAmount = 0;
  } else if (field === "creditAmount") {
    line.creditAmount = parseFloat(value) || 0;
    if (line.creditAmount > 0) line.debitAmount = 0;
  }
  updateJournalEntryTotals();
}

function updateJournalEntryLinesDisplay() {
  const container = document.getElementById("journal-entry-lines-container");
  if (!container) return;

  if (journalEntryLines.length === 0) {
    container.innerHTML =
      '<p class="text-sm text-gray-500 text-center py-4">No lines added. Click "Add Line" to start.</p>';
    updateJournalEntryTotals();
    return;
  }

  container.innerHTML = journalEntryLines
    .map(
      (line) => `
    <div class="grid grid-cols-12 gap-2 items-center p-3 bg-white border border-gray-200 rounded">
      <div class="col-span-5 relative">
        <div class="flex gap-1">
          <input type="text"
                 id="je-account-search-${line.id}"
                 value="${getSelectedJournalAccountLabel(line.accountId).replace(
                   /"/g,
                   "&quot;"
                 )}"
                 placeholder="Search account code or name..."
                 autocomplete="off"
                 onfocus="openJournalAccountPicker(${line.id})"
                 oninput="filterJournalAccountPicker(${line.id}, this.value)"
                 class="w-full border border-gray-300 rounded px-2 py-1 text-sm" />
          <button type="button" onclick="clearJournalEntryAccount(${line.id})"
                  class="px-2 text-gray-400 hover:text-gray-600" title="Clear">×</button>
        </div>
        <div id="je-account-dropdown-${line.id}"
             class="hidden absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg">
        </div>
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" placeholder="Debit" min="0"
               value="${line.debitAmount > 0 ? line.debitAmount : ""}"
               onchange="updateJournalEntryLine(${
                 line.id
               }, 'debitAmount', this.value)"
               class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
      </div>
      <div class="col-span-3">
        <input type="number" step="0.01" placeholder="Credit" min="0"
               value="${line.creditAmount > 0 ? line.creditAmount : ""}"
               onchange="updateJournalEntryLine(${
                 line.id
               }, 'creditAmount', this.value)"
               class="w-full border border-gray-300 rounded px-2 py-1 text-sm">
      </div>
      <div class="col-span-1 text-center">
        <button type="button" onclick="removeJournalEntryLine(${line.id})" 
                class="text-red-600 hover:bg-red-50 p-1 rounded">
          <i data-feather="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  feather.replace();
  updateJournalEntryTotals();
}

function updateJournalEntryTotals() {
  const totalDebits = journalEntryLines.reduce(
    (sum, l) => sum + l.debitAmount,
    0
  );
  const totalCredits = journalEntryLines.reduce(
    (sum, l) => sum + l.creditAmount,
    0
  );

  const fmtEl = (id, val, cls) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = `Rs. ${val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      el.className = `text-lg font-bold ${cls}`;
    }
  };
  fmtEl("total-debits", totalDebits, "text-green-600");
  fmtEl("total-credits", totalCredits, "text-red-600");

  const statusEl = document.getElementById("balance-status");
  if (!statusEl) return;
  if (totalDebits === 0 && totalCredits === 0) {
    statusEl.textContent = "Add entry lines";
    statusEl.className = "text-sm font-semibold text-center text-gray-500";
  } else if (Math.abs(totalDebits - totalCredits) < 0.005) {
    statusEl.textContent = "✓ Balanced";
    statusEl.className = "text-sm font-semibold text-center text-green-600";
  } else {
    statusEl.textContent = `⚠ Out of balance by Rs. ${Math.abs(
      totalDebits - totalCredits
    ).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    statusEl.className = "text-sm font-semibold text-center text-red-600";
  }
}

async function handleAddJournalEntry(event) {
  event.preventDefault();

  if (journalEntryLines.length === 0) {
    showNotification("Please add at least one entry line", "error");
    return;
  }

  const totalDebits = journalEntryLines.reduce(
    (sum, l) => sum + l.debitAmount,
    0
  );
  const totalCredits = journalEntryLines.reduce(
    (sum, l) => sum + l.creditAmount,
    0
  );

  if (Math.abs(totalDebits - totalCredits) > 0.005) {
    showNotification(
      "Entry is not balanced. Debits must equal Credits.",
      "error"
    );
    return;
  }
  if (totalDebits === 0) {
    showNotification("Entry amounts cannot be zero", "error");
    return;
  }
  if (journalEntryLines.some((l) => !l.accountId)) {
    showNotification("All lines must have an account selected", "error");
    return;
  }

  const btn = document.getElementById("post-journal-btn");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Posting...";
  }

  const formData = new FormData(event.target);
  const payload = {
    entryDate: formData.get("entryDate"),
    description: formData.get("description"),
    referenceType: formData.get("referenceType") || "MANUAL",
    lines: journalEntryLines.map((l) => ({
      accountId: l.accountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
    })),
  };

  try {
    const created = await accountsRequest("/accounts/journal-entries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeAddJournalEntryModal();
    showNotification(
      `Journal entry ${created.entryNumber} posted successfully!`,
      "success"
    );
    await switchAccountsTab("journal-entries");
  } catch (err) {
    showNotification("Failed to post journal entry: " + err.message, "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i data-feather="save" class="w-4 h-4 inline mr-2"></i>Post Entry';
      feather.replace();
    }
  }
}

// ============================================
// VIEW JOURNAL ENTRY MODAL
// ============================================

async function viewJournalEntry(entryId) {
  try {
    const entry = await accountsRequest(`/accounts/journal-entries/${entryId}`);

    if (!document.getElementById("view-journal-entry-modal")) {
      createViewJournalEntryModal();
    }

    document.getElementById("view-entry-number").textContent =
      entry.entryNumber;
    document.getElementById("view-entry-date").textContent = new Date(
      entry.entryDate
    ).toLocaleDateString();
    document.getElementById("view-entry-description").textContent =
      entry.description || "";
    document.getElementById("view-entry-reference").textContent =
      entry.referenceType
        ? `${entry.referenceType}${
            entry.referenceId ? " #" + entry.referenceId : ""
          }`
        : "Manual Entry";

    const reversalMeta = document.getElementById("view-entry-reversal-meta");
    if (reversalMeta) {
      if (entry.isReversal && entry.reversalOfEntryNumber) {
        reversalMeta.textContent = `Reversal of ${entry.reversalOfEntryNumber}`;
      } else if (entry.isReversed && entry.reversedByEntryNumber) {
        reversalMeta.textContent = `Reversed by ${entry.reversedByEntryNumber}`;
      } else {
        reversalMeta.textContent = "";
      }
    }

    const statusEl = document.getElementById("view-entry-status");
    statusEl.textContent = entry.isPosted ? "Posted" : "Draft";
    statusEl.className = `px-3 py-1 rounded text-sm font-semibold ${
      entry.isPosted
        ? "bg-green-100 text-green-700"
        : "bg-yellow-100 text-yellow-700"
    }`;

    // formatJournalEntry() returns lines with separate debitAccountName/creditAccountName fields.
    // Transform into flat display rows: one row per debit account, one per credit account.
    const displayLines = [];
    (entry.lines || []).forEach((line) => {
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

    const linesHTML =
      displayLines
        .map(
          (line) => `
      <tr class="border-b border-gray-200">
        <td class="px-4 py-3 text-sm text-gray-800">${
          line.accountName || ""
        }</td>
        <td class="px-4 py-3 text-sm text-right ${
          line.debitAmount > 0
            ? "font-semibold text-green-600"
            : "text-gray-400"
        }">
          ${
            line.debitAmount > 0
              ? "Rs. " + Number(line.debitAmount).toLocaleString()
              : "-"
          }
        </td>
        <td class="px-4 py-3 text-sm text-right ${
          line.creditAmount > 0 ? "font-semibold text-red-600" : "text-gray-400"
        }">
          ${
            line.creditAmount > 0
              ? "Rs. " + Number(line.creditAmount).toLocaleString()
              : "-"
          }
        </td>
      </tr>
    `
        )
        .join("") +
      `
      <tr class="bg-gray-100 font-bold">
        <td class="px-4 py-3 text-sm text-right">TOTAL</td>
        <td class="px-4 py-3 text-sm text-right text-green-600">Rs. ${Number(
          entry.totalDebit
        ).toLocaleString()}</td>
        <td class="px-4 py-3 text-sm text-right text-red-600">Rs. ${Number(
          entry.totalCredit
        ).toLocaleString()}</td>
      </tr>
    `;

    document.getElementById("view-entry-lines").innerHTML = linesHTML;
    document
      .getElementById("view-journal-entry-modal")
      .classList.remove("hidden");
    feather.replace();
  } catch (err) {
    showNotification("Failed to load journal entry: " + err.message, "error");
  }
}

function createViewJournalEntryModal() {
  const modalHTML = `
    <div id="view-journal-entry-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Journal Entry Details</h3>
          <button onclick="closeViewJournalEntryModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p class="text-xs text-gray-600">Entry Number</p>
              <p id="view-entry-number" class="font-semibold text-blue-600"></p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Date</p>
              <p id="view-entry-date" class="font-semibold"></p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Reference</p>
              <p id="view-entry-reference" class="font-semibold"></p>
            </div>
            <div>
              <p class="text-xs text-gray-600">Status</p>
              <span id="view-entry-status"></span>
            </div>
          </div>

          <p id="view-entry-reversal-meta" class="text-sm text-amber-700"></p>

          <div>
            <p class="text-sm font-medium text-gray-700 mb-1">Description</p>
            <p id="view-entry-description" class="text-sm text-gray-800 p-3 bg-gray-50 rounded"></p>
          </div>

          <div>
            <p class="text-sm font-medium text-gray-700 mb-2">Entry Lines</p>
            <table class="w-full">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-4 py-2 text-left text-sm font-semibold text-gray-700">Account</th>
                  <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">Debit</th>
                  <th class="px-4 py-2 text-right text-sm font-semibold text-gray-700">Credit</th>
                </tr>
              </thead>
              <tbody id="view-entry-lines"></tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end mt-6">
          <button onclick="closeViewJournalEntryModal()" class="btn-secondary px-4 py-2 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeViewJournalEntryModal() {
  document.getElementById("view-journal-entry-modal").classList.add("hidden");
}

// Export functions to global scope
window.openAddJournalEntryModal = openAddJournalEntryModal;
window.closeAddJournalEntryModal = closeAddJournalEntryModal;
window.addJournalEntryLine = addJournalEntryLine;
window.removeJournalEntryLine = removeJournalEntryLine;
window.updateJournalEntryLine = updateJournalEntryLine;
window.filterJournalAccountPicker = filterJournalAccountPicker;
window.openJournalAccountPicker = openJournalAccountPicker;
window.selectJournalEntryAccount = selectJournalEntryAccount;
window.clearJournalEntryAccount = clearJournalEntryAccount;
window.handleAddJournalEntry = handleAddJournalEntry;
window.viewJournalEntry = viewJournalEntry;
window.closeViewJournalEntryModal = closeViewJournalEntryModal;
