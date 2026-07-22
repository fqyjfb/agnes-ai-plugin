import { AIConversation, AIMessage, RolePreset, ImageGenerationTask, VideoGenerationTask, AgnesConfig } from '../types/agnes';

const PREFIX = 'agnes_ai';

function getKey(key: string, userId?: string): string {
  if (userId) {
    return `${PREFIX}_${userId}_${key}`;
  }
  return `${PREFIX}_${key}`;
}

function getUserId(): string {
  return (window as any).__PLUGIN_DATA__?.userId || 'default';
}

class LocalStorageService {
  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item);
    } catch {
      return null;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to set localStorage item');
    }
  }
}

export class AgnesLocalStorage {
  static getConfig(): AgnesConfig | null {
    const key = getKey('config', getUserId());
    return LocalStorageService.getItem<AgnesConfig>(key);
  }

  static setConfig(config: AgnesConfig): void {
    const key = getKey('config', getUserId());
    LocalStorageService.setItem(key, config);
  }

  static getConversations(): AIConversation[] {
    const key = getKey('conversations', getUserId());
    return LocalStorageService.getItem<AIConversation[]>(key) || [];
  }

  static setConversations(conversations: AIConversation[]): void {
    const key = getKey('conversations', getUserId());
    LocalStorageService.setItem(key, conversations);
  }

  static getMessages(conversationId: string): AIMessage[] {
    const key = getKey(`messages_${conversationId}`, getUserId());
    return LocalStorageService.getItem<AIMessage[]>(key) || [];
  }

  static setMessages(conversationId: string, messages: AIMessage[]): void {
    const key = getKey(`messages_${conversationId}`, getUserId());
    LocalStorageService.setItem(key, messages);
  }

  static getRolePresets(): RolePreset[] {
    const key = getKey('role_presets', getUserId());
    return LocalStorageService.getItem<RolePreset[]>(key) || [];
  }

  static setRolePresets(presets: RolePreset[]): void {
    const key = getKey('role_presets', getUserId());
    LocalStorageService.setItem(key, presets);
  }

  static getImageTasks(): ImageGenerationTask[] {
    const key = getKey('image_tasks', getUserId());
    return LocalStorageService.getItem<ImageGenerationTask[]>(key) || [];
  }

  static setImageTasks(tasks: ImageGenerationTask[]): void {
    const key = getKey('image_tasks', getUserId());
    LocalStorageService.setItem(key, tasks);
  }

  static getVideoTasks(): VideoGenerationTask[] {
    const key = getKey('video_tasks', getUserId());
    return LocalStorageService.getItem<VideoGenerationTask[]>(key) || [];
  }

  static setVideoTasks(tasks: VideoGenerationTask[]): void {
    const key = getKey('video_tasks', getUserId());
    LocalStorageService.setItem(key, tasks);
  }
}