// ============================================================
//  login.js — Dynamic Authentication View Generator
// ============================================================
import { isLoggedIn, getCurrentUser, switchTab, showAlert } from '../../controller/login_controller.js';

/**
 * Dynamically renders and mounts the Login & Registration interface
 * into the #login-page container in index.html
 * 
 * @param {string} [queryPart] - URL query parameters string (e.g. "redirect=checkout&tab=signup")
 */
export function renderLoginPage(queryPart) {
  const container = document.getElementById('login-page');
  if (!container) return;

  container.innerHTML = `
    <div class="relative min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-[#f8fafc]">
      <!-- Background Ambient Glow -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[320px] bg-blue-600/5 blur-[140px] rounded-full pointer-events-none"></div>

      <div class="w-full max-w-md relative z-10 my-4">

        <!-- Optional Redirect Alert Message -->
        <div id="redirect-banner"
          class="hidden mb-5 p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start space-x-2.5 shadow-sm">
          <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span id="redirect-banner-text">Sign up or log in to complete your checkout.</span>
        </div>

        <!-- Auth Card Container -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-sm">

          <!-- Header Logo / Back Link -->
          <div class="flex items-center justify-between pb-6 border-b border-[#e2e8f0] mb-6">
            <div>
              <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">ETech <span class="text-blue-600">Account</span></h2>
              <p class="text-[11px] text-[#64748b]">Fast & Secure Member Authentication</p>
            </div>
            <a href="#shop"
              class="inline-flex items-center space-x-1 text-xs font-semibold text-[#475569] hover:text-[#0f172a] bg-[#f8fafc] hover:bg-[#f1f5f9] px-3 py-1.5 rounded-md border border-[#e2e8f0] transition-all shadow-sm">
              <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Store</span>
            </a>
          </div>

          <!-- Tab Navigation Switcher -->
          <div class="flex rounded-lg bg-[#f8fafc] p-1 border border-[#e2e8f0] mb-6">
            <button id="tab-login-btn" onclick="switchTab('login')"
              class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all text-white bg-blue-600 shadow-sm">
              Sign In
            </button>
            <button id="tab-signup-btn" onclick="switchTab('signup')"
              class="flex-1 py-2.5 text-xs font-bold rounded-md transition-all text-[#64748b] hover:text-[#0f172a]">
              Create Account
            </button>
          </div>

          <!-- Alert Container for Errors/Success -->
          <div id="auth-alert"
            class="hidden mb-5 p-3 rounded-lg text-xs font-medium border flex items-center space-x-2">
            <span id="auth-alert-text"></span>
          </div>

          <!-- ================= TAB 1: LOGIN FORM ================= -->
          <form id="login-form" onsubmit="handleLoginSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Username or Email Address</label>
              <div class="relative">
                <input type="text" id="login-username" required placeholder="admin or name@example.com"
                  class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
                <svg class="w-4 h-4 text-[#94a3b8] absolute right-3.5 top-3" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider">Password</label>
                <span class="text-[11px] text-[#64748b]">Secure Authentication</span>
              </div>
              <div class="relative">
                <input type="password" id="login-password" required placeholder="••••••••"
                  class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
                <svg class="w-4 h-4 text-[#94a3b8] absolute right-3.5 top-3 cursor-pointer hover:text-[#0f172a]"
                  onclick="togglePasswordVisibility('login-password')" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center space-x-2 text-xs text-[#475569] cursor-pointer select-none">
                <input type="checkbox" checked
                  class="rounded bg-[#f8fafc] border-[#e2e8f0] text-blue-600 focus:ring-0 w-3.5 h-3.5">
                <span>Remember me</span>
              </label>
              <button type="button" onclick="openForgotPasswordModal()"
                class="text-xs font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-colors focus:outline-none cursor-pointer">
                Forgot password?
              </button>
            </div>

            <button type="submit"
              class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              <span>Sign In with Username / Email</span>
            </button>
          </form>

          <!-- ================= TAB 2: SIGNUP FORM ================= -->
          <form id="signup-form" onsubmit="handleSignupSubmit(event)" class="hidden space-y-4">
            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Full Name *</label>
              <input type="text" id="signup-name" required placeholder="John Doe"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Username *</label>
              <input type="text" id="signup-username" required pattern="[a-zA-Z0-9._-]+" minlength="3" placeholder="e.g. john_doe"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
              <p class="text-[10px] text-[#64748b] mt-0.5">Used to log in to your account (min. 3 alphanumeric characters).</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Email Address *</label>
              <input type="email" id="signup-email" required placeholder="name@example.com"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Password *</label>
              <div class="relative">
                <input type="password" id="signup-password" required minlength="6" placeholder="Min. 6 characters"
                  class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
                <svg class="w-4 h-4 text-[#94a3b8] absolute right-3.5 top-3 cursor-pointer hover:text-[#0f172a]"
                  onclick="togglePasswordVisibility('signup-password')" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1">Confirm Password *</label>
              <input type="password" id="signup-confirm-password" required placeholder="Repeat password"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
            </div>

            <div class="pt-1">
              <label class="flex items-start space-x-2 text-xs text-[#64748b] cursor-pointer">
                <input type="checkbox" required
                  class="rounded bg-[#f8fafc] border-[#e2e8f0] text-blue-600 focus:ring-0 w-3.5 h-3.5 mt-0.5">
                <span>I agree to ETech Store terms, warranty conditions & privacy policy.</span>
              </label>
            </div>

            <button type="submit"
              class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
              </svg>
              <span>Create Account & Sign In</span>
            </button>
          </form>

        </div>

        <p class="text-center text-xs text-[#64748b] mt-6">
          &copy; 2026 ETech Computers Inc. Safe 256-bit SSL Auth System.
        </p>

      </div>
    </div>
  `;

  initLoginPage(queryPart);
}

/**
 * Initializes query parameter handling, banners, and tab activation
 * 
 * @param {string} [queryPart]
 */
export function initLoginPage(queryPart) {
  let redirectParam = null;
  let tabParam = null;
  let expiredParam = null;

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    redirectParam = params.get('redirect');
    tabParam = params.get('tab');
    expiredParam = params.get('expired');
  }

  // Show banner if expired or redirected
  const banner = document.getElementById('redirect-banner');
  const bannerText = document.getElementById('redirect-banner-text');

  if (expiredParam && banner && bannerText) {
    banner.classList.remove('hidden');
    banner.className = 'mb-5 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2.5 shadow-sm';
    bannerText.innerHTML = `<strong>Session Expired:</strong> Your security token has expired. Please log in again to continue ${redirectParam ? `to <strong>#${redirectParam}</strong>` : ''}.`;
  } else if (redirectParam && banner && bannerText) {
    banner.classList.remove('hidden');
    banner.className = 'mb-5 p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start space-x-2.5 shadow-sm';
    if (redirectParam === 'checkout') {
      bannerText.textContent = 'Please log in or create an account to finish your order checkout.';
    } else if (redirectParam === 'account') {
      bannerText.textContent = 'You must sign up or log in first to view your Account & Order history.';
    } else if (redirectParam === 'admin') {
      bannerText.textContent = 'Administrative credentials (Admin / Staff) required to access Management Console.';
    } else {
      bannerText.textContent = `Please sign in to access #${redirectParam}.`;
    }
  }

  // Auto switch tab if tab=signup requested
  if (tabParam === 'signup') {
    switchTab('signup');
  } else {
    switchTab('login');
  }
}
