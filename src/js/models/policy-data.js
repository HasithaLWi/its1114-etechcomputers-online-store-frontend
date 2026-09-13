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
    const [profileRes, policiesRes] = await Promise.all([
      PoliciesApi.getBusinessProfile(),
      PoliciesApi.getAll()
    ]);

    if (profileRes) {
      const data = profileRes.body || profileRes;
      if (data && typeof data === 'object') {
        memoryBusinessInfo = { ...memoryBusinessInfo, ...data };
      }
    }

    if (policiesRes) {
      const list = policiesRes.body || policiesRes;
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
    console.error('[PoliciesModel] Live policies sync error:', err.message);
    throw err;
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
  await PoliciesApi.updateBusinessProfile(memoryBusinessInfo);
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

  await PoliciesApi.updatePolicy(key, memoryPolicies[key]);
  return { success: true, message: `${policyData.title || key} updated successfully!` };
}
