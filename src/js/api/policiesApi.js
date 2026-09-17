import { ajaxRequest } from './apiClient.js';

export const PoliciesApi = {
  // ── Store Business Profile ─────────────────────────────────

  // GET /api/v1/business-profile
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


  // GET /api/v1/policies
  async getAll() {
    console.log('[PoliciesAPI] getAll() -> fetching all legal policies');
    const res = await ajaxRequest({
      endpoint: '/policies',
      method: 'GET'
    });
    return res.body || res;
  },


  // GET /api/v1/policies/{slug}
  async getBySlug(slug) {
    console.log('[PoliciesAPI] getBySlug() -> slug:', slug);
    const res = await ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // Update a legal policy document (Admin / SuperAdmin)
  // PUT /api/v1/policies/{slug}
  async updatePolicy(slug, policyData) {
    console.log('[PoliciesAPI] updatePolicy() -> slug:', slug, policyData);
    return ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}`,
      method: 'PUT',
      data: policyData
    });
  },

  // Create a new legal policy document (Admin / SuperAdmin)
  // POST /api/v1/policies
  async createPolicy(policyData) {
    console.log('[PoliciesAPI] createPolicy() -> payload:', policyData);
    return ajaxRequest({
      endpoint: '/policies',
      method: 'POST',
      data: policyData
    });
  },

  /**
   * Delete a legal policy document (Admin / SuperAdmin)
   * DELETE /api/v1/policies/{slug}
   */
  async deletePolicy(slug) {
    console.log('[PoliciesAPI] deletePolicy() -> slug:', slug);
    return ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}`,
      method: 'DELETE'
    });
  },

  /**
   * Add a new section/clause to a legal policy (Admin / SuperAdmin)
   * POST /api/v1/policies/{slug}/sections
   */
  async addSection(slug, sectionData) {
    console.log('[PoliciesAPI] addSection() -> slug:', slug, sectionData);
    return ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}/sections`,
      method: 'POST',
      data: sectionData
    });
  },

  /**
   * Delete a section/clause from a legal policy (Admin / SuperAdmin)
   * DELETE /api/v1/policies/{slug}/sections/{sectionId}
   */
  async deleteSection(slug, sectionId) {
    console.log('[PoliciesAPI] deleteSection() -> slug:', slug, 'sectionId:', sectionId);
    return ajaxRequest({
      endpoint: `/policies/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionId)}`,
      method: 'DELETE'
    });
  }
};

