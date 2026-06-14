import { describe, it, expect } from 'vitest';
import {
  createTemplateState, createTemplate, updateTemplate, deleteTemplate,
  getTemplate, listTemplates, findTemplatesByType, cloneTemplate, getTemplateReport,
  type AgentDefinition,
} from '../../forge/V185-AgentTemplate';

describe('V185 AgentTemplate', () => {
  it('should create empty state', () => {
    const s = createTemplateState();
    expect(s.templates.size).toBe(0);
    expect(s.nextId).toBe(1);
  });

  it('should create template', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'editor1', type: 'editor', role: 'edit docs', systemPrompt: 'You are an editor', tools: ['spell-check'], outputFormat: 'markdown', parameters: { temp: 0.7 }, author: 'me' });
    expect(s.templates.size).toBe(1);
  });

  it('should update template', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    const id = s.templates.keys().next().value as string;
    s = updateTemplate(s, id, { name: 'updated' });
    expect(s.templates.get(id)!.name).toBe('updated');
  });

  it('should delete template', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    const id = s.templates.keys().next().value as string;
    s = deleteTemplate(s, id);
    expect(s.templates.size).toBe(0);
  });

  it('should get template by id', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    const id = s.templates.keys().next().value as string;
    const t = getTemplate(s, id);
    expect(t).toBeDefined();
  });

  it('should list templates', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    s = createTemplate(s, { name: 'b', type: 'reviewer', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    expect(listTemplates(s)).toHaveLength(2);
  });

  it('should find templates by type', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    s = createTemplate(s, { name: 'b', type: 'reviewer', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    expect(findTemplatesByType(s, 'editor')).toHaveLength(1);
  });

  it('should clone template', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    const id = s.templates.keys().next().value as string;
    s = cloneTemplate(s, id, 'a-clone');
    expect(s.templates.size).toBe(2);
  });

  it('should produce report', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    s = createTemplate(s, { name: 'b', type: 'reviewer', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me2' });
    const r = getTemplateReport(s);
    expect(r.total).toBe(2);
    expect(r.byType.editor).toBe(1);
    expect(r.authors).toBe(2);
  });

  it('should default version to 1.0.0', () => {
    let s = createTemplateState();
    s = createTemplate(s, { name: 'a', type: 'editor', role: 'r', systemPrompt: 'p', tools: [], outputFormat: 'text', parameters: {}, author: 'me' });
    const id = s.templates.keys().next().value as string;
    expect(s.templates.get(id)!.version).toBe('1.0.0');
  });
});
