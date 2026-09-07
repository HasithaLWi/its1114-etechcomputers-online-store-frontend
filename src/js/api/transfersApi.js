// ============================================================
//  src/js/api/transfersApi.js — Inter-Branch Stock Transfers API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const TransfersApi = {
  /**
   * Fetch all stock transfer records with optional filtering
   * GET /api/v1/transfers
   */
  async getAll(params = {}) {
    console.log('[TransfersAPI] getAll() -> params:', params);
    const res = await ajaxRequest({
      endpoint: '/transfers',
      method: 'GET',
      data: params
    });
    return res.body || res;
  },

  /**
   * Fetch single transfer record by ID
   * GET /api/v1/transfers/{id}
   */
  async getById(id) {
    console.log('[TransfersAPI] getById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/transfers/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Initiate a new stock transfer between branches
   * POST /api/v1/transfers
   */
  async initiate(transferData) {
    console.log('[TransfersAPI] initiate() -> payload:', transferData);
    return ajaxRequest({
      endpoint: '/transfers',
      method: 'POST',
      data: transferData
    });
  },

  /**
   * Update stock transfer status (PENDING -> IN_TRANSIT -> RECEIVED / CANCELLED)
   * PATCH /api/v1/transfers/{id}/status?status={status}
   */
  async updateStatus(id, status) {
    console.log('[TransfersAPI] updateStatus() -> ID:', id, 'status:', status);
    return ajaxRequest({
      endpoint: `/transfers/${encodeURIComponent(id)}/status?status=${encodeURIComponent(status)}`,
      method: 'PATCH'
    });
  },

  /**
   * Fetch transfer metrics & KPIs (pendingCount, inTransitCount, receivedCount, totalUnitsMoved)
   * GET /api/v1/transfers/metrics
   */
  async getMetrics() {
    console.log('[TransfersAPI] getMetrics() -> fetching transfer metrics');
    const res = await ajaxRequest({
      endpoint: '/transfers/metrics',
      method: 'GET'
    });
    return res.body || res;
  }
};
