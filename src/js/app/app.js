// ETech Computers - Single Page Section Toggle Router & Global App Logic
import { products, getProductById, getFeaturedProducts, getNewArrivalProducts, syncProductsFromApi } from '../models/data.js';
import { getHomeDealBanner, getHomeBannerRemainingTime, isHomeDealBannerActive, syncPromotionsFromApi } from '../models/deals_data.js';
import { legalPolicies, getPolicyData, getStoredPolicies, syncPoliciesFromApi } from '../models/policy-data.js';
import { getCurrentUser, isLoggedIn, logoutUser } from '../controller/login_controller.js';
import { getRoleBadge } from '../models/user_model.js';
import { 
  getUserOrders, getOrderById, renderCustomerOrderDetailPage, 
  handleCustomerCancelOrder, getStatusStyle,
  syncOrdersFromApi, parseCurrencyAmount
} from '../controller/order_management_controller.js';
import { formatLKR } from '../util/formatters.js';
import { initCartLogic, initCheckoutLogic, updateCartBadge, addToCart, getCart, saveCart, showToast } from '../controller/cart_controller.js';
import { renderProductDetailsPage, viewProductDetails } from '../controller/product-details_controller.js';
import { initShopLogic, renderFilteredProducts } from '../controller/shop_controller.js';
import { initHotDealsLogic } from '../controller/hot_deal_controller.js';
import { getFeaturedBrands, getBrands, syncBrandsFromApi } from '../models/brand_data.js';
import { syncCategoriesFromApi, syncBadgesFromApi } from '../models/taxonomy_data.js';
import { syncBranchesFromApi } from '../controller/branch_controller.js';
import { syncNewsletterFromApi } from '../models/newsletter_model.js';
import { initWishlistLogic, updateWishlistBadge, isInWishlist, toggleWishlist, syncWishlistFromApi, refreshAllWishlistButtons } from '../controller/wishlist_controller.js';
import { renderLoginPage } from './login/login.js';
import { renderAdminPage } from './administrator/administrator.js';
import { renderAboutPage } from './about/about.js';
import { renderUnsubscribePage } from './newsletter/unsubscribe.js';
import { etechAlert } from '../util/index.js';
import { checkServerHealth, showAppLoading, setAppLoadingStatus, hideAppLoading, onServerReconnect } from '../util/server_health.js';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

window.addEventListener('hashchange', () => {
  handleRoute();
});

/**
 * Synchronizes catalog and store data from backend REST APIs into local in-memory stores.
 */
export async function syncLiveBackendData() {
  const activeUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const isPrivileged = activeUser && (
    (typeof activeUser.isAdmin === 'function' && (activeUser.isAdmin() || activeUser.isStaff())) ||
    ['ADMIN', 'SUPERADMIN', 'STAFF'].includes(activeUser.role)
  );

  try {
    const syncTasks = [
      syncProductsFromApi({ page: 0, size: 20 }),
      syncCategoriesFromApi({ activeOnly: true }),
      syncBrandsFromApi({ activeOnly: true }),
      syncBadgesFromApi({ activeOnly: true }),
      syncPromotionsFromApi(),
      syncBranchesFromApi(),
      syncPoliciesFromApi()
    ];

    if (activeUser) {
      syncTasks.push(syncOrdersFromApi());
      syncTasks.push(syncWishlistFromApi());
    }

    if (isPrivileged) {
      syncTasks.push(syncNewsletterFromApi());
    }

    await Promise.allSettled(syncTasks);
    updateWishlistBadge();
    refreshAllWishlistButtons();
    const hash = window.location.hash || '#home';
    const [routePart, queryPart] = hash.substring(1).split('?');
    triggerPageHooks(routePart || 'home', queryPart);
  } catch (err) {
    console.warn('[AppSync] Live sync notice:', err.message || err);
  }
}

/**
 * Initialize SPA application
 */
export async function initApp() {
  // 1. Show pre-boot splash loading screen
  showAppLoading('Connecting to ETech Services...');
  updateWishlistBadge();
  refreshAllWishlistButtons();

  // 2. Register auto-reconnect listener: resync data automatically when server comes back
  onServerReconnect(async () => {
    await syncLiveBackendData();
    updateCartBadge();
    updateWishlistBadge();
    refreshAllWishlistButtons();
    updateHeaderAuthUI();
    handleRoute();
  });

  // 3. Probe backend server connectivity via /api/v1/test/ping
  const isOnline = await checkServerHealth();

  if (isOnline) {
    setAppLoadingStatus('Synchronizing store catalog...');
    await syncLiveBackendData();
    hideAppLoading();
    handleRoute();
  } else {
    // If backend is offline, hide initial splash; offline blocker handles UI
    hideAppLoading();
  }

  updateCartBadge();
  updateWishlistBadge();
  updateHeaderAuthUI();
}

/**
 * Main Section Router: Toggles 'hidden' class on page sections based on URL hash
 */
