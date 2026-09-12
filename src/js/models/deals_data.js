// ============================================================
//  deals_data.js — Model for Promotions & Composite Deal Bundles
// ============================================================
import { getStoredProducts, saveStoredProducts } from './data.js';
import { getBranches } from '../controller/branch_controller.js';
import { PromotionsApi } from '../api/promotionsApi.js';
import { ProductsApi } from '../api/productsApi.js';

export const DEFAULT_HOME_DEAL_BANNER = {
  id: 1,
  badge: "WEEKEND TECH DEAL",
  tag: "WEEKEND TECH DEAL",
  dealTag: "WEEKEND TECH DEAL",
  title: "Save Up To 25% On Elite Performance Gear",
  heading: "Save Up To 25% On Elite Performance Gear",
  titleHighlight: "Save up to 25%",
  subtitle: "Exclusive hardware promotions updated every weekend.",
  description: "Exclusive hardware promotions updated every weekend.",
  linkText: "Explore Weekend Deals",
  buttonText: "Shop Deals",
  linkHref: "#deals",
  buttonUrl: "#deals",
  targetUrl: "#deals",
  bgImage: "public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg",
  durationDays: 2,
  durationHours: 14,
  durationMins: 38,
  durationSecs: 21,
  durationSeconds: 221901,
  active: true,
  isActive: true
};

export const DEFAULT_DEAL_BUNDLES = [];
export const DEFAULT_HOT_DEALS = [];

export const HOME_DEAL_STORAGE_KEY = 'etech_home_deal_banner';
export const DEAL_BUNDLES_STORAGE_KEY = 'etech_deal_bundles';
export const HOT_DEALS_STORAGE_KEY = 'etech_hot_deals_list';

// Reactive In-Memory Stores
let memoryHomeDealBanner = { ...DEFAULT_HOME_DEAL_BANNER };
let memoryDealBundles = [];
let memoryHotDeals = [];

/**
 * Normalizes backend HomeDealBannerDTO to frontend representation
 */
export function normalizeHomeBanner(data) {
  if (!data || typeof data !== 'object') return { ...DEFAULT_HOME_DEAL_BANNER };

  const totalSecs = Number(data.durationSeconds) || 0;
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const tag = data.dealTag || data.tag || data.badge || "WEEKEND TECH DEAL";
  const title = data.heading || data.title || "Upgrade your setup";
  const subtitle = data.subtitle || "";
  const buttonText = data.buttonText || data.linkText || "Shop Deals";
  const buttonUrl = data.buttonUrl || data.targetUrl || data.linkHref || "#deals";
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.active !== undefined ? Boolean(data.active) : true);

  return {
    id: Number(data.id || 1),
    tag: tag,
    badge: tag,
    dealTag: tag,
    title: title,
    heading: title,
    titleHighlight: data.titleHighlight || "",
    subtitle: subtitle,
    description: subtitle || data.description || "",
    linkText: buttonText,
    buttonText: buttonText,
    linkHref: buttonUrl,
    buttonUrl: buttonUrl,
    targetUrl: buttonUrl,
    bgImage: data.bgImage || memoryHomeDealBanner.bgImage || "public/images/WEEKEND-TECH-DEAL-cart-bg.jpeg",
    durationSeconds: totalSecs,
    durationDays: data.durationDays !== undefined ? Number(data.durationDays) : days,
    durationHours: data.durationHours !== undefined ? Number(data.durationHours) : hours,
    durationMins: data.durationMins !== undefined ? Number(data.durationMins) : mins,
    durationSecs: data.durationSecs !== undefined ? Number(data.durationSecs) : secs,
    timerUpdatedAt: data.timerUpdatedAt || data.lastUpdated || new Date().toISOString(),
    lastUpdated: data.lastUpdated || data.timerUpdatedAt || new Date().toISOString(),
    active: isActive,
    isActive: isActive
  };
}

/**
 * Normalizes backend DealBundleResponseDTO to frontend representation
 */
