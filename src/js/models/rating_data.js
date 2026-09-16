// ============================================================
//  rating_data.js — Product Ratings & Reviews In-Memory Model Layer
// ============================================================
import { getStoredProducts, saveStoredProducts } from './data.js';
import { runAutoBadgeAssignment, recordProductBehaviorEvent } from './taxonomy_data.js';
import { ReviewsApi } from '../api/reviewsApi.js';

export const DEFAULT_REVIEWS = [];
export const DEFAULT_RATINGS = [];
export const defaultReviews = [];
export const defaultRatings = [];

export const REVIEWS_STORAGE_KEY = 'etech_product_reviews';

// Reactive In-Memory Reviews Store
let memoryReviews = [];

/**
 * Sync reviews from backend API for a product
 */
export async function syncProductReviewsFromApi(productId) {
  const res = await ReviewsApi.getProductReviews(productId);
  const body = res.body || res;
  let list = [];
  if (Array.isArray(body)) {
    list = body;
  } else if (body && Array.isArray(body.content)) {
    list = body.content;
  }

  if (list.length > 0) {
    const otherReviews = memoryReviews.filter(r => Number(r.productId) !== Number(productId));
    memoryReviews = [...list, ...otherReviews];
  }
}

/**
 * Retrieve all reviews from in-memory state
 */
export function getAllReviews() {
  return memoryReviews;
}

export const getAllRatings = getAllReviews;

/**
 * Save reviews list to in-memory state
 */
export function saveAllReviews(reviews) {
  if (Array.isArray(reviews)) {
    memoryReviews = [...reviews];
  }
}

export const saveAllRatings = saveAllReviews;

/**
 * Get all reviews for a specific product, sorted newest first
 */
export function getProductReviews(productId) {
  const pId = Number(productId);
  return memoryReviews
    .filter(r => Number(r.productId) === pId)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export const getProductRatings = getProductReviews;

/**
 * Get a specific user's review for a product (if exists)
 */
export function getUserReviewForProduct(productId, userId) {
  if (!userId) return null;
  const pId = Number(productId);
  return memoryReviews.find(r => Number(r.productId) === pId && r.userId === userId) || null;
}

export const getUserRatingForProduct = getUserReviewForProduct;

/**
 * Check if a user has already reviewed/rated a product
 */
export function hasUserReviewedProduct(productId, userId) {
  return getUserReviewForProduct(productId, userId) !== null;
}

export const hasUserRatedProduct = hasUserReviewedProduct;

/**
 * Submit or override a product review + rating by a registered user.
 */
export async function submitProductReview({ productId, userId, userName, userEmail, rating, comment = '' }) {
  const pId = Number(productId);
  const ratingNum = Math.max(1, Math.min(5, Math.round(Number(rating || 5))));
  const cleanComment = (comment || '').trim();

  if (!pId || !userId) {
    return { success: false, message: 'Authentication is required to review products.' };
  }

  const allReviews = memoryReviews;
  const existingIndex = allReviews.findIndex(r => Number(r.productId) === pId && r.userId === userId);
  const isOverride = existingIndex !== -1;
  const oldRatingVal = isOverride ? allReviews[existingIndex].rating : null;
  const nowIso = new Date().toISOString();

  // Single-Mode: Sync with API first
  try {
    await ReviewsApi.submitReview(pId, {
      rating: ratingNum,
      comment: cleanComment
    });
  } catch (err) {
    return { success: false, message: 'Review submission failed: ' + (err.message || 'Server offline') };
  }

  let reviewRecord;
  if (isOverride) {
    allReviews[existingIndex] = {
      ...allReviews[existingIndex],
      rating: ratingNum,
      comment: cleanComment || allReviews[existingIndex].comment || '',
      userName: userName || allReviews[existingIndex].userName,
      userEmail: userEmail || allReviews[existingIndex].userEmail,
      updatedAt: nowIso
    };
    reviewRecord = allReviews[existingIndex];
  } else {
    reviewRecord = {
      id: 'REV-' + Math.floor(10000 + Math.random() * 90000),
      productId: pId,
      userId: userId,
      userName: userName || 'Customer',
      userEmail: userEmail || '',
      rating: ratingNum,
      comment: cleanComment,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    allReviews.unshift(reviewRecord);
  }

  saveAllReviews(allReviews);

  // Recalculate product aggregate rating & review count in inventory
  const products = getStoredProducts();
  const product = products.find(p => Number(p.id) === pId);

  if (product) {
    const currentProductRating = Number(product.rating || 5.0);
    const currentReviewsCount = Number(product.reviews || 1);

    let newAvgRating;
    let newReviewsCount;

    if (isOverride) {
      newReviewsCount = currentReviewsCount;
      const totalPoints = (currentProductRating * currentReviewsCount) - oldRatingVal + ratingNum;
      newAvgRating = Math.max(1, Math.min(5, Math.round((totalPoints / Math.max(1, newReviewsCount)) * 10) / 10));
    } else {
      newReviewsCount = currentReviewsCount + 1;
      const totalPoints = (currentProductRating * currentReviewsCount) + ratingNum;
      newAvgRating = Math.max(1, Math.min(5, Math.round((totalPoints / newReviewsCount) * 10) / 10));
    }

    product.rating = newAvgRating;
    product.reviews = newReviewsCount;
    saveStoredProducts(products);

    try {
      recordProductBehaviorEvent({
        productId: product.id,
        productName: product.name,
        eventType: isOverride ? 'REVIEW_OVERRIDDEN' : 'PRODUCT_REVIEWED',
        previousValue: isOverride ? `${oldRatingVal} ★ (Avg: ${currentProductRating})` : `Avg: ${currentProductRating}`,
        newValue: `${ratingNum} ★ (New Avg: ${newAvgRating}, ${newReviewsCount} reviews)`,
        triggerReason: `Customer ${userName || userId} ${isOverride ? 'updated' : 'posted'} review: "${cleanComment ? cleanComment.slice(0, 50) + '...' : `${ratingNum} Stars`}"`,
        metricsSnapshot: {
          rating: newAvgRating,
          reviews: newReviewsCount,
          price: product.price,
          totalStock: product.branchStock ? Object.values(product.branchStock).reduce((a, b) => a + b, 0) : 10
        },
        actor: userName || userId
      });
    } catch (e) {}

    try {
      runAutoBadgeAssignment();
    } catch (e) {}

    return {
      success: true,
      isOverride,
      reviewRecord,
      ratingRecord: reviewRecord,
      product,
      message: isOverride 
        ? `Your review & rating have been updated (${ratingNum} ★)!` 
        : `Thank you for your review (${ratingNum} ★)!`
    };
  }

  return {
    success: true,
    isOverride,
    reviewRecord,
    ratingRecord: reviewRecord,
    product: null,
    message: `Review saved successfully.`
  };
}

export const submitProductRating = submitProductReview;