function handleRoute() {
  const hash = window.location.hash || '#home';
  const [routePart, queryPart] = hash.substring(1).split('?');
  const pageName = routePart || 'home';

  // ROUTE GUARDS: Protected pages require signup/login first
  if (pageName === 'checkout') {
    if (!isLoggedIn()) {
      window.location.hash = `#login?redirect=${pageName}`;
      return;
    }
    const cart = getCart();
    if (!cart.length) {
      window.location.hash = '#cart';
      return;
    }
  } else if (pageName === 'account' && !isLoggedIn()) {
    window.location.hash = `#login?redirect=${pageName}`;
    return;
  }

  if (['admin', 'administrator'].includes(pageName)) {
    if (!isLoggedIn()) {
      window.location.hash = '#login?redirect=admin';
      return;
    }
    const user = getCurrentUser();
    if (!user || (!user.isAdmin() && !user.isStaff())) {
      etechAlert.error('Access Denied', 'You do not have administrative privileges to view the Admin Console.');
      window.location.hash = '#home';
      return;
    }
  }

  // Manage Layout (Header, Footer, Chatbot) visibility for full-screen Admin Console
  const storeHeader = document.querySelector('header');
  const storeFooter = document.getElementById('store-footer');
  const chatbot = document.getElementById('et-chatbot');

  if (['admin', 'administrator'].includes(pageName)) {
    if (storeHeader) storeHeader.classList.add('hidden');
    if (storeFooter) storeFooter.classList.add('hidden');
    if (chatbot) chatbot.classList.add('hidden');
  } else {
    if (storeHeader) storeHeader.classList.remove('hidden');
    if (storeFooter) storeFooter.classList.remove('hidden');
    if (chatbot) chatbot.classList.remove('hidden');
  }

  // 1. Hide all page sections
  const sections = document.querySelectorAll('.page-section');
  sections.forEach(sec => sec.classList.add('hidden'));

  // Handle Dynamic Login Page route (#login)
  if (pageName === 'login') {
    if (isLoggedIn()) {
      const user = getCurrentUser();
      window.location.hash = (user && (user.isAdmin() || user.isStaff())) ? '#admin' : '#home';
      return;
    }
    const loginSection = document.getElementById('login-page');
    if (loginSection) {
      loginSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      renderLoginPage(queryPart);
    }
    updateActiveNavLinks(pageName);
    updateHeaderAuthUI();
    return;
  }

  // Handle Dynamic Administrator Dashboard route (#admin or #administrator)
  if (['admin', 'administrator'].includes(pageName)) {
    const adminSection = document.getElementById('admin-page');
    if (adminSection) {
      adminSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      renderAdminPage(queryPart);
    }
    return;
  }

  // Handle About Us route (#about)
  if (pageName === 'about') {
    const aboutSection = document.getElementById('about-page');
    if (aboutSection) {
      aboutSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      renderAboutPage();
    }
    updateActiveNavLinks(pageName);
    updateHeaderAuthUI();
    return;
  }

  // Handle Newsletter Unsubscribe route (#unsubscribe or #unsubscribe?email=...)
  if (['unsubscribe', 'newsletter-unsubscribe'].includes(pageName)) {
    const unsubSection = document.getElementById('unsubscribe-page');
    if (unsubSection) {
      unsubSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      renderUnsubscribePage(queryPart);
    }
    updateActiveNavLinks(pageName);
    updateHeaderAuthUI();
    return;
  }

  // Handle Legal Policy routes (privacy, terms, warranty, returns, policy, policies)
  if (['privacy', 'terms', 'warranty', 'returns', 'policy', 'policies'].includes(pageName)) {
    const policySection = document.getElementById('policy-page');
    if (policySection) {
      policySection.classList.remove('hidden');
      window.scrollTo(0, 0);
      const activeKey = (pageName === 'policy' || pageName === 'policies') ? (queryPart || 'privacy') : pageName;
      renderPolicyPage(activeKey);
    }
    updateActiveNavLinks(pageName);
    updateHeaderAuthUI();
    return;
  }

  // Handle Order Details & Tracking route (#order-detail?id=X or #order-details?id=X or #order-tracking?id=X)
  if (['order', 'order-detail', 'order-details', 'order-tracking'].includes(pageName)) {
    if (!isLoggedIn()) {
      window.location.hash = `#login?redirect=${encodeURIComponent(hash.substring(1))}`;
      return;
    }
    const orderSection = document.getElementById('order-details-page');
    if (orderSection) {
      orderSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      let orderId = '';
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        orderId = params.get('id') || '';
      }
      renderCustomerOrderDetailPage(orderId);
    }
    updateActiveNavLinks('account');
    updateHeaderAuthUI();
    return;
  }

  // Handle Product Details route (#product?id=X or #product-details?id=X)
  if (['product', 'product-details'].includes(pageName)) {
    const productSection = document.getElementById('product-details-page');
    if (productSection) {
      productSection.classList.remove('hidden');
      window.scrollTo(0, 0);
      let productId = 1;
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        productId = parseInt(params.get('id')) || 1;
      }
      renderProductDetailsPage(productId);
    }
    updateActiveNavLinks('shop');
    updateHeaderAuthUI();
    return;
  }

  // 2. Unhide target page section
  const targetSection = document.getElementById(`${pageName}-page`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
    window.scrollTo(0, 0);

    // 3. Trigger route logic hooks
    triggerPageHooks(pageName, queryPart);
  } else {
    // Fallback to home section if page name doesn't match
    const homeSection = document.getElementById('home-page');
    if (homeSection) homeSection.classList.remove('hidden');
    triggerPageHooks('home', queryPart);
  }

  // 4. Update Header Nav & Auth UI
  updateActiveNavLinks(pageName);
  updateHeaderAuthUI();
}

let isRefreshingHome = false;

/**
 * Refreshes live backend API data for the Home Page and updates all home sections
 */
export async function refreshHomePageData() {
  // 1. Render immediately from existing cache/store so UI is fast and responsive
  renderHomeFeaturedProducts();
  renderHomeDealBannerLive();
  renderHomeNewArrivalsCarousel();
  renderHomeNewArrivalsGrid();
  renderHomeBrandsShowcase();

  // 2. Fetch fresh live data from backend REST APIs
  if (isRefreshingHome) return;
  isRefreshingHome = true;

  try {
    await Promise.allSettled([
      syncProductsFromApi({ page: 0, size: 20 }),
      syncPromotionsFromApi(),
      syncCategoriesFromApi({ activeOnly: true }),
      syncBrandsFromApi({ activeOnly: true }),
      syncBadgesFromApi({ activeOnly: true })
    ]);

    // 3. Re-render home sections with fresh backend data
    renderHomeFeaturedProducts();
    renderHomeDealBannerLive();
    renderHomeNewArrivalsCarousel();
    renderHomeNewArrivalsGrid();
    renderHomeBrandsShowcase();
  } catch (err) {
    console.warn('[HomePage] Background refresh notice:', err.message || err);
  } finally {
    isRefreshingHome = false;
  }
}

window.refreshHomePageData = refreshHomePageData;

/**
 * Executes page-specific logic functions after section unhide
 */
function triggerPageHooks(pageName, queryPart) {
  if (pageName === 'home') {
    refreshHomePageData();
  } else {
    stopBrandCarouselAutoPlay();
  }

  if (pageName === 'shop') {
    initShopLogic(queryPart);
  } else if (pageName === 'deals' || pageName === 'hot-deals') {
    initHotDealsLogic(queryPart);
  } else if (pageName === 'wishlist') {
    initWishlistLogic();
  } else if (pageName === 'cart') {
    initCartLogic();
  } else if (pageName === 'checkout') {
    initCheckoutLogic();
  } else if (pageName === 'account') {
    initAccountLogic();
  }

  // Refresh visual state of wishlist heart buttons across active page views
  setTimeout(refreshAllWishlistButtons, 100);
}

// ============================================================
// Mobile Navigation Menu State & Controls
// ============================================================
let mobileMenuListenersInitialized = false;

export function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;

  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    openMobileMenu();
  } else {
    closeMobileMenu();
  }
}

export function openMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const openIcon = document.getElementById('mobile-menu-icon-open');
  const closeIcon = document.getElementById('mobile-menu-icon-close');
  if (!menu) return;

  menu.classList.remove('hidden');
  if (backdrop) {
    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
      backdrop.classList.remove('opacity-0');
      backdrop.classList.add('opacity-100');
    });
  }
  if (openIcon) openIcon.classList.add('hidden');
  if (closeIcon) closeIcon.classList.remove('hidden');
}

export function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const backdrop = document.getElementById('mobile-menu-backdrop');
  const openIcon = document.getElementById('mobile-menu-icon-open');
  const closeIcon = document.getElementById('mobile-menu-icon-close');
  if (!menu) return;

  menu.classList.add('hidden');
  if (backdrop) {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    setTimeout(() => {
      if (menu.classList.contains('hidden')) {
        backdrop.classList.add('hidden');
      }
    }, 200);
  }
  if (openIcon) openIcon.classList.remove('hidden');
  if (closeIcon) closeIcon.classList.add('hidden');
}

export function handleMobileSearchSubmit() {
  const input = document.getElementById('mobile-search-input');
  const query = (input?.value || '').trim();
  closeMobileMenu();
  if (query) {
    window.location.hash = `#shop?search=${encodeURIComponent(query)}`;
  } else {
    window.location.hash = '#shop';
  }
}

export function handleHeaderSearchSubmit() {
  const input = document.getElementById('header-search-input');
  const catSelect = document.getElementById('header-category-select');
  const query = (input?.value || '').trim();
  const cat = catSelect?.value || '';

  const params = [];
  if (cat) params.push(`cat=${encodeURIComponent(cat)}`);
  if (query) params.push(`search=${encodeURIComponent(query)}`);

  const hash = params.length > 0 ? `#shop?${params.join('&')}` : '#shop';
  if (window.location.hash === hash) {
    initShopLogic(params.join('&'));
  } else {
    window.location.hash = hash;
  }
}

function setupMobileMenuEventListeners() {
  if (mobileMenuListenersInitialized) return;
  mobileMenuListenersInitialized = true;

  // Click outside to close mobile menu
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    const toggleBtn = document.getElementById('mobile-menu-btn');
    if (!menu || menu.classList.contains('hidden')) return;

    if (!menu.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
      closeMobileMenu();
    }
  });

  // ESC key to close mobile menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });

  // Resize window: close mobile menu when expanded to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      closeMobileMenu();
    }
  });
}

