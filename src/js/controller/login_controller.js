// ============================================================
//  src/js/controller/login_controller.js — Authentication & User State Controller
// ============================================================
import { AuthApi, UserApi } from '../api/userApi.js';
import { getToken, setToken, removeToken } from '../api/apiClient.js';
import {
  getCurrentUser, setCurrentUser, isLoggedIn, logoutUser,
  CURRENT_USER_STORAGE_KEY, User, USER_ROLE
} from '../models/user_model.js';
import { renderUserProfileModal } from '../components/user_profile_modal_container.js';

export { getToken, setToken, removeToken, getCurrentUser, setCurrentUser, isLoggedIn, logoutUser, CURRENT_USER_STORAGE_KEY };

/**
 * Authenticate user with username/email and password via Backend API
 */
export async function loginUser(usernameOrEmail, password) {
  const cleanIdentifier = (usernameOrEmail || '').trim().toLowerCase();
  if (!cleanIdentifier || !password) {
    return { success: false, message: 'Please enter your username and password.' };
  }

  try {
    const data = await AuthApi.login(cleanIdentifier, password);
    const payload = (data && data.body !== undefined && data.body !== null) ? data.body : data;
    const token = payload?.token || data?.token;
    const userPayload = payload?.user || payload?.userData || (payload?.id ? payload : null);
    if (token) setToken(token);
    const userInstance = setCurrentUser(new User(userPayload || {}));
    return { success: true, message: 'Logged in successfully!', user: userInstance };
  } catch (err) {
    return { success: false, message: err.message || 'Invalid credentials. Please check your username and password.' };
  }
}

/**
 * Register a new storefront customer via Backend API
 */
export async function registerUser(name, username, email, password) {
  const cleanName = (name || '').trim();
  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim();

  if (!cleanName || !cleanUsername || !cleanEmail || !password) {
    return { success: false, message: 'Please fill in all required fields.' };
  }

  try {
    const data = await AuthApi.register({
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: password
    });
    const payload = (data && data.body !== undefined && data.body !== null) ? data.body : data;
    const token = payload?.token || data?.token;
    const userPayload = payload?.user || payload?.userData || (payload?.id ? payload : null);
    if (token) setToken(token);
    const userInstance = setCurrentUser(new User(userPayload || {}));
    return { success: true, message: 'Account created successfully!', user: userInstance };
  } catch (err) {
    return { success: false, message: err.message || 'Registration failed. Please check your details and try again.' };
  }
}

/**
 * Synchronize current user profile from backend
 */
export async function refreshCurrentUserSession() {
  if (!isLoggedIn()) return null;
  try {
    const freshUser = await AuthApi.getCurrentUser();
    const userPayload = (freshUser && freshUser.body !== undefined && freshUser.body !== null) ? freshUser.body : freshUser;
    const userInstance = setCurrentUser(new User(userPayload));
    return userInstance;
  } catch (err) {
    if (err.status === 401) {
      logoutUser();
    }
    return null;
  }
}

/**
 * Update user profile details (Name, Username, Email) via Backend API
 */
export async function updateUserProfile(userId, { name, username, email }) {
  const cleanName = (name || '').trim();
  const cleanUsername = (username || '').trim();
  const cleanEmail = (email || '').trim();

  if (!cleanName || !cleanUsername || !cleanEmail) {
    return { success: false, message: 'All fields (Name, Username, Email) are required.' };
  }

  try {
    const updatedUser = await UserApi.updateSelfProfile({
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail
    });
    const userPayload = (updatedUser && updatedUser.body !== undefined && updatedUser.body !== null) ? updatedUser.body : updatedUser;
    const userInstance = setCurrentUser(new User(userPayload));
    return { success: true, message: 'Profile details updated successfully!', user: userInstance };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to update profile.' };
  }
}

/**
 * Change current user password via Backend API
 */
