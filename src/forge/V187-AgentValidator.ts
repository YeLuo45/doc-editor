/**
 * V187 AgentValidator - Direction B Agent Forge (Iter 3/30)
 * thunderbolt: Validate agent definition (schema, tools, conflicts)
 */
export type ValidationLevel = 'error' | 'warning' | 'info';
export type ValidationRule = 'required' | 'unique' | 'type' | 'format' | 'length' | 'custom';

export interface ValidationIssue {
  level: ValidationLevel;
  rule: ValidationRule;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
}

export interface ValidatorState {
  rules: Map<string, { field: string; rule: ValidationRule; validate: (value: any) => boolean; message: string }>;
  history: ValidationResult[];
}

export function createValidatorState(): ValidatorState {
  return { rules: new Map(), history: [] };
}

export function addRule(state: ValidatorState, name: string, field: string, rule: ValidationRule, validate: (value: any) => boolean, message: string): ValidatorState {
  return { ...state, rules: new Map(state.rules).set(name, { field, rule, validate, message }) };
}

export function removeRule(state: ValidatorState, name: string): ValidatorState {
  const rules = new Map(state.rules);
  rules.delete(name);
  return { ...state, rules };
}

export function validateTemplate(state: ValidatorState, template: Record<string, any>, required: string[] = ['name', 'role', 'systemPrompt']): { state: ValidatorState; result: ValidationResult } {
  const issues: ValidationIssue[] = [];
  // Check required fields
  for (const field of required) {
    if (!template[field] || (typeof template[field] === 'string' && template[field].trim() === '')) {
      issues.push({ level: 'error', rule: 'required', field, message: `${field} is required` });
    }
  }
  // Check name length
  if (template.name && (template.name as string).length > 50) {
    issues.push({ level: 'warning', rule: 'length', field: 'name', message: 'Name is too long' });
  }
  // Check systemPrompt length
  if (template.systemPrompt && (template.systemPrompt as string).length < 10) {
    issues.push({ level: 'warning', rule: 'length', field: 'systemPrompt', message: 'System prompt is too short' });
  }
  // Check tools is array
  if (template.tools && !Array.isArray(template.tools)) {
    issues.push({ level: 'error', rule: 'type', field: 'tools', message: 'tools must be an array' });
  }
  // Check parameters is object
  if (template.parameters && (typeof template.parameters !== 'object' || Array.isArray(template.parameters))) {
    issues.push({ level: 'error', rule: 'type', field: 'parameters', message: 'parameters must be an object' });
  }
  // Apply custom rules
  for (const [name, rule] of state.rules.entries()) {
    const value = template[rule.field];
    if (value !== undefined && !rule.validate(value)) {
      issues.push({ level: 'error', rule: 'custom', field: rule.field, message: `${name}: ${rule.message}` });
    }
  }
  const result: ValidationResult = {
    valid: issues.filter(i => i.level === 'error').length === 0,
    issues,
    errorCount: issues.filter(i => i.level === 'error').length,
    warningCount: issues.filter(i => i.level === 'warning').length,
  };
  return { state: { ...state, history: [...state.history, result].slice(-100) }, result };
}

export function getValidationByLevel(state: ValidatorState, level: ValidationLevel): ValidationIssue[] {
  const all: ValidationIssue[] = [];
  for (const r of state.history) all.push(...r.issues);
  return all.filter(i => i.level === level);
}

export function clearHistory(state: ValidatorState): ValidatorState {
  return { ...state, history: [] };
}

export function getValidatorReport(state: ValidatorState): { rules: number; validationsRun: number; totalErrors: number; totalWarnings: number } {
  let errors = 0, warnings = 0;
  for (const r of state.history) { errors += r.errorCount; warnings += r.warningCount; }
  return { rules: state.rules.size, validationsRun: state.history.length, totalErrors: errors, totalWarnings: warnings };
}