export function normalizeBundle(b, productsList = null, branchesList = null) {
  if (!b || typeof b !== 'object') return null;

  const products = productsList || getStoredProducts();
  const totalSecs = Number(b.durationSeconds) || 0;
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  let rawItems = b.bundleItems;
  if ((!rawItems || !rawItems.length) && Array.isArray(b.componentsBreakdown) && b.componentsBreakdown.length > 0) {
    rawItems = b.componentsBreakdown.map(c => ({
      productId: Number(c.productId),
      qty: Number(c.qty || c.quantity || 1),
      name: c.name || `Product #${c.productId}`,
      unitPrice: Number(c.unitPrice || 0),
      sku: c.sku,
      image: c.image
    }));
  }

  const normalizedItems = normalizeBundleItems(rawItems, products);
  const inv = calculateBundleInventory({ ...b, bundleItems: normalizedItems }, products, branchesList);

  const price = Number(b.price) || 199999;
  const originalPrice = inv.calculatedMSRP > 0 ? inv.calculatedMSRP : (Number(b.originalPrice) || price);
  const savingAmount = Number(b.savingAmount) || Math.max(0, originalPrice - price);
  const savingPercent = originalPrice > 0 ? Math.round((savingAmount / originalPrice) * 100) : (Number(b.savingPercent) || 0);

  const isActive = b.isActive !== undefined ? Boolean(b.isActive) : (b.active !== undefined ? Boolean(b.active) : true);

  return {
    ...b,
    id: Number(b.id),
    badge: b.badge || "HOT DEAL",
    eyebrow: b.eyebrow || "FEATURED DEAL",
    title: b.title || "Featured Bundle",
    subtitle: b.subtitle || "",
    image: b.imageUrl || b.image || "public/images/home-hero-image-1.png",
    imageUrl: b.imageUrl || b.image || "public/images/home-hero-image-1.png",
    bundleItems: normalizedItems,
    price: price,
    originalPrice: originalPrice,
    savingAmount: savingAmount,
    savingPercent: savingPercent,
    targetQuota: Number(b.targetQuota) || 20,
    soldCount: Number(b.soldCount) || 0,
    stockLeft: b.stockLeft !== undefined ? Number(b.stockLeft) : inv.maxAvailableBundles,
    claimedPercent: b.claimedPercent !== undefined ? Number(b.claimedPercent) : inv.claimedPercent,
    durationSeconds: totalSecs,
    durationDays: b.durationDays !== undefined ? Number(b.durationDays) : days,
    durationHours: b.durationHours !== undefined ? Number(b.durationHours) : hours,
    durationMins: b.durationMins !== undefined ? Number(b.durationMins) : mins,
    durationSecs: b.durationSecs !== undefined ? Number(b.durationSecs) : secs,
    timerUpdatedAt: b.timerUpdatedAt || new Date().toISOString(),
    active: isActive,
    isActive: isActive,
    isFreeShipping: Boolean(b.isFreeShipping),
    componentsBreakdown: (inv.componentsBreakdown && inv.componentsBreakdown.length > 0) ? inv.componentsBreakdown : (b.componentsBreakdown || []),
    branchAssembly: inv.branchAssembly || {},
    totalReadyToShip: inv.totalReadyToShip || 0
  };
}

/**
 * Normalizes backend HotDealResponseDTO to frontend representation
 */
export function normalizeHotDeal(d, productsList = null) {
  if (!d || typeof d !== 'object') return null;

  const products = productsList || getStoredProducts();
  const product = (d.product && typeof d.product === 'object' && d.product.name) ? d.product : (products.find(p => p.id === Number(d.productId)) || null);

  const totalSecs = Number(d.durationSeconds) || 0;
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const dealPrice = Number(d.promoPrice !== undefined ? d.promoPrice : (d.dealPrice !== undefined ? d.dealPrice : (product ? product.price : 100000)));
  const originalPrice = Number(d.originalPrice || (product ? (product.originalPrice || product.price) : dealPrice * 1.15));
  const savingAmount = Math.max(0, originalPrice - dealPrice);
  const discountPercent = originalPrice > 0 ? Math.round((savingAmount / originalPrice) * 100) : (Number(d.discountPercent) || 0);

  const isActive = d.isActive !== undefined ? Boolean(d.isActive) : (d.active !== undefined ? Boolean(d.active) : true);

  return {
    ...d,
    id: Number(d.id),
    productId: Number(d.productId),
    badge: d.badge || "HOT DEAL",
    promoPrice: dealPrice,
    dealPrice: dealPrice,
    originalPrice: originalPrice,
    regularPrice: product ? Number(product.price) : dealPrice,
    savingAmount: savingAmount,
    discountPercent: discountPercent,
    durationSeconds: totalSecs,
    durationDays: d.durationDays !== undefined ? Number(d.durationDays) : days,
    durationHours: d.durationHours !== undefined ? Number(d.durationHours) : hours,
    durationMins: d.durationMins !== undefined ? Number(d.durationMins) : mins,
    durationSecs: d.durationSecs !== undefined ? Number(d.durationSecs) : secs,
    timerUpdatedAt: d.timerUpdatedAt || new Date().toISOString(),
    targetQuota: Number(d.targetQuota) || 30,
    soldCount: Number(d.soldCount) || 0,
    active: isActive,
    isActive: isActive,
    isFreeShipping: Boolean(d.isFreeShipping),
    product: product
  };
}

/**
 * Sync Promotions & Deals from Backend API
 */
export async function syncPromotionsFromApi() {
  try {
    const [bannerRes, bundlesRes, hotDealsRes] = await Promise.allSettled([
      PromotionsApi.getHomeBanner(),
      PromotionsApi.getBundles(),
      PromotionsApi.getHotDeals()
    ]);

    if (bannerRes.status === 'fulfilled' && bannerRes.value) {
      const bannerData = bannerRes.value.body || bannerRes.value;
      if (bannerData && typeof bannerData === 'object') {
        memoryHomeDealBanner = normalizeHomeBanner(bannerData);
      }
    }

    if (bundlesRes.status === 'fulfilled' && bundlesRes.value) {
      const bundlesData = bundlesRes.value.body || bundlesRes.value;
      if (Array.isArray(bundlesData) && bundlesData.length > 0) {
        const products = getStoredProducts();
        let branches = [];
        try {
          branches = typeof getBranches === 'function' ? getBranches() : [];
        } catch (e) {
          branches = [];
        }
        memoryDealBundles = bundlesData.map(b => normalizeBundle(b, products, branches));
      }
    }

    if (hotDealsRes.status === 'fulfilled' && hotDealsRes.value) {
      const hotDealsData = hotDealsRes.value.body || hotDealsRes.value;
      if (Array.isArray(hotDealsData) && hotDealsData.length > 0) {
        const products = getStoredProducts();
        memoryHotDeals = hotDealsData.map(d => normalizeHotDeal(d, products));
      }
    }
  } catch (err) {
    console.warn('[PromotionsModel] Live promotions sync notice:', err.message);
  }
}

