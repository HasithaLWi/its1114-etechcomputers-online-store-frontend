// ============================================================
//  src/js/controller/shop_controller.js — Shop Catalog & DB Multi-Filter Logic
// ============================================================
import { products, getStoredProducts, saveStoredProducts } from '../models/data.js';
import { ProductsApi } from '../api/productsApi.js';
import { addToCart } from './cart_controller.js';
import { viewProductDetails } from './product-details_controller.js';
import { getCategories, syncCategoriesFromApi } from '../models/taxonomy_data.js';
import { getBrands, getBrandBySlug, syncBrandsFromApi } from '../models/brand_data.js';
import { isInWishlist, toggleWishlist } from './wishlist_controller.js';
import { etechAlert } from '../util/etech_alert.js';
import {
  iconFolder,
  iconBuilding,
  iconTag,
  iconStar,
  iconClose,
  iconEye,
  iconCart,
  iconHeart,
  formatLKR
} from '../util/index.js';

// Module-level state for multi-selected filters (IDs)
let selectedCategoryIds = [];
let selectedBrandIds = [];

// Module-level state for server-side pagination
let currentShopPage = 0;
const SHOP_PAGE_SIZE = 12;
let totalShopPages = 1;
let totalShopElements = 0;

// Backwards compatibility references
export let selectedCategorySlugs = selectedCategoryIds;
export let selectedBrandSlugs = selectedBrandIds;

/**
 * Resolves any category slug, name, or raw ID to its canonical backend database ID (e.g. 'cat-laptops')
 */
export function resolveCategoryId(input) {
  if (!input) return '';
  const norm = String(input).trim().toLowerCase();
  const categories = getCategories({ includeDeleted: true });
  const found = categories.find(c =>
    (c.id && c.id.toLowerCase() === norm) ||
    (c.slug && c.slug.toLowerCase() === norm) ||
    (c.name && c.name.toLowerCase() === norm)
  );
  if (found) return found.id;
  return norm.startsWith('cat-') ? norm : `cat-${norm}`;
}

/**
 * Resolves any brand slug, name, or raw ID to its canonical backend database ID (e.g. 'brd-asus')
 */
export function resolveBrandId(input) {
  if (!input) return '';
  const norm = String(input).trim().toLowerCase();
  const brands = getBrands({ includeDeleted: true });
  const found = brands.find(b =>
    (b.id && b.id.toLowerCase() === norm) ||
    (b.slug && b.slug.toLowerCase() === norm) ||
    (b.name && b.name.toLowerCase() === norm)
  );
  if (found) return found.id;
  return norm.startsWith('brd-') ? norm : `brd-${norm}`;
}

/**
 * ============================================================
 * CATEGORY FILTER MANAGEMENT
 * ============================================================
 */
export function getSelectedCategories() {
  return [...selectedCategoryIds];
}

export function addCategoryFilter(idOrSlug) {
  if (!idOrSlug) return;
  const id = resolveCategoryId(idOrSlug);
  if (!selectedCategoryIds.includes(id)) {
    selectedCategoryIds.push(id);
  }
  renderCategoryCombobox();
  renderSelectedCategoryTags();
}

export function removeCategoryFilter(idOrSlug) {
  if (!idOrSlug) return;
  const id = resolveCategoryId(idOrSlug);
  selectedCategoryIds = selectedCategoryIds.filter(i => i !== id && i !== idOrSlug);
  renderCategoryCombobox();
  renderSelectedCategoryTags();
}

export function clearCategoryFilters() {
  selectedCategoryIds = [];
  renderCategoryCombobox();
  renderSelectedCategoryTags();
}

export function renderCategoryCombobox() {
  const combobox = document.getElementById('shop-category-combobox');
  if (!combobox) return;

  const categories = getCategories({ activeOnly: true });
  let optionsHtml = `<option value="" disabled selected>+ Select category...</option>`;

  categories.forEach(c => {
    const isSelected = selectedCategoryIds.some(id => 
      id.toLowerCase() === c.id.toLowerCase() || 
      (c.slug && id.toLowerCase() === c.slug.toLowerCase())
    );
    const icon = c.icon ? `${c.icon} ` : '';
    if (isSelected) {
      optionsHtml += `<option value="${c.id}" disabled class="text-[#94a3b8] bg-[#f8fafc]">${icon}${c.name} ✓ (Selected)</option>`;
    } else {
      optionsHtml += `<option value="${c.id}" class="text-[#0f172a] bg-white">${icon}${c.name}</option>`;
    }
  });

  combobox.innerHTML = optionsHtml;
  combobox.value = '';
}

