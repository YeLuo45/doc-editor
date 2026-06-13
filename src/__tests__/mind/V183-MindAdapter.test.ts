import { describe, it, expect } from 'vitest';
import {
  createAdapterState, registerAdaptation, seedDefaultAdaptations,
  switchContext, getCurrentAdaptation, getAdaptation, listAdaptations,
  detectContext, adaptText, getAdapterReport,
  type ContextAdaptation,
} from '../../mind/V183-MindAdapter';

describe('V183 MindAdapter', () => {
  it('should create empty state', () => {
    const s = createAdapterState();
    expect(s.adaptations.size).toBe(0);
    expect(s.currentContext).toBeNull();
  });

  it('should register adaptation', () => {
    let s = createAdapterState();
    const a: ContextAdaptation = { id: 'a1', context: 'academic', parameters: { formality: 0.9, sentenceLength: 150, vocabulary: 0.9, paragraphLength: 500, examples: 0.3 }, active: true };
    s = registerAdaptation(s, a);
    expect(s.adaptations.size).toBe(1);
  });

  it('should seed defaults', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    expect(s.adaptations.size).toBe(6);
  });

  it('should switch context', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    s = switchContext(s, 'academic');
    expect(s.currentContext).toBe('academic');
    expect(s.adaptHistory).toHaveLength(1);
  });

  it('should get current adaptation', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    s = switchContext(s, 'creative');
    const a = getCurrentAdaptation(s);
    expect(a).toBeDefined();
    expect(a!.context).toBe('creative');
  });

  it('should get adaptation by context', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    const a = getAdaptation(s, 'business');
    expect(a).toBeDefined();
  });

  it('should list adaptations', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    expect(listAdaptations(s)).toHaveLength(6);
  });

  it('should detect academic context', () => {
    expect(detectContext('This research study presents an analysis of the data.')).toBe('academic');
  });

  it('should detect business context', () => {
    expect(detectContext('Our revenue strategy and stakeholder metrics for Q1')).toBe('business');
  });

  it('should detect creative context', () => {
    expect(detectContext('She whispered to the wind and felt a deep longing.')).toBe('creative');
  });

  it('should detect technical context', () => {
    expect(detectContext('The API function calls the database server to deploy')).toBe('technical');
  });

  it('should detect casual context', () => {
    expect(detectContext('Hey, yeah I am gonna do that, kinda')).toBe('casual');
  });

  it('should detect journalistic context', () => {
    expect(detectContext('According to officials, the spokesperson reported the news.')).toBe('journalistic');
  });

  it('should adapt text', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    s = switchContext(s, 'academic');
    const adapted = adaptText(s, 'hello world', 'academic');
    expect(adapted).toContain('academic');
    expect(adapted).toContain('hello world');
  });

  it('should produce report', () => {
    let s = createAdapterState();
    s = seedDefaultAdaptations(s);
    s = switchContext(s, 'creative');
    const r = getAdapterReport(s);
    expect(r.registered).toBe(6);
    expect(r.current).toBe('creative');
  });
});
