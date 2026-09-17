import { ajaxRequest } from './apiClient.js';

export const ChatApi = {
  /**
   * Process a customer chat query through backend AI engine
   * POST /api/v1/chat/message
   */
  async sendMessage({ message, history = [] }) {
    console.log('[ChatAPI] sendMessage() -> message:', message);
    const res = await ajaxRequest({
      endpoint: '/chat/message',
      method: 'POST',
      data: {
        message: message.trim(),
        history
      }
    });
    return res.body || res;
  }
};
