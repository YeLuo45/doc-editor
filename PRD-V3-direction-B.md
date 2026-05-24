# PRD: doc-editor V3 — 方向B：插件系统

## 1. 项目概述

| 字段 | 内容 |
|------|------|
| 项目 | doc-editor (PRJ-20260430-002) |
| 提案 | P-20260524-094 |
| 方向 | B — 插件系统 |
| 参照 | Thunder Plugin Architecture + Claude Code Feature Flags |
| 开发分支 | feature/v3-plugin-system |
| 技术栈 | React 19 + TypeScript + Vite + Zustand + Web Worker沙箱 |

---

## 2. 功能需求

### 2.1 核心目标

构建可扩展的插件系统，让第三方开发者能以插件形式扩展文档编辑能力。

### 2.2 插件系统架构

```
用户输入 → PluginHost（插件主机）→ 插件沙箱（Sandbox）
                              → 插件注册表（PluginRegistry）
                              → 插件生命周期管理（PluginManager）
```

### 2.3 插件类型

| 插件类型 | 说明 | 示例 |
|----------|------|------|
| 格式转换器 | 导入/导出不同格式 | PDF导出、Word导入、Markdown互转 |
| AI助手 | 内置AI能力 | 翻译、摘要、润色、语法检查 |
| 协作插件 | 多人协作 | 实时评论、协同编辑、版本历史 |
| 自定义工具 | 用户自定义 | 代码高亮、LaTeX公式、流程图 |

### 2.4 插件生命周期

```
发现 → 注册 → 激活 → 运行 → 停用 → 卸载
```

### 2.5 插件隔离（Sandbox）

每个插件运行在独立的 Web Worker 中，通过消息传递与主应用通信：
- 无直接DOM访问
- 无跨插件数据访问
- 资源使用受限（内存、CPU时间）
- 超时自动终止

---

## 3. 技术方案

### 3.1 目录结构

```
src/
├── plugins/
│   ├── types.ts                  # 插件类型定义
│   ├── PluginHost.tsx            # 插件主机（主渲染进程）
│   ├── PluginSandbox.worker.ts   # Web Worker沙箱
│   ├── PluginRegistry.ts         # 插件注册表（内存）
│   ├── PluginManager.ts          # 插件生命周期管理
│   └── built-in/                 # 内置插件
│       ├── MarkdownFormatter.ts   # Markdown格式化
│       └── SyntaxHighlight.ts    # 语法高亮
├── stores/
│   └── pluginStore.ts            # 插件状态管理
├── __tests__/
│   ├── pluginRegistry.test.ts     # 注册表测试
│   ├── pluginManager.test.ts      # 生命周期测试
│   └── pluginSandbox.test.ts      # 沙箱隔离测试
└── App.tsx
```

### 3.2 插件接口

```typescript
interface DocEditorPlugin {
  id: string;                      // 唯一标识 "markdown-formatter"
  name: string;                    // 显示名称 "Markdown格式化"
  version: string;                 // "1.0.0"
  type: 'formatter' | 'ai' | 'collaboration' | 'tool';
  permissions: string[];           // ["network", "storage"]
  
  // 生命周期
  onInit(context: PluginContext): Promise<void>;
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  onDestroy(): Promise<void>;
  
  // 插件能力
  execute(input: PluginInput): Promise<PluginOutput>;
}

interface PluginContext {
  getStorage(): PluginStorage;
  getConfig(): PluginConfig;
  log(level: 'info' | 'warn' | 'error', msg: string): void;
}
```

### 3.3 插件注册表

```typescript
class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();
  
  register(plugin: DocEditorPlugin): void;
  unregister(pluginId: string): void;
  get(pluginId: string): PluginMetadata | undefined;
  list(): PluginMetadata[];
  findByType(type: PluginType): PluginMetadata[];
}
```

### 3.4 插件沙箱（Web Worker）

```typescript
// PluginSandbox.worker.ts
// 运行在独立Worker线程中，完全隔离
// 通信通过 postMessage / onmessage

interface SandboxMessage {
  type: 'init' | 'execute' | 'terminate';
  pluginId: string;
  payload?: any;
}

interface SandboxResponse {
  type: 'result' | 'error' | 'log';
  pluginId: string;
  payload?: any;
}
```

### 3.5 Feature Flag 控制

每个插件可独立启用/禁用（借鉴 Claude Code Feature Flags）：
```typescript
interface PluginFeatureFlag {
  pluginId: string;
  enabled: boolean;
  rollout: number;        // 0-100, 灰度百分比
  config: Record<string, any>;
}

// 存储在 localStorage，App启动时读取
// 支持运行时动态切换
```

---

## 4. 验收标准

### 4.1 功能验收

| 验收项 | 判据 |
|--------|------|
| 插件注册 | 能注册新插件到注册表 |
| 插件激活 | 插件能从"注册"状态切换到"激活" |
| 插件执行 | 插件能接收输入并返回输出 |
| 插件隔离 | 插件崩溃不会影响主应用 |
| 沙箱通信 | Worker和主线程能正确传递消息 |
| Feature Flag | 能动态启用/禁用插件 |

### 4.2 测试通过率

| 文件 | 测试数 | 最低通过 |
|------|--------|----------|
| pluginRegistry.test.ts | 4 | 80% |
| pluginManager.test.ts | 4 | 80% |
| pluginSandbox.test.ts | 4 | 80% |
| pluginStore.test.ts | 3 | 80% |
| **总计** | **15** | **≥80%** |

---

## 5. 参考设计文档

| 设计文档 | 关键借鉴点 |
|----------|-----------|
| claude-code-design | Feature Flags（插件开关控制、灰度发布） |
| nanobot-design | Sandbox隔离、Worker消息传递 |
| thunderbolt-design | 插件生命周期状态机、注册发现机制 |
| generic-agent-design | L0-L4分层（插件分层管理） |
| ruflo-design | 插件可视化编排 |
| chatdev-design | 多插件协作流程 |