import React, { useState, useRef, useEffect } from 'react';
import { Send, Image, Video, Plus, Menu, X, Trash2, Sparkles, Wand2, RefreshCw, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAgnesStore } from '../store/agnesStore';
import { createChatCompletion, generateImage, generateVideo } from '../services/agnesApi';
import { Message, Conversation, RolePreset } from '../types/agnes';
import { Modal } from '../components/Modal';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface AIChatPageProps {
  onNavigate: (page: string) => void;
  userId?: string;
}

export function AIChatPage({ onNavigate, userId = 'local-user' }: AIChatPageProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRolePresets, setShowRolePresets] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [videoSize, setVideoSize] = useState('1024x1024');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; prompt: string; size: string; model: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations,
    activeConversationId,
    rolePresets,
    activeRolePresetId,
    addMessage,
    updateMessage,
    createConversation,
    setActiveConversation,
    deleteConversation,
    updateConversationTitle,
    setActiveRolePreset,
    addImageToHistory,
    addVideoTask,
    apiKey,
  } = useAgnesStore();

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversation(conversations[0].id);
    }
  }, [conversations, activeConversationId, setActiveConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !apiKey || isLoading) return;

    setIsLoading(true);

    if (!activeConversation) {
      createConversation(content.substring(0, 20) || '新对话');
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    addMessage(activeConversationId!, userMessage);
    scrollToBottom();

    try {
      const conv = conversations.find((c) => c.id === activeConversationId);
      const rolePresetId = conv?.role_preset_id || activeRolePresetId;
      const activePresetData = rolePresets.find((p) => p.id === rolePresetId);

      let messagesWithUser: Array<{ role: string; content: string }> = conv
        ? [...conv.messages.map(m => ({ role: m.role, content: m.content })), { role: userMessage.role, content: userMessage.content }]
        : [{ role: userMessage.role, content: userMessage.content }];

      if (activePresetData && activePresetData.system_prompt && !conv?.messages.some((m) => m.role === 'system')) {
        messagesWithUser = [{ role: 'system', content: activePresetData.system_prompt }, ...messagesWithUser];
      }

      const response = await createChatCompletion(messagesWithUser);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorBody}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let contentResult = '';
      let thinkingResult = '';
      let buffer = '';

      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '',
        thinking: '',
        created_at: new Date().toISOString(),
      };
      addMessage(activeConversationId!, assistantMessage);

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
                updateMessage(activeConversationId!, assistantMessage.id, contentResult, thinkingResult);
                scrollToBottom();
              }
              if (thinking) {
                thinkingResult += thinking;
                updateMessage(activeConversationId!, assistantMessage.id, contentResult, thinkingResult);
                scrollToBottom();
              }
            } catch {
              // Skip incomplete JSON
            }
          }
        }
        buffer = lines[lines.length - 1] || '';
      }

      if (!thinkingResult.trim()) {
        updateMessage(activeConversationId!, assistantMessage.id, contentResult, undefined);
      }

      if (activeConversation) {
        updateConversationTitle(activeConversationId!, content.substring(0, 30) || '新对话');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: '抱歉，请求失败，请稍后重试。',
        created_at: new Date().toISOString(),
      };
      addMessage(activeConversationId!, errorMessage);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (!apiKey || isLoading) return;

    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;

    const messageIndex = conv.messages.findIndex((m) => m.id === messageId);
    if (messageIndex <= 0) return;

    const userMessage = conv.messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    setIsLoading(true);

    try {
      const rolePresetId = conv.role_preset_id || activeRolePresetId;
      const activePresetData = rolePresets.find((p) => p.id === rolePresetId);

      let messagesWithUser: Array<{ role: string; content: string }> = conv.messages
        .slice(0, messageIndex)
        .map(m => ({ role: m.role, content: m.content }));

      if (activePresetData && activePresetData.system_prompt && !conv.messages.some((m) => m.role === 'system')) {
        messagesWithUser = [{ role: 'system', content: activePresetData.system_prompt }, ...messagesWithUser];
      }

      const response = await createChatCompletion(messagesWithUser);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorBody}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let contentResult = '';
      let thinkingResult = '';
      let buffer = '';

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
                updateMessage(activeConversationId!, messageId, contentResult, thinkingResult);
                scrollToBottom();
              }
              if (thinking) {
                thinkingResult += thinking;
                updateMessage(activeConversationId!, messageId, contentResult, thinkingResult);
                scrollToBottom();
              }
            } catch {
              // Skip incomplete JSON
            }
          }
        }
        buffer = lines[lines.length - 1] || '';
      }

      if (!thinkingResult.trim()) {
        updateMessage(activeConversationId!, messageId, contentResult, undefined);
      }
    } catch (error) {
      console.error('重新生成失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || !apiKey) return;
    
    setIsGeneratingImage(true);
    try {
      const result = await generateImage(imagePrompt, 'agnes-image-2.1-flash', imageSize);
      const imageResult = {
        id: `img-${Date.now()}`,
        url: result.url,
        prompt: imagePrompt,
        size: imageSize,
        model: 'agnes-image-2.1-flash',
        createdAt: Date.now(),
      };
      setPreviewImage(imageResult);
      addImageToHistory(imageResult);
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || !apiKey) return;
    
    setIsGeneratingVideo(true);
    try {
      const [width, height] = videoSize.split('x').map(Number);
      const result = await generateVideo(videoPrompt, {
        width,
        height,
        num_frames: 16,
        frame_rate: 8,
      });

      addVideoTask({
        id: `video-${Date.now()}`,
        user_id: userId,
        task_id: result.task_id,
        prompt: videoPrompt,
        status: 'pending',
        progress: 0,
        size: videoSize,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setShowVideoModal(false);
      setVideoPrompt('');
    } catch (error) {
      console.error('生成视频失败:', error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleCreateNewConversation = () => {
    createConversation('新对话');
    setInputValue('');
  };

  const getRolePresetIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      MessageSquare: <Sparkles size={16} />,
      Lightbulb: <Sparkles size={16} />,
      FileText: <Sparkles size={16} />,
      Code: <Sparkles size={16} />,
    };
    return icons[iconName] || <Sparkles size={16} />;
  };

  const currentPreset = rolePresets.find((p) => p.id === activeRolePresetId);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('history')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Wand2 size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Agnes AI</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('font')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            字体生成
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            历史记录
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="p-3">
            <button
              onClick={handleCreateNewConversation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus size={16} />
              新对话
            </button>
          </div>

          <div className="px-3 mb-2">
            <button
              onClick={() => setShowRolePresets(!showRolePresets)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              {currentPreset ? `当前角色: ${currentPreset.name}` : '选择角色'}
            </button>
          </div>

          {showRolePresets && (
            <div className="px-3 pb-3">
              <div className="space-y-1">
                {rolePresets.map((preset: RolePreset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setActiveRolePreset(preset.id);
                      setShowRolePresets(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeRolePresetId === preset.id
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {getRolePresetIcon(preset.icon || '')}
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {conversations.map((conv: Conversation) => (
              <div
                key={conv.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {conv.messages.length > 0
                      ? conv.messages[conv.messages.length - 1].content.substring(0, 30)
                      : '暂无消息'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeConversation.messages.map((message: Message, index: number) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[75%] ${
                        message.role === 'user'
                          ? 'bg-purple-600 text-white rounded-xl rounded-tr-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl rounded-tl-sm'
                      } p-4 shadow-sm relative`}
                    >
                      {message.role === 'assistant' && index > 0 && (
                        <div className="absolute -top-2 right-4 flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRegenerate(message.id)}
                            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                            title="重新生成"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="p-1.5 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                            title="复制"
                          >
                            {copiedMessageId === message.id ? (
                              <Check size={14} className="text-green-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}
                      {message.thinking && (
                        <p className="text-xs text-gray-400 mb-2 italic">
                          {message.thinking}
                        </p>
                      )}
                      <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm leading-relaxed">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl rounded-tl-sm p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <footer className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="生成图片"
                    >
                      <Image size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => setShowVideoModal(true)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="生成视频"
                    >
                      <Video size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息..."
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Wand2 size={32} className="text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  欢迎使用 Agnes AI
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  点击"新对话"开始聊天，或选择一个角色预设
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <Modal isOpen={showImageModal} onClose={() => setShowImageModal(false)} title="生成图片">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              提示词
            </label>
            <textarea
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="描述你想要生成的图片..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              图片尺寸
            </label>
            <select
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1024x1536">1024x1536</option>
              <option value="1536x1024">1536x1024</option>
            </select>
          </div>
          <button
            onClick={handleGenerateImage}
            disabled={!imagePrompt.trim() || isGeneratingImage}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingImage ? '生成中...' : '生成图片'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} title="生成视频">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              提示词
            </label>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="描述你想要生成的视频..."
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              视频尺寸
            </label>
            <select
              value={videoSize}
              onChange={(e) => setVideoSize(e.target.value)}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="512x512">512x512</option>
              <option value="1024x1024">1024x1024</option>
              <option value="1024x1536">1024x1536</option>
              <option value="1536x1024">1536x1024</option>
            </select>
          </div>
          <button
            onClick={handleGenerateVideo}
            disabled={!videoPrompt.trim() || isGeneratingVideo}
            className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGeneratingVideo ? '生成中...' : '生成视频'}
          </button>
        </div>
      </Modal>

      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        image={previewImage}
      />
    </div>
  );
}