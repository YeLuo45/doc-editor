/**
 * SkillRegistry (L3) - Auto-Generated Skill Patterns from Usage
 * Learns and registers patterns based on repeated successful actions
 */

export type SkillCategory = 'code' | 'document' | 'refactor' | 'test' | 'debug' | 'custom';
export type SkillStatus = 'learning' | 'stable' | 'deprecated';

export interface SkillPattern {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  pattern: string; // Code/text pattern
  triggers: string[]; // Keywords that trigger this skill
  actions: string[]; // Actions to take when triggered
  usageCount: number;
  successCount: number;
  successRate: number;
  avgDuration: number; // ms
  status: SkillStatus;
  confidence: number; // 0-1
  source: 'learned' | 'manual' | 'imported';
  lastUsed: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface SkillMatch {
  skill: SkillPattern;
  matchScore: number;
  matchedTriggers: string[];
}

export interface SkillRegistry {
  // State
  skills: Map<string, SkillPattern>;
  
  // Selectors
  getSkillById: (id: string) => SkillPattern | undefined;
  getSkillsByCategory: (category: SkillCategory) => SkillPattern[];
  getSkillsByStatus: (status: SkillStatus) => SkillPattern[];
  getActiveSkills: () => SkillPattern[];
  matchSkills: (context: string) => SkillMatch[];
  getTopSkills: (limit: number) => SkillPattern[];
  getHighConfidenceSkills: (minConfidence: number) => SkillPattern[];
  
  // Learning mutations
  learnSkill: (
    name: string,
    pattern: string,
    triggers: string[],
    category?: SkillCategory
  ) => SkillPattern;
  recordSkillUsage: (id: string, success: boolean, duration?: number) => void;
  improveSkill: (id: string, updates: Partial<SkillPattern>) => void;
  
  // Manual mutations
  addSkill: (skill: Omit<SkillPattern, 'id' | 'createdAt' | 'updatedAt'> & { usageCount?: number; successCount?: number; successRate?: number; avgDuration?: number }) => SkillPattern;
  updateSkill: (id: string, updates: Partial<SkillPattern>) => void;
  removeSkill: (id: string) => void;
  deprecateSkill: (id: string, replacementId?: string) => void;
  
  // Bulk
  importSkills: (skills: SkillPattern[]) => void;
  exportSkills: () => SkillPattern[];
  pruneLowConfidence: (threshold?: number) => void;
  mergeSkills: (ids: string[]) => void;
}

let skillIdCounter = 0;
function generateSkillId(): string {
  return `skill_${Date.now()}_${++skillIdCounter}`;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[\s,.!?;:\[\]{}()]+/).filter(Boolean);
}