export function renderSelectedCategoryTags() {
  const tagsContainer = document.getElementById('shop-selected-category-tags');
  const countBadge = document.getElementById('category-selected-badge');
  if (!tagsContainer) return;

  const categories = getCategories({ activeOnly: true });

  if (selectedCategoryIds.length === 0) {
    if (countBadge) {
      countBadge.classList.add('hidden');
      countBadge.textContent = '0 selected';
    }
    tagsContainer.innerHTML = `<span class="text-[11px] text-[#94a3b8] italic mt-0.5">Showing all categories</span>`;
    return;
  }

  if (countBadge) {
    countBadge.classList.remove('hidden');
    countBadge.textContent = `${selectedCategoryIds.length} selected`;
  }

  tagsContainer.innerHTML = selectedCategoryIds.map(catId => {
    const cat = categories.find(c => 
      c.id.toLowerCase() === catId.toLowerCase() || 
      (c.slug && c.slug.toLowerCase() === catId.toLowerCase()) || 
      (c.name && c.name.toLowerCase() === catId.toLowerCase())
    );
    const name = cat ? cat.name : catId;
    const icon = cat && cat.icon ? `${cat.icon} ` : '🏷️ ';

    return `
      <span class="inline-flex items-center space-x-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md shadow-sm transition-all hover:bg-blue-100 group">
        <span class="truncate max-w-[130px]" title="${name}">${icon}${name}</span>
        <button type="button" onclick="removeCategoryFilter('${catId}'); applyProductFilters();"
          class="text-blue-600 hover:text-blue-900 hover:bg-blue-200/60 rounded p-0.5 ml-0.5 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
          title="Remove ${name} filter">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </span>
    `;
  }).join('');
}

/**
 * ============================================================
 * BRAND FILTER MANAGEMENT
 * ============================================================
 */
export function getSelectedBrands() {
  return [...selectedBrandIds];
}

export function addBrandFilter(idOrSlug) {
  if (!idOrSlug) return;
  const id = resolveBrandId(idOrSlug);
  if (!selectedBrandIds.includes(id)) {
    selectedBrandIds.push(id);
  }
  renderBrandCombobox();
  renderSelectedBrandTags();
}

export function removeBrandFilter(idOrSlug) {
  if (!idOrSlug) return;
  const id = resolveBrandId(idOrSlug);
  selectedBrandIds = selectedBrandIds.filter(i => i !== id && i !== idOrSlug);
  renderBrandCombobox();
  renderSelectedBrandTags();
}

export function clearBrandFilters() {
  selectedBrandIds = [];
  renderBrandCombobox();
  renderSelectedBrandTags();
}

export function renderBrandCombobox() {
  const combobox = document.getElementById('shop-brand-combobox');
  if (!combobox) return;

  const brands = getBrands({ activeOnly: true });
  let optionsHtml = `<option value="" disabled selected>+ Select brand...</option>`;

  brands.forEach(b => {
    const isSelected = selectedBrandIds.some(id => 
      id.toLowerCase() === b.id.toLowerCase() || 
      (b.slug && id.toLowerCase() === b.slug.toLowerCase()) || 
      (b.name && id.toLowerCase() === b.name.toLowerCase())
    );
    if (isSelected) {
      optionsHtml += `<option value="${b.id}" disabled class="text-[#94a3b8] bg-[#f8fafc]">${b.name} ✓ (Selected)</option>`;
    } else {
      optionsHtml += `<option value="${b.id}" class="text-[#0f172a] bg-white">${b.name}</option>`;
    }
  });

  combobox.innerHTML = optionsHtml;
  combobox.value = '';
}

