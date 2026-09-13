// ============================================================
//  transfer_management_controller.js — Inter-Branch Stock Transfers & Logistics Controller
// ============================================================
import {
  getStockTransfers,
  createStockTransfer,
  dispatchStockTransfer,
  receiveStockTransfer,
  cancelStockTransfer,
  getTransfersMetrics,
  syncTransfersFromApi
} from '../models/transfers_data.js';
import { getStoredProducts } from '../models/data.js';
import { getBranches } from './branch_controller.js';
import { showToast } from '../util/toast.js';
import { etechAlert } from '../util/etech_alert.js';
import { closeAdminModal, renderOverviewTab } from './admin_dashboard_controller.js';
import { getCurrentUser } from './login_controller.js';
import {
  iconTruck,
  iconCheck,
  iconClipboard,
  iconPackage,
  iconClose,
  iconLayers,
  iconScale,
  iconBolt,
  iconUser
} from '../util/icons.js';
import {
  renderTransferStatusBadge
} from '../util/ui_helpers.js';

let transferSearchQuery = '';
let activeStatusFilter = 'all';
let activeReasonFilter = 'all';

/**
 * Main Entry: Renders the Inter-Branch Stock Transfers & Logistics tab
 */
export async function renderTransfersTab() {
  const container = document.getElementById('tab-panel-transfers');
  if (!container) return;

  try {
    await syncTransfersFromApi();
  } catch (err) {
    etechAlert.error('Connection Error', 'Failed to synchronize transfer logs. Please try again.');
    container.innerHTML = `
      <div class="p-8 text-center bg-white rounded-2xl border border-rose-200 shadow-sm max-w-lg mx-auto my-12 space-y-3">
        <p class="text-base font-extrabold text-rose-600">⚠️ Service Unavailable</p>
        <p class="text-xs text-[#64748b]">Unable to fetch stock transfers. Please try again.</p>
      </div>
    `;
    return;
  }

  const activeUser = getCurrentUser();
  const transfers = getStockTransfers();
  const metrics = getTransfersMetrics();

  // Filter transfers
  let filtered = transfers;
  if (activeStatusFilter !== 'all') {
    filtered = filtered.filter(t => t.status.toLowerCase() === activeStatusFilter.toLowerCase());
  }
  if (activeReasonFilter !== 'all') {
    filtered = filtered.filter(t => t.reason.toLowerCase().includes(activeReasonFilter.toLowerCase()));
  }
  if (transferSearchQuery.trim()) {
    const q = transferSearchQuery.toLowerCase();
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.referenceNo.toLowerCase().includes(q) ||
      t.productName.toLowerCase().includes(q) ||
      t.productSku.toLowerCase().includes(q) ||
      t.fromBranchName.toLowerCase().includes(q) ||
      t.toBranchName.toLowerCase().includes(q) ||
      (t.trackingCode && t.trackingCode.toLowerCase().includes(q))
    );
  }

  container.innerHTML = `
    <div class="space-y-6 max-w-7xl mx-auto pb-12">

      <!-- Top Header & Primary Action -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center space-x-2">
            <span class="px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-black uppercase whitespace-nowrap">
              INTER-BRANCH LOGISTICS & WAREHOUSE TRANSFERS
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
              LEDGER VERIFIED
            </span>
          </div>
          <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight mt-1.5">Stock Transfers & Logistics Control</h2>
          <p class="text-xs text-[#64748b] mt-0.5">
            ${activeUser && activeUser.isStaff() 
              ? `Logged in as Staff (${activeUser.assignedBranch || 'Assigned Branch'}) • Request inbound stock or dispatch outbound transfer orders.` 
              : 'Track multi-branch inventory movements, stage bundle kit assemblies, and verify inbound/outbound dispatches.'}
          </p>
        </div>

        <button onclick="openInitiateTransferModal()" 
          class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>+ ${activeUser && activeUser.isStaff() ? 'Request Stock Transfer' : 'Initiate Stock Transfer'}</span>
        </button>
      </div>

      <!-- KPI Metrics Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <!-- Card 1: In Transit -->
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#64748b] uppercase tracking-wider">In-Transit Shipments</span>
            <span class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-200">${iconTruck('w-4 h-4')}</span>
          </div>
          <div class="flex items-baseline space-x-2 mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-[#0f172a]">${metrics.inTransit}</span>
            <span class="text-xs font-bold text-amber-600 animate-pulse">● Active on route</span>
          </div>
          <p class="text-[11px] text-[#64748b] mt-1">Dispatched inventory en route between hubs.</p>
        </div>

        <!-- Card 2: Received & Verified -->
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#64748b] uppercase tracking-wider">Completed Transfers</span>
            <span class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-200">${iconCheck('w-4 h-4')}</span>
          </div>
          <div class="flex items-baseline space-x-2 mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">${metrics.received}</span>
            <span class="text-xs font-bold text-slate-400">Transfers</span>
          </div>
          <p class="text-[11px] text-[#64748b] mt-1">Stock credited and verified at destination.</p>
        </div>

        <!-- Card 3: Requested / Pending Dispatch -->
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#64748b] uppercase tracking-wider">Pending Approval</span>
            <span class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">${iconClipboard('w-4 h-4')}</span>
          </div>
          <div class="flex items-baseline space-x-2 mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-blue-600">${metrics.requested}</span>
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">Awaiting Dispatch</span>
          </div>
          <p class="text-[11px] text-[#64748b] mt-1">Requests waiting for source hub verification.</p>
        </div>

        <!-- Card 4: Total Units Moved -->
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#64748b] uppercase tracking-wider">Total Hardware Moved</span>
            <span class="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-200">${iconPackage('w-4 h-4')}</span>
          </div>
          <div class="flex items-baseline space-x-2 mt-2">
            <span class="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700">${metrics.totalUnits}</span>
            <span class="text-xs font-bold text-slate-400">Total Units</span>
          </div>
          <p class="text-[11px] text-[#64748b] mt-1">Gross physical inventory items transferred.</p>
        </div>

      </div>

      <!-- Filters, Search & Status Navigation Bar -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 shadow-sm space-y-3">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          <!-- Status Filter Tabs -->
          <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 w-full md:w-auto">
            ${[
              { id: 'all', label: 'All Transfers', count: transfers.length, icon: null },
              { id: 'requested', label: 'Requested', count: metrics.requested, icon: iconClipboard('w-3.5 h-3.5') },
              { id: 'in transit', label: 'In Transit', count: metrics.inTransit, icon: iconTruck('w-3.5 h-3.5') },
              { id: 'received', label: 'Received', count: metrics.received, icon: iconCheck('w-3.5 h-3.5') },
              { id: 'cancelled', label: 'Cancelled', count: metrics.cancelled, icon: iconClose('w-3.5 h-3.5') }
            ].map(tab => `
              <button onclick="filterTransfersByStatus('${tab.id}')"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
                  activeStatusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#f8fafc] text-[#475569] border border-[#e2e8f0] hover:bg-slate-100 hover:text-[#0f172a]'
                }">
                ${tab.icon ? `<span>${tab.icon}</span>` : ''}
                <span>${tab.label}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeStatusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }">${tab.count}</span>
              </button>
            `).join('')}
          </div>

          <!-- Search Input Bar -->
          <div class="relative w-full md:w-72">
            <input type="text" id="transfer-search-input" value="${transferSearchQuery}" oninput="handleTransferSearch(this.value)"
              placeholder="Search Transfer ID, SKU, Product, or Hub..."
              class="w-full pl-9 pr-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs font-semibold focus:border-blue-600 focus:outline-none">
            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

        </div>
      </div>

      <!-- Transfers Ledger Table -->
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#475569]">
            <thead class="bg-[#f8fafc] border-b border-[#e2e8f0] text-[10px] font-mono uppercase text-[#64748b] tracking-wider">
              <tr>
                <th class="p-4 min-w-[150px]">Transfer Ref / ID</th>
                <th class="p-4 min-w-[200px]">Product Details</th>
                <th class="p-4 min-w-[220px]">Source Hub ➔ Destination Hub</th>
                <th class="p-4 text-center min-w-[70px] whitespace-nowrap">Qty</th>
                <th class="p-4 min-w-[170px]">Reason / Allocation</th>
                <th class="p-4 text-center min-w-[130px] whitespace-nowrap">Status</th>
                <th class="p-4 text-right min-w-[180px] whitespace-nowrap">Logistics Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e2e8f0]">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="7" class="p-12 text-center text-[#64748b]">
                    <div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3 shadow-2xs">
                      ${iconTruck('w-6 h-6 text-amber-600')}
                    </div>
                    <p class="text-sm font-bold text-[#0f172a]">No Stock Transfers Found</p>
                    <p class="text-xs text-slate-400 mt-1">No transfer records match your active search or filter criteria.</p>
                  </td>
                </tr>
              ` : filtered.map(t => {
                const isRequested = t.status === 'Requested';
                const isTransit = t.status === 'In Transit';
                const isReceived = t.status === 'Received';
                const isCancelled = t.status === 'Cancelled';

                const canDispatchFromSource = activeUser && (activeUser.hasGlobalAccess() || activeUser.assignedBranch === t.fromBranchId);
                const canReceiveAtDestination = activeUser && (activeUser.hasGlobalAccess() || activeUser.assignedBranch === t.toBranchId);

                return `
                  <tr class="hover:bg-[#f8fafc] transition-colors">
                    
                    <!-- ID & Tracking Code -->
                    <td class="p-4">
                      <div class="font-mono font-bold text-[#0f172a] text-xs whitespace-nowrap">${t.id}</div>
                      <div class="text-[10px] text-blue-600 font-mono font-semibold whitespace-nowrap">${t.trackingCode}</div>
                      <div class="text-[9px] text-[#94a3b8] font-mono whitespace-nowrap">${new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>

                    <!-- Product Details -->
                    <td class="p-4">
                      <div class="flex items-center space-x-2.5">
                        <img src="${t.productImage || 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=100&q=80'}" 
                          class="w-10 h-10 object-cover rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex-shrink-0">
                        <div class="min-w-0">
                          <p class="font-bold text-[#0f172a] line-clamp-1">${t.productName}</p>
                          <p class="text-[10px] text-blue-600 font-mono font-semibold">${t.productSku}</p>
                        </div>
                      </div>
                    </td>

                    <!-- Route -->
                    <td class="p-4">
                      <div class="flex items-center space-x-2 text-xs font-semibold whitespace-nowrap">
                        <span class="text-[#0f172a] font-bold ${activeUser && activeUser.assignedBranch === t.fromBranchId ? 'text-blue-700' : ''}">${t.fromBranchName}</span>
                        <span class="text-blue-600 font-bold">➔</span>
                        <span class="text-[#0f172a] font-bold ${activeUser && activeUser.assignedBranch === t.toBranchId ? 'text-emerald-700' : ''}">${t.toBranchName}</span>
                      </div>
                      <div class="text-[10px] text-[#64748b] font-mono mt-0.5 whitespace-nowrap">${t.driverOrCourier || 'Internal Logistics'}</div>
                    </td>

                    <!-- Qty -->
                    <td class="p-4 text-center font-mono font-bold text-sm text-[#0f172a] whitespace-nowrap">
                      <span class="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 inline-block">${t.quantity}</span>
                    </td>

                    <!-- Reason -->
                    <td class="p-4">
                      <div class="text-xs font-bold text-[#0f172a]">${t.reason}</div>
                      ${t.bundleTitle ? `
                        <span class="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mt-1 whitespace-nowrap shadow-2xs">
                          ${iconLayers('w-3 h-3 text-blue-600 flex-shrink-0')}
                          <span>${t.bundleTitle}</span>
                        </span>
                      ` : ''}
                      ${t.notes ? `<p class="text-[10px] text-[#64748b] line-clamp-1 mt-0.5">${t.notes}</p>` : ''}
                    </td>

                    <!-- Status Badge -->
                    <td class="p-4 text-center whitespace-nowrap">
                      ${renderTransferStatusBadge(t.status)}
                    </td>

                    <!-- Actions -->
                    <td class="p-4 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end space-x-1.5">
                        
                        <!-- Step 1: Requested -> Source Branch Approves & Dispatches -->
                        ${isRequested && canDispatchFromSource ? `
                          <button onclick="handleApproveDispatchTransfer('${t.id}')"
                            class="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                            title="Approve request and dispatch stock from ${t.fromBranchName}">
                            ${iconTruck('w-3.5 h-3.5 text-white')}
                            <span>Approve & Dispatch</span>
                          </button>
                        ` : ''}

                        <!-- Step 2: In Transit -> Destination Branch Confirms Receipt -->
                        ${isTransit && canReceiveAtDestination ? `
                          <button onclick="handleReceiveTransfer('${t.id}')"
                            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[11px] shadow-sm transition-all inline-flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
                            title="Verify and credit inventory at ${t.toBranchName}">
                            ${iconCheck('w-3.5 h-3.5 text-white')}
                            <span>Confirm Receipt</span>
                          </button>
                        ` : ''}

                        <button onclick="viewTransferManifestModal('${t.id}')"
                          class="px-2.5 py-1 bg-[#f8fafc] hover:bg-blue-50 text-[#0f172a] hover:text-blue-600 border border-[#e2e8f0] font-bold rounded-xl text-[11px] transition-all cursor-pointer whitespace-nowrap"
                          title="View complete transfer bill of lading manifest">
                          Manifest
                        </button>

                        ${(isRequested || isTransit) && (canDispatchFromSource || canReceiveAtDestination) ? `
                          <button onclick="handleCancelTransfer('${t.id}')"
                            class="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Reject / Cancel transfer">
                            ${iconClose('w-4 h-4')}
                          </button>
                        ` : ''}
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

export function filterTransfersByStatus(status) {
  activeStatusFilter = status;
  renderTransfersTab();
}

export function handleTransferSearch(query) {
  transferSearchQuery = query;
  renderTransfersTab();
}

/**
 * Approve & Dispatch transfer from Source Branch
 */
export async function handleApproveDispatchTransfer(transferId) {
  const activeUser = getCurrentUser();
  const userName = activeUser ? `${activeUser.name} (${activeUser.assignedBranch || 'Admin'})` : 'Branch Dispatch';

  const confirmed = await etechAlert.confirm({
    title: `Approve & Dispatch Transfer ${transferId}?`,
    message: 'Inventory will be immediately deducted from the source branch and marked as In Transit.',
    type: 'create',
    confirmText: 'Dispatch Cargo',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  try {
    const res = await dispatchStockTransfer(transferId, userName);
    if (res.success) {
      showToast(`Transfer ${transferId} approved and dispatched! Stock deducted from ${res.transfer.fromBranchName}.`, 'success');
      await renderTransfersTab();
      if (typeof renderOverviewTab === 'function') renderOverviewTab();
    } else {
      etechAlert.error('Dispatch Failed', res.message);
    }
  } catch (err) {
    etechAlert.error('Dispatch Failed', err.message || 'An error occurred during dispatch. Please try again.');
  }
}

/**
 * Receive transfer at Destination Branch
 */
export async function handleReceiveTransfer(transferId) {
  const activeUser = getCurrentUser();
  const userName = activeUser ? `${activeUser.name} (${activeUser.assignedBranch || 'Admin'})` : 'Destination Verification';

  const confirmed = await etechAlert.confirm({
    title: `Receive & Ingest Transfer ${transferId}?`,
    message: 'Cargo will be verified and added to the destination branch inventory balance.',
    type: 'success',
    confirmText: 'Acknowledge Receipt',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  try {
    const res = await receiveStockTransfer(transferId, userName);
    if (res.success) {
      showToast(`Transfer ${transferId} successfully received & credited to ${res.transfer.toBranchName}!`, 'success');
      await renderTransfersTab();
      if (typeof renderOverviewTab === 'function') renderOverviewTab();
    } else {
      etechAlert.error('Receipt Failed', res.message);
    }
  } catch (err) {
    etechAlert.error('Receipt Failed', err.message || 'An error occurred during receipt acknowledgment. Please try again.');
  }
}

/**
 * Cancel or Reject transfer
 */
export async function handleCancelTransfer(transferId) {
  const activeUser = getCurrentUser();
  const userName = activeUser ? activeUser.name : 'Administrator';

  const reason = await etechAlert.prompt(
    `Cancel / Reject Transfer #${transferId}`,
    'Please enter the operational reason for cancelling or rejecting this stock transfer:',
    {
      placeholder: 'e.g. Stock no longer required or discrepancy found',
      defaultValue: 'Requested by branch supervisor',
      type: 'warning'
    }
  );

  if (reason !== null && reason.trim() !== '') {
    try {
      const res = await cancelStockTransfer(transferId, reason || 'Cancelled by staff/admin', userName);
      if (res.success) {
        showToast(`Transfer ${transferId} cancelled.`, 'info');
        await renderTransfersTab();
        if (typeof renderOverviewTab === 'function') renderOverviewTab();
      } else {
        etechAlert.error('Cancellation Error', res.message);
      }
    } catch (err) {
      etechAlert.error('Cancellation Error', err.message || 'An error occurred during cancellation. Please try again.');
    }
  }
}

