import { ajaxRequest, getToken } from './apiClient.js';

export const WishlistApi = {

  // GET /api/v1/wishlist
  async getWishlist() {
    if (!getToken()) {
      return { success: true, items: [] };
    }
    console.log('[WishlistAPI] getWishlist() -> fetching customer wishlist');
    try {
      const res = await ajaxRequest({
        endpoint: '/wishlist',
        method: 'GET'
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] getWishlist error:', err);
      return null;
    }
  },


  // POST /api/v1/wishlist/toggle/{productId}
  async toggleWishlist(productId) {
    if (!getToken()) {
      return { success: true, guest: true };
    }
    console.log('[WishlistAPI] toggleWishlist() -> Product ID:', productId);
    try {
      const res = await ajaxRequest({
        endpoint: `/wishlist/toggle/${encodeURIComponent(productId)}`,
        method: 'POST'
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] toggleWishlist error:', err);
      return null;
    }
  },


  // POST /api/v1/wishlist/add/{productId}
  async addToWishlist(productId) {
    if (!getToken()) {
      return { success: true, guest: true };
    }
    console.log('[WishlistAPI] addToWishlist() -> Product ID:', productId);
    try {
      const res = await ajaxRequest({
        endpoint: `/wishlist/add/${encodeURIComponent(productId)}`,
        method: 'POST'
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] addToWishlist error:', err);
      return null;
    }
  },


  // DELETE /api/v1/wishlist/remove/{productId}
  async removeFromWishlist(productId) {
    if (!getToken()) {
      return { success: true, guest: true };
    }
    console.log('[WishlistAPI] removeFromWishlist() -> Product ID:', productId);
    try {
      const res = await ajaxRequest({
        endpoint: `/wishlist/remove/${encodeURIComponent(productId)}`,
        method: 'DELETE'
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] removeFromWishlist error:', err);
      return null;
    }
  },


  // DELETE /api/v1/wishlist/clear
  async clearWishlist() {
    if (!getToken()) {
      return { success: true, guest: true };
    }
    console.log('[WishlistAPI] clearWishlist() -> clearing all wishlist items');
    try {
      const res = await ajaxRequest({
        endpoint: '/wishlist/clear',
        method: 'DELETE'
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] clearWishlist error:', err);
      return null;
    }
  },


  // POST /api/v1/wishlist/move-to-cart
  async moveToCart(productId, branchId = 'BR-COL', quantity = 1) {
    if (!getToken()) {
      return { success: true, guest: true };
    }
    console.log('[WishlistAPI] moveToCart() -> Product ID:', productId, 'Branch:', branchId, 'Qty:', quantity);
    try {
      const res = await ajaxRequest({
        endpoint: '/wishlist/move-to-cart',
        method: 'POST',
        data: { productId, branchId, quantity }
      });
      return res.body || res;
    } catch (err) {
      console.warn('[WishlistAPI] moveToCart error:', err);
      return null;
    }
  }
};
