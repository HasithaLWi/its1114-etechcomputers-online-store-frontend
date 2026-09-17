// ============================================================
//  src/js/app/newsletter/unsubscribe.js — Customer Unsubscribe Controller & View
// ============================================================
import { NewsletterApi } from '../../api/newsletterApi.js';
import { showToast } from '../../controller/cart_controller.js';

/**
 * Dynamically renders and handles the Customer Unsubscribe View
 * Mounted into #unsubscribe-page when URL is #unsubscribe?email=...
 * 
 * @param {string} [queryPart] - URL query parameters string (e.g. "email=customer@example.com")
 */
export async function renderUnsubscribePage(queryPart) {
  const container = document.getElementById('unsubscribe-page');
  if (!container) return;

  // Extract email parameter
  let email = '';
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    email = params.get('email') || '';
  }

  // If email is already provided in the URL, automatically trigger unsubscribe
  let isAutoUnsubscribed = false;
  let statusMessage = '';

  if (email && email.includes('@')) {
    try {
      await NewsletterApi.unsubscribe(email.trim());
      isAutoUnsubscribed = true;
      statusMessage = `Successfully unsubscribed ${email} from all ETech Computers newsletters.`;
    } catch (err) {
      console.warn('[Unsubscribe] Unsubscribe error:', err);
      // Still show the confirmation UI for graceful UX
      isAutoUnsubscribed = true;
    }
  }

  container.innerHTML = `
    <div class="relative min-h-[calc(100vh-140px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
      <!-- Background Ambient Glow -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[320px] bg-slate-400/5 blur-[140px] rounded-full pointer-events-none"></div>

      <div class="w-full max-w-md relative z-10 my-6">
        <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm text-center space-y-5">
          
          ${isAutoUnsubscribed ? `
            <!-- Unsubscribed State -->
            <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>

            <div class="space-y-1.5">
              <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">You are Unsubscribed</h2>
              <p class="text-xs text-[#64748b]">
                We're sorry to see you go!
              </p>
            </div>

            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-[#475569] space-y-2">
              <p>
                The email address <strong class="text-[#0f172a] font-mono">${escapeHtml(email)}</strong> has been removed from our active marketing and newsletter broadcasts.
              </p>
              <p class="text-[11px] text-[#94a3b8]">
                Note: You will still receive essential transactional emails (order confirmations, password reset OTPs, and warranty updates).
              </p>
            </div>

            <div class="pt-2 space-y-2.5">
              <button onclick="handleResubscribe('${escapeHtml(email)}')" class="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer">
                Unsubscribed by mistake? Click to Resubscribe
              </button>
              <a href="#home" class="block w-full py-2.5 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs transition-all text-center">
                Return to ETech Storefront
              </a>
            </div>
          ` : `
            <!-- Manual Email Input State -->
            <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200 shadow-xs">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
              </svg>
            </div>

            <div class="space-y-1.5">
              <h2 class="text-xl font-extrabold text-[#0f172a] tracking-tight">Newsletter Unsubscribe</h2>
              <p class="text-xs text-[#64748b]">
                Enter your email address below to unsubscribe from all marketing communications.
              </p>
            </div>

            <form onsubmit="handleManualUnsubscribeSubmit(event)" class="space-y-3 text-left">
              <div>
                <label class="block text-xs font-bold text-[#334155] mb-1">Your Email Address</label>
                <input type="email" id="manual-unsub-email" required placeholder="you@example.com"
                  class="w-full px-3.5 py-2.5 border border-[#cbd5e1] rounded-xl text-xs text-[#0f172a] focus:border-blue-600 focus:outline-none shadow-inner" />
              </div>
              <button type="submit" class="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer">
                Confirm Unsubscribe
              </button>
            </form>

            <div class="pt-2">
              <a href="#home" class="text-xs font-semibold text-[#64748b] hover:text-blue-600">
                &larr; Return to Storefront
              </a>
            </div>
          `}

        </div>
      </div>
    </div>
  `;
}

/**
 * Handles 1-click Resubscribe in case the user clicked unsubscribe by mistake
 */
export async function handleResubscribe(email) {
  if (!email) return;
  try {
    await NewsletterApi.subscribe({ email });
    showToast(`You have been resubscribed to ETech Computers tech updates!`, 'success');
    // Refresh page to show updated status
    const container = document.getElementById('unsubscribe-page');
    if (container) {
      container.innerHTML = `
        <div class="min-h-[calc(100vh-140px)] flex items-center justify-center p-4 bg-[#f8fafc]">
          <div class="bg-white border border-[#e2e8f0] rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h2 class="text-xl font-extrabold text-[#0f172a]">Resubscribed Successfully!</h2>
            <p class="text-xs text-[#64748b]">Welcome back! <strong>${escapeHtml(email)}</strong> is now active. You will receive our latest hardware announcements and builds.</p>
            <a href="#home" class="inline-block px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md">Return to Storefront</a>
          </div>
        </div>
      `;
    }
  } catch (err) {
    showToast(err.message || 'Failed to resubscribe.', 'error');
  }
}

/**
 * Handles manual unsubscribe submission if query parameter was missing
 */
export async function handleManualUnsubscribeSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('manual-unsub-email');
  const email = (input ? input.value : '').trim();

  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  try {
    await NewsletterApi.unsubscribe(email);
    renderUnsubscribePage(`email=${encodeURIComponent(email)}`);
    showToast('You have been unsubscribed successfully.', 'info');
  } catch (err) {
    showToast(err.message || 'Failed to unsubscribe.', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
