export const APP_CONFIG = {
  apiBaseUrl: 'http://localhost:3000/api',
  appName: 'Warehouse PWA',
  defaultLanguage: 'sl' as const,
  supportedLanguages: ['sl', 'en'] as const,
};

export type AppLanguage = (typeof APP_CONFIG.supportedLanguages)[number];