/**
 * Update Header Authentication Buttons & Mobile Account Drawer
 */
export function updateHeaderAuthUI() {
  setupMobileMenuEventListeners();
  const authContainer = document.getElementById('header-auth-btn-container');
  const mobileDrawer = document.getElementById('mobile-auth-drawer');

  if (typeof getCurrentUser !== 'function') return;

  const user = getCurrentUser();

  if (authContainer) {
    if (user) {
      const isAdminOrStaff = user.isAdmin() || user.isStaff();
      const avatarBg = user.isSuperAdmin() ? 'bg-purple-600' : 'bg-blue-600';

      authContainer.innerHTML = `
          <div class="flex items-center space-x-1.5 sm:space-x-2">
            ${isAdminOrStaff ? `
              <a href="#admin" class="flex items-center space-x-1.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#e2e8f0] hover:border-[#cbd5e1] px-2 lg:px-3 py-1.5 rounded-md transition-all group shadow-sm" title="Admin Console">
                <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span class="text-xs font-semibold text-[#475569] group-hover:text-[#0f172a] hidden lg:inline">Console</span>
              </a>
            ` : ''}
            <a href="#account" class="flex items-center space-x-1.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] border border-[#e2e8f0] hover:border-[#cbd5e1] p-1.5 lg:px-2.5 lg:py-1.5 rounded-md transition-all group shadow-sm" title="My Account (${user.name})">
              <div class="w-6 h-6 rounded ${avatarBg} text-white font-extrabold text-[11px] flex items-center justify-center shadow-xs flex-shrink-0">
                ${user.getInitial()}
              </div>
              <span class="text-xs font-semibold text-[#0f172a] max-w-[90px] truncate hidden lg:inline">${(user.name || user.username).split(' ')[0]}</span>
            </a>
          </div>
        `;
    } else {
      authContainer.innerHTML = `
          <a href="#login" class="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
            <span class="hidden sm:inline">Sign In</span>
            <span class="inline sm:hidden">Login</span>
          </a>
        `;
    }
  }

  if (mobileDrawer) {
    if (user) {
      const isAdminOrStaff = user.isAdmin() || user.isStaff();
      const avatarBg = user.isSuperAdmin() ? 'bg-purple-600' : 'bg-blue-600';

      mobileDrawer.innerHTML = `
        <div class="p-3 bg-white border border-[#e2e8f0] rounded-xl space-y-3 shadow-xs">
          <div class="flex items-center space-x-3">
            <div class="w-9 h-9 rounded-lg ${avatarBg} text-white font-bold flex items-center justify-center text-sm shadow-xs">${user.getInitial()}</div>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-[#0f172a] text-xs truncate">${user.name || user.username}</p>
              <p class="text-[10px] text-[#64748b] truncate">${user.email}</p>
            </div>
            ${getRoleBadge(user.role)}
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-[#e2e8f0]">
            <a href="#account" onclick="closeMobileMenu()" class="text-center py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[#0f172a] rounded-lg text-xs font-bold transition-colors">My Profile</a>
            ${isAdminOrStaff ? `
              <a href="#admin" onclick="closeMobileMenu()" class="text-center py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-colors">Admin Console</a>
            ` : `
              <a href="#account" onclick="closeMobileMenu()" class="text-center py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] text-[#0f172a] rounded-lg text-xs font-bold transition-colors">My Orders</a>
            `}
          </div>
          <button onclick="handleLogout(); closeMobileMenu();" class="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-colors">Sign Out Session</button>
        </div>
      `;
    } else {
      mobileDrawer.innerHTML = `
        <div class="space-y-2">
          <a href="#login" onclick="closeMobileMenu()" class="block w-full text-center py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-sm transition-colors">Sign In to Your Account</a>
          <a href="#login?tab=signup" onclick="closeMobileMenu()" class="block w-full text-center py-2.5 bg-white hover:bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded-lg font-bold text-xs transition-colors">Create Free Account</a>
        </div>
      `;
    }
  }
}

/**
 * Highlights current active link in header nav
 */
