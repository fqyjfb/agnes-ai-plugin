import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Video, RefreshCw, Trash2, Copy, Download, History, Sparkles, Wand2, PanelLeft, PanelLeftClose, Edit3, FileText, Check, X, ChevronUp, ChevronDown, Image } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { chatCompletion, generateImage, createVideoTask } from '../services/agnesApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContextMenu } from '../components/ContextMenu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const MODEL_OPTIONS = [
  { value: 'agnes-image-2.0-flash', label: 'Agnes Image 2.0 Flash' },
  { value: 'agnes-image-2.1-flash', label: 'Agnes Image 2.1 Flash' },
];

const SIZE_OPTIONS = [
  { value: '512x512', label: '512 × 512' },
  { value: '1024x1024', label: '1024 × 1024' },
  { value: '1024x768', label: '1024 × 768' },
  { value: '768x1024', label: '768 × 1024' },
  { value: '1024x1536', label: '1024 × 1536' },
  { value: '1536x1024', label: '1536 × 1024' },
  { value: '1080x1920', label: '1080 × 1920' },
  { value: '1920x1080', label: '1920 × 1080' },
];

const CHAT_PRESETS = [
  { id: 'creative', name: '创意', temperature: 0.9, top_p: 0.9, max_tokens: 4096 },
  { id: 'balanced', name: '平衡', temperature: 0.7, top_p: 0.8, max_tokens: 4096 },
  { id: 'precise', name: '精准', temperature: 0.3, top_p: 0.5, max_tokens: 2048 },
  { id: 'coding', name: '编程', temperature: 0.2, top_p: 0.4, max_tokens: 8192 },
  { id: 'reasoning', name: '推理', temperature: 0.1, top_p: 0.3, max_tokens: 4096 },
];

const MAX_TOKENS_OPTIONS = [
  { value: 512, label: '512' },
  { value: 1024, label: '1K' },
  { value: 2048, label: '2K' },
  { value: 4096, label: '4K' },
  { value: 8192, label: '8K' },
];

const RESOLUTION_OPTIONS = [
  { value: '1152x768', label: '1152 × 768' },
  { value: '768x1152', label: '768 × 1152' },
  { value: '512x512', label: '512 × 512' },
];

const FRAME_RATE_OPTIONS = [
  { value: 24, label: '24 FPS' },
  { value: 30, label: '30 FPS' },
  { value: 60, label: '60 FPS' },
];

const FRAME_COUNT_OPTIONS = [
  { value: 81, label: '81 帧' },
  { value: 121, label: '121 帧' },
  { value: 161, label: '161 帧' },
  { value: 241, label: '241 帧' },
  { value: 441, label: '441 帧' },
];

const MODE_OPTIONS = [
  { value: 'text2vid', label: '文生视频', icon: Sparkles },
  { value: 'image2vid', label: '图生视频', icon: Image },
  { value: 'multi-image', label: '多图视频', icon: Image },
  { value: 'keyframes', label: '关键帧动画', icon: Video },
];

type ToolType = 'chat' | 'image' | 'video';

interface ToolOptions {
  imageModel: string;
  imageSize: string;
  imageSeed: string;
  negativePrompt: string;
  videoModel: string;
  videoResolution: string;
  videoFrameRate: number;
  videoFrameCount: number;
  videoSeed: string;
  videoMode: string;
}

