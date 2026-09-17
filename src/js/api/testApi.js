import { ajaxRequest } from './apiClient.js';

export const TestApi = {

  // POST /api/v1/test/ping
  async ping() {
    console.log('[TestAPI] ping() -> testing server connectivity');
    return ajaxRequest({
      endpoint: '/test/ping',
      method: 'POST'
    });
  }
};
