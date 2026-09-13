// ============================================================
//  src/js/controller/user_management_controller.js — Admin User Management Controller
// ============================================================
import { UserApi } from '../api/userApi.js';
import { getCurrentUser } from './login_controller.js';
import { getBranches } from './branch_controller.js';
import { getRoleBadge, buildRoleOptionsHtml, USER_ROLE, User } from '../models/user_model.js';
import {
  iconUser,
  iconShield,
  iconLock,
  iconEdit,
  iconTrash,
  iconClose,
  renderUserRoleBadge,
  renderUserStatusBadge,
  showToast,
  etechAlert
} from '../util/index.js';


let cachedUsers = [];
let userTypeFilter = 'all'; // 'all' | 'employees' | 'customers'

const EMPLOYEE_ROLES = ['SUPERADMIN', 'SUPER_ADMIN', 'ADMIN', 'STAFF'];

/**
 * Filter users by type toggle (All / Employees / Customers)
 */
export function filterUsersByType(type) {
  userTypeFilter = type || 'all';

  // Update toggle button styles
  const allBtn = document.getElementById('user-filter-all');
  const empBtn = document.getElementById('user-filter-employees');
  const custBtn = document.getElementById('user-filter-customers');

  const activeClass = 'bg-white text-[#0f172a] shadow-sm border border-[#e2e8f0]';
  const inactiveClass = 'text-[#64748b] hover:text-[#0f172a]';

  [allBtn, empBtn, custBtn].forEach(btn => {
    if (btn) {
      btn.className = btn.className.replace(/bg-white|text-\[#0f172a\]|shadow-sm|border|border-\[#e2e8f0\]|text-\[#64748b\]|hover:text-\[#0f172a\]/g, '').trim();
      btn.classList.add('px-4', 'py-1.5', 'text-xs', 'font-bold', 'rounded-md', 'transition-all');
    }
  });

  const activeBtn = type === 'employees' ? empBtn : (type === 'customers' ? custBtn : allBtn);
  const inactiveBtns = [allBtn, empBtn, custBtn].filter(b => b !== activeBtn);

  if (activeBtn) activeClass.split(' ').forEach(c => activeBtn.classList.add(c));
  inactiveBtns.forEach(btn => { if (btn) inactiveClass.split(' ').forEach(c => btn.classList.add(c)); });

  // Filter and re-render tbody
  reRenderUsersTableBody();
}

/**
 * Re-render users table body based on current filter
 */
function reRenderUsersTableBody() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody || cachedUsers.length === 0) return;

  const activeUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!activeUser) return;

  let filtered = cachedUsers;
  if (userTypeFilter === 'employees') {
    filtered = cachedUsers.filter(u => EMPLOYEE_ROLES.includes((u.role || '').toUpperCase()));
  } else if (userTypeFilter === 'customers') {
    filtered = cachedUsers.filter(u => (u.role || '').toUpperCase() === 'CUSTOMER');
  }

  const branches = getBranches();

  if (filtered.length === 0) {
    const label = userTypeFilter === 'employees' ? 'employee' : (userTypeFilter === 'customers' ? 'customer' : 'user');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-xs text-[#64748b]">
          No ${label} accounts found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(u => renderUserRow(u, activeUser, branches)).join('');
}

/**
 * Render a single user table row
 */
function renderUserRow(u, activeUser, branches) {
  const isSelf = activeUser.id === u.id;
  const formattedDate = u.createdAt
    ? (isNaN(new Date(u.createdAt).getTime()) ? u.createdAt : new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
    : '-';

  const branchDisplay = u.assignedBranch
    ? (branches.find(b => b.id === u.assignedBranch)?.name || u.assignedBranch)
    : '<span class="text-[#94a3b8]">-</span>';

  const userStatus = (u.status || 'ACTIVE').toUpperCase();
  const isStatusActive = userStatus === 'ACTIVE';

  const isSuper = Boolean(u.isSuperAdmin?.() || u.role === 'SUPERADMIN' || u.role === 'SUPER_ADMIN');
  const avatarClass = isStatusActive
    ? (isSuper ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200')
    : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60';

  return `
    <tr class="hover:bg-[#f8fafc] transition-colors">
      <td class="py-3 px-3.5">
        <div class="flex items-center space-x-2.5">
          <div class="w-7 h-7 rounded font-bold text-xs flex items-center justify-center border shadow-sm ${avatarClass}">
            ${u.getInitial()}
          </div>
          <div>
            <p class="font-bold text-[#0f172a] text-xs flex items-center gap-1.5">
              <span>${u.name || 'Unnamed'}</span>
              ${!isStatusActive ? `<span class="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">INACTIVE</span>` : ''}
            </p>
            <p class="text-[10px] text-blue-600 font-mono">@${u.username || u.id}</p>
          </div>
        </div>
      </td>
      <td class="py-3 px-3.5 font-mono text-[#475569] text-xs">${u.email || '-'}</td>
      <td class="py-3 px-3.5">
        ${getRoleBadge(u.role)}
      </td>
      <td class="py-3 px-3.5 text-xs text-[#475569]">
        ${branchDisplay}
      </td>
      <td class="py-3 px-3.5 text-[#64748b] text-xs">${formattedDate}</td>
      <td class="py-3 px-3.5 text-right">
        <div class="flex items-center justify-end space-x-1.5">
          <button onclick="openUserModal('${u.id}')" class="p-1.5 bg-[#f8fafc] hover:bg-[#f1f5f9] text-blue-600 rounded border border-[#e2e8f0] transition-colors shadow-sm" title="Edit User Details & Role">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <select onchange="changeUserStatus('${u.id}', this.value)" class="bg-[#f8fafc] border ${isStatusActive ? 'border-emerald-300 text-emerald-700 bg-emerald-50/60' : 'border-rose-300 text-rose-700 bg-rose-50/60'} rounded px-2 py-1 text-xs font-mono font-bold focus:border-blue-600 cursor-pointer shadow-sm" title="Change Account Status">
            <option value="ACTIVE" ${isStatusActive ? 'selected' : ''}>ACTIVE</option>
            <option value="INACTIVE" ${!isStatusActive ? 'selected' : ''}>INACTIVE</option>
          </select>
          <button onclick="confirmDeleteUser('${u.id}')" ${isSelf ? 'disabled' : ''} title="${isSelf ? 'Cannot delete active account' : 'Delete User Account'}"
            class="p-1.5 ${isSelf ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'} rounded border transition-colors shadow-sm">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Renders the User Directory Table inside Admin Dashboard
 * Fetches directory directly from database via backend API.
 */
export async function renderUsersTab() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  const activeUser = getCurrentUser();
  if (!activeUser) return;

  // Show loading skeleton / indicator
  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-xs text-[#64748b]">
        <div class="inline-flex items-center space-x-2">
          <svg class="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>Loading user directory from server...</span>
        </div>
      </td>
    </tr>
  `;

  try {
    const res = await UserApi.getUsers();
    const userList = Array.isArray(res) ? res : (res?.body || res?.data || []);
    cachedUsers = (Array.isArray(userList) ? userList : []).map(u => u instanceof User ? u : new User(u));

    if (cachedUsers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-xs text-[#64748b]">
            No user accounts found.
          </td>
        </tr>
      `;
      return;
    }

    // Apply current filter and render using shared row renderer
    reRenderUsersTableBody();
  } catch (err) {
    console.error('[UserController] Failed to fetch users:', err);
    etechAlert.error('Connection Error', 'Unable to load users. Please try again.');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-xs text-rose-600">
          Failed to load user directory. Please try again.
        </td>
      </tr>
    `;
  }
}

/**
 * Change a user's account status (ACTIVE / INACTIVE) via Backend API
 * @param {number|string} userId
 * @param {string} newStatus
 */
export async function changeUserStatus(userId, newStatus) {
  const activeUser = getCurrentUser();
  if (activeUser && String(activeUser.id) === String(userId) && newStatus === 'INACTIVE') {
    showToast('Action Denied: You cannot set your currently logged-in account to INACTIVE.', 'error');
    await renderUsersTab();
    return;
  }

  try {
    const user = cachedUsers.find(u => String(u.id) === String(userId));
    if (user) {
      user.status = newStatus;
    }

    await UserApi.updateUserStatus(userId, newStatus);
    showToast(`User status updated to ${newStatus}.`, 'success');
    await renderUsersTab();
  } catch (err) {
    showToast(err.message || 'Failed to update user status.', 'error');
    await renderUsersTab();
  }
}

/**
 * Change a user's role via Backend API
 * @param {number|string} userId
 * @param {string} newRole
 */
export async function changeUserRole(userId, newRole) {
  try {
    const user = cachedUsers.find(u => String(u.id) === String(userId));
    let assignedBranch = user ? user.assignedBranch : null;
    
    // If role is changing to STAFF and no branch is currently assigned, assign the first available branch
    if (newRole === 'STAFF' && !assignedBranch) {
      const branches = getBranches();
      assignedBranch = branches.length > 0 ? branches[0].id : 'BR-COL';
      showToast(`Role set to STAFF. Assigned by default to branch: ${assignedBranch}.`, 'info');
    }

    await UserApi.updateUserRole(userId, { role: newRole, assignedBranch });
    showToast('User role updated successfully.', 'success');
    await renderUsersTab();
  } catch (err) {
    showToast(err.message || 'Failed to update user role.', 'error');
    await renderUsersTab();
  }
}

/**
 * Delete a user account after confirmation
 * @param {number|string} userId
 */
export async function confirmDeleteUser(userId) {
  const activeUser = getCurrentUser();
  if (activeUser && String(activeUser.id) === String(userId)) {
    etechAlert.warning('Action Prohibited', 'Cannot delete your own currently active logged-in account.');
    return;
  }

  const confirmed = await etechAlert.confirmDelete(`User Account #${userId}`, 'This user will permanently lose access to the system.');
  if (!confirmed) return;

  try {
    const res = await UserApi.deleteUser(userId);
    showToast(res.message || 'User account removed successfully.', 'success');
    await renderUsersTab();
  } catch (err) {
    etechAlert.error('Delete User Failed', err.message);
  }
}

/**
 * Open Modal to Add or Edit User Account
 * @param {number|string|null} userId
 */
export async function openUserModal(userId = null) {
  const activeUser = getCurrentUser();
  if (!activeUser) {
    showToast('Access Denied: Please log in to manage users.', 'error');
    return;
  }

  const modal = document.getElementById('admin-modal-container');
  if (!modal) return;

  const branches = getBranches();
  let targetUser = userId ? cachedUsers.find(u => String(u.id) === String(userId)) : null;

  if (userId && !targetUser) {
    try {
      const fetched = await UserApi.getUserById(userId);
      const userPayload = (fetched && fetched.body !== undefined && fetched.body !== null) ? fetched.body : fetched;
      targetUser = userPayload ? (userPayload instanceof User ? userPayload : new User(userPayload)) : null;
    } catch (e) {
      showToast('Could not fetch user details.', 'error');
      return;
    }
  }

  const modalTitle = targetUser ? 'Edit User Account' : 'Create User Account';
  const roleOptionsHtml = buildRoleOptionsHtml(targetUser ? targetUser.role : 'CUSTOMER');
  const isStaff = targetUser && targetUser.role === 'STAFF';

  modal.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">${modalTitle}</h3>
            ${targetUser ? `<span class="text-[10px] text-blue-600 font-mono">ID: ${targetUser.id} (@${targetUser.username || ''})</span>` : ''}
          </div>
          <button onclick="closeAdminModal()" class="text-[#64748b] hover:text-[#0f172a] p-1 rounded-md transition-colors cursor-pointer" aria-label="Close">
            ${iconClose('w-4 h-4')}
          </button>
        </div>

        <form id="admin-user-form" onsubmit="handleSaveUserSubmit(event, ${targetUser ? `'${targetUser.id}'` : 'null'})" class="space-y-3.5 text-xs">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Full Name *</label>
            <input type="text" id="modal-u-name" required value="${targetUser ? (targetUser.name || '') : ''}" placeholder="Jane Smith" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">Username *</label>
              <input type="text" id="modal-u-username" required value="${targetUser ? (targetUser.username || '') : ''}" placeholder="jane_staff" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Email Address *</label>
              <input type="email" id="modal-u-email" required value="${targetUser ? (targetUser.email || '') : ''}" placeholder="staff@etech.com" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">${targetUser ? 'New Password (Optional)' : 'Password *'}</label>
            <input type="password" id="modal-u-password" ${targetUser ? '' : 'required'} placeholder="${targetUser ? 'Leave blank to keep current password' : '••••••••'}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-[#475569] font-bold mb-1">System Role *</label>
              <select id="modal-u-role" required onchange="handleUserModalRoleChange(this.value)" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-medium">
                ${roleOptionsHtml}
              </select>
            </div>
            <div>
              <label class="block text-[#475569] font-bold mb-1">Account Status *</label>
              <select id="modal-u-status" required class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-medium">
                <option value="ACTIVE" ${!targetUser || targetUser.status !== 'INACTIVE' ? 'selected' : ''}>ACTIVE</option>
                <option value="INACTIVE" ${targetUser && targetUser.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label id="modal-u-branch-label" class="block text-[#475569] font-bold mb-1">
              Assigned Branch <span id="modal-u-branch-req" class="${isStaff ? 'text-rose-600 font-bold' : 'hidden'}">*</span>
            </label>
            <select id="modal-u-branch" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-medium">
              <option value="" ${!targetUser || !targetUser.assignedBranch ? 'selected' : ''}>None (Global / Headquarters)</option>
              ${branches.map(b => `<option value="${b.id}" ${targetUser && targetUser.assignedBranch === b.id ? 'selected' : ''}>${b.name} (${b.city})</option>`).join('')}
            </select>
            <p id="modal-u-branch-hint" class="text-[10px] text-amber-600 mt-1 font-medium ${isStaff ? '' : 'hidden'}">Staff members must be assigned to a branch warehouse.</p>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeAdminModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0] cursor-pointer">Cancel</button>
            <button type="submit" id="modal-user-submit-btn" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm cursor-pointer">${targetUser ? 'Save User Changes' : 'Create Account'}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Handle dynamic changes when role is selected in User modal
 */
export function handleUserModalRoleChange(role) {
  const branchReq = document.getElementById('modal-u-branch-req');
  const branchHint = document.getElementById('modal-u-branch-hint');
  const branchSelect = document.getElementById('modal-u-branch');

  if (role === 'STAFF') {
    if (branchReq) branchReq.classList.remove('hidden');
    if (branchHint) branchHint.classList.remove('hidden');
    if (branchSelect && !branchSelect.value) {
      const branches = getBranches();
      if (branches.length > 0) branchSelect.value = branches[0].id;
    }
  } else {
    if (branchReq) branchReq.classList.add('hidden');
    if (branchHint) branchHint.classList.add('hidden');
  }
}

/**
 * Handle Add/Edit User Form Submission via Backend API
 * @param {Event} e
 * @param {number|string|null} userId
 */
export async function handleSaveUserSubmit(e, userId) {
  e.preventDefault();
  const name = document.getElementById('modal-u-name').value.trim();
  const username = document.getElementById('modal-u-username').value.trim();
  const email = document.getElementById('modal-u-email').value.trim();
  const password = document.getElementById('modal-u-password').value;
  const roleEl = document.getElementById('modal-u-role');
  const role = roleEl ? roleEl.value : 'CUSTOMER';
  const statusEl = document.getElementById('modal-u-status');
  const status = statusEl ? statusEl.value : 'ACTIVE';
  const branchEl = document.getElementById('modal-u-branch');
  const branch = branchEl ? (branchEl.value || null) : null;
  const submitBtn = document.getElementById('modal-user-submit-btn');

  if (!name || !username || !email || (!userId && !password)) {
    etechAlert.warning('Incomplete Form', 'Please fill in all required user fields.');
    return;
  }

  // Critical Validation: STAFF must always be assigned to a branch
  if (role === 'STAFF' && !branch) {
    etechAlert.error('Validation Error', 'Staff members must always be assigned to a specific branch warehouse.');
    if (branchEl) branchEl.focus();
    return;
  }

  const isEdit = Boolean(userId);
  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`User Account "${name}"`, `Username: @${username} | Role: ${role} | Status: ${status}`)
    : await etechAlert.confirmCreate(`User Account "${name}"`, `Username: @${username} | Role: ${role} | Status: ${status}`);

  if (!confirmed) return;

  const userPayload = new User({
    name,
    username,
    email,
    role,
    status,
    assignedBranch: branch
  });

  const payload = {
    name: userPayload.name,
    username: userPayload.username,
    email: userPayload.email,
    role: userPayload.role,
    status: userPayload.status,
    assignedBranch: userPayload.assignedBranch
  };

  if (password) {
    payload.password = password;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-wait');
  }

  try {
    if (userId) {
      await UserApi.updateUser(userId, payload);
      showToast('User details updated successfully!', 'success');
    } else {
      await UserApi.createUser(payload);
      showToast('User account created successfully!', 'success');
    }

    if (window.closeAdminModal) window.closeAdminModal();
    await renderUsersTab();
  } catch (err) {
    etechAlert.error('Save User Failed', err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-wait');
    }
  }
}