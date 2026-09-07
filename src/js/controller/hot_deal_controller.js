// ETech Computers - Hot Deals Page Controller & Interactive System
import { products, getStoredProducts } from '../models/data.js';
import { 
  getDealBundles, getHomeDealBanner, 
  getHomeBannerRemainingTime, getBundleRemainingTime, getRemainingTimeFromDuration,
  getActiveHotDeals, getHotDeals, getHotDealByProductId,
  syncPromotionsFromApi
} from '../models/deals_data.js';
import { addToCart, addBundleToCart } from './cart_controller.js';
import { viewProductDetails } from './product-details_controller.js';
import { isInWishlist, toggleWishlist } from './wishlist_controller.js';
import {
  iconStar,
  iconPackage,
  iconBolt,
  iconLayers,
  iconFlame,
  iconCart,
  iconHeart,
  formatLKR,
  showToast
} from '../util/index.js';


import { DEFAULT_HOT_DEALS } from '../../data/deals.js';
import { NewsletterApi } from '../api/newsletterApi.js';
import { NEWSLETTER_SOURCE } from '../models/newsletter_model.js';

export const HOT_DEALS_DATA = DEFAULT_HOT_DEALS;

// Module State
let activeDealCategory = 'all';
let countdownInterval = null;
let weekendSaleTimeSeconds = 2 * 86400 + 14 * 3600 + 38 * 60 + 21; // 2 days, 14 hrs, 38 mins, 21 secs
const flashDealTimers = new Map();
const wishlistDeals = new Set();
let activeBundleIndex = 0;
let carouselAutoPlayTimer = null;

/**
 * Initializes the Hot Deals section
 */
export function initHotDealsLogic(queryPart = '') {
  // Parse query category if provided
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const cat = params.get('cat') || params.get('category') || 'all';
    activeDealCategory = cat.toLowerCase();
  } else {
    activeDealCategory = 'all';
  }

  // Initialize individual flash deal timers based on live calculated duration
  const hotDeals = getActiveHotDeals();
  hotDeals.forEach(deal => {
    const totalRemaining = deal.remainingTime ? deal.remainingTime.totalSeconds : (deal.durationSeconds || (6 * 3600));
    flashDealTimers.set(deal.id, totalRemaining);
  });

  // Render Category Tabs
  renderDealCategoryTabs();

  // Render Featured Deal Carousel (Image 2 & 3 - Per-bundle timer)
  renderFeaturedDealShowcase();
  startCarouselAutoPlay();

  // Render Flash Deals Cards
  renderFlashDealsGrid();

  // Start Realtime Countdown Loop
  startDealCountdowns();

  // Live background sync from backend promotions API
  syncPromotionsFromApi().then(() => {
    const refreshedDeals = getActiveHotDeals();
    refreshedDeals.forEach(deal => {
      const totalRemaining = deal.remainingTime ? deal.remainingTime.totalSeconds : (deal.durationSeconds || (6 * 3600));
      flashDealTimers.set(deal.id, totalRemaining);
    });
    renderDealCategoryTabs();
    renderFeaturedDealShowcase();
    renderFlashDealsGrid();
  }).catch(() => {});
}

/**
 * Starts global ticking intervals for all timers on the page
 */
function startDealCountdowns() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    // 1. Weekend Sale Main Countdown (Timer Type 1: Hot Deals master timer)
    updateWeekendSaleTimerDisplay();

    // 2. Flash Deals Timers
    flashDealTimers.forEach((seconds, dealId) => {
      if (seconds > 0) {
        flashDealTimers.set(dealId, seconds - 1);
        updateFlashDealTimerDisplay(dealId, seconds - 1);
      }
    });

    // 3. Featured Deal Bundle Countdown (Timer Type 2: Per active bundle slide)
    updateFeaturedDealTimerDisplay();
  }, 1000);

  // Immediate initial update
  updateWeekendSaleTimerDisplay();
  updateFeaturedDealTimerDisplay();
}

/**
 * Formats seconds into { days, hours, mins, secs }
 */
function formatTime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    mins: String(mins).padStart(2, '0'),
    secs: String(secs).padStart(2, '0')
  };
}

/**
 * Updates the Weekend Tech Sale countdown in the hero section and homepage banner (Timer Type 1)
 */
