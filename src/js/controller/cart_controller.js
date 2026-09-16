// ETech Computers - Shopping Cart & Order Checkout System
import { products, getStoredProducts, deductBranchStock, getProductBranchStock, getMaxStockInAnyBranch } from '../models/data.js';
import { autoSelectFulfillmentBranch, getBranches, initCheckoutMap, setCheckoutMapDestination, resolveLocationCoords, getCheckoutDeliveryLocation, resetCheckoutDeliveryLocation } from './branch_controller.js';
import { saveOrder } from './order_management_controller.js';
import { getCurrentUser } from './login_controller.js';
import { recordBundleSale, getDealBundles, getHotDealByProductId, isBundleAvailable } from '../models/deals_data.js';
import { etechAlert, showToast as modernShowToast } from '../util/index.js';

const CART_STORAGE_KEY = 'etech_cart';

export function getCart() {
  const data = localStorage.getItem(CART_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;

  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = totalCount;

  badge.classList.remove('scale-125');
  void badge.offsetWidth;
  badge.classList.add('scale-125');
  setTimeout(() => badge.classList.remove('scale-125'), 200);
}

export function addToCart(productId, quantity = 1) {
  const storedProducts = getStoredProducts();
  const product = storedProducts.find(p => p.id === Number(productId));
  if (!product) return false;

  const maxStock = getMaxStockInAnyBranch(product);
  if (maxStock <= 0) {
    etechAlert.warning('Out of Stock', `"${product.name}" is currently out of stock across all fulfillment branches.`);
    return false;
  }

  let cart = getCart();
  const existingItem = cart.find(item => item.id === product.id && !item.isBundleItem);
  const currentCartQty = existingItem ? existingItem.quantity : 0;
  const targetQty = currentCartQty + quantity;

  if (targetQty > maxStock) {
    etechAlert.warning(
      'Branch Stock Limit Exceeded',
      `Cannot add ${quantity} unit${quantity > 1 ? 's' : ''} to your cart. An order is fulfilled from a single branch, and our highest-stocked branch currently has ${maxStock} unit${maxStock > 1 ? 's' : ''} of "${product.name}" in stock${currentCartQty > 0 ? ` (you already have ${currentCartQty} in your cart)` : ''}.`
    );
    return false;
  }

  const hotDeal = getHotDealByProductId(product.id);
  const effectivePrice = hotDeal ? hotDeal.dealPrice : product.price;
  const isHotDeal = !!hotDeal;
  const isFreeShipping = isHotDeal ? Boolean(hotDeal.isFreeShipping) : false;

  if (existingItem) {
    existingItem.quantity = targetQty;
    existingItem.price = effectivePrice;
    existingItem.isHotDeal = isHotDeal;
    existingItem.isFreeShipping = isFreeShipping;
  } else {
    cart.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: product.originalPrice || product.price,
      isHotDeal: isHotDeal,
      isFreeShipping: isFreeShipping,
      dealBadge: isHotDeal ? hotDeal.badge : null,
      image: product.image,
      category: product.category,
      quantity: quantity
    });
  }

  saveCart(cart);
  if (isHotDeal) {
    showToast(`🔥 Flash Deal applied! Added "${product.name}" (Rs. ${effectivePrice.toLocaleString()}) to cart!`);
  } else {
    showToast(`Added "${product.name}" to cart!`);
  }
  return true;
}

/**
 * Add a complete deal bundle to cart with composite product-wise breakdown and anti-tampering lock
 */
export function addBundleToCart(bundleId, quantity = 1) {
  const check = isBundleAvailable(bundleId);
  if (!check.available) {
    showToast(`⚠️ ${check.message}`, 'error');
    return;
  }

  const bundle = check.bundle;
  const storedProducts = getStoredProducts();
  const rawItems = bundle.bundleItems || [];
  if (!rawItems.length) {
    showToast(`⚠️ Unable to add bundle: no components configured.`, 'error');
    return;
  }

  // Calculate total original MSRP of all components to determine proportional discount
  let totalMSRP = 0;
  const itemsWithProduct = rawItems.map(item => {
    const p = storedProducts.find(prod => prod.id === Number(item.productId));
    const unitPrice = p ? p.price : 0;
    const qty = Math.max(1, parseInt(item.qty) || 1);
    totalMSRP += unitPrice * qty;
    return { item, product: p, qty, unitPrice };
  });

  const bundlePrice = Number(bundle.price) || 199999;
  const discountRatio = totalMSRP > 0 ? (bundlePrice / totalMSRP) : 1;

  let cart = getCart();
  const bundleGroupId = `bndl-${bundle.id}-${Date.now()}`;
  let accumulatedDiscountedPrice = 0;

  itemsWithProduct.forEach((entry, idx) => {
    if (!entry.product) return;
    const isLast = idx === itemsWithProduct.length - 1;
    let unitDiscountedPrice = Math.round(entry.unitPrice * discountRatio);

    // On the last item, adjust for any small 1-2 rupee rounding difference
    if (isLast && totalMSRP > 0) {
      const remainingTarget = bundlePrice - accumulatedDiscountedPrice;
      const calculatedLastUnit = Math.round(remainingTarget / entry.qty);
      if (calculatedLastUnit > 0) {
        unitDiscountedPrice = calculatedLastUnit;
      }
    } else {
      accumulatedDiscountedPrice += unitDiscountedPrice * entry.qty;
    }

    const cartItemId = `${bundleGroupId}-p${entry.product.id}`;

    cart.push({
      id: cartItemId,
      productId: entry.product.id,
      name: entry.product.name,
      price: unitDiscountedPrice,
      originalPrice: entry.product.originalPrice || entry.product.price,
      image: entry.product.image,
      category: entry.product.category || 'Components',
      quantity: entry.qty * quantity,
      bundleQtyMultiplier: entry.qty, // component count per 1 bundle
      isBundleItem: true,
      bundleId: bundle.id,
      bundleTitle: bundle.title,
      bundleGroupId: bundleGroupId,
      isFreeShipping: Boolean(bundle.isFreeShipping)
    });
  });

  saveCart(cart);
  showToast(`🎉 Added "${bundle.title}" components to your cart with bundle discount!`);
}

