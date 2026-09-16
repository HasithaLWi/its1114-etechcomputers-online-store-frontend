// ============================================================
//  src/js/api/userApi.js — User & Authentication Backend API Client
// ============================================================
import { ajaxRequest } from './apiClient.js';

export const AuthApi = {
  /**
   * Authenticate user credentials and retrieve JWT token + sanitized profile
   * POST /api/v1/auth/login
   */
  async login(username, password) {
    console.log('[UserAPI] AuthApi.login() -> username/email:', (username || '').trim());
    return ajaxRequest({
      endpoint: '/auth/login',
      method: 'POST',
      data: {
        username: (username || '').trim(),
        password: password
      }
    });
  },

  /**
   * Register a new customer storefront user
   * POST /api/v1/auth/register
   */
  async register({ name, username, email, password }) {
    console.log('[UserAPI] AuthApi.register() -> new user:', { 
      name: (name || '').trim(), 
      username: (username || '').trim().toLowerCase(), 
      email: (email || '').trim().toLowerCase() 
    });
    return ajaxRequest({
      endpoint: '/auth/register',
      method: 'POST',
      data: {
        name: (name || '').trim(),
        username: (username || '').trim().toLowerCase(),
        email: (email || '').trim().toLowerCase(),
        password: password
      }
    });
  },

  /**
   * Retrieve currently authenticated user profile from active JWT session
   * GET /api/v1/auth/me
   */
  async getCurrentUser() {
    console.log('[UserAPI] AuthApi.getCurrentUser() -> verifying active session');
    const res = await ajaxRequest({
      endpoint: '/auth/me',
      method: 'GET'
    });
    return (res && res.body !== undefined && res.body !== null) ? res.body : res;
  },

  /**
   * Request 6-digit OTP code to reset password
   * POST /api/v1/auth/forgot-password/request-otp
   */
  async requestPasswordResetOtp(identifier) {
    console.log('[UserAPI] AuthApi.requestPasswordResetOtp() ->', identifier);
    return ajaxRequest({
      endpoint: '/auth/forgot-password/request-otp',
      method: 'POST',
      data: { identifier: (identifier || '').trim() }
    });
  },

  /**
   * Verify 6-digit OTP code
   * POST /api/v1/auth/forgot-password/verify-otp
   */
  async verifyPasswordResetOtp(identifier, otp) {
    console.log('[UserAPI] AuthApi.verifyPasswordResetOtp() ->', identifier, otp);
    return ajaxRequest({
      endpoint: '/auth/forgot-password/verify-otp',
      method: 'POST',
      data: {
        identifier: (identifier || '').trim(),
        otp: (otp || '').trim()
      }
    });
  },

  /**
   * Reset account password with verified OTP or reset token
   * POST /api/v1/auth/forgot-password/reset-password
   */
  async resetPasswordWithOtp(identifier, resetToken, newPassword) {
    console.log('[UserAPI] AuthApi.resetPasswordWithOtp() ->', identifier);
    return ajaxRequest({
      endpoint: '/auth/forgot-password/reset-password',
      method: 'POST',
      data: {
        identifier: (identifier || '').trim(),
        resetToken: (resetToken || '').trim(),
        newPassword: newPassword
      }
    });
  }
};

export const EmailApi = {
  /**
   * Send Customer Support Inquiry
   * POST /api/v1/email/support
   */
  async sendSupportInquiry(inquiryData) {
    return ajaxRequest({
      endpoint: '/email/support',
      method: 'POST',
      data: inquiryData
    });
  }
};

