/**
 * GlobalFactsStore (L2) - Cross-Session User Preferences
 * Persists user preferences and facts across sessions
 */

export type FactType = 'preference' | 'setting' | 'history' | 'context' | 'custom';

export interface Fact {
  id: string;
  key: string;
  value: unknown;
  type: FactType;
  tags: string[];
  confidence: number; // 0-1
  source: string;
  lastVerified: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}

export interface FactsQuery {
  keys?: string[];
  types?: FactType[];
  tags?: string[];
  includeExpired?: boolean;
  minConfidence?: number;
}

export interface GlobalFactsStore {
  // State
  facts: Map<string, Fact>;
  
  // Selectors
  getFactById: (id: string) => Fact | undefined;
  getFactByKey: (key: string) => Fact | undefined;
  queryFacts: (query: FactsQuery) => Fact[];
  getFactsByType: (type: FactType) => Fact[];
  getFactsByTags: (tags: string[]) => Fact[];
  getPreference: <T>(key: string, defaultValue: T) => T;
  getSetting: <T>(key: string, defaultValue: T) => T;
  
  // Mutations
  setFact: (key: string, value: unknown, type: FactType, tags?: string[]) => Fact;
  updateFact: (id: string, updates: Partial<Fact>) => void;
  removeFact: (id: string) => void;
  verifyFact: (id: string) => void;
  
  // Bulk
  importFacts: (facts: Fact[]) => void;
  exportFacts: (query?: FactsQuery) => Fact[];
  clearExpired: () => void;
  clearByType: (type: FactType) => void;
  mergeFacts: (ids: string[], strategy?: 'keepLatest' | 'keepHighestConfidence' | 'keepMostRecent') => void;
}

let factIdCounter = 0;
function generateFactId(): string {
  return `fact_${Date.now()}_${++factIdCounter}`;
}

