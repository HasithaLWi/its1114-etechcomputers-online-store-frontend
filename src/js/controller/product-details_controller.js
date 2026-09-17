// ETech Computers - Product Details Page Renderer & Logic
import { getProductById, products, getMaxStockInAnyBranch } from '../models/data.js';
import { addToCart, showToast } from './cart_controller.js';
import { getCurrentUser } from './login_controller.js';
import { etechAlert } from '../util/index.js';
import { 
  submitProductReview, getUserReviewForProduct, getProductReviews, syncProductReviewsFromApi 
} from '../models/rating_data.js';
import renderProductDetails from '../components/product_detail_cart.js';

let currentDetailProductId = null;
let selectedProductQuantity = 1;
let currentRatingSelection = 5;

/**
 * Navigate to product details section
 */
export function viewProductDetails(productId) {
  window.location.hash = `#product?id=${productId}`;
}

/**
 * Renders full product details page inside #product-details-page section
 */
export function renderProductDetailsPage(productId) {
  currentDetailProductId = Number(productId);
  selectedProductQuantity = 1;
  const currentUser = getCurrentUser();
  const existingReview = currentUser ? getUserReviewForProduct(productId, currentUser.id) : null;
  currentRatingSelection = existingReview ? existingReview.rating : 5;
  renderProductDetails(productId);

  // Background sync live reviews
  syncProductReviewsFromApi(productId).then(() => {
    renderProductDetails(productId);
  }).catch(() => {});
}

/**
 * Change quantity stepper with single-branch stock limit check
 */
export function changeProductQuantity(delta) {
  if (delta > 0 && currentDetailProductId) {
    const product = getProductById(currentDetailProductId);
    if (product) {
      const maxStock = getMaxStockInAnyBranch(product);
      if (maxStock <= 0) {
        etechAlert.warning('Out of Stock', `"${product.name}" is currently out of stock across all fulfillment branches.`);
        return;
      }
      if (selectedProductQuantity + delta > maxStock) {
        etechAlert.warning(
          'Maximum Branch Stock Reached',
          `Cannot increase quantity. The maximum available stock for "${product.name}" in any single fulfillment branch is ${maxStock} unit${maxStock > 1 ? 's' : ''}.`
        );
        return;
      }
    }
  }

  selectedProductQuantity = Math.max(1, selectedProductQuantity + delta);
  const display = document.getElementById('product-quantity-display');
  if (display) display.textContent = selectedProductQuantity;
}

/**
 * Add to cart from product details page
 */
export function handleAddToCartFromDetails(productId) {
  addToCart(productId, selectedProductQuantity);
}

/**
 * Buy now from product details page with single-branch stock check
 */
export function handleBuyNowFromDetails(productId) {
  const product = getProductById(productId);
  if (product) {
    const maxStock = getMaxStockInAnyBranch(product);
    if (maxStock <= 0) {
      etechAlert.warning('Out of Stock', `"${product.name}" is currently out of stock across all fulfillment branches.`);
      return;
    }
    if (selectedProductQuantity > maxStock) {
      etechAlert.warning(
        'Branch Stock Limit Exceeded',
        `Cannot purchase ${selectedProductQuantity} units directly. The maximum available stock for "${product.name}" in any single fulfillment branch is ${maxStock} unit${maxStock > 1 ? 's' : ''}.`
      );
      return;
    }
  }

  const success = addToCart(productId, selectedProductQuantity);
  if (success !== false) {
    window.location.hash = '#checkout';
  }
}

const RATING_HINTS = {
  1: '1 Star — Poor',
  2: '2 Stars — Fair',
  3: '3 Stars — Good',
  4: '4 Stars — Very Good',
  5: '5 Stars — Excellent!'
};

/**
 * Select a star rating (updates visual state)
 */
export function selectRatingStar(productId, starValue) {
  currentRatingSelection = Math.max(1, Math.min(5, starValue));
  resetProductRatingStars(productId, currentRatingSelection);
}

/**
 * Submit or update product review & rating
 */
export async function handleSubmitProductReview(productId) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    if (typeof showToast === 'function') {
      showToast('Please sign in to write a review.', 'error');
    }
    window.location.hash = '#login';
    return;
  }

  const commentEl = document.getElementById('product-review-comment');
  const commentText = commentEl ? commentEl.value.trim() : '';

  const result = await submitProductReview({
    productId: productId,
    userId: currentUser.id,
    userName: currentUser.name,
    userEmail: currentUser.email,
    rating: currentRatingSelection || 5,
    comment: commentText
  });

  if (result.success) {
    if (typeof showToast === 'function') {
      showToast(result.message, 'success');
    }
    // Re-render product details to immediately show updated rating, review count, badge, and bottom reviews list!
    renderProductDetailsPage(productId);
  } else {
    if (typeof showToast === 'function') {
      showToast(result.message || 'Unable to save review.', 'error');
    }
  }
}

/**
 * Direct rate handler (alias for compatibility)
 */
export function handleRateProduct(productId, ratingValue) {
  currentRatingSelection = ratingValue;
  handleSubmitProductReview(productId);
}

/**
 * Hover effect across 5 star rating buttons
 */
export function hoverProductRatingStars(hoverRating) {
  const hintEl = document.getElementById('product-rating-text-hint');
  if (hintEl && RATING_HINTS[hoverRating]) {
    hintEl.textContent = RATING_HINTS[hoverRating];
  }

  for (let i = 1; i <= 5; i++) {
    const starBtn = document.getElementById(`rating-star-btn-${i}`);
    if (starBtn) {
      if (i <= hoverRating) {
        starBtn.classList.remove('text-[#34445a]');
        starBtn.classList.add('text-amber-400');
        starBtn.style.filter = 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.7))';
      } else {
        starBtn.classList.remove('text-amber-400');
        starBtn.classList.add('text-[#34445a]');
        starBtn.style.filter = 'none';
      }
    }
  }
}

/**
 * Reset stars back to active rating state when mouse leaves
 */
export function resetProductRatingStars(productId, activeUserRating) {
  const ratingToUse = currentRatingSelection || activeUserRating || 5;
  const hintEl = document.getElementById('product-rating-text-hint');
  if (hintEl) {
    hintEl.textContent = ratingToUse > 0 
      ? `${ratingToUse} / 5 Stars (${RATING_HINTS[ratingToUse] ? RATING_HINTS[ratingToUse].split('—')[1].trim() : 'Selected'})` 
      : 'Click a star to select score';
  }

  for (let i = 1; i <= 5; i++) {
    const starBtn = document.getElementById(`rating-star-btn-${i}`);
    if (starBtn) {
      if (i <= ratingToUse) {
        starBtn.classList.remove('text-[#34445a]');
        starBtn.classList.add('text-amber-400');
        starBtn.style.filter = 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))';
      } else {
        starBtn.classList.remove('text-amber-400');
        starBtn.classList.add('text-[#34445a]');
        starBtn.style.filter = 'none';
      }
    }
  }
}
