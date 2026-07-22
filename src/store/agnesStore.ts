import { create } from 'zustand';
import { Conversation, Message, RolePreset, ImageGenerationTask, VideoGenerationTask, FontGenerationTask } from '../types/agnes';
import { AgnesService } from '../services/AgnesService';

interface AgnesStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  rolePresets: RolePreset[];
  imageTasks: ImageGenerationTask[];
  videoTasks: VideoGenerationTask[];
  fontTasks: FontGenerationTask[];
  isLoading: boolean;
  activeTab: 'chat' | 'presets' | 'font' | 'history' | 'settings';

  setActiveTab: (tab: 'chat' | 'presets' | 'font' | 'history' | 'settings') => void;
  setLoading: (loading: boolean) => void;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadRolePresets: () => Promise<void>;
  loadImageTasks: () => Promise<void>;
  loadVideoTasks: () => Promise<void>;
  loadFontTasks: () => Promise<void>;
  createConversation: (title: string, rolePresetId?: string) => Promise<Conversation>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'created_at'>) => Promise<Message>;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => Promise<void>;
  addRolePreset: (preset: Omit<RolePreset, 'id' | 'created_at' | 'updated_at'>) => Promise<RolePreset>;
  updateRolePreset: (id: string, updates: Partial<RolePreset>) => Promise<void>;
  deleteRolePreset: (id: string) => Promise<void>;
  addImageTask: (task: Omit<ImageGenerationTask, 'id' | 'created_at' | 'updated_at'>) => Promise<ImageGenerationTask>;
  updateImageTask: (id: string, updates: Partial<ImageGenerationTask>) => Promise<void>;
  deleteImageTask: (id: string) => Promise<void>;
  addVideoTask: (task: Omit<VideoGenerationTask, 'id' | 'created_at' | 'updated_at'>) => Promise<VideoGenerationTask>;
  updateVideoTask: (id: string, updates: Partial<VideoGenerationTask>) => Promise<void>;
  deleteVideoTask: (id: string) => Promise<void>;
  addFontTask: (task: Omit<FontGenerationTask, 'id' | 'created_at' | 'updated_at'>) => Promise<FontGenerationTask>;
  updateFontTask: (id: string, updates: Partial<FontGenerationTask>) => Promise<void>;
  deleteFontTask: (id: string) => Promise<void>;
}

