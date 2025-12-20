function k(e) {
  if (!e) {
    const t = document.createElement("div");
    return document.body.appendChild(t), t;
  }
  if (e instanceof HTMLElement)
    return e;
  const o = document.querySelector(e);
  if (!o) {
    const t = document.createElement("div");
    return document.body.appendChild(t), t;
  }
  return o;
}
function L(e, o) {
  const t = e.endsWith("/") ? e.slice(0, -1) : e, n = o.startsWith("/") ? o : `/${o}`;
  return `${t}${n}`;
}
function T(e = "msg") {
  return typeof crypto < "u" && typeof crypto.randomUUID == "function" ? crypto.randomUUID() : `${e}-${Math.random().toString(36).slice(2, 11)}`;
}
function z(e) {
  return {
    id: e.id,
    role: e.role,
    content: e.content,
    createdAt: new Date(e.createdAt)
  };
}
function B(e, o) {
  if (!e) return o;
  const t = e.toLowerCase();
  return t === "en" || t === "es" || t === "fr" ? t : o;
}
function R(e) {
  async function o(t) {
    const n = L(e.apiBaseUrl, "/api/chat"), r = await fetch(n, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...e.headers
      },
      body: JSON.stringify({
        hotelId: e.hotelId,
        conversationId: e.conversationId,
        guestId: e.guestId,
        message: t,
        permissions: e.permissions
      })
    });
    if (!r.ok) {
      const a = await r.text();
      throw new Error(`Chat request failed: ${r.status} ${a}`);
    }
    const l = await r.json();
    return e.conversationId = l.conversationId, { messages: l.messages.map(z), conversationId: l.conversationId };
  }
  return { sendMessage: o };
}
class N {
  constructor() {
    this.handlers = {};
  }
  on(o, t) {
    var r;
    return ((r = this.handlers)[o] ?? (r[o] = /* @__PURE__ */ new Set())).add(t), () => this.off(o, t);
  }
  off(o, t) {
    const n = this.handlers[o];
    n == null || n.delete(t);
  }
  emit(o, t) {
    const n = this.handlers[o];
    n == null || n.forEach((l) => l(t));
    const r = new CustomEvent(`prohotelai:${o}`, { detail: t });
    window.dispatchEvent(r);
  }
}
const v = {
  en: {
    "widget.title": "Need help? Chat with us",
    "widget.input.placeholder": "Ask a question…",
    "widget.send": "Send",
    "widget.voice.start": "Start voice",
    "widget.voice.stop": "Stop voice",
    "widget.aria.open": "Open AI assistant chat",
    "widget.aria.close": "Close AI assistant chat",
    "widget.status.offline": "Assistant is unavailable. Try again later."
  },
  es: {
    "widget.title": "¿Necesitas ayuda? Chatea con nosotros",
    "widget.input.placeholder": "Haz una pregunta…",
    "widget.send": "Enviar",
    "widget.voice.start": "Iniciar voz",
    "widget.voice.stop": "Detener voz",
    "widget.aria.open": "Abrir chat del asistente de IA",
    "widget.aria.close": "Cerrar chat del asistente de IA",
    "widget.status.offline": "El asistente no está disponible. Inténtalo más tarde."
  },
  fr: {
    "widget.title": "Besoin d’aide ? Discutez avec nous",
    "widget.input.placeholder": "Posez une question…",
    "widget.send": "Envoyer",
    "widget.voice.start": "Activer la voix",
    "widget.voice.stop": "Arrêter la voix",
    "widget.aria.open": "Ouvrir le chat de l’assistant IA",
    "widget.aria.close": "Fermer le chat de l’assistant IA",
    "widget.status.offline": "Assistant indisponible. Réessayez plus tard."
  }
};
function U(e, o) {
  let t = e;
  const n = {
    en: { ...v.en },
    es: { ...v.es },
    fr: { ...v.fr }
  };
  o && Object.entries(o).forEach(([i, a]) => {
    if (!a) return;
    const s = i, p = n[s] ?? {};
    n[s] = { ...p, ...a };
  });
  function r(i) {
    const a = n[t];
    return (a == null ? void 0 : a[i]) ?? v.en[i] ?? i;
  }
  function l(i) {
    t = i;
  }
  return { t: r, setLanguage: l };
}
function V(e) {
  const o = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  let t = null;
  function n() {
    return !!o;
  }
  function r() {
    if (!o) {
      e.eventBus.emit("error", { message: "Speech recognition not supported" });
      return;
    }
    t && t.stop(), t = new o(), t.lang = navigator.language || "en-US", t.interimResults = !1, t.onresult = (a) => {
      var p, c, g;
      const s = (g = (c = (p = a.results) == null ? void 0 : p[0]) == null ? void 0 : c[0]) == null ? void 0 : g.transcript;
      s && e.onText(s);
    }, t.onerror = (a) => {
      e.eventBus.emit("error", { message: "Speech recognition error", error: a.error });
    }, t.start(), e.eventBus.emit("voice:start", void 0);
  }
  function l() {
    t == null || t.stop(), t = null, e.eventBus.emit("voice:stop", void 0);
  }
  function i(a) {
    if (!("speechSynthesis" in window))
      return;
    const s = new SpeechSynthesisUtterance(a);
    s.lang = navigator.language || "en-US", window.speechSynthesis.cancel(), window.speechSynthesis.speak(s);
  }
  return {
    supportsRecognition: n,
    startRecognition: r,
    stopRecognition: l,
    speak: i
  };
}
function M(e) {
  if (e.querySelector("#prohotelai-widget-styles")) return;
  const t = document.createElement("style");
  t.id = "prohotelai-widget-styles", t.textContent = `
    :host, .prohotelai-widget {
      all: initial;
      font-family: var(--prohotelai-font-family);
      color: var(--prohotelai-text);
    }

    .prohotelai-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--prohotelai-accent);
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 12px 16px;
      cursor: pointer;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      font-size: 14px;
    }

    .prohotelai-window {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: min(360px, calc(100vw - 32px));
      max-height: 520px;
      background: var(--prohotelai-background);
      color: var(--prohotelai-text);
      border-radius: var(--prohotelai-radius);
      box-shadow: 0 24px 48px rgba(15, 23, 42, 0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: translateY(16px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .prohotelai-window.open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .prohotelai-header {
      padding: 16px;
      font-weight: 600;
      font-size: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    .prohotelai-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    .prohotelai-message {
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      white-space: pre-wrap;
      background: rgba(15, 23, 42, 0.45);
    }

    .prohotelai-message.user {
      align-self: flex-end;
      background: rgba(37, 99, 235, 0.9);
      color: #fff;
    }

    .prohotelai-message.assistant {
      align-self: flex-start;
      background: rgba(15, 23, 42, 0.65);
    }

    .prohotelai-form {
      display: flex;
      gap: 8px;
      padding: 12px 16px 16px 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .prohotelai-input {
      flex: 1;
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 12px;
      padding: 10px 12px;
      font-size: 14px;
      color: var(--prohotelai-text);
      background: rgba(15, 23, 42, 0.85);
    }

    .prohotelai-input::placeholder {
      color: rgba(226, 232, 240, 0.6);
    }

    .prohotelai-send {
      background: var(--prohotelai-accent);
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 0 16px;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.1s ease;
    }

    .prohotelai-send:active {
      transform: scale(0.97);
    }

    .prohotelai-voice {
      margin-left: 4px;
      background: transparent;
      border: 1px solid rgba(148, 163, 184, 0.4);
      color: var(--prohotelai-text);
      border-radius: 12px;
      padding: 0 12px;
      cursor: pointer;
      font-size: 13px;
    }

    .prohotelai-status {
      font-size: 12px;
      color: rgba(226, 232, 240, 0.6);
      padding: 0 16px 12px 16px;
    }
  `, e.appendChild(t);
}
const D = {
  accentColor: "#2563eb",
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  borderRadius: "16px",
  fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
};
function C(e, o) {
  const t = { ...D, ...o ?? {} };
  e.style.setProperty("--prohotelai-accent", t.accentColor), e.style.setProperty("--prohotelai-background", t.backgroundColor), e.style.setProperty("--prohotelai-text", t.textColor), e.style.setProperty("--prohotelai-radius", t.borderRadius), e.style.setProperty("--prohotelai-font-family", t.fontFamily);
}
function P(e) {
  var E;
  const o = document.createElement("div");
  o.className = "prohotelai-widget", C(o), M(document);
  const t = document.createElement("button");
  t.className = "prohotelai-toggle", t.type = "button", t.setAttribute("aria-label", e.t("widget.aria.open")), t.textContent = "AI Assistant", t.addEventListener("click", e.onToggle);
  const n = document.createElement("div");
  n.className = "prohotelai-window";
  const r = document.createElement("div");
  r.className = "prohotelai-header", r.textContent = e.t("widget.title");
  const l = document.createElement("div");
  l.className = "prohotelai-messages";
  const i = document.createElement("div");
  i.className = "prohotelai-status", i.style.display = "none";
  const a = document.createElement("form");
  a.className = "prohotelai-form";
  const s = document.createElement("input");
  s.className = "prohotelai-input", s.type = "text", s.placeholder = e.t("widget.input.placeholder"), s.autocomplete = "off", s.setAttribute("aria-label", e.t("widget.input.placeholder"));
  const p = document.createElement("button");
  p.className = "prohotelai-send", p.type = "submit", p.textContent = e.t("widget.send");
  const c = document.createElement("button");
  c.className = "prohotelai-voice", c.type = "button", c.textContent = e.t("widget.voice.start"), c.style.display = e.enableVoice ? "inline-flex" : "none";
  let g = !1;
  c.addEventListener("click", () => {
    g ? (e.onStopVoice(), g = !1, c.textContent = e.t("widget.voice.start")) : (e.onStartVoice(), g = !0, c.textContent = e.t("widget.voice.stop"));
  }), a.addEventListener("submit", (d) => {
    d.preventDefault();
    const b = s.value.trim();
    b.length !== 0 && (e.onSend(b), s.value = "", g = !1, c.textContent = e.t("widget.voice.start"));
  });
  const h = document.createElement("button");
  h.type = "button", h.textContent = "Create ticket", h.className = "prohotelai-voice", h.style.display = (E = e.permissions) != null && E.includes("tickets:create") ? "inline-flex" : "none", h.addEventListener("click", () => {
    e.onRequestTicket();
  }), a.appendChild(s), a.appendChild(p), a.appendChild(c), a.appendChild(h), n.appendChild(r), n.appendChild(l), n.appendChild(i), n.appendChild(a), o.appendChild(t), o.appendChild(n), e.mountPoint.appendChild(o);
  function u(d) {
    l.innerHTML = "", d.forEach((b) => {
      const y = document.createElement("div");
      y.className = `prohotelai-message ${b.role}`, y.textContent = b.content, l.appendChild(y);
    }), l.scrollTop = l.scrollHeight;
  }
  function x() {
    n.classList.add("open"), t.setAttribute("aria-label", e.t("widget.aria.close"));
  }
  function f() {
    n.classList.remove("open"), t.setAttribute("aria-label", e.t("widget.aria.open"));
  }
  function w() {
    n.classList.contains("open") ? f() : x();
  }
  function m(d) {
    r.textContent = d("widget.title"), s.placeholder = d("widget.input.placeholder"), s.setAttribute("aria-label", d("widget.input.placeholder")), p.textContent = d("widget.send"), c.textContent = d(g ? "widget.voice.stop" : "widget.voice.start"), t.setAttribute("aria-label", n.classList.contains("open") ? d("widget.aria.close") : d("widget.aria.open"));
  }
  function I(d) {
    c.style.display = d ? "inline-flex" : "none";
  }
  function A(d) {
    d ? (i.style.display = "block", i.textContent = d) : (i.style.display = "none", i.textContent = "");
  }
  function S() {
    o.remove();
  }
  return {
    open: x,
    close: f,
    toggle: w,
    renderMessages: u,
    setLanguage: m,
    setVoiceAvailable: I,
    destroy: S,
    setStatus: A
  };
}
const $ = "en";
function q(e) {
  const o = k(e.element), t = B(e.defaultLanguage, $), n = new N(), r = U(t, e.translations), l = R({
    apiBaseUrl: e.apiBaseUrl,
    hotelId: e.hotelId,
    conversationId: e.conversationId,
    guestId: e.guestId,
    headers: e.headers,
    permissions: e.permissions
  }), i = V({
    eventBus: n,
    onText: (u) => {
      p(u);
    }
  }), a = P({
    mountPoint: o,
    eventBus: n,
    t: r.t,
    onSend: (u) => {
      p(u);
    },
    onToggle: () => {
      a.toggle();
    },
    onStartVoice: () => {
      i.startRecognition();
    },
    onStopVoice: () => {
      i.stopRecognition();
    },
    onRequestTicket: () => {
      p("Please create a ticket for this request.");
    },
    permissions: e.permissions,
    enableVoice: !!e.enableVoice
  });
  C(o, e.theme);
  let s = [];
  async function p(u) {
    const f = {
      id: T("local"),
      role: "user",
      content: u,
      createdAt: /* @__PURE__ */ new Date()
    };
    s = [...s, f], a.renderMessages(s), n.emit("message:sent", { id: f.id, content: f.content });
    try {
      const { messages: w } = await l.sendMessage(u);
      s = w, a.renderMessages(s);
      const m = w.at(-1);
      m && m.role === "assistant" && (n.emit("message:received", { id: m.id, content: m.content }), e.enableVoice && i.speak(m.content)), a.setStatus(null);
    } catch (w) {
      n.emit("error", { message: "Failed to send message", error: w }), a.setStatus(r.t("widget.status.offline"));
    }
  }
  function c(u) {
    r.setLanguage(u), a.setLanguage(r.t);
  }
  function g(u) {
    C(o, u);
  }
  const h = {
    open: a.open,
    close: a.close,
    toggle: a.toggle,
    sendMessage: p,
    setLanguage: c,
    setTheme: g,
    startVoice: () => {
      e.enableVoice && i.startRecognition();
    },
    stopVoice: () => {
      i.stopRecognition();
    },
    destroy: () => {
      a.destroy();
    },
    on: (u, x) => n.on(u, x)
  };
  return a.setVoiceAvailable(e.enableVoice ? i.supportsRecognition() : !1), n.emit("ready", { mountedAt: Date.now() }), h;
}
typeof window < "u" && (window.ProHotelAIWidget = {
  createWidget: q
});
export {
  q as createWidget
};
//# sourceMappingURL=widget-sdk.es.js.map
