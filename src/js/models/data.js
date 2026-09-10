// ============================================================
//  src/js/models/data.js — Product Inventory In-Memory Model Layer
// ============================================================
import { ProductsApi } from '../api/productsApi.js';
import { InventoryApi } from '../api/inventoryApi.js';
import { getCategories, getBadges } from './taxonomy_data.js';
import { getBrands } from './brand_data.js';

// Reactive In-Memory Products Store
let memoryProducts = [];

export let products = memoryProducts;

/**
 * Get all stored products from in-memory cache
 * @param {object} options
 * @param {boolean} [options.includeDeleted=false] - If true, returns deleted items too
 * @param {boolean} [options.activeOnly=false] - If true, returns only ACTIVE items
 * @returns {Array}
 */
export function getStoredProducts(options = {}) {
    const { includeDeleted = false, activeOnly = false } = options;
    let list = memoryProducts;

    if (includeDeleted) {
        return list;
    }
    if (activeOnly) {
        return list.filter(p => (p.productStatus || p.status || 'ACTIVE').toUpperCase() === 'ACTIVE');
    }
    // Standard default: Exclude soft-deleted products
    return list.filter(p => (p.productStatus || p.status || 'ACTIVE').toUpperCase() !== 'DELETED');
}

/**
 * Retrieve only deleted products for the SuperADMIN Trash Bin
 * @returns {Array}
 */
export function getDeletedProducts() {
    return memoryProducts.filter(p => (p.productStatus || p.status || '').toUpperCase() === 'DELETED');
}

/**
 * Update the in-memory products array
 */
export function saveStoredProducts(productsList) {
    if (Array.isArray(productsList)) {
        memoryProducts = [...productsList];
        products = memoryProducts;
    }
}

/**
 * Get product by ID from stored products
 */
export function getProductById(id) {
    const all = getStoredProducts({ includeDeleted: true });
    return all.find(p => p.id === parseInt(id));
}

/**
 * Get featured products (Best Sellers) - Active only
 */
export function getFeaturedProducts() {
    const all = getStoredProducts({ activeOnly: true });
    const bestSellers = all.filter(p => p.badge && p.badge.trim().toLowerCase() === "best seller");
    if (bestSellers.length > 0) {
        return bestSellers;
    }
    return all.slice(0, 4);
}

/**
 * Get new arrival products (filtered by badge matching "New Arrival") - Active only
 */
export function getNewArrivalProducts() {
    const all = getStoredProducts({ activeOnly: true });
    const arrivals = all.filter(p => p.badge && p.badge.trim().toLowerCase() === "new arrival");
    if (arrivals.length > 0) {
        return arrivals;
    }
    const featured = all.filter(p => p.badge && p.badge !== "");
    return featured.length > 0 ? featured : all.slice(0, 4);
}

/**
 * Update product lifecycle status (ACTIVE, INACTIVE, DELETED)
 * Synchronizes with backend API PATCH /products/update-status/{id}
 */
export async function updateProductStatus(id, newStatus) {
    const upperStatus = (newStatus || 'ACTIVE').toUpperCase();
    const index = memoryProducts.findIndex(p => p.id === parseInt(id));

    if (index !== -1) {
        memoryProducts[index].productStatus = upperStatus;
        memoryProducts[index].status = upperStatus;

        try {
            await ProductsApi.updateStatus(id, upperStatus);
        } catch (err) {
            console.warn(`[DataModel] Backend status sync notice for product ${id}:`, err.message);
        }

        return { success: true, product: memoryProducts[index] };
    }
    return { success: false, message: 'Product not found.' };
}

/**
 * Soft delete product by ID (sets status to DELETED)
 * Synchronizes with backend API DELETE /products/delete/{id}
 */
export async function deleteProduct(id) {
    const res = await updateProductStatus(id, 'DELETED');
    try {
        await ProductsApi.delete(id);
    } catch (err) {
        console.warn(`[DataModel] Backend soft-delete sync notice for product ${id}:`, err.message);
    }
    return res.success;
}

/**
 * Restore soft-deleted product back to ACTIVE status
 */
export async function restoreProduct(id) {
    return await updateProductStatus(id, 'ACTIVE');
}

