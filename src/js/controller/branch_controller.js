// ============================================================
//  src/js/controller/branch_controller.js — Branch & Logistics Module
//  Leaflet.js + OpenStreetMap Geodesic Distance Engine
// ============================================================
import { BranchesApi } from '../api/branchesApi.js';
import { getProductBranchStock } from '../models/data.js';

export const DEFAULT_BRANCHES = [];
export const BRANCHES_STORAGE_KEY = 'etech_branches';

/**
 * Standard Sri Lankan Districts GPS Coordinates (Centroids)
 * Covers all 25 districts across all 9 provinces
 */
export const SRI_LANKA_DISTRICTS_COORDS = {
  // Western Province
  "Colombo": { lat: 6.9271, lng: 79.8612, name: "Colombo" },
  "Gampaha": { lat: 7.0840, lng: 79.9939, name: "Gampaha" },
  "Kalutara": { lat: 6.5854, lng: 79.9607, name: "Kalutara" },

  // Central Province
  "Kandy": { lat: 7.2906, lng: 80.6337, name: "Kandy" },
  "Matale": { lat: 7.4675, lng: 80.6234, name: "Matale" },
  "Nuwara Eliya": { lat: 6.9497, lng: 80.7891, name: "Nuwara Eliya" },

  // Southern Province
  "Galle": { lat: 6.0535, lng: 80.2210, name: "Galle" },
  "Matara": { lat: 5.9549, lng: 80.5550, name: "Matara" },
  "Hambantota": { lat: 6.1429, lng: 81.1212, name: "Hambantota" },

  // Northern Province
  "Jaffna": { lat: 9.6615, lng: 80.0255, name: "Jaffna" },
  "Kilinochchi": { lat: 9.3803, lng: 80.3770, name: "Kilinochchi" },
  "Mannar": { lat: 8.9810, lng: 79.9044, name: "Mannar" },
  "Vavuniya": { lat: 8.7542, lng: 80.4982, name: "Vavuniya" },
  "Mullaitivu": { lat: 9.2671, lng: 80.8143, name: "Mullaitivu" },

  // Eastern Province
  "Batticaloa": { lat: 7.7310, lng: 81.6747, name: "Batticaloa" },
  "Ampara": { lat: 7.2912, lng: 81.6724, name: "Ampara" },
  "Trincomalee": { lat: 8.5874, lng: 81.2152, name: "Trincomalee" },

  // North Western Province
  "Kurunegala": { lat: 7.4863, lng: 80.3623, name: "Kurunegala" },
  "Puttalam": { lat: 8.0408, lng: 79.8394, name: "Puttalam" },

  // North Central Province
  "Anuradhapura": { lat: 8.3114, lng: 80.4037, name: "Anuradhapura" },
  "Polonnaruwa": { lat: 7.9403, lng: 81.0188, name: "Polonnaruwa" },

  // Uva Province
  "Badulla": { lat: 6.9934, lng: 81.0550, name: "Badulla" },
  "Monaragala": { lat: 6.8728, lng: 81.3507, name: "Monaragala" },

  // Sabaragamuwa Province
  "Ratnapura": { lat: 6.6828, lng: 80.4037, name: "Ratnapura" },
  "Kegalle": { lat: 7.2513, lng: 80.3464, name: "Kegalle" },

  // Common Key Cities / Towns
  "Negombo": { lat: 7.2008, lng: 79.8737, name: "Negombo" },
  "Dehiwala": { lat: 6.8301, lng: 79.8801, name: "Dehiwala" },
  "Moratuwa": { lat: 6.7730, lng: 79.8816, name: "Moratuwa" }
};

/**
 * Branch Warehouse Default Coordinates
 */
export const BRANCH_WAREHOUSE_COORDS = {
  "BR-COL": { lat: 6.9271, lng: 79.8612, city: "Colombo", name: "Colombo Main Hub" },
  "BR-KAN": { lat: 7.2906, lng: 80.6337, city: "Kandy", name: "Kandy Tech Hub" },
  "BR-GAL": { lat: 6.0535, lng: 80.2210, city: "Galle", name: "Galle Coastal Center" },
  "BR-MAT": { lat: 5.9549, lng: 80.5550, city: "Matara", name: "Matara Express Depot" }
};

