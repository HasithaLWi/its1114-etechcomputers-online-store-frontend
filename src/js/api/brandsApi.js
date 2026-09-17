import { ajaxRequest } from './apiClient.js';

export const BrandsApi = {

  // GET /api/v1/brands/all
  async getAll() {
    console.log('[BrandsAPI] getAll() -> fetching all brands');
    const res = await ajaxRequest({
      endpoint: '/brands/all',
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/brands/featured
  async getFeatured() {
    console.log('[BrandsAPI] getFeatured() -> fetching featured brands');
    const res = await ajaxRequest({
      endpoint: '/brands/featured',
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/brands/{id}
  async getById(id) {
    console.log('[BrandsAPI] getById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/brands/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/brands/slug/{slug}
  async getBySlug(slug) {
    console.log('[BrandsAPI] getBySlug() -> slug:', slug);
    const res = await ajaxRequest({
      endpoint: `/brands/slug/${encodeURIComponent(slug)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/brands/name/{name}
  async getByName(name) {
    console.log('[BrandsAPI] getByName() -> name:', name);
    const res = await ajaxRequest({
      endpoint: `/brands/name/${encodeURIComponent(name)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/brands/filter?search={search}
  async filter(search) {
    console.log('[BrandsAPI] filter() -> search:', search);
    const res = await ajaxRequest({
      endpoint: `/brands/filter?search=${encodeURIComponent(search)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch brands by lifecycle status (ACTIVE, INACTIVE, DELETED)
   * GET /api/v1/brands/status/{status}
   */
  async getByStatus(status) {
    console.log('[BrandsAPI] getByStatus() -> status:', status);
    const res = await ajaxRequest({
      endpoint: `/brands/status/${encodeURIComponent(status)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Register a new official hardware manufacturer brand (Admin/Superadmin)
   * POST /api/v1/brands/create
   */
  async create(brandData) {
    console.log('[BrandsAPI] create() -> payload:', brandData);
    return ajaxRequest({
      endpoint: '/brands/create',
      method: 'POST',
      data: brandData
    });
  },

  /**
   * Update brand profile metadata (Admin/Superadmin)
   * PUT /api/v1/brands/update/{id}
   */
  async update(id, brandData) {
    console.log('[BrandsAPI] update() -> ID:', id, brandData);
    return ajaxRequest({
      endpoint: `/brands/update/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: brandData
    });
  },

  /**
   * Update brand lifecycle status (ACTIVE, INACTIVE, DELETED)
   * PATCH /api/v1/brands/update-status/{id}?status={status}
   */
  async updateStatus(id, status) {
    console.log('[BrandsAPI] updateStatus() -> ID:', id, 'status:', status);
    return ajaxRequest({
      endpoint: `/brands/update-status/${encodeURIComponent(id)}?status=${encodeURIComponent(status)}`,
      method: 'PATCH'
    });
  },

  /**
   * Soft delete brand (transitions status to DELETED)
   * DELETE /api/v1/brands/delete/{id}
   */
  async delete(id) {
    console.log('[BrandsAPI] delete() [Soft Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/brands/delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },

  /**
   * Permanently delete brand record and unlink products (SuperADMIN only)
   * DELETE /api/v1/brands/perma-delete/{id}
   */
  async permaDelete(id) {
    console.log('[BrandsAPI] permaDelete() [Permanent Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/brands/perma-delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  }
};
