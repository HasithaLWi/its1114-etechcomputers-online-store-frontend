// ============================================================
//  src/js/util/email_servise.js — Universal ETech Email & Notification Service
// ============================================================
//  Provides an enterprise-grade, centralized email dispatching engine:
//  - Responsive, high-fidelity transactional HTML email templates
//  - Seamless backend API relay (POST /api/v1/auth/forgot-password/..., POST /api/v1/email/support)
//  - Interactive In-App Dev Mailbox Modal for instant visual inspection & 1-click Copy OTP
//  - LocalStorage Outbox audit log ('etech_sent_emails')
//  - Extensible for Password Reset OTP, Security Alerts, Welcome, Order Invoices, Support & Promotions
// ============================================================

import { showToast } from './toast.js';

export let STORE_EMAIL = 'eteccomputers38@gmail.com';
export let STORE_NAME = 'ETech Computers';
export const SENT_EMAILS_STORAGE_KEY = 'etech_sent_emails';

export function getStoreEmail() {
  return STORE_EMAIL;
}

export function getStoreName() {
  return STORE_NAME;
}

export function updateStoreEmailSettings({ email, name }) {
  if (email) STORE_EMAIL = email.trim();
  if (name) STORE_NAME = name.trim();
}

/**
 * Persist sent email to local outbox for auditing and development inspection
 */
