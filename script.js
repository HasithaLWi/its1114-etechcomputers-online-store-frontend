// ============================================================
//  script.js — Central Window Bridge (ES Module)
// ============================================================
//  Single source of truth for all window.xxx bindings.
//  Imports every exported function/object from the module layer
//  and exposes them globally so inline HTML onclick="" handlers
//  can resolve them at runtime.
// ============================================================

import { products, getProductById, getFeaturedProducts, getNewArrivalProducts, getStoredProducts, saveProduct, deleteProduct } from './src/js/models/data.js';
import {
    legalPolicies, getPolicyData, getBusinessInfo, saveBusinessInfo,
    getStoredPolicies, saveStoredPolicies, updatePolicyDocument,
    DEFAULT_BUSINESS_INFO, DEFAULT_LEGAL_POLICIES
} from './src/js/models/policy-data.js';
import { ET_CONFIG } from './src/js/models/et-training.js';
import { 
    User, CURRENT_USER_STORAGE_KEY, DEFAULT_ROLE, USER_ROLE, USER_STATUS, getRoleBadge, getStatusBadge, buildRoleOptionsHtml, buildStatusOptionsHtml
} from './src/js/models/user_model.js';
import { AuthApi, UserApi } from './src/js/api/userApi.js';
import {
    getToken, setToken, removeToken,
    registerUser, loginUser, setCurrentUser,
    getCurrentUser, isLoggedIn, logoutUser, refreshCurrentUserSession,
    switchTab, togglePasswordVisibility, showAlert, handleLoginSubmit, handleSignupSubmit,
    updateUserProfile, changeUserPassword, openEditProfileModal, closeEditProfileModal,
    switchProfileModalTab, toggleModalPasswordVisibility, handleSaveProfileDetailsSubmit,
    handleChangePasswordSubmit
} from './src/js/controller/login_controller.js';
import { getBranches, calculateShippingFee, autoSelectFulfillmentBranch } from './src/js/controller/branch_controller.js';
import {
    getCart, saveCart, updateCartBadge, addToCart, addBundleToCart, showToast,
    initCartLogic, initCheckoutLogic, validateCartBundles,
    updateItemQuantity, removeItemFromCart
} from './src/js/controller/cart_controller.js';
import {
    viewProductDetails, renderProductDetailsPage,
    changeProductQuantity,
    handleAddToCartFromDetails, handleBuyNowFromDetails,
    handleRateProduct, selectRatingStar, handleSubmitProductReview,
    hoverProductRatingStars, resetProductRatingStars
} from './src/js/controller/product-details_controller.js';
import {
    getAllReviews, getProductReviews, getUserReviewForProduct, hasUserReviewedProduct, submitProductReview,
    getAllRatings, getProductRatings, getUserRatingForProduct, hasUserRatedProduct, submitProductRating
} from './src/js/models/rating_data.js';
import { 
    initShopLogic, renderFilteredProducts, applyProductFilters, resetProductFilters,
    addCategoryFilter, removeCategoryFilter, clearCategoryFilters, getSelectedCategories,
    addBrandFilter, removeBrandFilter, clearBrandFilters, getSelectedBrands
} from './src/js/controller/shop_controller.js';
import {
    initHotDealsLogic, renderDealCategoryTabs, filterDealsByCategory,
    renderFlashDealsGrid, toggleDealWishlist, buyFeaturedDeal,
    handleDealsNewsletter, HOT_DEALS_DATA
} from './src/js/controller/hot_deal_controller.js';
import { 
    handleLogout, updateHeaderAuthUI, renderHomeNewArrivalsGrid, renderHomeBrandsShowcase, scrollHomeBrands,
    toggleMobileMenu, openMobileMenu, closeMobileMenu, handleMobileSearchSubmit, handleHeaderSearchSubmit
} from './src/js/app/app.js';
import {
    getWishlist, saveWishlist, isInWishlist, getWishlistCount,
    updateWishlistBadge, toggleWishlist, removeFromWishlist, clearWishlist,
    moveWishlistToCart, moveAllWishlistToCart, handleWishlistSearch,
    handleWishlistCategoryFilter, handleWishlistStockFilter, handleWishlistSort,
    initWishlistLogic, renderWishlistPage
} from './src/js/controller/wishlist_controller.js';
import { renderLoginPage, initLoginPage } from './src/js/app/login/login.js';
import { renderAdminPage, initAdminPage } from './src/js/app/administrator/administrator.js';
import { renderAboutPage } from './src/js/app/about/about.js';
import {
    renderBrandsTab, openBrandFormPage, closeBrandFormPage,
    triggerBrandFormSubmit, handleSaveBrandFormPage, handleBrandSearch,
    handleBrandFeaturedFilter, resetBrandFilters,
    handleToggleBrandFeatured, handleDeleteBrand, handleBrandNameInput,
    applyBrandPreset, updateBrandLivePreview
} from './src/js/controller/brand_management_controller.js';
import {
    getBrands, getBrandById, getBrandBySlug, getFeaturedBrands,
    saveBrand, deleteBrand, toggleBrandFeatured, getBrandProductCount
} from './src/js/models/brand_data.js';
import {
    renderPoliciesTab, openBusinessInfoModal, handleSaveBusinessInfoSubmit,
    openPolicyEditorModal, handleSavePolicySubmit, addClauseSection,
    removeClauseSection, confirmResetPolicies
} from './src/js/controller/policy_management_controller.js';

