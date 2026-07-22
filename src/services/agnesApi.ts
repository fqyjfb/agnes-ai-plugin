import { AgnesLocalStorage } from './agnesLocalStorage';
import { log, error } from '../utils/logger';

const DEFAULT_API_BASE = 'https://apihub.agnes-ai.com/v1';

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
  model?: string;
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

export async function chatCompletion(request: ChatCompletionRequest): Promise<Response> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling chat completion API', { prompt: request.messages[request.messages.length - 1]?.content?.slice(0, 50) });
  
  const body: Record<string, unknown> = {
    model: request.model || 'agnes-2.0-flash',
    messages: request.messages,
    stream: true,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
  };

  if (request.enable_thinking) {
    body.chat_template_kwargs = { enable_thinking: true };
  }
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Chat completion failed: ${response.status}`);
  }
  
  return response;
}

export async function generateImage(request: GenerateImageRequest): Promise<GenerateImageResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling image generation API', { prompt: request.prompt.slice(0, 50) });
  
  const payload: Record<string, unknown> = {
    model: request.model,
    prompt: request.prompt,
    size: request.size,
    extra_body: {
      response_format: 'url',
    },
  };

  if (request.negative_prompt) {
    payload.extra_body = {
      ...payload.extra_body as Record<string, unknown>,
      negative_prompt: request.negative_prompt,
    };
  }

  if (request.seed) {
    payload.seed = request.seed;
  }

  if (request.reference_images && request.reference_images.length > 0) {
    payload.tags = ['img2img'];
    payload.extra_body = {
      ...payload.extra_body as Record<string, unknown>,
      image: request.reference_images,
    };
  }
  
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Image generation failed: ${response.status}`);
  }
  
  const result = await response.json();
  return {
    task_id: result.id || '',
    status: 'completed',
    image_url: result.data?.[0]?.url,
  };
}

export async function createVideoTask(request: CreateVideoTaskRequest): Promise<CreateVideoTaskResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling video creation API', { prompt: request.prompt.slice(0, 50) });
  
  const payload: Record<string, unknown> = {
    model: request.model,
    prompt: request.prompt,
    height: request.height,
    width: request.width,
    num_frames: request.num_frames,
    frame_rate: request.frame_rate,
  };

  if (request.negative_prompt) {
    payload.negative_prompt = request.negative_prompt;
  }

  if (request.seed) {
    payload.seed = request.seed;
  }

  if (request.reference_images && request.reference_images.length > 0) {
    payload.image = request.reference_images;
  }
  
  const response = await fetch(`${baseUrl}/videos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Video creation failed: ${response.status}`);
  }
  
  const result = await response.json();
  return {
    task_id: result.task_id || result.id,
    status: (result.status || 'queued') as CreateVideoTaskResponse['status'],
    progress: result.progress || 0,
  };
}

export async function getVideoTask(taskId: string): Promise<GetVideoTaskResponse> {
  const baseUrl = await getApiBaseUrl();
  const headers = await getHeaders();
  
  log('Calling video task status API', { taskId });
  
  const response = await fetch(`${baseUrl}/videos/${taskId}`, {
    method: 'GET',
    headers,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Video task status failed: ${response.status}`);
  }
  
  const result = await response.json();
  return {
    task_id: result.task_id || taskId,
    status: (result.status || 'unknown') as GetVideoTaskResponse['status'],
    progress: result.progress || 0,
    video_url: result.video_url || result.data?.url,
    error_message: result.error,
  };
}

export async function checkApiKey(apiKey?: string): Promise<{ valid: boolean; message: string }> {
  const baseUrl = await getApiBaseUrl();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const keyToUse = apiKey || await getApiKey();
  if (keyToUse) {
    headers['Authorization'] = `Bearer ${keyToUse}`;
  }
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'agnes-2.0-flash',
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