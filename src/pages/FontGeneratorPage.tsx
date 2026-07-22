import React, { useState, useEffect } from 'react';
import { Sparkles, Download, Image } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { generateFontImage } from '../services/agnesApi';
import { FONT_CATEGORIES, FONT_STYLES, getFontStyles } from '../constants/fontStyles';
import { getFontThumbnailUrl } from '../utils/environment';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

export const FontGeneratorPage: React.FC = () => {
  const { addFontTask, isLoading, setLoading } = useAgnesStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [textContent, setTextContent] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [seed, setSeed] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filteredStyles = selectedCategory ? getFontStyles(selectedCategory) : FONT_STYLES;

  const handleGenerate = async () => {
    if (!textContent.trim() || !selectedStyle) return;

    const style = FONT_STYLES.find(s => s.style_id === selectedStyle);
    if (!style) return;

    setLoading(true);

    try {
      const response = await generateFontImage({
        prompt: `${style.prompt} 文字内容："${textContent}"`,
        text_content: textContent,
        size: size,
        background_color: backgroundColor,
        seed: seed ? parseInt(seed) : undefined,
        negative_prompt: negativePrompt || undefined,
      });

      if (response.image_url) {
        setGeneratedImage(response.image_url);

        await addFontTask({
          user_id: '',
          task_id: response.task_id,
          font_style_id: style.style_id,
          text_content: textContent,
          prompt: style.prompt,
          size: size,
          background_color: backgroundColor,
          seed: seed ? parseInt(seed) : undefined,
          negative_prompt: negativePrompt || undefined,
          image_url: response.image_url,
          status: response.status,
        });
      }
    } catch (error) {
      console.error('Font generation failed:', error);
      alert(`字体生成失败: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `font-${textContent.slice(0, 10)}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">字体生成器</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">选择字体风格，生成精美的艺术字图片</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">文字内容</label>
              <input
                type="text"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="输入想要生成的文字..."
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">字体分类</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    !selectedCategory
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  全部
                </button>
                {FONT_CATEGORIES.map((category) => (
                  <button
                    key={category.category_id}
                    onClick={() => setSelectedCategory(category.category_id)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedCategory === category.category_id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">字体风格</label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {filteredStyles.map((style) => (
                  <button
                    key={style.style_id}
                    onClick={() => setSelectedStyle(style.style_id)}
                    className={`p-3 rounded-lg border transition-colors text-left ${
                      selectedStyle === style.style_id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-700">
                        <img
                          src={getFontThumbnailUrl(style.thumbnail)}
                          alt={style.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{style.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">尺寸</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="1024x1024">1024x1024</option>
                  <option value="1024x1536">1024x1536</option>
                  <option value="1536x1024">1536x1024</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">背景颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seed (可选)</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="留空随机"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">负面提示词 (可选)</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="排除不想要的内容..."
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!textContent.trim() || !selectedStyle || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Sparkles size={20} />
              {isLoading ? '生成中...' : '生成字体'}
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">预览</h3>
            <div className="aspect-square rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
              {generatedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={generatedImage}
                    alt="Generated font"
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setShowPreview(true)}
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button
                      onClick={() => setShowPreview(true)}
                      className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                      title="放大查看"
                    >
                      <Image size={18} />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                      title="下载"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-500">
                  <Sparkles size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">选择字体风格并点击生成</p>
                </div>
              )}
            </div>
            {generatedImage && (
              <div className="mt-4 p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    文字: {textContent}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {FONT_STYLES.find(s => s.style_id === selectedStyle)?.name || '未知风格'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ImagePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        imageUrl={generatedImage || ''}
        title={textContent || '字体预览'}
      />
    </div>
  );
};