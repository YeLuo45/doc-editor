/**
 * BudgetStore - Token quota management for Writing Coach
 * Part of Self-Evolution Writing Coach (Direction C)
 * Uses AI_SUPERPOWER_API_KEY environment variable for budget configuration
 */
import { create } from 'zustand';

export interface BudgetConfig {
  tokensPerDocument: number;
  tokensPerDay: number;
  maxRequestsPerMinute: number;
  warningThreshold: number;
}

export interface BudgetUsage {
  documentId: string;
  tokensUsed: number;
  requestsCount: number;
  lastReset: number;
}

export interface BudgetRecord {
  date: string;
  totalTokens: number;
  totalRequests: number;
  documentsCount: number;
}

export interface BudgetState {
  config: BudgetConfig;
  currentUsage: BudgetUsage | null;
  dailyUsage: BudgetRecord[];
  isOverBudget: boolean;
  isOverDailyLimit: boolean;
}

interface BudgetActions {
  setConfig: (config: Partial<BudgetConfig>) => void;
  startDocument: (documentId: string) => void;
  endDocument: () => void;
  recordUsage: (tokens: number) => void;
  checkLimit: () => { allowed: boolean; reason?: string };
  resetIfNeeded: () => void;
  getRemainingTokens: (documentId?: string) => number;
  getRemainingDailyTokens: () => number;
  clearUsage: () => void;
}

const STORAGE_KEY = 'doc-editor-coach-budget';
const DEFAULT_CONFIG: BudgetConfig = {
  tokensPerDocument: 50000,
  tokensPerDay: 200000,
  maxRequestsPerMinute: 20,
  warningThreshold: 0.8,
};

function loadConfig(): BudgetConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '-config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }

  // Check environment variable (Vite exposes VITE_ prefixed env vars)
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUDGET_CONFIG)
    ? import.meta.env.VITE_BUDGET_CONFIG
    : undefined;
  if (envKey) {
    try {
      const parsed = JSON.parse(atob(envKey));
      if (parsed.budget) {
        return { ...DEFAULT_CONFIG, ...parsed.budget };
      }
    } catch {
      // ignore env parse errors
    }
  }

  return DEFAULT_CONFIG;
}

function saveConfig(config: BudgetConfig): void {
  localStorage.setItem(STORAGE_KEY + '-config', JSON.stringify(config));
}

function loadDailyUsage(): BudgetRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY + '-daily');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveDailyUsage(records: BudgetRecord[]): void {
  localStorage.setItem(STORAGE_KEY + '-daily', JSON.stringify(records));
}

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export const useBudgetStore = create<BudgetState & BudgetActions>((set, get) => ({
  config: loadConfig(),
  currentUsage: null,
  dailyUsage: loadDailyUsage(),
  isOverBudget: false,
  isOverDailyLimit: false,

  setConfig: (newConfig) => {
    const config = { ...get().config, ...newConfig };
    saveConfig(config);
    set({ config });
  },

  startDocument: (documentId) => {
    set({
      currentUsage: {
        documentId,
        tokensUsed: 0,
        requestsCount: 0,
        lastReset: Date.now(),
      },
      isOverBudget: false,
    });
  },

  endDocument: () => {
    set({ currentUsage: null });
  },

  recordUsage: (tokens) => {
    const state = get();
    if (!state.currentUsage) return;

    const newTokensUsed = state.currentUsage.tokensUsed + tokens;
    const newRequestsCount = state.currentUsage.requestsCount + 1;

    const isOverBudget = newTokensUsed >= state.config.tokensPerDocument;

    // Update daily usage
    const today = getTodayKey();
    const dailyUsage = [...state.dailyUsage];
    const todayRecord = dailyUsage.find(r => r.date === today);

    if (todayRecord) {
      todayRecord.totalTokens += tokens;
      todayRecord.totalRequests += 1;
    } else {
      dailyUsage.push({
        date: today,
        totalTokens: tokens,
        totalRequests: 1,
        documentsCount: 1,
      });
    }

    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const filtered = dailyUsage.filter(r => new Date(r.date) >= thirtyDaysAgo);
    saveDailyUsage(filtered);

    const todayTotal = todayRecord ? todayRecord.totalTokens + tokens : tokens;
    const isOverDailyLimit = todayTotal >= state.config.tokensPerDay;

    set({
      currentUsage: {
        ...state.currentUsage,
        tokensUsed: newTokensUsed,
        requestsCount: newRequestsCount,
      },
      dailyUsage: filtered,
      isOverBudget,
      isOverDailyLimit,
    });
  },

  checkLimit: () => {
    const state = get();

    if (state.isOverBudget) {
      return { allowed: false, reason: '文档Token配额已用完' };
    }

    if (state.isOverDailyLimit) {
      return { allowed: false, reason: '每日Token配额已用完' };
    }

    if (state.currentUsage && state.currentUsage.requestsCount >= state.config.maxRequestsPerMinute) {
      return { allowed: false, reason: '请求频率超限' };
    }

    return { allowed: true };
  },

  resetIfNeeded: () => {
    const state = get();
    if (!state.currentUsage) return;

    const now = Date.now();
    const hourMs = 60 * 60 * 1000;

    // Reset if last activity was more than an hour ago
    if (now - state.currentUsage.lastReset > hourMs) {
      set({
        currentUsage: {
          ...state.currentUsage,
          tokensUsed: 0,
          requestsCount: 0,
          lastReset: now,
        },
        isOverBudget: false,
      });
    }
  },

  getRemainingTokens: (documentId) => {
    const state = get();
    if (state.currentUsage && (documentId === undefined || state.currentUsage.documentId === documentId)) {
      return Math.max(0, state.config.tokensPerDocument - state.currentUsage.tokensUsed);
    }
    return state.config.tokensPerDocument;
  },

  getRemainingDailyTokens: () => {
    const state = get();
    const today = getTodayKey();
    const todayRecord = state.dailyUsage.find(r => r.date === today);
    return Math.max(0, state.config.tokensPerDay - (todayRecord?.totalTokens || 0));
  },

  clearUsage: () => {
    localStorage.removeItem(STORAGE_KEY + '-config');
    localStorage.removeItem(STORAGE_KEY + '-daily');
    set({
      config: DEFAULT_CONFIG,
      currentUsage: null,
      dailyUsage: [],
      isOverBudget: false,
      isOverDailyLimit: false,
    });
  },
}));

export function getBudgetSummary(): {
  documentRemaining: number;
  dailyRemaining: number;
  dailyUsed: number;
  config: BudgetConfig;
  canProceed: boolean;
} {
  const state = useBudgetStore.getState();
  const today = getTodayKey();
  const todayRecord = state.dailyUsage.find(r => r.date === today);

  return {
    documentRemaining: state.currentUsage
      ? Math.max(0, state.config.tokensPerDocument - state.currentUsage.tokensUsed)
      : state.config.tokensPerDocument,
    dailyRemaining: Math.max(0, state.config.tokensPerDay - (todayRecord?.totalTokens || 0)),
    dailyUsed: todayRecord?.totalTokens || 0,
    config: state.config,
    canProceed: !state.isOverBudget && !state.isOverDailyLimit,
  };
}

export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 chars for Chinese, or 1 word for English
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return Math.ceil(chineseChars / 2 + englishWords * 1.3);
}