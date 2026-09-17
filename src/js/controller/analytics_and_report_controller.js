// ============================================================
//  src/js/controller/analytics_and_report_controller.js
//  Enterprise Business Intelligence & Report Center Controller
// ============================================================
import { AnalyticsApi } from '../api/analyticsApi.js';
import { getBranches } from './branch_controller.js';
import { etechAlert } from '../util/index.js';

// Chart.js instance references (for cleanup on re-render)
let salesTrendChart = null;
let branchChart = null;
let categoryChart = null;

// Controller Filter State
const analyticsState = {
  period: 'this_month',
  from: null,
  to: null,
  branchId: 'ALL',
  isListenersAttached: false,
  isExporting: false
};

/**
 * Main entry point called by admin_dashboard_controller when Tab 6 is active
 */
export async function renderAnalyticsTab() {
  const panel = document.getElementById('tab-panel-analytics');
  if (!panel) return;

  // Initialize UI controls and dropdowns on first render
  initControls();

  // Load and render all analytics data with current filters
  await refreshAnalyticsData();
}

/**
 * Initialize event bindings, branch dropdown, and date controls once
 */
function initControls() {
  populateBranchDropdown();

  if (analyticsState.isListenersAttached) return;
  analyticsState.isListenersAttached = true;

  // Period Preset Buttons
  const periodBtns = document.querySelectorAll('.analytics-period-btn');
  periodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const period = btn.getAttribute('data-period');
      setPeriod(period);
    });
  });

  // Apply Custom Date Range Button
  const applyCustomBtn = document.getElementById('analytics-apply-custom-date');
  if (applyCustomBtn) {
    applyCustomBtn.addEventListener('click', () => {
      const fromVal = document.getElementById('analytics-date-from')?.value;
      const toVal = document.getElementById('analytics-date-to')?.value;
      if (!fromVal || !toVal) {
        etechAlert.warning('Date Required', 'Please select both start and end dates.');
        return;
      }
      if (fromVal > toVal) {
        etechAlert.warning('Invalid Date Range', 'Start date cannot be after end date.');
        return;
      }
      analyticsState.period = 'custom';
      analyticsState.from = fromVal;
      analyticsState.to = toVal;
      refreshAnalyticsData();
    });
  }

  // Branch Selector Change
  const branchSelect = document.getElementById('analytics-branch-select');
  if (branchSelect) {
    branchSelect.addEventListener('change', (e) => {
      analyticsState.branchId = e.target.value;
      refreshAnalyticsData();
    });
  }

  // Refresh Button
  const refreshBtn = document.getElementById('analytics-refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      refreshAnalyticsData();
    });
  }

  // Export Dropdown Toggle
  const exportBtn = document.getElementById('analytics-export-dropdown-btn');
  const exportMenu = document.getElementById('analytics-export-menu');
  if (exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!exportMenu.contains(e.target) && e.target !== exportBtn) {
        exportMenu.classList.add('hidden');
      }
    });
  }

  // Export Format Actions
  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnPdf) {
    btnPdf.addEventListener('click', () => triggerExport('PDF'));
  }

  const btnExcel = document.getElementById('btn-export-excel');
  if (btnExcel) {
    btnExcel.addEventListener('click', () => triggerExport('XLSX'));
  }

  const btnCsv = document.getElementById('btn-export-csv');
  if (btnCsv) {
    btnCsv.addEventListener('click', () => triggerExport('CSV'));
  }
}

/**
 * Populate branch filter select with regional hubs
 */
