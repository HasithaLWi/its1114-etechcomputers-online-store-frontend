import {
  getHomeDealBanner,
  saveHomeDealBanner,
  getDealBundles,
  saveDealBundles,
  addDealBundle,
  updateDealBundle,
  deleteDealBundle,
  getAllDiscountsAndDeals,
  updateProductDiscount,
  calculateBundleInventory,
  normalizeBundleItems,
  getHotDeals,
  getActiveHotDeals,
  getHotDealByProductId,
  saveHotDeals,
  addHotDeal,
  updateHotDeal,
  deleteHotDeal,
  toggleHotDealStatus,
  syncPromotionsFromApi
} from '../models/deals_data.js';
import { getStoredProducts } from '../models/data.js';
import { getBadges } from '../models/taxonomy_data.js';
import { getBranches } from './branch_controller.js';
import { createStockTransfer } from '../models/transfers_data.js';
import { openInitiateTransferModal } from './transfer_management_controller.js';
import { closeAdminModal } from './admin_dashboard_controller.js';
import {
  iconClock,
  iconLayers,
  iconPackage,
  iconEdit,
  iconBolt,
  iconTruck,
  iconClose,
  iconEye,
  iconFlame,
  iconPlus,
  iconTag,
  iconAlert,
  iconCheck,
  iconBuilding,
  formatLKR,
  formatDiscount,
  renderCountBadge,
  renderIconBox,
  showToast,
  etechAlert,
  iconTrash
} from '../util/index.js';


let activePromoSubTab = 'home-banner'; // 'home-banner' | 'hot-bundles' | 'discounts' | 'timer-presets'
let currentEditingBundleId = null;

/**
 * Main Entry Point: Renders the Promotions & Deals Tab in Admin Dashboard
 */
export async function renderPromotionsTab() {
  const container = document.getElementById('promotions-tab-container');
  if (!container) return;

  await syncPromotionsFromApi();

  const homeBanner = getHomeDealBanner();
  const bundles = getDealBundles();
  const hotDeals = getHotDeals();
  const discounts = getAllDiscountsAndDeals();

  container.innerHTML = `
    <div class="space-y-6">

      <!-- Header & Quick Actions -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono font-black uppercase">PROMOTIONS & DEALS ENGINE</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">LIVE SYNC</span>
          </div>
          <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight mt-1.5">Deals, Banners & Bundles Management</h2>
          <p class="text-xs text-[#64748b] mt-0.5">Control Home & Hot Deals banners, create promotional bundles with carousels, and manage store discounts.</p>
        </div>

        <!-- Header Action Button -->
        <div class="flex items-center space-x-2.5">
          <button onclick="openBundleFormPage(null)" 
            class="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>New Deal Bundle</span>
          </button>
        </div>
      </div>

      <!-- Promotions Sub-Navigation Tabs (Solid Professional Buttons) -->
      <div class="bg-[#f1f5f9] p-1.5 rounded-xl border border-[#cbd5e1] shadow-xs flex items-center space-x-2 overflow-x-auto">
        <button onclick="switchPromoSubTab('home-banner')"
          class="promo-subtab-btn px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-2 border shadow-sm cursor-pointer ${activePromoSubTab === 'home-banner'
      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/20'
      : 'bg-white hover:bg-slate-50 text-[#1e293b] hover:text-blue-600 border-[#cbd5e1] hover:border-blue-300'
    }">
          <span>Home Deal Banner</span>
          <span class="px-2 py-0.5 text-[10px] rounded-full font-mono font-black ${homeBanner.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
    }">${homeBanner.active !== false ? 'LIVE' : 'OFF'}</span>
        </button>

        <button onclick="switchPromoSubTab('hot-bundles')"
          class="promo-subtab-btn px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-2 border shadow-sm cursor-pointer ${activePromoSubTab === 'hot-bundles'
      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/20'
      : 'bg-white hover:bg-slate-50 text-[#1e293b] hover:text-blue-600 border-[#cbd5e1] hover:border-blue-300'
    }">
          <span>Featured Deal Carousel Bundles</span>
          <span class="px-2 py-0.5 ${activePromoSubTab === 'hot-bundles' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200'} text-[10px] rounded-full font-mono font-black">${bundles.length}</span>
        </button>

        <button onclick="switchPromoSubTab('hot-deals')"
          class="promo-subtab-btn px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-2 border shadow-sm cursor-pointer ${activePromoSubTab === 'hot-deals' || activePromoSubTab === 'discounts'
      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/20'
      : 'bg-white hover:bg-slate-50 text-[#1e293b] hover:text-rose-600 border-[#cbd5e1] hover:border-rose-300'
    }">
          <span>Hot Deals & Flash Sales</span>
          <span class="px-2 py-0.5 ${activePromoSubTab === 'hot-deals' || activePromoSubTab === 'discounts' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'} text-[10px] rounded-full font-mono font-black">${hotDeals.filter(d => d.active).length}</span>
        </button>
      </div>

      <!-- Sub-Tab Content Containers -->
      <div id="promo-subtab-content">
        ${renderActiveSubTabContent(homeBanner, bundles, hotDeals)}
      </div>

    </div>
  `;

  // Attach live preview listeners for home banner form if active
  if (activePromoSubTab === 'home-banner') {
    attachHomeBannerLiveListeners();
  }
}

/**
 * Switch Sub Tab inside Promotions
 */
export function switchPromoSubTab(tabName) {
  activePromoSubTab = tabName;
  renderPromotionsTab();
}

/**
 * Renders appropriate content according to active sub-tab
 */
function renderActiveSubTabContent(homeBanner, bundles, hotDeals) {
  if (activePromoSubTab === 'home-banner') {
    return renderHomeBannerEditor(homeBanner);
  } else if (activePromoSubTab === 'hot-bundles') {
    return renderHotBundlesManager(bundles);
  } else if (activePromoSubTab === 'hot-deals' || activePromoSubTab === 'discounts') {
    return renderHotDealsManager(hotDeals);
  }
  return '';
}

/* ========================================================================== */
/* 1. HOME DEAL BANNER (IMAGE 1)                                              */
/* ========================================================================== */

