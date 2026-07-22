import { AgnesLocalStorage } from './agnesLocalStorage';
import { AIConversation, AIMessage, RolePreset, ImageGenerationTask, VideoGenerationTask, AgnesConfig } from '../types/agnes';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export class AgnesService {
  static async getOrCreateConfig(): Promise<AgnesConfig> {
    let config = AgnesLocalStorage.getConfig();
    if (!config) {
      config = {
        id: generateId(),
        user_id: '',
        api_key: '',
        theme: 'light',
        api_base_url: 'https://api.agnesai.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      AgnesLocalStorage.setConfig(config);
    }
    return config;
  }

  static async updateConfig(config: Partial<AgnesConfig>): Promise<AgnesConfig> {
    const existing = await this.getOrCreateConfig();
    const updated = { ...existing, ...config, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setConfig(updated);
    return updated;
  }

  static async getAllConversations(): Promise<AIConversation[]> {
    return AgnesLocalStorage.getConversations();
  }

  static async createConversation(title: string, rolePresetId?: string): Promise<AIConversation> {
    const conversations = await this.getAllConversations();
    const conversation: AIConversation = {
      id: generateId(),
      user_id: '',
      title,
      role_preset_id: rolePresetId,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    conversations.unshift(conversation);
    AgnesLocalStorage.setConversations(conversations);
    AgnesLocalStorage.setMessages(conversation.id, []);
    return conversation;
  }

  static async updateConversation(id: string, updates: Partial<AIConversation>): Promise<AIConversation | null> {
    const conversations = await this.getAllConversations();
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    conversations[index] = { ...conversations[index], ...updates, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setConversations(conversations);
    return conversations[index];
  }

  static async deleteConversation(id: string): Promise<void> {
    const conversations = await this.getAllConversations();
    const filtered = conversations.filter(c => c.id !== id);
    AgnesLocalStorage.setConversations(filtered);
    AgnesLocalStorage.setMessages(id, []);
  }

  static async getAllMessages(conversationId: string): Promise<AIMessage[]> {
    return AgnesLocalStorage.getMessages(conversationId);
  }

  static async addMessage(conversationId: string, message: Omit<AIMessage, 'id' | 'created_at' | 'updated_at'>): Promise<AIMessage> {
    const messages = await this.getAllMessages(conversationId);
    const newMessage: AIMessage = {
      ...message,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    messages.push(newMessage);
    AgnesLocalStorage.setMessages(conversationId, messages);
    
    const updates: Partial<AIConversation> = { updated_at: new Date().toISOString() };
    if (messages.length === 1 && message.role === 'user') {
      const firstLine = message.content.split('\n')[0];
      const title = firstLine.substring(0, 12);
      updates.title = title || '新对话';
    }
    await this.updateConversation(conversationId, updates);
    return newMessage;
  }

  static async updateMessage(conversationId: string, messageId: string, updates: Partial<AIMessage>): Promise<AIMessage | null> {
    const messages = await this.getAllMessages(conversationId);
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return null;
    
    messages[index] = { ...messages[index], ...updates, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setMessages(conversationId, messages);
    return messages[index];
  }

  static async getAllRolePresets(): Promise<RolePreset[]> {
    return AgnesLocalStorage.getRolePresets();
  }

  static async createRolePreset(preset: Omit<RolePreset, 'id' | 'created_at' | 'updated_at'>): Promise<RolePreset> {
    const presets = await this.getAllRolePresets();
    const newPreset: RolePreset = {
      ...preset,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    presets.push(newPreset);
    AgnesLocalStorage.setRolePresets(presets);
    return newPreset;
  }

  static async updateRolePreset(id: string, updates: Partial<RolePreset>): Promise<RolePreset | null> {
    const presets = await this.getAllRolePresets();
    const index = presets.findIndex(p => p.preset_id === id);
    if (index === -1) return null;
    
    presets[index] = { ...presets[index], ...updates, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setRolePresets(presets);
    return presets[index];
  }

  static async deleteRolePreset(id: string): Promise<void> {
    const presets = await this.getAllRolePresets();
    const filtered = presets.filter(p => p.preset_id !== id);
    AgnesLocalStorage.setRolePresets(filtered);
  }

  static async getAllImageTasks(): Promise<ImageGenerationTask[]> {
    return AgnesLocalStorage.getImageTasks();
  }

  static async createImageTask(task: Omit<ImageGenerationTask, 'id' | 'created_at' | 'updated_at'>): Promise<ImageGenerationTask> {
    const tasks = await this.getAllImageTasks();
    const newTask: ImageGenerationTask = {
      ...task,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    AgnesLocalStorage.setImageTasks(tasks);
    return newTask;
  }

  static async updateImageTask(id: string, updates: Partial<ImageGenerationTask>): Promise<ImageGenerationTask | null> {
    const tasks = await this.getAllImageTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setImageTasks(tasks);
    return tasks[index];
  }

  static async deleteImageTask(id: string): Promise<void> {
    const tasks = await this.getAllImageTasks();
    const filtered = tasks.filter(t => t.id !== id);
    AgnesLocalStorage.setImageTasks(filtered);
  }

  static async getAllVideoTasks(): Promise<VideoGenerationTask[]> {
    return AgnesLocalStorage.getVideoTasks();
  }

  static async createVideoTask(task: Omit<VideoGenerationTask, 'id' | 'created_at' | 'updated_at'>): Promise<VideoGenerationTask> {
    const tasks = await this.getAllVideoTasks();
    const newTask: VideoGenerationTask = {
      ...task,
      id: generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    AgnesLocalStorage.setVideoTasks(tasks);
    return newTask;
  }

  static async updateVideoTask(id: string, updates: Partial<VideoGenerationTask>): Promise<VideoGenerationTask | null> {
    const tasks = await this.getAllVideoTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
    AgnesLocalStorage.setVideoTasks(tasks);
    return tasks[index];
  }

  static async deleteVideoTask(id: string): Promise<void> {
    const tasks = await this.getAllVideoTasks();
    const filtered = tasks.filter(t => t.id !== id);
    AgnesLocalStorage.setVideoTasks(filtered);
  }
}