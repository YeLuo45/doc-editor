/**
 * EpisodicMemory (L4) - Task Logs to Pattern Extraction
 * Records task execution history and triggers L3 skill learning
 */

import { skillRegistry } from './SkillRegistry';

export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type TaskCategory = 'code' | 'document' | 'refactor' | 'test' | 'debug' | 'other';

export interface TaskStep {
  id: string;
  name: string;
  status: TaskStatus;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  input: unknown;
  output?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface TaskEpisode {
  id: string;
  name: string;
  category: TaskCategory;
  status: TaskStatus;
  steps: TaskStep[];
  startedAt: number;
  completedAt?: number;
  duration?: number;
  success: boolean;
  skillId?: string; // Skill that was used/generated from this episode
  error?: string;
  metadata: Record<string, unknown>;
}

export interface PatternCandidate {
  id: string;
  pattern: string;
  name: string;
  triggers: string[];
  category: TaskCategory;
  occurrenceCount: number;
  avgDuration: number;
  successRate: number;
  lastOccurred: number;
}

export interface EpisodicMemory {
  // State
  episodes: Map<string, TaskEpisode>;
  patternCandidates: Map<string, PatternCandidate>;
  
  // Selectors
  getEpisodeById: (id: string) => TaskEpisode | undefined;
  getEpisodesByCategory: (category: TaskCategory) => TaskEpisode[];
  getEpisodesByStatus: (status: TaskStatus) => TaskEpisode[];
  getRecentEpisodes: (limit: number) => TaskEpisode[];
  getFailedEpisodes: () => TaskEpisode[];
  getPatternCandidateById: (id: string) => PatternCandidate | undefined;
  getTopPatternCandidates: (limit: number) => PatternCandidate[];
  
  // Mutations
  startEpisode: (
    name: string,
    category: TaskCategory,
    metadata?: Record<string, unknown>
  ) => TaskEpisode;
  addStep: (
    episodeId: string,
    name: string,
    input?: unknown
  ) => TaskStep | undefined;
  completeStep: (
    episodeId: string,
    stepId: string,
    output?: unknown
  ) => void;
  failStep: (
    episodeId: string,
    stepId: string,
    error: string
  ) => void;
  completeEpisode: (
    episodeId: string,
    success: boolean,
    skillId?: string
  ) => void;
  cancelEpisode: (episodeId: string, reason?: string) => void;
  
  // Pattern extraction
  extractPattern: (episodeId: string) => PatternCandidate | undefined;
  promotePattern: (patternId: string) => string | undefined;
  discardPattern: (patternId: string) => void;
  
