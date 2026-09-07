// ============================================================
//  src/js/controller/branch_controller.js — Branch & Logistics Module
// ============================================================
import { DEFAULT_BRANCHES, CITY_DISTANCES } from '../../data/branches.js';
import { BranchesApi } from '../api/branchesApi.js';

export { DEFAULT_BRANCHES, CITY_DISTANCES };

export const BRANCHES_STORAGE_KEY = 'etech_branches';

// Reactive In-Memory Store
let memoryBranches = Array.isArray(DEFAULT_BRANCHES) ? DEFAULT_BRANCHES.map(b => ({ ...b })) : [];

/**
 * Sync branches from backend API
 */
export async function syncBranchesFromApi(activeOnly = false) {
  try {
    const res = await BranchesApi.getAll(activeOnly);
    let apiList = [];
    if (Array.isArray(res)) {
      apiList = res;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
    }

    if (apiList.length > 0) {
      memoryBranches = apiList.map(b => ({
        id: b.id,
        name: b.name || '',
        city: b.city || '',
        address: b.address || '',
        phone: b.phone || b.hotline || '',
        email: b.email || '',
        baseShippingFee: parseFloat(b.baseShippingFee || b.baseRate || 300),
        perKmFee: parseFloat(b.perKmFee || 25),
        status: b.status || (b.active !== false ? 'Active' : 'Inactive')
      }));
    }
  } catch (err) {
    console.warn('[BranchController] Branches sync notice:', err.message);
  }
}

/**
 * Get all branches from in-memory state
 */
export function getBranches() {
  return memoryBranches;
}

/**
 * Save all branches array to in-memory state
 */
export function saveBranches(branches) {
  if (Array.isArray(branches)) {
    memoryBranches = [...branches];
  }
}

/**
 * Get branch by ID
 */
export function getBranchById(branchId) {
  return memoryBranches.find(b => b.id === branchId) || null;
}

/**
 * Save or update a single branch
 */
export async function saveBranch(branchData) {
  const branches = memoryBranches;
  const index = branches.findIndex(b => b.id === branchData.id);
  
  if (index > -1) {
    branches[index] = { ...branches[index], ...branchData };
    try {
      await BranchesApi.update(branches[index].id, branches[index]);
    } catch (e) {
      console.warn('[BranchController] Update branch API notice:', e.message);
    }
  } else {
    const newBranch = {
      id: branchData.id || 'BR-' + Math.floor(100 + Math.random() * 900),
      name: branchData.name,
      city: branchData.city,
      address: branchData.address || '',
      phone: branchData.phone || '',
      email: branchData.email || '',
      baseShippingFee: parseFloat(branchData.baseShippingFee) || 300,
      perKmFee: parseFloat(branchData.perKmFee) || 25,
      status: branchData.status || 'Active'
    };
    branches.push(newBranch);
    try {
      await BranchesApi.create(newBranch);
    } catch (e) {
      console.warn('[BranchController] Create branch API notice:', e.message);
    }
  }
  
  saveBranches(branches);
  return true;
}

/**
 * Delete branch by ID
 */
export async function deleteBranch(branchId) {
  memoryBranches = memoryBranches.filter(b => b.id !== branchId);
  try {
    await BranchesApi.delete(branchId);
  } catch (e) {
    console.warn('[BranchController] Delete branch API notice:', e.message);
  }
  return true;
}

/**
 * Calculate distance in KM between a branch city and destination city
 */
export function calculateDistanceKm(branchCity, destCity) {
  const bCity = branchCity || "Colombo";
  const dCity = destCity || "Colombo";
  
  if (bCity === dCity) return 5;
  
  if (CITY_DISTANCES[bCity] && CITY_DISTANCES[bCity][dCity]) {
    return CITY_DISTANCES[bCity][dCity];
  }
  
  return 80;
}

/**
 * Calculate shipping fee based on branch and destination city
 */
export function calculateShippingFee(branchId, destinationCity) {
  const branch = getBranchById(branchId) || getBranches()[0] || { city: 'Colombo', baseShippingFee: 300, perKmFee: 25 };
  const distanceKm = calculateDistanceKm(branch.city, destinationCity);
  
  const fee = (branch.baseShippingFee || 300) + (distanceKm * (branch.perKmFee || 25));
  return {
    distanceKm,
    fee: Math.round(fee),
    branchName: branch.name,
    branchCity: branch.city
  };
}

/**
 * AUTOMATIC FULFILLMENT BRANCH SELECTION
 */
export function autoSelectFulfillmentBranch(cartItems, customerCity, productsList) {
  const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
  if (!branches.length) return null;

  let bestBranch = null;
  let minDistance = Infinity;

  for (const branch of branches) {
    let hasStockForAll = true;
    for (const item of cartItems) {
      if (item.isBundle && Array.isArray(item.bundleComponents)) {
        for (const comp of item.bundleComponents) {
          const compProduct = productsList.find(p => p.id === Number(comp.productId));
          if (compProduct && compProduct.branchStock) {
            const compStock = compProduct.branchStock[branch.id] || 0;
            if (compStock < ((comp.qty || 1) * item.quantity)) {
              hasStockForAll = false;
              break;
            }
          }
        }
      } else {
        const product = productsList.find(p => p.id === Number(item.id));
        if (product && product.branchStock) {
          const stockInBranch = product.branchStock[branch.id] || 0;
          if (stockInBranch < item.quantity) {
            hasStockForAll = false;
            break;
          }
        }
      }
      if (!hasStockForAll) break;
    }

    if (hasStockForAll) {
      const dist = calculateDistanceKm(branch.city, customerCity);
      if (dist < minDistance) {
        minDistance = dist;
        bestBranch = branch;
      }
    }
  }

  if (!bestBranch) {
    bestBranch = branches[0];
    minDistance = calculateDistanceKm(bestBranch.city, customerCity);
  }

  const shippingCalc = calculateShippingFee(bestBranch.id, customerCity);

  return {
    branch: bestBranch,
    distanceKm: shippingCalc.distanceKm,
    shippingFee: shippingCalc.fee
  };
}