export function renderSelectedBrandTags() {
  const tagsContainer = document.getElementById('shop-selected-brand-tags');
  const countBadge = document.getElementById('brand-selected-badge');
  if (!tagsContainer) return;

  const brands = getBrands({ activeOnly: true });

  if (selectedBrandIds.length === 0) {
    if (countBadge) {
      countBadge.classList.add('hidden');
      countBadge.textContent = '0 selected';
    }
    tagsContainer.innerHTML = `<span class="text-[11px] text-[#94a3b8] italic mt-0.5">Showing all brands</span>`;
    return;
  }

  if (countBadge) {
    countBadge.classList.remove('hidden');
    countBadge.textContent = `${selectedBrandIds.length} selected`;
  }

  tagsContainer.innerHTML = selectedBrandIds.map(brandId => {
    const brand = brands.find(b => 
      b.id.toLowerCase() === brandId.toLowerCase() || 
      (b.slug && b.slug.toLowerCase() === brandId.toLowerCase()) || 
      (b.name && b.name.toLowerCase() === brandId.toLowerCase())
    );
    const name = brand ? brand.name : brandId;

    return `
      <span class="inline-flex items-center space-x-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md shadow-sm transition-all hover:bg-indigo-100 group">
        <span class="truncate max-w-[130px]" title="${name}">${name}</span>
        <button type="button" onclick="removeBrandFilter('${brandId}'); applyProductFilters();"
          class="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-200/60 rounded p-0.5 ml-0.5 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
          title="Remove ${name} filter">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </span>
    `;
  }).join('');
}

/**
 * ============================================================
 * SHOP INITIALIZATION & URL QUERY PARSING
 * ============================================================
 */
export async function initShopLogic(queryPart = '') {
  const searchInput = document.getElementById('search-input');
  const priceSlider = document.getElementById('price-slider');
  const priceValueDisplay = document.getElementById('price-value');
  const sortSelect = document.getElementById('sort-select');
  const resetBtn = document.getElementById('reset-filters-btn');
  const applyBtn = document.getElementById('apply-filters-btn');
  const catCombobox = document.getElementById('shop-category-combobox');
  const brandCombobox = document.getElementById('shop-brand-combobox');

  // Ensure categories and brands are available from live API before resolving filters
  const existingCats = getCategories({ activeOnly: true });
  const existingBrands = getBrands({ activeOnly: true });
  if (existingCats.length === 0 || existingBrands.length === 0) {
    try {
      await Promise.allSettled([
        syncCategoriesFromApi({ activeOnly: true }),
        syncBrandsFromApi({ activeOnly: true })
      ]);
    } catch (e) {
      console.warn('[ShopController] Initial category/brand sync notice:', e);
    }
  }

  // Parse query string (e.g. cat=cat-laptops or cat=laptops or brand=brd-asus or brand=asus)
  let initialCategory = '';
  let initialBrand = '';
  let initialSearch = '';
  let initialSort = 'featured';

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    initialCategory = params.get('cat') || params.get('category') || '';
    initialBrand = params.get('brand') || params.get('b') || '';
    initialSearch = params.get('search') || params.get('q') || params.get('keyword') || '';
    initialSort = params.get('sort') || params.get('order') || 'featured';
  }

  if (initialCategory) {
    selectedCategoryIds = initialCategory.split(',')
      .map(s => resolveCategoryId(s))
      .filter(Boolean);
  } else {
    selectedCategoryIds = [];
  }

  if (initialBrand) {
    selectedBrandIds = initialBrand.split(',')
      .map(s => resolveBrandId(s))
      .filter(Boolean);
  } else {
    selectedBrandIds = [];
  }

  if (searchInput) {
    searchInput.value = initialSearch;
  }
  const headerSearchInput = document.getElementById('header-search-input');
  if (headerSearchInput && initialSearch) {
    headerSearchInput.value = initialSearch;
  }

  if (sortSelect) {
    sortSelect.value = initialSort || 'featured';
  }

  // Populate comboboxes and active tags
  renderCategoryCombobox();
  renderSelectedCategoryTags();
  renderBrandCombobox();
  renderSelectedBrandTags();

  // Event Listeners for Comboboxes (tags updated, filter applied when clicking Apply button)
  if (catCombobox) {
    catCombobox.onchange = (e) => {
      const chosenId = e.target.value;
      if (chosenId) addCategoryFilter(chosenId);
    };
  }

  if (brandCombobox) {
    brandCombobox.onchange = (e) => {
      const chosenId = e.target.value;
      if (chosenId) addBrandFilter(chosenId);
    };
  }

  // Only attach CHANGE event listener to search bar
  if (searchInput) {
    searchInput.oninput = null;
    searchInput.onkeyup = null;
    searchInput.onchange = () => {
      console.log('[ShopController] Search input change triggered -> executing DB filter');
      applyProductFilters();
    };
    searchInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyProductFilters();
      }
    };
  }

  // Price slider updates text display without querying DB until Apply button is clicked
  if (priceSlider) {
    priceSlider.onchange = null;
    priceSlider.oninput = (e) => {
      const val = parseInt(e.target.value || 1000000);
      if (priceValueDisplay) priceValueDisplay.textContent = `Rs. ${val.toLocaleString()}`;
    };
  }

  // Sort select does not auto-filter on change; applies when Apply button is clicked
  if (sortSelect) {
    sortSelect.onchange = null;
  }

  // Apply Filters Button
  if (applyBtn) {
    applyBtn.onclick = () => {
      console.log('[ShopController] Apply Filters button clicked -> querying database');
      applyProductFilters();
    };
  }

  // Reset Filters Button
  if (resetBtn) {
    resetBtn.onclick = () => {
      resetProductFilters();
    };
  }

  // Initial load: Fetch live matching products directly from database
  await applyProductFilters();

  // Background refresh for categories & brands taxonomies
  Promise.all([
    syncCategoriesFromApi({ activeOnly: true }),
    syncBrandsFromApi({ activeOnly: true })
  ]).then(() => {
    renderCategoryCombobox();
    renderSelectedCategoryTags();
    renderBrandCombobox();
    renderSelectedBrandTags();
  }).catch(() => {});
}

