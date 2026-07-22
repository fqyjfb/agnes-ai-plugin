import { create } from 'zustand';
import { Conversation, Message, VideoTask, FontGenerationTask, RolePreset, ImageResult } from '../types/agnes';
import { agnesLocalStorage } from '../services/agnesLocalStorage';

interface AgnesState {
  userId: string;
  conversations: Conversation[];
  activeConversationId: string | null;
  rolePresets: RolePreset[];
  activeRolePresetId: string | null;
  imageGeneration: {
    isGenerating: boolean;
    result: ImageResult | null;
    history: ImageResult[];
  };
  videoGeneration: {
    tasks: VideoTask[];
  };
  fontGeneration: {
    tasks: FontGenerationTask[];
  };
  apiKey: string;
  theme: 'light' | 'dark';
  apiBaseUrl: string;

  setUserId: (userId: string) => void;
  loadUserData: (userId: string) => void;
  saveUserData: () => void;

  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, content: string, thinking?: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  createConversation: (title: string, rolePresetId?: string | null) => Conversation;
  setActiveConversation: (conversationId: string | null) => void;
  deleteConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, title: string) => void;

  addRolePreset: (preset: Omit<RolePreset, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRolePreset: (presetId: string, updates: Partial<RolePreset>) => void;
  deleteRolePreset: (presetId: string) => void;
  setActiveRolePreset: (presetId: string | null) => void;

  setImageGenerating: (isGenerating: boolean) => void;
  setImageResult: (result: ImageResult | null) => void;
  addImageToHistory: (result: ImageResult) => void;
  removeImageFromHistory: (id: string) => void;
  clearImageHistory: () => void;

  addVideoTask: (task: VideoTask) => void;
  updateVideoTask: (taskId: string, updates: Partial<VideoTask>) => void;
  removeVideoTask: (taskId: string) => void;

  addFontTask: (task: FontGenerationTask) => void;
  updateFontTask: (taskId: string, updates: Partial<FontGenerationTask>) => void;
  removeFontTask: (taskId: string) => void;

  setApiKey: (apiKey: string) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setApiBaseUrl: (url: string) => void;
}