// Reactive In-Memory Store
let memoryBranches = [];

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
        latitude: (b.latitude !== undefined && b.latitude !== null && !isNaN(b.latitude)) ? parseFloat(b.latitude) : null,
        longitude: (b.longitude !== undefined && b.longitude !== null && !isNaN(b.longitude)) ? parseFloat(b.longitude) : null,
        baseShippingFee: parseFloat(b.baseShippingFee || b.baseShippingRate || b.baseRate || 350),
        perKmFee: parseFloat(b.perKmFee || 25),
        status: b.status || (b.active !== false ? 'Active' : 'Inactive')
      }));
    }
  } catch (err) {
    console.error('[BranchController] Branches sync error:', err.message);
    throw err;
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
  
  const lat = (branchData.latitude !== undefined && branchData.latitude !== null && !isNaN(branchData.latitude))
    ? parseFloat(branchData.latitude)
    : 6.9271;
  const lng = (branchData.longitude !== undefined && branchData.longitude !== null && !isNaN(branchData.longitude))
    ? parseFloat(branchData.longitude)
    : 79.8612;
  const baseRate = parseFloat(branchData.baseShippingFee || branchData.baseShippingRate || 350);
  const kmRate = parseFloat(branchData.perKmFee || 25);
  const isActive = branchData.status === 'Active' || branchData.active === true;

  const payload = {
    id: branchData.id,
    name: branchData.name.trim(),
    city: branchData.city.trim(),
    address: (branchData.address || '').trim(),
    phone: (branchData.phone || '').trim(),
    email: (branchData.email || `${branchData.city.toLowerCase().replace(/\s+/g, '')}@etechcomputers.lk`).trim(),
    latitude: lat,
    longitude: lng,
    baseShippingRate: baseRate,
    baseShippingFee: baseRate,
    perKmFee: kmRate,
    active: isActive,
    status: isActive ? 'Active' : 'Inactive'
  };

  if (index > -1) {
    branches[index] = { ...branches[index], ...payload };
    try {
      await BranchesApi.update(branches[index].id, payload);
    } catch (err) {
      console.warn('[BranchController] Backend update fallback:', err);
    }
  } else {
    if (!payload.id || !payload.id.trim()) {
      const cityPrefix = (payload.city || 'HUB').substring(0, 3).toUpperCase();
      payload.id = 'BR-' + cityPrefix;
    }
    branches.push(payload);
    try {
      await BranchesApi.create(payload);
    } catch (err) {
      console.warn('[BranchController] Backend create fallback:', err);
    }
  }
  
  saveBranches(branches);
  return payload;
}

/**
 * Delete branch by ID
 */
export async function deleteBranch(branchId) {
  memoryBranches = memoryBranches.filter(b => b.id !== branchId);
  try {
    await BranchesApi.delete(branchId);
  } catch (err) {
    console.warn('[BranchController] Backend delete fallback:', err);
  }
  return true;
}

/**
 * Resolves GPS Coordinates for a Branch
 * Prioritizes real stored latitude and longitude so live branch configuration feeds into checkout
 */
export function getBranchCoords(branch) {
  if (!branch) return { lat: 6.9271, lng: 79.8612, name: 'Colombo Main Hub', city: 'Colombo' };
  
  // 1. Check real saved coordinates on branch object
  if (branch.latitude !== undefined && branch.latitude !== null && !isNaN(branch.latitude) &&
      branch.longitude !== undefined && branch.longitude !== null && !isNaN(branch.longitude)) {
    return {
      lat: parseFloat(branch.latitude),
      lng: parseFloat(branch.longitude),
      name: branch.name,
      city: branch.city
    };
  }

  // 2. Fallback to warehouse dictionary
  if (BRANCH_WAREHOUSE_COORDS[branch.id]) {
    return BRANCH_WAREHOUSE_COORDS[branch.id];
  }

  // 3. Fallback to district centroid
  const cityKey = (branch.city || '').trim();
  const matchedCity = Object.keys(SRI_LANKA_DISTRICTS_COORDS).find(k => k.toLowerCase() === cityKey.toLowerCase());
  if (matchedCity) {
    return { ...SRI_LANKA_DISTRICTS_COORDS[matchedCity], name: branch.name, city: branch.city };
  }

  return { lat: 6.9271, lng: 79.8612, name: branch.name, city: branch.city };
}

/**
 * Resolves GPS Coordinates for any city / district name or object
 */
