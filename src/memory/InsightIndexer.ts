/**
 * InsightIndexer (L1) - Keyword to Pattern Routing
 * Maps keywords and phrases to useful patterns for task routing
 */

export interface InsightEntry {
  id: string;
  keywords: string[];
  pattern: string;
  description: string;
  usageCount: number;
  lastUsed: number;
  successRate: number;
  examples: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  entry: InsightEntry;
  matchScore: number;
  matchedKeywords: string[];
}

export interface InsightIndexer {
  // State
  entries: Map<string, InsightEntry>;
  
  // Selectors
  getEntryById: (id: string) => InsightEntry | undefined;
  getEntriesByKeyword: (keyword: string) => InsightEntry[];
  search: (query: string, limit?: number) => SearchResult[];
  getTopEntries: (limit: number) => InsightEntry[];
  getEntriesBySuccessRate: (minRate: number) => InsightEntry[];
  
  // Mutations
  addEntry: (entry: Omit<InsightEntry, 'id' | 'usageCount' | 'lastUsed' | 'createdAt' | 'updatedAt'>) => InsightEntry;
  updateEntry: (id: string, updates: Partial<InsightEntry>) => void;
  removeEntry: (id: string) => void;
  recordUsage: (id: string, success: boolean) => void;
  
  // Bulk
  importEntries: (entries: InsightEntry[]) => void;
  exportEntries: () => InsightEntry[];
  clearUnusedEntries: (olderThanMs?: number) => void;
  mergeSimilar: (ids: string[]) => void;
}

let entryIdCounter = 0;
function generateEntryId(): string {
  return `insight_${Date.now()}_${++entryIdCounter}`;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,.!?;:\[\]{}()]+/).filter(Boolean);
}