  // Bulk
  importEpisodes: (episodes: TaskEpisode[]) => void;
  exportEpisodes: () => TaskEpisode[];
  clearOldEpisodes: (olderThanMs?: number) => void;
  clearPatterns: () => void;
}

let episodeIdCounter = 0;
let stepIdCounter = 0;
let patternIdCounter = 0;

function generateEpisodeId(): string {
  return `episode_${Date.now()}_${++episodeIdCounter}`;
}

function generateStepId(): string {
  return `step_${Date.now()}_${++stepIdCounter}`;
}

function generatePatternId(): string {
  return `pattern_${Date.now()}_${++patternIdCounter}`;
}

function createEpisodicMemory(): EpisodicMemory {
  const episodes = new Map<string, TaskEpisode>();
  const patternCandidates = new Map<string, PatternCandidate>();
  
  return {
    episodes,
    patternCandidates,
    
    getEpisodeById: (id) => episodes.get(id),
    
    getEpisodesByCategory: (category) =>
      Array.from(episodes.values()).filter((e) => e.category === category),
    
    getEpisodesByStatus: (status) =>
      Array.from(episodes.values()).filter((e) => e.status === status),
    
    getRecentEpisodes: (limit) =>
      Array.from(episodes.values())
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, limit),
    
    getFailedEpisodes: () =>
      Array.from(episodes.values()).filter(
        (e) => e.status === 'failed' || (!e.success && e.completedAt)
      ),
    
    getPatternCandidateById: (id) => patternCandidates.get(id),
    
    getTopPatternCandidates: (limit) =>
      Array.from(patternCandidates.values())
        .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
        .slice(0, limit),
    
    startEpisode: (name, category, metadata = {}) => {
      const episode: TaskEpisode = {
        id: generateEpisodeId(),
        name,
        category,
        status: 'running',
        steps: [],
        startedAt: Date.now(),
        success: false,
        metadata,
      };
      
      episodes.set(episode.id, episode);
      return episode;
    },
    
    addStep: (episodeId, name, input) => {
      const episode = episodes.get(episodeId);
      if (!episode || episode.status !== 'running') return undefined;
      
      const step: TaskStep = {
        id: generateStepId(),
        name,
        status: 'pending',
        startedAt: Date.now(),
        input,
        metadata: {},
      };
      
      episode.steps.push(step);
      return step;
    },
    
    completeStep: (episodeId, stepId, output) => {
      const episode = episodes.get(episodeId);
      if (!episode) return;
      
      const step = episode.steps.find((s) => s.id === stepId);
      if (!step) return;
      
      step.status = 'success';
      step.completedAt = Date.now();
      step.duration = step.completedAt - step.startedAt;
      step.output = output;
    },
    
    failStep: (episodeId, stepId, error) => {
      const episode = episodes.get(episodeId);
      if (!episode) return;
      
      const step = episode.steps.find((s) => s.id === stepId);
      if (!step) return;
      
      step.status = 'failed';
      step.completedAt = Date.now();
      step.duration = step.completedAt - step.startedAt;
      step.error = error;
    },
    
    completeEpisode: (episodeId, success, skillId) => {
      const episode = episodes.get(episodeId);
      if (!episode) return;
      
      episode.status = success ? 'success' : 'failed';
      episode.completedAt = Date.now();
      episode.duration = episode.completedAt - episode.startedAt;
      episode.success = success;
      if (skillId) episode.skillId = skillId;
      
      // Extract pattern if successful
      if (success) {
        const candidate = extractPatternFromEpisode(episode, patternCandidates);
        if (candidate && candidate.occurrenceCount >= 3) {
          patternCandidates.set(candidate.id, candidate);
        }
      }
    },
    
    cancelEpisode: (episodeId, reason) => {
      const episode = episodes.get(episodeId);
      if (!episode) return;
      
      episode.status = 'cancelled';
      episode.completedAt = Date.now();
      episode.duration = episode.completedAt - episode.startedAt;
      episode.error = reason;
      episode.success = false;
    },
    
    extractPattern: (episodeId) => {
      const episode = episodes.get(episodeId);
      if (!episode) return undefined;
      
      return extractPatternFromEpisode(episode, patternCandidates);
    },
    
    promotePattern: (patternId) => {
      const candidate = patternCandidates.get(patternId);
      if (!candidate || candidate.occurrenceCount < 3) return undefined;
      
      // Map TaskCategory to SkillCategory (other -> custom as fallback)
      const skillCategory = candidate.category === 'other' ? 'custom' : candidate.category;
      
      // Create a new skill from the pattern
      const skill = skillRegistry.learnSkill(
        candidate.name,
        candidate.pattern,
        candidate.triggers,
        skillCategory
      );
      
      // Record usage for the new skill
      skillRegistry.recordSkillUsage(skill.id, true, candidate.avgDuration);
      
      // Remove from candidates
      patternCandidates.delete(patternId);
      
      return skill.id;
    },
    
    discardPattern: (patternId) => {
      patternCandidates.delete(patternId);
    },
    
    importEpisodes: (newEpisodes) => {
      newEpisodes.forEach((episode) => {
        episodes.set(episode.id, episode);
      });
    },
    
    exportEpisodes: () => Array.from(episodes.values()),
    
    clearOldEpisodes: (olderThanMs = 90 * 24 * 60 * 60 * 1000) => {
      const threshold = Date.now() - olderThanMs;
      Array.from(episodes.keys()).forEach((id) => {
        const episode = episodes.get(id)!;
        if (episode.startedAt < threshold) {
          episodes.delete(id);
        }
      });
    },
    
    clearPatterns: () => {
      patternCandidates.clear();
    },
  };
}

function extractPatternFromEpisode(
  episode: TaskEpisode,
  patternCandidates: Map<string, PatternCandidate>
): PatternCandidate | undefined {
  if (episode.steps.length === 0) return undefined;
  
  // Extract pattern from steps - simplified pattern extraction
  const stepNames = episode.steps.map((s) => s.name).join(' -> ');
  const successSteps = episode.steps.filter((s) => s.status === 'success');
  const totalDuration = episode.steps.reduce(
    (sum, s) => sum + (s.duration ?? 0),
    0
  );
  
  if (successSteps.length === 0) return undefined;
  
  const candidate: PatternCandidate = {
    id: generatePatternId(),
    pattern: stepNames,
    name: episode.name,
    triggers: [episode.category],
    category: episode.category,
    occurrenceCount: 1,
    avgDuration: totalDuration,
    successRate: episode.success ? 1 : 0,
    lastOccurred: Date.now(),
  };
  
  // Check for existing similar pattern
  const existing = Array.from(patternCandidates.values()).find(
    (p) => p.pattern === candidate.pattern
  );
  
  if (existing) {
    existing.occurrenceCount++;
    existing.avgDuration =
      (existing.avgDuration * (existing.occurrenceCount - 1) + totalDuration) /
      existing.occurrenceCount;
    existing.successRate =
      (existing.successRate * (existing.occurrenceCount - 1) + (episode.success ? 1 : 0)) /
      existing.occurrenceCount;
    existing.lastOccurred = Date.now();
    return existing;
  }
  
  return candidate;
}

export const episodicMemory = createEpisodicMemory();
export default episodicMemory;