// ============================================================
//  src/js/util/ui_helpers.js — Reusable UI Badges, Containers & Pill Helpers
// ============================================================

import {
  iconLock,
  iconBolt,
  iconUser,
  iconStar,
  iconTruck,
  iconClipboard,
  iconCheck,
  iconClose,
  iconClock,
  iconShield
} from './icons.js';

/**
 * Renders a standardized, non-wrapping product/entity count badge
 * Avoids line breaking issues like "1 \n Products" on responsive tables
 * 
 * @param {number} count - Numeric count
 * @param {string} singularLabel - Label when count is 1 (default: 'Product')
 * @param {string} pluralLabel - Label when count !== 1 (default: 'Products')
 * @param {string} colorScheme - 'blue', 'emerald', 'purple', 'slate'
 * @returns {string} HTML string
 */
export function renderCountBadge(count, singularLabel = 'Product', pluralLabel = 'Products', colorScheme = 'blue') {
  const num = typeof count === 'number' ? count : (parseInt(count, 10) || 0);
  const label = num === 1 ? singularLabel : pluralLabel;

  if (num > 0) {
    if (colorScheme === 'emerald') {
      return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
        <span>${num}</span>
        <span>${label}</span>
      </span>`;
    }
    if (colorScheme === 'purple') {
      return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
        <span>${num}</span>
        <span>${label}</span>
      </span>`;
    }
    // Default blue
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-extrabold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
      <span>${num}</span>
      <span>${label}</span>
    </span>`;
  }

  // 0 / Empty state
  return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0]">
    <span>0</span>
    <span>${label}</span>
  </span>`;
}

/**
 * Renders a standardized, non-wrapping Rule Type pill with SVG icon
 * Avoids wrapping like "🔒 SYSTEM \n DEFAULT"
 * 
 * @param {string} ruleType - 'system', 'automatic', 'manual', or badge ID
 * @returns {string} HTML string
 */
export function renderRuleTypeBadge(ruleType, badgeId = '') {
  const isSystem = ruleType === 'system' || badgeId === 'bdg-hotdeal' || ruleType === 'System Default';
  const isAuto = ruleType === 'automatic' || ruleType === 'Automatic' || ruleType === 'auto';

  if (isSystem) {
    return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
      ${iconLock('w-3 h-3 text-amber-700 flex-shrink-0')}
      <span>System Default</span>
    </span>`;
  }

  if (isAuto) {
    return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
      ${iconBolt('w-3 h-3 text-emerald-600 flex-shrink-0')}
      <span>Automatic</span>
    </span>`;
  }

  return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
    ${iconUser('w-3 h-3 text-purple-600 flex-shrink-0')}
    <span>Manual</span>
  </span>`;
}

/**
 * Renders a Featured Storefront badge with vector SVG star
 * 
 * @param {boolean} isFeatured
 * @returns {string} HTML string
 */
export function renderFeaturedBadge(isFeatured) {
  if (isFeatured) {
    return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
      ${iconStar('w-3 h-3 text-blue-600 flex-shrink-0')}
      <span>Featured</span>
    </span>`;
  }
  return `<span class="text-[#94a3b8] text-[10px] font-medium whitespace-nowrap">Standard</span>`;
}

/**
 * Renders a standardized non-wrapping Transfer Status pill with SVG icon
 * 
 * @param {string} status - 'Requested', 'In Transit', 'Received', 'Cancelled'
 * @returns {string} HTML string
 */
