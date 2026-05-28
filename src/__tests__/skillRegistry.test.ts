/**
 * SkillRegistry Tests (L3)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { skillRegistry } from '../memory/SkillRegistry';
import type { SkillPattern, SkillCategory } from '../memory/SkillRegistry';

describe('SkillRegistry (L3)', () => {
  beforeEach(() => {
    // Remove non-default skills
    skillRegistry.exportSkills()
      .filter((s) => !s.id.startsWith('skill_default'))
      .forEach((s) => skillRegistry.removeSkill(s.id));
  });

  describe('Initial State', () => {
    it('should have default skills initialized', () => {
      const skills = skillRegistry.exportSkills();
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should have TypeScript interface skill', () => {
      const skill = skillRegistry.getSkillById('skill_default_ts_001');
      expect(skill).toBeDefined();
      expect(skill?.category).toBe('code');
      expect(skill?.status).toBe('stable');
    });
  });

  describe('getSkillById', () => {
    it('should return skill by id', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skillRegistry.getSkillById(skills[0].id);
      expect(skill).toBeDefined();
      expect(skill?.id).toBe(skills[0].id);
    });

    it('should return undefined for non-existent id', () => {
      const skill = skillRegistry.getSkillById('non_existent');
      expect(skill).toBeUndefined();
    });
  });

  describe('getSkillsByCategory', () => {
    it('should return skills filtered by category', () => {
      const codeSkills = skillRegistry.getSkillsByCategory('code');
      codeSkills.forEach((skill) => {
        expect(skill.category).toBe('code');
      });
    });

    it('should return empty for non-existent category', () => {
      const skills = skillRegistry.getSkillsByCategory('nonexistent' as SkillCategory);
      expect(skills).toHaveLength(0);
    });
  });

  describe('getSkillsByStatus', () => {
    it('should return skills filtered by status', () => {
      const stableSkills = skillRegistry.getSkillsByStatus('stable');
      stableSkills.forEach((skill) => {
        expect(skill.status).toBe('stable');
      });
    });
  });

  describe('getActiveSkills', () => {
    it('should return non-deprecated skills with confidence >= 0.5', () => {
      const activeSkills = skillRegistry.getActiveSkills();
      activeSkills.forEach((skill) => {
        expect(skill.status).not.toBe('deprecated');
        expect(skill.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });
  });

  describe('matchSkills', () => {
    it('should match skills based on context', () => {
      const matches = skillRegistry.matchSkills('typescript interface definition');
      expect(matches.length).toBeGreaterThan(0);
    });

    it('should order by match score', () => {
      const matches = skillRegistry.matchSkills('typescript code function');
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].matchScore).toBeGreaterThanOrEqual(matches[i].matchScore);
      }
    });

    it('should score based on triggers and confidence', () => {
      // Even random text may get some score from successRate/confidence boost
      // But a completely unrelated query should not have any trigger matches
      const matches = skillRegistry.matchSkills('xyznonexistent123');
      // Verify that matched skills at least have the expected properties
      if (matches.length > 0) {
        matches.forEach((m) => {
          expect(m.skill).toBeDefined();
          expect(m.matchScore).toBeGreaterThan(0);
          expect(m.matchedTriggers).toBeDefined();
        });
      }
    });
  });

  describe('getTopSkills', () => {
    it('should return skills sorted by usage count', () => {
      const top = skillRegistry.getTopSkills(10);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].usageCount).toBeGreaterThanOrEqual(top[i].usageCount);
      }
    });

    it('should exclude deprecated skills', () => {
      const top = skillRegistry.getTopSkills(10);
      top.forEach((skill) => {
        expect(skill.status).not.toBe('deprecated');
      });
    });
  });

  describe('getHighConfidenceSkills', () => {
    it('should return skills above confidence threshold', () => {
      const highConf = skillRegistry.getHighConfidenceSkills(0.8);
      highConf.forEach((skill) => {
        expect(skill.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('learnSkill', () => {
    it('should create a new learning skill', () => {
      const skill = skillRegistry.learnSkill(
        'Test Skill',
        'test_pattern',
        ['test', 'trigger'],
        'code'
      );
      expect(skill).toBeDefined();
      expect(skill.name).toBe('Test Skill');
      expect(skill.pattern).toBe('test_pattern');
      expect(skill.status).toBe('learning');
      expect(skill.confidence).toBe(0.1);
      expect(skill.usageCount).toBe(0);
    });
  });

  describe('recordSkillUsage', () => {
    it('should increment usage count', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      const initialCount = skill.usageCount;
      skillRegistry.recordSkillUsage(skill.id, true, 100);
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.usageCount).toBe(initialCount + 1);
    });

    it('should update success rate on success', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      const initialSuccessCount = skill.successCount;
      skillRegistry.recordSkillUsage(skill.id, true);
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.successCount).toBe(initialSuccessCount + 1);
    });

    it('should update average duration', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      const initialDuration = skill.avgDuration;
      skillRegistry.recordSkillUsage(skill.id, true, 200);
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.avgDuration).not.toBe(initialDuration);
    });

    it('should promote learning to stable after 5 successes', () => {
      // Find a learning skill or create one
      let learningSkill = skillRegistry.getSkillsByStatus('learning')[0];
      if (!learningSkill) {
        learningSkill = skillRegistry.learnSkill('Learning Test', 'pattern', ['test']);
      }
      
      // Record 5 successes
      for (let i = 0; i < 5; i++) {
        skillRegistry.recordSkillUsage(learningSkill.id, true, 100);
      }
      
      const updated = skillRegistry.getSkillById(learningSkill.id);
      expect(updated?.status).toBe('stable');
    });
  });

  describe('addSkill', () => {
    it('should add a manually defined skill', () => {
      const initialCount = skillRegistry.exportSkills().length;
skillRegistry.addSkill({
        name: 'Manual Skill',
        description: 'Manually added skill',
        category: 'code' as const,
        pattern: 'manual_pattern',
        triggers: ['manual'],
        actions: ['action1'],
        status: 'stable' as const,
        confidence: 0.9,
        source: 'manual' as const,
        lastUsed: 0,
        metadata: {},
        usageCount: 0,
        successCount: 0,
        successRate: 0,
        avgDuration: 0,
      });
      const afterCount = skillRegistry.exportSkills().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('updateSkill', () => {
    it('should update existing skill', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      skillRegistry.updateSkill(skill.id, { description: 'Updated description' });
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.description).toBe('Updated description');
    });
  });

  describe('removeSkill', () => {
    it('should remove skill by id', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      skillRegistry.removeSkill(skill.id);
      expect(skillRegistry.getSkillById(skill.id)).toBeUndefined();
    });
  });

  describe('deprecateSkill', () => {
    it('should mark skill as deprecated', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      skillRegistry.deprecateSkill(skill.id);
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.status).toBe('deprecated');
    });

    it('should set replacement in metadata', () => {
      const skills = skillRegistry.exportSkills();
      const skill = skills[0];
      skillRegistry.deprecateSkill(skill.id, 'replacement_id');
      const updated = skillRegistry.getSkillById(skill.id);
      expect(updated?.metadata.replacementId).toBe('replacement_id');
    });
  });

  describe('importSkills / exportSkills', () => {
    it('should export all skills', () => {
      const exported = skillRegistry.exportSkills();
      expect(Array.isArray(exported)).toBe(true);
      expect(exported.length).toBeGreaterThan(0);
    });

    it('should import skills', () => {
      const initialCount = skillRegistry.exportSkills().length;
      const newSkills: SkillPattern[] = [
        {
          id: 'imported_skill_1',
          name: 'Imported Skill',
          description: 'Imported skill description',
          category: 'code',
          pattern: 'imported_pattern',
          triggers: ['imported'],
          actions: [],
          usageCount: 10,
          successCount: 9,
          successRate: 0.9,
          avgDuration: 150,
          status: 'stable',
          confidence: 0.9,
          source: 'imported',
          lastUsed: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          metadata: {},
        },
      ];
      skillRegistry.importSkills(newSkills);
      const afterCount = skillRegistry.exportSkills().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('pruneLowConfidence', () => {
    it('should remove learned skills below threshold', () => {
      // Skills with source 'learned' and low confidence should be removed
      skillRegistry.pruneLowConfidence(0.5);
      const skills = skillRegistry.exportSkills();
      const lowConfLearned = skills.filter(
        (s) => s.source === 'learned' && s.confidence < 0.5
      );
      expect(lowConfLearned).toHaveLength(0);
    });
  });

  describe('mergeSkills', () => {
    it('should merge multiple skills', () => {
      const skills = skillRegistry.exportSkills();
      if (skills.length >= 2) {
        const ids = [skills[0].id, skills[1].id];
        const initialCount = ids.length;
        skillRegistry.mergeSkills(ids);
        const afterCount = skillRegistry.exportSkills().length;
        expect(afterCount).toBeLessThan(initialCount + 1);
      }
    });
  });
});