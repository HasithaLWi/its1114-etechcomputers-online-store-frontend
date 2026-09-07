// ============================================================
//  src/js/controller/shop_controller.js — Shop Catalog & Multi-Filter Logic
// ============================================================
import { products, getStoredProducts, syncProductsFromApi } from '../models/data.js';
import { addToCart } from './cart_controller.js';
import { viewProductDetails } from './product-details_controller.js';
import { getCategories, syncCategoriesFromApi } from '../models/taxonomy_data.js';
import { getBrands, getBrandBySlug, syncBrandsFromApi } from '../models/brand_data.js';
import { isInWishlist, toggleWishlist } from './wishlist_controller.js';
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


// Module-level state for multi-selected filters
let selectedCategorySlugs = [];
let selectedBrandSlugs = [];

/**
 * ============================================================
 * CATEGORY FILTER MANAGEMENT
 * ============================================================
 */
export function getSelectedCategories() {
  return [...selectedCategorySlugs];
}

export function addCategoryFilter(slug) {
  if (!slug) return;
  const normalizedSlug = slug.toLowerCase().trim();
  if (!selectedCategorySlugs.includes(normalizedSlug)) {
    selectedCategorySlugs.push(normalizedSlug);
  }
  renderCategoryCombobox();
  renderSelectedCategoryTags();
  renderFilteredProducts();
}

export function removeCategoryFilter(slug) {
  if (!slug) return;
  const normalizedSlug = slug.toLowerCase().trim();
  selectedCategorySlugs = selectedCategorySlugs.filter(s => s !== normalizedSlug);
  renderCategoryCombobox();
  renderSelectedCategoryTags();
  renderFilteredProducts();
}

export function clearCategoryFilters() {
  selectedCategorySlugs = [];
  renderCategoryCombobox();
  renderSelectedCategoryTags();
  renderFilteredProducts();
}