export async function changeUserPassword(userId, currentPassword, newPassword) {
  if (!currentPassword || !newPassword) {
    return { success: false, message: 'Please provide both your current password and new password.' };
  }

  try {
    const res = await UserApi.changeSelfPassword({
      currentPassword,
      newPassword
    });
    return { success: true, message: res.message || 'Password changed successfully!' };
  } catch (err) {
    return { success: false, message: err.message || 'Failed to change password. Please ensure your current password is correct.' };
  }
}

// ── UI View Helpers & Event Handlers ─────────────────────────

export function switchTab(tab) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const loginBtn = document.getElementById('tab-login-btn');
  const signupBtn = document.getElementById('tab-signup-btn');
  const alertBox = document.getElementById('auth-alert');

  if (alertBox) alertBox.classList.add('hidden');

  if (tab === 'login') {
    if (loginForm) loginForm.classList.remove('hidden');
    if (signupForm) signupForm.classList.add('hidden');
    if (loginBtn) loginBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-white bg-blue-600 shadow-sm';
    if (signupBtn) signupBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-[#64748b] hover:text-[#0f172a]';
  } else {
    if (loginForm) loginForm.classList.add('hidden');
    if (signupForm) signupForm.classList.remove('hidden');
    if (signupBtn) signupBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-white bg-blue-600 shadow-sm';
    if (loginBtn) loginBtn.className = 'flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-[#64748b] hover:text-[#0f172a]';
  }
}

export function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.type = field.type === 'password' ? 'text' : 'password';
  }
}

export function showAlert(message, isError = true) {
  const alertBox = document.getElementById('auth-alert');
  const alertText = document.getElementById('auth-alert-text');
  if (!alertBox || !alertText) return;

  alertBox.classList.remove('hidden', 'bg-rose-50', 'border-rose-200', 'text-rose-700', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-700');

  if (isError) {
    alertBox.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-700');
  } else {
    alertBox.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-700');
  }

  alertText.textContent = message;
}

export function getRedirectTarget(user) {
  const u = user ? (user instanceof User ? user : new User(user)) : null;
  if (u && (u.isAdmin() || u.isStaff())) {
    return '#admin';
  }

  let redirectParam = null;
  const hash = window.location.hash || '';
  if (hash.includes('?')) {
    const params = new URLSearchParams(hash.split('?')[1]);
    redirectParam = params.get('redirect');
  }
  if (!redirectParam) {
    const urlParams = new URLSearchParams(window.location.search);
    redirectParam = urlParams.get('redirect');
  }

  if (redirectParam) {
    return redirectParam.startsWith('#') ? redirectParam : `#${redirectParam}`;
  }
  return '#home';
}

export async function handleLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const usernameOrEmail = usernameInput ? usernameInput.value : '';
  const password = passwordInput ? passwordInput.value : '';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-wait');
  }

  const res = await loginUser(usernameOrEmail, password);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70', 'cursor-wait');
  }

  if (res.success) {
    showAlert(`Welcome back, ${res.user.name}! Redirecting...`, false);
    setTimeout(() => {
      const target = getRedirectTarget(res.user);
      window.location.hash = target;
    }, 400);
  } else {
    showAlert(res.message, true);
  }
}

export async function handleSignupSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const username = document.getElementById('signup-username').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (password !== confirmPassword) {
    showAlert("Passwords do not match. Please re-enter your password.", true);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-wait');
  }

  const res = await registerUser(name, username, email, password);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70', 'cursor-wait');
  }

  if (res.success) {
    showAlert(res.message, false);
    setTimeout(() => {
      const target = getRedirectTarget(res.user);
      window.location.hash = target;
    }, 400);
  } else {
    showAlert(res.message, true);
  }
}

/**
 * Open Profile & Credentials Edit Modal for Logged In User
 */
export function openEditProfileModal(user) {
  const currentUser = user || getCurrentUser();
  renderUserProfileModal(currentUser);
}

export function closeEditProfileModal() {
  const container = document.getElementById('user-profile-modal-container');
  if (container) container.innerHTML = '';
}