/**
 * Validates active status and remaining timer for all bundles currently in cart
 * Automatically cleans up expired/out-of-stock bundle items
 */
export function validateCartBundles() {
  let cart = getCart();
  if (!cart.length) return false;

  let hasChanges = false;
  const bundleGroupMap = new Map();

  cart.forEach(item => {
    if (item.isBundleItem && item.bundleGroupId) {
      if (!bundleGroupMap.has(item.bundleGroupId)) {
        bundleGroupMap.set(item.bundleGroupId, {
          bundleId: item.bundleId,
          bundleTitle: item.bundleTitle,
          items: []
        });
      }
      bundleGroupMap.get(item.bundleGroupId).items.push(item);
    }
  });

  bundleGroupMap.forEach((group, groupId) => {
    const check = isBundleAvailable(group.bundleId);
    if (!check.available) {
      // Purge this bundle group from cart
      cart = cart.filter(i => i.bundleGroupId !== groupId);
      hasChanges = true;
      showToast(`⚠️ Bundle "${group.bundleTitle}" expired or is out of stock and was removed from your cart.`, 'error');
    }
  });

  if (hasChanges) {
    saveCart(cart);
    return true;
  }
  return false;
}

export function showToast(message) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-6 right-6 z-50 flex flex-col space-y-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'pointer-events-auto flex items-center space-x-2.5 bg-white text-[#0f172a] px-4 py-3 rounded-md shadow-lg border border-[#e2e8f0] transform translate-y-3 opacity-0 transition-all duration-200';
  toast.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-200">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
      </svg>
    </div>
    <span class="text-xs font-semibold">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('translate-y-3', 'opacity-0');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

/**
 * Called by app.js router whenever #cart fragment is loaded into DOM
 */
export function initCartLogic() {
  validateCartBundles();
  renderCart();

  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) {
    clearCartBtn.onclick = async () => {
      const confirmed = await etechAlert.confirmDelete('all items from your shopping cart');
      if (confirmed) {
        saveCart([]);
        renderCart();
        modernShowToast('Shopping cart cleared.', 'info');
      }
    };
  }

  // Intercept Proceed to Checkout button to enforce single-branch fulfillment constraints
  const proceedBtn = document.getElementById('proceed-checkout-btn');
  if (proceedBtn) {
    proceedBtn.onclick = (e) => {
      const cart = getCart();
      if (!cart.length) {
        e.preventDefault();
        etechAlert.warning('Empty Cart', 'Your shopping cart is empty. Please add products to cart before proceeding.');
        return;
      }

      const storedProducts = getStoredProducts();

      // Step 1: Check individual item limits against highest-stocked branch
      for (const item of cart) {
        const targetId = Number(item.productId || item.id);
        const prod = storedProducts.find(p => p.id === targetId);
        if (prod) {
          const maxStock = getMaxStockInAnyBranch(prod);
          if (item.quantity > maxStock) {
            e.preventDefault();
            etechAlert.warning(
              'Insufficient Branch Stock',
              `Cannot proceed to checkout. The requested quantity (${item.quantity}) for "${item.name}" exceeds the maximum available stock at any single fulfillment branch (${maxStock} unit${maxStock > 1 ? 's' : ''}). Please adjust the quantity in your cart.`
            );
            return;
          }
        }
      }

      // Step 2: Check if ANY single active branch has sufficient inventory for all items combined
      const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
      const branchWithFullStock = branches.find(branch => {
        return cart.every(item => {
          const targetId = Number(item.productId || item.id);
          const prod = storedProducts.find(p => p.id === targetId);
          if (!prod) return false;
          return getProductBranchStock(prod, branch.id) >= item.quantity;
        });
      });

      if (!branchWithFullStock) {
        e.preventDefault();
        etechAlert.warning(
          'Single-Branch Fulfillment Constraint',
          'We could not find a single fulfillment branch that has all items in your cart in stock simultaneously. Because each order is dispatched from a single regional branch, please adjust item quantities to continue.'
        );
        return;
      }
    };
  }
}

/**
 * Reads localStorage cart array, updates UI items list and order totals
 */
