# 💻 ETech Computers — Next-Gen Enterprise E-Commerce & Hardware Management Platform

[![ETech Version](https://img.shields.io/badge/version-2.4.0-blue.svg?style=for-the-badge)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-emerald.svg?style=for-the-badge)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6%2B%20Modules-F7DF1E.svg?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![REST Backend](https://img.shields.io/badge/Backend-Spring%20Boot%20%2B%20MySQL-6DB33F.svg?style=for-the-badge&logo=spring&logoColor=white)](BACKEND_API_MIGRATION.md)

> A modern, full-featured **Single Page Application (SPA)** designed for high-performance gaming hardware, custom PC configurations, and computer peripherals. Engineered with **Vanilla JavaScript (ES Modules)**, **Tailwind CSS**, a custom glassmorphism design system, and an enterprise **Admin & Staff Management Console**.

---

## 📑 Table of Contents

- [✨ Key Capabilities](#-key-capabilities)
- [🛍️ Storefront Modules](#️-storefront-modules)
- [🛡️ Enterprise Admin Console](#️-enterprise-admin-console)
- [🤖 AI Hardware Assistant ("E-T AI")](#-ai-hardware-assistant-e-t-ai)
- [🎨 Design System & UI Architecture](#-design-system--ui-architecture)
- [🏗️ Project Architecture & Directory Structure](#️-project-architecture--directory-structure)
- [🔌 API Layer & Dual-Mode Persistence](#-api-layer--dual-mode-persistence)
- [🚀 Getting Started & Local Setup](#-getting-started--local-setup)
- [👥 Default Demo User Accounts](#-default-demo-user-accounts)
- [🗺️ Hash Routing Specification](#️-hash-routing-specification)
- [📄 Documentation References](#-documentation-references)
- [📜 License](#-license)

---

## ✨ Key Capabilities

- **⚡ Blazing-Fast SPA Architecture**: Hash-based dynamic routing (`#home`, `#shop`, `#product-details`, `#cart`, `#checkout`, `#wishlist`, `#deals`, `#branches`, `#about`, `#policies`, `#account`, `#login`, `#admin`) with zero page reloads.
- **🏬 Multi-Branch Regional Inventory**: Real-time cross-branch stock distribution across **Colombo HQ**, **Kandy**, **Galle**, **Matara**, and **Kurunegala**.
- **🚚 Smart Multi-Warehouse Order Routing**: Automated branch distance calculation and stock allocation for lightning-fast customer fulfillment.
- **🛡️ Enterprise Role-Based Access Control (RBAC)**: Secure access management with dedicated interfaces for `ADMIN`, `STAFF`, and `CUSTOMER` roles.
- **💬 AI Hardware Assistant**: Built-in "E-T AI" customer assistant trained on computer parts compatibility, warranty terms, and stock queries.
- **💎 Custom `etechAlert` & Glassmorphism UI**: Beautiful, accessible modal dialogs (`confirmDelete`, `confirmUpdate`, `confirmCreate`, `prompt`, `info`, `warning`, `error`) and unified vector SVG iconography.
- **🔄 Dual Data Layer**: Transparent, resilient design that operates against a **Spring Boot REST API** with automated fallback to persistent browser storage.

---

## 🛍️ Storefront Modules

| Module | Route | Key Features |
| :--- | :--- | :--- |
| **Hero & Landing Showcase** | `#home` | 3D Interactive promo carousel, trending categories, featured builds, flash deal countdowns, customer reviews, and brand spotlight. |
| **Global Product Catalog** | `#shop` | Multi-facet live filtering by Category, Subcategory, Brand, Price range slider, In-stock status, Spec tags, Dynamic sorting, and live keyword search. |
| **Product Detail Experience** | `#product-details?id=...` | Multi-angle 5-image gallery with zoom preview, technical spec sheet, live branch-by-branch stock checker, verified customer reviews, and direct cart/wishlist sync. |
| **Dynamic Wishlist Hub** | `#wishlist` | Saved items management with instant cart transfer, price drop indicators, and real-time badge synchronizers. |
| **Hot Deals & Flash Sales** | `#deals` | Live countdown clocks, stock claim progress bars, limited-time bundle promotions, and instant deal checkout. |
| **Multi-Branch Store Locator** | `#branches` | Interactive branch directory, live operational status (Open/Closed), contact hotlines, direct email links, and embedded map navigation. |
| **Cart & Multi-Step Checkout** | `#cart`, `#checkout` | Dynamic subtotal calculation, coupon voucher validation, nearest-branch routing, delivery address management, and flexible payment gateways (Card, Bank Transfer, COD, Koko/Mintpay). |
| **Corporate Legal & Policies** | `#policies` | Live searchable legal documents: Terms of Service, Privacy Policy, Return & Warranty Guidelines, and Corporate Information. |
| **Customer Account Portal** | `#account` | Personal profile management, password security manager, order history ledger with printable invoice summaries. |

---

## 🛡️ Enterprise Admin Console

Accessible via `#admin` for authorized `ADMIN` and `STAFF` users, providing **12 dedicated management suites**:

```
Admin Console Dashboard
 ├── 📊 Operational KPI Summary (Revenue, Orders, Low Stock Alerts, Active Users)
 ├── 📦 Product Catalog Manager (Full CRUD, 5-Image Gallery, Spec Builder, Branch Allocation)
 ├── 🏷️ Taxonomy & Category Manager (Category Tree Hierarchy, Subcategories, Badge Rules)
 ├── 🏢 Brand & Manufacturer Registry (Tier Badges, Warranty Rules, Origin Country, Logos)
 ├── 🏥 Stock Health & Inventory Matrix (Regional Stock Levels, Reorder Thresholds, Quick Restock)
 ├── 🚚 Inter-Branch Stock Transfers (Draft ➔ Pending Approval ➔ Dispatched ➔ Received Workflow)
 ├── 📋 Order Lifecycle Manager (Order Status Pipelines, Invoice Generator, Tracking Numbers)
 ├── ⚡ Promotion & Deals Studio (Flash Deal Scheduler, Countdown Timers, Bundle Configurations)
 ├── 📧 Newsletter & Broadcast Studio (Subscriber Audience, HTML Campaign Composer, Preview/Send)
 ├── 🏛️ Corporate Profile & Policy Editor (Live Visual Policy Editor, Company Metadata)
 ├── 👥 User & Access Control (Role Assignments, Account Suspension, Activity Tracking)
 ├── 🗑️ Trash Bin & Recovery Vault (Two-Stage Soft Delete, Item Restoration, Permanent Purge)
 └── 📈 Financial & Analytics Reports (Sales Trends, Category Breakdown, Profit Margin Insights)
```

---

## 🤖 AI Hardware Assistant ("E-T AI")

Located at the bottom right corner or accessible via `#chatbot`:
- **Context-Aware Recommendations**: Recommends PC builds based on gaming, editing, or office budgets.
- **Hardware Compatibility Checker**: Validates CPU socket compatibility, GPU length clearances, and PSU wattage requirements.
- **Order & Inventory Tracking**: Queries real-time stock levels across regional branches and guides users through order tracking and warranty claims.

---

## 🎨 Design System & UI Architecture

The application implements the **Precision Tech Dark & Neutral Modern Design System**:

- **Color Tokens**: Curated Slate & Navy backgrounds (`#0f172a`, `#1e293b`), Slate border accents (`#334155`, `#e2e8f0`), and vibrant action colors (Royal Blue `#2563eb`, Emerald `#10b981`, Amber `#f59e0b`, Rose `#ef4444`).
- **Typography**: Google Font **Plus Jakarta Sans** with strict typographic scale (`text-xs` through `text-4xl`).
- **Unified Vector Icon Library** (`src/js/util/icons.js`): Single-color inline SVGs with responsive container badges (`renderIconBox()`).
- **Custom `etechAlert` Confirmation Engine** (`src/js/util/etech_alert.js`):
  - Action-Specific Themes: `confirmDelete` (Rose/Danger), `confirmUpdate` (Blue/Update), `confirmCreate` (Emerald/Success).
  - Built-in `etechAlert.prompt` for transfer cancellation notes and quantity inputs.
  - Keyboard Accessibility (`Enter` to confirm, `Escape` to cancel) and glassmorphism backdrops.
- **Toast Notification Engine** (`src/js/util/toast.js`): Floating stacking toast alerts with automatic timeout dismissal and category badges.

---

## 🏗️ Project Architecture & Directory Structure

```
ITS1114-AAD-ETech-Computers-Online-Store-HTML/
├── index.html                           # Main Single Page Application Entry Point
├── script.js                            # Central ES Module Bridge & Global Window Bindings
├── README.md                            # Comprehensive System Documentation
├── THEME_AND_STYLING_GUIDE.md           # UI Design System & Component Guidelines
├── BACKEND_API_MIGRATION.md             # Spring Boot REST API Integration & Schema Spec
│
├── public/                              # Static Assets
│   ├── images/                          # Product Images, Brand Logos & Banners
│   └── fonts/                           # Local Typography Fallbacks
│
└── src/
    ├── css/
    │   ├── global.css                   # Custom Animations, Scrollbars & Glassmorphism
    │   └── variables.css                # CSS Custom Properties & Design Tokens
    │
    ├── data/                            # Seed Data & Fallback Storage Definitions
    │   ├── branches.js                  # Regional Branch Store Locations
    │   ├── brands.js                    # Brand & Manufacturer Directory
    │   ├── deals.js                     # Hot Deals & Bundle Promotions
    │   ├── orders.js                    # Mock Orders & Invoices Ledger
    │   ├── policies.js                  # Legal Policies & Corporate Profile
    │   ├── products.js                  # Product Catalog Seed Data
    │   ├── ratings_reviews.js           # Verified Customer Reviews
    │   ├── taxonomy.js                  # Categories, Subcategories & Badges
    │   ├── transfers.js                 # Inter-Branch Stock Transfers
    │   └── users.js                     # Default Users & Credentials
    │
    └── js/
        ├── app/                         # App Router & View Initializers
        │   ├── app.js                   # SPA Core Router, Navigation & Route Handlers
        │   ├── administrator/           # Admin Page Bootstrapper
        │   ├── about/                   # About Us View Initializer
        │   └── login/                   # Auth Page Bootstrapper
        │
        ├── api/                         # Backend REST API Integration Layer
        │   ├── apiClient.js             # HTTP Client, JWT Session Token & Auto-Logout Handler
        │   ├── productsApi.js           # Product Catalog Endpoints
        │   ├── ordersApi.js             # Order Placement & Tracking Endpoints
        │   ├── inventoryApi.js          # Branch Stock & Restock Endpoints
        │   ├── transfersApi.js          # Inter-Branch Stock Transfer Endpoints
        │   ├── userApi.js               # Auth, User Profile & Staff RBAC Endpoints
        │   ├── categoriesApi.js         # Category & Taxonomy Endpoints
        │   ├── brandsApi.js             # Brand Registry Endpoints
        │   ├── promotionsApi.js         # Hot Deals & Promo Endpoints
        │   ├── newsletterApi.js         # Newsletter & Broadcast Endpoints
        │   ├── policiesApi.js           # Corporate Info & Policies Endpoints
        │   ├── reviewsApi.js            # Rating & Review Endpoints
        │   ├── wishlistApi.js           # Customer Wishlist Endpoints
        │   ├── branchesApi.js           # Branch Directory Endpoints
        │   ├── analyticsApi.js          # Revenue & Sales Reports Endpoints
        │   └── chatApi.js               # Gemini AI Chatbot Proxy Endpoints
        │
        ├── controller/                  # Business Logic & View Controllers
        │   ├── admin_dashboard_controller.js      # Admin Console Core & Routing
        │   ├── product_management_controller.js   # Product Catalog CRUD
        │   ├── order_management_controller.js     # Order Ledger & Invoicing
        │   ├── stock_health_controller.js         # Inventory Matrix & Low-Stock Alerts
        │   ├── transfer_management_controller.js  # Inter-Branch Transfers Workflow
        │   ├── taxonomy_controller.js             # Categories & Badge Rules
        │   ├── brand_management_controller.js     # Brands & Manufacturer Tiers
        │   ├── promotion_management_controller.js # Deals, Banners & Bundles
        │   ├── newsletter_management_controller.js# Subscriber Campaigns & Studio
        │   ├── policy_management_controller.js    # Policy Editor & Corporate Profile
        │   ├── user_management_controller.js      # User Accounts & RBAC Matrix
        │   ├── trash_bin_controller.js            # Soft-Delete Recovery Vault
        │   ├── analytics_and_report_controller.js # Financial Charts & CSV Exports
        │   ├── shop_controller.js                 # Storefront Filter & Catalog Engine
        │   ├── product-details_controller.js      # Product Detail Page Renderer
        │   ├── cart_controller.js                 # Cart & Multi-Step Checkout Logic
        │   ├── wishlist_controller.js             # Wishlist Management
        │   ├── hot_deal_controller.js             # Deals & Flash Sales Hub
        │   ├── branch_controller.js               # Store Locator & Map Directives
        │   ├── branch_management_controller.js    # Admin Branch Operations
        │   ├── login_controller.js                # Auth, Sign In, Sign Up & Session
        │   └── chatbot_controller.js              # E-T AI Assistant & Knowledge Base
        │
        ├── models/                      # Domain Models & In-Memory State Managers
        │   ├── product_model.js         # Product Schema & Computed Helpers
        │   ├── user_model.js            # User Schema, Role Guards & Storage
        │   ├── deals_data.js            # Deals In-Memory Store
        │   ├── taxonomy_data.js         # Category Tree Store
        │   ├── brand_data.js            # Brand Store
        │   ├── transfers_data.js        # Stock Transfers Store
        │   ├── newsletter_model.js      # Subscribers & Campaign Store
        │   ├── policy-data.js           # Policy Document Store
        │   ├── rating_data.js           # Customer Reviews Store
        │   ├── data.js                  # Master State Aggregator
        │   └── et-training.js           # Hardware AI Knowledge Base & Q&A
        │
        ├── components/                  # Modular UI Web Components
        │   ├── product_detail_cart.js   # Product Quick-View & Cart Drawer
        │   └── user_profile_modal_container.js # Profile Edit & Password Security Modal
        │
        └── util/                        # Reusable Utilities & Design System Helpers
            ├── etech_alert.js           # Modern Glassmorphic Custom Alert/Modal Engine
            ├── toast.js                 # Auto-Dismissing Toast Notification System
            ├── icons.js                 # Monochrome & Dual-Tone SVG Icon Engine
            ├── formatters.js            # Currency (LKR), Dates, Badges & Numbers
            ├── ui_helpers.js            # Loading Spinners, Empty States & DOM Utilities
            └── index.js                 # Central Barrel Export
```

---

## 🔌 API Layer & Dual-Mode Persistence

The front-end is equipped with an intelligent **Dual-Mode Data Architecture**:

1. **Connected Mode (Spring Boot Backend)**:
   - Base API URL configured in `src/js/api/apiClient.js` (default: `http://localhost:8080/api/v1`).
   - Secure Bearer JWT authorization tokens automatically attached to all outgoing requests.
   - Centralized error handling: Automatic session invalidation and prompt to log back in when token expires (`401 Unauthorized`).
2. **Offline / Mock Fallback Mode**:
   - If the backend server is unreachable, controllers seamlessly fall back to client-side `localStorage` data stores.
   - Enables full end-to-end frontend evaluation and demonstration without requiring a running database server.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+).
- Any local static HTTP server (e.g. Node.js `npx serve`, VS Code Live Server, or Python).

### Installation & Launch

1. **Clone the repository**:
   ```bash
   git clone https://github.com/HasithaLWi/ITS1114-AAD-ETech-Computers-Online-Store-HTML.git
   cd ITS1114-AAD-ETech-Computers-Online-Store-HTML
   ```

2. **Start a local development server**:
   
   *Using Node.js (Recommended)*:
   ```bash
   npx serve . -l 3000
   ```

   *Using Python 3*:
   ```bash
   python -m http.server 3000
   ```

   *Using VS Code*:
   Right-click `index.html` and select **"Open with Live Server"**.

3. **Open in your browser**:
   ```
   http://localhost:3000/
   ```

---

## 👥 Default Demo User Accounts

Use these pre-configured credentials to test all role levels:

| Role | Username / Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` / `admin@etech.lk` | `admin123` | Full access to Storefront, All Admin Suites, Settings & User RBAC |
| **Staff Member** | `staff` / `staff@etech.lk` | `staff123` | Storefront, Products, Inventory, Transfers, Orders & Customer Support |
| **Customer** | `customer` / `hasitha@etech.lk` | `customer123` | Storefront, Shopping Cart, Wishlist, Checkout & Customer Portal |

---

## 🗺️ Hash Routing Specification

The application uses clean hash routing to transition between views smoothly:

- `#home` — Primary landing page, 3D promo slider, flash deals, featured hardware.
- `#shop` — Full product catalog with multi-facet filters, sorting, and pagination.
- `#product-details?id=PROD-101` — Single product overview, image gallery, specs, branch stock, reviews.
- `#deals` — Hot deals, limited-time bundle promotions, flash discounts.
- `#cart` — Shopping cart, item quantities, coupon discounts, order summary.
- `#checkout` — Multi-step delivery address, branch distance selector, payment gateway.
- `#wishlist` — Customer saved items wishlist hub.
- `#branches` — Regional branch locator with maps, contact cards, and working hours.
- `#about` — Corporate story, certifications, brand partners, milestones.
- `#policies` — Legal documents (Terms, Privacy, Warranty, Returns, Business Profile).
- `#account` — Customer account dashboard, order history, profile settings.
- `#login` — Customer and staff sign-in and registration forms.
- `#admin` — Enterprise Administrator & Staff Management Console (Requires Admin/Staff login).

---

## 📄 Documentation References

- 🎨 **[Theme & Styling Guide (THEME_AND_STYLING_GUIDE.md)](THEME_AND_STYLING_GUIDE.md)**: Comprehensive design tokens, elevation levels, typography guidelines, and UI component standards.
- 📌 **[Backend Migration Specification (BACKEND_API_MIGRATION.md)](BACKEND_API_MIGRATION.md)**: Complete MySQL schema (DDL), Spring Boot REST controller mappings, and step-by-step backend migration guide.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  <b>ETech Computers Online Store & Enterprise Management Suite</b><br>
  <i>Crafted with precision for next-generation hardware enthusiasts and enterprise retail operations.</i>
</p>
