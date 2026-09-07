
import { etechAlert } from '../util/index.js';

export function renderUserProfileModal(user) {
    if (!user) {
        etechAlert.info('Login Required', 'Please log in first to view or manage your user profile.');
        window.location.hash = '#login?redirect=account';
        return;
    }

    let modalContainer = document.getElementById('user-profile-modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'user-profile-modal-container';
        document.body.appendChild(modalContainer);
    }

    modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center border border-blue-200 shadow-sm">
              ${typeof user.getInitial === 'function' ? user.getInitial() : (user.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 class="text-base font-extrabold text-[#0f172a]">Edit Profile & Credentials</h3>
              <p class="text-[11px] text-[#64748b]">Account: <span class="font-mono text-blue-600">@${user.username || user.id}</span> (${user.role || 'CUSTOMER'})</p>
            </div>
          </div>
          <button onclick="closeEditProfileModal()" class="text-[#64748b] hover:text-[#0f172a] text-xl font-bold">&times;</button>
        </div>

        <!-- Tabs: Profile Details vs Change Password -->
        <div class="flex items-center bg-[#f8fafc] p-1 rounded-lg border border-[#e2e8f0]">
          <button type="button" id="modal-tab-details-btn" onclick="switchProfileModalTab('details')" class="flex-1 py-2 text-xs font-bold rounded-md transition-all text-white bg-blue-600 shadow-sm">
            Profile Details
          </button>
          <button type="button" id="modal-tab-security-btn" onclick="switchProfileModalTab('security')" class="flex-1 py-2 text-xs font-bold rounded-md transition-all text-[#64748b] hover:text-[#0f172a]">
            Change Password
          </button>
        </div>

        <!-- Alert Notification Box in Modal -->
        <div id="modal-profile-alert" class="hidden p-3 rounded-md text-xs font-semibold"></div>

        <!-- TAB 1: Profile Details Form -->
        <form id="modal-profile-details-form" onsubmit="handleSaveProfileDetailsSubmit(event, '${user.id}')" class="space-y-4 text-xs">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Full Name *</label>
            <input type="text" id="modal-edit-name" required value="${user.name || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Username (@handle) *</label>
            <div class="relative">
              <span class="absolute left-3 top-2 text-[#64748b] font-mono">@</span>
              <input type="text" id="modal-edit-username" required pattern="[a-zA-Z0-9._-]+" minlength="3" value="${user.username || ''}" class="w-full pl-7 pr-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 font-mono">
            </div>
            <p class="text-[10px] text-[#64748b] mt-1">Used for signing in and displaying account identity.</p>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Email Address *</label>
            <input type="email" id="modal-edit-email" required value="${user.email || ''}" class="w-full px-3 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeEditProfileModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" id="modal-save-profile-btn" class="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-bold shadow-sm flex items-center space-x-1.5">
              <span>Save Profile</span>
            </button>
          </div>
        </form>

        <!-- TAB 2: Change Password & Security Form -->
        <form id="modal-profile-security-form" onsubmit="handleChangePasswordSubmit(event, '${user.id}')" class="hidden space-y-4 text-xs">
          <div>
            <label class="block text-[#475569] font-bold mb-1">Current Password *</label>
            <div class="relative">
              <input type="password" id="modal-pwd-current" required placeholder="Enter current password" class="w-full pl-3 pr-10 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
              <button type="button" onclick="toggleModalPasswordVisibility('modal-pwd-current')" class="absolute right-3 top-2.5 text-[#64748b] hover:text-[#0f172a]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">New Password (min 6 characters) *</label>
            <div class="relative">
              <input type="password" id="modal-pwd-new" required minlength="6" placeholder="••••••••" class="w-full pl-3 pr-10 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
              <button type="button" onclick="toggleModalPasswordVisibility('modal-pwd-new')" class="absolute right-3 top-2.5 text-[#64748b] hover:text-[#0f172a]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold mb-1">Confirm New Password *</label>
            <div class="relative">
              <input type="password" id="modal-pwd-confirm" required minlength="6" placeholder="••••••••" class="w-full pl-3 pr-10 py-2 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
              <button type="button" onclick="toggleModalPasswordVisibility('modal-pwd-confirm')" class="absolute right-3 top-2.5 text-[#64748b] hover:text-[#0f172a]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
          </div>

          <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5">
            <button type="button" onclick="closeEditProfileModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">Cancel</button>
            <button type="submit" id="modal-save-password-btn" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-bold shadow-sm flex items-center space-x-1.5">
              <span>Update Password</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  `;
}