/**
 * ============================================================
 * FILTER, SORT & RENDER CATALOG PRODUCTS DIRECTLY FROM DATABASE
 * ============================================================
 */
export async function applyProductFilters(targetPage = 0) {
  const grid = document.getElementById('product-grid');
  const itemCountEl = document.getElementById('item-count');
  const noProductsMsg = document.getElementById('no-products-msg');
  const activeTagsContainer = document.getElementById('active-filter-tags');

  if (!grid) return;

  if (typeof targetPage === 'number') {
    currentShopPage = targetPage;
  } else {
    currentShopPage = 0;
  }

  const searchInput = document.getElementById('search-input');
  const priceSlider = document.getElementById('price-slider');
  const sortSelect = document.getElementById('sort-select');

  const searchQuery = searchInput ? searchInput.value.trim() : '';
  const maxPrice = priceSlider ? parseFloat(priceSlider.value) : 1000000;
  const sortOption = sortSelect ? sortSelect.value : 'featured';

  // Show live querying spinner state
  grid.innerHTML = `
    <div class="col-span-full py-16 text-center space-y-3">
      <div class="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs font-semibold text-slate-500">Loading products...</p>
    </div>
  `;
  if (noProductsMsg) noProductsMsg.classList.add('hidden');

  // Map sort option to DB Pageable parameters
  let sortBy = 'id';
  let sortDir = 'asc';
  if (sortOption === 'price-low') {
    sortBy = 'price';
    sortDir = 'asc';
  } else if (sortOption === 'price-high') {
    sortBy = 'price';
    sortDir = 'desc';
  } else if (sortOption === 'rating') {
    sortBy = 'rating';
    sortDir = 'desc';
  } else if (sortOption === 'name') {
    sortBy = 'name';
    sortDir = 'asc';
  } else if (sortOption === 'newest') {
    sortBy = 'id';
    sortDir = 'desc';
  }

  // Build backend query parameters for GET /api/v1/products/filter
  const filterParams = {
    status: 'ACTIVE',
    page: currentShopPage,
    size: SHOP_PAGE_SIZE,
    sortBy: sortBy,
    sortDir: sortDir
  };

  if (searchQuery) {
    filterParams.search = searchQuery;
  }

  if (maxPrice < 1000000) {
    filterParams.maxPrice = maxPrice;
  }

  if (selectedCategoryIds.length === 1) {
    filterParams.category = selectedCategoryIds[0];
  }

  if (selectedBrandIds.length === 1) {
    filterParams.brand = selectedBrandIds[0];
  }

  try {
    console.log('[ShopController] Fetching filtered products from DB API:', filterParams);
    const res = await ProductsApi.getFiltered(filterParams);
    let apiList = [];
    if (res && Array.isArray(res.content)) {
      apiList = res.content;
      totalShopPages = res.totalPages !== undefined ? res.totalPages : 1;
      totalShopElements = res.totalElements !== undefined ? res.totalElements : apiList.length;
      currentShopPage = res.page !== undefined ? res.page : currentShopPage;
    } else if (Array.isArray(res)) {
      apiList = res;
      totalShopPages = Math.ceil(apiList.length / SHOP_PAGE_SIZE) || 1;
      totalShopElements = apiList.length;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
      totalShopPages = Math.ceil(apiList.length / SHOP_PAGE_SIZE) || 1;
      totalShopElements = apiList.length;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
      totalShopPages = Math.ceil(apiList.length / SHOP_PAGE_SIZE) || 1;
      totalShopElements = apiList.length;
    }

    const categoriesList = getCategories({ includeDeleted: true });
    const brandsList = getBrands({ includeDeleted: true });

    // Normalize products from DB response
    let productsList = apiList.map(p => {
      const brandObj = brandsList.find(b => 
        (p.brandId && b.id.toLowerCase() === p.brandId.toLowerCase()) || 
        (b.slug && p.brand && b.slug.toLowerCase() === p.brand.toLowerCase()) || 
        (b.name && p.brand && b.name.toLowerCase() === p.brand.toLowerCase())
      );
      const catObj = categoriesList.find(c => 
        (p.categoryId && c.id.toLowerCase() === p.categoryId.toLowerCase()) || 
        (c.slug && p.category && c.slug.toLowerCase() === p.category.toLowerCase()) || 
        (c.name && p.category && c.name.toLowerCase() === p.category.toLowerCase())
      );

      return {
        id: p.id,
        name: p.name || p.title || '',
        brand: brandObj ? brandObj.name : (p.brand || ''),
        brandId: p.brandId || (brandObj ? brandObj.id : ''),
        brandSlug: brandObj ? brandObj.slug : (p.brandSlug || ''),
        category: catObj ? catObj.slug : (p.category || ''),
        categoryId: p.categoryId || (catObj ? catObj.id : ''),
        categorySlug: catObj ? catObj.slug : (p.categorySlug || ''),
        categoryName: catObj ? catObj.name : (p.categoryName || (p.category || '')),
        price: Number(p.price || 0),
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        rating: Number(p.rating || 4.8),
        reviews: Number(p.reviews || p.reviewsCount || 0),
        reviewsCount: Number(p.reviewsCount || p.reviews || 0),
        image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
        description: p.description || '',
        fullDescription: p.fullDescription || p.description || '',
        inStock: p.inStock !== undefined ? p.inStock : ((p.totalStock || 0) > 0),
        totalStock: Number(p.totalStock || 0),
        branchStock: p.branchStock || {},
        badge: p.badge || (p.badgeId ? p.badgeId.replace('bdg-', '').toUpperCase() : ''),
        badgeId: p.badgeId || '',
        sku: p.sku || '',
        warranty: p.warranty || '1-Year Warranty',
        specs: p.specs || {},
        features: Array.isArray(p.features) ? p.features : [],
        productStatus: (p.productStatus || p.status || 'ACTIVE').toUpperCase(),
        status: (p.productStatus || p.status || 'ACTIVE').toUpperCase()
      };
    });

    // Multi-category filtering in memory if >1 category selected
    if (selectedCategoryIds.length > 1) {
      productsList = productsList.filter(product => {
        const pCatId = (product.categoryId || '').toLowerCase().trim();
        const pCatSlug = (product.categorySlug || product.category || '').toLowerCase().trim();
        return selectedCategoryIds.some(targetId => {
          const normTarget = targetId.toLowerCase().trim();
          return pCatId === normTarget || pCatSlug === normTarget || normTarget.endsWith(pCatSlug);
        });
      });
    }

    // Multi-brand filtering in memory if >1 brand selected
    if (selectedBrandIds.length > 1) {
      productsList = productsList.filter(product => {
        const pBrandId = (product.brandId || '').toLowerCase().trim();
        const pBrandSlug = (product.brandSlug || '').toLowerCase().trim();
        return selectedBrandIds.some(targetId => {
          const normTarget = targetId.toLowerCase().trim();
          return pBrandId === normTarget || pBrandSlug === normTarget || normTarget.endsWith(pBrandSlug);
        });
      });
    }

    // Price safety check
    if (maxPrice < 1000000) {
      productsList = productsList.filter(p => Number(p.price || 0) <= maxPrice);
    }

    // Sort client-side ensuring exact matching order
    if (sortOption === 'price-low') {
      productsList.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === 'price-high') {
      productsList.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortOption === 'rating') {
      productsList.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOption === 'name') {
      productsList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'newest') {
      productsList.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    // Sync in-memory store so other views remain updated
    if (productsList.length > 0) {
      saveStoredProducts(productsList);
    }

    renderProductsGridUI(productsList, searchQuery, maxPrice);
    renderShopPagination(currentShopPage, totalShopPages, totalShopElements);

  } catch (err) {
    console.error('[ShopController] DB filter request error:', err);
    etechAlert.error('Connection Error', 'Unable to load products. Please check your connection and try again.');
    const paginationContainer = document.getElementById('shop-pagination-container');
    if (paginationContainer) paginationContainer.classList.add('hidden');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center space-y-4">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-black text-slate-900">Unable to Load Products</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">Unable to connect to the store service. Please check your connection and try again.</p>
          </div>
          <button onclick="applyProductFilters(0)" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-all cursor-pointer">
            Retry Connection
          </button>
        </div>
      `;
    }
    const itemCountEl = document.getElementById('item-count');
    if (itemCountEl) itemCountEl.textContent = '0';
    if (noProductsMsg) noProductsMsg.classList.add('hidden');
  }
}

/**
 * Reset all filter controls and fetch clean product list from DB
 */
export async function resetProductFilters() {
  const searchInput = document.getElementById('search-input');
  const priceSlider = document.getElementById('price-slider');
  const priceValueDisplay = document.getElementById('price-value');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = '';
  if (priceSlider) {
    priceSlider.value = 1000000;
    if (priceValueDisplay) priceValueDisplay.textContent = 'Rs. 1,000,000';
  }
  if (sortSelect) sortSelect.value = 'featured';

  selectedCategoryIds = [];
  selectedBrandIds = [];
  currentShopPage = 0;

  renderCategoryCombobox();
  renderSelectedCategoryTags();
  renderBrandCombobox();
  renderSelectedBrandTags();

  await applyProductFilters(0);
}

/**
 * Renders the products grid and active filter tags into the DOM
 */
function renderProductsGridUI(productsList, searchQuery = '', maxPrice = 1000000) {
  const grid = document.getElementById('product-grid');
  const itemCountEl = document.getElementById('item-count');
  const noProductsMsg = document.getElementById('no-products-msg');
  const activeTagsContainer = document.getElementById('active-filter-tags');

  if (!grid) return;

  const categoriesList = getCategories({ includeDeleted: true });
  const brandsList = getBrands({ includeDeleted: true });

  // Update item count UI with total elements
  if (itemCountEl) itemCountEl.textContent = totalShopElements !== undefined ? totalShopElements : productsList.length;

  // Toggle empty state message
  if (productsList.length === 0) {
    grid.innerHTML = '';
    if (noProductsMsg) noProductsMsg.classList.remove('hidden');
    const paginationContainer = document.getElementById('shop-pagination-container');
    if (paginationContainer) paginationContainer.classList.add('hidden');
  } else {
    if (noProductsMsg) noProductsMsg.classList.add('hidden');
  }

  // Update active filter tags UI (Top bar above products)
  if (activeTagsContainer) {
    let tagsHtml = '';

    if (selectedCategoryIds.length > 0) {
      tagsHtml += selectedCategoryIds.map(catId => {
        const cat = categoriesList.find(c => 
          c.id.toLowerCase() === catId.toLowerCase() || 
          (c.slug && c.slug.toLowerCase() === catId.toLowerCase()) || 
          (c.name && c.name.toLowerCase() === catId.toLowerCase())
        );
        const name = cat ? cat.name : catId;
        return `
          <span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono shadow-sm">
            ${iconFolder('w-3 h-3 flex-shrink-0')}
            <span>${name}</span>
            <button type="button" onclick="removeCategoryFilter('${catId}'); applyProductFilters();" class="text-blue-700 hover:text-red-600 ml-1 font-sans cursor-pointer flex items-center justify-center" title="Remove filter">${iconClose('w-2.5 h-2.5')}</button>
          </span>
        `;
      }).join('');
    }

    if (selectedBrandIds.length > 0) {
      tagsHtml += selectedBrandIds.map(brandId => {
        const brandObj = brandsList.find(b => 
          b.id.toLowerCase() === brandId.toLowerCase() || 
          (b.slug && b.slug.toLowerCase() === brandId.toLowerCase()) || 
          (b.name && b.name.toLowerCase() === brandId.toLowerCase())
        );
        const name = brandObj ? brandObj.name : brandId;
        return `
          <span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono shadow-sm">
            ${iconBuilding('w-3 h-3 flex-shrink-0')}
            <span>${name}</span>
            <button type="button" onclick="removeBrandFilter('${brandId}'); applyProductFilters();" class="text-indigo-700 hover:text-red-600 ml-1 font-sans cursor-pointer flex items-center justify-center" title="Remove filter">${iconClose('w-2.5 h-2.5')}</button>
          </span>
        `;
      }).join('');
    }

    if (maxPrice < 1000000) {
      tagsHtml += `<span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-[#f1f5f9] text-blue-700 border border-[#e2e8f0] px-2 py-0.5 rounded font-mono shadow-sm">Under Rs. ${maxPrice.toLocaleString()}</span>`;
    }

    if (searchQuery) {
      tagsHtml += `<span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono shadow-sm">Search: "${searchQuery}"</span>`;
    }

    activeTagsContainer.innerHTML = tagsHtml;
  }

  // Render product cards
  grid.innerHTML = productsList.map(product => {
    const productBrand = product.brand || '';
    const brandObj = productBrand ? brandsList.find(b => 
      b.name.toLowerCase() === productBrand.toLowerCase() || 
      b.slug.toLowerCase() === productBrand.toLowerCase() || 
      b.id.toLowerCase() === productBrand.toLowerCase()
    ) : null;

    const catObj = product.category ? categoriesList.find(c => 
      c.slug.toLowerCase() === (product.category || '').toLowerCase() || 
      c.name.toLowerCase() === (product.category || '').toLowerCase() || 
      c.id.toLowerCase() === (product.category || '').toLowerCase()
    ) : null;

    const displayCategoryName = catObj ? catObj.name : (product.categoryName || product.category || 'Hardware');
    const displayBrandName = brandObj ? brandObj.name : (product.brand || '');
    const brandLogo = brandObj && (brandObj.logo || brandObj.logoUrl) ? (brandObj.logo || brandObj.logoUrl) : '';

    return `
      <div class="group rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-md">
        <div>
          <!-- Product Image & Badges -->
          <div onclick="viewProductDetails(${product.id})" class="relative overflow-hidden rounded-xl bg-[#f8fafc] mb-3.5 h-44 flex items-center justify-center cursor-pointer border border-[#e2e8f0]">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            
            <!-- Left Badges Column -->
            <div class="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
              ${product.badge ? `<span class="bg-blue-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm">${product.badge}</span>` : ''}
              ${displayBrandName ? `
                <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-mono font-bold border border-white/20 shadow-sm">
                  ${brandLogo ? `<img src="${brandLogo}" alt="${displayBrandName}" class="w-2.5 h-2.5 object-contain inline invert brightness-200">` : `<span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>`}
                  <span>${displayBrandName}</span>
                </span>
              ` : ''}
            </div>

            <span class="absolute top-2.5 right-2.5 bg-white/95 text-[#475569] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#e2e8f0] flex items-center space-x-1 shadow-sm">
              ${iconStar('w-3 h-3 text-amber-500')}
              <span>${product.rating || 4.8}</span>
            </span>

            <div class="absolute inset-0 bg-[#0f172a]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md flex items-center space-x-1">
                ${iconEye('w-3.5 h-3.5')}
                <span>View Specs</span>
              </span>
            </div>
          </div>

          <!-- Meta & Title -->
          <div class="flex items-center justify-between text-[10px] font-bold uppercase font-mono tracking-wider mb-1">
            <div class="flex items-center space-x-1.5 overflow-hidden">
              <span class="text-blue-600 font-extrabold truncate max-w-[140px]" title="Category: ${displayCategoryName}">${displayCategoryName}</span>
              ${displayBrandName ? `
                <span class="text-slate-300">•</span>
                <span class="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold truncate max-w-[100px]" title="Brand: ${displayBrandName}">${displayBrandName}</span>
              ` : ''}
            </div>
            <span class="${product.inStock ? 'text-emerald-600' : 'text-amber-600'}">${product.inStock ? '● In Stock' : '○ Pre-order'}</span>
          </div>
          
          <h3 onclick="viewProductDetails(${product.id})" class="text-sm font-bold text-[#0f172a] mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer" title="${product.name}">${product.name}</h3>
          <p class="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">${product.description || product.fullDescription || ''}</p>
        </div>
        
        <!-- Footer Price & Action -->
        <div class="mt-4 pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
          <div>
            ${product.originalPrice && product.originalPrice > product.price ? `
              <span class="text-[10px] text-[#94a3b8] line-through font-mono">Rs. ${Number(product.originalPrice).toLocaleString()}</span>
            ` : ''}
            <p class="text-base font-extrabold text-[#0f172a] font-mono">Rs. ${Number(product.price).toLocaleString()}</p>
          </div>
          
          <div class="flex items-center space-x-1.5">
            <button 
              data-wishlist-btn="${product.id}"
              onclick="toggleWishlist(${product.id}, this)" 
              class="p-2 bg-[#f8fafc] hover:bg-rose-50 text-[#475569] hover:text-rose-600 rounded-xl border border-[#e2e8f0] hover:border-rose-200 transition-all shadow-sm flex items-center justify-center cursor-pointer" 
              title="Add to Wishlist">
              <svg class="w-3.5 h-3.5 ${isInWishlist(product.id) ? 'text-rose-600 fill-rose-600' : 'text-[#64748b]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </button>

            <button onclick="viewProductDetails(${product.id})" class="p-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] rounded-xl border border-[#e2e8f0] transition-all shadow-sm" title="View Product Details">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
            
            <button onclick="addToCart(${product.id})" class="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center space-x-1 active:scale-95 cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Renders the pagination buttons and product count info
 */
export function renderShopPagination(page, totalPages, totalCount) {
  const container = document.getElementById('shop-pagination-container');
  const startEl = document.getElementById('pagination-start');
  const endEl = document.getElementById('pagination-end');
  const totalEl = document.getElementById('pagination-total');
  const btnContainer = document.getElementById('pagination-buttons');

  if (!container || !btnContainer) return;

  if (totalCount <= 0 || totalPages <= 1) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  const startNum = page * SHOP_PAGE_SIZE + 1;
  const endNum = Math.min((page + 1) * SHOP_PAGE_SIZE, totalCount);

  if (startEl) startEl.textContent = startNum;
  if (endEl) endEl.textContent = endNum;
  if (totalEl) totalEl.textContent = totalCount;

  let btnsHtml = '';

  // Previous button
  const prevDisabled = page <= 0;
  btnsHtml += `
    <button 
      type="button"
      onclick="goToShopPage(${page - 1})"
      ${prevDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 ${
        prevDisabled 
          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' 
          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer shadow-2xs'
      }">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      <span>Prev</span>
    </button>
  `;

  // Numbered buttons
  let pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pagesToShow.push(i);
  } else {
    pagesToShow.push(0);
    if (page > 2) pagesToShow.push('...');
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages - 2, page + 1);
    for (let i = start; i <= end; i++) {
      pagesToShow.push(i);
    }
    if (page < totalPages - 3) pagesToShow.push('...');
    pagesToShow.push(totalPages - 1);
  }

  pagesToShow.forEach(p => {
    if (p === '...') {
      btnsHtml += `<span class="px-2 py-1 text-xs text-slate-400 font-bold">...</span>`;
    } else {
      const isCurrent = p === page;
      btnsHtml += `
        <button 
          type="button"
          onclick="goToShopPage(${p})"
          class="w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
            isCurrent
              ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs'
          }">
          ${p + 1}
        </button>
      `;
    }
  });

  // Next button
  const nextDisabled = page >= totalPages - 1;
  btnsHtml += `
    <button 
      type="button"
      onclick="goToShopPage(${page + 1})"
      ${nextDisabled ? 'disabled' : ''}
      class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center space-x-1 ${
        nextDisabled 
          ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed' 
          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 cursor-pointer shadow-2xs'
      }">
      <span>Next</span>
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </button>
  `;

  btnContainer.innerHTML = btnsHtml;
}

/**
 * Navigate to a specific shop page
 */
export async function goToShopPage(targetPage) {
  if (targetPage < 0 || targetPage >= totalShopPages || targetPage === currentShopPage) {
    return;
  }
  await applyProductFilters(targetPage);
  const catalogEl = document.getElementById('shop-page') || document.getElementById('product-grid');
  if (catalogEl) {
    catalogEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Export renderFilteredProducts as an alias for applyProductFilters for backward compatibility
export function renderFilteredProducts() {
  return applyProductFilters();
}

// Global window bindings for inline onclick attributes
window.addCategoryFilter = addCategoryFilter;
window.removeCategoryFilter = removeCategoryFilter;
window.clearCategoryFilters = clearCategoryFilters;
window.addBrandFilter = addBrandFilter;
window.removeBrandFilter = removeBrandFilter;
window.clearBrandFilters = clearBrandFilters;
window.applyProductFilters = applyProductFilters;
window.resetProductFilters = resetProductFilters;
window.renderFilteredProducts = renderFilteredProducts;
window.initShopLogic = initShopLogic;
window.renderShopPagination = renderShopPagination;
window.goToShopPage = goToShopPage;