/**
 * Check if the Home Deal Banner & Hot Deals Campaign is currently active/visible
 * @returns {boolean}
 */
export function isHomeDealBannerActive() {
  const banner = getHomeDealBanner();
  return banner.active !== false;
}

/**
 * Calculates realtime remaining countdown duration from timerUpdatedAt & total configured duration
 * 
 * @param {Object} item - An object containing durationDays, durationHours, durationMins, durationSecs, durationSeconds, and timerUpdatedAt
 * @returns {Object} { totalSeconds, days, hours, mins, secs, isExpired }
 */
export function getRemainingTimeFromDuration(item) {
  if (!item) {
    return { totalSeconds: 0, days: "00", hours: "00", mins: "00", secs: "00", isExpired: true };
  }

  // If the item or campaign is frozen/paused, return frozen remaining duration
  if (item.isPaused && item.pausedRemainingSeconds !== undefined) {
    const remaining = Math.max(0, Number(item.pausedRemainingSeconds) || 0);
    const remDays = Math.floor(remaining / 86400);
    const remHours = Math.floor((remaining % 86400) / 3600);
    const remMins = Math.floor((remaining % 3600) / 60);
    const remSecs = remaining % 60;
    return {
      totalSeconds: remaining,
      days: String(remDays).padStart(2, '0'),
      hours: String(remHours).padStart(2, '0'),
      mins: String(remMins).padStart(2, '0'),
      secs: String(remSecs).padStart(2, '0'),
      isExpired: remaining <= 0
    };
  }

  const days = Number(item.durationDays) || 0;
  const hours = Number(item.durationHours) || 0;
  const mins = Number(item.durationMins) || 0;
  const secs = Number(item.durationSecs) || 0;
  const totalDuration = Number(item.durationSeconds) || (days * 86400 + hours * 3600 + mins * 60 + secs);

  if (totalDuration <= 0) {
    return { totalSeconds: 0, days: "00", hours: "00", mins: "00", secs: "00", isExpired: true };
  }

  // Calculate elapsed time from timerUpdatedAt or lastUpdated
  const updatedAt = item.timerUpdatedAt || item.lastUpdated;
  let elapsedSeconds = 0;
  if (updatedAt) {
    const startMs = new Date(updatedAt).getTime();
    if (!isNaN(startMs)) {
      elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }
  }

  const remaining = Math.max(0, totalDuration - elapsedSeconds);
  const isExpired = remaining <= 0;

  const remDays = Math.floor(remaining / 86400);
  const remHours = Math.floor((remaining % 86400) / 3600);
  const remMins = Math.floor((remaining % 3600) / 60);
  const remSecs = remaining % 60;

  return {
    totalSeconds: remaining,
    days: String(remDays).padStart(2, '0'),
    hours: String(remHours).padStart(2, '0'),
    mins: String(remMins).padStart(2, '0'),
    secs: String(remSecs).padStart(2, '0'),
    isExpired: isExpired
  };
}

/**
 * Get remaining countdown for the Store-Wide Home / Hot Deals Banner (Timer Type 1)
 */
export function getHomeBannerRemainingTime() {
  const banner = getHomeDealBanner();
  return getRemainingTimeFromDuration(banner);
}

/**
 * Get remaining countdown for a specific Deal Bundle (Timer Type 2)
 */
export function getBundleRemainingTime(bundleId) {
  const bundles = getDealBundles();
  const bundle = bundles.find(b => b.id === Number(bundleId));
  return getRemainingTimeFromDuration(bundle);
}

/**
 * Normalizes bundle items to structured format [{ productId, qty, name }]
 */
export function normalizeBundleItems(items, productsList) {
  if (!Array.isArray(items)) return [];
  const products = productsList || getStoredProducts();

  return items.map(item => {
    if (typeof item === 'object' && item !== null && item.productId) {
      const p = products.find(prod => prod.id === Number(item.productId));
      return {
        productId: Number(item.productId),
        qty: Math.max(1, parseInt(item.qty || item.quantity) || 1),
        name: p ? p.name : (item.name || `Product #${item.productId}`),
        sku: p ? p.sku : (item.sku || `ETC-${item.productId}`),
        unitPrice: p ? Number(p.price) : Number(item.unitPrice || 0),
        image: p ? p.image : (item.image || '')
      };
    } else if (typeof item === 'string') {
      const p = products.find(prod => prod.name.toLowerCase().includes(item.toLowerCase()) || item.toLowerCase().includes(prod.name.toLowerCase()));
      return {
        productId: p ? p.id : 1,
        qty: 1,
        name: p ? p.name : item,
        sku: p ? p.sku : 'ETC-1',
        unitPrice: p ? Number(p.price) : 0,
        image: p ? p.image : ''
      };
    }
    return null;
  }).filter(Boolean);
}

/**
 * Calculates live dynamic inventory status, bottleneck available units, and branch assembly readiness for a bundle
 */
