export const TOKEN_STORAGE_KEY = 'etech_jwt_token';
export const CURRENT_USER_STORAGE_KEY = 'etech_current_user';

export const API_BASE_URL =
    (typeof window !== 'undefined' && window.__ENV__?.API_BASE_URL)
        ? window.__ENV__.API_BASE_URL
        : 'https://its1114-etechcomputers-online-store-16e3.onrender.com/api/v1';




export const CART_STORAGE_KEY = 'etech_cart';



export const BRANCHES_STORAGE_KEY = 'etech_branches';


export const BRANDS_STORAGE_KEY = 'etech_brands_data';


export const HOME_DEAL_STORAGE_KEY = 'etech_home_deal_banner';
export const DEAL_BUNDLES_STORAGE_KEY = 'etech_deal_bundles';
export const HOT_DEALS_STORAGE_KEY = 'etech_hot_deals_list';


export const POLICIES_STORAGE_KEY = 'etech_policies';
export const BUSINESS_INFO_STORAGE_KEY = 'etech_business_info';


export const REVIEWS_STORAGE_KEY = 'etech_product_reviews';

export const TRANSFERS_STORAGE_KEY = 'etech_stock_transfers';

export const SENT_EMAILS_STORAGE_KEY = 'etech_sent_emails';


// export const CURRENT_USER_STORAGE_KEY = 'etech_current_user';