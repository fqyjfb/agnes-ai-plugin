import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Wand2, Settings } from 'lucide-react';
import { AIChatPage } from './pages/AIChatPage';
import { FontGeneratorPage } from './pages/FontGeneratorPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { RolePresetsPage } from './pages/RolePresetsPage';
import { useAgnesStore } from './store/agnesStore';

type PageType = 'chat' | 'font' | 'history' | 'settings' | 'presets';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('chat');
  const [userId, setUserId] = useState('local-user');

  const { theme } = useAgnesStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const newTheme = (event as CustomEvent).detail;
      if (newTheme === 'dark' || newTheme === 'light') {
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    };

    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  useEffect(() => {
    if (window.__PLUGIN_DATA__) {
      const userInfo = window.__PLUGIN_DATA__.user;
      if (userInfo && userInfo.id) {
        setUserId(userInfo.id);
      }
    }
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as PageType);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <AIChatPage onNavigate={handleNavigate} userId={userId} />;
      case 'font':
        return <FontGeneratorPage onNavigate={handleNavigate} userId={userId} />;
      case 'history':
        return <HistoryPage onNavigate={handleNavigate} userId={userId} />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} />;
      case 'presets':
        return <RolePresetsPage onNavigate={handleNavigate} userId={userId} />;
      default:
        return <AIChatPage onNavigate={handleNavigate} userId={userId} />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {renderPage()}
    </div>
  );
}

function registerPlugin(toolboxApi: any) {
  const { registerTool, registerSidebarButton, openPluginWindow } = toolboxApi;

  registerTool({
    id: 'plugin-agnes-ai',
    name: 'Agnes AI',
    iconName: 'Wand2',
    color: '#8b5cf6',
    textColor: '#ffffff',
    path: '/tools/plugin-agnes-ai',
    component: () => <AIChatPage onNavigate={() => {}} />,
  });

  registerSidebarButton({
    id: 'agnes-ai-settings',
    iconName: 'Settings',
    label: 'Agnes AI 设置',
    onClick: () => {
      openPluginWindow('plugin-agnes-ai', { width: 900, height: 600 });
    },
  });
}

function renderStandalone() {
  const root = document.getElementById('root');
  if (!root) {
    console.error('Root element not found');
    return;
  }

  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(<App />);
  } else {
    ReactDOM.render(<App />, root);
  }
}

const pluginData = (window as any).__PLUGIN_DATA__;
if (pluginData) {
  renderStandalone();
}

(window as any).registerPlugin = registerPlugin;