function updateActiveNavLinks(pageName) {
  const desktopLinks = document.querySelectorAll('header nav .nav-tab-btn');
  desktopLinks.forEach(link => {
    const href = link.getAttribute('href');
    const isActive = href && (href === `#${pageName}` || href.startsWith(`#${pageName}?`));

    if (isActive) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const mobileLinks = document.querySelectorAll('#mobile-menu .nav-link');
  mobileLinks.forEach(link => {
    const href = link.getAttribute('href');
    const isActive = href && (href === `#${pageName}` || href.startsWith(`#${pageName}?`));

    if (isActive) {
      link.classList.add('text-blue-600', 'bg-blue-50', 'font-bold');
      link.classList.remove('text-[#475569]');
    } else {
      link.classList.remove('text-blue-600', 'bg-blue-50', 'font-bold');
      link.classList.add('text-[#475569]');
    }
  });
}

/**
 * Renders Account section details for logged in user
 */
function initAccountLogic() {
  if (typeof getCurrentUser !== 'function') return;

  const user = getCurrentUser();
  if (!user) {
    window.location.hash = '#login?redirect=account';
    return;
  }

  // Update Profile elements
  const avatarEl = document.getElementById('account-avatar');
  const nameEl = document.getElementById('account-user-name');
  const handleEl = document.getElementById('account-user-handle');
  const usernameEl = document.getElementById('account-user-username');
  const emailEl = document.getElementById('account-user-email');
  const idEl = document.getElementById('account-user-id');
  const joinedEl = document.getElementById('account-user-joined');
  const roleTextEl = document.getElementById('account-user-role-text');

  if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  if (nameEl) nameEl.textContent = user.name;
  if (handleEl) handleEl.textContent = `@${user.username || (user.email ? user.email.split('@')[0] : 'user')}`;
  if (usernameEl) usernameEl.textContent = `@${user.username || (user.email ? user.email.split('@')[0] : 'user')}`;
  if (emailEl) emailEl.textContent = user.email;
  if (idEl) idEl.textContent = user.id || 'USR-882910';
  if (joinedEl) {
    if (user.createdAt) {
      try {
        const d = new Date(user.createdAt);
        joinedEl.textContent = isNaN(d.getTime()) ? user.createdAt : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (e) {
        joinedEl.textContent = user.createdAt;
      }
    } else {
      joinedEl.textContent = 'Today';
    }
  }
  if (roleTextEl) roleTextEl.textContent = `${user.role || 'CUSTOMER'} Account`;

  renderUserOrderHistory(user);
}

/**
 * Real-time Order Filtering State & Handlers
 */
let userOrderSearchQuery = '';
let userOrderStatusFilter = 'All';

export function handleUserOrderSearch(query) {
  userOrderSearchQuery = (query || '').toLowerCase().trim();
  const currentUser = getCurrentUser();
  if (currentUser) renderUserOrderHistory(currentUser);
}

export function handleUserOrderStatusFilter(status) {
  userOrderStatusFilter = status || 'All';
  const currentUser = getCurrentUser();
  if (currentUser) renderUserOrderHistory(currentUser);
}

window.handleUserOrderSearch = handleUserOrderSearch;
window.handleUserOrderStatusFilter = handleUserOrderStatusFilter;
window.renderUserOrderHistory = renderUserOrderHistory;

/**
 * Render user's saved orders history list with Search, Filtering, and Interactive Controls
 */
export function renderUserOrderHistory(userOrEmail) {
  const container = document.getElementById('account-orders-list');
  const countEl = document.getElementById('account-orders-count');
  if (!container) return;

  if (typeof getUserOrders !== 'function') {
    container.innerHTML = `<p class="text-xs text-[#64748b]">Order management system unavailable.</p>`;
    return;
  }

  const allOrders = getUserOrders(userOrEmail);
  const totalCount = allOrders.length;

  const statusCounts = {
    All: totalCount,
    Pending: allOrders.filter(o => (o.status || 'Pending') === 'Pending').length,
    Processing: allOrders.filter(o => o.status === 'Processing').length,
    Shipped: allOrders.filter(o => o.status === 'Shipped').length,
    Delivered: allOrders.filter(o => o.status === 'Delivered').length,
    Cancelled: allOrders.filter(o => o.status === 'Cancelled').length
  };

  const filteredOrders = allOrders.filter(o => {
    const oStatus = o.status || 'Pending';
    const matchesStatus = (userOrderStatusFilter === 'All') || (oStatus === userOrderStatusFilter);
    if (!matchesStatus) return false;

    if (!userOrderSearchQuery) return true;
    const q = userOrderSearchQuery;
    const matchId = String(o.orderId || '').toLowerCase().includes(q);
    const matchCity = String(o.city || '').toLowerCase().includes(q);
    const matchBranch = String(o.fulfillmentBranch || '').toLowerCase().includes(q);
    const matchPayment = String(o.paymentMethod || '').toLowerCase().includes(q);
    const matchItem = Array.isArray(o.items) && o.items.some(i => String(i.name || '').toLowerCase().includes(q));
    return matchId || matchCity || matchBranch || matchPayment || matchItem;
  });

  if (countEl) countEl.textContent = `${filteredOrders.length} of ${totalCount} Order${totalCount === 1 ? '' : 's'}`;

  // Filter toolbar HTML
  const filterToolbarHTML = `
    <div class="space-y-2.5 pb-2">
      <!-- Search Input -->
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94a3b8]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </span>
        <input 
          type="text" 
          id="account-orders-search-input"
          placeholder="Search by Order ID, product title, branch or city..." 
          value="${userOrderSearchQuery}"
          oninput="handleUserOrderSearch(this.value)"
          class="w-full pl-9 pr-8 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg text-xs text-[#0f172a] focus:bg-white focus:border-blue-600 outline-none transition-all placeholder-[#94a3b8]"
        >
        ${userOrderSearchQuery ? `
          <button type="button" onclick="handleUserOrderSearch(''); document.getElementById('account-orders-search-input').value='';" class="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94a3b8] hover:text-[#0f172a]">
            &times;
          </button>
        ` : ''}
      </div>

      <!-- Status Filter Chips -->
      <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
        ${['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(st => {
          const count = statusCounts[st] || 0;
          const isActive = userOrderStatusFilter === st;
          return `
            <button 
              type="button" 
              onclick="handleUserOrderStatusFilter('${st}')"
              class="px-2.5 py-1 rounded-full font-bold transition-all whitespace-nowrap flex items-center space-x-1 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0f172a]'
              }">
              <span>${st}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#e2e8f0] text-[#475569]'}">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (filteredOrders.length === 0) {
    container.innerHTML = `
      ${totalCount > 0 ? filterToolbarHTML : ''}
      <div class="text-center py-12 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] space-y-3">
        <div class="w-12 h-12 rounded-full bg-white text-[#64748b] flex items-center justify-center mx-auto border border-[#e2e8f0]">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        </div>
        <h4 class="text-sm font-bold text-[#0f172a]">${totalCount === 0 ? 'No Orders Placed Yet' : 'No Matching Orders Found'}</h4>
        <p class="text-xs text-[#64748b] max-w-sm mx-auto">
          ${totalCount === 0 
            ? 'Your purchase order history will appear here after placing your first hardware order.' 
            : 'Try adjusting your search keywords or filter status to find what you are looking for.'}
        </p>
        ${totalCount === 0 ? `
          <a href="#shop" class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md transition-colors shadow-sm">Explore Hardware Catalog</a>
        ` : `
          <button type="button" onclick="handleUserOrderSearch(''); handleUserOrderStatusFilter('All');" class="inline-block px-3.5 py-1.5 bg-white border border-[#e2e8f0] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs rounded-md transition-colors shadow-2xs">
            Clear Search Filters
          </button>
        `}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${filterToolbarHTML}
    <div class="space-y-3">
      ${filteredOrders.map(order => {
        const oStatus = order.status || 'Pending';
        const isCancellable = oStatus === 'Pending' || oStatus === 'Processing';

        return `
          <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 space-y-3.5 hover:border-[#cbd5e1] transition-all shadow-xs">
            
            <!-- Order Header -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-2.5 gap-2">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Order ID</span>
                <div class="flex items-center space-x-2">
                  <a href="#order-detail?id=${order.orderId}" class="text-sm font-black text-blue-600 hover:text-blue-700 hover:underline font-mono">
                    #${order.orderId}
                  </a>
                  <span class="text-[10px] text-[#64748b]">&bull; ${order.date}</span>
                </div>
              </div>
              <div class="flex items-center space-x-3">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${getStatusStyle(oStatus)}">
                  ${oStatus === 'Cancelled' ? '✕ Cancelled' : (oStatus === 'Delivered' ? '✓ Delivered' : `● ${oStatus}`)}
                </span>
                <span class="text-base font-extrabold text-[#0f172a] font-mono">
                  ${formatLKR(parseCurrencyAmount(order.totalAmount || order.total))}
                </span>
              </div>
            </div>

            <!-- Dispatch Hub & Destination -->
            <div class="flex items-center justify-between text-xs bg-white p-2.5 rounded-md border border-[#e2e8f0]">
              <span class="text-[#64748b]">Dispatch Hub: <strong class="text-[#0f172a]">${order.fulfillmentBranch || 'Colombo Hub'}</strong></span>
              <span class="text-[#64748b]">Destination: <strong class="text-blue-600">${order.city || 'Colombo'}</strong> (${order.distanceKm || 5} km)</span>
            </div>

            <!-- Items Grid: Clickable to inspect each product -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Purchased Items (${(order.items || []).length})</p>
                <span class="text-[10px] text-blue-600 font-semibold">Click product to view</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                ${(order.items || []).map(item => `
                  <a href="#product?id=${item.id}" class="flex items-center space-x-2.5 bg-white p-2.5 rounded-md border border-[#e2e8f0] hover:border-blue-500 hover:bg-blue-50/20 transition-all group shadow-2xs">
                    <img src="${item.image}" alt="${item.name}" class="w-10 h-10 object-cover rounded flex-shrink-0 bg-[#f8fafc] border border-[#e2e8f0] group-hover:scale-105 transition-transform">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors truncate">${item.name}</p>
                      <p class="text-[10px] text-[#64748b] font-mono">Qty: ${item.quantity} &times; Rs. ${parseFloat(item.price || 0).toLocaleString()}</p>
                    </div>
                    <span class="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">View &rarr;</span>
                  </a>
                `).join('')}
              </div>
            </div>

            <!-- Order Card Action Footer -->
            <div class="pt-3 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-2.5">
              <div class="flex items-center space-x-2 text-[11px] text-[#64748b]">
                <span>Payment: <strong class="text-[#0f172a]">${order.paymentMethod}</strong></span>
                <span class="text-emerald-600 font-medium flex items-center space-x-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Verified</span>
                </span>
              </div>

              <div class="flex items-center space-x-2">
                ${isCancellable ? `
                  <button type="button" onclick="handleCustomerCancelOrder('${order.orderId}')" class="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition-colors shadow-2xs">
                    Cancel Order
                  </button>
                ` : ''}

                <a href="#order-detail?id=${order.orderId}" class="px-3.5 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-500 rounded shadow-xs transition-colors flex items-center space-x-1">
                  <span>Track &amp; Details</span>
                  <span>&rarr;</span>
                </a>
              </div>
            </div>

          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Log out active session
 */
export function handleLogout() {
  if (typeof logoutUser === 'function') {
    logoutUser();
  }
  showToast('Signed out of account.');
  window.location.hash = '#home';
  handleRoute();
}

window.handleLogout = handleLogout;

let homeBannerTimerInterval = null;

/**
 * Renders dynamic Home Deal Banner configuration with persistent real-time countdown
 */
export function renderHomeDealBannerLive() {
  const container = document.getElementById('home-weekend-deal-card');
  if (!container || typeof getHomeDealBanner === 'undefined') return;

  const isLive = typeof isHomeDealBannerActive === 'function' ? isHomeDealBannerActive() : true;
  const bannerCol = container.closest('.lg\\:col-span-5') || container.parentElement;
  const bestSellersCol = document.querySelector('#featured .lg\\:col-span-7, #featured .lg\\:col-span-12');

  if (!isLive) {
    if (bannerCol) bannerCol.classList.add('hidden');
    if (bestSellersCol) {
      bestSellersCol.classList.remove('lg:col-span-7');
      bestSellersCol.classList.add('lg:col-span-12');
    }
    if (homeBannerTimerInterval) clearInterval(homeBannerTimerInterval);
    return;
  }

  // If live, ensure visible and properly laid out
  if (bannerCol) bannerCol.classList.remove('hidden');
  if (bestSellersCol) {
    bestSellersCol.classList.remove('lg:col-span-12');
    bestSellersCol.classList.add('lg:col-span-7');
  }

  const banner = getHomeDealBanner();
  container.style.backgroundImage = `url('${banner.bgImage || 'public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg'}')`;

  const tagEl = document.getElementById('home-deal-tag');
  if (tagEl) tagEl.textContent = banner.tag || 'WEEKEND TECH DEAL';

  const headingEl = document.getElementById('home-deal-heading');
  if (headingEl) {
    headingEl.innerHTML = `
      ${banner.title || 'Upgrade your setup'}<br>
      ${banner.titleHighlight || 'Save up to 20%'}<br>
      <span class="text-white/90 text-base sm:text-lg font-medium">${banner.subtitle || 'on selected components'}</span>
    `;
  }

  const btnEl = document.getElementById('home-deal-btn');
  if (btnEl) {
    btnEl.innerHTML = `
      <span>Shop Deals</span>
      <svg class="w-3.5 h-3.5 text-[#0f172a] group-hover:translate-x-1 transition-transform" fill="none"
        stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
          d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    `;
    btnEl.setAttribute('href', '#deals');
  }

  // Update timer display & start ticking
  const updateHomeTimerDisplay = () => {
    const t = getHomeBannerRemainingTime();
    const daysEl = document.getElementById('home-deal-timer-days');
    const hrsEl = document.getElementById('home-deal-timer-hrs');
    const minsEl = document.getElementById('home-deal-timer-mins');
    const secsEl = document.getElementById('home-deal-timer-secs');

    if (daysEl) daysEl.textContent = t.days;
    if (hrsEl) hrsEl.textContent = t.hours;
    if (minsEl) minsEl.textContent = t.mins;
    if (secsEl) secsEl.textContent = t.secs;
  };

  updateHomeTimerDisplay();
  if (homeBannerTimerInterval) clearInterval(homeBannerTimerInterval);
  homeBannerTimerInterval = setInterval(updateHomeTimerDisplay, 1000);
}

/**
 * Renders top 4 featured products on home page section
 */
function renderHomeFeaturedProducts() {
  const grid = document.getElementById('home-featured-grid');
  if (!grid || typeof getFeaturedProducts === 'undefined') return;

  const featured = getFeaturedProducts().slice(0, 4);
  grid.innerHTML = featured.map(product => `
    <div class="group rounded-xl bg-white border border-slate-100 hover:border-slate-300 p-3.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md">
      <div>
        <div onclick="viewProductDetails(${product.id})" class="relative overflow-hidden rounded-lg bg-white mb-2.5 h-32 flex items-center justify-center cursor-pointer">
          <img src="${product.image}" alt="${product.name}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">
          <span class="absolute top-1 left-1 bg-[#ff7a00] text-white text-[8px] sm:text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded shadow-sm tracking-wide">BEST SELLER</span>
        </div>
        <h3 onclick="viewProductDetails(${product.id})" class="text-xs font-bold text-[#0f172a] line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer leading-tight h-8" title="${product.name}">${product.name}</h3>
        <div class="flex items-center space-x-1 mt-1 text-[11px] text-amber-500 font-bold">
          <span>★</span>
          <span>${product.rating || '4.8'}</span>
          <span class="text-[#94a3b8] font-normal text-[11px]">(${product.reviews || '156'})</span>
        </div>
      </div>
      
      <div class="mt-3.5 flex items-center justify-between">
        <div>
          <p class="text-sm font-extrabold text-blue-600 font-sans tracking-tight">Rs. ${product.price ? product.price.toLocaleString() : ''}</p>
        </div>
        <div class="flex items-center space-x-1.5">
          <button 
            data-wishlist-btn="${product.id}"
            onclick="toggleWishlist(${product.id}, this)" 
            class="w-8 h-8 rounded-lg bg-slate-50 hover:bg-rose-50 text-[#64748b] hover:text-rose-600 border border-slate-200 hover:border-rose-200 flex items-center justify-center transition-colors shadow-xs cursor-pointer" 
            title="Add to Wishlist">
            <svg class="w-4 h-4 ${isInWishlist(product.id) ? 'text-rose-600 fill-rose-600' : 'text-[#64748b]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button onclick="addToCart(${product.id})" class="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer" title="Add to Cart">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Renders top 4 new arrival products in New Arrivals grid on home page
 */
export function renderHomeNewArrivalsGrid() {
  const grid = document.getElementById('home-new-arrivals-grid');
  if (!grid || typeof getNewArrivalProducts === 'undefined') return;

  const arrivals = getNewArrivalProducts().slice(0, 4);
  grid.innerHTML = arrivals.map(product => {
    const productBrand = product.brand || '';
    return `
    <div class="group rounded-lg bg-white border border-[#e2e8f0] hover:border-[#cbd5e1] p-3.5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md">
      <div>
        <div onclick="viewProductDetails(${product.id})" class="relative overflow-hidden rounded-md bg-[#f8fafc] mb-3 h-36 flex items-center justify-center cursor-pointer border border-[#e2e8f0]">
          <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          <div class="absolute top-2 left-2 flex flex-col gap-1 items-start">
            <span class="bg-blue-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded shadow-sm">${product.badge || 'New Arrival'}</span>
            ${productBrand ? `<span class="bg-slate-900/90 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-white/20 shadow-sm">${productBrand}</span>` : ''}
          </div>
        </div>
        <div class="flex items-center space-x-1.5 text-[10px] font-bold uppercase font-mono tracking-wider">
          <span class="text-blue-600">${product.category}</span>
          ${productBrand ? `<span class="text-slate-300">•</span><span class="text-slate-700 bg-slate-100 px-1 py-0.2 rounded text-[9px] font-mono font-bold">${productBrand}</span>` : ''}
        </div>
        <h3 onclick="viewProductDetails(${product.id})" class="text-xs font-bold text-[#0f172a] mt-1 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer">${product.name}</h3>
        <div class="flex items-center space-x-1 mt-1 text-[11px] text-amber-500 font-bold">
          <span>★</span>
          <span>${product.rating || '4.8'}</span>
          <span class="text-[#94a3b8] font-normal">(${product.reviews || '24'})</span>
        </div>
      </div>
      <div class="mt-3 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between">
        <div>
          ${product.originalPrice ? `<span class="text-[10px] text-[#94a3b8] line-through font-mono">Rs. ${product.originalPrice}</span>` : ''}
          <p class="text-sm font-extrabold text-[#0f172a] font-mono">Rs. ${product.price}</p>
        </div>
        <div class="flex items-center space-x-1.5">
          <button 
            data-wishlist-btn="${product.id}"
            onclick="toggleWishlist(${product.id}, this)" 
            class="p-2 bg-[#f8fafc] hover:bg-rose-50 text-[#64748b] hover:text-rose-600 rounded-md border border-[#e2e8f0] hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer" 
            title="Add to Wishlist">
            <svg class="w-3.5 h-3.5 ${isInWishlist(product.id) ? 'text-rose-600 fill-rose-600' : 'text-[#64748b]'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
          <button onclick="addToCart(${product.id})" class="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md shadow-sm transition-all flex items-center justify-center cursor-pointer" title="Add to Cart">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  }).join('');
}

// ── Live Featured Brand Carousel Controller ──
let brandCarouselTimer = null;
let brandDragListenersAttached = false;
let isBrandDragging = false;
let brandDragStartX = 0;
let brandDragScrollLeft = 0;
let hasBrandDragMoved = false;

/**
 * Renders Authorized Brands Live Carousel on Home Page
 */
export function renderHomeBrandsShowcase() {
  const container = document.getElementById('home-brands-container');
  if (!container) return;

  let brands = getFeaturedBrands();
  // Fallback to all active brands if none explicitly marked as featured
  if (!brands || brands.length === 0) {
    brands = (typeof getBrands === 'function' ? getBrands({ activeOnly: true }) : []).slice(0, 12);
  }

  const allProducts = (typeof getStoredProducts === 'function' ? getStoredProducts() : null) || products || [];

  if (!brands || brands.length === 0) {
    container.innerHTML = `<div class="text-xs text-[#64748b] py-6 text-center w-full">No featured brands available.</div>`;
    stopBrandCarouselAutoPlay();
    return;
  }

  // Ensure ample cards for fluid, infinite carousel experience
  let displayBrands = [...brands];
  if (displayBrands.length > 0 && displayBrands.length < 8) {
    displayBrands = [...displayBrands, ...displayBrands];
  }

  container.innerHTML = displayBrands.map(brand => {
    // Count products for this brand
    const count = allProducts.filter(p => {
      const pBrand = (p.brand || '').toLowerCase().trim();
      const bName = brand.name.toLowerCase().trim();
      return pBrand === bName || pBrand.includes(bName) || bName.includes(pBrand);
    }).length;

    const initials = (brand.name || 'BR').substring(0, 2).toUpperCase();

    return `
      <a href="#shop?brand=${encodeURIComponent(brand.id || brand.slug)}" 
         data-brand-id="${brand.id || brand.slug}"
         class="brand-carousel-card group flex-shrink-0 w-52 sm:w-60 bg-[#f8fafc] hover:bg-white border border-[#e2e8f0] hover:border-blue-300 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-xs cursor-pointer select-none">
        <div>
          <!-- Brand Logo Container -->
          <div class="w-full h-18 rounded-xl bg-white border border-[#e2e8f0] p-3 flex items-center justify-center mb-3 shadow-xs group-hover:border-blue-200 transition-colors overflow-hidden">
            ${brand.logo || brand.logoUrl ? `
              <img src="${brand.logo || brand.logoUrl}" alt="${brand.name}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                   class="max-h-full max-w-full object-contain filter group-hover:scale-105 transition-transform duration-300 pointer-events-none">
              <span style="display:none" class="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm items-center justify-center border border-blue-200 pointer-events-none">${initials}</span>
            ` : `
              <span class="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm flex items-center justify-center border border-blue-200 pointer-events-none">${initials}</span>
            `}
          </div>

          <!-- Brand Title & Tagline -->
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-1">
              <h4 class="font-extrabold text-sm text-[#0f172a] group-hover:text-blue-600 transition-colors truncate">${brand.name}</h4>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 flex-shrink-0">${brand.country || 'Global'}</span>
            </div>
            <p class="text-[11px] text-[#64748b] line-clamp-1 italic">${brand.tagline || 'Authorized Hardware Partner'}</p>
          </div>
        </div>

        <!-- Footer: Product Count & Arrow -->
        <div class="mt-3 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between text-[11px] font-mono">
          <span class="text-blue-600 font-bold">${count} Products</span>
          <span class="text-slate-400 font-bold group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex items-center gap-0.5">Explore <span>→</span></span>
        </div>
      </a>
    `;
  }).join('');

  initBrandCarouselInteractions(container);
  startBrandCarouselAutoPlay();
}

/**
 * Wire interactive hover-pause, touch, and click-and-drag gesture listeners
 */
function initBrandCarouselInteractions(container) {
  if (brandDragListenersAttached) return;
  brandDragListenersAttached = true;

  // Hover to pause auto-rotation
  container.addEventListener('mouseenter', () => {
    stopBrandCarouselAutoPlay();
  });

  container.addEventListener('mouseleave', () => {
    if (!isBrandDragging) {
      startBrandCarouselAutoPlay();
    }
  });

  // Touch pause & resume
  container.addEventListener('touchstart', () => {
    stopBrandCarouselAutoPlay();
  }, { passive: true });

  container.addEventListener('touchend', () => {
    startBrandCarouselAutoPlay(4000);
  }, { passive: true });

  // Mouse Drag to Scroll (fluid desktop flicking)
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Only primary button
    isBrandDragging = true;
    hasBrandDragMoved = false;
    brandDragStartX = e.pageX - container.offsetLeft;
    brandDragScrollLeft = container.scrollLeft;
    container.classList.add('cursor-grabbing');
    container.classList.remove('cursor-grab', 'scroll-smooth');
    stopBrandCarouselAutoPlay();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isBrandDragging) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - brandDragStartX) * 1.5;
    if (Math.abs(walk) > 5) {
      hasBrandDragMoved = true;
    }
    container.scrollLeft = brandDragScrollLeft - walk;
  });

  window.addEventListener('mouseup', () => {
    if (!isBrandDragging) return;
    isBrandDragging = false;
    container.classList.remove('cursor-grabbing');
    container.classList.add('cursor-grab', 'scroll-smooth');
    startBrandCarouselAutoPlay(4000);
  });

  // Prevent link click when dragging
  container.addEventListener('click', (e) => {
    if (hasBrandDragMoved) {
      e.preventDefault();
      e.stopPropagation();
      hasBrandDragMoved = false;
    }
  }, true);
}

