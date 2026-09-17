import { ajaxRequest } from './apiClient.js';

export const OrdersApi = {
  /**
   * Fetch all orders directory with optional filtering (Staff & Admin)
   * GET /api/v1/orders
   */
  async getAll(params = {}) {
    console.log('[OrdersAPI] getAll() -> params:', params);
    const res = await ajaxRequest({
      endpoint: '/orders',
      method: 'GET',
      data: params
    });
    return res.body || res;
  },

  /**
   * Filter orders with pagination & query parameters
   * GET /api/v1/orders/filter
   */
  async getFiltered(params = {}) {
    console.log('[OrdersAPI] getFiltered() -> params:', params);
    const res = await ajaxRequest({
      endpoint: '/orders/filter',
      method: 'GET',
      data: params
    });
    return res.body || res;
  },

  /**
   * Fetch logged-in customer's order history
   * GET /api/v1/orders/my-orders
   */
  async getMyOrders() {
    console.log('[OrdersAPI] getMyOrders() -> fetching customer order history');
    const res = await ajaxRequest({
      endpoint: '/orders/my-orders',
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Fetch single order details by tracking code / order ID
   * GET /api/v1/orders/{orderCode}
   */
  async getByCode(orderCode) {
    console.log('[OrdersAPI] getByCode() -> code:', orderCode);
    const cleanCode = String(orderCode).replace(/^#/, '');
    const res = await ajaxRequest({
      endpoint: `/orders/${encodeURIComponent(cleanCode)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  /**
   * Place a new customer storefront order
   * POST /api/v1/orders
   */
  async placeOrder(orderData) {
    console.log('[OrdersAPI] placeOrder() -> payload:', orderData);
    const res = await ajaxRequest({
      endpoint: '/orders',
      method: 'POST',
      data: orderData
    });
    return (res && res.body !== undefined && res.body !== null) ? res.body : res;
  },

  /**
   * Update order fulfillment status (Pending -> Processing -> Shipped -> Delivered -> Cancelled)
   * PATCH /api/v1/orders/{id}/status?status={status}
   */
  async updateStatus(id, status) {
    console.log('[OrdersAPI] updateStatus() -> ID:', id, 'status:', status);
    const cleanId = String(id).replace(/^#/, '');
    return ajaxRequest({
      endpoint: `/orders/${encodeURIComponent(cleanId)}/status?status=${encodeURIComponent(status)}`,
      method: 'PATCH',
      data: { status }
    });
  }
};
