import { getBranches, saveBranch, deleteBranch, getBranchById, getBranchCoords, SRI_LANKA_DISTRICTS_COORDS } from './branch_controller.js';
import { etechAlert, showToast } from '../util/index.js';

let branchEditorMap = null;
let branchEditorMarker = null;

/**
 * ============================================================
 * TAB 4: STORE BRANCH MANAGEMENT (DEDICATED FULL PAGE VIEW)
 * ============================================================
 */

/**
 * Render Branch Management List Tab
 */
export function renderBranchesTab(branchesToRender = null) {
  const grid = document.getElementById('branches-list-grid');
  if (!grid) return;

  const branches = branchesToRender || getBranches();

  if (branches.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full p-8 text-center bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-xl">
        <span class="text-3xl">🏢</span>
        <h4 class="text-sm font-bold text-[#0f172a] mt-2">No Warehouses Found</h4>
        <p class="text-xs text-[#64748b] mt-0.5">Click "+ Add New Branch" to create your first regional fulfillment warehouse.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = branches.map(b => {
    const coords = getBranchCoords(b);
    const isActive = b.status === 'Active' || b.active !== false;

    return `
      <div class="bg-white border border-[#e2e8f0] rounded-xl p-5 space-y-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-start justify-between border-b border-[#f1f5f9] pb-3">
            <div>
              <div class="flex items-center space-x-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">${b.id}</span>
                <span class="text-[11px] font-medium text-[#64748b]">${b.city} Regional Hub</span>
              </div>
              <h4 class="text-base font-extrabold text-[#0f172a] mt-1">${b.name}</h4>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ${isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div class="space-y-1.5 text-xs text-[#475569] mt-3">
            <p class="flex items-start space-x-1.5">
              <span class="text-slate-400 shrink-0">📍</span>
              <span><strong class="text-[#334155]">Address:</strong> ${b.address || 'Not specified'}</span>
            </p>
            <p class="flex items-center space-x-1.5">
              <span class="text-slate-400 shrink-0">📞</span>
              <span><strong class="text-[#334155]">Phone:</strong> ${b.phone || 'N/A'}</span>
            </p>
            <p class="flex items-center space-x-1.5">
              <span class="text-slate-400 shrink-0">✉️</span>
              <span><strong class="text-[#334155]">Email:</strong> ${b.email || 'N/A'}</span>
            </p>
            <p class="flex items-center space-x-1.5">
              <span class="text-slate-400 shrink-0">🚚</span>
              <span><strong class="text-[#334155]">Shipping Rate:</strong> Rs. ${b.baseShippingFee || 350} base + Rs. ${b.perKmFee || 25}/km</span>
            </p>

            <div class="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
              <span class="text-[#64748b] font-medium">📍 Live GPS Coordinates:</span>
              <span class="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[#f1f5f9] flex items-center justify-end space-x-2">
          <button onclick="openBranchFormPage('${b.id}')"
            class="px-3 py-1.5 bg-[#f8fafc] hover:bg-blue-50 text-blue-700 hover:text-blue-800 rounded-lg text-xs font-bold border border-[#e2e8f0] hover:border-blue-200 transition-colors shadow-2xs flex items-center space-x-1">
            <span>✏️</span>
            <span>View & Edit</span>
          </button>
          <button onclick="confirmDeleteBranch('${b.id}')"
            class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition-colors shadow-2xs">
            Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Filter branch tab cards by query
 */
export function filterBranchesTab(query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    renderBranchesTab();
    return;
  }

  const branches = getBranches();
  const filtered = branches.filter(b => 
    (b.name || '').toLowerCase().includes(q) ||
    (b.city || '').toLowerCase().includes(q) ||
    (b.id || '').toLowerCase().includes(q) ||
    (b.address || '').toLowerCase().includes(q)
  );

  renderBranchesTab(filtered);
}

/**
 * Open Dedicated Branch Editor Page (Replaces Overlay Modal)
 */
export function openBranchFormPage(branchId = null) {
  const listView = document.getElementById('branches-list-view');
  const formView = document.getElementById('branch-form-view');
  if (!listView || !formView) return;

  const branch = branchId ? getBranchById(branchId) : null;

  // Toggle visible page
  listView.classList.add('hidden');
  formView.classList.remove('hidden');

  // Update Page Header
  const titleEl = document.getElementById('branch-page-title');
  const subtitleEl = document.getElementById('branch-page-subtitle');
  const statusPill = document.getElementById('branch-form-status-pill');

  if (titleEl) titleEl.textContent = branch ? `Edit Warehouse: ${branch.name}` : 'Add New Store Branch';
  if (subtitleEl) subtitleEl.textContent = branch 
    ? `Update warehouse contact information, fulfillment fees, and exact GPS delivery dispatch coordinates.` 
    : 'Configure a new regional warehouse hub and pinpoint its map coordinates for live geodesic routing.';
  if (statusPill) {
    if (branch) {
      statusPill.textContent = `ID: ${branch.id}`;
      statusPill.className = 'px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200';
    } else {
      statusPill.textContent = 'New Warehouse';
      statusPill.className = 'px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200';
    }
  }

  // Populate Input Fields
  const idInput = document.getElementById('bform-id');
  const nameInput = document.getElementById('bform-name');
  const citySelect = document.getElementById('bform-city');
  const codeInput = document.getElementById('bform-code');
  const phoneInput = document.getElementById('bform-phone');
  const emailInput = document.getElementById('bform-email');
  const addressInput = document.getElementById('bform-address');
  const baseFeeInput = document.getElementById('bform-basefee');
  const kmFeeInput = document.getElementById('bform-kmfee');
  const activeInput = document.getElementById('bform-active');
  const latInput = document.getElementById('bform-lat');
  const lngInput = document.getElementById('bform-lng');

  if (idInput) idInput.value = branch ? branch.id : '';
  if (nameInput) nameInput.value = branch ? branch.name : '';
  if (citySelect) {
    if (branch && branch.city) {
      let matched = false;
      for (let i = 0; i < citySelect.options.length; i++) {
        if (citySelect.options[i].value.toLowerCase() === branch.city.toLowerCase()) {
          citySelect.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) citySelect.value = branch.city;
    } else {
      citySelect.value = 'Colombo';
    }
  }
  if (codeInput) {
    codeInput.value = branch ? branch.id : '';
    codeInput.disabled = Boolean(branch);
  }
  if (phoneInput) phoneInput.value = branch ? branch.phone : '';
  if (emailInput) emailInput.value = branch ? branch.email : '';
  if (addressInput) addressInput.value = branch ? branch.address : '';
  if (baseFeeInput) baseFeeInput.value = branch ? (branch.baseShippingFee || 350) : 350;
  if (kmFeeInput) kmFeeInput.value = branch ? (branch.perKmFee || 25) : 25;
  if (activeInput) activeInput.checked = branch ? (branch.status === 'Active' || branch.active !== false) : true;

  // Resolve initial coordinates
  const coords = branch ? getBranchCoords(branch) : { lat: 6.9271, lng: 79.8612 };
  if (latInput) latInput.value = coords.lat.toFixed(6);
  if (lngInput) lngInput.value = coords.lng.toFixed(6);

  // Initialize Interactive Leaflet Map for Branch Editor
  initBranchEditorMap(coords.lat, coords.lng);

  // Scroll to top of panel smoothly
  formView.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Close Branch Editor Page and return to list view
 */
export function closeBranchFormPage() {
  const listView = document.getElementById('branches-list-view');
  const formView = document.getElementById('branch-form-view');
  if (!listView || !formView) return;

  formView.classList.add('hidden');
  listView.classList.remove('hidden');

  if (branchEditorMap) {
    try {
      branchEditorMap.remove();
      branchEditorMap = null;
      branchEditorMarker = null;
    } catch (e) {}
  }

  renderBranchesTab();
}

/**
 * Initialize Leaflet Map in the Branch Editor Page
 */
function initBranchEditorMap(lat, lng) {
  const container = document.getElementById('branch-editor-map');
  if (!container) return;

  if (typeof window.L === 'undefined') {
    setTimeout(() => initBranchEditorMap(lat, lng), 250);
    return;
  }

  if (branchEditorMap) {
    try {
      branchEditorMap.remove();
      branchEditorMap = null;
      branchEditorMarker = null;
    } catch (e) {}
  }

  // Create Map instance
  branchEditorMap = L.map('branch-editor-map', {
    center: [lat, lng],
    zoom: 12,
    zoomControl: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(branchEditorMap);

  const warehouseIcon = L.divIcon({
    className: 'custom-warehouse-pin',
    html: `
      <div style="background-color: #2563eb; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.5); border: 2px solid white; font-size: 16px;">
        🏢
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });

  branchEditorMarker = L.marker([lat, lng], {
    icon: warehouseIcon,
    draggable: true
  }).addTo(branchEditorMap);

  branchEditorMarker.bindPopup(`<strong>Warehouse Location</strong><br><span style="font-size:11px;color:#64748b;">Drag to reposition warehouse pin</span>`).openPopup();

  // On marker dragend -> update lat/lng inputs
  branchEditorMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    setBranchFormCoords(pos.lat, pos.lng);
  });

  // On map click -> move marker & update lat/lng inputs
  branchEditorMap.on('click', function (e) {
    const { lat: clickLat, lng: clickLng } = e.latlng;
    branchEditorMarker.setLatLng([clickLat, clickLng]);
    setBranchFormCoords(clickLat, clickLng);
  });

  setTimeout(() => {
    if (branchEditorMap) branchEditorMap.invalidateSize();
  }, 200);
}

