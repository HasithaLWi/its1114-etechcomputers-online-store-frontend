import { ajaxRequest } from './apiClient.js';

export const ReviewsApi = {

  // GET /api/v1/products/{productId}/reviews
  async getProductReviews(productId, params = {}) {
    console.log('[ReviewsAPI] getProductReviews() -> productId:', productId, params);
    const res = await ajaxRequest({
      endpoint: `/products/${encodeURIComponent(productId)}/reviews`,
      method: 'GET',
      data: params
    });
    return res.body || res;
  },


  // POST /api/v1/products/{productId}/reviews
  async submitReview(productId, reviewData) {
    console.log('[ReviewsAPI] submitReview() -> productId:', productId, reviewData);
    return ajaxRequest({
      endpoint: `/products/${encodeURIComponent(productId)}/reviews`,
      method: 'POST',
      data: reviewData
    });
  },


  // Delete a customer product review (Admin / Review Owner)
  // DELETE /api/v1/reviews/{id}
  async deleteReview(id) {
    console.log('[ReviewsAPI] deleteReview() -> reviewId:', id);
    return ajaxRequest({
      endpoint: `/reviews/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  }
};
