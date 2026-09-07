// ETech Computers - Shopping Cart & Order Checkout System
import { products, getStoredProducts, deductBranchStock } from '../models/data.js';
import { autoSelectFulfillmentBranch } from './branch_controller.js';
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
  if (!product) return;

  const hotDeal = getHotDealByProductId(product.id);
  const effectivePrice = hotDeal ? hotDeal.dealPrice : product.price;
  const isHotDeal = !!hotDeal;

  let cart = getCart();
  const existingItem = cart.find(item => item.id === product.id && !item.isBundleItem);

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = effectivePrice;
    existingItem.isHotDeal = isHotDeal;
  } else {
    cart.push({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: effectivePrice,
      originalPrice: product.originalPrice || product.price,
      isHotDeal: isHotDeal,
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
      bundleGroupId: bundleGroupId
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
    clearCartBtn.addEventListener('click', async () => {
      const confirmed = await etechAlert.confirmDelete('all items from your shopping cart');
      if (confirmed) {
        saveCart([]);
        renderCart();
        modernShowToast('Shopping cart cleared.', 'info');
      }
    });
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
      // Scale all items in this bundle group together
      cart.forEach(i => {
        if (i.bundleGroupId === item.bundleGroupId) {
          i.quantity = (i.bundleQtyMultiplier || 1) * newBundleCount;
        }
      });
    }
  } else {
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
 * Recalculates subtotal, tax (8%), shipping, and total amount
 */
export function updateSummaryTotals(subtotal) {
  const subtotalEl = document.getElementById('summary-subtotal');
  const taxEl = document.getElementById('summary-tax');
  const shippingEl = document.getElementById('summary-shipping');
  const totalEl = document.getElementById('summary-total');

  const tax = subtotal * 0.08;
  const shipping = subtotal > 150000 || subtotal === 0 ? 0 : 2500;
  const grandTotal = subtotal + tax + shipping;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (taxEl) taxEl.textContent = `Rs. ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (shippingEl) {
    if (subtotal === 0) {
      shippingEl.textContent = 'Rs. 0.00';
      shippingEl.className = 'font-bold text-[#0f172a] font-mono';
    } else if (shipping === 0) {
      shippingEl.textContent = 'FREE';
      shippingEl.className = 'font-bold text-emerald-600 font-mono';
    } else {
      shippingEl.textContent = `Rs. ${shipping.toFixed(2)}`;
      shippingEl.className = 'font-bold text-[#0f172a] font-mono';
    }
  }

  if (totalEl) totalEl.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


/* ================= CHECKOUT HOOK & LOGIC ================= */

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
    if (fullNameInput && !fullNameInput.value) fullNameInput.value = user.name;
    if (emailInput && !emailInput.value) emailInput.value = user.email;
  }

  const cityInput = document.getElementById('city');
  const initialCity = cityInput ? (cityInput.value.trim() || 'Colombo') : 'Colombo';

  renderCheckoutSummary(cart, initialCity);

  if (cityInput) {
    cityInput.addEventListener('change', () => {
      renderCheckoutSummary(getCart(), cityInput.value.trim() || 'Colombo');
    });
  }

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }
}

/**
 * Renders mini items list, automated fulfillment branch calculation, distance shipping fees
 */
export function renderCheckoutSummary(cart, customerCity = 'Colombo') {
  validateCartBundles();
  const currentCart = getCart();

  const itemsContainer = document.getElementById('checkout-items-list');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const taxEl = document.getElementById('checkout-tax');
  const shippingEl = document.getElementById('checkout-shipping');
  const totalEl = document.getElementById('checkout-total');
  const branchInfoEl = document.getElementById('checkout-branch-info');

  if (!itemsContainer) return;

  let subtotal = 0;

  itemsContainer.innerHTML = currentCart.map(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;

    const isBundle = !!item.isBundleItem;

    return `
      <div class="flex items-center justify-between text-xs py-2.5 border-b border-[#e2e8f0] last:border-0">
        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded bg-[#f8fafc] flex-shrink-0 overflow-hidden border border-[#e2e8f0] flex items-center justify-center">
            <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover">
          </div>
          <div>
            <p class="font-bold text-[#0f172a] line-clamp-1">${item.name}</p>
            <div class="flex items-center space-x-1.5 mt-0.5">
              ${isBundle ? `
                <span class="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                  [Bundle: ${item.bundleTitle}]
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

  // Run automated fulfillment branch selection
  const productsList = getStoredProducts();
  const fulfillment = autoSelectFulfillmentBranch(currentCart, customerCity, productsList);

  const tax = subtotal * 0.08;
  const shipping = subtotal > 150000 ? 0 : (fulfillment ? fulfillment.shippingFee : 450);
  const grandTotal = subtotal + tax + shipping;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (taxEl) taxEl.textContent = `Rs. ${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `Rs. ${shipping.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (branchInfoEl && fulfillment) {
    branchInfoEl.innerHTML = `
      <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs space-y-1">
        <div class="flex items-center justify-between font-bold text-blue-700">
          <span>Dispatch Hub: ${fulfillment.branch.name}</span>
          <span class="text-[10px] font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">${fulfillment.distanceKm} km</span>
        </div>
        <p class="text-[10px] text-[#64748b]">Auto-selected closest warehouse with stock for your destination.</p>
      </div>
    `;
  }
}

/**
 * Handles checkout form submission, saves order with itemized products & bundle notice, and deducts branch stock
 */
export function handleCheckoutSubmit(e) {
  e.preventDefault();

  if (validateCartBundles()) {
    etechAlert.warning('Cart Updated', 'One or more promotional deal bundles in your cart have expired or changed stock. The cart has been updated.');
    renderCart();
    return;
  }

  const fullName = document.getElementById('full-name')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const city = document.getElementById('city')?.value.trim() || 'Colombo';
  const phone = document.getElementById('phone')?.value.trim() || '';

  if (!fullName || !email || !address || !city) {
    etechAlert.warning('Incomplete Shipping Information', 'Please fill out all required delivery and contact details before placing your order.');
    return;
  }

  const cart = getCart();
  if (!cart.length) return;

  const productsList = getStoredProducts();
  const fulfillment = autoSelectFulfillmentBranch(cart, city, productsList);

  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
  const tax = subtotal * 0.08;
  const shipping = subtotal > 150000 ? 0 : (fulfillment ? fulfillment.shippingFee : 450);
  const grandTotal = subtotal + tax + shipping;

  const orderId = '#ETC-' + Math.floor(100000 + Math.random() * 900000);

  // Transform cart line items for individual product order entry with bundle notation
  const orderItems = cart.map(item => ({
    id: item.productId || item.id,
    name: item.isBundleItem ? `${item.name} [Bundle: ${item.bundleTitle}]` : item.name,
    price: item.price,
    quantity: item.quantity,
    image: item.image,
    isBundleItem: !!item.isBundleItem,
    bundleId: item.bundleId || null,
    bundleTitle: item.bundleTitle || null
  }));

  // Save order
  const savedOrder = saveOrder({
    orderId: orderId,
    customerName: fullName,
    email: email,
    phone: phone,
    city: city,
    address: address,
    fulfillmentBranch: fulfillment ? fulfillment.branch.name : 'Colombo Main Hub',
    fulfillmentBranchId: fulfillment ? fulfillment.branch.id : 'BR-COL',
    distanceKm: fulfillment ? fulfillment.distanceKm : 5,
    items: orderItems,
    subtotal: `Rs. ${subtotal.toFixed(2)}`,
    tax: `Rs. ${tax.toFixed(2)}`,
    shipping: shipping === 0 ? 'FREE' : `Rs. ${shipping.toFixed(2)}`,
    totalAmount: `Rs. ${grandTotal.toFixed(2)}`,
    paymentMethod: 'card'
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

  // Populate modal
  const modalOrderId = document.getElementById('modal-order-id');
  const modalOrderEmail = document.getElementById('modal-order-email');
  const modalOrderBranch = document.getElementById('modal-order-branch');
  const modalOrderTotal = document.getElementById('modal-order-total');

  if (modalOrderId) modalOrderId.textContent = orderId;
  if (modalOrderEmail) modalOrderEmail.textContent = email;
  if (modalOrderBranch) modalOrderBranch.textContent = fulfillment ? `${fulfillment.branch.name} (${fulfillment.distanceKm} km delivery)` : 'Colombo Main Hub';
  if (modalOrderTotal) modalOrderTotal.textContent = `Rs. ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Show Modal
  const successModal = document.getElementById('order-success-modal');
  if (successModal) {
    successModal.classList.remove('hidden');
  }

  // Refresh badges & triggers
  window.dispatchEvent(new Event('productsUpdated'));
}
