/**
 * GlobalFactsStore Tests (L2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { globalFactsStore } from '../memory/GlobalFactsStore';
import type { Fact } from '../memory/GlobalFactsStore';

describe('GlobalFactsStore (L2)', () => {
  beforeEach(() => {
    // Clear non-default facts
    globalFactsStore.clearByType('custom');
    globalFactsStore.clearExpired();
  });

  describe('Initial State', () => {
    it('should have default facts initialized', () => {
      const facts = globalFactsStore.exportFacts();
      expect(facts.length).toBeGreaterThan(0);
    });

    it('should have theme preference', () => {
      const theme = globalFactsStore.getFactByKey('theme');
      expect(theme).toBeDefined();
      expect(theme?.value).toBe('dark');
    });

    it('should have language preference', () => {
      const lang = globalFactsStore.getFactByKey('language');
      expect(lang).toBeDefined();
      expect(lang?.value).toBe('en');
    });
  });

  describe('getFactById', () => {
    it('should return fact by id', () => {
      const facts = globalFactsStore.exportFacts();
      const fact = globalFactsStore.getFactById(facts[0].id);
      expect(fact).toBeDefined();
      expect(fact?.id).toBe(facts[0].id);
    });

    it('should return undefined for non-existent id', () => {
      const fact = globalFactsStore.getFactById('non_existent');
      expect(fact).toBeUndefined();
    });
  });

  describe('getFactByKey', () => {
    it('should return fact by key', () => {
      const fact = globalFactsStore.getFactByKey('theme');
      expect(fact).toBeDefined();
      expect(fact?.key).toBe('theme');
    });

    it('should return undefined for non-existent key', () => {
      const fact = globalFactsStore.getFactByKey('nonexistent_key');
      expect(fact).toBeUndefined();
    });
  });

  describe('queryFacts', () => {
    it('should query by type', () => {
      const facts = globalFactsStore.queryFacts({ types: ['preference'] });
      facts.forEach((fact) => {
        expect(fact.type).toBe('preference');
      });
    });

    it('should query by tags', () => {
      const facts = globalFactsStore.queryFacts({ tags: ['ui'] });
      facts.forEach((fact) => {
        expect(fact.tags).toContain('ui');
      });
    });

    it('should query by min confidence', () => {
      const facts = globalFactsStore.queryFacts({ minConfidence: 0.9 });
      facts.forEach((fact) => {
        expect(fact.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('getFactsByType', () => {
    it('should return facts filtered by type', () => {
      const facts = globalFactsStore.getFactsByType('preference');
      facts.forEach((fact) => {
        expect(fact.type).toBe('preference');
      });
    });
  });

  describe('getFactsByTags', () => {
    it('should return facts containing tags', () => {
      const facts = globalFactsStore.getFactsByTags(['ui']);
      facts.forEach((fact) => {
        expect(fact.tags).toContain('ui');
      });
    });
  });

  describe('getPreference', () => {
    it('should return preference value', () => {
      const theme = globalFactsStore.getPreference('theme', 'light');
      expect(theme).toBe('dark');
    });

    it('should return default for non-existent key', () => {
      const value = globalFactsStore.getPreference('nonexistent', 'default_value');
      expect(value).toBe('default_value');
    });
  });

  describe('getSetting', () => {
    it('should return setting value', () => {
      const setting = globalFactsStore.getSetting('nonexistent', 'default');
      expect(setting).toBe('default');
    });
  });

  describe('setFact', () => {
    it('should create new fact', () => {
      const initialCount = globalFactsStore.queryFacts({}).length;
      globalFactsStore.setFact('test_key', 'test_value', 'custom', ['test']);
      const afterCount = globalFactsStore.queryFacts({}).length;
      expect(afterCount).toBe(initialCount + 1);
    });

    it('should update existing fact with same key', () => {
      globalFactsStore.setFact('test_key', 'value1', 'custom');
      globalFactsStore.setFact('test_key', 'value2', 'custom');
      const fact = globalFactsStore.getFactByKey('test_key');
      expect(fact?.value).toBe('value2');
    });

    it('should set correct properties', () => {
      const fact = globalFactsStore.setFact('new_key', 'new_value', 'preference', ['tag1']);
      expect(fact.key).toBe('new_key');
      expect(fact.value).toBe('new_value');
      expect(fact.type).toBe('preference');
      expect(fact.tags).toContain('tag1');
      expect(fact.confidence).toBe(1.0);
      expect(fact.source).toBe('user');
    });
  });

  describe('updateFact', () => {
    it('should update existing fact', () => {
      const facts = globalFactsStore.exportFacts();
      const fact = facts[0];
      globalFactsStore.updateFact(fact.id, { value: 'updated_value' });
      const updated = globalFactsStore.getFactById(fact.id);
      expect(updated?.value).toBe('updated_value');
    });

    it('should update timestamp', () => {
      const facts = globalFactsStore.exportFacts();
      const fact = facts[0];
      const originalUpdated = fact.updatedAt;
      globalFactsStore.updateFact(fact.id, { value: 'updated' });
      const updated = globalFactsStore.getFactById(fact.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdated);
    });
  });

  describe('removeFact', () => {
    it('should remove fact by id', () => {
      const facts = globalFactsStore.exportFacts();
      const fact = facts[0];
      globalFactsStore.removeFact(fact.id);
      expect(globalFactsStore.getFactById(fact.id)).toBeUndefined();
    });
  });

  describe('verifyFact', () => {
    it('should update lastVerified timestamp', () => {
      const facts = globalFactsStore.exportFacts();
      const fact = facts[0];
      globalFactsStore.verifyFact(fact.id);
      const updated = globalFactsStore.getFactById(fact.id);
      expect(updated?.lastVerified).toBeGreaterThan(fact.lastVerified);
    });
  });

  describe('importFacts / exportFacts', () => {
    it('should export all facts', () => {
      const exported = globalFactsStore.exportFacts();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should import facts', () => {
      const initialCount = globalFactsStore.queryFacts({}).length;
      const newFacts: Fact[] = [
        {
          id: 'imported_fact_1',
          key: 'imported_key',
          value: 'imported_value',
          type: 'custom',
          tags: ['imported'],
          confidence: 0.9,
          source: 'import',
          lastVerified: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      globalFactsStore.importFacts(newFacts);
      const afterCount = globalFactsStore.queryFacts({}).length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('clearExpired', () => {
    it('should clear facts past expiration', () => {
      // Add an expired fact
      const fact = globalFactsStore.setFact('expiring', 'value', 'custom');
      globalFactsStore.updateFact(fact.id, { expiresAt: Date.now() - 1000 });
      globalFactsStore.clearExpired();
      expect(globalFactsStore.getFactByKey('expiring')).toBeUndefined();
    });
  });

  describe('clearByType', () => {
    it('should clear all facts of a type', () => {
      globalFactsStore.setFact('custom1', 'value1', 'custom');
      globalFactsStore.setFact('custom2', 'value2', 'custom');
      globalFactsStore.clearByType('custom');
      const remaining = globalFactsStore.queryFacts({ types: ['custom'] });
      expect(remaining.length).toBe(0);
    });
  });

  describe('mergeFacts', () => {
    it('should merge multiple facts', () => {
      const fact1 = globalFactsStore.setFact('merge1', 'value1', 'preference', ['tag1']);
      const fact2 = globalFactsStore.setFact('merge2', 'value2', 'preference', ['tag2']);
      globalFactsStore.mergeFacts([fact1.id, fact2.id], 'keepHighestConfidence');
      const remaining = globalFactsStore.queryFacts({ keys: ['merge1', 'merge2'] });
      expect(remaining.length).toBeLessThan(2);
    });
  });
});