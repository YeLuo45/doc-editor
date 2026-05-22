import type { Template } from '../types';

export const academicTemplate: Template = {
  id: 'academic',
  name: 'Academic Paper',
  description: 'Standard academic paper structure with abstract, keywords, and references',
  category: 'academic',
  author: 'doc-editor',
  tags: ['academic', 'research', 'paper'],
  content: `# 论文标题

## 摘要

[在此处输入摘要内容，简要说明研究目的、方法、结果和结论。]

## 关键词

[关键词1]；[关键词2]；[关键词3]

## 引言

[在此处介绍研究背景、研究问题的提出、以及本文的主要贡献。]

## 方法

[详细描述研究方法、实验设计、数据收集和分析方法。]

## 结果

[展示和描述主要研究结果，可使用表格、图表辅助说明。]

## 讨论

[对结果进行解释和讨论，与已有研究进行比较，讨论局限性和未来方向。]

## 参考文献

[1] 作者. 题目. 期刊名, 年份, 卷(期): 页码.
[2] 作者. 题目. 会议名称, 年份: 页码.
[3] 作者. 书名. 出版社, 年份.`,
};
