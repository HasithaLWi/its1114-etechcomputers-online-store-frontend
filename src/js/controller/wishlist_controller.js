// ETech Computers - Wishlist Controller & State Management System
import { products, getStoredProducts, getProductById } from '../models/data.js';
import { addToCart, updateCartBadge } from './cart_controller.js';
import { getHotDealByProductId } from '../models/deals_data.js';
import { WishlistApi } from '../api/wishlistApi.js';
import { getToken } from '../api/apiClient.js';
import {
  iconHeart,
  iconCart,
  iconStar,
  iconTrash,
  iconEye,
  iconClose,
  formatLKR,
  showToast,
  etechAlert
} from '../util/index.js';

// Persistent LocalStorage Key
const WISHLIST_STORAGE_KEY = 'etech_wishlist';

// Reactive In-Memory Wishlist State Cache
let memoryWishlist = [];

/**
 * Retrieves the current wishlist from localStorage with in-memory fallback
 * @returns {Array<Object>} List of wishlisted product items
 */
export function getWishlist() {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          memoryWishlist = parsed;
          return [...memoryWishlist];
        }
      }
    }
  } catch (e) {
    console.warn('[Wishlist] Failed to read from localStorage:', e);
  }
  return [...memoryWishlist];
}

/**
 * Saves wishlist to localStorage and memory, then triggers badge & DOM sync
 * @param {Array<Object>} wishlist 
 */
export function saveWishlist(wishlist) {
  memoryWishlist = Array.isArray(wishlist) ? [...wishlist] : [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(memoryWishlist));
    }
  } catch (e) {
    console.warn('[Wishlist] Failed to write to localStorage:', e);
  }
  updateWishlistBadge();
  refreshAllWishlistButtons();
  window.dispatchEvent(new CustomEvent('wishlistUpdated', { detail: memoryWishlist }));
}

/**
 * Checks if a product is in the wishlist
 * @param {number|string} productId 
 * @returns {boolean}
 */
export function isInWishlist(productId) {
  const pId = Number(productId);
  if (!pId) return false;
  const wishlist = getWishlist();
  return wishlist.some(item => Number(item.productId || item.id) === pId);
}

/**
 * Returns the total count of wishlisted items
 * @returns {number}
 */
export function getWishlistCount() {
  return getWishlist().length;
}

/**
 * Updates wishlist count badge in Desktop Header, Mobile Drawer, and Account Page
 */
export function updateWishlistBadge() {
  const count = getWishlistCount();
  const badges = [
    document.getElementById('wishlist-count-badge'),
    document.getElementById('mobile-wishlist-count-badge')
  ];

  badges.forEach(badge => {
    if (!badge) return;
    badge.textContent = count;

    // Scale micro-animation
    badge.classList.remove('scale-125');
    void badge.offsetWidth;
    badge.classList.add('scale-125');
    setTimeout(() => badge.classList.remove('scale-125'), 200);
  });

  // Also update account page badge if present
  const accountWishlistCountEl = document.getElementById('account-wishlist-count');
  if (accountWishlistCountEl) {
    accountWishlistCountEl.textContent = `${count} ${count === 1 ? 'Item' : 'Items'}`;
  }
}

/**
 * Syncs visual state of all wishlist heart buttons across the active page
 */
export function refreshAllWishlistButtons() {
  const wishlist = getWishlist();
  const wishlistedIds = new Set(wishlist.map(i => Number(i.productId || i.id)));
  document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
    const pId = Number(btn.getAttribute('data-wishlist-btn'));
    if (pId) {
      applyHeartVisuals(btn, wishlistedIds.has(pId));
    }
  });
}

/**
 * Helper to update SVG heart icon and styles inside button
 */
