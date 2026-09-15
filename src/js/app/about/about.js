// ============================================================
//  about.js — Dynamic About Us & Business Profile View Generator
//  100% Synchronized with Spring Boot Backend REST APIs
// ============================================================
import { PoliciesApi } from '../../api/policiesApi.js';
import { BranchesApi } from '../../api/branchesApi.js';
import {
  saveBusinessInfo,
  saveStoredPolicies
} from '../../models/policy-data.js';
import { saveBranches } from '../../controller/branch_controller.js';

/**
 * Safely escape strings for HTML injection to prevent XSS
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format timestamp into readable localized date
 */
function formatUpdatedDate(dateStr) {
  if (!dateStr) return 'Verified & Active';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Dynamically renders the About Us page into #about-page
 * Fetches exclusively from live backend REST endpoints:
 * - GET /api/v1/business-profile
 * - GET /api/v1/branches?activeOnly=true
 * - GET /api/v1/policies
 */
export async function renderAboutPage() {
  const container = document.getElementById('about-page');
  if (!container) return;

  // 1. Initial State: Display smooth animated loading skeleton while synchronizing with backend
  container.innerHTML = `
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-10 pb-12 animate-pulse py-6">
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-10 space-y-4">
        <div class="flex gap-2">
          <div class="h-6 w-44 bg-slate-200 rounded-full"></div>
          <div class="h-6 w-32 bg-slate-200 rounded-full"></div>
        </div>
        <div class="h-10 w-2/3 bg-slate-200 rounded-lg"></div>
        <div class="h-5 w-1/2 bg-slate-200 rounded-lg"></div>
        <div class="space-y-2 pt-2">
          <div class="h-4 w-full bg-slate-200 rounded"></div>
          <div class="h-4 w-5/6 bg-slate-200 rounded"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="h-24 bg-white border border-[#e2e8f0] rounded-xl"></div>
        <div class="h-24 bg-white border border-[#e2e8f0] rounded-xl"></div>
        <div class="h-24 bg-white border border-[#e2e8f0] rounded-xl"></div>
        <div class="h-24 bg-white border border-[#e2e8f0] rounded-xl"></div>
      </div>
      <div class="bg-white border border-[#e2e8f0] rounded-xl h-64"></div>
    </div>
  `;

  try {
    // 2. Fetch live data strictly from backend REST endpoints in parallel
    const [profileRes, branchesRes, policiesRes] = await Promise.all([
      PoliciesApi.getBusinessProfile(),
      BranchesApi.getAll(true),
      PoliciesApi.getAll()
    ]);

    // Normalize Business Profile from backend
    const rawProfile = (profileRes && (profileRes.body || profileRes.data)) || profileRes || {};
    const business = {
      storeName: rawProfile.storeName || 'ETech Computers',
      tagline: rawProfile.tagline || '',
      registrationNo: rawProfile.registrationNo || '',
      taxId: rawProfile.taxId || '',
      isoCert: rawProfile.isoCert || '',
      supportEmail: rawProfile.supportEmail || '',
      hotline: rawProfile.hotline || '',
      headquarters: rawProfile.headquarters || '',
      workingHours: rawProfile.workingHours || '',
      missionStatement: rawProfile.missionStatement || rawProfile.mission || '',
      companyStory: rawProfile.companyStory || rawProfile.story || '',
      updatedAt: rawProfile.updatedAt || null
    };

    // Keep in-memory store in sync
    saveBusinessInfo(business);

    // Normalize Branches from backend
    let rawBranches = [];
    if (Array.isArray(branchesRes)) {
      rawBranches = branchesRes;
    } else if (branchesRes && Array.isArray(branchesRes.body)) {
      rawBranches = branchesRes.body;
    } else if (branchesRes && Array.isArray(branchesRes.data)) {
      rawBranches = branchesRes.data;
    }

    const branches = rawBranches.map(b => ({
      id: b.id || '',
      name: b.name || '',
      city: b.city || '',
      address: b.address || '',
      phone: b.phone || b.hotline || '',
      email: b.email || '',
      baseShippingRate: b.baseShippingRate !== undefined ? b.baseShippingRate : (b.baseShippingFee || 0),
      active: b.active !== false
    }));

    // Keep in-memory branches in sync
    saveBranches(branches);

    // Normalize Policies from backend
    let rawPoliciesList = [];
    if (Array.isArray(policiesRes)) {
      rawPoliciesList = policiesRes;
    } else if (policiesRes && Array.isArray(policiesRes.body)) {
      rawPoliciesList = policiesRes.body;
    } else if (policiesRes && Array.isArray(policiesRes.data)) {
      rawPoliciesList = policiesRes.data;
    }

    const policies = rawPoliciesList.map(p => {
      let sections = [];
      if (Array.isArray(p.sections) && p.sections.length > 0) {
        sections = p.sections.map(s => {
          const heading = s.heading || s.sectionTitle || '';
          const content = s.content || s.sectionContent || '';
          let bullets = [];
          if (Array.isArray(s.bullets)) {
            bullets = s.bullets;
          } else if (s.bulletPoints && typeof s.bulletPoints === 'string') {
            bullets = s.bulletPoints.split('|').map(b => b.trim()).filter(Boolean);
          }
          return {
            id: s.id || '',
            heading,
            sectionTitle: heading,
            content,
            sectionContent: content,
            bulletPoints: s.bulletPoints || bullets.join(' | '),
            bullets
          };
        });
      } else if (p.policySections && typeof p.policySections === 'object') {
        sections = Object.entries(p.policySections).map(([heading, rawContent]) => {
          const parts = (rawContent || '').split('|').map(b => b.trim()).filter(Boolean);
          const content = parts.length > 1 ? parts[0] : (rawContent || '');
          const bullets = parts.length > 1 ? parts.slice(1) : [];
          return {
            heading,
            sectionTitle: heading,
            content,
            sectionContent: content,
            bulletPoints: bullets.join(' | '),
            bullets
          };
        });
      }

      return {
        id: p.id || p.slug || '',
        title: p.title || '',
        subtitle: p.subtitle || '',
        lastUpdated: p.lastUpdated || '',
        sections,
        policySections: p.policySections || {}
      };
    });

    // Keep in-memory policies in sync
    const policiesMap = {};
    policies.forEach(p => {
      if (p.id) policiesMap[p.id] = p;
    });
    saveStoredPolicies(policiesMap);

    // 3. Render page using ONLY backend-retrieved data
    renderAboutContent(container, business, branches, policies);

  } catch (err) {
    console.error('[AboutPage] Live synchronization failure:', err);

    container.innerHTML = `
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl py-16 text-center space-y-5">
        <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div class="space-y-1.5">
          <h3 class="text-xl font-extrabold text-[#0f172a]">Backend Synchronization Required</h3>
          <p class="text-xs sm:text-sm text-[#64748b] leading-relaxed max-w-md mx-auto">
            Unable to retrieve verified business credentials and warehouse branch data from the backend server.
          </p>
        </div>
        <div class="pt-2">
          <button id="btn-about-retry-sync" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center space-x-2 mx-auto">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            <span>Retry Backend Connection</span>
          </button>
        </div>
      </div>
    `;

    const retryBtn = document.getElementById('btn-about-retry-sync');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        renderAboutPage();
      });
    }
  }
}

