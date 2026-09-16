// ============================================================
//  src/js/controller/product_management_controller.js — Products Controller
// ============================================================
import { getBranches } from './branch_controller.js';
import { 
  getStoredProducts, saveProduct, deleteProduct, getProductById, updateProductStatus, syncProductsFromApi 
} from '../models/data.js';
import { getCurrentUser } from './login_controller.js';
import { getCategories, getBadges } from '../models/taxonomy_data.js';
import { getBrands } from '../models/brand_data.js';
import {
  iconPackage,
  iconFolder,
  iconBuilding,
  iconTag,
  iconEdit,
  iconTrash,
  iconPlus,
  iconClose,
  renderStockStatusBadge,
  renderUserStatusBadge,
  formatLKR,
  showToast,
  etechAlert,
  renderTablePagination
} from '../util/index.js';


let productSearchQuery = '';
let productCategoryFilter = 'ALL';
let productStockFilter = 'ALL';
let productStatusFilter = 'ALL';
let productSortFilter = 'id_desc';
let productCurrentPage = 1;
let productPageSize = 10;

export function changeProductPage(newPage) {
  productCurrentPage = newPage;
  renderProductsTab(false);
}

export function changeProductPageSize(newSize) {
  productPageSize = newSize;
  productCurrentPage = 1;
  renderProductsTab(false);
}

/**
 * ============================================================
 * TAB: PRODUCT MANAGEMENT (STAFF & ADMIN)
 * ============================================================
 */