function renderCart() {
  validateCartBundles();

  const container = document.getElementById('cart-items-container');
  const cartContentLayout = document.getElementById('cart-content-layout');
  const emptyCartView = document.getElementById('empty-cart-view');
  const clearCartBtn = document.getElementById('clear-cart-btn');

  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    if (cartContentLayout) cartContentLayout.classList.add('hidden');
    if (emptyCartView) emptyCartView.classList.remove('hidden');
    if (clearCartBtn) clearCartBtn.classList.add('hidden');
    updateSummaryTotals(0);
    return;
  }

  if (cartContentLayout) cartContentLayout.classList.remove('hidden');
  if (emptyCartView) emptyCartView.classList.add('hidden');
  if (clearCartBtn) clearCartBtn.classList.remove('hidden');

  let subtotal = 0;

  container.innerHTML = cart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const isBundle = !!item.isBundleItem;

    return `
      <div class="bg-white border ${isBundle ? 'border-blue-200 bg-blue-50/20' : 'border-[#e2e8f0]'} rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:border-[#cbd5e1] shadow-sm">
        
        <!-- Product Image & Details -->
        <div class="flex items-center space-x-3.5 w-full sm:w-auto">
          <div class="w-16 h-16 rounded-md bg-[#f8fafc] flex-shrink-0 overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          </div>
          <div>
            <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
              <span class="text-[9px] font-bold uppercase text-blue-600 font-mono tracking-wider">${item.category || 'Tech'}</span>
              ${isBundle ? `
                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 font-mono inline-flex items-center space-x-1">
                  <span>📦 BUNDLE:</span>
                  <span>${item.bundleTitle}</span>
                </span>
              ` : ''}
              ${item.isHotDeal ? `
                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 font-mono">
                  🔥 ${item.dealBadge || 'HOT DEAL'}
                </span>
              ` : ''}
            </div>
            <h3 class="text-sm font-bold text-[#0f172a] line-clamp-1 mt-0.5">${item.name}</h3>
            <div class="flex items-center space-x-2 text-xs text-[#64748b] mt-0.5">
              <span>Unit Price:</span>
              <span class="text-[#0f172a] font-mono font-semibold">Rs. ${item.price.toLocaleString()}</span>
              ${item.originalPrice && item.originalPrice > item.price ? `
                <span class="line-through text-slate-400 font-mono text-[11px]">Rs. ${item.originalPrice.toLocaleString()}</span>
              ` : ''}
            </div>
            ${isBundle ? `
              <p class="text-[10px] text-blue-600 mt-0.5">🔒 Linked deal component — modifying quantity or removing will update the full bundle.</p>
            ` : ''}
          </div>
        </div>

        <!-- Quantity Controls & Actions -->
        <div class="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-5 border-t sm:border-t-0 border-[#e2e8f0] pt-3 sm:pt-0">
          <div class="flex items-center space-x-1.5 bg-[#f8fafc] px-2.5 py-1 rounded-md border border-[#e2e8f0]">
            <button onclick="updateItemQuantity('${item.id}', -1)" class="text-[#475569] hover:text-[#0f172a] font-bold px-1 text-xs cursor-pointer">-</button>
            <span class="text-xs font-bold text-[#0f172a] w-5 text-center font-mono">${item.quantity}</span>
            <button onclick="updateItemQuantity('${item.id}', 1)" class="text-[#475569] hover:text-[#0f172a] font-bold px-1 text-xs cursor-pointer">+</button>
          </div>
          <span class="text-sm font-extrabold text-[#0f172a] font-mono">Rs. ${itemTotal.toLocaleString()}</span>
          <button onclick="removeItemFromCart('${item.id}')" class="text-[#64748b] hover:text-rose-600 transition-colors p-1 cursor-pointer" title="${isBundle ? 'Remove Entire Bundle' : 'Remove Item'}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

      </div>
    `;
  }).join('');

  updateSummaryTotals(subtotal);
}

/*
 * Increment or Decrement quantity of a cart item with atomic bundle sync
 */
export function updateItemQuantity(cartItemId, delta) {
  let cart = getCart();
  const item = cart.find(i => String(i.id) === String(cartItemId));

  if (!item) return;

  if (item.isBundleItem && item.bundleGroupId) {
    const multiplier = item.bundleQtyMultiplier || 1;
    const currentBundleCount = Math.round(item.quantity / multiplier);
    const newBundleCount = currentBundleCount + delta;

    if (newBundleCount <= 0) {
      // Remove the entire bundle atomically
      cart = cart.filter(i => i.bundleGroupId !== item.bundleGroupId);
      showToast(`📦 Bundle "${item.bundleTitle}" was removed from your cart.`);
    } else {
      // If incrementing, validate all bundle components against max branch stock
      if (delta > 0) {
        const bundleItems = cart.filter(i => i.bundleGroupId === item.bundleGroupId);
        const storedProds = getStoredProducts();
        for (const bItem of bundleItems) {
          const targetId = Number(bItem.productId || bItem.id);
          const bProd = storedProds.find(p => p.id === targetId);
          if (bProd) {
            const bMax = getMaxStockInAnyBranch(bProd);
            const reqCompQty = (bItem.bundleQtyMultiplier || 1) * newBundleCount;
            if (reqCompQty > bMax) {
              etechAlert.warning(
                'Bundle Stock Limit Reached',
                `Cannot increase bundle quantity. Stock limit reached for component "${bProd.name}" (${bMax} unit${bMax > 1 ? 's' : ''} available at highest-stocked branch).`
              );
              return;
            }
          }
        }
      }

      // Scale all items in this bundle group together
      cart.forEach(i => {
        if (i.bundleGroupId === item.bundleGroupId) {
          i.quantity = (i.bundleQtyMultiplier || 1) * newBundleCount;
        }
      });
    }
  } else {
    if (delta > 0) {
      const targetId = Number(item.productId || item.id);
      const prod = getStoredProducts().find(p => p.id === targetId);
      if (prod) {
        const maxStock = getMaxStockInAnyBranch(prod);
        if (item.quantity + delta > maxStock) {
          etechAlert.warning(
            'Branch Stock Limit Reached',
            `Cannot increase quantity. An order is fulfilled from a single branch, and our highest-stocked branch currently has ${maxStock} unit${maxStock > 1 ? 's' : ''} for "${prod.name}".`
          );
          return;
        }
      }
    }

    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => String(i.id) !== String(cartItemId));
    }
  }

  saveCart(cart);
  renderCart();
}