function createSkillRegistry(): SkillRegistry {
  const skills = new Map<string, SkillPattern>();
  
  // Initialize with some default learned skills
  const defaultSkills: SkillPattern[] = [
    {
      id: 'skill_default_ts_001',
      name: 'TypeScript Interface',
      description: 'Create TypeScript interface definitions',
      category: 'code',
      pattern: 'interface {{name}} { {{properties}} }',
      triggers: ['interface', 'type', 'typedef'],
      actions: ['createInterface'],
      usageCount: 12,
      successCount: 11,
      successRate: 0.917,
      avgDuration: 150,
      status: 'stable',
      confidence: 0.92,
      source: 'learned',
      lastUsed: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    },
    {
      id: 'skill_default_doc_001',
      name: 'JSDoc Comments',
      description: 'Generate JSDoc comment blocks',
      category: 'document',
      pattern: '/**\\n * {{description}}\\n */',
      triggers: ['jsdoc', 'comment', 'documentation'],
      actions: ['createJSDoc'],
      usageCount: 8,
      successCount: 8,
      successRate: 1.0,
      avgDuration: 80,
      status: 'stable',
      confidence: 0.95,
      source: 'learned',
      lastUsed: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
    },
  ];
  
  defaultSkills.forEach((skill) => skills.set(skill.id, skill));
  
  return {
    skills,
    
    getSkillById: (id) => skills.get(id),
    
    getSkillsByCategory: (category) =>
      Array.from(skills.values()).filter((s) => s.category === category),
    
    getSkillsByStatus: (status) =>
      Array.from(skills.values()).filter((s) => s.status === status),
    
    getActiveSkills: () =>
      Array.from(skills.values()).filter(
        (s) => s.status !== 'deprecated' && s.confidence >= 0.5
      ),
    
    matchSkills: (context) => {
      const tokens = tokenize(context);
      const matches: SkillMatch[] = [];
      
      for (const skill of skills.values()) {
        if (skill.status === 'deprecated') continue;
        
        let matchScore = 0;
        const matchedTriggers: string[] = [];
        
        for (const token of tokens) {
          for (const trigger of skill.triggers) {
            if (trigger.toLowerCase().includes(token) || token.includes(trigger.toLowerCase())) {
              matchScore += 15;
              matchedTriggers.push(trigger);
            }
          }
        }
        
        // Boost score based on success rate and confidence
        matchScore += skill.successRate * 10;
        matchScore += skill.confidence * 10;
        
        if (matchScore > 0) {
          matches.push({
            skill,
            matchScore,
            matchedTriggers: [...new Set(matchedTriggers)],
          });
        }
      }
      
      return matches.sort((a, b) => b.matchScore - a.matchScore);
    },
    
    getTopSkills: (limit) =>
      Array.from(skills.values())
        .filter((s) => s.status !== 'deprecated')
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit),
    
    getHighConfidenceSkills: (minConfidence) =>
      Array.from(skills.values()).filter(
        (s) => s.confidence >= minConfidence && s.status !== 'deprecated'
      ),
    
    learnSkill: (name, pattern, triggers, category = 'custom') => {
      const skill: SkillPattern = {
        id: generateSkillId(),
        name,
        description: `Auto-learned skill: ${name}`,
        category,
        pattern,
        triggers,
        actions: [],
        usageCount: 0,
        successCount: 0,
        successRate: 0,
        avgDuration: 0,
        status: 'learning',
        confidence: 0.1,
        source: 'learned',
        lastUsed: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {},
      };
      
      skills.set(skill.id, skill);
      return skill;
    },
    
    recordSkillUsage: (id, success, duration = 0) => {
      const skill = skills.get(id);
      if (!skill) return;
      
      const newUsageCount = skill.usageCount + 1;
      const newSuccessCount = skill.successCount + (success ? 1 : 0);
      const newSuccessRate = newSuccessCount / newUsageCount;
      const newAvgDuration =
        duration > 0
          ? (skill.avgDuration * skill.usageCount + duration) / newUsageCount
          : skill.avgDuration;
      
      // Update confidence based on success rate and minimum usage
      const newConfidence = Math.min(
        1,
        newSuccessRate * Math.min(1, newUsageCount / 10) * 1.2
      );
      
      // Promote to stable after enough successful uses
      const newStatus: SkillStatus =
        skill.status === 'learning' && newSuccessCount >= 5 ? 'stable' : skill.status;
      
      skills.set(id, {
        ...skill,
        usageCount: newUsageCount,
        successCount: newSuccessCount,
        successRate: newSuccessRate,
        avgDuration: newAvgDuration,
        confidence: newConfidence,
        status: newStatus,
        lastUsed: Date.now(),
        updatedAt: Date.now(),
      });
    },
    
    improveSkill: (id, updates) => {
      const skill = skills.get(id);
      if (!skill) return;
      
      skills.set(id, {
        ...skill,
        ...updates,
        id: skill.id,
        createdAt: skill.createdAt,
        updatedAt: Date.now(),
      });
    },
    
    addSkill: (skillData) => {
      const skill: SkillPattern = {
        ...skillData,
        id: generateSkillId(),
        usageCount: skillData.usageCount ?? 0,
        successCount: skillData.successCount ?? 0,
        successRate: skillData.successRate ?? 0,
        avgDuration: skillData.avgDuration ?? 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      skills.set(skill.id, skill);
      return skill;
    },
    
    updateSkill: (id, updates) => {
      const skill = skills.get(id);
      if (!skill) return;
      
      skills.set(id, {
        ...skill,
        ...updates,
        id: skill.id,
        createdAt: skill.createdAt,
        updatedAt: Date.now(),
      });
    },
    
    removeSkill: (id) => {
      skills.delete(id);
    },
    
    deprecateSkill: (id, replacementId) => {
      const skill = skills.get(id);
      if (!skill) return;
      
      skills.set(id, {
        ...skill,
        status: 'deprecated',
        metadata: {
          ...skill.metadata,
          deprecatedAt: Date.now(),
          replacementId,
        },
        updatedAt: Date.now(),
      });
    },
    
    importSkills: (newSkills) => {
      newSkills.forEach((skill) => {
        skills.set(skill.id, { ...skill, updatedAt: Date.now() });
      });
    },
    
    exportSkills: () => Array.from(skills.values()),
    
    pruneLowConfidence: (threshold = 0.3) => {
      Array.from(skills.keys()).forEach((id) => {
        const skill = skills.get(id)!;
        if (skill.confidence < threshold && skill.source === 'learned') {
          skills.delete(id);
        }
      });
    },
    
    mergeSkills: (ids) => {
      const toMerge = ids.map((id) => skills.get(id)).filter(Boolean) as SkillPattern[];
      if (toMerge.length < 2) return;
      
      const primary = toMerge[0];
      const allTriggers = new Set(primary.triggers);
      const allActions = new Set(primary.actions);
      
      toMerge.forEach((s) => {
        s.triggers.forEach((t) => allTriggers.add(t));
        s.actions.forEach((a) => allActions.add(a));
      });
      
      const totalUsage = toMerge.reduce((sum, s) => sum + s.usageCount, 0);
      const totalSuccess = toMerge.reduce((sum, s) => sum + s.successCount, 0);
      const weightedAvgDuration =
        toMerge.reduce((sum, s) => sum + s.avgDuration * s.usageCount, 0) / totalUsage;
      const maxConfidence = Math.max(...toMerge.map((s) => s.confidence));
      
      skills.set(primary.id, {
        ...primary,
        triggers: Array.from(allTriggers),
        actions: Array.from(allActions),
        usageCount: totalUsage,
        successCount: totalSuccess,
        successRate: totalUsage > 0 ? totalSuccess / totalUsage : 0,
        avgDuration: weightedAvgDuration,
        confidence: maxConfidence,
        updatedAt: Date.now(),
      });
      
      toMerge.slice(1).forEach((s) => skills.delete(s.id));
    },
  };
}

export const skillRegistry = createSkillRegistry();
export default skillRegistry;