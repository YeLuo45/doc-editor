# doc-editor V1 — 方向A：跨会话Dream记忆 + 上下文压缩

## 1. 概述

**项目名称**: doc-editor V1 Direction A
**类型**: React + Vite Web 应用
**核心功能**: 跨会话Dream记忆系统 + 上下文自动压缩
**借鉴来源**: nanobot Dream两阶段 + claude-code Feature Flags + generic-agent L0-L4分层

## 2. 功能规格

### 2.1 Dream两阶段记忆

| 阶段 | 描述 | 触发条件 |
|------|------|---------|
| Wake | 正常编辑，记忆累积到内存 | 每个用户操作 |
| Dream | 压缩历史到持久化存储 | 空闲30s 或 消息数>50 |

### 2.2 L0-L4五层记忆架构

| 层级 | 名称 | 持久化 | 内容 |
|------|------|--------|------|
| L0 | Meta Rules | 始终在内存 | 编辑器约束（禁止删除结构等） |
| L1 | Insight Index | 长期 | 快速路由指针（index文件） |
| L2 | Global Facts | 永久 | 用户偏好、文档结构模式 |
| L3 | Skills/SOPs | 永久 | 可复用编辑SOP |
| L4 | Session Archive | 长期 | 压缩的会话记录 |

### 2.3 上下文自动压缩

- 阈值：token > 80000 时触发压缩
- 策略：保留最近20条消息 + system prompt + 摘要中间部分
- 原子写入：先写`.tmp`再rename，确保durability

### 2.4 Feature Flag控制

| Flag | 功能 |
|------|------|
| DREAM_MEMORY | 启用Dream两阶段记忆 |
| AUTO_COMPACT | 启用上下文压缩 |
| LAYERED_MEMORY | 启用L0-L4分层 |
| SESSION_ARCHIVE | 启用会话归档 |

## 3. 技术方案

### 3.1 技术栈

- React 18 + TypeScript
- Vite
- Zustand（状态管理）
- localStorage（持久化存储）

### 3.2 目录结构

```
doc-editor/
├── src/
│   ├── components/
│   │   ├── Editor.tsx
│   │   ├── DreamMemory/
│   │   │   ├── WakePhase.tsx
│   │   │   ├── DreamPhase.tsx
│   │   │   └── MemoryVisualizer.tsx
│   │   └── FeatureFlags/
│   ├── hooks/
│   │   ├── useDreamMemory.ts
│   │   ├── useAutoCompact.ts
│   │   └── useFeatureFlag.ts
│   ├── stores/
│   │   ├── memoryStore.ts
│   │   └── editorStore.ts
│   └── utils/
│       ├── dreamMemory.ts
│       └── autoCompact.ts
├── docs/
│   └── PRD-V1-direction-A.md
└── package.json
```

### 3.3 关键实现

**DreamMemory类**:
```typescript
class DreamMemory {
  // Wake阶段：累积消息
  wake(message: Message): void

  // Dream阶段：压缩历史
  async dream(): Promise<void>

  // 保存到localStorage
  save(): void

  // 从localStorage恢复
  load(): void
}
```

**AutoCompactor**:
```typescript
class AutoCompactor {
  shouldCompact(): boolean
  compact(messages: Message[]): Message[]
}
```

## 4. 验收标准

1. 重启后完整恢复上一个会话的编辑上下文
2. 大文档编辑时上下文不膨胀（token控制在80%水位）
3. 可通过Feature Flag禁用记忆系统
4. Dream阶段有视觉指示（"正在记忆..."状态）
5. 压缩后的摘要可读，保留关键上下文

## 5. 开发分支

- 开发分支：`feature/v1-dream-memory`
- 部署分支：`gh-pages`