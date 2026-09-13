// ============================================================
//  src/js/models/newsletter_model.js — Newsletter & Marketing Models (Single-Mode)
// ============================================================
import { NewsletterApi } from '../api/newsletterApi.js';

export const NEWSLETTER_STATUS = Object.freeze({
  SUBSCRIBED: 'SUBSCRIBED',
  UNSUBSCRIBED: 'UNSUBSCRIBED'
});

/**
 * Derive user-friendly display name from email prefix
 * e.g. "kasun.perera@gmail.com" -> "Kasun Perera"
 */
export function getNameFromEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const prefix = email.split('@')[0];
  return prefix
    .split(/[._-]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Subscriber Data Entity Class (Single-Mode: Email focused)
 */
export class Subscriber {
  constructor({
    id = null,
    email = '',
    name = '',
    status = NEWSLETTER_STATUS.SUBSCRIBED,
    subscribedAt = new Date().toISOString(),
    unsubscribedAt = null,
    lastCampaignSentAt = null,
    ipAddress = '127.0.0.1'
  } = {}) {
    this.id = id;
    this.email = (email || '').trim().toLowerCase();
    this.name = (name || '').trim() || getNameFromEmail(this.email);
    this.status = status;
    this.subscribedAt = subscribedAt;
    this.unsubscribedAt = unsubscribedAt;
    this.lastCampaignSentAt = lastCampaignSentAt;
    this.ipAddress = ipAddress;
  }
}

/**
 * Email validation helper
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim().toLowerCase());
}

// Reactive In-Memory State (Sourced 100% from backend database)
let memorySubscribers = [];
let memoryCampaigns = [];

/**
 * Retrieve all subscribers from in-memory state
 */
export function getNewsletterSubscribers() {
  return memorySubscribers;
}

/**
 * Explicitly update the in-memory subscribers state
 */
export function setMemorySubscribers(subscribers) {
  if (Array.isArray(subscribers)) {
    memorySubscribers = subscribers.map(s => (s instanceof Subscriber ? s : new Subscriber(s)));
  } else {
    memorySubscribers = [];
  }
}

/**
 * Save subscribers to in-memory state
 */
export function saveNewsletterSubscribers(subscribers) {
  setMemorySubscribers(subscribers);
  return true;
}

/**
 * Retrieve all campaign broadcasts from in-memory state
 */
export function getNewsletterCampaigns() {
  return memoryCampaigns;
}

/**
 * Explicitly update the in-memory campaigns state
 */
export function setMemoryCampaigns(campaigns) {
  if (Array.isArray(campaigns)) {
    memoryCampaigns = [...campaigns];
  } else {
    memoryCampaigns = [];
  }
}

/**
 * Save campaigns to in-memory state
 */
export function saveNewsletterCampaigns(campaigns) {
  setMemoryCampaigns(campaigns);
  return true;
}

/**
 * Calculate comprehensive analytics and KPI metrics
 */
export function getNewsletterAnalytics() {
  const subscribers = getNewsletterSubscribers();
  const campaigns = getNewsletterCampaigns();

  const totalSubscribers = subscribers.length;
  const activeSubscribers = subscribers.filter(s => s.status === NEWSLETTER_STATUS.SUBSCRIBED).length;
  const unsubscribedCount = subscribers.filter(s => s.status === NEWSLETTER_STATUS.UNSUBSCRIBED).length;

  const totalCampaigns = campaigns.length;
  const totalEmailsDelivered = campaigns.reduce((sum, c) => sum + (c.recipientsCount || 0), 0);
  const avgOpenRate = campaigns.length > 0 
    ? (campaigns.reduce((sum, c) => sum + (parseFloat(c.openRate) || 0), 0) / campaigns.length).toFixed(1)
    : '0.0';

  return {
    totalSubscribers,
    activeSubscribers,
    unsubscribedCount,
    activeRate: totalSubscribers > 0 ? ((activeSubscribers / totalSubscribers) * 100).toFixed(1) : '0.0',
    totalCampaigns,
    totalEmailsDelivered,
    avgOpenRate
  };
}

/**
 * Sync subscribers and campaigns strictly from backend API
 */
export async function syncNewsletterFromApi() {
  try {
    const [subscribersRes, campaignsRes] = await Promise.all([
      NewsletterApi.getAll(),
      NewsletterApi.getCampaigns()
    ]);

    if (subscribersRes && subscribersRes.success && Array.isArray(subscribersRes.data)) {
      setMemorySubscribers(subscribersRes.data);
    }

    if (campaignsRes && campaignsRes.success && Array.isArray(campaignsRes.data)) {
      setMemoryCampaigns(campaignsRes.data);
    }
  } catch (err) {
    console.error('[NewsletterModel] Live API sync failed:', err.message || err);
    throw err;
  }
}
