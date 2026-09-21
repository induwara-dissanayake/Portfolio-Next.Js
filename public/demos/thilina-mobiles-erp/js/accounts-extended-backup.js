// Accounts Module - Part 2: Transaction Mapping, Journal Entries, and Reports

// Generate Transaction Mapping Tab
function generateTransactionMappingTab() {
  return `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Transaction Mapping</h2>
          <p class="text-sm text-gray-600 mt-1">Configure how transactions are recorded in the ledger</p>
        </div>
        <button onclick="openAddMappingModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="plus" class="w-4 h-4 mr-2"></i>
          Add Mapping
        </button>
      </div>

      <!-- Transaction Mappings List -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${transactionMappings.map(mapping => generateMappingCard(mapping)).join('')}
      </div>
    </div>
  `;
}

// Generate Mapping Card
function generateMappingCard(mapping) {
  const debitAccount = chartOfAccounts.find(acc => acc.id === mapping.debitAccountId);
  const creditAccount = chartOfAccounts.find(acc => acc.id === mapping.creditAccountId);
  
  return `
    <div class="card p-6 border-l-4 border-blue-500">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">${mapping.name}</h3>
          <p class="text-sm text-gray-500">${mapping.transactionType}</p>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="editMapping(${mapping.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded">
            <i data-feather="edit-2" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteMapping(${mapping.id})" class="p-2 text-red-600 hover:bg-red-50 rounded">
            <i data-feather="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Debit Entry -->
      <div class="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-green-600 text-white text-xs font-bold rounded">DEBIT</span>
            <span class="text-sm font-medium text-gray-700">${debitAccount?.accountName || 'N/A'}</span>
          </div>
          <span class="text-xs text-gray-500">${debitAccount?.accountCode || ''}</span>
        </div>
      </div>

      <!-- Credit Entry -->
      <div class="p-3 bg-red-50 rounded-lg border border-red-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">CREDIT</span>
            <span class="text-sm font-medium text-gray-700">${creditAccount?.accountName || 'N/A'}</span>
          </div>
          <span class="text-xs text-gray-500">${creditAccount?.accountCode || ''}</span>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <span class="text-xs ${mapping.isActive ? 'text-green-600' : 'text-red-600'} font-medium">
          ${mapping.isActive ? '● Active' : '● Inactive'}
        </span>
      </div>
    </div>
  `;
}