/**
 * Sync Latitude and Longitude to inputs
 */
function setBranchFormCoords(lat, lng) {
  const latInput = document.getElementById('bform-lat');
  const lngInput = document.getElementById('bform-lng');
  if (latInput) latInput.value = Number(lat).toFixed(6);
  if (lngInput) lngInput.value = Number(lng).toFixed(6);
}

/**
 * Handle manual numeric input of Latitude or Longitude
 */
export function handleManualBranchCoordChange() {
  const latInput = document.getElementById('bform-lat');
  const lngInput = document.getElementById('bform-lng');
  if (!latInput || !lngInput) return;

  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);

  if (!isNaN(lat) && !isNaN(lng) && branchEditorMarker && branchEditorMap) {
    branchEditorMarker.setLatLng([lat, lng]);
    branchEditorMap.panTo([lat, lng], { animate: true });
  }
}

/**
 * Handle City Dropdown change in branch form: Pan map to city centroid
 */
export function handleBranchCityChange(cityName) {
  const matched = SRI_LANKA_DISTRICTS_COORDS[cityName];
  if (matched && branchEditorMarker && branchEditorMap) {
    branchEditorMarker.setLatLng([matched.lat, matched.lng]);
    branchEditorMap.setView([matched.lat, matched.lng], 12, { animate: true });
    setBranchFormCoords(matched.lat, matched.lng);
  }
}

