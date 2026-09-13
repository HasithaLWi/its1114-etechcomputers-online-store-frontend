import { AnalyticsApi } from '../api/analyticsApi.js';
import { etechAlert } from '../util/index.js';

/**
 * ============================================================
 * TAB 6: FINANCIAL ANALYTICS & REPORTS (ADMIN ONLY)
 * ============================================================
 */
export async function renderAnalyticsTab() {
  const list = document.getElementById('analytics-branches-list');
  if (!list) return;

  try {
    const branchRev = await AnalyticsApi.getBranchRevenue();
    const data = Array.isArray(branchRev) ? branchRev : (branchRev && branchRev.content ? branchRev.content : null);
    if (data && data.length > 0) {
      const maxRevenue = Math.max(...data.map(bs => Number(bs.revenue) || 0), 1000);
      list.innerHTML = data.map(bs => {
        const rev = Number(bs.revenue) || 0;
        const count = Number(bs.ordersCount || bs.count) || 0;
        const percentage = Math.round((rev / maxRevenue) * 100);
        return `
          <div class="bg-[#f8fafc] p-4 rounded-md border border-[#e2e8f0] space-y-2 shadow-xs">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[#0f172a]">${bs.branchName || bs.name} (${bs.city || 'Hub'})</span>
              <span class="font-mono text-blue-600 font-extrabold">Rs. ${rev.toLocaleString()} (${count} orders)</span>
            </div>
            <div class="w-full h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden border border-[#cbd5e1]">
              <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      list.innerHTML = `
        <div class="p-8 text-center text-xs text-slate-400">
          No branch revenue recorded yet.
        </div>
      `;
    }
  } catch (err) {
    console.error('[AnalyticsController] Analytics API error:', err);
    etechAlert.error('Connection Error', 'Unable to load analytics. Please try again.');
    list.innerHTML = `
      <div class="p-8 text-center space-y-3 bg-rose-50/50 rounded-xl border border-rose-200">
        <p class="text-xs font-bold text-rose-700">Unable to Load Analytics</p>
        <p class="text-[11px] text-slate-500">Failed to fetch branch revenue statistics. Please check your connection and try again.</p>
        <button onclick="renderAnalyticsTab()" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer">Retry</button>
      </div>
    `;
  }
}