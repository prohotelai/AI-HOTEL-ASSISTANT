export interface WidgetOptions {
  apiKey?: string;
  baseUrl?: string;
}

export function initHotelWidget(options: WidgetOptions = {}) {
  const config = { ...options };
  if (typeof window !== 'undefined') {
    console.info('AI Hotel Assistant widget initialized', config);
  }
  return {
    mount: (selector: string) => {
      if (typeof document === 'undefined') return;
      const el = document.querySelector(selector);
      if (!el) return;
      el.innerHTML = '<div>AI Hotel Assistant widget placeholder</div>';
    }
  };
}