function applyHeartVisuals(button, isWishlisted) {
  if (!button) return;
  const svg = button.querySelector('svg');
  if (svg) {
    if (isWishlisted) {
      svg.classList.add('text-rose-600', 'fill-rose-600');
      svg.classList.remove('text-[#64748b]', 'text-[#475569]', 'text-slate-400');
    } else {
      svg.classList.remove('text-rose-600', 'fill-rose-600');
      svg.classList.add('text-[#64748b]');
    }
  }

  // Check if button has text label (e.g. in product detail)
  const label = button.querySelector('.wishlist-btn-text');
  if (label) {
    label.textContent = isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist';
  }

  // If button has background color variant (e.g. in product detail)
  if (button.querySelector('.wishlist-btn-text')) {
    if (isWishlisted) {
      button.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
      button.classList.remove('bg-white', 'text-[#475569]');
    } else {
      button.classList.remove('bg-rose-50', 'border-rose-200', 'text-rose-700');
      button.classList.add('bg-white', 'text-[#475569]');
    }
  }
}

/**
 * Updates visual heart icons across active cards and buttons
 */
function updateButtonVisualState(productId, isWishlisted, targetBtn) {
  const matchingButtons = document.querySelectorAll(`[data-wishlist-btn="${productId}"]`);
  matchingButtons.forEach(btn => {
    applyHeartVisuals(btn, isWishlisted);
  });

  if (targetBtn) {
    applyHeartVisuals(targetBtn, isWishlisted);
  }
}

/**
 * Sync wishlist from backend API into local persistence with multi-source merging
 */
export async function syncWishlistFromApi() {
  if (!getToken()) {
    updateWishlistBadge();
    refreshAllWishlistButtons();
    return getWishlist();
  }

  try {
    const data = await WishlistApi.getWishlist();
    if (!data) return getWishlist();

    let backendItems = [];
    if (Array.isArray(data)) {
      backendItems = data;
    } else if (data && Array.isArray(data.items)) {
      backendItems = data.items;
    } else if (data && Array.isArray(data.content)) {
      backendItems = data.content;
    } else if (data && data.body && Array.isArray(data.body.items)) {
      backendItems = data.body.items;
    }

    const storedProducts = getStoredProducts();

    if (backendItems.length > 0) {
      const normalizedBackend = backendItems.map(item => {
        const pId = Number(item.productId || item.id);
        const liveProd = storedProducts.find(p => Number(p.id) === pId);
        const hotDeal = typeof getHotDealByProductId === 'function' ? getHotDealByProductId(pId) : null;
        return {
          id: pId,
          productId: pId,
          name: liveProd ? liveProd.name : (item.name || 'Hardware Product'),
          price: hotDeal ? hotDeal.dealPrice : (liveProd ? liveProd.price : (Number(item.price) || 0)),
          originalPrice: liveProd ? (liveProd.originalPrice || liveProd.price) : (Number(item.originalPrice) || Number(item.price) || 0),
          image: (liveProd && liveProd.image) || item.image || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
          category: (liveProd && liveProd.category) || item.category || 'Hardware',
          brand: (liveProd && liveProd.brand) || item.brand || '',
          badge: (liveProd && liveProd.badge) || (hotDeal ? hotDeal.badge : (item.badge || '')),
          rating: (liveProd && liveProd.rating) || item.rating || 4.8,
          reviews: (liveProd && liveProd.reviews) || item.reviews || 24,
          inStock: liveProd ? (liveProd.inStock !== false) : (item.inStock !== false),
          description: (liveProd && (liveProd.description || liveProd.fullDescription)) || item.description || '',
          addedAt: item.savedAt ? new Date(item.savedAt).getTime() : Date.now()
        };
      });

      // Merge local items with backend items to prevent loss
      const localItems = getWishlist();
      const mergedMap = new Map();
      normalizedBackend.forEach(i => mergedMap.set(i.productId, i));

      localItems.forEach(i => {
        const pId = Number(i.productId || i.id);
        if (!mergedMap.has(pId)) {
          mergedMap.set(pId, i);
          // Upload local item to backend in background
          WishlistApi.addToWishlist(pId).catch(() => {});
        }
      });

      const finalWishlist = Array.from(mergedMap.values());
      saveWishlist(finalWishlist);
      return finalWishlist;
    } else {
      // Backend list is empty, but if local items exist, upload them to account
      const localItems = getWishlist();
      if (localItems.length > 0) {
        localItems.forEach(i => {
          const pId = Number(i.productId || i.id);
          WishlistApi.addToWishlist(pId).catch(() => {});
        });
      }
    }
  } catch (err) {
    console.warn('[Wishlist] Background API sync error:', err);
  }

  updateWishlistBadge();
  refreshAllWishlistButtons();
  return getWishlist();
}