function renderHomeBannerEditor(banner) {
  const isLive = banner.active !== false;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left 7 Cols: Editor Form -->
      <div class="lg:col-span-7 bg-white border border-[#e2e8f0] rounded-xl p-5 sm:p-6 shadow-sm space-y-5">
        <div class="border-b border-[#e2e8f0] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Edit Home Page Weekend Tech Deal Banner</h3>
            <p class="text-xs text-[#64748b]">Configure headline, highlight text, background image, visibility, and countdown timer.</p>
          </div>
          <span id="hb-status-badge" class="px-2.5 py-1 rounded-md text-[10px] font-mono font-black uppercase inline-flex items-center space-x-1.5 ${isLive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
    }">
            <span class="w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}"></span>
            <span>${isLive ? 'LIVE ON HOMEPAGE' : 'HIDDEN & PAUSED'}</span>
          </span>
        </div>

        <form onsubmit="handleSaveHomeBanner(event)" class="space-y-4">
          
          <!-- Master Visibility & Hot Deals Campaign Toggle Card -->
          <div class="bg-[#f8fafc] border ${isLive ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'} rounded-xl p-4 transition-all">
            <div class="flex items-center justify-between gap-3">
              <div class="space-y-0.5">
                <label for="hb-active-toggle" class="text-xs font-black text-[#0f172a] cursor-pointer flex items-center space-x-2">
                  <span>Show Deal Banner & Run Hot Deals Campaign</span>
                </label>
                <p class="text-[11px] text-[#64748b]">
                  When disabled, the banner is hidden from homepage, hot deal product timers are paused, flash deals are hidden from dealpage, and checkout discounts are disabled. (Bundles remain unaffected).
                </p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="hb-active-toggle" ${isLive ? 'checked' : ''} onchange="updateHomeBannerLivePreview()" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          <!-- Deal Tag -->
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Deal Header Tag</label>
            <input type="text" id="hb-tag" value="${banner.tag || 'WEEKEND TECH DEAL'}" required
              class="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
          </div>

          <!-- Main Title & Highlight -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-[#0f172a] mb-1">Main Headline Line 1</label>
              <input type="text" id="hb-title" value="${banner.title || 'Upgrade your setup'}" required
                class="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-[#0f172a] mb-1">Highlight Line 2</label>
              <input type="text" id="hb-title-highlight" value="${banner.titleHighlight || 'Save up to 20%'}" required
                class="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
            </div>
          </div>

          <!-- Subtitle -->
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Subtitle Text</label>
            <input type="text" id="hb-subtitle" value="${banner.subtitle || 'on selected components'}" required
              class="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
          </div>

          <!-- Background Image URL / Preset -->
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Banner Background Image URL</label>
            <div class="flex items-center space-x-2">
              <input type="text" id="hb-bg-image" value="${banner.bgImage || 'public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg'}" required
                class="flex-1 px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
              <button type="button" onclick="document.getElementById('hb-bg-image').value = 'public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg'; updateHomeBannerLivePreview();"
                class="px-3 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-xs font-bold rounded-lg hover:bg-[#f1f5f9] cursor-pointer">
                Default
              </button>
            </div>
          </div>

          <!-- Countdown Timer Setting -->
          <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-4 space-y-3">
            <div class="flex items-center space-x-1.5">
              ${iconClock('w-4 h-4 text-blue-600 flex-shrink-0')}
              <span class="text-xs font-bold text-[#0f172a] uppercase tracking-wider block">Countdown Timer Settings</span>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label class="block text-[10px] font-bold text-[#64748b] uppercase">Days</label>
                <input type="number" id="hb-days" min="0" max="30" value="${banner.durationDays || 2}"
                  class="w-full px-2.5 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-center">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-[#64748b] uppercase">Hours</label>
                <input type="number" id="hb-hours" min="0" max="23" value="${banner.durationHours || 14}"
                  class="w-full px-2.5 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-center">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-[#64748b] uppercase">Mins</label>
                <input type="number" id="hb-mins" min="0" max="59" value="${banner.durationMins || 31}"
                  class="w-full px-2.5 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-center">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-[#64748b] uppercase">Secs</label>
                <input type="number" id="hb-secs" min="0" max="59" value="${banner.durationSecs || 59}"
                  class="w-full px-2.5 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-center">
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="flex items-center space-x-2 pt-1 flex-wrap gap-1">
              <span class="text-[10px] font-bold text-[#64748b]">Presets:</span>
              <button type="button" onclick="setHomeBannerTimerPreset(7, 0, 0, 0)" class="px-2 py-1 bg-white border border-[#e2e8f0] rounded text-[10px] font-bold text-[#475569] hover:text-blue-600 cursor-pointer">1 Week</button>
              <button type="button" onclick="setHomeBannerTimerPreset(3, 0, 0, 0)" class="px-2 py-1 bg-white border border-[#e2e8f0] rounded text-[10px] font-bold text-[#475569] hover:text-blue-600 cursor-pointer">3 Days</button>
              <button type="button" onclick="setHomeBannerTimerPreset(2, 14, 30, 0)" class="px-2 py-1 bg-white border border-[#e2e8f0] rounded text-[10px] font-bold text-[#475569] hover:text-blue-600 cursor-pointer">Weekend Special</button>
              <button type="button" onclick="setHomeBannerTimerPreset(1, 0, 0, 0)" class="px-2 py-1 bg-white border border-[#e2e8f0] rounded text-[10px] font-bold text-[#475569] hover:text-blue-600 cursor-pointer">24 Hours</button>
            </div>
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
            <div class="text-[11px] text-[#64748b]">
              Last updated: <span class="font-mono">${new Date(banner.lastUpdated || Date.now()).toLocaleTimeString()}</span>
            </div>
            <button type="submit" 
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Save & Publish Live</span>
            </button>
          </div>

        </form>
      </div>

      <!-- Right 5 Cols: Real-Time Preview (Image 1 Style) -->
      <div class="lg:col-span-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-1.5">
            ${iconEye('w-3.5 h-3.5 text-blue-600')}
            <span>Live Home Banner Preview</span>
          </span>
          <span id="hb-preview-badge" class="px-2 py-0.5 rounded text-[10px] font-bold border">
            <!-- Injected by updateHomeBannerLivePreview -->
          </span>
        </div>

        <div id="hb-live-preview-container" class="rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <!-- Rendered by updateHomeBannerLivePreview() -->
        </div>
      </div>

    </div>
  `;
}

function attachHomeBannerLiveListeners() {
  const ids = ['hb-tag', 'hb-title', 'hb-title-highlight', 'hb-subtitle', 'hb-bg-image', 'hb-days', 'hb-hours', 'hb-mins', 'hb-secs', 'hb-active-toggle'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateHomeBannerLivePreview);
      el.addEventListener('change', updateHomeBannerLivePreview);
    }
  });
  updateHomeBannerLivePreview();
}

export function updateHomeBannerLivePreview() {
  const container = document.getElementById('hb-live-preview-container');
  if (!container) return;

  const isActive = document.getElementById('hb-active-toggle')?.checked ?? true;
  const previewBadge = document.getElementById('hb-preview-badge');
  if (previewBadge) {
    if (isActive) {
      previewBadge.className = 'px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200';
      previewBadge.textContent = 'REAL-TIME LIVE';
    } else {
      previewBadge.className = 'px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200';
      previewBadge.textContent = 'PAUSED / HIDDEN';
    }
  }

  const tag = document.getElementById('hb-tag')?.value || 'WEEKEND TECH DEAL';
  const title = document.getElementById('hb-title')?.value || 'Upgrade your setup';
  const titleHighlight = document.getElementById('hb-title-highlight')?.value || 'Save up to 20%';
  const subtitle = document.getElementById('hb-subtitle')?.value || 'on selected components';
  const bgImage = document.getElementById('hb-bg-image')?.value || 'public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg';
  const days = document.getElementById('hb-days')?.value || '02';
  const hours = document.getElementById('hb-hours')?.value || '14';
  const mins = document.getElementById('hb-mins')?.value || '31';
  const secs = document.getElementById('hb-secs')?.value || '59';

  container.innerHTML = `
    <div
      class="min-h-[360px] text-white rounded-2xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden bg-[#0042c6]"
      style="background-image: url('${bgImage}'); background-size: cover; background-position: center right; background-repeat: no-repeat;">
      
      <!-- Rosette Ribbon Badge Top Right -->
      <div class="absolute top-2 right-3 z-20 w-11 h-14 drop-shadow-md pointer-events-none">
        <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
          <path d="M15 28L9 52L19 45L22 52L19 28" fill="#1d4ed8"/>
          <path d="M33 28L39 52L29 45L26 52L29 28" fill="#2563eb"/>
          <circle cx="24" cy="20" r="18" fill="#3b82f6" stroke="#ffffff" stroke-width="2.5"/>
          <circle cx="24" cy="20" r="14" fill="#1d4ed8"/>
          <text x="24" y="26" fill="white" font-size="16" font-weight="900" font-family="system-ui, sans-serif" text-anchor="middle">%</text>
        </svg>
      </div>

      ${!isActive ? `
        <!-- Paused Overlay Badge -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-30 flex flex-col items-center justify-center p-4 text-center">
          <span class="px-3 py-1.5 rounded-lg bg-amber-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-md flex items-center space-x-1.5">
            <span>Banner Hidden & Hot Deals Paused</span>
          </span>
          <p class="text-xs text-white/90 font-medium mt-2 max-w-[240px]">
            This banner is currently hidden from the homepage and hot deals discounts are disabled.
          </p>
        </div>
      ` : ''}

      <!-- Deal Details -->
      <div class="space-y-1.5 relative z-10 max-w-[270px]">
        <span class="text-[11px] font-mono font-extrabold uppercase tracking-widest text-white/90">
          ${tag}
        </span>
        <h3 class="text-2xl font-extrabold text-white tracking-tight leading-snug">
          ${title}<br>
          ${titleHighlight}<br>
          <span class="text-white/90 text-base font-medium">${subtitle}</span>
        </h3>
      </div>

      <!-- Countdown Timer Blocks -->
      <div class="my-4 grid grid-cols-4 gap-2 text-center relative z-10 max-w-[270px]">
        <div class="bg-[#0b2b80]/50 backdrop-blur-md rounded-lg py-2 px-1 border border-white/25">
          <span class="block text-base font-extrabold font-mono leading-none text-white">${String(days).padStart(2, '0')}</span>
          <span class="text-[9px] uppercase tracking-wider text-blue-100">Days</span>
        </div>
        <div class="bg-[#0b2b80]/50 backdrop-blur-md rounded-lg py-2 px-1 border border-white/25">
          <span class="block text-base font-extrabold font-mono leading-none text-white">${String(hours).padStart(2, '0')}</span>
          <span class="text-[9px] uppercase tracking-wider text-blue-100">Hours</span>
        </div>
        <div class="bg-[#0b2b80]/50 backdrop-blur-md rounded-lg py-2 px-1 border border-white/25">
          <span class="block text-base font-extrabold font-mono leading-none text-white">${String(mins).padStart(2, '0')}</span>
          <span class="text-[9px] uppercase tracking-wider text-blue-100">Mins</span>
        </div>
        <div class="bg-[#0b2b80]/50 backdrop-blur-md rounded-lg py-2 px-1 border border-white/25">
          <span class="block text-base font-extrabold font-mono leading-none text-white">${String(secs).padStart(2, '0')}</span>
          <span class="text-[9px] uppercase tracking-wider text-blue-100">Secs</span>
        </div>
      </div>

      <!-- CTA Button (Standardized) -->
      <div class="relative z-10">
        <span class="inline-flex items-center space-x-2 px-5 py-2.5 bg-white text-[#0f172a] font-bold text-xs rounded-lg shadow-md">
          <span>Shop Deals</span>
          <svg class="w-3.5 h-3.5 text-[#0f172a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </span>
      </div>
    </div>
  `;
}

window.handleSaveHomeBanner = function (event) {
  if (event) event.preventDefault();

  const isActive = document.getElementById('hb-active-toggle') ? document.getElementById('hb-active-toggle').checked : true;

  const bannerData = {
    active: isActive,
    tag: document.getElementById('hb-tag').value.trim(),
    title: document.getElementById('hb-title').value.trim(),
    titleHighlight: document.getElementById('hb-title-highlight').value.trim(),
    subtitle: document.getElementById('hb-subtitle').value.trim(),
    bgImage: document.getElementById('hb-bg-image').value.trim(),
    durationDays: parseInt(document.getElementById('hb-days').value) || 0,
    durationHours: parseInt(document.getElementById('hb-hours').value) || 0,
    durationMins: parseInt(document.getElementById('hb-mins').value) || 0,
    durationSecs: parseInt(document.getElementById('hb-secs').value) || 0,
    buttonText: 'Shop Deals',
    targetUrl: '#deals'
  };

  saveHomeDealBanner(bannerData);
  window.dispatchEvent(new Event('productsUpdated'));
  if (isActive) {
    showToast('Home Page Weekend Tech Deal Banner saved & published live!', 'success');
  } else {
    showToast('Home Page Deal Banner hidden and Hot Deals campaign paused.', 'info');
  }
  renderPromotionsTab();
};

window.setHomeBannerTimerPreset = function (days, hours, mins, secs) {
  if (document.getElementById('hb-days')) document.getElementById('hb-days').value = days;
  if (document.getElementById('hb-hours')) document.getElementById('hb-hours').value = hours;
  if (document.getElementById('hb-mins')) document.getElementById('hb-mins').value = mins;
  if (document.getElementById('hb-secs')) document.getElementById('hb-secs').value = secs;
  updateHomeBannerLivePreview();
};

/* ========================================================================== */
/* 2. FEATURED DEAL BUNDLES MANAGER & CAROUSEL CRUD (IMAGES 2 & 3)             */
/* ========================================================================== */

function renderHotBundlesManager(bundles) {
  return `
    <div class="space-y-6">
      
      <!-- Info Header -->
      <div class="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
            ${iconLayers('w-5 h-5 text-white')}
          </div>
          <div>
            <h4 class="text-sm font-bold text-[#0f172a]">DealHot Featured Deal Carousel Slides</h4>
            <p class="text-xs text-[#64748b]">These bundle packages cycle dynamically on the Hot Deals page showcase banner with interactive carousel controls (&lt; &gt; arrows & dot indicators).</p>
          </div>
        </div>
        <button onclick="openBundleFormPage(null)"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer">
          ${iconPlus('w-3.5 h-3.5')}
          <span>Add New Slide</span>
        </button>
      </div>

      <!-- Bundles Grid / Cards List -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${bundles.map((bundle, index) => `
          <div class="bg-white border ${bundle.active ? 'border-[#e2e8f0]' : 'border-dashed border-slate-300 opacity-75'} rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            
            <!-- Top Slide Number Badge & Status -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-2">
                <span class="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                  ${index + 1}
                </span>
                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${bundle.badge === 'BEST DEAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
    }">
                  ${bundle.badge}
                </span>
              </div>
              <button onclick="toggleBundleActiveStatus(${bundle.id})" 
                class="px-2.5 py-1 rounded text-[10px] font-bold cursor-pointer ${bundle.active
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
    }">
                ${bundle.active ? '● Active in Carousel' : '○ Inactive'}
              </button>
            </div>

            <!-- Visual Showcase -->
            <div class="relative h-36 rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-3 mb-3 overflow-hidden">
              <img src="${bundle.image}" alt="${bundle.title}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300">
              <span class="absolute bottom-2 left-2 text-[9px] font-mono text-blue-200 uppercase bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                ${bundle.eyebrow}
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-1.5 mb-3 flex-1">
              <h4 class="text-sm font-extrabold text-[#0f172a] line-clamp-1">${bundle.title}</h4>
              <p class="text-xs text-[#64748b] line-clamp-1">${bundle.subtitle}</p>

              <!-- Included Products Breakdown -->
              <div class="space-y-1 pt-1 border-t border-slate-100">
                <div class="flex items-center space-x-1 mb-1">
                  ${iconPackage('w-3.5 h-3.5 text-slate-500 flex-shrink-0')}
                  <span class="text-[10px] font-bold text-[#64748b] uppercase tracking-wider block">Included Products:</span>
                </div>
                <div class="space-y-1">
                  ${(bundle.componentsBreakdown || []).map(item => `
                    <div class="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div class="flex items-center space-x-1.5 min-w-0 flex-1">
                        <span class="font-bold text-[#0f172a] truncate" title="${item.name}">${item.name}</span>
                        ${item.qty > 1 ? `<span class="text-[9px] font-bold px-1 bg-blue-100 text-blue-800 rounded">x${item.qty}</span>` : ''}
                      </div>
                      <span class="text-[10px] font-mono text-slate-500 whitespace-nowrap ml-2">Rs. ${Number(item.unitPrice).toLocaleString()}</span>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Price & Savings -->
              <div class="flex items-baseline space-x-2 pt-2">
                <span class="text-base font-extrabold font-mono text-blue-600">Rs. ${Number(bundle.price).toLocaleString()}</span>
                <del class="text-xs font-mono text-slate-400">Rs. ${Number(bundle.originalPrice).toLocaleString()}</del>
                <span class="text-[10px] font-bold text-amber-600">(-${bundle.savingPercent}%)</span>
              </div>

              <!-- Claimed Progress -->
              <div class="pt-1">
                <div class="flex justify-between text-[10px] font-semibold text-[#64748b] mb-0.5">
                  <span>${bundle.claimedPercent}% Claimed</span>
                  <span class="text-amber-600 font-bold">${bundle.stockLeft} units left</span>
                </div>
                <div class="w-full bg-[#f1f5f9] h-1.5 rounded-full overflow-hidden">
                  <div class="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full" style="width: ${bundle.claimedPercent}%"></div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2">
              <button onclick="openBundleFormPage(${bundle.id})"
                class="flex-1 py-1.5 px-3 bg-[#f8fafc] hover:bg-blue-50 text-[#0f172a] hover:text-blue-600 border border-[#e2e8f0] hover:border-blue-300 font-bold text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer">
                ${iconEdit('w-3.5 h-3.5')}
                <span>Edit Bundle</span>
              </button>
              <button onclick="handleDeleteBundle(${bundle.id})"
                class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                title="Delete Bundle Slide">
                ${iconTrash('w-4 h-4')}
              </button>
            </div>

          </div>
        `).join('')}
      </div>

    </div>
  `;
}

window.toggleBundleActiveStatus = function (id) {
  const bundles = getDealBundles();
  const bundle = bundles.find(b => b.id === Number(id));
  if (!bundle) return;

  updateDealBundle(id, { active: !bundle.active });
  showToast(`Bundle "${bundle.title}" is now ${!bundle.active ? 'Active in Carousel' : 'Inactive'}.`);
  renderPromotionsTab();
};

window.handleDeleteBundle = async function (id) {
  const confirmed = await etechAlert.confirmDelete('this Deal Bundle slide', 'It will be removed from the homepage promotions carousel.');
  if (!confirmed) return;

  deleteDealBundle(id);
  showToast('Deal bundle deleted.', 'success');
  renderPromotionsTab();
};

/* ========================================================================== */
/* 3. RELATIONAL HOT DEALS & FLASH SALES MANAGEMENT                            */
/* ========================================================================== */

function renderHotDealsManager(hotDeals) {
  return `
    <div class="space-y-4">
      
      <!-- Top Action & Filter Header -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="text-sm font-extrabold text-[#0f172a]">Active Hot Deals & Flash Sale Products</h3>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              ${hotDeals.filter(d => d.active).length} Active Deals
            </span>
          </div>
          <p class="text-xs text-[#64748b] mt-0.5">Link store products to promotional deal prices & countdown timers. Overrides catalog price during campaign.</p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <input type="text" id="hot-deal-search-input" onkeyup="filterHotDealsTable(this.value)" placeholder="Search deals by product / SKU..."
            class="px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs focus:border-blue-600 focus:outline-none w-full sm:w-56">

          <button onclick="openHotDealModal(null)"
            class="px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>+ Add Hot Deal Product</span>
          </button>
        </div>
      </div>

      <!-- Hot Deals Table -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#475569]">
            <thead class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] font-mono uppercase text-[#64748b] tracking-wider">
              <tr>
                <th class="p-3.5">Product & SKU</th>
                <th class="p-3.5 text-right">Catalog Price</th>
                <th class="p-3.5 text-right">Hot Deal Price</th>
                <th class="p-3.5 text-center">Savings & Badge</th>
                <th class="p-3.5 text-center">Timer Remaining</th>
                <th class="p-3.5 text-center">Sales Quota</th>
                <th class="p-3.5 text-center">Status</th>
                <th class="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="hot-deals-table-body" class="divide-y divide-[#e2e8f0]">
              ${hotDeals.length === 0 ? `
                <tr>
                  <td colspan="8" class="text-center py-10 text-slate-400">
                    <p class="text-sm font-semibold">No Hot Deal items configured yet.</p>
                    <button onclick="openHotDealModal(null)" class="mt-2 px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg">+ Create First Deal</button>
                  </td>
                </tr>
              ` : hotDeals.map(d => {
    const isLive = d.active && !d.isExpired;
    const timeStr = `${d.remainingTime.days > 0 ? d.remainingTime.days + 'd ' : ''}${d.remainingTime.hours}h ${d.remainingTime.mins}m ${d.remainingTime.secs}s`;
    return `
                  <tr class="hover:bg-[#f8fafc] transition-colors">
                    <td class="p-3.5">
                      <div class="flex items-center space-x-3">
                        <img src="${d.image}" class="w-10 h-10 object-contain rounded-lg bg-[#f1f5f9] border border-slate-200 flex-shrink-0">
                        <div>
                          <span class="font-bold text-[#0f172a] block line-clamp-1">${d.name}</span>
                          <div class="flex items-center space-x-2 text-[10px] font-mono text-[#94a3b8]">
                            <span>SKU: ${d.sku}</span>
                            <span>•</span>
                            <span class="capitalize text-blue-600 font-semibold">${d.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Catalog Regular Price -->
                    <td class="p-3.5 text-right font-mono">
                      <div class="text-[#0f172a] font-bold">Rs. ${d.regularPrice.toLocaleString()}</div>
                      ${d.originalPrice > d.regularPrice ? `<del class="text-[10px] text-slate-400">Rs. ${d.originalPrice.toLocaleString()}</del>` : ''}
                    </td>

                    <!-- Special Hot Deal Price -->
                    <td class="p-3.5 text-right font-mono">
                      <div class="text-base font-extrabold text-rose-600">Rs. ${d.dealPrice.toLocaleString()}</div>
                      <span class="text-[10px] font-semibold text-emerald-600">Overrides Catalog</span>
                    </td>

                    <!-- Discount & Badge -->
                    <td class="p-3.5 text-center">
                      <div class="inline-flex flex-col items-center space-y-1">
                        <span class="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                          Save Rs. ${d.savingAmount.toLocaleString()} (${d.discountPercent}%)
                        </span>
                        <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          ${d.badge}
                        </span>
                      </div>
                    </td>

                                    <!-- Countdown Timer -->
                    <td class="p-3.5 text-center min-w-[130px] whitespace-nowrap">
                      ${isLive ? `
                        <div class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-amber-300 font-mono text-xs font-bold border border-slate-700 shadow-sm">
                          ${iconClock('w-3.5 h-3.5 text-amber-400 flex-shrink-0')}
                          <span>${timeStr}</span>
                        </div>
                      ` : `
                        <span class="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          ${iconAlert('w-3 h-3 text-rose-600 flex-shrink-0')}
                          <span>Deal Expired</span>
                        </span>
                      `}
                    </td>

                    <!-- Sales Quota -->
                    <td class="p-3.5 text-center">
                      <div class="space-y-1 max-w-[120px] mx-auto">
                        <div class="flex items-center justify-between text-[10px] font-mono">
                          <span class="font-bold text-slate-700">${d.soldCount} sold</span>
                          <span class="text-slate-400">${d.stockLeft} left</span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div class="bg-rose-500 h-1.5 rounded-full" style="width: ${d.soldPercent}%"></div>
                        </div>
                      </div>
                    </td>

                    <!-- Status Toggle -->
                    <td class="p-3.5 text-center">
                      <button onclick="handleToggleHotDealStatus(${d.id})" title="Toggle Active Status"
                        class="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border cursor-pointer ${isLive
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
        : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
      }">
                        ${isLive ? '● Live' : (d.isExpired ? '○ Expired' : '○ Paused')}
                      </button>
                    </td>

                    <!-- Actions -->
                    <td class="p-3.5 text-right">
                      <div class="flex items-center justify-end space-x-1.5">
                        <button onclick="openHotDealModal(${d.id})"
                          class="px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-xs font-bold border border-slate-300 transition-colors flex items-center space-x-1 cursor-pointer">
                          ${iconEdit('w-3.5 h-3.5')}
                          <span>Edit</span>
                        </button>
                        <button onclick="handleDeleteHotDeal(${d.id})"
                          class="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Remove Hot Deal">
                          ${iconTrash('w-4 h-4')}
                        </button>
                      </div>
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

window.filterHotDealsTable = function (query) {
  const q = (query || '').toLowerCase();
  const rows = document.querySelectorAll('#hot-deals-table-body tr');
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q) ? '' : 'none';
  });
};

/**
 * Hot Deal Modal (Image 5 & Step 5)
 */
export function openHotDealModal(dealId = null) {
  let modalEl = document.getElementById('admin-hot-deal-modal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'admin-hot-deal-modal';
    document.body.appendChild(modalEl);
  }

  const products = getStoredProducts();
  const isEdit = Boolean(dealId);
  const deal = isEdit ? getHotDealByProductId(dealId) || getHotDeals().find(d => d.id === Number(dealId)) : null;

  const initialProductId = deal ? deal.productId : (products[0]?.id || 1);
  const initialProduct = products.find(p => p.id === initialProductId) || products[0];

  modalEl.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto';
  modalEl.innerHTML = `
    <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase font-mono">
            ${isEdit ? 'EDIT HOT DEAL' : 'NEW HOT DEAL CAMPAIGN'}
          </span>
          <h3 class="text-base font-extrabold text-[#0f172a] mt-1">${isEdit ? 'Configure Hot Deal Product' : 'Add Product to Hot Deals'}</h3>
        </div>
        <button type="button" onclick="closeHotDealModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer" aria-label="Close">
          ${iconClose('w-4 h-4')}
        </button>
      </div>

      <form id="hot-deal-modal-form" onsubmit="handleSaveHotDealSubmit(event, ${deal ? deal.id : 'null'})" class="space-y-4">
        
        <!-- 1. Select Product -->
        <div>
          <label class="block text-xs font-bold text-[#0f172a] mb-1">Select Hardware Product *</label>
          <select id="hdm-product-id" onchange="updateHotDealModalProductDetails()" required
            class="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
            ${products.map(p => `
              <option value="${p.id}" ${p.id === initialProductId ? 'selected' : ''}>
                ${p.name} — Catalog Price: Rs. ${Number(p.price).toLocaleString()} (${p.totalStock} in stock)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Product Preview Card -->
        <div id="hdm-product-preview-box" class="bg-blue-50/60 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs">
          <div class="flex items-center space-x-3">
            <img id="hdm-prev-img" src="${initialProduct?.image || ''}" class="w-10 h-10 object-contain rounded bg-white border border-blue-200">
            <div>
              <span id="hdm-prev-name" class="font-bold text-[#0f172a] block line-clamp-1">${initialProduct?.name || ''}</span>
              <span class="text-[11px] text-[#64748b]">Regular Price: <strong id="hdm-prev-catalog-price" class="text-blue-700 font-mono">Rs. ${Number(initialProduct?.price || 0).toLocaleString()}</strong> | List: <span id="hdm-prev-orig-price" class="line-through font-mono">Rs. ${Number(initialProduct?.originalPrice || initialProduct?.price || 0).toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        <!-- 2. Pricing & Savings -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Hot Deal Promo Price (Rs.) *</label>
            <input type="number" id="hdm-deal-price" min="100" step="100" value="${deal ? deal.dealPrice : Math.round((initialProduct?.price || 100000) * 0.85)}" required oninput="calculateHotDealModalSavings()"
              class="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-rose-600 focus:border-rose-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Deal Badge Label</label>
            <div class="relative">
              <input type="text" id="hdm-badge" value="HOT DEAL" readonly
                class="w-full px-3.5 py-2.5 bg-slate-100 border border-[#e2e8f0] rounded-lg text-xs font-extrabold text-rose-700 cursor-not-allowed uppercase font-mono shadow-inner">
              <span class="absolute right-2.5 top-2.5 text-[9px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.5 rounded font-black tracking-wider">DEFAULT SYSTEM BADGE</span>
            </div>
            <p class="text-[10px] text-[#64748b] mt-1">Locked default badge: promotional hot deals automatically display <strong>HOT DEAL</strong>.</p>
          </div>
        </div>

        <!-- Dynamic Live Savings Indicator -->
        <div id="hdm-savings-indicator" class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold flex items-center justify-between">
          <span>Customer Savings:</span>
          <span id="hdm-savings-text" class="font-mono">Save Rs. 40,000 (15% Off)</span>
        </div>

        <!-- 3. Countdown Timer Settings -->
        <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 space-y-2">
          <div class="flex items-center space-x-1.5">
            ${iconClock('w-3.5 h-3.5 text-rose-600 flex-shrink-0')}
            <span class="text-xs font-bold text-[#0f172a] uppercase tracking-wider block">Deal Countdown Duration</span>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <div>
              <label class="block text-[10px] font-bold text-[#64748b] uppercase">Days</label>
              <input type="number" id="hdm-days" min="0" max="30" value="${deal ? (deal.durationDays || 0) : 0}" class="w-full px-2 py-1.5 bg-white border border-[#e2e8f0] rounded text-center text-xs font-mono font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#64748b] uppercase">Hours</label>
              <input type="number" id="hdm-hours" min="0" max="23" value="${deal ? (deal.durationHours !== undefined ? deal.durationHours : 8) : 8}" class="w-full px-2 py-1.5 bg-white border border-[#e2e8f0] rounded text-center text-xs font-mono font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#64748b] uppercase">Mins</label>
              <input type="number" id="hdm-mins" min="0" max="59" value="${deal ? (deal.durationMins || 0) : 0}" class="w-full px-2 py-1.5 bg-white border border-[#e2e8f0] rounded text-center text-xs font-mono font-bold">
            </div>
            <div>
              <label class="block text-[10px] font-bold text-[#64748b] uppercase">Secs</label>
              <input type="number" id="hdm-secs" min="0" max="59" value="${deal ? (deal.durationSecs || 0) : 0}" class="w-full px-2 py-1.5 bg-white border border-[#e2e8f0] rounded text-center text-xs font-mono font-bold">
            </div>
          </div>
          <!-- Timer Presets -->
          <div class="flex items-center space-x-2 pt-1 text-[10px]">
            <span class="text-[#64748b] font-bold">Presets:</span>
            <button type="button" onclick="setHotDealModalTimer(0, 24, 0, 0)" class="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:text-blue-600 cursor-pointer">24-Hour Flash</button>
            <button type="button" onclick="setHotDealModalTimer(3, 0, 0, 0)" class="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:text-blue-600 cursor-pointer">3-Day Weekend</button>
            <button type="button" onclick="setHotDealModalTimer(7, 0, 0, 0)" class="px-2 py-0.5 bg-white border border-slate-200 rounded font-bold hover:text-blue-600 cursor-pointer">1-Week Mega</button>
          </div>
        </div>

        <!-- 4. Sales Quota & Active Switch -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Target Sales Quota</label>
            <input type="number" id="hdm-quota" min="1" max="500" value="${deal ? deal.targetQuota : 30}" class="w-full px-3 py-2 bg-white border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold">
          </div>
          <div class="pt-4 flex items-center space-x-3">
            <input type="checkbox" id="hdm-active" ${deal && deal.active === false ? '' : 'checked'} class="w-4 h-4 text-blue-600 rounded cursor-pointer">
            <label for="hdm-active" class="text-xs font-bold text-[#0f172a] cursor-pointer">Live on Store Hot Deals</label>
          </div>
        </div>

        <!-- Submit & Cancel -->
        <div class="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2.5">
          <button type="button" onclick="closeHotDealModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer">
            ${isEdit ? 'Save Changes' : 'Create Hot Deal'}
          </button>
        </div>

      </form>
    </div>
  `;

  calculateHotDealModalSavings();
}

export function closeHotDealModal() {
  const modalEl = document.getElementById('hot-deal-modal-overlay');
  if (modalEl) modalEl.remove();
}

export function updateHotDealModalProductDetails() {
  const select = document.getElementById('hdm-product-id');
  if (!select) return;
  const products = getStoredProducts();
  const prod = products.find(p => p.id === Number(select.value));
  if (!prod) return;

  const imgEl = document.getElementById('hdm-prev-img');
  const nameEl = document.getElementById('hdm-prev-name');
  const catPriceEl = document.getElementById('hdm-prev-catalog-price');
  const origPriceEl = document.getElementById('hdm-prev-orig-price');

  if (imgEl) imgEl.src = prod.image;
  if (nameEl) nameEl.textContent = prod.name;
  if (catPriceEl) catPriceEl.textContent = `Rs. ${Number(prod.price).toLocaleString()}`;
  if (origPriceEl) origPriceEl.textContent = `Rs. ${Number(prod.originalPrice || prod.price).toLocaleString()}`;

  // Default suggested price (15% below catalog price)
  const dealPriceInput = document.getElementById('hdm-deal-price');
  if (dealPriceInput) {
    dealPriceInput.value = Math.round(Number(prod.price) * 0.85);
  }
  calculateHotDealModalSavings();
}

export function calculateHotDealModalSavings() {
  const select = document.getElementById('hdm-product-id');
  const priceInput = document.getElementById('hdm-deal-price');
  const textEl = document.getElementById('hdm-savings-text');
  if (!select || !priceInput || !textEl) return;

  const products = getStoredProducts();
  const prod = products.find(p => p.id === Number(select.value));
  if (!prod) return;

  const originalPrice = Number(prod.originalPrice || prod.price);
  const dealPrice = Number(priceInput.value) || Number(prod.price);
  const savings = Math.max(0, originalPrice - dealPrice);
  const discountPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  textEl.textContent = `Save Rs. ${savings.toLocaleString()} (${discountPercent}% Off vs List Rs. ${originalPrice.toLocaleString()})`;
}

export function setHotDealModalTimer(days, hours, mins, secs) {
  if (document.getElementById('hdm-days')) document.getElementById('hdm-days').value = days;
  if (document.getElementById('hdm-hours')) document.getElementById('hdm-hours').value = hours;
  if (document.getElementById('hdm-mins')) document.getElementById('hdm-mins').value = mins;
  if (document.getElementById('hdm-secs')) document.getElementById('hdm-secs').value = secs;
}

export async function handleSaveHotDealSubmit(event, dealId = null) {
  if (event) event.preventDefault();

  const productId = Number(document.getElementById('hdm-product-id').value);
  const dealPrice = Number(document.getElementById('hdm-deal-price').value);
  const badge = document.getElementById('hdm-badge').value.trim();
  const durationDays = Number(document.getElementById('hdm-days').value) || 0;
  const durationHours = Number(document.getElementById('hdm-hours').value) || 0;
  const durationMins = Number(document.getElementById('hdm-mins').value) || 0;
  const durationSecs = Number(document.getElementById('hdm-secs').value) || 0;
  const targetQuota = Number(document.getElementById('hdm-quota').value) || 30;
  const active = document.getElementById('hdm-active').checked;

  const dealData = {
    productId,
    dealPrice,
    badge: badge || 'HOT DEAL',
    durationDays,
    durationHours,
    durationMins,
    durationSecs,
    targetQuota,
    active,
    resetTimer: true
  };

  const isEdit = Boolean(dealId);
  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Hot Deal for "${product ? product.name : 'Product'}"`, `Promo Price: Rs. ${dealPrice.toLocaleString()} | Quota: ${targetQuota} units`)
    : await etechAlert.confirmCreate(`Hot Deal for "${product ? product.name : 'Product'}"`, `Promo Price: Rs. ${dealPrice.toLocaleString()} | Quota: ${targetQuota} units`);

  if (!confirmed) return;

  if (dealId) {
    updateHotDeal(dealId, dealData);
    showToast('Hot Deal updated successfully!', 'success');
  } else {
    addHotDeal(dealData);
    showToast('New Hot Deal created and live on store!', 'success');
  }

  closeHotDealModal();
  renderPromotionsTab();
  window.dispatchEvent(new Event('productsUpdated'));
}

export async function handleDeleteHotDeal(id) {
  const confirmed = await etechAlert.confirmDelete(
    'Hot Deal campaign',
    'The product will automatically revert to its standard catalog price and leave the flash deals showcase.'
  );

  if (!confirmed) return;

  deleteHotDeal(id);
  showToast('Hot Deal removed. Product reverted to catalog price.', 'info');
  renderPromotionsTab();
  window.dispatchEvent(new Event('productsUpdated'));
}

export function handleToggleHotDealStatus(id) {
  const isNowActive = toggleHotDealStatus(id);
  showToast(isNowActive ? '● Hot Deal activated!' : '○ Hot Deal paused.');
  renderPromotionsTab();
  window.dispatchEvent(new Event('productsUpdated'));
}

/* ========================================================================== */


/* ========================================================================== */
/* 2. DEDICATED DEAL BUNDLE SLIDE EDITOR WORKSPACE (FULL PAGE VIEW)          */
/* ========================================================================== */

/**
 * Open the dedicated Full Page Deal Bundle Slide Workspace with Composite Inventory & Logistics
 */
export function openBundleFormPage(bundleId = null) {
  const bundles = getDealBundles();
  const products = getStoredProducts();
  const branches = getBranches();
  const badges = getBadges().filter(b => b.isActive !== false);

  const bundle = bundleId ? bundles.find(b => b.id === Number(bundleId)) : null;
  currentEditingBundleId = bundle ? bundle.id : null;

  // Specs state array: [{ icon: '🎮', label: 'RTX 4070 Super' }, ...]
  // Included Items state array: [{ productId: 1, qty: 1, name: '...' }, ...]
  let itemsState = [];
  if (bundle && Array.isArray(bundle.bundleItems) && bundle.bundleItems.length > 0) {
    itemsState = normalizeBundleItems(bundle.bundleItems, products);
  } else {
    itemsState = [
      { productId: 1, qty: 1, name: products[0] ? products[0].name : "ASUS GeForce RTX 4070 Super" },
      { productId: 3, qty: 2, name: products[2] ? products[2].name : "Corsair Vengeance 16GB DDR5" },
      { productId: 4, qty: 1, name: products[3] ? products[3].name : "Samsung 990 PRO 1TB SSD" }
    ];
  }
  window.bundleFormItemsState = itemsState;

  // Hide all tab panels and display the dedicated Deal Bundle Form panel
  const tabPanels = document.querySelectorAll('.dashboard-tab-panel');
  tabPanels.forEach(panel => panel.classList.add('hidden'));

  const formPanel = document.getElementById('tab-panel-bundle-form');
  if (formPanel) formPanel.classList.remove('hidden');

  const container = document.getElementById('bundle-form-page-container');
  if (!container) return;

  const isEdit = bundle !== null;
  const inv = calculateBundleInventory({ ...bundle, bundleItems: itemsState }, products, branches);

  const initialPrice = bundle ? Number(bundle.price) : 259999;
  const initialOrigPrice = inv.calculatedMSRP > 0 ? inv.calculatedMSRP : (bundle ? Number(bundle.originalPrice) : 331997);
  const initialSavings = Math.max(0, initialOrigPrice - initialPrice);
  const initialSavingPercent = initialOrigPrice > 0 ? Math.round((initialSavings / initialOrigPrice) * 100) : 0;

  container.innerHTML = `
    <div class="space-y-6 max-w-7xl mx-auto pb-16">
      
      <!-- Top Action Navigation Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div class="flex items-center space-x-3.5">
          <button type="button" onclick="closeBundleFormPage()"
            class="p-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] transition-all border border-[#e2e8f0] flex items-center space-x-2 text-xs font-bold shadow-sm">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Bundles</span>
          </button>
          <div>
            <div class="flex items-center space-x-2 mb-0.5">
              <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ${isEdit ? `Editing Slide #${bundle.id}` : 'New Composite Deal Bundle'}
              </span>
              <span class="text-xs text-[#94a3b8]">/ Promotions & Logistics Engine</span>
            </div>
            <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">
              ${isEdit ? `Edit Deal Bundle: ${bundle.title}` : 'Create Composite Deal Bundle Slide'}
            </h2>
            <p class="text-xs text-[#64748b] mt-0.5">Configure real catalog components, branch assembly logistics, automated claimed urgency, and live carousel preview.</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button type="button" onclick="closeBundleFormPage()"
            class="px-4 py-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs border border-[#e2e8f0] transition-all">
            Cancel
          </button>
          <button type="button" onclick="triggerBundleFormSubmit()"
            class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center space-x-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>${isEdit ? 'Save Changes' : 'Publish Bundle Slide'}</span>
          </button>
        </div>
      </div>

      <!-- Main 2-Column Responsive Workspace Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Left 8 Columns: Comprehensive Configuration Form -->
        <div class="lg:col-span-7 xl:col-span-8 space-y-5">
          <form id="full-bundle-form" onsubmit="handleSaveBundleFormPage(event)" class="space-y-5">

            <!-- Section 1: Campaign Identity & Dynamic Badges -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>1. Bundle Campaign Identity & Badges</span>
                </h3>
                <span class="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">TAXONOMY SYNC</span>
              </div>

              <div class="space-y-3.5 text-xs">
                
                <!-- Dynamic Badge Preset Selector (from Taxonomy) -->
                <div>
                  <label class="block font-bold text-[#0f172a] mb-1.5">Top Badge Pill Tag (from Dynamic Badges)</label>
                  <div class="flex flex-wrap gap-2 mb-2">
                    ${badges.map(b => `
                      <button type="button" onclick="setBundleBadgeTag('${b.name.toUpperCase()}')"
                        class="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition-all hover:border-blue-300 hover:bg-blue-50 bg-[#f8fafc] text-[#475569]">
                        ${b.name}
                      </button>
                    `).join('')}
                    <button type="button" onclick="setBundleBadgeTag('BEST DEAL')" class="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold bg-[#f8fafc] text-[#475569]">BEST DEAL</button>
                    <button type="button" onclick="setBundleBadgeTag('HOT BUNDLE')" class="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold bg-[#f8fafc] text-[#475569]">HOT BUNDLE</button>
                  </div>
                  <input type="text" id="bf-badge" value="${bundle ? bundle.badge : 'BEST DEAL'}" required oninput="updateBundleLivePreview()"
                    placeholder="e.g. BEST DEAL or HOT BUNDLE"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-bold text-xs focus:border-blue-600 focus:outline-none">
                </div>

                <!-- Eyebrow Tag -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold text-[#0f172a] mb-1">Eyebrow Sub-tag</label>
                    <input type="text" id="bf-eyebrow" value="${bundle ? bundle.eyebrow : 'FEATURED DEAL'}" required oninput="updateBundleLivePreview()"
                      placeholder="e.g. FEATURED DEAL or CREATOR WORKSTATION"
                      class="w-full px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono text-xs focus:border-blue-600 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-bold text-[#0f172a] mb-1">Lead Anchor Product ID (For Instant Buy)</label>
                    <input type="number" id="bf-product-id" value="${bundle ? (bundle.productId || 1) : 1}" min="1" required oninput="updateBundleLivePreview()"
                      class="w-full px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono text-xs focus:border-blue-600 focus:outline-none">
                  </div>
                </div>

                <!-- Bundle Title & Subtitle -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold text-[#0f172a] mb-1">Bundle Main Title *</label>
                    <input type="text" id="bf-title" value="${bundle ? bundle.title : 'Ultimate Gaming Power'}" required oninput="updateBundleLivePreview()"
                      placeholder="e.g. Ultimate Gaming Power"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-bold text-sm focus:border-blue-600 focus:outline-none">
                  </div>
                  <div>
                    <label class="block font-bold text-[#0f172a] mb-1">Subtitle / Headline *</label>
                    <input type="text" id="bf-subtitle" value="${bundle ? bundle.subtitle : 'Complete Your Dream Setup'}" required oninput="updateBundleLivePreview()"
                      placeholder="e.g. Complete Your Dream Setup"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600 focus:outline-none">
                  </div>
                </div>

              </div>
            </div>

            <!-- Section 2: Visual Graphic & Media -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span>2. Hero Graphic & Showcase Visual</span>
                </h3>
                <span class="text-[10px] text-[#64748b] font-mono">Showcase Graphic</span>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-[#0f172a] mb-1">Image URL or Local Asset Path</label>
                  <div class="flex items-center space-x-2">
                    <input type="text" id="bf-image" value="${bundle ? bundle.image : 'public/images/home-hero-image-1.png'}" required oninput="updateBundleLivePreview()"
                      placeholder="public/images/home-hero-image-1.png or https://..."
                      class="flex-1 px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600 focus:outline-none">
                    <button type="button" onclick="document.getElementById('bf-image').value = 'public/images/home-hero-image-1.png'; updateBundleLivePreview();"
                      class="px-3 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] text-xs font-bold text-[#475569] rounded-xl transition-colors">
                      Default Hero
                    </button>
                  </div>
                </div>

                <!-- Preset Visual Suggestions -->
                <div class="pt-1">
                  <span class="text-[11px] text-[#64748b] font-semibold block mb-1.5">Quick Graphic Presets:</span>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="document.getElementById('bf-image').value = 'public/images/home-hero-image-1.png'; updateBundleLivePreview();"
                      class="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-blue-50 text-[10px] font-bold text-[#475569] flex items-center space-x-1 cursor-pointer">
                      ${iconPackage('w-3.5 h-3.5 text-blue-600')}
                      <span>Master Rig (Default)</span>
                    </button>
                    <button type="button" onclick="document.getElementById('bf-image').value = 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80'; updateBundleLivePreview();"
                      class="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-blue-50 text-[10px] font-bold text-[#475569] flex items-center space-x-1 cursor-pointer">
                      ${iconLayers('w-3.5 h-3.5 text-purple-600')}
                      <span>Creator Workstation</span>
                    </button>
                    <button type="button" onclick="document.getElementById('bf-image').value = 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80'; updateBundleLivePreview();"
                      class="px-2.5 py-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-blue-50 text-[10px] font-bold text-[#475569] flex items-center space-x-1 cursor-pointer">
                      ${iconBolt('w-3.5 h-3.5 text-amber-500')}
                      <span>Esports Battlestation</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 3: Package Included Real Hardware Products (Composite Inventory) -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>3. Included Components Package Breakdown (Live Store Products)</span>
                  </h3>
                  <p class="text-[11px] text-[#64748b] mt-0.5">Select store catalog items. Specifications, stock bottlenecks and regular bundle price calculate automatically from product data.</p>
                </div>
                <button type="button" onclick="addBundleFormProductItem()"
                  class="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors flex items-center space-x-1 shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                  <span>+ Add Store Product to Bundle</span>
                </button>
              </div>

              <div id="bundle-items-inputs-container" class="space-y-3">
                <!-- Dynamically populated by renderBundleItemsInputs() -->
              </div>
            </div>

            <!-- Section 4: Live Branch Assembly & Transfer Logistics Matrix -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <div>
                  <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full bg-purple-600"></span>
                    <span>4. Multi-Branch Assembly & Stock Logistics</span>
                  </h3>
                  <p class="text-[11px] text-[#64748b] mt-0.5">Live branch readiness matrix and 1-click inter-branch balancing.</p>
                </div>
                <span class="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-bold font-mono">
                  LOGISTICS HUB
                </span>
              </div>

              <!-- Live Branch Assembly Matrix Container -->
              <div id="bundle-branch-assembly-matrix" class="space-y-3">
                <!-- Populated dynamically by updateBundleBranchMatrix() -->
              </div>
            </div>

            <!-- Section 5: Pricing, Savings & Auto Discount Calculation -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>5. Pricing, Savings & Auto Calculation</span>
                </h3>
                <span id="bundle-savings-indicator-tag" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Save Rs. ${initialSavings.toLocaleString()} (${initialSavingPercent}%)
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="block font-bold text-[#0f172a] mb-1">Deal Bundle Price (Now Rs.) *</label>
                  <input type="number" id="bf-price" value="${initialPrice}" required oninput="updateBundleLivePreview()"
                    placeholder="259999"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-blue-600 font-bold font-mono text-sm focus:border-blue-600 focus:outline-none">
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="font-bold text-[#0f172a]">Original Bundle Total (Was Rs.)</label>
                    <span class="text-[10px] text-emerald-600 font-bold">Auto-calculated MSRP</span>
                  </div>
                  <input type="number" id="bf-orig-price" value="${initialOrigPrice}" required oninput="updateBundleLivePreview()"
                    placeholder="289999"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-slate-500 font-bold font-mono text-sm focus:border-blue-600 focus:outline-none">
                </div>
              </div>
            </div>

            <!-- Section 7: Urgency, Sales Quota & Countdown Timer Engine -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div class="border-b border-[#e2e8f0] pb-3 flex items-center justify-between">
                <h3 class="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider flex items-center space-x-2">
                  <span class="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span>7. Sales Quota, Stock Urgency & Countdown Timer</span>
                </h3>
                <span class="text-[10px] text-emerald-600 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  REAL-TIME AUTOMATION
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label class="block font-bold text-[#0f172a] mb-1">Campaign Target Quota</label>
                  <input type="number" id="bf-target-quota" min="1" max="999" value="${bundle ? (bundle.targetQuota || 20) : 20}" required oninput="updateBundleLivePreview()"
                    class="w-full px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-bold font-mono text-xs focus:border-blue-600 focus:outline-none">
                  <span class="text-[10px] text-[#64748b] block mt-1">Initial promotion batch allocation</span>
                </div>

                <div>
                  <label class="block font-bold text-[#0f172a] mb-1">Live Units Sold</label>
                  <input type="number" id="bf-sold-count" min="0" value="${bundle ? (bundle.soldCount || 0) : 0}" oninput="updateBundleLivePreview()"
                    class="w-full px-3.5 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-emerald-600 font-bold font-mono text-xs focus:border-blue-600 focus:outline-none">
                  <span class="text-[10px] text-emerald-600 font-bold block mt-1">Increments on checkout</span>
                </div>

                <div>
                  <label class="block font-bold text-[#0f172a] mb-1">Available Bundles (Bottleneck)</label>
                  <input type="number" id="bf-stock" min="0" value="${inv.maxAvailableBundles}" readonly
                    class="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-[#e2e8f0] text-blue-600 font-bold font-mono text-xs cursor-not-allowed">
                  <span id="bf-claimed-display-note" class="text-[10px] text-blue-600 font-bold block mt-1">
                    ${inv.claimedPercent}% Claimed
                  </span>
                </div>
              </div>

              <!-- Hidden claimed input for form state compatibility -->
              <input type="hidden" id="bf-claimed" value="${inv.claimedPercent}">

              <!-- Countdown Duration Inputs -->
              <div class="pt-2 border-t border-[#e2e8f0]">
                <div class="flex items-center justify-between mb-2">
                  <label class="block font-bold text-[#0f172a] text-xs">Deal Countdown Duration</label>
                  <div class="flex items-center space-x-1.5">
                    <button type="button" onclick="setBundleFormPresetTimer(3, 0, 0, 0)" class="px-2 py-0.5 bg-[#f8fafc] hover:bg-blue-50 border border-[#e2e8f0] text-[10px] font-bold rounded">3-Day Weekend</button>
                    <button type="button" onclick="setBundleFormPresetTimer(1, 0, 0, 0)" class="px-2 py-0.5 bg-[#f8fafc] hover:bg-blue-50 border border-[#e2e8f0] text-[10px] font-bold rounded">24-Hour Flash</button>
                    <button type="button" onclick="setBundleFormPresetTimer(7, 0, 0, 0)" class="px-2 py-0.5 bg-[#f8fafc] hover:bg-blue-50 border border-[#e2e8f0] text-[10px] font-bold rounded">1-Week Mega</button>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span class="text-[10px] font-mono text-[#64748b] block mb-0.5">Days</span>
                    <input type="number" id="bf-days" min="0" max="30" value="${bundle ? (bundle.durationDays || 2) : 2}" oninput="updateBundleLivePreview()"
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-center font-mono font-bold">
                  </div>
                  <div>
                    <span class="text-[10px] font-mono text-[#64748b] block mb-0.5">Hours</span>
                    <input type="number" id="bf-hours" min="0" max="23" value="${bundle ? (bundle.durationHours || 14) : 14}" oninput="updateBundleLivePreview()"
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-center font-mono font-bold">
                  </div>
                  <div>
                    <span class="text-[10px] font-mono text-[#64748b] block mb-0.5">Minutes</span>
                    <input type="number" id="bf-mins" min="0" max="59" value="${bundle ? (bundle.durationMins || 30) : 30}" oninput="updateBundleLivePreview()"
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-center font-mono font-bold">
                  </div>
                  <div>
                    <span class="text-[10px] font-mono text-[#64748b] block mb-0.5">Seconds</span>
                    <input type="number" id="bf-secs" min="0" max="59" value="${bundle ? (bundle.durationSecs || 0) : 0}" oninput="updateBundleLivePreview()"
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-center font-mono font-bold">
                  </div>
                </div>
              </div>

            </div>

            <!-- Section 8: Carousel Status & Visibility -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
              <div>
                <h4 class="text-sm font-extrabold text-[#0f172a]">Active in DealHot Carousel</h4>
                <p class="text-xs text-[#64748b]">When enabled, this bundle appears live in the rotating banner showcase on the Hot Deals store page.</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="bf-active" ${bundle && bundle.active === false ? '' : 'checked'} onchange="updateBundleLivePreview()" class="sr-only peer">
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <!-- Bottom Action Buttons -->
            <div class="flex items-center justify-end space-x-3 pt-3">
              <button type="button" onclick="closeBundleFormPage()"
                class="px-5 py-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs border border-[#e2e8f0] transition-all">
                Cancel
              </button>
              <button type="submit"
                class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-md transition-all">
                ${isEdit ? 'Save Changes' : 'Publish Deal Bundle'}
              </button>
            </div>

          </form>
        </div>

        <!-- Right 4 Columns: Interactive Live Carousel Banner Preview -->
        <div class="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-6">
          <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
              <span class="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center space-x-1.5">
                ${iconEye('w-3.5 h-3.5')}
                <span>Live Carousel Slide Preview</span>
              </span>
              <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-mono font-bold border border-blue-200">REAL-TIME</span>
            </div>

            <!-- Dynamic Live Preview Banner Card -->
            <div id="bundle-live-preview-card"></div>

            <!-- Included Items Preview Box -->
            <div id="bundle-live-items-preview" class="pt-2"></div>
          </div>
        </div>

      </div>

    </div>
  `;

  // Render sub-sections & initial live preview
  renderBundleItemsInputs();
  updateBundleBranchMatrix();
  updateBundleLivePreview();
}

/**
 * Trigger form submission from external action bar button
 */
export function triggerBundleFormSubmit() {
  const form = document.getElementById('deal-bundle-fullpage-form') || document.getElementById('full-bundle-form');
  if (form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  } else {
    handleSaveBundleFormPage();
  }
}

/**
 * Return back to the Promotions Management -> Hot Bundles tab
 */
export function closeBundleFormPage() {
  const formPanel = document.getElementById('tab-panel-bundle-form');
  if (formPanel) formPanel.classList.add('hidden');

  const promoPanel = document.getElementById('tab-panel-promotions');
  if (promoPanel) promoPanel.classList.remove('hidden');

  switchPromoSubTab('hot-bundles');
}

/**
 * Quick Badge Tag Selector Helper
 */
export function setBundleBadgeTag(tag) {
  const badgeInput = document.getElementById('bf-badge');
  if (badgeInput) {
    badgeInput.value = tag;
    updateBundleLivePreview();
  }
}

/**
 * Quick Timer Preset Helper
 */
export function setBundleFormPresetTimer(days, hours, mins, secs) {
  const d = document.getElementById('bf-days');
  const h = document.getElementById('bf-hours');
  const m = document.getElementById('bf-mins');
  const s = document.getElementById('bf-secs');

  if (d) d.value = days;
  if (h) h.value = hours;
  if (m) m.value = mins;
  if (s) s.value = secs;

  updateBundleLivePreview();
}

/**
 * Render dynamic Package Included Product Items with Search/Selector
 */
export function renderBundleItemsInputs() {
  const container = document.getElementById('bundle-items-inputs-container');
  if (!container) return;

  const products = getStoredProducts();
  const items = window.bundleFormItemsState || [];

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0] text-xs text-[#64748b]">
        No catalog products added to this bundle yet. Click "+ Add Store Product to Bundle" above.
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, idx) => {
    const product = products.find(p => p.id === Number(item.productId)) || products[0];
    const unitPrice = product ? Number(product.price) : 0;
    const lineTotal = unitPrice * (item.qty || 1);
    const stockAvailable = product ? product.totalStock : 0;
    const specEntries = Object.entries(product ? (product.specs || {}) : {}).slice(0, 2);
    const specText = specEntries.map(([k, v]) => v).join(' • ');

    return `
      <div class="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] space-y-2.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-mono font-bold flex items-center justify-center">
              ${idx + 1}
            </span>
            <span class="text-xs font-extrabold text-[#0f172a]">Component Item #${idx + 1}</span>
          </div>

          <button type="button" onclick="removeBundleFormItem(${idx})"
            class="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center space-x-1 p-1 hover:bg-rose-50 rounded-lg transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            <span>Remove Product</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          
          <!-- Product Selector Dropdown -->
          <div class="sm:col-span-8">
            <label class="block text-[10px] font-mono font-bold text-[#64748b] mb-1">STORE CATALOG PRODUCT *</label>
            <select onchange="updateBundleFormItemProduct(${idx}, this.value)"
              class="w-full px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] text-xs font-bold text-[#0f172a] focus:border-blue-600 focus:outline-none">
              ${products.map(p => `
                <option value="${p.id}" ${product && product.id === p.id ? 'selected' : ''}>
                  ${p.name} (SKU: ${p.sku} | Rs. ${p.price.toLocaleString()} | Stock: ${p.totalStock})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Quantity Stepper -->
          <div class="sm:col-span-4">
            <label class="block text-[10px] font-mono font-bold text-[#64748b] mb-1">QUANTITY PER BUNDLE</label>
            <div class="flex items-center space-x-2">
              <input type="number" min="1" max="50" value="${item.qty || 1}" oninput="updateBundleFormItemQty(${idx}, this.value)"
                class="w-20 px-3 py-2 rounded-xl bg-white border border-[#e2e8f0] text-xs font-mono font-bold text-center focus:border-blue-600 focus:outline-none">
              <div class="text-[11px] font-mono font-bold text-[#64748b]">
                <span>x Rs. ${unitPrice.toLocaleString()} = </span>
                <span class="text-blue-600">Rs. ${lineTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Live Product Specs & Stock Availability Pill -->
        <div class="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/80 text-[11px] gap-2">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-[#64748b]">Available in Store:</span>
            <span class="font-mono font-extrabold ${stockAvailable > 0 ? 'text-emerald-600' : 'text-rose-600'}">
              ${stockAvailable} units total
            </span>
            <span class="text-slate-400">|</span>
            <span class="font-mono text-blue-600 font-bold">
              Can make: ${Math.floor(stockAvailable / (item.qty || 1))} bundle kits
            </span>
          </div>

          ${specText ? `
            <div class="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center space-x-1">
              ${iconBolt('w-3 h-3 text-amber-500 flex-shrink-0')}
              <span>${specText}</span>
            </div>
          ` : ''}
        </div>

      </div>
    `;
  }).join('');
}

export function addBundleFormProductItem() {
  if (!window.bundleFormItemsState) window.bundleFormItemsState = [];
  const products = getStoredProducts();
  const defaultProd = products[0] || { id: 1, name: 'Hardware Component' };
  window.bundleFormItemsState.push({ productId: defaultProd.id, qty: 1, name: defaultProd.name });
  renderBundleItemsInputs();
  updateBundleBranchMatrix();
  updateBundleLivePreview();
}

export function removeBundleFormItem(index) {
  if (!window.bundleFormItemsState) return;
  window.bundleFormItemsState.splice(index, 1);
  renderBundleItemsInputs();
  updateBundleBranchMatrix();
  updateBundleLivePreview();
}

export function updateBundleFormItemProduct(index, productId) {
  if (!window.bundleFormItemsState || !window.bundleFormItemsState[index]) return;
  const products = getStoredProducts();
  const prod = products.find(p => p.id === Number(productId));
  window.bundleFormItemsState[index].productId = Number(productId);
  window.bundleFormItemsState[index].name = prod ? prod.name : `Product #${productId}`;
  renderBundleItemsInputs();
  updateBundleBranchMatrix();
  updateBundleLivePreview();
}

export function updateBundleFormItemQty(index, qty) {
  if (!window.bundleFormItemsState || !window.bundleFormItemsState[index]) return;
  window.bundleFormItemsState[index].qty = Math.max(1, parseInt(qty) || 1);
  renderBundleItemsInputs();
  updateBundleBranchMatrix();
  updateBundleLivePreview();
}

// Named Aliases for ES module consumers
export const addBundleFormItemInput = addBundleFormProductItem;
export const updateBundleFormItem = updateBundleFormItemProduct;

/**
 * Updates the Multi-Branch Assembly Matrix and Logistics transfer helper
 */
export function updateBundleBranchMatrix() {
  const container = document.getElementById('bundle-branch-assembly-matrix');
  if (!container) return;

  const products = getStoredProducts();
  const branches = getBranches();
  const items = window.bundleFormItemsState || [];

  const inv = calculateBundleInventory({ bundleItems: items }, products, branches);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0] text-xs text-[#64748b]">
        Add components to evaluate multi-branch assembly readiness.
      </div>
    `;
    return;
  }

  // Check if primary hub (Colombo) has complete kits
  const colomboKits = (inv.branchAssembly['BR-COL'] && inv.branchAssembly['BR-COL'].readyKits) || 0;
  const totalCompanyKits = inv.maxAvailableBundles;
  const missingInColombo = Math.max(0, totalCompanyKits - colomboKits);

  container.innerHTML = `
    <!-- Branch Assembly KPI Pills -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      ${branches.map(b => {
    const ready = (inv.branchAssembly[b.id] && inv.branchAssembly[b.id].readyKits) || 0;
    return `
          <div class="p-3 rounded-xl border ${ready > 0 ? 'bg-blue-50/60 border-blue-200' : 'bg-slate-50 border-slate-200 opacity-75'} text-center space-y-0.5">
            <span class="text-[10px] font-bold text-[#64748b] block uppercase tracking-wider">${b.city} Hub</span>
            <span class="text-base font-extrabold font-mono ${ready > 0 ? 'text-blue-700' : 'text-slate-400'}">${ready} Ready</span>
            <span class="text-[9px] text-[#64748b] block">${ready > 0 ? 'Complete Kit in Stock' : 'Incomplete Kit'}</span>
          </div>
        `;
  }).join('')}
    </div>

    <!-- Component by Branch Table -->
    <div class="border border-[#e2e8f0] rounded-xl overflow-hidden text-xs">
      <table class="w-full text-left">
        <thead class="bg-[#f8fafc] text-[10px] font-mono uppercase text-[#64748b] border-b border-[#e2e8f0]">
          <tr>
            <th class="p-2.5">Component</th>
            <th class="p-2.5 text-center">Req Qty</th>
            <th class="p-2.5 text-center">Colombo</th>
            <th class="p-2.5 text-center">Galle</th>
            <th class="p-2.5 text-center">Matara</th>
            <th class="p-2.5 text-center">Kandy</th>
            <th class="p-2.5 text-center">Total Stock</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#e2e8f0]">
          ${inv.componentsBreakdown.map(comp => `
            <tr class="hover:bg-[#f8fafc]">
              <td class="p-2.5 font-bold text-[#0f172a]">
                <div class="line-clamp-1">${comp.name}</div>
                <div class="text-[9px] font-mono text-blue-600">${comp.sku}</div>
              </td>
              <td class="p-2.5 text-center font-mono font-bold text-[#0f172a]">${comp.qty}</td>
              <td class="p-2.5 text-center font-mono ${comp.branchStock['BR-COL'] >= comp.qty ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}">
                ${comp.branchStock['BR-COL'] || 0}
              </td>
              <td class="p-2.5 text-center font-mono ${comp.branchStock['BR-GAL'] >= comp.qty ? 'text-emerald-600' : 'text-slate-400'}">
                ${comp.branchStock['BR-GAL'] || 0}
              </td>
              <td class="p-2.5 text-center font-mono ${comp.branchStock['BR-MAT'] >= comp.qty ? 'text-emerald-600' : 'text-slate-400'}">
                ${comp.branchStock['BR-MAT'] || 0}
              </td>
              <td class="p-2.5 text-center font-mono ${comp.branchStock['BR-KND'] >= comp.qty ? 'text-emerald-600' : 'text-slate-400'}">
                ${comp.branchStock['BR-KND'] || 0}
              </td>
              <td class="p-2.5 text-center font-mono font-extrabold text-[#0f172a]">
                ${comp.totalStock}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Smart Inter-Branch Rebalancing Logistics Banner -->
    <div class="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div>
        <div class="flex items-center space-x-2">
          ${iconTruck('w-4 h-4 text-blue-600')}
          <span class="font-extrabold text-xs text-blue-900">Inter-Branch Stock Transfer Engine</span>
        </div>
        <p class="text-[11px] text-blue-700 mt-0.5">
          ${missingInColombo > 0
      ? `Parts for <strong>${missingInColombo}</strong> additional bundles exist across branches. Transfer parts to Colombo Main Hub to enable ready-to-ship dispatch.`
      : `Colombo Main Hub is fully stocked with <strong>${colomboKits}</strong> complete ready-to-ship bundle kits!`
    }
        </p>
      </div>

      <button type="button" onclick="openInitiateTransferModal({ reason: 'Deal Bundle Kit Assembly', notes: 'Transferring parts to Colombo Hub to assemble bundle kits.' })"
        class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center space-x-1.5">
        ${iconPlus('w-3.5 h-3.5')}
        <span>Transfer Parts for Kit</span>
      </button>
    </div>
  `;
}

/**
 * Update the interactive Real-Time Live Preview card on the right
 */
export function updateBundleLivePreview() {
  const previewContainer = document.getElementById('bundle-live-preview-card');
  const itemsContainer = document.getElementById('bundle-live-items-preview');
  if (!previewContainer) return;

  const products = getStoredProducts();
  const branches = getBranches();
  const items = window.bundleFormItemsState || [];

  const inv = calculateBundleInventory({ bundleItems: items }, products, branches);

  // Auto-update Original Price field if changed
  const origPriceInput = document.getElementById('bf-orig-price');
  if (origPriceInput && inv.calculatedMSRP > 0 && (!origPriceInput.value || Number(origPriceInput.value) === 0)) {
    origPriceInput.value = inv.calculatedMSRP;
  }

  const badge = document.getElementById('bf-badge')?.value || 'BEST DEAL';
  const eyebrow = document.getElementById('bf-eyebrow')?.value || 'FEATURED DEAL';
  const title = document.getElementById('bf-title')?.value || 'Ultimate Gaming Power';
  const subtitle = document.getElementById('bf-subtitle')?.value || 'Complete Your Dream Setup';
  const image = document.getElementById('bf-image')?.value || 'public/images/home-hero-image-1.png';
  const price = Number(document.getElementById('bf-price')?.value) || 259999;
  const origPrice = Number(document.getElementById('bf-orig-price')?.value) || (inv.calculatedMSRP > 0 ? inv.calculatedMSRP : 289999);
  const soldCount = Number(document.getElementById('bf-sold-count')?.value) || 0;
  const targetQuota = Number(document.getElementById('bf-target-quota')?.value) || 20;

  const stockLeft = inv.maxAvailableBundles;

  // Calculate dynamic claimed %
  let claimedPercent = 0;
  if (soldCount + stockLeft > 0) {
    claimedPercent = Math.min(99, Math.max(5, Math.round((soldCount / (soldCount + stockLeft)) * 100)));
  } else {
    claimedPercent = 95;
  }

  // Update hidden claimed and display note
  const claimedHidden = document.getElementById('bf-claimed');
  if (claimedHidden) claimedHidden.value = claimedPercent;

  const stockInput = document.getElementById('bf-stock');
  if (stockInput) stockInput.value = stockLeft;

  const claimedNote = document.getElementById('bf-claimed-display-note');
  if (claimedNote) claimedNote.textContent = `${claimedPercent}% Claimed (${soldCount} sold / ${stockLeft} left)`;

  const days = String(document.getElementById('bf-days')?.value || '02').padStart(2, '0');
  const hrs = String(document.getElementById('bf-hours')?.value || '14').padStart(2, '0');
  const mins = String(document.getElementById('bf-mins')?.value || '30').padStart(2, '0');
  const secs = String(document.getElementById('bf-secs')?.value || '00').padStart(2, '0');
  const isActive = document.getElementById('bf-active')?.checked !== false;

  const savings = Math.max(0, origPrice - price);
  const savingPercent = origPrice > 0 ? Math.round((savings / origPrice) * 100) : 0;

  // Update savings tag on form section
  const savingsIndicator = document.getElementById('bundle-savings-indicator-tag');
  if (savingsIndicator) {
    savingsIndicator.textContent = `Save Rs. ${savings.toLocaleString()} (${savingPercent}%)`;
  }

  previewContainer.innerHTML = `
    <div class="bg-gradient-to-r from-[#0b1329] via-[#0f2766] to-[#1d4ed8] text-white rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all duration-300">
      
      <!-- Subtle Glow Orbs -->
      <div class="absolute -right-16 -bottom-16 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
      <div class="absolute top-0 left-1/4 w-36 h-36 bg-indigo-500/20 rounded-full blur-xl pointer-events-none"></div>

      <!-- Top Row: Badge & Status -->
      <div class="flex items-center justify-between mb-3 relative z-10">
        <span class="px-2.5 py-0.5 rounded-full ${badge === 'BEST DEAL' ? 'bg-rose-600' : 'bg-blue-600'
    } text-white font-extrabold text-[9px] uppercase tracking-wider shadow-sm">
          ${badge}
        </span>
        <span class="text-[10px] font-mono font-bold ${isActive ? 'text-emerald-300 bg-emerald-500/20' : 'text-slate-300 bg-white/10'} px-2 py-0.5 rounded-full border border-white/15">
          ${isActive ? '● Live Slide' : '○ Draft'}
        </span>
      </div>

      <!-- Center Rig Graphic Visual -->
      <div class="relative w-full aspect-[16/10] flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-2 backdrop-blur-sm mb-3 group overflow-hidden">
        <img src="${image}" alt="${title}" onerror="this.src='public/images/home-hero-image-1.png'"
          class="max-h-36 w-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-300">
      </div>

      <!-- Title & Eyebrow -->
      <div class="relative z-10 space-y-1 mb-2.5">
        <p class="text-[9px] font-mono font-bold tracking-widest text-blue-300 uppercase">${eyebrow}</p>
        <h4 class="text-base font-extrabold text-white tracking-tight leading-tight line-clamp-1">${title}</h4>
        <p class="text-xs text-blue-200 line-clamp-1">${subtitle}</p>
      </div>

      <!-- Package Included Products Breakdown (Real Name, Real Specs & Original Price) -->
      ${(inv.componentsBreakdown || []).length > 0 ? `
        <div class="space-y-1.5 mb-3 relative z-10">
          <div class="flex items-center space-x-1">
             ${iconPackage('w-3 h-3 text-blue-300 flex-shrink-0')}
             <span class="text-[9px] font-mono font-bold text-blue-300 uppercase tracking-wider block">Included Package (${inv.componentsBreakdown.length} Products):</span>
          </div>
          <div class="space-y-1">
            ${inv.componentsBreakdown.map(item => {
      const specEntries = Object.entries(item.specs || {}).slice(0, 2);
      const specText = specEntries.map(([k, v]) => v).join(' • ');
      return `
                <div class="bg-white/10 border border-white/15 rounded-lg p-1.5 flex items-center justify-between text-[10px]">
                  <div class="min-w-0 flex-1 pr-2">
                    <div class="flex items-center space-x-1">
                      <span class="font-bold text-white truncate">${item.name}</span>
                      ${item.qty > 1 ? `<span class="px-1 bg-blue-500/40 text-blue-200 rounded font-mono font-bold text-[8px]">x${item.qty}</span>` : ''}
                    </div>
                    ${specText ? `<span class="text-[8.5px] text-blue-200/80 block truncate flex items-center space-x-0.5">${iconBolt('w-2.5 h-2.5 text-blue-300 inline-block mr-0.5 flex-shrink-0')}<span>${specText}</span></span>` : ''}
                  </div>
                  <span class="font-mono font-extrabold text-amber-300 whitespace-nowrap">Rs. ${Number(item.unitPrice).toLocaleString()}</span>
                </div>
              `;
    }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Pricing Row -->
      <div class="flex flex-wrap items-baseline gap-2 mb-3 relative z-10">
        <span class="text-lg font-black font-mono text-white tracking-tight">Rs. ${price.toLocaleString()}</span>
        <del class="text-xs text-slate-400 font-mono">Rs. ${origPrice.toLocaleString()}</del>
        <span class="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded border border-amber-300/30">
          Save Rs. ${savings.toLocaleString()} (${savingPercent}%)
        </span>
      </div>

      <!-- Claimed Progress -->
      <div class="space-y-1 mb-3 relative z-10">
        <div class="flex justify-between items-center text-[10px] font-semibold">
          <span class="text-slate-200">${claimedPercent}% Claimed</span>
          <span class="text-amber-300 font-bold">Only ${stockLeft} left!</span>
        </div>
        <div class="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-300" style="width: ${claimedPercent}%"></div>
        </div>
      </div>

      <!-- Countdown Mini Cards & CTA -->
      <div class="flex items-center justify-between pt-2.5 border-t border-white/10 relative z-10 gap-2">
        <div class="flex items-center space-x-1 font-mono text-[10px] font-bold">
          <span class="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-white">${days}d</span>
          <span class="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-white">${hrs}h</span>
          <span class="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-white">${mins}m</span>
          <span class="px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-rose-400">${secs}s</span>
        </div>
        <button type="button" class="px-3.5 py-1.5 bg-white text-[#0f172a] font-extrabold text-xs rounded-lg shadow transition-all flex items-center space-x-1">
          <span>Buy Now</span>
          <span>→</span>
        </button>
      </div>

    </div>
  `;

  // Included Items Breakdown Preview Card
  if (itemsContainer) {
    if (items.length > 0) {
      itemsContainer.innerHTML = `
        <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between text-xs font-bold text-[#0f172a]">
            <span>Included Package Items</span>
            <span class="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">${items.length} Products</span>
          </div>
          <ul class="space-y-1.5 text-xs text-[#475569]">
            ${inv.componentsBreakdown.map((item, idx) => `
              <li class="flex items-start justify-between space-x-2 border-b border-slate-100 pb-1">
                <span class="line-clamp-1"><strong>${item.qty}x</strong> ${item.name}</span>
                <span class="font-mono text-[11px] font-bold text-[#0f172a] whitespace-nowrap">Rs. ${Number(item.unitPrice).toLocaleString()}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    } else {
      itemsContainer.innerHTML = '';
    }
  }
}

/**
 * Handles saving the deal bundle form page
 */
export function handleSaveBundleFormPage(event) {
  if (event) event.preventDefault();

  const bundleItems = window.bundleFormItemsState || [];
  const products = getStoredProducts();

  // Derive specs automatically from selected products
  const autoSpecs = [];
  bundleItems.forEach(item => {
    const prod = products.find(p => p.id === Number(item.productId));
    if (prod && prod.specs) {
      const topSpec = Object.entries(prod.specs)[0];
      if (topSpec) {
        autoSpecs.push({
          icon: '⚡',
          label: `${topSpec[1]}`
        });
      }
    }
  });

  const price = Number(document.getElementById('bf-price').value) || 259999;
  const originalPrice = Number(document.getElementById('bf-orig-price').value) || 289999;
  const savingAmount = Math.max(0, originalPrice - price);
  const savingPercent = originalPrice > 0 ? Math.round((savingAmount / originalPrice) * 100) : 0;
  const targetQuota = Number(document.getElementById('bf-target-quota')?.value) || 20;
  const soldCount = Number(document.getElementById('bf-sold-count')?.value) || 0;

  const bundleData = {
    badge: document.getElementById('bf-badge').value.trim() || 'BEST DEAL',
    eyebrow: document.getElementById('bf-eyebrow').value.trim() || 'FEATURED DEAL',
    title: document.getElementById('bf-title').value.trim() || 'Ultimate Gaming Power',
    subtitle: document.getElementById('bf-subtitle').value.trim() || 'Complete Your Dream Setup',
    image: document.getElementById('bf-image').value.trim() || 'public/images/home-hero-image-1.png',
    specs: autoSpecs.length > 0 ? autoSpecs : [{ icon: '⚡', label: 'Complete Rig Package' }],
    bundleItems: bundleItems,
    price: price,
    originalPrice: originalPrice,
    savingAmount: savingAmount,
    savingPercent: savingPercent,
    targetQuota: targetQuota,
    soldCount: soldCount,
    durationDays: Number(document.getElementById('bf-days').value) || 2,
    durationHours: Number(document.getElementById('bf-hours').value) || 14,
    durationMins: Number(document.getElementById('bf-mins').value) || 30,
    durationSecs: Number(document.getElementById('bf-secs').value) || 0,
    productId: Number(document.getElementById('bf-product-id').value) || (bundleItems[0] ? bundleItems[0].productId : 1),
    active: document.getElementById('bf-active').checked
  };

  if (currentEditingBundleId !== null) {
    updateDealBundle(currentEditingBundleId, bundleData);
    showToast('Featured deal bundle slide updated successfully!', 'success');
  } else {
    addDealBundle(bundleData);
    showToast('New deal bundle slide created & added to carousel!', 'success');
  }

  window.dispatchEvent(new Event('productsUpdated'));
  closeBundleFormPage();
  renderPromotionsTab();
}

// ── Global Window Aliases for complete backwards compatibility ──
window.openBundleFormPage = openBundleFormPage;
window.openCreateBundlePage = () => openBundleFormPage(null);
window.openEditBundlePage = (id) => openBundleFormPage(id);
window.openCreateBundleModal = () => openBundleFormPage(null);
window.openEditBundleModal = (id) => openBundleFormPage(id);
window.closeBundleFormPage = closeBundleFormPage;
window.triggerBundleFormSubmit = triggerBundleFormSubmit;
window.handleSaveBundleFormPage = handleSaveBundleFormPage;
window.setBundleBadgeTag = setBundleBadgeTag;
window.setBundleFormPresetTimer = setBundleFormPresetTimer;
window.addBundleFormProductItem = addBundleFormProductItem;
window.addBundleFormItemInput = addBundleFormProductItem;
window.removeBundleFormItem = removeBundleFormItem;
window.updateBundleFormItemProduct = updateBundleFormItemProduct;
window.updateBundleFormItemQty = updateBundleFormItemQty;
window.updateBundleBranchMatrix = updateBundleBranchMatrix;
window.updateBundleLivePreview = updateBundleLivePreview;

/* ========================================================================== */
/* 3. ALL DISCOUNTS & HOT DEALS TABLE                                          */
/* ========================================================================== */

/* ========================================================================== */
/* MODAL: EDIT PRODUCT DISCOUNT & BADGES (DYNAMIC TAXONOMY INTEGRATED)        */
/* ========================================================================== */

window.openEditDiscountModal = function (productId) {
  const products = getStoredProducts();
  const badges = getBadges().filter(b => b.isActive !== false);
  const product = products.find(p => p.id === Number(productId));
  if (!product) return;

  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  const orig = product.originalPrice || product.price;

  modalContainer.innerHTML = `
    <div class="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-4">
        
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Edit Product Deal & Badge</h3>
            <p class="text-xs text-[#64748b]">${product.name}</p>
          </div>
          <button onclick="closeAdminModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
        </div>

        <form onsubmit="handleSaveProductDiscount(event, ${product.id})" class="space-y-4">
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-[#0f172a] mb-1">Deal Price (Rs.)</label>
              <input type="number" id="dm-price" value="${product.price}" required
                class="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-blue-600 focus:border-blue-600 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-bold text-[#0f172a] mb-1">Original Price (Rs.)</label>
              <input type="number" id="dm-orig-price" value="${orig}" required
                class="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-mono font-bold text-slate-500 focus:border-blue-600 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#0f172a] mb-1">Promotional Badge Tag (from Dynamic Badges)</label>
            <select id="dm-badge" class="w-full px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs font-semibold focus:border-blue-600 focus:outline-none">
              <option value="" ${!product.badge ? 'selected' : ''}>No Badge (Regular)</option>
              ${badges.map(b => `
                <option value="${b.name}" ${product.badge === b.name ? 'selected' : ''}>
                  ${b.name} (${b.color})
                </option>
              `).join('')}
              <option value="-15%" ${product.badge === '-15%' ? 'selected' : ''}>-15% Discount</option>
              <option value="-20%" ${product.badge === '-20%' ? 'selected' : ''}>-20% Discount</option>
              <option value="-25%" ${product.badge === '-25%' ? 'selected' : ''}>-25% Discount</option>
              <option value="-30%" ${product.badge === '-30%' ? 'selected' : ''}>-30% Discount</option>
            </select>
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2">
            <button type="button" onclick="closeAdminModal()"
              class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs rounded-lg border border-[#e2e8f0]">
              Cancel
            </button>
            <button type="submit"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all">
              Save Changes
            </button>
          </div>

        </form>

      </div>
    </div>
  `;
};

window.handleSaveProductDiscount = function (event, productId) {
  if (event) event.preventDefault();

  const price = Number(document.getElementById('dm-price').value);
  const originalPrice = Number(document.getElementById('dm-orig-price').value);
  const badge = document.getElementById('dm-badge').value;

  updateProductDiscount(productId, { price, originalPrice, badge });
  window.dispatchEvent(new Event('productsUpdated'));
  showToast('Product discount updated successfully!', 'success');
  closeAdminModal();
  renderPromotionsTab();
};

// Global Window Bindings for Dynamic Admin UI
window.switchPromoSubTab = switchPromoSubTab;
window.renderPromotionsTab = renderPromotionsTab;
window.updateHomeBannerLivePreview = updateHomeBannerLivePreview;

