// Accounts Module - Part 5: PDF Export Functionality
// Fetches real data from API for exports

async function exportReportPDF(reportType) {
  if (typeof window.jspdf === "undefined") {
    showNotification(
      "PDF library not loaded. Please refresh the page.",
      "error"
    );
    return;
  }

  const { jsPDF } = window.jspdf;

  try {
    showNotification("Generating PDF...", "info");

    // Fetch fresh data from API
    let data;
    const query = getReportFilterQuery();
    switch (reportType) {
      case "trial-balance":
        data = await accountsRequest(`/accounts/reports/trial-balance${query}`);
        break;
      case "balance-sheet":
        data = await accountsRequest(`/accounts/reports/balance-sheet${query}`);
        break;
      case "income-statement":
        data = await accountsRequest(
          `/accounts/reports/income-statement${query}`
        );
        break;
      case "general-ledger":
        data = await accountsRequest(
          `/accounts/reports/general-ledger${query}`
        );
        break;
      case "cashflow":
        data = await accountsRequest(`/accounts/reports/cashflow${query}`);
        break;
      case "aging":
      case "bank-reconciliation":
        if (typeof window.exportExtendedReportPDF === "function") {
          return window.exportExtendedReportPDF(reportType);
        }
        break;
      default:
        showNotification("Unknown report type", "error");
        return;
    }

    const doc = new jsPDF();

    const reportTitles = {
      "trial-balance": "Trial Balance",
      "balance-sheet": "Balance Sheet",
      "income-statement": "Income Statement",
      "general-ledger": "General Ledger",
      cashflow: "Cashflow",
    };

    const reportFilters = [];
    const filterFrom = document.getElementById("report-filter-from")?.value;
    const filterTo = document.getElementById("report-filter-to")?.value;
    if (filterFrom) reportFilters.push({ label: "From", value: filterFrom });
    if (filterTo) reportFilters.push({ label: "To", value: filterTo });

    const startY = drawExportPdfHeader(doc, {
      title: reportTitles[reportType] || "Financial Report",
      filters: reportFilters,
    });

    switch (reportType) {
      case "trial-balance":
        generateTrialBalancePDF(doc, startY, data);
        break;
      case "balance-sheet":
        generateBalanceSheetPDF(doc, startY, data);
        break;
      case "income-statement":
        generateIncomeStatementPDF(doc, startY, data);
        break;
      case "general-ledger":
        generateGeneralLedgerPDF(doc, startY, data);
        break;
      case "cashflow":
        generateCashflowPDF(doc, startY, data);
        break;
    }

    doc.save(`${reportType}-${new Date().toISOString().split("T")[0]}.pdf`);
    showNotification("Report exported successfully!", "success");
  } catch (err) {
    showNotification("Failed to export PDF: " + err.message, "error");
  }
}

function getReportFilterQuery() {
  const from = document.getElementById("report-filter-from")?.value || "";
  const to = document.getElementById("report-filter-to")?.value || "";
  const params = new URLSearchParams();
  if (from) params.append("dateFrom", from);
  if (to) params.append("dateTo", to);
  return params.toString() ? `?${params.toString()}` : "";
}

