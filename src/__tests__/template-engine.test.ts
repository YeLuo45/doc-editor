/**
 * template-engine.test.ts - V69 Template Engine Tests
 * Tests for TemplateBuilder, TemplateRenderer, TemplateCache, TemplateValidator
 */

import { TemplateBuilder } from '../template-engine/TemplateBuilder';
import { TemplateRenderer } from '../template-engine/TemplateRenderer';
import { TemplateCache } from '../template-engine/TemplateCache';
import { TemplateValidator } from '../template-engine/TemplateValidator';

describe('V69 Template Engine', () => {
  // ===== TemplateBuilder Tests =====
  describe('TemplateBuilder', () => {
    let builder: TemplateBuilder;

    beforeEach(() => {
      builder = new TemplateBuilder({ maxVariables: 10 });
    });

    afterEach(() => {
      builder.reset();
    });

    test('create template with variables', () => {
      const template = builder.create('Hello {{name}}!', 'test1');
      expect(template.id).toBe('test1');
      expect(template.source).toBe('Hello {{name}}!');
      expect(template.variables).toContain('name');
    });

    test('create template extracts multiple variables', () => {
      const template = builder.create('{{greeting}} {{name}}!', 'multi');
      expect(template.variables).toEqual(['greeting', 'name']);
    });

    test('compile regenerates template', () => {
      const original = builder.create('Original {{var}}', 'comp1');
      const recompiled = builder.compile('Modified {{var}}', 'comp1');
      expect(recompiled.source).toBe('Modified {{var}}');
      expect(recompiled.compiledAt).toBeGreaterThanOrEqual(original.compiledAt);
    });

    test('getTemplate retrieves existing template', () => {
      builder.create('Test {{var}}', 'get1');
      const retrieved = builder.getTemplate('get1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.source).toBe('Test {{var}}');
    });

    test('getTemplate returns null for non-existent', () => {
      const result = builder.getTemplate('nonexistent');
      expect(result).toBeNull();
    });

    test('deleteTemplate removes template', () => {
      builder.create('To delete', 'del1');
      const deleted = builder.deleteTemplate('del1');
      expect(deleted).toBe(true);
      expect(builder.getTemplate('del1')).toBeNull();
    });

    test('getSnapshot returns metrics', () => {
      builder.create('{{a}}', 'snap1');
      builder.create('{{b}}', 'snap2');
      const snapshot = builder.getSnapshot();
      expect(snapshot.metrics.templateCount).toBe(2);
      expect(snapshot.metrics.totalVariables).toBe(2);
    });

    test('getReport returns formatted string', () => {
      const report = builder.getReport();
      expect(report).toContain('TemplateBuilder Report');
      expect(report).toContain('Templates:');
    });

    test('exportMetrics returns version', () => {
      const metrics = builder.exportMetrics();
      expect(metrics.version).toContain('v69-template-engine');
    });

    test('reset clears all templates', () => {
      builder.create('{{a}}', 'reset1');
      builder.create('{{b}}', 'reset2');
      builder.reset();
      expect(builder.getSnapshot().metrics.templateCount).toBe(0);
    });
  });

  // ===== TemplateRenderer Tests =====
  describe('TemplateRenderer', () => {
    let renderer: TemplateRenderer;

    beforeEach(() => {
      renderer = new TemplateRenderer({ defaultValue: 'N/A' });
    });

    afterEach(() => {
      renderer.reset();
    });

    test('render substitutes variables', () => {
      const template = { source: 'Hello {{name}}!', variables: ['name'] };
      const result = renderer.render(template, { name: 'World' });
      expect(result.output).toBe('Hello World!');
    });

    test('render with multiple variables', () => {
      const template = { source: '{{greeting}} {{name}}!', variables: ['greeting', 'name'] };
      const result = renderer.render(template, { greeting: 'Hello', name: 'Alice' });
      expect(result.output).toBe('Hello Alice!');
    });

    test('render tracks used variables', () => {
      const template = { source: '{{a}} and {{b}}', variables: ['a', 'b'] };
      const result = renderer.render(template, { a: '1', b: '2' });
      expect(result.usedVariables).toEqual(['a', 'b']);
    });

    test('render with strictUndefined false uses default', () => {
      const renderer2 = new TemplateRenderer({ strictUndefined: false, defaultValue: 'DEFAULT' });
      const template = { source: '{{missing}}', variables: ['missing'] };
      const result = renderer2.render(template, {});
      expect(result.output).toBe('DEFAULT');
      expect(result.missingVariables).toContain('missing');
    });

    test('parse extracts variables from source', () => {
      const result = renderer.parse('{{a}} and {{b}} and {{c}}');
      expect(result.variables).toEqual(['a', 'b', 'c']);
    });

    test('getVariables returns variable list', () => {
      const template = { variables: ['x', 'y', 'z'] };
      const vars = renderer.getVariables(template);
      expect(vars).toEqual(['x', 'y', 'z']);
    });

    test('getSnapshot returns render metrics', () => {
      renderer.render({ source: '{{a}}', variables: ['a'] }, { a: '1' });
      const snapshot = renderer.getSnapshot();
      expect(snapshot.metrics.renderCount).toBe(1);
    });

    test('getReport returns formatted string', () => {
      const report = renderer.getReport();
      expect(report).toContain('TemplateRenderer Report');
    });
  });

  // ===== TemplateCache Tests =====
  describe('TemplateCache', () => {
    let cache: TemplateCache;

    beforeEach(() => {
      cache = new TemplateCache({ maxEntries: 3, ttlMs: 60000 });
    });

    afterEach(() => {
      cache.reset();
    });

    test('set and get cached value', () => {
      cache.set('key1', { data: 'test' });
      const result = cache.get('key1');
      expect(result).toEqual({ data: 'test' });
    });

    test('get returns null for non-existent key', () => {
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('delete removes cached value', () => {
      cache.set('delKey', 'value');
      const deleted = cache.delete('delKey');
      expect(deleted).toBe(true);
      expect(cache.get('delKey')).toBeNull();
    });

    test('clear removes all entries', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.clear();
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
    });

    test('getCached returns metadata', () => {
      cache.set('metaKey', 'value');
      const result = cache.getCached('metaKey');
      expect(result.exists).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.accessCount).toBe(0); // 0 after set, increments on get()
    });

    test('LRU eviction removes least recently used', () => {
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.get('a'); // access 'a'
      cache.set('d', '4'); // should evict 'b' (least recently used)
      expect(cache.get('b')).toBeNull();
      expect(cache.get('a')).not.toBeNull();
    });

    test('getSnapshot returns cache metrics', () => {
      cache.set('m', '1');
      const snapshot = cache.getSnapshot();
      expect(snapshot.metrics.entryCount).toBe(1);
      expect(snapshot.metrics.maxEntries).toBe(3);
    });

    test('getReport returns formatted string', () => {
      const report = cache.getReport();
      expect(report).toContain('TemplateCache Report');
    });
  });

  // ===== TemplateValidator Tests =====
  describe('TemplateValidator', () => {
    let validator: TemplateValidator;

    beforeEach(() => {
      validator = new TemplateValidator({ allowRawHTML: false });
    });

    afterEach(() => {
      validator.reset();
    });

    test('validate valid template returns valid', () => {
      const result = validator.validate('Hello {{name}}!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validate detects unbalanced markers', () => {
      const result = validator.validate('Hello {{name');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unbalanced'))).toBe(true);
    });

    test('validate detects invalid variable names', () => {
      const result = validator.validate('{{123invalid}}');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Invalid variable name'))).toBe(true);
    });

    test('validate detects disallowed HTML tags', () => {
      const result = validator.validate('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Disallowed HTML tag'))).toBe(true);
    });

    test('validate allows whitelisted HTML tags', () => {
      const result = validator.validate('<div>Content</div>');
      expect(result.valid).toBe(true);
    });

    test('getSyntax parses source into nodes', () => {
      const nodes = validator.getSyntax('{{var}} literal <span>');
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes.some(n => n.type === 'variable')).toBe(true);
    });

    test('getErrors returns accumulated errors', () => {
      validator.validate('{{invalid}}');
      const errors = validator.getErrors();
      expect(Array.isArray(errors)).toBe(true);
    });

    test('getSnapshot returns validation metrics', () => {
      const snapshot = validator.getSnapshot();
      expect(snapshot.metrics.maxNestingDepth).toBe(10);
      expect(snapshot.metrics.maxTemplateLength).toBe(50000);
    });

    test('getReport returns formatted string', () => {
      const report = validator.getReport();
      expect(report).toContain('TemplateValidator Report');
    });
  });
});