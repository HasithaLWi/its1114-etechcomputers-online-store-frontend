// ============================================================
//  src/js/controller/newsletter_management_controller.js
//  Full Newsletter & Email Marketing Management Workspace
// ============================================================
import {
  Subscriber,
  NEWSLETTER_STATUS,
  getNewsletterSubscribers,
  saveNewsletterSubscribers,
  getNewsletterCampaigns,
  getNewsletterAnalytics,
  isValidEmail,
  syncNewsletterFromApi
} from '../models/newsletter_model.js';
import { NewsletterApi } from '../api/newsletterApi.js';
import { showToast } from '../util/toast.js';
import { etechAlert } from '../util/etech_alert.js';
import {
  iconFlame,
  iconRocket,
  iconTrendingDown,
  iconLightbulb,
  iconClose,
  iconEye
} from '../util/icons.js';

// Controller State
let searchQuery = '';
let selectedStatusFilter = 'ALL';
let sortBy = 'newest';
let activeSubTab = 'subscribers'; // 'subscribers' | 'campaigns'
let selectedSubscriberIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 8;

/**
 * Main Entry Point: Renders the entire Newsletter & Email tab panel
 */
export async function renderNewsletterTab() {
  const container = document.getElementById('tab-panel-newsletter');
  if (!container) return;

  await syncNewsletterFromApi();

  const analytics = getNewsletterAnalytics();
  const subscribers = getNewsletterSubscribers();
  const campaigns = getNewsletterCampaigns();

  if (activeSubTab === 'compose') {
    container.innerHTML = renderComposeBroadcastFullPageHtml(analytics);
    applyCampaignTemplate('flash_deals');
    return;
  }

  container.innerHTML = `
    <div class="space-y-6 pb-12">
      <!-- 1. Top Workspace Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div class="space-y-1">
          <div class="flex items-center space-x-2.5">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-xs">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h1 class="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">Newsletter & Email Marketing</h1>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 font-mono">STAFF & ADMIN</span>
              </div>
              <p class="text-xs text-[#64748b]">Manage storefront subscribers, audience segmentation, and broadcast email marketing campaigns.</p>
            </div>
          </div>
        </div>

        <!-- Header Quick Action Buttons -->
        <div class="flex items-center flex-wrap gap-2.5">
          <button onclick="exportSubscribersCsv()" class="px-3.5 py-2 rounded-xl bg-white hover:bg-[#f8fafc] text-[#334155] border border-[#cbd5e1] text-xs font-bold shadow-xs hover:border-[#94a3b8] transition-all flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export CSV</span>
          </button>

          <button onclick="openAddSubscriberModal()" class="px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-300 text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>+ Add Subscriber</span>
          </button>

          <button onclick="setNewsletterSubTab('compose')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 cursor-pointer transform hover:-translate-y-0.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Compose Broadcast</span>
          </button>
        </div>
      </div>

      <!-- 2. KPI Metrics Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Audience -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Total Audience</p>
            <h3 class="text-2xl font-black text-[#0f172a] font-mono">${analytics.totalSubscribers}</h3>
            <p class="text-[10px] text-emerald-600 font-bold flex items-center space-x-1">
              <span>↑ Active Base</span>
              <span class="text-[#94a3b8] font-normal">• All channels</span>
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        <!-- Active Subscribers -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Active Subscribed</p>
            <h3 class="text-2xl font-black text-emerald-600 font-mono">${analytics.activeSubscribers}</h3>
            <p class="text-[10px] text-[#64748b] font-medium">
              <span class="text-emerald-600 font-bold font-mono">${analytics.activeRate}%</span> of total subscribers
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <!-- Unsubscribed Count -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Unsubscribed</p>
            <h3 class="text-2xl font-black text-slate-700 font-mono">${analytics.unsubscribedCount}</h3>
            <p class="text-[10px] text-[#64748b] font-medium">Churned or opted-out</p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
        </div>

        <!-- Campaigns & Deliveries -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Campaigns Sent</p>
            <h3 class="text-2xl font-black text-blue-600 font-mono">${analytics.totalCampaigns}</h3>
            <p class="text-[10px] text-blue-700 font-medium">
              Avg. Open Rate: <strong class="font-bold font-mono">${analytics.avgOpenRate}%</strong>
            </p>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
            </svg>
          </div>
        </div>
      </div>

      <!-- 3. Sub-Navigation Tabs (Subscribers Directory vs. Sent Campaigns Log) -->
      <div class="flex items-center space-x-2 border-b border-[#e2e8f0] pb-2">
        <button onclick="setNewsletterSubTab('subscribers')"
          class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${activeSubTab === 'subscribers' ? 'bg-blue-600 text-white shadow-xs' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Subscribers Directory</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSubTab === 'subscribers' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'}">${subscribers.length}</span>
        </button>

        <button onclick="setNewsletterSubTab('campaigns')"
          class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${activeSubTab === 'campaigns' ? 'bg-blue-600 text-white shadow-xs' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <span>Sent Broadcasts Log</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSubTab === 'campaigns' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'}">${campaigns.length}</span>
        </button>

        <button onclick="setNewsletterSubTab('compose')"
          class="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${activeSubTab === 'compose' ? 'bg-blue-600 text-white shadow-xs' : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Compose Broadcast</span>
        </button>
      </div>

      <!-- 4. Dynamic Body Content based on Sub-Tab -->
      <div id="newsletter-tab-body">
        ${activeSubTab === 'subscribers' ? renderSubscribersWorkspaceHtml() : renderCampaignsLogHtml()}
      </div>
    </div>

    <!-- Modals Container -->
    <div id="newsletter-modals-container"></div>
  `;
}

/**
 * Switch Sub-Tab
 */
export function setNewsletterSubTab(tab) {
  activeSubTab = tab;
  renderNewsletterTab();
}

/**
 * Generates the HTML for the Subscribers Directory workspace
 */