export function resolveLocationCoords(location) {
  if (!location) return { lat: 6.9271, lng: 79.8612, name: 'Colombo' };
  if (typeof location === 'object' && location.lat !== undefined && location.lng !== undefined) {
    return location;
  }
  if (Array.isArray(location) && location.length >= 2) {
    return { lat: Number(location[0]), lng: Number(location[1]), name: 'Custom Pin' };
  }

  const str = String(location).trim().toLowerCase();
  const matchedKey = Object.keys(SRI_LANKA_DISTRICTS_COORDS).find(k => k.toLowerCase() === str);
  if (matchedKey) {
    return SRI_LANKA_DISTRICTS_COORDS[matchedKey];
  }

  // Partial match fallback
  const partialKey = Object.keys(SRI_LANKA_DISTRICTS_COORDS).find(k => str.includes(k.toLowerCase()) || k.toLowerCase().includes(str));
  if (partialKey) {
    return SRI_LANKA_DISTRICTS_COORDS[partialKey];
  }

  return { lat: 6.9271, lng: 79.8612, name: 'Colombo' };
}

/**
 * Real Geodesic Haversine Distance in Kilometers
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.max(2, Math.round(dist * 10) / 10);
}

/**
 * Calculate distance in KM between a branch (or city) and destination (or city/coordinates)
 */
export function calculateDistanceKm(branchLocation, destLocation) {
  const bCoords = resolveLocationCoords(branchLocation);
  const dCoords = resolveLocationCoords(destLocation);
  return calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, dCoords.lat, dCoords.lng);
}

/**
 * Calculate shipping fee based on branch and destination
 */
export function calculateShippingFee(branchId, destination) {
  const branch = getBranchById(branchId) || getBranches()[0] || { city: 'Colombo', baseShippingFee: 300, perKmFee: 25 };
  const bCoords = getBranchCoords(branch);
  const dCoords = resolveLocationCoords(destination);
  const distanceKm = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, dCoords.lat, dCoords.lng);

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
 * Selects nearest branch that possesses all required inventory stock
 */
export function autoSelectFulfillmentBranch(cartItems, customerDestination, productsList) {
  const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
  if (!branches.length) return null;

  const destCoords = resolveLocationCoords(customerDestination);
  let bestBranch = null;
  let minDistance = Infinity;

  for (const branch of branches) {
    let hasStockForAll = true;

    for (const item of cartItems) {
      if (item.isBundle && Array.isArray(item.bundleComponents)) {
        for (const comp of item.bundleComponents) {
          const compProduct = productsList.find(p => p.id === Number(comp.productId));
          if (compProduct) {
            const compStock = getProductBranchStock(compProduct, branch.id);
            if (compStock < ((comp.qty || 1) * item.quantity)) {
              hasStockForAll = false;
              break;
            }
          }
        }
      } else {
        // Individual product or composite bundle line item
        const targetId = Number(item.productId || item.id);
        const product = productsList.find(p => p.id === targetId);
        if (product) {
          const stockInBranch = getProductBranchStock(product, branch.id);
          if (stockInBranch < item.quantity) {
            hasStockForAll = false;
            break;
          }
        }
      }
      if (!hasStockForAll) break;
    }

    if (hasStockForAll) {
      const bCoords = getBranchCoords(branch);
      const dist = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, destCoords.lat, destCoords.lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestBranch = branch;
      }
    }
  }

  let hasSufficientStock = true;

  // Fallback to closest branch if no single branch has 100% stock
  if (!bestBranch) {
    hasSufficientStock = false;
    for (const branch of branches) {
      const bCoords = getBranchCoords(branch);
      const dist = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, destCoords.lat, destCoords.lng);
      if (dist < minDistance) {
        minDistance = dist;
        bestBranch = branch;
      }
    }
    if (!bestBranch) {
      bestBranch = branches[0];
      minDistance = 5;
    }
  }

  const shippingCalc = calculateShippingFee(bestBranch.id, destCoords);

  return {
    branch: bestBranch,
    hasSufficientStock: hasSufficientStock,
    distanceKm: shippingCalc.distanceKm,
    shippingFee: shippingCalc.fee,
    coords: destCoords
  };
}

/* ============================================================
 * LEAFLET.JS INTERACTIVE CHECKOUT MAP
 * ============================================================ */
