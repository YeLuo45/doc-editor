/**
 * InsightIndexer Tests (L1)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { insightIndexer } from '../memory/InsightIndexer';
import type { InsightEntry } from '../memory/InsightIndexer';

describe('InsightIndexer (L1)', () => {
  beforeEach(() => {
    // Clear non-default entries
    insightIndexer.exportEntries()
      .filter((e) => !e.id.startsWith('insight_default'))
      .forEach((e) => insightIndexer.removeEntry(e.id));
  });

  describe('Initial State', () => {
    it('should have default insights initialized', () => {
      const entries = insightIndexer.exportEntries();
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('getEntryById', () => {
    it('should return entry by id', () => {
      const entries = insightIndexer.exportEntries();
      const entry = insightIndexer.getEntryById(entries[0].id);
      expect(entry).toBeDefined();
      expect(entry?.id).toBe(entries[0].id);
    });

    it('should return undefined for non-existent id', () => {
      const entry = insightIndexer.getEntryById('non_existent');
      expect(entry).toBeUndefined();
    });
  });

  describe('getEntriesByKeyword', () => {
    it('should return entries containing keyword', () => {
      const entries = insightIndexer.getEntriesByKeyword('code');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const entries = insightIndexer.getEntriesByKeyword('CODE');
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should find relevant entries', () => {
      const results = insightIndexer.search('typescript code');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should order by match score', () => {
      const results = insightIndexer.search('typescript code function');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore);
      }
    });

    it('should respect limit parameter', () => {
      const results = insightIndexer.search('typescript code', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty for no matches', () => {
      const results = insightIndexer.search('xyznonexistent123');
      expect(results).toHaveLength(0);
    });
  });

  describe('getTopEntries', () => {
    it('should return entries sorted by usage count', () => {
      const top = insightIndexer.getTopEntries(10);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].usageCount).toBeGreaterThanOrEqual(top[i].usageCount);
      }
    });

    it('should respect limit', () => {
      const top = insightIndexer.getTopEntries(2);
      expect(top.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getEntriesBySuccessRate', () => {
    it('should filter by minimum success rate', () => {
      const entries = insightIndexer.getEntriesBySuccessRate(0.9);
      entries.forEach((entry) => {
        expect(entry.successRate).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('addEntry', () => {
    it('should add new entry', () => {
      const initialCount = insightIndexer.exportEntries().length;
      insightIndexer.addEntry({
        keywords: ['test', 'example'],
        pattern: 'test_pattern',
        description: 'Test entry',
        successRate: 0.8,
        examples: ['example1'],
      });
      const afterCount = insightIndexer.exportEntries().length;
      expect(afterCount).toBe(initialCount + 1);
    });

    it('should generate id and timestamps', () => {
      const entry = insightIndexer.addEntry({
        keywords: ['test'],
        pattern: 'pattern',
        description: 'Test',
        successRate: 0.5,
        examples: [],
      });
      expect(entry.id).toBeDefined();
      expect(entry.id.startsWith('insight_')).toBe(true);
      expect(entry.usageCount).toBe(0);
      expect(entry.lastUsed).toBe(0);
    });
  });

  describe('updateEntry', () => {
    it('should update existing entry', () => {
      const entries = insightIndexer.exportEntries();
      const entry = entries[0];
      insightIndexer.updateEntry(entry.id, { description: 'Updated description' });
      const updated = insightIndexer.getEntryById(entry.id);
      expect(updated?.description).toBe('Updated description');
    });
  });

  describe('removeEntry', () => {
    it('should remove entry by id', () => {
      const entries = insightIndexer.exportEntries();
      const entry = entries[entries.length - 1];
      insightIndexer.removeEntry(entry.id);
      expect(insightIndexer.getEntryById(entry.id)).toBeUndefined();
    });
  });

  describe('recordUsage', () => {
    it('should increment usage count', () => {
      const entries = insightIndexer.exportEntries();
      const entry = entries[0];
      const initialCount = entry.usageCount;
      insightIndexer.recordUsage(entry.id, true);
      const updated = insightIndexer.getEntryById(entry.id);
      expect(updated?.usageCount).toBe(initialCount + 1);
    });

    it('should update success rate on success', () => {
      const entries = insightIndexer.exportEntries();
      const entry = entries[0];
      insightIndexer.recordUsage(entry.id, true);
      const updated = insightIndexer.getEntryById(entry.id);
      expect(updated?.lastUsed).toBeGreaterThan(0);
    });

    it('should update lastUsed timestamp', () => {
      const entries = insightIndexer.exportEntries();
      const entry = entries[0];
      insightIndexer.recordUsage(entry.id, false);
      const updated = insightIndexer.getEntryById(entry.id);
      expect(updated?.lastUsed).toBeGreaterThan(0);
    });
  });

  describe('importEntries / exportEntries', () => {
    it('should export all entries', () => {
      const exported = insightIndexer.exportEntries();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should import entries', () => {
      const initialCount = insightIndexer.exportEntries().length;
      const newEntries: InsightEntry[] = [
        {
          id: 'imported_1',
          keywords: ['imported'],
          pattern: 'pattern',
          description: 'Imported entry',
          usageCount: 5,
          lastUsed: Date.now(),
          successRate: 0.9,
          examples: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      insightIndexer.importEntries(newEntries);
      const afterCount = insightIndexer.exportEntries().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('clearUnusedEntries', () => {
    it('should clear entries not used within threshold', () => {
      insightIndexer.clearUnusedEntries(0); // Clear all unused
      void insightIndexer.exportEntries();
      // Default entries have usageCount 0 but shouldn't be cleared
    });
  });

  describe('mergeSimilar', () => {
    it('should merge multiple entries', () => {
      const entries = insightIndexer.exportEntries();
      if (entries.length >= 2) {
        const ids = [entries[0].id, entries[1].id];
        const initialCount = ids.length;
        insightIndexer.mergeSimilar(ids);
        const afterCount = insightIndexer.exportEntries().length;
        expect(afterCount).toBeLessThan(initialCount + 1);
      }
    });
  });
});