// Internal filtering and sorting state
let wishlistSearchQuery = '';
let wishlistCategoryFilter = 'all';
let wishlistInStockOnly = false;
let wishlistSortBy = 'date-desc';

/**
 * Toggles a product in the wishlist (Add if absent, Remove if present)
 * @param {number|string} productId 
 * @param {HTMLElement} [btnElement] Optional button element to animate
 */
export async function toggleWishlist(productId, btnElement) {
  const pId = Number(productId);
  if (!pId) return;

  const storedProducts = getStoredProducts();
  const product = storedProducts.find(p => Number(p.id) === pId) || (typeof getProductById === 'function' ? getProductById(pId) : null);

  if (!product) {
    showToast('Product not found.', 'error');
    return;
  }

  let wishlist = getWishlist();
  const existingIndex = wishlist.findIndex(item => Number(item.productId || item.id) === pId);

  if (existingIndex > -1) {
    // Remove from wishlist
    wishlist.splice(existingIndex, 1);
    saveWishlist(wishlist);
    showToast(`Removed "${product.name.split(' ').slice(0, 3).join(' ')}" from wishlist.`);
    updateButtonVisualState(pId, false, btnElement);

    if (getToken()) {
      WishlistApi.toggleWishlist(pId).catch(() => {});
    }
  } else {
    // Add to wishlist
    const hotDeal = typeof getHotDealByProductId === 'function' ? getHotDealByProductId(pId) : null;
    const effectivePrice = hotDeal ? hotDeal.dealPrice : product.price;

    wishlist.unshift({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: product.originalPrice || product.price,
      image: product.image || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
      category: product.category || 'Hardware',
      brand: product.brand || '',
      badge: product.badge || (hotDeal ? hotDeal.badge : ''),
      rating: product.rating || 4.8,
      reviews: product.reviews || 24,
      inStock: product.inStock !== false,
      description: product.description || product.fullDescription || '',
      addedAt: Date.now()
    });
    saveWishlist(wishlist);
    showToast(`Added "${product.name.split(' ').slice(0, 3).join(' ')}" to your wishlist!`, 'success');
    updateButtonVisualState(pId, true, btnElement);

    if (getToken()) {
      WishlistApi.toggleWishlist(pId).catch(() => {});
    }
  }

  // If currently on wishlist page, re-render it
  const wishlistPage = document.getElementById('wishlist-page');
  if (wishlistPage && !wishlistPage.classList.contains('hidden')) {
    renderWishlistPage();
  }

  // Dispatch global event
  window.dispatchEvent(new CustomEvent('wishlistStateChanged', {
    detail: { productId: pId, inWishlist: existingIndex === -1 }
  }));
}

/**
 * Directly removes an item from the wishlist
 * @param {number|string} productId 
 */
export async function removeFromWishlist(productId) {
  const pId = Number(productId);
  let wishlist = getWishlist();
  const item = wishlist.find(i => Number(i.productId || i.id) === pId);

  if (item) {
    wishlist = wishlist.filter(i => Number(i.productId || i.id) !== pId);
    saveWishlist(wishlist);
    showToast(`Removed "${item.name.split(' ').slice(0, 3).join(' ')}" from wishlist.`);
    updateButtonVisualState(pId, false);
    renderWishlistPage();

    if (getToken()) {
      WishlistApi.removeFromWishlist(pId).catch(() => {});
    }
  }
}

/**
 * Clears all items from the wishlist
 */
export async function clearWishlist() {
  const wishlist = getWishlist();
  if (wishlist.length === 0) {
    showToast('Your wishlist is already empty.', 'error');
    return;
  }

  const confirmed = await etechAlert.confirmDelete('all saved items from your wishlist', 'You can re-add items anytime while browsing the shop catalog.');
  if (!confirmed) return;

  saveWishlist([]);
  showToast('All items removed from your wishlist.', 'info');
  updateWishlistBadge();
  renderWishlistPage();
  
  // Refresh visual state across active pages
  document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
    applyHeartVisuals(btn, false);
  });

  if (getToken()) {
    WishlistApi.clearWishlist().catch(() => {});
  }
}

