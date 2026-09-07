// ============================================================
//  taxonomy_controller.js — Categories & Badges Management Controller
// ============================================================
import { 
  getCategories, saveCategory, deleteCategory, getCategoryBySlug, updateCategoryStatus, syncCategoriesFromApi,
  getBadges, saveBadge, deleteBadge, getBadgeById, updateBadgeStatus, syncBadgesFromApi,
  runAutoBadgeAssignment, getBadgeColorClass, getBadgeThresholdSummary,
  getProductBehaviorHistory, recordProductBehaviorEvent
} from '../models/taxonomy_data.js';
import { getStoredProducts } from '../models/data.js';
import { closeAdminModal } from './admin_dashboard_controller.js';
import { updateTrashSidebarBadge } from './admin_dashboard_controller.js';
import { showToast } from '../util/toast.js';
import { etechAlert } from '../util/etech_alert.js';
import {
  iconTag,
  iconFolder,
  iconPackage,
  iconBolt,
  iconCheck,
  iconClose,
  iconClock,
  iconLock,
  iconUser,
  iconStar,
  iconAlert,
  iconInfo,
  iconEdit,
  iconPlus
} from '../util/icons.js';
import {
  renderCountBadge,
  renderRuleTypeBadge,
  renderFeaturedBadge
} from '../util/ui_helpers.js';

/**
 * ============================================================
 * TAB: CATEGORIES & BADGES (TAXONOMY MANAGEMENT)
 * ============================================================
 */
