import { getBranches, saveBranch, deleteBranch, getBranchById } from './branch_controller.js';
import { etechAlert, showToast } from '../util/index.js';

/**
 * ============================================================
 * TAB 4: BRANCH MANAGEMENT (ADMIN ONLY)
 * ============================================================
 */
export function renderBranchesTab() {
  const grid = document.getElementById('branches-list-grid');
  if (!grid) return;

  const branches = getBranches();

  grid.innerHTML = branches.map(b => `
    <div class="bg-white border border-[#e2e8f0] rounded-lg p-4 space-y-3.5 hover:border-[#cbd5e1] transition-colors shadow-sm">
      <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-2.5">
        <div>
          <span class="text-[9px] font-mono text-blue-600 uppercase tracking-widest font-bold">${b.id}</span>
          <h4 class="text-sm font-extrabold text-[#0f172a]">${b.name}</h4>
          <p class="text-[11px] text-[#64748b]">${b.city} Hub</p>
        </div>
        <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold ${b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
          ${b.status}
        </span>
      </div>

      <div class="space-y-1 text-xs text-[#475569]">
        <p>📍 <strong class="text-[#64748b]">Address:</strong> ${b.address}</p>
        <p>📞 <strong class="text-[#64748b]">Phone:</strong> ${b.phone}</p>
        <p>🚚 <strong class="text-[#64748b]">Base Shipping:</strong> Rs. ${b.baseShippingFee} + Rs. ${b.perKmFee}/km</p>
      </div>

      <div class="pt-2 border-t border-[#e2e8f0] flex items-center justify-end space-x-2">
        <button onclick="editBranch('${b.id}')" class="px-3 py-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 rounded-md text-xs font-bold border border-[#e2e8f0] transition-colors shadow-sm">Edit Branch</button>
        <button onclick="confirmDeleteBranch('${b.id}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-bold transition-colors shadow-sm">Delete</button>
      </div>
    </div>
  `).join('');
}

export async function confirmDeleteBranch(branchId) {
  const branch = getBranchById(branchId);
  const name = branch ? branch.name : `Branch #${branchId}`;

  const confirmed = await etechAlert.confirmDelete(
    `Branch "${name}"`,
    'Warning: Any staff assigned to this branch and local stock balances may be affected.'
  );

  if (!confirmed) return;

  deleteBranch(branchId);
  showToast(`Branch "${name}" deleted.`, 'info');
  renderBranchesTab();
}

export function openBranchModal(branchId = null) {
  const modal = document.getElementById('admin-modal-container');
  const branch = branchId ? getBranchById(branchId) : null;

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <h3 class="text-base font-extrabold text-[#0f172a]">${branch ? 'Edit Store Branch' : 'Add Store Branch'}</h3>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] text-lg font-bold">&times;</button>
        </div>

        <form onsubmit="handleSaveBranchSubmit(event, ${branch ? `'${branch.id}'` : 'null'})" class="space-y-3.5 text-xs">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Branch Name *</label>
            <input type="text" id="modal-b-name" required value="${branch ? branch.name : ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">City *</label>
              <input type="text" id="modal-b-city" required value="${branch ? branch.city : ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Phone *</label>
              <input type="text" id="modal-b-phone" required value="${branch ? branch.phone : ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Full Physical Address</label>
            <input type="text" id="modal-b-address" value="${branch ? branch.address : ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Base Shipping Fee (Rs.)</label>
              <input type="number" id="modal-b-basefee" value="${branch ? branch.baseShippingFee : 350}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Per KM Fee (Rs.)</label>
              <input type="number" id="modal-b-kmfee" value="${branch ? branch.perKmFee : 25}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm">Save Branch</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function editBranch(branchId) {
  openBranchModal(branchId);
}

export async function handleSaveBranchSubmit(e, branchId) {
  e.preventDefault();
  const branchData = {
    id: branchId,
    name: document.getElementById('modal-b-name').value.trim(),
    city: document.getElementById('modal-b-city').value.trim(),
    phone: document.getElementById('modal-b-phone').value.trim(),
    address: document.getElementById('modal-b-address').value.trim(),
    baseShippingFee: document.getElementById('modal-b-basefee').value,
    perKmFee: document.getElementById('modal-b-kmfee').value,
    status: 'Active'
  };

  const isEdit = Boolean(branchId);
  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Branch "${branchData.name}"`, `City: ${branchData.city} | Phone: ${branchData.phone}`)
    : await etechAlert.confirmCreate(`Branch "${branchData.name}"`, `City: ${branchData.city} | Phone: ${branchData.phone}`);

  if (!confirmed) return;

  saveBranch(branchData);
  if (window.closeAdminModal) window.closeAdminModal();
  renderBranchesTab();
  showToast(`Branch "${branchData.name}" saved successfully.`, 'success');
}