// ============================================================
//  src/js/models/user_model.js — User Entity & Role Model
// ============================================================
import { getToken, setToken, removeToken } from '../api/apiClient.js';

export const CURRENT_USER_STORAGE_KEY = 'etech_current_user';
export const DEFAULT_ROLE = 'CUSTOMER';
export const USER_ROLE = {
    CUSTOMER: 'CUSTOMER',
    STAFF: 'STAFF',
    ADMIN: 'ADMIN',
    SUPERADMIN: 'SUPERADMIN'
};

export const USER_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE'
};

/**
 * User Entity Model Class (Industry Standard ES6 Class)
 */
export class User {
    id;
    username;
    name;
    email;
    password;
    role;
    status;
    assignedBranch;
    createdAt;

    constructor(data = {}) {
        this.id = data.id ?? null;
        this.username = data.username ?? '';
        this.name = data.name ?? '';
        this.email = data.email ?? '';
        this.password = data.password ?? null;
        this.role = (data.role ?? DEFAULT_ROLE).toUpperCase();
        this.status = (data.status ?? data.userStatus ?? USER_STATUS.ACTIVE).toUpperCase();
        this.assignedBranch = data.assignedBranch ?? null;
        this.createdAt = data.createdAt ?? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    /**
     * Check if user is Superadmin
     * @returns {boolean}
     */
    isSuperAdmin() {
        return this.role === USER_ROLE.SUPERADMIN;
    }

    /**
     * Check if user has administrative privileges (Admin or Superadmin)
     * @returns {boolean}
     */
    isAdmin() {
        return this.role === USER_ROLE.ADMIN || this.role === USER_ROLE.SUPERADMIN;
    }

    /**
     * Check if user is branch staff
     * @returns {boolean}
     */
    isStaff() {
        return this.role === USER_ROLE.STAFF;
    }

    /**
     * Check if user is a standard customer
     * @returns {boolean}
     */
    isCustomer() {
        return this.role === USER_ROLE.CUSTOMER;
    }

    /**
     * Check if user has global management access (SuperAdmin or Unassigned Admin)
     * @returns {boolean}
     */
    hasGlobalAccess() {
        return this.isSuperAdmin() || (this.isAdmin() && !this.assignedBranch);
    }

    /**
     * Check if user has authority to manipulate data for a specific branch
     * @param {string} branchId
     * @returns {boolean}
     */
    canManageBranch(branchId) {
        if (!branchId) return this.hasGlobalAccess();
        if (this.hasGlobalAccess()) return true;
        return this.assignedBranch === branchId;
    }

    /**
     * Get user initial for avatar UI badges
     * @returns {string}
     */
    getInitial() {
        return (this.name || this.username || 'U').charAt(0).toUpperCase();
    }
}

// ── Storage & Session Manipulation Logic ─────────────────────

/**
 * Retrieve active user session from localStorage as a User instance
 * @returns {User|null}
 */
export function getCurrentUser() {
    try {
        const session = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (!session) return null;
        const parsed = JSON.parse(session);
        return parsed ? new User(parsed) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Set active user session in localStorage
 * @param {object|User} user
 * @returns {User|null}
 */
export function setCurrentUser(user) {
    if (!user) return null;
    const userInstance = user instanceof User ? user : new User(user);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userInstance));
    return userInstance;
}

/**
 * Remove active user session from localStorage
 */
export function removeCurrentUser() {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}

/**
 * Check if a valid authenticated user session is active
 * @returns {boolean}
 */
export function isLoggedIn() {
    return Boolean(getToken() && getCurrentUser());
}

/**
 * Terminate active user session and purge auth tokens
 */
export function logoutUser() {
    removeToken();
    removeCurrentUser();
}

// ── Centralized Role UI Formatting ──────────────────────────

/**
 * Generate <option> HTML tags directly from USER_ROLE
 * @param {string} [selectedRole='']
 * @returns {string}
 */
export function buildRoleOptionsHtml(selectedRole = '') {
    const active = String(selectedRole || DEFAULT_ROLE).toUpperCase();
    return Object.values(USER_ROLE).map(role => {
        const isSelected = role === active;
        return `<option value="${role}" ${isSelected ? 'selected' : ''}>${role}</option>`;
    }).join('');
}

import { renderUserRoleBadge, renderUserStatusBadge } from '../util/ui_helpers.js';

/**
 * Role badge formatter using USER_ROLE
 * @param {string} role
 * @returns {string} HTML markup for badge
 */
export function getRoleBadge(role) {
    return renderUserRoleBadge(role);
}

/**
 * Generate <option> HTML tags for user status
 * @param {string} [selectedStatus='ACTIVE']
 * @returns {string}
 */
export function buildStatusOptionsHtml(selectedStatus = 'ACTIVE') {
    const active = String(selectedStatus || 'ACTIVE').toUpperCase();
    return `
        <option value="ACTIVE" ${active === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
        <option value="INACTIVE" ${active === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
    `;
}

/**
 * Status badge formatter
 * @param {string} status
 * @returns {string} HTML markup for status badge
 */
export function getStatusBadge(status) {
    return renderUserStatusBadge(status);
}