export function calculateBundleInventory(bundle, customProducts = null, customBranches = null) {
  const products = customProducts || getStoredProducts();
  let branches = customBranches;
  if (!branches) {
    try {
      branches = typeof getBranches === 'function' ? getBranches() : [];
    } catch (e) {
      branches = [];
    }
  }
  if (!Array.isArray(branches)) branches = [];

  let rawItems = bundle.bundleItems;
  if ((!rawItems || !rawItems.length) && Array.isArray(bundle.componentsBreakdown) && bundle.componentsBreakdown.length > 0) {
    rawItems = bundle.componentsBreakdown.map(c => ({
      productId: Number(c.productId),
      qty: Number(c.qty || c.quantity || 1),
      name: c.name || `Product #${c.productId}`,
      unitPrice: Number(c.unitPrice || 0),
      sku: c.sku,
      image: c.image
    }));
  }

  const normalizedItems = normalizeBundleItems(rawItems, products);

  if (normalizedItems.length === 0) {
    const existingBreakdown = Array.isArray(bundle.componentsBreakdown) ? bundle.componentsBreakdown : [];
    return {
      maxAvailableBundles: Number(bundle.stockLeft) || 0,
      calculatedMSRP: Number(bundle.originalPrice) || Number(bundle.price) || 0,
      componentsBreakdown: existingBreakdown,
      branchAssembly: {},
      totalReadyToShip: 0,
      claimedPercent: Number(bundle.claimedPercent) || 50,
      stockLeft: Number(bundle.stockLeft) || 0,
      soldCount: Number(bundle.soldCount) || 0
    };
  }

  let calculatedMSRP = 0;
  let componentBottlenecks = [];
  let branchStocksAccumulator = {};

  branches.forEach(b => {
    branchStocksAccumulator[b.id] = [];
  });

  const componentsBreakdown = normalizedItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    const unitPrice = product ? Number(product.price) : (Number(item.unitPrice) || 0);
    calculatedMSRP += unitPrice * item.qty;

    const totalStock = product ? (product.totalStock || 0) : 10;
    const availableBundlesForThisItem = Math.floor(totalStock / item.qty);
    componentBottlenecks.push(availableBundlesForThisItem);

    // Branch breakdown
    const branchStockMap = {};
    branches.forEach(b => {
      const bStock = (product && product.branchStock && product.branchStock[b.id]) || 0;
      const bBundles = Math.floor(bStock / item.qty);
      branchStockMap[b.id] = bStock;
      branchStocksAccumulator[b.id].push(bBundles);
    });

    return {
      productId: item.productId,
      qty: item.qty,
      name: product ? product.name : item.name,
      sku: product ? product.sku : (item.sku || `ETC-${item.productId}`),
      brand: product ? (product.brand || '') : '',
      category: product ? (product.category || '') : '',
      image: product ? product.image : (item.image || ''),
      unitPrice: unitPrice,
      specs: product ? (product.specs || {}) : {},
      totalStock: totalStock,
      availableBundlesForThisItem: availableBundlesForThisItem,
      branchStock: branchStockMap
    };
  });

  const maxAvailableBundles = componentBottlenecks.length > 0 ? Math.max(0, Math.min(...componentBottlenecks)) : 0;

  const branchAssembly = {};
  let totalReadyToShip = 0;

  branches.forEach(b => {
    const branchKitLimits = branchStocksAccumulator[b.id] || [0];
    const readyKits = branchKitLimits.length > 0 ? Math.max(0, Math.min(...branchKitLimits)) : 0;
    branchAssembly[b.id] = {
      branchId: b.id,
      branchName: b.name,
      city: b.city,
      readyKits: readyKits
    };
    totalReadyToShip += readyKits;
  });

  const soldCount = Math.max(0, parseInt(bundle.soldCount) || 0);
  let claimedPercent = 0;
  if (soldCount + maxAvailableBundles > 0) {
    claimedPercent = Math.min(99, Math.max(5, Math.round((soldCount / (soldCount + maxAvailableBundles)) * 100)));
  } else {
    claimedPercent = bundle.claimedPercent !== undefined ? Number(bundle.claimedPercent) : 75;
  }

  return {
    maxAvailableBundles,
    calculatedMSRP,
    componentsBreakdown,
    branchAssembly,
    totalReadyToShip,
    claimedPercent,
    stockLeft: maxAvailableBundles,
    soldCount
  };
}

/**
 * Retrieve Home Deal Banner Configuration
 */
export function getHomeDealBanner() {
  return { ...memoryHomeDealBanner };
}

/**
 * Save Home Deal Banner Configuration with full Hot Deals Campaign state cascade
 */
