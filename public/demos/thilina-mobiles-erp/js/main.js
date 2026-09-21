// Main ERP System Controller - Navigation and Module Coordination
let currentPage = "dashboard";

const ROLE_PAGE_PERMISSIONS = {
  admin: ["all"],
  administrator: ["all"],
  manager: [
    "dashboard",
    "products",
    "inventory",
    "purchase",
    "employee",
    "customer",
    "supplier",
    "repair",
    "pos",
    "accounts",
    "bills",
  ],
  accountant: ["inventory", "purchase", "supplier", "accounts", "bills"],
  cashier: ["pos"],
};

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

function hasPageAccess(pageName) {
  const role = getCurrentUserRole();
  const allowed = ROLE_PAGE_PERMISSIONS[role] || [];
  return allowed.includes("all") || allowed.includes(pageName);
}

function getPreferredLandingPage() {
  const role = getCurrentUserRole();
  const allowed = ROLE_PAGE_PERMISSIONS[role] || [];

  if (allowed.includes("all")) return "dashboard";
  if (allowed.includes("dashboard")) return "dashboard";
  return allowed[0] || "dashboard";
}

function applyRoleBasedNavigation() {
  const navLinks = Array.from(document.querySelectorAll("#sidebar nav a"));

  navLinks.forEach((link) => {
    const onclickValue = link.getAttribute("onclick") || "";
    const match = onclickValue.match(/loadPage\('([^']+)'\)/);
    const href = String(link.getAttribute("href") || "").toLowerCase();

    if (match && match[1]) {
      const page = match[1];
      // Settings section is hidden completely for all roles
      const canAccess = page === "settings" ? false : hasPageAccess(page);
      link.classList.toggle("hidden", !canAccess);
      const li = link.closest("li");
      if (li) li.classList.toggle("hidden", !canAccess);
    } else if (href.includes("pos.html")) {
      const canAccessPos = hasPageAccess("pos");
      link.classList.toggle("hidden", !canAccessPos);
      const li = link.closest("li");
      if (li) li.classList.toggle("hidden", !canAccessPos);
    }
  });
}

