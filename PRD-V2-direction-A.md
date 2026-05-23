# PRD: doc-editor V2 — 方向A：Multi-Agent文档协作团队

## 1. 项目概述

| 字段 | 内容 |
|------|------|
| 项目 | doc-editor (PRJ-20260430-002) |
| 提案 | P-20260524-076 |
| 方向 | A — Multi-Agent文档协作团队 |
| 参照 | ChatDev虚拟软件公司模式 + ruflo v3 Multi-Agent编排 |
| 开发分支 | feature/v2-multi-agent |
| 技术栈 | React 19 + TypeScript + Vite + Zustand + YAML工作流引擎 |

---

## 2. 功能需求

### 2.1 核心目标

构建文档编辑 Multi-Agent 团队，模拟虚拟软件公司运作模式：
- **Planner Agent**：分析用户需求，生成编辑计划
- **Editor Agent**：执行具体文档编辑任务
- **Reviewer Agent**：审核编辑结果，提供改进建议

### 2.2 协作模式（借鉴ChatDev）

```
用户输入（如："帮我写一篇关于AI Agent的科普文章"）
    ↓
Planner Agent → 生成编辑计划（大纲、要点、字数）
    ↓
Editor Agent → 并行处理各个章节/段落
    ↓
Reviewer Agent → 质量检查（语法、逻辑、一致性）
    ↓
用户确认 / 自动整合 → 最终输出
```

### 2.3 YAML工作流引擎（借鉴ruflo v3）

定义 `yaml_instance/` 目录存放工作流配置：
```yaml
# doc_editor_workflow.yaml
name: doc-editor-multi-agent
version: "1.0"
agents:
  - id: planner
    role: planning
    prompt_template: plan_document
    max_turns: 3
  - id: editor
    role: editing
    prompt_template: edit_content
    max_turns: 5
  - id: reviewer
    role: reviewing
    prompt_template: review_output
    max_turns: 2
workflow:
  - stage: plan
    agents: [planner]
    output: document_plan
  - stage: draft
    agents: [editor]
    parallel: true  # 支持并发
    output: draft_sections
  - stage: review
    agents: [reviewer]
    output: reviewed_sections
  - stage: integrate
    agents: [editor]
    output: final_document
```

### 2.4 功能列表

| 功能 | 来源 | 优先级 |
|------|------|--------|
| YAML工作流解析器 | ruflo v3 | P0 |
| Planner Agent（计划生成） | ChatDev | P0 |
| Editor Agent（内容编辑） | ChatDev | P0 |
| Reviewer Agent（质量审核） | ChatDev | P0 |
| 多Agent并发执行 | ChatDev | P0 |
| 工作流状态可视化 | — | P1 |
| Agent间消息传递 | — | P1 |
| 工作流暂停/继续 | — | P2 |
| 实时日志输出 | — | P2 |

---

## 3. 技术方案

### 3.1 架构设计

```
src/
├── components/
│   ├── WorkflowCanvas.tsx      # 工作流可视化画布
│   ├── AgentCard.tsx           # Agent状态卡片
│   ├── AgentChat.tsx           # Agent对话展示
│   └── YAMLEditor.tsx          # YAML工作流编辑器
├── agents/
│   ├── types.ts                # Agent定义
│   ├── PlannerAgent.ts         # 计划Agent
│   ├── EditorAgent.ts          # 编辑Agent
│   ├── ReviewerAgent.ts        # 审核Agent
│   └── AgentManager.ts         # Agent生命周期管理
├── engine/
│   ├── WorkflowEngine.ts       # 工作流引擎（解析YAML+执行）
│   ├── AgentExecutor.ts        # Agent执行器
│   └── MessageBus.ts           # Agent间消息总线
├── stores/
│   ├── workflowStore.ts        # 工作流状态管理
│   └── agentStore.ts           # Agent状态管理
├── utils/
│   ├── yamlParser.ts           # YAML解析
│   └── tokenCounter.ts         # Token计数（用于budget mode）
├── __tests__/
│   ├── workflowEngine.test.ts  # 工作流引擎测试
│   ├── agentManager.test.ts     # Agent管理测试
│   └── yamlParser.test.ts       # YAML解析测试
└── App.tsx
```

### 3.2 Agent通信（借鉴nanobot MessageBus）

```typescript
// 消息总线架构
interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: 'request' | 'response' | 'status' | 'error';
  payload: any;
  timestamp: number;
}

class MessageBus {
  publish(msg: AgentMessage): void;
  subscribe(agentId: AgentId, callback: (msg: AgentMessage) => void): void;
  request(from: AgentId, to: AgentId, payload: any): Promise<AgentMessage>;
}
```

### 3.3 关键实现

#### 3.3.1 YAML工作流解析器
```typescript
// 解析YAML配置 → 工作流图谱
interface WorkflowNode {
  id: string;
  stage: string;
  agents: AgentId[];
  parallel: boolean;
  output_key: string;
}

function parseYAMLWorkflow(yaml: string): Workflow {
  // 返回工作流图谱，包含节点和边
}
```

#### 3.3.2 Agent基类
```typescript
// 每个Agent共享相同基类，不同之处在于role和prompt
class BaseAgent {
  id: AgentId;
  role: 'planner' | 'editor' | 'reviewer';
  messages: AgentMessage[];
  
  async think(input: string): Promise<string>;
  async act(output: string): Promise<void>;
  async receive(msg: AgentMessage): Promise<void>;
}
```

#### 3.3.3 工作流执行器
```typescript
class WorkflowEngine {
  workflow: Workflow;
  agents: Map<AgentId, BaseAgent>;
  
  async execute(initial_input: string): Promise<WorkflowResult>;
  async executeStage(stage: WorkflowStage): Promise<void>;
}
```

---

## 4. 验收标准

### 4.1 功能验收

| 验收项 | 判据 |
|--------|------|
| 工作流解析 | YAML文件能正确解析为工作流图谱 |
| Planner Agent | 输入主题能生成完整文档大纲 |
| Editor Agent | 能根据大纲生成各章节内容 |
| Reviewer Agent | 能识别语法错误并提供修改建议 |
| 并发执行 | 多Editor Agent能并行处理不同章节 |
| 状态可视化 | 实时显示当前执行阶段和Agent状态 |
| 最终输出 | 生成完整可读的文档 |

### 4.2 测试通过率

| 文件 | 测试数 | 最低通过 |
|------|--------|----------|
| workflowEngine.test.ts | 4 | 80% |
| agentManager.test.ts | 4 | 80% |
| yamlParser.test.ts | 3 | 80% |
| **总计** | **11** | **≥80%** |

---

## 5. 参考设计文档

| 设计文档 | 关键借鉴点 |
|----------|-----------|
| claude-code-design | Feature Flags（Agent开关控制） |
| nanobot-design | MessageBus架构、原子性消息传递 |
| chatdev-design | 虚拟软件公司角色分工、阶段化执行 |
| thunderbolt-design | 跨平台状态管理（Zustand + TanStack Query） |
| generic-agent-design | L0-L4分层、Agent自我进化 |
| ruflo-design | YAML工作流编排、Multi-Agent可视化 |