export async function saveHomeDealBanner(bannerData) {
  const wasActive = memoryHomeDealBanner.active !== false;
  const isNowActive = bannerData.active !== undefined ? Boolean(bannerData.active) : (bannerData.isActive !== undefined ? Boolean(bannerData.isActive) : true);

  const durationDays = Number(bannerData.durationDays) || 0;
  const durationHours = Number(bannerData.durationHours) || 0;
  const durationMins = Number(bannerData.durationMins) || 0;
  const durationSecs = Number(bannerData.durationSecs) || 0;
  const durationSeconds = bannerData.durationSeconds || ((durationDays * 86400) + (durationHours * 3600) + (durationMins * 60) + durationSecs);

  // Hot deals pause / resume transition handling in memory
  if (wasActive && !isNowActive) {
    memoryHotDeals = memoryHotDeals.map(d => {
      const rem = getRemainingTimeFromDuration(d);
      return {
        ...d,
        pausedRemainingSeconds: rem.totalSeconds,
        isPaused: true
      };
    });
  } else if (!wasActive && isNowActive) {
    memoryHotDeals = memoryHotDeals.map(d => {
      const remainingSecs = d.pausedRemainingSeconds !== undefined ? d.pausedRemainingSeconds : d.durationSeconds;
      return {
        ...d,
        durationSeconds: remainingSecs,
        timerUpdatedAt: new Date().toISOString(),
        isPaused: false
      };
    });
  }

  const apiPayload = {
    dealTag: bannerData.tag || bannerData.badge || bannerData.dealTag || memoryHomeDealBanner.tag || 'WEEKEND TECH DEAL',
    heading: bannerData.title || bannerData.heading || memoryHomeDealBanner.title || 'Upgrade your setup',
    subtitle: bannerData.subtitle !== undefined ? bannerData.subtitle : (memoryHomeDealBanner.subtitle || ''),
    buttonText: bannerData.buttonText || bannerData.linkText || memoryHomeDealBanner.buttonText || 'Shop Deals',
    buttonUrl: bannerData.buttonUrl || bannerData.targetUrl || bannerData.linkHref || memoryHomeDealBanner.buttonUrl || '#deals',
    durationSeconds: durationSeconds,
    isActive: isNowActive
  };

  try {
    const res = await PromotionsApi.updateHomeBanner(apiPayload);
    const saved = res.body || res;
    if (saved && typeof saved === 'object') {
      memoryHomeDealBanner = normalizeHomeBanner({ ...saved, bgImage: bannerData.bgImage || memoryHomeDealBanner.bgImage });
      return memoryHomeDealBanner;
    }
  } catch (e) {
    console.warn('[DealsModel] Update banner API notice:', e.message);
  }

  memoryHomeDealBanner = normalizeHomeBanner({
    ...memoryHomeDealBanner,
    ...apiPayload,
    ...bannerData,
    durationSeconds,
    active: isNowActive,
    isActive: isNowActive,
    timerUpdatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  });

  return memoryHomeDealBanner;
}

/**
 * Retrieve Deal Bundles with Live Dynamic Inventory Calculations
 */
export function getDealBundles() {
  const list = memoryDealBundles;
  const products = getStoredProducts();
  let branches = [];
  try {
    branches = typeof getBranches === 'function' ? getBranches() : [];
  } catch (e) {
    branches = [];
  }

  return list.map(b => normalizeBundle(b, products, branches));
}

/**
 * Save All Deal Bundles
 */
export function saveDealBundles(bundlesList) {
  if (Array.isArray(bundlesList)) {
    memoryDealBundles = [...bundlesList];
  }
}

/**
 * Add or Create a Deal Bundle
 */
export async function addDealBundle(bundleData) {
  const products = getStoredProducts();
  const normalizedItems = normalizeBundleItems(bundleData.bundleItems, products);
  const inv = calculateBundleInventory({ ...bundleData, bundleItems: normalizedItems }, products);

  const price = Number(bundleData.price) || 199999;
  const originalPrice = inv.calculatedMSRP > 0 ? inv.calculatedMSRP : (Number(bundleData.originalPrice) || 229999);

  const durationDays = Number(bundleData.durationDays) || 2;
  const durationHours = Number(bundleData.durationHours) || 14;
  const durationMins = Number(bundleData.durationMins) || 30;
  const durationSecs = Number(bundleData.durationSecs) || 0;
  const durationSeconds = (durationDays * 86400) + (durationHours * 3600) + (durationMins * 60) + durationSecs;

  const apiPayload = {
    badge: bundleData.badge || "HOT DEAL",
    eyebrow: bundleData.eyebrow || "FEATURED DEAL",
    title: bundleData.title || "New High-End Bundle",
    subtitle: bundleData.subtitle || "Premium Hardware Package",
    imageUrl: bundleData.image || bundleData.imageUrl || "public/images/home-hero-image-1.png",
    price: price,
    originalPrice: originalPrice,
    targetQuota: Number(bundleData.targetQuota) || 20,
    soldCount: Number(bundleData.soldCount) || 0,
    durationSeconds: durationSeconds,
    isActive: bundleData.active !== undefined ? Boolean(bundleData.active) : true,
    bundleItems: normalizedItems.map((item, idx) => ({
      productId: Number(item.productId),
      quantity: Number(item.qty || item.quantity || 1),
      displayOrder: idx + 1
    }))
  };

  try {
    const res = await PromotionsApi.createBundle(apiPayload);
    const saved = res.body || res;
    if (saved && saved.id) {
      const normalized = normalizeBundle(saved, products);
      memoryDealBundles.push(normalized);
      await syncPromotionsFromApi();
      return normalized;
    }
  } catch (e) {
    console.warn('[DealsModel] Create bundle API notice:', e.message);
  }

  const newId = memoryDealBundles.length > 0 ? Math.max(...memoryDealBundles.map(b => b.id || 0)) + 1 : 1;
  const fallbackBundle = normalizeBundle({
    id: newId,
    ...apiPayload,
    ...bundleData,
    bundleItems: normalizedItems
  }, products);

  memoryDealBundles.push(fallbackBundle);
  return fallbackBundle;
}

