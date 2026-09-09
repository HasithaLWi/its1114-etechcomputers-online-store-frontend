// ============================================================
//  src/js/api/testApi.js — System Health & Ping Test API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const TestApi = {
  /**
   * Ping backend test endpoint to verify server availability
   * POST /api/v1/test/ping
   * @returns {Promise<object>}
   */
  async ping() {
    console.log('[TestAPI] ping() -> testing server connectivity');
    return ajaxRequest({
      endpoint: '/test/ping',
      method: 'POST'
    });
  }
};
