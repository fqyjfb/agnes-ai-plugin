import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Image, Video, Type, Download, Copy, Check, Trash2, Upload, Download as ExportIcon, RefreshCw, Play } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { getVideoTaskStatus } from '../services/agnesApi';
import { ImageResult, VideoTask, FontGenerationTask } from '../types/agnes';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

interface HistoryPageProps {
  onNavigate: (page: string) => void;
  userId?: string;
}

export function HistoryPage({ onNavigate, userId = 'local-user' }: HistoryPageProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'font'>('image');
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState<'image' | 'video' | 'font'>('image');

  const {
    imageGeneration,
    videoGeneration,
    fontGeneration,
    removeImageFromHistory,
    removeVideoTask,
    removeFontTask,
    clearImageHistory,
    updateVideoTask,
  } = useAgnesStore();

  const fetchTaskStatus = useCallback(async (taskId: string): Promise<void> => {
    try {
      const result = await getVideoTaskStatus(taskId);
      updateVideoTask(taskId, {
        status: result.status as VideoTask['status'],
        progress: result.progress,
        video_url: result.video_url,
      });
    } catch (error) {
      console.error(`Failed to fetch task ${taskId}:`, error);
    }
  }, [updateVideoTask]);

  useEffect(() => {
    const pendingTasks = videoGeneration.tasks.filter((task) => 
      task.status === 'pending' || task.status === 'queued' || task.status === 'running'
    );
    
    pendingTasks.forEach((task) => {
      const interval = setInterval(() => {
        fetchTaskStatus(task.id);
      }, 5000);
      return () => clearInterval(interval);
    });
  }, [videoGeneration.tasks, fetchTaskStatus]);

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.click();
  };

  const handleExport = () => {
    const data = {
      images: imageGeneration.history,
      videos: videoGeneration.tasks,
      fonts: fontGeneration.tasks,
      exportTime: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agnes-history-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.images && Array.isArray(data.images)) {
          data.images.forEach((img: ImageResult) => {
            if (img.url && img.prompt) {
              imageGeneration.history.push(img);
            }
          });
        }
        
        if (data.videos && Array.isArray(data.videos)) {
          data.videos.forEach((video: VideoTask) => {
            if (video.prompt) {
              videoGeneration.tasks.push(video);
            }
          });
        }
        
        if (data.fonts && Array.isArray(data.fonts)) {
          data.fonts.forEach((font: FontGenerationTask) => {
            if (font.text_content) {
              fontGeneration.tasks.push(font);
            }
          });
        }
      } catch (error) {
        console.error('导入失败:', error);
      }
    };
    input.click();
  };

  const handleClearHistory = () => {
    if (selectedTaskType === 'image') {
      clearImageHistory();
    } else if (selectedTaskType === 'video') {
      videoGeneration.tasks.forEach((task) => removeVideoTask(task.id));
    } else if (selectedTaskType === 'font') {
      fontGeneration.tasks.forEach((task) => removeFontTask(task.id));
    }
    setShowClearConfirm(false);
  };

  const tabs = [
    { id: 'image', label: '图片', icon: Image, count: imageGeneration.history.length },
    { id: 'video', label: '视频', icon: Video, count: videoGeneration.tasks.length },
    { id: 'font', label: '字体', icon: Type, count: fontGeneration.tasks.length },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: VideoTask['status']) => {
    const statusMap: Record<VideoTask['status'], string> = {
      pending: '等待中',
      queued: '排队中',
      running: '处理中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('chat')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">历史记录</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('chat')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            AI 助手
          </button>
          <button
            onClick={() => onNavigate('font')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            字体生成
          </button>
        </div>
      </header>

      <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={handleImport}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
          >
            <Upload size={14} />
            导入
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
          >
            <ExportIcon size={14} />
            导出
          </button>
          <button
            onClick={() => {
              setSelectedTaskType(activeTab);
              setShowClearConfirm(true);
            }}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} />
            清空
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        {activeTab === 'image' && (
          imageGeneration.history.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {imageGeneration.history.map((image) => (
                <div
                  key={image.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className="aspect-square bg-gray-100 dark:bg-gray-700 cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  >
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {image.size}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopy(image.url, image.id)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="复制链接"
                        >
                          {copiedId === image.id ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} className="text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(image.url, `image-${image.id}.png`)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="下载"
                        >
                          <Download size={14} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => removeImageFromHistory(image.id)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} className="text-gray-500 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Image size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无图片记录
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  在 AI 助手中生成图片后，记录会显示在这里
                </p>
              </div>
            </div>
          )
        )}

        {activeTab === 'video' && (
          videoGeneration.tasks.length > 0 ? (
            <div className="space-y-4">
              {videoGeneration.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {task.video_url ? (
                        <div className="relative">
                          <Play size={24} className="text-primary" />
                        </div>
                      ) : (
                        <Video size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                        {task.prompt}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {task.size} | {formatDate(task.created_at)}
                      </p>
                      {task.status !== 'completed' && task.status !== 'failed' && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>{getStatusText(task.status)}</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                          </div>
                        </div>
                      )}
                      {task.status === 'failed' && (
                        <p className="text-xs text-red-500 mb-2">{task.error_message || '生成失败'}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {task.video_url && (
                          <>
                            <button
                              onClick={() => handleDownload(task.video_url!, `video-${task.id}.mp4`)}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1"
                            >
                              <Download size={14} />
                              下载
                            </button>
                            <button
                              onClick={() => handleCopy(task.video_url!, task.id)}
                              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                            >
                              {copiedId === task.id ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                              {copiedId === task.id ? '已复制' : '复制链接'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeVideoTask(task.id)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                        {task.status === 'pending' && (
                          <button
                            onClick={() => fetchTaskStatus(task.id)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                          >
                            <RefreshCw size={14} />
                            刷新
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Video size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无视频记录
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  在 AI 助手中生成视频后，记录会显示在这里
                </p>
              </div>
            </div>
          )
        )}

        {activeTab === 'font' && (
          fontGeneration.tasks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fontGeneration.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div
                    className="aspect-square bg-gray-100 dark:bg-gray-700"
                  >
                    {task.image_url ? (
                      <img
                        src={task.image_url}
                        alt={task.text_content}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Type size={32} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {task.text_content}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                      {task.status === 'completed' ? '已完成' : getStatusText(task.status as VideoTask['status'])}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {task.size}
                      </span>
                      <div className="flex items-center gap-1">
                        {task.image_url && (
                          <>
                            <button
                              onClick={() => handleCopy(task.image_url!, task.id)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="复制链接"
                            >
                              {copiedId === task.id ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} className="text-gray-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDownload(task.image_url!, `font-${task.id}.png`)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              title="下载"
                            >
                              <Download size={14} className="text-gray-500" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => removeFontTask(task.id)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={14} className="text-gray-500 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Type size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  暂无字体记录
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                  在字体生成器中生成字体后，记录会显示在这里
                </p>
              </div>
            </div>
          )
        )}
      </main>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="确认清空"
        message={`确定要清空所有${tabs.find((t) => t.id === selectedTaskType)?.label}记录吗？此操作不可恢复。`}
      />

      <ImagePreviewModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        image={selectedImage}
      />
    </div>
  );
}