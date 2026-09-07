// ============================================================
//  src/js/util/toast.js — Universal Modern Toast Notification System
// ============================================================

import { iconCheck, iconAlert, iconInfo, iconClose } from './icons.js';

let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }

  let existing = document.getElementById('global-toast-container');
  if (existing) {
    toastContainer = existing;
    return toastContainer;
  }

  toastContainer = document.createElement('div');
  toastContainer.id = 'global-toast-container';
  toastContainer.className = 'fixed bottom-5 right-5 z-[9999] flex flex-col space-y-2.5 pointer-events-none max-w-sm sm:max-w-md w-full px-4 sm:px-0';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * Display a modern, non-blocking toast notification
 * 
 * @param {string} message - Message text
 * @param {'info'|'success'|'error'|'warning'} [type='info']
 * @param {number} [duration=3500] - Duration in ms
 */
export function showToast(message, type = 'info', duration = 3500) {
  const container = ensureToastContainer();

  const typeConfigs = {
    success: {
      bg: 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-900/20',
      icon: iconCheck('w-4 h-4 text-emerald-400 flex-shrink-0'),
      iconBg: 'bg-emerald-900/60 border-emerald-700/50'
    },
    error: {
      bg: 'bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-900/20',
      icon: iconAlert('w-4 h-4 text-rose-400 flex-shrink-0'),
      iconBg: 'bg-rose-900/60 border-rose-700/50'
    },
    warning: {
      bg: 'bg-amber-950/90 text-amber-100 border-amber-500/40 shadow-amber-900/20',
      icon: iconAlert('w-4 h-4 text-amber-400 flex-shrink-0'),
      iconBg: 'bg-amber-900/60 border-amber-700/50'
    },
    info: {
      bg: 'bg-slate-900/95 text-slate-100 border-slate-700/60 shadow-slate-950/30',
      icon: iconInfo('w-4 h-4 text-blue-400 flex-shrink-0'),
      iconBg: 'bg-slate-800 border-slate-700'
    }
  };

  const config = typeConfigs[type] || typeConfigs.info;

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300 transform translate-y-3 opacity-0 ${config.bg}`;
  
  toast.innerHTML = `
    <div class="flex items-center space-x-3 mr-2 overflow-hidden">
      <div class="w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${config.iconBg}">
        ${config.icon}
      </div>
      <p class="text-xs sm:text-sm font-medium leading-snug break-words">${message}</p>
    </div>
    <button type="button" class="text-slate-400 hover:text-white p-1 rounded-md transition-colors flex-shrink-0" aria-label="Close">
      ${iconClose('w-3.5 h-3.5')}
    </button>
  `;

  const closeBtn = toast.querySelector('button');
  const dismiss = () => {
    toast.classList.add('opacity-0', 'translate-y-2', 'scale-95');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  };

  closeBtn.addEventListener('click', dismiss);

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-3');
    toast.classList.add('opacity-100', 'translate-y-0');
  });

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
}

// Attach to window object for legacy / inline calls
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
