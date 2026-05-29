import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentProcessor } from '../document-processor/DocumentProcessor';
import { DocumentParser } from '../document-processor/DocumentParser';
import { DocumentSerializer } from '../document-processor/DocumentSerializer';
import { DocumentAnalyzer } from '../document-processor/DocumentAnalyzer';

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;

  beforeEach(() => {
    processor = new DocumentProcessor();
  });

  it('should process a document', async () => {
    const result = await processor.process({ text: 'hello world' });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.content).toContain('hello world');
  });

  it('should track processed documents', async () => {
    await processor.process({ text: 'doc1' });
    await processor.process({ text: 'doc2' });
    const processed = processor.getProcessed();
    expect(processed).toHaveLength(2);
  });

  it('should get stats', () => {
    const stats = processor.getStats();
    expect(stats).toHaveProperty('totalProcessed');
    expect(stats).toHaveProperty('totalFailed');
    expect(stats).toHaveProperty('queueSize');
  });

  it('should manage queue', () => {
    processor.addToQueue({ text: 'queued' }, 5);
    processor.addToQueue({ text: 'low priority' }, 1);
    const queue = processor.getQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].priority).toBeGreaterThanOrEqual(queue[1].priority);
  });

  it('should remove from queue', () => {
    const id = processor.addToQueue({ text: 'to remove' });
    expect(processor.removeFromQueue(id)).toBe(true);
    expect(processor.getQueue()).toHaveLength(0);
  });

  it('should clear queue', () => {
    processor.addToQueue({ text: 'item1' });
    processor.addToQueue({ text: 'item2' });
    processor.clearQueue();
    expect(processor.getQueue()).toHaveLength(0);
  });

  it('should get snapshot', () => {
    const snapshot = processor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalProcessed');
  });

  it('should reset state', async () => {
    await processor.process({ text: 'test' });
    processor.reset();
    const stats = processor.getStats();
    expect(stats.totalProcessed).toBe(0);
    expect(processor.getProcessed()).toHaveLength(0);
  });

  it('should export metrics', () => {
    const metrics = processor.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });

  it('should get report', () => {
    const report = processor.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('DocumentProcessor');
  });
});

describe('DocumentParser', () => {
  let parser: DocumentParser;

  beforeEach(() => {
    parser = new DocumentParser();
  });

  it('should parse JSON document', async () => {
    const result = await parser.parse('{"key": "value"}');
    expect(result).toBeDefined();
    expect(result.format).toBe('json');
    expect(result.content).toEqual({ key: 'value' });
  });

  it('should parse plain text', async () => {
    const result = await parser.parse('plain text content');
    expect(result.format).toBe('txt');
  });

  it('should parse CSV data', async () => {
    const result = await parser.parse('a,b,c');
    expect(result.format).toBe('csv');
  });

  it('should get all parsed documents', async () => {
    await parser.parse('{"a":1}');
    await parser.parse('{"b":2}');
    expect(parser.getParsed()).toHaveLength(2);
  });

  it('should get supported formats', () => {
    const formats = parser.getFormats();
    expect(formats).toContain('json');
    expect(formats).toContain('xml');
    expect(formats).toContain('yaml');
  });

  it('should get stats', () => {
    const stats = parser.getStats();
    expect(stats).toHaveProperty('totalParsed');
    expect(stats).toHaveProperty('totalFailed');
  });

  it('should get snapshot', () => {
    const snapshot = parser.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset state', async () => {
    await parser.parse('{"test": true}');
    parser.reset();
    expect(parser.getStats().totalParsed).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = parser.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });

  it('should get report', () => {
    const report = parser.getReport();
    expect(typeof report).toBe('string');
  });
});

describe('DocumentSerializer', () => {
  let serializer: DocumentSerializer;

  beforeEach(() => {
    serializer = new DocumentSerializer();
  });

  it('should serialize document to JSON', async () => {
    const result = await serializer.serialize({ key: 'value' }, 'json');
    expect(result).toBeDefined();
    expect(result.format).toBe('json');
    expect(result.data).toContain('key');
  });

  it('should deserialize JSON', async () => {
    const result = await serializer.deserialize('{"test": 123}', 'json');
    expect(result).toEqual({ test: 123 });
  });

  it('should get all serialized documents', async () => {
    await serializer.serialize({ a: 1 });
    await serializer.serialize({ b: 2 });
    expect(serializer.getSerialized()).toHaveLength(2);
  });

  it('should get supported formats', () => {
    const formats = serializer.getFormats();
    expect(formats).toContain('json');
    expect(formats).toContain('xml');
    expect(formats).toContain('yaml');
  });

  it('should get stats', () => {
    const stats = serializer.getStats();
    expect(stats).toHaveProperty('totalSerialized');
    expect(stats).toHaveProperty('totalDeserialized');
  });

  it('should get snapshot', () => {
    const snapshot = serializer.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset state', async () => {
    await serializer.serialize({ test: true });
    serializer.reset();
    expect(serializer.getStats().totalSerialized).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = serializer.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });

  it('should get report', () => {
    const report = serializer.getReport();
    expect(typeof report).toBe('string');
  });

  it('should handle CSV format', async () => {
    const result = await serializer.serialize(['a', 'b', 'c'], 'csv');
    expect(result.data).toBe('a,b,c');
  });
});

describe('DocumentAnalyzer', () => {
  let analyzer: DocumentAnalyzer;

  beforeEach(() => {
    analyzer = new DocumentAnalyzer();
  });

  it('should analyze document', async () => {
    const result = await analyzer.analyze({ text: 'hello world' });
    expect(result).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.metrics.size).toBeGreaterThan(0);
  });

  it('should compute document complexity', async () => {
    const result = await analyzer.analyze({
      nested: { data: { more: { deep: 'value' } } },
    });
    expect(result.metrics.complexity).toBeGreaterThan(0);
  });

  it('should count tokens and words', async () => {
    const result = await analyzer.analyze('hello world test');
    expect(result.metrics.tokenCount).toBeGreaterThanOrEqual(3);
    expect(result.metrics.wordCount).toBeGreaterThanOrEqual(3);
  });

  it('should get all analyses', async () => {
    await analyzer.analyze({ doc: 1 });
    await analyzer.analyze({ doc: 2 });
    expect(analyzer.getAnalysis()).toHaveLength(2);
  });

  it('should get metrics', () => {
    const metrics = analyzer.getMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('should get stats', () => {
    const stats = analyzer.getStats();
    expect(stats).toHaveProperty('totalAnalyzed');
    expect(stats).toHaveProperty('totalFailed');
  });

  it('should get report', () => {
    const report = analyzer.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('DocumentAnalyzer');
  });

  it('should get snapshot', () => {
    const snapshot = analyzer.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  it('should reset state', async () => {
    await analyzer.analyze({ test: true });
    analyzer.reset();
    expect(analyzer.getStats().totalAnalyzed).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = analyzer.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});