// AI Chatbot API Import
import { ChatApi } from './src/js/api/chatApi.js';

// Newsletter & Email Marketing Imports
import { NewsletterApi } from './src/js/api/newsletterApi.js';
import {
    Subscriber, NEWSLETTER_STATUS,
    getNewsletterSubscribers, saveNewsletterSubscribers,
    getNewsletterCampaigns, saveNewsletterCampaigns,
    getNewsletterAnalytics, isValidEmail
} from './src/js/models/newsletter_model.js';
import {
    renderNewsletterTab, setNewsletterSubTab,
    handleNewsletterSearch, handleNewsletterStatusFilter,
    handleNewsletterSort,
    changeNewsletterPage, toggleSelectSubscriber,
    toggleSelectAllSubscribers, clearSelectedSubscribers,
    bulkUnsubscribeSelected, bulkResubscribeSelected,
    bulkDeleteSelected, toggleSubscriberStatus,
    deleteSubscriber, sendQuickTestEmail,
    exportSubscribersCsv, openAddSubscriberModal,
    saveNewSubscriberManual, openCampaignModal,
    applyCampaignTemplate, handleSendCampaignSubmit,
    closeNewsletterModal, handleStorefrontNewsletterSubmit
} from './src/js/controller/newsletter_management_controller.js';

// Admin Dashboard Shell Imports
import {
    initAdminDashboard, switchAdminTab, closeAdminModal,
    handleAdminLogout, filterProductsTable, toggleAdminSidebar,
    openAdminSidebar, closeAdminSidebar, setSalesChartRange,
    initSalesOrdersChart, filterStaffAlerts,
    renderOverviewTab
} from './src/js/controller/admin_dashboard_controller.js';

// Product Management Controller Imports
import {
    renderProductsTab, confirmDeleteProduct, openProductFormPage,
    renderGalleryInputs, renderFormImageInputs, addGalleryImageInput, removeGalleryImage, removeGalleryImageInput, updateGalleryImage,
    renderSpecsInputs, renderFormSpecsInputs, addFormSpecInput, removeSpecItem, removeFormSpecInput, updateSpecItem,
    renderFeaturesInputs, renderFormFeaturesInputs, addFormFeatureInput, removeFeatureItem, removeFormFeatureInput, updateFeatureItem,
    renderBranchStockInputs, triggerProductFormSubmit, updateLivePreview, editProduct,
    openProductModal, handleSaveProductSubmit
} from './src/js/controller/product_management_controller.js';

// Order Management Controller Imports
import {
    renderOrdersTab, changeOrderStatus,
    saveOrder, getAllOrders, getUserOrders, updateOrderStatus,
    getOrderById, cancelCustomerOrder, renderCustomerOrderDetailPage,
    openOrderSupportEmail, handleCustomerCancelOrder, closeCancelOrderModal,
    confirmCancelOrder
} from './src/js/controller/order_management_controller.js';
import { handleUserOrderSearch, handleUserOrderStatusFilter } from './src/js/app/app.js';

// Branch Management Controller Imports
import {
    renderBranchesTab, confirmDeleteBranch, openBranchModal,
    editBranch, handleSaveBranchSubmit
} from './src/js/controller/branch_management_controller.js';

// User Management Controller Imports
import {
    renderUsersTab, changeUserRole, changeUserStatus, confirmDeleteUser,
    openUserModal, handleSaveUserSubmit, handleUserModalRoleChange
} from './src/js/controller/user_management_controller.js';

// Analytics and Reports Controller Imports
import {
    renderAnalyticsTab
} from './src/js/controller/analytics_and_report_controller.js';

