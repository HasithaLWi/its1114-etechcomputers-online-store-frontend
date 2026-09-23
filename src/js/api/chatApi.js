import { ajaxRequest } from './apiClient.js';

export const ChatApi = {
  /**
   * Check if chatbot service is available on backend
   * GET /api/v1/chat/status
   */
  async getStatus() {
    try {
      const res = await ajaxRequest({
        endpoint: '/chat/status',
        method: 'GET'
      });
      return res.body || res;
    } catch (e) {
      console.warn('[ChatAPI] getStatus() failed:', e);
      return {
        available: false,
        message: '⚠️ E-T Chatbot is currently unavailable. Please get support through email: eteccomputers38@gmail.com'
      };
    }
  },

  /**
   * Process a customer chat query through backend AI engine
   * POST /api/v1/chat/message
   */
  async sendMessage({ message, history = [], cart = [] }) {
    console.log('[ChatAPI] sendMessage() -> message:', message);
    const res = await ajaxRequest({
      endpoint: '/chat/message',
      method: 'POST',
      data: {
        message: message.trim(),
        history,
        cart
      }
    });
    return res.body || res;
  }
};
