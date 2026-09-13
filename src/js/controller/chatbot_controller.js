/**
 * ============================================================
 *  E-T AI CHATBOT ENGINE
 * ============================================================
 *  Powered by Gemini 2.0 Flash. Every message goes to Gemini.
 *  No hardcoded if/else intent matching — pure AI responses.
 *
 *  UI lives in index.html (static Tailwind HTML).
 *  This file handles: state, API calls, message rendering,
 *  event binding, and session persistence.
 *
 *  Dependencies:
 *    - js/et-training.js  (must load first — contains ET_CONFIG)
 *    - js/data.js         (product catalog — global `products`)
 * ============================================================
 */
(function () {
  "use strict";

  // ── State ─────────────────────────────────────────────────
  const state = {
    isOpen: false,
    isProcessing: false,
    history: [],        // { role: 'user'|'model', text: string }
    hasUnread: false
  };

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

  // ── Gather Live Context for Gemini ────────────────────────
  function buildContext() {
    const productData = (typeof products !== "undefined" && Array.isArray(products)) ? products : [];

    let cartData = [];
    if (typeof getCart === "function") {
      cartData = getCart();
    } else {
      try { cartData = JSON.parse(localStorage.getItem("etech_cart") || "[]"); } catch (e) { }
    }

    const hash = window.location.hash || "#home";
    return { productData, cartData, currentPage: hash };
  }

  // ── Configuration Access Helper ───────────────────────────
  function getCfg() {
    if (typeof window !== "undefined" && window.ET_CONFIG) {
      return window.ET_CONFIG;
    }
    if (typeof ET_CONFIG !== "undefined") {
      return ET_CONFIG;
    }
    return {
      API_KEY: "",
      MODEL: "gemini-3.1-flash-lite",
      BOT_NAME: "E-T",
      BOT_TAGLINE: "ETech AI Assistant",
      WELCOME_MESSAGE: "Hey there! ❤ I'm **E-T**, your ETech Computers assistant.\n\nI can help you find the perfect hardware, check your cart, answer questions about our store, or give you tech advice.\n\nWhat are you looking for today?",
      QUICK_SUGGESTIONS: [
        "🎮 Gaming Laptops",
        "🖥️ Best Monitors",
        "⚡ PC Build Help",
        "🛒 View My Cart",
        "🛡️ Warranty Info",
        "📦 Shipping Policy"
      ],
      SYSTEM_PROMPT: "You are E-T, the friendly and knowledgeable AI assistant for ETech Computers."
    };
  }

  // ── Single-Mode AI Chatbot Service Call ───────────────────
  async function callChatService(userMessage) {
    const formattedHistory = state.history.slice(-8).map(h => ({
      role: h.role === "user" ? "USER" : "BOT",
      content: h.text,
      timestamp: new Date().toISOString()
    }));

    const endpoint = (window.ET_API_BASE_URL || 'http://localhost:8080/api/v1') + '/chat/message';

    let resData = null;
    if (window.ChatApi && typeof window.ChatApi.sendMessage === 'function') {
      resData = await window.ChatApi.sendMessage({ message: userMessage, history: formattedHistory });
    } else {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, history: formattedHistory })
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
        actions.push({ type: "ADD_TO_CART", productId: parseInt(match[4]) });
      } else if (match[5]) {
        actions.push({ type: "SHOW_PRODUCT", productId: parseInt(match[6]) });
      }
    }

    cleanText = cleanText.replace(/\[ACTION:[^\]]+\]/g, "").trim();

    for (const action of actions) {
      switch (action.type) {
        case "NAVIGATE":
          setTimeout(() => {
            const target = action.target;
            if (target.includes(".html")) {
              window.location.href = getPathPrefix() + target;
            } else {
              window.location.hash = target.startsWith("#") ? target : "#" + target;
            }
          }, 800);
          break;
        case "ADD_TO_CART":
          if (typeof addToCart === "function") {
            addToCart(action.productId);
          }
          break;
      }
    }

    return { cleanText, actions };
  }

  // ── Product Card Renderer (Tailwind) ──────────────────────
  function renderProductCard(productId) {
    const productList = (typeof products !== "undefined") ? products : [];
    const p = productList.find(item => item.id === productId);
    if (!p) return "";

    const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

    return `
      <div class="flex items-center gap-2.5 p-2 bg-white border border-[#e2e8f0] rounded-xl transition-all hover:border-[#cbd5e1] shadow-sm">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" class="w-12 h-12 rounded-[10px] object-cover flex-shrink-0 bg-[#f8fafc] border border-[#e2e8f0]" onerror="this.style.display='none'">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[9px] font-bold uppercase tracking-wider text-blue-600 font-mono">${escapeHtml(p.category)}</span>
            ${p.badge ? `<span class="text-[8px] font-bold px-1.5 rounded bg-blue-50 text-blue-700 border border-blue-200">${escapeHtml(p.badge)}</span>` : ""}
          </div>
          <h4 class="text-xs font-bold text-[#0f172a] truncate my-0.5">${escapeHtml(p.name)}</h4>
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-extrabold text-[#0f172a] font-mono">Rs. ${p.price}</span>
            ${p.originalPrice ? `<span class="text-[11px] text-[#94a3b8] line-through font-mono">Rs. ${p.originalPrice}</span>` : ""}
            ${discount > 0 ? `<span class="text-[10px] font-bold text-emerald-600">-${discount}%</span>` : ""}
          </div>
        </div>
        <button onclick="if(typeof addToCart==='function'){addToCart(${p.id});this.innerHTML='✓ Added';this.classList.add('!bg-emerald-600','pointer-events-none')}" class="px-2.5 py-1.5 rounded-[10px] bg-blue-600 border-none text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 flex-shrink-0 transition-all hover:bg-blue-500 active:scale-95 shadow-sm" style="font-family: inherit;">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add
        </button>
      </div>
    `;
  }

  // ── Chat Message Renderers (Tailwind) ─────────────────────
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
    if (!trimmed || state.isProcessing) return;

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
      if (window.etechAlert) {
        window.etechAlert.error('Service Unavailable', 'Unable to connect to the chat assistant. Please try again later.');
      }
      appendBotBubble("⚠️ **Service Unavailable**: Unable to connect to the chat assistant. Please check your connection and try again.");
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

    if (state.isOpen) {
      panel.classList.remove("et-panel-hidden");
      panel.classList.add("et-panel-visible");
      fab.classList.add("et-fab-active");
      if (badge) badge.classList.add("hidden");
      state.hasUnread = false;
      setTimeout(() => document.getElementById("et-input")?.focus(), 300);
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
    appendBotBubble(cfg.WELCOME_MESSAGE);
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
  }

  // ── Init ──────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }

})();