/**
 * Scroll brands left or right manually with arrow buttons
 */
export function scrollHomeBrands(direction) {
  const container = document.getElementById('home-brands-container');
  if (!container) return;

  const card = container.querySelector('.brand-carousel-card');
  const cardWidth = card ? card.offsetWidth : 240;
  const gap = 16;
  const step = (cardWidth + gap) * (direction > 0 ? 1 : -1);

  const maxScroll = container.scrollWidth - container.clientWidth;
  
  if (direction > 0 && container.scrollLeft >= maxScroll - 15) {
    // Smooth wrap back to start
    container.scrollTo({ left: 0, behavior: 'smooth' });
  } else if (direction < 0 && container.scrollLeft <= 15) {
    // Smooth wrap back to end
    container.scrollTo({ left: maxScroll, behavior: 'smooth' });
  } else {
    container.scrollBy({ left: step, behavior: 'smooth' });
  }

  // Restart auto-play with 5 second grace period
  startBrandCarouselAutoPlay(5000);
}

/**
 * Auto-advances the live brand carousel at a set interval
 */
export function startBrandCarouselAutoPlay(delayMs = 3200) {
  stopBrandCarouselAutoPlay();

  brandCarouselTimer = setInterval(() => {
    const container = document.getElementById('home-brands-container');
    if (!container || !container.offsetParent) {
      stopBrandCarouselAutoPlay();
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 10) return; // Not enough content to scroll

    const card = container.querySelector('.brand-carousel-card');
    const cardWidth = card ? card.offsetWidth : 240;
    const gap = 16;
    const step = cardWidth + gap;

    if (container.scrollLeft >= maxScroll - 20) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: step, behavior: 'smooth' });
    }
  }, delayMs);
}