export function switchProfileModalTab(tab) {
  const detailsForm = document.getElementById('modal-profile-details-form');
  const securityForm = document.getElementById('modal-profile-security-form');
  const detailsBtn = document.getElementById('modal-tab-details-btn');
  const securityBtn = document.getElementById('modal-tab-security-btn');
  const alertBox = document.getElementById('modal-profile-alert');

  if (alertBox) alertBox.classList.add('hidden');

  if (tab === 'details') {
    if (detailsForm) detailsForm.classList.remove('hidden');
    if (securityForm) securityForm.classList.add('hidden');
    if (detailsBtn) detailsBtn.className = 'flex-1 py-2 text-xs font-bold rounded-md transition-all text-white bg-blue-600 shadow-sm';
    if (securityBtn) securityBtn.className = 'flex-1 py-2 text-xs font-bold rounded-md transition-all text-[#64748b] hover:text-[#0f172a]';
  } else {
    if (detailsForm) detailsForm.classList.add('hidden');
    if (securityForm) securityForm.classList.remove('hidden');
    if (securityBtn) securityBtn.className = 'flex-1 py-2 text-xs font-bold rounded-md transition-all text-white bg-blue-600 shadow-sm';
    if (detailsBtn) detailsBtn.className = 'flex-1 py-2 text-xs font-bold rounded-md transition-all text-[#64748b] hover:text-[#0f172a]';
  }
}

export function toggleModalPasswordVisibility(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

export async function handleSaveProfileDetailsSubmit(e, userId) {
  e.preventDefault();
  const name = document.getElementById('modal-edit-name').value;
  const username = document.getElementById('modal-edit-username').value;
  const email = document.getElementById('modal-edit-email').value;
  const alertBox = document.getElementById('modal-profile-alert');
  const submitBtn = document.getElementById('modal-save-profile-btn');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-wait');
  }

  const res = await updateUserProfile(userId, { name, username, email });

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70', 'cursor-wait');
  }

  if (res.success) {
    if (alertBox) {
      alertBox.className = 'p-3 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      alertBox.textContent = res.message;
      alertBox.classList.remove('hidden');
    }
    setTimeout(() => {
      closeEditProfileModal();
      if (window.updateHeaderAuthUI) window.updateHeaderAuthUI();
      // Re-render Account page elements if active
      const nameEl = document.getElementById('account-user-name');
      const handleEl = document.getElementById('account-user-handle');
      const usernameEl = document.getElementById('account-user-username');
      const emailEl = document.getElementById('account-user-email');
      const avatarEl = document.getElementById('account-avatar');

      if (nameEl) nameEl.textContent = res.user.name;
      if (handleEl) handleEl.textContent = `@${res.user.username}`;
      if (usernameEl) usernameEl.textContent = `@${res.user.username}`;
      if (emailEl) emailEl.textContent = res.user.email;
      if (avatarEl) avatarEl.textContent = res.user.name.charAt(0).toUpperCase();
    }, 500);
  } else {
    if (alertBox) {
      alertBox.className = 'p-3 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200';
      alertBox.textContent = res.message;
      alertBox.classList.remove('hidden');
    }
  }
}

export async function handleChangePasswordSubmit(e, userId) {
  e.preventDefault();
  const currentPassword = document.getElementById('modal-pwd-current').value;
  const newPassword = document.getElementById('modal-pwd-new').value;
  const confirmPassword = document.getElementById('modal-pwd-confirm').value;
  const alertBox = document.getElementById('modal-profile-alert');
  const submitBtn = document.getElementById('modal-save-password-btn');

  if (newPassword !== confirmPassword) {
    if (alertBox) {
      alertBox.className = 'p-3 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200';
      alertBox.textContent = 'New passwords do not match. Please re-enter.';
      alertBox.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-wait');
  }

  const res = await changeUserPassword(userId, currentPassword, newPassword);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-70', 'cursor-wait');
  }

  if (res.success) {
    if (alertBox) {
      alertBox.className = 'p-3 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      alertBox.textContent = res.message;
      alertBox.classList.remove('hidden');
    }
    setTimeout(() => {
      closeEditProfileModal();
    }, 600);
  } else {
    if (alertBox) {
      alertBox.className = 'p-3 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200';
      alertBox.textContent = res.message;
      alertBox.classList.remove('hidden');
    }
  }
}
