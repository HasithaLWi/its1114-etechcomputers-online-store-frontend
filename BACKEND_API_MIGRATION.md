# ETech Computers — Backend API Integration & Spring Boot / MySQL Migration Specification

> **Master Specification Document**: This document serves as the authoritative blueprint for transitioning the ETech Computers Online Store frontend from client-side mock datasets and `localStorage` to a production-ready **Spring Boot REST API** backed by a **MySQL Database**.
> 
> *Maintained and updated to reflect all frontend data models, centralized data architecture (`src/data/`), taxonomy engines, Deal Bundles & dynamic composite inventory, Hot Deals, synchronized deal timers, Inter-Branch Transfer logistics, stock health matrix, rating systems, AI assistants, 4-tier Role-Based Access Control (RBAC), and administration modules.*

---

## Table of Contents
1. [System Architecture: Current vs. Target Backend](#1-system-architecture-current-vs-target-backend)
2. [Current `localStorage` Keys & Centralized Mock Repositories (`src/data/`)](#2-current-localstorage-keys--centralized-mock-repositories-srcdata)
3. [Entity Relationship Diagram (ERD)](#3-entity-relationship-diagram-erd)
4. [MySQL Relational Database Schema (DDL)](#4-mysql-relational-database-schema-ddl)
5. [Spring Boot REST Endpoints Specification](#5-spring-boot-rest-endpoints-specification)
   - [Auth & User Management (`/api/v1/auth`, `/api/v1/users`)](#auth--user-management)
   - [Customer Wishlist (`/api/v1/wishlist`)](#customer-wishlist)
   - [Newsletter & Email Marketing (`/api/v1/newsletter`)](#newsletter--email-marketing)
   - [Product Catalog & Gallery (`/api/v1/products`)](#product-catalog--gallery)
   - [Product Ratings & Reviews (`/api/v1/reviews`)](#product-ratings--reviews)
   - [Categories & Storefront Taxonomy (`/api/v1/categories`)](#categories--storefront-taxonomy)
   - [Hardware Brands & Manufacturer Partners (`/api/v1/brands`)](#hardware-brands--manufacturer-partners)
   - [Badges & Automated Rules Engine (`/api/v1/badges`)](#badges--automated-rules-engine)
   - [Hot Deals & Promotional Campaigns (`/api/v1/promotions/hot-deals`, `/api/v1/promotions/home-banner`)](#hot-deals--promotional-campaigns)
   - [Deal Bundles & Composite Inventory (`/api/v1/promotions/bundles`)](#deal-bundles--composite-inventory)
   - [Inter-Branch Stock Transfers & Logistics (`/api/v1/transfers`)](#inter-branch-stock-transfers--logistics)
   - [Product Behavior History & Audit Logs (`/api/v1/product-behavior-history`)](#product-behavior-history--audit-logs)
   - [Branch Warehouses (`/api/v1/branches`)](#branch-warehouses)
   - [Stock Health & Inventory Alerts (`/api/v1/inventory`)](#stock-health--inventory-alerts)
   - [Orders & Fulfillment (`/api/v1/orders`)](#orders--fulfillment)
   - [Store Profile & Legal Policies (`/api/v1/business-profile`, `/api/v1/policies`)](#store-profile--legal-policies)
   - [AI Chatbot & Support Assistant (`/api/v1/chat`)](#ai-chatbot--support-assistant)
   - [Financial Analytics & Reports (`/api/v1/analytics`)](#financial-analytics--reports)
6. [Spring Boot Application Architecture & Dependencies](#6-spring-boot-application-architecture--dependencies)
7. [Client-Side Simplifications & Role-Based UI Security (RBAC)](#7-client-side-simplifications--role-based-ui-security-rbac)
   - [Architectural Regulations: Database-Driven Frontend & Single Source of Truth](#architectural-regulations-database-driven-frontend--single-source-of-truth)
8. [Frontend API Service Layer Architecture (`src/js/api/`)](#8-frontend-api-service-layer-architecture-srcjsapi)
9. [Step-by-Step Backend Migration & Cutover Checklist](#9-step-by-step-backend-migration--cutover-checklist)

---

## 1. System Architecture: Current vs. Target Backend

```mermaid
flowchart TD
    subgraph Frontend["Frontend SPA (HTML5 / Vanilla JS / Tailwind CSS / jQuery AJAX)"]
        UI["UI Layer (index.html, DOM Renderers, Modals, Drawers)"]
        Controllers["Controllers (shop, cart, wishlist, newsletter, product-details, taxonomy, brand_management, promotion_management, hot_deal, transfer_management, stock_health, login, user_management, branch_management, policy_management, analytics)"]
        APILayer["API Service Client Layer (src/js/api/apiClient.js, userApi.js, brandsApi.js, newsletterApi.js, etc.)"]
    end

    subgraph Current["Current State (Mock / Centralized src/data/ + localStorage)"]
        DataDir[("Central Data Seeds: src/data/\nproducts, brands, deals, transfers, taxonomy,\nbranches, users, orders, policies, ratings, newsletter")]
        LocalStorage[("Browser localStorage Cache\netech_products, etech_brands_data,\netech_deal_bundles, etech_hot_deals,\netech_wishlist, etech_newsletter_subscribers,\netech_stock_transfers, etech_taxonomy, etc.")]
        DataDir -.->|Hydrates on First Run| LocalStorage
    end

    subgraph Target["Target Backend (Spring Boot 3.3+ + MySQL 8.x)"]
        APILayer -->|HTTP / REST (JSON + JWT Bearer)| SpringSecurity["Spring Security 6 (JWT Filter Chain)"]
        SpringSecurity --> RESTControllers["Spring REST Controllers (@RestController)"]
        RESTControllers --> Services["Business Services (@Service + @Transactional)"]
        Services --> RulesEngine["Automated Badge & Stock Rules Engine"]
        Services --> CompositeEngine["Deal Bundle Inventory & Bottleneck Engine"]
        Services --> TransferEngine["Inter-Branch Stock Movement Engine"]
        Services --> BrandEngine["Brand Showcase & Catalog Filter Engine"]
        Services --> NewsletterEngine["Newsletter Broadcast & Template Engine"]
        Services --> GeminiProxy["Gemini 2.0 AI Proxy Service"]
        Services --> Repositories["Spring Data JPA Repositories"]
        Repositories --> Hibernate["Hibernate ORM"]
        Repositories --> MySQL[("MySQL 8.x Database Engine")]
    end

    Controllers -.->|Current Fallback Direct Access| LocalStorage
    Controllers -->|Production Integration Target| APILayer
```

---

## 2. Current `localStorage` Keys & Centralized Mock Repositories (`src/data/`)

All mock data is centralized under `src/data/` and `src/js/models/` as the single source of truth:

| Key | Current Seed & Model Files | Purpose in Client App | Target Spring Boot Endpoint(s) | Action Upon Backend Switch |
|---|---|---|---|---|
| `etech_products` | `src/data/products.js`<br>`src/js/models/data.js` | Stores all product catalog data, specs, image URLs, total stock, and branch stock breakdown | `GET /api/v1/products`<br>`POST /api/v1/products`<br>`PUT /api/v1/products/{id}`<br>`DELETE /api/v1/products/{id}` | **Replace completely** with API fetch calls. |
| `etech_brands_data` | `src/data/brands.js`<br>`src/js/models/brand_data.js` | Stores official hardware partner brands, logos, origin country, website, and homepage featured status | `GET /api/v1/brands`<br>`POST /api/v1/brands`<br>`PUT /api/v1/brands/{id}`<br>`DELETE /api/v1/brands/{id}` | **Replace completely** with API fetch calls. |
| `etech_categories_data` | `src/data/taxonomy.js`<br>`src/js/models/taxonomy_data.js` | Stores category hierarchy, icons, slugs, descriptions, and storefront featured flags | `GET /api/v1/categories`<br>`POST /api/v1/categories`<br>`PUT /api/v1/categories/{id}`<br>`DELETE /api/v1/categories/{id}` | **Replace completely** with API fetch calls. |
| `etech_badges_data` | `src/data/taxonomy.js`<br>`src/js/models/taxonomy_data.js` | Stores badge tags, colors, `isSystemDefault`, `canEdit`, `canDelete`, and automated reach criteria | `GET /api/v1/badges`<br>`POST /api/v1/badges`<br>`PUT /api/v1/badges/{id}`<br>`DELETE /api/v1/badges/{id}`<br>`POST /api/v1/badges/auto-assign` | **Replace completely** with API calls. Server enforces immutability on core badges. |
| `etech_product_behavior_history` | `src/data/taxonomy.js`<br>`src/js/models/taxonomy_data.js` | Stores audit log of product reach triggers, automated badge transitions, and manual overrides | `GET /api/v1/product-behavior-history`<br>`GET /api/v1/products/{id}/behavior-history`<br>`POST /api/v1/product-behavior-history` | **Replace completely** with database-backed audit table. |
| `etech_deal_bundles` | `src/data/deals.js`<br>`src/js/models/deals_data.js` | Stores package bundles with linked store product items, calculated bottlenecks, and timers | `GET /api/v1/promotions/bundles`<br>`POST /api/v1/promotions/bundles`<br>`PUT /api/v1/promotions/bundles/{id}`<br>`DELETE /api/v1/promotions/bundles/{id}` | **Replace completely**. Inventory bottlenecks calculate on server. |
| `etech_hot_deals` | `src/data/deals.js`<br>`src/js/models/deals_data.js` | Stores Hot Deal campaign products, promo pricing overrides, and countdown durations | `GET /api/v1/promotions/hot-deals`<br>`POST /api/v1/promotions/hot-deals`<br>`PUT /api/v1/promotions/hot-deals/{id}`<br>`DELETE /api/v1/promotions/hot-deals/{id}` | **Replace completely**. Hot Deal overrides product price dynamically. |
| `etech_home_deal_banner` | `src/data/deals.js`<br>`src/js/models/deals_data.js` | Stores Weekend Tech Deal homepage hero banner configuration and synchronized timer | `GET /api/v1/promotions/home-banner`<br>`PUT /api/v1/promotions/home-banner` | **Replace completely** with database table. |
| `etech_stock_transfers` | `src/data/transfers.js`<br>`src/js/models/transfers_data.js` | Stores inter-branch stock rebalancing transfers, kit assembly transfers, and status lifecycles | `GET /api/v1/transfers`<br>`POST /api/v1/transfers`<br>`PATCH /api/v1/transfers/{id}/status` | **Replace completely**. Server manages stock movements atomically. |
| `etech_product_reviews` | `src/data/ratings_reviews.js`<br>`src/js/models/rating_data.js` | Stores 1–5 star customer text reviews, updating average ratings and review counts | `GET /api/v1/products/{id}/reviews`<br>`POST /api/v1/products/{id}/reviews`<br>`DELETE /api/v1/reviews/{id}` | **Replace completely** with database table. |
| `etech_branches` | `src/data/branches.js`<br>`src/js/controller/branch_controller.js` | Stores regional warehouse hubs (Colombo, Galle, Matara, Kandy) with geo coordinates & base rates | `GET /api/v1/branches`<br>`POST /api/v1/branches`<br>`PUT /api/v1/branches/{id}`<br>`DELETE /api/v1/branches/{id}` | **Replace completely** with API fetch calls. |
| `etech_orders` | `src/data/orders.js`<br>`src/js/controller/order_management_controller.js` | Stores customer orders, delivery distances, fulfillment branch, item arrays, and status | `GET /api/v1/orders`<br>`GET /api/v1/orders/my-orders`<br>`POST /api/v1/orders`<br>`PATCH /api/v1/orders/{id}/status` | **Replace completely** with API fetch calls. |
| `etech_wishlist` | `src/js/controller/wishlist_controller.js` | Stores saved hardware items, fast bookmarks, and batch cart move operations | `GET /api/v1/wishlist`<br>`POST /api/v1/wishlist/toggle/{productId}`<br>`DELETE /api/v1/wishlist/remove/{productId}`<br>`DELETE /api/v1/wishlist/clear`<br>`POST /api/v1/wishlist/move-to-cart` | **Replace completely** with database table for authenticated users. |
| `etech_newsletter_subscribers` | `src/js/models/newsletter_model.js`<br>`src/js/api/newsletterApi.js` | Stores audience subscriber emails, acquisition channel, tags, and lifecycle statuses | `GET /api/v1/newsletter/subscribers`<br>`POST /api/v1/newsletter/subscribe`<br>`POST /api/v1/newsletter/unsubscribe`<br>`PATCH /api/v1/newsletter/subscribers/{id}/status`<br>`DELETE /api/v1/newsletter/subscribers/{id}` | **Replace completely** with database table. |
| `etech_newsletter_campaigns` | `src/js/models/newsletter_model.js`<br>`src/js/api/newsletterApi.js` | Stores broadcast marketing campaign logs, open rate analytics, and delivery timestamps | `GET /api/v1/newsletter/campaigns`<br>`POST /api/v1/newsletter/campaigns/send`<br>`GET /api/v1/newsletter/analytics` | **Replace completely** with database table. |
| `etech_users` / `DEFAULT_USERS` | `src/data/users.js`<br>`src/js/controller/login_controller.js`<br>`src/js/models/user_model.js` | Stores user directory with unique username, status (`ACTIVE`, `INACTIVE`), 4-tier role (`SUPERADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`), and branch assignments | `GET /api/v1/users`<br>`POST /api/v1/auth/register`<br>`POST /api/v1/users`<br>`PATCH /api/v1/users/{id}/status`<br>`PATCH /api/v1/users/{id}/role` | **Replace completely**. Spring Security manages BCrypt passwords, status guards, & RBAC. |
| `etech_jwt_token` | `src/js/api/apiClient.js` | Stores active authentication JWT Bearer token | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/register` | **Keep in `localStorage`** for stateless session authentication. |
| `etech_current_user` | `src/js/controller/login_controller.js`<br>`src/js/models/user_model.js` | Stores current logged-in user profile & role session (`SUPERADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`) | `POST /api/v1/auth/login`<br>`GET /api/v1/auth/me` | **Keep minimal**: Store only active user profile DTO. |
| `etech_cart` | `src/js/controller/cart_controller.js` | Stores active shopping cart items and quantities | Optional: `GET/POST /api/v1/cart` (or keep in `localStorage` for guest sessions) | Can **remain in `localStorage`** for guest carts, syncing on checkout. |
| `etech_business_info` | `src/data/policies.js`<br>`src/js/models/policy-data.js` | Corporate business details, registration no, tax ID, ISO credentials, and hotline | `GET /api/v1/business-profile`<br>`PUT /api/v1/business-profile` | **Replace completely** with database table. |
| `etech_policies` | `src/data/policies.js`<br>`src/js/models/policy-data.js` | Legal compliance policies (Privacy Policy, Terms of Service, Guarantee & Warranty) | `GET /api/v1/policies`<br>`GET /api/v1/policies/{slug}`<br>`PUT /api/v1/policies/{slug}` | **Replace completely** with database table. |

---

## 3. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS ||--o{ PRODUCT_REVIEWS : writes
    USERS ||--o{ WISHLIST_ITEMS : saves
    USERS }o--o| BRANCHES : "assigned to (Staff)"
    
    BRANCHES ||--o{ BRANCH_INVENTORY : stocks
    BRANCHES ||--o{ ORDERS : fulfills
    BRANCHES ||--o{ STOCK_TRANSFERS : "transfers out"
    BRANCHES ||--o{ STOCK_TRANSFERS : "transfers in"
    
    CATEGORIES ||--o{ PRODUCTS : categorizes
    BRANDS ||--o{ PRODUCTS : manufactures
    
    PRODUCTS ||--o{ PRODUCT_IMAGES : contains
    PRODUCTS ||--o{ BRANCH_INVENTORY : distributed_across
    PRODUCTS ||--o{ PRODUCT_REVIEWS : receives
    PRODUCTS ||--o{ PRODUCT_BEHAVIOR_HISTORY : audits
    PRODUCTS ||--o{ ORDER_ITEMS : ordered_as
    PRODUCTS ||--o{ BUNDLE_ITEMS : packaged_in
    PRODUCTS ||--o{ WISHLIST_ITEMS : "saved in"
    PRODUCTS ||--o| HOT_DEALS : promoted_as
    PRODUCTS ||--o{ STOCK_TRANSFERS : transferred_item
    
    DEAL_BUNDLES ||--|{ BUNDLE_ITEMS : includes
    ORDERS ||--|{ ORDER_ITEMS : includes

    BRANDS {
        varchar id PK "e.g. brd-asus"
        varchar name UK
        varchar slug UK
        text logo_url
        varchar country
        varchar founded_year
        varchar website_url
        varchar tagline
        text description
        boolean featured
        boolean active
        int display_order
    }

    USERS {
        bigint id PK
        varchar username UK
        varchar name
        varchar email UK
        varchar password_hash
        enum role "SUPERADMIN, ADMIN, STAFF, CUSTOMER"
        enum status "ACTIVE, INACTIVE"
        varchar assigned_branch_id FK
        timestamp created_at
    }

    WISHLIST_ITEMS {
        bigint id PK
        bigint user_id FK
        bigint product_id FK
        timestamp created_at
    }

    NEWSLETTER_SUBSCRIBERS {
        bigint id PK
        varchar email UK
        varchar name
        enum status "SUBSCRIBED, UNSUBSCRIBED"
        enum source "STOREFRONT_BANNER, DEALS_PAGE, CHECKOUT, MANUAL, ACCOUNT"
        json tags_json
        timestamp subscribed_at
        timestamp unsubscribed_at
        timestamp last_campaign_sent_at
        varchar ip_address
    }

    NEWSLETTER_CAMPAIGNS {
        varchar id PK "e.g. camp_20260825_01"
        varchar subject
        varchar preheader
        varchar category
        varchar target_segment
        longtext content_html
        timestamp sent_at
        int recipients_count
        varchar status
        decimal open_rate
        decimal click_rate
        varchar author_name
    }

    BRANCHES {
        varchar id PK "e.g. BR-COL"
        varchar name
        varchar city
        text address
        varchar phone
        varchar email
        decimal latitude
        decimal longitude
        decimal base_shipping_rate
        boolean active
    }

    CATEGORIES {
        varchar id PK "e.g. cat-laptops"
        varchar name
        varchar slug UK
        varchar icon
        text description
        boolean featured
        int display_order
    }

    BADGES {
        varchar id PK "e.g. bdg-hotdeal"
        varchar name UK
        varchar slug UK
        varchar color_key
        varchar color_hex
        text purpose
        text standard_description
        enum rule_type "automatic, manual, system"
        varchar criteria
        int priority
        boolean is_system_default
        boolean can_edit
        boolean can_delete
        boolean is_active
    }

    PRODUCTS {
        bigint id PK
        varchar name
        varchar category_slug FK
        varchar brand
        decimal price
        decimal original_price
        decimal rating
        int reviews_count
        text image_url
        text description
        longtext full_description
        varchar sku UK
        varchar badge
        varchar warranty
        boolean alert_enabled
        int low_stock_margin
        json specs_json
        json features_json
        timestamp created_at
    }

    PRODUCT_IMAGES {
        bigint id PK
        bigint product_id FK
        text image_url
        int display_order
    }

    BRANCH_INVENTORY {
        bigint id PK
        bigint product_id FK
        varchar branch_id FK
        int quantity
        timestamp updated_at
    }

    DEAL_BUNDLES {
        bigint id PK
        varchar badge
        varchar eyebrow
        varchar title
        varchar subtitle
        text image_url
        decimal price
        decimal original_price
        int target_quota
        int sold_count
        int duration_seconds
        timestamp timer_updated_at
        boolean is_active
        timestamp created_at
    }

    BUNDLE_ITEMS {
        bigint id PK
        bigint bundle_id FK
        bigint product_id FK
        int quantity
        int display_order
    }

    HOT_DEALS {
        bigint id PK
        bigint product_id FK UK
        varchar badge
        decimal promo_price
        decimal original_price
        int discount_percent
        int duration_seconds
        timestamp timer_updated_at
        boolean is_active
        timestamp created_at
    }

    STOCK_TRANSFERS {
        varchar id PK "e.g. TRF-2026-001"
        bigint product_id FK
        varchar from_branch_id FK
        varchar to_branch_id FK
        int quantity
        enum status "PENDING, IN_TRANSIT, RECEIVED, CANCELLED"
        varchar reason
        varchar initiated_by
        text notes
        timestamp created_at
        timestamp dispatched_at
        timestamp received_at
        timestamp cancelled_at
    }

    PRODUCT_REVIEWS {
        varchar id PK "e.g. REV-10001"
        bigint product_id FK
        bigint user_id FK
        varchar user_name
        varchar user_email
        int rating "1 to 5"
        text comment
        timestamp created_at
    }

    PRODUCT_BEHAVIOR_HISTORY {
        varchar id PK "e.g. pbe-1723824000-123"
        bigint product_id FK
        varchar product_name
        enum event_type
        varchar previous_value
        varchar new_value
        text trigger_reason
        json metrics_snapshot
        enum actor "SYSTEM_AUTO_RULE, ADMIN, STAFF"
        timestamp created_at
    }

    ORDERS {
        bigint id PK
        varchar order_code UK "e.g. ORD-2026-8492"
        bigint user_id FK
        varchar customer_name
        varchar customer_email
        varchar customer_phone
        text shipping_address
        varchar city
        varchar fulfillment_branch_id FK
        decimal distance_km
        decimal subtotal
        decimal shipping_fee
        decimal tax
        decimal total_amount
        enum status "Pending, Processing, Shipped, Delivered, Cancelled"
        varchar payment_method
        timestamp order_date
    }

    ORDER_ITEMS {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        varchar product_name
        varchar product_sku
        decimal unit_price
        int quantity
        decimal total_price
    }

    BUSINESS_PROFILE {
        int id PK
        varchar store_name
        varchar tagline
        varchar registration_no
        varchar tax_id
        varchar iso_cert
        varchar support_email
        varchar hotline
        text headquarters
        varchar working_hours
        text mission_statement
        text company_story
    }

    LEGAL_POLICIES {
        varchar id PK "privacy, terms, warranty"
        varchar title
        varchar subtitle
        varchar last_updated
        json sections_json
    }
```

---

## 4. MySQL Relational Database Schema (DDL)

```sql
-- ============================================================
-- ETech Computers — Production Relational Database Schema
-- Database Engine: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS etech_computers_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE etech_computers_db;

-- 1. Branches Table (Regional Warehouse Hubs)
CREATE TABLE branches (
    id VARCHAR(20) PRIMARY KEY, -- e.g., 'BR-COL', 'BR-GAL', 'BR-MAT', 'BR-KAN'
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    base_shipping_rate DECIMAL(10, 2) NOT NULL DEFAULT 350.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Users Table (Super Admin, Administrators, Branch Staff, & Customers)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('SUPERADMIN', 'ADMIN', 'STAFF', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    status ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    assigned_branch_id VARCHAR(20) NULL, -- NULL indicates Global / Cross-Branch Scope (e.g. Super Admin Owner)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- 3. Categories Table (Storefront & Catalog Taxonomy)
CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'cat-laptops', 'cat-components'
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT '📦',
    description TEXT,
    featured BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_slug (slug)
) ENGINE=InnoDB;

-- 4. Badges & Automated Rules Engine Table
CREATE TABLE badges (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'bdg-bestseller', 'bdg-hotdeal'
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    color_key VARCHAR(30) NOT NULL DEFAULT 'blue',
    color_hex VARCHAR(20) NOT NULL DEFAULT '#2563eb',
    purpose TEXT,
    standard_description TEXT,
    rule_type ENUM('automatic', 'manual', 'system') NOT NULL DEFAULT 'manual',
    criteria VARCHAR(100) DEFAULT 'custom',
    priority INT DEFAULT 10,
    is_system_default BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT TRUE,
    can_delete BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Hardware Brands & Manufacturer Partners Table
CREATE TABLE brands (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'brd-asus', 'brd-intel', 'brd-corsair'
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    logo_url TEXT,
    country VARCHAR(100) DEFAULT 'Global',
    founded_year VARCHAR(20),
    website_url VARCHAR(255),
    tagline VARCHAR(255),
    description TEXT,
    featured BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_brands_slug (slug),
    INDEX idx_brands_featured (featured)
) ENGINE=InnoDB;

-- 6. Products Table (Master Catalog Entity)
CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_slug VARCHAR(100) NOT NULL,
    brand VARCHAR(100) DEFAULT '',
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2) NOT NULL,
    rating DECIMAL(2, 1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    image_url TEXT NOT NULL,
    description TEXT,
    full_description LONGTEXT,
    sku VARCHAR(100) NOT NULL UNIQUE,
    badge VARCHAR(50) DEFAULT '',
    warranty VARCHAR(150) DEFAULT '2-Year Warranty',
    alert_enabled BOOLEAN DEFAULT TRUE,
    low_stock_margin INT DEFAULT 5,
    specs_json JSON,        -- e.g. {"Processor": "i9-14900HX", "Memory": "32GB DDR5"}
    features_json JSON,     -- e.g. ["Liquid Metal Cooling", "RGB Keyboard"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_slug) REFERENCES categories(slug) ON UPDATE CASCADE,
    INDEX idx_products_sku (sku),
    INDEX idx_products_category (category_slug),
    INDEX idx_products_price (price)
) ENGINE=InnoDB;

-- 7. Product Gallery Images (Multi-Image Support, Max 5 Images)
CREATE TABLE product_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    image_url TEXT NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_images_product (product_id)
) ENGINE=InnoDB;

-- 8. Branch Warehouse Stock Allocation (Many-to-Many Bridge)
CREATE TABLE branch_inventory (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    branch_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_branch (product_id, branch_id),
    INDEX idx_inventory_lookup (product_id, branch_id)
) ENGINE=InnoDB;

-- 9. Deal Bundles (Featured Carousel & Package Rig Deals)
CREATE TABLE deal_bundles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    badge VARCHAR(50) NOT NULL DEFAULT 'BEST DEAL',
    eyebrow VARCHAR(100) DEFAULT 'FEATURED DEAL',
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT,
    price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2) NOT NULL,
    target_quota INT DEFAULT 20,
    sold_count INT DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 86400,
    timer_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. Bundle Items (Components Breakdown Bridge)
CREATE TABLE bundle_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bundle_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    display_order INT DEFAULT 0,
    FOREIGN KEY (bundle_id) REFERENCES deal_bundles(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_bundle_items_bundle (bundle_id)
) ENGINE=InnoDB;

-- 11. Hot Deals Table (Individual Promotional Hot Deals)
CREATE TABLE hot_deals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL UNIQUE,
    badge VARCHAR(50) NOT NULL DEFAULT 'HOT DEAL',
    promo_price DECIMAL(12, 2) NOT NULL,
    original_price DECIMAL(12, 2) NOT NULL,
    discount_percent INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 86400,
    timer_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_hot_deals_product (product_id)
) ENGINE=InnoDB;

-- 12. Home Deal Banner (Weekend Tech Deal Hero Banner)
CREATE TABLE home_deal_banner (
    id INT PRIMARY KEY DEFAULT 1,
    deal_tag VARCHAR(100) NOT NULL DEFAULT 'WEEKEND TECH DEAL',
    heading TEXT NOT NULL,
    subtitle VARCHAR(255),
    button_text VARCHAR(100) DEFAULT 'View All Deals',
    button_url VARCHAR(255) DEFAULT '#deals',
    background_image TEXT,
    duration_seconds INT NOT NULL DEFAULT 86400,
    timer_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 13. Inter-Branch Stock Transfers (Logistics Hub)
CREATE TABLE stock_transfers (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'TRF-2026-001'
    product_id BIGINT NOT NULL,
    from_branch_id VARCHAR(20) NOT NULL,
    to_branch_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('PENDING', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(255) NOT NULL,
    initiated_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatched_at TIMESTAMP NULL,
    received_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    INDEX idx_transfers_status (status),
    INDEX idx_transfers_branches (from_branch_id, to_branch_id)
) ENGINE=InnoDB;

-- 14. Product Ratings & Customer Reviews Table
CREATE TABLE product_reviews (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'REV-10001'
    product_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product_review (product_id, user_id),
    INDEX idx_reviews_product (product_id)
) ENGINE=InnoDB;

-- 15. Product Behavior History & Audit Log Table
CREATE TABLE product_behavior_history (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'pbe-1723824000-123'
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    event_type ENUM(
        'BADGE_AUTO_ASSIGNED', 
        'STANDARD_REACHED', 
        'BADGE_MANUAL_OVERRIDE', 
        'CATEGORY_CHANGED', 
        'PRICE_MARKDOWN', 
        'RESTOCK_TRIGGER'
    ) NOT NULL,
    previous_value VARCHAR(255),
    new_value VARCHAR(255),
    trigger_reason TEXT,
    metrics_snapshot JSON,
    actor ENUM('SYSTEM_AUTO_RULE', 'ADMIN', 'STAFF') NOT NULL DEFAULT 'SYSTEM_AUTO_RULE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_behavior_product (product_id),
    INDEX idx_behavior_event (event_type)
) ENGINE=InnoDB;

-- 16. Orders Table (Customer Checkout & Fulfillment)
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE, -- e.g. 'ORD-2026-8492'
    user_id BIGINT NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    shipping_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    fulfillment_branch_id VARCHAR(20) NOT NULL,
    distance_km DECIMAL(6, 2) DEFAULT 0.0,
    subtotal DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Credit / Debit Card',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (fulfillment_branch_id) REFERENCES branches(id),
    INDEX idx_orders_code (order_code),
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_date (order_date)
) ENGINE=InnoDB;

-- 17. Order Items Table
CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_order_items_order (order_id)
) ENGINE=InnoDB;

-- 18. Business Profile Table (Store Credentials & Operations Matrix)
CREATE TABLE business_profile (
    id INT PRIMARY KEY DEFAULT 1,
    store_name VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    registration_no VARCHAR(100) NOT NULL,
    tax_id VARCHAR(100) NOT NULL,
    iso_cert VARCHAR(150),
    support_email VARCHAR(150) NOT NULL,
    hotline VARCHAR(100) NOT NULL,
    headquarters TEXT NOT NULL,
    working_hours VARCHAR(255),
    mission_statement TEXT,
    company_story TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 19. Legal Policies Table (Privacy, Terms, Guarantee & Warranty)
CREATE TABLE legal_policies (
    id VARCHAR(50) PRIMARY KEY, -- 'privacy', 'terms', 'warranty'
    title VARCHAR(150) NOT NULL,
    subtitle VARCHAR(255),
    last_updated VARCHAR(50),
    sections_json JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 20. Customer Wishlist Items Table
CREATE TABLE wishlist_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_wishlist_product (user_id, product_id),
    INDEX idx_wishlist_user (user_id),
    INDEX idx_wishlist_product (product_id)
) ENGINE=InnoDB;

-- 21. Newsletter & Email Marketing Subscribers Table
CREATE TABLE newsletter_subscribers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    name VARCHAR(100) NULL,
    status ENUM('SUBSCRIBED', 'UNSUBSCRIBED') NOT NULL DEFAULT 'SUBSCRIBED',
    source ENUM('STOREFRONT_BANNER', 'DEALS_PAGE', 'CHECKOUT', 'MANUAL', 'ACCOUNT') NOT NULL DEFAULT 'STOREFRONT_BANNER',
    tags_json JSON NULL, -- e.g. ["VIP Gamer", "NVIDIA GPU Alerts"]
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL,
    last_campaign_sent_at TIMESTAMP NULL,
    ip_address VARCHAR(45) DEFAULT '127.0.0.1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subscribers_email (email),
    INDEX idx_subscribers_status (status),
    INDEX idx_subscribers_source (source)
) ENGINE=InnoDB;

-- 22. Newsletter Marketing Broadcast Campaigns Log Table
CREATE TABLE newsletter_campaigns (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'camp_20260825_01'
    subject VARCHAR(255) NOT NULL,
    preheader VARCHAR(255) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL_NEWS',
    target_segment VARCHAR(50) NOT NULL DEFAULT 'ALL_ACTIVE',
    content_html LONGTEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recipients_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'DELIVERED',
    open_rate DECIMAL(4, 1) DEFAULT 0.0,
    click_rate DECIMAL(4, 1) DEFAULT 0.0,
    author_name VARCHAR(100) NOT NULL DEFAULT 'Admin Team',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_campaigns_sent_at (sent_at),
    INDEX idx_campaigns_category (category)
) ENGINE=InnoDB;
```

---

## 5. Spring Boot REST Endpoints Specification

All endpoints are prefixed with `/api/v1`.

### Auth & User Management

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Public | Authenticate user via username/password & issue JWT with role claims (`SUPERADMIN`, `ADMIN`, `STAFF`, `CUSTOMER`) | `{ "username": "superadmin", "password": "..." }` | `{ "token": "jwt.token...", "user": { "id": "USR-100000", "username": "superadmin", "name": "System Owner & Super Admin", "email": "superadmin@etech.com", "role": "SUPERADMIN", "assignedBranch": null } }` |
| `POST` | `/api/v1/auth/register` | Public | Register new customer account | `{ "name": "...", "username": "...", "email": "...", "password": "..." }` | `{ "token": "jwt.token...", "user": { "id": "USR-100004", "username": "...", "name": "...", "email": "...", "role": "CUSTOMER", "assignedBranch": null } }` |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve current session profile & role | Headers: `Authorization: Bearer <token>` | Current User Profile DTO |
| `PUT` | `/api/v1/users/me/profile` | Authenticated | Update current user personal profile (Name, Username, Email) | `{ "name": "...", "username": "...", "email": "..." }` | Updated User Profile DTO |
| `PUT` | `/api/v1/users/me/password` | Authenticated | Change current user account password | `{ "currentPassword": "...", "newPassword": "..." }` | `{ "success": true, "message": "Password changed" }` |
| `GET` | `/api/v1/users` | `SUPERADMIN, ADMIN` | List system users.<br>- **Superadmin**: Returns all users across all roles.<br>- **Admin**: Returns other Admins (marked `canManage: false`), Staff, and Customers. **`SUPERADMIN` records are stripped out completely** (invisible to Admin). | Query: `?role=STAFF&branch=BR-COL&search=kasun` | List of User DTOs |
| `GET` | `/api/v1/users/{id}` | `SUPERADMIN, ADMIN` | Fetch single user details by ID | None | User DTO |
| `GET` | `/api/v1/users/roles` | Public / Auth | Fetch dynamic list of available system user roles configured in database | None | `[ "SUPERADMIN", "ADMIN", "STAFF", "CUSTOMER" ]` |
| `POST` | `/api/v1/users` | `SUPERADMIN, ADMIN` | Create user account.<br>- **Superadmin**: Can create `ADMIN`, `STAFF`, `CUSTOMER`.<br>- **Admin**: Can only create `STAFF`, `CUSTOMER`. Attempt to create `ADMIN` or `SUPERADMIN` yields `403 Forbidden`. | `{ "name": "...", "username": "...", "email": "...", "password": "...", "role": "STAFF", "assignedBranch": "BR-GAL" }` | Created User DTO |
| `PUT` | `/api/v1/users/{id}` | `SUPERADMIN, ADMIN` | Update user details & branch.<br>- **Superadmin**: Full update authority.<br>- **Admin**: Can only update `STAFF` and `CUSTOMER`. Modifying an `ADMIN` or `SUPERADMIN` yields `403 Forbidden`. | User Form DTO | Updated User DTO |
| `PATCH` | `/api/v1/users/{id}/status` | `SUPERADMIN, ADMIN` | Change user lifecycle status (`ACTIVE` or `INACTIVE`).<br>- **Active**: User can log in and place orders.<br>- **Inactive**: User account is locked/disabled.<br>- **Protection**: Superadmin account status cannot be modified (`400 Bad Request`). Admin cannot disable other Admin accounts (`403 Forbidden`). | `{ "status": "INACTIVE" }` | Updated User DTO |
| `PATCH` | `/api/v1/users/{id}/role` | `SUPERADMIN, ADMIN` | Change user role.<br>- **Superadmin**: Can switch between `ADMIN`, `STAFF`, `CUSTOMER`. (Superadmin account is immutable).<br>- **Admin**: Can only switch between `CUSTOMER` and `STAFF`. Promoting to or altering an `ADMIN` yields `403 Forbidden`. | `{ "role": "STAFF", "assignedBranch": "BR-COL" }` | Updated User DTO |
| `DELETE` | `/api/v1/users/{id}` | `SUPERADMIN, ADMIN` | Delete user account.<br>- **Superadmin account (`USR-100000`) cannot be deleted by anyone** (`400 Bad Request`).<br>- **Admin cannot delete other Admin accounts** (`403 Forbidden`). Can only delete `STAFF` and `CUSTOMER`. | None | `{ "success": true, "message": "User account removed" }` |

### Customer Wishlist

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/wishlist` | Authenticated | Retrieve current user's saved wishlist products with live catalog prices, stock availability, and branch statuses | Headers: `Authorization: Bearer <token>` | `{ "success": true, "total": 3, "items": [ { "id": 1, "name": "Apex Raider", "sku": "ETC-1", "price": 259999, "image": "...", "category": "Laptops", "inStock": true, "savedAt": "..." } ] }` |
| `POST` | `/api/v1/wishlist/toggle/{productId}` | Authenticated | Toggle bookmark status for a product. If in wishlist, removes it; if not, adds it. | None | `{ "success": true, "added": true, "productId": 1, "wishlistCount": 4 }` |
| `POST` | `/api/v1/wishlist/add/{productId}` | Authenticated | Add product explicitly to customer's wishlist | None | `{ "success": true, "message": "Added to wishlist", "wishlistCount": 4 }` |
| `DELETE` | `/api/v1/wishlist/remove/{productId}` | Authenticated | Remove specific product from customer's wishlist | None | `{ "success": true, "message": "Removed from wishlist", "wishlistCount": 3 }` |
| `DELETE` | `/api/v1/wishlist/clear` | Authenticated | Clear all bookmarked items from customer's wishlist | None | `{ "success": true, "message": "Wishlist cleared" }` |
| `POST` | `/api/v1/wishlist/move-to-cart` | Authenticated | Batch move all (or selected array of) wishlist items into active shopping cart | `{ "productIds": [1, 2, 5] }` (Optional: empty moves all) | `{ "success": true, "movedCount": 3, "cartTotal": 459997.00 }` |

### Newsletter & Email Marketing

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/newsletter/subscribers` | `SUPERADMIN, ADMIN, STAFF` | List newsletter subscribers with search query, status filter, channel filter, and pagination | Query: `?search=kasun&status=SUBSCRIBED&source=STOREFRONT_BANNER&page=0&size=20` | `{ "success": true, "total": 120, "analytics": { "totalSubscribers": 120, "activeSubscribers": 112, "unsubscribedCount": 8, "activeRate": "93.3", "totalCampaigns": 14, "avgOpenRate": "62.4" }, "data": [ { "id": 1001, "email": "kasun.perera@gmail.com", "name": "Kasun Perera", "status": "SUBSCRIBED", "source": "STOREFRONT_BANNER", "tags": ["VIP Gamer"], "subscribedAt": "..." } ] }` |
| `GET` | `/api/v1/newsletter/subscribers/{id}` | `SUPERADMIN, ADMIN, STAFF` | Fetch single subscriber profile | None | `{ "success": true, "data": { ... } }` |
| `POST` | `/api/v1/newsletter/subscribe` | Public | Storefront subscription from home page banner, hot deals page, checkout, or account. Automatically reactivates previously unsubscribed email addresses. | `{ "email": "user@domain.com", "name": "Kasun", "source": "STOREFRONT_BANNER", "tags": ["Storefront"] }` | `{ "success": true, "isNew": true, "message": "Thank you for subscribing!", "data": { ... } }` |
| `POST` | `/api/v1/newsletter/unsubscribe` | Public | Public unsubscribe / email opt-out link handler | `{ "identifier": "user@domain.com" }` | `{ "success": true, "message": "Unsubscribed successfully" }` |
| `PATCH` | `/api/v1/newsletter/subscribers/{id}/status` | `SUPERADMIN, ADMIN, STAFF` | Toggle or update subscriber status (`SUBSCRIBED` $\leftrightarrow$ `UNSUBSCRIBED`) | Query or Body: `?status=UNSUBSCRIBED` | `{ "success": true, "data": { ... } }` |
| `PUT` | `/api/v1/newsletter/subscribers/{id}` | `SUPERADMIN, ADMIN, STAFF` | Update subscriber properties (Name, Email, Channel Source, Tags) | `{ "name": "...", "email": "...", "source": "MANUAL", "tags": ["VIP"] }` | `{ "success": true, "data": { ... } }` |
| `DELETE` | `/api/v1/newsletter/subscribers/{id}` | `SUPERADMIN, ADMIN, STAFF` | Permanently delete subscriber record | None | `{ "success": true, "message": "Subscriber deleted" }` |
| `PATCH` | `/api/v1/newsletter/subscribers/bulk-status` | `SUPERADMIN, ADMIN, STAFF` | Bulk update status for multiple selected subscriber IDs | `{ "ids": [1001, 1002, 1003], "status": "UNSUBSCRIBED" }` | `{ "success": true, "modifiedCount": 3 }` |
| `DELETE` | `/api/v1/newsletter/subscribers/bulk-delete` | `SUPERADMIN, ADMIN, STAFF` | Bulk delete multiple selected subscriber records | `{ "ids": [1001, 1002] }` | `{ "success": true, "deletedCount": 2 }` |
| `POST` | `/api/v1/newsletter/campaigns/send` | `SUPERADMIN, ADMIN, STAFF` | **Dispatch Marketing Email Broadcast**: Sends styled HTML email campaign to target audience segment and logs analytics performance metrics | `{ "subject": "🔥 Weekend Flash Deals: Up to 45% OFF!", "preheader": "Exclusive discounts...", "category": "FLASH_DEALS", "targetSegment": "ALL_ACTIVE", "contentHtml": "...", "authorName": "Admin Team" }` | `{ "success": true, "message": "Broadcast dispatched successfully!", "data": { "id": "camp_...", "recipientsCount": 112, "status": "DELIVERED", "sentAt": "..." } }` |
| `GET` | `/api/v1/newsletter/campaigns` | `SUPERADMIN, ADMIN, STAFF` | List all historical marketing campaign broadcasts with delivery logs, open rates, and click metrics | None | `{ "success": true, "data": [ { "id": "camp_20260825_01", "subject": "...", "category": "FLASH_DEALS", "recipientsCount": 112, "openRate": 64.2, "clickRate": 31.8, "sentAt": "..." } ] }` |
| `GET` | `/api/v1/newsletter/analytics` | `SUPERADMIN, ADMIN, STAFF` | Aggregate audience metrics (Total audience, active rate, channel distribution, campaign performance) | None | Audience Analytics DTO |

### Product Catalog & Gallery

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/products` | Public | Fetch catalog with filters, search, pagination, and branch inventory breakdown | Query params:<br>`?category=laptops`<br>`&brand=asus`<br>`&search=rtx`<br>`&minPrice=1000`<br>`&maxPrice=500000`<br>`&badge=bestseller`<br>`&page=0&size=20` | `{ "content": [ { "id": 1, "name": "Apex Raider", "sku": "ETC-1", "price": 259999, "branchStock": {"BR-COL": 11, "BR-GAL": 5}, "totalStock": 21, "specs": {...}, "images": [...] } ], "totalPages": 2, "totalElements": 24 }` |
| `GET` | `/api/v1/products/{id}` | Public | Get single product with full specs, features, images, and reviews | None | Single Product DTO |
| `GET` | `/api/v1/products/sku/{sku}` | Public | Lookup product by unique SKU | None | Single Product DTO |
| `POST` | `/api/v1/products` | `ADMIN, STAFF` | Create new product with specs, up to 5 images, and branch stock allocation | Product Form DTO | Created Product DTO |
| `PUT` | `/api/v1/products/{id}` | `ADMIN, STAFF` | Update product specs, pricing, gallery images, and stock | Product Form DTO | Updated Product DTO |
| `DELETE` | `/api/v1/products/{id}` | `ADMIN` | Remove product from store | None | `{ "success": true, "message": "Product removed" }` |

### Categories & Storefront Taxonomy

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/categories` | Public | List all categories with icons, slugs, and featured flags | None | `[ { "id": "cat-laptops", "name": "Laptops & Notebooks", "slug": "laptops", "icon": "💻", "featured": true, "productCount": 6 } ]` |
| `GET` | `/api/v1/categories/{slug}` | Public | Get single category metadata | None | Category DTO |
| `POST` | `/api/v1/categories` | `ADMIN` | Create new catalog category | Category Form DTO | Created Category DTO |
| `PUT` | `/api/v1/categories/{id}` | `ADMIN` | Update category details | Category Form DTO | Updated Category DTO |
| `DELETE` | `/api/v1/categories/{id}` | `ADMIN` | Delete category (validates no active products assigned) | None | `{ "success": true, "message": "Category deleted" }` |

### Hardware Brands & Manufacturer Partners

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/brands` | Public | List all hardware brands with logos, origin data, and product counts | Query: `?activeOnly=true` | `[ { "id": "brd-asus", "name": "ASUS", "slug": "asus", "logo": "...", "country": "Taiwan", "founded": "1989", "website": "https://www.asus.com", "featured": true, "productCount": 6 } ]` |
| `GET` | `/api/v1/brands/featured` | Public | Get featured partner brands for homepage showcase | None | List of Featured Brand DTOs |
| `GET` | `/api/v1/brands/{slugOrId}` | Public | Get single brand profile and associated store catalog products | None | Detailed Brand DTO with `products` list |
| `POST` | `/api/v1/brands` | `ADMIN` | Register new hardware manufacturer brand | Brand Form DTO | Created Brand DTO |
| `PUT` | `/api/v1/brands/{id}` | `ADMIN` | Update brand profile, vector logo, and origin data | Brand Form DTO | Updated Brand DTO |
| `PATCH` | `/api/v1/brands/{id}/featured` | `ADMIN` | Toggle featured status for homepage brand showcase | `{ "featured": true }` | Updated Brand DTO |
| `DELETE` | `/api/v1/brands/{id}` | `ADMIN` | Remove brand (**guarded**: blocks deletion if catalog products are assigned) | None | `{ "success": true, "message": "Brand removed" }` |

### Badges & Automated Rules Engine

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/badges` | Public | List all badges, color styles, and automated criteria | None | `[ { "id": "bdg-hotdeal", "name": "Hot Deal", "colorKey": "rose", "ruleType": "system", "isSystemDefault": true, "canEdit": false, "canDelete": false } ]` |
| `POST` | `/api/v1/badges` | `ADMIN` | Create new custom badge & rule | Badge DTO | Created Badge DTO |
| `PUT` | `/api/v1/badges/{id}` | `ADMIN` | Update badge rule, priority, or color (blocks locked badges like Hot Deal) | Badge DTO | Updated Badge DTO |
| `DELETE` | `/api/v1/badges/{id}` | `ADMIN` | Remove badge (blocks system default badges) | None | `{ "success": true, "message": "Badge removed" }` |
| `POST` | `/api/v1/badges/auto-assign` | `ADMIN, STAFF` | **Execute Automated Rules Engine**: Evaluates sales, ratings, review counts, reassigns badges | None | `{ "evaluatedCount": 18, "assignedCount": 5, "changes": [...] }` |

### Hot Deals & Promotional Campaigns

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/promotions/hot-deals` | Public | Fetch all active hot deals with product details and remaining time | None | `[ { "id": 101, "productId": 1, "product": {...}, "promoPrice": 259999, "originalPrice": 289999, "discountPercent": 10, "durationSeconds": 86400, "timerUpdatedAt": "..." } ]` |
| `POST` | `/api/v1/promotions/hot-deals` | `ADMIN, STAFF` | Add product to Hot Deals (sets `HOT DEAL` badge and promo discount) | Hot Deal Form DTO | Created Hot Deal DTO |
| `PUT` | `/api/v1/promotions/hot-deals/{id}` | `ADMIN, STAFF` | Update hot deal promo pricing, timer duration, or active status | Hot Deal Form DTO | Updated Hot Deal DTO |
| `DELETE` | `/api/v1/promotions/hot-deals/{id}` | `ADMIN, STAFF` | Remove product from Hot Deals (reverts to original discount/price) | None | `{ "success": true }` |
| `GET` | `/api/v1/promotions/home-banner` | Public | Retrieve Weekend Tech Deal hero banner & timer | None | Home Deal Banner DTO |
| `PUT` | `/api/v1/promotions/home-banner` | `ADMIN` | Update home deal banner headline, target URL, and countdown | Home Deal Banner DTO | Updated Banner DTO |

### Deal Bundles & Composite Inventory

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/promotions/bundles` | Public | Fetch all deal bundles with **dynamic multi-branch bottleneck calculation**, package specs, and timer offsets | Query: `?activeOnly=true` | `[ { "id": 1, "title": "Ultimate Gaming Power", "price": 259999, "originalPrice": 360996, "savingAmount": 100997, "savingPercent": 28, "stockLeft": 3, "claimedPercent": 73, "componentsBreakdown": [ { "productId": 1, "qty": 1, "name": "RTX 4070 Super", "unitPrice": 259999, "specs": {...} } ] } ]` |
| `GET` | `/api/v1/promotions/bundles/{id}` | Public | Get single deal bundle with full branch assembly readiness matrix | None | Detailed Bundle DTO |
| `POST` | `/api/v1/promotions/bundles` | `ADMIN, STAFF` | Create new deal bundle (derives specs and regular MSRP automatically from selected `bundleItems`) | Bundle Form DTO | Created Bundle DTO |
| `PUT` | `/api/v1/promotions/bundles/{id}` | `ADMIN, STAFF` | Update bundle pricing, items, duration, and visibility | Bundle Form DTO | Updated Bundle DTO |
| `DELETE` | `/api/v1/promotions/bundles/{id}` | `ADMIN` | Remove deal bundle | None | `{ "success": true }` |

### Inter-Branch Stock Transfers & Logistics

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/transfers` | `ADMIN, STAFF` | List stock transfers with filters (`?status=PENDING&branch=BR-COL`) | None | `[ { "id": "TRF-2026-001", "productId": 1, "productName": "RTX 4070 Super", "fromBranchId": "BR-GAL", "toBranchId": "BR-COL", "quantity": 3, "status": "IN_TRANSIT", "reason": "Deal Bundle Kit Assembly" } ]` |
| `POST` | `/api/v1/transfers` | `ADMIN, STAFF` | Initiate new stock transfer (e.g. 1-click kit part transfer) | `{ "productId": 1, "fromBranchId": "BR-GAL", "toBranchId": "BR-COL", "quantity": 3, "reason": "Deal Bundle Kit Assembly", "notes": "..." }` | Created Transfer DTO |
| `PATCH` | `/api/v1/transfers/{id}/status` | `ADMIN, STAFF` | Update transfer lifecycle (`PENDING` $\to$ `IN_TRANSIT` $\to$ `RECEIVED` or `CANCELLED`). **Atomically moves stock across branch inventory**. | `{ "status": "RECEIVED" }` | Updated Transfer DTO |
| `GET` | `/api/v1/transfers/metrics` | `ADMIN, STAFF` | Transfer overview KPI metrics (Pending, In Transit, Received, Total Units) | None | `{ "pendingCount": 2, "inTransitCount": 1, "receivedCount": 8, "totalUnitsMoved": 45 }` |

### Product Ratings & Reviews

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/products/{id}/reviews` | Public | List all customer reviews for a product | Query: `?page=0&size=10` | `[ { "id": "REV-10001", "productId": 1, "userId": 2, "userName": "Kasun P.", "rating": 5, "comment": "Amazing...", "createdAt": "..." } ]` |
| `POST` | `/api/v1/products/{id}/reviews` | Authenticated | Submit or update user review. Automatically recalculates product average rating & triggers rule engine | `{ "rating": 5, "comment": "Outstanding build quality and cooling." }` | `{ "review": { ... }, "updatedProductRating": 4.9, "totalReviews": 128 }` |
| `DELETE` | `/api/v1/reviews/{id}` | `ADMIN` or Owner | Delete customer review | None | `{ "success": true, "message": "Review deleted" }` |

### Product Behavior History & Audit Logs

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/product-behavior-history` | `ADMIN, STAFF` | Global paginated timeline of automated rule triggers, price adjustments, and badge transitions | Query: `?page=0&size=50` | `[ { "id": "pbe-...", "productId": 1, "productName": "Apex Raider", "eventType": "BADGE_AUTO_ASSIGNED", "triggerReason": "Reached 80+ reviews with 4.8 rating", "actor": "SYSTEM_AUTO_RULE" } ]` |
| `GET` | `/api/v1/products/{id}/behavior-history` | `ADMIN, STAFF` | Audit timeline for a specific product | None | List of Product Behavior Events |
| `POST` | `/api/v1/product-behavior-history` | `ADMIN, STAFF` | Manually log an administrative audit event | Event DTO | Created Audit Record |

### Branch Warehouses

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/branches` | Public | List all warehouse locations with geo coordinates & shipping rates | None | `[ { "id": "BR-COL", "name": "Colombo Main Hub", "city": "Colombo", "latitude": 6.9271, "longitude": 79.8612, "baseShippingRate": 350.00 } ]` |
| `GET` | `/api/v1/branches/{id}` | Public | Get single branch details | None | Branch DTO |
| `POST` | `/api/v1/branches` | `ADMIN` | Add new regional warehouse | Branch DTO | Created Branch DTO |
| `PUT` | `/api/v1/branches/{id}` | `ADMIN` | Update branch contact or coordinates | Branch DTO | Updated Branch DTO |
| `DELETE` | `/api/v1/branches/{id}` | `ADMIN` | Decommission branch | None | `{ "success": true }` |
| `POST` | `/api/v1/branches/nearest` | Public | Calculate nearest branch given customer coordinates / city | `{ "city": "Galle", "latitude": 6.0535, "longitude": 80.2210 }` | `{ "branch": { ... }, "distanceKm": 4.2, "shippingFee": 450.00 }` |

### Stock Health & Inventory Alerts

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/inventory/health-report` | `ADMIN, STAFF` | Stock health overview: branch metrics, depleted SKUs, low-stock threshold alerts | Query: `?branch=BR-COL` | `{ "totalMonitored": 18, "depletedCount": 2, "lowStockCount": 3, "branchHealth": {...}, "alerts": [...] }` |
| `PATCH` | `/api/v1/inventory/{productId}/settings` | `ADMIN, STAFF` | Toggle alert monitoring & configure low-stock margin | `{ "alertEnabled": true, "lowStockMargin": 8 }` | Updated Product Inventory Settings |
| `POST` | `/api/v1/inventory/{productId}/adjust` | `ADMIN, STAFF` | Quick restock or adjust branch warehouse quantity | `{ "branchId": "BR-GAL", "quantityDelta": 10 }` | Updated Inventory DTO |

### Orders & Fulfillment

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/orders` | `ADMIN, STAFF` | List all orders with filters (`?status=Pending&branch=BR-COL`) | None | `[ { "id": 1, "orderCode": "ORD-2026-8492", "customerName": "...", "totalAmount": 2499, "status": "Pending", "items": [...] } ]` |
| `GET` | `/api/v1/orders/my-orders` | Authenticated | List orders placed by logged-in customer | Headers: `Authorization: Bearer <token>` | List of customer orders |
| `GET` | `/api/v1/orders/{orderCode}` | Authenticated / Staff | Get full order details & item tracking | None | Full Order DTO |
| `POST` | `/api/v1/orders` | Public / Auth | **Place New Order**: Atomic `@Transactional` operation that validates price, creates order record, and deducts branch warehouse stock | `{ "customerName": "...", "email": "...", "phone": "...", "city": "Colombo", "shippingAddress": "...", "fulfillmentBranchId": "BR-COL", "items": [ { "productId": 1, "quantity": 1 } ], "paymentMethod": "Credit / Debit Card" }` | Created Order DTO with confirmed `orderCode` |
| `PATCH` | `/api/v1/orders/{id}/status` | `ADMIN, STAFF` | Update order fulfillment status (`Pending` $\to$ `Processing` $\to$ `Shipped` $\to$ `Delivered` $\to$ `Cancelled`) | `{ "status": "Shipped" }` | Updated Order DTO |

### Store Profile & Legal Policies

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/business-profile` | Public | Retrieve official corporate profile, ISO certifications, hotline, and headquarters | None | Business Profile DTO |
| `PUT` | `/api/v1/business-profile` | `ADMIN` | Update corporate trading details, mission, and support contact info | Business Profile DTO | Updated Business Profile DTO |
| `GET` | `/api/v1/policies` | Public | List all legal policies with sections and last update dates | None | `[ { "id": "privacy", "title": "Privacy Policy", "sections": [...] } ]` |
| `GET` | `/api/v1/policies/{slug}` | Public | Retrieve single policy document (`privacy`, `terms`, `warranty`) | None | Policy Document DTO |
| `PUT` | `/api/v1/policies/{slug}` | `ADMIN` | Update policy title, subtitle, last updated date, and clauses | Policy Document DTO | Updated Policy Document DTO |

### AI Chatbot & Support Assistant

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `POST` | `/api/v1/chat/message` | Public / Auth | **Backend Gemini 2.0 Proxy**: Grounds user message with live store catalog, current shopping cart, stock health, and legal policies securely on the backend without exposing API keys | `{ "message": "Can you recommend a gaming laptop with an RTX 4080?", "history": [...], "cart": [...] }` | `{ "reply": "...", "suggestedProducts": [1, 3], "timestamp": "..." }` |

### Financial Analytics & Reports

| Method | Endpoint | Access | Description | Request Payload | Response Payload |
|---|---|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | `ADMIN` | High-level business KPIs (Gross Revenue, Total Orders, Average Order Value, Active Customers) | None | `{ "grossRevenue": 4850000.00, "totalOrders": 142, "avgOrderValue": 34154.92, "activeUsers": 89 }` |
| `GET` | `/api/v1/analytics/branch-revenue` | `ADMIN` | Revenue and order volume breakdown per regional warehouse branch | None | `[ { "branchId": "BR-COL", "branchName": "Colombo Main Hub", "orderCount": 68, "revenue": 2450000.00, "percentage": 50.5 } ]` |
| `GET` | `/api/v1/analytics/top-products` | `ADMIN` | Top selling hardware products by volume and revenue | Query: `?limit=5` | `[ { "productId": 1, "name": "Apex Raider", "unitsSold": 24, "revenue": 1440000.00 } ]` |

---

## 6. Spring Boot Application Architecture & Dependencies

### Recommended Technology Stack
- **Framework**: Spring Boot 3.3+ (Java 17 or 21 LTS)
- **Security**: Spring Security 6 + JJWT (`io.jsonwebtoken:jjwt-api:0.12.5`) for stateless JWT Bearer token authentication
- **Persistence**: Spring Data JPA + Hibernate ORM + MySQL Connector/J
- **Validation**: Jakarta Bean Validation (`spring-boot-starter-validation`)
- **Productivity**: Project Lombok + MapStruct
- **AI Integration**: Spring AI / Google GenAI SDK (for Gemini 2.0 Flash Chatbot proxy)

### Recommended Maven `pom.xml` Dependencies

```xml
<dependencies>
    <!-- 1. Spring Boot Web & REST -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- 2. Spring Data JPA & Hibernate -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- 3. MySQL JDBC Driver -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- 4. Spring Security & JWT -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.12.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.12.5</version>
        <scope>runtime</scope>
    </dependency>

    <!-- 5. Bean Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- 6. Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>

    <!-- 7. Spring Boot DevTools & Test Starter -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-devtools</artifactId>
        <scope>runtime</scope>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Spring Boot Package Layout

```
com.etech.store/
├── ETechStoreApplication.java
├── config/
│   ├── CorsConfig.java               # Enable CORS for frontend origin (http://localhost:5500)
│   ├── SecurityConfig.java           # SecurityFilterChain, Public / Auth route matching
│   └── JwtAuthenticationFilter.java  # Bearer token validation filter
├── controller/
│   ├── AuthController.java
│   ├── UserController.java
│   ├── ProductController.java
│   ├── ReviewController.java
│   ├── CategoryController.java
│   ├── BrandController.java
│   ├── BadgeController.java
│   ├── PromotionController.java      # Bundles, Hot Deals, Home Banner
│   ├── TransferController.java       # Inter-branch stock transfers
│   ├── BranchController.java
│   ├── InventoryController.java
│   ├── OrderController.java
│   ├── WishlistController.java       # Customer product wishlist & move-to-cart
│   ├── NewsletterController.java     # Subscribers, bulk ops, campaign broadcasts & analytics
│   ├── PolicyController.java
│   ├── ChatbotController.java
│   └── AnalyticsController.java
├── dto/                              # Request / Response DTOs
│   ├── request/
│   └── response/
├── entity/                           # JPA Entities matching MySQL DDL
│   ├── User.java                     # Includes status ENUM('ACTIVE', 'INACTIVE')
│   ├── Branch.java
│   ├── Category.java
│   ├── Brand.java
│   ├── Badge.java
│   ├── Product.java
│   ├── ProductImage.java
│   ├── BranchInventory.java
│   ├── DealBundle.java
│   ├── BundleItem.java
│   ├── HotDeal.java
│   ├── HomeDealBanner.java
│   ├── StockTransfer.java
│   ├── ProductReview.java
│   ├── ProductBehaviorHistory.java
│   ├── Order.java
│   ├── OrderItem.java
│   ├── WishlistItem.java
│   ├── NewsletterSubscriber.java
│   ├── NewsletterCampaign.java
│   ├── BusinessProfile.java
│   └── LegalPolicy.java
├── repository/                       # Spring Data JPA Repositories
│   ├── UserRepository.java
│   ├── BranchRepository.java
│   ├── CategoryRepository.java
│   ├── BrandRepository.java
│   ├── BadgeRepository.java
│   ├── ProductRepository.java
│   ├── ProductImageRepository.java
│   ├── BranchInventoryRepository.java
│   ├── DealBundleRepository.java
│   ├── BundleItemRepository.java
│   ├── HotDealRepository.java
│   ├── HomeDealBannerRepository.java
│   ├── StockTransferRepository.java
│   ├── ProductReviewRepository.java
│   ├── ProductBehaviorHistoryRepository.java
│   ├── OrderRepository.java
│   ├── OrderItemRepository.java
│   ├── WishlistRepository.java
│   ├── NewsletterSubscriberRepository.java
│   ├── NewsletterCampaignRepository.java
│   ├── BusinessProfileRepository.java
│   └── LegalPolicyRepository.java
├── service/                          # Business logic & @Transactional rules
│   ├── AuthService.java
│   ├── UserService.java              # Profile, credential & status lifecycle management
│   ├── ProductService.java
│   ├── ReviewService.java
│   ├── CategoryService.java
│   ├── BrandService.java
│   ├── BadgeRuleEngineService.java   # Evaluates auto-reach badge conditions & logs audit events
│   ├── PromotionService.java         # Deal bundle bottlenecks, hot deal overrides, countdowns
│   ├── TransferService.java          # Multi-branch stock movement & kit balancing
│   ├── BranchService.java
│   ├── InventoryService.java         # Restock, alerts & health metrics
│   ├── OrderService.java             # Atomically places orders & decrements branch stock
│   ├── WishlistService.java          # Wishlist toggle, item synchronization & transfer to cart
│   ├── NewsletterService.java        # Subscriptions, email dispatch, bulk mutations & campaign metrics
│   ├── PolicyService.java
│   ├── ChatbotService.java           # Gemini API proxy with catalog grounding
│   └── AnalyticsService.java
└── exception/
    ├── GlobalExceptionHandler.java
    ├── ResourceNotFoundException.java
    ├── InsufficientStockException.java
    └── UnauthorizedException.java
```

---

## 7. Client-Side Simplifications & Role-Based UI Security (RBAC)

### Role-Based Access & Header Visibility Rules (4-Tier RBAC)
- 👑👑 **`SUPERADMIN` Role (System Owner)**:
  - **Global Scope**: Cross-branch access (`assignedBranch: null`, displayed as `Global (Owner)`).
  - **Full Authority**: Full authority over all console tabs (Products, Orders, Stock Health, Categories, Brands, Promotions, Transfers, Newsletter, Branches, Users, Financials, Policies).
  - **User Management & Status Control**: Can create, edit, update status (`ACTIVE`/`INACTIVE`), and delete `ADMIN`, `STAFF`, and `CUSTOMER` accounts.
  - **Immutability**: Only **one** unique Superadmin account exists (`superadmin` / `USR-100000`). It cannot be deleted, renamed, deactivated, or downgraded.
  - **Header & Badge**: Styled with a distinctive purple avatar and purple badge (`bg-purple-50 text-purple-700 border-purple-200`).
- 👑 **`ADMIN` Role (Store Administrator)**:
  - **Full Console Access**: Access to management tabs (Products, Orders, Stock Health, Categories & Badges, Promotions & Deals, Transfers, Newsletter Management & Campaigns, Branches, Users, Analytics, Policies).
  - **Staff & Customer Management**: Full management authority (create, edit, status toggle `ACTIVE`/`INACTIVE`, delete) over `STAFF` and `CUSTOMER` accounts.
  - **Admin-Admin & Superadmin Restrictions**:
    - **Cannot see or access `SUPERADMIN`**: Superadmin is completely filtered out from API query results and directory views.
    - **Cannot manage other `ADMIN` accounts**: Cannot edit, delete, or deactivate other Admin accounts (rendered as "Admin Protected" / read-only).
    - **Status Lifecycle vs Role Mutation**: Role editing is locked to prevent privilege escalation; administrative control operates via status lifecycle management (`ACTIVE` / `INACTIVE`).
  - **Header & Badge**: Styled with a blue avatar and blue badge (`bg-blue-50 text-blue-700 border-blue-200`).
- 🧑‍💼 **`STAFF` Role (Branch Operations & Marketing)**:
  - **Scoped Access**: Scoped to operational and marketing tabs (Products, Orders, Stock Health, Promotions, Transfers, Newsletter Management & Broadcasts).
  - **Restricted**: System configuration tabs (Branches, Users, Financials, Policies) are hidden and guarded. Stock updates are scoped to their `assignedBranch`.
  - **Header & Badge**: Styled with a sky blue badge (`bg-sky-50 text-sky-700 border-sky-200`).
- 👤 **`CUSTOMER` / Guest**:
  - Storefront catalog, product filtering, shopping cart, checkout, customer wishlist, profile portal, review submission, and order history tracking.
  - `Admin Console` button is **completely hidden** from both desktop header and mobile drawer. Direct URL navigation to `#admin` is blocked by route guards and redirects to `#home` or `#login`.
  - Backend Spring Security enforces `@PreAuthorize("hasAnyRole('SUPERADMIN', 'ADMIN', 'STAFF')")` returning `403 Forbidden` on administrative endpoints.

### What to Strip Out Upon Backend Integration
When connecting the frontend to Spring Boot, the following complex client-side logic should be **stripped out** and left to the backend:

1. **Client-Side ID Generation**:
   - *Current*: `Math.max(...all.map(p => p.id)) + 1` and manual `ORD-XXXX-XXXX` string generators.
   - *Spring Boot*: Database handles auto-increment IDs (`@GeneratedValue(strategy = GenerationType.IDENTITY)`) and formatted order codes in Java service.
2. **Client-Side Stock Deduction & Race Conditions**:
   - *Current*: `deductBranchStock(productId, branchId, qty)` running inside `cart_controller.js`.
   - *Spring Boot*: Handled automatically inside the `@Transactional` `OrderService.createOrder(...)` method in Java. Prevents double-booking and inventory drift.
3. **Client-Side Deal Bundle Bottleneck Calculation**:
   - *Current*: `calculateBundleInventory(bundle, products, branches)` in `deals_data.js`.
   - *Spring Boot*: Handled dynamically by `PromotionService.getBundles()` server-side query.
4. **Hardcoded AI API Keys**:
   - *Current*: `ET_CONFIG.API_KEY` in `src/js/models/et-training.js`.
   - *Spring Boot*: Store `GEMINI_API_KEY` in server environment variables (`application.properties` / `.env`). The frontend calls `POST /api/v1/chat/message`.
5. **Client-Side Seed Data Hydration**:
   - *Current*: `localStorage.setItem(...)` seeding on first run from `src/data/`.
   - *Spring Boot*: Handled by a clean `data.sql` file, Liquibase changelog, or `CommandLineRunner` seed script in Spring Boot using the exact JSON/data structures from `src/data/`.

---

### Architectural Regulations: Database-Driven Frontend & Single Source of Truth

To ensure clean maintainability, prevent duplication, and avoid multi-file code drift whenever database schemas or roles change, adhere strictly to the following architectural regulations:

1. **Centralized `USER_ROLE`, `USER_STATUS` Enum & `User` Class Model (`src/js/models/user_model.js`)**:
   - **Never** repeat role string arrays or switch cases across multiple controller or component files.
   - **Single Point of Truth**: All dynamic role state, status state (`ACTIVE`/`INACTIVE`), default fallbacks (`DEFAULT_ROLE = 'CUSTOMER'`), badge formatters (`getRoleBadge(role)`, `getStatusBadge(status)`), and UI select builders are strictly centralized in `user_model.js`.
   - **Industry-Standard ES6 `User` Class**: Represents user entities throughout the application (`id`, `username`, `name`, `email`, `password`, `role`, `status`, `assignedBranch`, `createdAt`) with encapsulated helper methods (`isAdmin()`, `isSuperAdmin()`, `isStaff()`, `isCustomer()`, `isActive()`, `getInitial()`).
   - `getCurrentUser()` automatically returns a `User` instance, ensuring instant access to domain helper methods across all controllers.

2. **Zero Redundant / Rigid Frontend Validation**:
   - **Database & Backend Authority**: The Spring Boot backend and database schema are the single source of truth for validation rules (email regex, username format, password strength, role authorization, status verification, and uniqueness constraints).
   - **Minimal Client-Side Sanity Checks Only**: The frontend performs only basic checks for presence of required inputs and UI password confirmation matching.
   - **Direct Error Surfacing**: Backend validation errors (HTTP 400 Bad Request, HTTP 403 Forbidden, HTTP 422 Unprocessable Entity) returned in JSON responses are surfaced directly to the user in the UI without intermediate frontend filtering.

3. **Zero Mock Storage Replication for Database Entities**:
   - When communicating with the backend API, the frontend MUST NOT replicate database tables into `localStorage` (e.g., no `etech_users`, `etech_products`, or `etech_newsletter_subscribers` mock arrays).
   - The frontend maintains only the active session token (`etech_jwt_token`) and sanitized active profile (`etech_current_user`).

4. **Sanitized Debug Logging Standard**:
   - All API client operations (`apiClient.js`, `userApi.js`, `brandsApi.js`, `newsletterApi.js`, etc.) must log method, endpoint, roundtrip duration (ms), status codes, and payload/response data for debugging.
   - **Credential Redaction**: Sensitive attributes (`password`, `currentPassword`, `newPassword`, `confirmPassword`, `token`, `jwt`, `secret`, `cvv`, `cardNumber`) MUST be sanitized and redacted as `[REDACTED]` prior to printing to browser console.

---

## 8. Frontend API Service Layer Architecture (`src/js/api/`)

Create modular API service clients under `src/js/api/`. Controllers will invoke these async functions instead of interacting directly with `localStorage`.

### 1. Base API Client (`src/js/api/apiClient.js`):
```javascript
export const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8080/api/v1';
export const TOKEN_STORAGE_KEY = 'etech_jwt_token';
export const CURRENT_USER_STORAGE_KEY = 'etech_current_user';

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function sanitizeForLogging(payload) {
  // Redacts passwords, tokens, and secrets from console logs
}

export function ajaxRequest({ endpoint, method = 'GET', data = null, headers = {} }) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const token = getToken();
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...headers
  };

  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      type: method.toUpperCase(),
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      headers: reqHeaders,
      data: (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) 
        ? (typeof data === 'string' ? data : JSON.stringify(data)) 
        : data,
      success: (res) => resolve(res),
      error: (xhr) => {
        if (xhr.status === 401) {
          removeToken();
          localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          window.location.hash = '#login';
        }
        reject(new Error(xhr.responseJSON?.message || `HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    });
  });
}
```

### 2. Authentication & User API (`src/js/api/userApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const AuthApi = {
  login: (username, password) => ajaxRequest({ endpoint: '/auth/login', method: 'POST', data: { username, password } }),
  register: (userData) => ajaxRequest({ endpoint: '/auth/register', method: 'POST', data: userData }),
  getCurrentUser: () => ajaxRequest({ endpoint: '/auth/me', method: 'GET' })
};

export const UserApi = {
  getUsers: (params = {}) => ajaxRequest({ endpoint: '/users', method: 'GET', data: params }),
  getUserById: (id) => ajaxRequest({ endpoint: `/users/${encodeURIComponent(id)}`, method: 'GET' }),
  createUser: (payload) => ajaxRequest({ endpoint: '/users', method: 'POST', data: payload }),
  updateUser: (id, payload) => ajaxRequest({ endpoint: `/users/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  updateUserStatus: (id, status) => ajaxRequest({ endpoint: `/users/${encodeURIComponent(id)}/status`, method: 'PATCH', data: { status } }),
  deleteUser: (id) => ajaxRequest({ endpoint: `/users/${encodeURIComponent(id)}`, method: 'DELETE' }),
  updateSelfProfile: (payload) => ajaxRequest({ endpoint: '/users/me/profile', method: 'PUT', data: payload }),
  changePassword: (payload) => ajaxRequest({ endpoint: '/users/me/password', method: 'PUT', data: payload })
};
```

### 3. Hardware Brands API (`src/js/api/brandsApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const BrandsApi = {
  getAllBrands: (activeOnly = true) => ajaxRequest({ endpoint: `/brands?activeOnly=${activeOnly}`, method: 'GET' }),
  getFeaturedBrands: () => ajaxRequest({ endpoint: '/brands/featured', method: 'GET' }),
  getBrandBySlugOrId: (slugOrId) => ajaxRequest({ endpoint: `/brands/${encodeURIComponent(slugOrId)}`, method: 'GET' }),
  createBrand: (payload) => ajaxRequest({ endpoint: '/brands', method: 'POST', data: payload }),
  updateBrand: (id, payload) => ajaxRequest({ endpoint: `/brands/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  toggleFeatured: (id, featured) => ajaxRequest({ endpoint: `/brands/${encodeURIComponent(id)}/featured`, method: 'PATCH', data: { featured } }),
  deleteBrand: (id) => ajaxRequest({ endpoint: `/brands/${encodeURIComponent(id)}`, method: 'DELETE' })
};
```

### 4. Product Catalog & Reviews API (`src/js/api/productApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const ProductApi = {
  getAll: (params = {}) => ajaxRequest({ endpoint: '/products', method: 'GET', data: params }),
  getById: (id) => ajaxRequest({ endpoint: `/products/${encodeURIComponent(id)}`, method: 'GET' }),
  getBySku: (sku) => ajaxRequest({ endpoint: `/products/sku/${encodeURIComponent(sku)}`, method: 'GET' }),
  create: (payload) => ajaxRequest({ endpoint: '/products', method: 'POST', data: payload }),
  update: (id, payload) => ajaxRequest({ endpoint: `/products/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  delete: (id) => ajaxRequest({ endpoint: `/products/${encodeURIComponent(id)}`, method: 'DELETE' }),

  // Ratings & Customer Reviews
  getReviews: (productId, page = 0, size = 10) => ajaxRequest({ endpoint: `/products/${productId}/reviews?page=${page}&size=${size}`, method: 'GET' }),
  submitReview: (productId, reviewData) => ajaxRequest({ endpoint: `/products/${productId}/reviews`, method: 'POST', data: reviewData }),
  deleteReview: (reviewId) => ajaxRequest({ endpoint: `/reviews/${encodeURIComponent(reviewId)}`, method: 'DELETE' })
};
```

### 5. Customer Wishlist API (`src/js/api/wishlistApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const WishlistApi = {
  getWishlist: () => ajaxRequest({ endpoint: '/wishlist', method: 'GET' }),
  toggleWishlist: (productId) => ajaxRequest({ endpoint: `/wishlist/toggle/${encodeURIComponent(productId)}`, method: 'POST' }),
  addToWishlist: (productId) => ajaxRequest({ endpoint: `/wishlist/add/${encodeURIComponent(productId)}`, method: 'POST' }),
  removeFromWishlist: (productId) => ajaxRequest({ endpoint: `/wishlist/remove/${encodeURIComponent(productId)}`, method: 'DELETE' }),
  clearWishlist: () => ajaxRequest({ endpoint: '/wishlist/clear', method: 'DELETE' }),
  moveToCart: (productId) => ajaxRequest({ endpoint: '/wishlist/move-to-cart', method: 'POST', data: { productId } })
};
```

### 6. Newsletter & Email Marketing API (`src/js/api/newsletterApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const NewsletterApi = {
  // Public Storefront Endpoints
  subscribe: (email, source = 'FOOTER', fullName = '', preferences = ['PRODUCT_UPDATES', 'HOT_DEALS']) => 
    ajaxRequest({ endpoint: '/newsletter/subscribe', method: 'POST', data: { email, source, fullName, preferences } }),
  unsubscribe: (email, reason = '') => 
    ajaxRequest({ endpoint: '/newsletter/unsubscribe', method: 'POST', data: { email, reason } }),

  // Administrative Management Endpoints (Staff, Admin, Superadmin)
  getSubscribers: (params = {}) => 
    ajaxRequest({ endpoint: '/newsletter/subscribers', method: 'GET', data: params }),
  getSubscriberById: (id) => 
    ajaxRequest({ endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`, method: 'GET' }),
  updateSubscriberStatus: (id, status) => 
    ajaxRequest({ endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}/status`, method: 'PATCH', data: { status } }),
  updateSubscriber: (id, data) => 
    ajaxRequest({ endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`, method: 'PUT', data }),
  deleteSubscriber: (id) => 
    ajaxRequest({ endpoint: `/newsletter/subscribers/${encodeURIComponent(id)}`, method: 'DELETE' }),

  // Bulk Subscriber Actions
  bulkUpdateStatus: (ids, status) => 
    ajaxRequest({ endpoint: '/newsletter/subscribers/bulk-status', method: 'PATCH', data: { ids, status } }),
  bulkDeleteSubscribers: (ids) => 
    ajaxRequest({ endpoint: '/newsletter/subscribers/bulk-delete', method: 'DELETE', data: { ids } }),

  // Marketing Campaigns & Broadcasts
  sendCampaign: (campaignData) => 
    ajaxRequest({ endpoint: '/newsletter/campaigns/send', method: 'POST', data: campaignData }),
  getCampaigns: (params = {}) => 
    ajaxRequest({ endpoint: '/newsletter/campaigns', method: 'GET', data: params }),

  // Analytics & Aggregated Performance
  getAnalytics: () => 
    ajaxRequest({ endpoint: '/newsletter/analytics', method: 'GET' })
};
```

### 7. Promotions & Deals API (`src/js/api/promotionsApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const PromotionsApi = {
  // Deal Bundles
  getBundles: (activeOnly = false) => ajaxRequest({ endpoint: `/promotions/bundles${activeOnly ? '?activeOnly=true' : ''}`, method: 'GET' }),
  getBundleById: (id) => ajaxRequest({ endpoint: `/promotions/bundles/${encodeURIComponent(id)}`, method: 'GET' }),
  createBundle: (payload) => ajaxRequest({ endpoint: '/promotions/bundles', method: 'POST', data: payload }),
  updateBundle: (id, payload) => ajaxRequest({ endpoint: `/promotions/bundles/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  deleteBundle: (id) => ajaxRequest({ endpoint: `/promotions/bundles/${encodeURIComponent(id)}`, method: 'DELETE' }),

  // Hot Deals
  getHotDeals: (activeOnly = false) => ajaxRequest({ endpoint: `/promotions/hot-deals${activeOnly ? '?activeOnly=true' : ''}`, method: 'GET' }),
  createHotDeal: (payload) => ajaxRequest({ endpoint: '/promotions/hot-deals', method: 'POST', data: payload }),
  updateHotDeal: (id, payload) => ajaxRequest({ endpoint: `/promotions/hot-deals/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  deleteHotDeal: (id) => ajaxRequest({ endpoint: `/promotions/hot-deals/${encodeURIComponent(id)}`, method: 'DELETE' }),

  // Weekend Tech Deal Home Banner
  getHomeBanner: () => ajaxRequest({ endpoint: '/promotions/home-banner', method: 'GET' }),
  updateHomeBanner: (payload) => ajaxRequest({ endpoint: '/promotions/home-banner', method: 'PUT', data: payload })
};
```

### 8. Inter-Branch Stock Transfers API (`src/js/api/transfersApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const TransfersApi = {
  getAll: (params = {}) => ajaxRequest({ endpoint: '/transfers', method: 'GET', data: params }),
  create: (payload) => ajaxRequest({ endpoint: '/transfers', method: 'POST', data: payload }),
  updateStatus: (id, status) => ajaxRequest({ endpoint: `/transfers/${encodeURIComponent(id)}/status`, method: 'PATCH', data: { status } }),
  getMetrics: () => ajaxRequest({ endpoint: '/transfers/metrics', method: 'GET' })
};
```

### 9. Storefront Taxonomy & Badges API (`src/js/api/taxonomyApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const CategoryApi = {
  getAll: () => ajaxRequest({ endpoint: '/categories', method: 'GET' }),
  getBySlug: (slug) => ajaxRequest({ endpoint: `/categories/${encodeURIComponent(slug)}`, method: 'GET' }),
  create: (payload) => ajaxRequest({ endpoint: '/categories', method: 'POST', data: payload }),
  update: (id, payload) => ajaxRequest({ endpoint: `/categories/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  delete: (id) => ajaxRequest({ endpoint: `/categories/${encodeURIComponent(id)}`, method: 'DELETE' })
};

export const BadgeApi = {
  getAll: () => ajaxRequest({ endpoint: '/badges', method: 'GET' }),
  create: (payload) => ajaxRequest({ endpoint: '/badges', method: 'POST', data: payload }),
  update: (id, payload) => ajaxRequest({ endpoint: `/badges/${encodeURIComponent(id)}`, method: 'PUT', data: payload }),
  delete: (id) => ajaxRequest({ endpoint: `/badges/${encodeURIComponent(id)}`, method: 'DELETE' }),
  runAutoAssigner: () => ajaxRequest({ endpoint: '/badges/auto-assign', method: 'POST' })
};

export const ProductBehaviorHistoryApi = {
  getAll: (page = 0, size = 50, eventType = '') => 
    ajaxRequest({ endpoint: `/product-behavior-history?page=${page}&size=${size}${eventType ? `&eventType=${eventType}` : ''}`, method: 'GET' }),
  getByProductId: (productId) => ajaxRequest({ endpoint: `/products/${encodeURIComponent(productId)}/behavior-history`, method: 'GET' }),
  recordEvent: (payload) => ajaxRequest({ endpoint: '/product-behavior-history', method: 'POST', data: payload })
};
```

### 10. Orders & Inventory API (`src/js/api/orderApi.js`, `src/js/api/inventoryApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const OrderApi = {
  getAll: (params = {}) => ajaxRequest({ endpoint: '/orders', method: 'GET', data: params }),
  getMyOrders: () => ajaxRequest({ endpoint: '/orders/my-orders', method: 'GET' }),
  getByCode: (orderCode) => ajaxRequest({ endpoint: `/orders/${encodeURIComponent(orderCode)}`, method: 'GET' }),
  placeOrder: (payload) => ajaxRequest({ endpoint: '/orders', method: 'POST', data: payload }),
  updateStatus: (id, status) => ajaxRequest({ endpoint: `/orders/${encodeURIComponent(id)}/status`, method: 'PATCH', data: { status } })
};

export const InventoryApi = {
  getHealthReport: (branchId = '') => ajaxRequest({ endpoint: `/inventory/health-report${branchId ? `?branch=${encodeURIComponent(branchId)}` : ''}`, method: 'GET' }),
  updateSettings: (productId, settings) => ajaxRequest({ endpoint: `/inventory/${encodeURIComponent(productId)}/settings`, method: 'PATCH', data: settings }),
  adjustStock: (productId, branchId, quantityDelta) => ajaxRequest({ endpoint: `/inventory/${encodeURIComponent(productId)}/adjust`, method: 'POST', data: { branchId, quantityDelta } })
};
```

### 11. Chatbot AI Proxy API (`src/js/api/chatApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const ChatApi = {
  sendMessage: (message, history = [], cart = []) => 
    ajaxRequest({ 
      endpoint: '/chat/message', 
      method: 'POST', 
      data: { message, history, cart } 
    })
};
```

### 12. Corporate Profile & Legal Policies API (`src/js/api/policyApi.js`):
```javascript
import { ajaxRequest } from './apiClient.js';

export const PolicyApi = {
  getBusinessProfile: () => ajaxRequest({ endpoint: '/business-profile', method: 'GET' }),
  updateBusinessProfile: (payload) => ajaxRequest({ endpoint: '/business-profile', method: 'PUT', data: payload }),
  getPolicies: () => ajaxRequest({ endpoint: '/policies', method: 'GET' }),
  getPolicyBySlug: (slug) => ajaxRequest({ endpoint: `/policies/${encodeURIComponent(slug)}`, method: 'GET' }),
  updatePolicy: (slug, payload) => ajaxRequest({ endpoint: `/policies/${encodeURIComponent(slug)}`, method: 'PUT', data: payload })
};
```

---

## 9. Step-by-Step Backend Migration & Cutover Checklist

### Phase 1: Database Initialization
- [ ] Install MySQL Server 8.0+ locally or spin up a cloud RDS instance.
- [ ] Run the complete DDL script from [Section 4](#4-mysql-relational-database-schema-ddl) (22 tables including `wishlist_items`, `newsletter_subscribers`, and `newsletter_campaigns`).
- [ ] Seed initial branches (`BR-COL`, `BR-GAL`, `BR-MAT`, `BR-KAN`), categories, default badges (`Hot Deal`, `Top Rated`, `New Arrival`, `Bestseller`), default hardware partner brands, default deal bundles, and default user credentials (`superadmin` / `admin`) with BCrypt hashed passwords and `ACTIVE` status.

### Phase 2: Spring Boot API Implementation
- [ ] Initialize Spring Boot 3.3+ project with Maven / Gradle.
- [ ] Configure `application.yml` with MySQL datasource, JWT secret keys, and SMTP email server settings.
- [ ] Implement JPA Entities, Repositories, Services, and REST Controllers across all modules.
- [ ] Implement `JwtAuthenticationFilter` and configure CORS headers for frontend origins (`http://localhost:5500`, `http://127.0.0.1:5500`).
- [ ] Implement `@Transactional` `OrderService.createOrder(...)` with atomic branch stock decrement.
- [ ] Implement `PromotionService` to handle dynamic deal bundle bottleneck evaluation across multi-branch inventory.
- [ ] Implement `TransferService` with `@Transactional` stock movement across branches.
- [ ] Implement `WishlistService` handling customer wishlist persistence and seamless cart transfer.
- [ ] Implement `NewsletterService` handling subscription validation, duplicate checking, batch email broadcasting, and metrics tracking.
- [ ] Implement `BadgeRuleEngineService` evaluating auto-assignment rules against live database statistics.

### Phase 3: Frontend API Client Layer Integration
- [ ] Ensure all API client modules in `src/js/api/` are exported through `src/js/api/index.js` using `ajaxRequest` from `apiClient.js`.
- [ ] Update `src/js/controller/login_controller.js` to store and attach JWT token upon login.
- [ ] Update `src/js/models/data.js` and `src/js/controller/shop_controller.js` to fetch products asynchronously from `ProductApi.getAll()`.
- [ ] Update `src/js/controller/brand_management_controller.js` to use `BrandsApi`.
- [ ] Update `src/js/controller/promotion_management_controller.js` and `hot_deal_controller.js` to use `PromotionsApi`.
- [ ] Update `src/js/controller/transfer_management_controller.js` to use `TransfersApi`.
- [ ] Update `src/js/controller/taxonomy_controller.js` to use `CategoryApi` and `BadgeApi`.
- [ ] Update `src/js/controller/stock_health_controller.js` to interact with `InventoryApi`.
- [ ] Update `src/js/controller/product-details_controller.js` and `rating_data.js` to use `ProductApi.getReviews()` and `submitReview()`.
- [ ] Connect `wishlist_controller.js` to `WishlistApi` for persistent cloud synchronization.
- [ ] Connect `newsletter_controller.js` and `newsletter_management_controller.js` to `NewsletterApi`.
- [ ] Update `src/js/controller/chatbot_controller.js` to dispatch messages to `ChatApi.sendMessage()`.

### Phase 4: Validation & Cutover Testing
- [ ] Test customer registration, login, token refresh, and account status validation (`ACTIVE` vs `INACTIVE`).
- [ ] Test product creation, editing (with 5-image gallery), and stock matrix adjustments across branches.
- [ ] Test hardware partner brands management, logo presets, and homepage featured showcase toggles.
- [ ] Test deal bundle composite inventory bottlenecks and live MSRP savings calculations.
- [ ] Test inter-branch stock transfers and verify atomic source decrement & destination increment.
- [ ] Test order checkout with multi-item stock deduction and out-of-stock validation.
- [ ] Test customer wishlist toggle, remove, clear, and move-to-cart operations.
- [ ] Test newsletter subscriber opt-in, duplicate protection, status toggling, bulk delete, and campaign broadcast dispatch.
- [ ] Verify review submission recalculates product ratings and triggers badge reach rules in audit log.
- [ ] Verify system default badges (`Hot Deal`, `Top Rated`, `New Arrival`, `Bestseller`) are protected from accidental deletion.
- [ ] Verify role-based access control (`SUPERADMIN` vs `ADMIN` vs `STAFF` vs `CUSTOMER`) across all restricted endpoints.

---
*Specification Master Version: 4.0 (Full Architecture, Wishlist, User Status & Newsletter Alignment Audit)*  
*Target: ETech Computers Online Store — Coursework ITS 1114 (Advanced Application Development)*