function createInsightIndexer(): InsightIndexer {
  const entries = new Map<string, InsightEntry>();
  
  // Initialize with default insights
  const defaultEntries: InsightEntry[] = [
    {
      id: 'insight_default_code_001',
      keywords: ['code', 'function', 'method', 'class', 'typescript', 'javascript'],
      pattern: 'typescript-pattern',
      description: 'TypeScript code patterns for type-safe implementations',
      usageCount: 0,
      lastUsed: 0,
      successRate: 0.95,
      examples: ['interface User { name: string; age: number }'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'insight_default_doc_001',
      keywords: ['document', 'docs', 'markdown', 'readme', 'comment'],
      pattern: 'documentation-pattern',
      description: 'Documentation and comment patterns',
      usageCount: 0,
      lastUsed: 0,
      successRate: 0.88,
      examples: ['/** JSDoc comment */'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'insight_default_test_001',
      keywords: ['test', 'spec', 'unit', 'integration', 'vitest', 'jest'],
      pattern: 'testing-pattern',
      description: 'Testing patterns for unit and integration tests',
      usageCount: 0,
      lastUsed: 0,
      successRate: 0.92,
      examples: ['describe("suite", () => { it("test", () => { ... }) })'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  
  defaultEntries.forEach((entry) => entries.set(entry.id, entry));
  
  return {
    entries,
    
    getEntryById: (id) => entries.get(id),
    
    getEntriesByKeyword: (keyword) => {
      const normalizedKeyword = keyword.toLowerCase();
      return Array.from(entries.values()).filter((entry) =>
        entry.keywords.some((kw) => kw.toLowerCase() === normalizedKeyword)
      );
    },
    
    search: (query, limit = 10) => {
      const tokens = tokenize(query);
      const results: SearchResult[] = [];
      
      for (const entry of entries.values()) {
        let matchScore = 0;
        const matchedKeywords: string[] = [];
        
        for (const token of tokens) {
          // Check keywords
          for (const keyword of entry.keywords) {
            if (keyword.toLowerCase().includes(token)) {
              matchScore += 10;
              matchedKeywords.push(keyword);
            }
          }
          // Check description
          if (entry.description.toLowerCase().includes(token)) {
            matchScore += 5;
          }
          // Check pattern
          if (entry.pattern.toLowerCase().includes(token)) {
            matchScore += 3;
          }
        }
        
        if (matchScore > 0) {
          results.push({
            entry,
            matchScore,
            matchedKeywords: [...new Set(matchedKeywords)],
          });
        }
      }
      
      // Sort by score descending
      results.sort((a, b) => b.matchScore - a.matchScore);
      
      return results.slice(0, limit);
    },
    
    getTopEntries: (limit) => {
      return Array.from(entries.values())
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
    },
    
    getEntriesBySuccessRate: (minRate) =>
      Array.from(entries.values()).filter((e) => e.successRate >= minRate),
    
    addEntry: (entryData) => {
      const entry: InsightEntry = {
        ...entryData,
        id: generateEntryId(),
        usageCount: 0,
        lastUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      entries.set(entry.id, entry);
      return entry;
    },
    
    updateEntry: (id, updates) => {
      const entry = entries.get(id);
      if (!entry) return;
      
      const updated: InsightEntry = {
        ...entry,
        ...updates,
        id: entry.id,
        usageCount: entry.usageCount,
        lastUsed: entry.lastUsed,
        createdAt: entry.createdAt,
        updatedAt: Date.now(),
      };
      entries.set(id, updated);
    },
    
    removeEntry: (id) => {
      entries.delete(id);
    },
    
    recordUsage: (id, success) => {
      const entry = entries.get(id);
      if (!entry) return;
      
      const newUsageCount = entry.usageCount + 1;
      const newSuccessCount = entry.successRate * entry.usageCount + (success ? 1 : 0);
      const newSuccessRate = newSuccessCount / newUsageCount;
      
      entries.set(id, {
        ...entry,
        usageCount: newUsageCount,
        lastUsed: Date.now(),
        successRate: newSuccessRate,
        updatedAt: Date.now(),
      });
    },
    
    importEntries: (newEntries) => {
      newEntries.forEach((entry) => {
        entries.set(entry.id, { ...entry, updatedAt: Date.now() });
      });
    },
    
    exportEntries: () => Array.from(entries.values()),
    
    clearUnusedEntries: (olderThanMs = 30 * 24 * 60 * 60 * 1000) => {
      const threshold = Date.now() - olderThanMs;
      Array.from(entries.keys()).forEach((id) => {
        const entry = entries.get(id)!;
        if (entry.usageCount === 0 && entry.lastUsed < threshold) {
          entries.delete(id);
        }
      });
    },
    
    mergeSimilar: (ids) => {
      if (ids.length < 2) return;
      
      const toMerge = ids.map((id) => entries.get(id)).filter(Boolean) as InsightEntry[];
      if (toMerge.length < 2) return;
      
      // Keep the first entry and merge keywords/examples from others
      const primary = toMerge[0];
      const allKeywords = new Set(primary.keywords);
      const allExamples = new Set(primary.examples);
      
      toMerge.forEach((entry) => {
        entry.keywords.forEach((kw) => allKeywords.add(kw));
        entry.examples.forEach((ex) => allExamples.add(ex));
      });
      
      const totalUsageCount = toMerge.reduce((sum, e) => sum + e.usageCount, 0);
      const weightedSuccessRate =
        toMerge.reduce((sum, e) => sum + e.successRate * e.usageCount, 0) / totalUsageCount;
      
      entries.set(primary.id, {
        ...primary,
        keywords: Array.from(allKeywords),
        examples: Array.from(allExamples),
        usageCount: totalUsageCount,
        successRate: weightedSuccessRate,
        updatedAt: Date.now(),
      });
      
      // Remove merged entries
      toMerge.slice(1).forEach((entry) => entries.delete(entry.id));
    },
  };
}

export const insightIndexer = createInsightIndexer();
export default insightIndexer;