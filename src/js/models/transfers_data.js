// ============================================================
//  transfers_data.js — Inter-Branch Stock Transfers In-Memory Model Layer
// ============================================================
import { getStoredProducts, saveStoredProducts } from './data.js';
import { getBranches } from '../controller/branch_controller.js';
import { DEFAULT_TRANSFERS } from '../../data/transfers.js';
import { TransfersApi } from '../api/transfersApi.js';

export { DEFAULT_TRANSFERS };

export const TRANSFERS_STORAGE_KEY = 'etech_stock_transfers';

// Reactive In-Memory Transfers Store
let memoryTransfers = Array.isArray(DEFAULT_TRANSFERS) ? DEFAULT_TRANSFERS.map(t => ({ ...t })) : [];

/**
 * Sync transfers from backend API
 */
export async function syncTransfersFromApi() {
  try {
    const res = await TransfersApi.getAll();
    let apiList = [];
    if (Array.isArray(res)) {
      apiList = res;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
    }

    if (apiList.length > 0) {
      memoryTransfers = apiList.map(t => ({ ...t }));
    }
  } catch (err) {
    console.warn('[TransfersModel] Transfers sync notice:', err.message);
  }
}

/**
 * Retrieve all stock transfer records
 */
export function getStockTransfers() {
  return memoryTransfers;
}

/**
 * Save stock transfers array
 */
export function saveStockTransfers(transfersList) {
  if (Array.isArray(transfersList)) {
    memoryTransfers = [...transfersList];
  }
}

/**
 * Create a new stock transfer request
 */
export async function createStockTransfer(transferData) {
  const list = memoryTransfers;
  const products = getStoredProducts();
  const branches = getBranches();

  const product = products.find(p => p.id === Number(transferData.productId));
  if (!product) return { success: false, message: 'Product not found.' };

  const fromBranch = branches.find(b => b.id === transferData.fromBranchId);
  const toBranch = branches.find(b => b.id === transferData.toBranchId);

  if (!fromBranch || !toBranch || fromBranch.id === toBranch.id) {
    return { success: false, message: 'Invalid source or destination branch.' };
  }

  const qty = Math.max(1, parseInt(transferData.quantity) || 1);
  const availableAtSource = (product.branchStock && product.branchStock[fromBranch.id]) || 0;

  if (availableAtSource < qty) {
    return { 
      success: false, 
      message: `Insufficient stock at ${fromBranch.name}. Available: ${availableAtSource}, requested: ${qty}.` 
    };
  }

  const initialStatus = transferData.instantDelivery ? "Received" : (transferData.status || "Requested");

  if (initialStatus === "In Transit") {
    product.branchStock[fromBranch.id] = Math.max(0, availableAtSource - qty);
    product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);
  }

  if (transferData.instantDelivery) {
    product.branchStock[fromBranch.id] = Math.max(0, availableAtSource - qty);
    if (!product.branchStock[toBranch.id]) product.branchStock[toBranch.id] = 0;
    product.branchStock[toBranch.id] += qty;
    product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);
  }

  const nextSeq = list.length > 0 ? Math.max(...list.map(t => parseInt(String(t.id).replace('TRF-', '')) || 8000)) + 1 : 8001;
  const newTransfer = {
    id: `TRF-${nextSeq}`,
    referenceNo: `TRF-2026-${String(nextSeq).padStart(4, '0')}`,
    productId: product.id,
    productName: product.name,
    productSku: product.sku || `ETC-${product.id}`,
    productImage: product.image,
    fromBranchId: fromBranch.id,
    fromBranchName: fromBranch.name,
    toBranchId: toBranch.id,
    toBranchName: toBranch.name,
    quantity: qty,
    reason: transferData.reason || "General Stock Rebalancing",
    bundleId: transferData.bundleId || null,
    bundleTitle: transferData.bundleTitle || null,
    status: initialStatus,
    requestedBy: transferData.requestedBy || "Staff Member",
    dispatchedBy: initialStatus === "In Transit" || transferData.instantDelivery ? (transferData.dispatchedBy || "Warehouse Dispatch") : null,
    receivedBy: transferData.instantDelivery ? (transferData.receivedBy || "Destination Staff") : null,
    driverOrCourier: transferData.driverOrCourier || "ETech Logistics Fleet",
    trackingCode: transferData.trackingCode || `ET-LOG-${Math.floor(1000 + Math.random() * 9000)}`,
    notes: transferData.notes || "",
    createdAt: new Date().toISOString(),
    dispatchedAt: initialStatus === "In Transit" || transferData.instantDelivery ? new Date().toISOString() : null,
    receivedAt: transferData.instantDelivery ? new Date().toISOString() : null
  };

  list.unshift(newTransfer);

  try {
    await TransfersApi.initiate(newTransfer);
  } catch (e) {
    console.warn('[TransfersModel] Initiate transfer API notice:', e.message);
  }

  window.dispatchEvent(new Event('productsUpdated'));
  return { success: true, transfer: newTransfer };
}

/**
 * Approve & Dispatch an incoming transfer request
 */
