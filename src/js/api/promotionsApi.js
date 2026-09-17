import { ajaxRequest } from './apiClient.js';

export const PromotionsApi = {


  // ── Hot Deals ──────────────────────────────────────────────


  // GET /api/v1/promotions/hot-deals
  async getHotDeals() {
    console.log('[PromotionsAPI] getHotDeals() -> fetching hot deals');
    const res = await ajaxRequest({
      endpoint: '/promotions/hot-deals',
      method: 'GET'
    });
    return res.body || res;
  },


  // POST /api/v1/promotions/hot-deals
  async createHotDeal(dealData) {
    console.log('[PromotionsAPI] createHotDeal() -> payload:', dealData);
    return ajaxRequest({
      endpoint: '/promotions/hot-deals',
      method: 'POST',
      data: dealData
    });
  },

  /**
   * Update hot deal promo pricing / duration
   * PUT /api/v1/promotions/hot-deals/{id}
   */
  async updateHotDeal(id, dealData) {
    console.log('[PromotionsAPI] updateHotDeal() -> ID:', id, dealData);
    return ajaxRequest({
      endpoint: `/promotions/hot-deals/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: dealData
    });
  },


  // DELETE /api/v1/promotions/hot-deals/{id}
  async deleteHotDeal(id) {
    console.log('[PromotionsAPI] deleteHotDeal() -> ID:', id);
    return ajaxRequest({
      endpoint: `/promotions/hot-deals/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },



  // ── Home Hero Deal Banner ──────────────────────────────────

  // GET /api/v1/promotions/home-banner
  async getHomeBanner() {
    console.log('[PromotionsAPI] getHomeBanner() -> fetching banner config');
    const res = await ajaxRequest({
      endpoint: '/promotions/home-banner',
      method: 'GET'
    });
    return res.body || res;
  },

  // PUT /api/v1/promotions/home-banner
  async updateHomeBanner(bannerData) {
    console.log('[PromotionsAPI] updateHomeBanner() -> payload:', bannerData);
    return ajaxRequest({
      endpoint: '/promotions/home-banner',
      method: 'PUT',
      data: bannerData
    });
  },

  // ── Deal Bundles ───────────────────────────────────────────

  // GET /api/v1/promotions/bundles
  async getBundles() {
    console.log('[PromotionsAPI] getBundles() -> fetching bundles');
    const res = await ajaxRequest({
      endpoint: '/promotions/bundles',
      method: 'GET'
    });
    return res.body || res;
  },

  // GET /api/v1/promotions/bundles/{id}
  async getBundleById(id) {
    console.log('[PromotionsAPI] getBundleById() -> ID:', id);
    const res = await ajaxRequest({
      endpoint: `/promotions/bundles/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return res.body || res;
  },

  // POST /api/v1/promotions/bundles
  async createBundle(bundleData) {
    console.log('[PromotionsAPI] createBundle() -> payload:', bundleData);
    return ajaxRequest({
      endpoint: '/promotions/bundles',
      method: 'POST',
      data: bundleData
    });
  },

  // PUT /api/v1/promotions/bundles/{id}
  async updateBundle(id, bundleData) {
    console.log('[PromotionsAPI] updateBundle() -> ID:', id, bundleData);
    return ajaxRequest({
      endpoint: `/promotions/bundles/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: bundleData
    });
  },

  // DELETE /api/v1/promotions/bundles/{id}
  async deleteBundle(id) {
    console.log('[PromotionsAPI] deleteBundle() -> ID:', id);
    return ajaxRequest({
      endpoint: `/promotions/bundles/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  }
};