/**
 * Open Modal to Initiate / Request a Transfer
 */
export function openInitiateTransferModal(prefill = null) {
  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  const activeUser = getCurrentUser();
  const products = getStoredProducts();
  const branches = getBranches();

  // If Staff, destination is strictly their assigned branch
  const isStaffUser = activeUser && activeUser.isStaff();
  const staffBranchId = isStaffUser ? activeUser.assignedBranch : null;

  let selectedProductId = 1;
  if (prefill) {
    selectedProductId = typeof prefill === 'object' ? prefill.productId : Number(prefill);
  } else if (products.length > 0) {
    selectedProductId = products[0].id;
  }

  modalContainer.innerHTML = `
    <div class="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-[#e2e8f0] my-8 space-y-4">
        
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div class="flex items-center space-x-3">
            <span class="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shadow-2xs">
              ${iconTruck('w-5 h-5 text-blue-600')}
            </span>
            <div>
              <h3 class="text-base font-extrabold text-[#0f172a]">
                ${isStaffUser ? 'Request Stock Transfer (Inbound to Your Branch)' : 'Initiate Inter-Branch Stock Transfer'}
              </h3>
              <p class="text-xs text-[#64748b]">
                ${isStaffUser 
                  ? `Request stock from another warehouse into ${activeUser.assignedBranch}. Source branch will review and approve.` 
                  : 'Dispatch hardware inventory between regional warehouse branches.'}
              </p>
            </div>
          </div>
          <button onclick="closeAdminModal()" class="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
            ${iconClose('w-4 h-4')}
          </button>
        </div>

        <form id="transfer-initiate-form" onsubmit="handleSaveTransferSubmit(event)" class="space-y-4 text-xs">
          
          <!-- Product Selector -->
          <div>
            <label class="block font-bold text-[#0f172a] mb-1">Select Hardware Product *</label>
            <select id="tf-product-id" onchange="updateTransferProductDetails(this.value)" required
              class="w-full px-3.5 py-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-bold focus:border-blue-600 focus:outline-none">
              ${products.map(p => `
                <option value="${p.id}" ${p.id === selectedProductId ? 'selected' : ''}>
                  ${p.name} — SKU: ${p.sku} (Total: ${p.totalStock} units)
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Product Live Branch Inventory Matrix Preview -->
          <div id="tf-branch-stock-preview" class="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1.5">
            <!-- Rendered by updateTransferProductDetails() -->
          </div>

          <!-- Source & Destination Branches -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#0f172a] mb-1">From Source Branch (Sender) *</label>
              <select id="tf-from-branch" onchange="validateTransferSourceStock()" required
                class="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] font-bold focus:border-blue-600 focus:outline-none">
                ${branches
                  .filter(b => !isStaffUser || b.id !== staffBranchId)
                  .map(b => `
                    <option value="${b.id}" ${prefill && prefill.fromBranchId === b.id ? 'selected' : ''}>
                      ${b.name} (${b.city})
                    </option>
                  `).join('')}
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#0f172a] mb-1">To Destination Hub (Receiver) *</label>
              ${isStaffUser ? `
                <input type="hidden" id="tf-to-branch" value="${staffBranchId}">
                <div class="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 font-extrabold flex items-center justify-between">
                  <span>${branches.find(b => b.id === staffBranchId)?.name || staffBranchId}</span>
                  <span class="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-sky-300">Your Branch</span>
                </div>
              ` : `
                <select id="tf-to-branch" required
                  class="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] font-bold focus:border-blue-600 focus:outline-none">
                  ${branches.map(b => `
                    <option value="${b.id}" ${prefill && prefill.toBranchId === b.id ? 'selected' : (b.id === 'BR-COL' ? 'selected' : '')}>
                      ${b.name} (${b.city})
                    </option>
                  `).join('')}
                </select>
              `}
            </div>
          </div>

          <!-- Quantity & Reason -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#0f172a] mb-1">Transfer Quantity (Units) *</label>
              <input type="number" id="tf-qty" min="1" max="999" value="${prefill && prefill.qty ? prefill.qty : 1}" required
                class="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] font-mono font-bold focus:border-blue-600 focus:outline-none">
              <span id="tf-source-avail-note" class="text-[10px] text-blue-600 font-bold block mt-1"></span>
            </div>

            <div>
              <label class="block font-bold text-[#0f172a] mb-1">Transfer Purpose / Reason</label>
              <select id="tf-reason" class="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] font-semibold focus:border-blue-600 focus:outline-none">
                <option value="Low Stock Rebalance">Low Stock Rebalance</option>
                <option value="Deal Bundle Kit Assembly" ${prefill && prefill.reason === 'Deal Bundle Kit Assembly' ? 'selected' : ''}>Deal Bundle Kit Assembly</option>
                <option value="Customer Order Reservation">Customer Order Reservation</option>
                <option value="Emergency Restock">Emergency Restock</option>
              </select>
            </div>
          </div>

          <!-- Logistics & Tracking Notes -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-[#0f172a] mb-1">Driver / Logistics Fleet</label>
              <input type="text" id="tf-driver" value="ETech Logistics Fleet #01"
                class="w-full px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] focus:border-blue-600 focus:outline-none">
            </div>
            <div>
              <label class="block font-bold text-[#0f172a] mb-1">Tracking Waybill / Code</label>
              <input type="text" id="tf-tracking" value="ET-LOG-${Math.floor(1000 + Math.random() * 9000)}"
                class="w-full px-3 py-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] font-mono focus:border-blue-600 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block font-bold text-[#0f172a] mb-1">Notes / Instructions</label>
            <input type="text" id="tf-notes" value="${prefill && prefill.notes ? prefill.notes : ''}" placeholder="e.g. Expedited delivery for customer reservation."
              class="w-full px-3.5 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[#0f172a] focus:border-blue-600 focus:outline-none">
          </div>

          ${!isStaffUser ? `
            <!-- Dispatch Mode Option (Admin only) -->
            <div class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span class="font-bold text-blue-900 block">Instant Warehouse Delivery (Auto-Receive)</span>
                <span class="text-[10px] text-blue-700">Check to instantly credit stock to destination without transit delay.</span>
              </div>
              <input type="checkbox" id="tf-instant" class="w-4 h-4 text-blue-600 rounded">
            </div>
          ` : `
            <input type="hidden" id="tf-instant" value="false">
          `}

          <!-- Buttons -->
          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-3">
            <button type="button" onclick="closeAdminModal()"
              class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] font-bold text-xs rounded-xl border border-[#e2e8f0]">
              Cancel
            </button>
            <button type="submit"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all">
              ${isStaffUser ? 'Submit Transfer Request' : 'Dispatch Transfer'}
            </button>
          </div>

        </form>

      </div>
    </div>
  `;

  updateTransferProductDetails(selectedProductId);
}

export function updateTransferProductDetails(productId) {
  const products = getStoredProducts();
  const branches = getBranches();
  const p = products.find(prod => prod.id === Number(productId));
  const preview = document.getElementById('tf-branch-stock-preview');
  if (!p || !preview) return;

  preview.innerHTML = `
    <div class="flex items-center justify-between text-[11px] font-bold text-[#0f172a] mb-1">
      <span>Live Inventory Across Branch Hubs:</span>
      <span class="text-blue-600 font-mono">Total: ${p.totalStock} units</span>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      ${branches.map(b => {
        const qty = (p.branchStock && p.branchStock[b.id]) || 0;
        return `
          <div class="p-1.5 rounded-lg border ${qty > 0 ? 'bg-white border-blue-200' : 'bg-slate-100 border-slate-200 opacity-60'} text-center">
            <span class="text-[10px] font-semibold text-[#64748b] block">${b.city}</span>
            <span class="text-xs font-mono font-extrabold ${qty > 0 ? 'text-blue-600' : 'text-slate-400'}">${qty} in stock</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  validateTransferSourceStock();
}

export function validateTransferSourceStock() {
  const productId = Number(document.getElementById('tf-product-id')?.value);
  const fromBranchId = document.getElementById('tf-from-branch')?.value;
  const note = document.getElementById('tf-source-avail-note');
  const qtyInput = document.getElementById('tf-qty');

  const products = getStoredProducts();
  const p = products.find(prod => prod.id === productId);
  if (!p || !note) return;

  const avail = (p.branchStock && p.branchStock[fromBranchId]) || 0;
  note.textContent = `Available at source branch: ${avail} units`;
  if (qtyInput) {
    qtyInput.max = Math.max(1, avail);
  }
}

export async function handleSaveTransferSubmit(event) {
  if (event) event.preventDefault();

  const activeUser = getCurrentUser();
  const productId = Number(document.getElementById('tf-product-id').value);
  const fromBranchId = document.getElementById('tf-from-branch').value;
  const toBranchId = document.getElementById('tf-to-branch').value;
  const quantity = Number(document.getElementById('tf-qty').value);
  const reason = document.getElementById('tf-reason').value;
  const driverOrCourier = document.getElementById('tf-driver').value.trim();
  const trackingCode = document.getElementById('tf-tracking').value.trim();
  const notes = document.getElementById('tf-notes').value.trim();
  const instantCheckbox = document.getElementById('tf-instant');
  const instantDelivery = instantCheckbox ? instantCheckbox.checked : false;

  if (fromBranchId === toBranchId) {
    etechAlert.warning('Invalid Branches', 'Source and Destination branches must be different.');
    return;
  }

  const confirmed = await etechAlert.confirm({
    title: 'Initiate Stock Transfer?',
    message: `Transfer ${quantity} units from source branch (${fromBranchId}) to destination branch (${toBranchId})?`,
    type: 'create',
    confirmText: 'Initiate Transfer',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  const isStaff = activeUser && activeUser.isStaff();
  const requestedStatus = isStaff ? "Requested" : (instantDelivery ? "Received" : "In Transit");

  try {
    const res = await createStockTransfer({
      productId,
      fromBranchId,
      toBranchId,
      quantity,
      reason,
      driverOrCourier,
      trackingCode,
      notes,
      instantDelivery,
      status: requestedStatus,
      requestedBy: activeUser ? `${activeUser.name} (${activeUser.role})` : "Staff Member"
    });

    if (res.success) {
      if (isStaff) {
        showToast(`Transfer request #${res.transfer.id} submitted! Waiting for ${res.transfer.fromBranchName} approval.`, 'success');
      } else {
        showToast(`Stock transfer ${res.transfer.id} initiated successfully!`, 'success');
      }
      closeAdminModal();
      await renderTransfersTab();
      if (typeof renderOverviewTab === 'function') renderOverviewTab();
    } else {
      etechAlert.error('Transfer Failed', res.message);
    }
  } catch (err) {
    etechAlert.error('Transfer Failed', err.message || 'An error occurred during transfer creation. Please try again.');
  }
}

/**
 * View Detailed Transfer Bill of Lading Manifest Modal
 */
export function viewTransferManifestModal(transferId) {
  const list = getStockTransfers();
  const t = list.find(tr => tr.id === transferId);
  if (!t) return;

  const modalContainer = document.getElementById('admin-modal-container');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e8f0] my-8 space-y-4">
        
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div>
            <div class="flex items-center space-x-2">
              <span class="text-xs font-mono font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">${t.id}</span>
              <span class="text-xs font-mono text-[#64748b]">${t.referenceNo}</span>
            </div>
            <h3 class="text-base font-extrabold text-[#0f172a] mt-1">Inter-Branch Transfer Manifest</h3>
          </div>
          <button onclick="closeAdminModal()" class="text-slate-400 hover:text-slate-700 text-xl font-bold">&times;</button>
        </div>

        <div class="space-y-3.5 text-xs text-[#475569]">
          
          <!-- Route -->
          <div class="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl flex items-center justify-between">
            <div>
              <span class="text-[10px] font-mono text-[#64748b] block">DISPATCH SOURCE</span>
              <span class="font-extrabold text-[#0f172a] text-sm">${t.fromBranchName}</span>
            </div>
            <span class="text-xl text-blue-600 font-bold">➔</span>
            <div class="text-right">
              <span class="text-[10px] font-mono text-[#64748b] block">DESTINATION WAREHOUSE</span>
              <span class="font-extrabold text-[#0f172a] text-sm">${t.toBranchName}</span>
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-3 bg-white border border-[#e2e8f0] rounded-xl flex items-center space-x-3">
            <img src="${t.productImage}" class="w-12 h-12 object-cover rounded-lg border border-[#e2e8f0]">
            <div class="flex-1">
              <span class="font-extrabold text-[#0f172a] text-xs block">${t.productName}</span>
              <span class="text-[10px] font-mono text-blue-600 font-bold">SKU: ${t.productSku}</span>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-mono text-[#64748b] block">QUANTITY</span>
              <span class="text-base font-extrabold font-mono text-blue-600">${t.quantity} Units</span>
            </div>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-2 gap-3 p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl">
            <div>
              <span class="text-[10px] font-mono text-[#64748b] block">TRANSFER REASON</span>
              <span class="font-bold text-[#0f172a]">${t.reason}</span>
            </div>
            <div>
              <span class="text-[10px] font-mono text-[#64748b] block">LOGISTICS CARRIER</span>
              <span class="font-bold text-[#0f172a]">${t.driverOrCourier || 'Fleet Fleet'}</span>
            </div>
            <div>
              <span class="text-[10px] font-mono text-[#64748b] block">TRACKING CODE</span>
              <span class="font-mono font-bold text-blue-600">${t.trackingCode}</span>
            </div>
            <div>
              <span class="text-[10px] font-mono text-[#64748b] block">CURRENT STATUS</span>
              <span class="font-bold ${t.status === 'Received' ? 'text-emerald-600' : 'text-amber-600'}">${t.status}</span>
            </div>
          </div>

          ${t.notes ? `
            <div class="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
              <span class="text-[10px] font-mono font-bold text-blue-800 block">SPECIAL INSTRUCTIONS / NOTES</span>
              <p class="text-xs text-[#0f172a] mt-0.5">${t.notes}</p>
            </div>
          ` : ''}

        </div>

        <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
          <span class="text-[10px] text-[#94a3b8] font-mono">ETech Logistics OS v2.4</span>
          <button onclick="closeAdminModal()"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm">
            Close Manifest
          </button>
        </div>

      </div>
    </div>
  `;
}
