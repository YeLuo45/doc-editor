/**
 * MetaRulesStore (L0) - Hard Constraints/Rules Store
 * Immutable rules that govern agent behavior at the foundational level
 */

export type RulePriority = 'critical' | 'high' | 'medium' | 'low';
export type RuleCategory = 'safety' | 'formatting' | 'workflow' | 'permission' | 'system';

export interface MetaRule {
  id: string;
  pattern: string; // Pattern this rule applies to
  rule: string; // The actual rule text
  priority: RulePriority;
  category: RuleCategory;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface RuleMatch {
  rule: MetaRule;
  matchedText: string;
  position: { start: number; end: number };
}

export interface MetaRulesStore {
  // State
  rules: Map<string, MetaRule>;
  
  // Selectors
  getRuleById: (id: string) => MetaRule | undefined;
  getRulesByCategory: (category: RuleCategory) => MetaRule[];
  getRulesByPriority: (priority: RulePriority) => MetaRule[];
  getEnabledRules: () => MetaRule[];
  matchRules: (text: string) => RuleMatch[];
  
  // Mutations
  addRule: (rule: Omit<MetaRule, 'id' | 'createdAt' | 'updatedAt'>) => MetaRule;
  updateRule: (id: string, updates: Partial<MetaRule>) => void;
  removeRule: (id: string) => void;
  toggleRule: (id: string) => void;
  enableAll: () => void;
  disableAll: () => void;
  
  // Bulk operations
  importRules: (rules: MetaRule[]) => void;
  exportRules: () => MetaRule[];
  clearCustomRules: () => void;
}

let ruleIdCounter = 0;
function generateRuleId(): string {
  return `rule_${Date.now()}_${++ruleIdCounter}`;
}

function createMetaRulesStore(): MetaRulesStore {
  const rules = new Map<string, MetaRule>();
  
  // Initialize with default critical rules
  const defaultRules: MetaRule[] = [
    {
      id: 'rule_default_safety_001',
      pattern: '\\b(exec|eval|run)\\s*\\(',
      rule: 'Avoid dynamic code execution unless absolutely necessary',
      priority: 'critical',
      category: 'safety',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rule_default_formatting_001',
      pattern: '(TODO|FIXME|HACK):',
      rule: 'TODO/FIXME comments should include author and date',
      priority: 'medium',
      category: 'formatting',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'rule_default_workflow_001',
      pattern: '\\b(commit|push|merge)\\b',
      rule: 'Always verify changes before commit/push operations',
      priority: 'high',
      category: 'workflow',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  
  defaultRules.forEach((rule) => rules.set(rule.id, rule));
  
  return {
    rules,
    
    getRuleById: (id) => rules.get(id),
    
    getRulesByCategory: (category) =>
      Array.from(rules.values()).filter((r) => r.category === category),
    
    getRulesByPriority: (priority) =>
      Array.from(rules.values()).filter((r) => r.priority === priority),
    
    getEnabledRules: () =>
      Array.from(rules.values()).filter((r) => r.enabled),
    
    matchRules: (text) => {
      const matches: RuleMatch[] = [];
      const enabledRules = Array.from(rules.values()).filter((r) => r.enabled);
      
      for (const rule of enabledRules) {
        try {
          const regex = new RegExp(rule.pattern, 'gi');
          let match: RegExpExecArray | null;
          
          while ((match = regex.exec(text)) !== null) {
            matches.push({
              rule,
              matchedText: match[0],
              position: { start: match.index, end: match.index + match[0].length },
            });
          }
        } catch {
          // Invalid regex pattern - skip
        }
      }
      
      return matches;
    },
    
    addRule: (ruleData) => {
      const rule: MetaRule = {
        ...ruleData,
        id: generateRuleId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      rules.set(rule.id, rule);
      return rule;
    },
    
    updateRule: (id, updates) => {
      const rule = rules.get(id);
      if (!rule) return;
      
      const updated: MetaRule = {
        ...rule,
        ...updates,
        id: rule.id,
        createdAt: rule.createdAt,
        updatedAt: Date.now(),
      };
      rules.set(id, updated);
    },
    
    removeRule: (id) => {
      rules.delete(id);
    },
    
    toggleRule: (id) => {
      const rule = rules.get(id);
      if (!rule) return;
      
      rules.set(id, { ...rule, enabled: !rule.enabled, updatedAt: Date.now() });
    },
    
    enableAll: () => {
      rules.forEach((rule, id) => {
        if (!rule.enabled) {
          rules.set(id, { ...rule, enabled: true, updatedAt: Date.now() });
        }
      });
    },
    
    disableAll: () => {
      rules.forEach((rule, id) => {
        if (rule.enabled) {
          rules.set(id, { ...rule, enabled: false, updatedAt: Date.now() });
        }
      });
    },
    
    importRules: (newRules) => {
      newRules.forEach((rule) => {
        rules.set(rule.id, { ...rule, updatedAt: Date.now() });
      });
    },
    
    exportRules: () => Array.from(rules.values()),
    
    clearCustomRules: () => {
      // Remove all non-default rules
      const defaultIds = ['rule_default_safety_001', 'rule_default_formatting_001', 'rule_default_workflow_001'];
      Array.from(rules.keys()).forEach((id) => {
        if (!defaultIds.includes(id)) {
          rules.delete(id);
        }
      });
    },
  };
}

export const metaRulesStore = createMetaRulesStore();
export default metaRulesStore;