let checkoutLeafletMap = null;
let customerMarker = null;
let routePolyline = null;
let branchMarkers = [];
let mapInitialized = false;

/**
 * Initialize Interactive OpenStreetMap in Checkout
 */
export function initCheckoutMap(containerId = 'checkout-delivery-map', onLocationChanged) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  if (typeof window.L === 'undefined') {
    console.warn('[CheckoutMap] Leaflet.js not loaded yet. Retrying...');
    setTimeout(() => initCheckoutMap(containerId, onLocationChanged), 300);
    return null;
  }

  // If map already exists on this container, invalidate size & refresh
  if (checkoutLeafletMap) {
    try {
      checkoutLeafletMap.invalidateSize();
      return checkoutLeafletMap;
    } catch (e) {
      checkoutLeafletMap = null;
    }
  }

  // Sri Lanka Geographic Center [7.8731, 80.7718], Zoom 7.5
  checkoutLeafletMap = L.map(containerId, {
    center: [7.8731, 80.7718],
    zoom: 7,
    minZoom: 6,
    maxZoom: 18,
    zoomControl: true
  });

  // OpenStreetMap Tile Layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(checkoutLeafletMap);

  // Warehouse Branch Icon (Blue Hub Pin)
  const warehouseIcon = L.divIcon({
    className: 'custom-warehouse-pin',
    html: `
      <div style="background-color: #2563eb; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37,99,235,0.4); border: 2px solid white; font-size: 14px;">
        🏢
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });

  // Customer Destination Icon (Emerald Draggable Pin)
  const customerIcon = L.divIcon({
    className: 'custom-customer-pin',
    html: `
      <div style="background-color: #10b981; color: white; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.5); border: 2px solid white;">
        <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });

  // Plot active branch markers
  branchMarkers.forEach(m => checkoutLeafletMap.removeLayer(m));
  branchMarkers = [];

  const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
  branches.forEach(branch => {
    const coords = getBranchCoords(branch);
    const marker = L.marker([coords.lat, coords.lng], { icon: warehouseIcon }).addTo(checkoutLeafletMap);
    marker.bindPopup(`
      <div style="font-family: inherit; padding: 2px;">
        <strong style="color: #0f172a; font-size: 13px;">${branch.name}</strong>
        <p style="margin: 3px 0 0; color: #64748b; font-size: 11px;">${branch.address}</p>
        <div style="margin-top: 5px; font-size: 10px; color: #2563eb; font-weight: bold;">
          Base: Rs. ${branch.baseShippingFee} | Rs. ${branch.perKmFee}/km
        </div>
      </div>
    `);
    branchMarkers.push(marker);
  });

  // Initial Customer Pin (Default: Colombo)
  const initialCustomerCoords = resolveLocationCoords('Colombo');
  customerMarker = L.marker([initialCustomerCoords.lat, initialCustomerCoords.lng], {
    icon: customerIcon,
    draggable: true
  }).addTo(checkoutLeafletMap);

  customerMarker.bindPopup(`<strong>Your Delivery Destination</strong><br><span style="font-size:11px;color:#64748b;">Drag pin to your exact doorstep</span>`);

  function updateDeliveryRoute(lat, lng, locationName) {
    const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
    let nearestBranch = branches[0] || { name: 'Colombo Main Hub', city: 'Colombo' };
    let minDistance = Infinity;

    branches.forEach(b => {
      const bCoords = getBranchCoords(b);
      const d = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, lat, lng);
      if (d < minDistance) {
        minDistance = d;
        nearestBranch = b;
      }
    });

    const bCoords = getBranchCoords(nearestBranch);

    // Update or create dashed route polyline
    if (routePolyline) {
      checkoutLeafletMap.removeLayer(routePolyline);
    }
    routePolyline = L.polyline([[bCoords.lat, bCoords.lng], [lat, lng]], {
      color: '#2563eb',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(checkoutLeafletMap);

    // Update UI Badges
    const badge = document.getElementById('map-distance-badge');
    const hubName = document.getElementById('nearest-hub-name');
    const hubDist = document.getElementById('nearest-hub-distance');

    if (badge) badge.textContent = `${minDistance} km dispatch route`;
    if (hubName) hubName.textContent = nearestBranch.name;
    if (hubDist) hubDist.textContent = `${minDistance} km (${nearestBranch.city} → destination)`;

    if (typeof onLocationChanged === 'function') {
      onLocationChanged({
        branch: nearestBranch,
        distanceKm: minDistance,
        lat,
        lng,
        locationName
      });
    }
  }

  let currentCustomerDeliveryCoords = { lat: initialCustomerCoords.lat, lng: initialCustomerCoords.lng };
  let isDeliveryLocationExplicitlyPinned = false;

  function updateDeliveryRoute(lat, lng, locationName, explicitlyPinned = false) {
    currentCustomerDeliveryCoords = { lat, lng };
    if (explicitlyPinned) {
      isDeliveryLocationExplicitlyPinned = true;
      updateMapLocationBadge(true, lat, lng);
    }

    const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
    let nearestBranch = branches[0] || { name: 'Colombo Main Hub', city: 'Colombo' };
    let minDistance = Infinity;

    branches.forEach(b => {
      const bCoords = getBranchCoords(b);
      const d = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, lat, lng);
      if (d < minDistance) {
        minDistance = d;
        nearestBranch = b;
      }
    });

    const bCoords = getBranchCoords(nearestBranch);

    // Update or create dashed route polyline
    if (routePolyline) {
      checkoutLeafletMap.removeLayer(routePolyline);
    }
    routePolyline = L.polyline([[bCoords.lat, bCoords.lng], [lat, lng]], {
      color: '#2563eb',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(checkoutLeafletMap);

    // Update UI Badges
    const badge = document.getElementById('map-distance-badge');
    const hubName = document.getElementById('nearest-hub-name');
    const hubDist = document.getElementById('nearest-hub-distance');

    if (badge) badge.textContent = `${minDistance} km dispatch route`;
    if (hubName) hubName.textContent = nearestBranch.name;
    if (hubDist) hubDist.textContent = `${minDistance} km (${nearestBranch.city} → destination)`;

    if (typeof onLocationChanged === 'function') {
      onLocationChanged({
        branch: nearestBranch,
        distanceKm: minDistance,
        lat,
        lng,
        locationName,
        isPinned: isDeliveryLocationExplicitlyPinned
      });
    }
  }

  // Handle marker drag
  customerMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    updateDeliveryRoute(pos.lat, pos.lng, 'Doorstep Delivery Pin', true);
  });

  // Handle map click
  checkoutLeafletMap.on('click', function (e) {
    const { lat, lng } = e.latlng;
    customerMarker.setLatLng([lat, lng]);
    updateDeliveryRoute(lat, lng, 'Doorstep Delivery Pin', true);
  });

  // Initial Route calculation (default initial state is not explicitly pinned by user yet)
  updateDeliveryRoute(initialCustomerCoords.lat, initialCustomerCoords.lng, 'Colombo', false);
  updateMapLocationBadge(false);

  setTimeout(() => {
    if (checkoutLeafletMap) checkoutLeafletMap.invalidateSize();
  }, 200);

  mapInitialized = true;
  window._etechCheckoutMap = checkoutLeafletMap;
  return checkoutLeafletMap;
}

