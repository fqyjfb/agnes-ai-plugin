import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Conversation, Message, VideoTask, FontGenerationTask, RolePreset, ImageResult } from '../types/agnes';

interface AgnesState {
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

  addMessage: (conversationId: string, message: Message) => void;
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
    id: 'system-1',
    preset_id: 'system-default',
    name: '默认',
    description: '通用对话助手',
    system_prompt: '你是一个通用AI助手，帮助用户解答问题、提供建议。',
    icon: 'MessageSquare',
    is_default: true,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'system-2',
    preset_id: 'system-creative',
    name: '创意伙伴',
    description: '激发创意灵感',
    system_prompt: '你是一个创意伙伴，善于激发灵感、提供新颖想法。',
    icon: 'Lightbulb',
    is_default: false,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'system-3',
    preset_id: 'system-writer',
    name: '文案专家',
    description: '专业文案写作',
    system_prompt: '你是一个专业文案专家，擅长撰写各类文案内容。',
    icon: 'FileText',
    is_default: false,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'system-4',
    preset_id: 'system-coder',
    name: '代码助手',
    description: '编程问题解答',
    system_prompt: '你是一个编程专家，帮助用户解决编程问题、提供代码建议。',
    icon: 'Code',
    is_default: false,
    is_system: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const useAgnesStore = create<AgnesState>()(
  persist(
    (set, get) => ({
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

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [...conv.messages, message], updated_at: new Date().toISOString() }
              : conv
          ),
        }));
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
      },

      createConversation: (title, rolePresetId = null) => {
        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          user_id: 'local-user',
          title,
          role_preset_id: rolePresetId,
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: newConversation.id,
        }));
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
      },

      updateConversationTitle: (conversationId, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, title, updated_at: new Date().toISOString() } : conv
          ),
        }));
      },

      addRolePreset: (preset) => {
        const newPreset: RolePreset = {
          ...preset,
          id: `preset-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({ rolePresets: [...state.rolePresets, newPreset] }));
      },

      updateRolePreset: (presetId, updates) => {
        set((state) => ({
          rolePresets: state.rolePresets.map((preset) =>
            preset.id === presetId ? { ...preset, ...updates, updated_at: new Date().toISOString() } : preset
          ),
        }));
      },

      deleteRolePreset: (presetId) => {
        set((state) => ({
          rolePresets: state.rolePresets.filter((preset) => preset.id !== presetId),
          activeRolePresetId: state.activeRolePresetId === presetId ? null : state.activeRolePresetId,
        }));
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
      },

      removeImageFromHistory: (id) => {
        set((state) => ({
          imageGeneration: {
            ...state.imageGeneration,
            history: state.imageGeneration.history.filter((img) => img.id !== id),
          },
        }));
      },

      clearImageHistory: () => {
        set((state) => ({ imageGeneration: { ...state.imageGeneration, history: [] } }));
      },

      addVideoTask: (task) => {
        set((state) => ({ videoGeneration: { ...state.videoGeneration, tasks: [task, ...state.videoGeneration.tasks] } }));
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
      },

      removeVideoTask: (taskId) => {
        set((state) => ({
          videoGeneration: {
            ...state.videoGeneration,
            tasks: state.videoGeneration.tasks.filter((task) => task.id !== taskId),
          },
        }));
      },

      addFontTask: (task) => {
        set((state) => ({ fontGeneration: { ...state.fontGeneration, tasks: [task, ...state.fontGeneration.tasks] } }));
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
      },

      removeFontTask: (taskId) => {
        set((state) => ({
          fontGeneration: {
            ...state.fontGeneration,
            tasks: state.fontGeneration.tasks.filter((task) => task.id !== taskId),
          },
        }));
      },

      setApiKey: (apiKey) => {
        set({ apiKey });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      setApiBaseUrl: (url) => {
        set({ apiBaseUrl: url });
      },
    }),
    {
      name: 'agnes-store',
    }
  )
);