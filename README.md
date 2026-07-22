# Agnes AI Plugin

Agnes AI 插件是 ToolBox 的 AI 助手插件，提供智能聊天、图像生成、视频生成、字体设计等功能。

## 功能特性

### 🤖 AI 助手聊天
- 智能文本对话，支持流式响应
- 文生图、图生图功能
- 文生视频功能
- 思考模式，显示 AI 思考过程
- 消息编辑和重新生成
- 代码块语法高亮

### 🎭 角色预设管理
- 4 个系统预设：文案助手、翻译助手、编程助手、创意助手
- 自定义角色预设创建和管理
- 预设启用/禁用

### ✨ 字体生成器
- 21 种字体分类
- 84 种字体样式，每种样式配有缩略图
- 自定义文字内容输入
- 多种尺寸和背景颜色选择
- 支持负向提示词和种子控制

### 📜 历史记录
- 图像生成历史查看和管理
- 视频任务状态跟踪和下载
- 字体生成任务记录

### ⚙️ 设置
- API Key 配置和验证
- API Base URL 自定义
- 数据管理说明

## 技术栈

- React 19.x
- TypeScript 6.x
- Vite 5.x
- Tailwind CSS 3.x
- Lucide React
- Zustand

## 开发

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

构建产物将生成在 `dist/` 目录，包含：
- `dist/index.js` - 主构建文件
- `dist/tools/ai-chat/fonts/` - 字体缩略图资源

### 项目结构

```
agnes-ai-plugin/
├── src/
│   ├── components/          # 通用组件
│   ├── constants/           # 常量定义
│   ├── pages/               # 页面组件
│   ├── services/            # 服务层
│   ├── store/               # 状态管理
│   ├── types/               # 类型定义
│   ├── utils/               # 工具函数
│   ├── assets/fonts/        # 字体缩略图资源
│   └── index.tsx            # 入口文件
├── dist/                    # 构建产物
├── build.mjs                # Vite 构建配置
├── manifest.json            # 插件元数据
└── package.json             # 依赖配置
```

## 发布

1. 更新 `manifest.json` 和 `package.json` 中的版本号
2. 构建：`npm run build`
3. 提交代码和构建产物
4. 创建标签触发 Release：`git tag v1.0.0 && git push origin v1.0.0`

## 配置说明

### API Key

在设置页面配置 Agnes AI API Key，用于访问 AI 服务。

### 主题适配

插件自动继承主应用主题模式，支持深色/浅色主题切换。

### 资源路径

字体缩略图资源路径为 `./tools/ai-chat/fonts/{category}/{file}.png`。

## 许可证

MIT