// Generate Journal Entries Tab
function generateJournalEntriesTab() {
  return `
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Journal Entries</h2>
          <p class="text-sm text-gray-600 mt-1">View and create manual journal entries</p>
        </div>
        <button onclick="openAddJournalEntryModal()" class="btn-primary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="plus" class="w-4 h-4 mr-2"></i>
          New Entry
        </button>
      </div>

      <!-- Filter Section -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input type="date" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input type="date" class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference Type</label>
            <select class="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">All Types</option>
              <option value="INVOICE">Invoice</option>
              <option value="GRN">GRN</option>
              <option value="PAYROLL">Payroll</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div class="flex items-end">
            <button class="btn-secondary px-4 py-2 text-white rounded-lg w-full">
              <i data-feather="filter" class="w-4 h-4 inline mr-2"></i>
              Filter
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
            ${journalEntries.map(entry => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm font-medium text-blue-600">${entry.entryNumber}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${new Date(entry.entryDate).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-sm text-gray-800">${entry.description}</td>
                <td class="px-4 py-3 text-sm">
                  ${entry.referenceType ? `
                    <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">${entry.referenceType}</span>
                    <span class="text-xs text-gray-500">${entry.referenceId}</span>
                  ` : '-'}
                </td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-green-600">Rs. ${entry.totalDebit.toLocaleString()}</td>
                <td class="px-4 py-3 text-sm text-right font-semibold text-red-600">Rs. ${entry.totalCredit.toLocaleString()}</td>
                <td class="px-4 py-3 text-center">
                  <span class="px-2 py-1 text-xs font-semibold rounded ${entry.isPosted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                    ${entry.isPosted ? 'Posted' : 'Draft'}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <button onclick="viewJournalEntry(${entry.id})" class="p-1 text-blue-600 hover:bg-blue-50 rounded">
                    <i data-feather="eye" class="w-4 h-4"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Generate Reports Tab
function generateReportsTab() {
  return `
    <div class="space-y-6">
      <!-- Report Selection Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div onclick="showReport('trial-balance')" class="card p-6 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-blue-100 rounded-full">
              <i data-feather="balance" class="w-6 h-6 text-blue-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800">Trial Balance</h3>
              <p class="text-xs text-gray-500">Verify debits = credits</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('general-ledger')" class="card p-6 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-green-100 rounded-full">
              <i data-feather="book-open" class="w-6 h-6 text-green-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800">General Ledger</h3>
              <p class="text-xs text-gray-500">All transactions</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('balance-sheet')" class="card p-6 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-purple-100 rounded-full">
              <i data-feather="file-text" class="w-6 h-6 text-purple-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800">Balance Sheet</h3>
              <p class="text-xs text-gray-500">Financial position</p>
            </div>
          </div>
        </div>

        <div onclick="showReport('income-statement')" class="card p-6 cursor-pointer hover:shadow-lg transition-all">
          <div class="flex items-center space-x-4">
            <div class="p-3 bg-orange-100 rounded-full">
              <i data-feather="trending-up" class="w-6 h-6 text-orange-600"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800">Income Statement</h3>
              <p class="text-xs text-gray-500">Profit & Loss</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Report Display Area -->
      <div id="report-display-area" class="bg-white rounded-lg shadow-md p-6">
        ${generateTrialBalanceReport()}
      </div>
    </div>
  `;
}

// Generate Trial Balance Report
function generateTrialBalanceReport() {
  const accounts = chartOfAccounts.filter(acc => acc.balance !== 0);
  let totalDebit = 0;
  let totalCredit = 0;

  accounts.forEach(acc => {
    const accountType = accountTypes.find(type => type.id === acc.accountTypeId);
    if (accountType.normalSide === 'DEBIT') {
      totalDebit += acc.balance;
    } else {
      totalCredit += acc.balance;
    }
  });

  return `
    <div>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Trial Balance</h2>
          <p class="text-sm text-gray-600">As of ${new Date().toLocaleDateString()}</p>
        </div>
        <button onclick="exportReportPDF('trial-balance')" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="download" class="w-4 h-4 mr-2"></i>
          Export PDF
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account Code</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700">Account Name</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Debit</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">Credit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${accounts.map(acc => {
              const accountType = accountTypes.find(type => type.id === acc.accountTypeId);
              const isDebit = accountType.normalSide === 'DEBIT';
              return `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-mono text-gray-600">${acc.accountCode}</td>
                  <td class="px-4 py-3 text-sm text-gray-800">${acc.accountName}</td>
                  <td class="px-4 py-3 text-sm text-right ${isDebit ? 'font-semibold text-green-600' : 'text-gray-400'}">
                    ${isDebit ? 'Rs. ' + acc.balance.toLocaleString() : '-'}
                  </td>
                  <td class="px-4 py-3 text-sm text-right ${!isDebit ? 'font-semibold text-red-600' : 'text-gray-400'}">
                    ${!isDebit ? 'Rs. ' + acc.balance.toLocaleString() : '-'}
                  </td>
                </tr>
              `;
            }).join('')}
            <tr class="bg-gray-100 font-bold">
              <td colspan="2" class="px-4 py-3 text-sm text-right">TOTAL</td>
              <td class="px-4 py-3 text-sm text-right text-green-600">Rs. ${totalDebit.toLocaleString()}</td>
              <td class="px-4 py-3 text-sm text-right text-red-600">Rs. ${totalCredit.toLocaleString()}</td>
            </tr>
            <tr class="bg-blue-50">
              <td colspan="2" class="px-4 py-3 text-sm text-right font-semibold">DIFFERENCE</td>
              <td colspan="2" class="px-4 py-3 text-sm text-center font-bold ${totalDebit === totalCredit ? 'text-green-600' : 'text-red-600'}">
                ${totalDebit === totalCredit ? '✓ Balanced' : 'Rs. ' + Math.abs(totalDebit - totalCredit).toLocaleString() + ' Out of Balance'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Generate Balance Sheet Report
function generateBalanceSheetReport() {
  const assets = chartOfAccounts.filter(acc => acc.accountTypeId === 1);
  const liabilities = chartOfAccounts.filter(acc => acc.accountTypeId === 2);
  const equity = chartOfAccounts.filter(acc => acc.accountTypeId === 3);

  const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
  const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

  return `
    <div>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Balance Sheet</h2>
          <p class="text-sm text-gray-600">As of ${new Date().toLocaleDateString()}</p>
        </div>
        <button onclick="exportReportPDF('balance-sheet')" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="download" class="w-4 h-4 mr-2"></i>
          Export PDF
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Assets -->
        <div>
          <h3 class="text-lg font-bold text-blue-600 mb-4 pb-2 border-b-2 border-blue-600">ASSETS</h3>
          <div class="space-y-2">
            ${assets.map(acc => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${acc.balance.toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex justify-between py-3 border-t-2 border-blue-600 font-bold">
              <span class="text-blue-600">Total Assets</span>
              <span class="text-blue-600">Rs. ${totalAssets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Liabilities & Equity -->
        <div>
          <h3 class="text-lg font-bold text-red-600 mb-4 pb-2 border-b-2 border-red-600">LIABILITIES</h3>
          <div class="space-y-2 mb-6">
            ${liabilities.map(acc => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${acc.balance.toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex justify-between py-2 border-t font-semibold">
              <span class="text-gray-700">Total Liabilities</span>
              <span class="text-gray-800">Rs. ${totalLiabilities.toLocaleString()}</span>
            </div>
          </div>

          <h3 class="text-lg font-bold text-purple-600 mb-4 pb-2 border-b-2 border-purple-600">EQUITY</h3>
          <div class="space-y-2">
            ${equity.map(acc => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${acc.balance.toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex justify-between py-2 border-t font-semibold">
              <span class="text-gray-700">Total Equity</span>
              <span class="text-gray-800">Rs. ${totalEquity.toLocaleString()}</span>
            </div>
            <div class="flex justify-between py-3 border-t-2 border-purple-600 font-bold">
              <span class="text-purple-600">Total Liabilities & Equity</span>
              <span class="text-purple-600">Rs. ${(totalLiabilities + totalEquity).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Balance Check -->
      <div class="mt-6 p-4 rounded-lg ${totalAssets === (totalLiabilities + totalEquity) ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
        <p class="text-center font-bold ${totalAssets === (totalLiabilities + totalEquity) ? 'text-green-600' : 'text-red-600'}">
          ${totalAssets === (totalLiabilities + totalEquity) ? '✓ Balance Sheet is Balanced' : '⚠ Balance Sheet is Out of Balance'}
        </p>
      </div>
    </div>
  `;
}

// Generate Income Statement Report
function generateIncomeStatementReport() {
  const revenue = chartOfAccounts.filter(acc => acc.accountTypeId === 4);
  const expenses = chartOfAccounts.filter(acc => acc.accountTypeId === 5);

  const totalRevenue = revenue.reduce((sum, acc) => sum + acc.balance, 0);
  const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);
  const netIncome = totalRevenue - totalExpenses;

  return `
    <div>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Income Statement</h2>
          <p class="text-sm text-gray-600">For the period ending ${new Date().toLocaleDateString()}</p>
        </div>
        <button onclick="exportReportPDF('income-statement')" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
          <i data-feather="download" class="w-4 h-4 mr-2"></i>
          Export PDF
        </button>
      </div>

      <div class="space-y-6">
        <!-- Revenue Section -->
        <div>
          <h3 class="text-lg font-bold text-green-600 mb-4 pb-2 border-b-2 border-green-600">REVENUE</h3>
          <div class="space-y-2">
            ${revenue.map(acc => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${acc.balance.toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex justify-between py-3 border-t-2 border-green-600 font-bold">
              <span class="text-green-600">Total Revenue</span>
              <span class="text-green-600">Rs. ${totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Expenses Section -->
        <div>
          <h3 class="text-lg font-bold text-orange-600 mb-4 pb-2 border-b-2 border-orange-600">EXPENSES</h3>
          <div class="space-y-2">
            ${expenses.map(acc => `
              <div class="flex justify-between py-2">
                <span class="text-sm text-gray-700">${acc.accountName}</span>
                <span class="text-sm font-semibold text-gray-800">Rs. ${acc.balance.toLocaleString()}</span>
              </div>
            `).join('')}
            <div class="flex justify-between py-3 border-t-2 border-orange-600 font-bold">
              <span class="text-orange-600">Total Expenses</span>
              <span class="text-orange-600">Rs. ${totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <!-- Net Income -->
        <div class="p-6 rounded-lg ${netIncome >= 0 ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}">
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}">
              ${netIncome >= 0 ? 'NET PROFIT' : 'NET LOSS'}
            </span>
            <span class="text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}">
              Rs. ${Math.abs(netIncome).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Show specific report
function showReport(reportType) {
  const reportArea = document.getElementById('report-display-area');
  
  switch(reportType) {
    case 'trial-balance':
      reportArea.innerHTML = generateTrialBalanceReport();
      break;
    case 'general-ledger':
      reportArea.innerHTML = generateGeneralLedgerReport();
      break;
    case 'balance-sheet':
      reportArea.innerHTML = generateBalanceSheetReport();
      break;
    case 'income-statement':
      reportArea.innerHTML = generateIncomeStatementReport();
      break;
  }
  
  feather.replace();
}

// Generate General Ledger Report
function generateGeneralLedgerReport() {
  return `
    <div>
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">General Ledger</h2>
          <p class="text-sm text-gray-600">All account transactions</p>
        </div>
        <div class="flex items-center space-x-3">
          <select class="border border-gray-300 rounded px-3 py-2 text-sm" onchange="filterGeneralLedger(this.value)">
            <option value="">All Accounts</option>
            ${chartOfAccounts.map(acc => `
              <option value="${acc.id}">${acc.accountCode} - ${acc.accountName}</option>
            `).join('')}
          </select>
          <button onclick="exportReportPDF('general-ledger')" class="btn-secondary px-4 py-2 text-white rounded-lg flex items-center">
            <i data-feather="download" class="w-4 h-4 mr-2"></i>
            Export PDF
          </button>
        </div>
      </div>

      <div class="space-y-6">
        ${journalEntries.map(entry => `
          <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-center mb-3">
              <div>
                <span class="font-semibold text-blue-600">${entry.entryNumber}</span>
                <span class="text-sm text-gray-500 ml-3">${new Date(entry.entryDate).toLocaleDateString()}</span>
              </div>
              <span class="text-sm text-gray-600">${entry.description}</span>
            </div>
            <div class="space-y-2">
              ${entry.lines.map(line => `
                <div class="flex justify-between items-center py-2 px-3 ${line.debitAmount > 0 ? 'bg-green-50' : 'bg-red-50'} rounded">
                  <span class="text-sm font-medium">${line.accountName}</span>
                  <div class="flex items-center space-x-4">
                    <span class="text-sm ${line.debitAmount > 0 ? 'text-green-600 font-semibold' : 'text-gray-400'}">
                      ${line.debitAmount > 0 ? 'Rs. ' + line.debitAmount.toLocaleString() : '-'}
                    </span>
                    <span class="text-sm ${line.creditAmount > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}">
                      ${line.creditAmount > 0 ? 'Rs. ' + line.creditAmount.toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Export functions to global scope
window.generateTransactionMappingTab = generateTransactionMappingTab;
window.generateJournalEntriesTab = generateJournalEntriesTab;
window.generateReportsTab = generateReportsTab;
window.showReport = showReport;