export async function dispatchStockTransfer(transferId, dispatchedBy = 'Branch Dispatch Staff') {
  const list = memoryTransfers;
  const transfer = list.find(t => t.id === transferId);
  if (!transfer) return { success: false, message: 'Transfer record not found.' };

  if (transfer.status !== 'Requested') {
    return { success: false, message: `Cannot dispatch transfer in '${transfer.status}' status.` };
  }

  const products = getStoredProducts();
  const product = products.find(p => p.id === Number(transfer.productId));
  if (!product) return { success: false, message: 'Product record not found.' };

  const availableAtSource = (product.branchStock && product.branchStock[transfer.fromBranchId]) || 0;
  if (availableAtSource < transfer.quantity) {
    return { 
      success: false, 
      message: `Cannot dispatch: Insufficient stock at source branch (${availableAtSource} available, ${transfer.quantity} requested).` 
    };
  }

  product.branchStock[transfer.fromBranchId] = Math.max(0, availableAtSource - transfer.quantity);
  product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);

  transfer.status = 'In Transit';
  transfer.dispatchedAt = new Date().toISOString();
  transfer.dispatchedBy = dispatchedBy;

  try {
    await TransfersApi.updateStatus(transfer.id, 'IN_TRANSIT');
  } catch (e) {
    console.warn('[TransfersModel] Dispatch transfer API notice:', e.message);
  }

  window.dispatchEvent(new Event('productsUpdated'));
  return { success: true, transfer };
}

/**
 * Mark a transfer as Received & Verified at destination branch
 */
export async function receiveStockTransfer(transferId, receivedBy = 'Staff Verification') {
  const list = memoryTransfers;
  const transfer = list.find(t => t.id === transferId);
  if (!transfer) return { success: false, message: 'Transfer record not found.' };

  if (transfer.status === 'Received') {
    return { success: false, message: 'Transfer has already been received.' };
  }
  if (transfer.status === 'Cancelled') {
    return { success: false, message: 'Cannot receive a cancelled transfer.' };
  }
  if (transfer.status === 'Requested') {
    return { success: false, message: 'Transfer has not yet been approved & dispatched by the source branch.' };
  }

  const products = getStoredProducts();
  const product = products.find(p => p.id === Number(transfer.productId));
  if (product) {
    if (!product.branchStock) product.branchStock = { "BR-COL": 0, "BR-GAL": 0, "BR-MAT": 0, "BR-KAN": 0 };
    product.branchStock[transfer.toBranchId] = (product.branchStock[transfer.toBranchId] || 0) + transfer.quantity;
    product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);
  }

  transfer.status = 'Received';
  transfer.receivedAt = new Date().toISOString();
  transfer.receivedBy = receivedBy;

  try {
    await TransfersApi.updateStatus(transfer.id, 'RECEIVED');
  } catch (e) {
    console.warn('[TransfersModel] Receive transfer API notice:', e.message);
  }

  window.dispatchEvent(new Event('productsUpdated'));
  return { success: true, transfer };
}

/**
 * Cancel or Reject a transfer
 */
export async function cancelStockTransfer(transferId, reason = 'Cancelled', cancelledBy = 'Staff / Administrator') {
  const list = memoryTransfers;
  const transfer = list.find(t => t.id === transferId);
  if (!transfer) return { success: false, message: 'Transfer record not found.' };

  if (transfer.status === 'Received') {
    return { success: false, message: 'Cannot cancel a transfer that has already been received at destination.' };
  }
  if (transfer.status === 'Cancelled') {
    return { success: false, message: 'Transfer is already cancelled.' };
  }

  if (transfer.status === 'In Transit') {
    const products = getStoredProducts();
    const product = products.find(p => p.id === Number(transfer.productId));
    if (product && product.branchStock) {
      product.branchStock[transfer.fromBranchId] = (product.branchStock[transfer.fromBranchId] || 0) + transfer.quantity;
      product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);
    }
  }

  transfer.status = 'Cancelled';
  transfer.cancellationReason = reason;
  transfer.cancelledAt = new Date().toISOString();
  transfer.cancelledBy = cancelledBy;

  try {
    await TransfersApi.updateStatus(transfer.id, 'CANCELLED');
  } catch (e) {
    console.warn('[TransfersModel] Cancel transfer API notice:', e.message);
  }

  window.dispatchEvent(new Event('productsUpdated'));
  return { success: true, transfer };
}

/**
 * Get transfer metrics summary
 */
export function getTransfersMetrics() {
  const list = memoryTransfers;
  const inTransit = list.filter(t => t.status === 'In Transit').length;
  const received = list.filter(t => t.status === 'Received').length;
  const requested = list.filter(t => t.status === 'Requested').length;
  const cancelled = list.filter(t => t.status === 'Cancelled').length;
  const bundleTransfers = list.filter(t => t.reason === 'Deal Bundle Kit Assembly').length;
  const totalUnits = list.reduce((sum, t) => sum + (t.status !== 'Cancelled' ? t.quantity : 0), 0);

  return {
    total: list.length,
    inTransit,
    received,
    requested,
    cancelled,
    bundleTransfers,
    totalUnits
  };
}