function updateWeekendSaleTimerDisplay() {
  const t = getHomeBannerRemainingTime();

  const daysEl = document.getElementById('deal-hero-timer-days');
  const hrsEl = document.getElementById('deal-hero-timer-hrs');
  const minsEl = document.getElementById('deal-hero-timer-mins');
  const secsEl = document.getElementById('deal-hero-timer-secs');

  if (daysEl) daysEl.textContent = t.days;
  if (hrsEl) hrsEl.textContent = t.hours;
  if (minsEl) minsEl.textContent = t.mins;
  if (secsEl) secsEl.textContent = t.secs;

  const homeDaysEl = document.getElementById('home-deal-timer-days');
  const homeHrsEl = document.getElementById('home-deal-timer-hrs');
  const homeMinsEl = document.getElementById('home-deal-timer-mins');
  const homeSecsEl = document.getElementById('home-deal-timer-secs');

  if (homeDaysEl) homeDaysEl.textContent = t.days;
  if (homeHrsEl) homeHrsEl.textContent = t.hours;
  if (homeMinsEl) homeMinsEl.textContent = t.mins;
  if (homeSecsEl) homeSecsEl.textContent = t.secs;
}

/**
 * Updates the Featured Deal mini countdown for the specific active bundle slide (Timer Type 2)
 */
function updateFeaturedDealTimerDisplay() {
  const bundles = getDealBundles().filter(b => b.active !== false);
  if (bundles.length === 0) return;
  if (activeBundleIndex >= bundles.length) activeBundleIndex = 0;
  const bundle = bundles[activeBundleIndex];
  const t = getBundleRemainingTime(bundle.id);

  const daysEl = document.getElementById('deal-featured-timer-days');
  const hrsEl = document.getElementById('deal-featured-timer-hrs');
  const minsEl = document.getElementById('deal-featured-timer-mins');
  const secsEl = document.getElementById('deal-featured-timer-secs');

  if (daysEl) daysEl.textContent = t.days;
  if (hrsEl) hrsEl.textContent = t.hours;
  if (minsEl) minsEl.textContent = t.mins;
  if (secsEl) secsEl.textContent = t.secs;
}

/**
 * Updates a specific Flash Deal card's timer badge
 */
function updateFlashDealTimerDisplay(dealId, remainingSeconds) {
  const el = document.getElementById(`flash-timer-${dealId}`);
  if (!el) return;

  const hours = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  el.textContent = timeStr;
}

/**
 * Category Definitions for the filter bar
 */
const DEAL_CATEGORIES = [
  { id: 'all', label: 'All Deals', icon: '🔥' },
  { id: 'laptops', label: 'Laptops', icon: '💻' },
  { id: 'gpus', label: 'Graphics Cards', icon: '🎮' },
  { id: 'cpus', label: 'Processors', icon: '⚙️' },
  { id: 'ram', label: 'RAM', icon: '🧠' },
  { id: 'storage', label: 'Storage', icon: '💾' },
  { id: 'monitors', label: 'Monitors', icon: '🖥️' },
  { id: 'accessories', label: 'Accessories', icon: '🎧' }
];

/**
 * Renders the Deal Category Filter Pills
 */
export function renderDealCategoryTabs() {
  const container = document.getElementById('deals-category-tabs');
  if (!container) return;

  container.innerHTML = DEAL_CATEGORIES.map(cat => {
    const isActive = activeDealCategory === cat.id;
    return `
      <button 
        onclick="filterDealsByCategory('${cat.id}')"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 whitespace-nowrap shadow-sm ${
          isActive
            ? 'bg-blue-600 text-white shadow-blue-500/20'
            : 'bg-white text-[#475569] border border-[#e2e8f0] hover:text-blue-600 hover:border-blue-300 hover:bg-[#f8fafc]'
        }">
        <span>${cat.icon}</span>
        <span>${cat.label}</span>
      </button>
    `;
  }).join('');
}

/**
 * Handles category selection from the filter bar
 */
export function filterDealsByCategory(categoryId) {
  activeDealCategory = categoryId.toLowerCase();
  renderDealCategoryTabs();
  renderFlashDealsGrid();
}

/**
 * Renders the grid of Flash Deals cards
 */
