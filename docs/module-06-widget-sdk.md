# Module 6 — AI Widget SDK Implementation Plan

## Objectives
- Deliver an embeddable client-side widget SDK that hotel properties can drop into any web property.
- Provide a chat-first experience that connects to the AI Agent API with support for streaming enhancements later.
- Offer optional voice controls (speech-to-text and text-to-speech) built on standard browser capabilities with graceful degradation.
- Support multi-language UI strings with runtime switching.
- Expose theming hooks so hotels can match brand styles without editing source.
- Emit structured analytics events and expose a subscription API.
- Respect RBAC by disabling privileged actions when the caller lacks permission scopes.

## Key Deliverables
1. **Widget Bundle**: ESM + IIFE bundles emitted via Vite for easy `<script>` tag usage.
2. **Integration API**:
   - `createWidget(config)` returns an object with `sendMessage`, `open`, `close`, `setLanguage`, `setTheme`, `startVoice`, `stopVoice`, and `destroy` controls.
   - Event interface `on(event, handler)` for `ready`, `message:sent`, `message:received`, `voice:start`, `voice:stop`, and `error`.
3. **Chat + Voice UX**: Minimal DOM-driven chat window with input, message history, toggle button, and voice CTA when available.
4. **Localization**: Built-in translations for EN, ES, and FR with the ability to extend via config.
5. **Theming**: Token-driven theme (backgrounds, accents, text colors) with fallbacks and runtime updates.
6. **RBAC Awareness**: Configurable permission scopes (e.g., `['tickets:create']`) that gate UI affordances and tool invocation hints.
7. **Documentation**: Integration guide added to `README.md` / project summary and module-specific doc.

## Implementation Steps
1. **SDK Skeleton**
   - Create `widget-sdk/` package with `package.json`, `tsconfig.json`, and `vite.config.ts`.
   - Define shared types in `src/types.ts` and event emitter in `src/events.ts`.
2. **Core Services**
   - Build `chatClient.ts` to call `/api/chat` (configurable base URL) and marshal messages.
   - Implement `voice.ts` to wrap SpeechRecognition and SpeechSynthesis with fallbacks.
   - Add `i18n.ts` for static dictionaries and runtime overrides.
3. **UI Layer**
   - Author `widgetDom.ts` to generate and update DOM nodes with minimal CSS injected from `style.ts`.
   - Handle message rendering, voice status, and permission-limited controls.
4. **Public API**
   - Expose `createWidget` in `src/index.ts`, wire lifecycle, and register global for IIFE build.
5. **Build + Scripts**
   - Add `widget:build` script to repo root to run `npm --prefix widget-sdk run build`.
   - Ensure bundles land in `widget-sdk/dist/`.
6. **Telemetry**
   - Dispatch structured events via emitter and `window.dispatchEvent` for external listeners.
7. **Docs & Summary**
   - Update `PROJECT_SUMMARY.md` with Module 6 highlights.
   - Document integration snippet in `README.md` and module doc.
8. **Verification**
   - Provide simple Vitest smoke test for localization utilities.
   - Run lint + targeted tests.

## Risks & Mitigations
- **Browser Voice Support**: Use feature detection; fall back to manual input.
- **Cross-Origin Requests**: Allow configuring `apiBaseUrl`; document CORS requirements.
- **RBAC Drift**: Mirror backend permission strings; degrade gracefully if scopes missing.
- **Bundle Size**: Avoid heavy dependencies; stick to vanilla TypeScript.

## Success Criteria
- `npm run widget:build` produces `dist/widget-sdk.es.js` and `dist/widget-sdk.iife.js`.
- Inline integration snippet works in a static HTML page.
- Voice controls toggle without errors on unsupported browsers.
- Events flow through `on()` listener API and `window` custom events.
- Documentation lists configuration options, methods, and events.
