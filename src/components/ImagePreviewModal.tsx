import React, { useEffect, useCallback } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
}) => {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setScale(1);
      setRotation(0);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title ? `${title}.png` : 'image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900/80">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
            {title && <span className="text-white text-sm font-medium">{title}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="缩小"
            >
              <ZoomOut size={20} className="text-white" />
            </button>
            <span className="text-white text-sm w-16 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(3, s + 0.25))}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="放大"
            >
              <ZoomIn size={20} className="text-white" />
            </button>
            <button
              onClick={() => setRotation((r) => r + 90)}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="旋转"
            >
              <RotateCw size={20} className="text-white" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
              title="下载"
            >
              <Download size={20} className="text-white" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    </div>
  );
};