// Stock Health & Alerts Controller Imports
import {
    getStockHealthReport, renderStockHealthTab,
    toggleProductAlert, updateProductStockMargin,
    openQuickRestockModal, switchRestockModalMode,
    handleQuickRestockSubmit, handleStockTransferSubmit,
    filterStockHealthTable, clearStockSearch, navigateToStockHealthWithSearch
} from './src/js/controller/stock_health_controller.js';
import { updateProductStockSettings, quickAdjustStock, transferBranchStock } from './src/js/models/data.js';

import {
    renderTaxonomyTab, runAutoBadgeAssigner,
    openCategoryModal, handleSaveCategorySubmit, confirmDeleteCategory,
    openBadgeModal, updateBadgeThresholdsUI, handleSaveBadgeSubmit, confirmDeleteBadge
} from './src/js/controller/taxonomy_controller.js';
import {
    getCategories, saveCategory, deleteCategory, getCategoryBySlug,
    getBadges, saveBadge, deleteBadge, getBadgeById, getBadgeThresholdSummary,
    runAutoBadgeAssignment
} from './src/js/models/taxonomy_data.js';

// Promotions & Deals Controller Imports
import {
    renderPromotionsTab, switchPromoSubTab,
    openBundleFormPage, closeBundleFormPage,
    triggerBundleFormSubmit, handleSaveBundleFormPage,
    addBundleFormProductItem, addBundleFormItemInput, removeBundleFormItem, updateBundleFormItem,
    setBundleBadgeTag, setBundleFormPresetTimer, updateBundleLivePreview,
    openHotDealModal, closeHotDealModal, updateHotDealModalProductDetails,
    calculateHotDealModalSavings, setHotDealModalTimer, handleSaveHotDealSubmit,
    handleDeleteHotDeal, handleToggleHotDealStatus, updateHomeBannerLivePreview
} from './src/js/controller/promotion_management_controller.js';
import {
    getHomeDealBanner, saveHomeDealBanner, isHomeDealBannerActive,
    getDealBundles, saveDealBundles, addDealBundle,
    updateDealBundle, deleteDealBundle, getAllDiscountsAndDeals,
    updateProductDiscount, calculateBundleInventory, normalizeBundleItems,
    getHomeBannerRemainingTime, getBundleRemainingTime, getRemainingTimeFromDuration,
    getHotDeals, getActiveHotDeals, getHotDealByProductId, saveHotDeals,
    addHotDeal, updateHotDeal, deleteHotDeal, toggleHotDealStatus,
    isBundleAvailable
} from './src/js/models/deals_data.js';

// Inter-Branch Stock Transfers Controller & Model Imports
import {
    renderTransfersTab, filterTransfersByStatus, handleTransferSearch,
    handleApproveDispatchTransfer, handleReceiveTransfer, handleCancelTransfer, 
    openInitiateTransferModal, updateTransferProductDetails, validateTransferSourceStock,
    handleSaveTransferSubmit, viewTransferManifestModal
} from './src/js/controller/transfer_management_controller.js';
import {
    getStockTransfers, saveStockTransfers, createStockTransfer,
    dispatchStockTransfer, receiveStockTransfer, cancelStockTransfer, getTransfersMetrics
} from './src/js/models/transfers_data.js';

