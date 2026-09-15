// ============================================================
//  src/js/util/server_health.js — Server Connectivity, Health Monitor & UI Blocker
// ============================================================
import { TestApi } from '../api/testApi.js';
import { showToast } from './toast.js';

let isServerOnline = true;
let isCheckingHealth = false;
let autoRetryInterval = null;
let countdownSeconds = 10;
const reconnectCallbacks = [];

/**
 * Register a listener to be invoked whenever connectivity to the backend is restored.
 * @param {Function} callback 
 */
export function onServerReconnect(callback) {
  if (typeof callback === 'function' && !reconnectCallbacks.includes(callback)) {
    reconnectCallbacks.push(callback);
  }
}

/**
 * Format current timestamp for footer display: e.g. "Sep 09, 2026 02:44 PM"
 */
export function formatLastUpdated() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[now.getMonth()];
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? String(hours).padStart(2, '0') : '12';
  return `Last Updated: ${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Update system status in the DOM (Admin Console Header & Footer)
 * @param {boolean} online 
 */
export function updateSystemStatusUI(online) {
  isServerOnline = Boolean(online);

  // 1. Header System Status Pill
  const pill = document.getElementById('admin-system-status-pill');
  const dot = document.getElementById('admin-system-status-dot');
  const text = document.getElementById('admin-system-status-text');

  if (pill && dot && text) {
    if (isServerOnline) {
      pill.className = 'hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-2xs';
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      text.className = 'text-emerald-700 font-extrabold font-mono tracking-wider';
      text.textContent = 'ONLINE';
    } else {
      pill.className = 'hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 shadow-2xs';
      dot.className = 'w-2 h-2 rounded-full bg-red-500';
      text.className = 'text-red-700 font-extrabold font-mono tracking-wider';
      text.textContent = 'OFFLINE';
    }
  }

  // 2. Footer System Status
  const footerStatus = document.getElementById('admin-footer-status');
  if (footerStatus) {
    if (isServerOnline) {
      footerStatus.innerHTML = 'System Status: <strong class="text-emerald-600 font-bold">ONLINE</strong>';
    } else {
      footerStatus.innerHTML = 'System Status: <strong class="text-red-600 font-bold">OFFLINE</strong>';
    }
  }

  // 3. Footer Last Updated Timestamp
  const lastUpdated = document.getElementById('admin-footer-last-updated');
  if (lastUpdated) {
    lastUpdated.textContent = formatLastUpdated();
  }
}

/* ============================================================
   APP BOOTSTRAP / SPLASH LOADING SCREEN
   ============================================================ */

/**
 * Ensures the app splash loader exists in the DOM.
 */
function ensureAppLoader() {
  let loader = document.getElementById('etech-app-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'etech-app-loader';
    loader.className = 'fixed inset-0 z-[9999999] flex flex-col items-center justify-center bg-[#0b1120] text-white transition-opacity duration-300';
    loader.innerHTML = `
      <div class="flex flex-col items-center max-w-sm px-6 text-center space-y-5 select-none">
        <!-- Brand Mark with pulsing glow -->
        <div class="relative flex items-center justify-center">
          <div class="absolute w-24 h-24 rounded-full bg-blue-600/30 blur-xl animate-pulse"></div>
          <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25 border border-blue-400/30 relative z-10 overflow-hidden">
            <img src="public/images/Create_ETech_Computers_logo_.jpeg" alt="ET" class="w-full h-full object-cover rounded-2xl">
          </div>
        </div>

        <!-- Brand Title -->
        <div>
          <h2 class="text-xl font-black tracking-tight text-white">
            ETech<span class="text-blue-400">Computers</span>
          </h2>
          <p class="text-[10px] tracking-[0.25em] uppercase text-slate-400 font-semibold mt-0.5">NEXT-GEN TECH STORE</p>
        </div>

        <!-- Spinner & Status Text -->
        <div class="flex flex-col items-center space-y-2.5 pt-1">
          <div class="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p id="etech-loader-status-text" class="text-xs font-medium text-slate-300">
            Connecting to ETech Services...
          </p>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
  }
  return loader;
}