/**
 * UI Badge updater for checkout location status
 */
export function updateMapLocationBadge(isPinned, lat = null, lng = null) {
  const badgeEl = document.getElementById('map-location-status-badge');
  if (!badgeEl) return;

  if (isPinned && lat !== null && lng !== null) {
    badgeEl.innerHTML = `
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
        📍 Delivery Pin Confirmed (${lat.toFixed(4)}, ${lng.toFixed(4)})
      </span>
    `;
  } else {
    badgeEl.innerHTML = `
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
        ⚠️ Choose / Pin Location on Map (Required)
      </span>
    `;
  }
}

/**
 * Get current checkout delivery location & pin verification status
 */
export function getCheckoutDeliveryLocation() {
  if (customerMarker) {
    const pos = customerMarker.getLatLng();
    return {
      lat: pos.lat,
      lng: pos.lng,
      isPinned: !!window._etechCustomerLocationExplicitlyPinned
    };
  }
  return {
    lat: 6.9271,
    lng: 79.8612,
    isPinned: false
  };
}

/**
 * Mark checkout location as explicitly confirmed
 */
export function markCheckoutLocationPinned(lat = null, lng = null) {
  window._etechCustomerLocationExplicitlyPinned = true;
  if (lat !== null && lng !== null && customerMarker && checkoutLeafletMap) {
    customerMarker.setLatLng([lat, lng]);
    checkoutLeafletMap.panTo([lat, lng], { animate: true });
    updateMapLocationBadge(true, lat, lng);
  } else if (customerMarker) {
    const pos = customerMarker.getLatLng();
    updateMapLocationBadge(true, pos.lat, pos.lng);
  }
}