/**
 * Use Device HTML5 GPS for Branch Warehouse
 */
export function useBranchCurrentGPSLocation() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  const btn = document.getElementById('btn-branch-gps');
  const origText = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span>⏳ Acquiring GPS...</span>';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      if (branchEditorMarker && branchEditorMap) {
        branchEditorMarker.setLatLng([lat, lng]);
        branchEditorMap.setView([lat, lng], 14, { animate: true });
        setBranchFormCoords(lat, lng);
      }

      showToast('Warehouse coordinates updated from current GPS location.', 'success');
      if (btn) btn.innerHTML = origText;
    },
    (err) => {
      console.warn('GPS error:', err.message);
      alert('Unable to acquire GPS position: ' + err.message);
      if (btn) btn.innerHTML = origText;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/**
 * Save Branch Form Submission
 */
export async function handleSaveBranchSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('bform-id');
  const nameInput = document.getElementById('bform-name');
  const citySelect = document.getElementById('bform-city');
  const codeInput = document.getElementById('bform-code');
  const phoneInput = document.getElementById('bform-phone');
  const emailInput = document.getElementById('bform-email');
  const addressInput = document.getElementById('bform-address');
  const baseFeeInput = document.getElementById('bform-basefee');
  const kmFeeInput = document.getElementById('bform-kmfee');
  const activeInput = document.getElementById('bform-active');
  const latInput = document.getElementById('bform-lat');
  const lngInput = document.getElementById('bform-lng');

  const existingId = (idInput ? idInput.value : '').trim();
  const name = (nameInput ? nameInput.value : '').trim();
  const city = (citySelect ? citySelect.value : '').trim();
  const customCode = (codeInput ? codeInput.value : '').trim().toUpperCase();
  const phone = (phoneInput ? phoneInput.value : '').trim();
  const email = (emailInput ? emailInput.value : '').trim();
  const address = (addressInput ? addressInput.value : '').trim();
  const baseShippingFee = parseFloat(baseFeeInput ? baseFeeInput.value : 350) || 350;
  const perKmFee = parseFloat(kmFeeInput ? kmFeeInput.value : 25) || 25;
  const isActive = activeInput ? activeInput.checked : true;
  const latitude = parseFloat(latInput ? latInput.value : 6.9271) || 6.9271;
  const longitude = parseFloat(lngInput ? lngInput.value : 79.8612) || 79.8612;

  if (!name || !city || !phone || !address) {
    etechAlert.warning('Missing Fields', 'Please fill in all required warehouse fields marked with *.');
    return;
  }

  const branchId = existingId || customCode || ('BR-' + city.substring(0, 3).toUpperCase());

  const branchData = {
    id: branchId,
    name,
    city,
    phone,
    email: email || `${city.toLowerCase().replace(/\s+/g, '')}@etechcomputers.lk`,
    address,
    baseShippingFee,
    baseShippingRate: baseShippingFee,
    perKmFee,
    latitude,
    longitude,
    status: isActive ? 'Active' : 'Inactive',
    active: isActive
  };

  const isEdit = Boolean(existingId);
  const confirmed = isEdit
    ? await etechAlert.confirmUpdate(`Warehouse "${branchData.name}"`, `City: ${branchData.city} | GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
    : await etechAlert.confirmCreate(`Warehouse "${branchData.name}"`, `City: ${branchData.city} | GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

  if (!confirmed) return;

  const submitBtn = document.getElementById('btn-save-branch-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Saving Warehouse...</span>';
  }

  try {
    await saveBranch(branchData);
    showToast(`Branch "${branchData.name}" saved successfully with coordinates!`, 'success');
    closeBranchFormPage();
  } catch (err) {
    console.error('Error saving branch:', err);
    etechAlert.error('Save Failed', 'Failed to save warehouse to database. Please check connection and try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💾 Save Branch</span>';
    }
  }
}

/**
 * Delete Branch with confirmation
 */
export async function confirmDeleteBranch(branchId) {
  const branch = getBranchById(branchId);
  const name = branch ? branch.name : `Branch #${branchId}`;

  const confirmed = await etechAlert.confirmDelete(
    `Branch "${name}"`,
    'Warning: Any staff assigned to this branch and regional inventory stock may be affected.'
  );

  if (!confirmed) return;

  await deleteBranch(branchId);
  showToast(`Branch "${name}" deleted.`, 'info');
  renderBranchesTab();
}

// Retain alias for backward compatibility
export function openBranchModal(branchId = null) {
  openBranchFormPage(branchId);
}

export function editBranch(branchId) {
  openBranchFormPage(branchId);
}