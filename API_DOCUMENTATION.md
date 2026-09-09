# ETech Computers — Complete Backend API Reference & Testing Guide

> **Base URL**: `http://localhost:8080/api/v1`  
> **Security Protocol**: Stateless JWT Bearer Authentication (`Authorization: Bearer <JWT_TOKEN>`)  
> **Content-Type**: `application/json`  
> **Database**: MySQL 8.x (`jdbc:mysql://localhost:3306/etech_online_store`)  
> **Framework**: Spring Boot 3.x with Spring Security 6 & Spring Data JPA (Hibernate)

---

## Table of Contents
1. [System Overview & Server Configuration](#1-system-overview--server-configuration)
2. [Default Seed Data & Credentials](#2-default-seed-data--credentials)
3. [Authentication Flow & Headers](#3-authentication-flow--headers)
4. [Standard Response Envelopes & Error Models](#4-standard-response-envelopes--error-models)
5. [Auth Module Endpoints (`/api/v1/auth`)](#5-auth-module-endpoints)
   - [1. User Login (`POST /api/v1/auth/login`)](#1-user-login)
   - [2. Customer Registration (`POST /api/v1/auth/register`)](#2-customer-registration)
   - [3. Current User Session (`GET /api/v1/auth/me`)](#3-current-user-session)
6. [User Management Module Endpoints (`/api/v1/users`)](#6-user-management-module-endpoints)
   - [4. List Users Directory (`GET /api/v1/users`)](#4-list-users-directory)
   - [5. List Employees Directory (`GET /api/v1/users/all-employees`)](#5-list-employees-directory)
   - [6. List Customers Directory (`GET /api/v1/users/all-customers`)](#6-list-customers-directory)
   - [7. Get User by ID (`GET /api/v1/users/{id}`)](#7-get-user-by-id)
   - [8. Create User Account (`POST /api/v1/users`)](#8-create-user-account)
   - [9. Update User Details (`PUT /api/v1/users/{id}`)](#9-update-user-details)
   - [10. Change User Role (`PATCH /api/v1/users/{id}/role`)](#10-change-user-role)
   - [11. Get System Roles (`GET /api/v1/users/roles`)](#11-get-system-roles)
   - [12. Change User Status (`PATCH /api/v1/users/{id}/status`)](#12-change-user-status)
   - [13. Delete User Account (`DELETE /api/v1/users/{id}`)](#13-delete-user-account)
   - [14. Update Self Profile (`PUT /api/v1/users/me/profile`)](#14-update-self-profile)
   - [15. Change Self Password (`PUT /api/v1/users/me/password`)](#15-change-self-password)
7. [Product Catalog & Inventory Module Endpoints (`/api/v1/products`)](#7-product-catalog--inventory-module-endpoints)
   - [16. Get All Products (`GET /api/v1/products/all`)](#16-get-all-products)
   - [17. Filter Products with Multi-Criteria & Pagination (`GET /api/v1/products/filter`)](#17-filter-products-with-multi-criteria--pagination)
   - [18. Get Product by ID (`GET /api/v1/products/{id}`)](#18-get-product-by-id)
   - [19. Get Product by SKU (`GET /api/v1/products/sku/{sku}`)](#19-get-product-by-sku)
   - [20. Get Products by Status (`GET /api/v1/products/status`)](#20-get-products-by-status)
   - [21. Create Product (`POST /api/v1/products/create`)](#21-create-product)
   - [22. Update Product (`PUT /api/v1/products/update/{id}`)](#22-update-product)
   - [23. Update Branch Inventory Stock (`PATCH /api/v1/products/update-inventory`)](#23-update-branch-inventory-stock)
   - [24. Update Product Status (`PATCH /api/v1/products/update-status/{id}`)](#24-update-product-status)
   - [25. Delete Product (`DELETE /api/v1/products/delete/{id}`)](#25-delete-product)
8. [Category Management Module Endpoints (`/api/v1/categories`)](#8-category-management-module-endpoints)
   - [26. Create Category (`POST /api/v1/categories/create`)](#26-create-category)
   - [27. Get All Categories (`GET /api/v1/categories/all`)](#27-get-all-categories)
   - [28. Get Category by ID (`GET /api/v1/categories/{id}`)](#28-get-category-by-id)
   - [29. Get Category by Slug (`GET /api/v1/categories/slug/{slug}`)](#29-get-category-by-slug)
   - [30. Get Category by Name (`GET /api/v1/categories/name/{name}`)](#30-get-category-by-name)
   - [31. Filter Categories (`GET /api/v1/categories/filter`)](#31-filter-categories)
   - [32. Get Categories by Status (`GET /api/v1/categories/status`)](#32-get-categories-by-status)
   - [33. Update Category (`PUT /api/v1/categories/update/{id}`)](#33-update-category)
   - [34. Update Category Status (`PATCH /api/v1/categories/update-status/{id}`)](#34-update-category-status)
   - [35. Delete Category (Soft Delete) (`DELETE /api/v1/categories/delete/{id}`)](#35-delete-category-soft-delete)
   - [36. Permanently Delete Category (`DELETE /api/v1/categories/perma-delete/{id}`)](#36-permanently-delete-category)
9. [Brand Management Module Endpoints (`/api/v1/brands`)](#9-brand-management-module-endpoints)
   - [37. Create Brand (`POST /api/v1/brands/create`)](#37-create-brand)
   - [38. Get All Brands (`GET /api/v1/brands/all`)](#38-get-all-brands)
   - [39. Get Featured Brands (`GET /api/v1/brands/featured`)](#39-get-featured-brands)
   - [40. Get Brand by ID (`GET /api/v1/brands/{id}`)](#40-get-brand-by-id)
   - [41. Get Brand by Slug (`GET /api/v1/brands/slug/{slug}`)](#41-get-brand-by-slug)
   - [42. Get Brand by Name (`GET /api/v1/brands/name/{name}`)](#42-get-brand-by-name)
   - [43. Filter Brands (`GET /api/v1/brands/filter`)](#43-filter-brands)
   - [44. Get Brands by Status (`GET /api/v1/brands/status/{status}`)](#44-get-brands-by-status)
   - [45. Update Brand (`PUT /api/v1/brands/update/{id}`)](#45-update-brand)
   - [46. Update Brand Status (`PATCH /api/v1/brands/update-status/{id}`)](#46-update-brand-status)
   - [47. Delete Brand (Soft Delete) (`DELETE /api/v1/brands/delete/{id}`)](#47-delete-brand-soft-delete)
   - [48. Permanently Delete Brand (`DELETE /api/v1/brands/perma-delete/{id}`)](#48-permanently-delete-brand)
10. [Badge & Rules Engine Module Endpoints (`/api/v1/badges`)](#10-badge--rules-engine-module-endpoints)
    - [49. Create Badge (`POST /api/v1/badges/create`)](#49-create-badge)
    - [50. Get All Badges (`GET /api/v1/badges/all`)](#50-get-all-badges)
    - [51. Get Active Badges (`GET /api/v1/badges/active`)](#51-get-active-badges)
    - [52. Get Badge by ID (`GET /api/v1/badges/{id}`)](#52-get-badge-by-id)
    - [53. Get Badge by Slug (`GET /api/v1/badges/slug/{slug}`)](#53-get-badge-by-slug)
    - [54. Get Badge by Name (`GET /api/v1/badges/name/{name}`)](#54-get-badge-by-name)
    - [55. Filter Badges (`GET /api/v1/badges/filter`)](#55-filter-badges)
    - [56. Update Badge (`PUT /api/v1/badges/update/{id}`)](#56-update-badge)
    - [57. Update Badge Status (`PATCH /api/v1/badges/update-status/{id}`)](#57-update-badge-status)
    - [58. Delete Badge (Soft Delete) (`DELETE /api/v1/badges/delete/{id}`)](#58-delete-badge-soft-delete)
    - [59. Permanently Delete Badge (`DELETE /api/v1/badges/perma-delete/{id}`)](#59-permanently-delete-badge)
    - [60. Run Automated Badge Assignment Engine (`POST /api/v1/badges/auto-assign`)](#60-run-automated-badge-assignment-engine)
11. [Regional Warehouses & Logistics Module Endpoints (`/api/v1/branches`)](#11-regional-warehouses--logistics-module-endpoints)
    - [61. Get All Branches (`GET /api/v1/branches`)](#61-get-all-branches)
    - [62. Get Branch by ID (`GET /api/v1/branches/{id}`)](#62-get-branch-by-id)
    - [63. Create Branch (`POST /api/v1/branches`)](#63-create-branch)
    - [64. Update Branch (`PUT /api/v1/branches/{id}`)](#64-update-branch)
    - [65. Delete Branch (`DELETE /api/v1/branches/{id}`)](#65-delete-branch)
    - [66. Calculate Nearest Branch & Shipping (`POST /api/v1/branches/nearest`)](#66-calculate-nearest-branch--shipping)
12. [Promotions, Hot Deals & Bundles Module Endpoints (`/api/v1/promotions`)](#12-promotions-hot-deals--bundles-module-endpoints)
    - [67. Get All Hot Deals (`GET /api/v1/promotions/hot-deals`)](#67-get-all-hot-deals)
    - [68. Create Hot Deal (`POST /api/v1/promotions/hot-deals`)](#68-create-hot-deal)
    - [69. Update Hot Deal (`PUT /api/v1/promotions/hot-deals/{id}`)](#69-update-hot-deal)
    - [70. Delete Hot Deal (`DELETE /api/v1/promotions/hot-deals/{id}`)](#70-delete-hot-deal)
    - [71. Get Home Deal Banner (`GET /api/v1/promotions/home-banner`)](#71-get-home-deal-banner)
    - [72. Update Home Deal Banner (`PUT /api/v1/promotions/home-banner`)](#72-update-home-deal-banner)
    - [73. Get All Deal Bundles (`GET /api/v1/promotions/bundles`)](#73-get-all-deal-bundles)
    - [74. Get Deal Bundle by ID (`GET /api/v1/promotions/bundles/{id}`)](#74-get-deal-bundle-by-id)
    - [75. Create Deal Bundle (`POST /api/v1/promotions/bundles`)](#75-create-deal-bundle)
    - [76. Update Deal Bundle (`PUT /api/v1/promotions/bundles/{id}`)](#76-update-deal-bundle)
    - [77. Delete Deal Bundle (`DELETE /api/v1/promotions/bundles/{id}`)](#77-delete-deal-bundle)
13. [Customer Orders & Fulfillment Module Endpoints (`/api/v1/orders`)](#13-customer-orders--fulfillment-module-endpoints)
    - [78. Get All Orders (`GET /api/v1/orders`)](#78-get-all-orders)
    - [79. Get My Orders History (`GET /api/v1/orders/my-orders`)](#79-get-my-orders-history)
    - [80. Get Order by Tracking Code (`GET /api/v1/orders/{orderCode}`)](#80-get-order-by-tracking-code)
    - [81. Place New Order (`POST /api/v1/orders`)](#81-place-new-order)
    - [82. Update Order Fulfillment Status (`PATCH /api/v1/orders/{id}/status`)](#82-update-order-fulfillment-status)
14. [Customer Wishlist Module Endpoints (`/api/v1/wishlist`)](#14-customer-wishlist-module-endpoints)
    - [83. Get Customer Wishlist (`GET /api/v1/wishlist`)](#83-get-customer-wishlist)
    - [84. Toggle Product in Wishlist (`POST /api/v1/wishlist/toggle/{productId}`)](#84-toggle-product-in-wishlist)
    - [85. Add Product to Wishlist (`POST /api/v1/wishlist/add/{productId}`)](#85-add-product-to-wishlist)
    - [86. Remove Item from Wishlist (`DELETE /api/v1/wishlist/remove/{productId}`)](#86-remove-item-from-wishlist)
    - [87. Clear Entire Wishlist (`DELETE /api/v1/wishlist/clear`)](#87-clear-entire-wishlist)
    - [88. Move Wishlist Items to Cart (`POST /api/v1/wishlist/move-to-cart`)](#88-move-wishlist-items-to-cart)
15. [Product Reviews & Ratings Module Endpoints (`/api/v1/products/{id}/reviews`, `/api/v1/reviews`)](#15-product-reviews--ratings-module-endpoints)
    - [89. Get Product Reviews with Pagination (`GET /api/v1/products/{productId}/reviews`)](#89-get-product-reviews-with-pagination)
    - [90. Submit Product Review (`POST /api/v1/products/{productId}/reviews`)](#90-submit-product-review)
    - [91. Delete Product Review (`DELETE /api/v1/reviews/{id}`)](#91-delete-product-review)
16. [Inter-Branch Stock Transfers & Logistics Module Endpoints (`/api/v1/transfers`)](#16-inter-branch-stock-transfers--logistics-module-endpoints)
    - [92. Get All Stock Transfers (`GET /api/v1/transfers`)](#92-get-all-stock-transfers)
    - [93. Get Stock Transfer by ID (`GET /api/v1/transfers/{id}`)](#93-get-stock-transfer-by-id)
    - [94. Initiate Stock Transfer (`POST /api/v1/transfers`)](#94-initiate-stock-transfer)
    - [95. Update Stock Transfer Status (`PATCH /api/v1/transfers/{id}/status`)](#95-update-stock-transfer-status)
    - [96. Get Stock Transfer Metrics & KPIs (`GET /api/v1/transfers/metrics`)](#96-get-stock-transfer-metrics--kpis)
17. [Stock Health & Inventory Alerts Module Endpoints (`/api/v1/inventory`)](#17-stock-health--inventory-alerts-module-endpoints)
    - [97. Get Stock Health Report (`GET /api/v1/inventory/health-report`)](#97-get-stock-health-report)
    - [98. Update Product Inventory Alert Settings (`PATCH /api/v1/inventory/{productId}/settings`)](#98-update-product-inventory-alert-settings)
    - [99. Adjust Stock Quantity Delta (`POST /api/v1/inventory/{productId}/adjust`)](#99-adjust-stock-quantity-delta)
18. [Newsletter & Email Marketing Module Endpoints (`/api/v1/newsletter`)](#18-newsletter--email-marketing-module-endpoints)
    - [100. Get Newsletter Subscribers (`GET /api/v1/newsletter/subscribers`)](#100-get-newsletter-subscribers)
    - [101. Get Subscriber by ID (`GET /api/v1/newsletter/subscribers/{id}`)](#101-get-subscriber-by-id)
    - [102. Public Storefront Subscribe (`POST /api/v1/newsletter/subscribe`)](#102-public-storefront-subscribe)
    - [103. Public Storefront Unsubscribe (`POST /api/v1/newsletter/unsubscribe`)](#103-public-storefront-unsubscribe)
    - [104. Update Subscriber Status (`PATCH /api/v1/newsletter/subscribers/{id}/status`)](#104-update-subscriber-status)
    - [105. Update Subscriber Details (`PUT /api/v1/newsletter/subscribers/{id}`)](#105-update-subscriber-details)
    - [106. Delete Subscriber (`DELETE /api/v1/newsletter/subscribers/{id}`)](#106-delete-subscriber)
    - [107. Bulk Update Subscriber Status (`PATCH /api/v1/newsletter/subscribers/bulk-status`)](#107-bulk-update-subscriber-status)
    - [108. Bulk Delete Subscribers (`DELETE /api/v1/newsletter/subscribers/bulk-delete`)](#108-bulk-delete-subscribers)
    - [109. Send Campaign Broadcast (`POST /api/v1/newsletter/campaigns/send`)](#109-send-campaign-broadcast)
    - [110. Get Campaign History (`GET /api/v1/newsletter/campaigns`)](#110-get-campaign-history)
19. [Store Profile & Legal Policies Module Endpoints (`/api/v1/business-profile`, `/api/v1/policies`)](#19-store-profile--legal-policies-module-endpoints)
    - [111. Get Store Business Profile (`GET /api/v1/business-profile`)](#111-get-store-business-profile)
    - [112. Update Store Business Profile (`PUT /api/v1/business-profile`)](#112-update-store-business-profile)
    - [113. Get All Legal Policies (`GET /api/v1/policies`)](#113-get-all-legal-policies)
    - [114. Get Legal Policy by Slug (`GET /api/v1/policies/{slug}`)](#114-get-legal-policy-by-slug)
    - [115. Update Legal Policy (`PUT /api/v1/policies/{slug}`)](#115-update-legal-policy)
20. [AI Chatbot & Support Assistant Module Endpoints (`/api/v1/chat`)](#20-ai-chatbot--support-assistant-module-endpoints)
    - [116. Process AI Chat Message (`POST /api/v1/chat/message`)](#116-process-ai-chat-message)
21. [Financial Analytics & Reports Module Endpoints (`/api/v1/analytics`)](#21-financial-analytics--reports-module-endpoints)
    - [117. Get Financial & Sales Overview (`GET /api/v1/analytics/overview`)](#117-get-financial--sales-overview)
    - [118. Get Regional Branch Revenue Breakdown (`GET /api/v1/analytics/branch-revenue`)](#118-get-regional-branch-revenue-breakdown)
    - [119. Get Top Selling Products (`GET /api/v1/analytics/top-products`)](#119-get-top-selling-products)
22. [Role-Based Access Control (RBAC) Matrix](#22-role-based-access-control-rbac-matrix)
23. [Frontend Integration Client Helper (`JavaScript Fetch`)](#23-frontend-integration-client-helper)

---

## 1. System Overview & Server Configuration

- **Server Port**: `8080`
- **Application Context**: `/` (API mapped to `/api/v1`)
- **Authentication**: JWT Bearer Tokens (HMAC-SHA256, 24-hour expiration)
- **CORS Configuration**: Allowed all origins (`*`), credentials enabled, supported methods `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.
- **Enumerations**:
  - `UserRole`: `SUPERADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`
  - `Status`: `ACTIVE`, `INACTIVE`, `DELETED`
  - `BadgeRuleType`: `automatic`, `manual`, `system`
  - `OrderStatus`: `Pending`, `Processing`, `Shipped`, `Delivered`, `Cancelled`
  - `StockTransferStatus`: `PENDING`, `IN_TRANSIT`, `RECEIVED`, `CANCELLED`
  - `SubscriberStatus`: `SUBSCRIBED`, `UNSUBSCRIBED`
  - `SubscriberSource`: `STOREFRONT_BANNER`, `DEALS_PAGE`, `CHECKOUT`, `MANUAL`, `ACCOUNT`
  - `ProductBehaviorActor`: `SYSTEM_AUTO_RULE`, `ADMIN`, `STAFF`

---

## 2. Default Seed Data & Credentials

Upon backend initialization (`DataInitializer`), the database is automatically seeded with default branches, user accounts, taxonomy categories, hardware partner brands, badges, catalog products, business profile, legal policies, promotions, subscribers, and sample reviews:

### Default User Accounts

| Username | Password | Role | Assigned Branch | Description / Permissions |
|---|---|---|---|---|
| `superadmin` | `admin123` | `SUPERADMIN` | `null` (Store-Wide Owner) | Root system owner; immutable role & undeletable account; can manage all users, assign all roles, and perform permanent deletions. |
| `admin` | `admin123` | `ADMIN` | `null` (Store Administrator) | Store manager; can manage staff and customers, create products/brands/categories/badges/deals/campaigns; cannot modify or delete Superadmin or other Admins. |
| `staff_colombo` | `staff123` | `STAFF` | `BR-COL` (Colombo Hub) | Branch staff; can view directory, create and update products, manage inventory rebalancing transfers, and process order fulfillments. |
| `kasun` | `customer123` | `CUSTOMER` | `null` (Storefront Customer) | Storefront customer account; can browse catalog, submit orders & reviews, manage wishlist, self-manage profile and change password. |

### Regional Warehouse Branches

| Branch ID | Branch Name | City | Address | Hotline | Base Rate |
|---|---|---|---|---|---|
| `BR-COL` | Colombo Main Hub | Colombo | 450 Galle Road, Colombo 03 | +94 11 234 5678 | LKR 350.00 |
| `BR-GAL` | Galle Tech Hub | Galle | 12 Wakwella Road, Galle | +94 91 223 4567 | LKR 450.00 |
| `BR-MAT` | Matara Regional Hub | Matara | 88 Anagarika Dharmapala Mawatha, Matara | +94 41 222 3456 | LKR 500.00 |
| `BR-KAN` | Kandy Central Hub | Kandy | 102 Dalada Veediya, Kandy | +94 81 220 1234 | LKR 450.00 |

### Seed Categories

- `cat-laptops` (Laptops & Notebooks, slug: `laptops`, icon: 💻, featured: `true`, order: `1`)
- `cat-components` (PC Components, slug: `components`, icon: ⚙️, featured: `true`, order: `2`)
- `cat-peripherals` (Peripherals & Accessories, slug: `peripherals`, icon: 🖱️, featured: `true`, order: `3`)
- `cat-monitors` (Monitors & Displays, slug: `monitors`, icon: 🖥️, featured: `true`, order: `4`)
- `cat-storage` (Storage & Memory, slug: `storage`, icon: 💾, featured: `false`, order: `5`)
- `cat-networking` (Networking Gear, slug: `networking`, icon: 🌐, featured: `false`, order: `6`)

### Seed Brands

- `brd-asus` (ASUS, slug: `asus`, country: `Taiwan`, tagline: *"In Search of Incredible"*, order: `1`)
- `brd-msi` (MSI, slug: `msi`, country: `Taiwan`, tagline: *"True Gaming"*, order: `2`)
- `brd-corsair` (Corsair, slug: `corsair`, country: `USA`, tagline: *"Game On"*, order: `3`)
- `brd-intel` (Intel, slug: `intel`, country: `USA`, tagline: *"Do More"*, order: `4`)
- `brd-logitech` (Logitech, slug: `logitech`, country: `Switzerland`, tagline: *"Defy Logic"*, order: `5`)
- `brd-razer` (Razer, slug: `razer`, country: `USA`, tagline: *"For Gamers. By Gamers."*, order: `6`)

### Seed Badges

- `bdg-hotdeal` (Hot Deal, slug: `hotdeal`, color: `rose` / `#e11d48`, ruleType: `system`, priority: `1`, default: `true`, canEdit: `false`, canDelete: `false`)
- `bdg-bestseller` (Bestseller, slug: `bestseller`, color: `amber` / `#d97706`, ruleType: `automatic`, priority: `2`, default: `true`, canEdit: `true`, canDelete: `false`)
- `bdg-toprated` (Top Rated, slug: `toprated`, color: `emerald` / `#059669`, ruleType: `automatic`, priority: `3`, default: `true`, canEdit: `true`, canDelete: `false`)
- `bdg-new` (New Arrival, slug: `new`, color: `sky` / `#0284c7`, ruleType: `manual`, priority: `4`, default: `true`, canEdit: `true`, canDelete: `false`)

---

## 3. Authentication Flow & Headers

For all secured endpoints, provide the JWT token obtained from `POST /api/v1/auth/login` or `POST /api/v1/auth/register` in the HTTP Authorization header:

```http
Authorization: Bearer <your_jwt_token_here>
Content-Type: application/json
```

---

## 4. Standard Response Envelopes & Error Models

All business responses adhere to a consistent JSON envelope structure (`CommonResponse`):

```json
{
  "status": 200,
  "message": "Operation completed successfully",
  "body": { ... }
}
```

### Paginated Response Structure (`PageResponseDTO`)
```json
{
  "content": [ ... ],
  "pageNumber": 0,
  "pageSize": 50,
  "totalElements": 150,
  "totalPages": 3,
  "last": false
}
```

### Standard Error Response Models

**1. Bean Validation Error (`400 Bad Request`)**:
```json
{
  "status": 400,
  "message": "Validation failed",
  "body": {
    "email": "Invalid email format",
    "name": "Product name is required"
  }
}
```

**2. Unauthorized / Bad Credentials (`401 Unauthorized`)**:
```json
{
  "status": 401,
  "message": "Invalid username or password",
  "body": null
}
```

**3. Access Denied / Insufficient Role (`403 Forbidden`)**:
```json
{
  "status": 403,
  "message": "Access denied: Access Denied",
  "body": null
}
```

**4. Resource Not Found / Custom Exception (`404 Not Found`)**:
```json
{
  "status": 404,
  "message": "Product not found with id: 999",
  "body": null
}
```

---

## 5. Auth Module Endpoints

### 1. User Login
- **URL**: `POST /api/v1/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "superadmin",
    "password": "admin123"
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzdXBlcmFkbWluIi...",
    "user": {
      "id": 1,
      "username": "superadmin",
      "name": "System Owner & Super Admin",
      "email": "superadmin@etech.com",
      "role": "SUPERADMIN",
      "assignedBranch": null,
      "canManage": true
    }
  }
  ```

### 2. Customer Registration
- **URL**: `POST /api/v1/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "kamal",
    "name": "Kamal Gunaratne",
    "email": "kamal@gmail.com",
    "password": "password123"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrYW1hbCI...",
    "user": {
      "id": 5,
      "username": "kamal",
      "name": "Kamal Gunaratne",
      "email": "kamal@gmail.com",
      "role": "CUSTOMER",
      "assignedBranch": null,
      "canManage": false
    }
  }
  ```

### 3. Current User Session
- **URL**: `GET /api/v1/auth/me`
- **Access**: `isAuthenticated()`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response (`200 OK`)**:
  ```json
  {
    "id": 1,
    "username": "superadmin",
    "name": "System Owner & Super Admin",
    "email": "superadmin@etech.com",
    "role": "SUPERADMIN",
    "assignedBranch": null,
    "canManage": true
  }
  ```

---

## 6. User Management Module Endpoints

### 4. List Users Directory
- **URL**: `GET /api/v1/users`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Query Parameters**:
  - `role` *(optional)*: `SUPERADMIN | ADMIN | STAFF | CUSTOMER`
  - `branch` *(optional)*: Branch ID (e.g. `BR-COL`)
  - `search` *(optional)*: Substring search against username, name, or email
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Users retrieved successfully",
    "body": [
      {
        "id": 1,
        "username": "superadmin",
        "name": "System Owner & Super Admin",
        "email": "superadmin@etech.com",
        "role": "SUPERADMIN",
        "assignedBranch": null,
        "canManage": true,
        "createdAt": "2026-03-01T10:00:00"
      }
    ]
  }
  ```

### 5. List Employees Directory
- **URL**: `GET /api/v1/users/all-employees`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Query Parameters**: `role`, `branch`, `search`
- **Response (`200 OK`)**: List of users with employee roles (`SUPERADMIN`, `ADMIN`, `STAFF`).

### 6. List Customers Directory
- **URL**: `GET /api/v1/users/all-customers`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Query Parameters**: `search`
- **Response (`200 OK`)**: List of users with `CUSTOMER` role.

### 7. Get User by ID
- **URL**: `GET /api/v1/users/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "User retrieved successfully",
    "body": {
      "id": 3,
      "username": "staff_colombo",
      "name": "Colombo Branch Operations",
      "email": "staff.colombo@etech.com",
      "role": "STAFF",
      "assignedBranch": "BR-COL",
      "canManage": true
    }
  }
  ```

### 8. Create User Account
- **URL**: `POST /api/v1/users`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "username": "kandy_staff1",
    "name": "Kandy Operations Officer",
    "email": "kandy.staff1@etech.com",
    "password": "staffPassword123",
    "role": "STAFF",
    "assignedBranch": "BR-KAN"
  }
  ```
- **Response (`201 Created`)**: Returns created `UserDTO`.

### 9. Update User Details
- **URL**: `PUT /api/v1/users/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Colombo Senior Operations",
    "email": "colombo.lead@etech.com",
    "password": "newStaffPassword123",
    "role": "STAFF",
    "assignedBranch": "BR-COL"
  }
  ```
- **Response (`200 OK`)**: Returns updated `UserDTO`.

### 10. Change User Role
- **URL**: `PATCH /api/v1/users/{id}/role`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "role": "ADMIN",
    "assignedBranch": null
  }
  ```
- **Response (`200 OK`)**: Returns updated `UserDTO`.

### 11. Get System Roles
- **URL**: `GET /api/v1/users/roles`
- **Access**: Public
- **Response (`200 OK`)**: Returns all available roles `["SUPERADMIN", "ADMIN", "STAFF", "CUSTOMER"]`.

### 12. Change User Status
- **URL**: `PATCH /api/v1/users/{id}/status`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "status": "INACTIVE"
  }
  ```
- **Response (`200 OK`)**: Returns updated `UserDTO`.

### 13. Delete User Account
- **URL**: `DELETE /api/v1/users/{id}`
- **Access**: `SUPERADMIN`, `ADMIN` (Superadmin cannot be deleted; Admins cannot delete other Admins)
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "User account removed",
    "body": null
  }
  ```

### 14. Update Self Profile
- **URL**: `PUT /api/v1/users/me/profile`
- **Access**: `isAuthenticated()`
- **Request Body**:
  ```json
  {
    "name": "Kasun P. Perera",
    "email": "kasun.updated@gmail.com"
  }
  ```
- **Response (`200 OK`)**: Returns updated profile `UserDTO`.

### 15. Change Self Password
- **URL**: `PUT /api/v1/users/me/password`
- **Access**: `isAuthenticated()`
- **Request Body**:
  ```json
  {
    "currentPassword": "customer123",
    "newPassword": "MyNewSecurePassword999!"
  }
  ```
- **Response (`200 OK`)**: Returns success response.

---

## 7. Product Catalog & Inventory Module Endpoints

### 16. Get All Products
- **URL**: `GET /api/v1/products/all`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Products retrieved successfully",
    "body": [
      {
        "id": 1,
        "name": "ROG Strix SCAR 18 (2026)",
        "categoryId": "cat-laptops",
        "brandId": "brd-asus",
        "price": 849999.00,
        "originalPrice": 899999.00,
        "rating": 4.9,
        "reviewsCount": 48,
        "description": "Flagship 18-inch Mini-LED gaming laptop...",
        "sku": "ETC-LAP-001",
        "badgeId": "bdg-toprated",
        "warranty": "3-Year Official Warranty",
        "alertEnabled": true,
        "lowStockMargin": 3,
        "specs": {
          "Processor": "Intel Core Ultra 9 185H (24 Cores)",
          "Graphics": "NVIDIA GeForce RTX 4090 16GB"
        },
        "features": ["Conductonaut Extreme Liquid Metal", "Tri-Fan Cooling"],
        "images": ["https://images.unsplash.com/photo-1603302576837-37561b2e2302..."],
        "branchStock": {
          "BR-COL": 6,
          "BR-GAL": 3
        },
        "totalStock": 9,
        "productStatus": "ACTIVE"
      }
    ]
  }
  ```

### 17. Filter Products with Multi-Criteria & Pagination
- **URL**: `GET /api/v1/products/filter`
- **Access**: Public
- **Query Parameters**:
  - `category` *(optional)*: Category slug or ID (e.g. `laptops` or `cat-laptops`)
  - `brand` *(optional)*: Brand slug or ID (e.g. `asus` or `brd-asus`)
  - `search` *(optional)*: Text query against product name, SKU, or description
  - `minPrice` *(optional)*: Minimum price filter (e.g. `50000`)
  - `maxPrice` *(optional)*: Maximum price filter (e.g. `500000`)
  - `badge` *(optional)*: Badge slug or ID (e.g. `hotdeal`, `bestseller`)
  - `page` *(optional, default: 0)*: Page index
  - `size` *(optional, default: 20)*: Page size
  - `sortBy` *(optional, default: "id")*: Sort property (`price`, `rating`, `name`, `id`)
  - `sortDir` *(optional, default: "asc")*: Sort direction (`asc`, `desc`)
- **Response (`200 OK`)**: Filtered array of `ProductResponseDTO`.

### 18. Get Product by ID
- **URL**: `GET /api/v1/products/{id}`
- **Access**: Public
- **Response (`200 OK`)**: Product details `ProductResponseDTO`.

### 19. Get Product by SKU
- **URL**: `GET /api/v1/products/sku/{sku}`
- **Access**: Public
- **Response (`200 OK`)**: Product details `ProductResponseDTO`.

### 20. Get Products by Status
- **URL**: `GET /api/v1/products/status?status=ACTIVE`
- **Access**: Public
- **Response (`200 OK`)**: List of `ProductResponseDTO`.

### 21. Create Product
- **URL**: `POST /api/v1/products/create`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**:
  ```json
  {
    "name": "Corsair Dominator Titanium 64GB DDR5",
    "categoryId": "cat-storage",
    "brandId": "brd-corsair",
    "price": 95000.00,
    "originalPrice": 105000.00,
    "description": "Extreme speed 6000MHz CL30 RGB memory kit.",
    "fullDescription": "Precision-forged aluminum heatsink with patented DHX cooling.",
    "sku": "ETC-RAM-002",
    "badgeId": "bdg-new",
    "warranty": "Lifetime Warranty",
    "alertEnabled": true,
    "lowStockMargin": 5,
    "specs": {
      "Capacity": "64GB (2x32GB)",
      "Speed": "6000MT/s"
    },
    "features": ["iCUE RGB Lighting", "Intel XMP 3.0 Ready"],
    "images": ["https://images.unsplash.com/photo-1550745165..."],
    "branchStock": {
      "BR-COL": 10,
      "BR-GAL": 5,
      "BR-MAT": 4,
      "BR-KAN": 6
    },
    "productStatus": "ACTIVE"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "status": 201,
    "message": "Product created successfully",
    "body": null
  }
  ```

### 22. Update Product
- **URL**: `PUT /api/v1/products/update/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**: Same schema as `ProductRequestDTO`.
- **Response (`200 OK`)**: Returns updated `ProductResponseDTO`.

### 23. Update Branch Inventory Stock
- **URL**: `PATCH /api/v1/products/update-inventory`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**:
  ```json
  {
    "productId": 1,
    "branchId": "BR-COL",
    "quantity": 12
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Branch inventory updated successfully",
    "body": {
      "BR-COL": 12,
      "BR-GAL": 3,
      "BR-MAT": 0,
      "BR-KAN": 0
    }
  }
  ```

### 24. Update Product Status
- **URL**: `PATCH /api/v1/products/update-status/{id}?status=INACTIVE`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**: Success message.

### 25. Delete Product
- **URL**: `DELETE /api/v1/products/delete/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**: Success message.

---

## 8. Category Management Module Endpoints

### 26. Create Category
- **URL**: `POST /api/v1/categories/create`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "id": "cat-audio",
    "name": "Pro Audio & Microphones",
    "slug": "audio",
    "icon": "🎙️",
    "description": "Studio recording microphones, wireless audio interfaces, and monitoring headphones.",
    "featured": true,
    "displayOrder": 7
  }
  ```
- **Response (`200 OK`)**: Category created.

### 27. Get All Categories
- **URL**: `GET /api/v1/categories/all`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Categories retrieved successfully",
    "body": [
      {
        "id": "cat-laptops",
        "name": "Laptops & Notebooks",
        "slug": "laptops",
        "icon": "💻",
        "description": "High-performance gaming, ultrabooks...",
        "featured": true,
        "displayOrder": 1,
        "productCount": 1
      }
    ]
  }
  ```

### 28. Get Category by ID
- **URL**: `GET /api/v1/categories/{id}`
- **Access**: Public

### 29. Get Category by Slug
- **URL**: `GET /api/v1/categories/slug/{slug}`
- **Access**: Public

### 30. Get Category by Name
- **URL**: `GET /api/v1/categories/name/{name}`
- **Access**: Public

### 31. Filter Categories
- **URL**: `GET /api/v1/categories/filter?search=laptop`
- **Access**: Public

### 32. Get Categories by Status
- **URL**: `GET /api/v1/categories/status?status=ACTIVE`
- **Access**: Public

### 33. Update Category
- **URL**: `PUT /api/v1/categories/update/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "name": "Laptops & Ultra Workstations",
    "slug": "laptops",
    "icon": "💻",
    "description": "Next-gen AI laptops and mobile workstations",
    "featured": true,
    "displayOrder": 1
  }
  ```
- **Response (`200 OK`)**: Success message.

### 34. Update Category Status
- **URL**: `PATCH /api/v1/categories/update-status/{id}?status=INACTIVE`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**: Success message.

### 35. Delete Category (Soft Delete)
- **URL**: `DELETE /api/v1/categories/delete/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**: Category marked as `DELETED`.

### 36. Permanently Delete Category
- **URL**: `DELETE /api/v1/categories/perma-delete/{id}`
- **Access**: `SUPERADMIN`
- **Response (`200 OK`)**: Category permanently removed from database.

---

## 9. Brand Management Module Endpoints

### 37. Create Brand
- **URL**: `POST /api/v1/brands/create`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "id": "brd-amd",
    "name": "AMD",
    "slug": "amd",
    "logoUrl": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=200",
    "country": "USA",
    "foundedYear": "1969",
    "websiteUrl": "https://www.amd.com",
    "tagline": "together we advance_",
    "description": "Leader in Ryzen processors and Radeon graphics.",
    "featured": true,
    "status": "ACTIVE",
    "displayOrder": 7
  }
  ```
- **Response (`201 Created`)**: Brand created.

### 38. Get All Brands
- **URL**: `GET /api/v1/brands/all`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Brands retrieved successfully",
    "body": [
      {
        "id": "brd-asus",
        "name": "ASUS",
        "slug": "asus",
        "logoUrl": "https://images.unsplash.com/photo-1593642632823...",
        "country": "Taiwan",
        "foundedYear": "1989",
        "websiteUrl": "https://www.asus.com",
        "tagline": "In Search of Incredible",
        "description": "Leading provider of ROG gaming hardware...",
        "featured": true,
        "status": "ACTIVE",
        "displayOrder": 1,
        "productCount": 2
      }
    ]
  }
  ```

### 39. Get Featured Brands
- **URL**: `GET /api/v1/brands/featured`
- **Access**: Public

### 40. Get Brand by ID
- **URL**: `GET /api/v1/brands/{id}`
- **Access**: Public

### 41. Get Brand by Slug
- **URL**: `GET /api/v1/brands/slug/{slug}`
- **Access**: Public

### 42. Get Brand by Name
- **URL**: `GET /api/v1/brands/name/{name}`
- **Access**: Public

### 43. Filter Brands
- **URL**: `GET /api/v1/brands/filter?search=asus`
- **Access**: Public

### 44. Get Brands by Status
- **URL**: `GET /api/v1/brands/status/{status}`
- **Access**: `SUPERADMIN`, `ADMIN`

### 45. Update Brand
- **URL**: `PUT /api/v1/brands/update/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `BrandRequestDTO`
- **Response (`200 OK`)**: Success message.

### 46. Update Brand Status
- **URL**: `PATCH /api/v1/brands/update-status/{id}?status=INACTIVE`
- **Access**: `SUPERADMIN`, `ADMIN`

### 47. Delete Brand (Soft Delete)
- **URL**: `DELETE /api/v1/brands/delete/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`

### 48. Permanently Delete Brand
- **URL**: `DELETE /api/v1/brands/perma-delete/{id}`
- **Access**: `SUPERADMIN`

---

## 10. Badge & Rules Engine Module Endpoints

### 49. Create Badge
- **URL**: `POST /api/v1/badges/create`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "id": "bdg-limited",
    "name": "Limited Edition",
    "slug": "limited",
    "colorKey": "purple",
    "colorHex": "#9333ea",
    "purpose": "Exclusive limited collector runs",
    "standardDescription": "Exclusive hardware production units",
    "ruleType": "manual",
    "criteria": "manual_assignment",
    "priority": 5,
    "status": "ACTIVE"
  }
  ```
- **Response (`201 Created`)**: Badge created.

### 50. Get All Badges
- **URL**: `GET /api/v1/badges/all`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Badges retrieved successfully",
    "body": [
      {
        "id": "bdg-hotdeal",
        "name": "Hot Deal",
        "slug": "hotdeal",
        "colorKey": "rose",
        "colorHex": "#e11d48",
        "ruleType": "system",
        "criteria": "promo_active",
        "priority": 1,
        "isSystemDefault": true,
        "canEdit": false,
        "canDelete": false,
        "status": "ACTIVE",
        "productCount": 1
      }
    ]
  }
  ```

### 51. Get Active Badges
- **URL**: `GET /api/v1/badges/active`
- **Access**: Public

### 52. Get Badge by ID
- **URL**: `GET /api/v1/badges/{id}`
- **Access**: Public

### 53. Get Badge by Slug
- **URL**: `GET /api/v1/badges/slug/{slug}`
- **Access**: Public

### 54. Get Badge by Name
- **URL**: `GET /api/v1/badges/name/{name}`
- **Access**: Public

### 55. Filter Badges
- **URL**: `GET /api/v1/badges/filter?search=hot`
- **Access**: Public

### 56. Update Badge
- **URL**: `PUT /api/v1/badges/update/{id}`
- **Access**: `SUPERADMIN`, `ADMIN` (Cannot edit system-immutable badges where `canEdit=false`)

### 57. Update Badge Status
- **URL**: `PATCH /api/v1/badges/update-status/{id}?status=INACTIVE`
- **Access**: `SUPERADMIN`, `ADMIN`

### 58. Delete Badge (Soft Delete)
- **URL**: `DELETE /api/v1/badges/delete/{id}`
- **Access**: `SUPERADMIN`, `ADMIN` (Cannot delete default badges where `canDelete=false`)

### 59. Permanently Delete Badge
- **URL**: `DELETE /api/v1/badges/perma-delete/{id}`
- **Access**: `SUPERADMIN`

### 60. Run Automated Badge Assignment Engine
- **URL**: `POST /api/v1/badges/auto-assign`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Description**: Evaluates automated rules (e.g. Sales > 50 -> `Bestseller`, Rating >= 4.8 -> `Top Rated`, Created < 30 days -> `New Arrival`) and applies badges to qualified catalog items.
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Badges auto-assigned successfully",
    "body": {
      "evaluatedCount": 7,
      "assignedCount": 2,
      "changes": [
        {
          "productId": 2,
          "productName": "MSI GeForce RTX 4090 SUPRIM LIQUID X",
          "oldBadge": "bdg-new",
          "newBadge": "bdg-bestseller",
          "reason": "Sales volume exceeded threshold (>50 units)"
        }
      ]
    }
  }
  ```

---

## 11. Regional Warehouses & Logistics Module Endpoints

### 61. Get All Branches
- **URL**: `GET /api/v1/branches`
- **Access**: Public
- **Query Parameters**:
  - `activeOnly` *(optional)*: `true | false`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Branches retrieved successfully",
    "body": [
      {
        "id": "BR-COL",
        "name": "Colombo Main Hub",
        "city": "Colombo",
        "address": "450 Galle Road, Colombo 03",
        "phone": "+94 11 234 5678",
        "email": "colombo@etech.com",
        "latitude": 6.9271,
        "longitude": 79.8612,
        "baseShippingRate": 350.00,
        "active": true
      }
    ]
  }
  ```

### 62. Get Branch by ID
- **URL**: `GET /api/v1/branches/{id}`
- **Access**: Public

### 63. Create Branch
- **URL**: `POST /api/v1/branches`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "id": "BR-KUR",
    "name": "Kurunegala Tech Hub",
    "city": "Kurunegala",
    "address": "45 Colombo Road, Kurunegala",
    "phone": "+94 37 222 9999",
    "email": "kurunegala@etech.com",
    "latitude": 7.4863,
    "longitude": 80.3623,
    "baseShippingRate": 450.00,
    "active": true
  }
  ```
- **Response (`201 Created`)**: Returns created `BranchDTO`.

### 64. Update Branch
- **URL**: `PUT /api/v1/branches/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `BranchDTO`
- **Response (`200 OK`)**: Returns updated `BranchDTO`.

### 65. Delete Branch
- **URL**: `DELETE /api/v1/branches/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`

### 66. Calculate Nearest Branch & Shipping
- **URL**: `POST /api/v1/branches/nearest`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "city": "Dehiwala",
    "latitude": 6.8528,
    "longitude": 79.8656
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Nearest branch calculated successfully",
    "body": {
      "branch": {
        "id": "BR-COL",
        "name": "Colombo Main Hub",
        "city": "Colombo"
      },
      "distanceKm": 8.35,
      "shippingFee": 433.50
    }
  }
  ```

---

## 12. Promotions, Hot Deals & Bundles Module Endpoints

### 67. Get All Hot Deals
- **URL**: `GET /api/v1/promotions/hot-deals`
- **Access**: Public
- **Query Parameters**: `activeOnly` *(optional)*
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Hot deals retrieved successfully",
    "body": [
      {
        "id": 1,
        "productId": 2,
        "product": {
          "id": 2,
          "name": "MSI GeForce RTX 4090 SUPRIM LIQUID X 24G",
          "sku": "ETC-GPU-001",
          "price": 329999.00
        },
        "badge": "Hot Deal",
        "promoPrice": 299999.00,
        "originalPrice": 329999.00,
        "discountPercent": 10,
        "durationSeconds": 259200,
        "isActive": true
      }
    ]
  }
  ```

### 68. Create Hot Deal
- **URL**: `POST /api/v1/promotions/hot-deals`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "productId": 5,
    "badge": "Hot Deal",
    "promoPrice": 42000.00,
    "originalPrice": 49500.00,
    "discountPercent": 15,
    "durationSeconds": 172800,
    "isActive": true
  }
  ```
- **Response (`201 Created`)**: Returns `HotDealResponseDTO`.

### 69. Update Hot Deal
- **URL**: `PUT /api/v1/promotions/hot-deals/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `HotDealRequestDTO`
- **Response (`200 OK`)**: Returns updated `HotDealResponseDTO`.

### 70. Delete Hot Deal
- **URL**: `DELETE /api/v1/promotions/hot-deals/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`

### 71. Get Home Deal Banner
- **URL**: `GET /api/v1/promotions/home-banner`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Home deal banner retrieved successfully",
    "body": {
      "id": 1,
      "dealTag": "WEEKEND TECH BLOWOUT",
      "heading": "Next-Gen AI & Extreme Gaming Powerhouses",
      "subtitle": "Save up to 25% on ultra-high performance RTX 40-Series gaming laptops and OLED displays.",
      "buttonText": "Shop Weekend Deals",
      "buttonUrl": "#deals",
      "durationSeconds": 259200,
      "isActive": true
    }
  }
  ```

### 72. Update Home Deal Banner
- **URL**: `PUT /api/v1/promotions/home-banner`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `HomeDealBannerDTO`
- **Response (`200 OK`)**: Returns updated `HomeDealBannerDTO`.

### 73. Get All Deal Bundles
- **URL**: `GET /api/v1/promotions/bundles`
- **Access**: Public
- **Query Parameters**: `activeOnly` *(optional)*
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Deal bundles retrieved successfully",
    "body": [
      {
        "id": 1,
        "badge": "Special Bundle",
        "title": "Ultimate ROG RTX 4090 Battlestation Pro Bundle",
        "subtitle": "Flagship ROG SCAR 18 paired with Logitech mouse and Razer keyboard.",
        "imageUrl": "https://images.unsplash.com/photo-1593642632823...",
        "price": 929999.00,
        "originalPrice": 977499.00,
        "savingAmount": 47500.00,
        "savingPercent": 5,
        "targetQuota": 20,
        "soldCount": 4,
        "stockLeft": 9,
        "claimedPercent": 20,
        "durationSeconds": 432000,
        "isActive": true,
        "componentsBreakdown": [
          {
            "id": 1,
            "productId": 1,
            "name": "ROG Strix SCAR 18 (2026)",
            "sku": "ETC-LAP-001",
            "qty": 1,
            "unitPrice": 849999.00,
            "image": "https://images.unsplash.com/photo-1603302576837...",
            "displayOrder": 1
          }
        ]
      }
    ]
  }
  ```

### 74. Get Deal Bundle by ID
- **URL**: `GET /api/v1/promotions/bundles/{id}`
- **Access**: Public

### 75. Create Deal Bundle
- **URL**: `POST /api/v1/promotions/bundles`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "badge": "Creator Pack",
    "eyebrow": "Limited Hardware Bundle",
    "title": "4K OLED Content Creator Suite",
    "subtitle": "ASUS 32-inch 4K OLED monitor with Corsair 64GB DDR5 memory.",
    "imageUrl": "https://images.unsplash.com/photo-1527443224154...",
    "price": 499999.00,
    "originalPrice": 525000.00,
    "targetQuota": 15,
    "soldCount": 0,
    "durationSeconds": 259200,
    "isActive": true,
    "bundleItems": [
      {
        "productId": 7,
        "quantity": 1,
        "displayOrder": 1
      },
      {
        "productId": 3,
        "quantity": 1,
        "displayOrder": 2
      }
    ]
  }
  ```
- **Response (`201 Created`)**: Returns created `DealBundleResponseDTO`.

### 76. Update Deal Bundle
- **URL**: `PUT /api/v1/promotions/bundles/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `DealBundleRequestDTO`

### 77. Delete Deal Bundle
- **URL**: `DELETE /api/v1/promotions/bundles/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`

---

## 13. Customer Orders & Fulfillment Module Endpoints

### 78. Get All Orders
- **URL**: `GET /api/v1/orders`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Query Parameters**:
  - `status` *(optional)*: `Pending | Processing | Shipped | Delivered | Cancelled`
  - `branchId` *(optional)*: `BR-COL | BR-GAL | BR-MAT | BR-KAN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Orders retrieved successfully",
    "body": [
      {
        "id": 1,
        "orderCode": "ORD-2026-9482",
        "userId": 4,
        "customerName": "Kasun Perera",
        "customerEmail": "kasun.p@gmail.com",
        "customerPhone": "+94 77 123 4567",
        "shippingAddress": "12/A Flower Road, Colombo 07",
        "city": "Colombo",
        "fulfillmentBranchId": "BR-COL",
        "fulfillmentBranchName": "Colombo Main Hub",
        "distanceKm": 4.2,
        "subtotal": 849999.00,
        "shippingFee": 350.00,
        "tax": 0.00,
        "totalAmount": 850349.00,
        "status": "Pending",
        "paymentMethod": "CARD",
        "items": [
          {
            "id": 1,
            "productId": 1,
            "productName": "ROG Strix SCAR 18 (2026)",
            "productSku": "ETC-LAP-001",
            "unitPrice": 849999.00,
            "quantity": 1,
            "totalPrice": 849999.00,
            "image": "https://images.unsplash.com/..."
          }
        ],
        "orderDate": "2026-03-01T14:30:00"
      }
    ]
  }
  ```

### 79. Get My Orders History
- **URL**: `GET /api/v1/orders/my-orders`
- **Access**: `isAuthenticated()`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response (`200 OK`)**: List of `OrderResponseDTO` belonging to the authenticated customer.

### 80. Get Order by Tracking Code
- **URL**: `GET /api/v1/orders/{orderCode}`
- **Access**: Public
- **Response (`200 OK`)**: `OrderResponseDTO`.

### 81. Place New Order
- **URL**: `POST /api/v1/orders`
- **Access**: Public / Authenticated (if JWT is present, order is automatically linked to customer account)
- **Request Body**:
  ```json
  {
    "customerName": "Kasun Perera",
    "customerEmail": "kasun.p@gmail.com",
    "customerPhone": "+94 77 123 4567",
    "shippingAddress": "12/A Flower Road, Colombo 07",
    "city": "Colombo",
    "fulfillmentBranchId": "BR-COL",
    "distanceKm": 4.2,
    "paymentMethod": "CARD",
    "items": [
      {
        "productId": 5,
        "quantity": 1
      },
      {
        "productId": 6,
        "quantity": 1
      }
    ]
  }
  ```
- **Response (`201 Created`)**: Returns placed `OrderResponseDTO` with generated `orderCode` and decremented branch stock.

### 82. Update Order Fulfillment Status
- **URL**: `PATCH /api/v1/orders/{id}/status`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**:
  ```json
  {
    "status": "Processing"
  }
  ```
- **Response (`200 OK`)**: Returns updated `OrderResponseDTO`.

---

## 14. Customer Wishlist Module Endpoints

### 83. Get Customer Wishlist
- **URL**: `GET /api/v1/wishlist`
- **Access**: `isAuthenticated()`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Wishlist retrieved successfully",
    "body": {
      "success": true,
      "total": 2,
      "items": [
        {
          "id": 1,
          "productId": 1,
          "name": "ROG Strix SCAR 18 (2026)",
          "sku": "ETC-LAP-001",
          "price": 849999.00,
          "originalPrice": 899999.00,
          "image": "https://images.unsplash.com/...",
          "category": "Laptops & Notebooks",
          "inStock": true,
          "totalStock": 9,
          "savedAt": "2026-03-02T11:20:00"
        }
      ]
    }
  }
  ```

### 84. Toggle Product in Wishlist
- **URL**: `POST /api/v1/wishlist/toggle/{productId}`
- **Access**: `isAuthenticated()`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Wishlist item toggled successfully",
    "body": {
      "success": true,
      "added": true,
      "productId": 5,
      "message": "Product added to your wishlist",
      "wishlistCount": 3
    }
  }
  ```

### 85. Add Product to Wishlist
- **URL**: `POST /api/v1/wishlist/add/{productId}`
- **Access**: `isAuthenticated()`
- **Response (`201 Created`)**: Returns `WishlistActionResponseDTO`.

### 86. Remove Item from Wishlist
- **URL**: `DELETE /api/v1/wishlist/remove/{productId}`
- **Access**: `isAuthenticated()`
- **Response (`200 OK`)**: Returns `WishlistActionResponseDTO`.

### 87. Clear Entire Wishlist
- **URL**: `DELETE /api/v1/wishlist/clear`
- **Access**: `isAuthenticated()`
- **Response (`200 OK`)**: Returns `WishlistActionResponseDTO`.

### 88. Move Wishlist Items to Cart
- **URL**: `POST /api/v1/wishlist/move-to-cart`
- **Access**: `isAuthenticated()`
- **Request Body**:
  ```json
  {
    "productIds": [1, 5]
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Items moved to cart successfully",
    "body": {
      "success": true,
      "movedCount": 2,
      "cartTotal": 899499.00
    }
  }
  ```

---

## 15. Product Reviews & Ratings Module Endpoints

### 89. Get Product Reviews with Pagination
- **URL**: `GET /api/v1/products/{productId}/reviews`
- **Access**: Public
- **Query Parameters**:
  - `page` *(optional, default: 0)*
  - `size` *(optional, default: 50)*
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Product reviews retrieved successfully",
    "body": {
      "content": [
        {
          "id": "REV-10001",
          "productId": 1,
          "userId": 4,
          "userName": "Kasun Perera",
          "userEmail": "kasun.p@gmail.com",
          "rating": 5,
          "comment": "Unbelievable power! Handles 4K gaming and 3D rendering like a breeze.",
          "createdAt": "2026-03-01T16:00:00"
        }
      ],
      "pageNumber": 0,
      "pageSize": 50,
      "totalElements": 1,
      "totalPages": 1,
      "last": true
    }
  }
  ```

### 90. Submit Product Review
- **URL**: `POST /api/v1/products/{productId}/reviews`
- **Access**: `isAuthenticated()`
- **Request Body**:
  ```json
  {
    "rating": 5,
    "comment": "Silent acoustics under heavy load and breathtaking Mini-LED screen!"
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "status": 201,
    "message": "Review submitted successfully",
    "body": {
      "review": {
        "id": "REV-10002",
        "productId": 1,
        "userName": "Kasun Perera",
        "rating": 5,
        "comment": "Silent acoustics under heavy load..."
      },
      "updatedProductRating": 4.95,
      "totalReviews": 49
    }
  }
  ```

### 91. Delete Product Review
- **URL**: `DELETE /api/v1/reviews/{id}`
- **Access**: `isAuthenticated()` (Owner of review or `ADMIN` / `SUPERADMIN`)
- **Response (`200 OK`)**: Success message.

---

## 16. Inter-Branch Stock Transfers & Logistics Module Endpoints

### 92. Get All Stock Transfers
- **URL**: `GET /api/v1/transfers`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Query Parameters**:
  - `status` *(optional)*: `PENDING | IN_TRANSIT | RECEIVED | CANCELLED`
  - `branchId` *(optional)*: `BR-COL | BR-GAL | BR-MAT | BR-KAN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Stock transfers retrieved successfully",
    "body": [
      {
        "id": "TRF-84920",
        "productId": 1,
        "productName": "ROG Strix SCAR 18 (2026)",
        "productSku": "ETC-LAP-001",
        "fromBranchId": "BR-COL",
        "fromBranchName": "Colombo Main Hub",
        "toBranchId": "BR-KAN",
        "toBranchName": "Kandy Central Hub",
        "quantity": 2,
        "status": "PENDING",
        "reason": "Stock rebalancing for high demand in Kandy region",
        "initiatedBy": "staff_colombo",
        "notes": "Fragile transport with insurance",
        "createdAt": "2026-03-02T09:00:00"
      }
    ]
  }
  ```

### 93. Get Stock Transfer by ID
- **URL**: `GET /api/v1/transfers/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`

### 94. Initiate Stock Transfer
- **URL**: `POST /api/v1/transfers`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**:
  ```json
  {
    "productId": 5,
    "fromBranchId": "BR-COL",
    "toBranchId": "BR-GAL",
    "quantity": 5,
    "reason": "Replenishing esports peripheral inventory in Galle",
    "notes": "Direct expressway logistics courier"
  }
  ```
- **Response (`201 Created`)**: Returns initiated `StockTransferResponseDTO`.

### 95. Update Stock Transfer Status
- **URL**: `PATCH /api/v1/transfers/{id}/status`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**:
  ```json
  {
    "status": "RECEIVED"
  }
  ```
- **Response (`200 OK`)**: Automatically handles inventory reconciliation (deducts from source branch upon dispatch, adds to destination branch upon receipt).

### 96. Get Stock Transfer Metrics & KPIs
- **URL**: `GET /api/v1/transfers/metrics`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Transfer metrics retrieved successfully",
    "body": {
      "pendingCount": 3,
      "inTransitCount": 2,
      "receivedCount": 28,
      "totalUnitsMoved": 142
    }
  }
  ```

---

## 17. Stock Health & Inventory Alerts Module Endpoints

### 97. Get Stock Health Report
- **URL**: `GET /api/v1/inventory/health-report`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Query Parameters**: `branchId` *(optional)*
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Stock health report retrieved successfully",
    "body": {
      "totalMonitored": 7,
      "depletedCount": 0,
      "lowStockCount": 1,
      "branchHealth": {
        "BR-COL": {
          "branchId": "BR-COL",
          "branchName": "Colombo Main Hub",
          "totalUnits": 84,
          "lowStockCount": 0,
          "depletedCount": 0,
          "healthScore": 98.50
        }
      },
      "alerts": [
        {
          "productId": 7,
          "productName": "ASUS ROG Swift OLED PG32UCDM 32\" 4K 240Hz",
          "productSku": "ETC-MON-001",
          "category": "Monitors & Displays",
          "alertType": "LOW_STOCK",
          "totalStock": 9,
          "lowStockMargin": 3,
          "branchStock": {
            "BR-COL": 5,
            "BR-GAL": 2,
            "BR-KAN": 2
          }
        }
      ]
    }
  }
  ```

### 98. Update Product Inventory Alert Settings
- **URL**: `PATCH /api/v1/inventory/{productId}/settings`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "alertEnabled": true,
    "lowStockMargin": 5
  }
  ```
- **Response (`200 OK`)**: Returns updated `ProductResponseDTO`.

### 99. Adjust Stock Quantity Delta
- **URL**: `POST /api/v1/inventory/{productId}/adjust`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "branchId": "BR-COL",
    "quantityDelta": 10
  }
  ```
- **Response (`200 OK`)**: Returns updated `ProductResponseDTO`.

---

## 18. Newsletter & Email Marketing Module Endpoints

### 100. Get Newsletter Subscribers
- **URL**: `GET /api/v1/newsletter/subscribers`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Query Parameters**:
  - `search` *(optional)*: Substring filter
  - `status` *(optional)*: `SUBSCRIBED | UNSUBSCRIBED`
  - `page` *(optional, default: 0)*
  - `size` *(optional, default: 50)*
- **Response (`200 OK`)**: `PageResponseDTO<SubscriberDTO>`.

### 101. Get Subscriber by ID
- **URL**: `GET /api/v1/newsletter/subscribers/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`

### 102. Public Storefront Subscribe
- **URL**: `POST /api/v1/newsletter/subscribe`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "gamer.pro@gmail.com",
    "name": "Esports Enthusiast"
  }
  ```
- **Response (`201 Created`)**: Returns `SubscriberDTO`.

### 103. Public Storefront Unsubscribe
- **URL**: `POST /api/v1/newsletter/unsubscribe`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "gamer.pro@gmail.com"
  }
  ```
- **Response (`200 OK`)**: Success message.

### 104. Update Subscriber Status
- **URL**: `PATCH /api/v1/newsletter/subscribers/{id}/status?status=UNSUBSCRIBED`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`

### 105. Update Subscriber Details
- **URL**: `PUT /api/v1/newsletter/subscribers/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Request Body**: `SubscriberRequestDTO`

### 106. Delete Subscriber
- **URL**: `DELETE /api/v1/newsletter/subscribers/{id}`
- **Access**: `SUPERADMIN`, `ADMIN`

### 107. Bulk Update Subscriber Status
- **URL**: `PATCH /api/v1/newsletter/subscribers/bulk-status?status=SUBSCRIBED`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `[1, 2, 3, 4]`

### 108. Bulk Delete Subscribers
- **URL**: `DELETE /api/v1/newsletter/subscribers/bulk-delete`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `[1, 2]`

### 109. Send Campaign Broadcast
- **URL**: `POST /api/v1/newsletter/campaigns/send`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "subject": "Exclusive Weekend Mega Drop: RTX 4090 Systems In Stock",
    "preheader": "Save up to LKR 50,000 on ROG SCAR 18 & OLED monitors",
    "category": "Promotions",
    "targetSegment": "All Active Subscribers",
    "contentHtml": "<h1>Weekend Deals</h1><p>Check out our latest arrivals!</p>",
    "authorName": "ETech Marketing Team"
  }
  ```
- **Response (`201 Created`)**: Returns `CampaignDTO` with recipient count.

### 110. Get Campaign History
- **URL**: `GET /api/v1/newsletter/campaigns`
- **Access**: `SUPERADMIN`, `ADMIN`, `STAFF`
- **Response (`200 OK`)**: List of `CampaignDTO`.

---

## 19. Store Profile & Legal Policies Module Endpoints

### 111. Get Store Business Profile
- **URL**: `GET /api/v1/business-profile`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Business profile retrieved successfully",
    "body": {
      "id": 1,
      "storeName": "ETech Computers (Pvt) Ltd",
      "tagline": "Sri Lanka's Premier Next-Gen High Performance Computing & Gaming Hub",
      "registrationNo": "PV-00249581",
      "taxId": "TIN-100294829-7000",
      "isoCert": "ISO 9001:2015 Certified",
      "supportEmail": "support@etechcomputers.lk",
      "hotline": "1330",
      "headquarters": "450 Galle Road, Kollupitiya, Colombo 03, Sri Lanka",
      "workingHours": "Mon - Fri: 09:00 AM - 07:00 PM | Sat - Sun: 10:00 AM - 05:00 PM",
      "missionStatement": "Empowering gamers, creators, and enterprises with the latest high-performance computing hardware.",
      "companyStory": "Founded in Colombo, ETech Computers has grown to be Sri Lanka's leading enthusiast computer hardware supplier."
    }
  }
  ```

### 112. Update Store Business Profile
- **URL**: `PUT /api/v1/business-profile`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `BusinessProfileDTO`
- **Response (`200 OK`)**: Returns updated `BusinessProfileDTO`.

### 113. Get All Legal Policies
- **URL**: `GET /api/v1/policies`
- **Access**: Public
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Legal policies retrieved successfully",
    "body": [
      {
        "id": "terms-of-service",
        "title": "Terms of Service",
        "subtitle": "Store terms, purchase agreements, order conditions...",
        "lastUpdated": "January 2026",
        "policySections": {
          "Order Fulfillment & Pricing": "All hardware prices are listed in Sri Lankan Rupees (LKR)...",
          "Shipping & Delivery": "We offer nationwide delivery with tracking..."
        }
      }
    ]
  }
  ```

### 114. Get Legal Policy by Slug
- **URL**: `GET /api/v1/policies/{slug}` (e.g. `/api/v1/policies/warranty-guarantee`)
- **Access**: Public

### 115. Update Legal Policy
- **URL**: `PUT /api/v1/policies/{slug}`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Request Body**: `LegalPolicyDTO`
- **Response (`200 OK`)**: Returns updated `LegalPolicyDTO`.

---

## 20. AI Chatbot & Support Assistant Module Endpoints

### 116. Process AI Chat Message
- **URL**: `POST /api/v1/chat/message`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "message": "Can you recommend the fastest gaming laptop under 900,000 LKR for 4K video editing and Cyberpunk 2077?",
    "history": [
      {
        "sender": "user",
        "text": "Hi, what brands do you carry?"
      },
      {
        "sender": "assistant",
        "text": "We carry ASUS ROG, MSI, Corsair, Intel, Logitech, and Razer."
      }
    ],
    "cart": []
  }
  ```
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Chat message processed successfully",
    "body": {
      "reply": "I highly recommend the **ROG Strix SCAR 18 (2026)** (LKR 849,999.00). It features an Intel Core Ultra 9 185H processor, NVIDIA GeForce RTX 4090 16GB GPU, and a stunning 18\" Mini-LED HDR 1100 display with 240Hz refresh rate!",
      "suggestedProducts": [1],
      "timestamp": "2026-03-02T16:45:00"
    }
  }
  ```

---

## 21. Financial Analytics & Reports Module Endpoints

### 117. Get Financial & Sales Overview
- **URL**: `GET /api/v1/analytics/overview`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Analytics overview retrieved successfully",
    "body": {
      "grossRevenue": 4850000.00,
      "totalOrders": 12,
      "avgOrderValue": 404166.67,
      "activeUsers": 4
    }
  }
  ```

### 118. Get Regional Branch Revenue Breakdown
- **URL**: `GET /api/v1/analytics/branch-revenue`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Branch revenue breakdown retrieved successfully",
    "body": [
      {
        "branchId": "BR-COL",
        "branchName": "Colombo Main Hub",
        "orderCount": 8,
        "revenue": 3400000.00,
        "percentage": 70.10
      },
      {
        "branchId": "BR-KAN",
        "branchName": "Kandy Central Hub",
        "orderCount": 2,
        "revenue": 850000.00,
        "percentage": 17.53
      },
      {
        "branchId": "BR-GAL",
        "branchName": "Galle Tech Hub",
        "orderCount": 2,
        "revenue": 600000.00,
        "percentage": 12.37
      }
    ]
  }
  ```

### 119. Get Top Selling Products
- **URL**: `GET /api/v1/analytics/top-products?limit=5`
- **Access**: `SUPERADMIN`, `ADMIN`
- **Response (`200 OK`)**:
  ```json
  {
    "status": 200,
    "message": "Top products retrieved successfully",
    "body": [
      {
        "productId": 1,
        "name": "ROG Strix SCAR 18 (2026)",
        "unitsSold": 4,
        "revenue": 3399996.00
      },
      {
        "productId": 5,
        "name": "Logitech G PRO X SUPERLIGHT 2 Wireless Gaming Mouse",
        "unitsSold": 14,
        "revenue": 693000.00
      }
    ]
  }
  ```

---

## 22. Role-Based Access Control (RBAC) Matrix

| Module & Action | Endpoint | Public / Guest | CUSTOMER | STAFF | ADMIN | SUPERADMIN |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Auth: Login / Register** | `POST /api/v1/auth/*` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Auth: Current Session** | `GET /api/v1/auth/me` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Users: Directory & Manage** | `GET, POST, PUT, DELETE /api/v1/users/**` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Users: List System Roles** | `GET /api/v1/users/roles` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Users: Self Profile & Password** | `PUT /api/v1/users/me/*` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Products: Browse & Filter** | `GET /api/v1/products/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Products: Create & Update** | `POST, PUT, PATCH /api/v1/products/*` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Products: Status & Delete** | `PATCH status, DELETE /api/v1/products/*` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Categories: Browse & Filter** | `GET /api/v1/categories/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Categories: Create, Update, Soft-Delete** | `POST, PUT, PATCH, DELETE /api/v1/categories/*` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Categories: Permanent Delete** | `DELETE /api/v1/categories/perma-delete/*` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Brands: Browse & Filter** | `GET /api/v1/brands/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Brands: Create, Update, Soft-Delete** | `POST, PUT, PATCH, DELETE /api/v1/brands/*` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Brands: Permanent Delete** | `DELETE /api/v1/brands/perma-delete/*` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Badges: Browse & Active** | `GET /api/v1/badges/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Badges: Create, Update, Soft-Delete, Auto-Assign** | `POST, PUT, PATCH, DELETE /api/v1/badges/*` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Badges: Permanent Delete** | `DELETE /api/v1/badges/perma-delete/*` | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Branches: Browse & Calculate Nearest** | `GET, POST /api/v1/branches/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Branches: Create, Update, Delete** | `POST, PUT, DELETE /api/v1/branches/*` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Promotions: Browse Hot Deals & Bundles** | `GET /api/v1/promotions/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Promotions: Manage Deals & Banners** | `POST, PUT, DELETE /api/v1/promotions/**` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Orders: Place Order & Track by Code** | `POST /orders`, `GET /orders/{code}` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Orders: Customer Order History** | `GET /api/v1/orders/my-orders` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Orders: Manage & Update Status** | `GET /orders`, `PATCH /orders/{id}/status` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Wishlist: Self Management** | `GET, POST, DELETE /api/v1/wishlist/**` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Reviews: View Product Reviews** | `GET /api/v1/products/{id}/reviews` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Reviews: Submit & Delete Self Review** | `POST /reviews`, `DELETE /reviews/{id}` | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Transfers: Stock Logistics & Metrics** | `GET, POST, PATCH /api/v1/transfers/**` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Inventory: Health Report & Stock Alerts** | `GET /health-report`, `PATCH /settings` | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Newsletter: Public Subscribe/Unsubscribe** | `POST /api/v1/newsletter/subscribe|unsubscribe` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Newsletter: Manage & Broadcast Campaigns** | `GET, PUT, PATCH, DELETE, POST send` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Store Profile & Policies: View** | `GET /api/v1/business-profile`, `GET /policies/**` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Store Profile & Policies: Update** | `PUT /api/v1/business-profile`, `PUT /policies/**` | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AI Chatbot: Support Assistant** | `POST /api/v1/chat/message` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Analytics: Financial & Sales Reports** | `GET /api/v1/analytics/**` | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 23. Frontend Integration Client Helper (`JavaScript Fetch`)

Use this unified JavaScript client module to seamlessly communicate with all backend APIs from your HTML5 / Vanilla JS frontend:

```javascript
/**
 * ETech Computers — Central API Client Module
 * Base URL: http://localhost:8080/api/v1
 */
const API_BASE_URL = 'http://localhost:8080/api/v1';

export const apiClient = {
  // Token Storage Helpers
  getToken() {
    return localStorage.getItem('etech_jwt_token');
  },
  setToken(token) {
    localStorage.setItem('etech_jwt_token', token);
  },
  clearToken() {
    localStorage.removeItem('etech_jwt_token');
  },

  // Base HTTP Request Wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
      throw error;
    }
  },

  // Convenience HTTP Methods
  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(query ? `${endpoint}?${query}` : endpoint, { method: 'GET' });
  },
  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },
  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },
  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  },
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // --- Auth APIs ---
  auth: {
    login: (credentials) => apiClient.post('/auth/login', credentials),
    register: (userData) => apiClient.post('/auth/register', userData),
    me: () => apiClient.get('/auth/me'),
  },

  // --- Product Catalog APIs ---
  products: {
    getAll: () => apiClient.get('/products/all'),
    filter: (params) => apiClient.get('/products/filter', params),
    getById: (id) => apiClient.get(`/products/${id}`),
    getBySku: (sku) => apiClient.get(`/products/sku/${sku}`),
    create: (product) => apiClient.post('/products/create', product),
    update: (id, product) => apiClient.put(`/products/update/${id}`, product),
    updateStock: (productId, branchId, quantity) => 
      apiClient.patch('/products/update-inventory', { productId, branchId, quantity }),
    delete: (id) => apiClient.delete(`/products/delete/${id}`),
  },

  // --- Taxonomy & Brand APIs ---
  categories: {
    getAll: () => apiClient.get('/categories/all'),
    getById: (id) => apiClient.get(`/categories/${id}`),
  },
  brands: {
    getAll: () => apiClient.get('/brands/all'),
    getFeatured: () => apiClient.get('/brands/featured'),
  },
  badges: {
    getAll: () => apiClient.get('/badges/all'),
    autoAssign: () => apiClient.post('/badges/auto-assign'),
  },

  // --- Logistics & Branches ---
  branches: {
    getAll: (activeOnly) => apiClient.get('/branches', { activeOnly }),
    findNearest: (coords) => apiClient.post('/branches/nearest', coords),
  },
  transfers: {
    getAll: (params) => apiClient.get('/transfers', params),
    initiate: (transfer) => apiClient.post('/transfers', transfer),
    updateStatus: (id, status) => apiClient.patch(`/transfers/${id}/status`, { status }),
    getMetrics: () => apiClient.get('/transfers/metrics'),
  },

  // --- Orders & Wishlist ---
  orders: {
    getAll: (params) => apiClient.get('/orders', params),
    getMyOrders: () => apiClient.get('/orders/my-orders'),
    getByCode: (code) => apiClient.get(`/orders/${code}`),
    placeOrder: (order) => apiClient.post('/orders', order),
    updateStatus: (id, status) => apiClient.patch(`/orders/${id}/status`, { status }),
  },
  wishlist: {
    get: () => apiClient.get('/wishlist'),
    toggle: (productId) => apiClient.post(`/wishlist/toggle/${productId}`),
    clear: () => apiClient.delete('/wishlist/clear'),
    moveToCart: (productIds) => apiClient.post('/wishlist/move-to-cart', { productIds }),
  },

  // --- Chatbot, Newsletter & Analytics ---
  chat: {
    sendMessage: (payload) => apiClient.post('/chat/message', payload),
  },
  newsletter: {
    subscribe: (payload) => apiClient.post('/newsletter/subscribe', payload),
    unsubscribe: (email) => apiClient.post('/newsletter/unsubscribe', { email }),
  },
  analytics: {
    getOverview: () => apiClient.get('/analytics/overview'),
    getBranchRevenue: () => apiClient.get('/analytics/branch-revenue'),
    getTopProducts: (limit = 5) => apiClient.get('/analytics/top-products', { limit }),
  }
};
```