/**
 * Update an existing Deal Bundle
 */
export async function updateDealBundle(id, bundleData) {
  const index = memoryDealBundles.findIndex(b => b.id === Number(id));
  const existing = index !== -1 ? memoryDealBundles[index] : {};

  const products = getStoredProducts();
  const rawItems = bundleData.bundleItems || existing.bundleItems;
  const normalizedItems = normalizeBundleItems(rawItems, products);
  const inv = calculateBundleInventory({ ...existing, ...bundleData, bundleItems: normalizedItems }, products);

  const price = Number(bundleData.price !== undefined ? bundleData.price : (existing.price || 199999));
  const originalPrice = inv.calculatedMSRP > 0 ? inv.calculatedMSRP : Number(bundleData.originalPrice !== undefined ? bundleData.originalPrice : (existing.originalPrice || price));

  const durationDays = bundleData.durationDays !== undefined ? Number(bundleData.durationDays) : (existing.durationDays || 2);
  const durationHours = bundleData.durationHours !== undefined ? Number(bundleData.durationHours) : (existing.durationHours || 14);
  const durationMins = bundleData.durationMins !== undefined ? Number(bundleData.durationMins) : (existing.durationMins || 30);
  const durationSecs = bundleData.durationSecs !== undefined ? Number(bundleData.durationSecs) : (existing.durationSecs || 0);
  const durationSeconds = (durationDays * 86400) + (durationHours * 3600) + (durationMins * 60) + durationSecs;

  const isActive = bundleData.active !== undefined ? Boolean(bundleData.active) : (bundleData.isActive !== undefined ? Boolean(bundleData.isActive) : (existing.active !== false));

  const apiPayload = {
    badge: bundleData.badge || existing.badge || "HOT DEAL",
    eyebrow: bundleData.eyebrow || existing.eyebrow || "FEATURED DEAL",
    title: bundleData.title || existing.title || "Featured Bundle",
    subtitle: bundleData.subtitle !== undefined ? bundleData.subtitle : (existing.subtitle || ""),
    imageUrl: bundleData.image || bundleData.imageUrl || existing.imageUrl || existing.image || "public/images/home-hero-image-1.png",
    price: price,
    originalPrice: originalPrice,
    targetQuota: Number(bundleData.targetQuota !== undefined ? bundleData.targetQuota : (existing.targetQuota || 20)),
    soldCount: Number(bundleData.soldCount !== undefined ? bundleData.soldCount : (existing.soldCount || 0)),
    durationSeconds: durationSeconds,
    isActive: isActive,
    bundleItems: normalizedItems.map((item, idx) => ({
      productId: Number(item.productId),
      quantity: Number(item.qty || item.quantity || 1),
      displayOrder: idx + 1
    }))
  };

  try {
    const res = await PromotionsApi.updateBundle(id, apiPayload);
    const saved = res.body || res;
    if (saved && saved.id) {
      const normalized = normalizeBundle(saved, products);
      if (index !== -1) memoryDealBundles[index] = normalized;
      await syncPromotionsFromApi();
      return normalized;
    }
  } catch (e) {
    console.warn('[DealsModel] Update bundle API notice:', e.message);
  }

  const updated = normalizeBundle({
    ...existing,
    ...apiPayload,
    ...bundleData,
    id: Number(id),
    bundleItems: normalizedItems,
    lastUpdated: new Date().toISOString()
  }, products);

  if (index !== -1) memoryDealBundles[index] = updated;
  return updated;
}

/**
 * Records a purchase of a Deal Bundle and increments its sold count
 */
export function recordBundleSale(bundleId, qty = 1) {
  const index = memoryDealBundles.findIndex(b => b.id === Number(bundleId));
  if (index !== -1) {
    memoryDealBundles[index].soldCount = (memoryDealBundles[index].soldCount || 0) + (parseInt(qty) || 1);
  }
}

/**
 * Delete a Deal Bundle
 */
export async function deleteDealBundle(id) {
  memoryDealBundles = memoryDealBundles.filter(b => b.id !== Number(id));
  try {
    await PromotionsApi.deleteBundle(id);
    await syncPromotionsFromApi();
  } catch (e) {
    console.warn('[DealsModel] Delete bundle API notice:', e.message);
  }
  return true;
}

/**
 * Validates whether a deal bundle is currently active, unexpired, and in stock
 */
export function isBundleAvailable(bundleId) {
  const bundles = getDealBundles();
  const bundle = bundles.find(b => b.id === Number(bundleId));
  if (!bundle || bundle.active === false) {
    return { available: false, reason: 'inactive', message: 'This deal bundle is currently inactive.' };
  }

  const timer = getBundleRemainingTime(bundle.id);
  if (timer.isExpired) {
    return { available: false, reason: 'expired', message: `The deal bundle "${bundle.title}" has expired.` };
  }

  const products = getStoredProducts();
  const inv = calculateBundleInventory(bundle, products);
  if (inv.maxAvailableBundles <= 0) {
    return { available: false, reason: 'out_of_stock', message: `The deal bundle "${bundle.title}" is currently out of stock.` };
  }

  return { available: true, bundle, inv, remainingSeconds: timer.totalSeconds };
}

/**
 * Get all products with promotion details for the discounts table
 */