export const UserApi = {
  /**
   * Fetch system user directory with optional filtering (Admin/Superadmin only)
   * GET /api/v1/users
   */
  async getUsers(params = {}) {
    const query = {};
    if (params.role) query.role = params.role;
    if (params.branch) query.branch = params.branch;
    if (params.search) query.search = params.search;

    console.log('[UserAPI] UserApi.getUsers() -> query filters:', query);
    const res = await ajaxRequest({
      endpoint: '/users',
      method: 'GET',
      data: query
    });
    return (res && res.body !== undefined && res.body !== null) ? res.body : res;
  },

  /**
   * Fetch single user record by database ID
   * GET /api/v1/users/{id}
   */
  async getUserById(id) {
    console.log('[UserAPI] UserApi.getUserById() -> user ID:', id);
    const res = await ajaxRequest({
      endpoint: `/users/${encodeURIComponent(id)}`,
      method: 'GET'
    });
    return (res && res.body !== undefined && res.body !== null) ? res.body : res;
  },

  /**
   * Create a new user account (Admin/Superadmin only)
   * POST /api/v1/users
   */
  async createUser(userData) {
    console.log('[UserAPI] UserApi.createUser() -> new user account:', {
      name: (userData.name || '').trim(),
      username: (userData.username || '').trim().toLowerCase(),
      email: (userData.email || '').trim().toLowerCase(),
      role: userData.role || 'CUSTOMER',
      assignedBranch: userData.assignedBranch || null
    });

    return ajaxRequest({
      endpoint: '/users',
      method: 'POST',
      data: {
        name: (userData.name || '').trim(),
        username: (userData.username || '').trim().toLowerCase(),
        email: (userData.email || '').trim().toLowerCase(),
        password: userData.password,
        role: userData.role || 'CUSTOMER',
        assignedBranch: userData.assignedBranch || null
      }
    });
  },

  /**
   * Update user details and optionally override password
   * PUT /api/v1/users/{id}
   */
  async updateUser(id, userData) {
    console.log('[UserAPI] UserApi.updateUser() -> ID:', id, {
      name: (userData.name || '').trim(),
      username: (userData.username || '').trim().toLowerCase(),
      email: (userData.email || '').trim().toLowerCase(),
      role: userData.role,
      assignedBranch: userData.assignedBranch || null,
      hasPasswordUpdate: Boolean(userData.password)
    });

    const payload = {
      name: (userData.name || '').trim(),
      username: (userData.username || '').trim().toLowerCase(),
      email: (userData.email || '').trim().toLowerCase(),
      role: userData.role,
      assignedBranch: userData.assignedBranch || null
    };

    if (userData.password) {
      payload.password = userData.password;
    }

    return ajaxRequest({
      endpoint: `/users/${encodeURIComponent(id)}`,
      method: 'PUT',
      data: payload
    });
  },

  /**
   * Assign / change a user's system role and branch
   * PATCH /api/v1/users/{id}/role
   */
  async updateUserRole(id, { role, assignedBranch = null }) {
    console.log('[UserAPI] UserApi.updateUserRole() -> ID:', id, { role, assignedBranch });
    return ajaxRequest({
      endpoint: `/users/${encodeURIComponent(id)}/role`,
      method: 'PATCH',
      data: {
        role: role,
        assignedBranch: assignedBranch
      }
    });
  },

  /**
   * Update a user's status (ACTIVE / INACTIVE)
   * PATCH /api/v1/users/{id}/status (with fallback to PUT /api/v1/users/{id})
   */
  async updateUserStatus(id, status) {
    console.log('[UserAPI] UserApi.updateUserStatus() -> ID:', id, { status });
    try {
      return await ajaxRequest({
        endpoint: `/users/${encodeURIComponent(id)}/status`,
        method: 'PATCH',
        data: { status }
      });
    } catch (e) {
      return await ajaxRequest({
        endpoint: `/users/${encodeURIComponent(id)}`,
        method: 'PUT',
        data: { status }
      });
    }
  },

  /**
   * Delete user account from system
   * DELETE /api/v1/users/{id}
   */
  async deleteUser(id) {
    console.log('[UserAPI] UserApi.deleteUser() -> ID:', id);
    return ajaxRequest({
      endpoint: `/users/${encodeURIComponent(id)}`,
      method: 'DELETE'
    });
  },

  /**
   * Update logged-in user's personal profile (Name, Username, Email)
   * PUT /api/v1/users/me/profile
   */
  async updateSelfProfile({ name, username, email }) {
    console.log('[UserAPI] UserApi.updateSelfProfile() -> profile:', {
      name: (name || '').trim(),
      username: (username || '').trim().toLowerCase(),
      email: (email || '').trim().toLowerCase()
    });

    const res = await ajaxRequest({
      endpoint: '/users/me/profile',
      method: 'PUT',
      data: {
        name: (name || '').trim(),
        username: (username || '').trim().toLowerCase(),
        email: (email || '').trim().toLowerCase()
      }
    });
    return (res && res.body !== undefined && res.body !== null) ? res.body : res;
  },

  /**
   * Change logged-in user's account password
   * PUT /api/v1/users/me/password
   */
  async changeSelfPassword({ currentPassword, newPassword }) {
    console.log('[UserAPI] UserApi.changeSelfPassword() -> password update request');
    return ajaxRequest({
      endpoint: '/users/me/password',
      method: 'PUT',
      data: {
        currentPassword: currentPassword,
        newPassword: newPassword
      }
    });
  }
};

