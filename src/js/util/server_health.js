// ============================================================
//  src/js/util/server_health.js — Server Connectivity & System Status Tracker
// ============================================================
import { TestApi } from '../api/testApi.js';
import { etechAlert } from './etech_alert.js';

let isServerOnline = true;
let hasShownOfflineAlert = false;

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

/**
 * Test if the server is online using POST /api/v1/test/ping.
 * If offline, updates UI system status to OFFLINE and shows simple error alert.
 * 
 * @param {boolean} [showAlert=true] - Whether to show the alert if offline
 * @returns {Promise<boolean>}
 */
export async function checkServerHealth(showAlert = true) {
  try {
    const res = await TestApi.ping();
    const online = res && (res.status === 200 || res.status === 201 || res.body === 'Server Connect Successful' || res.message === 'Ping successful');
    if (online) {
      hasShownOfflineAlert = false;
      updateSystemStatusUI(true);
      return true;
    } else {
      throw new Error('Server returned non-200 status');
    }
  } catch (err) {
    console.warn('[ServerHealth] Backend is unreachable or offline:', err.message || err);
    updateSystemStatusUI(false);
    if (showAlert && !hasShownOfflineAlert) {
      hasShownOfflineAlert = true;
      etechAlert.error('Server Error', 'Unable to connect to the backend server.');
    }
    return false;
  }
}

export function getServerStatus() {
  return isServerOnline;
}
