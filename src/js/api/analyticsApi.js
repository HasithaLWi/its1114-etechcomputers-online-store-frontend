// ============================================================
//  src/js/api/analyticsApi.js — Enterprise Financial Analytics & Reports API Client
// ============================================================
import { ajaxRequest, API_BASE_URL, getToken } from './apiClient.js';

export const AnalyticsApi = {
  /**
   * Fetch executive summary KPIs (Gross Rev, Net Rev, Orders, AOV, Units Sold, Fulfillment Rate)
   * GET /api/v1/analytics/summary?from={from}&to={to}&branchId={branchId}
   */
  async getSummary(from = null, to = null, branchId = 'ALL') {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (branchId) params.append('branchId', branchId);

    const res = await ajaxRequest({
      endpoint: `/analytics/summary?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch daily sales trend time series data
   * GET /api/v1/analytics/sales-trends?from={from}&to={to}&branchId={branchId}
   */
  async getSalesTrends(from = null, to = null, branchId = 'ALL') {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (branchId) params.append('branchId', branchId);

    const res = await ajaxRequest({
      endpoint: `/analytics/sales-trends?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch regional branch performance matrix
   * GET /api/v1/analytics/branch-performance?from={from}&to={to}
   */
  async getBranchPerformance(from = null, to = null) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const res = await ajaxRequest({
      endpoint: `/analytics/branch-performance?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch category performance & revenue market share
   * GET /api/v1/analytics/category-performance?from={from}&to={to}&branchId={branchId}
   */
  async getCategoryPerformance(from = null, to = null, branchId = 'ALL') {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (branchId) params.append('branchId', branchId);

    const res = await ajaxRequest({
      endpoint: `/analytics/category-performance?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch top-selling hardware products by units & revenue
   * GET /api/v1/analytics/top-products?from={from}&to={to}&branchId={branchId}&limit={limit}
   */
  async getTopProducts(from = null, to = null, branchId = 'ALL', limit = 10) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (branchId) params.append('branchId', branchId);
    if (limit) params.append('limit', limit);

    const res = await ajaxRequest({
      endpoint: `/analytics/top-products?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch inventory stock units, low stock alerts and out of stock counts
   * GET /api/v1/analytics/inventory-health?branchId={branchId}
   */
  async getInventoryHealth(branchId = 'ALL') {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);

    const res = await ajaxRequest({
      endpoint: `/analytics/inventory-health?${params.toString()}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Trigger direct binary download of official PDF, Excel, or CSV report
   * GET /api/v1/reports/export?format={format}&from={from}&to={to}&branchId={branchId}
   */
  async exportReport(format = 'PDF', from = null, to = null, branchId = 'ALL') {
    const params = new URLSearchParams();
    params.append('format', format);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (branchId) params.append('branchId', branchId);

    const url = `${API_BASE_URL}/reports/export?${params.toString()}`;
    const token = getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`Report export failed with HTTP ${response.status}`);
    }

    let ext = 'pdf';
    const norm = format.toUpperCase();
    if (norm === 'XLSX' || norm === 'EXCEL') ext = 'xlsx';
    else if (norm === 'CSV') ext = 'csv';

    let filename = `ETec_Performance_Report_${new Date().toISOString().slice(0, 10)}.${ext}`;
    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    link.remove();
    return true;
  },

  // Legacy fallback
  async getOverview() {
    return this.getSummary();
  },

  async getBranchRevenue() {
    return this.getBranchPerformance();
  }
};
