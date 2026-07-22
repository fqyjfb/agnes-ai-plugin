import React, { useState, useEffect } from 'react';
import { Image, Video, Trash2, Download } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { getVideoTask } from '../services/agnesApi';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

type TabType = 'image' | 'video';

export const HistoryPage: React.FC = () => {
  const {
    imageTasks,
    videoTasks,
    loadImageTasks,
    loadVideoTasks,
    deleteImageTask,
    deleteVideoTask,
    updateVideoTask,
  } = useAgnesStore();

  const [activeTab, setActiveTab] = useState<TabType>('image');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: TabType; id: string } | null>(null);
  const [pollingTasks, setPollingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadImageTasks();
    loadVideoTasks();
  }, [loadImageTasks, loadVideoTasks]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const pendingTasks = videoTasks.filter(t => t.status === 'pending' || t.status === 'queued' || t.status === 'running' || t.status === 'processing');
      
      for (const task of pendingTasks) {
        if (!pollingTasks.has(task.task_id)) {
          setPollingTasks(prev => new Set([...prev, task.task_id]));
          try {
            const response = await getVideoTask(task.task_id);
            await updateVideoTask(task.id, {
              status: response.status,
              progress: response.progress,
              video_url: response.video_url,
              error_message: response.error_message,
            });
            
            if (response.status === 'completed' || response.status === 'failed' || response.status === 'cancelled') {
              setPollingTasks(prev => {
                const next = new Set(prev);
                next.delete(task.task_id);
                return next;
              });
            }
          } catch {
            setPollingTasks(prev => {
              const next = new Set(prev);
              next.delete(task.task_id);
              return next;
            });
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [videoTasks, pollingTasks, updateVideoTask]);

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
      queued: '排队中',
      generating: '生成中',
      running: '运行中',
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'failed':
      case 'cancelled':
        return 'text-red-500';
      case 'pending':
      case 'queued':
        return 'text-yellow-500';
      case 'generating':
      case 'running':
      case 'processing':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 p-3 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">历史记录</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">管理生成记录</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-4">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'image'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Image size={16} />
            图片 ({imageTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'video'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Video size={16} />
            视频 ({videoTasks.length})
          </button>
        </div>

        <div className="grid gap-3">
          {activeTab === 'image' && imageTasks.length === 0 && (
            <div className="text-center py-8">
              <Image size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无图片生成记录</p>
            </div>
          )}
          {activeTab === 'image' && imageTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                  {task.image_url ? (
                    <img
                      src={task.image_url}
                      alt="Generated"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(task.image_url)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={18} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {formatDate(task.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {task.prompt}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>模型: {task.model}</span>
                    <span>尺寸: {task.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {task.image_url && (
                    <button
                      onClick={() => handleDownload(task.image_url, `image-${Date.now()}.png`)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="下载"
                    >
                      <Download size={16} className="text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete({ type: 'image', id: task.id })}
                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'video' && videoTasks.length === 0 && (
            <div className="text-center py-8">
              <Video size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">暂无视频生成记录</p>
            </div>
          )}
          {activeTab === 'video' && videoTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                  {task.video_url ? (
                    <video
                      src={task.video_url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={18} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      {formatDate(task.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {task.prompt}
                  </p>
                  {task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled' && (
                    <div className="mt-1.5">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                        <span>进度</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>模型: {task.model}</span>
                    <span>尺寸: {task.width}x{task.height}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {task.video_url && (
                    <button
                      onClick={() => handleDownload(task.video_url, `video-${Date.now()}.mp4`)}
                      className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="下载"
                    >
                      <Download size={16} className="text-gray-500" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmDelete({ type: 'video', id: task.id })}
                    className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ImagePreviewModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage || ''}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="确认删除"
        message="确定要删除这条记录吗？此操作不可撤销。"
        onConfirm={() => {
          if (confirmDelete) {
            switch (confirmDelete.type) {
              case 'image':
                deleteImageTask(confirmDelete.id);
                break;
              case 'video':
                deleteVideoTask(confirmDelete.id);
                break;
            }
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};