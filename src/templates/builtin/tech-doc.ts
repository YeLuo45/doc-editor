import type { Template } from '../types';

export const techDocTemplate: Template = {
  id: 'tech-doc',
  name: 'Technical Documentation',
  description: 'Comprehensive technical documentation with API references and troubleshooting',
  category: 'tech-doc',
  author: 'doc-editor',
  tags: ['technical', 'documentation', 'api'],
  content: `# 项目名称

## 概述

[简要介绍项目的目的、主要功能和适用场景。]

## 安装

\`\`\`bash
# 安装命令
npm install package-name
# 或
pip install package-name
\`\`\`

### 系统要求

- 操作系统：Windows / macOS / Linux
- 内存：最低 4GB RAM
- 存储：至少 500MB 可用空间

## 使用

### 基础用法

\`\`\`javascript
// 示例代码
import { Feature } from 'package-name';

const instance = new Feature({
  option1: 'value1',
  option2: 'value2',
});

instance.run();
\`\`\`

### 高级配置

[详细说明各种配置选项和用法。]

## API 参考

### Class: Feature

#### constructor(options)

初始化 Feature 实例。

- \`options\` (Object): 配置对象
  - \`option1\` (string): 选项1说明
  - \`option2\` (number): 选项2说明

#### methodName(params)

方法说明。

**参数：**
- \`param1\` (string): 参数1说明
- \`param2\` (boolean): 参数2说明

**返回值：** Promise\<Result\>

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| config1 | string | default | 配置项1说明 |
| config2 | number | 100 | 配置项2说明 |

## 常见问题

### Q: 问题1？

A: 解答1。

### Q: 问题2？

A: 解答2。`,
};
