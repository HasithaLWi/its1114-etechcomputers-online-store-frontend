// ============================================================
//  src/js/api/apiClient.js — Centralized jQuery AJAX API Client
// ============================================================

// export const API_BASE_URL = (typeof window !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : 'https://its1114-etechcomputers-online-store.onrender.com/api/v1';
export const API_BASE_URL = 'http://localhost:8080/api/v1';
export const TOKEN_STORAGE_KEY = 'etech_jwt_token';
export const CURRENT_USER_STORAGE_KEY = 'etech_current_user';

/**
 * Retrieve active JWT Bearer Token from localStorage
 */
export function getToken() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Persist JWT Bearer Token into localStorage
 */
export function setToken(token) {
  if (typeof localStorage !== 'undefined' && token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

/**
 * Clear JWT Bearer Token from localStorage
 */
export function removeToken() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/**
 * Safely sanitizes request/response payload for debug logging (strips passwords, tokens, credentials)
 */
export function sanitizeForLogging(payload) {
  if (!payload) return payload;
  try {
    let obj = payload;
    if (typeof payload === 'string') {
      try {
        obj = JSON.parse(payload);
      } catch (e) {
        return payload;
      }
    }
    if (typeof obj !== 'object' || obj === null) return obj;

    const SENSITIVE_KEYS = [
      'password', 'currentpassword', 'newpassword',
      'confirmpassword', 'token', 'jwt', 'secret',
      'cvv', 'cardnumber'
    ];

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeForLogging(item));
    }

    const sanitized = { ...obj };
    for (const key of Object.keys(sanitized)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }
    return sanitized;
  } catch (e) {
    return '[Unserializable Data]';
  }
}

let lastSessionExpiredNoticeTime = 0;

/**
 * Automatically terminates user session, purges auth credentials,
 * notifies user via toast/alert, and redirects to login if on protected page.
 */
export function handleSessionExpired(reason = 'Your session has expired. Please sign in again.') {
  const hadToken = Boolean(getToken());
  removeToken();
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  }

  const now = Date.now();
  if (now - lastSessionExpiredNoticeTime > 3000) {
    lastSessionExpiredNoticeTime = now;

    console.warn(`%c🔒 [SessionGuard] Session Expired / Invalid Token: "${reason}". Logged out immediately.`, 'color: #ef4444; font-weight: bold; font-size: 13px;');

    if (typeof window !== 'undefined') {
      if (typeof window.showToast === 'function') {
        window.showToast('🔒 Session expired. Please sign in again to continue.', 'error');
      }

      if (typeof window.updateHeaderAuthUI === 'function') {
        window.updateHeaderAuthUI();
      }

      window.dispatchEvent(new CustomEvent('sessionExpired', { detail: { message: reason } }));

      // If currently viewing a protected page, immediately redirect to login
      const currentHash = window.location.hash || '';
      const protectedPages = ['#admin', '#administrator', '#account', '#checkout'];
      const isProtected = protectedPages.some(p => currentHash.toLowerCase().startsWith(p));
      if (isProtected) {
        const pageClean = currentHash.replace(/^#/, '').split('?')[0];
        window.location.hash = `#login?redirect=${encodeURIComponent(pageClean)}&expired=true`;
      }
    }
  }
}

/**
 * Centralized jQuery AJAX Request Handler
 * Standardizes authentication headers, payload serialization, error parsing, session guards, and debug logging.
 */
