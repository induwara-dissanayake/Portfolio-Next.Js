// Accounts Module - Part 3: Modals (Add/Edit/Delete Account, Add Mapping)
// All CRUD operations hit the real backend API

// ============================================
// ADD ACCOUNT MODAL
// ============================================

function openAddAccountModal() {
  if (!document.getElementById("add-account-modal")) {
    createAddAccountModal();
  }
  document.getElementById("add-account-modal").classList.remove("hidden");
  document.getElementById("add-account-form").reset();
  const btn = document.getElementById("add-account-btn");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<i data-feather="plus" class="w-4 h-4 inline mr-2"></i>Add Account';
  }
  feather.replace();
}

function createAddAccountModal() {
  const { accountTypes } = accountsData;
  const modalHTML = `
    <div id="add-account-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Add New Account</h3>
          <button onclick="closeAddAccountModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <form id="add-account-form" onsubmit="handleAddAccount(event)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <select id="account-type" name="accountType" required 
                      onchange="updateParentAccountOptions()"
                      class="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">Select Account Type</option>
                ${accountTypes
                  .map(
                    (type) =>
                      `<option value="${type.id}">${type.name} (${type.normalSide})</option>`
                  )
                  .join("")}
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Parent Account (Optional)</label>
              <select id="parent-account" name="parentAccount" class="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">None (Top Level)</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Only accounts of the same type are shown</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
              <input type="text" id="account-code" name="accountCode" required 
                     placeholder="e.g., 1400" 
                     class="w-full border border-gray-300 rounded px-3 py-2">
              <p class="text-xs text-gray-500 mt-1">Use 1000s for Assets, 2000s for Liabilities, etc.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input type="text" id="account-name" name="accountName" required 
                     placeholder="e.g., Prepaid Expenses" 
                     class="w-full border border-gray-300 rounded px-3 py-2">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea id="account-description" name="description" rows="3" 
                        placeholder="Optional description of this account"
                        class="w-full border border-gray-300 rounded px-3 py-2"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
              <input type="number" id="initial-balance" name="initialBalance" 
                     placeholder="0.00" step="0.01" value="0"
                     class="w-full border border-gray-300 rounded px-3 py-2">
            </div>

            <div class="flex items-center">
              <input type="checkbox" id="is-active" name="isActive" checked 
                     class="w-4 h-4 text-blue-600 border-gray-300 rounded">
              <label for="is-active" class="ml-2 text-sm text-gray-700">Active Account</label>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeAddAccountModal()" class="btn-secondary px-4 py-2 text-white rounded-lg">
              Cancel
            </button>
            <button type="submit" id="add-account-btn" class="btn-primary px-4 py-2 text-white rounded-lg">
              <i data-feather="plus" class="w-4 h-4 inline mr-2"></i>
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function updateParentAccountOptions() {
  const accountTypeId = parseInt(document.getElementById("account-type").value);
  const parentSelect = document.getElementById("parent-account");
  parentSelect.innerHTML = '<option value="">None (Top Level)</option>';
  if (!accountTypeId) return;

  accountsData.accounts
    .filter((acc) => acc.accountTypeId === accountTypeId && acc.isActive)
    .forEach((acc) => {
      const option = document.createElement("option");
      option.value = acc.id;
      option.textContent = `${acc.accountCode} - ${acc.accountName}`;
      parentSelect.appendChild(option);
    });
}

function closeAddAccountModal() {
  document.getElementById("add-account-modal").classList.add("hidden");
}

async function handleAddAccount(event) {
  event.preventDefault();

  const btn = document.getElementById("add-account-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const formData = new FormData(event.target);
  const payload = {
    accountCode: formData.get("accountCode"),
    accountName: formData.get("accountName"),
    accountTypeId: parseInt(formData.get("accountType")),
    parentId: formData.get("parentAccount")
      ? parseInt(formData.get("parentAccount"))
      : null,
    description: formData.get("description") || null,
    initialBalance: parseFloat(formData.get("initialBalance")) || 0,
    isActive: formData.get("isActive") === "on",
  };

  try {
    await accountsRequest("/accounts/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    closeAddAccountModal();
    showNotification("Account added successfully!", "success");
    await switchAccountsTab("chart-of-accounts");
  } catch (err) {
    showNotification("Failed to add account: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML =
      '<i data-feather="plus" class="w-4 h-4 inline mr-2"></i>Add Account';
    feather.replace();
  }
}

// ============================================
// EDIT ACCOUNT MODAL
// ============================================

async function editAccount(accountId) {
  const account = accountsData.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

  if (!document.getElementById("edit-account-modal")) {
    createEditAccountModal();
  }

  document.getElementById("edit-account-id").value = account.id;
  document.getElementById("edit-account-type").value = account.accountTypeId;
  document.getElementById("edit-account-code").value = account.accountCode;
  document.getElementById("edit-account-name").value = account.accountName;
  document.getElementById("edit-account-description").value =
    account.description || "";
  document.getElementById("edit-account-balance").value = Number(
    account.balance || 0
  );
  document.getElementById("edit-is-active").checked = account.isActive;

  updateEditParentAccountOptions();
  setTimeout(() => {
    document.getElementById("edit-parent-account").value =
      account.parentId || "";
  }, 50);

  document.getElementById("edit-account-modal").classList.remove("hidden");
  feather.replace();
}

function createEditAccountModal() {
  const { accountTypes } = accountsData;
  const modalHTML = `
    <div id="edit-account-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-semibold text-gray-800">Edit Account</h3>
          <button onclick="closeEditAccountModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <form id="edit-account-form" onsubmit="handleEditAccount(event)">
          <input type="hidden" id="edit-account-id" name="accountId">
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <select id="edit-account-type" name="accountType" required 
                      onchange="updateEditParentAccountOptions()"
                      class="w-full border border-gray-300 rounded px-3 py-2">
                ${accountTypes
                  .map(
                    (type) =>
                      `<option value="${type.id}">${type.name} (${type.normalSide})</option>`
                  )
                  .join("")}
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Parent Account (Optional)</label>
              <select id="edit-parent-account" name="parentAccount" class="w-full border border-gray-300 rounded px-3 py-2">
                <option value="">None (Top Level)</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
              <input type="text" id="edit-account-code" name="accountCode" required 
                     class="w-full border border-gray-300 rounded px-3 py-2">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input type="text" id="edit-account-name" name="accountName" required 
                     class="w-full border border-gray-300 rounded px-3 py-2">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea id="edit-account-description" name="description" rows="3" 
                        class="w-full border border-gray-300 rounded px-3 py-2"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Current Balance (Read-only)</label>
              <input type="number" id="edit-account-balance" name="balance" readonly
                     class="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100">
              <p class="text-xs text-gray-500 mt-1">Balance is managed through journal entries.</p>
            </div>

            <div class="flex items-center">
              <input type="checkbox" id="edit-is-active" name="isActive" 
                     class="w-4 h-4 text-blue-600 border-gray-300 rounded">
              <label for="edit-is-active" class="ml-2 text-sm text-gray-700">Active Account</label>
            </div>
          </div>

          <div class="flex justify-end space-x-3 mt-6">
            <button type="button" onclick="closeEditAccountModal()" class="btn-secondary px-4 py-2 text-white rounded-lg">
              Cancel
            </button>
            <button type="submit" id="edit-account-btn" class="btn-primary px-4 py-2 text-white rounded-lg">
              <i data-feather="save" class="w-4 h-4 inline mr-2"></i>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function updateEditParentAccountOptions() {
  const accountTypeId = parseInt(
    document.getElementById("edit-account-type").value
  );
  const accountId = parseInt(document.getElementById("edit-account-id").value);
  const parentSelect = document.getElementById("edit-parent-account");
  parentSelect.innerHTML = '<option value="">None (Top Level)</option>';
  if (!accountTypeId) return;

  accountsData.accounts
    .filter(
      (acc) =>
        acc.accountTypeId === accountTypeId &&
        acc.isActive &&
        acc.id !== accountId
    )
    .forEach((acc) => {
      const option = document.createElement("option");
      option.value = acc.id;
      option.textContent = `${acc.accountCode} - ${acc.accountName}`;
      parentSelect.appendChild(option);
    });
}

function closeEditAccountModal() {
  document.getElementById("edit-account-modal").classList.add("hidden");
}

async function handleEditAccount(event) {
  event.preventDefault();

  const btn = document.getElementById("edit-account-btn");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const formData = new FormData(event.target);
  const accountId = parseInt(formData.get("accountId"));
  const payload = {
    accountCode: formData.get("accountCode"),
    accountName: formData.get("accountName"),
    accountTypeId: parseInt(formData.get("accountType")),
    parentId: formData.get("parentAccount")
      ? parseInt(formData.get("parentAccount"))
      : null,
    description: formData.get("description") || null,
    isActive: formData.get("isActive") === "on",
  };

  try {
    await accountsRequest(`/accounts/accounts/${accountId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    closeEditAccountModal();
    showNotification("Account updated successfully!", "success");
    await switchAccountsTab("chart-of-accounts");
  } catch (err) {
    showNotification("Failed to update account: " + err.message, "error");
    btn.disabled = false;
    btn.innerHTML =
      '<i data-feather="save" class="w-4 h-4 inline mr-2"></i>Save Changes';
    feather.replace();
  }
}

// ============================================
// DELETE ACCOUNT
// ============================================

async function deleteAccount(accountId) {
  const account = accountsData.accounts.find((acc) => acc.id === accountId);
  if (!account) return;

  if (
    !confirm(
      `Are you sure you want to delete account "${account.accountName}"?`
    )
  )
    return;

  try {
    await accountsRequest(`/accounts/accounts/${accountId}`, {
      method: "DELETE",
    });
    showNotification("Account deleted successfully!", "success");
    await switchAccountsTab("chart-of-accounts");
  } catch (err) {
    showNotification("Failed to delete account: " + err.message, "error");
  }
}

// ============================================
// ADD TRANSACTION MAPPING MODAL (not exposed - system mappings only)
// ============================================
// Transaction mappings are system-defined. Users configure accounts via inline dropdowns.
// The Add Mapping modal is kept for potential future custom mappings.

function openAddMappingModal() {
  showNotification(
    "Transaction mapping points are system-defined. Use the inline dropdowns to configure accounts.",
    "info"
  );
}

// ============================================
// ACCOUNT LEDGER DETAILS
// ============================================

async function viewAccountDetails(accountId) {
  try {
    if (!document.getElementById("account-details-modal")) {
      createAccountDetailsModal();
    }

    const from = document.getElementById("account-details-from")?.value || "";
    const to = document.getElementById("account-details-to")?.value || "";
    const qs = new URLSearchParams();
    if (from) qs.append("dateFrom", from);
    if (to) qs.append("dateTo", to);

    const data = await accountsRequest(
      `/accounts/accounts/${accountId}/details${
        qs.toString() ? `?${qs.toString()}` : ""
      }`
    );

    document.getElementById("account-details-id").value = accountId;
    document.getElementById(
      "account-details-title"
    ).textContent = `${data.account.accountCode} - ${data.account.accountName}`;
    document.getElementById(
      "account-details-meta"
    ).textContent = `${data.account.accountType} (${data.account.normalSide})${
      data.includesChildren ? " · Includes sub-account transactions" : ""
    }`;

    document.getElementById(
      "account-opening-balance"
    ).textContent = `Rs. ${Number(data.openingBalance).toLocaleString()}`;
    document.getElementById(
      "account-closing-balance"
    ).textContent = `Rs. ${Number(data.closingBalance).toLocaleString()}`;

    const rows = (data.transactions || []).slice().reverse();
    document.getElementById("account-details-lines").innerHTML = rows.length
      ? rows
          .map(
            (row) => `
      <tr class="border-b border-gray-100">
        <td class="px-3 py-2 text-sm text-gray-600">${new Date(
          row.entryDate
        ).toLocaleDateString()}</td>
        <td class="px-3 py-2 text-sm text-blue-600">${row.entryNumber}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${
          row.referenceType || ""
        } ${row.referenceId ? `#${row.referenceId}` : ""}</td>
        <td class="px-3 py-2 text-sm text-gray-700">${
          row.postingAccount || "-"
        }</td>
        <td class="px-3 py-2 text-sm text-gray-700">${
          row.description || ""
        }</td>
        <td class="px-3 py-2 text-sm text-gray-700">${
          row.counterpartAccount || "-"
        }</td>
        <td class="px-3 py-2 text-sm text-right text-green-600">${
          row.debitAmount > 0
            ? `${Number(row.debitAmount).toLocaleString()}`
            : "-"
        }</td>
        <td class="px-3 py-2 text-sm text-right text-red-600">${
          row.creditAmount > 0
            ? `${Number(row.creditAmount).toLocaleString()}`
            : "-"
        }</td>
        <td class="px-3 py-2 text-sm text-right font-semibold text-gray-800">${Number(
          row.runningBalance
        ).toLocaleString()}</td>
      </tr>`
          )
          .join("")
      : '<tr><td colspan="9" class="px-3 py-6 text-center text-gray-400">No transactions in selected period.</td></tr>';

    document.getElementById("account-details-modal").classList.remove("hidden");
  } catch (err) {
    showNotification("Failed to load account details: " + err.message, "error");
  }
}

function createAccountDetailsModal() {
  const html = `
    <div id="account-details-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
      <div class="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <input type="hidden" id="account-details-id" />
        <div class="flex justify-between items-center mb-4">
          <div>
            <h3 id="account-details-title" class="text-xl font-semibold text-gray-800"></h3>
            <p id="account-details-meta" class="text-sm text-gray-500"></p>
          </div>
          <button onclick="closeAccountDetailsModal()" class="text-gray-400 hover:text-gray-600">
            <i data-feather="x" class="w-6 h-6"></i>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input type="date" id="account-details-from" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input type="date" id="account-details-to" class="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div class="flex items-end">
            <button onclick="refreshAccountDetails()" class="btn-secondary px-4 py-2 text-white rounded-lg w-full">Apply</button>
          </div>
          <div class="flex items-end">
            <button onclick="clearAccountDetailsFilters()" class="px-4 py-2 border border-gray-300 rounded-lg w-full text-sm text-gray-700">Clear</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="p-3 rounded bg-gray-50">
            <p class="text-xs text-gray-500">Opening Balance</p>
            <p id="account-opening-balance" class="text-lg font-semibold text-gray-800"></p>
          </div>
          <div class="p-3 rounded bg-gray-50">
            <p class="text-xs text-gray-500">Closing Balance</p>
            <p id="account-closing-balance" class="text-lg font-semibold text-gray-800"></p>
          </div>
        </div>

        <div class="overflow-x-auto border border-gray-200 rounded">
          <table class="w-full">
            <thead class="bg-gray-100">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Entry #</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Source</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Account</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-gray-700">Counterpart</th>
                <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Debit</th>
                <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Credit</th>
                <th class="px-3 py-2 text-right text-xs font-semibold text-gray-700">Running Balance</th>
              </tr>
            </thead>
            <tbody id="account-details-lines"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
  feather.replace();
}

function closeAccountDetailsModal() {
  document.getElementById("account-details-modal")?.classList.add("hidden");
}

async function refreshAccountDetails() {
  const id = parseInt(
    document.getElementById("account-details-id")?.value || "0"
  );
  if (!id) return;
  await viewAccountDetails(id);
}

async function clearAccountDetailsFilters() {
  const from = document.getElementById("account-details-from");
  const to = document.getElementById("account-details-to");
  if (from) from.value = "";
  if (to) to.value = "";
  await refreshAccountDetails();
}

// Export functions to global scope
window.openAddAccountModal = openAddAccountModal;
window.closeAddAccountModal = closeAddAccountModal;
window.handleAddAccount = handleAddAccount;
window.updateParentAccountOptions = updateParentAccountOptions;
window.editAccount = editAccount;
window.closeEditAccountModal = closeEditAccountModal;
window.handleEditAccount = handleEditAccount;
window.updateEditParentAccountOptions = updateEditParentAccountOptions;
window.deleteAccount = deleteAccount;
window.openAddMappingModal = openAddMappingModal;
window.viewAccountDetails = viewAccountDetails;
window.closeAccountDetailsModal = closeAccountDetailsModal;
window.refreshAccountDetails = refreshAccountDetails;
window.clearAccountDetailsFilters = clearAccountDetailsFilters;
