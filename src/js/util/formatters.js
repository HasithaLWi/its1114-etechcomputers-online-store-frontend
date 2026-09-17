// ============================================================
//  src/js/util/formatters.js — Reusable Data Formatting Utilities
// ============================================================

/**
 * Formats a numeric amount or string into Sri Lankan Rupees (LKR)
 * Example: formatLKR(1250000) => "Rs. 1,250,000.00"
 *          formatLKR(1250, { decimals: 0 }) => "Rs. 1,250"
 */
export function formatLKR(amount, options = {}) {
  if (amount === null || amount === undefined || amount === '') {
    return options.showCurrency === false ? '0.00' : 'Rs. 0.00';
  }

  const cleanNum = typeof amount === 'number'
    ? amount
    : parseFloat(String(amount).replace(/[^0-9.-]/g, ''));

  if (isNaN(cleanNum)) {
    return options.showCurrency === false ? '0.00' : 'Rs. 0.00';
  }

  const hasDecimals = cleanNum % 1 !== 0;
  const defaultDecimals = options.decimals !== undefined
    ? options.decimals
    : (hasDecimals ? 2 : 0);

  const formattedNum = cleanNum.toLocaleString('en-LK', {
    minimumFractionDigits: defaultDecimals,
    maximumFractionDigits: defaultDecimals
  });

  const prefix = options.showCurrency === false ? '' : 'Rs. ';
  return `${prefix}${formattedNum}`;
}

/**
 * Parses a currency string or number into a clean float value
 * Handles "Rs. 120,000.00", "120,000.00", "Rs. 0.00", or raw numbers
 * @param {number|string} amount
 * @returns {number}
 */
export function parseLKR(amount) {
  if (amount === null || amount === undefined || amount === '') return 0;
  if (typeof amount === 'number') return isNaN(amount) ? 0 : amount;
  let s = String(amount).replace(/Rs\.?|LKR/gi, '').trim();
  s = s.replace(/,/g, '');
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a number with comma separators
 * Example: formatNumber(12500) => "12,500"
 * 
 * @param {number|string} num
 * @param {number} [decimals]
 * @returns {string}
 */
export function formatNumber(num, decimals = 0) {
  const n = typeof num === 'number' ? num : parseFloat(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Formats an ISO date string or Date object into human-readable date
 * Example: formatDate("2026-09-07T14:30:00Z") => "Sep 7, 2026"
 * 
 * @param {string|Date|number} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return d.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Formats a date with time
 * Example: formatDateTime("2026-09-07T14:30:00Z") => "Sep 7, 2026, 2:30 PM"
 * 
 * @param {string|Date|number} date
 * @returns {string}
 */
export function formatDateTime(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculates discount amount and percentage
 * 
 * @param {number|string} originalPrice
 * @param {number|string} dealPrice
 * @returns {{ savingAmount: number, discountPercent: number, label: string }}
 */
export function formatDiscount(originalPrice, dealPrice) {
  const orig = typeof originalPrice === 'number' ? originalPrice : parseFloat(originalPrice) || 0;
  const deal = typeof dealPrice === 'number' ? dealPrice : parseFloat(dealPrice) || 0;

  const savingAmount = Math.max(0, orig - deal);
  const discountPercent = orig > 0 ? Math.round((savingAmount / orig) * 100) : 0;

  return {
    savingAmount,
    discountPercent,
    label: `Save ${formatLKR(savingAmount, { decimals: 0 })} (${discountPercent}%)`
  };
}

/**
 * Truncates text to a specified maximum length with ellipsis
 * 
 * @param {string} text
 * @param {number} maxLength
 * @param {string} [suffix='...']
 * @returns {string}
 */
export function truncate(text, maxLength = 40, suffix = '...') {
  if (!text) return '';
  const str = String(text).trim();
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trim() + suffix;
}

/**
 * Converts a title/string into a URL/DB safe slug
 * Example: slugify("Gaming Rigs & Laptops") => "gaming-rigs-laptops"
 * 
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitizes / escapes raw HTML strings to prevent XSS injection
 * 
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