const defaultRolePresets: RolePreset[] = [
  {
    id: 'copywriter',
    user_id: undefined,
    preset_id: 'copywriter',
    name: '文案助手',
    description: '专业的文案创作助手，帮助您撰写高质量的营销文案、产品描述和广告文案',
    system_prompt: '您是一名专业的文案策划师，擅长撰写各种类型的营销文案。请根据用户的需求，创作出吸引人、有说服力的文案内容。',
    icon: '✍️',
    is_system: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'translator',
    user_id: undefined,
    preset_id: 'translator',
    name: '翻译助手',
    description: '多语言翻译专家，支持多种语言互译，准确传达原文含义',
    system_prompt: '您是一名专业的翻译专家，精通多种语言。请准确翻译用户提供的内容，保持原文含义不变，并确保译文流畅自然。',
    icon: '🌍',
    is_system: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'xiaohongshu',
    user_id: undefined,
    preset_id: 'xiaohongshu',
    name: '小红书助手',
    description: '小红书风格内容创作专家，帮助您撰写吸睛的种草笔记',
    system_prompt: '您是一名小红书内容创作专家，精通小红书平台的内容风格和热门话题。请根据用户提供的产品或主题，创作出符合小红书风格的种草笔记。',
    icon: '📕',
    is_system: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'social-title',
    user_id: undefined,
    preset_id: 'social-title',
    name: '社媒标题助手',
    description: '社交媒体标题创作专家，帮您打造高点击率的标题',
    system_prompt: '您是一名社交媒体运营专家，擅长创作吸引人的标题。请根据用户提供的内容主题，生成多个吸引人的社交媒体标题选项。',
    icon: '📣',
    is_system: true,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useAgnesStore = create<AgnesState>()((set, get) => ({
  userId: 'local-user',
  conversations: [],
  activeConversationId: null,
  rolePresets: defaultRolePresets,
  activeRolePresetId: null,
  imageGeneration: {
    isGenerating: false,
    result: null,
    history: [],
  },
  videoGeneration: {
    tasks: [],
  },
  fontGeneration: {
    tasks: [],
  },
  apiKey: '',
  theme: 'light',
  apiBaseUrl: 'https://apihub.agnes-ai.com',

  setUserId: (userId) => {
    set({ userId });
  },

  loadUserData: (userId) => {
    const localConversations = agnesLocalStorage.getConversations(userId);
    const localImageHistory = agnesLocalStorage.getImageHistory(userId);
    const localVideoTasks = agnesLocalStorage.getVideoTasks(userId);
    const localFontTasks = agnesLocalStorage.getFontTasks(userId);
    const localRolePresets = agnesLocalStorage.getRolePresets(userId);
    const localApiKey = agnesLocalStorage.getApiKey(userId);
    const localApiBaseUrl = agnesLocalStorage.getApiBaseUrl(userId);
    const localTheme = agnesLocalStorage.getTheme(userId) as 'light' | 'dark';

    const mergedPresets = [
      ...defaultRolePresets,
      ...localRolePresets.filter(p => !defaultRolePresets.some(dp => dp.id === p.id)),
    ];

    set({
      userId,
      conversations: localConversations,
      rolePresets: mergedPresets,
      imageGeneration: {
        isGenerating: false,
        result: null,
        history: localImageHistory,
      },
      videoGeneration: {
        tasks: localVideoTasks,
      },
      fontGeneration: {
        tasks: localFontTasks,
      },
      apiKey: localApiKey,
      apiBaseUrl: localApiBaseUrl,
      theme: localTheme,
    });
  },

  saveUserData: () => {
    const state = get();
    agnesLocalStorage.saveConversations(state.userId, state.conversations);
    agnesLocalStorage.saveImageHistory(state.userId, state.imageGeneration.history);
    agnesLocalStorage.saveVideoTasks(state.userId, state.videoGeneration.tasks);
    agnesLocalStorage.saveFontTasks(state.userId, state.fontGeneration.tasks);
    const userPresets = state.rolePresets.filter(p => !p.is_system);
    agnesLocalStorage.saveRolePresets(state.userId, userPresets);
    agnesLocalStorage.saveApiKey(state.userId, state.apiKey);
    agnesLocalStorage.saveApiBaseUrl(state.userId, state.apiBaseUrl);
    agnesLocalStorage.saveTheme(state.userId, state.theme);
  },

  addMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: [...conv.messages, message], updated_at: new Date().toISOString() }
          : conv
      ),
    }));
    get().saveUserData();
  },

  updateMessage: (conversationId, messageId, content, thinking) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === messageId
                  ? { ...msg, content, thinking, updated_at: new Date().toISOString() }
                  : msg
              ),
              updated_at: new Date().toISOString(),
            }
          : conv
      ),
    }));
    get().saveUserData();
  },

  deleteMessage: (conversationId, messageId) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, messages: conv.messages.filter((msg) => msg.id !== messageId), updated_at: new Date().toISOString() }
          : conv
      ),
    }));
    get().saveUserData();
  },

  createConversation: (title, rolePresetId = null) => {
    const state = get();
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      user_id: state.userId,
      title,
      role_preset_id: rolePresetId,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set({
      conversations: [newConversation, ...state.conversations],
      activeConversationId: newConversation.id,
    });
    get().saveUserData();
    return newConversation;
  },

  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
  },

  deleteConversation: (conversationId) => {
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== conversationId),
      activeConversationId:
        state.activeConversationId === conversationId
          ? state.conversations.find((conv) => conv.id !== conversationId)?.id || null
          : state.activeConversationId,
    }));
    get().saveUserData();
  },

  updateConversationTitle: (conversationId, title) => {
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId ? { ...conv, title, updated_at: new Date().toISOString() } : conv
      ),
    }));
    get().saveUserData();
  },

  addRolePreset: (preset) => {
    const state = get();
    const newPreset: RolePreset = {
      ...preset,
      id: `preset-${Date.now()}`,
      user_id: state.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => ({ rolePresets: [...state.rolePresets, newPreset] }));
    get().saveUserData();
  },

  updateRolePreset: (presetId, updates) => {
    set((state) => ({
      rolePresets: state.rolePresets.map((preset) =>
        preset.id === presetId ? { ...preset, ...updates, updated_at: new Date().toISOString() } : preset
      ),
    }));
    get().saveUserData();
  },

  deleteRolePreset: (presetId) => {
    set((state) => ({
      rolePresets: state.rolePresets.filter((preset) => preset.id !== presetId),
      activeRolePresetId: state.activeRolePresetId === presetId ? null : state.activeRolePresetId,
    }));
    get().saveUserData();
  },

  setActiveRolePreset: (presetId) => {
    set({ activeRolePresetId: presetId });
  },

  setImageGenerating: (isGenerating) => {
    set((state) => ({ imageGeneration: { ...state.imageGeneration, isGenerating } }));
  },

  setImageResult: (result) => {
    set((state) => ({ imageGeneration: { ...state.imageGeneration, result } }));
  },

  addImageToHistory: (result) => {
    set((state) => ({
      imageGeneration: {
        ...state.imageGeneration,
        history: [result, ...state.imageGeneration.history],
      },
    }));
    get().saveUserData();
  },

  removeImageFromHistory: (id) => {
    set((state) => ({
      imageGeneration: {
        ...state.imageGeneration,
        history: state.imageGeneration.history.filter((img) => img.id !== id),
      },
    }));
    get().saveUserData();
  },

  clearImageHistory: () => {
    set((state) => ({ imageGeneration: { ...state.imageGeneration, history: [] } }));
    get().saveUserData();
  },

  addVideoTask: (task) => {
    set((state) => ({ videoGeneration: { ...state.videoGeneration, tasks: [task, ...state.videoGeneration.tasks] } }));
    get().saveUserData();
  },

  updateVideoTask: (taskId, updates) => {
    set((state) => ({
      videoGeneration: {
        ...state.videoGeneration,
        tasks: state.videoGeneration.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        ),
      },
    }));
    get().saveUserData();
  },

  removeVideoTask: (taskId) => {
    set((state) => ({
      videoGeneration: {
        ...state.videoGeneration,
        tasks: state.videoGeneration.tasks.filter((task) => task.id !== taskId),
      },
    }));
    get().saveUserData();
  },

  addFontTask: (task) => {
    set((state) => ({ fontGeneration: { ...state.fontGeneration, tasks: [task, ...state.fontGeneration.tasks] } }));
    get().saveUserData();
  },

  updateFontTask: (taskId, updates) => {
    set((state) => ({
      fontGeneration: {
        ...state.fontGeneration,
        tasks: state.fontGeneration.tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates, updated_at: new Date().toISOString() } : task
        ),
      },
    }));
    get().saveUserData();
  },

  removeFontTask: (taskId) => {
    set((state) => ({
      fontGeneration: {
        ...state.fontGeneration,
        tasks: state.fontGeneration.tasks.filter((task) => task.id !== taskId),
      },
    }));
    get().saveUserData();
  },

  setApiKey: (apiKey) => {
    set({ apiKey });
    get().saveUserData();
  },

  setTheme: (theme) => {
    set({ theme });
    get().saveUserData();
  },

  setApiBaseUrl: (url) => {
    set({ apiBaseUrl: url });
    get().saveUserData();
  },
}));
