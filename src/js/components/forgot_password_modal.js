// ============================================================
//  src/js/components/forgot_password_modal.js — Multi-Step Forgot Password Wizard
// ============================================================
//  Step 1: Identify account (Email / Username)
//  Step 2: Enter 6-digit OTP (10-min countdown timer + 60s cooldown resend)
//  Step 3: Reset password with strength indicator
//  Step 4: Success confirmation & auto-redirect to login
// ============================================================

export function renderForgotPasswordModal() {
  let container = document.getElementById('forgot-password-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'forgot-password-modal-container';
    document.body.appendChild(container);
  }

  container.innerHTML = `
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/70 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
        
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-extrabold flex items-center justify-center border border-blue-200 shadow-xs flex-shrink-0">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-extrabold text-[#0f172a]">Account Recovery</h3>
              <p class="text-[11px] text-[#64748b]">Reset your password via 6-digit email OTP</p>
            </div>
          </div>
          <button type="button" onclick="closeForgotPasswordModal()" 
            class="text-[#94a3b8] hover:text-[#0f172a] p-1.5 rounded-lg hover:bg-[#f1f5f9] transition-colors text-lg font-bold">
            &times;
          </button>
        </div>

        <!-- Wizard Step Indicator Progress Dots -->
        <div class="flex items-center justify-center space-x-2 py-1">
          <div id="forgot-step-dot-1" class="w-2.5 h-2.5 rounded-full bg-blue-600 transition-all"></div>
          <div class="w-6 h-0.5 bg-[#e2e8f0]"></div>
          <div id="forgot-step-dot-2" class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1] transition-all"></div>
          <div class="w-6 h-0.5 bg-[#e2e8f0]"></div>
          <div id="forgot-step-dot-3" class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1] transition-all"></div>
          <div class="w-6 h-0.5 bg-[#e2e8f0]"></div>
          <div id="forgot-step-dot-4" class="w-2.5 h-2.5 rounded-full bg-[#cbd5e1] transition-all"></div>
        </div>

        <!-- Alert Notification Box in Modal -->
        <div id="forgot-modal-alert" class="hidden p-3 rounded-lg text-xs font-semibold"></div>

        <!-- ================= STEP 1: IDENTIFY USER ================= -->
        <form id="forgot-step-1-form" onsubmit="handleSendResetOtp(event)" class="space-y-4 text-xs">
          <div>
            <label class="block text-[#475569] font-bold uppercase tracking-wider mb-1.5">
              Username or Registered Email *
            </label>
            <div class="relative">
              <input type="text" id="forgot-identifier" required placeholder="e.g. john_doe or user@example.com"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] placeholder-[#94a3b8] text-sm focus:border-blue-600 transition-colors">
              <svg class="w-4 h-4 text-[#94a3b8] absolute right-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <p class="text-[11px] text-[#64748b] mt-1.5">
              Enter the username or email address you used when registering your ETech account.
            </p>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2">
            <button type="button" onclick="closeForgotPasswordModal()"
              class="px-4 py-2.5 text-xs font-bold text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" id="forgot-send-btn"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Send 6-Digit Code</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>

        <!-- ================= STEP 2: ENTER OTP ================= -->
        <form id="forgot-step-2-form" onsubmit="handleVerifyResetOtp(event)" class="hidden space-y-4 text-xs">
          <div class="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-blue-900">
            <p class="text-xs">
              We sent a 6-digit verification code to: <strong id="forgot-target-email-display" class="font-bold text-blue-950">...</strong>
            </p>
            <p class="text-[11px] text-blue-700 mt-1">
              📬 Please check your real email inbox (and spam/junk folder) for a message from <strong>eteccomputers38@gmail.com</strong>.
            </p>
          </div>

          <div>
            <label class="block text-[#475569] font-bold uppercase tracking-wider mb-1.5">
              Enter 6-Digit Verification Code *
            </label>
            <div class="relative">
              <input type="text" id="forgot-otp-input" required maxlength="6" pattern="[0-9]{6}" inputmode="numeric" placeholder="123456"
                class="w-full text-center px-4 py-3 rounded-lg bg-[#f8fafc] border-2 border-[#cbd5e1] focus:border-blue-600 text-2xl font-mono font-extrabold tracking-[8px] text-[#0f172a] transition-all">
            </div>
            <div class="flex items-center justify-between mt-2 text-[11px]">
              <span id="forgot-timer-display" class="font-semibold text-[#ef4444] flex items-center space-x-1">
                <span>⏱ Expires in:</span>
                <strong id="forgot-timer-countdown">10:00</strong>
              </span>
              <button type="button" id="forgot-resend-btn" onclick="handleResendResetOtp()"
                class="text-blue-600 font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">
                Resend Code
              </button>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-between">
            <button type="button" onclick="switchForgotStep(1)"
              class="px-3 py-2 text-xs font-bold text-[#475569] hover:text-[#0f172a] transition-colors">
              &larr; Back
            </button>
            <button type="submit" id="forgot-verify-btn"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Verify Code</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </form>

        <!-- ================= STEP 3: NEW PASSWORD ================= -->
        <form id="forgot-step-3-form" onsubmit="handleResetPasswordSubmit(event)" class="hidden space-y-4 text-xs">
          <div>
            <label class="block text-[#475569] font-bold uppercase tracking-wider mb-1">New Password *</label>
            <div class="relative">
              <input type="password" id="forgot-new-pwd" required minlength="6" placeholder="Min. 6 characters"
                oninput="checkPasswordStrength(this.value)"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-sm focus:border-blue-600">
              <button type="button" onclick="togglePasswordVisibility('forgot-new-pwd')"
                class="absolute right-3 top-3 text-[#94a3b8] hover:text-[#0f172a]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            <!-- Strength Meter -->
            <div class="mt-2">
              <div class="flex h-1.5 w-full bg-[#e2e8f0] rounded-full overflow-hidden">
                <div id="pwd-strength-bar" class="h-full w-0 transition-all duration-300"></div>
              </div>
              <p id="pwd-strength-text" class="text-[10px] text-[#64748b] mt-1 font-semibold">Password Strength</p>
            </div>
          </div>

          <div>
            <label class="block text-[#475569] font-bold uppercase tracking-wider mb-1">Confirm New Password *</label>
            <div class="relative">
              <input type="password" id="forgot-confirm-pwd" required minlength="6" placeholder="Re-enter password"
                class="w-full px-3.5 py-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] text-sm focus:border-blue-600">
              <button type="button" onclick="togglePasswordVisibility('forgot-confirm-pwd')"
                class="absolute right-3 top-3 text-[#94a3b8] hover:text-[#0f172a]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end space-x-2">
            <button type="button" onclick="closeForgotPasswordModal()"
              class="px-4 py-2.5 text-xs font-bold text-[#475569] hover:text-[#0f172a] transition-colors">
              Cancel
            </button>
            <button type="submit" id="forgot-reset-btn"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer">
              <span>Update Password & Log In</span>
            </button>
          </div>
        </form>

        <!-- ================= STEP 4: SUCCESS CONFIRMATION ================= -->
        <div id="forgot-step-4-success" class="hidden text-center py-4 space-y-4">
          <div class="w-16 h-16 bg-emerald-50 text-emerald-600 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto shadow-sm animate-bounce">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h4 class="text-base font-extrabold text-[#0f172a]">Password Reset Complete!</h4>
            <p class="text-xs text-[#64748b] mt-1 max-w-xs mx-auto">
              Your account password has been successfully updated. You can now log in using your new credentials.
            </p>
          </div>
          <button type="button" onclick="closeForgotPasswordModal(); switchTab('login');"
            class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-all">
            Return to Sign In
          </button>
        </div>

      </div>
    </div>
  `;
}