export function renderTransferStatusBadge(status) {
  const norm = (status || '').toLowerCase().trim();

  if (norm === 'in transit' || norm === 'transit') {
    return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 animate-pulse shadow-2xs">
      ${iconTruck('w-3.5 h-3.5 text-amber-600 flex-shrink-0')}
      <span>In Transit</span>
    </span>`;
  }

  if (norm === 'received' || norm === 'completed') {
    return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
      ${iconCheck('w-3.5 h-3.5 text-emerald-600 flex-shrink-0')}
      <span>Received</span>
    </span>`;
  }

  if (norm === 'cancelled' || norm === 'canceled') {
    return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
      ${iconClose('w-3.5 h-3.5 text-rose-600 flex-shrink-0')}
      <span>Cancelled</span>
    </span>`;
  }

  // Requested / Pending
  return `<span class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
    ${iconClipboard('w-3.5 h-3.5 text-blue-600 flex-shrink-0')}
    <span>Requested</span>
  </span>`;
}

/**
 * Standard single-color container for top card icons
 * 
 * @param {string} iconSvg - SVG HTML markup
 * @param {'rose'|'blue'|'purple'|'amber'|'emerald'|'slate'} color
 * @param {'sm'|'md'|'lg'} size
 * @returns {string} HTML string
 */
export function renderIconBox(iconSvg, color = 'blue', size = 'md') {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base'
  }[size] || 'w-10 h-10 rounded-xl text-sm';

  const colorClasses = {
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200'
  }[color] || 'bg-blue-50 text-blue-600 border-blue-200';

  return `<div class="${sizeClasses} ${colorClasses} border flex items-center justify-center flex-shrink-0 shadow-2xs">
    ${iconSvg}
  </div>`;
}

/**
 * Standard Order Status pill with SVG icon & non-wrapping container
 * 
 * @param {string} status - 'Processing', 'Delivered', 'Shipped', 'Cancelled', 'Pending'
 * @returns {string} HTML string
 */
export function renderOrderStatusBadge(status) {
  const s = (status || '').toLowerCase().trim();

  if (s === 'delivered' || s === 'completed') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
      ${iconCheck('w-3 h-3 text-emerald-600 flex-shrink-0')}
      <span>Delivered</span>
    </span>`;
  }

  if (s === 'shipped' || s === 'in transit') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
      ${iconTruck('w-3 h-3 text-blue-600 flex-shrink-0')}
      <span>Shipped</span>
    </span>`;
  }

  if (s === 'cancelled' || s === 'canceled') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
      ${iconClose('w-3 h-3 text-rose-600 flex-shrink-0')}
      <span>Cancelled</span>
    </span>`;
  }

  // Processing / Pending / Default
  return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
    ${iconClock('w-3 h-3 text-amber-600 flex-shrink-0')}
    <span>${status || 'Processing'}</span>
  </span>`;
}

/**
 * Standard Stock Health Status pill
 * 
 * @param {number} stock
 * @param {number} [alertQty=5]
 * @returns {string} HTML string
 */
export function renderStockStatusBadge(stock, alertQty = 5) {
  const qty = typeof stock === 'number' ? stock : parseInt(stock, 10) || 0;

  if (qty <= 0) {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
      <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
      <span>Out of Stock</span>
    </span>`;
  }

  if (qty <= alertQty) {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
      <span>Low Stock (${qty})</span>
    </span>`;
  }

  return `<span class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
    <span>In Stock (${qty})</span>
  </span>`;
}

/**
 * Standard User Role Badge
 * 
 * @param {string} role - 'ADMIN', 'STAFF', 'CUSTOMER'
 * @returns {string} HTML string
 */
export function renderUserRoleBadge(role) {
  let r = (role || '').toUpperCase().trim();
  if (r.startsWith('ROLE_')) r = r.substring(5);

  if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
      ${iconShield('w-3 h-3 text-purple-600 flex-shrink-0')}
      <span>SUPERADMIN</span>
    </span>`;
  }

  if (r === 'ADMIN') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
      ${iconLock('w-3 h-3 text-rose-600 flex-shrink-0')}
      <span>ADMIN</span>
    </span>`;
  }

  if (r === 'STAFF') {
    return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
      ${iconUser('w-3 h-3 text-blue-600 flex-shrink-0')}
      <span>STAFF</span>
    </span>`;
  }

  return `<span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-extrabold whitespace-nowrap bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs">
    <span>CUSTOMER</span>
  </span>`;
}

/**
 * Standard User Status Badge
 * 
 * @param {string} status - 'ACTIVE', 'INACTIVE'
 * @returns {string} HTML string
 */
export function renderUserStatusBadge(status) {
  const s = (status || '').toUpperCase().trim();

  if (s === 'ACTIVE') {
    return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      <span>ACTIVE</span>
    </span>`;
  }

  return `<span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold whitespace-nowrap bg-slate-100 text-slate-600 border border-slate-300">
    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
    <span>INACTIVE</span>
  </span>`;
}

/**
 * Renders a standardized, responsive pagination footer bar
 * 
 * @param {object} options
 * @param {string} options.containerId - HTML container ID
 * @param {number} options.currentPage - 1-indexed current page
 * @param {number} options.pageSize - items per page
 * @param {number} options.totalItems - total item count
 * @param {string} options.itemName - label e.g. 'products', 'orders', 'users'
 * @param {string} options.onPageChange - JS function name to call with (newPage)
 * @param {string} options.onPageSizeChange - JS function name to call with (newSize)
 */
export function renderTablePagination({
  containerId,
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  itemName = 'entries',
  onPageChange = 'changePage',
  onPageSizeChange = 'changePageSize'
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const curr = Math.max(1, Math.min(currentPage, totalPages));
  const startItem = totalItems === 0 ? 0 : (curr - 1) * pageSize + 1;
  const endItem = Math.min(curr * pageSize, totalItems);

  let pageButtonsHtml = '';
  const maxButtons = 5;
  let startPage = Math.max(1, curr - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let p = startPage; p <= endPage; p++) {
    const isActive = p === curr;
    pageButtonsHtml += `
      <button onclick="${onPageChange}(${p})"
        class="w-7 h-7 flex items-center justify-center rounded text-xs font-mono font-bold transition shadow-xs ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white border border-[#e2e8f0] text-[#475569] hover:bg-[#f1f5f9]'
        }">
        ${p}
      </button>
    `;
  }

  container.innerHTML = `
    <div class="px-4 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
      <div class="flex items-center space-x-2 flex-wrap">
        <span>Showing <strong class="text-[#0f172a] font-mono">${startItem}</strong> to <strong class="text-[#0f172a] font-mono">${endItem}</strong> of <strong class="text-[#0f172a] font-mono">${totalItems}</strong> ${itemName}</span>
        <span class="text-[#cbd5e1]">|</span>
        <div class="flex items-center space-x-1.5">
          <span>Show</span>
          <select onchange="${onPageSizeChange}(Number(this.value))"
            class="px-2 py-1 bg-white border border-[#e2e8f0] rounded text-xs font-mono font-bold text-[#0f172a] focus:border-blue-600 cursor-pointer shadow-2xs">
            <option value="5" ${pageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50</option>
          </select>
          <span>per page</span>
        </div>
      </div>
      <div class="flex items-center space-x-1">
        <button onclick="${onPageChange}(${curr - 1})" ${curr <= 1 ? 'disabled' : ''}
          class="px-2.5 py-1 rounded bg-white border border-[#e2e8f0] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs">
          Previous
        </button>
        ${pageButtonsHtml}
        <button onclick="${onPageChange}(${curr + 1})" ${curr >= totalPages ? 'disabled' : ''}
          class="px-2.5 py-1 rounded bg-white border border-[#e2e8f0] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs">
          Next
        </button>
      </div>
    </div>
  `;
}