export function getAllDiscountsAndDeals() {
  const products = getStoredProducts();
  return products.map(p => {
    const orig = p.originalPrice || p.price;
    const current = p.price;
    const discount = orig > current ? Math.round(((orig - current) / orig) * 100) : 0;
    const savings = Math.max(0, orig - current);

    return {
      ...p,
      discountPercent: discount,
      savingAmount: savings,
      isHotDeal: p.badge && (p.badge.toLowerCase().includes('deal') || p.badge.toLowerCase().includes('hot') || p.badge.toLowerCase().includes('-')),
      isBestSeller: p.badge && p.badge.toLowerCase().includes('best seller')
    };
  });
}

/**
 * Update a specific product discount and badge
 */
export async function updateProductDiscount(productId, { price, originalPrice, badge }) {
  const products = getStoredProducts();
  const index = products.findIndex(p => p.id === Number(productId));
  if (index === -1) return false;

  products[index].price = Number(price);
  if (originalPrice !== undefined) products[index].originalPrice = Number(originalPrice);
  if (badge !== undefined) products[index].badge = badge;
  products[index].discount = products[index].originalPrice > products[index].price 
    ? Math.round(((products[index].originalPrice - products[index].price) / products[index].originalPrice) * 100) 
    : 0;

  saveStoredProducts(products);

  try {
    await ProductsApi.update(productId, products[index]);
  } catch (err) {
    console.warn('[DealsModel] Update product discount backend sync notice:', err.message);
  }
  return true;
}

/**
 * Retrieve All Hot Deals with live Product relation join and dynamic calculations
 */
export function getHotDeals() {
  const list = memoryHotDeals;
  const products = getStoredProducts();

  return list.map(deal => {
    const norm = normalizeHotDeal(deal, products);
    const product = norm.product || products.find(p => p.id === norm.productId) || {
      id: norm.productId,
      name: `Hardware Product #${norm.productId}`,
      category: 'components',
      price: norm.dealPrice,
      originalPrice: norm.originalPrice,
      image: 'public/images/home-hero-image-1.png',
      rating: 4.8,
      reviews: 50,
      totalStock: 20
    };

    const regularCatalogPrice = Number(product.price) || norm.dealPrice;
    const originalListPrice = Number(product.originalPrice) || Number(norm.originalPrice) || regularCatalogPrice;
    const dealPrice = Number(norm.dealPrice) || regularCatalogPrice;

    const remainingTime = getRemainingTimeFromDuration(norm);
    const isExpired = remainingTime.isExpired;

    const savingsAmount = Math.max(0, originalListPrice - dealPrice);
    const discountPercent = originalListPrice > 0 ? Math.round((savingsAmount / originalListPrice) * 100) : norm.discountPercent;

    const targetQuota = Number(norm.targetQuota) || 30;
    const soldCount = Number(norm.soldCount) || 0;
    const stockLeft = product.totalStock !== undefined ? product.totalStock : 15;
    const totalAllocated = soldCount + stockLeft;
    const soldPercent = totalAllocated > 0 ? Math.min(99, Math.max(5, Math.round((soldCount / totalAllocated) * 100))) : 75;

    return {
      ...norm,
      id: Number(norm.id),
      productId: Number(norm.productId),
      productName: product.name,
      name: product.name,
      category: product.category || 'components',
      image: product.image || (Array.isArray(product.images) && product.images[0]) || 'public/images/home-hero-image-1.png',
      images: product.images || [product.image || 'public/images/home-hero-image-1.png'],
      specs: product.specs || {},
      rating: product.rating || 4.8,
      reviews: product.reviews || 95,
      sku: product.sku || `ETC-${norm.productId}`,
      regularPrice: regularCatalogPrice,
      originalPrice: originalListPrice,
      dealPrice: dealPrice,
      savingAmount: savingsAmount,
      discountPercent: discountPercent,
      badge: norm.badge || "HOT DEAL",
      targetQuota: targetQuota,
      soldCount: soldCount,
      stockLeft: stockLeft,
      totalStock: totalAllocated,
      soldPercent: soldPercent,
      remainingStock: stockLeft,
      remainingTime: remainingTime,
      isExpired: isExpired,
      active: norm.active && !isExpired
    };
  });
}

/**
 * Get only Active and Unexpired Hot Deals
 */
export function getActiveHotDeals() {
  if (!isHomeDealBannerActive()) {
    return [];
  }
  return getHotDeals().filter(d => d.active !== false && !d.isExpired);
}

/**
 * Get active Hot Deal override for a given product ID (or null if none/expired)
 */
export function getHotDealByProductId(productId) {
  const activeDeals = getActiveHotDeals();
  return activeDeals.find(d => d.productId === Number(productId)) || null;
}

/**
 * Save Hot Deals list
 */
export function saveHotDeals(dealsList) {
  if (Array.isArray(dealsList)) {
    memoryHotDeals = [...dealsList];
  }
}

/**
 * Add a new Hot Deal
 */