/**
 * Stops the live brand carousel auto-advance timer
 */
export function stopBrandCarouselAutoPlay() {
  if (brandCarouselTimer) {
    clearInterval(brandCarouselTimer);
    brandCarouselTimer = null;
  }
}

// Global window bindings
if (typeof window !== 'undefined') {
  window.scrollHomeBrands = scrollHomeBrands;
  window.startBrandCarouselAutoPlay = startBrandCarouselAutoPlay;
  window.stopBrandCarouselAutoPlay = stopBrandCarouselAutoPlay;
}

// ── Hero New Arrivals Product Carousel Controller ──
let currentCarouselIndex = 0;
let carouselTimer = null;
let carouselTouchStartX = 0;

/**
 * Renders dynamic 3D Stacked Product Card Mockup Carousel in Hero Section
 * Redesigned: Wider cards, varied badges, category labels, proper 3D spread
 */
export function renderHomeNewArrivalsCarousel() {
  const container = document.getElementById('hero-carousel-container');
  if (!container || typeof getNewArrivalProducts === 'undefined') return;

  const arrivals = getNewArrivalProducts();
  if (!arrivals || arrivals.length === 0) {
    container.innerHTML = '';
    return;
  }

  // Ensure current index is valid
  if (currentCarouselIndex >= arrivals.length) {
    currentCarouselIndex = 0;
  }

  const n = arrivals.length;
  const idx0 = currentCarouselIndex;
  const idx1 = (currentCarouselIndex + 1) % n;
  const idx2 = (currentCarouselIndex + 2) % n;

  const product0 = arrivals[idx0];
  const product1 = arrivals[idx1];
  const product2 = arrivals[idx2];

  // Badge style variants for visual distinction
  const badgeStyles = [
    { bg: 'bg-emerald-500', text: 'NEW ARRIVAL' },
    { bg: 'bg-violet-500', text: 'POPULAR' },
    { bg: 'bg-amber-500', text: 'BEST SELLER' }
  ];

  // Resolve category display name from product data
  const getCategoryLabel = (p) => {
    if (p.categoryName) return p.categoryName.toUpperCase();
    if (p.category) {
      const cat = typeof p.category === 'string' ? p.category : (p.category.name || p.category.categoryName || '');
      return cat.replace(/^cat-/i, '').replace(/-/g, ' ').toUpperCase();
    }
    return '';
  };

  // Helper renderer for wider product cards in the 3D deck
  const renderCardItem = (p, slotClass, slideIdx, isFront, badgeIdx) => {
    const badge = badgeStyles[badgeIdx % badgeStyles.length];
    const badgeLabel = p.badge || badge.text;
    const badgeBg = badgeIdx === 0 ? 'bg-emerald-500' : (badgeIdx === 1 ? 'bg-violet-500' : 'bg-amber-500');
    const categoryLabel = getCategoryLabel(p);

    return `
    <div class="absolute top-0 hero-card-3d card-3d-deck-item ${slotClass} cursor-pointer select-none" 
         onclick="${isFront ? `viewProductDetails(${p.id})` : `goToHeroCarouselSlide(${slideIdx})`}">
      <div class="relative h-full flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-white/60 shadow-2xl overflow-hidden group">
        
        <!-- Top Pill Badge -->
        <div class="flex items-center justify-between z-10 mb-1.5">
          <span class="px-2.5 py-[3px] rounded-full ${badgeBg} text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
            ${badgeLabel}
          </span>
          ${isFront ? '<span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse shadow-sm shadow-blue-400"></span>' : ''}
        </div>

        <!-- Product Image Showcase -->
        <div class="relative w-full flex items-center justify-center py-2 sm:py-3 my-1 rounded-xl bg-slate-50/80 border border-slate-100 group-hover:border-blue-100 transition-colors">
          <div class="flex justify-center items-center w-full hero-card-img-container overflow-hidden">
            <img src="${p.image}" alt="${p.name}" class="max-w-full max-h-full object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105">
          </div>
          ${isFront ? `
          <div class="absolute inset-0 bg-[#0f172a]/8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-xl pointer-events-none">
            <span class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold shadow-md flex items-center space-x-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>View Specs</span>
            </span>
          </div>` : ''}
        </div>

        <!-- Product Info -->
        <div class="space-y-0.5 z-10 mt-1">
          ${categoryLabel ? `<p class="text-[9px] sm:text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider truncate">${categoryLabel}</p>` : ''}
          <h3 class="text-[11px] sm:text-[13px] font-extrabold text-[#0f172a] line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            ${p.name}
          </h3>
          <div class="pt-1 flex flex-col items-start">
            ${p.originalPrice ? `<span class="text-[9px] sm:text-[10px] text-[#94a3b8] line-through font-semibold font-mono">Rs. ${p.originalPrice.toLocaleString()}</span>` : ''}
            <span class="text-sm sm:text-[15px] font-black text-blue-600 font-mono tracking-tight">
              Rs. ${p.price.toLocaleString()}
            </span>
          </div>
        </div>

      </div>
    </div>
  `;
  };

  container.innerHTML = `
    <div class="relative w-full max-w-[520px] sm:max-w-[560px] lg:max-w-[580px] pt-1 pb-4" id="hero-carousel-wrapper"
         onmouseenter="pauseHeroCarousel()" 
         onmouseleave="startHeroCarouselAutoPlay()">
      
      <!-- Top Right Counter Badge -->
      <div class="flex items-center justify-end mb-2 pr-1">
        <span class="text-[11px] font-mono font-extrabold text-slate-300 bg-white/10 backdrop-blur px-2.5 py-0.5 rounded-md border border-white/15 shadow-sm">
          ${currentCarouselIndex + 1}/${arrivals.length}
        </span>
      </div>

      <!-- 3D Card Deck Viewport -->
      <div class="relative hero-card-deck-viewport w-full hero-carousel-container-3d overflow-visible">
        <!-- Back Card (Slot 2) -->
        ${renderCardItem(product2, 'card-deck-slot-2', idx2, false, 2)}

        <!-- Middle Card (Slot 1) -->
        ${renderCardItem(product1, 'card-deck-slot-1', idx1, false, 1)}

        <!-- Front Active Card (Slot 0) -->
        ${renderCardItem(product0, 'card-deck-slot-0', idx0, true, 0)}
      </div>

      <!-- Bottom Controls Row -->
      <div class="flex items-center justify-end space-x-3 mt-3 pr-2">
        <!-- Navigation Arrow Buttons -->
        <div class="flex items-center space-x-2">
          <button onclick="prevHeroCarouselSlide()" 
                  class="w-8 h-8 rounded-full bg-white/90 hover:bg-blue-600 hover:text-white text-[#0f172a] border border-white/40 flex items-center justify-center shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 active:scale-95" 
                  title="Previous Card">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
          </button>
          
          <button onclick="nextHeroCarouselSlide()" 
                  class="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all transform hover:scale-105 active:scale-95" 
                  title="Next Card">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <!-- Dot Pagination Indicators -->
        <div class="flex items-center space-x-1.5 ml-1">
          ${arrivals.map((_, idx) => `
            <button onclick="goToHeroCarouselSlide(${idx})" 
                    class="hero-carousel-indicator h-2 rounded-full transition-all duration-300 ${idx === currentCarouselIndex ? 'active w-5 bg-blue-600' : 'w-2 bg-white/40 hover:bg-white/70'}"
                    title="Go to card ${idx + 1}"></button>
          `).join('')}
        </div>
      </div>

    </div>
  `;

  // Touch Swipe Support
  const wrapper = document.getElementById('hero-carousel-wrapper');
  if (wrapper) {
    wrapper.addEventListener('touchstart', (e) => {
      carouselTouchStartX = e.touches[0].clientX;
    }, { passive: true });

    wrapper.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = carouselTouchStartX - touchEndX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) nextHeroCarouselSlide();
        else prevHeroCarouselSlide();
      }
    }, { passive: true });
  }

  startHeroCarouselAutoPlay();
}
/**
 * Jump to specific carousel slide
 */
