import { ajaxRequest } from './apiClient.js';

export const ProductsApi = {

  // GET /api/v1/products/all
  async getAll() {
    console.log('[ProductsAPI] getAll() -> fetching all catalog products');
    const res = await ajaxRequest({
      endpoint: '/products/all',
      method: 'GET'
    });
    return res.body || res;
  },


  // GET /api/v1/products/filter
  async getFiltered(params = {}) {
    console.log('[ProductsAPI] getFiltered() -> params:', params);
    const res = await ajaxRequest({
      endpoint: '/products/filter',
      method: 'GET',
      data: params
    });
    return res.body || res;
  },


  // GET /api/v1/products/{id}
  async getById(id) {
    console.log('[ProductsAPI] getById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/products/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },


  // GET /api/v1/products/sku/{sku}
  async getBySku(sku) {
    console.log('[ProductsAPI] getBySku() -> SKU:', sku);
    const res = await ajaxRequest({
      endpoint: `/products/sku/${encodeURIComponent(sku)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch products by lifecycle status (ACTIVE, INACTIVE, DELETED)
   * GET /api/v1/products/status?status={status}
   */
  async getByStatus(status) {
    console.log('[ProductsAPI] getByStatus() -> status:', status);
    const res = await ajaxRequest({
      endpoint: `/products/status?status=${encodeURIComponent(status)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Create a new catalog product with branch stock allocations
   * POST /api/v1/products/create
   */
  async create(productData) {
    console.log('[ProductsAPI] create() -> payload:', productData);
    return ajaxRequest({
      endpoint: '/products/create',
      method: 'POST',
      data: productData
    });
  },

  /**
   * Update full product metadata and branch stock allocations
   * PUT /api/v1/products/update/{id}
   */
  async update(id, productData) {
    console.log('[ProductsAPI] update() -> ID:', id, productData);
    const res = await ajaxRequest({
      endpoint: `/products/update/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: productData
    });
    return res.body || res;
  },

  /**
   * Update branch inventory allocations directly
   * PATCH /api/v1/products/update-inventory
   */
  async updateInventory(productId, branchStock) {
    console.log('[ProductsAPI] updateInventory() -> productId:', productId, branchStock);
    const res = await ajaxRequest({
      endpoint: '/products/update-inventory',
      method: 'PATCH',
      data: {
        productId: Number(productId),
        branchStock: branchStock
      }
    });
    return res.body || res;
  },

  /**
   * Update product lifecycle status (ACTIVE, INACTIVE, DELETED)
   * PATCH /api/v1/products/update-status/{id}?status={status}
   */
  async updateStatus(id, status) {
    console.log('[ProductsAPI] updateStatus() -> ID:', id, 'status:', status);
    return ajaxRequest({
      endpoint: `/products/update-status/${encodeURIComponent(id)}?status=${encodeURIComponent(status)}`,
      method: 'PATCH'
    });
  },

  /**
   * Soft delete product (transitions status to DELETED)
   * DELETE /api/v1/products/delete/{id}
   */
  async delete(id) {
    console.log('[ProductsAPI] delete() [Soft Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/products/delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },

  /**
   * Permanently purge product from database (SuperADMIN only)
   * DELETE /api/v1/products/perma-delete/{id}
   */
  async permaDelete(id) {
    console.log('[ProductsAPI] permaDelete() [Permanent Delete] -> ID:', id);
    return ajaxRequest({
      endpoint: `/products/perma-delete/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  }
};