// ── Bind everything to window in one shot ────────────────────
Object.assign(window, {
    // Inter-Branch Stock Transfers & Logistics
    renderTransfersTab, filterTransfersByStatus, handleTransferSearch,
    handleReceiveTransfer, handleCancelTransfer, openInitiateTransferModal,
    updateTransferProductDetails, validateTransferSourceStock,
    handleSaveTransferSubmit, viewTransferManifestModal,
    getStockTransfers, saveStockTransfers, createStockTransfer,
    receiveStockTransfer, cancelStockTransfer, getTransfersMetrics,

    // Promotions, Deal Bundles & Hot Deals
    renderPromotionsTab, switchPromoSubTab,
    openBundleFormPage, closeBundleFormPage,
    triggerBundleFormSubmit, handleSaveBundleFormPage,
    addBundleFormProductItem, addBundleFormItemInput, removeBundleFormItem, updateBundleFormItem,
    setBundleBadgeTag, setBundleFormPresetTimer, updateBundleLivePreview,
    openHotDealModal, closeHotDealModal, updateHotDealModalProductDetails,
    calculateHotDealModalSavings, setHotDealModalTimer, handleSaveHotDealSubmit,
    handleDeleteHotDeal, handleToggleHotDealStatus, updateHomeBannerLivePreview,
    getHomeDealBanner, saveHomeDealBanner, isHomeDealBannerActive,
    getDealBundles, saveDealBundles, addDealBundle,
    updateDealBundle, deleteDealBundle, getAllDiscountsAndDeals,
    updateProductDiscount, calculateBundleInventory, normalizeBundleItems,
    getHomeBannerRemainingTime, getBundleRemainingTime, getRemainingTimeFromDuration,
    getHotDeals, getActiveHotDeals, getHotDealByProductId, saveHotDeals,
    addHotDeal, updateHotDeal, deleteHotDeal, toggleHotDealStatus,
    isBundleAvailable,
    addBundleToCart, validateCartBundles,
    products, getProductById, getFeaturedProducts, getNewArrivalProducts, getStoredProducts, saveProduct, deleteProduct,
    updateProductStockSettings, quickAdjustStock, transferBranchStock,

    // Branches & Shipping
    getBranches, calculateShippingFee, autoSelectFulfillmentBranch,

    // Legal Policies & Corporate Profile
    legalPolicies, getPolicyData, getBusinessInfo, saveBusinessInfo,
    getStoredPolicies, saveStoredPolicies, updatePolicyDocument,
    DEFAULT_BUSINESS_INFO, DEFAULT_LEGAL_POLICIES,
    renderAboutPage,
    renderPoliciesTab, openBusinessInfoModal, handleSaveBusinessInfoSubmit,
    openPolicyEditorModal, handleSavePolicySubmit, addClauseSection,
    removeClauseSection, confirmResetPolicies,

    // Chatbot Config
    ET_CONFIG,

    // User Model & Data Layer
    User, CURRENT_USER_STORAGE_KEY, DEFAULT_ROLE, USER_ROLE, USER_STATUS, getRoleBadge, getStatusBadge, buildRoleOptionsHtml, buildStatusOptionsHtml,

    // Authentication & User Profile Management
    AuthApi, UserApi, getToken, setToken, removeToken,
    registerUser, loginUser, setCurrentUser,
    getCurrentUser, isLoggedIn, logoutUser, refreshCurrentUserSession, handleLogout, updateHeaderAuthUI, renderHomeNewArrivalsGrid,
    toggleMobileMenu, openMobileMenu, closeMobileMenu, handleMobileSearchSubmit, handleHeaderSearchSubmit,
    switchTab, togglePasswordVisibility, showAlert, handleLoginSubmit, handleSignupSubmit,
    updateUserProfile, changeUserPassword, openEditProfileModal, closeEditProfileModal,
    switchProfileModalTab, toggleModalPasswordVisibility, handleSaveProfileDetailsSubmit,
    handleChangePasswordSubmit,

    // Cart & Checkout
    getCart, saveCart, updateCartBadge, addToCart, showToast,
    initCartLogic, initCheckoutLogic,
    updateItemQuantity, removeItemFromCart,

    // Product Details, Ratings & Reviews
    viewProductDetails, renderProductDetailsPage,
    changeProductQuantity,
    handleAddToCartFromDetails, handleBuyNowFromDetails,
    handleRateProduct, selectRatingStar, handleSubmitProductReview,
    hoverProductRatingStars, resetProductRatingStars,
    getAllReviews, getProductReviews, getUserReviewForProduct, hasUserReviewedProduct, submitProductReview,
    getAllRatings, getProductRatings, getUserRatingForProduct, hasUserRatedProduct, submitProductRating,

    // Shop Catalog & Brand Filters
    initShopLogic, renderFilteredProducts, applyProductFilters, resetProductFilters,
    addCategoryFilter, removeCategoryFilter, clearCategoryFilters, getSelectedCategories,
    addBrandFilter, removeBrandFilter, clearBrandFilters, getSelectedBrands,
    renderHomeBrandsShowcase, scrollHomeBrands,

    // Hardware Brands Management
    renderBrandsTab, openBrandFormPage, closeBrandFormPage,
    triggerBrandFormSubmit, handleSaveBrandFormPage, handleBrandSearch,
    handleBrandFeaturedFilter, resetBrandFilters,
    handleToggleBrandFeatured, handleDeleteBrand, handleBrandNameInput,
    applyBrandPreset, updateBrandLivePreview,
    getBrands, getBrandById, getBrandBySlug, getFeaturedBrands,
    saveBrand, deleteBrand, toggleBrandFeatured, getBrandProductCount,

    // Hot Deals & Flash Sales
    initHotDealsLogic, renderDealCategoryTabs, filterDealsByCategory,
    renderFlashDealsGrid, toggleDealWishlist, buyFeaturedDeal,
    handleDealsNewsletter, HOT_DEALS_DATA,

    // Wishlist & Saved Products
    getWishlist, saveWishlist, isInWishlist, getWishlistCount,
    updateWishlistBadge, toggleWishlist, removeFromWishlist, clearWishlist,
    moveWishlistToCart, moveAllWishlistToCart, handleWishlistSearch,
    handleWishlistCategoryFilter, handleWishlistStockFilter, handleWishlistSort,
    initWishlistLogic, renderWishlistPage,

    // Admin Dashboard Shell
    initAdminDashboard, switchAdminTab, closeAdminModal,
    handleAdminLogout, filterProductsTable, toggleAdminSidebar,
    openAdminSidebar, closeAdminSidebar, setSalesChartRange,
    initSalesOrdersChart, filterStaffAlerts,
    renderOverviewTab,

    // Product Management
    renderProductsTab, confirmDeleteProduct, openProductFormPage,
    renderGalleryInputs, renderFormImageInputs, addGalleryImageInput, removeGalleryImage, removeGalleryImageInput, updateGalleryImage,
    renderSpecsInputs, renderFormSpecsInputs, addFormSpecInput, removeSpecItem, removeFormSpecInput, updateSpecItem,
    renderFeaturesInputs, renderFormFeaturesInputs, addFormFeatureInput, removeFeatureItem, removeFormFeatureInput, updateFeatureItem,
    renderBranchStockInputs, triggerProductFormSubmit, updateLivePreview, editProduct,
    openProductModal, handleSaveProductSubmit,

    // Order Management & Customer Order Control
    renderOrdersTab, changeOrderStatus, saveOrder, getAllOrders, getUserOrders, updateOrderStatus,
    getOrderById, cancelCustomerOrder, renderCustomerOrderDetailPage, openOrderSupportEmail,
    handleCustomerCancelOrder, closeCancelOrderModal, confirmCancelOrder,
    handleUserOrderSearch, handleUserOrderStatusFilter,

    // Branch Management
    renderBranchesTab, confirmDeleteBranch, openBranchModal,
    editBranch, handleSaveBranchSubmit,

    // User Management
    renderUsersTab, changeUserRole, changeUserStatus, confirmDeleteUser,
    openUserModal, handleSaveUserSubmit, handleUserModalRoleChange,

    // Dynamic Page Generators (SPA)
    renderLoginPage, initLoginPage,
    renderAdminPage, initAdminPage,

    // Stock Health & Alerts
    getStockHealthReport, renderStockHealthTab,
    toggleProductAlert, updateProductStockMargin,
    openQuickRestockModal, switchRestockModalMode,
    handleQuickRestockSubmit, handleStockTransferSubmit,
    filterStockHealthTable, clearStockSearch, navigateToStockHealthWithSearch,

    // Transfers
    renderTransfersTab, filterTransfersByStatus, handleTransferSearch,
    handleApproveDispatchTransfer, handleReceiveTransfer, handleCancelTransfer, 
    openInitiateTransferModal, updateTransferProductDetails, validateTransferSourceStock,
    handleSaveTransferSubmit, viewTransferManifestModal,
    getStockTransfers, saveStockTransfers, createStockTransfer,
    dispatchStockTransfer, receiveStockTransfer, cancelStockTransfer, getTransfersMetrics,

    // Analytics & Reports
    renderAnalyticsTab,

    // Taxonomy & Badges
    renderTaxonomyTab, runAutoBadgeAssigner,
    openCategoryModal, handleSaveCategorySubmit, confirmDeleteCategory,
    openBadgeModal, updateBadgeThresholdsUI, handleSaveBadgeSubmit, confirmDeleteBadge,
    getCategories, saveCategory, deleteCategory, getCategoryBySlug,
    getBadges, saveBadge, deleteBadge, getBadgeById, getBadgeThresholdSummary,
    runAutoBadgeAssignment,

    // AI Chatbot
    ChatApi,

    // Newsletter & Email Marketing
    NewsletterApi,
    Subscriber, NEWSLETTER_STATUS,
    getNewsletterSubscribers, saveNewsletterSubscribers,
    getNewsletterCampaigns, saveNewsletterCampaigns,
    getNewsletterAnalytics, isValidEmail,
    renderNewsletterTab, setNewsletterSubTab,
    handleNewsletterSearch, handleNewsletterStatusFilter,
    handleNewsletterSort,
    changeNewsletterPage, toggleSelectSubscriber,
    toggleSelectAllSubscribers, clearSelectedSubscribers,
    bulkUnsubscribeSelected, bulkResubscribeSelected,
    bulkDeleteSelected, toggleSubscriberStatus,
    deleteSubscriber, sendQuickTestEmail,
    exportSubscribersCsv, openAddSubscriberModal,
    saveNewSubscriberManual, openCampaignModal,
    applyCampaignTemplate, handleSendCampaignSubmit,
    closeNewsletterModal, handleStorefrontNewsletterSubmit
});