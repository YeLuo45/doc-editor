import type { Template } from '../types';

export const businessTemplate: Template = {
  id: 'business',
  name: 'Business Report',
  description: 'Professional business report with executive summary and recommendations',
  category: 'business',
  author: 'doc-editor',
  tags: ['business', 'report', 'proposal'],
  content: `# 报告标题

**日期：** [YYYY-MM-DD]
**作者：** [作者姓名]
**部门：** [部门名称]

## 执行摘要

[用2-3句话概括报告的核心发现和主要建议。这是高管阅读的核心部分。]

关键要点：
- 要点1
- 要点2
- 要点3

## 背景

[介绍报告的背景和目的。为什么需要这份报告？要解决什么问题？]

### 项目起源

[描述项目或问题的起源和发展历程。]

### 目标

- 目标1
- 目标2
- 目标3

## 分析

[详细分析过程、方法和主要发现。使用数据、图表辅助说明。]

### 市场分析

[分析市场规模、趋势、竞争格局等。]

### 财务分析

[相关财务数据和分析，包括收入、成本、利润预测等。]

### 风险评估

| 风险因素 | 影响程度 | 可能性 | 应对策略 |
|----------|----------|--------|----------|
| 风险1 | 高 | 中 | 策略1 |
| 风险2 | 中 | 低 | 策略2 |

## 建议

### 短期建议（0-6个月）

1. 建议1
2. 建议2
3. 建议3

### 中期建议（6-12个月）

1. 建议1
2. 建议2

### 长期建议（1年以上）

1. 建议1

## 结论

[总结报告的主要结论，重申核心建议和预期成果。]

---

**附录：**
- 附录A：详细数据
- 附录B：参考资料
- 附录C：术语表`,
};
