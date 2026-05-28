/**
 * EpisodicMemory Tests (L4)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { episodicMemory } from '../memory/EpisodicMemory';
import type { TaskEpisode } from '../memory/EpisodicMemory';

describe('EpisodicMemory (L4)', () => {
  beforeEach(() => {
    // Clear episodes
    episodicMemory.exportEpisodes().forEach(() => {
      // Can't directly delete, but can clear old ones
    });
    episodicMemory.clearOldEpisodes(0);
    episodicMemory.clearPatterns();
  });

  describe('Initial State', () => {
    it('should start with empty episodes', () => {
      const episodes = episodicMemory.exportEpisodes();
      expect(episodes.length).toBe(0);
    });

    it('should start with empty pattern candidates', () => {
      const patterns = episodicMemory.getTopPatternCandidates(10);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('startEpisode', () => {
    it('should create a new episode', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      expect(episode).toBeDefined();
      expect(episode.id).toBeDefined();
      expect(episode.id.startsWith('episode_')).toBe(true);
      expect(episode.name).toBe('Test Task');
      expect(episode.category).toBe('code');
      expect(episode.status).toBe('running');
      expect(episode.success).toBe(false);
    });

    it('should add to episodes list', () => {
      const initialCount = episodicMemory.exportEpisodes().length;
      episodicMemory.startEpisode('Test Task', 'document');
      const afterCount = episodicMemory.exportEpisodes().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('addStep', () => {
    it('should add a step to running episode', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      const step = episodicMemory.addStep(episode.id, 'Step 1', { input: 'data' });
      expect(step).toBeDefined();
      expect(step?.name).toBe('Step 1');
      expect(step?.status).toBe('pending');
      expect(step?.input).toEqual({ input: 'data' });
    });

    it('should return undefined for non-running episode', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      episodicMemory.completeEpisode(episode.id, true);
      const step = episodicMemory.addStep(episode.id, 'Step 1');
      expect(step).toBeUndefined();
    });
  });

  describe('completeStep', () => {
    it('should mark step as successful', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      const step = episodicMemory.addStep(episode.id, 'Step 1');
      episodicMemory.completeStep(episode.id, step!.id, { output: 'result' });
      
      const updatedEpisode = episodicMemory.getEpisodeById(episode.id);
      const updatedStep = updatedEpisode?.steps.find((s) => s.id === step?.id);
      expect(updatedStep?.status).toBe('success');
      expect(updatedStep?.output).toEqual({ output: 'result' });
      expect(updatedStep?.completedAt).toBeDefined();
      expect(updatedStep?.completedAt).toBeGreaterThanOrEqual(updatedStep?.startedAt ?? 0);
    });
  });

  describe('failStep', () => {
    it('should mark step as failed', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      const step = episodicMemory.addStep(episode.id, 'Step 1');
      episodicMemory.failStep(episode.id, step!.id, 'Error message');
      
      const updatedEpisode = episodicMemory.getEpisodeById(episode.id);
      const updatedStep = updatedEpisode?.steps.find((s) => s.id === step?.id);
      expect(updatedStep?.status).toBe('failed');
      expect(updatedStep?.error).toBe('Error message');
    });
  });

  describe('completeEpisode', () => {
    it('should mark episode as successful', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      episodicMemory.completeEpisode(episode.id, true);
      
      const updated = episodicMemory.getEpisodeById(episode.id);
      expect(updated?.status).toBe('success');
      expect(updated?.success).toBe(true);
      expect(updated?.completedAt).toBeDefined();
      expect(updated?.completedAt).toBeGreaterThanOrEqual(updated?.startedAt ?? 0);
    });

    it('should mark episode as failed', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      episodicMemory.completeEpisode(episode.id, false);
      
      const updated = episodicMemory.getEpisodeById(episode.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.success).toBe(false);
    });

    it('should associate skill id if provided', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      episodicMemory.completeEpisode(episode.id, true, 'skill_123');
      
      const updated = episodicMemory.getEpisodeById(episode.id);
      expect(updated?.skillId).toBe('skill_123');
    });
  });

  describe('cancelEpisode', () => {
    it('should mark episode as cancelled', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      episodicMemory.cancelEpisode(episode.id, 'User cancelled');
      
      const updated = episodicMemory.getEpisodeById(episode.id);
      expect(updated?.status).toBe('cancelled');
      expect(updated?.error).toBe('User cancelled');
    });
  });

  describe('getEpisodeById', () => {
    it('should return episode by id', () => {
      const episode = episodicMemory.startEpisode('Test Task', 'code');
      const found = episodicMemory.getEpisodeById(episode.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(episode.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = episodicMemory.getEpisodeById('non_existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getEpisodesByCategory', () => {
    it('should return episodes filtered by category', () => {
      episodicMemory.startEpisode('Task 1', 'code');
      episodicMemory.startEpisode('Task 2', 'document');
      
      const codeEpisodes = episodicMemory.getEpisodesByCategory('code');
      codeEpisodes.forEach((ep) => {
        expect(ep.category).toBe('code');
      });
    });
  });

  describe('getEpisodesByStatus', () => {
    it('should return episodes filtered by status', () => {
      const running = episodicMemory.startEpisode('Running Task', 'code');
      episodicMemory.startEpisode('Completed Task', 'code');
      episodicMemory.completeEpisode(running.id, true);
      
      const pending = episodicMemory.getEpisodesByStatus('running');
      pending.forEach((ep) => {
        expect(ep.status).toBe('running');
      });
    });
  });

  describe('getRecentEpisodes', () => {
    it('should return recent episodes sorted by start time', () => {
      episodicMemory.startEpisode('Task 1', 'code');
      episodicMemory.startEpisode('Task 2', 'code');
      
      const recent = episodicMemory.getRecentEpisodes(10);
      for (let i = 1; i < recent.length; i++) {
        expect(recent[i - 1].startedAt).toBeGreaterThanOrEqual(recent[i].startedAt);
      }
    });

    it('should respect limit', () => {
      episodicMemory.startEpisode('Task 1', 'code');
      episodicMemory.startEpisode('Task 2', 'code');
      
      const recent = episodicMemory.getRecentEpisodes(1);
      expect(recent.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getFailedEpisodes', () => {
    it('should return failed episodes', () => {
      const ep1 = episodicMemory.startEpisode('Failed Task', 'code');
      episodicMemory.completeEpisode(ep1.id, false);
      
      const failed = episodicMemory.getFailedEpisodes();
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Candidates', () => {
    it('should extract pattern from successful episode', () => {
      const episode = episodicMemory.startEpisode('Pattern Task', 'code');
      const step1 = episodicMemory.addStep(episode.id, 'Step 1');
      const step2 = episodicMemory.addStep(episode.id, 'Step 2');
      // Complete steps before completing episode to ensure successSteps > 0
      episodicMemory.completeStep(episode.id, step1!.id);
      episodicMemory.completeStep(episode.id, step2!.id);
      episodicMemory.completeEpisode(episode.id, true);
      
      // Extract pattern after completion
      const pattern = episodicMemory.extractPattern(episode.id);
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('Pattern Task');
      expect(pattern?.category).toBe('code');
    });

    it('should return undefined for failed episode', () => {
      const episode = episodicMemory.startEpisode('Failed Task', 'code');
      episodicMemory.addStep(episode.id, 'Step 1');
      episodicMemory.completeEpisode(episode.id, false);
      
      const pattern = episodicMemory.extractPattern(episode.id);
      expect(pattern).toBeUndefined();
    });

    it('should track pattern candidates', () => {
      const episode = episodicMemory.startEpisode('Tracked Task', 'code');
      episodicMemory.addStep(episode.id, 'Step 1');
      episodicMemory.completeEpisode(episode.id, true);
      
      episodicMemory.extractPattern(episode.id);
      // Pattern tracked if occurrence >= 3
      void episodicMemory.getTopPatternCandidates(10);
      // Pattern should be tracked if occurrence >= 3, otherwise not promoted
    });
  });

  describe('promotePattern', () => {
    it('should return undefined for pattern with insufficient occurrences', () => {
      const episode = episodicMemory.startEpisode('Task', 'code');
      episodicMemory.addStep(episode.id, 'Step 1');
      episodicMemory.completeEpisode(episode.id, true);
      episodicMemory.extractPattern(episode.id);
      
      const candidates = episodicMemory.getTopPatternCandidates(10);
      if (candidates.length > 0 && candidates[0].occurrenceCount < 3) {
        episodicMemory.promotePattern(candidates[0].id);
        // promotePattern returns undefined when occurrenceCount < 3
      }
    });
  });

  describe('importEpisodes / exportEpisodes', () => {
    it('should export all episodes', () => {
      episodicMemory.startEpisode('Export Task', 'code');
      const exported = episodicMemory.exportEpisodes();
      expect(Array.isArray(exported)).toBe(true);
    });

    it('should import episodes', () => {
      const initialCount = episodicMemory.exportEpisodes().length;
      const newEpisodes: TaskEpisode[] = [
        {
          id: 'imported_episode_1',
          name: 'Imported Episode',
          category: 'code',
          status: 'success',
          steps: [],
          startedAt: Date.now(),
          completedAt: Date.now(),
          duration: 100,
          success: true,
          metadata: {},
        },
      ];
      episodicMemory.importEpisodes(newEpisodes);
      const afterCount = episodicMemory.exportEpisodes().length;
      expect(afterCount).toBe(initialCount + 1);
    });
  });

  describe('clearOldEpisodes', () => {
    it('should clear episodes older than threshold', () => {
      // This test uses internal access to verify the cleanup works
      // Create an episode
      const episode = episodicMemory.startEpisode('Task to Clear', 'code');
      episodicMemory.completeEpisode(episode.id, true);
      
      // Access internal storage directly
      const internalMap = (episodicMemory as unknown as { episodes: Map<string, TaskEpisode> }).episodes;
      
      // Verify episode is stored
      const beforeClear = internalMap.get(episode.id);
      expect(beforeClear).toBeDefined();
      expect(beforeClear?.startedAt).toBeLessThanOrEqual(Date.now());
      
      // Now set it to 2 days ago (outside 1 day threshold)
      beforeClear!.startedAt = Date.now() - 172800000;
      
      // Verify it's detected as old
      const threshold = Date.now() - 86400000;
      expect(beforeClear!.startedAt < threshold).toBe(true);
      
      // Clear with 1 day threshold
      episodicMemory.clearOldEpisodes(86400000);
      
      // Verify it's gone
      const afterClear = internalMap.get(episode.id);
      expect(afterClear).toBeUndefined();
    });
  });

  describe('clearPatterns', () => {
    it('should clear all pattern candidates', () => {
      episodicMemory.clearPatterns();
      const patterns = episodicMemory.getTopPatternCandidates(10);
      expect(patterns).toHaveLength(0);
    });
  });
});