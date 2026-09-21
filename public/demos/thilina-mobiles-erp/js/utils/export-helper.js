// Shared PDF / XL export helpers — shop header, filters, consistent styling

const SHOP_DETAILS = {
  name: "Thilina Mobiles",
  address: "No. 75/5, Athurugiriya Rd, Rukamale, Pannipitiya",
  phone: "074 175 6567",
};

const EXPORT_PDF_THEME = {
  theme: "grid",
  headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 8 },
  styles: { fontSize: 8, cellPadding: 2.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 14, right: 14 },
};

function formatExportTimestamp(date = new Date()) {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeExportFilters(filters) {
  if (!filters) return [];
  if (Array.isArray(filters)) {
    return filters
      .map((f) => {
        if (!f) return null;
        if (typeof f === "string") return f.trim() || null;
        const label = String(f.label || f.key || "").trim();
        const value = String(f.value ?? "").trim();
        if (!value || value === "All" || value === "undefined") return null;
        return label ? `${label}: ${value}` : value;
      })
      .filter(Boolean);
  }
  if (typeof filters === "object") {
    return Object.entries(filters)
      .map(([key, value]) => {
        const v = String(value ?? "").trim();
        if (!v || v === "All" || v === "undefined") return null;
        return `${key}: ${v}`;
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * Draws shop block + title + timestamp + applied filters.
 * @returns {number} Y position for the next content (table start)
 */
function drawExportPdfHeader(doc, { title, filters, pageWidth } = {}) {
  const pw = pageWidth || doc.internal.pageSize.getWidth();
  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(SHOP_DETAILS.name, pw / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(SHOP_DETAILS.address, pw / 2, y, { align: "center" });
  y += 4;
  doc.text(`Tel: ${SHOP_DETAILS.phone}`, pw / 2, y, { align: "center" });
  y += 8;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, y, pw - 14, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(String(title || "Report"), 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${formatExportTimestamp()}`, 14, y);
  y += 7;

  const filterLines = normalizeExportFilters(filters);
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.text("Applied Filters:", 14, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  if (filterLines.length === 0) {
    doc.setTextColor(148, 163, 184);
    doc.text("None", 20, y);
    y += 6;
  } else {
    doc.setTextColor(71, 85, 105);
    filterLines.forEach((line) => {
      doc.text(`• ${line}`, 20, y);
      y += 4.5;
    });
    y += 3;
  }

  doc.setTextColor(0, 0, 0);
  return y;
}

function addExportPdfSummary(doc, text, startY) {
  const y = (startY != null ? startY : doc.lastAutoTable?.finalY || 40) + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(String(text), 14, y);
  return y;
}

function exportPdfWithTable({
  title,
  filters,
  head,
  body,
  fileName,
  summary,
  headStyles,
  columnStyles,
  emptyMessage,
}) {
  if (typeof window.jspdf === "undefined") {
    if (typeof showNotification === "function") {
      showNotification("PDF library not loaded.", "error");
    }
    return false;
  }

  if (!body || body.length === 0) {
    if (typeof showNotification === "function") {
      showNotification(emptyMessage || "No data available to export", "warning");
    }
    return false;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const startY = drawExportPdfHeader(doc, { title, filters });

  doc.autoTable({
    startY,
    head: [head],
    body,
    ...EXPORT_PDF_THEME,
    headStyles: headStyles
      ? { ...EXPORT_PDF_THEME.headStyles, ...headStyles }
      : EXPORT_PDF_THEME.headStyles,
    columnStyles: columnStyles || {},
  });

  if (summary) {
    addExportPdfSummary(doc, summary, doc.lastAutoTable.finalY);
  } else {
    addExportPdfSummary(
      doc,
      `Total records: ${body.length}`,
      doc.lastAutoTable.finalY
    );
  }

  const safeName =
    fileName ||
    `${String(title || "export")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
  return true;
}

function escapeCsvCell(value) {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds and downloads a CSV with shop / title / filter preamble.
 */
function buildExportCsv(headers, rows, { title, filters, fileName } = {}) {
  const filterLines = normalizeExportFilters(filters);
  const lines = [
    SHOP_DETAILS.name,
    SHOP_DETAILS.address,
    `Tel: ${SHOP_DETAILS.phone}`,
    "",
    String(title || "Export"),
    `Generated: ${formatExportTimestamp()}`,
    "",
    "Applied Filters:",
    ...(filterLines.length ? filterLines.map((l) => `  ${l}`) : ["  None"]),
    "",
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) =>
      (Array.isArray(row) ? row : headers.map((h) => row[h])).map(escapeCsvCell).join(",")
    ),
  ];

  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const base =
    fileName ||
    `${String(title || "export")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${new Date().toISOString().split("T")[0]}`;
  link.download = base.endsWith(".csv") ? base : `${base}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  return true;
}

function exportCsvWithTable({
  title,
  filters,
  headers,
  rows,
  fileName,
  emptyMessage,
}) {
  if (!rows || rows.length === 0) {
    if (typeof showNotification === "function") {
      showNotification(emptyMessage || "No data available to export", "warning");
    }
    return false;
  }
  return buildExportCsv(headers, rows, { title, filters, fileName });
}

/**
 * ExcelJS .xlsx export matching Products XL styling.
 * @returns {Promise<boolean>}
 */
async function exportXlsxWithTable({
  title,
  filters,
  headers,
  rows,
  sheetName,
  fileName,
  columnWidths,
  emptyMessage,
} = {}) {
  const ExcelLib = typeof window !== "undefined" ? window.ExcelJS : null;
  if (!ExcelLib) {
    if (typeof showNotification === "function") {
      showNotification(
        "Excel library not loaded. Restart the app after installing dependencies.",
        "error"
      );
    }
    return false;
  }

  const WorkbookCtor = ExcelLib.Workbook || ExcelLib?.default?.Workbook;
  if (!WorkbookCtor) {
    if (typeof showNotification === "function") {
      showNotification("Excel library failed to initialize", "error");
    }
    return false;
  }

  const dataRows = (rows || []).map((row) =>
    Array.isArray(row) ? row : headers.map((h) => row[h])
  );

  if (!dataRows.length) {
    if (typeof showNotification === "function") {
      showNotification(emptyMessage || "No data available to export", "warning");
    }
    return false;
  }

  const colCount = Math.max(headers.length, 1);
  const lastColLetter = (() => {
    let n = colCount;
    let s = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  })();

  const workbook = new WorkbookCtor();
  workbook.creator = "Thilina Mobiles ERP";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(String(sheetName || "Report").slice(0, 31), {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  const shopName = SHOP_DETAILS.name || "Thilina Mobiles";
  const shopAddress = SHOP_DETAILS.address || "";
  const shopPhone = SHOP_DETAILS.phone || "";

  sheet.mergeCells(`A1:${lastColLetter}1`);
  sheet.getCell("A1").value = shopName;
  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FF1E3A5F" },
  };

  sheet.mergeCells(`A2:${lastColLetter}2`);
  sheet.getCell("A2").value = shopAddress;
  sheet.getCell("A2").font = { size: 10, color: { argb: "FF4B5563" } };

  sheet.mergeCells(`A3:${lastColLetter}3`);
  sheet.getCell("A3").value = shopPhone ? `Tel: ${shopPhone}` : "";
  sheet.getCell("A3").font = { size: 10, color: { argb: "FF4B5563" } };

  sheet.mergeCells(`A5:${lastColLetter}5`);
  sheet.getCell("A5").value = String(title || "Report");
  sheet.getCell("A5").font = { bold: true, size: 14 };

  sheet.mergeCells(`A6:${lastColLetter}6`);
  sheet.getCell("A6").value = `Generated: ${formatExportTimestamp()}`;
  sheet.getCell("A6").font = {
    size: 9,
    italic: true,
    color: { argb: "FF6B7280" },
  };

  const filterLines = normalizeExportFilters(filters);
  const filterText = filterLines.length ? filterLines.join(" | ") : "None";
  sheet.mergeCells(`A7:${lastColLetter}7`);
  sheet.getCell("A7").value = `Applied Filters: ${filterText}`;
  sheet.getCell("A7").font = { size: 9, color: { argb: "FF6B7280" } };

  const headerRow = sheet.getRow(9);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  headerRow.height = 20;

  dataRows.forEach((row, idx) => {
    const excelRow = sheet.getRow(10 + idx);
    row.forEach((val, i) => {
      const cell = excelRow.getCell(i + 1);
      cell.value = val == null ? "" : val;
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      if (idx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  if (Array.isArray(columnWidths) && columnWidths.length) {
    sheet.columns = columnWidths.map((w) =>
      typeof w === "number" ? { width: w } : w
    );
  } else {
    sheet.columns = headers.map(() => ({ width: 16 }));
  }

  const lastDataRow = 9 + dataRows.length;
  sheet.autoFilter = {
    from: { row: 9, column: 1 },
    to: { row: lastDataRow, column: colCount },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const base =
    fileName ||
    `${String(title || "export")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${new Date().toISOString().split("T")[0]}`;
  const downloadName = base.endsWith(".xlsx") ? base : `${base}.xlsx`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  return true;
}

if (typeof window !== "undefined") {
  window.SHOP_DETAILS = SHOP_DETAILS;
  window.EXPORT_PDF_THEME = EXPORT_PDF_THEME;
  window.drawExportPdfHeader = drawExportPdfHeader;
  window.addExportPdfSummary = addExportPdfSummary;
  window.exportPdfWithTable = exportPdfWithTable;
  window.buildExportCsv = buildExportCsv;
  window.exportCsvWithTable = exportCsvWithTable;
  window.exportXlsxWithTable = exportXlsxWithTable;
  window.formatExportTimestamp = formatExportTimestamp;
  window.normalizeExportFilters = normalizeExportFilters;
}