/**
 * Moves a wishlisted product to the shopping cart
 * @param {number|string} productId 
 * @param {boolean} [removeAfter=true] Whether to remove from wishlist after moving
 */
export function moveWishlistToCart(productId, removeAfter = false) {
  const pId = Number(productId);
  addToCart(pId, 1);

  if (removeAfter) {
    removeFromWishlist(pId);
  }
}

/**
 * Moves all in-stock wishlisted items to the cart
 */
export function moveAllWishlistToCart() {
  const wishlist = getWishlist();
  if (wishlist.length === 0) {
    showToast('Your wishlist is empty!', 'error');
    return;
  }

  let addedCount = 0;
  wishlist.forEach(item => {
    const targetId = Number(item.productId || item.id);
    if (item.inStock !== false) {
      addToCart(targetId, 1);
      addedCount++;
    }
  });

  if (addedCount > 0) {
    showToast(`Successfully moved ${addedCount} item${addedCount > 1 ? 's' : ''} to your shopping cart!`, 'success');
  } else {
    showToast('No in-stock items available to move to cart.', 'warning');
  }
}

/**
 * Handles search filter input in wishlist page
 * @param {string} query 
 */
export function handleWishlistSearch(query) {
  wishlistSearchQuery = (query || '').toLowerCase().trim();
  renderWishlistPage();
}

/**
 * Handles category filter selection in wishlist page
 * @param {string} category 
 */
export function handleWishlistCategoryFilter(category) {
  wishlistCategoryFilter = category || 'all';
  renderWishlistPage();
}

/**
 * Handles in-stock filter toggle in wishlist page
 * @param {boolean} inStockOnly 
 */
export function handleWishlistStockFilter(inStockOnly) {
  wishlistInStockOnly = !!inStockOnly;
  renderWishlistPage();
}

/**
 * Handles sorting selection in wishlist page
 * @param {string} sortBy 
 */
export function handleWishlistSort(sortBy) {
  wishlistSortBy = sortBy || 'date-desc';
  renderWishlistPage();
}

/**
 * Initializes Wishlist page logic and renders components
 */
export function initWishlistLogic() {
  updateWishlistBadge();
  renderWishlistPage();

  if (getToken()) {
    syncWishlistFromApi().then(() => {
      updateWishlistBadge();
      renderWishlistPage();
    }).catch(() => { });
  }
}

/**
 * Renders the full Wishlist page into #wishlist-page
 */