/**
 * Show the app loading screen with custom status message.
 * @param {string} [statusMessage='Connecting to ETech Services...']
 */
export function showAppLoading(statusMessage = 'Connecting to ETech Services...') {
  const loader = ensureAppLoader();
  setAppLoadingStatus(statusMessage);
  loader.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
  loader.classList.add('opacity-100');
}

/**
 * Update the status message inside the app loading screen.
 * @param {string} message
 */
export function setAppLoadingStatus(message) {
  const statusEl = document.getElementById('etech-loader-status-text');
  if (statusEl && message) {
    statusEl.textContent = message;
  }
}

/**
 * Smoothly fade out and remove the app loading screen.
 */
export function hideAppLoading() {
  const loader = document.getElementById('etech-app-loader');
  if (loader) {
    loader.classList.remove('opacity-100');
    loader.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 350);
  }
}

/* ============================================================
   NON-DISMISSIBLE OFFLINE CIRCUIT-BREAKER BLOCKER
   ============================================================ */

/**
 * Ensures the offline blocker modal exists in DOM and hooks up event listeners.
 */
function ensureOfflineBlocker() {
  let blocker = document.getElementById('etech-offline-blocker');
  if (!blocker) {
    blocker = document.createElement('div');
    blocker.id = 'etech-offline-blocker';
    blocker.className = 'fixed inset-0 z-[99999999] flex items-center justify-center p-4 bg-[#090d16]/90 backdrop-blur-md transition-opacity duration-200 hidden opacity-0';
    blocker.setAttribute('role', 'alertdialog');
    blocker.setAttribute('aria-modal', 'true');

    blocker.innerHTML = `
      <div id="etech-offline-card" class="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/80 transform scale-95 transition-all duration-200 space-y-5 text-center select-none">
        
        <!-- Glowing Disconnect Icon -->
        <div class="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div class="absolute inset-0 rounded-2xl bg-rose-500/20 animate-ping opacity-60"></div>
          <div class="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-lg shadow-rose-500/10 relative z-10">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a4.978 4.978 0 01-1.414-2.83m-1.414 5.657L3 21m0 0l2.828-2.828m0 0A9 9 0 0118.364 5.636M3 3l18 18" />
            </svg>
          </div>
        </div>

        <!-- Status Badge & Header -->
        <div class="space-y-1.5">
          <div class="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-extrabold tracking-wider uppercase">
            <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>OFFLINE</span>
          </div>
          <h3 class="text-xl font-black text-slate-900 tracking-tight">
            Connection Lost
          </h3>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            We're having trouble connecting to our services. Please check your internet connection or try again.
          </p>
        </div>

        <!-- User-Friendly Reconnect Status Message -->
        <div id="etech-offline-feedback" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-700 hidden">
          Unable to reconnect. We'll automatically try again shortly.
        </div>


        <!-- Action Controls & Auto-Retry Countdown -->
        <div class="space-y-2.5 pt-1">
          <button type="button" id="etech-retry-connection-btn" class="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed">
            <svg id="etech-retry-spinner" class="w-4 h-4 animate-spin hidden" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <svg id="etech-retry-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span id="etech-retry-btn-text">Retry Connection Now</span>
          </button>

          <div class="flex items-center justify-center space-x-1.5 text-[11px] text-slate-500">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Auto-retrying in <strong id="etech-retry-countdown" class="font-bold text-slate-700 font-mono">10s</strong></span>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(blocker);
  }
  bindBlockerEvents(blocker);
  return blocker;
}

/**
 * Attaches click and keydown listeners to the offline blocker elements.
 * @param {HTMLElement} blocker
 */
function bindBlockerEvents(blocker) {
  if (!blocker || blocker.dataset.eventsBound === 'true') return;
  blocker.dataset.eventsBound = 'true';

  const retryBtn = blocker.querySelector('#etech-retry-connection-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      retryServerConnection();
    });
  }

  // NON-DISMISSIBLE: Trap Escape key to prevent closing
  window.addEventListener('keydown', (e) => {
    if (!isServerOnline && !blocker.classList.contains('hidden')) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  // NON-DISMISSIBLE: Prevent backdrop click dismiss
  blocker.addEventListener('click', (e) => {
    if (e.target === blocker) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}

// Auto-bind on script evaluation if blocker already exists in document
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const b = document.getElementById('etech-offline-blocker');
      if (b) bindBlockerEvents(b);
    });
  } else {
    const b = document.getElementById('etech-offline-blocker');
    if (b) bindBlockerEvents(b);
  }
}

/**
 * Start the 10-second automatic retry countdown loop.
 */
function startAutoRetryTimer() {
  stopAutoRetryTimer();
  countdownSeconds = 10;
  updateCountdownDisplay();

  autoRetryInterval = setInterval(async () => {
    countdownSeconds--;
    updateCountdownDisplay();

    if (countdownSeconds <= 0) {
      stopAutoRetryTimer();
      await retryServerConnection();
    }
  }, 1000);
}

/**
 * Stop any active auto-retry countdown timer.
 */
function stopAutoRetryTimer() {
  if (autoRetryInterval) {
    clearInterval(autoRetryInterval);
    autoRetryInterval = null;
  }
}

/**
 * Update the countdown text in the DOM.
 */
function updateCountdownDisplay() {
  const cdEl = document.getElementById('etech-retry-countdown');
  if (cdEl) {
    cdEl.textContent = `${countdownSeconds}s`;
  }
}

/**
 * Shows the full-page non-dismissible offline blocker and starts the countdown.
 * @param {string} [customDetails]
 */
export function showOfflineBlocker(customDetails = '') {
  const blocker = ensureOfflineBlocker();
  const card = blocker.querySelector('#etech-offline-card');
  const feedbackEl = blocker.querySelector('#etech-offline-feedback');

  if (feedbackEl) {
    if (customDetails) {
      feedbackEl.textContent = customDetails;
      feedbackEl.classList.remove('hidden');
    } else {
      feedbackEl.classList.add('hidden');
      feedbackEl.textContent = '';
    }
  }

  // Freeze page scrolling behind blocker
  document.body.style.overflow = 'hidden';

  // Display overlay
  blocker.classList.remove('hidden');
  requestAnimationFrame(() => {
    blocker.classList.remove('opacity-0');
    blocker.classList.add('opacity-100');
    if (card) {
      card.classList.remove('scale-95');
      card.classList.add('scale-100');
    }
  });

  // Start auto-retry timer
  startAutoRetryTimer();
}

/**
 * Hides and cleans up the offline blocker.
 */
export function hideOfflineBlocker() {
  stopAutoRetryTimer();
  const blocker = document.getElementById('etech-offline-blocker');
  if (blocker) {
    const card = blocker.querySelector('#etech-offline-card');
    blocker.classList.remove('opacity-100');
    blocker.classList.add('opacity-0');
    if (card) {
      card.classList.remove('scale-100');
      card.classList.add('scale-95');
    }
    setTimeout(() => {
      blocker.classList.add('hidden');
      document.body.style.overflow = '';
    }, 200);
  }
}

/**
 * Manually or automatically retry connection to the backend service.
 * @returns {Promise<boolean>}
 */
export async function retryServerConnection() {
  if (isCheckingHealth) return false;
  isCheckingHealth = true;
  stopAutoRetryTimer();

  const retryBtn = document.getElementById('etech-retry-connection-btn');
  const btnText = document.getElementById('etech-retry-btn-text');
  const spinner = document.getElementById('etech-retry-spinner');
  const icon = document.getElementById('etech-retry-icon');
  const feedbackEl = document.getElementById('etech-offline-feedback');
  const card = document.getElementById('etech-offline-card');

  // Set button to checking state
  if (retryBtn) retryBtn.disabled = true;
  if (spinner) spinner.classList.remove('hidden');
  if (icon) icon.classList.add('hidden');
  if (btnText) btnText.textContent = 'Connecting to Server...';
  if (feedbackEl) feedbackEl.classList.add('hidden');

  try {
    const res = await TestApi.ping();
    const online = Boolean(res && (
      res.status === 200 ||
      res.status === 201 ||
      res.body === 'Server Connect Successful' ||
      res.message === 'Ping successful'
    ));

    if (!online) {
      throw new Error('Server returned unexpected non-200 response');
    }

    // Success State
    isServerOnline = true;
    updateSystemStatusUI(true);

    if (btnText) btnText.textContent = 'Connected Successfully!';
    if (retryBtn) {
      retryBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500');
      retryBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
    }

    // Give visual confirmation, then lift the blocker
    setTimeout(() => {
      hideOfflineBlocker();

      // Reset button classes for future use
      if (retryBtn) {
        retryBtn.disabled = false;
        retryBtn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        retryBtn.classList.add('bg-blue-600', 'hover:bg-blue-500');
      }
      if (btnText) btnText.textContent = 'Retry Connection Now';
      if (spinner) spinner.classList.add('hidden');
      if (icon) icon.classList.remove('hidden');

      showToast('⚡ Server Connected: All services restored.', 'success');

      // Trigger all registered reconnect listeners (e.g. data re-sync)
      reconnectCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error('[ServerHealth] Reconnect callback error:', e);
        }
      });
    }, 450);

    isCheckingHealth = false;
    return true;

  } catch (err) {
    console.warn('[ServerHealth] Reconnect probe failed:', err.message || err);

    // Failure animation & feedback
    if (card) {
      card.classList.remove('et-shake');
      void card.offsetWidth; // Trigger reflow
      card.classList.add('et-shake');
    }

    if (feedbackEl) {
      feedbackEl.textContent = "Unable to reconnect. We'll automatically try again shortly.";
      feedbackEl.classList.remove('hidden');
    }

    // Reset button state
    if (retryBtn) retryBtn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (icon) icon.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Retry Connection Now';

    // Restart the 10-second auto-retry countdown
    startAutoRetryTimer();

    isCheckingHealth = false;
    return false;
  }
}

/**
 * Test if the server is online using POST /api/v1/test/ping.
 * If offline, locks the UI with the non-dismissible offline blocker.
 * 
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth() {
  try {
    const res = await TestApi.ping();
    const online = Boolean(res && (
      res.status === 200 ||
      res.status === 201 ||
      res.body === 'Server Connect Successful' ||
      res.message === 'Ping successful'
    ));

    if (online) {
      isServerOnline = true;
      updateSystemStatusUI(true);
      hideOfflineBlocker();
      return true;
    } else {
      throw new Error('Server returned non-200 status');
    }
  } catch (err) {
    console.warn('[ServerHealth] Backend is unreachable or offline:', err.message || err);
    isServerOnline = false;
    updateSystemStatusUI(false);
    showOfflineBlocker();
    return false;
  }
}

/**
 * Triggers the offline blocker when a runtime network failure or server disconnect occurs.
 * @param {string} [reason]
 */
export function triggerServerOffline(reason = '') {
  if (isServerOnline) {
    isServerOnline = false;
    updateSystemStatusUI(false);
    showOfflineBlocker(reason);
  }
}

/**
 * Current server connection status
 * @returns {boolean}
 */
export function getServerStatus() {
  return isServerOnline;
}

// Global exposure for debugging & inline handlers
if (typeof window !== 'undefined') {
  window.checkServerHealth = checkServerHealth;
  window.retryServerConnection = retryServerConnection;
  window.showAppLoading = showAppLoading;
  window.hideAppLoading = hideAppLoading;
  window.showOfflineBlocker = showOfflineBlocker;
  window.hideOfflineBlocker = hideOfflineBlocker;
}