/**
 * Permanently purge product from database and storage (SuperADMIN only)
 * Synchronizes with backend API DELETE /products/perma-delete/{id}
 */
export async function permanentlyDeleteProduct(id) {
    const target = memoryProducts.find(p => p.id === parseInt(id));
    memoryProducts = memoryProducts.filter(p => p.id !== parseInt(id));

    try {
        await ProductsApi.permaDelete(id);
    } catch (err) {
        console.warn(`[DataModel] Backend permanent delete notice for product ${id}:`, err.message);
    }

    return { success: true, product: target };
}

/**
 * Save or update a product
 */
export async function saveProduct(productData) {
    const all = memoryProducts;
    const index = all.findIndex(p => p.id === parseInt(productData.id));

    // Filter and sanitize images array (max 5 images)
    let imagesArr = Array.isArray(productData.images) ? productData.images.filter(img => img && typeof img === 'string' && img.trim() !== '') : [];
    if (imagesArr.length === 0 && productData.image) {
        imagesArr = [productData.image];
    }
    if (imagesArr.length > 5) {
        imagesArr = imagesArr.slice(0, 5);
    }

    const mainImg = imagesArr.length > 0 ? imagesArr[0] : (productData.image || "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80");
    const branchStock = productData.branchStock || { "BR-COL": 10, "BR-GAL": 5, "BR-MAT": 3, "BR-KAN": 5 };
    const totalStock = Object.values(branchStock).reduce((sum, v) => sum + parseInt(v || 0), 0);
    const productStatus = (productData.productStatus || productData.status || (index > -1 ? all[index].productStatus : 'ACTIVE')).toUpperCase();

    const cachedCategories = getCategories({ includeDeleted: true });
    const cachedBrands = getBrands({ includeDeleted: true });
    const cachedBadges = getBadges({ includeDeleted: true });
    const brandInfo = resolveBrandInfo(productData, cachedBrands);
    const categoryInfo = resolveCategoryInfo(productData, cachedCategories);
    const badgeInfo = resolveBadgeInfo(productData, cachedBadges);

    const formattedProduct = {
        id: productData.id ? parseInt(productData.id) : (all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1),
        name: productData.name,
        category: categoryInfo.category,
        categoryId: categoryInfo.categoryId,
        categorySlug: categoryInfo.categorySlug,
        categoryName: categoryInfo.categoryName,
        brand: brandInfo.brand,
        brandId: brandInfo.brandId,
        brandSlug: brandInfo.brandSlug,
        price: parseFloat(productData.price),
        originalPrice: parseFloat(productData.originalPrice || productData.price),
        rating: parseFloat(productData.rating || 4.8),
        reviews: parseInt(productData.reviews || productData.reviewsCount || 10),
        reviewsCount: parseInt(productData.reviewsCount || productData.reviews || 10),
        image: mainImg,
        images: imagesArr.length > 0 ? imagesArr : [mainImg],
        description: productData.description || "",
        fullDescription: productData.fullDescription || productData.description || "",
        sku: productData.sku || `ETC-${(categoryInfo.categorySlug || 'GEN').toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        badge: badgeInfo.badge,
        badgeId: badgeInfo.badgeId,
        warranty: productData.warranty || "1-Year Warranty",
        specs: productData.specs || { "Category": categoryInfo.categoryName },
        features: productData.features || ["High Performance Tech Hardware"],
        branchStock: branchStock,
        totalStock: totalStock,
        inStock: totalStock > 0,
        productStatus: productStatus,
        status: productStatus,
        alertEnabled: productData.alertEnabled !== undefined ? productData.alertEnabled : (index > -1 && all[index].alertEnabled !== undefined ? all[index].alertEnabled : true),
        lowStockMargin: productData.lowStockMargin !== undefined ? parseInt(productData.lowStockMargin) : (index > -1 && all[index].lowStockMargin !== undefined ? all[index].lowStockMargin : 5)
    };

    if (index > -1) {
        all[index] = formattedProduct;
    } else {
        all.push(formattedProduct);
    }

    saveStoredProducts(all);

    // Synchronize with API
    try {
        if (index > -1) {
            await ProductsApi.update(formattedProduct.id, formattedProduct);
        } else {
            await ProductsApi.create(formattedProduct);
        }
    } catch (err) {
        console.warn(`[DataModel] Backend sync notice for saveProduct:`, err.message);
    }

    return formattedProduct;
}

/**
 * Deduct stock from a specific branch when an order is placed
 */
export function deductBranchStock(productId, branchId, quantity) {
    const product = memoryProducts.find(p => p.id === parseInt(productId));
    if (product && product.branchStock) {
        const current = product.branchStock[branchId] || 0;
        product.branchStock[branchId] = Math.max(0, current - quantity);
        product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + b, 0);
        product.inStock = product.totalStock > 0;
    }
}

/**
 * Update stock alert configuration for a specific product
 */
export async function updateProductStockSettings(productId, { alertEnabled, lowStockMargin }) {
    const product = memoryProducts.find(p => p.id === parseInt(productId));
    if (product) {
        if (alertEnabled !== undefined) product.alertEnabled = Boolean(alertEnabled);
        if (lowStockMargin !== undefined) product.lowStockMargin = Math.max(1, parseInt(lowStockMargin) || 5);

        try {
            await InventoryApi.updateSettings(productId, { alertEnabled, lowStockMargin });
        } catch (e) {}

        return product;
    }
    return null;
}

/**
 * Adjust stock quantity directly for a branch warehouse
 */
export async function quickAdjustStock(productId, branchId, quantityOrDelta, isAbsolute = false) {
    const product = memoryProducts.find(p => p.id === parseInt(productId));
    if (product) {
        if (!product.branchStock) product.branchStock = { "BR-COL": 0, "BR-GAL": 0, "BR-MAT": 0, "BR-KAN": 0 };
        const current = parseInt(product.branchStock[branchId] || 0);
        const delta = isAbsolute ? (parseInt(quantityOrDelta) - current) : parseInt(quantityOrDelta || 0);

        if (isAbsolute) {
            product.branchStock[branchId] = Math.max(0, parseInt(quantityOrDelta) || 0);
        } else {
            product.branchStock[branchId] = Math.max(0, current + parseInt(quantityOrDelta || 0));
        }
        product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + parseInt(b || 0), 0);
        product.inStock = product.totalStock > 0;

        try {
            await InventoryApi.adjustStock(productId, { branchId, quantityDelta: delta });
        } catch (e) {}

        return product;
    }
    return null;
}

/**
 * Transfer stock from one branch warehouse to another
 */
export function transferBranchStock(productId, fromBranchId, toBranchId, transferQty) {
    const product = memoryProducts.find(p => p.id === parseInt(productId));
    const qty = parseInt(transferQty) || 0;
    if (product && qty > 0 && fromBranchId !== toBranchId) {
        if (!product.branchStock) product.branchStock = { "BR-COL": 0, "BR-GAL": 0, "BR-MAT": 0, "BR-KAN": 0 };
        const sourceStock = parseInt(product.branchStock[fromBranchId] || 0);
        const actualTransfer = Math.min(sourceStock, qty);
        product.branchStock[fromBranchId] = Math.max(0, sourceStock - actualTransfer);
        product.branchStock[toBranchId] = (parseInt(product.branchStock[toBranchId] || 0)) + actualTransfer;
        product.totalStock = Object.values(product.branchStock).reduce((a, b) => a + parseInt(b || 0), 0);
        product.inStock = product.totalStock > 0;

        try {
            ProductsApi.updateInventory(productId, product.branchStock).catch(() => {});
        } catch (e) {}

        return { success: true, transferred: actualTransfer, product };
    }
    return { success: false, message: 'Invalid transfer parameters.' };
}

function resolveBrandInfo(p, cachedBrands) {
    const list = Array.isArray(cachedBrands) ? cachedBrands : [];
    if (p.brand && typeof p.brand === 'string' && p.brand.trim() !== '') {
        const trimmed = p.brand.trim();
        const found = list.find(b => 
            b.name?.toLowerCase() === trimmed.toLowerCase() || 
            b.slug?.toLowerCase() === trimmed.toLowerCase() || 
            b.id?.toLowerCase() === trimmed.toLowerCase()
        );
        return {
            brand: found ? found.name : trimmed,
            brandId: found ? found.id : (p.brandId || `brd-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '')}`),
            brandSlug: found ? found.slug : trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
    }
    if (p.brandId && typeof p.brandId === 'string' && p.brandId.trim() !== '') {
        const trimmedId = p.brandId.trim();
        const found = list.find(b => 
            b.id?.toLowerCase() === trimmedId.toLowerCase() || 
            b.slug?.toLowerCase() === trimmedId.toLowerCase() ||
            b.name?.toLowerCase() === trimmedId.toLowerCase()
        );
        if (found) {
            return {
                brand: found.name,
                brandId: found.id,
                brandSlug: found.slug
            };
        }
        const raw = trimmedId.replace(/^brd-/, '');
        const capitalized = raw.length <= 4 ? raw.toUpperCase() : (raw.charAt(0).toUpperCase() + raw.slice(1));
        return {
            brand: capitalized,
            brandId: trimmedId,
            brandSlug: raw.toLowerCase()
        };
    }
    return {
        brand: 'ASUS',
        brandId: 'brd-asus',
        brandSlug: 'asus'
    };
}

function resolveCategoryInfo(p, cachedCategories) {
    const list = Array.isArray(cachedCategories) ? cachedCategories : [];
    if (p.category && typeof p.category === 'string' && p.category.trim() !== '') {
        const trimmed = p.category.trim();
        const found = list.find(c => 
            c.slug?.toLowerCase() === trimmed.toLowerCase() || 
            c.id?.toLowerCase() === trimmed.toLowerCase() || 
            c.name?.toLowerCase() === trimmed.toLowerCase()
        );
        return {
            category: found ? found.slug : trimmed.toLowerCase(),
            categoryId: found ? found.id : (p.categoryId || `cat-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '')}`),
            categorySlug: found ? found.slug : trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            categoryName: found ? found.name : trimmed
        };
    }
    if (p.categoryId && typeof p.categoryId === 'string' && p.categoryId.trim() !== '') {
        const trimmedId = p.categoryId.trim();
        const found = list.find(c => 
            c.id?.toLowerCase() === trimmedId.toLowerCase() || 
            c.slug?.toLowerCase() === trimmedId.toLowerCase() ||
            c.name?.toLowerCase() === trimmedId.toLowerCase()
        );
        if (found) {
            return {
                category: found.slug,
                categoryId: found.id,
                categorySlug: found.slug,
                categoryName: found.name
            };
        }
        const raw = trimmedId.replace(/^cat-/, '');
        return {
            category: raw.toLowerCase(),
            categoryId: trimmedId,
            categorySlug: raw.toLowerCase(),
            categoryName: raw.charAt(0).toUpperCase() + raw.slice(1)
        };
    }
    return {
        category: 'laptops',
        categoryId: 'cat-laptops',
        categorySlug: 'laptops',
        categoryName: 'Laptops & Notebooks'
    };
}

function resolveBadgeInfo(p, cachedBadges) {
    const list = Array.isArray(cachedBadges) ? cachedBadges : [];
    if (p.badge && typeof p.badge === 'string' && p.badge.trim() !== '') {
        const trimmed = p.badge.trim();
        const found = list.find(b => 
            b.name?.toLowerCase() === trimmed.toLowerCase() || 
            b.slug?.toLowerCase() === trimmed.toLowerCase() || 
            b.id?.toLowerCase() === trimmed.toLowerCase()
        );
        return {
            badge: found ? found.name : trimmed,
            badgeId: found ? found.id : (p.badgeId || `bdg-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '')}`)
        };
    }
    if (p.badgeId && typeof p.badgeId === 'string' && p.badgeId.trim() !== '') {
        const trimmedId = p.badgeId.trim();
        const found = list.find(b => 
            b.id?.toLowerCase() === trimmedId.toLowerCase() || 
            b.slug?.toLowerCase() === trimmedId.toLowerCase() ||
            b.name?.toLowerCase() === trimmedId.toLowerCase()
        );
        if (found) {
            return {
                badge: found.name,
                badgeId: found.id
            };
        }
        const badgeMap = {
            'bdg-toprated': 'Top Rated',
            'bdg-bestseller': 'Bestseller',
            'bdg-hotdeal': 'Hot Deal',
            'bdg-new': 'New Arrival'
        };
        return {
            badge: badgeMap[trimmedId.toLowerCase()] || trimmedId.replace(/^bdg-/, ''),
            badgeId: trimmedId
        };
    }
    return {
        badge: '',
        badgeId: ''
    };
}

/**
 * Fetch and sync products from backend API into in-memory store using /products/filter
 * Supports Spring Boot Pageable and multi-criteria filters (category, brand, search, minPrice, maxPrice, badge, page, size, sortBy, sortDir)
 */
export async function syncProductsFromApi(options = {}) {
    try {
        const filterParams = {
            page: options.page !== undefined ? options.page : 0,
            size: options.size !== undefined ? options.size : 20,
            sortBy: options.sortBy || 'id',
            sortDir: options.sortDir || 'asc'
        };

        if (options.category) filterParams.category = options.category;
        if (options.brand) filterParams.brand = options.brand;
        if (options.search) filterParams.search = options.search;
        if (options.minPrice !== undefined && options.minPrice !== null && options.minPrice !== '') {
            filterParams.minPrice = options.minPrice;
        }
        if (options.maxPrice !== undefined && options.maxPrice !== null && options.maxPrice !== '') {
            filterParams.maxPrice = options.maxPrice;
        }
        if (options.badge) filterParams.badge = options.badge;

        const res = await ProductsApi.getFiltered(filterParams);
        let apiList = [];
        if (Array.isArray(res)) {
            apiList = res;
        } else if (res && Array.isArray(res.body)) {
            apiList = res.body;
        } else if (res && Array.isArray(res.data)) {
            apiList = res.data;
        } else if (res && Array.isArray(res.content)) {
            apiList = res.content;
        }

        const cachedCategories = getCategories({ includeDeleted: true });
        const cachedBrands = getBrands({ includeDeleted: true });
        const cachedBadges = getBadges({ includeDeleted: true });

        const normalized = apiList.map(p => {
            const brandInfo = resolveBrandInfo(p, cachedBrands);
            const categoryInfo = resolveCategoryInfo(p, cachedCategories);
            const badgeInfo = resolveBadgeInfo(p, cachedBadges);

            return {
                id: p.id,
                name: p.name || p.title || '',
                brand: brandInfo.brand,
                brandId: brandInfo.brandId,
                brandSlug: brandInfo.brandSlug,
                category: categoryInfo.category,
                categoryId: categoryInfo.categoryId,
                categorySlug: categoryInfo.categorySlug,
                categoryName: categoryInfo.categoryName,
                price: Number(p.price || 0),
                originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
                rating: Number(p.rating || 4.8),
                reviews: Number(p.reviews || p.reviewsCount || 0),
                reviewsCount: Number(p.reviewsCount || p.reviews || 0),
                image: p.image || (Array.isArray(p.images) && p.images[0]) || '',
                images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []),
                description: p.description || '',
                fullDescription: p.fullDescription || p.description || '',
                inStock: p.inStock !== undefined ? p.inStock : ((p.totalStock || 0) > 0),
                totalStock: Number(p.totalStock || 0),
                branchStock: p.branchStock || {},
                badge: badgeInfo.badge,
                badgeId: badgeInfo.badgeId,
                sku: p.sku || '',
                warranty: p.warranty || '1-Year Warranty',
                specs: p.specs || {},
                features: Array.isArray(p.features) ? p.features : [],
                productStatus: (p.productStatus || p.status || 'ACTIVE').toUpperCase(),
                status: (p.productStatus || p.status || 'ACTIVE').toUpperCase(),
                alertEnabled: p.alertEnabled !== undefined ? p.alertEnabled : true,
                lowStockMargin: p.lowStockMargin !== undefined ? parseInt(p.lowStockMargin) : 5
            };
        });

        if (normalized.length > 0) {
            saveStoredProducts(normalized);
        }
        return getStoredProducts(options);
    } catch (err) {
        console.warn('[DataModel] Live API sync notice:', err.message);
        return getStoredProducts(options);
    }
}
