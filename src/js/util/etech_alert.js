// ============================================================
//  src/js/util/etech_alert.js — ETech Custom Alert & Confirmation System
// ============================================================
import {
  iconAlert,
  iconCheck,
  iconInfo,
  iconTrash,
  iconEdit,
  iconPlus,
  iconClose,
  iconLock
} from './icons.js';

/**
 * Creates and mounts a custom modal dialog on the page.
 * Returns a Promise that resolves with the user's action.
 */
function createModalElement(options = {}) {
  const {
    title = 'Notification',
    message = '',
    details = '',
    type = 'info', // 'info' | 'success' | 'warning' | 'error' | 'danger' | 'create' | 'update'
    icon = null,
    showCancel = true,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    confirmClass = '',
    hasInput = false,
    inputPlaceholder = '',
    inputValue = '',
    inputType = 'text',
    autoFocus = 'confirm' // 'confirm' | 'cancel' | 'input'
  } = options;

  return new Promise((resolve) => {
    // Backdrop Overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#0f172a]/70 backdrop-blur-xs transition-opacity duration-200 opacity-0';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    // Type Configurations (Icons, Accents & Glows)
    const typeThemes = {
      danger: {
        iconBg: 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-500/10',
        defaultIcon: iconTrash('w-6 h-6 text-rose-600'),
        confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
        badge: 'DANGER ACTION',
        badgeClass: 'bg-rose-100 text-rose-800'
      },
      error: {
        iconBg: 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-500/10',
        defaultIcon: iconAlert('w-6 h-6 text-rose-600'),
        confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
        badge: 'ERROR NOTICE',
        badgeClass: 'bg-rose-100 text-rose-800'
      },
      warning: {
        iconBg: 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-500/10',
        defaultIcon: iconAlert('w-6 h-6 text-amber-600'),
        confirmBtn: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20',
        badge: 'PLEASE NOTE',
        badgeClass: 'bg-amber-100 text-amber-800'
      },
      success: {
        iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-500/10',
        defaultIcon: iconCheck('w-6 h-6 text-emerald-600'),
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
        badge: 'SUCCESS',
        badgeClass: 'bg-emerald-100 text-emerald-800'
      },
      create: {
        iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-500/10',
        defaultIcon: iconPlus('w-6 h-6 text-emerald-600'),
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
        badge: 'NEW RECORD',
        badgeClass: 'bg-emerald-100 text-emerald-800'
      },
      update: {
        iconBg: 'bg-blue-50 border-blue-200 text-blue-600 shadow-blue-500/10',
        defaultIcon: iconEdit('w-6 h-6 text-blue-600'),
        confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
        badge: 'UPDATE CONFIRMATION',
        badgeClass: 'bg-blue-100 text-blue-800'
      },
      info: {
        iconBg: 'bg-blue-50 border-blue-200 text-blue-600 shadow-blue-500/10',
        defaultIcon: iconInfo('w-6 h-6 text-blue-600'),
        confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
        badge: 'INFORMATION',
        badgeClass: 'bg-blue-100 text-blue-800'
      }
    };

    const currentTheme = typeThemes[type] || typeThemes.info;
    const finalIcon = icon || currentTheme.defaultIcon;
    const finalConfirmBtnClass = confirmClass || currentTheme.confirmBtn;

    // Dialog Box Card
    const dialog = document.createElement('div');
    dialog.className = 'bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e2e8f0] transform scale-95 transition-all duration-200 opacity-0 space-y-4';

    dialog.innerHTML = `
      <!-- Header -->
      <div class="flex items-start space-x-3.5">
        <div class="w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-xs ${currentTheme.iconBg}">
          ${finalIcon}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-extrabold tracking-wider uppercase ${currentTheme.badgeClass}">
              ${currentTheme.badge}
            </span>
          </div>
          <h3 class="text-base font-black text-[#0f172a] tracking-tight mt-1 leading-snug break-words">
            ${title}
          </h3>
        </div>
        <button type="button" id="etech-alert-close-btn" class="text-[#94a3b8] hover:text-[#0f172a] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" aria-label="Close dialog">
          ${iconClose('w-4 h-4')}
        </button>
      </div>

      <!-- Message Content -->
      <div class="text-xs sm:text-sm text-[#475569] leading-relaxed break-words space-y-2">
        <p>${message}</p>
        ${details ? `
          <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 leading-normal overflow-x-auto">
            ${details}
          </div>
        ` : ''}
      </div>

      <!-- Input Field (if prompt) -->
      ${hasInput ? `
        <div class="pt-1">
          <input type="${inputType}" id="etech-alert-input" value="${inputValue}" placeholder="${inputPlaceholder}"
            class="w-full px-3.5 py-2 border border-[#cbd5e1] rounded-xl text-xs font-medium text-[#0f172a] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20" />
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div class="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#f1f5f9]">
        ${showCancel ? `
          <button type="button" id="etech-alert-cancel-btn" class="px-4 py-2.5 rounded-xl border border-[#cbd5e1] bg-white hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] text-xs font-bold transition-all shadow-2xs cursor-pointer">
            ${cancelText}
          </button>
        ` : ''}
        <button type="button" id="etech-alert-confirm-btn" class="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer transform hover:-translate-y-0.5 ${finalConfirmBtnClass}">
          ${confirmText}
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Animate In
    requestAnimationFrame(() => {
      overlay.classList.remove('opacity-0');
      overlay.classList.add('opacity-100');
      dialog.classList.remove('opacity-0', 'scale-95');
      dialog.classList.add('opacity-100', 'scale-100');
    });

    const inputEl = dialog.querySelector('#etech-alert-input');
    const confirmBtn = dialog.querySelector('#etech-alert-confirm-btn');
    const cancelBtn = dialog.querySelector('#etech-alert-cancel-btn');
    const closeBtn = dialog.querySelector('#etech-alert-close-btn');

    // Auto Focus
    setTimeout(() => {
      if (hasInput && inputEl) {
        inputEl.focus();
        inputEl.select();
      } else if (autoFocus === 'cancel' && cancelBtn) {
        cancelBtn.focus();
      } else if (confirmBtn) {
        confirmBtn.focus();
      }
    }, 50);

    const cleanup = (result) => {
      overlay.classList.add('opacity-0');
      dialog.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        resolve(result);
      }, 200);
    };

    // Event Handlers
    confirmBtn.addEventListener('click', () => {
      if (hasInput) {
        cleanup(inputEl ? inputEl.value : '');
      } else {
        cleanup(true);
      }
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => cleanup(hasInput ? null : false));
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => cleanup(hasInput ? null : false));
    }

    // Keyboard support
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        document.removeEventListener('keydown', handleKeyDown);
        cleanup(hasInput ? null : false);
      } else if (e.key === 'Enter' && (e.target === inputEl || !hasInput)) {
        e.preventDefault();
        document.removeEventListener('keydown', handleKeyDown);
        if (hasInput) {
          cleanup(inputEl ? inputEl.value : '');
        } else {
          cleanup(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
  });
}