export function renderWishlistPage() {
  const container = document.getElementById('wishlist-page');
  if (!container) return;

  const rawWishlist = getWishlist();
  const storedProducts = getStoredProducts();

  // Re-sync with live product pricing and stock data
  const syncedWishlist = rawWishlist.map(item => {
    const targetId = Number(item.productId || item.id);
    const liveProd = storedProducts.find(p => Number(p.id) === targetId);
    if (liveProd) {
      const hotDeal = typeof getHotDealByProductId === 'function' ? getHotDealByProductId(targetId) : null;
      return {
        ...item,
        id: targetId,
        productId: targetId,
        name: liveProd.name || item.name,
        price: hotDeal ? hotDeal.dealPrice : (liveProd.price !== undefined ? liveProd.price : item.price),
        originalPrice: liveProd.originalPrice || item.originalPrice || liveProd.price || item.price,
        image: liveProd.image || item.image || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80',
        category: liveProd.category || item.category || 'Hardware',
        brand: liveProd.brand || item.brand || '',
        badge: liveProd.badge || (hotDeal ? hotDeal.badge : (item.badge || '')),
        rating: liveProd.rating || item.rating || 4.8,
        reviews: liveProd.reviews || item.reviews || 24,
        inStock: liveProd.inStock !== false,
        description: liveProd.description || item.description || ''
      };
    }
    return {
      ...item,
      id: targetId,
      productId: targetId,
      inStock: item.inStock !== false
    };
  });

  // Calculate distinct categories for filter dropdown
  const categoriesSet = new Set(syncedWishlist.map(i => (i.category || '').toLowerCase()).filter(Boolean));
  const categoryOptions = Array.from(categoriesSet);

  // Apply filters
  let filteredItems = syncedWishlist.filter(item => {
    // Search query
    if (wishlistSearchQuery) {
      const matchName = (item.name || '').toLowerCase().includes(wishlistSearchQuery);
      const matchBrand = (item.brand || '').toLowerCase().includes(wishlistSearchQuery);
      const matchCat = (item.category || '').toLowerCase().includes(wishlistSearchQuery);
      if (!matchName && !matchBrand && !matchCat) return false;
    }

    // Category filter
    if (wishlistCategoryFilter !== 'all') {
      if ((item.category || '').toLowerCase() !== wishlistCategoryFilter.toLowerCase()) {
        return false;
      }
    }

    // Stock filter
    if (wishlistInStockOnly && !item.inStock) {
      return false;
    }

    return true;
  });

  // Apply sorting
  filteredItems.sort((a, b) => {
    if (wishlistSortBy === 'price-asc') {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    } else if (wishlistSortBy === 'price-desc') {
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    } else if (wishlistSortBy === 'name-asc') {
      return (a.name || '').localeCompare(b.name || '');
    } else if (wishlistSortBy === 'rating-desc') {
      return (b.rating || 0) - (a.rating || 0);
    } else {
      // date-desc (default)
      return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  // Calculate metrics
  const totalItemsCount = syncedWishlist.length;
  const inStockCount = syncedWishlist.filter(i => i.inStock).length;
  const totalValue = syncedWishlist.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  container.innerHTML = `
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      <!-- Top Breadcrumbs & Title Section -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-6">
        <div>
          <div class="flex items-center space-x-2 text-xs text-[#64748b] mb-2 font-medium">
            <a href="#home" class="hover:text-blue-600 transition-colors">Home</a>
            <span>/</span>
            <a href="#shop" class="hover:text-blue-600 transition-colors">Catalog</a>
            <span>/</span>
            <span class="text-blue-600 font-semibold">Wishlist</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shadow-xs">
              <svg class="w-5 h-5 fill-rose-600 text-rose-600" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <div>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight flex items-center gap-2.5">
                <span>My Saved Wishlist</span>
                <span class="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  ${totalItemsCount} ${totalItemsCount === 1 ? 'Item' : 'Items'}
                </span>
              </h1>
              <p class="text-xs sm:text-sm text-[#64748b] mt-0.5">
                Save your dream PCs, high-end components, and gear for future purchases.
              </p>
            </div>
          </div>
        </div>

        <!-- Header Action Controls -->
        <div class="flex items-center flex-wrap gap-2.5">
          <a href="#shop" class="px-4 py-2.5 bg-white hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] text-xs font-bold rounded-lg border border-[#e2e8f0] transition-all flex items-center space-x-1.5 shadow-xs">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span>Continue Shopping</span>
          </a>

          ${totalItemsCount > 0 ? `
            <button onclick="moveAllWishlistToCart()" class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>Move All to Cart</span>
            </button>

            <button onclick="clearWishlist()" class="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold rounded-lg border border-rose-200 transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer" title="Clear All Items">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Clear</span>
            </button>
          ` : ''}
        </div>
      </div>

      ${totalItemsCount > 0 ? `
        <!-- Metrics Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold border border-blue-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Items Saved</p>
              <p class="text-lg font-extrabold text-[#0f172a] font-mono">${totalItemsCount}</p>
            </div>
          </div>

          <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold border border-emerald-100">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Available in Stock</p>
              <p class="text-lg font-extrabold text-emerald-600 font-mono">${inStockCount} <span class="text-xs text-[#64748b] font-sans font-normal">ready for checkout</span></p>
            </div>
          </div>

          <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 flex items-center space-x-3.5 shadow-xs">
            <div class="w-10 h-10 rounded-lg bg-slate-100 text-[#0f172a] flex items-center justify-center font-extrabold border border-slate-200">
              <span class="text-xs font-mono font-bold">Rs.</span>
            </div>
            <div>
              <p class="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">Total Estimated Value</p>
              <p class="text-lg font-extrabold text-[#0f172a] font-mono">Rs. ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            <!-- Search -->
            <div class="md:col-span-4 relative">
              <input 
                type="text" 
                id="wishlist-search-input" 
                placeholder="Search wishlist items..." 
                value="${wishlistSearchQuery}"
                oninput="handleWishlistSearch(this.value)"
                class="w-full pl-9 pr-3.5 py-2 text-xs bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-blue-600 transition-colors">
              <svg class="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <!-- Category Filter -->
            <div class="md:col-span-3">
              <select 
                id="wishlist-category-filter" 
                onchange="handleWishlistCategoryFilter(this.value)"
                class="w-full px-3 py-2 text-xs font-medium bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:border-blue-600 transition-colors cursor-pointer">
                <option value="all" ${wishlistCategoryFilter === 'all' ? 'selected' : ''}>All Categories (${totalItemsCount})</option>
                ${categoryOptions.map(cat => `
                  <option value="${cat}" ${wishlistCategoryFilter.toLowerCase() === cat ? 'selected' : ''}>${cat.toUpperCase()}</option>
                `).join('')}
              </select>
            </div>

            <!-- Sort By -->
            <div class="md:col-span-3">
              <select 
                id="wishlist-sort-select" 
                onchange="handleWishlistSort(this.value)"
                class="w-full px-3 py-2 text-xs font-medium bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-[#0f172a] focus:outline-none focus:border-blue-600 transition-colors cursor-pointer">
                <option value="date-desc" ${wishlistSortBy === 'date-desc' ? 'selected' : ''}>Date Added: Newest First</option>
                <option value="price-asc" ${wishlistSortBy === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price-desc" ${wishlistSortBy === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                <option value="name-asc" ${wishlistSortBy === 'name-asc' ? 'selected' : ''}>Product Name (A-Z)</option>
                <option value="rating-desc" ${wishlistSortBy === 'rating-desc' ? 'selected' : ''}>Highest Rated</option>
              </select>
            </div>

            <!-- In Stock Checkbox -->
            <div class="md:col-span-2 flex items-center justify-start md:justify-end">
              <label class="inline-flex items-center space-x-2 text-xs font-bold text-[#475569] cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  id="wishlist-stock-filter" 
                  ${wishlistInStockOnly ? 'checked' : ''}
                  onchange="handleWishlistStockFilter(this.checked)"
                  class="rounded text-blue-600 focus:ring-0 focus:outline-none w-4 h-4 border-[#cbd5e1] cursor-pointer">
                <span>In Stock Only</span>
              </label>
            </div>

          </div>
        </div>
      ` : ''}

      <!-- Wishlist Product Grid or Empty State -->
      ${totalItemsCount === 0 ? `
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-sm">
          <div class="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
            <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div class="space-y-2">
            <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">Your Wishlist is Empty</h2>
            <p class="text-xs sm:text-sm text-[#64748b] leading-relaxed max-w-md mx-auto">
              You haven't saved any hardware items yet. Browse our cutting-edge PC catalog, flash deals, and peripherals to build your wishlist!
            </p>
          </div>
          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#shop" class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>Explore Shop Catalog</span>
            </a>
            <a href="#deals" class="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#f8fafc] text-[#475569] font-bold text-xs rounded-xl border border-[#e2e8f0] transition-all flex items-center justify-center space-x-2">
              <span>View Flash Deals</span>
              <span class="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">HOT</span>
            </a>
          </div>
        </div>
      ` : filteredItems.length === 0 ? `
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-10 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div class="w-14 h-14 bg-slate-100 text-[#64748b] rounded-full flex items-center justify-center mx-auto">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div>
            <h3 class="text-base font-bold text-[#0f172a]">No Matching Items</h3>
            <p class="text-xs text-[#64748b] mt-1">No wishlisted products matched your active filters or search query.</p>
          </div>
          <button onclick="handleWishlistSearch(''); handleWishlistCategoryFilter('all'); handleWishlistStockFilter(false);" class="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg transition-colors cursor-pointer">
            Reset Filters
          </button>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          ${filteredItems.map(item => {
            const targetId = Number(item.productId || item.id);
            const savingsPercent = item.originalPrice && item.originalPrice > item.price
              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
              : 0;

            return `
              <div class="group rounded-2xl bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-md relative">
                
                <div>
                  <!-- Thumbnail & Badges Container -->
                  <div onclick="viewProductDetails(${targetId})" class="relative overflow-hidden rounded-xl bg-[#f8fafc] mb-3.5 h-44 flex items-center justify-center cursor-pointer border border-[#e2e8f0]">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    
                    <!-- Left Badges Column -->
                    <div class="absolute top-2.5 left-2.5 flex flex-col gap-1.5 items-start">
                      ${item.badge ? `<span class="bg-blue-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm">${item.badge}</span>` : ''}
                      ${savingsPercent > 0 ? `<span class="bg-rose-600 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm">-${savingsPercent}% OFF</span>` : ''}
                      ${item.brand ? `
                        <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-mono font-bold border border-white/20 shadow-sm">
                          <span>${item.brand}</span>
                        </span>
                      ` : ''}
                    </div>

                    <!-- Right Rating Pill -->
                    <span class="absolute top-2.5 right-2.5 bg-white/95 text-[#475569] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#e2e8f0] flex items-center space-x-1 shadow-sm">
                      ${iconStar('w-3 h-3 text-amber-500')}
                      <span>${item.rating || 4.8}</span>
                    </span>

                    <!-- Quick View Overlay -->
                    <div class="absolute inset-0 bg-[#0f172a]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span class="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md flex items-center space-x-1">
                        ${iconEye('w-3.5 h-3.5')}
                        <span>View Specs</span>
                      </span>
                    </div>
                  </div>

                  <!-- Metadata -->
                  <div class="flex items-center justify-between text-[10px] font-bold uppercase font-mono tracking-wider mb-1">
                    <span class="text-blue-600 font-extrabold truncate max-w-[140px]">${item.category || 'HARDWARE'}</span>
                    <span class="${item.inStock ? 'text-emerald-600' : 'text-amber-600'}">${item.inStock ? '● In Stock' : '○ Pre-order'}</span>
                  </div>

                  <!-- Product Name & Description -->
                  <h3 onclick="viewProductDetails(${targetId})" class="text-sm font-bold text-[#0f172a] mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer" title="${item.name}">${item.name}</h3>
                  <p class="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">${item.description || ''}</p>
                </div>

                <!-- Price & Action Row -->
                <div class="mt-4 pt-3 border-t border-[#e2e8f0] space-y-2.5">
                  <div class="flex items-center justify-between">
                    <div>
                      ${item.originalPrice && item.originalPrice > item.price ? `
                        <span class="text-[10px] text-[#94a3b8] line-through font-mono">Rs. ${Number(item.originalPrice).toLocaleString()}</span>
                      ` : ''}
                      <p class="text-base font-extrabold text-[#0f172a] font-mono">Rs. ${Number(item.price).toLocaleString()}</p>
                    </div>

                    <!-- Remove from Wishlist button -->
                    <button 
                      onclick="removeFromWishlist(${targetId})" 
                      class="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition-colors shadow-xs cursor-pointer" 
                      title="Remove from Wishlist">
                      <svg class="w-4 h-4 fill-rose-600 text-rose-600" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  <!-- 1-Click Move to Cart Button -->
                  <button 
                    onclick="addToCart(${targetId})" 
                    class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 active:scale-95 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                    </svg>
                    <span>Add to Shopping Cart</span>
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}

    </div>
  `;
}

// Global window assignments
window.getWishlist = getWishlist;
window.saveWishlist = saveWishlist;
window.isInWishlist = isInWishlist;
window.getWishlistCount = getWishlistCount;
window.updateWishlistBadge = updateWishlistBadge;
window.refreshAllWishlistButtons = refreshAllWishlistButtons;
window.toggleWishlist = toggleWishlist;
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.moveWishlistToCart = moveWishlistToCart;
window.moveAllWishlistToCart = moveAllWishlistToCart;
window.handleWishlistSearch = handleWishlistSearch;
window.handleWishlistCategoryFilter = handleWishlistCategoryFilter;
window.handleWishlistStockFilter = handleWishlistStockFilter;
window.handleWishlistSort = handleWishlistSort;
window.initWishlistLogic = initWishlistLogic;
window.renderWishlistPage = renderWishlistPage;