export const useAgnesStore = create<AgnesStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  rolePresets: [],
  imageTasks: [],
  videoTasks: [],
  fontTasks: [],
  isLoading: false,
  activeTab: 'chat',

  setActiveTab: (tab) => set({ activeTab: tab }),

  setLoading: (loading) => set({ isLoading: loading }),

  loadConversations: async () => {
    try {
      const conversations = await AgnesService.getAllConversations();
      set({ conversations });
    } catch {
      set({ conversations: [] });
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const messages = await AgnesService.getAllMessages(conversationId);
      set({ messages });
    } catch {
      set({ messages: [] });
    }
  },

  loadRolePresets: async () => {
    try {
      const presets = await AgnesService.getAllRolePresets();
      if (presets.length === 0) {
        const defaultPresets: Omit<RolePreset, 'id' | 'created_at' | 'updated_at'>[] = [
          { preset_id: 'default-assistant', name: '文案助手', description: '专业文案生成助手', system_prompt: '你是一位专业的文案助手，擅长撰写各类营销文案、产品描述和社交媒体内容。请根据用户需求，生成高质量、吸引人的文案内容。', is_default: true, is_system: true },
          { preset_id: 'default-translator', name: '翻译助手', description: '精准翻译助手', system_prompt: '你是一位专业翻译助手，精通多种语言。请准确翻译用户提供的内容，保持原意不变，同时确保译文流畅自然。', is_default: true, is_system: true },
          { preset_id: 'default-programmer', name: '编程助手', description: '代码编程助手', system_prompt: '你是一位资深程序员，精通多种编程语言和技术栈。请帮助用户解决编程问题，提供代码示例和技术建议。', is_default: false, is_system: true },
          { preset_id: 'default-creative', name: '创意助手', description: '创意灵感助手', system_prompt: '你是一位富有创意的灵感助手，擅长头脑风暴和创意构思。请帮助用户激发创意，提供新颖的想法和解决方案。', is_default: false, is_system: true },
        ];
        for (const preset of defaultPresets) {
          await AgnesService.createRolePreset(preset);
        }
        const updatedPresets = await AgnesService.getAllRolePresets();
        set({ rolePresets: updatedPresets });
      } else {
        set({ rolePresets: presets });
      }
    } catch {
      set({ rolePresets: [] });
    }
  },

  loadImageTasks: async () => {
    try {
      const tasks = await AgnesService.getAllImageTasks();
      set({ imageTasks: tasks });
    } catch {
      set({ imageTasks: [] });
    }
  },

  loadVideoTasks: async () => {
    try {
      const tasks = await AgnesService.getAllVideoTasks();
      set({ videoTasks: tasks });
    } catch {
      set({ videoTasks: [] });
    }
  },

  loadFontTasks: async () => {
    try {
      const tasks = await AgnesService.getAllFontTasks();
      set({ fontTasks: tasks });
    } catch {
      set({ fontTasks: [] });
    }
  },

  createConversation: async (title, rolePresetId) => {
    const conversation = await AgnesService.createConversation(title, rolePresetId);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
    }));
    return conversation;
  },

  updateConversation: async (id, updates) => {
    await AgnesService.updateConversation(id, updates);
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  },

  deleteConversation: async (id) => {
    await AgnesService.deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    }));
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
    if (id) {
      get().loadMessages(id);
    } else {
      set({ messages: [] });
    }
  },

  addMessage: async (conversationId, message) => {
    const newMessage = await AgnesService.addMessage(conversationId, message);
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return newMessage;
  },

  updateMessage: async (conversationId, messageId, updates) => {
    await AgnesService.updateMessage(conversationId, messageId, updates);
    set((state) => ({
      messages: state.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
    }));
  },

  addRolePreset: async (preset) => {
    const newPreset = await AgnesService.createRolePreset(preset);
    set((state) => ({
      rolePresets: [...state.rolePresets, newPreset],
    }));
    return newPreset;
  },

  updateRolePreset: async (id, updates) => {
    await AgnesService.updateRolePreset(id, updates);
    set((state) => ({
      rolePresets: state.rolePresets.map((p) => (p.preset_id === id ? { ...p, ...updates } : p)),
    }));
  },

  deleteRolePreset: async (id) => {
    await AgnesService.deleteRolePreset(id);
    set((state) => ({
      rolePresets: state.rolePresets.filter((p) => p.preset_id !== id),
    }));
  },

  addImageTask: async (task) => {
    const newTask = await AgnesService.createImageTask(task);
    set((state) => ({
      imageTasks: [newTask, ...state.imageTasks],
    }));
    return newTask;
  },

  updateImageTask: async (id, updates) => {
    await AgnesService.updateImageTask(id, updates);
    set((state) => ({
      imageTasks: state.imageTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteImageTask: async (id) => {
    await AgnesService.deleteImageTask(id);
    set((state) => ({
      imageTasks: state.imageTasks.filter((t) => t.id !== id),
    }));
  },

  addVideoTask: async (task) => {
    const newTask = await AgnesService.createVideoTask(task);
    set((state) => ({
      videoTasks: [newTask, ...state.videoTasks],
    }));
    return newTask;
  },

  updateVideoTask: async (id, updates) => {
    await AgnesService.updateVideoTask(id, updates);
    set((state) => ({
      videoTasks: state.videoTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteVideoTask: async (id) => {
    await AgnesService.deleteVideoTask(id);
    set((state) => ({
      videoTasks: state.videoTasks.filter((t) => t.id !== id),
    }));
  },

  addFontTask: async (task) => {
    const newTask = await AgnesService.createFontTask(task);
    set((state) => ({
      fontTasks: [newTask, ...state.fontTasks],
    }));
    return newTask;
  },

  updateFontTask: async (id, updates) => {
    await AgnesService.updateFontTask(id, updates);
    set((state) => ({
      fontTasks: state.fontTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteFontTask: async (id) => {
    await AgnesService.deleteFontTask(id);
    set((state) => ({
      fontTasks: state.fontTasks.filter((t) => t.id !== id),
    }));
  },
}));