function generateTrialBalancePDF(doc, startY, data) {
  const { accounts, totalDebit, totalCredit, isBalanced } = data;

  const tableData = accounts.map((acc) => [
    acc.accountCode,
    acc.accountName,
    acc.typeName || "",
    acc.debit > 0 ? `Rs. ${Number(acc.debit).toLocaleString()}` : "-",
    acc.credit > 0 ? `Rs. ${Number(acc.credit).toLocaleString()}` : "-",
  ]);

  tableData.push([
    "",
    "TOTAL",
    "",
    `Rs. ${Number(totalDebit).toLocaleString()}`,
    `Rs. ${Number(totalCredit).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY,
    head: [["Account Code", "Account Name", "Type", "Debit", "Credit"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  if (isBalanced) {
    doc.setTextColor(0, 128, 0);
    doc.text(
      "[OK] Trial Balance is balanced",
      105,
      finalY,
      { align: "center" }
    );
  } else {
    doc.setTextColor(255, 0, 0);
    doc.text(
      `[!] Out of balance by Rs. ${Math.abs(
        Number(totalDebit) - Number(totalCredit)
      ).toLocaleString()}`,
      105,
      finalY,
      { align: "center" }
    );
  }
}

function generateBalanceSheetPDF(doc, startY, data) {
  const {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
  } = data;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("ASSETS", 14, startY);

  const assetsData = assets.map((acc) => [
    acc.accountName,
    `Rs. ${Number(acc.balance).toLocaleString()}`,
  ]);
  assetsData.push([
    "Total Assets",
    `Rs. ${Number(totalAssets).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: startY + 5,
    body: assetsData,
    theme: "plain",
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  const liabStartY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("LIABILITIES", 14, liabStartY);

  const liabData = liabilities.map((acc) => [
    acc.accountName,
    `Rs. ${Number(acc.balance).toLocaleString()}`,
  ]);
  liabData.push([
    "Total Liabilities",
    `Rs. ${Number(totalLiabilities).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: liabStartY + 5,
    body: liabData,
    theme: "plain",
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  const equityStartY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("EQUITY", 14, equityStartY);

  const equityData = equity.map((acc) => [
    acc.accountName,
    `Rs. ${Number(acc.balance).toLocaleString()}`,
  ]);
  equityData.push([
    "Total Equity",
    `Rs. ${Number(totalEquity).toLocaleString()}`,
  ]);
  equityData.push([
    "Total Liabilities & Equity",
    `Rs. ${Number(totalLiabilities + totalEquity).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: equityStartY + 5,
    body: equityData,
    theme: "plain",
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });
}

function generateIncomeStatementPDF(doc, startY, data) {
  const { revenue, expenses, totalRevenue, totalExpenses, netIncome } = data;

  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("REVENUE", 14, startY);

  const revenueData = revenue.map((acc) => [
    acc.accountName,
    `Rs. ${Number(acc.balance).toLocaleString()}`,
  ]);
  revenueData.push([
    "Total Revenue",
    `Rs. ${Number(totalRevenue).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: startY + 5,
    body: revenueData,
    theme: "plain",
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  const expStartY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("EXPENSES", 14, expStartY);

  const expensesData = expenses.map((acc) => [
    acc.accountName,
    `Rs. ${Number(acc.balance).toLocaleString()}`,
  ]);
  expensesData.push([
    "Total Expenses",
    `Rs. ${Number(totalExpenses).toLocaleString()}`,
  ]);

  doc.autoTable({
    startY: expStartY + 5,
    body: expensesData,
    theme: "plain",
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  const netY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  if (netIncome >= 0) {
    doc.setTextColor(0, 128, 0);
    doc.text(
      `NET PROFIT: Rs. ${Number(netIncome).toLocaleString()}`,
      105,
      netY,
      { align: "center" }
    );
  } else {
    doc.setTextColor(255, 0, 0);
    doc.text(
      `NET LOSS: Rs. ${Math.abs(Number(netIncome)).toLocaleString()}`,
      105,
      netY,
      { align: "center" }
    );
  }
}

function generateGeneralLedgerPDF(doc, startY, data) {
  const { entries } = data;
  const tableData = [];

  // Helper: flatten lines from {debitAccountName, creditAccountName, debitAmount, creditAmount}
  // into display rows [{accountName, debitAmount, creditAmount}]
  function flattenLines(lines) {
    const result = [];
    (lines || []).forEach((line) => {
      if ((line.debitAmount || 0) > 0 && line.debitAccountName) {
        result.push({
          accountName: line.debitAccountName,
          debitAmount: line.debitAmount,
          creditAmount: 0,
        });
      }
      if ((line.creditAmount || 0) > 0 && line.creditAccountName) {
        result.push({
          accountName: line.creditAccountName,
          debitAmount: 0,
          creditAmount: line.creditAmount,
        });
      }
    });
    return result;
  }

  (entries || []).forEach((entry) => {
    tableData.push([
      {
        content: `${entry.entryNumber} - ${new Date(
          entry.entryDate
        ).toLocaleDateString()}`,
        colSpan: 3,
        styles: { fontStyle: "bold", fillColor: [240, 240, 240] },
      },
    ]);
    tableData.push([
      {
        content: entry.description || "",
        colSpan: 3,
        styles: { fontStyle: "italic" },
      },
    ]);

    flattenLines(entry.lines).forEach((line) => {
      tableData.push([
        line.accountName || "",
        line.debitAmount > 0
          ? `Rs. ${Number(line.debitAmount).toLocaleString()}`
          : "-",
        line.creditAmount > 0
          ? `Rs. ${Number(line.creditAmount).toLocaleString()}`
          : "-",
      ]);
    });

    tableData.push([{ content: "", colSpan: 3, styles: { minCellHeight: 5 } }]);
  });

  if (tableData.length === 0) {
    tableData.push([
      {
        content: "No journal entries found",
        colSpan: 3,
        styles: { halign: "center" },
      },
    ]);
  }

  doc.autoTable({
    startY,
    head: [["Account", "Debit", "Credit"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
}

function generateCashflowPDF(doc, startY, data) {
  const {
    byReferenceType = [],
    netCashMovement = 0,
    cashAccounts = [],
    period = {},
    note = "",
  } = data || {};

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  let cursorY = startY;
  if (note) {
    const chunks = doc.splitTextToSize(String(note), 180);
    doc.text(chunks, 14, cursorY);
    cursorY += 5 + chunks.length * 4;
  }

  const periodLine = `Period: ${period.dateFrom || "—"} to ${
    period.dateTo || "—"
  }`;
  doc.text(periodLine, 14, cursorY);
  cursorY += 8;

  if (cashAccounts && cashAccounts.length) {
    doc.setFontSize(8);
    const accLabel = cashAccounts
      .map((c) => `${c.accountCode || ""} ${c.accountName || ""}`.trim())
      .slice(0, 8)
      .join(" | ");
    const accChunks = doc.splitTextToSize("Accounts: " + accLabel, 180);
    doc.text(accChunks, 14, cursorY);
    cursorY += 4 + accChunks.length * 3.5;
    doc.setFontSize(10);
    cursorY += 4;
  }

  const body = (byReferenceType || []).map((r) => [
    String(r.referenceType || ""),
    `Rs. ${Number(r.amount).toLocaleString()}`,
  ]);
  body.push(["Net movement (cash)", `Rs. ${Number(netCashMovement).toLocaleString()}`]);

  doc.autoTable({
    startY: cursorY + 4,
    head: [["Reference type", "Impact on cash"]],
    body: body.length ? body : [["—", "No movements"]],
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: "bold",
    },
    columnStyles: { 1: { halign: "right" } },
  });
}

function escapeCsvCell(v) {
  if (v === null || v === undefined) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const text =
    "\ufeff" +
    rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob([text], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function getReportExportFilters() {
  const filters = [];
  const filterFrom = document.getElementById("report-filter-from")?.value;
  const filterTo = document.getElementById("report-filter-to")?.value;
  if (filterFrom) filters.push({ label: "From", value: filterFrom });
  if (filterTo) filters.push({ label: "To", value: filterTo });
  return filters;
}

function buildReportXlsxExport(reportType, data) {
  switch (reportType) {
    case "trial-balance": {
      const { accounts = [], totalDebit, totalCredit, isBalanced } = data;
      const headers = [
        "Account Code",
        "Account Name",
        "Type",
        "Debit",
        "Credit",
      ];
      const rows = accounts.map((acc) => [
        acc.accountCode,
        acc.accountName,
        acc.typeName || "",
        Number(acc.debit || 0).toFixed(2),
        Number(acc.credit || 0).toFixed(2),
      ]);
      rows.push(["", "", "TOTAL", totalDebit, totalCredit]);
      rows.push([
        "",
        "",
        "Status",
        isBalanced ? "Balanced" : "Out of balance",
        "",
      ]);
      return {
        title: "Trial Balance",
        headers,
        rows,
        sheetName: "Trial Balance",
      };
    }
    case "balance-sheet": {
      const {
        assets = [],
        liabilities = [],
        equity = [],
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced,
      } = data;
      const headers = ["Item", "Amount"];
      const rows = [["ASSETS", ""]];
      assets.forEach((a) =>
        rows.push([a.accountName, Number(a.balance).toFixed(2)])
      );
      rows.push(["Total Assets", Number(totalAssets).toFixed(2)]);
      rows.push([]);
      rows.push(["LIABILITIES", ""]);
      liabilities.forEach((a) =>
        rows.push([a.accountName, Number(a.balance).toFixed(2)])
      );
      rows.push(["Total Liabilities", Number(totalLiabilities).toFixed(2)]);
      rows.push([]);
      rows.push(["EQUITY", ""]);
      equity.forEach((a) =>
        rows.push([a.accountName, Number(a.balance).toFixed(2)])
      );
      rows.push(["Total Equity", Number(totalEquity).toFixed(2)]);
      rows.push([
        "Total Liab. + Equity",
        Number(totalLiabilities + totalEquity).toFixed(2),
      ]);
      rows.push(["Balanced?", isBalanced ? "Yes" : "No"]);
      return {
        title: "Balance Sheet",
        headers,
        rows,
        sheetName: "Balance Sheet",
      };
    }
    case "income-statement": {
      const { revenue = [], expenses = [], totalRevenue, totalExpenses, netIncome } =
        data;
      const headers = ["Item", "Amount"];
      const rows = [["REVENUE", ""]];
      revenue.forEach((acc) =>
        rows.push([acc.accountName, Number(acc.balance).toFixed(2)])
      );
      rows.push(["Total Revenue", Number(totalRevenue).toFixed(2)]);
      rows.push([]);
      rows.push(["EXPENSES", ""]);
      expenses.forEach((acc) =>
        rows.push([acc.accountName, Number(acc.balance).toFixed(2)])
      );
      rows.push(["Total Expenses", Number(totalExpenses).toFixed(2)]);
      rows.push([]);
      rows.push(["Net Income", Number(netIncome).toFixed(2)]);
      return {
        title: "Income Statement",
        headers,
        rows,
        sheetName: "Income Statement",
      };
    }
    case "general-ledger": {
      function flattenLines(lines) {
        const result = [];
        (lines || []).forEach((line) => {
          if ((line.debitAmount || 0) > 0 && line.debitAccountName) {
            result.push({
              accountName: line.debitAccountName,
              debit: Number(line.debitAmount || 0).toFixed(2),
              credit: "",
            });
          }
          if ((line.creditAmount || 0) > 0 && line.creditAccountName) {
            result.push({
              accountName: line.creditAccountName,
              debit: "",
              credit: Number(line.creditAmount || 0).toFixed(2),
            });
          }
        });
        return result;
      }
      const headers = [
        "Entry #",
        "Date",
        "Description",
        "Account",
        "Debit",
        "Credit",
      ];
      const rows = [];
      const { entries } = data;
      (entries || []).forEach((entry) => {
        rows.push([
          entry.entryNumber,
          new Date(entry.entryDate).toLocaleDateString(),
          entry.description || "",
          "",
          "",
          "",
        ]);
        flattenLines(entry.lines).forEach((r) =>
          rows.push(["", "", "", r.accountName, r.debit, r.credit])
        );
      });
      return {
        title: "General Ledger",
        headers,
        rows,
        sheetName: "General Ledger",
      };
    }
    case "cashflow": {
      const {
        byReferenceType = [],
        netCashMovement = 0,
        cashAccounts = [],
        period = {},
        note = "",
      } = data || {};
      const headers = ["Item", "Value"];
      const rows = [];
      if (note) rows.push(["Note", note]);
      rows.push(["Date From", period.dateFrom || ""]);
      rows.push(["Date To", period.dateTo || ""]);
      rows.push([]);
      rows.push(["Cash / bank accounts", ""]);
      (cashAccounts || []).forEach((c) =>
        rows.push([
          `${c.accountCode || ""} — ${c.accountName || ""}`.trim(),
          "",
        ])
      );
      rows.push([]);
      rows.push(["Reference type", "Amount (Rs.)"]);
      byReferenceType.forEach((r) =>
        rows.push([r.referenceType || "", Number(r.amount).toFixed(2)])
      );
      rows.push(["Net movement", Number(netCashMovement).toFixed(2)]);
      return {
        title: "Cashflow (approximate)",
        headers,
        rows,
        sheetName: "Cashflow",
      };
    }
    default:
      return null;
  }
}

async function exportReportXL(reportType) {
  const dateStr = new Date().toISOString().split("T")[0];

  try {
    showNotification("Preparing spreadsheet export...", "info");
    const query = getReportFilterQuery();
    let data;
    switch (reportType) {
      case "trial-balance":
        data = await accountsRequest(`/accounts/reports/trial-balance${query}`);
        break;
      case "balance-sheet":
        data = await accountsRequest(`/accounts/reports/balance-sheet${query}`);
        break;
      case "income-statement":
        data = await accountsRequest(
          `/accounts/reports/income-statement${query}`
        );
        break;
      case "general-ledger":
        data = await accountsRequest(
          `/accounts/reports/general-ledger${query}`
        );
        break;
      case "cashflow":
        data = await accountsRequest(`/accounts/reports/cashflow${query}`);
        break;
      case "aging":
      case "bank-reconciliation":
        if (typeof window.exportExtendedReportXL === "function") {
          return window.exportExtendedReportXL(reportType);
        }
        break;
      default:
        showNotification("Unknown report type", "error");
        return;
    }

    const exportConfig = buildReportXlsxExport(reportType, data);
    if (!exportConfig) {
      showNotification("Unknown report type", "error");
      return;
    }

    const ok = await exportXlsxWithTable({
      title: exportConfig.title,
      filters: getReportExportFilters(),
      headers: exportConfig.headers,
      rows: exportConfig.rows,
      sheetName: exportConfig.sheetName,
      fileName: `${reportType}-${dateStr}.xlsx`,
      emptyMessage: "No report data available to export",
    });
    if (ok) showNotification("Export ready.", "success");
  } catch (err) {
    showNotification("Failed to export: " + err.message, "error");
  }
}

// Export functions to global scope
window.exportReportPDF = exportReportPDF;
window.exportReportXL = exportReportXL;