export function ajaxRequest({ endpoint, method = 'GET', data = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const $ = window.jQuery || window.$;

    if (!$) {
      console.error('[API Client] jQuery is not loaded. Please ensure jQuery script is included.');
      return reject(new Error('jQuery is not loaded. Please ensure jQuery script is included.'));
    }

    const token = getToken();
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const httpMethod = method.toUpperCase();
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

    console.log(`%c[API Request] ${httpMethod} ${endpoint}`, 'color: #2563eb; font-weight: bold;', {
      url,
      method: httpMethod,
      hasToken: Boolean(token),
      payload: sanitizeForLogging(data)
    });

    const ajaxConfig = {
      url: url,
      type: httpMethod,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers
      },
      success: (response, statusText, xhr) => {
        const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const duration = (endTime - startTime).toFixed(1);
        const statusCode = xhr ? xhr.status : 200;

        // Check if response body envelops a 401/403 or "Token expired" status
        const isAuthError = response && (
          response.status === 401 ||
          response.status === 403 ||
          (typeof response.message === 'string' && (
            response.message.toLowerCase().includes('token expired') ||
            response.message.toLowerCase().includes('token invalid') ||
            response.message.toLowerCase().includes('jwt expired') ||
            response.message.toLowerCase().includes('full authentication is required') ||
            response.message.toLowerCase().includes('unauthorized')
          ))
        );

        if (isAuthError) {
          const authMsg = response.message || 'Session expired or token invalid.';
          console.warn(`%c[API Auth Failure ${response.status || statusCode}] ${httpMethod} ${endpoint} (${duration}ms)`, 'color: #ef4444; font-weight: bold;', response);
          handleSessionExpired(authMsg);
          const err = new Error(authMsg);
          err.status = response.status || 401;
          err.responseJSON = response;
          return reject(err);
        }

        console.log(`%c[API Response ${statusCode}] ${httpMethod} ${endpoint} (${duration}ms)`, 'color: #16a34a; font-weight: bold;', sanitizeForLogging(response));
        resolve(response);
      },
      error: (xhr, status, error) => {
        const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const duration = (endTime - startTime).toFixed(1);
        let errorMessage = 'Network error or server unavailable. Please try again.';

        if (xhr.status === 401 || xhr.status === 403) {
          errorMessage = xhr.responseJSON?.message || (xhr.status === 401 ? 'Session expired. Please sign in again.' : 'Access denied.');
          handleSessionExpired(errorMessage);
        } else if (xhr.responseJSON) {
          if (xhr.responseJSON.message) {
            errorMessage = xhr.responseJSON.message;
            if (xhr.responseJSON.body && typeof xhr.responseJSON.body === 'object') {
              const details = Object.values(xhr.responseJSON.body).filter(Boolean).join(', ');
              if (details) {
                errorMessage = `${xhr.responseJSON.message}: ${details}`;
              }
            }
            if (errorMessage.toLowerCase().includes('token expired') || errorMessage.toLowerCase().includes('token invalid') || errorMessage.toLowerCase().includes('jwt expired')) {
              handleSessionExpired(errorMessage);
            }
          } else if (xhr.responseJSON.body && typeof xhr.responseJSON.body === 'object') {
            errorMessage = Object.values(xhr.responseJSON.body).filter(Boolean).join(', ');
          }
        } else if (xhr.responseText) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            errorMessage = parsed.message || errorMessage;
            if (errorMessage.toLowerCase().includes('token expired') || errorMessage.toLowerCase().includes('token invalid') || errorMessage.toLowerCase().includes('jwt expired')) {
              handleSessionExpired(errorMessage);
            }
          } catch (e) {
            errorMessage = xhr.statusText || errorMessage;
          }
        }

        console.error(`%c[API Error ${xhr.status || 0}] ${httpMethod} ${endpoint} (${duration}ms)`, 'color: #dc2626; font-weight: bold;', {
          status: xhr.status,
          statusText: xhr.statusText,
          message: errorMessage,
          response: sanitizeForLogging(xhr.responseJSON || xhr.responseText)
        });

        const err = new Error(errorMessage);
        err.status = xhr.status;
        err.responseJSON = xhr.responseJSON;
        reject(err);
      }
    };

    // Serialize data appropriately for HTTP verb
    if (data !== null && data !== undefined) {
      if (['POST', 'PUT', 'PATCH'].includes(ajaxConfig.type)) {
        ajaxConfig.data = typeof data === 'string' ? data : JSON.stringify(data);
      } else if (ajaxConfig.type === 'GET' || ajaxConfig.type === 'DELETE') {
        ajaxConfig.data = data;
      }
    }

    $.ajax(ajaxConfig);
  });
}
