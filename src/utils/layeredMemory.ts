// L0-L4 Layered Memory System
export type MemoryLayer = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export const L0_META_RULES = [
  '禁止删除文档核心结构',
  '每项操作必须有独立完成判据',
  '禁止凭记忆执行——必须从存储加载',
];

export interface L1InsightEntry { key: string; routeTo: string; summary: string; }
export interface L2GlobalFact { key: string; value: string; updatedAt: number; }
export interface L3Skill { id: string; name: string; description: string; sop: string; createdAt: number; usageCount: number; }
export interface L4SessionArchive { sessionId: string; summary: string; messageCount: number; startTime: number; endTime: number; }

export interface LayeredMemory {
  l0MetaRules: string[];
  l1Insights: L1InsightEntry[];
  l2GlobalFacts: L2GlobalFact[];
  l3Skills: L3Skill[];
  l4Archives: L4SessionArchive[];
}

export function createEmptyMemory(): LayeredMemory {
  return {
    l0MetaRules: [...L0_META_RULES],
    l1Insights: [],
    l2GlobalFacts: [],
    l3Skills: [],
    l4Archives: [],
  };
}

export function getLayerPriority(layer: MemoryLayer): number {
  return { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4 }[layer];
}