export const AIChatPage: React.FC = () => {
  const {
    conversations,
    currentConversationId,
    messages,
    rolePresets,
    loadConversations,
    loadRolePresets,
    createConversation,
    setCurrentConversation,
    addMessage,
    updateMessage,
    deleteConversation,
    updateConversation,
    isLoading,
    setLoading,
    addImageTask,
    addVideoTask,
  } = useAgnesStore();

  const [inputValue, setInputValue] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolType>('chat');
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, { type: 'text' | 'markdown' | 'url'; value: boolean }>>({});
  const [thinkingExpanded, setThinkingExpanded] = useState<Record<string, boolean>>({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [activePreset, setActivePreset] = useState<string | null>('balanced');
  const [chatOptions, setChatOptions] = useState({
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 4096,
    enable_thinking: false,
  });

  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; conversationId?: string; type: 'conversation' | 'sidebar' }>({ isOpen: false, x: 0, y: 0, type: 'sidebar' });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');

  const [toolOptions, setToolOptions] = useState<ToolOptions>({
    imageModel: 'agnes-image-2.1-flash',
    imageSize: '1024x1024',
    imageSeed: '',
    negativePrompt: '',
    videoModel: 'agnes-video-v2.0',
    videoResolution: '1152x768',
    videoFrameRate: 24,
    videoFrameCount: 121,
    videoSeed: '',
    videoMode: 'text2vid',
  });

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoReferenceImages, setVideoReferenceImages] = useState<string[]>([]);
  const [videoImageUrlInput, setVideoImageUrlInput] = useState('');
  const [showRolePresetsModal, setShowRolePresetsModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadRolePresets();
  }, [loadConversations, loadRolePresets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const messageContent = content.trim();
    setInputValue('');
    setLoading(true);

    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await createConversation(messageContent.slice(0, 12) || '新对话');
      conversationId = conversation.id;
    }

    const userMessage = await addMessage(conversationId, { role: 'user', content: messageContent });

    try {
      switch (activeTool) {
        case 'image':
          await handleImageGeneration(conversationId, messageContent);
          break;
        case 'video':
          await handleVideoGeneration(conversationId, messageContent);
          break;
        default:
          await handleChatCompletion(conversationId, messageContent, userMessage);
          break;
      }
    } catch (error) {
      await addMessage(conversationId, { role: 'assistant', content: `错误: ${(error as Error).message}` });
    } finally {
      setLoading(false);
      setShowToolPanel(false);
      setReferenceImages([]);
    }
  };

  const handleChatCompletion = async (conversationId: string, content: string, userMessage: { role: string; content: string; id: string }) => {
    const conv = conversations.find((c) => c.id === conversationId);
    const rolePresetId = conv?.role_preset_id;
    const activePresetData = rolePresets.find((p) => p.preset_id === rolePresetId);

    let messagesWithUser: Array<{ role: string; content: string }> = conv
      ? [...conv.messages.map(m => ({ role: m.role, content: m.content })), { role: userMessage.role, content: userMessage.content }]
      : [{ role: userMessage.role, content: userMessage.content }];

    if (activePresetData && activePresetData.system_prompt && !conv?.messages.some((m) => m.role === 'system')) {
      messagesWithUser = [{ role: 'system', content: activePresetData.system_prompt }, ...messagesWithUser];
    }

    const response = await chatCompletion({
      messages: messagesWithUser,
      temperature: chatOptions.temperature,
      max_tokens: chatOptions.max_tokens,
      enable_thinking: chatOptions.enable_thinking,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let contentResult = '';
    let thinkingResult = '';
    let buffer = '';

    const assistantMessage = await addMessage(conversationId, { role: 'assistant', content: '', thinking: '' });

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
            const thinking = parsed.choices?.[0]?.delta?.reasoning_content || parsed.choices?.[0]?.message?.reasoning_content || '';
            if (text) {
              contentResult += text;
              await updateMessage(conversationId, assistantMessage.id, { content: contentResult, thinking: thinkingResult });
            }
            if (thinking) {
              thinkingResult += thinking;
              await updateMessage(conversationId, assistantMessage.id, { content: contentResult, thinking: thinkingResult });
            }
          } catch {
          }
        }
      }
      buffer = lines[lines.length - 1] || '';
    }

    if (!thinkingResult.trim()) {
      await updateMessage(conversationId, assistantMessage.id, { content: contentResult, thinking: undefined });
    }
  };

  const handleImageGeneration = async (conversationId: string, prompt: string) => {
    const extraBody: Record<string, unknown> = {};
    if (toolOptions.negativePrompt) {
      extraBody.negative_prompt = toolOptions.negativePrompt;
    }
    if (toolOptions.imageSeed) {
      extraBody.seed = parseInt(toolOptions.imageSeed, 10);
    }

    const response = await generateImage({
      prompt,
      model: toolOptions.imageModel,
      size: toolOptions.imageSize,
      ...extraBody,
    });

    if (response.image_url) {
      await addImageTask({
        user_id: '',
        task_id: response.task_id,
        prompt,
        model: toolOptions.imageModel,
        size: toolOptions.imageSize,
        seed: toolOptions.imageSeed ? parseInt(toolOptions.imageSeed) : undefined,
        negative_prompt: toolOptions.negativePrompt || undefined,
        status: response.status,
        image_url: response.image_url,
        source: 'chat',
      });

      await addMessage(conversationId, { role: 'assistant', content: `![生成的图像](${response.image_url})\n\n**提示词**: ${prompt}\n**尺寸**: ${toolOptions.imageSize}\n**模型**: ${MODEL_OPTIONS.find(m => m.value === toolOptions.imageModel)?.label}` });
    }
  };

  const handleVideoGeneration = async (conversationId: string, prompt: string) => {
    const [width, height] = toolOptions.videoResolution.split('x').map(Number);
    const payload: Record<string, unknown> = {
      width,
      height,
      num_frames: toolOptions.videoFrameCount,
      frame_rate: toolOptions.videoFrameRate,
    };

    if (toolOptions.negativePrompt) {
      payload.negative_prompt = toolOptions.negativePrompt;
    }
    if (toolOptions.videoSeed) {
      payload.seed = parseInt(toolOptions.videoSeed, 10);
    }
    if (videoReferenceImages.length > 0) {
      if (toolOptions.videoMode === 'image2vid') {
        payload.image = videoReferenceImages[0];
      } else if (toolOptions.videoMode === 'multi-image' || toolOptions.videoMode === 'keyframes') {
        payload.extra_body = {
          image: videoReferenceImages,
          ...(toolOptions.videoMode === 'keyframes' ? { mode: 'keyframes' } : {}),
        };
      }
    }

    const response = await createVideoTask({
      prompt,
      model: toolOptions.videoModel,
      ...payload,
    });

    await addVideoTask({
      user_id: '',
      task_id: response.task_id,
      prompt,
      model: toolOptions.videoModel,
      width,
      height,
      num_frames: toolOptions.videoFrameCount,
      frame_rate: toolOptions.videoFrameRate,
      status: response.status,
      progress: response.progress,
    });

    const duration = (toolOptions.videoFrameCount / toolOptions.videoFrameRate).toFixed(1);
    await addMessage(conversationId, { role: 'assistant', content: `🎬 **视频任务已创建**\n\n**提示词**: ${prompt}\n**状态**: ${response.status === 'queued' ? '排队中' : '处理中'}\n**分辨率**: ${toolOptions.videoResolution}\n**预计时长**: ${duration} 秒\n**帧数**: ${toolOptions.videoFrameCount}\n**帧率**: ${toolOptions.videoFrameRate} FPS` });
  };

  const handleRegenerate = async (messageId: string) => {
    if (!currentConversationId) return;
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;

    const messageIndex = conv.messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;

    const userMessage = conv.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    const messagesToDelete = conv.messages.slice(messageIndex);
    for (const msg of messagesToDelete) {
      await updateMessage(currentConversationId, msg.id, '', '', true);
    }

    setLoading(true);
    try {
      await handleSendMessage(userMessage.content);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (messageId: string, content: string) => {
    const plainText = content.replace(/!\[.*?\]\(([^)]+)\)/g, '$1').replace(/[*`#]/g, '');
    try {
      await navigator.clipboard.writeText(plainText);
      setCopiedStates(prev => ({ ...prev, [messageId]: { type: 'text', value: true } }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: { type: 'text', value: false } }));
      }, 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleCopyMarkdown = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates(prev => ({ ...prev, [messageId]: { type: 'markdown', value: true } }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: { type: 'markdown', value: false } }));
      }, 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      console.error('下载失败');
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessage(messageId);
    setEditingContent(content);
  };

  const handleSaveEdit = async () => {
    if (!editingMessage || !editingContent.trim() || !currentConversationId) return;

    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;

    const messageIndex = conv.messages.findIndex(m => m.id === editingMessage);
    if (messageIndex < 0) return;

    const messagesToDelete = conv.messages.slice(messageIndex);
    for (const msg of messagesToDelete) {
      await updateMessage(currentConversationId, msg.id, '', '', true);
    }

    setEditingMessage(null);
    setEditingContent('');
    setInputValue('');

    setLoading(true);
    try {
      await handleSendMessage(editingContent.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditingContent('');
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleConversationContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      conversationId,
      type: 'conversation',
    });
  };

  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      type: 'sidebar',
      conversationId: null,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu({
      isOpen: false,
      x: 0,
      y: 0,
      type: 'sidebar',
      conversationId: null,
    });
  };

  const handleRename = () => {
    if (!contextMenu.conversationId) return;
    const conv = conversations.find(c => c.id === contextMenu.conversationId);
    if (conv) {
      setRenamingConversationId(conv.id);
      setRenameTitle(conv.title);
      setShowRenameModal(true);
    }
    handleCloseContextMenu();
  };

  const handleConfirmRename = () => {
    if (!renamingConversationId || !renameTitle.trim()) return;
    updateConversation(renamingConversationId, { title: renameTitle.trim() });
    handleCloseContextMenu();
    setShowRenameModal(false);
    setRenamingConversationId(null);
    setRenameTitle('');
  };

  const handleDeleteFromContextMenu = () => {
    if (!contextMenu.conversationId) return;
    setConfirmDelete(contextMenu.conversationId);
    handleCloseContextMenu();
  };

  const handleToggleSidebarFromContextMenu = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    handleCloseContextMenu();
  };

  const handlePresetSelect = (preset: typeof CHAT_PRESETS[0]) => {
    setChatOptions(prev => ({
      ...prev,
      temperature: preset.temperature,
      top_p: preset.top_p,
      max_tokens: preset.max_tokens,
    }));
    setActivePreset(preset.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push(event.target?.result as string);
        if (newImages.length === fileArray.length) {
          setReferenceImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddImageUrl = () => {
    const trimmedUrl = imageUrlInput.trim();
    if (!trimmedUrl) return;
    setReferenceImages(prev => [...prev, trimmedUrl]);
    setImageUrlInput('');
  };

  const handleVideoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    const limit = toolOptions.videoMode === 'keyframes' || toolOptions.videoMode === 'multi-image' ? 4 : 1;
    const fileArray = Array.from(files).slice(0, limit - videoReferenceImages.length);

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newImages.push(event.target?.result as string);
        if (newImages.length === fileArray.length) {
          setVideoReferenceImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeVideoReferenceImage = (index: number) => {
    setVideoReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVideoImageUrl = () => {
    const trimmedUrl = videoImageUrlInput.trim();
    if (!trimmedUrl) return;
    const limit = toolOptions.videoMode === 'keyframes' || toolOptions.videoMode === 'multi-image' ? 4 : 1;
    if (videoReferenceImages.length >= limit) {
      return;
    }
    setVideoReferenceImages(prev => [...prev, trimmedUrl]);
    setVideoImageUrlInput('');
  };

  const handleSelectRolePreset = async (presetId: string) => {
    const preset = rolePresets.find(p => p.preset_id === presetId);
    if (!preset) return;
    const conversation = await createConversation(preset.name, presetId);
    setCurrentConversation(conversation.id);
    setShowRolePresetsModal(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      <div
        className={`flex flex-col bg-white dark:bg-gray-800 transition-all duration-300 min-h-0 overflow-hidden flex-shrink-0 ${
          sidebarCollapsed ? 'w-12' : 'w-[160px]'
        }`}
        onContextMenu={handleSidebarContextMenu}
      >
        <div className="p-2 flex items-center justify-between">
          {!sidebarCollapsed && (
            <>
              <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200">对话</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {}}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  title="历史记录"
                >
                  <History className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowRolePresetsModal(true)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  title="角色预设"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => createConversation('新对话')}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                  title="新对话"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
          {sidebarCollapsed && (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => createConversation('新对话')}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                title="新对话"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className={`p-3 text-center ${sidebarCollapsed ? 'hidden' : ''}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">暂无对话</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv.id)}
                  onContextMenu={(e) => handleConversationContextMenu(e, conv.id)}
                  className={`relative cursor-pointer transition-colors group ${
                    currentConversationId === conv.id
                      ? 'bg-green-500/10 text-green-500'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  } ${sidebarCollapsed ? 'p-1.5 flex justify-center' : 'p-2'}`}
                  title={sidebarCollapsed ? conv.title : undefined}
                >
                  {sidebarCollapsed ? (
                    <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium truncate">
                      {conv.title.charAt(0)}
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-xs">{conv.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {conv.messages?.length ? conv.messages[conv.messages.length - 1]?.content.slice(0, 25) : '无消息'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(conv.id);
                        }}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除对话"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleToggleSidebar}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center border-t border-gray-200 dark:border-gray-700"
          title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          ) : (
            <PanelLeftClose className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-w-0 min-h-0 overflow-hidden">
        {currentConversationId ? (
          <>
            <div className="flex-1 overflow-y-auto p-2">
              <div className="max-w-4xl mx-auto">
                {messages.map((message) => {
                  const mediaUrlMatch = message.content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
                  const mediaUrl = mediaUrlMatch ? mediaUrlMatch[1] : undefined;
                  const isUser = message.role === 'user';
                  const copiedState = copiedStates[message.id];

                  if (isUser) {
                    return (
                      <div key={message.id} className="flex justify-end mb-2">
                        <div className="max-w-[75%]">
                          {editingMessage === message.id ? (
                            <div className="px-2 py-1.5 rounded-lg shadow-sm bg-green-500 rounded-tr-md">
                              <textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="w-full bg-transparent text-white text-xs resize-none outline-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-1.5 mt-1.5">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2 py-0.5 text-[10px] text-white/70 hover:text-white"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-2 py-0.5 text-[10px] bg-white/20 rounded hover:bg-white/30 text-white"
                                >
                                  保存
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="px-2 py-1.5 rounded-lg shadow-sm bg-green-500 text-white rounded-tr-md break-words">
                              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {new Date(message.created_at || Date.now()).toLocaleTimeString('zh-CN')}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleCopy(message.id, message.content)}
                                className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
                                  copiedState?.type === 'text' && copiedState.value
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                title="复制"
                              >
                                {copiedState?.type === 'text' && copiedState.value ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleEditMessage(message.id, message.content)}
                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                                title="修改"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className="flex justify-start mb-2">
                      <div className="w-full">
                        <div className="px-2 py-1.5 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-md break-words">
                          {message.thinking && (
                            <div className="mb-1.5">
                              <button
                                onClick={() => setThinkingExpanded(prev => ({ ...prev, [message.id]: !prev[message.id] }))}
                                className="flex items-center gap-1 px-1.5 py-1 bg-green-50 dark:bg-green-900/20 rounded-md text-[10px] text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors w-full"
                              >
                                <span className="font-medium">思考过程</span>
                                <span className="flex-1"></span>
                                {thinkingExpanded[message.id] ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>
                              {thinkingExpanded[message.id] && (
                                <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-md mt-0.5">
                                  <p className="text-[10px] text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">
                                    {message.thinking}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => (
                                <p className="text-xs leading-relaxed mb-1.5 last:mb-0">{children}</p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-gray-800 dark:text-gray-200">{children}</strong>
                              ),
                              code: ({ className, children }) => {
                                const content = String(children);
                                const isBlock = className !== undefined || content.includes('\n');
                                if (isBlock) {
                                  return (
                                    <div className="overflow-x-auto">
                                      <div className="relative my-1.5">
                                        <div className="flex items-center justify-between px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-t-md border-b border-gray-300 dark:border-gray-600">
                                          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">代码</span>
                                          <button
                                            onClick={() => navigator.clipboard.writeText(content)}
                                            className="flex items-center justify-center rounded transition-all text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                            title="复制代码"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <pre className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 text-xs break-all whitespace-pre-wrap rounded-b-md">
                                          <code>{children}</code>
                                        </pre>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <code className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-xs font-mono break-all">
                                    {children}
                                  </code>
                                );
                              },
                              a: ({ href, children }) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">
                                  {children}
                                </a>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside mb-1.5 space-y-0.5 break-words">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside mb-1.5 space-y-0.5 break-words">{children}</ol>
                              ),
                              li: ({ children }) => <li className="text-xs break-words">{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-3 border-green-500 pl-3 italic text-gray-600 dark:text-gray-400 my-1.5 break-words">
                                  {children}
                                </blockquote>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold mb-1.5 text-gray-800 dark:text-gray-200">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold mb-1.5 text-gray-800 dark:text-gray-200">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-bold mb-1.5 text-gray-800 dark:text-gray-200">{children}</h3>
                              ),
                              hr: () => <hr className="border-gray-200 dark:border-gray-700 my-3" />,
                              img: ({ src, alt }) => (
                                <span className="inline-block my-1.5 cursor-pointer">
                                  <img
                                    src={src}
                                    alt={alt}
                                    className="max-w-xs max-h-[160px] rounded-md shadow-sm border border-gray-200 dark:border-gray-700 object-contain hover:opacity-90 transition-opacity"
                                    onClick={() => {
                                      setPreviewImageUrl(src || '');
                                      setShowImageModal(true);
                                    }}
                                  />
                                </span>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 justify-start">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {new Date(message.created_at || Date.now()).toLocaleTimeString('zh-CN')}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleCopyMarkdown(message.id, message.content)}
                              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
                                copiedState?.type === 'markdown' && copiedState.value
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title="复制Markdown"
                            >
                              {copiedState?.type === 'markdown' && copiedState.value ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <FileText className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopy(message.id, message.content)}
                              className={`w-6 h-6 flex items-center justify-center rounded-md transition-all duration-200 ${
                                copiedState?.type === 'text' && copiedState.value
                                  ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title="复制文本"
                            >
                              {copiedState?.type === 'text' && copiedState.value ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            {mediaUrl && (
                              <>
                                <button
                                  onClick={() => handleDownload(mediaUrl)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                                  title="下载"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleRegenerate(message.id)}
                              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200"
                              title="重新生成"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {showImageModal && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                  onClick={() => setShowImageModal(false)}
                >
                  <button
                    className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                    onClick={() => setShowImageModal(false)}
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <img
                    src={previewImageUrl}
                    alt="Preview"
                    className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>

            {showToolPanel && (activeTool === 'image' || activeTool === 'video') && (
              <div className="bg-white dark:bg-gray-800">
                {(activeTool === 'image' && referenceImages.length > 0) && (
                  <div className="flex items-center gap-2 px-3 pt-3">
                    {referenceImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`参考图 ${index + 1}`}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {(activeTool === 'video' && videoReferenceImages.length > 0) && (
                  <div className="flex items-center gap-2 px-3 pt-3">
                    {videoReferenceImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`参考图 ${index + 1}`}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                        />
                        <button
                          onClick={() => removeVideoReferenceImage(index)}
                          className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-1.5 bg-white dark:bg-gray-800">
              <div className="max-w-4xl mx-auto">
                <div className="rounded-lg bg-gray-100 dark:bg-gray-700 shadow-sm">
                  <div className="flex items-center gap-0.5 px-2 py-0.5">
                    <button
                      onClick={() => {
                        setActiveTool('chat');
                        setShowToolPanel(false);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        activeTool === 'chat'
                          ? 'bg-green-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Send className="w-2.5 h-2.5" />
                      <span>聊天</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTool('image');
                        setShowToolPanel(true);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        activeTool === 'image'
                          ? 'bg-green-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Image className="w-2.5 h-2.5" />
                      <span>图像</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTool('video');
                        setShowToolPanel(true);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                        activeTool === 'video'
                          ? 'bg-green-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Video className="w-2.5 h-2.5" />
                      <span>视频</span>
                    </button>
                  </div>

                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      activeTool === 'image'
                        ? '输入图像描述...'
                        : activeTool === 'video'
                        ? '输入视频描述...'
                        : '输入消息...'
                    }
                    disabled={isLoading}
                    className="w-full px-3 py-2 resize-none focus:outline-none text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 bg-transparent min-h-[40px] max-h-[100px]"
                  />

                  <div className="flex items-center justify-between px-2 py-1.5">
                    <div className="flex items-center gap-0.5 flex-1 overflow-x-auto">
                      {activeTool === 'chat' && (
                        <>
                          {CHAT_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => handlePresetSelect(preset)}
                              className={`px-1.5 py-0.5 rounded-md text-[10px] transition-all flex-shrink-0 ${
                                activePreset === preset.id
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                              }`}
                            >
                              {preset.name}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setChatOptions(prev => ({ ...prev, enable_thinking: !prev.enable_thinking }));
                              setActivePreset(null);
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded-md transition-all flex-shrink-0 ${
                              chatOptions.enable_thinking
                                ? 'bg-green-500 text-white'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            title="思考模式"
                          >
                            <Wand2 className="w-3 h-3" />
                          </button>
                          <select
                            value={chatOptions.max_tokens}
                            onChange={(e) => {
                              setChatOptions(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }));
                              setActivePreset(null);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {MAX_TOKENS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      {activeTool === 'image' && (
                        <>
                          <label className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex-shrink-0">
                            <Plus className="w-3 h-3" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              multiple
                            />
                          </label>
                          <input
                            type="text"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                            placeholder="URL"
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 w-16 flex-shrink-0"
                          />
                          <select
                            value={toolOptions.imageModel}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, imageModel: e.target.value }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {MODEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={toolOptions.imageSize}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, imageSize: e.target.value }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {SIZE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={toolOptions.imageSeed}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, imageSeed: e.target.value }))}
                            placeholder="种子"
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 w-14 flex-shrink-0"
                          />
                        </>
                      )}
                      {activeTool === 'video' && (
                        <>
                          <div className="flex items-center gap-0.5 border border-gray-300 dark:border-gray-600 rounded-md p-0.5 flex-shrink-0">
                            {MODE_OPTIONS.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => {
                                  setToolOptions(prev => ({ ...prev, videoMode: mode.value }));
                                  setVideoReferenceImages([]);
                                }}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                                  toolOptions.videoMode === mode.value
                                    ? 'bg-green-500 text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                <mode.icon className="w-3 h-3" />
                                {mode.label}
                              </button>
                            ))}
                          </div>
                          {(toolOptions.videoMode === 'image2vid' || toolOptions.videoMode === 'multi-image' || toolOptions.videoMode === 'keyframes') && (
                            <>
                              <label className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex-shrink-0">
                                <Plus className="w-3 h-3" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleVideoImageUpload}
                                  className="hidden"
                                  multiple={toolOptions.videoMode === 'multi-image' || toolOptions.videoMode === 'keyframes'}
                                />
                              </label>
                              <input
                                type="text"
                                value={videoImageUrlInput}
                                onChange={(e) => setVideoImageUrlInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddVideoImageUrl()}
                                placeholder="URL"
                                className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 w-16 flex-shrink-0"
                              />
                            </>
                          )}
                          <select
                            value={toolOptions.videoResolution}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, videoResolution: e.target.value }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {RESOLUTION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={toolOptions.videoFrameRate}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, videoFrameRate: parseInt(e.target.value) }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {FRAME_RATE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            value={toolOptions.videoFrameCount}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, videoFrameCount: parseInt(e.target.value) }))}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 flex-shrink-0"
                          >
                            {FRAME_COUNT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            value={toolOptions.videoSeed}
                            onChange={(e) => setToolOptions(prev => ({ ...prev, videoSeed: e.target.value }))}
                            placeholder="种子"
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500 w-14 flex-shrink-0"
                          />
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => handleSendMessage(inputValue)}
                      disabled={!inputValue.trim() || isLoading}
                      className="p-2 bg-green-500 text-white rounded-md hover:bg-green-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-10 h-10 mx-auto text-green-500/60 mb-4" />
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">开始对话</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">创建新对话开始</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="确认删除"
        message="确定要删除这个对话吗？此操作不可撤销。"
        onConfirm={() => {
          if (confirmDelete) {
            deleteConversation(confirmDelete);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ContextMenu
        isOpen={contextMenu.isOpen}
        items={contextMenu.type === 'conversation'
          ? [
              { id: 'rename', label: '重命名', icon: <Edit3 className="w-3 h-3" />, onClick: handleRename },
              { id: 'delete', label: '删除', icon: <Trash2 className="w-3 h-3" />, onClick: handleDeleteFromContextMenu, className: 'text-red-500' },
              { id: 'divider', separator: true },
              { id: 'toggleSidebar', label: sidebarCollapsed ? '展开' : '折叠', icon: sidebarCollapsed ? <PanelLeft className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />, onClick: handleToggleSidebarFromContextMenu },
            ]
          : [
              { id: 'toggleSidebar', label: sidebarCollapsed ? '展开' : '折叠', icon: sidebarCollapsed ? <PanelLeft className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />, onClick: handleToggleSidebarFromContextMenu },
            ]}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={handleCloseContextMenu}
      />

      <Modal
        isOpen={showRenameModal}
        onClose={() => { setShowRenameModal(false); setRenamingConversationId(null); setRenameTitle(''); }}
        title="重命名对话"
      >
        <div className="p-4">
          <input
            type="text"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-green-500"
            placeholder="输入对话标题"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => { setShowRenameModal(false); setRenamingConversationId(null); setRenameTitle(''); }}
              className="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              取消
            </button>
            <button
              onClick={handleConfirmRename}
              disabled={!renameTitle.trim()}
              className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-md hover:bg-green-500/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确定
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showRolePresetsModal}
        onClose={() => setShowRolePresetsModal(false)}
        title="选择角色预设"
      >
        <div className="p-4">
          <div className="grid gap-2">
            {rolePresets.map((preset) => (
              <button
                key={preset.preset_id}
                onClick={() => handleSelectRolePreset(preset.preset_id)}
                className="w-full p-3 text-left rounded-md border border-gray-200 dark:border-gray-600 hover:border-green-500 hover:bg-green-500/5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{preset.name}</span>
                  {preset.is_system && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      系统预设
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
                )}
              </button>
            ))}
          </div>
          {rolePresets.length === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">暂无角色预设</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};