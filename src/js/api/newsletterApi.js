import { ajaxRequest } from './apiClient.js';
import {
  Subscriber,
  NEWSLETTER_STATUS,
  getNewsletterSubscribers,
  setMemorySubscribers,
  getNewsletterCampaigns,
  setMemoryCampaigns,
  isValidEmail,
  getNewsletterAnalytics,
  getNameFromEmail
} from '../models/newsletter_model.js';

export const NewsletterApi = {
  /**
   * Fetch newsletter subscribers with search, status, and pagination
   * GET /api/v1/newsletter/subscribers
   */
  async getAll({ search = '', status = '', page = 0, size = 100 } = {}) {
    const params = {};
    if (search) params.search = search;
    if (status && status !== 'ALL') params.status = status;
    if (page !== undefined) params.page = page;
    if (size !== undefined) params.size = size;

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/newsletter/subscribers${queryString ? '?' + queryString : ''}`;

    const res = await ajaxRequest({
      endpoint,
      method: 'GET'
    });

    const body = res.body || res;
    let rawList = [];

    if (Array.isArray(body)) {
      rawList = body;
    } else if (body && Array.isArray(body.content)) {
      rawList = body.content;
    } else if (body && Array.isArray(body.data)) {
      rawList = body.data;
    }

    const subscribersList = rawList.map(s => new Subscriber(s));
    setMemorySubscribers(subscribersList);

    return {
      success: true,
      data: subscribersList,
      total: (body && (body.totalElements !== undefined ? body.totalElements : subscribersList.length)) || subscribersList.length,
      pageNumber: body && body.pageNumber !== undefined ? body.pageNumber : 0,
      totalPages: body && body.totalPages !== undefined ? body.totalPages : 1,
      analytics: getNewsletterAnalytics()
    };
  },

  /**
   * Alias for backward compatibility
   */
  async getAllSubscribers(params) {
    return this.getAll(params);
  },

  /**
   * Get single subscriber by ID
   * GET /api/v1/newsletter/subscribers/{id}
   */
  async getById(id) {
    const res = await ajaxRequest({
      endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    const data = res.body || res;
    return { success: true, data: new Subscriber(data) };
  },

  /**
   * Subscribe an email address to the newsletter
   * POST /api/v1/newsletter/subscribe
   */
  async subscribe({ email, name = '' }) {
    if (!isValidEmail(email)) {
      throw new Error('Please provide a valid email address.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || getNameFromEmail(cleanEmail)).trim();

    const payload = {
      email: cleanEmail,
      name: cleanName
    };

    const res = await ajaxRequest({
      endpoint: '/newsletter/subscribe',
      method: 'POST',
      data: payload
    });

    const data = res.body || res;
    const subInstance = new Subscriber(data.data || data);

    const list = getNewsletterSubscribers();
    const idx = list.findIndex(s => s.email.toLowerCase() === cleanEmail);
    if (idx !== -1) {
      list[idx] = subInstance;
    } else {
      list.unshift(subInstance);
    }
    setMemorySubscribers(list);

    return {
      success: true,
      message: res.message || '🎉 Successfully subscribed to ETech Computers updates!',
      data: subInstance
    };
  },

  /**
   * Public storefront unsubscribe by email
   * POST /api/v1/newsletter/unsubscribe
   */
  async unsubscribe(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const res = await ajaxRequest({
      endpoint: '/newsletter/unsubscribe',
      method: 'POST',
      data: { email: cleanEmail }
    });

    const list = getNewsletterSubscribers();
    const sub = list.find(s => s.email.toLowerCase() === cleanEmail);
    if (sub) {
      sub.status = NEWSLETTER_STATUS.UNSUBSCRIBED;
      sub.unsubscribedAt = new Date().toISOString();
      setMemorySubscribers(list);
    }

    return {
      success: true,
      message: res.message || `Unsubscribed ${cleanEmail} successfully.`,
      data: sub || { email: cleanEmail, status: NEWSLETTER_STATUS.UNSUBSCRIBED }
    };
  },

  /**
   * Update subscriber status (SUBSCRIBED | UNSUBSCRIBED)
   * PATCH /api/v1/newsletter/subscribers/{id}/status?status={status}
   */
  async updateStatus(id, newStatus) {
    const res = await ajaxRequest({
      endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}/status?status=${encodeURIComponent(newStatus)}`,
      method: 'PATCH'
    });

    const list = getNewsletterSubscribers();
    const sub = list.find(s => String(s.id) === String(id));
    if (sub) {
      sub.status = newStatus;
      if (newStatus === NEWSLETTER_STATUS.UNSUBSCRIBED) {
        sub.unsubscribedAt = new Date().toISOString();
      } else {
        sub.unsubscribedAt = null;
      }
      setMemorySubscribers(list);
    }

    return {
      success: true,
      message: res.message || `Status updated to ${newStatus}.`,
      data: sub
    };
  },

  /**
   * Update subscriber details (Admin)
   * PUT /api/v1/newsletter/subscribers/{id}
   */
  async updateSubscriber(id, { email, name, status }) {
    const payload = {
      email: (email || '').trim().toLowerCase(),
      name: (name || '').trim(),
      status: status || NEWSLETTER_STATUS.SUBSCRIBED
    };

    const res = await ajaxRequest({
      endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: payload
    });

    const data = res.body || res;
    const subInstance = new Subscriber(data.data || data);

    const list = getNewsletterSubscribers();
    const idx = list.findIndex(s => String(s.id) === String(id));
    if (idx !== -1) {
      list[idx] = subInstance;
      setMemorySubscribers(list);
    }

    return {
      success: true,
      message: res.message || 'Subscriber details updated successfully.',
      data: subInstance
    };
  },

  /**
   * Delete subscriber by ID (Admin)
   * DELETE /api/v1/newsletter/subscribers/{id}
   */
  async deleteSubscriber(id) {
    const res = await ajaxRequest({
      endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });

    const list = getNewsletterSubscribers().filter(s => String(s.id) !== String(id));
    setMemorySubscribers(list);

    return {
      success: true,
      message: res.message || 'Subscriber removed successfully.'
    };
  },


  async delete(id) {
    return this.deleteSubscriber(id);
  },



  // PATCH /api/v1/newsletter/subscribers/bulk-status?status={status}
  async bulkUpdateStatus(ids, status) {
    const numericIds = (ids || []).map(id => Number(id)).filter(n => !isNaN(n));
    const res = await ajaxRequest({
      endpoint: `/newsletter/subscribers/bulk-status?status=${encodeURIComponent(status)}`,
      method: 'PATCH',
      data: numericIds
    });

    const list = getNewsletterSubscribers();
    const idSet = new Set(ids.map(String));
    list.forEach(s => {
      if (idSet.has(String(s.id))) {
        s.status = status;
        if (status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
          s.unsubscribedAt = new Date().toISOString();
        } else {
          s.unsubscribedAt = null;
        }
      }
    });
    setMemorySubscribers(list);

    return {
      success: true,
      message: res.message || `Updated status for ${ids.length} subscribers.`
    };
  },



  // DELETE /api/v1/newsletter/subscribers/bulk-delete
  async bulkDelete(ids) {
    const numericIds = (ids || []).map(id => Number(id)).filter(n => !isNaN(n));
    const res = await ajaxRequest({
      endpoint: '/newsletter/subscribers/bulk-delete',
      method: 'DELETE',
      data: numericIds
    });

    const idSet = new Set(ids.map(String));
    const list = getNewsletterSubscribers().filter(s => !idSet.has(String(s.id)));
    setMemorySubscribers(list);

    return {
      success: true,
      message: res.message || `Deleted ${ids.length} subscribers successfully.`
    };
  },



  // POST /api/v1/newsletter/campaigns/send
  async sendCampaign(campaignData) {
    const payload = {
      subject: campaignData.subject,
      preheader: campaignData.preheader || '',
      category: campaignData.category || 'GENERAL_NEWS',
      targetSegment: campaignData.targetSegment || 'ALL_ACTIVE',
      contentHtml: campaignData.contentHtml || '',
      authorName: campaignData.authorName || 'Store Admin'
    };

    const res = await ajaxRequest({
      endpoint: '/newsletter/campaigns/send',
      method: 'POST',
      data: payload
    });

    const data = res.body || res;
    return {
      success: true,
      message: res.message || '🚀 Campaign broadcast sent successfully!',
      data: data.data || data
    };
  },

  // GET /api/v1/newsletter/campaigns
  async getCampaigns() {
    const res = await ajaxRequest({
      endpoint: '/newsletter/campaigns',
      method: 'GET'
    });

    const body = res.body || res;
    let list = [];
    if (Array.isArray(body)) {
      list = body;
    } else if (body && Array.isArray(body.data)) {
      list = body.data;
    } else if (body && Array.isArray(body.content)) {
      list = body.content;
    }

    setMemoryCampaigns(list);

    return {
      success: true,
      data: list
    };
  }
};
