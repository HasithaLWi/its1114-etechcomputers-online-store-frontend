// ============================================================
//  policy-data.js — Store Business Profile & Legal Policies In-Memory Layer
// ============================================================
import {
  DEFAULT_BUSINESS_INFO,
  DEFAULT_LEGAL_POLICIES,
  legalPolicies
} from '../../data/policies.js';
import { PoliciesApi } from '../api/policiesApi.js';

export { DEFAULT_BUSINESS_INFO, DEFAULT_LEGAL_POLICIES, legalPolicies };

export const POLICIES_STORAGE_KEY = 'etech_policies';
export const BUSINESS_INFO_STORAGE_KEY = 'etech_business_info';

// Reactive In-Memory Stores
let memoryBusinessInfo = { ...DEFAULT_BUSINESS_INFO };
let memoryPolicies = { ...DEFAULT_LEGAL_POLICIES };

/**
 * Sync business profile & policies from backend API
 */
export async function syncPoliciesFromApi() {
  try {
    const [profileRes, policiesRes] = await Promise.allSettled([
      PoliciesApi.getBusinessProfile(),
      PoliciesApi.getAll()
    ]);

    if (profileRes.status === 'fulfilled' && profileRes.value) {
      const data = profileRes.value.body || profileRes.value;
      if (data && typeof data === 'object') {
        memoryBusinessInfo = { ...memoryBusinessInfo, ...data };
      }
    }

    if (policiesRes.status === 'fulfilled' && policiesRes.value) {
      const list = policiesRes.value.body || policiesRes.value;
      if (Array.isArray(list)) {
        list.forEach(p => {
          const key = p.slug || p.id;
          if (key) {
            memoryPolicies[key] = { ...p };
          }
        });
      }
    }
  } catch (err) {
    console.warn('[PoliciesModel] Live policies sync notice:', err.message);
  }
}

/**
 * Retrieve business info from in-memory state
 */
export function getBusinessInfo() {
  return { ...memoryBusinessInfo };
}

/**
 * Save business info to in-memory state and sync with API
 */
export async function saveBusinessInfo(info) {
  memoryBusinessInfo = { ...memoryBusinessInfo, ...info };
  try {
    await PoliciesApi.updateBusinessProfile(memoryBusinessInfo);
  } catch (e) {
    console.warn('[PoliciesModel] Update business profile API notice:', e.message);
  }
  return { success: true, message: 'Business profile updated successfully!' };
}

/**
 * Retrieve all legal policies from in-memory state
 */
export function getStoredPolicies() {
  return { ...memoryPolicies };
}

/**
 * Save all policies to in-memory state
 */
export function saveStoredPolicies(policies) {
  if (policies && typeof policies === 'object') {
    memoryPolicies = { ...policies };
  }
}

/**
 * Get specific policy by key ('privacy' | 'terms' | 'warranty')
 */
export function getPolicyData(key) {
  const policies = getStoredPolicies();
  return policies[key] || policies.privacy || Object.values(policies)[0];
}

/**
 * Update single policy document
 */
export async function updatePolicyDocument(key, policyData) {
  memoryPolicies[key] = {
    ...(memoryPolicies[key] || {}),
    ...policyData,
    id: key
  };

  try {
    await PoliciesApi.updatePolicy(key, memoryPolicies[key]);
  } catch (e) {
    console.warn(`[PoliciesModel] Update policy ${key} API notice:`, e.message);
  }

  return { success: true, message: `${policyData.title || key} updated successfully!` };
}
