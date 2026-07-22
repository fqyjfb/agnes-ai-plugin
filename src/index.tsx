import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MessageSquare, Wand2, Clock, Settings } from 'lucide-react';
import { useAgnesStore } from './store/agnesStore';
import { AIChatPage } from './pages/AIChatPage';
import { RolePresetsPage } from './pages/RolePresetsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { getPluginEnv } from './utils/environment';

const App: React.FC = () => {
  const { activeTab, setActiveTab } = useAgnesStore();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const env = getPluginEnv();
    setTheme(env.isDark ? 'dark' : 'light');
  }, []);

  const tabs = [
    { id: 'chat' as const, label: 'AI 助手', icon: MessageSquare },
    { id: 'presets' as const, label: '角色预设', icon: Wand2 },
    { id: 'history' as const, label: '历史记录', icon: Clock },
    { id: 'settings' as const, label: '设置', icon: Settings },
  ];

  const renderPage = () => {
    switch (activeTab) {
      case 'chat':
        return <AIChatPage />;
      case 'presets':
        return <RolePresetsPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AIChatPage />;
    }
  };

  return (
    <div className={`h-full w-full overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="flex h-full">
        <nav className="w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={tab.label}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </nav>
        <main className="flex-1 h-full overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

function renderStandalone() {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  ReactDOM.createRoot(root).render(<App />);
}

function registerPlugin(api: any) {
  const { registerTool, registerSidebarButton, openPluginWindow } = api;

  registerTool({
    id: 'plugin-agnes-ai',
    name: 'Agnes AI',
    iconName: 'Sparkles',
    color: '#22c55e',
    textColor: '#ffffff',
    path: '/tools/plugin-agnes-ai',
    component: App,
  });

  registerSidebarButton({
    id: 'plugin-agnes-ai-btn',
    icon: 'Sparkles',
    label: 'Agnes AI',
    onClick: () => {
      openPluginWindow?.('plugin-agnes-ai');
    },
  });
}

const pluginData = (window as any).__PLUGIN_DATA__;

if (pluginData) {
  renderStandalone();
}