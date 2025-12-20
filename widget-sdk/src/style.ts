export function injectStyles(root: ShadowRoot | Document) {
  const existing = root.querySelector('#prohotelai-widget-styles')
  if (existing) return

  const style = document.createElement('style')
  style.id = 'prohotelai-widget-styles'
  style.textContent = `
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
  `

  root.appendChild(style)
}
