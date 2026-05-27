import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBudgetStore, getBudgetSummary, estimateTokens } from '../stores/budgetStore';

describe('BudgetStore', () => {
  beforeEach(() => {
    useBudgetStore.getState().clearUsage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    useBudgetStore.getState().clearUsage();
  });

  describe('initial state', () => {
    it('should have default config', () => {
      const state = useBudgetStore.getState();
      expect(state.config.tokensPerDocument).toBe(50000);
      expect(state.config.tokensPerDay).toBe(200000);
      expect(state.config.maxRequestsPerMinute).toBe(20);
    });

    it('should start with no current usage', () => {
      const state = useBudgetStore.getState();
      expect(state.currentUsage).toBeNull();
      expect(state.isOverBudget).toBe(false);
      expect(state.isOverDailyLimit).toBe(false);
    });
  });

  describe('setConfig', () => {
    it('should update config values', () => {
      useBudgetStore.getState().setConfig({ tokensPerDocument: 100000 });
      const state = useBudgetStore.getState();
      expect(state.config.tokensPerDocument).toBe(100000);
    });

    it('should preserve other config values', () => {
      useBudgetStore.getState().setConfig({ warningThreshold: 0.9 });
      const state = useBudgetStore.getState();
      expect(state.config.tokensPerDocument).toBe(50000);
      expect(state.config.warningThreshold).toBe(0.9);
    });
  });

  describe('startDocument and endDocument', () => {
    it('should start document session', () => {
      useBudgetStore.getState().startDocument('doc-123');
      const state = useBudgetStore.getState();
      expect(state.currentUsage).toBeDefined();
      expect(state.currentUsage?.documentId).toBe('doc-123');
      expect(state.currentUsage?.tokensUsed).toBe(0);
    });

    it('should end document session', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().endDocument();
      const state = useBudgetStore.getState();
      expect(state.currentUsage).toBeNull();
    });

    it('should reset usage on new document', () => {
      useBudgetStore.getState().startDocument('doc-1');
      useBudgetStore.getState().recordUsage(1000);
      useBudgetStore.getState().startDocument('doc-2');
      const state = useBudgetStore.getState();
      expect(state.currentUsage?.tokensUsed).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should record token usage', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(500);
      const state = useBudgetStore.getState();
      expect(state.currentUsage?.tokensUsed).toBe(500);
      expect(state.currentUsage?.requestsCount).toBe(1);
    });

    it('should accumulate usage', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(500);
      useBudgetStore.getState().recordUsage(300);
      const state = useBudgetStore.getState();
      expect(state.currentUsage?.tokensUsed).toBe(800);
      expect(state.currentUsage?.requestsCount).toBe(2);
    });

    it('should set isOverBudget when limit exceeded', () => {
      useBudgetStore.getState().setConfig({ tokensPerDocument: 1000 });
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(500);
      useBudgetStore.getState().recordUsage(600);
      const state = useBudgetStore.getState();
      expect(state.isOverBudget).toBe(true);
    });
  });

  describe('checkLimit', () => {
    it('should allow when under limits', () => {
      useBudgetStore.getState().startDocument('doc-123');
      const result = useBudgetStore.getState().checkLimit();
      expect(result.allowed).toBe(true);
    });

    it('should reject when over budget', () => {
      useBudgetStore.getState().setConfig({ tokensPerDocument: 1000 });
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(1500);
      const result = useBudgetStore.getState().checkLimit();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Token配额');
    });

    it('should reject when over daily limit', () => {
      useBudgetStore.getState().setConfig({ tokensPerDay: 1000 });
      useBudgetStore.getState().startDocument('doc-123');
      // Simulate daily limit exceeded via direct state manipulation isn't straightforward
      // Instead test the logic path
      const state = useBudgetStore.getState();
      state.isOverDailyLimit = true;
      const result = state.checkLimit();
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('每日');
    });
  });

  describe('getRemainingTokens', () => {
    it('should return remaining tokens for current document', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(10000);
      const remaining = useBudgetStore.getState().getRemainingTokens('doc-123');
      expect(remaining).toBe(40000);
    });

    it('should return full config when no document started', () => {
      const remaining = useBudgetStore.getState().getRemainingTokens();
      expect(remaining).toBe(50000);
    });

    it('should return zero when over budget', () => {
      useBudgetStore.getState().setConfig({ tokensPerDocument: 1000 });
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(1500);
      const remaining = useBudgetStore.getState().getRemainingTokens('doc-123');
      expect(remaining).toBe(0);
    });
  });

  describe('getRemainingDailyTokens', () => {
    it('should return remaining daily tokens', () => {
      const remaining = useBudgetStore.getState().getRemainingDailyTokens();
      expect(remaining).toBe(200000);
    });
  });

  describe('resetIfNeeded', () => {
    it('should reset usage after timeout', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(1000);
      // Manually set lastReset to an hour ago
      const state = useBudgetStore.getState();
      if (state.currentUsage) {
        state.currentUsage.lastReset = Date.now() - (60 * 60 * 1000 + 1000);
      }
      useBudgetStore.getState().resetIfNeeded();
      const newState = useBudgetStore.getState();
      expect(newState.currentUsage?.tokensUsed).toBe(0);
    });
  });

  describe('getBudgetSummary', () => {
    it('should return budget summary', () => {
      const summary = getBudgetSummary();
      expect(summary.documentRemaining).toBeDefined();
      expect(summary.dailyRemaining).toBeDefined();
      expect(summary.config).toBeDefined();
      expect(typeof summary.canProceed).toBe('boolean');
    });

    it('should reflect current usage in summary', () => {
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(5000);
      const summary = getBudgetSummary();
      expect(summary.documentRemaining).toBe(45000);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate English text', () => {
      const tokens = estimateTokens('Hello world');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should estimate Chinese text', () => {
      const tokens = estimateTokens('你好世界');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should estimate mixed text', () => {
      const tokens = estimateTokens('Hello 你好 world 世界');
      expect(tokens).toBeGreaterThan(0);
    });

    it('should return 0 for empty string', () => {
      const tokens = estimateTokens('');
      expect(tokens).toBe(0);
    });
  });

  describe('clearUsage', () => {
    it('should reset all state', () => {
      useBudgetStore.getState().setConfig({ tokensPerDocument: 100000 });
      useBudgetStore.getState().startDocument('doc-123');
      useBudgetStore.getState().recordUsage(5000);
      useBudgetStore.getState().clearUsage();
      const state = useBudgetStore.getState();
      expect(state.currentUsage).toBeNull();
      expect(state.config.tokensPerDocument).toBe(50000);
      expect(state.isOverBudget).toBe(false);
    });
  });

  describe('daily usage tracking', () => {
    it('should track daily usage separately', () => {
      useBudgetStore.getState().startDocument('doc-1');
      useBudgetStore.getState().recordUsage(1000);
      const daily = useBudgetStore.getState().getRemainingDailyTokens();
      expect(daily).toBeLessThan(200000);
    });
  });
});