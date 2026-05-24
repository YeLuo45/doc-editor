export type DreamPhase = 'wake' | 'dream';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface DreamArchive {
  id: string;
  summary: string;
  messageCount: number;
  timestamp: number;
}

// L0-L4 Layer Types
export interface L0Meta {
  rules: string[];
  version: string;
}

export interface L1Index {
  skillRoutes: Record<string, string>;
}

export interface L2Facts {
  userPreferences: Record<string, unknown>;
  environment: Record<string, string>;
}

export interface L3Skill {
  id: string;
  name: string;
  description: string;
  steps: string[];
  createdAt: number;
  usageCount: number;
}

export interface L4Session {
  id: string;
  startedAt: number;
  endedAt: number;
  messageCount: number;
  lastDocId?: string;
  contextSummary: string;
  isActive: boolean;
}

export interface FeatureFlags {
  DREAM_MEMORY: boolean;
  AUTO_COMPACT: boolean;
  CROSS_SESSION: boolean;
}