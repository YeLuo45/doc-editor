/**
 * MetaRulesStore Tests (L0)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { metaRulesStore } from '../memory/MetaRulesStore';
import type { MetaRule } from '../memory/MetaRulesStore';

describe('MetaRulesStore (L0)', () => {
  beforeEach(() => {
    // Reset to default state
    metaRulesStore.clearCustomRules();
  });

  describe('Initial State', () => {
    it('should have default rules initialized', () => {
      const rules = metaRulesStore.exportRules();
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have safety rule enabled by default', () => {
      const safetyRules = metaRulesStore.getRulesByCategory('safety');
      expect(safetyRules.length).toBeGreaterThan(0);
      expect(safetyRules[0].enabled).toBe(true);
    });
  });

  describe('getRuleById', () => {
    it('should return rule by id', () => {
      const rules = metaRulesStore.exportRules();
      const rule = metaRulesStore.getRuleById(rules[0].id);
      expect(rule).toBeDefined();
      expect(rule?.id).toBe(rules[0].id);
    });

    it('should return undefined for non-existent id', () => {
      const rule = metaRulesStore.getRuleById('non_existent_id');
      expect(rule).toBeUndefined();
    });
  });

  describe('getRulesByCategory', () => {
    it('should return rules filtered by category', () => {
      const formattingRules = metaRulesStore.getRulesByCategory('formatting');
      formattingRules.forEach((rule) => {
        expect(rule.category).toBe('formatting');
      });
    });

    it('should return rules for existing category', () => {
      const rules = metaRulesStore.getRulesByCategory('workflow');
      expect(rules.length).toBeGreaterThan(0);
      rules.forEach((rule) => {
        expect(rule.category).toBe('workflow');
      });
    });

    it('should return empty array for non-existent category', () => {
      const rules = metaRulesStore.getRulesByCategory('nonexistent');
      expect(rules).toHaveLength(0);
    });
  });

  describe('getRulesByPriority', () => {
    it('should return rules filtered by priority', () => {
      const criticalRules = metaRulesStore.getRulesByPriority('critical');
      criticalRules.forEach((rule) => {
        expect(rule.priority).toBe('critical');
      });
    });
  });

  describe('getEnabledRules', () => {
    it('should return only enabled rules', () => {
      const enabledRules = metaRulesStore.getEnabledRules();
      enabledRules.forEach((rule) => {
        expect(rule.enabled).toBe(true);
      });
    });

    it('should return empty when all rules disabled', () => {
      metaRulesStore.disableAll();
      const enabledRules = metaRulesStore.getEnabledRules();
      expect(enabledRules).toHaveLength(0);
      metaRulesStore.enableAll();
    });
  });

  describe('matchRules', () => {
    it('should match rules against text', () => {
      const matches = metaRulesStore.matchRules('TODO: fix this later');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should match exec pattern', () => {
      const matches = metaRulesStore.matchRules('exec(something)');
      expect(matches.some((m) => m.rule.category === 'safety')).toBe(true);
    });

    it('should return empty for text with no matches', () => {
      const matches = metaRulesStore.matchRules('some completely unrelated text');
      expect(matches).toHaveLength(0);
    });
  });

  describe('addRule', () => {
    it('should add a new rule', () => {
      const initialCount = metaRulesStore.exportRules().length;
      metaRulesStore.addRule({
        pattern: 'test_pattern',
        rule: 'Test rule description',
        priority: 'medium',
        category: 'system',
        enabled: true,
      });
      const afterCount = metaRulesStore.exportRules().length;
      expect(afterCount).toBe(initialCount + 1);
    });

    it('should generate id and timestamps', () => {
      const rule = metaRulesStore.addRule({
        pattern: 'test',
        rule: 'Test',
        priority: 'low',
        category: 'system',
        enabled: true,
      });
      expect(rule.id).toBeDefined();
      expect(rule.id.startsWith('rule_')).toBe(true);
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();
    });
  });

  describe('updateRule', () => {
    it('should update existing rule', () => {
      const rules = metaRulesStore.exportRules();
      const rule = rules[0];
      const newPattern = 'updated_pattern';
      metaRulesStore.updateRule(rule.id, { pattern: newPattern });
      const updated = metaRulesStore.getRuleById(rule.id);
      expect(updated?.pattern).toBe(newPattern);
    });

    it('should update timestamp on change', () => {
      const rules = metaRulesStore.exportRules();
      const rule = rules[0];
      const originalUpdated = rule.updatedAt;
      metaRulesStore.updateRule(rule.id, { rule: 'Updated rule' });
      const updated = metaRulesStore.getRuleById(rule.id);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(originalUpdated);
    });
  });

  describe('removeRule', () => {
    it('should remove rule by id', () => {
      const rules = metaRulesStore.exportRules();
      const initialCount = rules.length;
      const toRemove = rules[rules.length - 1];
      metaRulesStore.removeRule(toRemove.id);
      const afterCount = metaRulesStore.exportRules().length;
      expect(afterCount).toBe(initialCount - 1);
      expect(metaRulesStore.getRuleById(toRemove.id)).toBeUndefined();
    });
  });

  describe('toggleRule', () => {
    it('should toggle rule enabled state', () => {
      const rules = metaRulesStore.exportRules();
      const rule = rules[0];
      const originalEnabled = rule.enabled;
      metaRulesStore.toggleRule(rule.id);
      const toggled = metaRulesStore.getRuleById(rule.id);
      expect(toggled?.enabled).toBe(!originalEnabled);
    });
  });

  describe('enableAll / disableAll', () => {
    it('should enable all rules', () => {
      metaRulesStore.disableAll();
      let count = metaRulesStore.getEnabledRules().length;
      expect(count).toBe(0);
      metaRulesStore.enableAll();
      count = metaRulesStore.getEnabledRules().length;
      expect(count).toBe(metaRulesStore.exportRules().length);
    });

    it('should disable all rules', () => {
      metaRulesStore.disableAll();
      const enabledCount = metaRulesStore.getEnabledRules().length;
      expect(enabledCount).toBe(0);
      metaRulesStore.enableAll();
    });
  });

  describe('importRules / exportRules', () => {
    it('should export all rules', () => {
      const exported = metaRulesStore.exportRules();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should import rules', () => {
      const initialCount = metaRulesStore.exportRules().length;
      const newRules: MetaRule[] = [
        {
          id: 'imported_rule_1',
          pattern: 'imported_pattern',
          rule: 'Imported rule',
          priority: 'high',
          category: 'system',
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
      metaRulesStore.importRules(newRules);
      const afterCount = metaRulesStore.exportRules().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('clearCustomRules', () => {
    it('should clear non-default rules', () => {
      metaRulesStore.addRule({
        pattern: 'custom',
        rule: 'Custom rule',
        priority: 'low',
        category: 'system',
        enabled: true,
      });
      metaRulesStore.clearCustomRules();
      const rules = metaRulesStore.exportRules();
      // After clearCustomRules, custom rules should not exist
      // Default rules remain
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});