function populateBranchDropdown() {
  const select = document.getElementById('analytics-branch-select');
  if (!select) return;

  const currentValue = select.value || 'ALL';
  const branches = (typeof getBranches === 'function') ? getBranches() : [];

  select.innerHTML = `<option value="ALL">All Branches (Corporate View)</option>`;
  branches.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.city || 'Hub'})`;
    select.appendChild(opt);
  });
  select.value = currentValue;
}

/**
 * Set active period and update UI button styling
 */
function setPeriod(period) {
  analyticsState.period = period;
  const customContainer = document.getElementById('analytics-custom-date-container');

  const periodBtns = document.querySelectorAll('.analytics-period-btn');
  periodBtns.forEach(b => {
    if (b.getAttribute('data-period') === period) {
      b.className = 'analytics-period-btn px-2.5 py-1 rounded-md bg-white text-blue-600 shadow-xs font-bold transition-all';
    } else {
      b.className = 'analytics-period-btn px-2.5 py-1 rounded-md hover:text-[#0f172a] text-[#475569] font-medium transition-all';
    }
  });

  if (period === 'custom') {
    if (customContainer) customContainer.classList.remove('hidden');
    return; // Wait for user to pick dates and click Apply
  } else {
    if (customContainer) customContainer.classList.add('hidden');
    const { from, to } = calculateDates(period);
    analyticsState.from = from;
    analyticsState.to = to;
    refreshAnalyticsData();
  }
}

/**
 * Calculate YYYY-MM-DD bounds for period presets
 */
function calculateDates(period) {
  const now = new Date();
  let from = null;
  let to = null;

  const formatYMD = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (period === 'today') {
    from = formatYMD(now);
    to = formatYMD(now);
  } else if (period === '7d') {
    const past = new Date();
    past.setDate(now.getDate() - 6);
    from = formatYMD(past);
    to = formatYMD(now);
  } else if (period === 'this_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    from = formatYMD(firstDay);
    to = formatYMD(now);
  } else if (period === 'last_month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    from = formatYMD(firstDay);
    to = formatYMD(lastDay);
  } else if (period === 'ytd') {
    from = `${now.getFullYear()}-01-01`;
    to = formatYMD(now);
  }

  return { from, to };
}

/**
 * Fetch all analytics data and update the entire dashboard
 */
async function refreshAnalyticsData() {
  if (analyticsState.period !== 'custom' && (!analyticsState.from || !analyticsState.to)) {
    const dates = calculateDates(analyticsState.period);
    analyticsState.from = dates.from;
    analyticsState.to = dates.to;
  }

  const { from, to, branchId } = analyticsState;

  // Visual loading pulse on refresh button
  const refreshIcon = document.getElementById('analytics-refresh-btn')?.querySelector('svg');
  if (refreshIcon) refreshIcon.classList.add('animate-spin');

  try {
    const [summary, trends, branches, categories, topProducts, inventory] = await Promise.all([
      AnalyticsApi.getSummary(from, to, branchId),
      AnalyticsApi.getSalesTrends(from, to, branchId),
      AnalyticsApi.getBranchPerformance(from, to),
      AnalyticsApi.getCategoryPerformance(from, to, branchId),
      AnalyticsApi.getTopProducts(from, to, branchId, 10),
      AnalyticsApi.getInventoryHealth(branchId)
    ]);

    // 1. Populate Executive KPI Cards
    renderKpis(summary, inventory);

    // 2. Render Chart.js Visualizations
    renderSalesTrendChart(trends);
    renderBranchChart(branches);
    renderCategoryChart(categories);

    // 3. Render Branch Inventory List
    renderInventoryBranchList(inventory);

    // 4. Populate Tables
    renderTopProductsTable(topProducts);
    renderBranchScorecardTable(branches);

  } catch (err) {
    console.error('[Analytics] Failed to load dashboard data:', err);
    etechAlert.error('Connection Error', 'Unable to retrieve real-time analytics ledgers.');
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('animate-spin');
  }
}

/**
 * Render Executive KPI Ribbon
 */
function renderKpis(summary, inventory) {
  if (!summary) return;

  const grossEl = document.getElementById('kpi-gross-revenue');
  const netEl = document.getElementById('kpi-net-revenue');
  const ordersEl = document.getElementById('kpi-total-orders');
  const completedEl = document.getElementById('kpi-completed-orders');
  const pendingEl = document.getElementById('kpi-pending-orders');
  const aovEl = document.getElementById('kpi-avg-order-value');
  const unitsEl = document.getElementById('kpi-units-sold');
  const fulfillEl = document.getElementById('kpi-fulfillment-rate');
  const invUnitsEl = document.getElementById('kpi-inventory-units');
  const lowStockEl = document.getElementById('kpi-low-stock-count');
  const outStockEl = document.getElementById('kpi-out-stock-count');

  if (grossEl) grossEl.textContent = formatCurrency(summary.grossRevenue);
  if (netEl) netEl.textContent = formatCurrency(summary.netRevenue);
  if (ordersEl) ordersEl.textContent = (summary.totalOrders || 0).toLocaleString();
  if (completedEl) completedEl.textContent = `${summary.completedOrders || 0} Delivered`;
  if (pendingEl) pendingEl.textContent = `${summary.pendingOrders || 0} Pending`;
  if (aovEl) aovEl.textContent = formatCurrency(summary.avgOrderValue);
  if (unitsEl) unitsEl.textContent = `${(summary.totalUnitsSold || 0).toLocaleString()} Units`;
  if (fulfillEl) fulfillEl.textContent = `${(summary.fulfillmentRate || 0).toFixed(1)}%`;

  if (inventory) {
    if (invUnitsEl) invUnitsEl.textContent = (inventory.totalUnitsInStock || 0).toLocaleString();
    if (lowStockEl) lowStockEl.textContent = `${inventory.lowStockCount || 0} Low`;
    if (outStockEl) outStockEl.textContent = `${inventory.outOfStockCount || 0} Out`;
  }
}

/**
 * Render Dual-Axis Sales & Order Velocity Trend Chart
 */
function renderSalesTrendChart(trends) {
  const canvas = document.getElementById('analytics-sales-trend-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (salesTrendChart) {
    salesTrendChart.destroy();
    salesTrendChart = null;
  }

  const items = Array.isArray(trends) ? trends : [];
  const labels = items.map(t => t.date || 'N/A');
  const revenues = items.map(t => Number(t.revenue) || 0);
  const orders = items.map(t => Number(t.orderCount) || 0);

  const ctx = canvas.getContext('2d');
  salesTrendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Activity'],
      datasets: [
        {
          type: 'bar',
          label: 'Revenue (Rs.)',
          data: revenues.length > 0 ? revenues : [0],
          backgroundColor: 'rgba(37, 99, 235, 0.75)',
          hoverBackgroundColor: 'rgba(30, 58, 138, 0.95)',
          borderRadius: 4,
          yAxisID: 'y',
          order: 2
        },
        {
          type: 'line',
          label: 'Order Volume',
          data: orders.length > 0 ? orders : [0],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y1',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11, weight: 'bold' },
            color: '#475569'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { size: 11 },
          bodyFont: { size: 11 },
          padding: 8,
          callbacks: {
            label: function (context) {
              if (context.dataset.yAxisID === 'y') {
                return `Revenue: Rs. ${context.raw.toLocaleString()}`;
              }
              return `Orders: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#64748b' }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 10 },
            color: '#64748b',
            callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: {
            font: { size: 10 },
            color: '#10b981',
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * Render Regional Branch Comparison Chart
 */
function renderBranchChart(branches) {
  const canvas = document.getElementById('analytics-branch-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (branchChart) {
    branchChart.destroy();
    branchChart = null;
  }

  const items = Array.isArray(branches) ? branches : [];
  const labels = items.map(b => b.branchName || b.branchId || 'Hub');
  const data = items.map(b => Number(b.revenue) || 0);

  const colors = [
    '#2563eb', // Royal Blue
    '#6366f1', // Indigo
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ec4899'  // Pink
  ];

  const ctx = canvas.getContext('2d');
  branchChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Branches'],
      datasets: [
        {
          label: 'Revenue (Rs.)',
          data: data.length > 0 ? data : [0],
          backgroundColor: colors.slice(0, labels.length),
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a',
          callbacks: {
            label: (ctx) => `Revenue: Rs. ${ctx.raw.toLocaleString()}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#f1f5f9' },
          ticks: {
            font: { size: 10 },
            color: '#64748b',
            callback: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'K' : val
          }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 10, weight: 'bold' }, color: '#0f172a' }
        }
      }
    }
  });
}

/**
 * Render Category Revenue Contribution Doughnut Chart
 */
function renderCategoryChart(categories) {
  const canvas = document.getElementById('analytics-category-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }

  const items = Array.isArray(categories) ? categories : [];
  const labels = items.map(c => c.categoryName || 'General');
  const data = items.map(c => Number(c.revenue) || 0);

  const colors = [
    '#2563eb', '#3b82f6', '#06b6d4', '#10b981',
    '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'
  ];

  const ctx = canvas.getContext('2d');
  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['No Sales Recorded'],
      datasets: [
        {
          data: data.length > 0 ? data : [1],
          backgroundColor: data.length > 0 ? colors.slice(0, labels.length) : ['#e2e8f0'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 10,
            font: { size: 10, weight: 'bold' },
            color: '#334155'
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          callbacks: {
            label: (ctx) => {
              const val = ctx.raw || 0;
              return `${ctx.label}: Rs. ${val.toLocaleString()}`;
            }
          }
        }
      }
    }
  });
}

/**
 * Render Branch Inventory Progress Bars
 */
function renderInventoryBranchList(inventory) {
  const list = document.getElementById('analytics-inventory-branch-list');
  if (!list) return;

  const summaries = (inventory && inventory.branchSummaries) ? inventory.branchSummaries : [];
  if (summaries.length === 0) {
    list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">No branch inventory data recorded.</div>`;
    return;
  }

  const maxUnits = Math.max(...summaries.map(s => Number(s.totalUnits) || 0), 100);

  list.innerHTML = summaries.map(s => {
    const total = Number(s.totalUnits) || 0;
    const low = Number(s.lowStockItems) || 0;
    const out = Number(s.outOfStockItems) || 0;
    const pct = Math.min(100, Math.round((total / maxUnits) * 100));

    return `
      <div class="bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0] space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-[#0f172a]">${s.branchName}</span>
          <div class="flex items-center gap-2">
            ${low > 0 ? `<span class="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px] border border-rose-100">${low} Low</span>` : ''}
            ${out > 0 ? `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200">${out} Out</span>` : ''}
            <span class="font-mono text-blue-600 font-extrabold text-xs">${total.toLocaleString()} units</span>
          </div>
        </div>
        <div class="w-full h-2 rounded-full bg-[#e2e8f0] overflow-hidden">
          <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Top Performing Products Table
 */
function renderTopProductsTable(topProducts) {
  const tbody = document.getElementById('analytics-top-products-tbody');
  if (!tbody) return;

  const list = Array.isArray(topProducts) ? topProducts : [];
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-xs text-slate-400">No product sales recorded for this period.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map((p, idx) => {
    const rankClass = idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-800' : idx === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-600';
    return `
      <tr class="hover:bg-[#f8fafc] transition-colors">
        <td class="py-2.5 px-4 font-bold text-[#0f172a]">
          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${rankClass}">
            ${idx + 1}
          </span>
        </td>
        <td class="py-2.5 px-3 font-mono text-[11px] text-slate-500">${p.sku || 'N/A'}</td>
        <td class="py-2.5 px-3 font-bold text-[#0f172a]">${p.name}</td>
        <td class="py-2.5 px-3 text-slate-600">${p.categoryName || 'General'}</td>
        <td class="py-2.5 px-3 text-center font-bold text-[#0f172a]">${(p.unitsSold || 0).toLocaleString()}</td>
        <td class="py-2.5 px-4 text-right font-mono font-extrabold text-blue-600">${formatCurrency(p.revenue)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Branch Performance Scorecard Table
 */
function renderBranchScorecardTable(branches) {
  const tbody = document.getElementById('analytics-branch-scorecard-tbody');
  if (!tbody) return;

  const list = Array.isArray(branches) ? branches : [];
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-xs text-slate-400">No branch orders recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    return `
      <tr class="hover:bg-[#f8fafc] transition-colors">
        <td class="py-2.5 px-4">
          <div class="font-bold text-[#0f172a]">${b.branchName}</div>
          <div class="text-[10px] text-slate-400">${b.city || 'Hub'}</div>
        </td>
        <td class="py-2.5 px-3 text-center font-bold text-[#0f172a]">${(b.orderCount || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-center">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ${(b.fulfillmentRate || 0).toFixed(0)}%
          </span>
        </td>
        <td class="py-2.5 px-4 text-right font-mono font-bold text-[#0f172a]">${formatCurrency(b.revenue)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-blue-600">${b.percentage || 0}%</td>
      </tr>
    `;
  }).join('');
}

/**
 * Execute report export download
 */
async function triggerExport(format) {
  if (analyticsState.isExporting) return;
  analyticsState.isExporting = true;

  const exportMenu = document.getElementById('analytics-export-menu');
  if (exportMenu) exportMenu.classList.add('hidden');

  const exportBtn = document.getElementById('analytics-export-dropdown-btn');
  const originalText = exportBtn ? exportBtn.innerHTML : '';
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.innerHTML = `
      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      <span>Generating ${format}...</span>
    `;
  }

  try {
    etechAlert.info('Generating Report', `Compiling official ${format} document...`);
    await AnalyticsApi.exportReport(format, analyticsState.from, analyticsState.to, analyticsState.branchId);
    etechAlert.success('Download Complete', `${format} report generated and downloaded successfully.`);
  } catch (err) {
    console.error(`[Analytics] Export failed:`, err);
    etechAlert.error('Export Error', `Failed to generate ${format} report. Please try again.`);
  } finally {
    analyticsState.isExporting = false;
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = originalText;
    }
  }
}

/**
 * Helper: Format number to Sri Lankan Rupee currency
 */
function formatCurrency(val) {
  const num = Number(val) || 0;
  return 'Rs. ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}