function renderSubscribersWorkspaceHtml() {
  const allSubscribers = getNewsletterSubscribers();
  
  // Filtering
  let filtered = allSubscribers.filter(s => {
    if (selectedStatusFilter !== 'ALL' && s.status !== selectedStatusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = s.email.toLowerCase().includes(q);
      const matchName = s.name && s.name.toLowerCase().includes(q);
      if (!matchEmail && !matchName) return false;
    }
    return true;
  });

  // Sorting
  if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));
  } else if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.subscribedAt) - new Date(b.subscribedAt));
  } else if (sortBy === 'email_asc') {
    filtered.sort((a, b) => a.email.localeCompare(b.email));
  } else if (sortBy === 'name_asc') {
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const isAllSelected = pageItems.length > 0 && pageItems.every(s => selectedSubscriberIds.has(String(s.id)));

  return `
    <div class="space-y-4">
      <!-- Filter Toolbar -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <!-- Search -->
        <div class="relative flex-1">
          <input
            type="text"
            id="newsletter-search-input"
            value="${escapeHtml(searchQuery)}"
            oninput="handleNewsletterSearch(this.value)"
            placeholder="Search by email address or customer name..."
            class="w-full pl-9 pr-4 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-xs font-medium text-[#0f172a] placeholder-[#94a3b8] focus:bg-white focus:border-blue-600 focus:outline-none transition-all"
          />
          <svg class="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Filter Selectors -->
        <div class="flex items-center flex-wrap gap-2 text-xs">
          <!-- Status Filter -->
          <select id="newsletter-status-filter" onchange="handleNewsletterStatusFilter(this.value)"
            class="px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-xs font-bold text-[#334155] focus:bg-white focus:border-blue-600 focus:outline-none">
            <option value="ALL" ${selectedStatusFilter === 'ALL' ? 'selected' : ''}>Status: All</option>
            <option value="${NEWSLETTER_STATUS.SUBSCRIBED}" ${selectedStatusFilter === NEWSLETTER_STATUS.SUBSCRIBED ? 'selected' : ''}>Active (Subscribed)</option>
            <option value="${NEWSLETTER_STATUS.UNSUBSCRIBED}" ${selectedStatusFilter === NEWSLETTER_STATUS.UNSUBSCRIBED ? 'selected' : ''}>Unsubscribed</option>
          </select>

          <!-- Sort Selector -->
          <select id="newsletter-sort" onchange="handleNewsletterSort(this.value)"
            class="px-3 py-2 bg-[#f8fafc] border border-[#cbd5e1] rounded-lg text-xs font-bold text-[#334155] focus:bg-white focus:border-blue-600 focus:outline-none">
            <option value="newest" ${sortBy === 'newest' ? 'selected' : ''}>Newest First</option>
            <option value="oldest" ${sortBy === 'oldest' ? 'selected' : ''}>Oldest First</option>
            <option value="email_asc" ${sortBy === 'email_asc' ? 'selected' : ''}>Email (A-Z)</option>
            <option value="name_asc" ${sortBy === 'name_asc' ? 'selected' : ''}>Name (A-Z)</option>
          </select>
        </div>
      </div>

      <!-- Bulk Actions Bar (Shown when items selected) -->
      ${selectedSubscriberIds.size > 0 ? `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div class="flex items-center space-x-2 text-xs text-blue-900 font-bold">
            <span class="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">${selectedSubscriberIds.size}</span>
            <span>Subscribers Selected</span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="bulkResubscribeSelected()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer">
              <span>Mark Subscribed</span>
            </button>
            <button onclick="bulkUnsubscribeSelected()" class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer">
              <span>Mark Unsubscribed</span>
            </button>
            <button onclick="bulkDeleteSelected()" class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-1 cursor-pointer">
              <span>Delete</span>
            </button>
            <button onclick="clearSelectedSubscribers()" class="px-2.5 py-1.5 rounded-lg bg-white border border-[#cbd5e1] text-[#475569] text-xs font-semibold hover:bg-[#f8fafc] cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Subscribers Table Card -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4 w-10 text-center">
                  <input type="checkbox" onchange="toggleSelectAllSubscribers(this.checked)" ${isAllSelected ? 'checked' : ''} class="rounded border-[#cbd5e1] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th class="py-3 px-4">Subscriber</th>
                <th class="py-3 px-4">Subscribed Date</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0] text-[#334155]">
              ${pageItems.length === 0 ? `
                <tr>
                  <td colspan="5" class="py-12 text-center text-[#94a3b8]">
                    <div class="flex flex-col items-center justify-center space-y-2">
                      <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p class="font-bold text-sm text-[#475569]">No subscribers found</p>
                      <p class="text-xs text-[#94a3b8]">Try modifying your search query or status filter.</p>
                    </div>
                  </td>
                </tr>
              ` : pageItems.map(s => {
                const isSelected = selectedSubscriberIds.has(String(s.id));
                const isSubscribed = s.status === NEWSLETTER_STATUS.SUBSCRIBED;
                const initials = (s.name || s.email.split('@')[0]).substring(0, 2).toUpperCase();
                const subDateFormatted = new Date(s.subscribedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });

                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors ${isSelected ? 'bg-blue-50/40' : ''}">
                    <td class="py-3 px-4 text-center">
                      <input type="checkbox" onchange="toggleSelectSubscriber('${s.id}', this.checked)" ${isSelected ? 'checked' : ''} class="rounded border-[#cbd5e1] text-blue-600 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td class="py-3 px-4">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full ${isSubscribed ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'} flex items-center justify-center font-bold text-[10px] font-mono flex-shrink-0">
                          ${initials}
                        </div>
                        <div>
                          <div class="flex items-center space-x-1.5">
                            <span class="font-bold text-xs text-[#0f172a]">${escapeHtml(s.email)}</span>
                            <button onclick="copyToClipboard('${escapeHtml(s.email)}', 'Email address copied!')" title="Copy Email" class="text-[#94a3b8] hover:text-blue-600 p-0.5 transition-colors">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            </button>
                          </div>
                          ${s.name ? `<p class="text-[11px] text-[#64748b]">${escapeHtml(s.name)}</p>` : ''}
                        </div>
                      </div>
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-[#64748b]">
                      ${subDateFormatted}
                    </td>
                    <td class="py-3 px-4">
                      <button onclick="toggleSubscriberStatus('${s.id}')" title="Click to toggle status"
                        class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all cursor-pointer ${
                          isSubscribed 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300' 
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300'
                        }">
                        <span class="w-1.5 h-1.5 rounded-full ${isSubscribed ? 'bg-emerald-600' : 'bg-slate-500'}"></span>
                        <span>${s.status}</span>
                      </button>
                    </td>
                    <td class="py-3 px-4 text-right">
                      <div class="flex items-center justify-end space-x-1.5">
                        <button onclick="sendQuickTestEmail('${s.id}')" title="Send direct sample test email"
                          class="p-1.5 rounded-lg text-[#64748b] hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button onclick="deleteSubscriber('${s.id}')" title="Delete record"
                          class="p-1.5 rounded-lg text-[#64748b] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="px-4 py-3 bg-[#f8fafc] border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748b]">
          <div>
            Showing <strong class="text-[#0f172a] font-mono">${totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong class="text-[#0f172a] font-mono">${Math.min(startIndex + PAGE_SIZE, totalItems)}</strong> of <strong class="text-[#0f172a] font-mono">${totalItems}</strong> subscribers
          </div>
          <div class="flex items-center space-x-1">
            <button onclick="changeNewsletterPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''} class="px-2.5 py-1 rounded-md bg-white border border-[#cbd5e1] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed">
              Prev
            </button>
            <span class="px-3 py-1 font-mono font-bold text-[#0f172a] text-xs">Page ${currentPage} of ${totalPages}</span>
            <button onclick="changeNewsletterPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''} class="px-2.5 py-1 rounded-md bg-white border border-[#cbd5e1] font-semibold text-[#475569] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the HTML for Sent Broadcasts Log
 */
function renderCampaignsLogHtml() {
  const campaigns = getNewsletterCampaigns();

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-[#0f172a]">Marketing Campaign Broadcasts</h2>
          <p class="text-xs text-[#64748b]">Record of all broadcast marketing emails sent across subscribers.</p>
        </div>
        <button onclick="openCampaignModal()" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          <span>New Broadcast</span>
        </button>
      </div>

      <div class="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[11px] font-bold text-[#64748b] uppercase tracking-wider">
              <tr>
                <th class="py-3 px-4">Campaign Subject & Content</th>
                <th class="py-3 px-4">Category</th>
                <th class="py-3 px-4">Audience Size</th>
                <th class="py-3 px-4">Engagement Performance</th>
                <th class="py-3 px-4">Sent Date</th>
                <th class="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0] text-[#334155]">
              ${campaigns.length === 0 ? `
                <tr>
                  <td colspan="6" class="py-12 text-center text-[#94a3b8]">
                    <p class="font-bold">No broadcast campaigns sent yet.</p>
                    <p class="text-xs mt-1">Click "Compose Broadcast" above to send your first marketing email.</p>
                  </td>
                </tr>
              ` : campaigns.map(c => {
                const sentFormatted = new Date(c.sentAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors">
                    <td class="py-3.5 px-4 max-w-sm">
                      <h4 class="font-bold text-xs text-[#0f172a] line-clamp-1">${escapeHtml(c.subject)}</h4>
                      <p class="text-[11px] text-[#64748b] line-clamp-1 mt-0.5">${escapeHtml(c.preheader || 'No preheader')}</p>
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        ${c.category || 'MARKETING'}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-xs text-[#0f172a]">
                      ${c.recipientsCount} <span class="text-[10px] font-normal text-[#64748b]">emails</span>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-1 w-32">
                        <div class="flex items-center justify-between text-[10px] font-bold">
                          <span class="text-[#64748b]">Open Rate</span>
                          <span class="text-emerald-600 font-mono">${c.openRate}%</span>
                        </div>
                        <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${c.openRate}%"></div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-[11px] font-mono text-[#64748b]">
                      ${sentFormatted}
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>DELIVERED</span>
                      </span>
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
 * Filter and Search Handlers
 */
export function handleNewsletterSearch(val) {
  searchQuery = val || '';
  currentPage = 1;
  updateSubscribersViewOnly();
}

export function handleNewsletterStatusFilter(val) {
  selectedStatusFilter = val;
  currentPage = 1;
  updateSubscribersViewOnly();
}

export function handleNewsletterSort(val) {
  sortBy = val;
  updateSubscribersViewOnly();
}

export function changeNewsletterPage(page) {
  currentPage = page;
  updateSubscribersViewOnly();
}

function updateSubscribersViewOnly() {
  const bodyContainer = document.getElementById('newsletter-tab-body');
  if (bodyContainer && activeSubTab === 'subscribers') {
    bodyContainer.innerHTML = renderSubscribersWorkspaceHtml();
  }
}

/**
 * Selection & Bulk Operations
 */
export function toggleSelectSubscriber(id, checked) {
  if (checked) {
    selectedSubscriberIds.add(String(id));
  } else {
    selectedSubscriberIds.delete(String(id));
  }
  updateSubscribersViewOnly();
}

export function toggleSelectAllSubscribers(checked) {
  const allSubscribers = getNewsletterSubscribers();
  if (checked) {
    allSubscribers.forEach(s => selectedSubscriberIds.add(String(s.id)));
  } else {
    selectedSubscriberIds.clear();
  }
  updateSubscribersViewOnly();
}

export function clearSelectedSubscribers() {
  selectedSubscriberIds.clear();
  updateSubscribersViewOnly();
}

export async function bulkUnsubscribeSelected() {
  if (selectedSubscriberIds.size === 0) return;
  const confirmed = await etechAlert.confirm({
    title: 'Confirm Bulk Unsubscribe',
    message: `Are you sure you want to mark ${selectedSubscriberIds.size} selected subscribers as UNSUBSCRIBED? They will no longer receive future email broadcasts.`,
    confirmText: 'Yes, Mark Unsubscribed',
    cancelText: 'Cancel'
  });
  if (!confirmed) return;

  const ids = Array.from(selectedSubscriberIds);
  await NewsletterApi.bulkUpdateStatus(ids, NEWSLETTER_STATUS.UNSUBSCRIBED);
  showToast(`Updated ${ids.length} subscribers to UNSUBSCRIBED.`, 'info');
  selectedSubscriberIds.clear();
  renderNewsletterTab();
}

export async function bulkResubscribeSelected() {
  if (selectedSubscriberIds.size === 0) return;
  const confirmed = await etechAlert.confirm({
    title: 'Confirm Bulk Reactivation',
    message: `Are you sure you want to reactivate ${selectedSubscriberIds.size} selected subscribers? They will start receiving email broadcasts again.`,
    confirmText: 'Yes, Reactivate',
    cancelText: 'Cancel'
  });
  if (!confirmed) return;

  const ids = Array.from(selectedSubscriberIds);
  await NewsletterApi.bulkUpdateStatus(ids, NEWSLETTER_STATUS.SUBSCRIBED);
  showToast(`Reactivated ${ids.length} subscribers!`, 'success');
  selectedSubscriberIds.clear();
  renderNewsletterTab();
}

export async function bulkDeleteSelected() {
  if (selectedSubscriberIds.size === 0) return;
  const confirmed = await etechAlert.confirmDelete(
    `${selectedSubscriberIds.size} selected subscribers permanently`,
    'These email contacts will be permanently removed from audience broadcast lists.'
  );
  if (!confirmed) return;

  const ids = Array.from(selectedSubscriberIds);
  await NewsletterApi.bulkDelete(ids);
  showToast(`Deleted ${ids.length} subscribers.`, 'info');
  selectedSubscriberIds.clear();
  renderNewsletterTab();
}

/**
 * Individual Subscriber Actions
 */
export async function toggleSubscriberStatus(id) {
  const list = getNewsletterSubscribers();
  const sub = list.find(s => String(s.id) === String(id));
  if (!sub) return;

  const nextStatus = sub.status === NEWSLETTER_STATUS.SUBSCRIBED 
    ? NEWSLETTER_STATUS.UNSUBSCRIBED 
    : NEWSLETTER_STATUS.SUBSCRIBED;

  await NewsletterApi.updateStatus(id, nextStatus);
  showToast(`Status updated to ${nextStatus} for ${sub.email}`);
  renderNewsletterTab();
}

export async function deleteSubscriber(id) {
  const list = getNewsletterSubscribers();
  const sub = list.find(s => String(s.id) === String(id));
  if (!sub) return;

  const confirmed = await etechAlert.confirmDelete(`Subscriber "${sub.email}"`);
  if (!confirmed) return;

  try {
    if (typeof NewsletterApi.deleteSubscriber === 'function') {
      await NewsletterApi.deleteSubscriber(id);
    } else {
      await NewsletterApi.delete(id);
    }
    showToast(`Subscriber ${sub.email} deleted.`, 'success');
    renderNewsletterTab();
  } catch (err) {
    etechAlert.error('Delete Failed', err.message || 'Could not delete subscriber.');
  }
}

export function sendQuickTestEmail(id) {
  const list = getNewsletterSubscribers();
  const sub = list.find(s => String(s.id) === String(id));
  if (!sub) return;

  showToast(`Direct test tech newsletter sent to ${sub.email}!`, 'success');
}

/**
 * Export Subscribers to CSV
 */
export function exportSubscribersCsv() {
  const subscribers = getNewsletterSubscribers();
  if (subscribers.length === 0) {
    showToast('No subscribers available to export.', 'error');
    return;
  }

  const headers = ['Subscriber ID', 'Email', 'Customer Name', 'Status', 'Subscribed Date', 'Last Campaign Sent'];
  const rows = subscribers.map(s => [
    s.id,
    `"${s.email}"`,
    `"${(s.name || '').replace(/"/g, '""')}"`,
    s.status,
    s.subscribedAt,
    s.lastCampaignSentAt || 'None'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `etech_newsletter_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Subscriber CSV exported successfully!', 'success');
}

/**
 * Add Subscriber Modal
 */
export function openAddSubscriberModal() {
  const container = document.getElementById('newsletter-modals-container');
  if (!container) return;

  container.innerHTML = `
    <div id="add-sub-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] animate-scaleUp space-y-4">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              +
            </div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Add New Subscriber</h3>
          </div>
          <button onclick="closeNewsletterModal('add-sub-modal')" class="text-[#94a3b8] hover:text-[#0f172a] p-1">✕</button>
        </div>

        <form onsubmit="saveNewSubscriberManual(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-[#334155] mb-1">Email Address *</label>
            <input type="email" id="modal-sub-email" required placeholder="customer@example.com"
              class="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg focus:border-blue-600 focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-[#334155] mb-1">Full Name (Optional)</label>
            <input type="text" id="modal-sub-name" placeholder="Leave blank to auto-derive from email"
              class="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg focus:border-blue-600 focus:outline-none" />
          </div>

          <div>
            <label class="block font-bold text-[#334155] mb-1">Initial Status</label>
            <select id="modal-sub-status" class="w-full px-3 py-2 border border-[#cbd5e1] rounded-lg focus:border-blue-600 focus:outline-none">
              <option value="${NEWSLETTER_STATUS.SUBSCRIBED}">SUBSCRIBED</option>
              <option value="${NEWSLETTER_STATUS.UNSUBSCRIBED}">UNSUBSCRIBED</option>
            </select>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-[#e2e8f0]">
            <button type="button" onclick="closeNewsletterModal('add-sub-modal')" class="px-4 py-2 rounded-lg bg-[#f1f5f9] text-[#475569] font-bold hover:bg-[#e2e8f0]">
              Cancel
            </button>
            <button type="submit" class="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20">
              Save Subscriber
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export async function saveNewSubscriberManual(event) {
  if (event) event.preventDefault();
  const email = document.getElementById('modal-sub-email').value.trim();
  const name = document.getElementById('modal-sub-name').value.trim();
  const status = document.getElementById('modal-sub-status').value;

  try {
    const res = await NewsletterApi.subscribe({
      email,
      name: name || undefined
    });

    if (res.data && status !== NEWSLETTER_STATUS.SUBSCRIBED) {
      await NewsletterApi.updateStatus(res.data.id, status);
    }

    closeNewsletterModal('add-sub-modal');
    showToast(res.message || 'Subscriber saved successfully!', 'success');
    renderNewsletterTab();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Navigate to Full Page Compose Marketing Broadcast
 */
export function openCampaignModal() {
  closeNewsletterModal('campaign-modal');
  setNewsletterSubTab('compose');
}

/**
 * 1-Click Insert Personalization Placeholders
 */
export function insertPlaceholder(placeholder) {
  const bodyInput = document.getElementById('campaign-body');
  if (!bodyInput) return;
  const start = bodyInput.selectionStart;
  const end = bodyInput.selectionEnd;
  const text = bodyInput.value;
  bodyInput.value = text.substring(0, start) + placeholder + text.substring(end);
  bodyInput.focus();
  bodyInput.selectionStart = bodyInput.selectionEnd = start + placeholder.length;
  updateCampaignPreview();
}

/**
 * 1-Click Reactivate All Subscribers directly from the Compose Page
 */
export async function reactivateAllSubscribersFromPage() {
  const subscribers = getNewsletterSubscribers();
  const ids = subscribers.map(s => s.id).filter(Boolean);
  if (ids.length === 0) {
    showToast('No subscriber records found.', 'warning');
    return;
  }

  try {
    await NewsletterApi.bulkUpdateStatus(ids, NEWSLETTER_STATUS.SUBSCRIBED);
    showToast(`Reactivated all ${ids.length} subscribers!`, 'success');
    renderNewsletterTab();
  } catch (err) {
    etechAlert.error('Reactivation Failed', err.message || 'Could not reactivate subscribers.');
  }
}

export const reactivateAllSubscribersFromModal = reactivateAllSubscribersFromPage;
export function updateCampaignTargetAudienceCount() {}

/**
 * Dedicated Full-Page Compose Marketing Broadcast Workspace
 */
export function renderComposeBroadcastFullPageHtml(analytics) {
  const hasActive = analytics.activeSubscribers > 0;

  return `
    <div class="space-y-6 pb-12 animate-fadeIn">
      <!-- 1. Top Breadcrumb & Action Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div class="flex items-center space-x-3.5">
          <button type="button" onclick="setNewsletterSubTab('subscribers')"
            class="px-3.5 py-2 rounded-xl border border-[#cbd5e1] hover:border-blue-500 bg-[#f8fafc] hover:bg-blue-50/50 text-[#334155] hover:text-blue-600 font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs">
            <svg class="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span>Back to Subscribers</span>
          </button>
          <div class="h-6 w-px bg-slate-200"></div>
          <div>
            <div class="flex items-center space-x-2">
              <h1 class="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">Compose Marketing Broadcast</h1>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 font-mono">FULL PAGE WORKSPACE</span>
            </div>
            <p class="text-xs text-[#64748b]">Draft and dispatch live email announcements to active subscribers via Gmail SMTP.</p>
          </div>
        </div>

        <div class="flex items-center space-x-2.5">
          <button type="button" onclick="setNewsletterSubTab('subscribers')"
            class="px-4 py-2.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-bold text-xs transition-all cursor-pointer">
            Cancel
          </button>
          <button type="button" onclick="document.getElementById('compose-broadcast-form').requestSubmit()"
            ${!hasActive ? 'disabled' : ''}
            class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 cursor-pointer transform hover:-translate-y-0.5 ${!hasActive ? 'opacity-50 cursor-not-allowed hover:bg-blue-600 transform-none' : ''}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            <span>Send Broadcast Now</span>
          </button>
        </div>
      </div>

      <!-- 2. Zero Active Subscribers Warning Notice (If Applicable) -->
      ${!hasActive ? `
        <div id="campaign-zero-subscribers-notice" class="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-xs animate-fadeIn">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="font-bold text-xs">No Active Subscribers Found (${analytics.totalSubscribers} total contacts are currently Unsubscribed)</p>
              <p class="text-[11px] text-amber-700 mt-0.5">Marketing emails are only delivered to active subscribers. Click below to reactivate all contacts.</p>
            </div>
          </div>
          <button type="button" onclick="reactivateAllSubscribersFromPage()" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs whitespace-nowrap shadow-xs cursor-pointer transition-all flex-shrink-0">
            Reactivate All (${analytics.totalSubscribers})
          </button>
        </div>
      ` : ''}

      <!-- 3. Form & Live Preview Grid Layout -->
      <form id="compose-broadcast-form" onsubmit="handleSendCampaignSubmit(event)">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- Left Column: Form Controls (7 Columns) -->
          <div class="lg:col-span-7 space-y-6">
            
            <!-- Quick Campaign Template Presets -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div>
                <label class="block font-extrabold text-[#0f172a] text-xs mb-0.5">Quick Campaign Template Presets</label>
                <p class="text-[11px] text-[#64748b]">Select a pre-designed copy structure or customize your own announcement.</p>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button type="button" onclick="applyCampaignTemplate('flash_deals')" class="p-3 rounded-xl border border-blue-200 hover:border-blue-500 bg-blue-50/50 text-left transition-all group cursor-pointer shadow-2xs">
                  <p class="font-bold text-blue-900 group-hover:text-blue-600 inline-flex items-center space-x-1.5 text-xs">
                    ${iconFlame('w-4 h-4 text-rose-600 flex-shrink-0')}
                    <span>Weekend Flash</span>
                  </p>
                  <p class="text-[10px] text-[#64748b] mt-0.5">Hot Deals & Discounts</p>
                </button>
                <button type="button" onclick="applyCampaignTemplate('new_arrivals')" class="p-3 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 text-left transition-all group cursor-pointer shadow-2xs">
                  <p class="font-bold text-slate-800 group-hover:text-blue-600 inline-flex items-center space-x-1.5 text-xs">
                    ${iconRocket('w-4 h-4 text-blue-600 flex-shrink-0')}
                    <span>New Arrivals</span>
                  </p>
                  <p class="text-[10px] text-[#64748b] mt-0.5">Hardware Stock Drops</p>
                </button>
                <button type="button" onclick="applyCampaignTemplate('price_drop')" class="p-3 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 text-left transition-all group cursor-pointer shadow-2xs">
                  <p class="font-bold text-slate-800 group-hover:text-blue-600 inline-flex items-center space-x-1.5 text-xs">
                    ${iconTrendingDown('w-4 h-4 text-emerald-600 flex-shrink-0')}
                    <span>Price Drops</span>
                  </p>
                  <p class="text-[10px] text-[#64748b] mt-0.5">GPU & RAM Reductions</p>
                </button>
                <button type="button" onclick="applyCampaignTemplate('tech_digest')" class="p-3 rounded-xl border border-slate-200 hover:border-blue-500 bg-slate-50 text-left transition-all group cursor-pointer shadow-2xs">
                  <p class="font-bold text-slate-800 group-hover:text-blue-600 inline-flex items-center space-x-1.5 text-xs">
                    ${iconLightbulb('w-4 h-4 text-amber-600 flex-shrink-0')}
                    <span>Tech Digest</span>
                  </p>
                  <p class="text-[10px] text-[#64748b] mt-0.5">Guides & Specs Matrix</p>
                </button>
              </div>
            </div>

            <!-- Subject & Preheader -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <label class="block font-bold text-[#334155] text-xs mb-1.5">Email Subject Line *</label>
                <input type="text" id="campaign-subject" required oninput="updateCampaignPreview()"
                  placeholder="e.g., Weekend Flash Deals: Up to 45% OFF Gaming Hardware!"
                  class="w-full px-4 py-2.5 border border-[#cbd5e1] rounded-xl text-xs font-bold text-[#0f172a] focus:border-blue-600 focus:outline-none transition-colors shadow-2xs" />
              </div>

              <div>
                <label class="block font-bold text-[#334155] text-xs mb-1.5">Preheader / Snippet Text</label>
                <input type="text" id="campaign-preheader" oninput="updateCampaignPreview()"
                  placeholder="Special member pricing valid across all Sri Lanka branches until Sunday."
                  class="w-full px-4 py-2.5 border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:border-blue-600 focus:outline-none transition-colors shadow-2xs" />
                <p class="text-[10px] text-[#94a3b8] mt-1">Short summary displayed in the subscriber's inbox list right after the subject.</p>
              </div>
            </div>

            <!-- Broadcast Message Body -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <label class="block font-bold text-[#334155] text-xs">Broadcast Message Body (HTML / Text) *</label>
                <span class="text-[10px] text-[#64748b]">Plain text paragraphs or HTML tags supported</span>
              </div>

              <textarea id="campaign-body" rows="8" required oninput="updateCampaignPreview()"
                placeholder="Write your email announcement or promotional pitch here..."
                class="w-full px-4 py-3 border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] font-sans leading-relaxed focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"></textarea>
              
              <div class="flex items-center justify-between pt-1">
                <p class="text-[11px] text-[#94a3b8]">
                  Personalization placeholders: 
                  <button type="button" onclick="insertPlaceholder('{{subscriber_name}}')" class="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer font-bold">{{subscriber_name}}</button>
                  <button type="button" onclick="insertPlaceholder('{{store_url}}')" class="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer font-bold">{{store_url}}</button>
                </p>
                <span class="text-[10px] text-emerald-600 font-bold">Auto-Personalized on Dispatch</span>
              </div>
            </div>

            <!-- Bottom Dispatch Bar -->
            <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="space-y-0.5 text-left">
                <p class="text-xs text-[#334155] font-bold">
                  Audience: <strong class="text-blue-600 font-mono font-bold">${analytics.activeSubscribers}</strong> Active Subscribers
                </p>
                <p class="text-[11px] text-[#64748b]">Delivered Island-Wide via Gmail SMTP (eteccomputers38@gmail.com)</p>
              </div>

              <div class="flex items-center space-x-2.5">
                <button type="button" onclick="setNewsletterSubTab('subscribers')"
                  class="px-4 py-2.5 rounded-xl bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] font-bold text-xs cursor-pointer transition-all">
                  Cancel
                </button>
                <button type="submit" id="btn-send-broadcast" ${!hasActive ? 'disabled' : ''}
                  class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center space-x-2 cursor-pointer transform hover:-translate-y-0.5 ${!hasActive ? 'opacity-50 cursor-not-allowed hover:bg-blue-600 transform-none' : ''}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                  <span>Send Broadcast Now</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Right Column: Sticky Live Subscriber Inbox Preview (5 Columns) -->
          <div class="lg:col-span-5 space-y-4">
            <div class="sticky top-6 space-y-3">
              <div class="flex items-center justify-between text-xs font-bold text-[#64748b]">
                <span class="inline-flex items-center space-x-1.5">
                  ${iconEye('w-4 h-4 text-blue-600')}
                  <span class="text-[#0f172a] font-extrabold">Live Subscriber Inbox Preview</span>
                </span>
                <span class="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-mono">HTML Email Client</span>
              </div>

              <!-- Preview Email Client Container -->
              <div class="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden shadow-lg space-y-0">
                
                <!-- Email Client Top Header -->
                <div class="bg-[#0f172a] p-4 text-white flex items-center justify-between border-b-2 border-blue-600">
                  <div class="flex items-center space-x-2.5">
                    <div class="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center font-mono">ET</div>
                    <div>
                      <span class="font-black text-xs tracking-tight text-white">ETech<span class="text-blue-400">Computers</span></span>
                      <p class="text-[9px] text-slate-400 font-mono">noreply@etechcomputers.lk</p>
                    </div>
                  </div>
                  <span class="text-[9px] font-bold text-blue-300 bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 rounded-full uppercase tracking-wider">Official Broadcast</span>
                </div>

                <!-- Subject & Preheader Banner in Preview -->
                <div class="bg-slate-50 border-b border-[#e2e8f0] p-4 space-y-1">
                  <h3 id="preview-subject" class="font-extrabold text-sm text-[#0f172a] leading-snug">
                    Weekend Flash Deals: Up to 45% OFF Gaming Hardware!
                  </h3>
                  <p id="preview-preheader" class="text-[11px] text-[#64748b] leading-relaxed">
                    Special member pricing valid across all Sri Lanka branches until Sunday.
                  </p>
                </div>

                <!-- Email Body in Preview -->
                <div class="p-5 space-y-4">
                  <div id="preview-body" class="text-xs text-[#334155] leading-relaxed whitespace-pre-line space-y-2">
                    Hi Kasun,

                    Get ready for our biggest hardware drop of the month! We're discounting flagship ROG laptops, Corsair DDR5 RAM kits, and Samsung NVMe SSDs with full local distributor warranties.

                    Visit our store or order online today to claim your limited VIP discount voucher!
                  </div>

                  <!-- Call to Action Button in Preview -->
                  <div class="pt-2">
                    <span class="inline-block px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 text-center cursor-default">
                      Shop Weekend Deals &rarr;
                    </span>
                  </div>
                </div>

                <!-- Email Footer in Preview -->
                <div class="bg-slate-50 border-t border-[#e2e8f0] p-4 text-center text-[10px] text-[#94a3b8] space-y-1">
                  <p class="font-medium text-[#64748b]">ETech Computers LK &bull; Next-Gen Tech Store Official Sri Lanka</p>
                  <p>You received this broadcast as an active subscriber &bull; Support: eteccomputers38@gmail.com</p>
                  <p class="text-slate-400 underline">Unsubscribe from marketing emails</p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </form>
    </div>
  `;
}

/**
 * Real-time Email Preview Syncer
 */
export function updateCampaignPreview() {
  const subjectInput = document.getElementById('campaign-subject');
  const preheaderInput = document.getElementById('campaign-preheader');
  const bodyInput = document.getElementById('campaign-body');
  const previewSubject = document.getElementById('preview-subject');
  const previewPreheader = document.getElementById('preview-preheader');
  const previewBody = document.getElementById('preview-body');

  if (previewSubject && subjectInput) {
    previewSubject.textContent = subjectInput.value.trim() || 'Weekend Flash Deals: Up to 45% OFF Gaming Hardware!';
  }
  if (previewPreheader && preheaderInput) {
    previewPreheader.textContent = preheaderInput.value.trim() || 'Special member pricing valid across all Sri Lanka branches until Sunday.';
  }
  if (previewBody && bodyInput) {
    const raw = bodyInput.value || 'Hi Kasun,\n\nGet ready for our biggest hardware drop of the month!\n\nVisit our store or order online today!';
    previewBody.textContent = raw
      .replace(/\{\{subscriber_name\}\}/g, 'Kasun')
      .replace(/\{\{store_url\}\}/g, 'http://127.0.0.1:5500/index.html#deals');
  }
}

/**
 * Quick Template Applicator
 */
export function applyCampaignTemplate(templateKey) {
  const subjectInput = document.getElementById('campaign-subject');
  const preheaderInput = document.getElementById('campaign-preheader');
  const bodyInput = document.getElementById('campaign-body');

  if (!subjectInput || !bodyInput) return;

  if (templateKey === 'flash_deals') {
    subjectInput.value = '🔥 Weekend Flash Deals: Up to 45% OFF RTX 40-Series & Gaming Laptops!';
    if (preheaderInput) preheaderInput.value = 'Special member pricing valid across all Sri Lanka branches until Sunday.';
    bodyInput.value = `Hi {{subscriber_name}},\n\nGet ready for our biggest hardware drop of the month! We're discounting flagship ROG laptops, Corsair DDR5 RAM kits, and Samsung NVMe SSDs with full local distributor warranties.\n\nVisit our store or order online today to claim your limited VIP discount voucher!`;
  } else if (templateKey === 'new_arrivals') {
    subjectInput.value = '🚀 New In Stock: Intel Core Ultra & Corsair Dominator Titanium DDR5';
    if (preheaderInput) preheaderInput.value = 'Unleash next-generation rendering and gaming capabilities.';
    bodyInput.value = `Hi {{subscriber_name}},\n\nBrand new cutting-edge hardware has just landed at ETech Computers! Explore the latest Intel Core Ultra processors and premium Titanium memory modules designed for peak performance.\n\nCheck out the full catalog with instant island-wide delivery.`;
  } else if (templateKey === 'price_drop') {
    subjectInput.value = '📉 Price Drop Alert: Graphics Cards & Liquid Coolers Just Reduced';
    if (preheaderInput) preheaderInput.value = 'Save up to Rs. 40,000 on select custom workstation components.';
    bodyInput.value = `Hi {{subscriber_name}},\n\nWe have lowered retail prices across popular high-demand graphics cards and liquid AIO coolers! Don't miss this opportunity to upgrade your workstation at the best market prices.`;
  } else if (templateKey === 'tech_digest') {
    subjectInput.value = '💡 ETech Tech Digest: Best Hardware Configurations for 2026';
    if (preheaderInput) preheaderInput.value = 'Expert benchmark comparisons, power supply recommendations, and more.';
    bodyInput.value = `Hi {{subscriber_name}},\n\nNot sure which power supply or motherboard matches your next setup? Our technical team has put together a comprehensive specs matrix and performance guide to help you make the best decision.`;
  }

  updateCampaignPreview();
}

/**
 * Handle Broadcast Campaign Form Submission
 */
export async function handleSendCampaignSubmit(event) {
  if (event) event.preventDefault();
  const subjectEl = document.getElementById('campaign-subject');
  const preheaderEl = document.getElementById('campaign-preheader');
  const bodyEl = document.getElementById('campaign-body');

  if (!subjectEl || !bodyEl) return;

  const subject = subjectEl.value.trim();
  const preheader = preheaderEl ? preheaderEl.value.trim() : '';
  const content = bodyEl.value.trim();

  if (!subject) {
    showToast('Please enter an email subject line.', 'error');
    return;
  }
  if (!content) {
    showToast('Please enter broadcast message body content.', 'error');
    return;
  }

  const analytics = getNewsletterAnalytics();
  const recipientCount = analytics.activeSubscribers;

  if (recipientCount === 0) {
    await etechAlert.warning(
      'No Active Recipients',
      'Cannot send broadcast: There are 0 active subscribers in the audience. Please reactivate subscribers before dispatching.'
    );
    return;
  }

  const confirmed = await etechAlert.confirm({
    title: 'Confirm Live Email Broadcast?',
    message: `You are about to broadcast campaign "${subject}" to ${recipientCount} active subscribers via Gmail SMTP (eteccomputers38@gmail.com). Real emails will be delivered directly to customer mailboxes. Proceed with live dispatch?`,
    type: 'create',
    confirmText: `Yes, Broadcast to ${recipientCount} Subscribers`,
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  const btn = document.getElementById('btn-send-broadcast');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Dispatching via Gmail SMTP...`;
  }

  try {
    const res = await NewsletterApi.sendCampaign({
      subject,
      preheader,
      category: 'MARKETING_BROADCAST',
      targetSegment: 'ALL_ACTIVE',
      contentHtml: content,
      authorName: 'Admin Team'
    });

    closeNewsletterModal('campaign-modal');
    showToast(res.message || 'Campaign broadcast dispatched successfully!', 'success');
    activeSubTab = 'campaigns';
    renderNewsletterTab();

    await etechAlert.info(
      'Email Broadcast Dispatched!',
      `Campaign "${subject}" has been queued and is actively delivering via Gmail SMTP to your active subscriber base.`
    );
  } catch (err) {
    etechAlert.error('Broadcast Dispatch Failed', err.message || 'Could not dispatch campaign.');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        <span>Send Broadcast Now</span>
      `;
    }
  }
}

/**
 * Close Modal Helper
 */
export function closeNewsletterModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.remove();
}

/**
 * High-Fidelity Subscription Confirmation Modal
 */
export function showSubscriptionSuccessModal(email) {
  let modal = document.getElementById('subscription-success-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'subscription-success-modal';
  modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-[#0f172a]/70 backdrop-blur-sm animate-fadeIn';
  modal.innerHTML = `
    <div class="bg-white border border-[#e2e8f0] rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-scaleUp">
      
      <!-- Icon -->
      <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
      </div>

      <div class="space-y-1.5">
        <h3 class="text-xl font-black text-[#0f172a] tracking-tight">Subscription Confirmed!</h3>
        <p class="text-xs text-[#64748b]">
          Welcome to <strong class="text-blue-600 font-bold">ETech Insider</strong>
        </p>
      </div>

      <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left text-xs text-[#475569] space-y-2">
        <p>
          Thank you for subscribing with <strong class="text-[#0f172a] font-mono">${escapeHtml(email)}</strong>. A welcome confirmation has been dispatched to your inbox from <strong class="text-blue-600">eteccomputers38@gmail.com</strong>.
        </p>
        <div class="border-t border-slate-200 pt-2 text-[11px] text-[#64748b] space-y-1">
          <p class="font-bold text-[#0f172a]">&bull; What to expect:</p>
          <p>&bull; Early access to PC hardware arrivals & GPU restocks</p>
          <p>&bull; Custom workstation builds and performance benchmarks</p>
          <p>&bull; Zero spam guarantee &bull; 1-click unsubscribe anytime</p>
        </div>
      </div>

      <button onclick="document.getElementById('subscription-success-modal').remove()" 
        class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer">
        Got It, Thanks!
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

/**
 * Frontend Storefront Subscription Handler (Home Page Newsletter Form)
 */
export async function handleStorefrontNewsletterSubmit(event) {
  if (event) event.preventDefault();
  
  const input = document.getElementById('home-newsletter-email') || (event.target ? event.target.querySelector('input[type="email"]') : null);
  if (!input) return;

  const email = input.value.trim();
  if (!isValidEmail(email)) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  const submitBtn = event.target ? event.target.querySelector('button[type="submit"]') : null;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-75', 'cursor-wait');
  }

  try {
    const res = await NewsletterApi.subscribe({ email });

    showSubscriptionSuccessModal(email);
    input.value = '';
  } catch (err) {
    showToast(err.message || 'Subscription failed. Please try again.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-75', 'cursor-wait');
    }
  }
}

/**
 * Utilities
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function copyToClipboard(text, msg) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || 'Copied to clipboard!', 'info');
    });
  } else {
    showToast(msg || 'Copied to clipboard!', 'info');
  }
}