export function goToHeroCarouselSlide(index) {
  const arrivals = typeof getNewArrivalProducts === 'function' ? getNewArrivalProducts() : [];
  if (!arrivals || arrivals.length === 0) return;
  currentCarouselIndex = (index + arrivals.length) % arrivals.length;
  renderHomeNewArrivalsCarousel();
}

/**
 * Move to next slide (left movement)
 */
export function nextHeroCarouselSlide() {
  goToHeroCarouselSlide(currentCarouselIndex + 1);
}

/**
 * Move to previous slide
 */
export function prevHeroCarouselSlide() {
  goToHeroCarouselSlide(currentCarouselIndex - 1);
}

/**
 * Start continuous auto-play timer (slides left every 3.5 seconds)
 */
export function startHeroCarouselAutoPlay() {
  pauseHeroCarousel();
  carouselTimer = setInterval(() => {
    const arrivals = typeof getNewArrivalProducts === 'function' ? getNewArrivalProducts() : [];
    if (arrivals && arrivals.length > 1) {
      currentCarouselIndex = (currentCarouselIndex + 1) % arrivals.length;
      renderHomeNewArrivalsCarousel();
    }
  }, 3500);
}

/**
 * Pause auto-play timer on hover
 */
export function pauseHeroCarousel() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

// Bind to window for inline handlers
window.renderHomeNewArrivalsCarousel = renderHomeNewArrivalsCarousel;
window.goToHeroCarouselSlide = goToHeroCarouselSlide;
window.nextHeroCarouselSlide = nextHeroCarouselSlide;
window.prevHeroCarouselSlide = prevHeroCarouselSlide;
window.pauseHeroCarousel = pauseHeroCarousel;
window.startHeroCarouselAutoPlay = startHeroCarouselAutoPlay;

