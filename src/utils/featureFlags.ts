// Feature Flags system
import { create } from 'zustand';

export type FeatureFlag = 'DREAM_MEMORY' | 'AUTO_COMPACT' | 'LAYERED_MEMORY' | 'SESSION_ARCHIVE';

export interface FeatureFlags {
  DREAM_MEMORY: boolean;
  AUTO_COMPACT: boolean;
  LAYERED_MEMORY: boolean;
  SESSION_ARCHIVE: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  DREAM_MEMORY: true,
  AUTO_COMPACT: true,
  LAYERED_MEMORY: true,
  SESSION_ARCHIVE: true,
};

export function loadFeatureFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem('doc-editor-feature-flags');
    if (stored) return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_FLAGS };
}

export function saveFeatureFlags(flags: FeatureFlags) {
  localStorage.setItem('doc-editor-feature-flags', JSON.stringify(flags));
}

export const ALL_FLAGS: FeatureFlag[] = ['DREAM_MEMORY', 'AUTO_COMPACT', 'LAYERED_MEMORY', 'SESSION_ARCHIVE'];

export const FLAG_DESCRIPTIONS: Record<FeatureFlag, string> = {
  DREAM_MEMORY: '跨会话Dream两阶段记忆（Wake/Dream）',
  AUTO_COMPACT: '上下文自动压缩（token超阈值时触发）',
  LAYERED_MEMORY: 'L0-L4五层记忆架构',
  SESSION_ARCHIVE: '会话归档到L4存档',
};

interface FlagsStore {
  flags: FeatureFlags;
  toggleFlag: (flag: keyof FeatureFlags) => void;
  resetFlags: () => void;
}

export const useFlagsStore = create<FlagsStore>((set) => ({
  flags: loadFeatureFlags(),
  toggleFlag: (flag) =>
    set((state) => {
      const newFlags = { ...state.flags, [flag]: !state.flags[flag] };
      saveFeatureFlags(newFlags);
      return { flags: newFlags };
    }),
  resetFlags: () => {
    const defaultFlags: FeatureFlags = { DREAM_MEMORY: true, AUTO_COMPACT: true, LAYERED_MEMORY: true, SESSION_ARCHIVE: true };
    saveFeatureFlags(defaultFlags);
    set({ flags: defaultFlags });
  },
}));