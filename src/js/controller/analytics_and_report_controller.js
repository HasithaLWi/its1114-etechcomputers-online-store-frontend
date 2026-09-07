import { getAllOrders, syncOrdersFromApi } from './order_management_controller.js';
import { getBranches, syncBranchesFromApi } from './branch_controller.js';
import { AnalyticsApi } from '../api/analyticsApi.js';

/**
 * ============================================================
 * TAB 6: FINANCIAL ANALYTICS & REPORTS (ADMIN ONLY)
 * ============================================================
 */
export async function renderAnalyticsTab() {
  const list = document.getElementById('analytics-branches-list');
  if (!list) return;

  await Promise.allSettled([syncOrdersFromApi(), syncBranchesFromApi()]);

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
      return;
    }
  } catch (err) {
    console.warn('[AnalyticsController] Analytics API fallback:', err.message || err);
  }

  const orders = getAllOrders();
  const branches = getBranches();

  // Branch Revenue Calculations
  const branchSales = branches.map(b => {
    const branchOrders = orders.filter(o => o.fulfillmentBranchId === b.id || o.fulfillmentBranch === b.name);
    const revenue = branchOrders.reduce((sum, o) => sum + (parseFloat((o.totalAmount || "0").toString().replace(/[^0-9.]/g, '')) || 0), 0);
    return { name: b.name, city: b.city, count: branchOrders.length, revenue };
  });

  const maxRevenue = Math.max(...branchSales.map(bs => bs.revenue), 1000);

  list.innerHTML = branchSales.map(bs => {
    const percentage = Math.round((bs.revenue / maxRevenue) * 100);
    return `
      <div class="bg-[#f8fafc] p-4 rounded-md border border-[#e2e8f0] space-y-2 shadow-xs">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-[#0f172a]">${bs.name} (${bs.city})</span>
          <span class="font-mono text-blue-600 font-extrabold">Rs. ${bs.revenue.toLocaleString()} (${bs.count} orders)</span>
        </div>
        <div class="w-full h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden border border-[#cbd5e1]">
          <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}