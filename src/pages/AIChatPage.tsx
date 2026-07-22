import React, { useState, useEffect, useRef } from 'react';
import { Send, Plus, Image, Video, MessageSquare, Trash2, Menu, X } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { chatCompletion, generateImage, createVideoTask } from '../services/agnesApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ContextMenu } from '../components/ContextMenu';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
    isLoading,
    setLoading,
    addImageTask,
    addVideoTask,
  } = useAgnesStore();

  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; conversationId?: string }>({ isOpen: false, x: 0, y: 0 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState({ isOpen: false, prompt: '', model: 'flux', size: '1024x1024', seed: '', negativePrompt: '' });
  const [videoModal, setVideoModal] = useState({ isOpen: false, prompt: '', model: 'flux-video', width: 1024, height: 1024, numFrames: 24, frameRate: 8 });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    loadRolePresets();
  }, [loadConversations, loadRolePresets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const content = inputValue.trim();
    setInputValue('');
    setLoading(true);

    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await createConversation(content.slice(0, 30) || '新对话');
      conversationId = conversation.id;
    }

    await addMessage(conversationId, { role: 'user', content });

    try {
      const preset = rolePresets.find(p => p.preset_id === conversations.find(c => c.id === conversationId)?.role_preset_id);
      const systemMessages = preset ? [{ role: 'system', content: preset.system_prompt }] : [];
      
      const response = await chatCompletion({
        messages: [...systemMessages, ...messages.map(m => ({ role: m.role, content: m.content })), { role: 'user', content }],
        temperature: 0.7,
        max_tokens: 4096,
      });

      await addMessage(conversationId, { role: 'assistant', content: response.content, thinking: response.thinking });
      
      const conv = conversations.find(c => c.id === conversationId);
      if (conv && conv.title === conv.title.slice(0, 30)) {
        await createConversation(content.slice(0, 30), conv.role_preset_id);
      }
    } catch (error) {
      await addMessage(conversationId, { role: 'assistant', content: `错误: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imageModal.prompt.trim()) return;
    setImageModal(prev => ({ ...prev, isOpen: false }));
    setLoading(true);

    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await createConversation('图片生成');
      conversationId = conversation.id;
    }

    await addMessage(conversationId, { role: 'user', content: `生成图片: ${imageModal.prompt}` });

    try {
      const response = await generateImage({
        prompt: imageModal.prompt,
        model: imageModal.model,
        size: imageModal.size,
        seed: imageModal.seed ? parseInt(imageModal.seed) : undefined,
        negative_prompt: imageModal.negativePrompt || undefined,
      });

      await addImageTask({
        user_id: '',
        task_id: response.task_id,
        prompt: imageModal.prompt,
        model: imageModal.model,
        size: imageModal.size,
        seed: imageModal.seed ? parseInt(imageModal.seed) : undefined,
        negative_prompt: imageModal.negativePrompt || undefined,
        status: response.status,
        image_url: response.image_url,
        source: 'chat',
      });

      const imageUrl = response.image_url || '图片生成中...';
      await addMessage(conversationId, { role: 'assistant', content: `图片已生成:\n${imageUrl}` });
    } catch (error) {
      await addMessage(conversationId, { role: 'assistant', content: `图片生成失败: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoModal.prompt.trim()) return;
    setVideoModal(prev => ({ ...prev, isOpen: false }));
    setLoading(true);

    let conversationId = currentConversationId;
    if (!conversationId) {
      const conversation = await createConversation('视频生成');
      conversationId = conversation.id;
    }

    await addMessage(conversationId, { role: 'user', content: `生成视频: ${videoModal.prompt}` });

    try {
      const response = await createVideoTask({
        prompt: videoModal.prompt,
        model: videoModal.model,
        width: videoModal.width,
        height: videoModal.height,
        num_frames: videoModal.numFrames,
        frame_rate: videoModal.frameRate,
      });

      await addVideoTask({
        user_id: '',
        task_id: response.task_id,
        prompt: videoModal.prompt,
        model: videoModal.model,
        width: videoModal.width,
        height: videoModal.height,
        num_frames: videoModal.numFrames,
        frame_rate: videoModal.frameRate,
        status: response.status,
        progress: response.progress,
      });

      await addMessage(conversationId, { role: 'assistant', content: `视频任务已创建，进度: ${response.progress}%` });
    } catch (error) {
      await addMessage(conversationId, { role: 'assistant', content: `视频生成失败: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    const preset = rolePresets.find(p => p.preset_id === presetId);
    if (!preset) return;
    
    const conversation = await createConversation(preset.name, presetId);
    setShowPresets(false);
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, conversationId });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">AI 助手</h2>
              <button
                onClick={() => setShowPresets(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="角色预设"
              >
                <MessageSquare size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <button
              onClick={() => createConversation('新对话')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={18} />
              新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => setCurrentConversation(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv.id)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                    {conv.title}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(conv.id);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 size={14} className="text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {conv.messages?.length ? conv.messages[conv.messages.length - 1]?.content.slice(0, 50) : '无消息'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className={`fixed left-0 top-4 z-10 p-2 rounded-r-lg bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 ${
          showSidebar ? 'translate-x-64' : 'translate-x-0'
        }`}
      >
        {showSidebar ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div className="flex-1 flex flex-col min-w-0">
        {currentConversationId ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 mb-6 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    {message.role === 'user' ? (
                      <span className="text-white text-xs">U</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-300 text-xs">AI</span>
                    )}
                  </div>
                  <div className={`max-w-[70%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                    }`}>
                      {message.thinking && (
                        <div className="text-sm text-gray-400 dark:text-gray-500 mb-2 italic">
                          思考中: {message.thinking}
                        </div>
                      )}
                      <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                    <span className="text-gray-600 dark:text-gray-300 text-xs">AI</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-end gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setImageModal({ isOpen: true, prompt: '', model: 'flux', size: '1024x1024', seed: '', negativePrompt: '' })}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="生成图片"
                  >
                    <Image size={20} className="text-gray-500" />
                  </button>
                  <button
                    onClick={() => setVideoModal({ isOpen: true, prompt: '', model: 'flux-video', width: 1024, height: 1024, numFrames: 24, frameRate: 8 })}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="生成视频"
                  >
                    <Video size={20} className="text-gray-500" />
                  </button>
                </div>
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入消息..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    rows={2}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">开始对话</h3>
              <p className="text-gray-500 dark:text-gray-400">选择角色预设或创建新对话开始</p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showPresets} onClose={() => setShowPresets(false)} title="角色预设">
        <div className="space-y-2">
          {rolePresets.map((preset) => (
            <button
              key={preset.preset_id}
              onClick={() => handleSelectPreset(preset.preset_id)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <h4 className="font-medium text-gray-900 dark:text-white">{preset.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={imageModal.isOpen} onClose={() => setImageModal(prev => ({ ...prev, isOpen: false }))} title="生成图片">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">提示词</label>
            <textarea
              value={imageModal.prompt}
              onChange={(e) => setImageModal(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
              placeholder="描述你想要生成的图片..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型</label>
              <select
                value={imageModal.model}
                onChange={(e) => setImageModal(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="flux">Flux</option>
                <option value="flux-realism">Flux Realism</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">尺寸</label>
              <select
                value={imageModal.size}
                onChange={(e) => setImageModal(prev => ({ ...prev, size: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="1024x1024">1024x1024</option>
                <option value="1024x1536">1024x1536</option>
                <option value="1536x1024">1536x1024</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seed (可选)</label>
            <input
              type="number"
              value={imageModal.seed}
              onChange={(e) => setImageModal(prev => ({ ...prev, seed: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="留空随机"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">负面提示词 (可选)</label>
            <input
              type="text"
              value={imageModal.negativePrompt}
              onChange={(e) => setImageModal(prev => ({ ...prev, negativePrompt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="排除不想要的内容..."
            />
          </div>
          <button
            onClick={handleGenerateImage}
            disabled={!imageModal.prompt.trim()}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            生成图片
          </button>
        </div>
      </Modal>

      <Modal isOpen={videoModal.isOpen} onClose={() => setVideoModal(prev => ({ ...prev, isOpen: false }))} title="生成视频">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">提示词</label>
            <textarea
              value={videoModal.prompt}
              onChange={(e) => setVideoModal(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
              placeholder="描述你想要生成的视频..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">宽度</label>
              <input
                type="number"
                value={videoModal.width}
                onChange={(e) => setVideoModal(prev => ({ ...prev, width: parseInt(e.target.value) || 1024 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">高度</label>
              <input
                type="number"
                value={videoModal.height}
                onChange={(e) => setVideoModal(prev => ({ ...prev, height: parseInt(e.target.value) || 1024 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">帧数</label>
              <input
                type="number"
                value={videoModal.numFrames}
                onChange={(e) => setVideoModal(prev => ({ ...prev, numFrames: parseInt(e.target.value) || 24 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">帧率</label>
              <input
                type="number"
                value={videoModal.frameRate}
                onChange={(e) => setVideoModal(prev => ({ ...prev, frameRate: parseInt(e.target.value) || 8 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <button
            onClick={handleGenerateVideo}
            disabled={!videoModal.prompt.trim()}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            生成视频
          </button>
        </div>
      </Modal>

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
        items={[
          { id: 'delete', label: '删除对话', onClick: () => { if (contextMenu.conversationId) setConfirmDelete(contextMenu.conversationId); } },
        ]}
        position={{ x: contextMenu.x, y: contextMenu.y }}
        onClose={() => setContextMenu({ isOpen: false, x: 0, y: 0 })}
      />
    </div>
  );
};