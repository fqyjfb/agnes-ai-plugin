export interface PluginEnv {
  isDark: boolean;
  userId: string;
  appVersion: string;
}

export function getPluginEnv(): PluginEnv {
  const pluginData = (window as any).__PLUGIN_DATA__ || {};
  return {
    isDark: pluginData.isDark ?? false,
    userId: pluginData.userId ?? 'default_user',
    appVersion: pluginData.appVersion ?? '1.0.0',
  };
}

export function getFontThumbnailUrl(thumbnailPath: string): string {
  const baseUrl = window.__PLUGIN_BASE_URL__ || '';
  return `${baseUrl}/tools/ai-chat/fonts/${thumbnailPath}`;
}