function createGlobalFactsStore(): GlobalFactsStore {
  const facts = new Map<string, Fact>();
  
  // Initialize with some default facts
  const defaultFacts: Fact[] = [
    {
      id: 'fact_default_theme_001',
      key: 'theme',
      value: 'dark',
      type: 'preference',
      tags: ['ui', 'appearance'],
      confidence: 1.0,
      source: 'system',
      lastVerified: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'fact_default_lang_001',
      key: 'language',
      value: 'en',
      type: 'preference',
      tags: ['ui', 'localization'],
      confidence: 1.0,
      source: 'system',
      lastVerified: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  
  defaultFacts.forEach((fact) => facts.set(fact.id, fact));
  
  return {
    facts,
    
    getFactById: (id) => facts.get(id),
    
    getFactByKey: (key) =>
      Array.from(facts.values()).find((f) => f.key === key && !isExpired(f)),
    
    queryFacts: (query) => {
      let results = Array.from(facts.values());
      
      if (!query.includeExpired) {
        results = results.filter((f) => !isExpired(f));
      }
      
      if (query.keys?.length) {
        results = results.filter((f) => query.keys!.includes(f.key));
      }
      
      if (query.types?.length) {
        results = results.filter((f) => query.types!.includes(f.type));
      }
      
      if (query.tags?.length) {
        results = results.filter((f) =>
          query.tags!.some((tag) => f.tags.includes(tag))
        );
      }
      
      if (query.minConfidence !== undefined) {
        results = results.filter((f) => f.confidence >= query.minConfidence!);
      }
      
      return results;
    },
    
    getFactsByType: (type) =>
      Array.from(facts.values()).filter((f) => f.type === type && !isExpired(f)),
    
    getFactsByTags: (tags) =>
      Array.from(facts.values()).filter(
        (f) => tags.some((tag) => f.tags.includes(tag)) && !isExpired(f)
      ),
    
    getPreference: <T, K extends string>(key: K, defaultValue: T) => {
      const fact = facts.get(
        Array.from(facts.values()).find(
          (f) => f.key === key && f.type === 'preference' && !isExpired(f)
        )?.id ?? ''
      );
      return fact ? (fact.value as T) : defaultValue;
    },
    
    getSetting: <T, K extends string>(key: K, defaultValue: T) => {
      const fact = Array.from(facts.values()).find(
        (f) => f.key === key && f.type === 'setting' && !isExpired(f)
      );
      return fact ? (fact.value as T) : defaultValue;
    },
    
    setFact: (key, value, type, tags = []) => {
      // Check if fact with same key exists
      const existing = Array.from(facts.values()).find((f) => f.key === key);
      
      const fact: Fact = {
        id: existing ? existing.id : generateFactId(),
        key,
        value,
        type,
        tags,
        confidence: 1.0,
        source: 'user',
        lastVerified: Date.now(),
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      
      facts.set(fact.id, fact);
      return fact;
    },
    
    updateFact: (id, updates) => {
      const fact = facts.get(id);
      if (!fact) return;
      
      facts.set(id, {
        ...fact,
        ...updates,
        id: fact.id,
        createdAt: fact.createdAt,
        updatedAt: Date.now(),
      });
    },
    
    removeFact: (id) => {
      facts.delete(id);
    },
    
    verifyFact: (id) => {
      const fact = facts.get(id);
      if (!fact) return;
      
      facts.set(id, { ...fact, lastVerified: Date.now(), updatedAt: Date.now() });
    },
    
    importFacts: (newFacts) => {
      newFacts.forEach((fact) => {
        facts.set(fact.id, { ...fact, updatedAt: Date.now() });
      });
    },
    
    exportFacts: (query?: FactsQuery) => {
      if (!query) return Array.from(facts.values());
      return Array.from(facts.values()).filter((f) => {
        let matches = true;
        
        if (query.keys?.length) {
          matches = matches && query.keys.includes(f.key);
        }
        if (query.types?.length) {
          matches = matches && query.types.includes(f.type);
        }
        if (query.tags?.length) {
          matches = matches && query.tags.some((tag) => f.tags.includes(tag));
        }
        if (query.minConfidence !== undefined) {
          matches = matches && f.confidence >= query.minConfidence;
        }
        if (!query.includeExpired) {
          matches = matches && !isExpired(f);
        }
        
        return matches;
      });
    },
    
    clearExpired: () => {
      const now = Date.now();
      Array.from(facts.keys()).forEach((id) => {
        const fact = facts.get(id)!;
        if (fact.expiresAt && fact.expiresAt < now) {
          facts.delete(id);
        }
      });
    },
    
    clearByType: (type) => {
      Array.from(facts.keys()).forEach((id) => {
        if (facts.get(id)?.type === type) {
          facts.delete(id);
        }
      });
    },
    
    mergeFacts: (ids, strategy = 'keepLatest') => {
      const toMerge = ids.map((id) => facts.get(id)).filter(Boolean) as Fact[];
      if (toMerge.length < 2) return;
      
      let primary: Fact;
      
      switch (strategy) {
        case 'keepHighestConfidence':
          primary = toMerge.reduce((a, b) =>
            a.confidence >= b.confidence ? a : b
          );
          break;
        case 'keepMostRecent':
          primary = toMerge.reduce((a, b) =>
            a.updatedAt >= b.updatedAt ? a : b
          );
          break;
        case 'keepLatest':
        default:
          primary = toMerge.reduce((a, b) =>
            a.createdAt >= b.createdAt ? a : b
          );
      }
      
      const allTags = new Set(primary.tags);
      toMerge.forEach((f) => f.tags.forEach((t) => allTags.add(t)));
      
      const maxConfidence = Math.max(...toMerge.map((f) => f.confidence));
      
      facts.set(primary.id, {
        ...primary,
        tags: Array.from(allTags),
        confidence: maxConfidence,
        updatedAt: Date.now(),
      });
      
      toMerge.slice(1).forEach((f) => facts.delete(f.id));
    },
  };
}

function isExpired(fact: Fact): boolean {
  return fact.expiresAt !== undefined && fact.expiresAt < Date.now();
}

export const globalFactsStore = createGlobalFactsStore();
export default globalFactsStore;