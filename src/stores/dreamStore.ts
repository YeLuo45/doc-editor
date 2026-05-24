import { create } from 'zustand';
import { dreamMemory, type DreamStats, type DreamArchive } from '../memory/DreamMemory';
import { getL0Meta } from '../memory/layers/L0Meta';
import { getL1Index } from '../memory/layers/L1Index';
import { getL4Sessions, getRecentValidSessions } from '../memory/layers/L4Sessions';
import { getCompactionStats } from '../memory/CompactionEngine';
import type { L0Meta, L1Index, L4Session } from '../memory/types';

interface DreamStore {
  phase: 'wake' | 'dream';
  messageCount: number;
  tokenCount: number;
  dreamCount: number;
  archivesCount: number;
  archives: DreamArchive[];
  l0Meta: L0Meta;
  l1Index: L1Index;
  l4Sessions: L4Session[];
  recentValidSessions: L4Session[];
  compactionStats: ReturnType<typeof getCompactionStats>;
  updateStats: () => void;
  refreshLayers: () => void;
}

export const useDreamStore = create<DreamStore>((set) => ({
  phase: 'wake',
  messageCount: 0,
  tokenCount: 0,
  dreamCount: 0,
  archivesCount: 0,
  archives: [],
  l0Meta: getL0Meta(),
  l1Index: getL1Index(),
  l4Sessions: getL4Sessions(),
  recentValidSessions: getRecentValidSessions(),
  compactionStats: getCompactionStats(),
  updateStats: () => {
    const stats = dreamMemory.getStats();
    set({
      phase: stats.phase as 'wake' | 'dream',
      messageCount: stats.messageCount,
      tokenCount: stats.tokenCount,
      dreamCount: stats.dreamCount,
      archivesCount: stats.archivesCount,
      archives: dreamMemory.getArchives(),
    });
  },
  refreshLayers: () => {
    set({
      l0Meta: getL0Meta(),
      l1Index: getL1Index(),
      l4Sessions: getL4Sessions(),
      recentValidSessions: getRecentValidSessions(),
      compactionStats: getCompactionStats(),
    });
  },
}));