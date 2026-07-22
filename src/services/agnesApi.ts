import { AgnesLocalStorage } from './agnesLocalStorage';
import { log, error } from '../utils/logger';

const DEFAULT_API_BASE = 'https://api.agnesai.com';

async function getApiBaseUrl(): Promise<string> {
  const config = AgnesLocalStorage.getConfig();
  return config?.api_base_url || DEFAULT_API_BASE;
}

async function getApiKey(): Promise<string> {
  const config = AgnesLocalStorage.getConfig();
  return config?.api_key || '';
}

async function getHeaders(): Promise<HeadersInit> {
  const apiKey = await getApiKey();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

export interface ChatCompletionRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  enable_thinking?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  content: string;
  thinking?: string;
  created_at: string;
}

export interface GenerateImageRequest {
  prompt: string;
  model: string;
  size: string;
  seed?: number;
  negative_prompt?: string;
  reference_images?: string[];
}

export interface GenerateImageResponse {
  task_id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  image_url?: string;
  error_message?: string;
}

export interface CreateVideoTaskRequest {
  prompt: string;
  model: string;
  width: number;
  height: number;
  num_frames: number;
  frame_rate: number;
  seed?: number;
  negative_prompt?: string;
  reference_images?: string[];
}

export interface CreateVideoTaskResponse {
  task_id: string;
  status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed';
  progress: number;
}

export interface GetVideoTaskResponse {
  task_id: string;
  status: 'pending' | 'queued' | 'running' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  video_url?: string;
  error_message?: string;
}

export async function chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling chat completion API', { prompt: request.messages[request.messages.length - 1]?.content?.slice(0, 50) });
  
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Chat completion failed: ${response.status}`);
  }
  
  return response.json();
}

export async function generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling image generation API', { prompt: request.prompt.slice(0, 50) });
  
  const response = await fetch(`${baseUrl}/v1/images/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Image generation failed: ${response.status}`);
  }
  
  return response.json();
}

export async function createVideoTask(request: CreateVideoTaskRequest): Promise<CreateVideoTaskResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling video creation API', { prompt: request.prompt.slice(0, 50) });
  
  const response = await fetch(`${baseUrl}/v1/videos/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Video creation failed: ${response.status}`);
  }
  
  return response.json();
}

export async function getVideoTask(taskId: string): Promise<GetVideoTaskResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling video task status API', { taskId });
  
  const response = await fetch(`${baseUrl}/v1/videos/${taskId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Video task status failed: ${response.status}`);
  }
  
  return response.json();
}

export async function generateFontImage(request: {
  prompt: string;
  text_content: string;
  size: string;
  background_color: string;
  seed?: number;
  negative_prompt?: string;
}): Promise<GenerateImageResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling font image generation API', { text: request.text_content });
  
  const response = await fetch(`${baseUrl}/v1/images/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: request.prompt,
      model: 'flux',
      size: request.size,
      seed: request.seed,
      negative_prompt: request.negative_prompt,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Font generation failed: ${response.status}`);
  }
  
  return response.json();
}

export async function checkApiKey(): Promise<{ valid: boolean; message: string }> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }),
    });
    
    if (response.ok) {
      return { valid: true, message: 'API key is valid' };
    }
    
    const errorData = await response.json().catch(() => ({}));
    return { valid: false, message: errorData.message || 'Invalid API key' };
  } catch (err) {
    error('API key check failed', err);
    return { valid: false, message: 'Failed to connect to API' };
  }
}