import { ajaxRequest } from './apiClient.js';

export const CategoriesApi = {

  // GET /api/v1/categories/all
  async getAll() {
    console.log('[CategoriesAPI] getAll() -> fetching all categories');
    const res = await ajaxRequest({
      endpoint: '/categories/all',
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/categories/{id}
  async getById(id) {
    console.log('[CategoriesAPI] getById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/categories/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/categories/slug/{slug}
  async getBySlug(slug) {
    console.log('[CategoriesAPI] getBySlug() -> slug:', slug);
    const res = await ajaxRequest({
      endpoint: `/categories/slug/${encodeURIComponent(slug)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/categories/name/{name}
  async getByName(name) {
    console.log('[CategoriesAPI] getByName() -> name:', name);
    const res = await ajaxRequest({
      endpoint: `/categories/name/${encodeURIComponent(name)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/categories/filter?search={search}
  async filter(search) {
    console.log('[CategoriesAPI] filter() -> search:', search);
    const res = await ajaxRequest({
      endpoint: `/categories/filter?search=${encodeURIComponent(search)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch categories by lifecycle status (ACTIVE, INACTIVE, DELETED)
   * GET /api/v1/categories/status?status={status}
   */
  async getByStatus(status) {
    console.log('[CategoriesAPI] getByStatus() -> status:', status);
    const res = await ajaxRequest({
      endpoint: `/categories/status?status=${encodeURIComponent(status)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Create a new storefront category (Admin/Superadmin)
   * POST /api/v1/categories/create
   */
  async create(categoryData) {
    console.log('[CategoriesAPI] create() -> payload:', categoryData);
    return ajaxRequest({
      endpoint: '/categories/create',
      method: 'POST',
      data: categoryData
    });
  },

  /**
   * Update category properties (Admin/Superadmin)
   * PUT /api/v1/categories/update/{id}
   */
  async update(id, categoryData) {
    console.log('[CategoriesAPI] update() -> ID:', id, categoryData);
    return ajaxRequest({
      endpoint: `/categories/update/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: categoryData
    });
  },

  /**
   * Update category lifecycle status (ACTIVE, INACTIVE, DELETED)
   * PATCH /api/v1/categories/update-status/{id}?status={status}
   */
  async updateStatus(id, status) {
    console.log('[CategoriesAPI] updateStatus() -> ID:', id, 'status:', status);
    return ajaxRequest({
      endpoint: `/categories/update-status/${encodeURIComponent(id)}?status=${encodeURIComponent(status)}`,
      method: 'PATCH'
    });
  },

  /**
   * Soft delete category (transitions status to DELETED)
   * DELETE /api/v1/categories/delete/{id}
   */
  async delete(id) {
    console.log('[CategoriesAPI] delete() [Soft Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/categories/delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },

  /**
   * Permanently delete category and unlink associations (SuperADMIN only)
   * DELETE /api/v1/categories/perma-delete/{id}
   */
  async permaDelete(id) {
    console.log('[CategoriesAPI] permaDelete() [Permanent Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/categories/perma-delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  }
};
