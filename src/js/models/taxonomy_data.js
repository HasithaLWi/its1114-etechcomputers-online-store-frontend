// ============================================================
//  src/js/models/taxonomy_data.js — Categories & Badges In-Memory Models
// ============================================================
import { getStoredProducts, saveStoredProducts } from './data.js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_BADGES,
  defaultCategories,
  defaultBadges
} from '../../data/taxonomy.js';
import { CategoriesApi } from '../api/categoriesApi.js';
import { BadgesApi } from '../api/badgesApi.js';

export { DEFAULT_CATEGORIES, DEFAULT_BADGES, defaultCategories, defaultBadges };

// Reactive In-Memory Stores
let memoryCategories = Array.isArray(defaultCategories) ? defaultCategories.map(c => ({ ...c })) : [];
let memoryBadges = Array.isArray(defaultBadges) ? defaultBadges.map(b => ({ ...b })) : [];
let memoryBehaviorHistory = [];

// ============================================================
//  1. CATEGORIES MANAGEMENT MODEL
// ============================================================

export function getCategories(options = {}) {
  const { includeDeleted = false, activeOnly = false } = options;
  let list = memoryCategories;

  if (includeDeleted) return list;
  if (activeOnly) return list.filter(c => (c.categoryStatus || c.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
  // Default: exclude soft-deleted categories
  return list.filter(c => (c.categoryStatus || c.status || 'ACTIVE').toUpperCase() !== 'DELETED');
}

/**
 * Sync categories directly from backend REST API
 */
export async function syncCategoriesFromApi(options = {}) {
  try {
    const res = await CategoriesApi.getAll();
    let apiList = [];
    if (Array.isArray(res)) {
      apiList = res;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
    }

    if (apiList.length > 0) {
      memoryCategories = apiList.map(c => ({
        id: c.id,
        name: c.name || '',
        slug: c.slug || '',
        icon: c.icon || '🏷️',
        description: c.description || '',
        featured: Boolean(c.featured),
        displayOrder: Number(c.displayOrder || 1),
        categoryStatus: (c.categoryStatus || c.status || 'ACTIVE').toUpperCase(),
        status: (c.categoryStatus || c.status || 'ACTIVE').toUpperCase()
      }));
    }
    return getCategories(options);
  } catch (err) {
    console.warn('[TaxonomyModel] Categories API sync notice:', err.message);
    return getCategories(options);
  }
}

/**
 * Retrieve only deleted categories for SuperADMIN Trash Bin
 */
export function getDeletedCategories() {
  return memoryCategories.filter(c => (c.categoryStatus || c.status || '').toUpperCase() === 'DELETED');
}

export function saveCategories(categories) {
  if (Array.isArray(categories)) {
    memoryCategories = [...categories];
  }
}

export function getCategoryBySlug(slug) {
  if (!slug) return null;
  const categories = getCategories({ includeDeleted: true });
  return categories.find(c => c.slug.toLowerCase() === slug.toLowerCase() || c.id === slug) || null;
}

export async function saveCategory(categoryData, isEdit = false) {
  const categories = memoryCategories;
  const slug = (categoryData.slug || categoryData.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const categoryStatus = (categoryData.categoryStatus || categoryData.status || 'ACTIVE').toUpperCase();

  if (isEdit) {
    const index = categories.findIndex(c => c.id === categoryData.id || c.slug === categoryData.slug);
    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        ...categoryData,
        categoryStatus: categoryStatus,
        status: categoryStatus,
        slug: slug || categories[index].slug
      };

      try {
        await CategoriesApi.update(categories[index].id, categories[index]);
      } catch (err) {
        console.warn('[TaxonomyModel] Backend category update notice:', err.message);
      }

      return categories[index];
    }
  }

  // Create New Category
  const newCat = {
    id: categoryData.id || `cat-${slug || Date.now()}`,
    name: categoryData.name || 'New Category',
    slug: slug || `category-${Math.floor(1000 + Math.random() * 9000)}`,
    icon: categoryData.icon || '🏷️',
    description: categoryData.description || '',
    featured: Boolean(categoryData.featured),
    displayOrder: parseInt(categoryData.displayOrder) || (categories.length + 1),
    categoryStatus: categoryStatus,
    status: categoryStatus
  };

  categories.push(newCat);

  try {
    await CategoriesApi.create(newCat);
  } catch (err) {
    console.warn('[TaxonomyModel] Backend category create notice:', err.message);
  }

  return newCat;
}

/**
 * Update category lifecycle status (ACTIVE, INACTIVE, DELETED)
 */
export async function updateCategoryStatus(idOrSlug, newStatus) {
  const upperStatus = (newStatus || 'ACTIVE').toUpperCase();
  const index = memoryCategories.findIndex(c => c.id === idOrSlug || c.slug === idOrSlug);

  if (index !== -1) {
    memoryCategories[index].categoryStatus = upperStatus;
    memoryCategories[index].status = upperStatus;

    try {
      await CategoriesApi.updateStatus(memoryCategories[index].id, upperStatus);
    } catch (err) {
      console.warn(`[TaxonomyModel] Backend category status update notice for ${idOrSlug}:`, err.message);
    }

    return { success: true, category: memoryCategories[index] };
  }
  return { success: false, message: 'Category not found.' };
}

/**
 * Soft delete category by slug/ID (sets status to DELETED)
 */
export async function deleteCategory(slugOrId) {
  const cat = getCategoryBySlug(slugOrId);
  const res = await updateCategoryStatus(slugOrId, 'DELETED');
  try {
    if (cat) await CategoriesApi.delete(cat.id);
  } catch (err) {
    console.warn(`[TaxonomyModel] Backend category soft-delete notice for ${slugOrId}:`, err.message);
  }
  return res.success;
}

/**
 * Restore soft-deleted category back to ACTIVE
 */
export async function restoreCategory(slugOrId) {
  return await updateCategoryStatus(slugOrId, 'ACTIVE');
}

/**
 * Permanently purge category from storage and backend (SuperADMIN only)
 */
export async function permanentlyDeleteCategory(slugOrId) {
  const target = memoryCategories.find(c => c.id === slugOrId || c.slug === slugOrId);
  memoryCategories = memoryCategories.filter(c => c.id !== slugOrId && c.slug !== slugOrId);

  try {
    if (target) await CategoriesApi.permaDelete(target.id);
  } catch (err) {
    console.warn(`[TaxonomyModel] Backend category perma-delete notice for ${slugOrId}:`, err.message);
  }

  return { success: true, category: target };
}

// ============================================================
//  2. BADGES MANAGEMENT MODEL (WITH DYNAMIC THRESHOLDS & STATUS)
// ============================================================

export function getBadges(options = {}) {
  const { includeDeleted = false, activeOnly = false } = options;
  let list = memoryBadges;

  if (includeDeleted) return list;
  if (activeOnly) return list.filter(b => (b.status || (b.isActive !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase() === 'ACTIVE');
  // Default: exclude soft-deleted badges
  return list.filter(b => (b.status || '').toUpperCase() !== 'DELETED');
}

/**
 * Sync badges directly from backend REST API
 */
export async function syncBadgesFromApi(options = {}) {
  try {
    const res = await BadgesApi.getAll();
    let apiList = [];
    if (Array.isArray(res)) {
      apiList = res;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
    }

    if (apiList.length > 0) {
      memoryBadges = apiList.map(b => ({
        id: b.id,
        name: b.name || '',
        slug: b.slug || '',
        badgeType: b.badgeType || 'general',
        description: b.description || '',
        color: b.color || 'blue',
        bgClass: b.bgClass || `bg-${b.color || 'blue'}-50`,
        textClass: b.textClass || `text-${b.color || 'blue'}-700`,
        borderClass: b.borderClass || `border-${b.color || 'blue'}-200`,
        colorHex: b.colorHex || '#2563eb',
        ruleType: b.ruleType || 'automatic',
        isSystemDefault: Boolean(b.isSystemDefault),
        canEdit: b.canEdit !== undefined ? b.canEdit : true,
        canDelete: b.canDelete !== undefined ? b.canDelete : true,
        status: (b.status || (b.isActive !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase(),
        isActive: (b.status || '').toUpperCase() === 'ACTIVE' || b.isActive === true,
        thresholds: b.thresholds || {}
      }));
    }
    return getBadges(options);
  } catch (err) {
    console.warn('[TaxonomyModel] Badges API sync notice:', err.message);
    return getBadges(options);
  }
}

/**
 * Retrieve only deleted badges for SuperADMIN Trash Bin
 */
export function getDeletedBadges() {
  return memoryBadges.filter(b => (b.status || '').toUpperCase() === 'DELETED');
}

export function saveBadges(badges) {
  if (Array.isArray(badges)) {
    memoryBadges = [...badges];
  }
}

export function getBadgeById(id) {
  const badges = getBadges({ includeDeleted: true });
  return badges.find(b => b.id === id || b.slug === id || b.name.toLowerCase() === id.toLowerCase()) || null;
}

export async function saveBadge(badgeData, isEdit = false) {
  const badges = memoryBadges;
  const slug = (badgeData.slug || badgeData.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const thresholds = badgeData.thresholds || {};
  const status = (badgeData.status || (badgeData.isActive !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();

  // Protect Hot Deal from being modified
  if ((badgeData.id === 'bdg-hotdeal' || slug === 'hotdeal' || slug === 'hot-deal' || badgeData.canEdit === false) && isEdit) {
    console.warn('Hot Deal is a protected system badge and cannot be modified.');
    return badges.find(b => b.id === 'bdg-hotdeal') || badgeData;
  }

  if (isEdit) {
    const index = badges.findIndex(b => b.id === badgeData.id || b.slug === badgeData.slug);
    if (index !== -1) {
      if (badges[index].canEdit === false || badges[index].id === 'bdg-hotdeal') {
        console.warn('Attempted to edit a non-editable system badge.');
        return badges[index];
      }
      const existing = badges[index];
      badges[index] = {
        ...existing,
        ...badgeData,
        status: status,
        isActive: status === 'ACTIVE',
        isSystemDefault: existing.isSystemDefault,
        canDelete: existing.canDelete,
        canEdit: existing.canEdit,
        thresholds: {
          ...(existing.thresholds || {}),
          ...thresholds
        },
        slug: slug || existing.slug
      };

      try {
        await BadgesApi.update(badges[index].id, badges[index]);
      } catch (err) {
        console.warn('[TaxonomyModel] Backend badge update notice:', err.message);
      }

      return badges[index];
    }
  }

  // Create New Badge
  const newBadge = {
    id: badgeData.id || `bdg-${slug || Date.now()}`,
    name: badgeData.name || 'New Badge',
    slug: slug || `badge-${Math.floor(1000 + Math.random() * 9000)}`,
    color: badgeData.color || 'blue',
    colorHex: badgeData.colorHex || '#2563eb',
    bgClass: badgeData.bgClass || `bg-${badgeData.color || 'blue'}-50`,
    textClass: badgeData.textClass || `text-${badgeData.color || 'blue'}-700`,
    borderClass: badgeData.borderClass || `border-${badgeData.color || 'blue'}-200`,
    purpose: badgeData.purpose || '',
    standardDescription: badgeData.standardDescription || 'Custom standard criterion',
    ruleType: badgeData.ruleType || 'manual',
    criteria: badgeData.criteria || 'custom',
    thresholds: thresholds,
    priority: parseInt(badgeData.priority) || 10,
    status: status,
    isActive: status === 'ACTIVE',
    isSystemDefault: false,
    canEdit: true,
    canDelete: true
  };

  badges.push(newBadge);

  try {
    await BadgesApi.create(newBadge);
  } catch (err) {
    console.warn('[TaxonomyModel] Backend badge create notice:', err.message);
  }

  return newBadge;
}

/**
 * Update badge lifecycle status (ACTIVE, INACTIVE, DELETED)
 */
export async function updateBadgeStatus(badgeId, newStatus) {
  const upperStatus = (newStatus || 'ACTIVE').toUpperCase();
  const index = memoryBadges.findIndex(b => b.id === badgeId || b.slug === badgeId);

  if (index !== -1) {
    memoryBadges[index].status = upperStatus;
    memoryBadges[index].isActive = upperStatus === 'ACTIVE';

    try {
      await BadgesApi.updateStatus(memoryBadges[index].id, upperStatus);
    } catch (err) {
      console.warn(`[TaxonomyModel] Backend badge status update notice for ${badgeId}:`, err.message);
    }

    return { success: true, badge: memoryBadges[index] };
  }
  return { success: false, message: 'Badge not found.' };
}

/**
 * Soft delete badge by ID (sets status to DELETED)
 */
export async function deleteBadge(badgeId) {
  const target = memoryBadges.find(b => b.id === badgeId || b.slug === badgeId);

  if (target && (target.canDelete === false || target.isSystemDefault || target.id === 'bdg-hotdeal')) {
    console.warn('Cannot delete core system protected badge:', target.name);
    return false;
  }

  const res = await updateBadgeStatus(badgeId, 'DELETED');
  try {
    if (target) await BadgesApi.delete(target.id);
  } catch (err) {
    console.warn(`[TaxonomyModel] Backend badge soft-delete notice for ${badgeId}:`, err.message);
  }
  return res.success;
}

/**
 * Restore soft-deleted badge back to ACTIVE status
 */
export async function restoreBadge(badgeId) {
  return await updateBadgeStatus(badgeId, 'ACTIVE');
}

/**
 * Permanently delete badge from memory and database (SuperADMIN only)
 */
export async function permanentlyDeleteBadge(badgeId) {
  const target = memoryBadges.find(b => b.id === badgeId || b.slug === badgeId);
  memoryBadges = memoryBadges.filter(b => b.id !== badgeId && b.slug !== badgeId);

  try {
    if (target) await BadgesApi.permaDelete(target.id);
  } catch (err) {
    console.warn(`[TaxonomyModel] Backend badge perma-delete notice for ${badgeId}:`, err.message);
  }

  return { success: true, badge: target };
}

/**
 * Generates a human-readable summary of the active rule thresholds for a badge
 */
export function getBadgeThresholdSummary(badge) {
  if (!badge) return 'No criteria specified';
  if (badge.id === 'bdg-hotdeal' || badge.ruleType === 'system' || badge.criteria === 'system_hot_deal') {
    return 'Managed via Hot Deals & Promotions Module';
  }
  if (badge.ruleType !== 'automatic') {
    return badge.standardDescription || 'Manual Staff Assignment';
  }

  const t = badge.thresholds || {};
  switch (badge.criteria) {
    case 'discount_gte_10': {
      const val = t.discountPct !== undefined ? t.discountPct : 10;
      return `Discount ≥ ${val}% off MSRP`;
    }
    case 'rating_gte_48': {
      const minR = t.minRating !== undefined ? t.minRating : 4.8;
      const minRev = t.minReviews !== undefined ? t.minReviews : 50;
      return `Rating ≥ ${minR} / 5.0 (Reviews ≥ ${minRev})`;
    }
    case 'bestseller': {
      const minRev = t.minReviews !== undefined ? t.minReviews : 80;
      return `Sales Champion (Reviews ≥ ${minRev})`;
    }
    case 'reviews_gte_40': {
      const minRev = t.minReviews !== undefined ? t.minReviews : 40;
      return `High Popularity (Reviews ≥ ${minRev})`;
    }
    case 'low_stock_scarcity': {
      const maxSt = t.maxStock !== undefined ? t.maxStock : 5;
      return `Urgent Scarcity (Stock ≤ ${maxSt} units)`;
    }
    case 'new_arrival':
      return `Recent Catalog Intake`;
    default:
      return badge.standardDescription || 'Automated rule';
  }
}

// ============================================================
//  3. PRODUCT BEHAVIOR HISTORY DATA STORE (AUDIT LOGS)
// ============================================================

export function getProductBehaviorHistory() {
  return memoryBehaviorHistory;
}

export function recordProductBehaviorEvent(eventData) {
  const event = {
    id: `pbe-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: eventData.productId,
    productName: eventData.productName || 'Unknown Product',
    eventType: eventData.eventType || 'STANDARD_REACHED',
    previousValue: eventData.previousValue || '',
    newValue: eventData.newValue || '',
    triggerReason: eventData.triggerReason || 'Standard behavioral rule threshold satisfied.',
    metricsSnapshot: eventData.metricsSnapshot || {},
    actor: eventData.actor || 'SYSTEM_AUTO_RULE',
    timestamp: new Date().toISOString()
  };

  memoryBehaviorHistory.unshift(event);
  if (memoryBehaviorHistory.length > 500) memoryBehaviorHistory.pop();
  return event;
}

export function getProductHistory(productId) {
  return memoryBehaviorHistory.filter(h => String(h.productId) === String(productId));
}

export function clearProductBehaviorHistory() {
  memoryBehaviorHistory = [];
  return true;
}

// ============================================================
//  4. AUTOMATED BEHAVIOR & BADGE EVALUATION ENGINE
// ============================================================

export function evaluateBadgeForProduct(product, activeBadges = null) {
  if (!activeBadges) {
    activeBadges = getBadges({ activeOnly: true });
  }

  const sortedBadges = [...activeBadges].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const price = parseFloat(product.price || 0);
  const origPrice = parseFloat(product.originalPrice || 0);
  const discountPct = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
  const rating = parseFloat(product.rating || 0);
  const reviews = parseInt(product.reviews || 0);
  const totalStock = parseInt(product.totalStock !== undefined ? product.totalStock : (product.inStock ? 20 : 0));
  const lowStockMargin = parseInt(product.lowStockMargin || 5);

  for (const badge of sortedBadges) {
    if (badge.ruleType !== 'automatic') continue;
    const t = badge.thresholds || {};

    if (badge.criteria === 'discount_gte_10') {
      const minDiscount = t.discountPct !== undefined ? parseFloat(t.discountPct) : 10;
      if (discountPct >= minDiscount) {
        return {
          badgeName: badge.name,
          badgeObj: badge,
          reason: `Discount reached ${discountPct}% (>= ${minDiscount}% required).`,
          metrics: { price, origPrice, discountPct, rating, reviews, totalStock }
        };
      }
    }

    if (badge.criteria === 'low_stock_scarcity') {
      const maxStockAllowed = t.maxStock !== undefined ? parseInt(t.maxStock) : lowStockMargin;
      if (totalStock <= maxStockAllowed && totalStock > 0 && product.alertEnabled !== false) {
        return {
          badgeName: badge.name,
          badgeObj: badge,
          reason: `Stock is at ${totalStock} units (<= threshold of ${maxStockAllowed}).`,
          metrics: { price, origPrice, discountPct, rating, reviews, totalStock }
        };
      }
    }

    if (badge.criteria === 'rating_gte_48') {
      const minRatingReq = t.minRating !== undefined ? parseFloat(t.minRating) : 4.8;
      const minReviewsReq = t.minReviews !== undefined ? parseInt(t.minReviews) : 50;
      if (rating >= minRatingReq && reviews >= minReviewsReq) {
        return {
          badgeName: badge.name,
          badgeObj: badge,
          reason: `High customer satisfaction (${rating}★ with ${reviews} reviews).`,
          metrics: { price, origPrice, discountPct, rating, reviews, totalStock }
        };
      }
    }

    if (badge.criteria === 'bestseller') {
      const minReviewsReq = t.minReviews !== undefined ? parseInt(t.minReviews) : 80;
      if (reviews >= minReviewsReq) {
        return {
          badgeName: badge.name,
          badgeObj: badge,
          reason: `Product achieved market sales volume (${reviews} customer verified reviews).`,
          metrics: { price, origPrice, discountPct, rating, reviews, totalStock }
        };
      }
    }

    if (badge.criteria === 'reviews_gte_40') {
      const minReviewsReq = t.minReviews !== undefined ? parseInt(t.minReviews) : 40;
      if (reviews >= minReviewsReq) {
        return {
          badgeName: badge.name,
          badgeObj: badge,
          reason: `Popular item with ${reviews} verified purchaser reviews.`,
          metrics: { price, origPrice, discountPct, rating, reviews, totalStock }
        };
      }
    }
  }

  return null;
}

export async function runAutoBadgeAssignment() {
  try {
    await BadgesApi.autoAssign();
  } catch (e) {
    console.warn('[TaxonomyModel] Auto-assign API notice:', e.message);
  }

  const productsList = getStoredProducts({ includeDeleted: false });
  const activeBadges = getBadges({ activeOnly: true });
  let changesCount = 0;

  productsList.forEach(product => {
    if (product.badge && product.badge.toLowerCase() === 'hot deal') return;

    const evalResult = evaluateBadgeForProduct(product, activeBadges);
    if (evalResult) {
      if (product.badge !== evalResult.badgeName) {
        const prev = product.badge || 'None';
        product.badge = evalResult.badgeName;
        product.badgeId = evalResult.badgeObj.id;
        changesCount++;

        recordProductBehaviorEvent({
          productId: product.id,
          productName: product.name,
          eventType: 'AUTO_BADGE_PROMOTED',
          previousValue: prev,
          newValue: evalResult.badgeName,
          triggerReason: evalResult.reason,
          metricsSnapshot: evalResult.metrics,
          actor: 'SYSTEM_AUTO_RULE'
        });
      }
    }
  });

  if (changesCount > 0) {
    saveStoredProducts(productsList);
  }

  return { success: true, changesCount, totalEvaluated: productsList.length };
}

/**
 * Get visual Tailwind color badge classes for a badge color token
 */
export function getBadgeColorClass(color) {
  const c = (color || '').toLowerCase();
  switch (c) {
    case 'emerald':
    case 'green':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'rose':
    case 'red':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'amber':
    case 'yellow':
    case 'orange':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'purple':
    case 'violet':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'indigo':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'sky':
    case 'cyan':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
}