export function renderFlashDealsGrid() {
  const container = document.getElementById('flash-deals-grid');
  if (!container) return;

  const activeHotDeals = getActiveHotDeals();
  if (activeHotDeals.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 px-6 text-center bg-white rounded-2xl border border-[#e2e8f0]">
        <div class="text-4xl mb-2">⚡</div>
        <h4 class="text-base font-bold text-[#0f172a]">No hot deals available at the moment</h4>
        <p class="text-xs text-[#64748b] mt-1">Check back soon for new flash sales or explore our full hardware catalog.</p>
        <a href="#shop" class="inline-flex items-center space-x-1.5 mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all shadow-sm">
          <span>Explore Catalog</span>
          <span>→</span>
        </a>
      </div>
    `;
    return;
  }

  let filtered = activeHotDeals;
  if (activeDealCategory !== 'all') {
    filtered = activeHotDeals.filter(d => (d.category || '').toLowerCase() === activeDealCategory);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-12 text-center bg-white rounded-2xl border border-[#e2e8f0]">
        <div class="text-4xl mb-2">⚡</div>
        <h4 class="text-base font-bold text-[#0f172a]">No deals found for this category</h4>
        <p class="text-xs text-[#64748b] mt-1">Check back soon or explore our full hardware catalog.</p>
        <button onclick="filterDealsByCategory('all')" class="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 transition-all cursor-pointer">
          View All Deals
        </button>
      </div>
    `;
    return;
  }

  const allStoredProducts = getStoredProducts();

  container.innerHTML = filtered.map(deal => {
    const dealProduct = allStoredProducts.find(p => p.id === deal.productId);
    const isWishlisted = isInWishlist(deal.productId || deal.id);
    const remainingSecs = flashDealTimers.get(deal.id) || deal.timerSeconds;
    const hours = Math.floor(remainingSecs / 3600);
    const mins = Math.floor((remainingSecs % 3600) / 60);
    const secs = remainingSecs % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return `
      <div class="group bg-white rounded-2xl border border-[#e2e8f0] p-4 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 transition-all relative overflow-hidden">
        
        <div>
          <!-- Top Badges Row: Discount Badge & Live Timer -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-1 rounded-md bg-rose-500 text-white font-extrabold text-xs tracking-tight shadow-sm">
              ${deal.badge}
            </span>
            <div class="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[#475569] font-mono text-[11px] font-bold">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span id="flash-timer-${deal.id}">${timeStr}</span>
            </div>
          </div>

          <!-- Product Image Showcase -->
          <div class="relative w-full h-44 rounded-xl bg-[#f8fafc] border border-slate-100 flex items-center justify-center p-3 mb-3 overflow-hidden cursor-pointer" onclick="viewProductDetails(${deal.productId})">
            <img 
              src="${deal.image}" 
              alt="${deal.name}" 
              class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300">
            ${dealProduct && dealProduct.brand ? `
              <span class="absolute top-2.5 left-2.5 bg-slate-900/90 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-white/20 shadow-sm">${dealProduct.brand}</span>
            ` : ''}
          </div>

          <!-- Title -->
          <h3 
            onclick="viewProductDetails(${deal.productId})"
            class="text-sm font-bold text-[#0f172a] hover:text-blue-600 transition-colors line-clamp-2 leading-snug cursor-pointer mb-1.5" title="${deal.name}">
            ${deal.name}
          </h3>

          <!-- Rating -->
          <div class="flex items-center space-x-1.5 mb-2.5">
            <div class="flex text-amber-400 text-xs">
              ${iconStar('w-3.5 h-3.5 text-amber-400')}
            </div>
            <span class="text-xs font-bold text-[#0f172a]">${deal.rating}</span>
            <span class="text-[11px] text-[#94a3b8]">(${deal.reviews})</span>
          </div>

          <!-- Price & Savings -->
          <div class="space-y-0.5 mb-3">
            <div class="flex items-baseline space-x-2">
              <span class="text-lg font-black text-blue-600 font-mono tracking-tight">Rs. ${deal.dealPrice.toLocaleString()}</span>
              <del class="text-xs text-[#94a3b8] font-mono">Rs. ${deal.originalPrice.toLocaleString()}</del>
            </div>
            <div class="text-[11px] font-extrabold text-rose-600 uppercase tracking-wide">
              SAVE Rs. ${deal.savingAmount.toLocaleString()}
            </div>
          </div>

          <!-- Sold Progress Bar -->
          <div class="space-y-1 mb-4">
            <div class="w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden border border-slate-200/60">
              <div 
                class="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full transition-all duration-500" 
                style="width: ${deal.soldPercent}%"></div>
            </div>
            <div class="flex justify-between items-center text-[10px] font-semibold text-[#64748b]">
              <span>${deal.soldPercent}% sold</span>
              <span class="text-amber-600 font-bold">${deal.remainingStock} left</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-2 pt-2 border-t border-[#f1f5f9]">
          <button 
            onclick="addToCart(${deal.productId})"
            class="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-1.5 active:scale-95">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
            </svg>
            <span>Add to Cart</span>
          </button>
          
          <button 
            data-wishlist-btn="${deal.productId || deal.id}"
            onclick="toggleDealWishlist(${deal.id}, this)" 
            class="p-2.5 rounded-xl border border-[#e2e8f0] hover:border-rose-300 hover:bg-rose-50 transition-all text-[#64748b] hover:text-rose-600 flex items-center justify-center shadow-sm cursor-pointer"
            title="Add to Wishlist">
            <svg class="w-4 h-4 ${isWishlisted ? 'text-rose-600 fill-rose-600' : 'text-[#64748b]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
        </div>

      </div>
    `;
  }).join('');
}

/**
 * Toggles a deal in user's wishlist
 */
export function toggleDealWishlist(dealId, btnElement) {
  const deal = HOT_DEALS_DATA.find(d => d.id === dealId);
  const targetId = deal ? (deal.productId || deal.id) : dealId;
  toggleWishlist(targetId, btnElement);
  renderFlashDealsGrid();
}

/**
 * Handles purchase action for the Featured Deal Banner
 */
export function buyFeaturedDeal(bundleIdOrProductId = 1) {
  const bundles = getDealBundles();
  const bundle = bundles.find(b => b.id === Number(bundleIdOrProductId));
  if (bundle) {
    addBundleToCart(bundle.id, 1);
  } else {
    addToCart(Number(bundleIdOrProductId), 1);
  }
  window.location.hash = '#cart';
}

/**
 * Renders the Featured Deal Carousel on the DealHot page (Images 2 & 3)
 */
export function renderFeaturedDealShowcase() {
  const container = document.getElementById('featured-deal-showcase-container');
  if (!container) return;

  const bundles = getDealBundles().filter(b => b.active !== false);
  if (bundles.length === 0) {
    container.innerHTML = '';
    return;
  }

  if (activeBundleIndex >= bundles.length) {
    activeBundleIndex = 0;
  }

  const bundle = bundles[activeBundleIndex];
  const t = getBundleRemainingTime(bundle.id);

  container.innerHTML = `
    <div
      class="bg-gradient-to-r from-[#0b1329] via-[#0f2766] to-[#1d4ed8] text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden transition-all duration-500">

      <!-- Subtle Glow Orbs -->
      <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-0 left-1/3 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

      <!-- Carousel Left Navigation Button (<) -->
      ${bundles.length > 1 ? `
        <button onclick="prevFeaturedBundle()" 
          title="Previous Deal Bundle"
          class="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
        </button>
      ` : ''}

      <!-- Carousel Right Navigation Button (>) -->
      ${bundles.length > 1 ? `
        <button onclick="nextFeaturedBundle()" 
          title="Next Deal Bundle"
          class="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-110 shadow-lg cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
        </button>
      ` : ''}

      <!-- Top Row: Badge & Slide Index -->
      <div class="flex items-center justify-between mb-4 relative z-10">
        <span class="px-3.5 py-1 rounded-full ${
          bundle.badge === 'BEST DEAL' ? 'bg-rose-600' : 'bg-blue-600'
        } text-white font-extrabold text-[10px] uppercase tracking-widest shadow-md">
          ${bundle.badge || 'BEST DEAL'}
        </span>
        ${bundles.length > 1 ? `
          <span class="text-[11px] font-mono font-bold text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
            Slide ${activeBundleIndex + 1} of ${bundles.length}
          </span>
        ` : ''}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 px-2 sm:px-4">

        <!-- Left: Featured Rig & Visual Showcase (col-span-5) -->
        <div class="lg:col-span-5 flex items-center justify-center">
          <div class="relative w-full max-w-sm aspect-[4/3] flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 p-4 backdrop-blur-sm shadow-inner group">
            <img src="${bundle.image || 'public/images/home-hero-image-1.png'}" alt="${bundle.title}"
              class="max-h-60 sm:max-h-64 w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500">
          </div>
        </div>

        <!-- Right: Deal Info, Specs, Progress & Countdown (col-span-7) -->
        <div class="lg:col-span-7 space-y-4">
          <div>
            <p class="text-[11px] font-mono font-bold tracking-widest text-blue-300 uppercase">${bundle.eyebrow || 'FEATURED DEAL'}</p>
            <h3 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              ${bundle.title}<br>
              <span class="text-blue-300 font-semibold text-lg sm:text-xl">${bundle.subtitle}</span>
            </h3>
          </div>

          <!-- Package Included Products Breakdown (Real Name, Real Specs & Original Price) -->
          <div class="space-y-2 pt-1">
            <div class="flex items-center space-x-1.5 text-[11px] font-mono font-bold text-blue-200 uppercase tracking-wider">
              ${iconPackage('w-3.5 h-3.5 text-blue-300 flex-shrink-0')}
              <span>Included in This Package (${(bundle.componentsBreakdown || []).length} Components):</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              ${(bundle.componentsBreakdown || []).map(item => {
                const specEntries = Object.entries(item.specs || {}).slice(0, 2);
                const specText = specEntries.map(([k, v]) => v).join(' • ');

                return `
                  <div class="bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl p-2.5 flex items-start space-x-2.5 backdrop-blur-md transition-all shadow-sm">
                    ${item.image ? `
                      <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-contain rounded-lg bg-white/10 p-1 flex-shrink-0">
                    ` : `
                      <div class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0">
                        ${iconPackage('w-5 h-5 text-blue-300')}
                      </div>
                    `}
                    <div class="min-w-0 flex-1">
                      <div class="flex items-start justify-between gap-1">
                        <h4 class="text-xs font-bold text-white line-clamp-1 leading-snug" title="${item.name}">${item.name}</h4>
                        ${item.qty > 1 ? `<span class="text-[10px] font-mono font-extrabold bg-blue-500/40 text-blue-100 px-1.5 py-0.2 rounded border border-blue-400/30">x${item.qty}</span>` : ''}
                      </div>
                      ${specText ? `
                        <p class="text-[10px] text-blue-200/90 font-mono line-clamp-1 mt-0.5 flex items-center space-x-0.5" title="${specText}">
                          ${iconBolt('w-2.5 h-2.5 text-blue-300 inline-block mr-0.5 flex-shrink-0')}
                          <span>${specText}</span>
                        </p>
                      ` : ''}
                      <div class="text-[11px] font-mono font-extrabold text-amber-300 mt-1">
                        Original: Rs. ${Number(item.unitPrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Price Row -->
          <div class="flex flex-wrap items-baseline gap-3 pt-2">
            <div class="flex items-baseline space-x-2">
              <span class="text-xs text-slate-300 font-medium">Now</span>
              <span class="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">Rs. ${Number(bundle.price).toLocaleString()}</span>
            </div>
            <div class="text-sm text-slate-400 font-mono">
              Was <del class="text-slate-400">Rs. ${Number(bundle.originalPrice).toLocaleString()}</del>
            </div>
            <span class="text-xs font-bold text-amber-300 bg-amber-400/15 px-2.5 py-1 rounded-md border border-amber-300/30">
              You Save Rs. ${(Number(bundle.originalPrice) - Number(bundle.price)).toLocaleString()} (${bundle.savingPercent || 10}%)
            </span>
          </div>

          <!-- Progress & Claimed Bar -->
          <div class="space-y-1.5 max-w-lg">
            <div class="flex justify-between items-center text-xs font-semibold">
              <span class="text-slate-200">${bundle.claimedPercent}% Claimed</span>
              <span class="text-amber-300 font-bold">Only ${bundle.stockLeft} units left!</span>
            </div>
            <div class="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div class="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500" style="width: ${bundle.claimedPercent}%"></div>
            </div>
          </div>

          <!-- Mini Countdown & Buy Now CTA -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
            <div class="space-y-1">
              <span class="text-[11px] text-slate-300 font-medium">Offer ends in</span>
              <div class="flex items-center space-x-1.5 font-mono text-xs font-bold">
                <span id="deal-featured-timer-days" class="px-2 py-1 bg-black/40 rounded border border-white/10 text-white">${t.days}</span>
                <span class="text-slate-400">:</span>
                <span id="deal-featured-timer-hrs" class="px-2 py-1 bg-black/40 rounded border border-white/10 text-white">${t.hours}</span>
                <span class="text-slate-400">:</span>
                <span id="deal-featured-timer-mins" class="px-2 py-1 bg-black/40 rounded border border-white/10 text-white">${t.mins}</span>
                <span class="text-slate-400">:</span>
                <span id="deal-featured-timer-secs" class="px-2 py-1 bg-black/40 rounded border border-white/10 text-rose-400 animate-pulse">${t.secs}</span>
              </div>
            </div>

            <button onclick="buyFeaturedDeal(${bundle.id})"
              class="px-8 py-3.5 bg-white hover:bg-slate-100 text-[#0f172a] font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer">
              <span>Buy Now</span>
              <span>→</span>
            </button>
          </div>

        </div>
      </div>

      <!-- Carousel Pagination Indicators at Bottom (Image 3) -->
      ${bundles.length > 1 ? `
        <div class="flex items-center justify-center space-x-2 mt-6 relative z-20">
          ${bundles.map((_, i) => `
            <button onclick="goToFeaturedBundle(${i})" 
              title="Slide ${i + 1}"
              class="h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeBundleIndex 
                  ? 'w-8 bg-white shadow-sm' 
                  : 'w-2.5 bg-white/30 hover:bg-white/60'
              }"></button>
          `).join('')}
        </div>
      ` : ''}

    </div>
  `;
}

export function prevFeaturedBundle() {
  const bundles = getDealBundles().filter(b => b.active !== false);
  if (bundles.length <= 1) return;
  activeBundleIndex = (activeBundleIndex - 1 + bundles.length) % bundles.length;
  renderFeaturedDealShowcase();
  resetCarouselAutoPlay();
}

export function nextFeaturedBundle() {
  const bundles = getDealBundles().filter(b => b.active !== false);
  if (bundles.length <= 1) return;
  activeBundleIndex = (activeBundleIndex + 1) % bundles.length;
  renderFeaturedDealShowcase();
  resetCarouselAutoPlay();
}

export function goToFeaturedBundle(index) {
  activeBundleIndex = Number(index);
  renderFeaturedDealShowcase();
  resetCarouselAutoPlay();
}

function startCarouselAutoPlay() {
  if (carouselAutoPlayTimer) clearInterval(carouselAutoPlayTimer);
  carouselAutoPlayTimer = setInterval(() => {
    const bundles = getDealBundles().filter(b => b.active !== false);
    if (bundles.length > 1) {
      activeBundleIndex = (activeBundleIndex + 1) % bundles.length;
      renderFeaturedDealShowcase();
    }
  }, 6000);
}

function resetCarouselAutoPlay() {
  startCarouselAutoPlay();
}

window.prevFeaturedBundle = prevFeaturedBundle;
window.nextFeaturedBundle = nextFeaturedBundle;
window.goToFeaturedBundle = goToFeaturedBundle;

/**
 * Handles newsletter subscription submission
 */
export async function handleDealsNewsletter(event) {
  if (event) event.preventDefault();
  const input = document.getElementById('deals-newsletter-email');
  if (!input) return;

  const email = input.value.trim();
  if (!email || !email.includes('@') || !email.includes('.')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  try {
    const res = await NewsletterApi.subscribe({
      email,
      source: NEWSLETTER_SOURCE.DEALS_PAGE,
      tags: ['Deals Page', 'VIP Deal Alerts']
    });

    if (res.alreadySubscribed) {
      showToast('ℹ️ You are already subscribed to ETech VIP Deal Alerts!', 'info');
    } else {
      showToast('🎉 You are now subscribed to ETech VIP Deal Alerts!', 'success');
    }
    input.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  }
}
