// Accounts Module - Part 2: Transaction Mapping, Journal Entries, and Reports

// ============================================
// TRANSACTION MAPPING TAB - Pre-defined System Transaction Points
// ============================================

function generateTransactionMappingTab() {
  // Group mappings by module
  const modules = ['GRN', 'INVOICE', 'INVENTORY', 'PAYROLL', 'REPAIRS'];
  const moduleIcons = {
    'GRN': 'package',
    'INVOICE': 'file-text',
    'INVENTORY': 'box',
    'PAYROLL': 'dollar-sign',
    'REPAIRS': 'tool'
  };
  const moduleNames = {
    'GRN': 'Goods Received Note',
    'INVOICE': 'Sales & Invoicing',
    'INVENTORY': 'Inventory Management',
    'PAYROLL': 'Payroll & Salaries',
    'REPAIRS': 'Repair Services'
  };
  
  return `
    <div>
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">Transaction Mapping Configuration</h2>
        <p class="text-sm text-gray-600 mt-1">Configure which accounts are debited and credited for each system transaction point</p>
        <div class="mt-3 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p class="text-sm text-blue-800">
            <i data-feather="info" class="w-4 h-4 inline mr-2"></i>
            <strong>Note:</strong> Transaction points are pre-defined by the system and cannot be added or removed. 
            You can only configure which accounts to use for each transaction.
          </p>
        </div>
      </div>

      ${modules.map(module => {
        const moduleMappings = transactionMappings.filter(m => m.module === module);
        if (moduleMappings.length === 0) return '';
        
        return `
          <div class="card p-6 mb-6">
            <div class="flex items-center mb-4 pb-3 border-b border-gray-200">
              <i data-feather="${moduleIcons[module]}" class="w-6 h-6 text-blue-600 mr-3"></i>
              <div>
                <h3 class="text-lg font-semibold text-gray-800">${moduleNames[module]}</h3>
                <p class="text-xs text-gray-500">${moduleMappings.length} transaction point${moduleMappings.length > 1 ? 's' : ''}</p>
              </div>
            </div>

            <div class="space-y-4">
              ${moduleMappings.map(mapping => generateMappingRow(mapping)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Generate individual mapping row with inline editing
function generateMappingRow(mapping) {
  const debitAccount = chartOfAccounts.find(acc => acc.id === mapping.debitAccountId);
  const creditAccount = chartOfAccounts.find(acc => acc.id === mapping.creditAccountId);
  
  return `
    <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-800">${mapping.transactionPoint}</h4>
          <p class="text-xs text-gray-500 mt-1">${mapping.description}</p>
        </div>
        <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
          ${mapping.isSystemDefined ? 'System Defined' : 'Custom'}
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <!-- Debit Account -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-2">
            <span class="inline-flex items-center">
              <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Debit Account
            </span>
          </label>
          <select id="debit-${mapping.id}" 
                  onchange="updateMappingAccount(${mapping.id}, 'debit', this.value)"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            ${chartOfAccounts.filter(acc => acc.isActive).map(acc => {
              const type = accountTypes.find(t => t.id === acc.accountTypeId);
              return `<option value="${acc.id}" ${acc.id === mapping.debitAccountId ? 'selected' : ''}>
                ${acc.accountCode} - ${acc.accountName} (${type.name})
              </option>`;
            }).join('')}
          </select>
          ${debitAccount ? `
            <p class="text-xs text-gray-500 mt-1">
              Current: ${debitAccount.accountCode} - ${debitAccount.accountName}
            </p>
          ` : ''}
        </div>

        <!-- Credit Account -->
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-2">
            <span class="inline-flex items-center">
              <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
              Credit Account
            </span>
          </label>
          <select id="credit-${mapping.id}" 
                  onchange="updateMappingAccount(${mapping.id}, 'credit', this.value)"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            ${chartOfAccounts.filter(acc => acc.isActive).map(acc => {
              const type = accountTypes.find(t => t.id === acc.accountTypeId);
              return `<option value="${acc.id}" ${acc.id === mapping.creditAccountId ? 'selected' : ''}>
                ${acc.accountCode} - ${acc.accountName} (${type.name})
              </option>`;
            }).join('')}
          </select>
          ${creditAccount ? `
            <p class="text-xs text-gray-500 mt-1">
              Current: ${creditAccount.accountCode} - ${creditAccount.accountName}
            </p>
          ` : ''}
        </div>
      </div>

      <!-- Journal Entry Preview -->
      <div class="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        <p class="text-xs font-medium text-gray-600 mb-2">Journal Entry Preview:</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex items-center">
            <span class="text-green-600 font-semibold mr-2">DR</span>
            <span class="text-gray-700">${debitAccount?.accountName || 'Not configured'}</span>
          </div>
          <div class="flex items-center">
            <span class="text-red-600 font-semibold mr-2">CR</span>
            <span class="text-gray-700">${creditAccount?.accountName || 'Not configured'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update mapping account (inline save)
function updateMappingAccount(mappingId, type, accountId) {
  const mapping = transactionMappings.find(m => m.id === mappingId);
  if (!mapping) return;
  
  const newAccountId = parseInt(accountId);
  
  // Prevent same account for debit and credit
  if (type === 'debit' && newAccountId === mapping.creditAccountId) {
    showNotification('Debit and Credit accounts cannot be the same!', 'error');
    // Reset to previous value
    document.getElementById(`debit-${mappingId}`).value = mapping.debitAccountId;
    return;
  }
  
  if (type === 'credit' && newAccountId === mapping.debitAccountId) {
    showNotification('Debit and Credit accounts cannot be the same!', 'error');
    // Reset to previous value
    document.getElementById(`credit-${mappingId}`).value = mapping.creditAccountId;
    return;
  }
  
  // Update mapping
  if (type === 'debit') {
    mapping.debitAccountId = newAccountId;
  } else {
    mapping.creditAccountId = newAccountId;
  }
  
  const account = chartOfAccounts.find(acc => acc.id === newAccountId);
  showNotification(`${mapping.transactionPoint}: ${type === 'debit' ? 'Debit' : 'Credit'} account updated to "${account.accountName}"`, 'success');
  
  // Refresh the tab to show updated preview
  switchAccountsTab('transaction-mapping');
}

// Continue with rest of file...