/**
 * Remove a product item completely from cart (atomic group removal for bundles)
 */
export function removeItemFromCart(cartItemId) {
  let cart = getCart();
  const item = cart.find(i => String(i.id) === String(cartItemId));

  if (!item) return;

  if (item.isBundleItem && item.bundleGroupId) {
    cart = cart.filter(i => i.bundleGroupId !== item.bundleGroupId);
    saveCart(cart);
    renderCart();
    showToast(`📦 Removed complete "${item.bundleTitle}" bundle from cart.`);
  } else {
    cart = cart.filter(i => String(i.id) !== String(cartItemId));
    saveCart(cart);
    renderCart();
    showToast('Item removed from cart');
  }
}

/**
 * Luhn Algorithm (MOD 10) Checksum Validator
 */
export function validateLuhn(cardNumber) {
  const clean = String(cardNumber || '').replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
}

/**
 * Detect Credit/Debit Card Brand
 */
export function detectCardBrand(cardNumber) {
  const clean = String(cardNumber || '').replace(/\D/g, '');
  if (/^4/.test(clean)) return { brand: 'Visa', label: 'VISA', color: 'text-blue-700 bg-blue-50 border-blue-200' };
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return { brand: 'Mastercard', label: 'MASTERCARD', color: 'text-orange-700 bg-orange-50 border-orange-200' };
  if (/^3[47]/.test(clean)) return { brand: 'Amex', label: 'AMEX', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  return { brand: 'Generic', label: 'CREDIT / DEBIT', color: 'text-slate-600 bg-slate-100 border-slate-200' };
}

/**
 * Recalculates cart subtotal and total amount
 */
export function updateSummaryTotals(subtotal) {
  const subtotalEl = document.getElementById('summary-subtotal');
  const totalEl = document.getElementById('summary-total');

  const grandTotal = subtotal;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totalEl) totalEl.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


/* ================= CHECKOUT HOOK & LOGIC ================= */

let currentCheckoutLocation = null;

export function initCheckoutLogic() {
  validateCartBundles();
  const cart = getCart();

  if (cart.length === 0) {
    etechAlert.info('Cart is Empty', 'Your shopping cart is currently empty! Redirecting to shop catalog...');
    window.location.hash = '#shop';
    return;
  }

  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user) {
    const fullNameInput = document.getElementById('full-name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    if (fullNameInput && !fullNameInput.value) fullNameInput.value = user.name || user.username || '';
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
  }

  const districtSelect = document.getElementById('district');
  const initialDestination = (districtSelect ? districtSelect.value : '') || 'Colombo';

  // 1. Initialize Interactive Leaflet Map
  initCheckoutMap('checkout-delivery-map', (locInfo) => {
    currentCheckoutLocation = locInfo;
    renderCheckoutSummary(getCart(), locInfo);
  });

  // 2. District selector listener
  if (districtSelect) {
    districtSelect.addEventListener('change', () => {
      const selectedDistrict = districtSelect.value;
      setCheckoutMapDestination(selectedDistrict, (locInfo) => {
        currentCheckoutLocation = locInfo;
        renderCheckoutSummary(getCart(), locInfo);
      });
    });
  }

  // 3. Payment Method Switcher (Card vs COD)
  const cardRadio = document.getElementById('pay-method-card');
  const codRadio = document.getElementById('pay-method-cod');
  const cardFields = document.getElementById('card-fields');
  const labelCard = document.getElementById('label-pay-card');
  const labelCod = document.getElementById('label-pay-cod');

  function updatePaymentMethodUI() {
    const isCard = cardRadio ? cardRadio.checked : true;
    if (cardFields) {
      if (isCard) {
        cardFields.classList.remove('hidden');
      } else {
        cardFields.classList.add('hidden');
      }
    }
    if (labelCard && labelCod) {
      if (isCard) {
        labelCard.className = 'relative flex items-center p-3.5 rounded-md bg-[#f8fafc] border border-blue-600 cursor-pointer space-x-3 shadow-sm';
        labelCod.className = 'relative flex items-center p-3.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#cbd5e1] cursor-pointer space-x-3';
      } else {
        labelCod.className = 'relative flex items-center p-3.5 rounded-md bg-[#f8fafc] border border-blue-600 cursor-pointer space-x-3 shadow-sm';
        labelCard.className = 'relative flex items-center p-3.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#cbd5e1] cursor-pointer space-x-3';
      }
    }
  }

  if (cardRadio) cardRadio.addEventListener('change', updatePaymentMethodUI);
  if (codRadio) codRadio.addEventListener('change', updatePaymentMethodUI);

  // 4. Real-time Card Formatting & Luhn Algorithm Validation
  const cardNumberInput = document.getElementById('card-number');
  const cardBrandBadge = document.getElementById('card-brand-badge');
  const cardValidIndicator = document.getElementById('card-valid-indicator');
  const cardErrorMsg = document.getElementById('card-error-msg');

  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 19);
      // Format in blocks of 4 digits
      let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
      cardNumberInput.value = formatted;

      // Brand detection
      const brandInfo = detectCardBrand(val);
      if (cardBrandBadge) {
        cardBrandBadge.textContent = brandInfo.label;
        cardBrandBadge.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${brandInfo.color}`;
      }

      // Live Luhn Validation
      if (val.length >= 13) {
        const isValidLuhn = validateLuhn(val);
        if (isValidLuhn) {
          if (cardValidIndicator) {
            cardValidIndicator.textContent = '✓ Luhn Verified';
            cardValidIndicator.className = 'absolute right-3 top-2.5 text-xs font-bold text-emerald-600';
            cardValidIndicator.classList.remove('hidden');
          }
          if (cardErrorMsg) cardErrorMsg.classList.add('hidden');
          cardNumberInput.classList.remove('border-rose-400');
          cardNumberInput.classList.add('border-emerald-500');
        } else if (val.length >= 16) {
          if (cardValidIndicator) cardValidIndicator.classList.add('hidden');
          if (cardErrorMsg) {
            cardErrorMsg.textContent = '⚠️ Invalid card checksum according to Luhn MOD 10 algorithm.';
            cardErrorMsg.classList.remove('hidden');
          }
          cardNumberInput.classList.remove('border-emerald-500');
          cardNumberInput.classList.add('border-rose-400');
        }
      } else {
        if (cardValidIndicator) cardValidIndicator.classList.add('hidden');
        if (cardErrorMsg) cardErrorMsg.classList.add('hidden');
        cardNumberInput.classList.remove('border-emerald-500', 'border-rose-400');
      }
    });
  }

  // 5. Card Expiry Formatter (MM/YY)
  const cardExpiryInput = document.getElementById('card-expiry');
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      cardExpiryInput.value = val;
    });
  }

  // Initial Summary Render
  renderCheckoutSummary(cart, initialDestination);

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.onsubmit = handleCheckoutSubmit;
  }
}

/**
 * Renders mini items list, automated fulfillment branch calculation, distance shipping fees
 * Handles DYNAMIC promotional free shipping rules
 */
export function renderCheckoutSummary(cart, customerDestination = 'Colombo') {
  validateCartBundles();
  const currentCart = getCart();

  const itemsContainer = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const shippingEl = document.getElementById('checkout-shipping');
  const totalEl = document.getElementById('checkout-total');
  const branchInfoEl = document.getElementById('checkout-branch-info');

  if (!itemsContainer) return;

  let subtotal = 0;
  const hasFreeShipping = currentCart.some(i => i.isFreeShipping);

  itemsContainer.innerHTML = currentCart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const isBundle = !!item.isBundleItem;
    const isPromoFree = !!item.isFreeShipping;

    return `
      <div class="flex items-center justify-between text-xs py-2.5 border-b border-[#e2e8f0] last:border-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded bg-[#f8fafc] flex-shrink-0 overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          </div>
          <div>
            <p class="font-bold text-[#0f172a] line-clamp-1">${item.name}</p>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              ${isBundle ? `
                <span class="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  [Bundle: ${item.bundleTitle}]
                </span>
              ` : ''}
              ${isPromoFree ? `
                <span class="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                  🚚 Free Shipping Promo
                </span>
              ` : ''}
              <span class="text-[#64748b] font-mono text-[10px]">Qty: ${item.quantity} × Rs. ${item.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <span class="font-bold text-[#0f172a] font-mono">Rs. ${itemTotal.toLocaleString()}</span>
      </div>
    `;
  }).join('');

  // Run automated fulfillment branch selection with Geodesic Haversine calculation
  const productsList = getStoredProducts();
  const fulfillment = autoSelectFulfillmentBranch(currentCart, customerDestination, productsList);

  // DYNAMIC FREE SHIPPING: Waived if cart has any promotional free-shipping bundle/deal
  const shipping = hasFreeShipping ? 0 : (fulfillment ? fulfillment.shippingFee : 450);
  const grandTotal = subtotal + shipping;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (shippingEl) {
    if (hasFreeShipping) {
      shippingEl.innerHTML = `
        <span class="text-emerald-600 font-extrabold font-mono">FREE</span>
        <span class="ml-1 text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">PROMO APPLIED</span>
      `;
    } else {
      shippingEl.textContent = `Rs. ${shipping.toFixed(2)}`;
      shippingEl.className = 'font-bold text-[#0f172a] font-mono';
    }
  }

  if (totalEl) totalEl.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (branchInfoEl && fulfillment) {
    if (fulfillment.hasSufficientStock) {
      branchInfoEl.innerHTML = `
        <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs space-y-1">
          <div class="flex items-center justify-between font-bold text-blue-700">
            <span>Dispatch Hub: ${fulfillment.branch.name}</span>
            <span class="text-[10px] font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">${fulfillment.distanceKm} km (Geodesic)</span>
          </div>
          <p class="text-[10px] text-[#64748b]">Real-time nearest fulfillment warehouse with verified inventory for your delivery location.</p>
        </div>
      `;
    } else {
      branchInfoEl.innerHTML = `
        <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs space-y-1">
          <div class="flex items-center justify-between font-bold text-rose-700">
            <span>⚠️ Regional Stock Constraint</span>
            <span class="text-[10px] font-mono bg-rose-100 px-2 py-0.5 rounded text-rose-800">Insufficient Stock</span>
          </div>
          <p class="text-[10px] text-rose-600">No single fulfillment branch has all requested items in stock. Please adjust quantities in your cart.</p>
        </div>
      `;
    }
  }
}

/**
 * Handles checkout form submission, Luhn card check, PayHere Sandbox launch, and backend order persistence
 */
export async function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (validateCartBundles()) {
    etechAlert.warning('Cart Updated', 'One or more promotional deal bundles in your cart have expired or changed stock. The cart has been updated.');
    renderCart();
    return;
  }

  const fullName = document.getElementById('full-name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const district = document.getElementById('district')?.value || 'Colombo';
  const city = district;
  const phone = document.getElementById('phone')?.value.trim() || '';

  if (!fullName || !email || !address || !phone) {
    etechAlert.warning('Incomplete Shipping Information', 'Please fill out all required delivery and contact details, including your Phone Number, before placing your order.');
    return;
  }

  // Mandatory Map Doorstep Pin Validation
  const locState = getCheckoutDeliveryLocation();
  if (!locState.isPinned) {
    etechAlert.warning(
      'Delivery Location Required',
      'Please click on the map or drag the 📍 green pin to your exact delivery doorstep (or click "Confirm Pin") before completing your order.'
    );
    const mapEl = document.getElementById('checkout-delivery-map');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mapEl.classList.add('ring-4', 'ring-amber-400');
      setTimeout(() => mapEl.classList.remove('ring-4', 'ring-amber-400'), 2500);
    }
    return;
  }

  const cart = getCart();
  if (!cart.length) return;

  const paymentMethodRadio = document.querySelector('input[name="payment-method"]:checked');
  const isCardPayment = paymentMethodRadio ? paymentMethodRadio.value === 'card' : true;

  // Luhn & Card validation if card payment selected
  if (isCardPayment) {
    const cardNumber = document.getElementById('card-number')?.value.replace(/\s+/g, '');
    const cardExpiry = document.getElementById('card-expiry')?.value.trim();
    const cardCvv = document.getElementById('card-cvv')?.value.trim();

    if (!cardNumber || !validateLuhn(cardNumber)) {
      etechAlert.warning(
        'Invalid Card Number',
        'Please enter a valid credit or debit card number. The number entered failed the Luhn (MOD 10) checksum verification.'
      );
      return;
    }

    if (!cardExpiry || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      etechAlert.warning('Invalid Expiry Date', 'Please enter a valid expiration date in MM/YY format (e.g. 12/28).');
      return;
    }

    if (!cardCvv || cardCvv.length < 3) {
      etechAlert.warning('Invalid CVV', 'Please enter your 3 or 4 digit card verification value (CVV).');
      return;
    }
  }

  const destination = currentCheckoutLocation || district;
  const productsList = getStoredProducts();
  const fulfillment = autoSelectFulfillmentBranch(cart, destination, productsList);

  if (!fulfillment || !fulfillment.hasSufficientStock) {
    etechAlert.error(
      'Insufficient Regional Stock',
      'No single fulfillment branch in our store network currently has enough inventory to fulfill all items in this order. Please adjust your cart quantities to continue.'
    );
    return;
  }

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const hasFreeShipping = cart.some(i => i.isFreeShipping);
  const shipping = hasFreeShipping ? 0 : (fulfillment ? fulfillment.shippingFee : 450);
  const grandTotal = subtotal + shipping;

  const deliveryLat = locState.lat;
  const deliveryLng = locState.lng;

  // Confirmation Prompt before final payment authorization
  const isOrderConfirmed = await etechAlert.confirm({
    title: 'Confirm Order & Delivery Destination',
    message: 'Please review and confirm your delivery details before placing your order:',
    details: `📍 Destination: ${address}, ${district} | GPS Pin: ${deliveryLat.toFixed(4)}, ${deliveryLng.toFixed(4)} | Dispatch Hub: ${fulfillment ? fulfillment.branch.name : 'Colombo Main Hub'} (${fulfillment ? fulfillment.distanceKm : 5} km) | Order Total: Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    type: 'update',
    confirmText: 'Confirm & Place Order',
    cancelText: 'Review Details'
  });

  if (!isOrderConfirmed) return;

  const orderId = '#ETC-' + Math.floor(100000 + Math.random() * 900000);

  async function executeOrderFinalization(paymentMethodTitle, transactionRef = null) {
    // Transform cart line items for individual product order entry with bundle notation
    const orderItems = cart.map(item => ({
      id: item.productId || item.id,
      productId: item.productId || item.id,
      name: item.isBundleItem ? `${item.name} [Bundle: ${item.bundleTitle}]` : item.name,
      productName: item.name,
      price: item.price,
      unitPrice: item.price,
      quantity: item.quantity,
      image: item.image,
      isBundleItem: !!item.isBundleItem,
      bundleId: item.bundleId || null,
      bundleTitle: item.bundleTitle || null
    }));

    try {
      const isCod = paymentMethodTitle.toLowerCase().includes('cash') || paymentMethodTitle.toLowerCase().includes('delivery');
      const paymentRef = transactionRef || (isCod ? `COD-REF-${Math.floor(100000 + Math.random() * 900000)}` : `PAY-LKR-${Math.floor(100000 + Math.random() * 900000)}`);
      const paymentStatus = isCod ? 'PENDING_ON_DELIVERY' : 'PAID';

      // Save order through controller (which syncs to backend API)
      const savedOrder = await saveOrder({
        orderId: orderId,
        customerName: fullName,
        customerEmail: email,
        email: email,
        customerPhone: phone,
        phone: phone,
        shippingAddress: address,
        address: address,
        city: district,
        fulfillmentBranch: fulfillment ? fulfillment.branch.name : 'Colombo Main Hub',
        fulfillmentBranchId: fulfillment ? fulfillment.branch.id : 'BR-COL',
        distanceKm: fulfillment ? fulfillment.distanceKm : 5,
        deliveryLatitude: deliveryLat,
        deliveryLongitude: deliveryLng,
        items: orderItems,
        subtotal: `Rs. ${subtotal.toFixed(2)}`,
        tax: `Rs. 0.00`,
        shipping: shipping === 0 ? 'FREE' : `Rs. ${shipping.toFixed(2)}`,
        totalAmount: `Rs. ${grandTotal.toFixed(2)}`,
        paymentMethod: paymentMethodTitle,
        paymentReference: paymentRef,
        paymentStatus: paymentStatus
      });

      // Deduct inventory stock from assigned branch & record bundle sales
      const branchId = fulfillment ? fulfillment.branch.id : 'BR-COL';
      const recordedBundles = new Set();

      cart.forEach(item => {
        const targetProductId = item.productId || item.id;
        deductBranchStock(targetProductId, branchId, item.quantity);

        if (item.isBundleItem && item.bundleId && !recordedBundles.has(item.bundleGroupId)) {
          recordedBundles.add(item.bundleGroupId);
          const bundleMultiplier = item.bundleQtyMultiplier || 1;
          const bundleCount = Math.max(1, Math.round(item.quantity / bundleMultiplier));
          recordBundleSale(item.bundleId, bundleCount);
        }
      });

      // Clear cart
      saveCart([]);

      // Clear all checkout input fields and reset map pin
      clearCheckoutFields();

      // Populate Success Modal
      const modalOrderId = document.getElementById('modal-order-id');
      const modalCustomerName = document.getElementById('modal-customer-name');
      const modalTotalPaid = document.getElementById('modal-total-paid') || document.getElementById('modal-order-total');
      const modalOrderEmail = document.getElementById('modal-order-email');
      const modalOrderBranch = document.getElementById('modal-order-branch');

      if (modalOrderId) modalOrderId.textContent = (savedOrder && savedOrder.orderId) ? savedOrder.orderId : orderId;
      if (modalCustomerName) modalCustomerName.textContent = fullName || 'Valued Customer';
      if (modalTotalPaid) modalTotalPaid.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      if (modalOrderEmail) modalOrderEmail.textContent = email;
      if (modalOrderBranch) modalOrderBranch.textContent = fulfillment ? `${fulfillment.branch.name} (${fulfillment.distanceKm} km delivery)` : 'Colombo Main Hub';

      // Show Modal
      const successModal = document.getElementById('order-success-modal');
      if (successModal) {
        successModal.classList.remove('hidden');
      }

      // Refresh badges & triggers
      window.dispatchEvent(new Event('productsUpdated'));
    } catch (err) {
      const errorMsg = (err && err.response && err.response.message) || (err && err.message) || 'Unable to complete your order. Please check your connection and try again.';
      etechAlert.error('Order Submission Failed', errorMsg);
    }
  }

  /**
   * In-App Interactive Sandboxed Payment Gateway Modal
   * Simulates PayHere / LankaPay 3D Secure bank authorization with realistic OTP and verification
   */
  function openSandboxPaymentModal({ orderId, grandTotal, cardBrand, maskedCard, customerName, onSuccess, onCancel }) {
    let modalEl = document.getElementById('etech-sandbox-payment-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'etech-sandbox-payment-modal';
      document.body.appendChild(modalEl);
    }

    modalEl.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto';
    modalEl.innerHTML = `
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Gateway Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-xs shadow-sm">
            🔒
          </div>
          <div>
            <div class="flex items-center space-x-1.5">
              <span class="text-xs font-extrabold text-[#0f172a]">PayHere Sandbox Gateway</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">TEST MODE</span>
            </div>
            <p class="text-[10px] text-[#64748b]">Central Bank of Sri Lanka approved simulator</p>
          </div>
        </div>
        <button type="button" id="sandbox-modal-close-btn" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold">
          ✕
        </button>
      </div>

      <!-- Order & Merchant Summary -->
      <div class="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3.5 mb-4 space-y-2 text-xs">
        <div class="flex justify-between items-center text-[#64748b]">
          <span>Merchant</span>
          <span class="font-bold text-[#0f172a]">ETech Computers (Pvt) Ltd</span>
        </div>
        <div class="flex justify-between items-center text-[#64748b]">
          <span>Sandbox Merchant ID</span>
          <span class="font-mono font-bold text-slate-700">1211149-SANDBOX</span>
        </div>
        <div class="flex justify-between items-center text-[#64748b]">
          <span>Order Reference</span>
          <span class="font-mono font-bold text-blue-600">${orderId}</span>
        </div>
        <div class="flex justify-between items-center pt-2 border-t border-[#e2e8f0]">
          <span class="font-bold text-[#0f172a]">Amount to Authorize</span>
          <span class="font-mono font-extrabold text-blue-600 text-base">Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <!-- Payment Method Simulation -->
      <div class="p-3 bg-blue-50/60 border border-blue-200 rounded-xl mb-4 flex items-center justify-between text-xs">
        <div class="flex items-center space-x-2.5">
          <span class="px-2 py-1 rounded font-mono font-bold text-[10px] bg-white border border-blue-200 text-blue-700 shadow-xs">${cardBrand}</span>
          <div>
            <span class="font-mono font-bold text-[#0f172a] block">${maskedCard}</span>
            <span class="text-[10px] text-[#64748b]">${customerName}</span>
          </div>
        </div>
        <span class="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">LUHN OK</span>
      </div>

      <!-- 3D Secure / OTP Simulation Box -->
      <div class="space-y-3 mb-5">
        <div class="flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <label class="block text-xs font-bold text-[#0f172a]">3D Secure 2.0 / Bank SMS OTP Verification</label>
        </div>
        <p class="text-[11px] text-[#64748b]">
          In real transactions, an SMS OTP is sent to your phone. For this sandbox test, use test code <code class="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono font-bold">123456</code>.
        </p>
        <div class="relative">
          <input type="text" id="sandbox-otp-input" value="123456" maxlength="6"
            class="w-full px-3.5 py-2.5 rounded-lg bg-white border border-[#cbd5e1] text-center font-mono font-extrabold text-base tracking-widest text-[#0f172a] focus:border-blue-600 focus:outline-none">
        </div>
        <p id="sandbox-error-msg" class="text-[11px] text-rose-600 font-medium hidden"></p>
      </div>

      <!-- Processing Progress Feedback (hidden by default) -->
      <div id="sandbox-processing-box" class="hidden py-4 text-center space-y-2.5">
        <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p id="sandbox-step-text" class="text-xs font-bold text-[#0f172a]">Connecting to LankaPay Network...</p>
        <span class="text-[10px] text-[#64748b] font-mono">Securing transaction payload</span>
      </div>

      <!-- Action Buttons -->
      <div id="sandbox-actions-box" class="space-y-2">
        <button type="button" id="sandbox-approve-btn"
          class="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
          <span>✓ 1-Click Sandbox Approve (Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
        </button>

        <div class="flex items-center justify-between pt-1">
          <button type="button" id="sandbox-decline-btn" class="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer">
            Simulate Card Decline
          </button>
          <button type="button" id="sandbox-cancel-btn" class="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer">
            Cancel Payment
          </button>
        </div>
      </div>

      <div class="mt-4 pt-3 border-t border-slate-100 text-center">
        <span class="text-[10px] text-[#94a3b8]">256-Bit SSL Encrypted Sandbox Gateway Simulation</span>
      </div>

    </div>
  `;

    const closeBtn = document.getElementById('sandbox-modal-close-btn');
    const cancelBtn = document.getElementById('sandbox-cancel-btn');
    const approveBtn = document.getElementById('sandbox-approve-btn');
    const declineBtn = document.getElementById('sandbox-decline-btn');
    const errorMsg = document.getElementById('sandbox-error-msg');
    const otpInput = document.getElementById('sandbox-otp-input');
    const processingBox = document.getElementById('sandbox-processing-box');
    const actionsBox = document.getElementById('sandbox-actions-box');
    const stepText = document.getElementById('sandbox-step-text');

    function closeModal() {
      if (modalEl) modalEl.remove();
    }

    if (closeBtn) closeBtn.onclick = () => { closeModal(); if (onCancel) onCancel(); };
    if (cancelBtn) cancelBtn.onclick = () => { closeModal(); if (onCancel) onCancel(); };

    if (declineBtn) {
      declineBtn.onclick = () => {
        if (errorMsg) {
          errorMsg.textContent = '❌ Transaction Declined by Bank: [51] Insufficient Funds. Your card was not charged.';
          errorMsg.classList.remove('hidden');
        }
      };
    }

    if (approveBtn) {
      approveBtn.onclick = () => {
        const otpVal = otpInput ? otpInput.value.trim() : '123456';
        if (otpVal !== '123456') {
          if (errorMsg) {
            errorMsg.textContent = '⚠️ Invalid OTP. Enter standard sandbox code 123456.';
            errorMsg.classList.remove('hidden');
          }
          return;
        }

        // Step animation
        if (actionsBox) actionsBox.classList.add('hidden');
        if (processingBox) processingBox.classList.remove('hidden');

        setTimeout(() => {
          if (stepText) stepText.textContent = 'Authorizing transaction with Bank LankaPay Network...';
        }, 350);

        setTimeout(() => {
          if (stepText) stepText.textContent = '✓ Sandbox Payment Approved! Generating Receipt...';
        }, 750);

        setTimeout(() => {
          closeModal();
          const txnId = 'TXN-PAYHERE-SANDBOX-' + Math.floor(10000000 + Math.random() * 90000000);
          if (typeof onSuccess === 'function') {
            onSuccess(txnId);
          }
        }, 1100);
      };
    }
  }

  // Payment Execution
  if (isCardPayment) {
    const cardNumber = document.getElementById('card-number')?.value.replace(/\s+/g, '');
    const brand = detectCardBrand(cardNumber).label;
    const masked = cardNumber ? `•••• •••• •••• ${cardNumber.slice(-4)}` : '•••• •••• •••• 8892';

    openSandboxPaymentModal({
      orderId: orderId,
      grandTotal: grandTotal,
      cardBrand: brand,
      maskedCard: masked,
      customerName: fullName,
      onSuccess: (txnId) => {
        showToast(`🎉 Sandbox Payment Approved! (${txnId})`, 'success');
        executeOrderFinalization(`Credit / Debit Card (PayHere Sandbox)`, txnId);
      },
      onCancel: () => {
        showToast('Payment authorization was cancelled.', 'warning');
      }
    });
  } else {
    // Cash on Delivery
    executeOrderFinalization('Cash on Delivery');
  }
}

/**
 * Clear all checkout input fields, reset delivery pin, and restore default state
 */
export function clearCheckoutFields() {
  const fields = [
    'full-name', 'email', 'phone', 'address', 'postal-code',
    'card-number', 'card-expiry', 'card-cvv'
  ];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const districtSelect = document.getElementById('district');
  if (districtSelect) districtSelect.selectedIndex = 0;

  const payCardRadio = document.getElementById('pay-method-card');
  if (payCardRadio) payCardRadio.checked = true;

  const labelCard = document.getElementById('label-pay-card');
  const labelCod = document.getElementById('label-pay-cod');
  if (labelCard) {
    labelCard.classList.add('border-blue-600');
    labelCard.classList.remove('border-[#e2e8f0]');
  }
  if (labelCod) {
    labelCod.classList.remove('border-blue-600');
    labelCod.classList.add('border-[#e2e8f0]');
  }

  // Reset checkout location pin state & map marker
  resetCheckoutDeliveryLocation();
}