/**
 * Internal rendering engine: constructs DOM strictly with verified backend values
 */
function renderAboutContent(container, business, branches, policies) {
  const branchCities = [...new Set(branches.map(b => b.city).filter(Boolean))].join(' • ');

  container.innerHTML = `
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-10 pb-12">

      <!-- ── 1. Hero / Corporate Header ──────────────────────── -->
      <div class="relative overflow-hidden bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-10 shadow-sm">
        <!-- Ambient Glow -->
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div class="relative z-10 space-y-4 max-w-3xl">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200">
              Corporate Profile & Engineering Standards
            </span>
            ${business.isoCert ? `
              <span class="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>${escapeHtml(business.isoCert)}</span>
              </span>
            ` : ''}
          </div>

          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0f172a] tracking-tight leading-[1.2]">
            ${escapeHtml(business.storeName)}
          </h1>

          ${business.tagline ? `
            <p class="text-base sm:text-lg text-blue-600 font-semibold tracking-wide">
              ${escapeHtml(business.tagline)}
            </p>
          ` : ''}

          ${business.companyStory ? `
            <p class="text-sm sm:text-base text-[#475569] leading-relaxed pt-1">
              ${escapeHtml(business.companyStory)}
            </p>
          ` : ''}

          <div class="pt-2 flex flex-wrap items-center gap-3">
            <a href="#shop" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>Explore Our Hardware</span>
            </a>
            <a href="#policies" class="px-5 py-2.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] font-bold text-xs rounded-lg border border-[#e2e8f0] transition-all flex items-center space-x-2 shadow-sm">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Review Legal Policies</span>
            </a>
          </div>
        </div>
      </div>

      <!-- ── 2. Live Key Statistics Matrix (100% Backend Derived) ── -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- Metric 1: Hubs -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center shadow-sm relative group hover:border-[#cbd5e1] transition-colors">
          <span class="text-3xl font-extrabold font-mono text-blue-600 block mb-1">${branches.length} Hubs</span>
          <span class="text-xs text-[#0f172a] font-semibold uppercase tracking-wider block">Regional Warehouses</span>
          <span class="text-[10px] text-[#64748b] mt-1 block truncate" title="${escapeHtml(branchCities)}">${escapeHtml(branchCities) || 'Islandwide Dispatch Network'}</span>
        </div>

        <!-- Metric 2: Registration -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center shadow-sm relative group hover:border-[#cbd5e1] transition-colors">
          <span class="text-lg sm:text-xl font-extrabold font-mono text-[#0f172a] block mb-1 truncate" title="${escapeHtml(business.registrationNo)}">
            ${escapeHtml(business.registrationNo) || 'Registered'}
          </span>
          <span class="text-xs text-blue-600 font-semibold uppercase tracking-wider block">Business Registration</span>
          <span class="text-[10px] text-[#64748b] mt-1 block">Department of Registrar</span>
        </div>

        <!-- Metric 3: Tax Compliance -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center shadow-sm relative group hover:border-[#cbd5e1] transition-colors">
          <span class="text-lg sm:text-xl font-extrabold font-mono text-emerald-600 block mb-1 truncate" title="${escapeHtml(business.taxId)}">
            ${escapeHtml(business.taxId) || 'Compliant'}
          </span>
          <span class="text-xs text-[#0f172a] font-semibold uppercase tracking-wider block">Tax Compliance</span>
          <span class="text-[10px] text-[#64748b] mt-1 block">Inland Revenue Department</span>
        </div>

        <!-- Metric 4: Quality Standard -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 text-center shadow-sm relative group hover:border-[#cbd5e1] transition-colors">
          <span class="text-lg sm:text-xl font-extrabold font-mono text-amber-600 block mb-1 truncate" title="${escapeHtml(business.isoCert)}">
            ${escapeHtml(business.isoCert) || 'ISO Certified'}
          </span>
          <span class="text-xs text-[#0f172a] font-semibold uppercase tracking-wider block">Quality Assurance</span>
          <span class="text-[10px] text-[#64748b] mt-1 block">Hardware Engineering Standards</span>
        </div>
      </div>

      <!-- ── 3. Corporate Mission Statement (Backend Sourced) ── -->
      ${business.missionStatement ? `
        <div class="bg-gradient-to-br from-blue-50/70 via-white to-slate-50 border border-blue-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-extrabold text-[#0f172a]">Corporate Mission & Purpose</h2>
              <p class="text-xs text-[#64748b]">Empowering Sri Lankan creators, gamers & enterprise studios</p>
            </div>
          </div>
          <blockquote class="text-sm sm:text-base font-medium text-[#1e293b] leading-relaxed italic border-l-4 border-blue-600 pl-4 py-1 my-2">
            "${escapeHtml(business.missionStatement)}"
          </blockquote>
        </div>
      ` : ''}

      <!-- ── 4. Corporate Information & Business Details Table ── -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden">
        <div class="p-5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span>🏛️ Registered Business Profile & Corporate Credentials</span>
            </h3>
            <p class="text-xs text-[#64748b] mt-0.5">Official registration identifiers, headquarters, customer support hotlines, and compliance verification.</p>
          </div>
          <span class="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Verified Entity
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <tbody class="divide-y divide-[#e2e8f0]">
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] w-1/3 bg-[#f8fafc] uppercase text-[10px] tracking-wider">Trading Name & Entity</td>
                <td class="py-3 px-5 text-[#0f172a] font-semibold">${escapeHtml(business.storeName)} ${business.tagline ? `(${escapeHtml(business.tagline)})` : ''}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Business Registration Number</td>
                <td class="py-3 px-5 font-mono text-blue-600 font-bold">${escapeHtml(business.registrationNo)}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Tax Identification Number (TIN / VAT)</td>
                <td class="py-3 px-5 font-mono text-blue-600 font-bold">${escapeHtml(business.taxId)}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Quality Management Certification</td>
                <td class="py-3 px-5 text-emerald-600 font-semibold flex items-center space-x-1.5">
                  <svg class="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>${escapeHtml(business.isoCert)}</span>
                </td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">National Headquarters</td>
                <td class="py-3 px-5 text-[#0f172a]">${escapeHtml(business.headquarters)}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Customer Support & Technical Hotline</td>
                <td class="py-3 px-5 text-[#0f172a] font-mono font-bold">
                  <a href="tel:${escapeHtml(business.hotline)}" class="text-blue-600 hover:underline">${escapeHtml(business.hotline)}</a>
                </td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Official Inquiries & Support Email</td>
                <td class="py-3 px-5 text-blue-600 font-mono">
                  <a href="mailto:${escapeHtml(business.supportEmail)}" class="hover:underline">${escapeHtml(business.supportEmail)}</a>
                </td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Store Operating & Dispatch Hours</td>
                <td class="py-3 px-5 text-[#475569]">${escapeHtml(business.workingHours)}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-5 font-bold text-[#475569] bg-[#f8fafc] uppercase text-[10px] tracking-wider">Backend Ledger Synchronization</td>
                <td class="py-3 px-5 text-emerald-600 font-mono text-[11px] font-semibold flex items-center space-x-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>${formatUpdatedDate(business.updatedAt)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── 5. Regional Warehouse Locations ─────────────────── -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-[#0f172a]">Regional Warehouses & Logistics Hubs</h2>
            <p class="text-xs text-[#64748b]">Live dispatch points and hardware consultation centers across Sri Lanka.</p>
          </div>
          <span class="text-xs font-mono font-bold text-blue-600 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded">
            ${branches.length} Active Hubs
          </span>
        </div>

        ${branches.length === 0 ? `
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center text-[#64748b] text-xs">
            No active regional warehouse hubs found in the backend database.
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${branches.map(b => `
              <div class="bg-white border border-[#e2e8f0] rounded-xl p-4 space-y-2.5 shadow-sm relative hover:border-blue-300 transition-colors">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    ${escapeHtml(b.id)}
                  </span>
                  <span class="text-[10px] font-semibold text-emerald-600 flex items-center space-x-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>Active Hub</span>
                  </span>
                </div>
                <h4 class="text-sm font-bold text-[#0f172a]">${escapeHtml(b.name)}</h4>
                <p class="text-xs text-[#64748b] line-clamp-2">${escapeHtml(b.address)}</p>
                <div class="pt-2 border-t border-[#e2e8f0] text-[11px] text-[#475569] space-y-1">
                  <p class="flex items-center space-x-1"><span>📞</span> <span class="font-mono">${escapeHtml(b.phone)}</span></p>
                  <p class="flex items-center space-x-1"><span>✉️</span> <span class="font-mono truncate" title="${escapeHtml(b.email)}">${escapeHtml(b.email)}</span></p>
                  ${b.baseShippingRate ? `
                    <p class="text-[10px] text-blue-600 font-semibold pt-0.5">Base Rate: Rs. ${parseFloat(b.baseShippingRate).toLocaleString()}</p>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- ── 6. Legal, Compliance & Policy Hub ────────────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
          <div>
            <h2 class="text-xl font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span>⚖️ Legal Policies & Compliance Framework</span>
            </h2>
            <p class="text-xs text-[#64748b] mt-1">Official agreements, terms of service, consumer protections, and guarantee terms.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${policies.map(p => `
              <a href="#${escapeHtml(p.id)}" class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#f8fafc] text-blue-600 hover:text-blue-700 hover:bg-[#f1f5f9] border border-[#e2e8f0] transition-all shadow-sm">
                ${escapeHtml(p.title)}
              </a>
            `).join('')}
          </div>
        </div>

        ${policies.length === 0 ? `
          <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-6 text-center text-[#64748b] text-xs">
            No legal policies registered in backend database.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            ${policies.map(p => {
              let bulletsList = [];
              if (Array.isArray(p.sections) && p.sections.length > 0) {
                p.sections.forEach(s => {
                  if (Array.isArray(s.bullets) && s.bullets.length > 0) {
                    bulletsList.push(...s.bullets);
                  } else if (s.bulletPoints) {
                    bulletsList.push(...s.bulletPoints.split('|').map(b => b.trim()).filter(Boolean));
                  }
                });
              } else if (p.policySections && typeof p.policySections === 'object') {
                Object.values(p.policySections).forEach(val => {
                  const parts = (val || '').split('|').map(b => b.trim()).filter(Boolean);
                  if (parts.length > 1) {
                    bulletsList.push(...parts.slice(1));
                  }
                });
              }

              return `
                <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-5 space-y-3 flex flex-col justify-between hover:border-blue-300 transition-colors shadow-sm">
                  <div class="space-y-2">
                    <div class="flex items-center space-x-2 text-blue-600">
                      <svg class="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                      <h4 class="text-sm font-bold text-[#0f172a]">${escapeHtml(p.title)}</h4>
                    </div>
                    <p class="text-xs text-[#64748b] leading-relaxed">
                      ${escapeHtml(p.subtitle)}
                    </p>
                    ${bulletsList.length > 0 ? `
                      <div class="text-[11px] text-[#475569] space-y-1.5 pt-2 border-t border-[#e2e8f0]">
                        ${bulletsList.slice(0, 3).map(bullet => `
                          <p class="flex items-start space-x-1.5 truncate">
                            <span class="text-blue-500 font-bold">•</span>
                            <span class="font-medium text-[#1e293b]">${escapeHtml(bullet)}</span>
                          </p>
                        `).join('')}
                      </div>
                    ` : ''}
                    ${p.lastUpdated ? `
                      <div class="text-[10px] text-[#94a3b8] pt-1">
                        Updated: ${escapeHtml(p.lastUpdated)}
                      </div>
                    ` : ''}
                  </div>
                  <a href="#${escapeHtml(p.id)}" class="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 pt-2">
                    <span>Read Full ${escapeHtml(p.title)}</span>
                    <span>→</span>
                  </a>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}