/**
 * Modern Custom Alert & Confirmation API
 */
export const etechAlert = {
  /**
   * Generic Confirmation Modal
   * @returns {Promise<boolean>}
   */
  confirm(options = {}) {
    if (typeof options === 'string') {
      options = { message: options };
    }
    return createModalElement({
      title: options.title || 'Please Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      details: options.details || '',
      type: options.type || 'warning',
      confirmText: options.confirmText || 'Yes, Confirm',
      cancelText: options.cancelText || 'Cancel',
      confirmClass: options.confirmClass,
      showCancel: true
    });
  },

  /**
   * Pre-configured Confirmation for Deletion Actions
   * @param {string} entityName - e.g. "Category 'Gaming Keyboards'"
   * @param {string} [extraInfo] - Optional additional consequences or details
   * @returns {Promise<boolean>}
   */
  confirmDelete(entityName = 'this item', extraInfo = '') {
    return createModalElement({
      title: `Delete ${entityName}?`,
      message: `Are you sure you want to delete ${entityName}? This action cannot be undone.`,
      details: extraInfo,
      type: 'danger',
      confirmText: 'Yes, Delete',
      cancelText: 'Keep Record',
      showCancel: true,
      autoFocus: 'cancel'
    });
  },

  /**
   * Pre-configured Confirmation for Update / Edit Actions
   * @param {string} entityName - e.g. "Product 'RTX 4090'"
   * @param {string} [extraInfo]
   * @returns {Promise<boolean>}
   */
  confirmUpdate(entityName = 'changes', extraInfo = '') {
    return createModalElement({
      title: `Save Changes to ${entityName}?`,
      message: `Confirm that you want to apply these updates to ${entityName}. The live storefront and inventory records will reflect this change immediately.`,
      details: extraInfo,
      type: 'update',
      confirmText: 'Save Changes',
      cancelText: 'Cancel',
      showCancel: true,
      autoFocus: 'confirm'
    });
  },

  /**
   * Pre-configured Confirmation for Create Actions
   * @param {string} entityName - e.g. "New Promotion Campaign"
   * @param {string} [extraInfo]
   * @returns {Promise<boolean>}
   */
  confirmCreate(entityName = 'new record', extraInfo = '') {
    return createModalElement({
      title: `Create ${entityName}?`,
      message: `Confirm creating this ${entityName}. It will be saved and activated.`,
      details: extraInfo,
      type: 'create',
      confirmText: 'Create Now',
      cancelText: 'Cancel',
      showCancel: true,
      autoFocus: 'confirm'
    });
  },

  /**
   * Information Alert Modal (Single OK Button)
   */
  info(title, message, details = '') {
    if (typeof title === 'object') {
      message = title.message;
      details = title.details || '';
      title = title.title || 'Information';
    }
    return createModalElement({
      title: title || 'Information',
      message: message || '',
      details,
      type: 'info',
      confirmText: 'Understood',
      showCancel: false
    });
  },

  /**
   * Success Modal (Single OK Button)
   */
  success(title, message, details = '') {
    if (typeof title === 'object') {
      message = title.message;
      details = title.details || '';
      title = title.title || 'Success';
    }
    return createModalElement({
      title: title || 'Success',
      message: message || 'Action completed successfully.',
      details,
      type: 'success',
      confirmText: 'Continue',
      showCancel: false
    });
  },

  /**
   * Warning Modal (Single Acknowledge Button)
   */
  warning(title, message, details = '') {
    if (typeof title === 'object') {
      message = title.message;
      details = title.details || '';
      title = title.title || 'Warning';
    }
    return createModalElement({
      title: title || 'Warning',
      message: message || 'Please review this warning.',
      details,
      type: 'warning',
      confirmText: 'I Understand',
      showCancel: false
    });
  },

  /**
   * Error Modal (Single Dismiss Button)
   */
  error(title, message, details = '') {
    if (typeof title === 'object') {
      message = title.message;
      details = title.details || '';
      title = title.title || 'Error Occurred';
    }
    return createModalElement({
      title: title || 'Error Occurred',
      message: message || 'An unexpected error occurred.',
      details,
      type: 'error',
      confirmText: 'Dismiss',
      showCancel: false
    });
  },

  /**
   * Input Prompt Modal
   * @returns {Promise<string|null>}
   */
  prompt(title, message, options = {}) {
    return createModalElement({
      title: title || 'Input Required',
      message: message || '',
      type: options.type || 'info',
      hasInput: true,
      inputPlaceholder: options.placeholder || 'Enter value...',
      inputValue: options.defaultValue || '',
      inputType: options.inputType || 'text',
      confirmText: options.confirmText || 'Submit',
      cancelText: options.cancelText || 'Cancel',
      showCancel: true
    });
  }
};

// Expose on window for inline handlers & debugging
if (typeof window !== 'undefined') {
  window.etechAlert = etechAlert;
}
