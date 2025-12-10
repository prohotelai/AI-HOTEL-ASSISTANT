export interface ServiceConfig {
  aiEngineUrl: string;
  widgetCdnUrl: string;
}

export function loadConfig(): ServiceConfig {
  return {
    aiEngineUrl: process.env.AI_ENGINE_URL || 'http://localhost:4000',
    widgetCdnUrl: process.env.WIDGET_CDN_URL || 'http://localhost:3001'
  };
}
