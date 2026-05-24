import { create } from 'zustand';
import type { FeatureFlags } from '../memory/types';

const STORAGE_KEY = 'doc-editor-feature-flags';

const DEFAULT_FLAGS: FeatureFlags = {
  DREAM_MEMORY: false,
  AUTO_COMPACT: false,
  CROSS_SESSION: false,
};

function loadFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_FLAGS, ...JSON.parse(stored) } : { ...DEFAULT_FLAGS };
  } catch { return { ...DEFAULT_FLAGS }; }
}

interface FeatureFlagsStore extends FeatureFlags {
  setFlag: (key: keyof FeatureFlags, value: boolean) => void;
  reset: () => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsStore>((set) => ({
  ...loadFlags(),
  setFlag: (key, value) => {
    set({ [key]: value });
    const flags = loadFlags();
    flags[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  },
  reset: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FLAGS));
    set({ ...DEFAULT_FLAGS });
  },
}));