export function renderTaxonomyTab(shouldSync = true) {
  const container = document.getElementById('tab-panel-taxonomy');
  if (!container) return;

  if (shouldSync) {
    Promise.all([syncCategoriesFromApi(), syncBadgesFromApi()]).then(() => {
      renderTaxonomyTab(false);
    }).catch(() => {});
  }

  // By default, exclude soft-deleted categories & badges
  const categories = getCategories();
  const badges = getBadges();
  const products = getStoredProducts();
  const history = getProductBehaviorHistory();

  // Metrics computation
  const totalCategories = categories.length;
  const featuredCategoriesCount = categories.filter(c => c.featured).length;
  const totalBadges = badges.length;
  const activeBadgesCount = badges.filter(b => b.status === 'ACTIVE' || b.isActive).length;
  const autoRulesCount = badges.filter(b => b.ruleType === 'automatic' && (b.status === 'ACTIVE' || b.isActive)).length;
  const productsWithBadgesCount = products.filter(p => p.badge && p.badge.trim() !== '').length;
  const badgeCoveragePct = products.length > 0 ? Math.round((productsWithBadgesCount / products.length) * 100) : 0;

  // Build product count map per category
  const categoryCounts = {};
  categories.forEach(c => { categoryCounts[c.slug] = 0; });
  products.forEach(p => {
    const cat = (p.category || '').toLowerCase();
    if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
    else categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  // Build product count map per badge
  const badgeCounts = {};
  badges.forEach(b => { badgeCounts[b.name.toLowerCase()] = 0; });
  products.forEach(p => {
    if (p.badge) {
      const bName = p.badge.toLowerCase();
      badgeCounts[bName] = (badgeCounts[bName] || 0) + 1;
    }
  });

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- ── Top Header Banner with Action Buttons ────────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shadow-2xs flex-shrink-0">
              ${iconTag('w-5 h-5 text-blue-600')}
            </div>
            <div>
              <h2 class="text-lg font-extrabold text-[#0f172a]">Categories & Badges Management</h2>
              <p class="text-xs text-[#64748b]">Control store categorization hierarchy, dynamic visual tags, status lifecycle, and automated reach rules.</p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button onclick="runAutoBadgeAssigner()" title="Evaluate & Auto-Assign Badges to Products"
            class="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer whitespace-nowrap">
            ${iconBolt('w-3.5 h-3.5 text-emerald-600')}
            <span>Run Auto-Assigner</span>
          </button>

          <button onclick="openCategoryModal()"
            class="px-3.5 py-2 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] border border-[#e2e8f0] text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap">
            <span>+ Add Category</span>
          </button>

          <button onclick="openBadgeModal()"
            class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap">
            <span>+ Add Badge</span>
          </button>
        </div>
      </div>

      <!-- ── Overview Summary KPI Metrics Row ─────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Active Categories</span>
            <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">${iconFolder('w-3.5 h-3.5')}</span>
          </div>
          <h3 class="text-2xl font-extrabold text-[#0f172a] mt-1 font-mono">${totalCategories}</h3>
          <p class="text-[10px] text-blue-600 font-semibold mt-1">${featuredCategoriesCount} Featured on Storefront</p>
        </div>

        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Badge Tags</span>
            <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">${iconTag('w-3.5 h-3.5')}</span>
          </div>
          <h3 class="text-2xl font-extrabold text-[#0f172a] mt-1 font-mono">${totalBadges}</h3>
          <p class="text-[10px] text-emerald-600 font-semibold mt-1">${activeBadgesCount} Enabled (${autoRulesCount} Auto Rules)</p>
        </div>

        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Catalog Badge Coverage</span>
            <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">${iconCheck('w-3.5 h-3.5')}</span>
          </div>
          <h3 class="text-2xl font-extrabold text-[#0f172a] mt-1 font-mono">${badgeCoveragePct}%</h3>
          <p class="text-[10px] text-blue-600 font-semibold mt-1">${productsWithBadgesCount} of ${products.length} Products Tagged</p>
        </div>

        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Behavior History Log</span>
            <span class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">${iconClock('w-3.5 h-3.5')}</span>
          </div>
          <h3 class="text-2xl font-extrabold text-[#0f172a] mt-1 font-mono">${history.length}</h3>
          <p class="text-[10px] text-purple-600 font-semibold mt-1">Background Audit Trail Ready</p>
        </div>
      </div>

      <!-- ── Section 1: Categories Management Table ───────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span class="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">${iconFolder('w-3.5 h-3.5')}</span>
              <span>Product Categories Directory</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">${categories.length} Categories</span>
            </h3>
            <p class="text-[11px] text-[#64748b] mt-0.5">Primary navigation groupings and filter categories across catalog and shop.</p>
          </div>

          <button onclick="openCategoryModal()" class="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 cursor-pointer whitespace-nowrap">
            <span>+ Add New Category</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] uppercase font-bold text-[#64748b] tracking-wider">
                <th class="py-3 px-4 min-w-[180px]">Category Name</th>
                <th class="py-3 px-4 min-w-[120px]">Slug / Key</th>
                <th class="py-3 px-4 min-w-[180px]">Description</th>
                <th class="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">Featured Storefront</th>
                <th class="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">Product Count</th>
                <th class="py-3 px-4 text-center min-w-[110px] whitespace-nowrap">Status</th>
                <th class="py-3 px-4 text-right min-w-[140px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0] text-xs">
              ${categories.map(c => {
                const count = categoryCounts[c.slug] || 0;
                const status = (c.categoryStatus || c.status || 'ACTIVE').toUpperCase();
                const isActive = status === 'ACTIVE';

                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors">
                    <td class="py-3 px-4 font-bold text-[#0f172a]">
                      <div class="flex items-center space-x-2.5">
                        <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                          ${iconFolder('w-3.5 h-3.5')}
                        </div>
                        <span class="truncate">${c.name}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-blue-600 whitespace-nowrap">
                      ${c.slug}
                    </td>
                    <td class="py-3 px-4 max-w-xs text-[11px] text-[#475569] truncate" title="${c.description || ''}">
                      ${c.description || '<span class="italic text-[#94a3b8]">No description provided</span>'}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${renderFeaturedBadge(c.featured)}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${renderCountBadge(count, 'Product', 'Products', 'blue')}
                    </td>
                    <!-- 1-Click Status Switcher (ACTIVE / INACTIVE) -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      <button type="button" onclick="toggleCategoryStatus('${c.slug}')"
                        title="Click to toggle between ACTIVE and INACTIVE"
                        class="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase transition-all inline-flex items-center space-x-1.5 shadow-2xs cursor-pointer whitespace-nowrap ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}">
                        <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
                        <span>${status}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button onclick="openCategoryModal('${c.slug}')" title="Edit Category"
                        class="px-2.5 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 hover:text-blue-800 rounded text-xs font-bold border border-[#e2e8f0] transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                        Edit
                      </button>
                      <button onclick="confirmDeleteCategory('${c.slug}')" title="Soft Delete (Move to Trash Bin)"
                        class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold border border-rose-200 transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                        Delete
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Section 2: Badges & Auto-Reach Rules Table ────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">${iconTag('w-3.5 h-3.5')}</span>
              <span>Storefront Badges & Automated Behavioral Reach Rules</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">${badges.length} Badges</span>
            </h3>
            <p class="text-[11px] text-[#64748b] mt-0.5">Define visual highlight labels and automated threshold rules triggered by live store metrics.</p>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="runAutoBadgeAssigner()"
              class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer whitespace-nowrap">
              ${iconBolt('w-3.5 h-3.5 text-emerald-600')}
              <span>Run Rules Now</span>
            </button>
            <button onclick="openBadgeModal()" class="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 cursor-pointer whitespace-nowrap">
              <span>+ Add New Badge</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] uppercase font-bold text-[#64748b] tracking-wider">
                <th class="py-3 px-4 min-w-[160px]">Badge Title & Style</th>
                <th class="py-3 px-4 min-w-[180px]">Purpose / Intent</th>
                <th class="py-3 px-4 min-w-[200px]">Active Standard Rule & Thresholds</th>
                <th class="py-3 px-4 text-center min-w-[140px] whitespace-nowrap">Rule Type</th>
                <th class="py-3 px-4 text-center min-w-[130px] whitespace-nowrap">Applied Products</th>
                <th class="py-3 px-4 text-center min-w-[110px] whitespace-nowrap">Status</th>
                <th class="py-3 px-4 text-right min-w-[140px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0] text-xs">
              ${badges.map(b => {
                const colorClass = getBadgeColorClass(b.color);
                const count = badgeCounts[b.name.toLowerCase()] || 0;
                const thresholdSummary = getBadgeThresholdSummary(b);
                const status = (b.status || (b.isActive !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
                const isActive = status === 'ACTIVE';

                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors ${!isActive ? 'opacity-60' : ''}">
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-2.5">
                        <span class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shadow-2xs whitespace-nowrap ${colorClass}">
                          ${b.name}
                        </span>
                      </div>
                    </td>
                    <td class="py-3 px-4 max-w-xs text-[11px] text-[#475569]">
                      ${b.purpose || '<span class="italic text-[#94a3b8]">No description provided</span>'}
                    </td>
                    <td class="py-3 px-4 text-[11px]">
                      <div class="space-y-0.5">
                        <span class="font-semibold text-[#0f172a]">${thresholdSummary}</span>
                        <span class="block text-[9px] font-mono text-[#64748b]">Criteria: ${b.criteria || 'custom'} | Priority: ${b.priority || 10}</span>
                      </div>
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${renderRuleTypeBadge(b.ruleType, b.id)}
                    </td>
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${renderCountBadge(count, 'Product', 'Products', 'blue')}
                    </td>
                    <!-- 1-Click Status Switcher (ACTIVE / INACTIVE) -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      ${(b.id === 'bdg-hotdeal' || b.canEdit === false) ? `
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1 whitespace-nowrap shadow-2xs">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>ACTIVE</span>
                        </span>
                      ` : `
                        <button type="button" onclick="toggleBadgeStatus('${b.id}')"
                          title="Click to toggle between ACTIVE and INACTIVE"
                          class="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase transition-all inline-flex items-center space-x-1.5 shadow-2xs cursor-pointer whitespace-nowrap ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}">
                          <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
                          <span>${status}</span>
                        </button>
                      `}
                    </td>
                    <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      ${(b.id === 'bdg-hotdeal' || b.canEdit === false) ? `
                        <span class="px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-[11px] font-bold border border-slate-200 inline-flex items-center space-x-1 whitespace-nowrap" title="Protected System Default Badge (Managed exclusively by Hot Deals module)">
                          ${iconLock('w-3 h-3 text-slate-500')}
                          <span>Locked (Default)</span>
                        </span>
                      ` : (b.canDelete === false || b.isSystemDefault) ? `
                        <button onclick="openBadgeModal('${b.id}')" title="Edit Badge Rule & Thresholds"
                          class="px-2.5 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 hover:text-blue-800 rounded text-xs font-bold border border-[#e2e8f0] transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                          Edit
                        </button>
                        <span class="px-2 py-1 text-[10px] text-slate-400 font-semibold italic select-none" title="Permanent Core Default Badge (Cannot be deleted)">Default</span>
                      ` : `
                        <button onclick="openBadgeModal('${b.id}')" title="Edit Badge Rule & Thresholds"
                          class="px-2.5 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 hover:text-blue-800 rounded text-xs font-bold border border-[#e2e8f0] transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                          Edit
                        </button>
                        <button onclick="confirmDeleteBadge('${b.id}')" title="Soft Delete (Move to Trash Bin)"
                          class="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-bold border border-rose-200 transition-colors shadow-sm cursor-pointer whitespace-nowrap">
                          Delete
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

/**
 * 1-Click Status Toggler for Category (ACTIVE <-> INACTIVE)
 */
export async function toggleCategoryStatus(slugOrId) {
  const cat = getCategoryBySlug(slugOrId);
  if (!cat) return;

  const currentStatus = (cat.categoryStatus || cat.status || 'ACTIVE').toUpperCase();
  const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  await updateCategoryStatus(slugOrId, nextStatus);
  showToast(`Category "${cat.name}" status changed to ${nextStatus}.`, 'info');
  renderTaxonomyTab();
}

/**
 * 1-Click Status Toggler for Badge (ACTIVE <-> INACTIVE)
 */
export async function toggleBadgeStatus(badgeId) {
  const badge = getBadgeById(badgeId);
  if (!badge) return;

  const currentStatus = (badge.status || (badge.isActive !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
  const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  await updateBadgeStatus(badgeId, nextStatus);
  showToast(`Badge "${badge.name}" status changed to ${nextStatus}.`, 'info');
  renderTaxonomyTab();
}

/**
 * Run Automated Badge Assignment Engine and Show Live Feedback Toast
 */
export function runAutoBadgeAssigner() {
  const result = runAutoBadgeAssignment();
  renderTaxonomyTab();

  if (result.updatedCount > 0) {
    showToast(`⚡ Auto-Assigner Complete: Updated ${result.updatedCount} product badges based on behavior standards!`);
  } else {
    showToast(`✓ All ${result.totalEvaluated} products already comply with active badge behavior standards.`);
  }
}

/**
 * ============================================================
 * CATEGORY MODALS & CRUD HANDLERS
 * ============================================================
 */
export function openCategoryModal(slug = null) {
  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  const category = slug ? getCategoryBySlug(slug) : null;
  const isEdit = Boolean(category);

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <h3 class="text-base font-extrabold text-[#0f172a] flex items-center space-x-2">
            <span class="inline-flex items-center space-x-1.5">${isEdit ? `${iconEdit('w-4 h-4 text-blue-600')}<span>Edit Category</span>` : `${iconPlus('w-4 h-4 text-blue-600')}<span>Add New Category</span>`}</span>
          </h3>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] text-lg font-bold">&times;</button>
        </div>

        <form onsubmit="handleSaveCategorySubmit(event, ${isEdit})" class="space-y-3.5 text-xs">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Category Title *</label>
            <input type="text" id="modal-cat-name" required value="${category ? category.name : ''}"
              placeholder="e.g. Mechanical Keyboards"
              class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="block text-[#475569] font-bold mb-1">Slug / URL Key *</label>
              <input type="text" id="modal-cat-slug" required value="${category ? category.slug : ''}"
                placeholder="e.g. keyboards"
                class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-blue-600 font-mono focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Icon / Emoji</label>
              <input type="text" id="modal-cat-icon" value="${category ? category.icon : '📦'}"
                placeholder="⌨️"
                class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-center text-base text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Lifecycle Status *</label>
            <select id="modal-cat-status" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-bold">
              <option value="ACTIVE" ${category && (category.categoryStatus === 'ACTIVE' || category.status === 'ACTIVE') ? 'selected' : ''}>ACTIVE (Storefront Visible)</option>
              <option value="INACTIVE" ${category && (category.categoryStatus === 'INACTIVE' || category.status === 'INACTIVE') ? 'selected' : ''}>INACTIVE (Hidden from Customers)</option>
            </select>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Category Description & Scope</label>
            <textarea id="modal-cat-desc" rows="2"
              placeholder="Describe what products belong in this category..."
              class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">${category ? category.description : ''}</textarea>
          </div>

          <div class="flex items-center space-x-2 pt-1">
            <input type="checkbox" id="modal-cat-featured" ${category && category.featured ? 'checked' : ''}
              class="rounded bg-[#f8fafc] border-[#e2e8f0] text-blue-600 focus:ring-0">
            <label for="modal-cat-featured" class="text-xs text-[#475569] font-semibold cursor-pointer">
              Feature category on Storefront homepage & quick filters
            </label>
          </div>

          <input type="hidden" id="modal-cat-id" value="${category ? category.id : ''}">

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()"
              class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0] transition-colors">
              Cancel
            </button>
            <button type="submit"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm transition-colors">
              ${isEdit ? 'Save Category' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function handleSaveCategorySubmit(event, isEdit = false) {
  event.preventDefault();

  const id = document.getElementById('modal-cat-id').value;
  const name = document.getElementById('modal-cat-name').value.trim();
  const slug = document.getElementById('modal-cat-slug').value.trim();
  const icon = document.getElementById('modal-cat-icon').value.trim() || '📦';
  const description = document.getElementById('modal-cat-desc').value.trim();
  const featured = document.getElementById('modal-cat-featured').checked;
  const status = document.getElementById('modal-cat-status')?.value || 'ACTIVE';

  if (!name || !slug) {
    etechAlert.warning('Validation Error', 'Category title and URL slug are required.');
    return;
  }

  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Category "${name}"`, `Slug: #${slug} | Lifecycle Status: ${status}`)
    : await etechAlert.confirmCreate(`Category "${name}"`, `Slug: #${slug} | Lifecycle Status: ${status}`);

  if (!confirmed) return;

  await saveCategory({
    id: id || undefined,
    name,
    slug,
    icon,
    description,
    featured,
    categoryStatus: status,
    status: status
  }, isEdit);

  closeAdminModal();
  renderTaxonomyTab();
  showToast(`Category "${name}" saved successfully.`, 'success');
}

export async function confirmDeleteCategory(slug) {
  const category = getCategoryBySlug(slug);
  if (!category) return;

  const products = getStoredProducts();
  const linkedCount = products.filter(p => (p.category || '').toLowerCase() === slug.toLowerCase()).length;

  const extraDetails = linkedCount > 0 
    ? `Warning: ${linkedCount} catalog product(s) are currently assigned under this category.`
    : `Slug: #${category.slug}`;

  const confirmed = await etechAlert.confirmDelete(`Category "${category.name}"`, extraDetails);
  if (!confirmed) return;

  await deleteCategory(slug);
  renderTaxonomyTab();
  updateTrashSidebarBadge();
  showToast(`Category "${category.name}" moved to Trash Bin.`, 'success');
}

/**
 * ============================================================
 * BADGE MODALS & CRUD HANDLERS
 * ============================================================
 */

let currentEditingBadge = null;

export function openBadgeModal(badgeId = null) {
  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  const badge = badgeId ? getBadgeById(badgeId) : null;
  if (badge && (badge.canEdit === false || badge.id === 'bdg-hotdeal')) {
    showToast('Cannot modify protected system default badge.', 'warning');
    return;
  }
  const isEdit = Boolean(badge);
  currentEditingBadge = badge;

  const colors = [
    { value: 'blue', label: 'Blue (Bestseller)', class: 'text-blue-600' },
    { value: 'rose', label: 'Rose / Red (Hot Deal / Alert)', class: 'text-rose-600' },
    { value: 'emerald', label: 'Emerald Green (New Arrival)', class: 'text-emerald-600' },
    { value: 'amber', label: 'Amber / Gold (Top Rated)', class: 'text-amber-600' },
    { value: 'purple', label: 'Purple (Staff Pick)', class: 'text-purple-600' },
    { value: 'cyan', label: 'Cyan (Popular)', class: 'text-cyan-600' },
    { value: 'orange', label: 'Orange (Clearance)', class: 'text-orange-600' }
  ];

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs animate-fadeIn">
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <h3 class="text-base font-extrabold text-[#0f172a] flex items-center space-x-2">
            <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">${iconTag('w-4 h-4')}</span>
            <span>${isEdit ? 'Edit Badge & Rule Criteria' : 'Add Product Badge'}</span>
          </h3>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            ${iconClose('w-4 h-4')}
          </button>
        </div>

        <form onsubmit="handleSaveBadgeSubmit(event, ${isEdit})" class="space-y-3.5 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Badge Display Title *</label>
              <input type="text" id="modal-bdg-name" required value="${badge ? badge.name : ''}"
                placeholder="e.g. Pro Choice"
                class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-bold">
            </div>

            <div>
              <label class="block text-[#475569] font-bold mb-1">Color Theme Preset *</label>
              <select id="modal-bdg-color" required
                class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-medium">
                ${colors.map(c => `
                  <option value="${c.value}" ${badge && badge.color === c.value ? 'selected' : ''}>
                    ${c.label}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Lifecycle Status *</label>
              <select id="modal-bdg-status" class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-bold">
                <option value="ACTIVE" ${!badge || badge.status === 'ACTIVE' || badge.isActive ? 'selected' : ''}>ACTIVE (Enabled)</option>
                <option value="INACTIVE" ${badge && (badge.status === 'INACTIVE' || badge.isActive === false) ? 'selected' : ''}>INACTIVE (Disabled)</option>
              </select>
            </div>

            <div>
              <label class="block text-[#475569] font-bold mb-1">Assignment Rule Type *</label>
              <select id="modal-bdg-ruletype" onchange="updateBadgeThresholdsUI()" required
                class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-medium">
                <option value="automatic" ${badge && badge.ruleType === 'automatic' ? 'selected' : ''}>Automatic (Rule Criteria)</option>
                <option value="manual" ${badge && badge.ruleType === 'manual' ? 'selected' : ''}>Manual (Direct Staff Pick)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Badge Purpose & Explanation</label>
            <input type="text" id="modal-bdg-purpose" value="${badge ? badge.purpose : ''}"
              placeholder="e.g. Highlights top-tier products chosen by our certified architects."
              class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Trigger Standard Criteria *</label>
            <select id="modal-bdg-criteria" onchange="updateBadgeThresholdsUI()"
              class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-blue-600 font-mono text-[11px] focus:border-blue-600">
              <option value="discount_gte_10" ${badge && badge.criteria === 'discount_gte_10' ? 'selected' : ''}>Price Markdown / Discount</option>
              <option value="rating_gte_48" ${badge && badge.criteria === 'rating_gte_48' ? 'selected' : ''}>Customer Rating & Reviews</option>
              <option value="bestseller" ${badge && badge.criteria === 'bestseller' ? 'selected' : ''}>Sales Champion (Reviews)</option>
              <option value="reviews_gte_40" ${badge && badge.criteria === 'reviews_gte_40' ? 'selected' : ''}>High Popularity (Reviews)</option>
              <option value="low_stock_scarcity" ${badge && badge.criteria === 'low_stock_scarcity' ? 'selected' : ''}>Low Stock Urgency Threshold</option>
              <option value="new_arrival" ${badge && badge.criteria === 'new_arrival' ? 'selected' : ''}>Recent Catalog Release</option>
              <option value="manual_curated" ${badge && badge.criteria === 'manual_curated' ? 'selected' : ''}>Manual Specialist Assignment</option>
              <option value="manual_clearance" ${badge && badge.criteria === 'manual_clearance' ? 'selected' : ''}>Manual Clearance Batch</option>
            </select>
          </div>

          <!-- Dynamic Thresholds Configuration Panel -->
          <div id="modal-bdg-thresholds-container" class="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2.5">
            <!-- Dynamically populated by updateBadgeThresholdsUI() -->
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Standard Reach Description</label>
            <input type="text" id="modal-bdg-standard" value="${badge ? badge.standardDescription : ''}"
              placeholder="e.g. Automated: Active price discount reaches specified benchmark."
              class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Rule Priority (Higher runs first)</label>
              <input type="number" id="modal-bdg-priority" value="${badge ? badge.priority : 10}" min="1" max="100"
                class="w-full px-3 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono focus:border-blue-600">
            </div>
          </div>

          <input type="hidden" id="modal-bdg-id" value="${badge ? badge.id : ''}">

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()"
              class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-xl font-bold border border-[#e2e8f0] transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-sm transition-colors cursor-pointer">
              ${isEdit ? 'Save Badge Rule' : 'Create Badge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  updateBadgeThresholdsUI();
}

export function updateBadgeThresholdsUI() {
  const container = document.getElementById('modal-bdg-thresholds-container');
  const criteriaEl = document.getElementById('modal-bdg-criteria');
  const ruleTypeEl = document.getElementById('modal-bdg-ruletype');
  if (!container || !criteriaEl) return;

  const criteria = criteriaEl.value;
  const isAuto = ruleTypeEl && ruleTypeEl.value === 'automatic';
  const t = (currentEditingBadge && currentEditingBadge.thresholds) ? currentEditingBadge.thresholds : {};

  if (!isAuto) {
    container.innerHTML = `
      <div class="text-[11px] text-[#64748b] flex items-center space-x-2">
        ${iconInfo('w-4 h-4 text-slate-500 flex-shrink-0')}
        <span>Manual Badge: Assigned directly by staff to hardware catalog items. No automated rule checks.</span>
      </div>
    `;
    return;
  }

  switch (criteria) {
    case 'discount_gte_10':
      container.innerHTML = `
        <div class="space-y-1">
          <label class="block text-[#0f172a] font-bold">Minimum Discount Markdown %</label>
          <div class="flex items-center space-x-2">
            <input type="number" id="threshold-discountPct" min="1" max="90" value="${t.discountPct !== undefined ? t.discountPct : 10}"
              class="w-24 px-2 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-mono font-bold focus:border-blue-600">
            <span class="text-xs text-[#64748b]">% off original list price</span>
          </div>
        </div>
      `;
      break;
    case 'rating_gte_48':
      container.innerHTML = `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[#0f172a] font-bold">Min Rating (Stars)</label>
            <input type="number" step="0.1" min="1.0" max="5.0" id="threshold-minRating" value="${t.minRating !== undefined ? t.minRating : 4.8}"
              class="w-full px-2 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-mono font-bold focus:border-blue-600">
          </div>
          <div>
            <label class="block text-[#0f172a] font-bold">Min Reviews Count</label>
            <input type="number" min="1" id="threshold-minReviews" value="${t.minReviews !== undefined ? t.minReviews : 50}"
              class="w-full px-2 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-mono font-bold focus:border-blue-600">
          </div>
        </div>
      `;
      break;
    case 'bestseller':
    case 'reviews_gte_40':
      container.innerHTML = `
        <div>
          <label class="block text-[#0f172a] font-bold">Verified Customer Reviews Threshold</label>
          <div class="flex items-center space-x-2">
            <input type="number" min="1" id="threshold-minReviews" value="${t.minReviews !== undefined ? t.minReviews : (criteria === 'bestseller' ? 80 : 40)}"
              class="w-24 px-2 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-mono font-bold focus:border-blue-600">
            <span class="text-xs text-[#64748b]">reviews required</span>
          </div>
        </div>
      `;
      break;
    case 'low_stock_scarcity':
      container.innerHTML = `
        <div>
          <label class="block text-[#0f172a] font-bold">Urgent Low Stock Ceiling</label>
          <div class="flex items-center space-x-2">
            <input type="number" min="1" max="50" id="threshold-maxStock" value="${t.maxStock !== undefined ? t.maxStock : 5}"
              class="w-24 px-2 py-1 rounded bg-white border border-[#e2e8f0] text-xs font-mono font-bold focus:border-blue-600">
            <span class="text-xs text-[#64748b]">units remaining across all branch hubs</span>
          </div>
        </div>
      `;
      break;
    default:
      container.innerHTML = `
        <div class="text-[11px] text-[#64748b]">Automated rule will trigger dynamically when product matches standard criteria.</div>
      `;
  }
}

export async function handleSaveBadgeSubmit(event, isEdit = false) {
  event.preventDefault();

  const id = document.getElementById('modal-bdg-id').value;
  const name = document.getElementById('modal-bdg-name').value.trim();
  const color = document.getElementById('modal-bdg-color').value;
  const purpose = document.getElementById('modal-bdg-purpose').value.trim();
  const ruleType = document.getElementById('modal-bdg-ruletype').value;
  const criteria = document.getElementById('modal-bdg-criteria').value;
  const standardDescription = document.getElementById('modal-bdg-standard').value.trim();
  const priority = parseInt(document.getElementById('modal-bdg-priority').value) || 10;
  const status = document.getElementById('modal-bdg-status')?.value || 'ACTIVE';

  const thresholds = {};
  if (document.getElementById('threshold-discountPct')) {
    thresholds.discountPct = parseFloat(document.getElementById('threshold-discountPct').value) || 10;
  }
  if (document.getElementById('threshold-minRating')) {
    thresholds.minRating = parseFloat(document.getElementById('threshold-minRating').value) || 4.8;
  }
  if (document.getElementById('threshold-minReviews')) {
    thresholds.minReviews = parseInt(document.getElementById('threshold-minReviews').value) || 40;
  }
  if (document.getElementById('threshold-maxStock')) {
    thresholds.maxStock = parseInt(document.getElementById('threshold-maxStock').value) || 5;
  }

  if (!name) {
    etechAlert.warning('Validation Error', 'Badge name is required.');
    return;
  }

  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Badge "${name}"`, `Rule Type: ${ruleType} | Criteria: ${criteria} | Status: ${status}`)
    : await etechAlert.confirmCreate(`Badge "${name}"`, `Rule Type: ${ruleType} | Criteria: ${criteria} | Status: ${status}`);

  if (!confirmed) return;

  await saveBadge({
    id: id || undefined,
    name,
    color,
    purpose,
    ruleType,
    criteria,
    standardDescription,
    priority,
    status: status,
    isActive: status === 'ACTIVE',
    thresholds
  }, isEdit);

  closeAdminModal();
  renderTaxonomyTab();
  showToast(`Badge "${name}" rule saved successfully.`, 'success');
}

export async function confirmDeleteBadge(badgeId) {
  const badge = getBadgeById(badgeId);
  if (!badge) return;

  const confirmed = await etechAlert.confirmDelete(`Badge "${badge.name}"`, `Rule Type: ${badge.ruleType || 'Custom'}`);
  if (!confirmed) return;

  const success = await deleteBadge(badgeId);
  if (success) {
    renderTaxonomyTab();
    updateTrashSidebarBadge();
    showToast(`Badge "${badge.name}" moved to Trash Bin.`, 'success');
  } else {
    etechAlert.error('Protected System Badge', 'Cannot delete system protected badge.');
  }
}

// Directly attach to window
if (typeof window !== 'undefined') {
  Object.assign(window, {
    renderTaxonomyTab,
    toggleCategoryStatus,
    toggleBadgeStatus,
    runAutoBadgeAssigner,
    openCategoryModal,
    handleSaveCategorySubmit,
    confirmDeleteCategory,
    openBadgeModal,
    updateBadgeThresholdsUI,
    handleSaveBadgeSubmit,
    confirmDeleteBadge
  });
}