export function renderCategoryCombobox() {
  const combobox = document.getElementById('shop-category-combobox');
  if (!combobox) return;

  const categories = getCategories({ activeOnly: true });
  let optionsHtml = `<option value="" disabled selected>+ Select category...</option>`;

  categories.forEach(c => {
    const isSelected = selectedCategorySlugs.some(s => 
      s === c.slug.toLowerCase() || 
      s === c.id.toLowerCase() || 
      s === c.name.toLowerCase()
    );
    const icon = c.icon ? `${c.icon} ` : '';
    if (isSelected) {
      optionsHtml += `<option value="${c.slug}" disabled class="text-[#94a3b8] bg-[#f8fafc]">${icon}${c.name} ✓ (Selected)</option>`;
    } else {
      optionsHtml += `<option value="${c.slug}" class="text-[#0f172a] bg-white">${icon}${c.name}</option>`;
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

  if (selectedCategorySlugs.length === 0) {
    if (countBadge) {
      countBadge.classList.add('hidden');
      countBadge.textContent = '0 selected';
    }
    tagsContainer.innerHTML = `<span class="text-[11px] text-[#94a3b8] italic mt-0.5">Showing all categories</span>`;
    return;
  }

  if (countBadge) {
    countBadge.classList.remove('hidden');
    countBadge.textContent = `${selectedCategorySlugs.length} selected`;
  }

  tagsContainer.innerHTML = selectedCategorySlugs.map(slug => {
    const cat = categories.find(c => 
      c.slug.toLowerCase() === slug.toLowerCase() || 
      c.id.toLowerCase() === slug.toLowerCase() || 
      c.name.toLowerCase() === slug.toLowerCase()
    );
    const name = cat ? cat.name : slug;
    const icon = cat && cat.icon ? `${cat.icon} ` : '🏷️ ';

    return `
      <span class="inline-flex items-center space-x-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md shadow-sm transition-all hover:bg-blue-100 group">
        <span class="truncate max-w-[130px]" title="${name}">${icon}${name}</span>
        <button type="button" onclick="removeCategoryFilter('${slug}')"
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
  return [...selectedBrandSlugs];
}

export function addBrandFilter(slug) {
  if (!slug) return;
  const normalizedSlug = slug.toLowerCase().trim();
  if (!selectedBrandSlugs.includes(normalizedSlug)) {
    selectedBrandSlugs.push(normalizedSlug);
  }
  renderBrandCombobox();
  renderSelectedBrandTags();
  renderFilteredProducts();
}

export function removeBrandFilter(slug) {
  if (!slug) return;
  const normalizedSlug = slug.toLowerCase().trim();
  selectedBrandSlugs = selectedBrandSlugs.filter(s => s !== normalizedSlug);
  renderBrandCombobox();
  renderSelectedBrandTags();
  renderFilteredProducts();
}

export function clearBrandFilters() {
  selectedBrandSlugs = [];
  renderBrandCombobox();
  renderSelectedBrandTags();
  renderFilteredProducts();
}

export function renderBrandCombobox() {
  const combobox = document.getElementById('shop-brand-combobox');
  if (!combobox) return;

  const brands = getBrands({ activeOnly: true });
  let optionsHtml = `<option value="" disabled selected>+ Select brand...</option>`;

  brands.forEach(b => {
    const isSelected = selectedBrandSlugs.some(s => 
      s === b.slug.toLowerCase() || 
      s === b.name.toLowerCase() || 
      s === b.id.toLowerCase()
    );
    if (isSelected) {
      optionsHtml += `<option value="${b.slug}" disabled class="text-[#94a3b8] bg-[#f8fafc]">${b.name} ✓ (Selected)</option>`;
    } else {
      optionsHtml += `<option value="${b.slug}" class="text-[#0f172a] bg-white">${b.name}</option>`;
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

  if (selectedBrandSlugs.length === 0) {
    if (countBadge) {
      countBadge.classList.add('hidden');
      countBadge.textContent = '0 selected';
    }
    tagsContainer.innerHTML = `<span class="text-[11px] text-[#94a3b8] italic mt-0.5">Showing all brands</span>`;
    return;
  }

  if (countBadge) {
    countBadge.classList.remove('hidden');
    countBadge.textContent = `${selectedBrandSlugs.length} selected`;
  }

  tagsContainer.innerHTML = selectedBrandSlugs.map(slug => {
    const brand = brands.find(b => 
      b.slug.toLowerCase() === slug.toLowerCase() || 
      b.name.toLowerCase() === slug.toLowerCase() || 
      b.id.toLowerCase() === slug.toLowerCase()
    );
    const name = brand ? brand.name : slug;

    return `
      <span class="inline-flex items-center space-x-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md shadow-sm transition-all hover:bg-indigo-100 group">
        <span class="truncate max-w-[130px]" title="${name}">${name}</span>
        <button type="button" onclick="removeBrandFilter('${slug}')"
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
export function initShopLogic(queryPart = '') {
  const searchInput = document.getElementById('search-input');
  const priceSlider = document.getElementById('price-slider');
  const priceValueDisplay = document.getElementById('price-value');
  const sortSelect = document.getElementById('sort-select');
  const resetBtn = document.getElementById('reset-filters-btn');
  const catCombobox = document.getElementById('shop-category-combobox');
  const brandCombobox = document.getElementById('shop-brand-combobox');

  // Parse query string (e.g. cat=laptops&brand=asus&search=rtx or brand=corsair,razer)
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
    selectedCategorySlugs = initialCategory.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  } else {
    selectedCategorySlugs = [];
  }

  if (initialBrand) {
    selectedBrandSlugs = initialBrand.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  } else {
    selectedBrandSlugs = [];
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

  // Event Listeners for Comboboxes
  if (catCombobox) {
    catCombobox.onchange = (e) => {
      const chosenSlug = e.target.value;
      if (chosenSlug) addCategoryFilter(chosenSlug);
    };
  }

  if (brandCombobox) {
    brandCombobox.onchange = (e) => {
      const chosenSlug = e.target.value;
      if (chosenSlug) addBrandFilter(chosenSlug);
    };
  }

  // Event Listeners for Live Filtering
  if (searchInput) {
    searchInput.oninput = renderFilteredProducts;
    searchInput.onkeyup = renderFilteredProducts;
    searchInput.onchange = renderFilteredProducts;
  }
  if (sortSelect) {
    sortSelect.onchange = renderFilteredProducts;
  }

  if (priceSlider) {
    const handlePriceChange = (e) => {
      const val = parseInt(e.target.value || 1000000);
      if (priceValueDisplay) priceValueDisplay.textContent = `Rs. ${val.toLocaleString()}`;
      renderFilteredProducts();
    };
    priceSlider.oninput = handlePriceChange;
    priceSlider.onchange = handlePriceChange;
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      if (searchInput) searchInput.value = '';
      if (priceSlider) {
        priceSlider.value = 1000000;
        if (priceValueDisplay) priceValueDisplay.textContent = 'Rs. 1,000,000';
      }
      if (sortSelect) sortSelect.value = 'featured';
      clearCategoryFilters();
      clearBrandFilters();
    };
  }

  // Initial render from cache
  renderFilteredProducts();

  // Trigger live background sync from backend MySQL database
  Promise.all([
    syncProductsFromApi({ activeOnly: true }),
    syncCategoriesFromApi({ activeOnly: true }),
    syncBrandsFromApi({ activeOnly: true })
  ]).then(() => {
    renderCategoryCombobox();
    renderSelectedCategoryTags();
    renderBrandCombobox();
    renderSelectedBrandTags();
    renderFilteredProducts();
  }).catch(() => {});
}

/**
 * ============================================================
 * FILTER, SORT & RENDER CATALOG PRODUCTS GRID
 * ============================================================
 */
export function renderFilteredProducts() {
  const grid = document.getElementById('product-grid');
  const itemCountEl = document.getElementById('item-count');
  const noProductsMsg = document.getElementById('no-products-msg');
  const activeTagsContainer = document.getElementById('active-filter-tags');

  if (!grid) return;

  const allProducts = (typeof getStoredProducts === 'function' ? getStoredProducts({ activeOnly: true }) : null) || products || [];
  const categoriesList = getCategories({ includeDeleted: true });
  const brandsList = getBrands({ includeDeleted: true });

  // Extract filter values
  const searchInput = document.getElementById('search-input');
  const priceSlider = document.getElementById('price-slider');
  const sortSelect = document.getElementById('sort-select');

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const maxPrice = priceSlider ? parseFloat(priceSlider.value) : 1000000;
  const sortOption = sortSelect ? sortSelect.value : 'featured';

  // Apply filters
  let filtered = allProducts.filter(product => {
    // 1. Search Query
    const matchesSearch = searchQuery === '' ||
      (product.name && product.name.toLowerCase().includes(searchQuery)) ||
      (product.description && product.description.toLowerCase().includes(searchQuery)) ||
      (product.fullDescription && product.fullDescription.toLowerCase().includes(searchQuery)) ||
      (product.category && product.category.toLowerCase().includes(searchQuery)) ||
      (product.categoryName && product.categoryName.toLowerCase().includes(searchQuery)) ||
      (product.brand && product.brand.toLowerCase().includes(searchQuery)) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery));

    // 2. Category Filter (Multi-select)
    let matchesCategory = true;
    if (selectedCategorySlugs.length > 0) {
      const pCat = (product.category || '').toLowerCase().trim();
      const pCatId = (product.categoryId || '').toLowerCase().trim();
      const pCatSlug = (product.categorySlug || '').toLowerCase().trim();
      const pCatName = (product.categoryName || '').toLowerCase().trim();

      matchesCategory = selectedCategorySlugs.some(sSlug => {
        const normSlug = sSlug.toLowerCase().trim();
        const catObj = categoriesList.find(c => 
          c.slug.toLowerCase() === normSlug || 
          c.id.toLowerCase() === normSlug || 
          c.name.toLowerCase() === normSlug
        );
        const targetSlug = catObj ? catObj.slug.toLowerCase() : normSlug;
        const targetId = catObj ? catObj.id.toLowerCase() : normSlug;
        const targetName = catObj ? catObj.name.toLowerCase() : normSlug;

        return (
          pCat === normSlug || pCat === targetSlug || pCat === targetId || pCat === targetName ||
          pCatId === normSlug || pCatId === targetSlug || pCatId === targetId ||
          pCatSlug === normSlug || pCatSlug === targetSlug || pCatSlug === targetId ||
          pCatName === normSlug || pCatName === targetSlug || pCatName === targetName ||
          (targetName && pCat.length >= 3 && targetName.includes(pCat)) ||
          (pCat && targetName.length >= 3 && pCat.includes(targetName))
        );
      });
    }

    // 3. Brand Filter (Multi-select)
    let matchesBrand = true;
    if (selectedBrandSlugs.length > 0) {
      const pBrand = (product.brand || '').toLowerCase().trim();
      const pBrandId = (product.brandId || '').toLowerCase().trim();
      const pBrandSlug = (product.brandSlug || '').toLowerCase().trim();

      matchesBrand = selectedBrandSlugs.some(bSlug => {
        const normSlug = bSlug.toLowerCase().trim();
        const brandObj = brandsList.find(b => 
          b.slug.toLowerCase() === normSlug || 
          b.id.toLowerCase() === normSlug || 
          b.name.toLowerCase() === normSlug
        );
        const targetSlug = brandObj ? brandObj.slug.toLowerCase() : normSlug;
        const targetId = brandObj ? brandObj.id.toLowerCase() : normSlug;
        const targetName = brandObj ? brandObj.name.toLowerCase() : normSlug;

        return (
          pBrand === normSlug || pBrand === targetSlug || pBrand === targetId || pBrand === targetName ||
          pBrandId === normSlug || pBrandId === targetSlug || pBrandId === targetId ||
          pBrandSlug === normSlug || pBrandSlug === targetSlug || pBrandSlug === targetId ||
          (targetName.length >= 3 && pBrand.includes(targetName)) ||
          (pBrand.length >= 3 && targetName.includes(pBrand))
        );
      });
    }

    // 4. Price Filter
    const productPrice = Number(product.price || 0);
    const matchesPrice = !isNaN(productPrice) ? (productPrice <= maxPrice) : true;

    return matchesSearch && matchesCategory && matchesBrand && matchesPrice;
  });

  // Apply sorting
  if (sortOption === 'price-low') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortOption === 'price-high') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sortOption === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sortOption === 'name') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortOption === 'newest') {
    filtered.sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  // Update item count UI
  if (itemCountEl) itemCountEl.textContent = filtered.length;

  // Toggle empty state message
  if (filtered.length === 0) {
    grid.innerHTML = '';
    if (noProductsMsg) noProductsMsg.classList.remove('hidden');
  } else {
    if (noProductsMsg) noProductsMsg.classList.add('hidden');
  }

  // Update active filter tags UI (Top bar above products)
  if (activeTagsContainer) {
    let tagsHtml = '';

    if (selectedCategorySlugs.length > 0) {
      tagsHtml += selectedCategorySlugs.map(slug => {
        const cat = categoriesList.find(c => 
          c.slug.toLowerCase() === slug.toLowerCase() || 
          c.id.toLowerCase() === slug.toLowerCase() || 
          c.name.toLowerCase() === slug.toLowerCase()
        );
        const name = cat ? cat.name : slug;
        return `
          <span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-mono shadow-sm">
            ${iconFolder('w-3 h-3 flex-shrink-0')}
            <span>${name}</span>
            <button type="button" onclick="removeCategoryFilter('${slug}')" class="text-blue-700 hover:text-red-600 ml-1 font-sans cursor-pointer flex items-center justify-center" title="Remove filter">${iconClose('w-2.5 h-2.5')}</button>
          </span>
        `;
      }).join('');
    }

    if (selectedBrandSlugs.length > 0) {
      tagsHtml += selectedBrandSlugs.map(slug => {
        const brandObj = brandsList.find(b => 
          b.slug.toLowerCase() === slug.toLowerCase() || 
          b.name.toLowerCase() === slug.toLowerCase() || 
          b.id.toLowerCase() === slug.toLowerCase()
        );
        const name = brandObj ? brandObj.name : slug;
        return `
          <span class="inline-flex items-center space-x-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-mono shadow-sm">
            ${iconBuilding('w-3 h-3 flex-shrink-0')}
            <span>${name}</span>
            <button type="button" onclick="removeBrandFilter('${slug}')" class="text-indigo-700 hover:text-red-600 ml-1 font-sans cursor-pointer flex items-center justify-center" title="Remove filter">${iconClose('w-2.5 h-2.5')}</button>
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
  grid.innerHTML = filtered.map(product => {
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

// Global window bindings for inline onclick attributes
window.addCategoryFilter = addCategoryFilter;
window.removeCategoryFilter = removeCategoryFilter;
window.clearCategoryFilters = clearCategoryFilters;
window.addBrandFilter = addBrandFilter;
window.removeBrandFilter = removeBrandFilter;
window.clearBrandFilters = clearBrandFilters;
window.renderFilteredProducts = renderFilteredProducts;
window.initShopLogic = initShopLogic;