export function renderProductsTab(shouldSync = true) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  // By default, getStoredProducts excludes DELETED products
  let products = getStoredProducts();
  const branches = getBranches();
  const activeUser = getCurrentUser();

  const isStaff = activeUser && activeUser.role === 'STAFF';
  const staffBranchId = isStaff ? (activeUser.assignedBranch || 'BR-GAL') : null;
  const staffBranchObj = staffBranchId ? branches.find(b => b.id === staffBranchId) : null;

  // Handle staff banner visibility and text
  const staffBanner = document.getElementById('products-staff-banner');
  const staffBannerText = document.getElementById('products-staff-banner-text');
  const staffBranchBadge = document.getElementById('products-staff-branch-badge');
  if (staffBanner) {
    if (isStaff) {
      staffBanner.classList.remove('hidden');
      if (staffBannerText) {
        staffBannerText.innerHTML = `Logged in as Staff for <strong>${staffBranchObj ? staffBranchObj.name : 'Assigned Branch'}</strong>. You can view all catalog items, but stock edits are scoped to your assigned branch.`;
      }
      if (staffBranchBadge) {
        staffBranchBadge.textContent = `${staffBranchId} Hub`;
      }
    } else {
      staffBanner.classList.add('hidden');
    }
  }

  // Populate category select if options not yet populated
  const categorySelect = document.getElementById('product-category-filter');
  if (categorySelect && categorySelect.options.length <= 1) {
    const categories = getCategories();
    const catSet = new Set();
    categories.forEach(c => {
      const val = c.name || c.id;
      if (val) catSet.add(val);
    });
    (products || []).forEach(p => {
      if (p.category) catSet.add(p.category);
    });
    catSet.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      categorySelect.appendChild(opt);
    });
  }

  // Read filter values
  const searchInput = document.getElementById('product-search-input');
  if (searchInput && searchInput.value !== undefined) {
    productSearchQuery = searchInput.value.toLowerCase().trim();
  }
  if (categorySelect) {
    productCategoryFilter = categorySelect.value || 'ALL';
  }
  const stockSelect = document.getElementById('product-stock-filter');
  if (stockSelect) {
    productStockFilter = stockSelect.value || 'ALL';
  }
  const statusSelect = document.getElementById('product-status-filter');
  if (statusSelect) {
    productStatusFilter = statusSelect.value || 'ALL';
  }
  const sortSelect = document.getElementById('product-sort-filter');
  if (sortSelect) {
    productSortFilter = sortSelect.value || 'id_desc';
  }

  const renderRows = (productList) => {
    let filtered = productList || [];
    if (productCategoryFilter && productCategoryFilter !== 'ALL') {
      filtered = filtered.filter(p => {
        const cat = (p.category || '').toString().toLowerCase().trim();
        const target = productCategoryFilter.toLowerCase().trim();
        return cat === target || cat.includes(target) || target.includes(cat);
      });
    }
    if (productStockFilter && productStockFilter !== 'ALL') {
      filtered = filtered.filter(p => {
        const s = p.totalStock || 0;
        if (productStockFilter === 'IN_STOCK') return s > 5;
        if (productStockFilter === 'LOW_STOCK') return s > 0 && s <= 5;
        if (productStockFilter === 'OUT_OF_STOCK') return s <= 0;
        return true;
      });
    }
    if (productStatusFilter && productStatusFilter !== 'ALL') {
      filtered = filtered.filter(p => {
        const s = (p.productStatus || p.status || 'ACTIVE').toUpperCase();
        return s === productStatusFilter;
      });
    }
    if (productSearchQuery) {
      filtered = filtered.filter(p => 
        (p.name && p.name.toLowerCase().includes(productSearchQuery)) ||
        (p.sku && p.sku.toLowerCase().includes(productSearchQuery)) ||
        (p.category && p.category.toLowerCase().includes(productSearchQuery)) ||
        (p.brand && p.brand.toLowerCase().includes(productSearchQuery))
      );
    }

    // Sorting
    if (productSortFilter === 'price_asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (productSortFilter === 'price_desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (productSortFilter === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / productPageSize) || 1;
    if (productCurrentPage > totalPages) productCurrentPage = totalPages;
    if (productCurrentPage < 1) productCurrentPage = 1;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="py-8 text-center text-[#64748b] text-xs">
            ${productSearchQuery || productCategoryFilter !== 'ALL' || productStockFilter !== 'ALL' ? 'No catalog items matched your filter criteria.' : 'No products found.'}
          </td>
        </tr>
      `;
      renderTablePagination({
        containerId: 'products-pagination-container',
        currentPage: 1,
        pageSize: productPageSize,
        totalItems: 0,
        itemName: 'products',
        onPageChange: 'changeProductPage',
        onPageSizeChange: 'changeProductPageSize'
      });
      return;
    }

    const startIndex = (productCurrentPage - 1) * productPageSize;
    const pageItems = filtered.slice(startIndex, startIndex + productPageSize);

    tbody.innerHTML = pageItems.map(p => {
      const status = (p.productStatus || p.status || 'ACTIVE').toUpperCase();
      const isActive = status === 'ACTIVE';

      return `
        <tr class="hover:bg-[#f8fafc] transition-colors">
          <td class="py-3 px-3.5">
            <div class="flex items-center space-x-2.5">
              <img src="${p.image || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80'}" class="w-9 h-9 object-cover rounded bg-[#f8fafc] border border-[#e2e8f0] flex-shrink-0">
              <div>
                <p class="font-bold text-[#0f172a] text-xs line-clamp-1">${p.name}</p>
                <p class="text-[10px] text-blue-600 font-mono">${p.sku || p.id}</p>
              </div>
            </div>
          </td>
          <td class="py-3 px-3.5 uppercase text-[10px] font-mono font-bold text-blue-600">${p.category}</td>
          <td class="py-3 px-3.5 font-bold text-[#0f172a] font-mono text-xs">Rs. ${(p.price || 0).toLocaleString()}</td>
          <td class="py-3 px-3.5">
            <div class="flex flex-wrap gap-1">
              ${branches.map(b => {
                const qty = (p.branchStock && p.branchStock[b.id]) || 0;
                return `
                  <span class="px-1.5 py-0.5 rounded text-[9px] font-mono border ${qty > 0 ? 'bg-[#f8fafc] text-[#0f172a] border-[#e2e8f0]' : 'bg-rose-50 text-rose-700 border-rose-200'}">
                    <strong class="text-blue-600">${b.city}:</strong> ${qty}
                  </span>
                `;
              }).join('')}
            </div>
          </td>
          <td class="py-3 px-3.5">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${(p.totalStock || 0) > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${p.totalStock || 0} units
            </span>
          </td>
          <!-- 1-Click Status Switcher (ACTIVE / INACTIVE) -->
          <td class="py-3 px-3.5">
            <button type="button" onclick="toggleProductStatus(${p.id})"
              title="Click to toggle between ACTIVE and INACTIVE"
              class="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'}">
              <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
              <span>${status}</span>
            </button>
          </td>
          <td class="py-3 px-3.5 text-right">
            <div class="flex items-center justify-end space-x-1.5">
              <button onclick="editProduct(${p.id})" class="p-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 rounded border border-[#e2e8f0] transition-colors shadow-sm" title="Edit Product">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="confirmDeleteProduct(${p.id})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors shadow-sm" title="Delete Product">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderTablePagination({
      containerId: 'products-pagination-container',
      currentPage: productCurrentPage,
      pageSize: productPageSize,
      totalItems: totalItems,
      itemName: 'products',
      onPageChange: 'changeProductPage',
      onPageSizeChange: 'changeProductPageSize'
    });
  };

  renderRows(products);

  if (shouldSync) {
    syncProductsFromApi({ status: 'ALL', size: 200 }).then(liveList => {
      renderRows(liveList || getStoredProducts());
    }).catch(err => {
      console.error('[ProductController] Product sync error:', err);
      etechAlert.error('Connection Error', 'Unable to load products. Please try again.');
    });
  }
}

/**
 * 1-Click Status Toggler (ACTIVE <-> INACTIVE)
 */
export async function toggleProductStatus(productId) {
  const p = getProductById(productId);
  if (!p) return;

  const currentStatus = (p.productStatus || p.status || 'ACTIVE').toUpperCase();
  const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  await updateProductStatus(productId, nextStatus);
  showToast(`Product "${p.name}" status changed to ${nextStatus}.`, 'info');
  renderProductsTab(false);
}

/**
 * Filter Table via Search Input & Dropdowns
 */
export function filterProductsTable() {
  productCurrentPage = 1;
  const searchInput = document.getElementById('product-search-input');
  productSearchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const categorySelect = document.getElementById('product-category-filter');
  productCategoryFilter = categorySelect ? categorySelect.value : 'ALL';
  const stockSelect = document.getElementById('product-stock-filter');
  productStockFilter = stockSelect ? stockSelect.value : 'ALL';
  const statusSelect = document.getElementById('product-status-filter');
  productStatusFilter = statusSelect ? statusSelect.value : 'ALL';
  const sortSelect = document.getElementById('product-sort-filter');
  productSortFilter = sortSelect ? sortSelect.value : 'id_desc';
  renderProductsTab(false);
}

/**
 * Reset all product filters to defaults and re-render
 */
export function resetProductsFilter() {
  productCurrentPage = 1;
  const searchInput = document.getElementById('product-search-input');
  if (searchInput) searchInput.value = '';
  const categorySelect = document.getElementById('product-category-filter');
  if (categorySelect) categorySelect.value = 'ALL';
  const stockSelect = document.getElementById('product-stock-filter');
  if (stockSelect) stockSelect.value = 'ALL';
  const statusSelect = document.getElementById('product-status-filter');
  if (statusSelect) statusSelect.value = 'ALL';
  const sortSelect = document.getElementById('product-sort-filter');
  if (sortSelect) sortSelect.value = 'id_desc';
  productSearchQuery = '';
  productCategoryFilter = 'ALL';
  productStockFilter = 'ALL';
  productStatusFilter = 'ALL';
  productSortFilter = 'id_desc';
  renderProductsTab(false);
}

/**
 * Delete Product confirmation
 */
export async function confirmDeleteProduct(productId) {
  const p = getProductById(productId);
  const name = p ? p.name : 'Product';

  const confirmed = await etechAlert.confirmDelete(
    `Product "${name}"`,
    p ? `SKU: ${p.sku || 'N/A'} | Price: Rs. ${(p.price || 0).toLocaleString()}` : ''
  );

  if (!confirmed) return;

  await deleteProduct(productId);
  showToast(`"${name}" was deleted successfully.`, 'info');
  renderProductsTab();
}

// ── Dedicated Product Add/Edit Workspace Page ──
export function openProductFormPage(productId = null) {
  const product = productId ? getProductById(productId) : null;
  const branches = getBranches();
  const activeUser = getCurrentUser();

  const isStaff = activeUser && activeUser.role === 'STAFF';
  const staffBranchId = isStaff ? (activeUser.assignedBranch || 'BR-GAL') : null;
  const staffBranchObj = staffBranchId ? branches.find(b => b.id === staffBranchId) : null;

  // Multi-image array state (Max 5 images)
  let imagesArr = product && Array.isArray(product.images) && product.images.length > 0
    ? [...product.images]
    : (product && product.image ? [product.image] : ['']);

  if (imagesArr.length > 5) imagesArr = imagesArr.slice(0, 5);
  window.formImagesState = imagesArr;

  // Specs state array
  let specsState = [];
  if (product && product.specs) {
    specsState = Object.entries(product.specs).map(([k, v]) => ({ key: k, value: String(v) }));
  } else {
    specsState = [
      { key: 'Category', value: product ? product.category : 'laptops' },
      { key: 'Warranty', value: product ? (product.warranty || '2-Year Warranty') : '2-Year Warranty' }
    ];
  }
  window.formSpecsState = specsState;

  // Features state array
  let featuresState = [];
  if (product && Array.isArray(product.features)) {
    featuresState = [...product.features];
  } else {
    featuresState = [
      'High-performance processing architecture',
      'Ultra-efficient thermal management system'
    ];
  }
  window.formFeaturesState = featuresState;

  // Switch to product-form tab view
  const tabPanels = document.querySelectorAll('.dashboard-tab-panel');
  tabPanels.forEach(panel => panel.classList.add('hidden'));

  const formPanel = document.getElementById('tab-panel-product-form');
  if (formPanel) formPanel.classList.remove('hidden');

  // Update Page Title and Subtitle
  const titleEl = document.getElementById('product-form-title');
  const subtitleEl = document.getElementById('product-form-subtitle');
  const submitTextEl = document.getElementById('form-submit-btn-text');
  const submitBtnSec = document.getElementById('form-submit-btn-secondary');

  if (titleEl) titleEl.textContent = product ? `Edit Hardware: ${product.name}` : 'Add New Hardware Product';
  if (subtitleEl) subtitleEl.textContent = product ? `Editing SKU: ${product.sku || product.id}` : 'Fill in specifications, multi-image gallery (max 5), pricing, and branch stock.';
  if (submitTextEl) submitTextEl.textContent = product ? 'Save & Update Product' : 'Publish Product';
  if (submitBtnSec) submitBtnSec.textContent = product ? 'Save & Update Product' : 'Publish Product';

  // Handle Staff Banner on Form
  const formStaffBanner = document.getElementById('form-staff-banner');
  const formStaffBannerText = document.getElementById('form-staff-banner-text');
  if (formStaffBanner) {
    if (isStaff) {
      formStaffBanner.classList.remove('hidden');
      if (formStaffBannerText) {
        formStaffBannerText.innerHTML = `Staff Mode: Stock quantity editing is scoped to <strong>${staffBranchObj ? staffBranchObj.name : 'your assigned branch'}</strong>.`;
      }
    } else {
      formStaffBanner.classList.add('hidden');
    }
  }

  // Populate Basic Form Fields
  const form = document.getElementById('full-product-form');
  if (form) {
    form.setAttribute('data-product-id', product ? product.id : '');
    form.onsubmit = handleSaveProductSubmit;
  }

  document.getElementById('form-p-name').value = product ? product.name : '';

  // Populate dynamic category options
  const categorySelect = document.getElementById('form-p-category');
  if (categorySelect) {
    const allCategories = getCategories({ activeOnly: false });
    categorySelect.innerHTML = allCategories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');
    categorySelect.value = product ? (product.categoryId || product.category) : (allCategories[0]?.id || 'cat-laptops');
  }

  // Populate dynamic brand options
  const brandSelect = document.getElementById('form-p-brand');
  if (brandSelect) {
    const allBrands = getBrands({ activeOnly: false });
    brandSelect.innerHTML = allBrands.map(b => `
      <option value="${b.id}">${b.name}</option>
    `).join('');
    brandSelect.value = product ? (product.brandId || product.brand) : (allBrands[0]?.id || 'brd-asus');
  }

  // Populate dynamic badge options
  const badgeSelect = document.getElementById('form-p-badge');
  if (badgeSelect) {
    const allBadges = getBadges({ activeOnly: true }).filter(b => b.slug !== 'hot-deal' && !b.name.toLowerCase().includes('hot deal'));
    badgeSelect.innerHTML = `
      ${allBadges.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
      <option value="">None (No Badge)</option>
    `;
    badgeSelect.value = product && (product.badgeId || product.badge) ? (product.badgeId || product.badge) : '';
  }

  // Status selector (ACTIVE / INACTIVE)
  let statusSelect = document.getElementById('form-p-status');
  if (!statusSelect) {
    // Inject status dropdown into form row 1 if not present
    const brandContainer = document.getElementById('form-p-brand')?.parentElement?.parentElement;
    if (brandContainer) {
      const statusDiv = document.createElement('div');
      statusDiv.innerHTML = `
        <label class="block text-[#475569] font-bold mb-1">Status *</label>
        <select id="form-p-status" class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs font-bold">
          <option value="ACTIVE">ACTIVE (Visible in Catalog)</option>
          <option value="INACTIVE">INACTIVE (Hidden from Customers)</option>
        </select>
      `;
      brandContainer.appendChild(statusDiv);
      statusSelect = document.getElementById('form-p-status');
    }
  }
  if (statusSelect) {
    statusSelect.value = product ? (product.productStatus || product.status || 'ACTIVE').toUpperCase() : 'ACTIVE';
  }

  document.getElementById('form-p-sku').value = product ? product.sku : `ETC-LAP-${Math.floor(1000 + Math.random() * 9000)}`;
  document.getElementById('form-p-warranty').value = product ? (product.warranty || '2-Year Official Warranty') : '2-Year Official Warranty';
  document.getElementById('form-p-price').value = product ? product.price : '';
  document.getElementById('form-p-original-price').value = product ? (product.originalPrice || '') : '';
  document.getElementById('form-p-description').value = product ? (product.description || '') : '';
  document.getElementById('form-p-full-description').value = product ? (product.fullDescription || product.description || '') : '';

  // Render Sub-sections
  renderGalleryInputs();
  renderSpecsInputs();
  renderFeaturesInputs();
  renderBranchStockInputs(product, branches, isStaff, staffBranchId);
  updateLivePreview();
}

export function triggerProductFormSubmit() {
  const form = document.getElementById('full-product-form');
  if (form) {
    if (form.reportValidity()) {
      form.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }
}

// ── Multi-Image Gallery Manager (Max 5) ──
export function renderGalleryInputs() {
  const container = document.getElementById('image-inputs-container');
  const badge = document.getElementById('gallery-count-badge');
  const addBtn = document.getElementById('add-img-btn');
  if (!container) return;

  const images = window.formImagesState || [''];
  if (badge) badge.textContent = `${images.length} / 5 Images`;

  if (addBtn) {
    if (images.length >= 5) {
      addBtn.classList.add('opacity-50', 'pointer-events-none');
    } else {
      addBtn.classList.remove('opacity-50', 'pointer-events-none');
    }
  }

  container.innerHTML = images.map((imgUrl, idx) => `
    <div class="flex items-center space-x-2 bg-[#f8fafc] p-2.5 rounded-md border border-[#e2e8f0]">
      <div class="w-10 h-10 rounded bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center overflow-hidden flex-shrink-0">
        <img src="${imgUrl || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=100&q=80'}" onerror="this.src='https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=100&q=80'" class="w-full h-full object-cover">
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between text-[10px] text-[#64748b] mb-0.5">
          <span class="font-bold uppercase font-mono">${idx === 0 ? 'Primary Cover Image' : `Gallery Image #${idx + 1}`}</span>
        </div>
        <input type="url" required value="${imgUrl}" oninput="updateGalleryImage(${idx}, this.value)" placeholder="https://images.unsplash.com/..." class="w-full px-2.5 py-1.5 rounded bg-white border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600">
      </div>
      ${images.length > 1 ? `
        <button type="button" onclick="removeGalleryImage(${idx})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors self-end mb-0.5 shadow-sm" title="Remove image">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      ` : ''}
    </div>
  `).join('');
}

export function addGalleryImageInput() {
  if (!window.formImagesState) window.formImagesState = [];
  if (window.formImagesState.length < 5) {
    window.formImagesState.push('');
    renderGalleryInputs();
    updateLivePreview();
  }
}

export function updateGalleryImage(index, val) {
  if (window.formImagesState && window.formImagesState[index] !== undefined) {
    window.formImagesState[index] = val;
    updateLivePreview();
  }
}

export function removeGalleryImage(index) {
  if (window.formImagesState && window.formImagesState.length > 1) {
    window.formImagesState.splice(index, 1);
    renderGalleryInputs();
    updateLivePreview();
  }
}

// ── Specifications Manager (Key-Value) ──
export function renderSpecsInputs() {
  const container = document.getElementById('specs-inputs-container');
  if (!container) return;
  const specs = window.formSpecsState || [];

  container.innerHTML = specs.map((s, idx) => `
    <div class="flex items-center space-x-1.5">
      <input type="text" value="${s.key}" oninput="updateSpecItem(${idx}, 'key', this.value)" placeholder="Spec Name (e.g. CPU)" class="w-1/2 px-2.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600">
      <input type="text" value="${s.value}" oninput="updateSpecItem(${idx}, 'value', this.value)" placeholder="Value (e.g. Core i9)" class="w-1/2 px-2.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600">
      <button type="button" onclick="removeSpecItem(${idx})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors shadow-sm" title="Delete Spec">
        &times;
      </button>
    </div>
  `).join('');
}

export function addFormSpecInput() {
  if (!window.formSpecsState) window.formSpecsState = [];
  window.formSpecsState.push({ key: '', value: '' });
  renderSpecsInputs();
}

export function updateSpecItem(index, field, val) {
  if (window.formSpecsState && window.formSpecsState[index]) {
    window.formSpecsState[index][field] = val;
  }
}

export function removeSpecItem(index) {
  if (window.formSpecsState) {
    window.formSpecsState.splice(index, 1);
    renderSpecsInputs();
  }
}

// ── Feature Bullets Manager ──
export function renderFeaturesInputs() {
  const container = document.getElementById('features-inputs-container');
  if (!container) return;
  const features = window.formFeaturesState || [];

  container.innerHTML = features.map((f, idx) => `
    <div class="flex items-center space-x-1.5">
      <input type="text" value="${f}" oninput="updateFeatureItem(${idx}, this.value)" placeholder="Highlight feature bullet..." class="flex-1 px-2.5 py-1.5 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600">
      <button type="button" onclick="removeFeatureItem(${idx})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded transition-colors shadow-sm" title="Delete Feature">
        &times;
      </button>
    </div>
  `).join('');
}

export function addFormFeatureInput() {
  if (!window.formFeaturesState) window.formFeaturesState = [];
  window.formFeaturesState.push('');
  renderFeaturesInputs();
}

export function updateFeatureItem(index, val) {
  if (window.formFeaturesState && window.formFeaturesState[index] !== undefined) {
    window.formFeaturesState[index] = val;
  }
}

export function removeFeatureItem(index) {
  if (window.formFeaturesState) {
    window.formFeaturesState.splice(index, 1);
    renderFeaturesInputs();
  }
}

// ── Regional Branch Stock Allocation Inputs ──
export function renderBranchStockInputs(product, branches, isStaff, staffBranchId) {
  const container = document.getElementById('form-branch-stocks-container');
  if (!container) return;

  container.innerHTML = branches.map(b => {
    const qty = (product && product.branchStock && product.branchStock[b.id]) || 0;
    const isLocked = isStaff && b.id !== staffBranchId;

    return `
      <div class="bg-[#f8fafc] p-3 rounded-md border ${isLocked ? 'border-[#e2e8f0] opacity-50' : 'border-[#e2e8f0]'} space-y-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-[#0f172a] text-xs">${b.city}</span>
          <span class="text-[9px] font-mono text-blue-600 font-bold">${b.id}</span>
        </div>
        <input type="number" min="0" id="form-stock-${b.id}" value="${qty}" ${isLocked ? 'readonly disabled' : ''} oninput="updateLivePreview()" class="w-full px-2.5 py-1.5 rounded bg-white border border-[#e2e8f0] text-[#0f172a] font-mono font-bold text-xs focus:border-blue-600">
        ${isLocked ? '<span class="text-[9px] text-[#64748b] block">Locked for Staff</span>' : ''}
      </div>
    `;
  }).join('');
}

// ── Live Product Card Preview (Right Column) ──
export function updateLivePreview() {
  const previewContainer = document.getElementById('live-product-preview-card');
  if (!previewContainer) return;

  const name = document.getElementById('form-p-name')?.value || 'Product Title Preview';
  const category = document.getElementById('form-p-category')?.value || 'laptops';
  const badge = document.getElementById('form-p-badge')?.value || 'New Arrival';
  const price = parseFloat(document.getElementById('form-p-price')?.value) || 0;
  const origPrice = parseFloat(document.getElementById('form-p-original-price')?.value) || 0;
  const sku = document.getElementById('form-p-sku')?.value || 'ETC-SKU-000';
  const warranty = document.getElementById('form-p-warranty')?.value || '2-Year Warranty';
  const desc = document.getElementById('form-p-description')?.value || 'Product description snippet preview...';

  const images = window.formImagesState && window.formImagesState.filter(u => u && u.trim() !== '').length > 0
    ? window.formImagesState.filter(u => u && u.trim() !== '')
    : ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80'];

  previewContainer.innerHTML = `
    <div class="rounded-md bg-white border border-[#e2e8f0] p-3 space-y-3 shadow-sm">
      <!-- Main Preview Cover Image -->
      <div class="relative w-full h-40 rounded bg-[#f8fafc] overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
        <img id="preview-main-img" src="${images[0]}" class="w-full h-full object-cover">
        ${badge ? `
          <div class="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase shadow-sm">
            ${badge}
          </div>
        ` : ''}

        <div class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-white/90 text-blue-600 text-[9px] font-bold border border-[#e2e8f0] shadow-sm">
          ${images.length} Image${images.length > 1 ? 's' : ''}
        </div>
      </div>

      <!-- Preview Image Thumbnails -->
      ${images.length > 1 ? `
        <div class="flex items-center space-x-1.5 overflow-x-auto pb-1">
          ${images.map((img) => `
            <img src="${img}" onclick="document.getElementById('preview-main-img').src='${img}'" class="w-8 h-8 rounded object-cover bg-[#f8fafc] border border-[#e2e8f0] cursor-pointer hover:border-blue-600 transition-colors flex-shrink-0">
          `).join('')}
        </div>
      ` : ''}

      <div class="space-y-1 text-xs">
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-bold text-blue-600 uppercase font-mono tracking-wider">${category}</span>
          <span class="text-[9px] text-[#64748b] font-mono">${sku}</span>
        </div>

        <h4 class="font-bold text-[#0f172a] text-xs line-clamp-1">${name}</h4>
        <p class="text-[10px] text-[#64748b] line-clamp-2 leading-relaxed">${desc}</p>
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-[#e2e8f0]">
        <div>
          ${origPrice > price ? `<span class="text-[9px] text-[#94a3b8] line-through mr-1 font-mono">Rs. ${origPrice.toLocaleString()}</span>` : ''}
          <span class="text-sm font-extrabold text-[#0f172a] font-mono">Rs. ${price.toLocaleString()}</span>
        </div>
        <span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
          ${warranty}
        </span>
      </div>
    </div>
  `;
}

export function editProduct(productId) {
  openProductFormPage(productId);
}

export function openProductModal(productId = null) {
  openProductFormPage(productId);
}

export async function handleSaveProductSubmit(e) {
  e.preventDefault();
  const productIdAttr = e.target.getAttribute('data-product-id');
  const productId = productIdAttr ? parseInt(productIdAttr) : null;
  const branches = getBranches();
  const activeUser = getCurrentUser();
  const existingProduct = productId ? getProductById(productId) : null;
  const branchStock = existingProduct && existingProduct.branchStock ? { ...existingProduct.branchStock } : {};

  const isStaff = activeUser && activeUser.role === 'STAFF';
  const staffBranchId = isStaff ? (activeUser.assignedBranch || 'BR-GAL') : null;

  branches.forEach(b => {
    const input = document.getElementById(`form-stock-${b.id}`);
    if (input && (!isStaff || b.id === staffBranchId)) {
      branchStock[b.id] = parseInt(input.value || 0) || 0;
    } else if (branchStock[b.id] === undefined) {
      branchStock[b.id] = 0;
    }
  });

  const images = window.formImagesState && window.formImagesState.filter(u => u && typeof u === 'string' && u.trim() !== '').length > 0
    ? window.formImagesState.filter(u => u && typeof u === 'string' && u.trim() !== '').slice(0, 5)
    : ["https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80"];

  const specsObj = {};
  if (window.formSpecsState && Array.isArray(window.formSpecsState)) {
    window.formSpecsState.forEach(s => {
      if (s && s.key && s.value && s.key.trim() !== '') {
        specsObj[s.key.trim()] = s.value.trim();
      }
    });
  }

  const featuresArr = window.formFeaturesState && Array.isArray(window.formFeaturesState)
    ? window.formFeaturesState.map(f => typeof f === 'string' ? f.trim() : '').filter(f => f.length > 0)
    : ["High Performance Tech Hardware"];

  const categoryVal = document.getElementById('form-p-category').value;
  const brandVal = document.getElementById('form-p-brand') ? document.getElementById('form-p-brand').value : (existingProduct ? existingProduct.brandId : 'brd-asus');
  const badgeVal = document.getElementById('form-p-badge') ? document.getElementById('form-p-badge').value : (existingProduct ? existingProduct.badgeId : '');
  const priceVal = parseFloat(document.getElementById('form-p-price').value);
  const origPriceVal = document.getElementById('form-p-original-price').value ? parseFloat(document.getElementById('form-p-original-price').value) : priceVal;
  const statusVal = document.getElementById('form-p-status') ? document.getElementById('form-p-status').value : (existingProduct ? existingProduct.productStatus : 'ACTIVE');

  const productData = {
    id: productId,
    name: document.getElementById('form-p-name').value,
    category: categoryVal,
    categoryId: categoryVal,
    brand: brandVal,
    brandId: brandVal,
    price: priceVal,
    originalPrice: origPriceVal,
    sku: document.getElementById('form-p-sku').value || `ETC-${categoryVal.replace(/^cat-/, '').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    warranty: document.getElementById('form-p-warranty').value || '1-Year Warranty',
    image: images[0],
    images: images,
    badge: badgeVal,
    badgeId: badgeVal,
    description: document.getElementById('form-p-description').value || '',
    fullDescription: document.getElementById('form-p-full-description').value || document.getElementById('form-p-description').value || '',
    specs: Object.keys(specsObj).length > 0 ? specsObj : { "Category": categoryVal },
    features: featuresArr.length > 0 ? featuresArr : ["High Performance Hardware"],
    branchStock: branchStock,
    productStatus: statusVal,
    status: statusVal
  };

  const isEdit = Boolean(productId);
  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Product "${productData.name}"`, `Category: ${categoryVal} | Brand: ${brandVal} | Price: Rs. ${(priceVal || 0).toLocaleString()} | Status: ${statusVal}`)
    : await etechAlert.confirmCreate(`Product "${productData.name}"`, `Category: ${categoryVal} | Brand: ${brandVal} | Price: Rs. ${(priceVal || 0).toLocaleString()} | Status: ${statusVal}`);

  if (!confirmed) return;

  try {
    await saveProduct(productData);
    showToast(`Product "${productData.name}" saved successfully.`, 'success');
    window.dispatchEvent(new CustomEvent('productsUpdated'));
    if (window.switchAdminTab) {
      window.switchAdminTab('products');
    }
    renderProductsTab();
  } catch (err) {
    console.error('[ProductController] Failed to save product:', err);
    etechAlert.error('Save Failed', err.message || 'Unable to save product. Please try again.');
  }
}

// Export aliases
export const renderFormImageInputs = renderGalleryInputs;
export const removeGalleryImageInput = removeGalleryImage;
export const renderFormSpecsInputs = renderSpecsInputs;
export const removeFormSpecInput = removeSpecItem;
export const renderFormFeaturesInputs = renderFeaturesInputs;
export const removeFormFeatureInput = removeFeatureItem;

if (typeof window !== 'undefined') {
  Object.assign(window, {
    renderProductsTab,
    toggleProductStatus,
    filterProductsTable,
    resetProductsFilter,
    changeProductPage,
    changeProductPageSize,
    confirmDeleteProduct,
    openProductFormPage,
    triggerProductFormSubmit,
    renderGalleryInputs,
    renderFormImageInputs,
    addGalleryImageInput,
    updateGalleryImage,
    removeGalleryImage,
    removeGalleryImageInput,
    renderSpecsInputs,
    renderFormSpecsInputs,
    addFormSpecInput,
    updateSpecItem,
    removeSpecItem,
    removeFormSpecInput,
    renderFeaturesInputs,
    renderFormFeaturesInputs,
    addFormFeatureInput,
    updateFeatureItem,
    removeFeatureItem,
    removeFormFeatureInput,
    renderBranchStockInputs,
    updateLivePreview,
    editProduct,
    openProductModal,
    handleSaveProductSubmit
  });
}