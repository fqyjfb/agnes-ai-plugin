import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { AgnesService } from '../services/AgnesService';
import { checkApiKey } from '../services/agnesApi';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await AgnesService.getOrCreateConfig();
      setApiKey(config.api_key || '');
      setApiBaseUrl(config.api_base_url || '');
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    await AgnesService.updateConfig({
      api_key: apiKey,
      api_base_url: apiBaseUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheckApiKey = async () => {
    if (!apiKey.trim()) {
      setKeyValid(null);
      return;
    }

    setCheckingKey(true);
    try {
      const result = await checkApiKey();
      setKeyValid(result.valid);
    } catch {
      setKeyValid(false);
    } finally {
      setCheckingKey(false);
    }
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings size={24} className="text-gray-600 dark:text-gray-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Agnes AI 设置</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">配置 Agnes AI API 连接参数</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">API 配置</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setKeyValid(null);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="输入你的 Agnes AI API Key"
                  />
                  <button
                    onClick={handleCheckApiKey}
                    disabled={checkingKey || !apiKey.trim()}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {checkingKey ? '验证中...' : '验证'}
                  </button>
                </div>
                {keyValid !== null && (
                  <div className={`flex items-center gap-2 mt-2 ${keyValid ? 'text-green-500' : 'text-red-500'}`}>
                    {keyValid ? (
                      <>
                        <CheckCircle size={16} />
                        <span className="text-sm">API Key 有效</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} />
                        <span className="text-sm">API Key 无效，请检查</span>
                      </>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  API Key 用于访问 Agnes AI 服务。请在 Agnes AI 控制台获取。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API 基础 URL</label>
                <input
                  type="text"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="https://api.agnesai.com"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  默认使用官方 API 服务器。如需使用自定义部署，请修改此地址。
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">数据管理</h3>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                所有数据（对话、角色预设、生成记录）均存储在本地浏览器中，不会上传到云端。
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                清除数据将删除所有本地存储的 Agnes AI 相关内容，此操作不可撤销。
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors ${
                saved ? 'bg-green-500 hover:bg-green-600' : ''
              }`}
            >
              <Save size={16} />
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">关于 Agnes AI</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Agnes AI 是一款强大的 AI 工具集成平台，支持智能聊天、图像生成、视频生成和字体设计等功能。
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            插件版本: 1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};