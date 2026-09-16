import { getCurrentUser } from './login_controller.js';
import { OrdersApi } from '../api/ordersApi.js';
import { restoreBranchStock, deductBranchStock } from '../models/data.js';
import { iconCheck, iconClose } from '../util/icons.js';
import { etechAlert } from '../util/index.js';
import { parseLKR, formatLKR } from '../util/formatters.js';

export const DEFAULT_ORDERS = [];

// Pure in-memory reactive state
let memoryOrders = [];

export { parseLKR as parseCurrencyAmount };

/**
 * Normalizes backend OrderResponseDTO into frontend order model
 */
export function normalizeOrderFromApi(dto) {
  if (!dto) return null;
  const rawCode = dto.orderCode || dto.orderId || (dto.id ? `#ETC-${dto.id}` : '#ETC-100000');
  const formattedCode = String(rawCode).startsWith('#') ? rawCode : `#${rawCode}`;

  const numSubtotal = typeof dto.subtotal === 'number' ? dto.subtotal : parseLKR(dto.subtotal);
  const numTax = typeof dto.taxAmount === 'number' ? dto.taxAmount : (typeof dto.tax === 'number' ? dto.tax : parseLKR(dto.tax || dto.taxAmount));
  const numShipping = typeof dto.shippingFee === 'number' ? dto.shippingFee : parseLKR(dto.shippingFee || dto.shipping);
  const numTotal = typeof dto.totalAmount === 'number' ? dto.totalAmount : parseLKR(dto.totalAmount);

  return {
    id: dto.id,
    orderId: formattedCode,
    orderCode: dto.orderCode || formattedCode,
    userId: dto.userId,
    customerName: dto.customerName || 'Valued Customer',
    customerEmail: dto.customerEmail || dto.email || '',
    email: dto.customerEmail || dto.email || '',
    customerPhone: dto.customerPhone || dto.phone || '',
    phone: dto.customerPhone || dto.phone || '',
    shippingAddress: dto.shippingAddress || dto.address || '',
    address: dto.shippingAddress || dto.address || '',
    city: dto.city || 'Colombo',
    fulfillmentBranch: dto.fulfillmentBranchName || dto.fulfillmentBranch || 'Colombo Main Hub',
    fulfillmentBranchName: dto.fulfillmentBranchName || dto.fulfillmentBranch || 'Colombo Main Hub',
    fulfillmentBranchId: dto.fulfillmentBranchId || 'BR-COL',
    distanceKm: dto.distanceKm || 5,
    deliveryLatitude: (dto.deliveryLatitude !== undefined && dto.deliveryLatitude !== null && !isNaN(dto.deliveryLatitude)) ? parseFloat(dto.deliveryLatitude) : null,
    deliveryLongitude: (dto.deliveryLongitude !== undefined && dto.deliveryLongitude !== null && !isNaN(dto.deliveryLongitude)) ? parseFloat(dto.deliveryLongitude) : null,
    items: Array.isArray(dto.items) ? dto.items.map(item => ({
      id: item.productId || item.id,
      productId: item.productId || item.id,
      name: item.productName || item.name || 'Hardware Component',
      productName: item.productName || item.name || 'Hardware Component',
      price: typeof item.unitPrice === 'number' ? item.unitPrice : parseLKR(item.unitPrice || item.price),
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : parseLKR(item.unitPrice || item.price),
      quantity: Number(item.quantity) || 1,
      image: item.productImage || item.image || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80',
      isBundleItem: !!item.bundleId,
      bundleId: item.bundleId || null,
      warranty: item.warranty || 'Official Hardware Warranty'
    })) : [],
    subtotal: formatLKR(numSubtotal),
    tax: formatLKR(numTax),
    shipping: (numShipping === 0 || dto.shipping === 'FREE') ? 'FREE' : formatLKR(numShipping),
    totalAmount: formatLKR(numTotal),
    subtotalAmount: numSubtotal,
    taxAmount: numTax,
    shippingAmount: numShipping,
    total: numTotal,
    paymentMethod: dto.paymentMethod || 'Credit / Debit Card',
    status: dto.status || 'Pending',
    date: dto.orderDate ? new Date(dto.orderDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (dto.date || new Date().toLocaleDateString('en-US'))
  };
}

/**
 * Sync orders from backend API into memory
 * Uses getMyOrders for customers to prevent 403 authorization failures
 */
export async function syncOrdersFromApi() {
  const currentUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  let data;
  if (currentUser && currentUser.role === 'CUSTOMER') {
    data = await OrdersApi.getMyOrders();
  } else {
    data = await OrdersApi.getAll();
  }

  let rawList = [];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (data && Array.isArray(data.content)) {
    rawList = data.content;
  } else if (data && Array.isArray(data.body)) {
    rawList = data.body;
  }

  if (rawList.length > 0) {
    memoryOrders = rawList.map(normalizeOrderFromApi).filter(Boolean);
  } else {
    memoryOrders = [];
  }
  return memoryOrders;
}

/**
 * Get all orders from memory
 * @returns {Array}
 */
export function getAllOrders() {
  return [...memoryOrders];
}

/**
 * Get a specific order by Order ID
 * @param {string} orderId 
 * @returns {object|null}
 */
export function getOrderById(orderId) {
  if (!orderId) return null;
  const rawId = String(orderId).trim();
  const cleanId = rawId.replace(/^#/, '');

  return memoryOrders.find(o => {
    const oId = String(o.orderId || '').trim();
    const cleanOId = oId.replace(/^#/, '');
    return oId.toLowerCase() === rawId.toLowerCase() || cleanOId.toLowerCase() === cleanId.toLowerCase();
  }) || null;
}

/**
 * Save order details to order database & API
 */
export async function saveOrder(orderData) {
  const currentUser = getCurrentUser();

  const numSubtotal = typeof orderData.subtotal === 'number' ? orderData.subtotal : parseLKR(orderData.subtotal);
  const numTax = typeof orderData.tax === 'number' ? orderData.tax : parseLKR(orderData.tax);
  const numShipping = typeof orderData.shipping === 'number' ? orderData.shipping : parseLKR(orderData.shipping);
  const numTotal = typeof orderData.totalAmount === 'number' ? orderData.totalAmount : parseLKR(orderData.totalAmount);

  const customerEmail = (orderData.customerEmail || orderData.email || (currentUser ? currentUser.email : '') || '').trim().toLowerCase();
  const customerPhone = (orderData.customerPhone || orderData.phone || (currentUser ? currentUser.phone : '') || '').trim();
  const shippingAddress = (orderData.shippingAddress || orderData.address || '').trim();
  const customerName = orderData.customerName || (currentUser ? (currentUser.name || currentUser.username) : 'Valued Customer');

  const sanitizedOrder = {
    orderId: orderData.orderId,
    userId: orderData.userId || (currentUser ? currentUser.id : null),
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    customerName: customerName,
    customerEmail: customerEmail,
    email: customerEmail,
    customerPhone: customerPhone,
    phone: customerPhone,
    shippingAddress: shippingAddress,
    address: shippingAddress,
    city: orderData.city || 'Colombo',
    fulfillmentBranch: orderData.fulfillmentBranch || 'Colombo Main Hub',
    fulfillmentBranchId: orderData.fulfillmentBranchId || 'BR-COL',
    distanceKm: orderData.distanceKm || 5,
    deliveryLatitude: (orderData.deliveryLatitude !== undefined && orderData.deliveryLatitude !== null) ? Number(orderData.deliveryLatitude) : null,
    deliveryLongitude: (orderData.deliveryLongitude !== undefined && orderData.deliveryLongitude !== null) ? Number(orderData.deliveryLongitude) : null,
    items: (orderData.items || []).map(item => ({
      id: item.productId || item.id,
      productId: item.productId || item.id,
      name: item.name,
      productName: item.name,
      price: typeof item.price === 'number' ? item.price : parseLKR(item.price || item.unitPrice),
      unitPrice: typeof item.price === 'number' ? item.price : parseLKR(item.price || item.unitPrice),
      quantity: Number(item.quantity) || 1,
      image: item.image || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80'
    })),
    subtotal: formatLKR(numSubtotal),
    tax: formatLKR(numTax),
    shipping: (numShipping === 0 || orderData.shipping === 'FREE') ? 'FREE' : formatLKR(numShipping),
    totalAmount: formatLKR(numTotal),
    subtotalAmount: numSubtotal,
    taxAmount: numTax,
    shippingAmount: numShipping,
    paymentMethod: orderData.paymentMethod ? (orderData.paymentMethod === 'card' ? 'Credit / Debit Card' : orderData.paymentMethod) : 'Cash on Delivery',
    paymentReference: orderData.paymentReference || null,
    paymentStatus: orderData.paymentStatus || (orderData.paymentMethod && orderData.paymentMethod.toLowerCase().includes('cash') ? 'PENDING_ON_DELIVERY' : 'PAID'),
    status: 'Pending'
  };

  // Single-Mode: Sync to backend directly and reconcile real server ID/amounts
  const backendOrder = await OrdersApi.placeOrder(sanitizedOrder);
  if (backendOrder) {
    if (backendOrder.orderCode) {
      sanitizedOrder.orderCode = backendOrder.orderCode;
      sanitizedOrder.orderId = backendOrder.orderCode.startsWith('#') ? backendOrder.orderCode : `#${backendOrder.orderCode}`;
    }
    if (backendOrder.id) sanitizedOrder.backendId = backendOrder.id;
    if (typeof backendOrder.totalAmount === 'number') {
      sanitizedOrder.totalAmount = formatLKR(backendOrder.totalAmount);
      sanitizedOrder.total = backendOrder.totalAmount;
    }
    if (typeof backendOrder.subtotal === 'number') {
      sanitizedOrder.subtotal = formatLKR(backendOrder.subtotal);
      sanitizedOrder.subtotalAmount = backendOrder.subtotal;
    }
    if (typeof backendOrder.shippingFee === 'number') {
      sanitizedOrder.shipping = backendOrder.shippingFee === 0 ? 'FREE' : formatLKR(backendOrder.shippingFee);
      sanitizedOrder.shippingAmount = backendOrder.shippingFee;
    }
  }

  memoryOrders.unshift(sanitizedOrder);
  window.dispatchEvent(new CustomEvent('ordersUpdated', { detail: { order: sanitizedOrder } }));
  return sanitizedOrder;
}

/**
 * Update order status (Pending -> Processing -> Shipped -> Delivered -> Cancelled)
 */
export async function updateOrderStatus(orderId, newStatus) {
  const cleanId = String(orderId).trim().replace(/^#/, '');
  const order = memoryOrders.find(o => String(o.orderId).trim().replace(/^#/, '').toLowerCase() === cleanId.toLowerCase());
  if (!order) return { success: false, message: 'Order not found.' };

  // Single-Mode: Sync with backend API FIRST - fail fast if server error or offline!
  await OrdersApi.updateStatus(orderId, newStatus);

  const prevStatus = (order.status || '').toLowerCase();
  const nextStatus = (newStatus || '').toLowerCase();

  order.status = newStatus;
  if (nextStatus === 'delivered') {
    order.paymentStatus = 'PAID';
  }

  // Restore inventory if status changed to Cancelled
  if (prevStatus !== 'cancelled' && nextStatus === 'cancelled') {
    if (Array.isArray(order.items)) {
      const branchId = order.fulfillmentBranchId || 'BR-COL';
      order.items.forEach(item => {
        const pId = item.productId || item.id;
        if (pId && item.quantity) {
          restoreBranchStock(pId, branchId, item.quantity);
        }
      });
    }
  } else if (prevStatus === 'cancelled' && nextStatus !== 'cancelled') {
    // Re-deduct inventory if uncancelled
    if (Array.isArray(order.items)) {
      const branchId = order.fulfillmentBranchId || 'BR-COL';
      order.items.forEach(item => {
        const pId = item.productId || item.id;
        if (pId && item.quantity) {
          deductBranchStock(pId, branchId, item.quantity);
        }
      });
    }
  }

  return { success: true, message: `Order #${order.orderId} status updated to ${newStatus}` };
}

/**
 * Cancel an order initiated by customer
 * @param {string} orderId 
 * @param {string} reason 
 * @returns {object}
 */
export async function cancelCustomerOrder(orderId, reason = 'Cancelled by customer request') {
  const cleanId = String(orderId).trim().replace(/^#/, '');
  const order = memoryOrders.find(o => String(o.orderId).trim().replace(/^#/, '').toLowerCase() === cleanId.toLowerCase());
  if (!order) return { success: false, message: 'Order not found.' };

  if (order.status === 'Shipped' || order.status === 'Delivered') {
    return { success: false, message: `Order #${order.orderId} cannot be cancelled because it is already ${order.status.toLowerCase()}. Please contact support.` };
  }
  if (order.status === 'Cancelled') {
    return { success: false, message: `Order #${order.orderId} is already cancelled.` };
  }

  // Single-Mode: Call backend API directly
  await OrdersApi.updateStatus(orderId, 'Cancelled');

  order.status = 'Cancelled';
  order.cancellationReason = reason || 'Customer requested cancellation';
  order.cancelledAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Return quantities back to warehouse branch stock
  if (Array.isArray(order.items)) {
    const branchId = order.fulfillmentBranchId || 'BR-COL';
    order.items.forEach(item => {
      const pId = item.productId || item.id;
      if (pId && item.quantity) {
        restoreBranchStock(pId, branchId, item.quantity);
      }
    });
  }

  return { success: true, message: `Order #${order.orderId} has been cancelled successfully.` };
}

/**
 * Get order history for a specific user object or email
 * @param {string|object} userOrEmail 
 * @returns {Array}
 */
export function getUserOrders(userOrEmail) {
  if (!userOrEmail) return [];
  const allOrders = getAllOrders();

  if (typeof userOrEmail === 'object') {
    const email = (userOrEmail.email || '').trim().toLowerCase();
    const userId = userOrEmail.id;
    return allOrders.filter(o => {
      const matchEmail = o.email && o.email.trim().toLowerCase() === email;
      const matchId = userId && String(o.userId) === String(userId);
      return matchEmail || matchId;
    });
  }

  const cleanEmail = String(userOrEmail).trim().toLowerCase();
  return allOrders.filter(o => o.email && o.email.trim().toLowerCase() === cleanEmail);
}

/**
 * Open customer pre-formatted support email via mailto
 * @param {string} orderId 
 */
export function openOrderSupportEmail(orderId) {
  const order = getOrderById(orderId);
  const subject = encodeURIComponent(`Support Inquiry for Order #${order ? order.orderId : orderId}`);
  
  let itemsSummary = '';
  if (order && Array.isArray(order.items)) {
    itemsSummary = order.items.map(i => `- ${i.name} (Qty: ${i.quantity})`).join('%0D%0A');
  }

  const body = encodeURIComponent(
    `Hello ETech Computers Support Team,\n\n` +
    `I would like assistance with my order #${order ? order.orderId : orderId}.\n\n` +
    `Order Summary:\n` +
    `- Order ID: #${order ? order.orderId : orderId}\n` +
    `- Order Date: ${order ? order.date : 'N/A'}\n` +
    `- Customer Name: ${order ? order.customerName : 'Valued Customer'}\n` +
    `- Customer Email: ${order ? order.email : 'N/A'}\n` +
    `- Destination: ${order ? order.city : 'N/A'}\n` +
    `- Total Amount: Rs. ${order ? (order.totalAmount || 0) : '0'}\n` +
    `- Order Status: ${order ? (order.status || 'Pending') : 'Pending'}\n\n` +
    `Items Ordered:\n` +
    `${itemsSummary ? decodeURIComponent(itemsSummary) : 'Hardware Items'}\n\n` +
    `My Inquiry / Issue:\n` +
    `[Please describe your question or issue in detail here]\n\n` +
    `Thank you!`
  );

  const mailtoUri = `mailto:support@etechcomputers.lk?subject=${subject}&body=${body}`;
  window.location.href = mailtoUri;

  if (window.showToast) {
    window.showToast('Opening your email client to contact support...', 'info');
  }
}

/**
 * Show Cancel Order Modal confirmation for Customer
 * @param {string} orderId 
 */
export function handleCustomerCancelOrder(orderId) {
  const order = getOrderById(orderId);
  if (!order) {
    if (window.showToast) window.showToast('Order not found.', 'error');
    return;
  }

  if (order.status === 'Shipped' || order.status === 'Delivered') {
    etechAlert.warning(
      'Order In Transit',
      `Order #${order.orderId} cannot be cancelled online because it is already ${order.status.toLowerCase()}. Please contact our customer support hotline or dispatch team directly.`
    );
    return;
  }

  let modalContainer = document.getElementById('customer-order-cancel-modal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'customer-order-cancel-modal';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-xs">
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        <div class="flex items-center space-x-3 text-rose-600">
          <div class="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center border border-rose-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-[#0f172a]">Cancel Order #${order.orderId}</h3>
            <p class="text-xs text-[#64748b]">Are you sure you want to cancel this order?</p>
          </div>
        </div>

        <div class="bg-[#f8fafc] p-3 rounded-lg border border-[#e2e8f0] text-xs space-y-1.5">
          <div class="flex justify-between">
            <span class="text-[#64748b]">Order Total:</span>
            <span class="font-mono font-bold text-[#0f172a]">${formatLKR(parseLKR(order.totalAmount || order.total))}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748b]">Fulfillment Hub:</span>
            <span class="font-semibold text-[#0f172a]">${order.fulfillmentBranch || 'Colombo Hub'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-[#64748b]">Current Status:</span>
            <span class="font-bold text-amber-600">${order.status || 'Pending'}</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#475569] mb-1">Reason for cancellation (optional):</label>
          <select id="cancel-order-reason-select" class="w-full text-xs p-2.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600">
            <option value="Ordered by mistake">Ordered by mistake</option>
            <option value="Found a better price elsewhere">Found a better price elsewhere</option>
            <option value="Changed delivery address or branch">Changed delivery address or branch</option>
            <option value="Need to change hardware items in order">Need to change hardware items in order</option>
            <option value="Delivery time too long">Delivery time too long</option>
            <option value="Other reason">Other reason</option>
          </select>
        </div>

        <div class="pt-3 border-t border-[#e2e8f0] flex items-center justify-end space-x-2.5 text-xs">
          <button type="button" onclick="closeCancelOrderModal()" class="px-4 py-2 bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569] rounded-md font-bold border border-[#e2e8f0]">
            Keep Order
          </button>
          <button type="button" onclick="confirmCancelOrder('${order.orderId}')" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-bold shadow-sm">
            Confirm Cancellation
          </button>
        </div>
      </div>
    </div>
  `;
}

export function closeCancelOrderModal() {
  const container = document.getElementById('customer-order-cancel-modal');
  if (container) container.innerHTML = '';
}

export async function confirmCancelOrder(orderId) {
  const select = document.getElementById('cancel-order-reason-select');
  const reason = select ? select.value : 'Customer requested cancellation';
  
  try {
    const res = await cancelCustomerOrder(orderId, reason);
    closeCancelOrderModal();

    if (res.success) {
      if (window.showToast) window.showToast(res.message, 'success');
      
      // If currently on order-details page, re-render
      const hash = window.location.hash || '';
      if (hash.includes('order-detail') || hash.includes('order-tracking')) {
        await renderCustomerOrderDetailPage(orderId);
      } else {
        // Re-render account page order history
        const currentUser = getCurrentUser();
        if (currentUser && typeof window.renderUserOrderHistory === 'function') {
          window.renderUserOrderHistory(currentUser);
        }
      }
    } else {
      etechAlert.error('Cancellation Denied', res.message);
    }
  } catch (err) {
    closeCancelOrderModal();
    etechAlert.error('Cancellation Failed', err.message || 'Failed to cancel order. Please try again.');
  }
}

/**
 * ============================================================
 * DEDICATED CUSTOMER ORDER DETAILS & TRACKING PAGE
 * ============================================================
 */
export async function renderCustomerOrderDetailPage(orderId) {
  const container = document.getElementById('order-details-container');
  if (!container) return;

  const currentUser = getCurrentUser();

  // Always fetch from backend API first for real-time data
  let order = null;
  if (orderId) {
    try {
      const dto = await OrdersApi.getByCode(orderId);
      if (dto) {
        order = normalizeOrderFromApi(dto);
        // Update memory cache with fresh data
        if (order) {
          const existingIdx = memoryOrders.findIndex(o => {
            const oId = String(o.orderId || '').replace(/^#/, '').toLowerCase();
            const searchId = String(orderId).replace(/^#/, '').toLowerCase();
            return oId === searchId;
          });
          if (existingIdx >= 0) {
            memoryOrders[existingIdx] = order;
          } else {
            memoryOrders.unshift(order);
          }
        }
      }
    } catch (err) {
      console.warn('[OrdersController] Live order lookup notice:', err.message);
    }
  }

  // Fallback to memory cache if API fetch failed
  if (!order) {
    order = getOrderById(orderId);
  }

  if (!order) {
    container.innerHTML = `
      <div class="text-center py-16 bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-sm space-y-4 max-w-lg mx-auto my-12">
        <div class="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h3 class="text-lg font-extrabold text-[#0f172a]">Order Not Found</h3>
        <p class="text-xs text-[#64748b]">We couldn't find an order matching "${orderId || 'empty'}". Please verify your order ID or return to your account dashboard.</p>
        <div class="pt-2">
          <a href="#account" class="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-md shadow-sm transition-colors">
            <span>← Back to My Account</span>
          </a>
        </div>
      </div>
    `;
    return;
  }

  const status = order.status || 'Pending';
  const isCancelled = status === 'Cancelled';
  const isDelivered = status === 'Delivered';
  const isShipped = status === 'Shipped';
  const isProcessing = status === 'Processing';

  // Step states (0 to 3)
  let currentStep = 0; // 0: Placed, 1: Processing, 2: Shipped, 3: Delivered
  if (isProcessing) currentStep = 1;
  else if (isShipped) currentStep = 2;
  else if (isDelivered) currentStep = 3;

  const totalNum = parseLKR(order.totalAmount || order.total);
  const subtotalNum = parseLKR(order.subtotal || order.subtotalAmount) || totalNum;
  const shippingNum = parseLKR(order.shipping || order.shippingAmount);
  const taxNum = parseLKR(order.tax || order.taxAmount);

  container.innerHTML = `
    <!-- Top Breadcrumb & Back Navigation -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex items-center space-x-2 text-xs text-[#64748b]">
        <a href="#home" class="hover:text-blue-600 transition-colors">Home</a>
        <span>/</span>
        <a href="#account" class="hover:text-blue-600 transition-colors">User Dashboard</a>
        <span>/</span>
        <span class="text-blue-600 font-mono font-bold">#${order.orderId}</span>
      </div>
      <div class="flex items-center space-x-2">
        <a href="#account" class="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] text-xs font-bold rounded-md border border-[#e2e8f0] shadow-xs transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span>Back to Account</span>
        </a>
        <button onclick="window.print()" class="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-[#f8fafc] text-[#475569] text-xs font-bold rounded-md border border-[#e2e8f0] shadow-xs transition-all">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          <span>Print Receipt</span>
        </button>
      </div>
    </div>

    <!-- Hero Order Header Card -->
    <div class="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm mb-6 space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#e2e8f0] pb-4">
        <div>
          <div class="flex items-center space-x-2.5">
            <h1 class="text-2xl font-black text-[#0f172a] font-mono tracking-tight">Order #${order.orderId}</h1>
            <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide whitespace-nowrap shadow-2xs ${getStatusStyle(status)}">
              ${isCancelled ? `${iconClose('w-3.5 h-3.5')}<span>Cancelled</span>` : (isDelivered ? `${iconCheck('w-3.5 h-3.5')}<span>Delivered</span>` : `<span>●</span><span>${status}</span>`)}
            </span>
          </div>
          <p class="text-xs text-[#64748b] mt-1">Placed on <strong class="text-[#0f172a]">${order.date}</strong> &bull; Payment: <strong class="text-[#0f172a]">${order.paymentMethod}</strong></p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button onclick="openOrderSupportEmail('${order.orderId}')" class="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer whitespace-nowrap">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>Email Support</span>
          </button>
          
          ${(!isCancelled && !isDelivered && !isShipped) ? `
            <button onclick="handleCustomerCancelOrder('${order.orderId}')" class="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer whitespace-nowrap">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              <span>Cancel Order</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Cancellation Alert Banner (If cancelled) -->
      ${isCancelled ? `
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 space-y-1">
          <div class="flex items-center space-x-2 font-bold text-rose-900">
            <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>This order was cancelled</span>
          </div>
          <p class="text-[#64748b]">Reason: <strong class="text-[#0f172a]">${order.cancellationReason || 'Requested by customer'}</strong>${order.cancelledAt ? ` on ${order.cancelledAt}` : ''}</p>
          <p class="text-[11px] text-[#64748b]">If payment was made online, any refund will be processed within 3-5 business days.</p>
        </div>
      ` : ''}

      <!-- Interactive Tracking Pipeline (4 Steps) -->
      ${!isCancelled ? `
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-[#475569]">Order Tracking Progress</h3>
            <span class="text-xs font-semibold text-blue-600">Dispatch Hub: ${order.fulfillmentBranch || 'Colombo Main Hub'}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <!-- Step 1: Placed -->
            <div class="relative p-3.5 rounded-xl border ${currentStep >= 0 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
              <div class="flex items-center space-x-2.5 mb-1.5">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                  ${iconCheck('w-3.5 h-3.5')}
                </div>
                <span class="text-xs font-bold text-[#0f172a]">1. Order Placed</span>
              </div>
              <p class="text-[11px] text-[#64748b]">Confirmed & Verified</p>
            </div>

            <!-- Step 2: Processing -->
            <div class="relative p-3.5 rounded-xl border ${currentStep >= 1 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
              <div class="flex items-center space-x-2.5 mb-1.5">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                  ${currentStep >= 1 ? iconCheck('w-3.5 h-3.5') : '2'}
                </div>
                <span class="text-xs font-bold text-[#0f172a]">2. Warehouse Picking</span>
              </div>
              <p class="text-[11px] text-[#64748b]">Inventory staged & tested</p>
            </div>

            <!-- Step 3: Shipped -->
            <div class="relative p-3.5 rounded-xl border ${currentStep >= 2 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
              <div class="flex items-center space-x-2.5 mb-1.5">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                  ${currentStep >= 2 ? iconCheck('w-3.5 h-3.5') : '3'}
                </div>
                <span class="text-xs font-bold text-[#0f172a]">3. Out for Delivery</span>
              </div>
              <p class="text-[11px] text-[#64748b]">${order.trackingNumber ? `Waybill: ${order.trackingNumber}` : 'With dispatch courier'}</p>
            </div>

            <!-- Step 4: Delivered -->
            <div class="relative p-3.5 rounded-xl border ${currentStep >= 3 ? 'bg-emerald-50 border-emerald-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
              <div class="flex items-center space-x-2.5 mb-1.5">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                  ${currentStep >= 3 ? iconCheck('w-3.5 h-3.5') : '4'}
                </div>
                <span class="text-xs font-bold text-[#0f172a]">4. Delivered</span>
              </div>
              <p class="text-[11px] text-[#64748b]">Direct Handover</p>
              <p class="text-[10px] ${currentStep >= 3 ? 'text-emerald-700 font-bold' : 'text-[#64748b]'} mt-1">${currentStep >= 3 ? 'Warranty Active' : 'Estimated 1-2 days'}</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Main Content: Left Column (Purchased Items) & Right Column (Summary & Details) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

      <!-- Left Column: Items List -->
      <div class="lg:col-span-8 space-y-6">
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
            <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2">
              <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              <span>Purchased Hardware Items (${(order.items || []).length})</span>
            </h3>
            <span class="text-xs text-blue-600 font-semibold">Click any item to view product page</span>
          </div>

          <div class="space-y-3">
            ${(order.items || []).map(item => `
              <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-[#e2e8f0] hover:border-blue-500 hover:bg-blue-50/20 transition-all bg-[#f8fafc] gap-3">
                
                <!-- Product clickable area -->
                <a href="#product?id=${item.id}" class="flex items-center space-x-3.5 flex-1 min-w-0 group">
                  <img src="${item.image}" alt="${item.name}" class="w-14 h-14 object-cover rounded-lg border border-[#e2e8f0] bg-white flex-shrink-0 group-hover:scale-105 transition-transform">
                  <div class="min-w-0 flex-1">
                    <h4 class="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors line-clamp-2">${item.name}</h4>
                    <p class="text-xs text-[#64748b] font-mono mt-0.5">Rs. ${parseFloat(item.price || 0).toLocaleString()} &times; <span class="font-bold text-[#0f172a]">Qty: ${item.quantity}</span></p>
                    <div class="mt-1 flex items-center space-x-2">
                      <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-200">
                        ${item.warranty || 'Official Hardware Warranty'}
                      </span>
                    </div>
                  </div>
                </a>

                <!-- Price & Action -->
                <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e2e8f0] flex-shrink-0">
                  <span class="text-sm font-extrabold text-[#0f172a] font-mono">
                    Rs. ${(parseFloat(item.price || 0) * parseInt(item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <a href="#product?id=${item.id}" class="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 text-[11px] font-bold rounded border border-blue-200 mt-1 transition-colors shadow-2xs">
                    Inspect Item
                  </a>
                </div>

              </div>
            `).join('')}
          </div>
        </div>

        <!-- Activity & Fulfillment Log -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3">
          <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2 border-b border-[#e2e8f0] pb-3">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span>Fulfillment Log &amp; Milestones</span>
          </h3>
          <div class="space-y-2.5 text-xs">
            <div class="flex items-start space-x-2.5 text-[#475569]">
              <span class="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-bold text-[#0f172a]">Order placed and confirmed</p>
                <p class="text-[11px] text-[#64748b]">${order.date} &bull; Customer #${order.userId || 'Guest'}</p>
              </div>
            </div>
            <div class="flex items-start space-x-2.5 text-[#475569]">
              <span class="w-2 h-2 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-[#cbd5e1]'} mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-bold text-[#0f172a]">Inventory verification &amp; packaging</p>
                <p class="text-[11px] text-[#64748b]">Assigned Hub: ${order.fulfillmentBranch || 'Colombo Main Hub'}</p>
              </div>
            </div>
            <div class="flex items-start space-x-2.5 text-[#475569]">
              <span class="w-2 h-2 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-[#cbd5e1]'} mt-1.5 flex-shrink-0"></span>
              <div>
                <p class="font-bold text-[#0f172a]">Direct courier transit route</p>
                <p class="text-[11px] text-[#64748b]">Destination: ${order.city || 'Colombo'} (${order.distanceKm || 5} km radius)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Summary & Support -->
      <div class="lg:col-span-4 space-y-6">

        <!-- Payment & Pricing Breakdown -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 class="text-sm font-extrabold text-[#0f172a] border-b border-[#e2e8f0] pb-2.5">Payment &amp; Financials</h3>
          
          <div class="space-y-2 text-xs">
            <div class="flex justify-between text-[#64748b]">
              <span>Hardware Subtotal:</span>
              <span class="font-mono font-bold text-[#0f172a]">Rs. ${subtotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="flex justify-between text-[#64748b]">
              <span>Delivery Fee:</span>
              <span class="font-mono font-semibold text-[#0f172a]">${shippingNum > 0 ? `Rs. ${shippingNum.toLocaleString()}` : 'Free'}</span>
            </div>
            <div class="pt-2 border-t border-[#e2e8f0] flex justify-between items-center">
              <span class="text-sm font-black text-[#0f172a]">Total Amount:</span>
              <span class="text-base font-black text-blue-600 font-mono">Rs. ${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0] text-xs space-y-1">
            <div class="flex justify-between">
              <span class="text-[#64748b]">Method:</span>
              <span class="font-bold text-[#0f172a]">${order.paymentMethod}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#64748b]">Status:</span>
              <span class="font-semibold text-emerald-600 inline-flex items-center space-x-1">${iconCheck('w-3.5 h-3.5 text-emerald-600')}<span>Verified</span></span>
            </div>
          </div>
        </div>

        <!-- Destination & Contact Info -->
        <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3">
          <h3 class="text-sm font-extrabold text-[#0f172a] border-b border-[#e2e8f0] pb-2.5">Delivery Destination</h3>
          <div class="text-xs space-y-1.5 text-[#475569]">
            <p class="font-bold text-[#0f172a]">${order.customerName}</p>
            <p class="text-[11px] text-[#64748b]">${order.address ? `${order.address}, ` : ''}${order.city || 'Colombo'}</p>
            <p class="text-[11px] text-[#64748b]">${order.phone ? `Phone: ${order.phone}` : ''}</p>
            <p class="text-[11px] text-blue-600 font-mono">${order.email}</p>
          </div>
        </div>

        <!-- Support Card -->
        <div class="bg-blue-50/50 border border-blue-200 rounded-xl p-5 shadow-sm space-y-3 text-xs">
          <div class="flex items-center space-x-2 text-blue-700 font-bold">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <span>Need Help with this Order?</span>
          </div>
          <p class="text-[#64748b] leading-relaxed">
            Our hardware support team is ready to assist you with order status, address modifications, or warranty inquiries.
          </p>
          <button onclick="openOrderSupportEmail('${order.orderId}')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-md shadow-xs transition-colors flex items-center justify-center space-x-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            <span>Contact Support via Email</span>
          </button>
        </div>

      </div>

    </div>
  `;
}

/**
 * ============================================================
 * TAB 3: ORDER MANAGEMENT (STAFF & ADMIN)
 * ============================================================
 */
export async function renderOrdersTab() {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  try {
    await syncOrdersFromApi();
  } catch (err) {
    etechAlert.error('Connection Error', 'Unable to load live orders. Please try again.');
    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-xs text-rose-500 font-semibold">⚠️ Unable to load live orders. Please try again later.</td></tr>';
    return;
  }

  const activeUser = getCurrentUser();
  const allOrders = getAllOrders();

  let orders = allOrders;
  // If Staff, strictly scope to assigned branch
  if (activeUser && activeUser.isStaff() && activeUser.assignedBranch) {
    orders = allOrders.filter(o => {
      if (o.fulfillmentBranchId) return o.fulfillmentBranchId === activeUser.assignedBranch;
      if (o.fulfillmentBranch) return o.fulfillmentBranch.includes(activeUser.assignedBranch);
      return true;
    });
  }

  tbody.innerHTML = orders.map(o => {
    const canModifyOrder = activeUser && (activeUser.hasGlobalAccess() || activeUser.canManageBranch(o.fulfillmentBranchId));

    return `
      <tr class="hover:bg-[#f8fafc] transition-colors cursor-pointer" onclick="renderAdminOrderDetailView('${o.orderId}')">
        <td class="py-3 px-3.5">
          <span class="font-mono font-extrabold text-blue-600 hover:underline text-xs">${o.orderId}</span>
          <p class="text-[10px] text-[#64748b]">${o.date}</p>
        </td>
        <td class="py-3 px-3.5">
          <p class="font-bold text-[#0f172a] text-xs">${o.customerName}</p>
          <p class="text-[10px] text-[#64748b]">${o.email}</p>
        </td>
        <td class="py-3 px-3.5">
          <p class="font-bold text-[#0f172a] text-xs">${o.fulfillmentBranch || 'Colombo Hub'}</p>
          <p class="text-[10px] text-[#64748b]">Dest: <strong class="text-blue-600">${o.city}</strong> (${o.distanceKm || 5} km)</p>
        </td>
        <td class="py-3 px-3.5 font-bold text-[#0f172a] font-mono text-xs">
          ${formatLKR(parseLKR(o.totalAmount || o.total))}
        </td>
        <td class="py-3 px-3.5">
          <span class="px-2 py-0.5 rounded text-[9px] font-bold ${getStatusStyle(o.status)}">
            ${o.status || 'Pending'}
          </span>
        </td>
        <td class="py-3 px-3.5 text-right" onclick="event.stopPropagation()">
          <div class="flex items-center justify-end space-x-2">
            ${canModifyOrder ? `
              <select onchange="changeOrderStatus('${o.orderId}', this.value)" class="bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] rounded px-2 py-1 text-xs focus:border-blue-600 cursor-pointer shadow-sm">
                <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            ` : `
              <span class="text-[10px] text-[#94a3b8] font-mono px-2 py-1 bg-slate-50 rounded border border-slate-200">
                View Only
              </span>
            `}
            <button onclick="renderAdminOrderDetailView('${o.orderId}')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold rounded border border-blue-200 transition-colors shadow-2xs flex items-center space-x-1">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>View</span>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="py-8 text-center text-xs text-[#64748b]">No orders found for your branch.</td></tr>';
}

export async function changeOrderStatus(orderId, newStatus) {
  const activeUser = getCurrentUser();
  const order = getOrderById(orderId);

  if (activeUser && !activeUser.hasGlobalAccess() && order && !activeUser.canManageBranch(order.fulfillmentBranchId)) {
    etechAlert.error('Permission Denied', `You are only authorized to modify orders assigned to your branch (${activeUser.assignedBranch}).`);
    return;
  }

  const confirmed = await etechAlert.confirm({
    title: `Update Order Status?`,
    message: `Change Order #${orderId} fulfillment status to "${newStatus}"?`,
    type: 'update',
    confirmText: 'Update Status',
    cancelText: 'Cancel'
  });

  if (!confirmed) {
    await renderOrdersTab();
    return;
  }

  try {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      if (window.showToast) window.showToast(res.message, 'success');
    } else {
      etechAlert.error('Status Update Failed', res.message);
    }
    await renderOrdersTab();
  } catch (err) {
    etechAlert.error('Status Update Failed', err.message || 'Failed to update order status. Please try again.');
    await renderOrdersTab();
  }
}

/**
 * ============================================================
 * ADMIN ORDER DETAIL VIEW — Full order inspection & processing
 * ============================================================
 */
export async function renderAdminOrderDetailView(orderId) {
  const listView = document.getElementById('orders-list-view');
  const detailView = document.getElementById('admin-order-detail-view');
  if (!listView || !detailView) return;

  // Try fetching fresh from API first
  let order = null;
  try {
    const dto = await OrdersApi.getByCode(orderId);
    if (dto) {
      order = normalizeOrderFromApi(dto);
    }
  } catch (err) {
    console.warn('[AdminOrderDetail] API fetch failed, falling back to memory:', err.message);
  }

  // Fallback to memory
  if (!order) {
    order = getOrderById(orderId);
  }

  if (!order) {
    if (window.showToast) window.showToast('Order not found.', 'error');
    return;
  }

  const activeUser = getCurrentUser();
  const canModifyOrder = activeUser && (activeUser.hasGlobalAccess() || activeUser.canManageBranch(order.fulfillmentBranchId));

  const status = order.status || 'Pending';
  const isCancelled = status === 'Cancelled';
  const isDelivered = status === 'Delivered';

  const totalNum = parseLKR(order.totalAmount || order.total);
  const subtotalNum = parseLKR(order.subtotal || order.subtotalAmount) || totalNum;
  const shippingNum = parseLKR(order.shipping || order.shippingAmount);
  const taxNum = parseLKR(order.tax || order.taxAmount);

  // Step states for tracking pipeline
  let currentStep = 0;
  if (status === 'Processing') currentStep = 1;
  else if (status === 'Shipped') currentStep = 2;
  else if (status === 'Delivered') currentStep = 3;

  // Check if delivery coordinates are available
  const hasDeliveryCoords = order.deliveryLatitude != null && order.deliveryLongitude != null;

  detailView.innerHTML = `
    <div class="space-y-6">
      <!-- Back Button & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <button onclick="backToOrdersList()" class="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-[#f8fafc] text-[#475569] hover:text-[#0f172a] text-xs font-bold rounded-lg border border-[#e2e8f0] shadow-xs transition-all">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span>Back to Orders</span>
          </button>
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="text-xl font-black text-[#0f172a] font-mono tracking-tight">Order #${order.orderId}</h2>
              <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide whitespace-nowrap shadow-2xs ${getStatusStyle(status)}">
                ${isCancelled ? `${iconClose('w-3.5 h-3.5')}<span>Cancelled</span>` : (isDelivered ? `${iconCheck('w-3.5 h-3.5')}<span>Delivered</span>` : `<span>●</span><span>${status}</span>`)}
              </span>
            </div>
            <p class="text-[11px] text-[#64748b] mt-0.5">Placed on <strong class="text-[#0f172a]">${order.date}</strong> &bull; Payment: <strong class="text-[#0f172a]">${order.paymentMethod}</strong></p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <!-- Left Column: Order Items -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Order Items Card -->
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-4">
            <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span>Ordered Items (${(order.items || []).length})</span>
              </h3>
              <span class="text-[10px] text-blue-600 font-semibold">View Only — Click item to inspect product</span>
            </div>

            <div class="space-y-3">
              ${(order.items || []).map((item, idx) => `
                <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-[#e2e8f0] hover:border-blue-400 hover:bg-blue-50/20 transition-all bg-[#f8fafc] gap-3">
                  <!-- Product clickable area -->
                  <a href="#product?id=${item.productId || item.id}" class="flex items-center space-x-3.5 flex-1 min-w-0 group">
                    <div class="relative flex-shrink-0">
                      <img src="${item.image || item.productImage || 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=600&q=80'}" 
                           alt="${item.name || item.productName}" 
                           class="w-14 h-14 object-cover rounded-lg border border-[#e2e8f0] bg-white group-hover:scale-105 transition-transform">
                      <span class="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">${idx + 1}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                      <h4 class="text-xs sm:text-sm font-bold text-[#0f172a] group-hover:text-blue-600 transition-colors line-clamp-2">${item.name || item.productName}</h4>
                      <p class="text-xs text-[#64748b] font-mono mt-0.5">Rs. ${parseFloat(item.price || item.unitPrice || 0).toLocaleString()} &times; <span class="font-bold text-[#0f172a]">Qty: ${item.quantity}</span></p>
                      ${item.productSku ? `<p class="text-[10px] text-[#94a3b8] font-mono mt-0.5">SKU: ${item.productSku}</p>` : ''}
                      <span class="inline-flex items-center space-x-1 text-[10px] text-blue-600 font-semibold mt-1">
                        <span>View Product Details &amp; Specs</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  </a>
                  <!-- Line Total -->
                  <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#e2e8f0] flex-shrink-0">
                    <span class="text-sm font-extrabold text-[#0f172a] font-mono">
                      Rs. ${(parseFloat(item.price || item.unitPrice || 0) * parseInt(item.quantity || 1)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <a href="#product?id=${item.productId || item.id}" class="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 text-[11px] font-bold rounded border border-blue-200 mt-1 transition-colors shadow-2xs">
                      Inspect
                    </a>
                  </div>
                </div>
              `).join('') || '<p class="text-xs text-[#64748b] text-center py-4">No items in this order.</p>'}
            </div>
          </div>

          <!-- Tracking Progress Pipeline -->
          ${!isCancelled ? `
            <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-4">
              <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2 border-b border-[#e2e8f0] pb-3">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                <span>Order Tracking Progress</span>
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <!-- Step 1: Placed -->
                <div class="relative p-3.5 rounded-xl border ${currentStep >= 0 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
                  <div class="flex items-center space-x-2.5 mb-1.5">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 0 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                      ${iconCheck('w-3.5 h-3.5')}
                    </div>
                    <span class="text-xs font-bold text-[#0f172a]">1. Placed</span>
                  </div>
                  <p class="text-[11px] text-[#64748b]">Confirmed & Verified</p>
                </div>
                <!-- Step 2: Processing -->
                <div class="relative p-3.5 rounded-xl border ${currentStep >= 1 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
                  <div class="flex items-center space-x-2.5 mb-1.5">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                      ${currentStep >= 1 ? iconCheck('w-3.5 h-3.5') : '2'}
                    </div>
                    <span class="text-xs font-bold text-[#0f172a]">2. Processing</span>
                  </div>
                  <p class="text-[11px] text-[#64748b]">Picking & Packaging</p>
                </div>
                <!-- Step 3: Shipped -->
                <div class="relative p-3.5 rounded-xl border ${currentStep >= 2 ? 'bg-blue-50/70 border-blue-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
                  <div class="flex items-center space-x-2.5 mb-1.5">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                      ${currentStep >= 2 ? iconCheck('w-3.5 h-3.5') : '3'}
                    </div>
                    <span class="text-xs font-bold text-[#0f172a]">3. Shipped</span>
                  </div>
                  <p class="text-[11px] text-[#64748b]">Out for Delivery</p>
                </div>
                <!-- Step 4: Delivered -->
                <div class="relative p-3.5 rounded-xl border ${currentStep >= 3 ? 'bg-emerald-50 border-emerald-200' : 'bg-[#f8fafc] border-[#e2e8f0]'}">
                  <div class="flex items-center space-x-2.5 mb-1.5">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${currentStep >= 3 ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[#e2e8f0] text-[#64748b]'}">
                      ${currentStep >= 3 ? iconCheck('w-3.5 h-3.5') : '4'}
                    </div>
                    <span class="text-xs font-bold text-[#0f172a]">4. Delivered</span>
                  </div>
                  <p class="text-[11px] text-[#64748b]">${currentStep >= 3 ? 'Completed' : 'Pending'}</p>
                </div>
              </div>
            </div>
          ` : `
            <!-- Cancellation Banner -->
            <div class="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm text-xs text-rose-800 space-y-1.5">
              <div class="flex items-center space-x-2 font-bold text-rose-900">
                <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>This order has been cancelled</span>
              </div>
              <p class="text-[#64748b]">Reason: <strong class="text-[#0f172a]">${order.cancellationReason || 'Not specified'}</strong></p>
            </div>
          `}

          <!-- Delivery Location Map -->
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-[#e2e8f0] pb-3">
              <h3 class="text-sm font-extrabold text-[#0f172a] flex items-center space-x-2">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Order Delivery Location</span>
              </h3>
              ${hasDeliveryCoords ? `<span class="text-[10px] font-mono text-[#64748b]">${order.deliveryLatitude.toFixed(6)}, ${order.deliveryLongitude.toFixed(6)}</span>` : ''}
            </div>
            ${hasDeliveryCoords ? `
              <div id="admin-order-delivery-map" class="w-full h-64 rounded-lg border border-[#e2e8f0] bg-[#f8fafc]"></div>
              <div class="flex items-center space-x-2 text-[11px] text-[#64748b]">
                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Customer pinned delivery location at <strong class="text-[#0f172a] font-mono">${order.deliveryLatitude.toFixed(6)}, ${order.deliveryLongitude.toFixed(6)}</strong></span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center py-8 text-center space-y-2">
                <div class="w-12 h-12 rounded-full bg-[#f1f5f9] flex items-center justify-center">
                  <svg class="w-6 h-6 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <p class="text-xs font-semibold text-[#64748b]">No delivery location pinned</p>
                <p class="text-[10px] text-[#94a3b8]">Customer did not pin a map location during checkout</p>
              </div>
            `}
          </div>
        </div>

        <!-- Right Column: Summary, Customer Info & Process Order -->
        <div class="lg:col-span-4 space-y-6">

          <!-- Payment & Pricing Breakdown -->
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3.5">
            <h3 class="text-sm font-extrabold text-[#0f172a] border-b border-[#e2e8f0] pb-2.5">Payment & Pricing</h3>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between text-[#64748b]">
                <span>Subtotal:</span>
                <span class="font-mono font-bold text-[#0f172a]">Rs. ${subtotalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="flex justify-between text-[#64748b]">
                <span>Delivery Fee:</span>
                <span class="font-mono font-semibold text-[#0f172a]">${shippingNum > 0 ? `Rs. ${shippingNum.toLocaleString()}` : 'Free'}</span>
              </div>
              ${taxNum > 0 ? `
                <div class="flex justify-between text-[#64748b]">
                  <span>Tax:</span>
                  <span class="font-mono font-semibold text-[#0f172a]">Rs. ${taxNum.toLocaleString()}</span>
                </div>
              ` : ''}
              <div class="pt-2 border-t border-[#e2e8f0] flex justify-between items-center">
                <span class="text-sm font-black text-[#0f172a]">Total:</span>
                <span class="text-base font-black text-blue-600 font-mono">Rs. ${totalNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div class="bg-[#f8fafc] p-2.5 rounded-lg border border-[#e2e8f0] text-xs space-y-1">
              <div class="flex justify-between">
                <span class="text-[#64748b]">Method:</span>
                <span class="font-bold text-[#0f172a]">${order.paymentMethod}</span>
              </div>
            </div>
          </div>

          <!-- Customer & Delivery Info -->
          <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3">
            <h3 class="text-sm font-extrabold text-[#0f172a] border-b border-[#e2e8f0] pb-2.5">Customer & Delivery</h3>
            <div class="text-xs space-y-2 text-[#475569]">
              <div class="flex items-start space-x-2">
                <svg class="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <div>
                  <p class="font-bold text-[#0f172a]">${order.customerName}</p>
                  <p class="text-[11px] text-blue-600 font-mono">${order.email}</p>
                  ${order.phone ? `<p class="text-[11px] text-[#64748b]">Phone: ${order.phone}</p>` : ''}
                </div>
              </div>
              <div class="flex items-start space-x-2">
                <svg class="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <div>
                  <p class="text-[11px] text-[#64748b]">${order.address ? `${order.address}, ` : ''}${order.city || 'Colombo'}</p>
                </div>
              </div>
              <div class="flex items-start space-x-2">
                <svg class="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                <div>
                  <p class="text-[11px] text-[#64748b]">Dispatch Hub: <strong class="text-[#0f172a]">${order.fulfillmentBranch || 'Colombo Hub'}</strong></p>
                  <p class="text-[10px] text-[#64748b]">Distance: ${order.distanceKm || 5} km</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Process Order (Status Change) -->
          ${canModifyOrder ? `
            <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm space-y-3.5">
              <h3 class="text-sm font-extrabold text-[#0f172a] border-b border-[#e2e8f0] pb-2.5 flex items-center space-x-2">
                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span>Process Order</span>
              </h3>
              <div class="space-y-3">
                <div>
                  <label class="block text-[11px] font-bold text-[#475569] mb-1.5">Update Fulfillment Status</label>
                  <select id="admin-order-status-select" class="w-full px-3 py-2.5 text-xs rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] focus:border-blue-600 focus:outline-none shadow-xs font-semibold">
                    <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="Processing" ${status === 'Processing' ? 'selected' : ''}>🔄 Processing</option>
                    <option value="Shipped" ${status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
                    <option value="Delivered" ${status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
                    <option value="Cancelled" ${status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
                  </select>
                </div>
                <button onclick="handleAdminOrderStatusUpdate('${order.orderId}')" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  <span>Update Status</span>
                </button>
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;

  // Toggle views
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');

  // Initialize delivery map if coordinates are available
  if (hasDeliveryCoords) {
    setTimeout(() => {
      const mapEl = document.getElementById('admin-order-delivery-map');
      if (mapEl && typeof L !== 'undefined') {
        const map = L.map(mapEl).setView([order.deliveryLatitude, order.deliveryLongitude], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        L.marker([order.deliveryLatitude, order.deliveryLongitude]).addTo(map)
          .bindPopup(`<b>Delivery Location</b><br>${order.address || order.city || 'Customer Address'}`).openPopup();
      }
    }, 200);
  }
}

/**
 * Navigate back to the orders list view from the detail view
 */
export async function backToOrdersList() {
  const listView = document.getElementById('orders-list-view');
  const detailView = document.getElementById('admin-order-detail-view');
  if (listView) listView.classList.remove('hidden');
  if (detailView) {
    detailView.classList.add('hidden');
    detailView.innerHTML = '';
  }
  // Refresh the orders list
  await renderOrdersTab();
}

/**
 * Handle admin status update from the detail view
 */
export async function handleAdminOrderStatusUpdate(orderId) {
  const select = document.getElementById('admin-order-status-select');
  if (!select) return;

  const newStatus = select.value;
  const activeUser = getCurrentUser();
  const order = getOrderById(orderId);

  if (activeUser && !activeUser.hasGlobalAccess() && order && !activeUser.canManageBranch(order.fulfillmentBranchId)) {
    etechAlert.error('Permission Denied', `You are only authorized to modify orders assigned to your branch.`);
    return;
  }

  const confirmed = await etechAlert.confirm({
    title: `Update Order Status?`,
    message: `Change Order #${orderId} fulfillment status to "${newStatus}"?`,
    type: 'update',
    confirmText: 'Update Status',
    cancelText: 'Cancel'
  });

  if (!confirmed) return;

  try {
    const res = await updateOrderStatus(orderId, newStatus);
    if (res.success) {
      if (window.showToast) window.showToast(res.message, 'success');
      // Re-render the detail view with updated data
      await renderAdminOrderDetailView(orderId);
    } else {
      etechAlert.error('Status Update Failed', res.message);
    }
  } catch (err) {
    etechAlert.error('Status Update Failed', err.message || 'Failed to update order status. Please try again.');
  }
}

// ── Status Pill Styles ──
export function getStatusStyle(status) {
  switch (status) {
    case 'Processing': return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'Shipped': return 'bg-sky-50 text-sky-700 border border-sky-200';
    case 'Delivered': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'Cancelled': return 'bg-rose-50 text-rose-700 border border-rose-200';
    default: return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
}