/**
 * Reset checkout delivery location state
 */
export function resetCheckoutDeliveryLocation() {
  window._etechCustomerLocationExplicitlyPinned = false;
  const colomboCoords = resolveLocationCoords('Colombo');
  if (customerMarker && checkoutLeafletMap) {
    customerMarker.setLatLng([colomboCoords.lat, colomboCoords.lng]);
    checkoutLeafletMap.setView([colomboCoords.lat, colomboCoords.lng], 7);
  }
  updateMapLocationBadge(false);
}

/**
 * Trigger HTML5 Geolocation to automatically pin the customer's current GPS location
 */
export function useCustomerCurrentGeolocation(onLocationChanged) {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  const btn = document.getElementById('btn-checkout-use-gps');
  const originalText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span>⏳ Locating GPS...</span>';

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      if (customerMarker && checkoutLeafletMap) {
        customerMarker.setLatLng([lat, lng]);
        checkoutLeafletMap.setView([lat, lng], 13);
      }

      markCheckoutLocationPinned(lat, lng);

      if (typeof onLocationChanged === 'function') {
        const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
        let nearestBranch = branches[0] || { name: 'Colombo Main Hub' };
        let minDistance = Infinity;

        branches.forEach(b => {
          const bCoords = getBranchCoords(b);
          const d = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, lat, lng);
          if (d < minDistance) {
            minDistance = d;
            nearestBranch = b;
          }
        });

        onLocationChanged({
          branch: nearestBranch,
          distanceKm: minDistance,
          lat,
          lng,
          locationName: 'My GPS Location',
          isPinned: true
        });
      }

      if (btn) btn.innerHTML = originalText;
    },
    (err) => {
      console.warn('Geolocation failed:', err.message);
      alert('Unable to retrieve your location. Please click or drag the pin on the map to set your delivery doorstep.');
      if (btn) btn.innerHTML = originalText;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/**
 * Reposition Customer Delivery Pin when district/city changes
 */
export function setCheckoutMapDestination(districtOrCityName, onLocationChanged) {
  const coords = resolveLocationCoords(districtOrCityName);
  if (!coords) return;

  if (customerMarker && checkoutLeafletMap) {
    customerMarker.setLatLng([coords.lat, coords.lng]);
    checkoutLeafletMap.panTo([coords.lat, coords.lng], { animate: true, duration: 0.6 });
    markCheckoutLocationPinned(coords.lat, coords.lng);

    const branches = getBranches().filter(b => (b.status || 'Active').toLowerCase() === 'active');
    let nearestBranch = branches[0] || { name: 'Colombo Main Hub' };
    let minDistance = Infinity;

    branches.forEach(b => {
      const bCoords = getBranchCoords(b);
      const d = calculateHaversineDistanceKm(bCoords.lat, bCoords.lng, coords.lat, coords.lng);
      if (d < minDistance) {
        minDistance = d;
        nearestBranch = b;
      }
    });

    const bCoords = getBranchCoords(nearestBranch);
    if (routePolyline) {
      checkoutLeafletMap.removeLayer(routePolyline);
    }
    routePolyline = L.polyline([[bCoords.lat, bCoords.lng], [coords.lat, coords.lng]], {
      color: '#2563eb',
      weight: 3,
      dashArray: '6, 8',
      opacity: 0.85
    }).addTo(checkoutLeafletMap);

    const badge = document.getElementById('map-distance-badge');
    const hubName = document.getElementById('nearest-hub-name');
    const hubDist = document.getElementById('nearest-hub-distance');

    if (badge) badge.textContent = `${minDistance} km dispatch route`;
    if (hubName) hubName.textContent = nearestBranch.name;
    if (hubDist) hubDist.textContent = `${minDistance} km (${nearestBranch.city} → ${coords.name || districtOrCityName})`;

    if (typeof onLocationChanged === 'function') {
      onLocationChanged({
        branch: nearestBranch,
        distanceKm: minDistance,
        lat: coords.lat,
        lng: coords.lng,
        locationName: coords.name || districtOrCityName,
        isPinned: true
      });
    }
  }
}
