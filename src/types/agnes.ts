export interface AIConversation {
  id: string;
  user_id: string;
  title: string;
  role_preset_id?: string;
  messages?: AIMessage[];
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  user_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  created_at: string;
  updated_at: string;
}

export interface RolePreset {
  id: string;
  user_id?: string;
  preset_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  format?: string;
  icon?: string;
  is_default: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ImageGenerationTask {
  id: string;
  user_id: string;
  task_id: string;
  prompt: string;
  model: string;
  size: string;
  image_url?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoGenerationTask {
  id: string;
  user_id: string;
  task_id: string;
  prompt: string;
  model: string;
  width: number;
  height: number;
  duration: number;
  video_url?: string;
  status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AgnesConfig {
  id: string;
  user_id: string;
  api_key: string;
  theme: 'light' | 'dark';
  api_base_url: string;
  created_at: string;
  updated_at: string;
}

export interface ImageGenerationResponse {
  task_id: string;
  image_url?: string;
  status: string;
}

export interface VideoGenerationResponse {
  task_id: string;
  video_url?: string;
  status: string;
  progress?: number;
  error_message?: string;
}

export type Conversation = AIConversation;
export type Message = AIMessage;