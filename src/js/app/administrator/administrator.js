import { initAdminDashboard, switchAdminTab, closeAdminSidebar, toggleAdminSidebar } from '../../controller/admin_dashboard_controller.js';
import { isLoggedIn, getCurrentUser } from '../../controller/login_controller.js';
import { checkServerHealth, updateSystemStatusUI } from '../../util/server_health.js';

/**
 * Dynamically renders and mounts the complete Administrator Management Console
 * into the #admin-page container in index.html
 * 
 * @param {string} [queryPart] - Optional URL query parameters string (e.g. "tab=products")
 */
export function renderAdminPage(queryPart) {
  const container = document.getElementById('admin-page');
  if (!container) return;

  container.innerHTML = `
    <div class="flex h-screen overflow-hidden bg-[#f8fafc] text-[#0f172a] font-sans antialiased selection:bg-blue-600 selection:text-white relative">

      <!-- ============================================================ -->
      <!-- BACKDROP OVERLAY FOR EXPANDED SIDEBAR ON MOBILE/TABLET       -->
      <!-- ============================================================ -->
      <div
        id="admin-sidebar-backdrop"
        onclick="closeAdminSidebar()"
        class="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-xs z-40 hidden opacity-0 transition-opacity duration-300">
      </div>

      <!-- ============================================================ -->
      <!-- 1. RESPONSIVE SIDEBAR NAVIGATION (Worker Navigation)        -->
      <!-- ============================================================ -->
      <aside
        id="admin-sidebar"
        class="admin-sidebar w-16 lg:w-64 bg-white border-r border-[#e2e8f0] flex flex-col justify-between flex-shrink-0 z-30 shadow-sm transition-all duration-300 ease-in-out">

        <!-- Top Brand & Header -->
        <div class="p-3 lg:p-5 space-y-5">
          <!-- Brand Logo with ET Monogram & Close Button -->
          <div class="flex items-center justify-between w-full py-1">
            <a href="#home" onclick="closeAdminSidebar()" title="ETech Computers" class="flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 group flex-1 min-w-0">
              <!-- ET Monogram Logo Emblem -->
              <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-extrabold text-base tracking-tight flex-shrink-0 shadow-sm group-hover:border-blue-400 transition-all flex lg:hidden">
                <span class="text-blue-600">E</span><span class="text-[#0f172a]">T</span>
              </div>
              <!-- Expanded Brand Text -->
              <div class="sidebar-text-label hidden lg:flex flex-col min-w-0">
                <span class="text-base font-extrabold tracking-tight text-[#0f172a] truncate">
                  ETech<span class="text-blue-600">Computers</span>
                </span>
                <span class="text-[9px] tracking-[0.2em] uppercase text-[#64748b] font-semibold truncate">Worker Workspace</span>
              </div>
            </a>

            <!-- Mobile Close Button (Visible when sidebar is expanded on mobile/tablet) -->
            <button
              id="admin-sidebar-close-btn"
              onclick="closeAdminSidebar()"
              title="Close Sidebar"
              class="sidebar-close-btn hidden p-1.5 rounded-lg text-[#475569] hover:text-[#0f172a] bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition-all flex-shrink-0 focus:outline-none ml-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Navigation Links -->
          <nav class="space-y-1.5 pt-1">
            <button data-tab="overview" onclick="switchAdminTab('overview')" title="Overview"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-bold text-xs bg-blue-600 text-white shadow-sm transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Overview</span>
              <div class="sidebar-tooltip">Overview</div>
            </button>

            <button data-tab="products" onclick="switchAdminTab('products')" title="Product Catalog"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Product Catalog</span>
              <div class="sidebar-tooltip">Product Catalog</div>
            </button>

            <button data-tab="promotions" onclick="switchAdminTab('promotions')" title="Deals & Promotions"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Deals & Promotions</span>
              <div class="sidebar-tooltip">Deals & Promotions</div>
            </button>

            <button data-tab="orders" onclick="switchAdminTab('orders')" title="Orders Processing"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Orders Processing</span>
              <div class="sidebar-tooltip">Orders Processing</div>
            </button>

            <button data-tab="stock-health" onclick="switchAdminTab('stock-health')" title="Stock Health & Alerts"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Stock Health & Alerts</span>
              <div class="sidebar-tooltip">Stock Health & Alerts</div>
            </button>
            <button data-tab="taxonomy" onclick="switchAdminTab('taxonomy')" title="Categories & Badges"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Categories & Badges</span>
              <div class="sidebar-tooltip">Categories & Badges</div>
            </button>

            <button data-tab="brands" onclick="switchAdminTab('brands')" title="Hardware Brands"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Hardware Brands</span>
              <div class="sidebar-tooltip">Hardware Brands</div>
            </button>

            <button data-tab="newsletter" onclick="switchAdminTab('newsletter')" title="Newsletter & Email Marketing"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Newsletter & Email</span>
              <div class="sidebar-tooltip">Newsletter & Email Marketing</div>
            </button>

            <button data-tab="trash" onclick="switchAdminTab('trash')" title="Trash Bin & Data Recovery Vault"
              class="superadmin-only-nav sidebar-nav-btn w-full flex items-center justify-between px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-rose-700 hover:bg-rose-50 transition-all relative group">
              <div class="flex items-center space-x-0 lg:space-x-3">
                <svg class="w-5 h-5 flex-shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span class="sidebar-text-label hidden lg:inline whitespace-nowrap font-bold text-rose-700">Trash Bin</span>
              </div>
              <span id="admin-trash-badge" class="hidden lg:inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs">0</span>
              <div class="sidebar-tooltip">Trash Bin & Data Recovery</div>
            </button>
            <button data-tab="branches" onclick="switchAdminTab('branches')" title="Store Branches"
              class="admin-only-nav sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Store Branches</span>
              <div class="sidebar-tooltip">Store Branches</div>
            </button>

            <button data-tab="transfers" onclick="switchAdminTab('transfers')" title="Inter-Branch Stock Transfers & Logistics"
              class="sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Stock Transfers</span>
              <div class="sidebar-tooltip">Stock Transfers & Logistics</div>
            </button>

            <button data-tab="users" onclick="switchAdminTab('users')" title="User Directory"
              class="admin-only-nav sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">User Directory</span>
              <div class="sidebar-tooltip">User Directory</div>
            </button>

            <button data-tab="analytics" onclick="switchAdminTab('analytics')" title="Financial Reports"
              class="admin-only-nav sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Financial Reports</span>
              <div class="sidebar-tooltip">Financial Reports</div>
            </button>

            <button data-tab="policies" onclick="switchAdminTab('policies')" title="Store Profile & Legal Policies"
              class="admin-only-nav sidebar-nav-btn w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-2 lg:px-3.5 py-2.5 rounded-lg font-medium text-xs text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-all relative group">
              <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Store Profile & Policies</span>
              <div class="sidebar-tooltip">Store Profile & Policies</div>
            </button>
          </nav>
        </div>

        <!-- Bottom Quick Links & Store Switch -->
        <div class="p-2 lg:p-4 border-t border-[#e2e8f0] space-y-2">
          <a href="#home" onclick="closeAdminSidebar()" title="Return to Store Front"
            class="flex items-center justify-center lg:justify-start space-x-0 lg:space-x-2 text-xs font-semibold text-[#475569] hover:text-[#0f172a] px-2 lg:px-3 py-2.5 rounded-lg bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition-all relative group shadow-sm">
            <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Return to Store</span>
            <div class="sidebar-tooltip">Return to Store Front</div>
          </a>

          <button onclick="handleAdminLogout(); closeAdminSidebar();" title="Sign Out Session"
            class="w-full text-left flex items-center justify-center lg:justify-start space-x-0 lg:space-x-2 text-xs font-semibold text-rose-700 hover:text-rose-800 px-2 lg:px-3 py-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all relative group shadow-sm">
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="sidebar-text-label hidden lg:inline whitespace-nowrap">Sign Out Session</span>
            <div class="sidebar-tooltip">Sign Out Session</div>
          </button>
        </div>

      </aside>

      <!-- ============================================================ -->
      <!-- 2. MAIN WORKSPACE CONTAINER                                 -->
      <!-- ============================================================ -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#f8fafc]">

        <!-- Top Workspace Utility Bar -->
        <header class="h-16 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div class="flex items-center space-x-3">
            <!-- Sidebar Collapse / Expand Toggle Button -->
            <button id="admin-sidebar-toggle" onclick="toggleAdminSidebar()" title="Toggle Sidebar"
              class="p-2 rounded-lg text-[#475569] hover:text-[#0f172a] bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0] transition-all flex items-center justify-center focus:outline-none focus:border-blue-600 flex lg:hidden">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 id="admin-console-header-title" class="text-sm sm:text-base font-extrabold text-[#0f172a]">Management Console</h2>
              <p id="admin-console-header-subtitle" class="text-[10px] text-[#64748b]">ETech Operations & Branch Warehouse Control</p>
            </div>
          </div>

          <!-- Right Header Tools: Status, Profile -->
          <div class="flex items-center space-x-3 sm:space-x-4">
            <!-- System Status Pill -->
            <div id="admin-system-status-pill" class="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs">
              <span id="admin-system-status-dot" class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <div class="flex flex-col text-[10px] leading-tight">
                <span class="text-[#64748b] text-[8px] font-semibold uppercase">System Status</span>
                <span id="admin-system-status-text" class="text-emerald-700 font-extrabold font-mono tracking-wider">ONLINE</span>
              </div>
            </div>

            <!-- Active Worker Profile Badge -->
            <div class="flex items-center space-x-2.5">
              <div id="admin-user-avatar"
                class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-sm flex-shrink-0">
                S
              </div>
              <div class="hidden md:flex flex-col text-left">
                <span id="admin-user-name" class="text-xs font-bold text-[#0f172a] truncate max-w-[170px]">System Owner & Super Admin</span>
                <span id="admin-user-role"
                  class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 w-fit">SUPER ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        <!-- Main Dynamic Tab Content Scroll Area -->
        <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

          <!-- Tab Panel 1: Overview (Dynamic Admin or Staff Overview) -->
          <div id="tab-panel-overview" class="dashboard-tab-panel">
            <div id="overview-dynamic-root" class="space-y-6">
              <!-- Dynamically populated by renderOverviewTab() -->
            </div>
          </div>

          <!-- Tab Panel 2: Products -->
          <div id="tab-panel-products" class="dashboard-tab-panel hidden">
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
              
              <!-- Staff Info Banner -->
              <div id="products-staff-banner"
                class="hidden p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <span class="text-blue-600 font-bold">📍</span>
                  <span id="products-staff-banner-text">Logged in as Staff.</span>
                </div>
                <span id="products-staff-branch-badge"
                  class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold uppercase">Hub</span>
              </div>

              <!-- Top Action Bar -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-[#0f172a]">Product Inventory Catalog</h3>
                  <p class="text-xs text-[#64748b] mt-0.5">Manage products and branch stock quantities across Colombo, Galle, Matara, and Kandy hubs.</p>
                </div>

                <div class="flex items-center space-x-2.5 w-full sm:w-auto">
                  <input type="text" id="product-search-input" onkeyup="filterProductsTable()"
                    placeholder="Search SKU or Product..."
                    class="px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-xs placeholder-[#94a3b8] focus:border-blue-600 w-full sm:w-60">
                  <button onclick="openProductFormPage()"
                    class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center space-x-1.5 flex-shrink-0">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              <!-- Products Table -->
              <div class="overflow-x-auto rounded-md border border-[#e2e8f0]">
                <table class="w-full text-left text-xs text-[#475569]">
                  <thead
                    class="bg-[#f8fafc] uppercase font-bold text-[10px] tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                    <tr>
                      <th class="py-3 px-3.5">Item</th>
                      <th class="py-3 px-3.5">Category</th>
                      <th class="py-3 px-3.5">Price</th>
                      <th class="py-3 px-3.5">Branch Stock Breakdown</th>
                      <th class="py-3 px-3.5">Total Stock</th>
                      <th class="py-3 px-3.5">Status</th>
                      <th class="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="products-tbody" class="divide-y divide-[#e2e8f0]">
                    <!-- Dynamic rows -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab Panel 3: Orders -->
          <div id="tab-panel-orders" class="dashboard-tab-panel hidden">
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
              <div>
                <h3 class="text-lg font-bold text-[#0f172a]">Customer Order Fulfillment</h3>
                <p class="text-xs text-[#64748b] mt-0.5">Process customer purchases, review delivery branch distances, and update shipping progress.</p>
              </div>

              <div class="overflow-x-auto rounded-md border border-[#e2e8f0]">
                <table class="w-full text-left text-xs text-[#475569]">
                  <thead
                    class="bg-[#f8fafc] uppercase font-bold text-[10px] tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                    <tr>
                      <th class="py-3 px-3.5">Order ID & Date</th>
                      <th class="py-3 px-3.5">Customer</th>
                      <th class="py-3 px-3.5">Dispatch Branch & Distance</th>
                      <th class="py-3 px-3.5">Total Amount</th>
                      <th class="py-3 px-3.5">Status</th>
                      <th class="py-3 px-3.5 text-right">Update Action</th>
                    </tr>
                  </thead>
                  <tbody id="orders-tbody" class="divide-y divide-[#e2e8f0]">
                    <!-- Dynamic rows -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab Panel: Stock Health & Alert Center -->
          <div id="tab-panel-stock-health" class="dashboard-tab-panel hidden"></div>

          <!-- Tab Panel: Categories & Badges Taxonomy Management -->
          <div id="tab-panel-taxonomy" class="dashboard-tab-panel hidden"></div>

          <!-- Tab Panel 4: Branches -->
          <div id="tab-panel-branches" class="dashboard-tab-panel hidden">
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-[#0f172a]">Store Branch Management</h3>
                  <p class="text-xs text-[#64748b] mt-0.5">Manage regional warehouses, base shipping rates, and distance parameters.</p>
                </div>
                <button onclick="openBranchModal()"
                  class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New Branch</span>
                </button>
              </div>

              <div id="branches-list-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Dynamic cards -->
              </div>
            </div>
          </div>

          <!-- Tab Panel 5: Users -->
          <div id="tab-panel-users" class="dashboard-tab-panel hidden">
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
              <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 class="text-lg font-bold text-[#0f172a]">System User Directory & Roles</h3>
                  <p class="text-xs text-[#64748b] mt-0.5">Manage system access, roles, and branch staff assignments.</p>
                </div>
                <button onclick="openUserModal()"
                  class="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md shadow-sm transition-all flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Create User Account</span>
                </button>
              </div>

              <div class="overflow-x-auto rounded-md border border-[#e2e8f0]">
                <table class="w-full text-left text-xs text-[#475569]">
                  <thead
                    class="bg-[#f8fafc] uppercase font-bold text-[10px] tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
                    <tr>
                      <th class="py-3 px-3.5">User & Username</th>
                      <th class="py-3 px-3.5">Email</th>
                      <th class="py-3 px-3.5">Current Role</th>
                      <th class="py-3 px-3.5">Assigned Branch</th>
                      <th class="py-3 px-3.5">Joined Date</th>
                      <th class="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="users-tbody" class="divide-y divide-[#e2e8f0]">
                    <!-- Dynamic rows -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Tab Panel 6: Analytics -->
          <div id="tab-panel-analytics" class="dashboard-tab-panel hidden">
            <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-5">
              <div>
                <h3 class="text-lg font-bold text-[#0f172a]">Regional Sales & Performance Analytics</h3>
                <p class="text-xs text-[#64748b] mt-0.5">Comprehensive revenue metrics and branch sales comparison.</p>
              </div>

              <!-- Branch Sales Performance Meters -->
              <div class="space-y-3 pt-2">
                <h4 class="text-xs font-bold text-[#64748b] uppercase tracking-wider">Branch Sales Breakdown</h4>
                <div id="analytics-branches-list" class="space-y-3">
                  <!-- Dynamic meters -->
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Panel: Store Profile & Legal Policies Management -->
          <div id="tab-panel-policies" class="dashboard-tab-panel hidden">
            <!-- Dynamic content rendered by policy_management_controller.js -->
          </div>

          <!-- Tab Panel 7: Product Form (Add / Edit Full Page View) -->
          <div id="tab-panel-product-form" class="dashboard-tab-panel hidden">
            <div class="space-y-5 max-w-7xl mx-auto pb-12">
              
              <!-- Top Action Navigation Header -->
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm">
                <div class="flex items-center space-x-3.5">
                  <button onclick="switchAdminTab('products')"
                    class="p-2 rounded-md bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] transition-colors border border-[#e2e8f0] flex items-center space-x-1.5 text-xs font-bold shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Back to Catalog</span>
                  </button>
                  <div>
                    <h2 class="text-lg font-extrabold text-[#0f172a]" id="product-form-title">Add New Hardware Product</h2>
                    <p class="text-xs text-[#64748b] mt-0.5" id="product-form-subtitle">Fill in specifications, multi-image gallery (max 5), pricing, and branch stock.</p>
                  </div>
                </div>

                <div class="flex items-center space-x-2.5">
                  <button type="button" onclick="switchAdminTab('products')"
                    class="px-4 py-2 rounded-md bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs border border-[#e2e8f0]">Cancel</button>
                  <button type="button" onclick="triggerProductFormSubmit()"
                    class="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-sm flex items-center space-x-1.5">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span id="form-submit-btn-text">Publish Product</span>
                  </button>
                </div>
              </div>

              <div id="form-staff-banner"
                class="hidden p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex items-center space-x-2.5 shadow-sm">
                <span class="text-blue-600 font-bold">ℹ️</span>
                <span id="form-staff-banner-text">Staff Scope Active</span>
              </div>

              <!-- Main 2-Column Layout Grid -->
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Left 8 Columns: Main Edit Form -->
                <div class="lg:col-span-8 space-y-5">
                  <form id="full-product-form" class="space-y-5">
                    
                    <!-- Section 1: Basic Information -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <h3
                        class="text-xs font-bold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span>1. Basic Product Information</span>
                      </h3>

                      <div class="space-y-3.5 text-xs">
                        <div>
                          <label class="block text-[#475569] font-bold mb-1">Product Title *</label>
                          <input type="text" id="form-p-name" required oninput="updateLivePreview()"
                            placeholder="e.g. Zenith Studio Ultra Laptop 16"
                            class="w-full px-3.5 py-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-sm font-medium">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div>
                            <label class="block text-[#475569] font-bold mb-1">Category *</label>
                            <select id="form-p-category" required onchange="updateLivePreview()"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs">
                              <option value="laptops">Laptops & Notebooks</option>
                              <option value="peripherals">Gaming Peripherals</option>
                              <option value="monitors">Displays & Monitors</option>
                              <option value="components">PC Components (GPUs/RAM)</option>
                              <option value="accessories">Accessories & Tech</option>
                            </select>
                          </div>

                          <div>
                            <label class="block text-[#475569] font-bold mb-1">Manufacturer Brand *</label>
                            <select id="form-p-brand" required onchange="updateLivePreview()"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs font-bold">
                              <!-- Dynamically populated from getBrands() -->
                            </select>
                          </div>

                          <div>
                            <label class="block text-[#475569] font-bold mb-1">Badge Tag</label>
                            <select id="form-p-badge" onchange="updateLivePreview()"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs">
                              <option value="New Arrival">New Arrival</option>
                              <option value="Bestseller">Bestseller</option>
                              <option value="Top Rated">Top Rated</option>
                              <option value="Popular">Popular</option>
                              <option value="">None</option>
                            </select>
                          </div>

                          <div>
                            <label class="block text-[#475569] font-bold mb-1">Status *</label>
                            <select id="form-p-status" onchange="updateLivePreview()"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs font-bold">
                              <option value="ACTIVE">ACTIVE (Catalog)</option>
                              <option value="INACTIVE">INACTIVE (Hidden)</option>
                            </select>
                          </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label class="block text-[#475569] font-bold mb-1">SKU Code</label>
                            <input type="text" id="form-p-sku" oninput="updateLivePreview()" placeholder="ETC-LAP-4090"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-mono text-xs">
                          </div>
                          <div>
                            <label class="block text-[#475569] font-bold mb-1">Warranty Period</label>
                            <input type="text" id="form-p-warranty" oninput="updateLivePreview()"
                              placeholder="2-Year Official Warranty"
                              class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 text-xs">
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Section 2: Pricing & Discount -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <h3
                        class="text-xs font-bold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>2. Pricing & Discounts</span>
                      </h3>

                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label class="block text-[#475569] font-bold mb-1">Selling Price (Rs.) *</label>
                          <input type="number" step="0.01" id="form-p-price" required oninput="updateLivePreview()"
                            placeholder="2499.00"
                            class="w-full px-3.5 py-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-bold text-sm focus:border-blue-600 font-mono">
                        </div>
                        <div>
                          <label class="block text-[#475569] font-bold mb-1">Original List Price (Rs.)</label>
                          <input type="number" step="0.01" id="form-p-original-price" oninput="updateLivePreview()"
                            placeholder="2799.00"
                            class="w-full px-3.5 py-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#94a3b8] font-semibold text-sm focus:border-blue-600 font-mono">
                        </div>
                      </div>
                    </div>

                    <!-- Section 3: Multi-Image Gallery Manager -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
                        <h3 class="text-xs font-bold text-[#475569] uppercase tracking-wider flex items-center space-x-2">
                          <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                          <span>3. Multi-Image Gallery Manager (Max 5 Images)</span>
                        </h3>
                        <span id="gallery-count-badge"
                          class="px-2 py-0.5 rounded bg-[#f8fafc] text-blue-600 text-[10px] font-mono font-bold border border-[#e2e8f0]">0 / 5 Images</span>
                      </div>
                      <p class="text-xs text-[#64748b]">Add up to 5 image web URLs. The first image serves as the primary card cover thumbnail.</p>
                      <div id="image-inputs-container" class="space-y-2.5">
                        <!-- Dynamic rows -->
                      </div>
                      <div class="pt-1 flex items-center justify-between">
                        <button type="button" id="add-img-btn" onclick="addGalleryImageInput()"
                          class="px-3.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors flex items-center space-x-1">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                          <span>+ Add Image URL</span>
                        </button>
                        <span class="text-[10px] text-[#64748b]">Supports web image links & assets.</span>
                      </div>
                    </div>

                    <!-- Section 4: Descriptions -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <h3
                        class="text-xs font-bold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        <span>4. Product Descriptions & Overview</span>
                      </h3>
                      <div class="space-y-3.5 text-xs">
                        <div>
                          <label class="block text-[#475569] font-bold mb-1">Short Description Snippet</label>
                          <input type="text" id="form-p-description" oninput="updateLivePreview()"
                            placeholder="Lightweight CNC aluminum chassis with Liquid Retina XDR display..."
                            class="w-full px-3.5 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
                        </div>
                        <div>
                          <label class="block text-[#475569] font-bold mb-1">Full Detailed Overview Paragraph</label>
                          <textarea id="form-p-full-description" rows="3" oninput="updateLivePreview()"
                            placeholder="Full comprehensive summary paragraph shown on the Product Specification page..."
                            class="w-full px-3.5 py-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600"></textarea>
                        </div>
                      </div>
                    </div>

                    <!-- Section 5: Tech Specs & Features -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <h3
                        class="text-xs font-bold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span>5. Specifications & Highlights</span>
                      </h3>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                        <div class="space-y-2.5">
                          <div class="flex items-center justify-between">
                            <label class="block text-[#475569] font-bold">Technical Specs (Key-Value)</label>
                            <button type="button" onclick="addFormSpecInput()"
                              class="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 transition-colors flex items-center space-x-1">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>+ Add Spec</span>
                            </button>
                          </div>
                          <div id="specs-inputs-container" class="space-y-2"></div>
                        </div>
                        <div class="space-y-2.5">
                          <div class="flex items-center justify-between">
                            <label class="block text-[#475569] font-bold">Highlight Features (Bullets)</label>
                            <button type="button" onclick="addFormFeatureInput()"
                              class="px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 transition-colors flex items-center space-x-1">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                              </svg>
                              <span>+ Add Feature</span>
                            </button>
                          </div>
                          <div id="features-inputs-container" class="space-y-2"></div>
                        </div>
                      </div>
                    </div>

                    <!-- Section 6: Branch Stock Allocations -->
                    <div class="bg-white border border-[#e2e8f0] rounded-lg p-5 shadow-sm space-y-4">
                      <h3
                        class="text-xs font-bold text-[#475569] uppercase tracking-wider border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>6. Branch Warehouse Inventory Allocation</span>
                      </h3>
                      <div id="form-branch-stocks-container" class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <!-- Dynamic branch stocks -->
                      </div>
                    </div>

                    <!-- Bottom Action Footer -->
                    <div class="flex items-center justify-end space-x-3 pt-3">
                      <button type="button" onclick="switchAdminTab('products')"
                        class="px-5 py-2.5 rounded-md bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs border border-[#e2e8f0]">Cancel</button>
                      <button type="submit" id="form-submit-btn-secondary"
                        class="px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm">
                        Publish Product
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Right 4 Columns: Live Product Card Preview -->
                <div class="lg:col-span-4">
                  <div class="sticky top-6 bg-white border border-[#e2e8f0] rounded-lg p-4 shadow-sm space-y-3">
                    <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
                      <span class="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center space-x-1.5">
                        <span>👁️</span>
                        <span>Live Catalog Preview</span>
                      </span>
                      <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] font-mono font-bold border border-blue-200">REAL-TIME</span>
                    </div>
                    <div id="live-product-preview-card"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Panel: Deals & Promotions -->
          <div id="tab-panel-promotions" class="dashboard-tab-panel hidden space-y-6">
            <div id="promotions-tab-container"></div>
          </div>

          <!-- Tab Panel: Deal Bundle Slide Editor (Dedicated Full Page Workspace) -->
          <div id="tab-panel-bundle-form" class="dashboard-tab-panel hidden">
            <div id="bundle-form-page-container"></div>
          </div>

          <!-- Tab Panel: Inter-Branch Stock Transfers & Logistics Control -->
          <div id="tab-panel-transfers" class="dashboard-tab-panel hidden">
          </div>

          <!-- Tab Panel: Hardware Brands Management -->
          <div id="tab-panel-brands" class="dashboard-tab-panel hidden">
          </div>

          <!-- Tab Panel: Brand Editor View (Dedicated Full Page Workspace - No Overlay) -->
          <div id="tab-panel-brand-form" class="dashboard-tab-panel hidden">
          </div>

          <!-- Tab Panel: SuperAdmin Trash Bin & Data Recovery Vault -->
          <div id="tab-panel-trash" class="dashboard-tab-panel hidden">
          </div>

          <!-- Tab Panel: Newsletter & Email Marketing Management -->
          <div id="tab-panel-newsletter" class="dashboard-tab-panel hidden">
          </div>

        </main>

        <!-- Console Footer -->
        <footer
          class="h-10 border-t border-[#e2e8f0] px-4 sm:px-6 flex items-center justify-between text-xs text-[#64748b] flex-shrink-0 bg-white shadow-sm">
          <span class="text-[11px] font-medium">&copy; 2026 ETech Computers Management Console v3.5</span>
          <div class="flex items-center space-x-4">
            <span id="admin-footer-last-updated" class="text-[11px] font-mono">Last Updated: Aug 26, 2026 02:44 PM</span>
            <span id="admin-footer-status" class="font-mono text-[10px] hidden sm:inline">System Status: <strong class="text-emerald-600 font-bold">ONLINE</strong></span>
          </div>
        </footer>

      </div>

      <!-- Dynamic Modal Container -->
      <div id="admin-modal-container"></div>

    </div>
  `;

  initAdminPage(queryPart);
}

/**
 * Initializes security guard and triggers active tab rendering
 * 
 * @param {string} [queryPart]
 */
export function initAdminPage(queryPart) {
  let requestedTab = 'overview';
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const tabParam = params.get('tab');
    if (tabParam) requestedTab = tabParam;
  }

  // Ping test API to verify server online status & update UI
  checkServerHealth(true);

  // Security Role Guard: Handled by initAdminDashboard
  initAdminDashboard();
  if (requestedTab && requestedTab !== 'overview') {
    switchAdminTab(requestedTab);
  }
}
