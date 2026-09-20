/**
 * ============================================================
 *  E-T AI CHATBOT ENGINE
 * ============================================================
 *  Powered by Google Gemini via secure Spring Boot backend proxy.
 *  No API keys are exposed to the client.
 *
 *  Handles:
 *    - Availability check (online vs. offline)
 *    - Strict offline message without fallback (email: eteccomputers38@gmail.com)
 *    - Proactive site entry greeting teaser
 *    - Interactive product cards & action tags
 *    - Multi-turn conversation history
 * ============================================================
 */
(function () {
  "use strict";

  // ── State ─────────────────────────────────────────────────
  const state = {
    isOpen: false,
    isProcessing: false,
    isAvailable: true,
    history: [],        // { role: 'user'|'model', text: string }
    hasUnread: false
  };

  const OFFLINE_NOTICE = "⚠️ **E-T Chatbot is currently unavailable.**\n\nPlease get support through email: eteccomputers38@gmail.com";

  // ── SVG Icon (reused in bot bubbles + typing) ─────────────
  const BOT_SVG = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47-2.47m0 0L19 9.56m-2.47 2.47H14.25m-8.5 2.47L3 14.5m2.75 0L3 11.53m2.75 2.97H8.25"/></svg>`;

  // ── Helpers ───────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function timeStr() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function getPathPrefix() {
    return window.location.pathname.includes("/src/pages/") ? "../../" : "";
  }

  /** Simple markdown → HTML (bold, italic, bullets, line breaks) */
  function renderMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#0f172a] font-bold">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/^[\-•]\s+(.+)$/gm, '<div class="flex items-start space-x-2 my-0.5"><span class="text-blue-600 mt-0.5 flex-shrink-0">•</span><span>$1</span></div>');
    html = html.replace(/\n{2,}/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  // ── Configuration Access Helper ───────────────────────────
  function getCfg() {
    if (typeof window !== "undefined" && window.ET_CONFIG) {
      return window.ET_CONFIG;
    }
    return {
      MODEL: "gemini-3.1-flash-lite",
      BOT_NAME: "E-T Assistant",
      BOT_TAGLINE: "AI Hardware Specialist",
      OFFLINE_MESSAGE: OFFLINE_NOTICE,
      WELCOME_MESSAGE: "Hey there! 👋 I'm **E-T**, your ETech AI Hardware Specialist.\n\nI can help you find high-performance gaming laptops, PC components, OLED monitors, check stock at our hubs, or give you tech advice.\n\nWhat are you building or looking for today?",
      QUICK_SUGGESTIONS: [
        "🎮 Gaming Laptops",
        "🖥️ Best Monitors",
        "⚡ PC Build Help",
        "🛒 View My Cart",
        "🛡️ Warranty Info",
        "📦 Shipping Policy"
      ]
    };
  }

  // ── Backend AI Chatbot Service Call ───────────────────────
  async function callChatService(userMessage) {
    const formattedHistory = state.history.slice(-8).map(h => ({
      sender: h.role === "user" ? "user" : "model",
      text: h.text
    }));

    let cartData = [];
    try {
      cartData = JSON.parse(localStorage.getItem("etech_cart") || "[]");
    } catch (e) {}

    const endpoint = (window.ET_API_BASE_URL || 'http://localhost:8080/api/v1') + '/chat/message';

    let resData = null;
    if (window.ChatApi && typeof window.ChatApi.sendMessage === 'function') {
      resData = await window.ChatApi.sendMessage({ message: userMessage, history: formattedHistory, cart: cartData });
    } else {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: formattedHistory, cart: cartData })
      });
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const json = await response.json();
      resData = json.body || json.data || json;
    }

    if (!resData || !resData.reply) {
      throw new Error("Invalid response from AI chatbot server.");
    }

    let finalReply = resData.reply;
    if (Array.isArray(resData.suggestedProducts) && resData.suggestedProducts.length > 0) {
      const productActions = resData.suggestedProducts.map(id => `[ACTION:SHOW_PRODUCT:${id}]`).join("\n");
      finalReply += `\n\n${productActions}`;
    }
    return finalReply;
  }

  // ── Action Parser ─────────────────────────────────────────
  function parseAndExecuteActions(rawText) {
    let cleanText = rawText;
    const actions = [];

    const actionRegex = /\[ACTION:(NAVIGATE[#:]([^\]]+))\]|\[ACTION:(ADD_TO_CART):(\d+)\]|\[ACTION:(SHOW_PRODUCT):(\d+)\]/g;
    let match;

    while ((match = actionRegex.exec(rawText)) !== null) {
      if (match[1]) {
        actions.push({ type: "NAVIGATE", target: match[2] });
      } else if (match[3]) {
        actions.push({ type: "ADD_TO_CART", productId: parseInt(match[4], 10) });
      } else if (match[5]) {
        actions.push({ type: "SHOW_PRODUCT", productId: parseInt(match[6], 10) });
      }
    }

    cleanText = cleanText.replace(/\[ACTION:[^\]]+\]/g, "").trim();

    for (const action of actions) {
      switch (action.type) {
        case "NAVIGATE":
          setTimeout(() => {
            const rawTarget = action.target || "";
            let target = rawTarget.trim();

            const cleanTarget = target.replace(/^[#/]+/, "");
            const routeName = cleanTarget.split("?")[0].toLowerCase();

            // Customer protected routes that require login
            const customerRoutes = ["account", "orders", "order-details", "order-tracking", "checkout"];

            const isUserLoggedIn = (typeof window.isLoggedIn === "function" && window.isLoggedIn()) ||
                                   !!localStorage.getItem("etech_jwt_token");

            if (customerRoutes.includes(routeName) && !isUserLoggedIn) {
              if (window.etechAlert && typeof window.etechAlert.info === "function") {
                window.etechAlert.info("Login Required", "Please log in to your account to view your orders and account details.");
              }
              window.location.hash = `#login?redirect=${encodeURIComponent(cleanTarget)}`;
              return;
            }

            if (["admin", "administrator"].includes(routeName)) {
              let user = null;
              if (typeof window.getCurrentUser === "function") {
                user = window.getCurrentUser();
              } else {
                try { user = JSON.parse(localStorage.getItem("etech_current_user") || "null"); } catch(e) {}
              }
              const isAdminOrStaff = user && (user.role === "ADMIN" || user.role === "STAFF" ||
                                              (typeof user.isAdmin === "function" && user.isAdmin()) ||
                                              (typeof user.isStaff === "function" && user.isStaff()));
              if (!isAdminOrStaff) {
                if (window.etechAlert && typeof window.etechAlert.error === "function") {
                  window.etechAlert.error("Access Denied", "Administrative privileges are required to view the Admin Console.");
                }
                window.location.hash = "#login?redirect=admin";
                return;
              }
            }

            if (target.includes(".html")) {
              window.location.href = getPathPrefix() + target;
            } else {
              window.location.hash = target.startsWith("#") ? target : "#" + target;
            }
          }, 800);
          break;

        case "ADD_TO_CART":
          if (typeof window.addToCart === "function") {
            window.addToCart(action.productId);
          }
          break;
      }
    }

    return { cleanText, actions };
  }

  // ── Product Card Renderer ─────────────────────────────────
  function renderProductCard(productId) {
    const productList = (typeof window.products !== "undefined" && Array.isArray(window.products))
      ? window.products
      : ((typeof products !== "undefined" && Array.isArray(products)) ? products : []);

    const p = productList.find(item => Number(item.id) === Number(productId));
    if (!p) return "";

    const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

    return `
      <div class="flex items-center gap-2.5 p-2 bg-white border border-[#e2e8f0] rounded-xl transition-all hover:border-[#cbd5e1] shadow-sm">
        <img src="${p.image || ''}" alt="${escapeHtml(p.name)}" class="w-12 h-12 rounded-[10px] object-cover flex-shrink-0 bg-[#f8fafc] border border-[#e2e8f0]" onerror="this.style.display='none'">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold uppercase tracking-wider text-blue-600 font-mono">${escapeHtml(p.category || 'Hardware')}</span>
            ${p.badge ? `<span class="text-[8px] font-bold px-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200">${escapeHtml(p.badge)}</span>` : ""}
          </div>
          <h4 class="text-xs font-bold text-[#0f172a] truncate my-0.5">${escapeHtml(p.name)}</h4>
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-extrabold text-[#0f172a] font-mono">Rs. ${Number(p.price || 0).toLocaleString()}</span>
            ${p.originalPrice ? `<span class="text-[11px] text-[#94a3b8] line-through font-mono">Rs. ${Number(p.originalPrice).toLocaleString()}</span>` : ""}
            ${discount > 0 ? `<span class="text-[10px] font-bold text-emerald-600">-${discount}%</span>` : ""}
          </div>
        </div>
        <button onclick="if(typeof window.addToCart==='function'){window.addToCart(${p.id});this.innerHTML='✓ Added';this.classList.add('!bg-emerald-600','pointer-events-none')}" class="px-2.5 py-1.5 rounded-[10px] bg-blue-600 border-none text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 flex-shrink-0 transition-all hover:bg-blue-500 active:scale-95 shadow-sm" style="font-family: inherit;">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add
        </button>
      </div>
    `;
  }

  // ── Chat Message Renderers ────────────────────────────────
  function appendUserBubble(text) {
    const list = document.getElementById("et-messages");
    if (!list) return;

    const div = document.createElement("div");
    div.className = "flex gap-2 justify-end";
    div.innerHTML = `
      <div class="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-blue-600 text-white text-[13px] leading-relaxed break-words shadow-sm">
        <p>${escapeHtml(text)}</p>
        <span class="block text-[9px] text-blue-100 mt-1 text-right font-mono">${timeStr()}</span>
      </div>
    `;
    list.appendChild(div);
    scrollChat();
  }

  function appendBotBubble(rawText) {
    const list = document.getElementById("et-messages");
    if (!list) return;

    const { cleanText, actions } = parseAndExecuteActions(rawText);
    let html = renderMarkdown(cleanText);

    const productCards = actions
      .filter(a => a.type === "SHOW_PRODUCT")
      .map(a => renderProductCard(a.productId))
      .filter(Boolean)
      .join("");

    if (productCards) {
      html += `<div class="flex flex-col gap-2 mt-2.5">${productCards}</div>`;
    }

    const navButtons = actions
      .filter(a => a.type === "NAVIGATE")
      .map(a => {
        const cleanTarget = (a.target || "").replace(/^[#/]+/, "");
        let label = "View Page";
        let icon = `<svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>`;

        if (cleanTarget.startsWith("login")) {
          label = "🔑 Log In to Your Account";
        } else if (cleanTarget.startsWith("order")) {
          label = "📦 Track / View Order Details";
        } else if (cleanTarget.startsWith("account")) {
          label = "👤 Open My Account";
        } else if (cleanTarget.startsWith("cart")) {
          label = "🛒 View Shopping Cart";
        } else if (cleanTarget.startsWith("checkout")) {
          label = "💳 Proceed to Checkout";
        } else if (cleanTarget.startsWith("shop")) {
          label = "🛍️ Explore Shop Catalog";
        }

        const href = cleanTarget.includes(".html") ? cleanTarget : "#" + cleanTarget;
        return `
          <a href="${href}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm no-underline w-fit">
            <span>${escapeHtml(label)}</span>
            ${icon}
          </a>
        `;
      })
      .join("");

    if (navButtons) {
      html += `<div class="flex flex-wrap gap-2 mt-2.5">${navButtons}</div>`;
    }

    const div = document.createElement("div");
    div.className = "flex gap-2 justify-start items-start";
    div.innerHTML = `
      <div class="w-[30px] h-[30px] rounded-[10px] bg-blue-600 flex items-center justify-center flex-shrink-0 text-white mt-0.5 shadow-sm">
        ${BOT_SVG}
      </div>
      <div class="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-[#e2e8f0] text-[#0f172a] text-[13px] leading-relaxed break-words shadow-sm">
        <div>${html}</div>
        <span class="block text-[9px] text-[#64748b] mt-1 text-right font-mono">${timeStr()}</span>
      </div>
    `;
    list.appendChild(div);
    scrollChat();
  }

  function showTyping() {
    const list = document.getElementById("et-messages");
    if (!list) return;

    const div = document.createElement("div");
    div.id = "et-typing";
    div.className = "flex gap-2 justify-start items-start";
    div.innerHTML = `
      <div class="w-[30px] h-[30px] rounded-[10px] bg-blue-600 flex items-center justify-center flex-shrink-0 text-white mt-0.5 shadow-sm">
        ${BOT_SVG}
      </div>
      <div class="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-[#e2e8f0] shadow-sm">
        <div class="flex gap-1 py-1">
          <span class="w-[7px] h-[7px] bg-blue-600 rounded-full" style="animation: et-dot 1.4s infinite ease-in-out"></span>
          <span class="w-[7px] h-[7px] bg-blue-600 rounded-full" style="animation: et-dot 1.4s infinite ease-in-out 0.2s"></span>
          <span class="w-[7px] h-[7px] bg-blue-600 rounded-full" style="animation: et-dot 1.4s infinite ease-in-out 0.4s"></span>
        </div>
      </div>
    `;
    list.appendChild(div);
    scrollChat();
  }

  function hideTyping() {
    const el = document.getElementById("et-typing");
    if (el) el.remove();
  }

  function scrollChat() {
    const list = document.getElementById("et-messages");
    if (list) setTimeout(() => list.scrollTop = list.scrollHeight, 50);
  }

  // ── Core Send Handler ─────────────────────────────────────
  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || state.isProcessing || !state.isAvailable) return;

    state.isProcessing = true;
    appendUserBubble(trimmed);
    state.history.push({ role: "user", text: trimmed });
    saveSession();

    const input = document.getElementById("et-input");
    if (input) input.value = "";

    showTyping();

    try {
      const reply = await callChatService(trimmed);
      hideTyping();
      appendBotBubble(reply);

      const { cleanText } = parseAndExecuteActions(reply);
      state.history.push({ role: "model", text: cleanText });
      saveSession();
    } catch (err) {
      hideTyping();
      console.error("[Chatbot] Backend chat error:", err);
      // Strict requirement: No mock fallback, simply inform user chatbot is currently unavailable
      appendBotBubble(OFFLINE_NOTICE);
    }

    state.isProcessing = false;
  }

  // ── Session Persistence ───────────────────────────────────
  function saveSession() {
    try { sessionStorage.setItem("et_history", JSON.stringify(state.history.slice(-20))); } catch (e) { }
  }

  function loadSession() {
    try {
      const saved = sessionStorage.getItem("et_history");
      if (saved) {
        state.history = JSON.parse(saved);
        for (const msg of state.history) {
          if (msg.role === "user") appendUserBubble(msg.text);
          else appendBotBubble(msg.text);
        }
        return true;
      }
    } catch (e) { }
    return false;
  }

  // ── Toggle Chat Window ────────────────────────────────────
  function toggleChat() {
    state.isOpen = !state.isOpen;
    const panel = document.getElementById("et-panel");
    const fab = document.getElementById("et-fab");
    const badge = document.getElementById("et-unread");
    const teaser = document.getElementById("et-teaser");

    // Hide proactive teaser whenever user interacts with chat
    if (teaser) {
      teaser.classList.add("hidden");
    }

    if (state.isOpen) {
      panel.classList.remove("et-panel-hidden");
      panel.classList.add("et-panel-visible");
      fab.classList.add("et-fab-active");
      if (badge) badge.classList.add("hidden");
      state.hasUnread = false;
      if (state.isAvailable) {
        setTimeout(() => document.getElementById("et-input")?.focus(), 300);
      }
    } else {
      panel.classList.add("et-panel-hidden");
      panel.classList.remove("et-panel-visible");
      fab.classList.remove("et-fab-active");
    }
  }

  // ── Clear Chat History ────────────────────────────────────
  function clearChat() {
    state.history = [];
    try { sessionStorage.removeItem("et_history"); } catch (e) { }
    const list = document.getElementById("et-messages");
    if (list) list.innerHTML = "";
    const cfg = getCfg();
    if (state.isAvailable) {
      appendBotBubble(cfg.WELCOME_MESSAGE);
    } else {
      appendBotBubble(OFFLINE_NOTICE);
    }
  }

  // ── Proactive Site-Entry Teaser Greeting ──────────────────
  function setupProactiveTeaser() {
    const teaser = document.getElementById("et-teaser");
    if (!teaser) return;

    // Check if dismissed previously in this session
    const isDismissed = sessionStorage.getItem("et_teaser_dismissed") === "true";
    if (isDismissed || !state.isAvailable) return;

    // Show teaser after 2.5 seconds
    setTimeout(() => {
      if (!state.isOpen && !state.hasUnread) {
        teaser.classList.remove("hidden");
        setTimeout(() => {
          teaser.classList.remove("opacity-0", "translate-y-2");
        }, 50);
      }
    }, 2500);

    // Click teaser to open chat
    document.getElementById("et-teaser-content")?.addEventListener("click", () => {
      teaser.classList.add("hidden");
      sessionStorage.setItem("et_teaser_dismissed", "true");
      if (!state.isOpen) toggleChat();
    });

    // Close button dismisses teaser for session
    document.getElementById("et-teaser-close")?.addEventListener("click", (e) => {
      e.stopPropagation();
      teaser.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => teaser.classList.add("hidden"), 300);
      sessionStorage.setItem("et_teaser_dismissed", "true");
    });
  }

  // ── Service Status Check ──────────────────────────────────
  async function checkAvailability() {
    const statusDot = document.getElementById("et-status-dot");
    const taglineEl = document.getElementById("et-bot-tagline");
    const input = document.getElementById("et-input");
    const sendBtn = document.getElementById("et-send");
    const suggestionsEl = document.getElementById("et-suggestions");

    try {
      let statusRes = null;
      if (window.ChatApi && typeof window.ChatApi.getStatus === "function") {
        statusRes = await window.ChatApi.getStatus();
      } else {
        const endpoint = (window.ET_API_BASE_URL || 'http://localhost:8080/api/v1') + '/chat/status';
        const res = await fetch(endpoint);
        const json = await res.json();
        statusRes = json.body || json;
      }

      state.isAvailable = !!(statusRes && statusRes.available);

    } catch (e) {
      console.warn("[Chatbot] Status check failed:", e);
      state.isAvailable = false;
    }

    if (!state.isAvailable) {
      // Configure UI for Offline State
      if (statusDot) {
        statusDot.classList.remove("bg-emerald-400");
        statusDot.classList.add("bg-slate-400");
      }
      if (taglineEl) {
        taglineEl.textContent = "Offline";
      }
      if (input) {
        input.disabled = true;
        input.placeholder = "Chatbot currently unavailable...";
        input.classList.add("opacity-60", "cursor-not-allowed");
      }
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.classList.add("opacity-40", "cursor-not-allowed");
      }
      if (suggestionsEl) {
        suggestionsEl.style.display = "none";
      }

      // If no history exists, inform user immediately
      const list = document.getElementById("et-messages");
      if (list && list.children.length === 0) {
        appendBotBubble(OFFLINE_NOTICE);
      }
    } else {
      // Online State
      if (statusDot) {
        statusDot.classList.remove("bg-slate-400");
        statusDot.classList.add("bg-emerald-400");
      }
      if (taglineEl) {
        taglineEl.textContent = getCfg().BOT_TAGLINE;
      }
      if (input) {
        input.disabled = false;
        input.placeholder = "Ask E-T anything...";
        input.classList.remove("opacity-60", "cursor-not-allowed");
      }
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.classList.remove("opacity-40", "cursor-not-allowed");
      }
      if (suggestionsEl) {
        suggestionsEl.style.display = "";
      }

      // Proactive site greeting
      setupProactiveTeaser();
    }
  }

  // ── Initialize: Bind to Existing DOM ──────────────────────
  function initUI() {
    const cfg = getCfg();
    const wrapper = document.getElementById("et-chatbot");
    if (!wrapper) return;

    // Fill dynamic content from ET_CONFIG
    const nameEl = document.getElementById("et-bot-name");
    const taglineEl = document.getElementById("et-bot-tagline");
    if (nameEl) nameEl.textContent = cfg.BOT_NAME;
    if (taglineEl) taglineEl.textContent = cfg.BOT_TAGLINE;

    // Render quick suggestion chips
    const suggestionsEl = document.getElementById("et-suggestions");
    if (suggestionsEl && cfg.QUICK_SUGGESTIONS) {
      suggestionsEl.innerHTML = cfg.QUICK_SUGGESTIONS.map(s =>
        `<button class="px-2.5 py-1 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[#475569] text-[11px] font-medium cursor-pointer transition-all whitespace-nowrap hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 shadow-sm" onclick="document.getElementById('et-chatbot').__send('${s.replace(/'/g, "\\'")}')">${s}</button>`
      ).join("");
    }

    // Wire up public methods on the DOM node
    wrapper.__toggle = toggleChat;
    wrapper.__clearChat = clearChat;
    wrapper.__send = (text) => handleSend(text);
    wrapper.__sendInput = () => {
      const input = document.getElementById("et-input");
      if (input && input.value.trim()) handleSend(input.value);
    };

    // Bind event listeners
    document.getElementById("et-fab")?.addEventListener("click", toggleChat);
    document.getElementById("et-clear-btn")?.addEventListener("click", clearChat);
    document.getElementById("et-minimize-btn")?.addEventListener("click", toggleChat);
    document.getElementById("et-send")?.addEventListener("click", () => wrapper.__sendInput());
    document.getElementById("et-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        wrapper.__sendInput();
      }
    });

    // Load session or show welcome
    if (!loadSession()) {
      appendBotBubble(cfg.WELCOME_MESSAGE);
    }

    // Check backend status & configure online/offline state
    checkAvailability();
  }

  // ── Init ──────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }

})();
