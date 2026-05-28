/**
 * MemoryStore - Zustand Store Coordinating All Memory Layers
 * L0: MetaRulesStore, L1: InsightIndexer, L2: GlobalFactsStore, L3: SkillRegistry, L4: EpisodicMemory
 */

import { create } from 'zustand';
import { metaRulesStore } from '../memory/MetaRulesStore';
import { insightIndexer } from '../memory/InsightIndexer';
import { globalFactsStore } from '../memory/GlobalFactsStore';
import { skillRegistry } from '../memory/SkillRegistry';
import { episodicMemory } from '../memory/EpisodicMemory';
import type { TaskCategory } from '../memory/EpisodicMemory';

// Re-export all memory types
export type {
  MetaRule,
  RuleMatch,
  RulePriority,
  RuleCategory,
} from '../memory/MetaRulesStore';

export type {
  InsightEntry,
  SearchResult,
} from '../memory/InsightIndexer';

export type {
  Fact,
  FactType,
  FactsQuery,
} from '../memory/GlobalFactsStore';

export type {
  SkillPattern,
  SkillCategory,
  SkillStatus,
  SkillMatch,
} from '../memory/SkillRegistry';

export type {
  TaskEpisode,
  TaskStep,
  TaskStatus,
  TaskCategory,
  PatternCandidate,
} from '../memory/EpisodicMemory';

interface MemoryState {
  // Memory layers
  metaRulesStore: typeof metaRulesStore;
  insightIndexer: typeof insightIndexer;
  globalFactsStore: typeof globalFactsStore;
  skillRegistry: typeof skillRegistry;
  episodicMemory: typeof episodicMemory;
  
  // Statistics
  stats: {
    totalRules: number;
    totalInsights: number;
    totalFacts: number;
    totalSkills: number;
    totalEpisodes: number;
    totalPatternCandidates: number;
    lastSyncAt: number;
  };
  
  // Actions
  syncStats: () => void;
  resetAllMemory: () => void;
  
  // High-level operations
  processTask: (
    name: string,
    category: TaskCategory,
    context: string
  ) => {
    episodeId: string;
    matchedRules: ReturnType<typeof metaRulesStore.matchRules>;
    matchedInsights: ReturnType<typeof insightIndexer.search>;
    matchedSkills: ReturnType<typeof skillRegistry.matchSkills>;
  };
  learnFromTask: (
    episodeId: string,
    pattern: string,
    triggers: string[]
  ) => string | undefined;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  // Initialize with actual store instances
  metaRulesStore,
  insightIndexer,
  globalFactsStore,
  skillRegistry,
  episodicMemory,
  
  stats: {
    totalRules: metaRulesStore.getEnabledRules().length,
    totalInsights: insightIndexer.entries.size,
    totalFacts: globalFactsStore.queryFacts({}).length,
    totalSkills: skillRegistry.skills.size,
    totalEpisodes: episodicMemory.episodes.size,
    totalPatternCandidates: episodicMemory.patternCandidates.size,
    lastSyncAt: Date.now(),
  },
  
  syncStats: () => {
    set({
      stats: {
        totalRules: metaRulesStore.getEnabledRules().length,
        totalInsights: insightIndexer.entries.size,
        totalFacts: globalFactsStore.queryFacts({}).length,
        totalSkills: skillRegistry.skills.size,
        totalEpisodes: episodicMemory.episodes.size,
        totalPatternCandidates: episodicMemory.patternCandidates.size,
        lastSyncAt: Date.now(),
      },
    });
  },
  
  resetAllMemory: () => {
    // Clear all custom rules
    metaRulesStore.clearCustomRules();
    
    // Clear unused insights
    insightIndexer.clearUnusedEntries();
    
    // Clear user facts
    globalFactsStore.clearByType('preference');
    globalFactsStore.clearByType('context');
    
    // Prune low confidence skills
    skillRegistry.pruneLowConfidence();
    
    // Clear old episodes
    episodicMemory.clearOldEpisodes();
    episodicMemory.clearPatterns();
    
    // Sync stats
    get().syncStats();
  },
  
  processTask: (name, category, context) => {
    // Match against all memory layers
    const matchedRules = metaRulesStore.matchRules(context);
    const matchedInsights = insightIndexer.search(context);
    const matchedSkills = skillRegistry.matchSkills(context);
    
    // Start a new episode
    const episode = episodicMemory.startEpisode(name, category, {
      context,
      matchedRulesCount: matchedRules.length,
      matchedInsightsCount: matchedInsights.length,
      matchedSkillsCount: matchedSkills.length,
    });
    
    // Sync stats
    get().syncStats();
    
    return {
      episodeId: episode.id,
      matchedRules,
      matchedInsights,
      matchedSkills,
    };
  },
  
  learnFromTask: (episodeId, _pattern, _triggers) => {
    const episode = episodicMemory.getEpisodeById(episodeId);
    if (!episode) return undefined;
    
    // Create pattern candidate
    const candidate = episodicMemory.extractPattern(episodeId);
    if (!candidate) return undefined;
    
    // Promote to skill if enough occurrences
    const promotedSkillId = episodicMemory.promotePattern(candidate.id);
    
    if (promotedSkillId) {
      // Sync stats
      get().syncStats();
      return promotedSkillId;
    }
    
    return undefined;
  },
}));

// Selectors for individual layers
export const selectMetaRulesStore = (state: MemoryState) => state.metaRulesStore;
export const selectInsightIndexer = (state: MemoryState) => state.insightIndexer;
export const selectGlobalFactsStore = (state: MemoryState) => state.globalFactsStore;
export const selectSkillRegistry = (state: MemoryState) => state.skillRegistry;
export const selectEpisodicMemory = (state: MemoryState) => state.episodicMemory;
export const selectMemoryStats = (state: MemoryState) => state.stats;

// Sync helper for persisting state
export function syncMemoryToStorage(): void {
  const state = useMemoryStore.getState();
  
  try {
    localStorage.setItem('memory:insights', JSON.stringify(state.insightIndexer.exportEntries()));
    localStorage.setItem('memory:facts', JSON.stringify(state.globalFactsStore.exportFacts()));
    localStorage.setItem('memory:skills', JSON.stringify(state.skillRegistry.exportSkills()));
  } catch {
    // Storage may not be available in all environments
  }
}

// Load helper for restoring state
export function loadMemoryFromStorage(): void {
  const state = useMemoryStore.getState();
  
  try {
    const insights = localStorage.getItem('memory:insights');
    if (insights) {
      state.insightIndexer.importEntries(JSON.parse(insights));
    }
    
    const facts = localStorage.getItem('memory:facts');
    if (facts) {
      state.globalFactsStore.importFacts(JSON.parse(facts));
    }
    
    const skills = localStorage.getItem('memory:skills');
    if (skills) {
      state.skillRegistry.importSkills(JSON.parse(skills));
    }
    
    state.syncStats();
  } catch {
    // Storage may not be available or data may be corrupted
  }
}

export default useMemoryStore;