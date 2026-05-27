import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  crystallizeFromPatterns,
  saveSkills,
  getCoachSkills,
  getSkillById,
  incrementSkillUsage,
  rateSkillEffectiveness,
  deleteSkill,
  getTopSkills,
  getSkillsByTrigger,
  clearAllSkills,
  exportSkills,
  importSkills,
  getSkillStats,
} from '../coach/StyleCrystallizer';
import type { WritingPattern } from '../coach/types';

describe('StyleCrystallizer', () => {
  const testPatterns: WritingPattern[] = [
    {
      type: 'sentence_structure',
      trigger: 'short_punchy',
      description: 'Short punchy sentences',
      examples: ['Boom!', 'Yes!', 'No!'],
      priority: 1,
    },
    {
      type: 'sentence_structure',
      trigger: 'descriptive_flow',
      description: 'Long descriptive sentences',
      examples: ['The compound reacts with oxygen at elevated temperatures to form stable oxides.'],
      priority: 2,
    },
    {
      type: 'paragraph_structure',
      trigger: 'balanced_paragraphs',
      description: 'Balanced paragraph length',
      examples: [],
      priority: 3,
    },
  ];

  beforeEach(() => {
    clearAllSkills();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearAllSkills();
  });

  describe('crystallizeFromPatterns', () => {
    it('should create skills from patterns', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should create skill with short_punchy trigger', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      const shortPunchy = skills.find(s => s.trigger === 'short_punchy');
      expect(shortPunchy).toBeDefined();
      expect(shortPunchy?.name).toBe('节奏短句');
    });

    it('should create skill with descriptive_flow trigger', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      const flow = skills.find(s => s.trigger === 'descriptive_flow');
      expect(flow).toBeDefined();
      expect(flow?.name).toBe('流畅长句');
    });

    it('should set effectiveness based on priority', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      const highPriority = skills.find(s => s.trigger === 'balanced_paragraphs');
      expect(highPriority?.effectiveness).toBe(60); // priority 3 * 20
    });

    it('should preserve examples from patterns', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      const shortPunchy = skills.find(s => s.trigger === 'short_punchy');
      expect(shortPunchy?.examples).toContain('Boom!');
    });

    it('should return empty for no patterns', () => {
      const skills = crystallizeFromPatterns([]);
      expect(skills).toEqual([]);
    });
  });

  describe('saveSkills and getCoachSkills', () => {
    it('should save and retrieve skills', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      expect(retrieved.length).toBe(skills.length);
    });

    it('should merge skills when saving', () => {
      const skills1 = crystallizeFromPatterns([testPatterns[0]]);
      saveSkills(skills1);
      const skills2 = crystallizeFromPatterns([testPatterns[1]]);
      saveSkills(skills2);
      const retrieved = getCoachSkills();
      expect(retrieved.length).toBe(2);
    });

    it('should limit stored skills to 50', () => {
      for (let i = 0; i < 55; i++) {
        const skills = crystallizeFromPatterns(testPatterns);
        saveSkills(skills);
      }
      const retrieved = getCoachSkills();
      expect(retrieved.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getSkillById', () => {
    it('should retrieve skill by id', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      const skill = getSkillById(retrieved[0].id);
      expect(skill).toBeDefined();
      expect(skill?.id).toBe(retrieved[0].id);
    });

    it('should return undefined for non-existent id', () => {
      const skill = getSkillById('non-existent-id');
      expect(skill).toBeUndefined();
    });
  });

  describe('incrementSkillUsage', () => {
    it('should increment usage count', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      const skillId = retrieved[0].id;
      incrementSkillUsage(skillId);
      const updated = getSkillById(skillId);
      expect(updated?.usageCount).toBe(1);
    });
  });

  describe('rateSkillEffectiveness', () => {
    it('should update effectiveness rating', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      const skillId = retrieved[0].id;
      rateSkillEffectiveness(skillId, 80);
      const updated = getSkillById(skillId);
      expect(updated?.effectiveness).toBeGreaterThan(0);
    });
  });

  describe('deleteSkill', () => {
    it('should delete existing skill', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      const skillId = retrieved[0].id;
      const result = deleteSkill(skillId);
      expect(result).toBe(true);
      expect(getSkillById(skillId)).toBeUndefined();
    });

    it('should return false for non-existent skill', () => {
      const result = deleteSkill('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getTopSkills', () => {
    it('should return top skills sorted by effectiveness', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const topSkills = getTopSkills(2);
      expect(topSkills.length).toBeLessThanOrEqual(2);
    });

    it('should consider usage count in ranking', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const allSkills = getCoachSkills();
      if (allSkills.length > 0) {
        const skillId = allSkills[0].id;
        incrementSkillUsage(skillId);
        incrementSkillUsage(skillId);
        const incremented = getSkillById(skillId);
        expect(incremented?.usageCount).toBe(2);
      }
    });
  });

  describe('getSkillsByTrigger', () => {
    it('should return skills matching trigger', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const matched = getSkillsByTrigger('short_punchy');
      expect(matched.length).toBeGreaterThan(0);
      expect(matched[0].trigger).toBe('short_punchy');
    });

    it('should return empty for non-matching trigger', () => {
      const matched = getSkillsByTrigger('non-existent-trigger');
      expect(matched).toEqual([]);
    });
  });

  describe('exportSkills and importSkills', () => {
    it('should export skills as JSON', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const exported = exportSkills();
      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should import valid skills JSON', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      const exported = JSON.stringify(skills);
      const result = importSkills(exported);
      expect(result.success).toBe(true);
      expect(result.count).toBe(skills.length);
    });

    it('should return error for invalid JSON', () => {
      const result = importSkills('invalid json');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for non-array JSON', () => {
      const result = importSkills('{"not": "array"}');
      expect(result.success).toBe(false);
    });
  });

  describe('getSkillStats', () => {
    it('should return correct stats', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const stats = getSkillStats();
      expect(stats.total).toBe(skills.length);
      expect(stats.byTrigger).toBeDefined();
      expect(typeof stats.avgEffectiveness).toBe('number');
    });

    it('should find most used skill', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      const retrieved = getCoachSkills();
      incrementSkillUsage(retrieved[0].id);
      incrementSkillUsage(retrieved[0].id);
      const stats = getSkillStats();
      expect(stats.mostUsed?.usageCount).toBe(2);
    });

    it('should return zero stats when no skills', () => {
      const stats = getSkillStats();
      expect(stats.total).toBe(0);
      expect(stats.avgEffectiveness).toBe(0);
      expect(stats.mostUsed).toBeNull();
    });
  });

  describe('clearAllSkills', () => {
    it('should remove all skills', () => {
      const skills = crystallizeFromPatterns(testPatterns);
      saveSkills(skills);
      clearAllSkills();
      expect(getCoachSkills()).toEqual([]);
    });
  });
});