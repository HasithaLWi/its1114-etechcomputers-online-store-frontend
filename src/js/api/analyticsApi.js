// ============================================================
//  src/js/api/analyticsApi.js — Financial Analytics & Reports API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const AnalyticsApi = {
  /**
   * Fetch complete store-wide financial and sales KPI overview
   * GET /api/v1/analytics/overview
   */
  async getOverview() {
    console.log('[AnalyticsAPI] getOverview() -> fetching executive overview');
    const res = await ajaxRequest({
      endpoint: '/analytics/overview',
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch regional branch revenue breakdown
   * GET /api/v1/analytics/branch-revenue
   */
  async getBranchRevenue() {
    console.log('[AnalyticsAPI] getBranchRevenue() -> fetching branch revenue breakdown');
    const res = await ajaxRequest({
      endpoint: '/analytics/branch-revenue',
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch top-selling products by units/revenue
   * GET /api/v1/analytics/top-products?limit={limit}
   */
  async getTopProducts(limit = 5) {
    console.log('[AnalyticsAPI] getTopProducts() -> limit:', limit);
    const res = await ajaxRequest({
      endpoint: `/analytics/top-products?limit=${encodeURIComponent(limit)}`,
      method: 'GET'
    });
    return res.body || res;
  }
};
