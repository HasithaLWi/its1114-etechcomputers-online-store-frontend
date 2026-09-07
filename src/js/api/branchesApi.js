// ============================================================
//  src/js/api/branchesApi.js — Regional Warehouses & Logistics API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const BranchesApi = {
  /**
   * Fetch all warehouse branches
   * GET /api/v1/branches
   */
  async getAll(activeOnly = false) {
    console.log('[BranchesAPI] getAll() -> activeOnly:', activeOnly);
    const query = activeOnly ? '?activeOnly=true' : '';
    const res = await ajaxRequest({
      endpoint: `/branches${query}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch single branch by ID
   * GET /api/v1/branches/{id}
   */
  async getById(id) {
    console.log('[BranchesAPI] getById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/branches/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Create a new warehouse branch (Admin / SuperAdmin)
   * POST /api/v1/branches
   */
  async create(branchData) {
    console.log('[BranchesAPI] create() -> payload:', branchData);
    return ajaxRequest({
      endpoint: '/branches',
      method: 'POST',
      data: branchData
    });
  },

  /**
   * Update an existing warehouse branch (Admin / SuperAdmin)
   * PUT /api/v1/branches/{id}
   */
  async update(id, branchData) {
    console.log('[BranchesAPI] update() -> ID:', id, branchData);
    return ajaxRequest({
      endpoint: `/branches/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: branchData
    });
  },

  /**
   * Delete a warehouse branch (SuperAdmin)
   * DELETE /api/v1/branches/{id}
   */
  async delete(id) {
    console.log('[BranchesAPI] delete() -> ID:', id);
    return ajaxRequest({
      endpoint: `/branches/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },

  /**
   * Calculate nearest branch and distance shipping fee
   * POST /api/v1/branches/nearest
   */
  async findNearest(coordinatesOrCity) {
    console.log('[BranchesAPI] findNearest() -> query:', coordinatesOrCity);
    const payload = typeof coordinatesOrCity === 'string'
      ? { destinationCity: coordinatesOrCity }
      : coordinatesOrCity;

    const res = await ajaxRequest({
      endpoint: '/branches/nearest',
      method: 'POST',
      data: payload
    });
    return res.body || res;
  }
};