export async function addHotDeal(dealData) {
  const products = getStoredProducts();
  const product = products.find(p => p.id === Number(dealData.productId));

  const durationDays = Number(dealData.durationDays) || 0;
  const durationHours = Number(dealData.durationHours) || 8;
  const durationMins = Number(dealData.durationMins) || 0;
  const durationSecs = Number(dealData.durationSecs) || 0;
  const durationSeconds = (durationDays * 86400) + (durationHours * 3600) + (durationMins * 60) + durationSecs;

  const promoPrice = Number(dealData.dealPrice !== undefined ? dealData.dealPrice : dealData.promoPrice);
  const originalPrice = Number(dealData.originalPrice || (product ? (product.originalPrice || product.price) : promoPrice * 1.15));
  const discountPercent = originalPrice > promoPrice ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100) : (Number(dealData.discountPercent) || 0);
  const isActive = dealData.active !== undefined ? Boolean(dealData.active) : true;

  const apiPayload = {
    productId: Number(dealData.productId),
    badge: dealData.badge || "HOT DEAL",
    promoPrice: promoPrice,
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    durationSeconds: durationSeconds,
    isActive: isActive
  };

  try {
    const res = await PromotionsApi.createHotDeal(apiPayload);
    const saved = res.body || res;
    if (saved && saved.id) {
      const normalized = normalizeHotDeal(saved, products);
      memoryHotDeals.push(normalized);
      await syncPromotionsFromApi();
      return normalized;
    }
  } catch (e) {
    console.warn('[DealsModel] Create hot deal API notice:', e.message);
  }

  const newId = memoryHotDeals.length > 0 ? Math.max(...memoryHotDeals.map(d => d.id || 0)) + 1 : 101;
  const fallbackDeal = normalizeHotDeal({
    id: newId,
    ...apiPayload,
    ...dealData,
    targetQuota: Number(dealData.targetQuota) || 25,
    soldCount: 0
  }, products);

  memoryHotDeals.push(fallbackDeal);
  return fallbackDeal;
}

/**
 * Update an existing Hot Deal
 */
export async function updateHotDeal(id, dealData) {
  const index = memoryHotDeals.findIndex(d => d.id === Number(id));
  const existing = index !== -1 ? memoryHotDeals[index] : {};
  const products = getStoredProducts();
  const product = products.find(p => p.id === Number(dealData.productId !== undefined ? dealData.productId : existing.productId));

  const durationDays = dealData.durationDays !== undefined ? Number(dealData.durationDays) : (existing.durationDays || 0);
  const durationHours = dealData.durationHours !== undefined ? Number(dealData.durationHours) : (existing.durationHours || 8);
  const durationMins = dealData.durationMins !== undefined ? Number(dealData.durationMins) : (existing.durationMins || 0);
  const durationSecs = dealData.durationSecs !== undefined ? Number(dealData.durationSecs) : (existing.durationSecs || 0);
  const durationSeconds = (durationDays * 86400) + (durationHours * 3600) + (durationMins * 60) + durationSecs;

  const promoPrice = Number(dealData.dealPrice !== undefined ? dealData.dealPrice : (dealData.promoPrice !== undefined ? dealData.promoPrice : existing.dealPrice));
  const originalPrice = Number(dealData.originalPrice !== undefined ? dealData.originalPrice : (existing.originalPrice || (product ? (product.originalPrice || product.price) : promoPrice * 1.15)));
  const discountPercent = originalPrice > promoPrice ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100) : (Number(dealData.discountPercent) || existing.discountPercent || 0);
  const isActive = dealData.active !== undefined ? Boolean(dealData.active) : (dealData.isActive !== undefined ? Boolean(dealData.isActive) : (existing.active !== false));

  const apiPayload = {
    productId: Number(dealData.productId !== undefined ? dealData.productId : existing.productId),
    badge: dealData.badge || existing.badge || "HOT DEAL",
    promoPrice: promoPrice,
    originalPrice: originalPrice,
    discountPercent: discountPercent,
    durationSeconds: durationSeconds,
    isActive: isActive
  };

  try {
    const res = await PromotionsApi.updateHotDeal(id, apiPayload);
    const saved = res.body || res;
    if (saved && saved.id) {
      const normalized = normalizeHotDeal(saved, products);
      if (index !== -1) memoryHotDeals[index] = normalized;
      await syncPromotionsFromApi();
      return normalized;
    }
  } catch (e) {
    console.warn('[DealsModel] Update hot deal API notice:', e.message);
  }

  const updated = normalizeHotDeal({
    ...existing,
    ...apiPayload,
    ...dealData,
    id: Number(id),
    timerUpdatedAt: dealData.resetTimer ? new Date().toISOString() : (existing.timerUpdatedAt || new Date().toISOString()),
    lastUpdated: new Date().toISOString()
  }, products);

  if (index !== -1) memoryHotDeals[index] = updated;
  return updated;
}

/**
 * Delete a Hot Deal
 */
export async function deleteHotDeal(id) {
  memoryHotDeals = memoryHotDeals.filter(d => d.id !== Number(id));
  try {
    await PromotionsApi.deleteHotDeal(id);
    await syncPromotionsFromApi();
  } catch (e) {
    console.warn('[DealsModel] Delete hot deal API notice:', e.message);
  }
  return true;
}

/**
 * Toggle Active / Inactive status of a Hot Deal
 */
export async function toggleHotDealStatus(id) {
  const deal = memoryHotDeals.find(d => d.id === Number(id));
  if (deal) {
    const newStatus = !deal.active;
    deal.active = newStatus;
    deal.isActive = newStatus;
    deal.lastUpdated = new Date().toISOString();
    try {
      await updateHotDeal(id, { active: newStatus, isActive: newStatus });
    } catch (e) {}
    return newStatus;
  }
  return false;
}
