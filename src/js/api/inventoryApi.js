// ============================================================
//  src/js/api/inventoryApi.js — Stock Health & Inventory Alerts API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const InventoryApi = {
  /**
   * Fetch comprehensive stock health report across branches
   * GET /api/v1/inventory/health-report
   */
  async getHealthReport(branchId = null) {
    console.log('[InventoryAPI] getHealthReport() -> branchId:', branchId);
    const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
    const res = await ajaxRequest({
      endpoint: `/inventory/health-report${query}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Update product inventory alert settings (alertEnabled, lowStockMargin)
   * PATCH /api/v1/inventory/{productId}/settings
   */
  async updateSettings(productId, { alertEnabled, lowStockMargin }) {
    console.log('[InventoryAPI] updateSettings() -> Product ID:', productId, { alertEnabled, lowStockMargin });
    return ajaxRequest({
      endpoint: `/inventory/${encodeURIComponent(productId)}/settings`,
      method: 'PATCH',
      data: {
        alertEnabled: Boolean(alertEnabled),
        lowStockMargin: Number(lowStockMargin) || 5
      }
    });
  },

  /**
   * Adjust stock quantity delta (+/-) directly for a specific branch
   * POST /api/v1/inventory/{productId}/adjust
   */
  async adjustStock(productId, { branchId, quantityDelta }) {
    console.log('[InventoryAPI] adjustStock() -> Product ID:', productId, { branchId, quantityDelta });
    return ajaxRequest({
      endpoint: `/inventory/${encodeURIComponent(productId)}/adjust`,
      method: 'POST',
      data: {
        branchId,
        quantityDelta: Number(quantityDelta) || 0
      }
    });
  }
};
