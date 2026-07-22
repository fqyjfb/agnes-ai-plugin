import { LocalStorageService } from './localStorageService';
import { getPluginEnv } from '../utils/environment';
import { AIConversation, AIMessage, RolePreset, ImageGenerationTask, VideoGenerationTask, FontGenerationTask, AgnesConfig } from '../types/agnes';

const PREFIX = 'agnes';

function getUserId(): string {
  return getPluginEnv().userId;
}

function getKey(prefix: string, userId: string): string {
  return `${prefix}_${userId}`;
}

export class AgnesLocalStorage {
  static getConversations(): AIConversation[] {
    const key = getKey(`${PREFIX}_conversations`, getUserId());
    return LocalStorageService.getItem<AIConversation[]>(key) || [];
  }

  static setConversations(conversations: AIConversation[]): void {
    const key = getKey(`${PREFIX}_conversations`, getUserId());
    LocalStorageService.setItem(key, conversations);
  }

  static getMessages(conversationId: string): AIMessage[] {
    const key = getKey(`${PREFIX}_messages_${conversationId}`, getUserId());
    return LocalStorageService.getItem<AIMessage[]>(key) || [];
  }

  static setMessages(conversationId: string, messages: AIMessage[]): void {
    const key = getKey(`${PREFIX}_messages_${conversationId}`, getUserId());
    LocalStorageService.setItem(key, messages);
  }

  static getRolePresets(): RolePreset[] {
    const key = getKey(`${PREFIX}_role_presets`, getUserId());
    return LocalStorageService.getItem<RolePreset[]>(key) || [];
  }

  static setRolePresets(presets: RolePreset[]): void {
    const key = getKey(`${PREFIX}_role_presets`, getUserId());
    LocalStorageService.setItem(key, presets);
  }

  static getImageTasks(): ImageGenerationTask[] {
    const key = getKey(`${PREFIX}_image_tasks`, getUserId());
    return LocalStorageService.getItem<ImageGenerationTask[]>(key) || [];
  }

  static setImageTasks(tasks: ImageGenerationTask[]): void {
    const key = getKey(`${PREFIX}_image_tasks`, getUserId());
    LocalStorageService.setItem(key, tasks);
  }

  static getVideoTasks(): VideoGenerationTask[] {
    const key = getKey(`${PREFIX}_video_tasks`, getUserId());
    return LocalStorageService.getItem<VideoGenerationTask[]>(key) || [];
  }

  static setVideoTasks(tasks: VideoGenerationTask[]): void {
    const key = getKey(`${PREFIX}_video_tasks`, getUserId());
    LocalStorageService.setItem(key, tasks);
  }

  static getFontTasks(): FontGenerationTask[] {
    const key = getKey(`${PREFIX}_font_tasks`, getUserId());
    return LocalStorageService.getItem<FontGenerationTask[]>(key) || [];
  }

  static setFontTasks(tasks: FontGenerationTask[]): void {
    const key = getKey(`${PREFIX}_font_tasks`, getUserId());
    LocalStorageService.setItem(key, tasks);
  }

  static getConfig(): AgnesConfig | null {
    const key = getKey(`${PREFIX}_config`, getUserId());
    return LocalStorageService.getItem<AgnesConfig>(key);
  }

  static setConfig(config: AgnesConfig): void {
    const key = getKey(`${PREFIX}_config`, getUserId());
    LocalStorageService.setItem(key, config);
  }

  static getCurrentConversationId(): string | null {
    const key = getKey(`${PREFIX}_current_conversation`, getUserId());
    return LocalStorageService.getItem<string>(key);
  }

  static setCurrentConversationId(id: string): void {
    const key = getKey(`${PREFIX}_current_conversation`, getUserId());
    LocalStorageService.setItem(key, id);
  }

  static clearUserData(): void {
    const userId = getUserId();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < LocalStorageService.length; i++) {
      const key = LocalStorageService.key(i);
      if (key && key.includes(`_${userId}`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => LocalStorageService.removeItem(key));
  }
}