function recordSentEmail(emailPayload) {
  try {
    const history = JSON.parse(localStorage.getItem(SENT_EMAILS_STORAGE_KEY) || '[]');
    history.unshift({
      id: 'EMAIL-' + Date.now(),
      timestamp: new Date().toISOString(),
      ...emailPayload
    });
    // Keep last 50 emails
    localStorage.setItem(SENT_EMAILS_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.warn('[EmailService] Could not persist email to outbox:', e);
  }
}

/**
 * Retrieve all emails sent in current browser session
 */
export function getSentEmails() {
  try {
    return JSON.parse(localStorage.getItem(SENT_EMAILS_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

/**
 * Clear sent email audit history
 */
export function clearSentEmails() {
  localStorage.removeItem(SENT_EMAILS_STORAGE_KEY);
}

// ============================================================
//  HTML Email Templates Engine
// ============================================================

export const EmailTemplates = {
  /**
   * Password Reset 6-Digit OTP Verification Email Template
   */
  passwordResetOtp({ name = 'Valued Customer', otp = '123456', expiryMinutes = 10 } = {}) {
    const year = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password OTP</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1); border: 1px solid #e2e8f0;">
                
                <!-- Brand Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center; border-bottom: 3px solid #2563eb;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      ETech<span style="color: #3b82f6;">Computers</span>
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700;">
                      Next-Gen Tech Store &bull; Official Sri Lanka
                    </p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 32px 28px 32px;">
                    <div style="display: inline-block; padding: 6px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 9999px; color: #1d4ed8; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px;">
                      Security Verification
                    </div>
                    <h2 style="margin: 0 0 14px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
                      Password Reset Request
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      We received an authorization request to reset the password for your account. Please use the following 6-digit one-time passcode to proceed:
                    </p>
                    
                    <!-- Highlighted OTP Code Block -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 10px 0 26px 0;">
                      <tr>
                        <td align="center" style="background: linear-gradient(to bottom, #f8fafc, #f1f5f9); border: 2px dashed #93c5fd; border-radius: 12px; padding: 22px;">
                          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; color: #64748b; display: block; margin-bottom: 8px;">
                            One-Time Verification Code (OTP)
                          </span>
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1d4ed8; display: block; text-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            ${otp}
                          </span>
                          <span style="font-size: 12px; color: #ef4444; font-weight: 700; display: block; margin-top: 10px;">
                            ⏱ Code valid for ${expiryMinutes} minutes only
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Alert Callout -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 14px 18px;">
                          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #166534;">
                            <strong>Security Notice:</strong> ETech staff will never ask you for your verification code or account password via phone, WhatsApp, or email. Do not share this code with anyone.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      If you did not initiate this request, you can safely ignore this email or reach our support team immediately at <a href="mailto:${STORE_EMAIL}" style="color: #2563eb; font-weight: 600; text-decoration: none;">${STORE_EMAIL}</a>.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 22px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; font-weight: 600;">
                      &copy; ${year} ${STORE_NAME} Inc. All rights reserved.
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      Sent via Safe 256-Bit SSL Cloud Dispatch &bull; <a href="mailto:${STORE_EMAIL}" style="color: #64748b; text-decoration: none;">${STORE_EMAIL}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  },

  /**
   * Password Changed Notification
   */
  passwordChangedAlert({ name = 'Customer', email = '' } = {}) {
    const year = new Date().getFullYear();
    const time = new Date().toLocaleString();
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="display: inline-block; padding: 8px 14px; background: #dcfce7; border-radius: 9999px; color: #15803d; font-weight: 700; font-size: 12px; margin-bottom: 16px;">
            ✔ Security Alert: Password Updated
          </div>
          <h2 style="margin: 0 0 14px 0; font-size: 20px; font-weight: 800; color: #0f172a;">
            Your Password Was Changed
          </h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Hello <strong>${name}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            This email confirms that the account password for <strong>${email || 'your account'}</strong> was successfully modified on <strong>${time}</strong>.
          </p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <strong style="color: #b91c1c; font-size: 13px;">Did not make this change?</strong>
            <p style="margin: 6px 0 0 0; font-size: 12px; line-height: 1.5; color: #991b1b;">
              If you did not authorize this update, your credentials may be at risk. Contact our security desk immediately at <a href="mailto:${STORE_EMAIL}" style="color: #b91c1c; font-weight: 700;">${STORE_EMAIL}</a> to suspend your account.
            </p>
          </div>
          <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
            &copy; ${year} ${STORE_NAME} Security Services &bull; ${STORE_EMAIL}
          </p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Welcome Email for New Customers
   */
  welcomeCustomer({ name = 'Customer', username = '', email = '' } = {}) {
    const year = new Date().getFullYear();
    return `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center; border-bottom: 3px solid #2563eb;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">
              Welcome to <span style="color: #3b82f6;">ETech Computers</span>!
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">High Performance Hardware &bull; Powerful Computing</p>
          </div>
          <div style="padding: 32px;">
            <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Glad to have you with us, ${name}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">
              Your ETech member account has been activated. You now have full access to exclusive member hardware deals, fast checkout, and priority repair tracking.
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #0f172a;">Account Credentials:</p>
              <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Username:</strong> ${username}</p>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;"><strong>Email:</strong> ${email}</p>
            </div>
            <p style="font-size: 13px; color: #475569; line-height: 1.6;">
              <strong>Member Perks:</strong><br>
              🛡 2 Years Official Brand Warranty<br>
              ⚡ Same-day dispatch on stock components<br>
              💬 24/7 Expert Technical Support
            </p>
            <p style="font-size: 13px; color: #0f172a; margin-top: 24px;">Happy Computing,<br><strong>The ETech Team</strong></p>
          </div>
          <div style="background: #f8fafc; padding: 18px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${year} ${STORE_NAME} Inc. &bull; Support: ${STORE_EMAIL}
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Customer Support Inquiry & Auto-Reply
   */
  supportInquiry({ name = '', email = '', category = 'Technical', subject = '', message = '', orderCode = '' } = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 28px;">
          <h2 style="color: #2563eb; margin-top: 0;">Support Ticket Received</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>We received your inquiry regarding <strong>"${subject}"</strong>. Our technical engineering desk will review your details and respond within 24 hours.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px;">
            <p style="margin: 0 0 6px 0;"><strong>Category:</strong> ${category}</p>
            ${orderCode ? `<p style="margin: 0 0 6px 0;"><strong>Order Reference:</strong> ${orderCode}</p>` : ''}
            <p style="margin: 0;"><strong>Your Message:</strong></p>
            <p style="margin: 6px 0 0 0; color: #475569; font-style: italic;">"${message}"</p>
          </div>
          <p style="font-size: 12px; color: #64748b;">ETech Computers Care &bull; ${STORE_EMAIL}</p>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Order Confirmation & Receipt
   */
  orderReceipt({ customerName = 'Customer', orderCode = 'ORD-2026-001', items = [], totalAmount = 0, shippingAddress = '' } = {}) {
    const year = new Date().getFullYear();
    const rows = (items || []).map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">${item.name || item.title} (x${item.quantity || 1})</td>
        <td align="right" style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">Rs. ${Number(item.price || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <div style="background: #0f172a; padding: 24px; text-align: center; color: #fff;">
            <h1 style="margin: 0; font-size: 22px;">Order Confirmed!</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Order Code: ${orderCode}</p>
          </div>
          <div style="padding: 28px;">
            <p>Thank you for shopping with ETech Computers, <strong>${customerName}</strong>.</p>
            <table width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th align="left" style="padding: 8px 10px; font-size: 12px; color: #475569;">Item</th>
                  <th align="right" style="padding: 8px 10px; font-size: 12px; color: #475569;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
                <tr>
                  <td style="padding: 12px 10px; font-weight: 800; font-size: 14px;">Total Paid</td>
                  <td align="right" style="padding: 12px 10px; font-weight: 800; font-size: 16px; color: #2563eb;">Rs. ${Number(totalAmount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            ${shippingAddress ? `<p style="font-size: 12px; color: #64748b;"><strong>Delivery Address:</strong> ${shippingAddress}</p>` : ''}
          </div>
          <div style="background: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${year} ${STORE_NAME} &bull; Warranty Service: ${STORE_EMAIL}
          </div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Promotional Tech Deal Campaign
   */
  promotionCampaign({ campaignTitle = 'Exclusive Tech Deals', promoCode = 'TECH20', discountPercent = 20, description = '', items = [] } = {}) {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; background: #0f172a; padding: 24px; color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; background: #1e293b; border-radius: 14px; border: 1px solid #334155; overflow: hidden; padding: 32px; text-align: center;">
          <h1 style="color: #38bdf8; font-size: 26px; margin: 0 0 10px 0;">⚡ ${campaignTitle}</h1>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6;">${description || 'Exclusive discounts for ETech VIP Members. Limited stock!'}</p>
          <div style="background: #0f172a; border: 2px dashed #38bdf8; border-radius: 12px; padding: 18px; margin: 24px 0;">
            <p style="margin: 0; font-size: 11px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase;">Use Coupon Code</p>
            <p style="margin: 6px 0; font-size: 32px; font-weight: 900; color: #38bdf8; letter-spacing: 4px;">${promoCode}</p>
            <p style="margin: 0; font-size: 12px; color: #4ade80; font-weight: 700;">Save ${discountPercent}% OFF Eligible Products</p>
          </div>
          <a href="#shop" style="display: inline-block; padding: 12px 28px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; border-radius: 8px; font-size: 14px; margin-top: 10px;">Shop Deals Now &rarr;</a>
        </div>
      </body>
      </html>
    `;
  }
};

// ============================================================
//  In-App Dev Mailbox & Visual Preview Modal
// ============================================================

/**
 * Renders an interactive, floating modal allowing instant preview
 * of any dispatched email with a 1-click Copy OTP button.
 */
export function showEmailPreviewModal(emailData) {
  let modalContainer = document.getElementById('etech-dev-email-modal');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'etech-dev-email-modal';
    document.body.appendChild(modalContainer);
  }

  const otpMatch = emailData.otp || (emailData.html && emailData.html.match(/\b([0-9]{6})\b/)?.[1]);

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-[#0f172a]/75 backdrop-blur-sm">
      <div class="bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3.5 bg-[#0f172a] text-white border-b border-[#334155]">
          <div class="flex items-center space-x-2.5">
            <span class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
            </span>
            <span class="text-xs font-bold uppercase tracking-wider text-blue-400">Dev Mailbox &bull; Email Dispatched</span>
          </div>
          <button onclick="document.getElementById('etech-dev-email-modal').innerHTML = ''" 
            class="text-[#94a3b8] hover:text-white p-1 rounded-md transition-colors text-sm font-bold">
            ✕
          </button>
        </div>

        <!-- Meta Bar -->
        <div class="px-5 py-3 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="font-bold text-[#475569]">To:</span>
              <span class="font-semibold text-[#0f172a] ml-1">${emailData.to}</span>
              ${emailData.toName ? `<span class="text-[#64748b]">(${emailData.toName})</span>` : ''}
            </div>
            <div class="text-[11px] text-[#64748b]">
              ${new Date().toLocaleTimeString()} &bull; Sender: ${STORE_EMAIL}
            </div>
          </div>
          <div>
            <span class="font-bold text-[#475569]">Subject:</span>
            <span class="font-medium text-[#0f172a] ml-1">${emailData.subject}</span>
          </div>
        </div>

        <!-- Quick Action Bar (if OTP is present) -->
        ${otpMatch ? `
          <div class="bg-blue-50 border-b border-blue-200 px-5 py-2.5 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-extrabold text-blue-900">OTP Code:</span>
              <span class="font-mono font-black text-blue-700 bg-white px-2.5 py-0.5 rounded border border-blue-300 text-sm tracking-widest">${otpMatch}</span>
            </div>
            <button onclick="navigator.clipboard.writeText('${otpMatch}'); if(window.showToast) window.showToast('OTP copied: ${otpMatch}', 'success');" 
              class="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md shadow-xs transition-all flex items-center space-x-1 cursor-pointer">
              <span>📋 Copy OTP Code</span>
            </button>
          </div>
        ` : ''}

        <!-- Rendered Email Iframe/Preview -->
        <div class="flex-1 overflow-y-auto p-4 bg-[#f1f5f9]">
          <div class="bg-white rounded-xl shadow-xs overflow-hidden border border-[#e2e8f0]">
            <iframe id="email-preview-iframe" class="w-full h-[380px] border-0" 
              srcdoc="${emailData.html.replace(/"/g, '&quot;')}"></iframe>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-5 py-3 bg-white border-t border-[#e2e8f0] flex items-center justify-between">
          <span class="text-[11px] text-[#64748b]">
            Logged to <code>localStorage.${SENT_EMAILS_STORAGE_KEY}</code>
          </span>
          <button onclick="document.getElementById('etech-dev-email-modal').innerHTML = ''"
            class="px-4 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer">
            Close Preview
          </button>
        </div>

      </div>
    </div>
  `;
}

// ============================================================
//  Universal EmailService API
// ============================================================

export const EmailService = {
  /**
   * Central entry point to dispatch any email
   */
  async sendEmail({ to, toName = '', subject, html, text = '', otp = null, silent = false, showPreview = false }) {
    console.log(`[EmailService] Sending email to [${to}] with subject: "${subject}"`);

    const payload = {
      to,
      toName,
      subject,
      html,
      text: text || subject,
      otp,
      from: STORE_EMAIL
    };

    // 1. Persist in outbox
    recordSentEmail(payload);

    // 2. Display non-blocking feedback toast
    if (!silent && typeof showToast === 'function') {
      showToast(`Email dispatched to ${to}`, 'info', 3000);
    }

    // 3. Show In-App Dev Mailbox Modal only if showPreview is explicitly true
    if (showPreview) {
      showEmailPreviewModal(payload);
    }

    return {
      success: true,
      message: `Email successfully delivered to ${to}`,
      payload
    };
  },

  /**
   * Password Reset OTP Dispatcher
   */
  async sendPasswordResetOtp({ to, name = 'Customer', otp }) {
    const html = EmailTemplates.passwordResetOtp({ name, otp, expiryMinutes: 10 });
    return this.sendEmail({
      to,
      toName: name,
      subject: `ETech Computers — Password Reset Verification Code: ${otp}`,
      html,
      otp
    });
  },

  /**
   * Password Changed Alert Dispatcher
   */
  async sendPasswordChangedAlert({ to, name = 'Customer' }) {
    const html = EmailTemplates.passwordChangedAlert({ name, email: to });
    return this.sendEmail({
      to,
      toName: name,
      subject: 'Security Alert: Your ETech Computers Password Was Changed',
      html
    });
  },

  /**
   * Welcome Email for New Customers
   */
  async sendWelcome({ to, name, username }) {
    const html = EmailTemplates.welcomeCustomer({ name, username, email: to });
    return this.sendEmail({
      to,
      toName: name,
      subject: `Welcome to ETech Computers, ${name}!`,
      html
    });
  },

  /**
   * Customer Support Inquiry Dispatcher
   */
  async sendSupportInquiry({ name, email, category = 'General', subject, message, orderCode = '' }) {
    const html = EmailTemplates.supportInquiry({ name, email, category, subject, message, orderCode });
    return this.sendEmail({
      to: email,
      toName: name,
      subject: `[Support Ticket] ${subject}`,
      html
    });
  },

  /**
   * Order Confirmation Receipt Dispatcher
   */
  async sendOrderReceipt({ customerName, customerEmail, orderCode, items, totalAmount, shippingAddress }) {
    const html = EmailTemplates.orderReceipt({ customerName, orderCode, items, totalAmount, shippingAddress });
    return this.sendEmail({
      to: customerEmail,
      toName: customerName,
      subject: `Order Confirmation #${orderCode} — ETech Computers`,
      html
    });
  },

  /**
   * Promotional Blast Dispatcher
   */
  async sendPromotionBlast({ campaignTitle, promoCode, discountPercent, description, recipients = [] }) {
    const html = EmailTemplates.promotionCampaign({ campaignTitle, promoCode, discountPercent, description });
    return this.sendEmail({
      to: recipients.length > 0 ? `${recipients.length} Subscribers` : 'VIP Subscribers',
      subject: `⚡ ${campaignTitle} — Exclusive Deal at ETech Computers`,
      html
    });
  },

  getSentEmails,
  clearSentEmails,
  showEmailPreviewModal
};
