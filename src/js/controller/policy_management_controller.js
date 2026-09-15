// ============================================================
//  policy_management_controller.js — Admin Store Profile & Policies
// ============================================================
import { 
  getBusinessInfo, saveBusinessInfo, getStoredPolicies, saveStoredPolicies, 
  updatePolicyDocument, syncPoliciesFromApi
} from '../models/policy-data.js';
import {
  iconBuilding,
  iconScale,
  iconClipboard
} from '../util/icons.js';
import { showToast, etechAlert } from '../util/index.js';

/**
 * Renders the Store Profile & Policies Management Tab inside the Admin Dashboard
 */
export async function renderPoliciesTab() {
  const panel = document.getElementById('tab-panel-policies');
  if (!panel) return;

  await syncPoliciesFromApi();

  const business = getBusinessInfo();
  const policies = getStoredPolicies();

  panel.innerHTML = `
    <div class="space-y-6 max-w-7xl mx-auto pb-10">

      <!-- Header Banner -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm">
        <div>
          <div class="flex items-center space-x-2 mb-1">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">Administration & Legal Governance</span>
          </div>
          <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">Store Profile & Legal Policies Manager</h2>
          <p class="text-xs text-[#64748b]">Configure your verified corporate information, consumer protections, and terms of service.</p>
        </div>
      </div>

      <!-- ── SECTION 1: Business Profile Information Table ──────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc]">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">${iconBuilding('w-4 h-4')}</span>
              <span>Corporate Business Profile & Operations Matrix</span>
            </h3>
            <p class="text-xs text-[#64748b] mt-0.5">These values are displayed on the live About Us page, customer invoices, and support footers.</p>
          </div>
          <button onclick="openBusinessInfoModal()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-sm flex items-center space-x-1.5 flex-shrink-0 cursor-pointer whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            <span>Edit Business Profile</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <tbody class="divide-y divide-[#e2e8f0]">
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] w-1/4 uppercase text-[10px] tracking-wider bg-[#f8fafc]">Store Trade Name</td>
                <td class="py-3 px-4 text-[#0f172a] font-semibold">${business.storeName}</td>
                <td class="py-3 px-4 font-bold text-[#64748b] w-1/4 uppercase text-[10px] tracking-wider bg-[#f8fafc]">Business Reg No</td>
                <td class="py-3 px-4 text-blue-600 font-mono font-bold">${business.registrationNo}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Tagline</td>
                <td class="py-3 px-4 text-[#475569]">${business.tagline}</td>
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Tax ID / VAT</td>
                <td class="py-3 px-4 text-blue-600 font-mono font-bold">${business.taxId}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Support Hotline</td>
                <td class="py-3 px-4 text-[#0f172a] font-mono">${business.hotline}</td>
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Support Email</td>
                <td class="py-3 px-4 text-blue-600 font-mono">${business.supportEmail}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Headquarters Address</td>
                <td class="py-3 px-4 text-[#0f172a]">${business.headquarters}</td>
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">ISO Certification</td>
                <td class="py-3 px-4 text-emerald-700 font-semibold">${business.isoCert}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Operating Hours</td>
                <td class="py-3 px-4 text-[#475569]" colspan="3">${business.workingHours}</td>
              </tr>
              <tr class="hover:bg-[#f8fafc] transition-colors">
                <td class="py-3 px-4 font-bold text-[#64748b] uppercase text-[10px] tracking-wider bg-[#f8fafc]">Mission Statement</td>
                <td class="py-3 px-4 text-[#475569] leading-relaxed" colspan="3">${business.mission}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── SECTION 2: Legal Policies Management Table ────────────── -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden space-y-4">
        <div class="p-4 sm:p-5 border-b border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#f8fafc]">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a] flex items-center space-x-2">
              <span class="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">${iconScale('w-4 h-4')}</span>
              <span>Legal Policies & Customer Protection Documents</span>
            </h3>
            <p class="text-xs text-[#64748b] mt-0.5">Manage policy document titles, revision dates, and individual legal clause sections.</p>
          </div>
        </div>

        <div class="overflow-x-auto p-4 pt-0">
          <table class="w-full text-left text-xs border border-[#e2e8f0] rounded-md overflow-hidden">
            <thead class="bg-[#f8fafc] uppercase font-bold text-[10px] tracking-wider text-[#64748b] border-b border-[#e2e8f0]">
              <tr>
                <th class="py-3 px-4">Policy Document</th>
                <th class="py-3 px-4">Route Slug</th>
                <th class="py-3 px-4 text-center">Sections / Clauses</th>
                <th class="py-3 px-4">Last Updated</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0]">
              ${Object.keys(policies).map(key => {
                const p = policies[key];
                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors">
                    <td class="py-3.5 px-4 min-w-[200px]">
                      <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center flex-shrink-0">
                          ${iconClipboard('w-4 h-4')}
                        </div>
                        <div>
                          <p class="font-bold text-[#0f172a] text-xs">${p.title}</p>
                          <p class="text-[10px] text-[#64748b] line-clamp-1">${p.subtitle || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 font-mono text-blue-600 font-bold text-xs whitespace-nowrap">#${key}</td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] shadow-2xs">
                        ${(p.sections || []).length} Clauses
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-[#475569] text-xs font-mono">${p.lastUpdated || 'Current'}</td>
                    <td class="py-3.5 px-4 text-center">
                      <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end space-x-2">
                        <a href="#${key}" target="_blank" class="p-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] hover:text-[#0f172a] rounded border border-[#e2e8f0] transition-colors shadow-sm" title="Preview Live Document">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        </a>
                        <button onclick="openPolicyEditorModal('${key}')" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold shadow-sm transition-colors flex items-center space-x-1">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          <span>Edit Clauses</span>
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

/**
 * Open Business Profile Editing Modal
 */
export function openBusinessInfoModal() {
  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  const business = getBusinessInfo();

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Edit Corporate Business Profile</h3>
            <p class="text-[11px] text-[#64748b]">Update business credentials, contacts, and public mission statement.</p>
          </div>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] text-lg font-bold">&times;</button>
        </div>

        <form onsubmit="handleSaveBusinessInfoSubmit(event)" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Store Name *</label>
              <input type="text" id="biz-store-name" required value="${business.storeName || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Store Tagline *</label>
              <input type="text" id="biz-tagline" required value="${business.tagline || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Business Registration No *</label>
              <input type="text" id="biz-reg-no" required value="${business.registrationNo || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Tax ID / VAT *</label>
              <input type="text" id="biz-tax-id" required value="${business.taxId || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Support Hotline *</label>
              <input type="text" id="biz-hotline" required value="${business.hotline || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Official Support Email *</label>
              <input type="email" id="biz-email" required value="${business.supportEmail || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">National Headquarters Address *</label>
            <input type="text" id="biz-hq" required value="${business.headquarters || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">ISO Certification Tag *</label>
              <input type="text" id="biz-iso" required value="${business.isoCert || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Operating Hours *</label>
              <input type="text" id="biz-hours" required value="${business.workingHours || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Mission Statement *</label>
            <textarea id="biz-mission" rows="2" required class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">${business.mission || ''}</textarea>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Company Story *</label>
            <textarea id="biz-story" rows="3" required class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">${business.story || ''}</textarea>
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm">Save Profile Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Handle Business Profile Form Submit
 */
export async function handleSaveBusinessInfoSubmit(e) {
  e.preventDefault();
  const current = getBusinessInfo();

  const updated = {
    ...current,
    storeName: document.getElementById('biz-store-name').value.trim(),
    tagline: document.getElementById('biz-tagline').value.trim(),
    registrationNo: document.getElementById('biz-reg-no').value.trim(),
    taxId: document.getElementById('biz-tax-id').value.trim(),
    hotline: document.getElementById('biz-hotline').value.trim(),
    supportEmail: document.getElementById('biz-email').value.trim(),
    headquarters: document.getElementById('biz-hq').value.trim(),
    isoCert: document.getElementById('biz-iso').value.trim(),
    workingHours: document.getElementById('biz-hours').value.trim(),
    mission: document.getElementById('biz-mission').value.trim(),
    story: document.getElementById('biz-story').value.trim()
  };

  const confirmed = await etechAlert.confirmUpdate('Corporate Business Profile', 'Updates will be visible across customer invoices, storefront footer, and legal pages.');
  if (!confirmed) return;

  saveBusinessInfo(updated);
  if (window.closeAdminModal) window.closeAdminModal();
  renderPoliciesTab();
  showToast('Corporate Business Profile updated successfully!', 'success');
}

/**
 * Open Legal Policy Document Editor Modal
 */
let editingPolicySections = [];

export function openPolicyEditorModal(policyKey) {
  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  const policies = getStoredPolicies();
  const policy = policies[policyKey] || DEFAULT_LEGAL_POLICIES[policyKey];
  if (!policy) return;

  editingPolicySections = JSON.parse(JSON.stringify(policy.sections || []));

  renderPolicyModalContent(policyKey, policy);
}

function renderPolicyModalContent(policyKey, policy) {
  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Edit Policy Document: ${policy.title}</h3>
            <span class="text-[10px] text-blue-600 font-mono">Route: #${policyKey}</span>
          </div>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] text-lg font-bold">&times;</button>
        </div>

        <form onsubmit="handleSavePolicySubmit(event, '${policyKey}')" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Document Title *</label>
              <input type="text" id="edit-pol-title" required value="${policy.title || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Last Updated Date Tag *</label>
              <input type="text" id="edit-pol-date" required value="${policy.lastUpdated || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Subtitle / Purpose *</label>
            <input type="text" id="edit-pol-subtitle" required value="${policy.subtitle || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <!-- Document Clauses List -->
          <div class="space-y-3 pt-2">
            <div class="flex items-center justify-between">
              <h4 class="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Document Clauses & Sections (${editingPolicySections.length})</h4>
              <button type="button" onclick="addClauseSection('${policyKey}')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-bold border border-blue-200 flex items-center space-x-1 shadow-sm">
                <span>+ Add Clause</span>
              </button>
            </div>

            <div id="policy-clauses-container" class="space-y-3">
              ${editingPolicySections.map((sec, idx) => `
                <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3.5 space-y-2 relative">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono font-bold text-blue-600 uppercase">Clause #${idx + 1}</span>
                    <button type="button" onclick="removeClauseSection(${idx}, '${policyKey}')" class="text-rose-600 hover:text-rose-700 text-xs font-bold">Remove</button>
                  </div>
                  <input type="text" id="clause-heading-${idx}" value="${sec.heading || ''}" placeholder="Clause Heading (e.g. 1. Information We Collect)" class="w-full px-2.5 py-1.5 rounded bg-white border border-[#e2e8f0] text-[#0f172a] text-xs focus:border-blue-600 font-semibold">
                  <textarea id="clause-content-${idx}" rows="2" placeholder="Clause description..." class="w-full px-2.5 py-1.5 rounded bg-white border border-[#e2e8f0] text-[#475569] text-xs focus:border-blue-600">${sec.content || ''}</textarea>
                  <input type="text" id="clause-bullets-${idx}" value="${sec.bulletPoints || (sec.bullets || []).join(' | ')}" placeholder="Bullet items separated by | (pipe)" class="w-full px-2.5 py-1.5 rounded bg-white border border-[#e2e8f0] text-[#64748b] text-xs focus:border-blue-600">
                </div>
              `).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm">Save Policy Document</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function addClauseSection(policyKey) {
  syncCurrentModalClauses();
  editingPolicySections.push({
    heading: `${editingPolicySections.length + 1}. New Clause Heading`,
    content: "Detailed description of legal clause...",
    bulletPoints: "",
    bullets: []
  });
  const policies = getStoredPolicies();
  renderPolicyModalContent(policyKey, policies[policyKey] || DEFAULT_LEGAL_POLICIES[policyKey]);
}

export function removeClauseSection(idx, policyKey) {
  syncCurrentModalClauses();
  editingPolicySections.splice(idx, 1);
  const policies = getStoredPolicies();
  renderPolicyModalContent(policyKey, policies[policyKey] || DEFAULT_LEGAL_POLICIES[policyKey]);
}

function syncCurrentModalClauses() {
  editingPolicySections.forEach((sec, idx) => {
    const headEl = document.getElementById(`clause-heading-${idx}`);
    const contEl = document.getElementById(`clause-content-${idx}`);
    const bullEl = document.getElementById(`clause-bullets-${idx}`);
    if (headEl) sec.heading = headEl.value;
    if (contEl) sec.content = contEl.value;
    if (bullEl) {
      const val = bullEl.value.trim();
      sec.bulletPoints = val;
      sec.bullets = val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];
    }
  });
}

export async function handleSavePolicySubmit(e, policyKey) {
  e.preventDefault();
  syncCurrentModalClauses();

  const title = document.getElementById('edit-pol-title').value.trim();
  const subtitle = document.getElementById('edit-pol-subtitle').value.trim();
  const lastUpdated = document.getElementById('edit-pol-date').value.trim();

  const updatedPolicy = {
    title,
    subtitle,
    lastUpdated,
    sections: editingPolicySections
  };

  const confirmed = await etechAlert.confirmUpdate(`Policy Document "${title}"`, `${editingPolicySections.length} clauses/sections will be published to #${policyKey}.`);
  if (!confirmed) return;

  updatePolicyDocument(policyKey, updatedPolicy);
  if (window.closeAdminModal) window.closeAdminModal();
  renderPoliciesTab();
  showToast(`${title} document saved successfully!`, 'success');
}
