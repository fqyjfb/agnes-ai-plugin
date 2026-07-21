import React from 'react';
import { X, Download, Copy, Check } from 'lucide-react';
import { ImageResult } from '../types/agnes';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: ImageResult | null;
}

export function ImagePreviewModal({ isOpen, onClose, image }: ImagePreviewModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !image) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(image.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('复制失败');
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `agnes-image-${image.id}.png`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">图片预览</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="复制链接"
            >
              {copied ? (
                <Check size={20} className="text-green-600" />
              ) : (
                <Copy size={20} className="text-gray-500" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="下载图片"
            >
              <Download size={20} className="text-gray-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-4 flex flex-col items-center">
          <img
            src={image.url}
            alt="Generated"
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
          <div className="mt-4 w-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              提示词: {image.prompt}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              尺寸: {image.size} | 模型: {image.model}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}