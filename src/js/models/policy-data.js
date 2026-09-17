import { PoliciesApi } from '../api/policiesApi.js';
import { POLICIES_STORAGE_KEY, BUSINESS_INFO_STORAGE_KEY } from '../util/localstorage.js';

// export { DEFAULT_BUSINESS_INFO, DEFAULT_LEGAL_POLICIES, legalPolicies };

export const DEFAULT_BUSINESS_INFO = {};

export const DEFAULT_LEGAL_POLICIES = {};

export const legalPolicies = DEFAULT_LEGAL_POLICIES;

// export const POLICIES_STORAGE_KEY = 'etech_policies';
// export const BUSINESS_INFO_STORAGE_KEY = 'etech_business_info';

// Reactive In-Memory Stores
let memoryBusinessInfo = { ...DEFAULT_BUSINESS_INFO };
let memoryPolicies = { ...DEFAULT_LEGAL_POLICIES };
let policiesLoaded = false;

/**
 * Returns an appropriate SVG icon for a policy based on its slug or key
 */
export function getPolicyIcon(key) {
  const k = String(key || '').toLowerCase();
  if (k.includes('privacy')) {
    return `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>`;
  }
  if (k.includes('term')) {
    return `<svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
  }
  if (k.includes('return') || k.includes('refund')) {
    return `<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H4m0 0l5 5m-5-5l5-5"/></svg>`;
  }
  if (k.includes('warranty') || k.includes('guarantee')) {
    return `<svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`;
  }
  return `<svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`;
}

export function isPoliciesLoaded() {
  return policiesLoaded;
}

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
        memoryBusinessInfo = {
          ...data,
          companyStory: data.companyStory || data.story || '',
          story: data.companyStory || data.story || '',
          missionStatement: data.missionStatement || data.mission || '',
          mission: data.missionStatement || data.mission || ''
        };
      }
    }

    if (policiesRes) {
      const list = policiesRes.body || policiesRes;
      if (Array.isArray(list)) {
        list.forEach(p => {
          const key = p.slug || p.id;
          if (key) {
            let sections = [];
            if (Array.isArray(p.sections) && p.sections.length > 0) {
              sections = p.sections.map(s => {
                const heading = s.heading || s.sectionTitle || '';
                const content = s.content || s.sectionContent || '';
                let bullets = [];
                if (Array.isArray(s.bullets)) {
                  bullets = s.bullets;
                } else if (s.bulletPoints && typeof s.bulletPoints === 'string') {
                  bullets = s.bulletPoints.split('|').map(b => b.trim()).filter(Boolean);
                }
                return {
                  id: s.id || '',
                  heading,
                  sectionTitle: heading,
                  content,
                  sectionContent: content,
                  bulletPoints: s.bulletPoints || bullets.join(' | '),
                  bullets
                };
              });
            } else if (p.policySections && typeof p.policySections === 'object') {
              sections = Object.entries(p.policySections).map(([heading, rawContent]) => {
                const parts = (rawContent || '').split('|').map(b => b.trim()).filter(Boolean);
                const content = parts.length > 1 ? parts[0] : (rawContent || '');
                const bullets = parts.length > 1 ? parts.slice(1) : [];
                return {
                  heading,
                  sectionTitle: heading,
                  content,
                  sectionContent: content,
                  bulletPoints: bullets.join(' | '),
                  bullets
                };
              });
            }
            memoryPolicies[key] = {
              ...p,
              icon: p.icon || getPolicyIcon(key),
              sections: sections.length > 0 ? sections : (memoryPolicies[key]?.sections || [])
            };
          }
        });
        policiesLoaded = true;
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
  const sectionsPayload = [];
  const legacyMap = {};

  if (Array.isArray(policyData.sections)) {
    policyData.sections.forEach(sec => {
      const heading = sec.heading || sec.sectionTitle || '';
      const content = sec.content || sec.sectionContent || '';
      let bulletStr = '';
      if (sec.bulletPoints && typeof sec.bulletPoints === 'string') {
        bulletStr = sec.bulletPoints;
      } else if (Array.isArray(sec.bullets)) {
        bulletStr = sec.bullets.map(b => String(b).trim()).filter(Boolean).join(' | ');
      }

      sectionsPayload.push({
        id: sec.id || (key.toLowerCase() + '-' + heading.toLowerCase().replace(/\s+/g, '-')),
        sectionTitle: heading,
        heading: heading,
        sectionContent: content,
        content: content,
        bulletPoints: bulletStr
      });

      legacyMap[heading] = content;
    });
  }

  const payload = {
    id: key,
    title: policyData.title || '',
    subtitle: policyData.subtitle || '',
    lastUpdated: policyData.lastUpdated || '',
    sections: sectionsPayload,
    policySections: legacyMap
  };

  memoryPolicies[key] = {
    ...(memoryPolicies[key] || {}),
    ...policyData,
    id: key,
    sections: sectionsPayload.map(s => ({
      ...s,
      bullets: s.bulletPoints ? s.bulletPoints.split('|').map(b => b.trim()).filter(Boolean) : []
    })),
    policySections: legacyMap
  };

  await PoliciesApi.updatePolicy(key, payload);
  return { success: true, message: `${policyData.title || key} updated successfully!` };
}
