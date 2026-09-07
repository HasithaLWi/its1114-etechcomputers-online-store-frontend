// ============================================================
//  src/js/api/policiesApi.js — Legal Policies & Store Profile API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const PoliciesApi = {
  // ── Store Business Profile ─────────────────────────────────

  /**
   * Fetch store business profile & credentials
   * GET /api/v1/business-profile
   */
  async getBusinessProfile() {
    console.log('[PoliciesAPI] getBusinessProfile() -> fetching profile');
    const res = await ajaxRequest({
      endpoint: '/business-profile',
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Update store business profile (Admin / SuperAdmin)
   * PUT /api/v1/business-profile
   */
  async updateBusinessProfile(profileData) {
    console.log('[PoliciesAPI] updateBusinessProfile() -> payload:', profileData);
    return ajaxRequest({
      endpoint: '/business-profile',
      method: 'PUT',
      data: profileData
    });
  },

  // ── Legal Policies ─────────────────────────────────────────

  /**
   * Fetch all legal policy documents
   * GET /api/v1/policies
   */
  async getAll() {
    console.log('[PoliciesAPI] getAll() -> fetching all legal policies');
    const res = await ajaxRequest({
      endpoint: '/policies',
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch single legal policy by slug ('privacy-policy', 'terms-of-service', 'warranty-guarantee')
   * GET /api/v1/policies/{slug}
   */
  async getBySlug(slug) {
    console.log('[PoliciesAPI] getBySlug() -> slug:', slug);
    const res = await ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Update a legal policy document (Admin / SuperAdmin)
   * PUT /api/v1/policies/{slug}
   */
  async updatePolicy(slug, policyData) {
    console.log('[PoliciesAPI] updatePolicy() -> slug:', slug, policyData);
    return ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}`,
      method: 'PUT',
      data: policyData
    });
  }
};