// Real-time synchronization listeners
window.addEventListener('storage', (e) => {
  if (e.key === 'etech_products') {
    renderHomeNewArrivalsCarousel();
    renderHomeFeaturedProducts();
  }
  if (e.key === 'etech_home_deal_banner') {
    renderHomeDealBannerLive();
  }
});

window.addEventListener('productsUpdated', () => {
  renderHomeNewArrivalsCarousel();
  renderHomeFeaturedProducts();
  renderHomeDealBannerLive();
});

/**
 * Renders Legal Policy Section (Privacy Policy, Terms of Service, Guarantee & Warranty)
 */
async function renderPolicyPage(policyKey = 'privacy') {
  const container = document.getElementById('policy-content-area');
  const tabsContainer = document.getElementById('policy-tabs-container');
  if (!container) return;

  let policies = getStoredPolicies();
  if (!policies || Object.keys(policies).length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-12 text-center shadow-sm">
        <div class="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p class="text-sm font-bold text-[#0f172a]">Loading Legal Policies from Server...</p>
        <p class="text-xs text-[#64748b] mt-1">Retrieving official customer protection documents directly from ETech backend.</p>
      </div>
    `;
    try {
      await syncPoliciesFromApi();
      policies = getStoredPolicies();
    } catch (e) {
      container.innerHTML = `
        <div class="bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
          <p class="text-sm font-bold text-rose-600">Failed to load legal policies</p>
          <p class="text-xs text-[#64748b] mt-1">Please ensure the backend server is online and try again.</p>
        </div>
      `;
      return;
    }
  }

  const keys = Object.keys(policies);
  if (keys.length === 0) {
    container.innerHTML = `<div class="bg-white border border-[#e2e8f0] rounded-2xl p-8 text-center text-xs text-[#64748b]">No legal policies currently published.</div>`;
    return;
  }

  const key = policies[policyKey] ? policyKey : (keys.includes('privacy') ? 'privacy' : keys[0]);
  const policy = policies[key];
  if (!policy) return;

  // Render Tabs
  if (tabsContainer) {
    tabsContainer.innerHTML = keys.map(k => {
      const p = policies[k];
      const isActive = k === key;
      return `
        <a href="#${k}" class="flex items-center space-x-2 px-4 py-2 rounded-md font-bold text-xs transition-all shadow-sm ${isActive
          ? 'bg-blue-600 text-white'
          : 'bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] border border-[#e2e8f0]'
        }">
          ${p.icon || '📄'}
          <span>${p.title}</span>
        </a>
      `;
    }).join('');
  }

  // Render Main Policy Content Body
  container.innerHTML = `
    <div class="bg-white border border-[#e2e8f0] rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
      
      <!-- Policy Header Banner -->
      <div class="border-b border-[#e2e8f0] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2 mb-1.5">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">Official Legal Policy</span>
          </div>
          <h1 class="text-2xl font-extrabold text-[#0f172a] tracking-tight">${policy.title}</h1>
          <p class="text-xs text-[#64748b] mt-1">${policy.subtitle}</p>
        </div>

        <div class="flex items-center gap-2">
          <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-xs">
            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Updated: ${policy.lastUpdated}</span>
          </span>
          <button onclick="window.print()" class="px-3 py-1 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] rounded text-xs font-bold border border-[#e2e8f0] transition-all shadow-sm">
            Print
          </button>
        </div>
      </div>

      <!-- Policy Sections List -->
      <div class="space-y-4">
        ${(policy.sections || []).map(sec => {
          let bullets = [];
          if (Array.isArray(sec.bullets) && sec.bullets.length > 0) {
            bullets = sec.bullets;
          } else if (sec.bulletPoints) {
            bullets = sec.bulletPoints.split('|').map(b => b.trim()).filter(Boolean);
          }

          return `
            <div class="space-y-2 bg-[#f8fafc] p-4 rounded-md border border-[#e2e8f0]">
              <h3 class="text-sm font-bold text-[#0f172a] flex items-center space-x-2">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                <span>${sec.heading || sec.sectionTitle || ''}</span>
              </h3>
              ${sec.content || sec.sectionContent ? `
                <p class="text-xs text-[#475569] leading-relaxed font-normal">${sec.content || sec.sectionContent}</p>
              ` : ''}
              ${bullets.length > 0 ? `
                <ul class="mt-2 space-y-1 pl-3 border-l border-blue-200">
                  ${bullets.map(bullet => `
                    <li class="text-xs text-[#64748b] flex items-start space-x-2">
                      <span class="text-blue-600 font-bold">▪</span>
                      <span>${bullet}</span>
                    </li>
                  `).join('')}
                </ul>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}
