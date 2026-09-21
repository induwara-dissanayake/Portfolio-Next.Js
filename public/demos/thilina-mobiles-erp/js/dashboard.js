// Dashboard Module
let charts = {};
const API_URL = window.API_BASE_URL || "http://localhost:3000/api";

function formatCardNumber(amount) {
  const num = Math.round(Number(amount) || 0);
  return num.toLocaleString("en-US");
}

function formatCurrency(amount) {
  return "Rs. " + new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

async function fetchDashboardStats() {
  try {
    const token = sessionStorage.getItem("authToken");
    const response = await fetch(`${API_URL}/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Dashboard error:", error);
    return null;
  }
}

async function initializeDashboardModule() {
  const stats = await fetchDashboardStats();
  if (stats) {
    updateDashboardDOM(stats);
    initializeDashboardCharts(stats);
  }
}

function updateDashboardDOM(stats) {
  // Stats Cards
  const revenueEl = document.getElementById("dashboard-total-revenue");
  if (revenueEl) revenueEl.textContent = formatCardNumber(stats.totalRevenue);

  const salesEl = document.getElementById("dashboard-total-sales");
  if (salesEl) {
    salesEl.innerHTML = `${formatCardNumber(stats.totalSales)} <span class="text-xs font-normal text-gray-500 block">${stats.totalSalesCount || 0} invoice(s)</span>`;
  }

  const customersEl = document.getElementById("dashboard-active-customers");
  if (customersEl)
    customersEl.textContent = Number(stats.activeCustomersCount || 0).toLocaleString();

  const repairsEl = document.getElementById("dashboard-pending-repairs");
  if (repairsEl)
    repairsEl.textContent = Number(stats.pendingRepairs || 0).toLocaleString();

  // Recent Sales
  const recentSalesContainer = document.getElementById("dashboard-recent-sales-container");
  if (recentSalesContainer) {
    recentSalesContainer.innerHTML = "";
    if (!stats.recentSales || stats.recentSales.length === 0) {
      recentSalesContainer.innerHTML = `<p class="text-gray-500 text-sm">No recent sales</p>`;
    } else {
      stats.recentSales.forEach(sale => {
        recentSalesContainer.innerHTML += `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <i data-feather="smartphone" class="w-5 h-5 text-blue-600"></i>
              </div>
              <div>
                <p class="font-medium text-gray-800">${sale.firstItemName}</p>
                <p class="text-sm text-gray-600">Customer: ${sale.customerName}</p>
              </div>
            </div>
            <p class="font-semibold text-green-600">${formatCurrency(sale.totalAmount)}</p>
          </div>
        `;
      });
    }
    if (typeof feather !== "undefined") feather.replace();
  }

  // Low Stock Alerts
  const lowStockContainer = document.getElementById("dashboard-low-stock-container");
  if (lowStockContainer) {
    lowStockContainer.innerHTML = "";
    if (!stats.lowStockAlerts || stats.lowStockAlerts.length === 0) {
      lowStockContainer.innerHTML = `<p class="text-gray-500 text-sm">No low stock items</p>`;
    } else {
      stats.lowStockAlerts.forEach(stock => {
        lowStockContainer.innerHTML += `
          <div class="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <i data-feather="alert-triangle" class="w-5 h-5 text-red-600"></i>
              </div>
              <div>
                <p class="font-medium text-gray-800">${stock.productName} ${stock.variantName ? '- ' + stock.variantName : ''}</p>
                <p class="text-sm text-red-600">Only ${stock.quantity} left</p>
              </div>
            </div>
            <button onclick="loadPage('purchase')" class="btn-primary px-3 py-1 text-sm text-white rounded">
              Reorder
            </button>
          </div>
        `;
      });
    }
    if (typeof feather !== "undefined") feather.replace();
  }
}

function initializeDashboardCharts(stats) {
  const salesTrend = stats.salesTrend || [];
  const revenueTrend = stats.revenueTrend || [];

  const salesLabels = salesTrend.map((item) => item.month);
  const salesAmounts = salesTrend.map((item) => item.amount);
  const salesCounts = salesTrend.map((item) => item.count);

  const revenueLabels = revenueTrend.map((item) => item.month);
  const revenueAmounts = revenueTrend.map((item) => item.amount);

  // Sales Chart (Line Chart)
  const salesCtx = document.getElementById("salesChart");
  if (salesCtx) {
    if (charts.salesChart) {
      charts.salesChart.destroy();
    }
    charts.salesChart = new Chart(salesCtx, {
      type: "line",
      data: {
        labels: salesLabels.length ? salesLabels : ["Current Month"],
        datasets: [
          {
            label: "Sales Value (Rs.)",
            data: salesAmounts.length ? salesAmounts : [stats.totalSales || 0],
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#3B82F6",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const amt = context.raw;
                const count = salesCounts[idx] !== undefined ? salesCounts[idx] : "";
                return ` Sales: Rs. ${Number(amt).toLocaleString()} (${count} invoice${count === 1 ? '' : 's'})`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Rs. " + Number(value).toLocaleString();
              },
            },
          },
        },
      },
    });
  }

  // Revenue Chart (Bar Chart)
  const revenueCtx = document.getElementById("revenueChart");
  if (revenueCtx) {
    if (charts.revenueChart) {
      charts.revenueChart.destroy();
    }
    charts.revenueChart = new Chart(revenueCtx, {
      type: "bar",
      data: {
        labels: revenueLabels.length ? revenueLabels : ["Current Month"],
        datasets: [
          {
            label: "Revenue (Rs.)",
            data: revenueAmounts.length ? revenueAmounts : [stats.totalRevenue || 0],
            backgroundColor: "rgba(249, 115, 22, 0.85)",
            borderColor: "rgb(249, 115, 22)",
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return ` Revenue: Rs. ${Number(context.raw).toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Rs. " + Number(value).toLocaleString();
              },
            },
          },
        },
      },
    });
  }
}

async function refreshDashboard() {
  const btn = document.getElementById('refresh-btn');
  if(btn) btn.classList.add('animate-spin');
  const stats = await fetchDashboardStats();
  if (stats) {
    updateDashboardDOM(stats);
    initializeDashboardCharts(stats);
    showNotification("Dashboard refreshed successfully", "success");
  }
  if(btn) btn.classList.remove('animate-spin');
}

function generateReport() {
  showNotification("Generating comprehensive report...", "info");
  setTimeout(() => {
    showNotification("Report generated successfully", "success");
  }, 2000);
}

function initializeDashboard() {
  if (typeof initializeDashboardModule === "function") {
    initializeDashboardModule();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    initializeDashboardModule,
    initializeDashboardCharts,
    refreshDashboard,
    generateReport,
    initializeDashboard,
  };
}
