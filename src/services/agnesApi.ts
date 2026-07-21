import { useAgnesStore } from '../store/agnesStore';
import { ImageResult, ChatCompletionOptions, VideoTask, FontGenerationTask } from '../types/agnes';

export interface GenerateImageOptions {
  model?: string;
  size?: string;
  seed?: number;
  negative_prompt?: string;
  reference_images?: string[];
  response_format?: string;
}

export interface GenerateVideoOptions {
  width?: number;
  height?: number;
  num_frames?: number;
  frame_rate?: number;
  seed?: number;
  negative_prompt?: string;
  reference_images?: string[];
}

export interface GenerateFontOptions {
  size?: string;
  background_color?: string;
  seed?: number;
  negative_prompt?: string;
}

function getApiKey(): string {
  return useAgnesStore.getState().apiKey;
}

function getApiBaseUrl(): string {
  return useAgnesStore.getState().apiBaseUrl;
}

async function request(url: string, options: RequestInit): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先配置 Agnes AI API Key');
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/v1${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `请求失败: ${response.status}`);
  }

  return response;
}

export async function generateImage(
  prompt: string,
  model: string = 'agnes-image-2.1-flash',
  size: string = '1024x1024',
  options: GenerateImageOptions = {}
): Promise<{ url: string }> {
  const response = await request('/images/generations', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      model,
      size,
      extra_body: {
        response_format: 'url',
        ...options,
      },
    }),
  });

  const data = await response.json();
  return { url: data.data[0].url };
}

export async function generateFont(
  text: string,
  fontStyleId: string,
  options: GenerateFontOptions = {}
): Promise<{ url: string }> {
  const response = await request('/v1/font/generate', {
    method: 'POST',
    body: JSON.stringify({
      text,
      font_style_id: fontStyleId,
      ...options,
    }),
  });

  const data = await response.json();
  return { url: data.data.url };
}

export async function generateVideo(
  prompt: string,
  options: GenerateVideoOptions = {}
): Promise<{ task_id: string }> {
  const response = await request('/v1/videos/generations', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      ...options,
    }),
  });

  const data = await response.json();
  return { task_id: data.task_id };
}

export async function getVideoTaskStatus(taskId: string): Promise<{
  status: VideoTask['status'];
  progress: number;
  video_url?: string;
}> {
  const response = await request(`/v1/videos/generations/${taskId}`, {
    method: 'GET',
  });

  const data = await response.json();
  return {
    status: data.status,
    progress: data.progress,
    video_url: data.video_url,
  };
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  options: ChatCompletionOptions = {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2048,
    enable_thinking: false,
  }
): Promise<{ content: string; thinking?: string }> {
  const response = await request('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      model: 'agnes-ai-1.0',
      messages,
      stream: false,
      ...options,
    }),
  });

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    thinking: data.choices[0].message.thinking,
  };
}

export async function createChatCompletion(
  messages: { role: string; content: string }[],
  options: ChatCompletionOptions = {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096,
    enable_thinking: false,
  }
): Promise<Response> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('请先配置 Agnes AI API Key');
  }

  const baseUrl = getApiBaseUrl();
  return fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'agnes-ai-1.0',
      messages,
      stream: true,
      ...options,
    }),
  });
}

export async function createFontGenerationTask(
  userId: string,
  textContent: string,
  fontStyleId: string,
  prompt: string,
  size: string,
  backgroundColor: string,
  seed?: number,
  negativePrompt?: string
): Promise<FontGenerationTask> {
  const response = await request('/v1/font/generate', {
    method: 'POST',
    body: JSON.stringify({
      text: textContent,
      font_style_id: fontStyleId,
      size,
      background_color: backgroundColor,
      seed,
      negative_prompt: negativePrompt,
    }),
  });

  const data = await response.json();
  return {
    id: `font-task-${Date.now()}`,
    user_id: userId,
    task_id: data.task_id || data.id,
    font_style_id: fontStyleId,
    text_content: textContent,
    prompt,
    size,
    background_color: backgroundColor,
    seed,
    negative_prompt: negativePrompt,
    image_url: data.data?.url,
    status: data.data?.url ? 'completed' : 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getFontTaskStatus(taskId: string): Promise<{
  status: FontGenerationTask['status'];
  image_url?: string;
}> {
  const response = await request(`/v1/font/generate/${taskId}`, {
    method: 'GET',
  });

  const data = await response.json();
  return {
    status: data.status,
    image_url: data.data?.url,
  };
}