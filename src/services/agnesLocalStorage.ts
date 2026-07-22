import type { Conversation, ImageResult, VideoTask, FontGenerationTask, RolePreset } from '../types/agnes';

const STORAGE_KEYS = {
  CONVERSATIONS: 'agnes_conversations',
  IMAGE_HISTORY: 'agnes_image_history',
  VIDEO_TASKS: 'agnes_video_tasks',
  FONT_TASKS: 'agnes_font_tasks',
  ROLE_PRESETS: 'agnes_role_presets',
  API_KEY: 'agnes_api_key',
  API_BASE_URL: 'agnes_api_base_url',
  THEME: 'agnes_theme',
};

function getStorageKey(userId: string, key: string): string {
  return `${key}_${userId}`;
}

export const agnesLocalStorage = {
  saveConversations(userId: string, conversations: Conversation[]): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.CONVERSATIONS), JSON.stringify(conversations));
  },

  getConversations(userId: string): Conversation[] {
    const data = localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.CONVERSATIONS));
    return data ? JSON.parse(data) : [];
  },

  saveImageHistory(userId: string, history: ImageResult[]): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.IMAGE_HISTORY), JSON.stringify(history));
  },

  getImageHistory(userId: string): ImageResult[] {
    const data = localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.IMAGE_HISTORY));
    return data ? JSON.parse(data) : [];
  },

  saveVideoTasks(userId: string, tasks: VideoTask[]): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.VIDEO_TASKS), JSON.stringify(tasks));
  },

  getVideoTasks(userId: string): VideoTask[] {
    const data = localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.VIDEO_TASKS));
    return data ? JSON.parse(data) : [];
  },

  saveFontTasks(userId: string, tasks: FontGenerationTask[]): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.FONT_TASKS), JSON.stringify(tasks));
  },

  getFontTasks(userId: string): FontGenerationTask[] {
    const data = localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.FONT_TASKS));
    return data ? JSON.parse(data) : [];
  },

  saveRolePresets(userId: string, presets: RolePreset[]): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.ROLE_PRESETS), JSON.stringify(presets));
  },

  getRolePresets(userId: string): RolePreset[] {
    const data = localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.ROLE_PRESETS));
    return data ? JSON.parse(data) : [];
  },

  saveApiKey(userId: string, apiKey: string): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.API_KEY), apiKey);
  },

  getApiKey(userId: string): string {
    return localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.API_KEY)) || '';
  },

  saveApiBaseUrl(userId: string, url: string): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.API_BASE_URL), url);
  },

  getApiBaseUrl(userId: string): string {
    return localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.API_BASE_URL)) || 'https://apihub.agnes-ai.com';
  },

  saveTheme(userId: string, theme: string): void {
    localStorage.setItem(getStorageKey(userId, STORAGE_KEYS.THEME), theme);
  },

  getTheme(userId: string): string {
    return localStorage.getItem(getStorageKey(userId, STORAGE_KEYS.THEME)) || 'light';
  },

  clearUserData(userId: string): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(getStorageKey(userId, key));
    });
  },
};
