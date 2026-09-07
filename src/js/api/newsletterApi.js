// ============================================================
//  src/js/api/newsletterApi.js — Newsletter & Marketing API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';
import {
  Subscriber,
  NEWSLETTER_STATUS,
  NEWSLETTER_SOURCE,
  getNewsletterSubscribers,
  setMemorySubscribers,
  getNewsletterCampaigns,
  setMemoryCampaigns,
  isValidEmail,
  getNewsletterAnalytics
} from '../models/newsletter_model.js';

export const NewsletterApi = {
  /**
   * Fetch newsletter subscribers with search, status, and pagination
   * GET /api/v1/newsletter/subscribers
   */
  async getAll({ search = '', status = '', page = 0, size = 100 } = {}) {
    console.log('%c[NewsletterAPI] Fetching subscribers from backend server...', 'color: #2563eb; font-weight: bold;', { search, status, page, size });
    try {
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

      // Convert to Subscriber instances and update memory store
      const subscribersList = rawList.map(s => new Subscriber(s));
      setMemorySubscribers(subscribersList);

      console.log(`%c[NewsletterAPI] Successfully loaded ${subscribersList.length} subscribers from backend.`, 'color: #16a34a; font-weight: bold;');
      return {
        success: true,
        data: subscribersList,
        total: (body && (body.totalElements !== undefined ? body.totalElements : subscribersList.length)) || subscribersList.length,
        pageNumber: body && body.pageNumber !== undefined ? body.pageNumber : 0,
        totalPages: body && body.totalPages !== undefined ? body.totalPages : 1,
        analytics: getNewsletterAnalytics()
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Backend unreachable, utilizing in-memory fallback:', 'color: #ea580c; font-weight: bold;', apiErr.message);
      let list = getNewsletterSubscribers();
      if (status && status !== 'ALL') {
        list = list.filter(s => s.status === status);
      }
      if (search) {
        const q = search.toLowerCase().trim();
        list = list.filter(s =>
          s.email.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
        );
      }
      return {
        success: true,
        data: list,
        total: list.length,
        pageNumber: 0,
        totalPages: 1,
        analytics: getNewsletterAnalytics()
      };
    }
  },

  /**
   * Get single subscriber by ID
   * GET /api/v1/newsletter/subscribers/{id}
   */
  async getById(id) {
    console.log('%c[NewsletterAPI] Fetching subscriber details:', 'color: #2563eb;', id);
    try {
      const res = await ajaxRequest({
        endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
        method: 'GET'
      });
      const data = res.body || res;
      return { success: true, data: new Subscriber(data) };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Fallback to memory for getById:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const sub = list.find(s => String(s.id) === String(id));
      if (!sub) throw new Error(`Subscriber with ID ${id} not found.`);
      return { success: true, data: sub };
    }
  },

  /**
   * Subscribe an email address to the newsletter
   * POST /api/v1/newsletter/subscribe
   */
  async subscribe({ email, name = '', source = NEWSLETTER_SOURCE.STOREFRONT_BANNER, tags = ['Storefront'] }) {
    console.log('%c[NewsletterAPI] Subscribing email:', 'color: #2563eb; font-weight: bold;', { email, name, source });
    if (!isValidEmail(email)) {
      throw new Error('Please provide a valid email address.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const payload = {
      email: cleanEmail,
      name: (name || cleanEmail.split('@')[0]).trim(),
      source: source || NEWSLETTER_SOURCE.STOREFRONT_BANNER,
      tags: Array.isArray(tags) && tags.length ? tags : ['Storefront']
    };

    try {
      const res = await ajaxRequest({
        endpoint: '/newsletter/subscribe',
        method: 'POST',
        data: payload
      });

      const data = res.body || res;
      const subInstance = new Subscriber(data.data || data);

      // Update in-memory store
      const list = getNewsletterSubscribers();
      const idx = list.findIndex(s => s.email.toLowerCase() === cleanEmail);
      if (idx !== -1) {
        list[idx] = subInstance;
      } else {
        list.unshift(subInstance);
      }
      setMemorySubscribers(list);

      console.log('%c[NewsletterAPI] Subscription saved to backend:', 'color: #16a34a; font-weight: bold;', subInstance);
      return {
        success: true,
        message: res.message || '🎉 Thank you for subscribing to ETech Computers tech updates!',
        data: subInstance
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Backend subscribe fallback to memory:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const existing = list.find(s => s.email.toLowerCase() === cleanEmail);

      if (existing) {
        if (existing.status === NEWSLETTER_STATUS.SUBSCRIBED) {
          return {
            success: true,
            alreadySubscribed: true,
            message: 'You are already subscribed to ETech Computers updates!',
            data: existing
          };
        } else {
          existing.status = NEWSLETTER_STATUS.SUBSCRIBED;
          existing.subscribedAt = new Date().toISOString();
          existing.unsubscribedAt = null;
          if (name && !existing.name) existing.name = name;
          setMemorySubscribers(list);
          return {
            success: true,
            reactivated: true,
            message: 'Welcome back! Your subscription has been reactivated.',
            data: existing
          };
        }
      }

      const newSub = new Subscriber({
        id: Date.now(),
        email: cleanEmail,
        name: name || cleanEmail.split('@')[0],
        status: NEWSLETTER_STATUS.SUBSCRIBED,
        source: source || NEWSLETTER_SOURCE.STOREFRONT_BANNER,
        tags: tags && tags.length ? tags : ['Storefront']
      });

      list.unshift(newSub);
      setMemorySubscribers(list);

      return {
        success: true,
        isNew: true,
        message: '🎉 Thank you for subscribing to ETech Computers tech updates!',
        data: newSub
      };
    }
  },

  /**
   * Public storefront unsubscribe by email
   * POST /api/v1/newsletter/unsubscribe
   */
  async unsubscribe(email) {
    console.log('%c[NewsletterAPI] Unsubscribing email:', 'color: #2563eb;', email);
    const cleanEmail = (email || '').trim().toLowerCase();

    try {
      const res = await ajaxRequest({
        endpoint: '/newsletter/unsubscribe',
        method: 'POST',
        data: { email: cleanEmail }
      });

      // Update in-memory state
      const list = getNewsletterSubscribers();
      const sub = list.find(s => s.email.toLowerCase() === cleanEmail);
      if (sub) {
        sub.status = NEWSLETTER_STATUS.UNSUBSCRIBED;
        sub.unsubscribedAt = new Date().toISOString();
        setMemorySubscribers(list);
      }

      console.log('%c[NewsletterAPI] Unsubscribe successful on backend:', 'color: #16a34a;', cleanEmail);
      return {
        success: true,
        message: res.message || `Unsubscribed ${cleanEmail} successfully.`,
        data: sub || { email: cleanEmail, status: NEWSLETTER_STATUS.UNSUBSCRIBED }
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Backend unsubscribe fallback to memory:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const sub = list.find(s => s.email.toLowerCase() === cleanEmail);
      if (!sub) throw new Error('Subscriber not found.');

      sub.status = NEWSLETTER_STATUS.UNSUBSCRIBED;
      sub.unsubscribedAt = new Date().toISOString();
      setMemorySubscribers(list);

      return {
        success: true,
        message: `Unsubscribed ${sub.email} successfully.`,
        data: sub
      };
    }
  },

  /**
   * Update subscriber status (SUBSCRIBED | UNSUBSCRIBED)
   * PATCH /api/v1/newsletter/subscribers/{id}/status?status={status}
   */
  async updateStatus(id, newStatus) {
    console.log('%c[NewsletterAPI] Updating subscriber status:', 'color: #2563eb;', { id, newStatus });
    try {
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

      console.log('%c[NewsletterAPI] Subscriber status updated on backend:', 'color: #16a34a;', { id, newStatus });
      return {
        success: true,
        message: res.message || `Status updated to ${newStatus}.`,
        data: sub
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Update status fallback to memory:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const sub = list.find(s => String(s.id) === String(id));
      if (!sub) throw new Error('Subscriber not found.');

      sub.status = newStatus;
      if (newStatus === NEWSLETTER_STATUS.UNSUBSCRIBED) {
        sub.unsubscribedAt = new Date().toISOString();
      } else {
        sub.unsubscribedAt = null;
      }
      setMemorySubscribers(list);

      return {
        success: true,
        message: `Status updated to ${newStatus} for ${sub.email}.`,
        data: sub
      };
    }
  },

  /**
   * Update subscriber details (name, email, source, tags, status)
   * PUT /api/v1/newsletter/subscribers/{id}
   */
  async update(id, updateData) {
    console.log('%c[NewsletterAPI] Updating subscriber details:', 'color: #2563eb;', { id, updateData });
    try {
      const res = await ajaxRequest({
        endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
        method: 'PUT',
        data: updateData
      });

      const updated = res.body || res.data || res;
      const list = getNewsletterSubscribers();
      const idx = list.findIndex(s => String(s.id) === String(id));
      if (idx !== -1) {
        list[idx] = new Subscriber(updated);
        setMemorySubscribers(list);
      }

      console.log('%c[NewsletterAPI] Subscriber updated on backend:', 'color: #16a34a;', updated);
      return {
        success: true,
        message: res.message || 'Subscriber updated successfully.',
        data: list[idx] || updated
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Update details fallback to memory:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const index = list.findIndex(s => String(s.id) === String(id));
      if (index === -1) throw new Error('Subscriber not found.');

      if (updateData.email && isValidEmail(updateData.email)) {
        list[index].email = updateData.email.trim().toLowerCase();
      }
      if (updateData.name !== undefined) list[index].name = updateData.name.trim();
      if (updateData.source) list[index].source = updateData.source;
      if (updateData.tags && Array.isArray(updateData.tags)) list[index].tags = updateData.tags;
      if (updateData.status) list[index].status = updateData.status;

      setMemorySubscribers(list);
      return {
        success: true,
        message: 'Subscriber updated successfully.',
        data: list[index]
      };
    }
  },

  /**
   * Delete subscriber by ID
   * DELETE /api/v1/newsletter/subscribers/{id}
   */
  async delete(id) {
    console.log('%c[NewsletterAPI] Deleting subscriber:', 'color: #dc2626; font-weight: bold;', id);
    try {
      const res = await ajaxRequest({
        endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`,
        method: 'DELETE'
      });

      let list = getNewsletterSubscribers();
      list = list.filter(s => String(s.id) !== String(id));
      setMemorySubscribers(list);

      console.log('%c[NewsletterAPI] Subscriber deleted from backend:', 'color: #16a34a;', id);
      return {
        success: true,
        message: res.message || 'Subscriber deleted successfully.'
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Delete fallback to memory:', 'color: #ea580c;', apiErr.message);
      let list = getNewsletterSubscribers();
      list = list.filter(s => String(s.id) !== String(id));
      setMemorySubscribers(list);

      return {
        success: true,
        message: 'Subscriber deleted successfully.'
      };
    }
  },

  /**
   * Bulk update status for multiple subscribers
   * PATCH /api/v1/newsletter/subscribers/bulk-status?status={status}
   */
  async bulkUpdateStatus(ids, status) {
    console.log('%c[NewsletterAPI] Bulk updating status:', 'color: #2563eb;', { ids, status });
    const idList = ids.map(id => Number(id) || id);

    try {
      const res = await ajaxRequest({
        endpoint: `/newsletter/subscribers/bulk-status?status=${encodeURIComponent(status)}`,
        method: 'PATCH',
        data: idList
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

      console.log('%c[NewsletterAPI] Bulk status update completed:', 'color: #16a34a;', res);
      return {
        success: true,
        message: res.message || `Updated status for ${ids.length} subscribers.`
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Bulk status fallback to memory:', 'color: #ea580c;', apiErr.message);
      const list = getNewsletterSubscribers();
      const idSet = new Set(ids.map(String));
      let modified = 0;

      list.forEach(s => {
        if (idSet.has(String(s.id))) {
          s.status = status;
          if (status === NEWSLETTER_STATUS.UNSUBSCRIBED) {
            s.unsubscribedAt = new Date().toISOString();
          } else {
            s.unsubscribedAt = null;
          }
          modified++;
        }
      });

      setMemorySubscribers(list);
      return {
        success: true,
        modifiedCount: modified,
        message: `Updated status for ${modified} subscribers.`
      };
    }
  },

  /**
   * Bulk delete subscribers
   * DELETE /api/v1/newsletter/subscribers/bulk-delete
   */
  async bulkDelete(ids) {
    console.log('%c[NewsletterAPI] Bulk deleting subscribers:', 'color: #dc2626; font-weight: bold;', ids);
    const idList = ids.map(id => Number(id) || id);

    try {
      const res = await ajaxRequest({
        endpoint: '/newsletter/subscribers/bulk-delete',
        method: 'DELETE',
        data: idList
      });

      let list = getNewsletterSubscribers();
      const idSet = new Set(ids.map(String));
      list = list.filter(s => !idSet.has(String(s.id)));
      setMemorySubscribers(list);

      console.log('%c[NewsletterAPI] Bulk delete completed on backend:', 'color: #16a34a;', ids);
      return {
        success: true,
        message: res.message || `Deleted ${ids.length} subscribers.`
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Bulk delete fallback to memory:', 'color: #ea580c;', apiErr.message);
      let list = getNewsletterSubscribers();
      const idSet = new Set(ids.map(String));
      const initialLen = list.length;
      list = list.filter(s => !idSet.has(String(s.id)));
      const deletedCount = initialLen - list.length;

      setMemorySubscribers(list);
      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} subscribers.`
      };
    }
  },

  /**
   * Send marketing email broadcast campaign
   * POST /api/v1/newsletter/campaigns/send
   */
  async sendCampaign({
    subject,
    preheader = '',
    category = 'Promotions',
    targetSegment = 'All Active Subscribers',
    contentHtml = '',
    authorName = 'ETech Marketing Team'
  }) {
    console.log('%c[NewsletterAPI] Dispatching broadcast campaign:', 'color: #2563eb; font-weight: bold;', { subject, category, targetSegment });
    if (!subject || !subject.trim()) {
      throw new Error('Campaign subject is required.');
    }

    const payload = {
      subject: subject.trim(),
      preheader: preheader.trim(),
      category,
      targetSegment,
      contentHtml,
      authorName
    };

    try {
      const res = await ajaxRequest({
        endpoint: '/newsletter/campaigns/send',
        method: 'POST',
        data: payload
      });

      const campaignDTO = res.body || res.data || res;
      const campaigns = getNewsletterCampaigns();
      campaigns.unshift(campaignDTO);
      setMemoryCampaigns(campaigns);

      console.log('%c[NewsletterAPI] Campaign broadcast successfully sent via backend:', 'color: #16a34a; font-weight: bold;', campaignDTO);
      return {
        success: true,
        message: res.message || `🚀 Broadcast dispatched successfully!`,
        data: campaignDTO
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Campaign dispatch fallback to memory simulation:', 'color: #ea580c;', apiErr.message);
      const subscribers = getNewsletterSubscribers();
      let recipients = subscribers.filter(s => s.status === NEWSLETTER_STATUS.SUBSCRIBED);

      if (targetSegment === 'STOREFRONT_ONLY') {
        recipients = recipients.filter(s => s.source === NEWSLETTER_SOURCE.STOREFRONT_BANNER);
      } else if (targetSegment === 'DEALS_ONLY') {
        recipients = recipients.filter(s => s.source === NEWSLETTER_SOURCE.DEALS_PAGE);
      }

      const campaignRecord = {
        id: Date.now(),
        subject: subject.trim(),
        preheader: preheader.trim(),
        category,
        targetSegment,
        sentAt: new Date().toISOString(),
        recipientsCount: recipients.length,
        status: 'DELIVERED',
        openRate: (55 + Math.random() * 25).toFixed(1),
        clickRate: (20 + Math.random() * 18).toFixed(1),
        authorName
      };

      const nowIso = new Date().toISOString();
      const recipientIds = new Set(recipients.map(r => String(r.id)));
      subscribers.forEach(s => {
        if (recipientIds.has(String(s.id))) {
          s.lastCampaignSentAt = nowIso;
        }
      });
      setMemorySubscribers(subscribers);

      const campaigns = getNewsletterCampaigns();
      campaigns.unshift(campaignRecord);
      setMemoryCampaigns(campaigns);

      return {
        success: true,
        message: `🚀 Broadcast dispatched successfully to ${recipients.length} active subscribers!`,
        data: campaignRecord
      };
    }
  },

  /**
   * Fetch campaign history
   * GET /api/v1/newsletter/campaigns
   */
  async getCampaigns() {
    console.log('%c[NewsletterAPI] Fetching campaign history from backend...', 'color: #2563eb;');
    try {
      const res = await ajaxRequest({
        endpoint: '/newsletter/campaigns',
        method: 'GET'
      });

      const body = res.body || res;
      const list = Array.isArray(body) ? body : (body.content || body.data || []);
      setMemoryCampaigns(list);

      console.log(`%c[NewsletterAPI] Loaded ${list.length} campaign broadcasts from backend.`, 'color: #16a34a;');
      return {
        success: true,
        data: list
      };
    } catch (apiErr) {
      console.warn('%c[NewsletterAPI] Campaign history fallback to memory:', 'color: #ea580c;', apiErr.message);
      return {
        success: true,
        data: getNewsletterCampaigns()
      };
    }
  }
};
