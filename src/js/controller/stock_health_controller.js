// ============================================================
//  stock_health_controller.js — Stock Health & Alert Center Controller
// ============================================================
import { getStoredProducts, saveStoredProducts, updateProductStockSettings, quickAdjustStock, transferBranchStock } from '../models/data.js';
import { getBranches } from './branch_controller.js';
import {
  iconBuilding,
  iconAlert,
  iconClose,
  iconRefresh,
  iconSearch,
  iconTruck,
  iconPackage,
  renderStockStatusBadge,
  formatLKR,
  showToast,
  etechAlert
} from '../util/index.js';


/**
 * Calculates comprehensive inventory health metrics across all branch warehouses
 */
export function getStockHealthReport() {
  const products = getStoredProducts();
  const branches = getBranches();

  // Branch Stats Map
  const branchStats = {};
  branches.forEach(b => {
    branchStats[b.id] = {
      id: b.id,
      name: b.name,
      city: b.city,
      totalSKUs: 0,
      healthyCount: 0,
      lowCount: 0,
      depletedCount: 0,
      status: 'Healthy'
    };
  });

  const alertItems = [];
  let totalActiveAlerts = 0;
  let totalDepletedUnits = 0;
  let totalLowUnits = 0;

  products.forEach(product => {
    const isAlertEnabled = product.alertEnabled !== false;
    const margin = parseInt(product.lowStockMargin) || 5;
    const branchStock = product.branchStock || {};

    let worstStage = 'HEALTHY'; // HEALTHY -> LOW -> DEPLETED
    const branchDetails = [];

    branches.forEach(branch => {
      const qty = parseInt(branchStock[branch.id] !== undefined ? branchStock[branch.id] : 0);
      const bStat = branchStats[branch.id];

      if (bStat) {
        bStat.totalSKUs++;
        if (qty === 0) {
          bStat.depletedCount++;
          if (isAlertEnabled) worstStage = 'DEPLETED';
        } else if (qty <= margin) {
          bStat.lowCount++;
          if (worstStage !== 'DEPLETED' && isAlertEnabled) worstStage = 'LOW';
        } else {
          bStat.healthyCount++;
        }
      }

      branchDetails.push({
        branchId: branch.id,
        branchName: branch.name,
        city: branch.city,
        qty: qty,
        isDepleted: qty === 0,
        isLow: qty > 0 && qty <= margin,
        isHealthy: qty > margin
      });
    });

    const hasIssue = branchDetails.some(b => b.isDepleted || b.isLow);

    if (hasIssue && isAlertEnabled) {
      totalActiveAlerts++;
      const depletedBranches = branchDetails.filter(b => b.isDepleted);
      const lowBranches = branchDetails.filter(b => b.isLow);

      totalDepletedUnits += depletedBranches.length;
      totalLowUnits += lowBranches.length;

      alertItems.push({
        product,
        worstStage,
        margin,
        depletedBranches,
        lowBranches,
        branchDetails
      });
    }
  });

  // Determine each branch's overall health status
  Object.values(branchStats).forEach(bs => {
    if (bs.depletedCount > 0) {
      bs.status = 'Critical';
      bs.statusClass = 'bg-rose-50 text-rose-700 border border-rose-200';
    } else if (bs.lowCount > 0) {
      bs.status = 'Warning';
      bs.statusClass = 'bg-amber-50 text-amber-700 border border-amber-200';
    } else {
      bs.status = 'Healthy';
      bs.statusClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  });

  return {
    products,
    branches,
    branchStats,
    alertItems,
    totalActiveAlerts,
    totalDepletedUnits,
    totalLowUnits
  };
}

/**
 * Renders the Stock Health & Inventory Alert Center tab view
 */
export function renderStockHealthTab(initialSearchQuery = '') {
  const container = document.getElementById('tab-panel-stock-health');
  if (!container) return;

  const report = getStockHealthReport();
  const { products, branches, branchStats, totalActiveAlerts, totalDepletedUnits, totalLowUnits } = report;

  container.innerHTML = `
    <div class="space-y-6">

      <!-- Header & Quick Metrics Overview -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm">
        <div>
          <div class="flex items-center space-x-2.5">
            <h3 class="text-lg font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full ${totalDepletedUnits > 0 ? 'bg-rose-500 animate-pulse' : (totalLowUnits > 0 ? 'bg-amber-500' : 'bg-emerald-500')}"></span>
              <span>Stock Health & Inventory Alert Center</span>
            </h3>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold ${totalActiveAlerts > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${totalActiveAlerts} Active Alert${totalActiveAlerts === 1 ? '' : 's'}
            </span>
          </div>
          <p class="text-xs text-[#64748b] mt-1">
            Real-time warehouse inventory health, per-item alert monitoring toggles, custom margin thresholds, and instant stock adjustments.
          </p>
        </div>

        <div class="flex items-center space-x-3 flex-shrink-0">
          <button onclick="renderStockHealthTab()" class="px-3 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] rounded-md text-xs font-bold border border-[#e2e8f0] transition-all flex items-center space-x-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Health</span>
          </button>
        </div>
      </div>

      <!-- 4 Regional Branch Warehouse Status Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${branches.map(b => {
          const bs = branchStats[b.id] || { totalSKUs: 0, depletedCount: 0, lowCount: 0, status: 'Healthy', statusClass: 'bg-emerald-50 text-emerald-700' };
          return `
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm space-y-3 relative overflow-hidden">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                  ${iconBuilding('w-3.5 h-3.5 text-blue-600 flex-shrink-0')}
                  <span class="text-xs font-bold text-[#0f172a]">${b.name}</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[9px] font-bold ${bs.statusClass}">${bs.status}</span>
              </div>
              
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-[#e2e8f0] text-center font-mono">
                <div class="bg-[#f8fafc] p-2 rounded border border-[#e2e8f0]">
                  <span class="text-[9px] text-[#64748b] block uppercase">SKUs</span>
                  <span class="text-xs font-extrabold text-[#0f172a]">${bs.totalSKUs}</span>
                </div>
                <div class="bg-[#f8fafc] p-2 rounded border ${bs.depletedCount > 0 ? 'border-rose-200 bg-rose-50' : 'border-[#e2e8f0]'}">
                  <span class="text-[9px] text-[#64748b] block uppercase">Depleted</span>
                  <span class="text-xs font-extrabold ${bs.depletedCount > 0 ? 'text-rose-600' : 'text-[#64748b]'}">${bs.depletedCount}</span>
                </div>
                <div class="bg-[#f8fafc] p-2 rounded border ${bs.lowCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-[#e2e8f0]'}">
                  <span class="text-[9px] text-[#64748b] block uppercase">Low</span>
                  <span class="text-xs font-extrabold ${bs.lowCount > 0 ? 'text-amber-600' : 'text-[#64748b]'}">${bs.lowCount}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Main Interactive Stock Health Table Container -->
      <div id="stock-health-table-section" class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
        
        <!-- Filter and Search Toolbar -->
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="w-full md:w-80">
            <div class="relative">
              <input type="text" id="stock-health-search" oninput="filterStockHealthTable()"
                value="${(initialSearchQuery || '').replace(/"/g, '&quot;')}"
                placeholder="Search Product or SKU..."
                class="w-full pl-9 pr-8 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs placeholder-[#94a3b8] focus:border-blue-600 transition-colors">
              <span class="absolute left-3 top-2.5 text-[#94a3b8]">
                ${iconSearch('w-4 h-4')}
              </span>
              <button id="clear-stock-search-btn" onclick="clearStockSearch()"
                class="${initialSearchQuery ? '' : 'hidden'} absolute right-2.5 top-2 text-[#94a3b8] hover:text-[#0f172a] text-xs" title="Clear filter">
                ${iconClose('w-3.5 h-3.5')}
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <!-- Filter by Branch -->
            <select id="stock-filter-branch" onchange="filterStockHealthTable()"
              class="px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600 font-semibold">
              <option value="ALL">All Branches</option>
              ${branches.map(b => `<option value="${b.id}">${b.name} (${b.city})</option>`).join('')}
            </select>

            <!-- Filter by Alert Severity Stage -->
            <select id="stock-filter-stage" onchange="filterStockHealthTable()"
              class="px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600 font-semibold">
              <option value="ALL">All Alert Stages</option>
              <option value="CRITICAL">Critical / Out of Stock (0 units)</option>
              <option value="LOW">Low Stock Warning</option>
              <option value="HEALTHY">Optimal / Healthy</option>
              <option value="ALERTS_ONLY">Active Alerts Only</option>
            </select>

            <!-- Filter by Monitoring State -->
            <select id="stock-filter-monitoring" onchange="filterStockHealthTable()"
              class="px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600">
              <option value="ALL">All Monitoring States</option>
              <option value="ENABLED">Alert Monitoring ON</option>
              <option value="MUTED">Alert Monitoring OFF</option>
            </select>
          </div>
        </div>

        <!-- Table Matrix View -->
        <div class="overflow-x-auto rounded-md border border-[#e2e8f0]">
          <table class="w-full text-left text-xs text-[#475569]">
            <thead class="bg-[#f8fafc] uppercase font-bold text-[10px] tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
              <tr>
                <th class="py-3 px-3.5">Product & SKU</th>
                <th class="py-3 px-3.5 text-center">Alert Monitoring</th>
                <th class="py-3 px-3.5">Alert Stage</th>
                <th class="py-3 px-3.5">Branch Warehouse Stock</th>
                <th class="py-3 px-3.5 text-center">Alert Margin</th>
                <th class="py-3 px-3.5 text-center">Total Stock</th>
                <th class="py-3 px-3.5 text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody id="stock-health-tbody" class="divide-y divide-[#e2e8f0]">
              ${renderStockHealthTableRows(products, branches)}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  `;

  // Apply initial filter if search query is provided
  if (initialSearchQuery) {
    filterStockHealthTable();
  }
}

/**
 * Helper to render stock health table rows
 */
function renderStockHealthTableRows(products, branches) {
  if (!products || products.length === 0) {
    return `<tr><td colspan="7" class="text-center py-6 text-xs text-[#64748b]">No products found in inventory.</td></tr>`;
  }

  return products.map(product => {
    const isAlertEnabled = product.alertEnabled !== false;
    const margin = parseInt(product.lowStockMargin) || 5;
    const branchStock = product.branchStock || {};

    let hasDepleted = false;
    let hasLow = false;
    const branchChips = branches.map(b => {
      const qty = parseInt(branchStock[b.id] !== undefined ? branchStock[b.id] : 0);
      let chipClass = 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0]';
      let statusLabel = '';

      if (qty === 0) {
        hasDepleted = true;
        chipClass = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
        statusLabel = ' (Out)';
      } else if (qty <= margin) {
        hasLow = true;
        chipClass = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
        statusLabel = ' (Low)';
      } else {
        chipClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      }

      return `
        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${chipClass}" title="${b.name}: ${qty} units">
          <strong class="mr-1">${b.id.replace('BR-', '')}:</strong> ${qty}${statusLabel}
        </span>
      `;
    }).join(' ');

    let stageBadge = '';
    let stageKey = 'HEALTHY';
    if (!isAlertEnabled) {
      stageBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-[#f1f5f9] text-[#64748b] border border-[#e2e8f0]">Muted</span>`;
      stageKey = 'MUTED';
    } else if (hasDepleted) {
      stageBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center space-x-1 w-max">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        <span>Critical (Out)</span>
      </span>`;
      stageKey = 'CRITICAL';
    } else if (hasLow) {
      stageBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-max">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        <span>Low Stock</span>
      </span>`;
      stageKey = 'LOW';
    } else {
      stageBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 w-max">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Optimal</span>
      </span>`;
      stageKey = 'HEALTHY';
    }

    return `
      <tr class="hover:bg-[#f8fafc] transition-colors stock-health-row"
          data-id="${product.id}"
          data-name="${(product.name || '').toLowerCase()}"
          data-sku="${(product.sku || '').toLowerCase()}"
          data-stage="${stageKey}"
          data-monitoring="${isAlertEnabled ? 'ENABLED' : 'MUTED'}"
          data-has-depleted="${hasDepleted}"
          data-has-low="${hasLow}"
          data-branch-stock='${JSON.stringify(branchStock)}'>
        
        <!-- Product & SKU -->
        <td class="py-3 px-3.5">
          <div class="flex items-center space-x-3">
            <img src="${product.image}" alt="${product.name}" class="w-10 h-10 object-cover rounded bg-[#f8fafc] border border-[#e2e8f0] flex-shrink-0">
            <div class="min-w-0">
              <p class="font-bold text-[#0f172a] truncate max-w-xs text-xs">${product.name}</p>
              <span class="text-[10px] font-mono text-blue-600 block">${product.sku || 'SKU-NONE'}</span>
            </div>
          </div>
        </td>

        <!-- Alert Monitoring Toggle Switch -->
        <td class="py-3 px-3.5 text-center">
          <button onclick="toggleProductAlert(${product.id})"
            class="px-2.5 py-1 rounded text-[10px] font-bold transition-all border ${isAlertEnabled ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0] hover:text-[#0f172a]'}"
            title="Click to toggle low stock alarm monitoring for this product">
            ${isAlertEnabled ? '● Alert ON' : '○ Alert OFF'}
          </button>
        </td>

        <!-- Alert Stage -->
        <td class="py-3 px-3.5">
          ${stageBadge}
        </td>

        <!-- Branch Stock Chips -->
        <td class="py-3 px-3.5">
          <div class="flex flex-wrap gap-1.5">
            ${branchChips}
          </div>
        </td>

        <!-- Alert Margin Dropdown -->
        <td class="py-3 px-3.5 text-center">
          <select onchange="updateProductStockMargin(${product.id}, this.value)"
            class="px-2 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-[11px] font-mono focus:border-blue-600">
            ${[2, 3, 5, 8, 10, 15, 20].map(m => `
              <option value="${m}" ${margin === m ? 'selected' : ''}>&lt; ${m} units</option>
            `).join('')}
          </select>
        </td>

        <!-- Total Stock -->
        <td class="py-3 px-3.5 text-center font-mono font-extrabold text-[#0f172a] text-xs">
          ${product.totalStock}
        </td>

        <!-- Quick Restock Action -->
        <td class="py-3 px-3.5 text-right">
          <button onclick="openQuickRestockModal(${product.id})"
            class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-bold text-xs rounded border border-blue-200 transition-all flex items-center space-x-1 ml-auto shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Restock</span>
          </button>
        </td>

      </tr>
    `;
  }).join('');
}

/**
 * Filter stock health table in real-time
 */
export function filterStockHealthTable() {
  const query = (document.getElementById('stock-health-search')?.value || '').toLowerCase().trim();
  const selectedBranch = document.getElementById('stock-filter-branch')?.value || 'ALL';
  const selectedStage = document.getElementById('stock-filter-stage')?.value || 'ALL';
  const selectedMonitoring = document.getElementById('stock-filter-monitoring')?.value || 'ALL';

  const clearBtn = document.getElementById('clear-stock-search-btn');
  if (clearBtn) {
    if (query) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  const rows = document.querySelectorAll('.stock-health-row');

  rows.forEach(row => {
    const name = row.getAttribute('data-name') || '';
    const sku = row.getAttribute('data-sku') || '';
    const stage = row.getAttribute('data-stage') || '';
    const monitoring = row.getAttribute('data-monitoring') || '';
    const hasDepleted = row.getAttribute('data-has-depleted') === 'true';
    const hasLow = row.getAttribute('data-has-low') === 'true';
    const branchStock = JSON.parse(row.getAttribute('data-branch-stock') || '{}');

    // Query match
    const matchesQuery = !query || name.includes(query) || sku.includes(query);

    // Monitoring match
    const matchesMonitoring = selectedMonitoring === 'ALL' || monitoring === selectedMonitoring;

    // Stage match
    let matchesStage = true;
    if (selectedStage === 'CRITICAL') matchesStage = stage === 'CRITICAL';
    else if (selectedStage === 'LOW') matchesStage = stage === 'LOW';
    else if (selectedStage === 'HEALTHY') matchesStage = stage === 'HEALTHY';
    else if (selectedStage === 'ALERTS_ONLY') matchesStage = stage === 'CRITICAL' || stage === 'LOW';

    // Branch match
    let matchesBranch = true;
    if (selectedBranch !== 'ALL') {
      const bQty = branchStock[selectedBranch];
      if (selectedStage === 'CRITICAL') matchesBranch = bQty === 0;
      else if (selectedStage === 'LOW') matchesBranch = bQty > 0 && bQty <= 5;
      else matchesBranch = true;
    }

    if (matchesQuery && matchesMonitoring && matchesStage && matchesBranch) {
      row.removeAttribute('style');
    } else {
      row.style.display = 'none';
    }
  });
}

/**
 * Clear stock search input and re-filter table
 */
export function clearStockSearch() {
  const searchInput = document.getElementById('stock-health-search');
  if (searchInput) {
    searchInput.value = '';
    filterStockHealthTable();
  }
}

/**
 * Navigate to Stock Health Tab and pre-filter by product query
 */
export function navigateToStockHealthWithSearch(productQuery) {
  if (typeof window.switchAdminTab === 'function') {
    window.switchAdminTab('stock-health', productQuery);
  } else {
    renderStockHealthTab(productQuery);
  }
}

/**
 * Toggle alert monitoring ON or OFF for a product
 */
export function toggleProductAlert(productId) {
  const products = getStoredProducts();
  const product = products.find(p => p.id === parseInt(productId));
  if (!product) return;

  const newState = product.alertEnabled === false ? true : false;
  updateProductStockSettings(productId, { alertEnabled: newState });

  showToast(newState ? `Alerts enabled for ${product.name}` : `Alerts muted for ${product.name}`);
  renderStockHealthTab();
}

/**
 * Update product low stock margin threshold
 */
export function updateProductStockMargin(productId, newMargin) {
  const margin = parseInt(newMargin) || 5;
  updateProductStockSettings(productId, { lowStockMargin: margin });
  showToast(`Low stock alert margin set to < ${margin} units.`);
  renderStockHealthTab();
}

/**
 * Opens Quick Restock & Branch Stock Transfer Modal
 */
export function openQuickRestockModal(productId, defaultBranchId = 'BR-COL') {
  const products = getStoredProducts();
  const product = products.find(p => p.id === parseInt(productId));
  if (!product) return;

  const activeUser = getCurrentUser();
  const branches = getBranches();
  const branchStock = product.branchStock || {};
  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  // Determine allowed branches based on role
  const isScopedUser = activeUser && (activeUser.isStaff() || (activeUser.isAdmin() && activeUser.assignedBranch));
  const userAssignedBranch = activeUser ? activeUser.assignedBranch : null;
  const initialBranch = (isScopedUser && userAssignedBranch) ? userAssignedBranch : defaultBranchId;

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 bg-[#0f172a]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-5 text-xs">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div class="flex items-center space-x-3">
            <img src="${product.image}" class="w-10 h-10 object-cover rounded bg-[#f8fafc] border border-[#e2e8f0]">
            <div>
              <h3 class="text-sm font-bold text-[#0f172a]">${product.name}</h3>
              <span class="text-[10px] text-[#64748b] font-mono">${product.sku} | Total: ${product.totalStock} units</span>
            </div>
          </div>
          <button onclick="document.getElementById('admin-modal-container').innerHTML = ''" class="text-[#64748b] hover:text-[#0f172a] text-lg font-bold">&times;</button>
        </div>

        <!-- Current Stock Distribution -->
        <div class="bg-[#f8fafc] p-3 rounded-md border border-[#e2e8f0] space-y-2">
          <span class="text-[10px] uppercase font-bold text-[#64748b] tracking-wider">Current Warehouse Stock:</span>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            ${branches.map(b => `
              <div class="bg-white p-2 rounded border ${parseInt(branchStock[b.id] || 0) === 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-[#e2e8f0]'}">
                <span class="text-[9px] text-[#64748b] block">${b.name.replace(' Hub', '')}</span>
                <span class="text-xs font-bold ${parseInt(branchStock[b.id] || 0) === 0 ? 'text-rose-600' : 'text-[#0f172a]'}">${branchStock[b.id] || 0}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Mode Selector: Direct Restock vs Inter-Branch Transfer -->
        <div class="flex rounded-md bg-[#f8fafc] p-1 border border-[#e2e8f0]">
          <button id="restock-mode-add" onclick="switchRestockModalMode('add')"
            class="flex-1 py-1.5 text-xs font-bold rounded bg-blue-600 text-white transition-all shadow-sm">
            + Direct Stock Inbound
          </button>
          <button id="restock-mode-transfer" onclick="switchRestockModalMode('transfer')"
            class="flex-1 py-1.5 text-xs font-bold rounded text-[#64748b] hover:text-[#0f172a] transition-all">
            ⇄ Inter-Branch Transfer
          </button>
        </div>

        <!-- Form Mode 1: Direct Inbound -->
        <form id="form-direct-restock" onsubmit="handleQuickRestockSubmit(event, ${product.id})" class="space-y-4">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Target Warehouse Hub *</label>
            ${isScopedUser ? `
              <input type="hidden" id="quick-restock-branch" value="${userAssignedBranch}">
              <div class="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-lg text-sky-900 font-bold flex items-center justify-between">
                <span>${branches.find(b => b.id === userAssignedBranch)?.name || userAssignedBranch}</span>
                <span class="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-sky-300">Your Branch (${branchStock[userAssignedBranch] || 0} units)</span>
              </div>
            ` : `
              <select id="quick-restock-branch" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a]">
                ${branches.map(b => `<option value="${b.id}" ${b.id === initialBranch ? 'selected' : ''}>${b.name} (${b.city}) — Currently ${branchStock[b.id] || 0} units</option>`).join('')}
              </select>
            `}
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Inbound Restock Quantity *</label>
            <input type="number" id="quick-restock-qty" min="1" max="1000" value="10" required
              class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono text-sm font-bold focus:border-blue-600">
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
            <button type="button" onclick="document.getElementById('admin-modal-container').innerHTML = ''"
              class="px-4 py-2 rounded bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-sm">
              Add Stock to Warehouse
            </button>
          </div>
        </form>

        <!-- Form Mode 2: Inter-Branch Transfer -->
        <form id="form-transfer-restock" onsubmit="handleStockTransferSubmit(event, ${product.id})" class="hidden space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">From Hub (Source) *</label>
              <select id="transfer-from-branch" class="w-full px-2.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs">
                ${branches.map(b => `<option value="${b.id}">${b.name.replace(' Hub', '')} (${branchStock[b.id] || 0} units)</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">To Hub (Destination) *</label>
              ${isScopedUser ? `
                <input type="hidden" id="transfer-to-branch" value="${userAssignedBranch}">
                <div class="px-2.5 py-2 bg-sky-50 border border-sky-200 rounded-md text-sky-900 font-bold text-xs">
                  ${branches.find(b => b.id === userAssignedBranch)?.name.replace(' Hub', '') || userAssignedBranch}
                </div>
              ` : `
                <select id="transfer-to-branch" class="w-full px-2.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs">
                  ${branches.map((b, i) => `<option value="${b.id}" ${i === 1 ? 'selected' : ''}>${b.name.replace(' Hub', '')} (${branchStock[b.id] || 0} units)</option>`).join('')}
                </select>
              `}
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Transfer Units *</label>
            <input type="number" id="transfer-qty" min="1" max="100" value="5" required
              class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono text-sm font-bold focus:border-blue-600">
          </div>

          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-[#e2e8f0]">
            <button type="button" onclick="document.getElementById('admin-modal-container').innerHTML = ''"
              class="px-4 py-2 rounded bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" class="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-sm">
              Execute Inter-Branch Transfer
            </button>
          </div>
        </form>

      </div>
    </div>
  `;
}

/**
 * Mode toggle inside Restock Modal
 */
export function switchRestockModalMode(mode) {
  const formAdd = document.getElementById('form-direct-restock');
  const formTransfer = document.getElementById('form-transfer-restock');
  const btnAdd = document.getElementById('restock-mode-add');
  const btnTransfer = document.getElementById('restock-mode-transfer');

  if (mode === 'add') {
    if (formAdd) formAdd.classList.remove('hidden');
    if (formTransfer) formTransfer.classList.add('hidden');
    if (btnAdd) btnAdd.className = 'flex-1 py-1.5 text-xs font-bold rounded bg-blue-600 text-white transition-all shadow-sm';
    if (btnTransfer) btnTransfer.className = 'flex-1 py-1.5 text-xs font-bold rounded text-[#64748b] hover:text-[#0f172a] transition-all';
  } else {
    if (formAdd) formAdd.classList.add('hidden');
    if (formTransfer) formTransfer.classList.remove('hidden');
    if (btnTransfer) btnTransfer.className = 'flex-1 py-1.5 text-xs font-bold rounded bg-blue-600 text-white transition-all shadow-sm';
    if (btnAdd) btnAdd.className = 'flex-1 py-1.5 text-xs font-bold rounded text-[#64748b] hover:text-[#0f172a] transition-all';
  }
}

/**
 * Handle Direct Restock Form Submission
 */
export async function handleQuickRestockSubmit(e, productId) {
  e.preventDefault();
  const activeUser = getCurrentUser();
  const branchId = document.getElementById('quick-restock-branch').value;
  const qty = parseInt(document.getElementById('quick-restock-qty').value) || 0;

  if (qty <= 0) return;

  if (activeUser && !activeUser.canManageBranch(branchId)) {
    etechAlert.error('Permission Denied', `You are only authorized to manage inventory for your assigned branch (${activeUser.assignedBranch}).`);
    return;
  }

  const confirmed = await etechAlert.confirmUpdate(`Warehouse Stock for Product #${productId}`, `Add +${qty} units to warehouse inventory.`);
  if (!confirmed) return;

  const updated = quickAdjustStock(productId, branchId, qty, false);
  if (updated) {
    showToast(`Added +${qty} units of ${updated.name} to warehouse.`, 'success');
    const modal = document.getElementById('admin-modal-container');
    if (modal) modal.innerHTML = '';
    renderStockHealthTab();
    if (typeof renderOverviewTab === 'function') renderOverviewTab();
  }
}

/**
 * Handle Inter-Branch Transfer Form Submission
 */
export async function handleStockTransferSubmit(e, productId) {
  e.preventDefault();
  const activeUser = getCurrentUser();
  const fromBranch = document.getElementById('transfer-from-branch').value;
  const toBranch = document.getElementById('transfer-to-branch').value;
  const qty = parseInt(document.getElementById('transfer-qty').value) || 0;

  if (fromBranch === toBranch) {
    etechAlert.warning('Invalid Selection', 'Source and destination warehouses cannot be the same.');
    return;
  }

  if (activeUser && activeUser.isStaff() && toBranch !== activeUser.assignedBranch) {
    etechAlert.warning('Branch Restriction', `Staff members can only request transfers inbound to their assigned branch (${activeUser.assignedBranch}).`);
    return;
  }

  const confirmed = await etechAlert.confirm({
    title: 'Transfer Inventory Between Branches?',
    message: `Transfer ${qty} units of product #${productId} from ${fromBranch} to ${toBranch}?`,
    type: 'update',
    confirmText: 'Execute Transfer',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  const result = transferBranchStock(productId, fromBranch, toBranch, qty);
  if (result.success) {
    showToast(`Transferred ${result.transferred} units between warehouses.`, 'success');
    const modal = document.getElementById('admin-modal-container');
    if (modal) modal.innerHTML = '';
    renderStockHealthTab();
    if (typeof renderOverviewTab === 'function') renderOverviewTab();
  } else {
    etechAlert.error('Transfer Failed', result.message || 'Transfer failed.');
  }
}