// Navigation System
function loadPage(pageName) {
  // Settings section is hidden/disabled for now
  if (pageName === "settings") {
    return;
  }

  if (!hasPageAccess(pageName)) {
    if (typeof showNotification === "function") {
      showNotification(
        "You do not have permission to access this section",
        "error"
      );
    }
    return;
  }

  // Update sidebar active state
  document.querySelectorAll(".sidebar-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Find and activate the correct sidebar item
  const targetItem = document.querySelector(
    `[onclick="loadPage('${pageName}')"]`
  );
  if (targetItem) {
    targetItem.closest(".sidebar-item").classList.add("active");
  }

  // Update page titles
  updatePageTitle(pageName);
  currentPage = pageName;

  // Show loading
  showLoading();

  // Load page content with delay for smooth transition
  setTimeout(() => {
    hideLoading();
    loadPageContent(pageName);
  }, 500);
}

// Update page title and subtitle
function updatePageTitle(pageName) {
  const titles = {
    dashboard: {
      title: "Dashboard",
      subtitle: "Welcome to Thilina Mobiles ERP System",
    },
    inventory: {
      title: "Inventory",
      subtitle: "Track stock levels, batch pricing, and inventory movements",
    },
    products: {
      title: "Products",
      subtitle: "Manage product catalog, categories, and brands",
    },
    purchase: {
      title: "GRN",
      subtitle: "Manage incoming goods receipt and verification",
    },
    users: {
      title: "User Management",
      subtitle: "Manage system users and permissions",
    },
    employee: {
      title: "Employee Management",
      subtitle: "Manage staff information and payroll",
    },
    customer: {
      title: "Customer Management",
      subtitle: "Manage customer database and history",
    },
    supplier: {
      title: "Company Sales REP",
      subtitle: "Manage Sales REP information and contracts",
    },
    repair: {
      title: "Repair Management",
      subtitle: "Track device repairs and service orders",
    },
    accounts: {
      title: "Accounts",
      subtitle: "Chartered accountant ledger system and financial reports",
    },
    bills: {
      title: "Bills & Utilities",
      subtitle: "Manage billers, received utility/vendor bills, and accounts payable settlements",
    },
    settings: {
      title: "System Settings",
      subtitle: "Configure system preferences and security",
    },
  };

  document.getElementById("page-title").textContent = titles[pageName].title;
  document.getElementById("page-subtitle").textContent =
    titles[pageName].subtitle;
}

// Load specific page content
function loadPageContent(pageName) {
  const dashboardContent = document.getElementById("dashboard-content");
  const dynamicContent = document.getElementById("dynamic-content");

  // Check if elements exist
  if (!dashboardContent || !dynamicContent) {
    console.error("Required DOM elements not found:", {
      dashboardContent,
      dynamicContent,
    });
    return;
  }

  if (pageName === "dashboard") {
    dashboardContent.classList.remove("hidden");
    dynamicContent.classList.add("hidden");

    if (typeof initializeDashboardModule === "function") {
      initializeDashboardModule();
    }
    feather.replace();
  } else if (pageName === "inventory") {
    dashboardContent.classList.add("hidden");
    dynamicContent.classList.remove("hidden");

    if (typeof generateInventoryStockContent === "function") {
      dynamicContent.innerHTML = generateInventoryStockContent();
    }

    setTimeout(() => {
      if (typeof initializeInventoryStockPage === "function") {
        initializeInventoryStockPage();
      }
      feather.replace();
    }, 100);
  } else if (pageName === "purchase") {
    dashboardContent.classList.add("hidden");
    dynamicContent.classList.remove("hidden");

    if (typeof initializeGRNModule === "function") {
      initializeGRNModule();
    }

    if (typeof generateGRNContent === "function") {
      dynamicContent.innerHTML = generateGRNContent();
    }

    setTimeout(() => {
      if (typeof initializeGRNPage === "function") {
        initializeGRNPage();
      }
      feather.replace();
    }, 100);
  } else {
    dashboardContent.classList.add("hidden");
    dynamicContent.classList.remove("hidden");

    // Handle other pages with their respective modules
    let content = "";
    let initFunction = null;

    switch (pageName) {
      case "products":
        if (typeof generateProductsContent === "function") {
          content = generateProductsContent();
          initFunction = initializeProductsPage;
        }
        break;
      case "inventory":
        if (typeof generateInventoryStockContent === "function") {
          content = generateInventoryStockContent();
          initFunction = initializeInventoryStockPage;
        }
        break;
      case "purchase":
        if (typeof generateGRNContent === "function") {
          content = generateGRNContent();
          initFunction = initializeGRNPage;
        }
        break;
      case "users":
        if (typeof generateUsersContent === "function") {
          content = generateUsersContent();
          initFunction = initializeUsersPage;
        }
        break;
      case "employee":
        if (typeof generateEmployeesContent === "function") {
          content = generateEmployeesContent();
          initFunction = initializeEmployeesPage;
        }
        break;
      case "customer":
        if (typeof initializeCustomersModule === "function") {
          initializeCustomersModule();
          return; // Early return since initializeCustomersModule handles everything
        }
        break;
      case "supplier":
        if (typeof initializeSuppliersModule === "function") {
          initializeSuppliersModule();
          return; // Supplier module handles its own render and init
        }
        break;
      case "repair":
        if (typeof generateRepairsContent === "function") {
          content = generateRepairsContent();
          initFunction = initializeRepairsPage;
        }
        break;
      case "accounts":
        if (typeof initializeAccountsModule === "function") {
          initializeAccountsModule();
          return; // Accounts module handles its own render and init
        }
        break;
      case "bills":
        if (typeof initializeBillsModule === "function") {
          initializeBillsModule();
          return; // Bills module handles its own render and init
        }
        break;
      case "settings":
        if (typeof generateSettingsContent === "function") {
          content = generateSettingsContent();
          initFunction = initializeSettingsPage;
        }
        break;
      default:
        content = generatePageContent(pageName);
    }

    if (dynamicContent) {
      dynamicContent.innerHTML = content;

      // Initialize page-specific functionality
      if (initFunction && typeof initFunction === "function") {
        setTimeout(() => {
          initFunction();
          feather.replace();
        }, 100);
      } else {
        feather.replace();
      }
    }
  }
}

// Generate content for pages not yet modularized
function generatePageContent(pageName) {
  const comingSoonTemplate = `
    <div class="content-fade-in p-6">
      <div class="text-center py-20">
        <div class="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
          <i data-feather="construction" class="w-12 h-12 text-gray-400"></i>
        </div>
        <h2 class="text-2xl font-bold text-gray-600 mb-2">${
          pageName.charAt(0).toUpperCase() + pageName.slice(1)
        } Section</h2>
        <p class="text-gray-500 mb-4">This section is coming soon</p>
        <p class="text-sm text-gray-400">Will be implemented using the established modular architecture</p>
      </div>
    </div>
  `;

  switch (pageName) {
    case "repair":
      if (typeof initializeRepairsModule === "function") {
        initializeRepairsModule();
        return;
      }
      break;
    case "users":
    case "employee":
    case "settings":
      return comingSoonTemplate;
    default:
      return comingSoonTemplate;
  }
}

function printHtmlContent(htmlContent) {
  let iframe = document.getElementById("erp-print-iframe");
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "erp-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  }, 250);
}

window.printHtmlContent = printHtmlContent;

function notifyExportStatus(message, type = "info") {
  if (typeof showNotification === "function") {
    showNotification(message, type);
  } else {
    console[type === "error" ? "error" : "log"](message);
  }
}

function toKebabCase(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function deriveXLFileName(pdfFunctionName, args = []) {
  const firstArg = args && args.length > 0 ? args[0] : "";
  if (typeof firstArg === "string" && firstArg.trim()) {
    return `${toKebabCase(firstArg)}-report`;
  }

  const cleaned = String(pdfFunctionName || "")
    .replace(/PDF$/i, "")
    .replace(/^(download|export|generate)/i, "")
    .trim();

  return `${toKebabCase(cleaned || "export")}-report`;
}

function findBestExportTable(sourceElement) {
  const hasRows = (table) =>
    table && table.querySelector("tbody tr, tr") && table.offsetParent !== null;

  const scopedContainer = sourceElement
    ? sourceElement.closest(
        ".bg-white, .tab-content, .content-fade-in, .modal-content, .report-card, section, .card"
      )
    : null;

  if (scopedContainer) {
    const scopedTable = scopedContainer.querySelector("table");
    if (hasRows(scopedTable)) return scopedTable;
  }

  const visibleTables = Array.from(document.querySelectorAll("table")).filter(
    hasRows
  );
  return visibleTables[0] || null;
}

function buildTableFromText(sourceElement) {
  const container = sourceElement
    ? sourceElement.closest(
        ".bg-white, .modal-content, .content-fade-in, section"
      )
    : null;
  if (!container) return null;

  const textLines = (container.innerText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 300);

  if (!textLines.length) return null;

  const tempTable = document.createElement("table");
  const tbody = document.createElement("tbody");

  textLines.forEach((line) => {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.textContent = line;
    tr.appendChild(td);
    tbody.appendChild(tr);
  });

  tempTable.appendChild(tbody);
  return tempTable;
}

function exportTableAsXL(table, fileNameBase) {
  const datePart = new Date().toISOString().split("T")[0];
  const fileName = `${fileNameBase || "report"}-${datePart}.xls`;

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8" />
      </head>
      <body>
        ${table.outerHTML}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function runAutoXLExport(pdfFunctionName, args = [], sourceElement = null) {
  const targetElement = sourceElement || document.activeElement || null;
  const table =
    findBestExportTable(targetElement) || buildTableFromText(targetElement);

  if (!table) {
    notifyExportStatus("No exportable data found for XL download", "error");
    return;
  }

  const fileNameBase = deriveXLFileName(pdfFunctionName, args);
  exportTableAsXL(table, fileNameBase);
  notifyExportStatus("XL export downloaded", "success");
}

function registerXLHandlersForPDFFunctions() {
  Object.keys(window).forEach((key) => {
    if (typeof window[key] !== "function") return;
    if (!/(download|export|generate).+PDF$/i.test(key)) return;

    const xlName = key.replace(/PDF$/i, "XL");
    if (typeof window[xlName] === "function") return;

    window[xlName] = function (...args) {
      runAutoXLExport(key, args, document.activeElement || null);
    };
  });
}

function buttonAlreadyHasXLAlternative(button) {
  const parent = button.parentElement;
  if (!parent) return false;

  const siblingButtons = Array.from(parent.querySelectorAll("button"));
  return siblingButtons.some((btn) => {
    if (btn === button) return false;
    const text = (btn.textContent || "").toLowerCase();
    return text.includes("excel") || text.includes(" xl") || text === "xl";
  });
}

function injectXLButtonsForPDFExports(root = document) {
  const pdfButtons = root.querySelectorAll("button[onclick*='PDF(']");

  pdfButtons.forEach((pdfButton) => {
    if (buttonAlreadyHasXLAlternative(pdfButton)) return;

    const onClickCode = pdfButton.getAttribute("onclick") || "";
    const xlOnClickCode = onClickCode.replace(/PDF\s*\(/g, "XL(");
    if (xlOnClickCode === onClickCode) return;

    const existingXL = pdfButton.parentElement?.querySelector(
      `button[onclick="${xlOnClickCode}"]`
    );
    if (existingXL) return;

    const xlButton = pdfButton.cloneNode(true);
    xlButton.setAttribute("onclick", xlOnClickCode);
    xlButton.innerHTML = xlButton.innerHTML
      .replace(/PDF/gi, "XL")
      .replace(/Download\s+XL/gi, "Download XL")
      .replace(/Export\s+XL/gi, "Export XL");

    if (/PDF/i.test((pdfButton.textContent || "").trim())) {
      const textContent = (xlButton.textContent || "").trim();
      if (!/XL/i.test(textContent)) {
        xlButton.innerHTML = `${xlButton.innerHTML} XL`;
      }
    }

    pdfButton.insertAdjacentElement("afterend", xlButton);
  });
}

function initializeAutoXLExports() {
  registerXLHandlersForPDFFunctions();
  injectXLButtonsForPDFExports(document);

  const observer = new MutationObserver(() => {
    registerXLHandlersForPDFFunctions();
    injectXLButtonsForPDFExports(document);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function initializeERP() {
  if (document.readyState === "loading") {
    return;
  }

  applyRoleBasedNavigation();

  const role = getCurrentUserRole();
  if (role === "cashier") {
    window.location.href = "pos.html";
    return;
  }

  if (typeof initializeDashboardModule === "function") {
    initializeDashboardModule();
  }

  if (typeof initializeInventoryModule === "function") {
    initializeInventoryModule();
  }

  // Load initial page based on role permissions
  const landingPage = getPreferredLandingPage();
  if (hasPageAccess(landingPage)) {
    if (landingPage === "dashboard") {
      loadPageContent("dashboard");
    } else {
      loadPage(landingPage);
    }
  } else {
    loadPageContent("dashboard");
  }

  // Initialize Feather icons
  if (typeof feather !== "undefined") {
    feather.replace();
  }

  initializeAutoXLExports();

  const mobileToggle = document.getElementById("mobile-menu-toggle");
  if (mobileToggle) {
    mobileToggle.addEventListener("click", function () {
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        sidebar.classList.toggle("mobile-open");
      }
    });
  }

  const currentDateElement = document.getElementById("current-date");
  if (currentDateElement) {
    currentDateElement.textContent = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
}

function navigateToPage(pageName) {
  loadPage(pageName);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
      initializeERP();
    }, 100);
  });
} else {
  setTimeout(() => {
    initializeERP();
  }, 100);
}

function initializeDashboard() {
  if (typeof generateDashboardContent === "function") {
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.innerHTML = generateDashboardContent();
      feather.replace();
    }
  }
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".relative")) {
    document.querySelectorAll(".product-dropdown").forEach((dropdown) => {
      dropdown.classList.add("hidden");
    });
    document.querySelectorAll(".edit-product-dropdown").forEach((dropdown) => {
      dropdown.classList.add("hidden");
    });
  }
});
