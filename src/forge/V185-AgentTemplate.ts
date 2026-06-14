/**
 * V185 AgentTemplate - Direction B Agent Forge (Iter 1/30)
 * thunderbolt: Agent definition template (name/role/prompt/tools/output schema)
 */
export type AgentType = 'editor' | 'reviewer' | 'researcher' | 'formatter' | 'custom';
export type OutputFormat = 'text' | 'json' | 'markdown' | 'html';

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  role: string;
  systemPrompt: string;
  tools: string[];
  outputFormat: OutputFormat;
  parameters: Record<string, number>;
  version: string;
  author: string;
  createdAt: number;
}

export interface TemplateState {
  templates: Map<string, AgentDefinition>;
  nextId: number;
}

export function createTemplateState(): TemplateState {
  return { templates: new Map(), nextId: 1 };
}

export function createTemplate(state: TemplateState, def: Omit<AgentDefinition, 'id' | 'createdAt' | 'version'> & { version?: string }): TemplateState {
  const id = `tpl-${state.nextId}`;
  const template: AgentDefinition = { ...def, id, version: def.version || '1.0.0', createdAt: Date.now() };
  return { ...state, templates: new Map(state.templates).set(id, template), nextId: state.nextId + 1 };
}

export function updateTemplate(state: TemplateState, id: string, updates: Partial<AgentDefinition>): TemplateState {
  const t = state.templates.get(id);
  if (!t) return state;
  const updated: AgentDefinition = { ...t, ...updates, id: t.id, createdAt: t.createdAt };
  return { ...state, templates: new Map(state.templates).set(id, updated) };
}

export function deleteTemplate(state: TemplateState, id: string): TemplateState {
  const templates = new Map(state.templates);
  templates.delete(id);
  return { ...state, templates };
}

export function getTemplate(state: TemplateState, id: string): AgentDefinition | undefined {
  return state.templates.get(id);
}

export function listTemplates(state: TemplateState): AgentDefinition[] {
  return Array.from(state.templates.values());
}

export function findTemplatesByType(state: TemplateState, type: AgentType): AgentDefinition[] {
  return Array.from(state.templates.values()).filter(t => t.type === type);
}

export function cloneTemplate(state: TemplateState, id: string, newName: string): TemplateState {
  const t = state.templates.get(id);
  if (!t) return state;
  return createTemplate(state, { ...t, name: newName, id: undefined as any });
}

export function getTemplateReport(state: TemplateState): { total: number; byType: Record<string, number>; authors: number } {
  const byType: Record<string, number> = {};
  const authors = new Set<string>();
  for (const t of state.templates.values()) {
    byType[t.type] = (byType[t.type] || 0) + 1;
    authors.add(t.author);
  }
  return { total: state.templates.size, byType, authors: authors.size };
}
