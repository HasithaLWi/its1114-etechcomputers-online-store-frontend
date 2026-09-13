// ============================================================
//  src/js/models/brand_data.js — Hardware Brands In-Memory Model Layer
// ============================================================
import { getStoredProducts } from './data.js';
import { BrandsApi } from '../api/brandsApi.js';

export const DEFAULT_BRANDS = [];
export const BRANDS_STORAGE_KEY = 'etech_brands_data';

// Reactive In-Memory Store
let memoryBrands = [];

/**
 * Retrieve all brands from in-memory state
 * @param {object} options
 * @param {boolean} [options.includeDeleted=false]
 * @param {boolean} [options.activeOnly=false]
 * @returns {Array}
 */
export function getBrands(options = {}) {
  const { includeDeleted = false, activeOnly = false } = options;
  let list = memoryBrands;

  if (includeDeleted) return list;
  if (activeOnly) return list.filter(b => (b.status || (b.active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase() === 'ACTIVE');
  // Default: Exclude soft-deleted brands
  return list.filter(b => (b.status || '').toUpperCase() !== 'DELETED');
}

/**
 * Sync brands directly from backend REST API
 */
export async function syncBrandsFromApi(options = {}) {
  try {
    const res = await BrandsApi.getAll();
    let apiList = [];
    if (Array.isArray(res)) {
      apiList = res;
    } else if (res && Array.isArray(res.body)) {
      apiList = res.body;
    } else if (res && Array.isArray(res.data)) {
      apiList = res.data;
    }

    if (apiList.length > 0) {
      memoryBrands = apiList.map(b => ({
        id: b.id,
        name: b.name || '',
        slug: b.slug || '',
        logo: b.logo || b.logoUrl || '',
        logoUrl: b.logoUrl || b.logo || '',
        country: b.country || '',
        website: b.website || '',
        description: b.description || '',
        featured: Boolean(b.featured),
        status: (b.status || (b.active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase(),
        active: (b.status || '').toUpperCase() === 'ACTIVE' || b.active === true
      }));
    }
    return getBrands(options);
  } catch (err) {
    console.error('[BrandModel] Brands API sync error:', err.message);
    throw err;
  }
}


/**
 * Save the entire brands array to in-memory state
 */
export function saveBrands(brandsList) {
  if (Array.isArray(brandsList)) {
    memoryBrands = [...brandsList];
  }
}

/**
 * Retrieve a brand by its unique ID
 */
export function getBrandById(id) {
  if (!id) return null;
  const brands = getBrands({ includeDeleted: true });
  return brands.find(b => b.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Retrieve a brand by its URL slug
 */
export function getBrandBySlug(slug) {
  if (!slug) return null;
  const brands = getBrands({ includeDeleted: true });
  return brands.find(b => b.slug.toLowerCase() === slug.toLowerCase()) || null;
}

/**
 * Retrieve only featured brands for the homepage showcase
 */
export function getFeaturedBrands() {
  const brands = getBrands({ activeOnly: true });
  return brands.filter(b => b.featured === true);
}

/**
 * Get product count for a specific brand
 */
export function getBrandProductCount(brandIdOrSlug) {
  const brand = getBrandById(brandIdOrSlug) || getBrandBySlug(brandIdOrSlug);
  if (!brand) return 0;

  const products = getStoredProducts({ includeDeleted: false });
  return products.filter(p => {
    const pBrand = (p.brand || '').toLowerCase();
    const pBrandId = (p.brandId || '').toLowerCase();
    const pBrandSlug = (p.brandSlug || '').toLowerCase();

    return (
      pBrand === brand.name.toLowerCase() ||
      pBrandId === brand.id.toLowerCase() ||
      pBrandSlug === brand.slug.toLowerCase()
    );
  }).length;
}

/**
 * Save (create or update) a brand profile
 */
export async function saveBrand(brandData, isEdit = false) {
  const brands = memoryBrands;
  const slug = (brandData.slug || brandData.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const status = (brandData.status || (brandData.active !== false ? 'ACTIVE' : 'INACTIVE')).toUpperCase();

  if (isEdit) {
    const index = brands.findIndex(b => b.id === brandData.id || b.slug === brandData.slug);
    if (index !== -1) {
      brands[index] = {
        ...brands[index],
        ...brandData,
        status: status,
        active: status === 'ACTIVE',
        slug: slug || brands[index].slug
      };

      await BrandsApi.update(brands[index].id, brands[index]);
      return brands[index];
    }
  }

  // Create New Brand
  const newBrand = {
    id: brandData.id || `brd-${slug || Date.now()}`,
    name: brandData.name || 'New Brand',
    slug: slug || `brand-${Math.floor(1000 + Math.random() * 9000)}`,
    logo: brandData.logo || brandData.logoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    logoUrl: brandData.logoUrl || brandData.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    country: brandData.country || 'Global',
    website: brandData.website || '',
    description: brandData.description || '',
    featured: Boolean(brandData.featured),
    status: status,
    active: status === 'ACTIVE'
  };

  brands.push(newBrand);
  await BrandsApi.create(newBrand);
  return newBrand;
}

/**
 * Update brand lifecycle status (ACTIVE, INACTIVE, DELETED)
 */
export async function updateBrandStatus(idOrSlug, newStatus) {
  const upperStatus = (newStatus || 'ACTIVE').toUpperCase();
  const index = memoryBrands.findIndex(b => b.id === idOrSlug || b.slug === idOrSlug);

  if (index !== -1) {
    memoryBrands[index].status = upperStatus;
    memoryBrands[index].active = upperStatus === 'ACTIVE';

    try {
      await BrandsApi.updateStatus(memoryBrands[index].id, upperStatus);
    } catch (err) {
      console.warn(`[BrandModel] Backend brand status update notice for ${idOrSlug}:`, err.message);
    }

    return { success: true, brand: memoryBrands[index] };
  }
  return { success: false, message: 'Brand not found.' };
}

/**
 * Soft delete a brand (transitions status to DELETED)
 */
export async function deleteBrand(idOrSlug) {
  const brand = getBrandById(idOrSlug) || getBrandBySlug(idOrSlug);
  const res = await updateBrandStatus(idOrSlug, 'DELETED');
  try {
    if (brand) await BrandsApi.delete(brand.id);
  } catch (err) {
    console.warn(`[BrandModel] Backend brand soft-delete notice for ${idOrSlug}:`, err.message);
  }
  return res.success;
}

/**
 * Restore soft-deleted brand back to ACTIVE
 */
export async function restoreBrand(idOrSlug) {
  return await updateBrandStatus(idOrSlug, 'ACTIVE');
}

/**
 * Permanently purge a brand record from memory and database (SuperADMIN only)
 */
export async function permanentlyDeleteBrand(idOrSlug) {
  const target = memoryBrands.find(b => b.id === idOrSlug || b.slug === idOrSlug);
  memoryBrands = memoryBrands.filter(b => b.id !== idOrSlug && b.slug !== idOrSlug);

  try {
    if (target) await BrandsApi.permaDelete(target.id);
  } catch (err) {
    console.warn(`[BrandModel] Backend brand perma-delete notice for ${idOrSlug}:`, err.message);
  }

  return { success: true, brand: target };
}

/**
 * Toggle featured flag for a brand
 */
export async function toggleBrandFeatured(idOrSlug) {
  const brand = memoryBrands.find(b => b.id === idOrSlug || b.slug === idOrSlug);
  if (!brand) return { success: false, message: 'Brand not found' };
  brand.featured = !brand.featured;
  try {
    await BrandsApi.update(brand.id, brand);
  } catch (err) {
    console.warn('[BrandModel] Backend brand featured toggle notice:', err.message || err);
  }
  return { success: true, brand };
}

