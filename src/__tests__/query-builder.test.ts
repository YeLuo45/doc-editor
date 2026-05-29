import { QueryBuilder } from '../query-builder/QueryBuilder';
import { QueryExecutor } from '../query-builder/QueryExecutor';
import { QueryValidator } from '../query-builder/QueryValidator';
import { QueryMonitor } from '../query-builder/QueryMonitor';

describe('QueryBuilder', () => {
  let builder: QueryBuilder;

  beforeEach(() => {
    builder = new QueryBuilder();
  });

  test('should initialize with empty config', () => {
    expect(builder.config).toEqual({});
  });

  test('should build simple SELECT query', () => {
    builder.config = { table: 'users' };
    const query = builder.build();
    expect(query).toContain('SELECT');
    expect(query).toContain('users');
  });

  test('should build query with fields', () => {
    builder.config = { table: 'users', fields: ['id', 'name', 'email'] };
    const query = builder.build();
    expect(query).toContain('id, name, email');
  });

  test('should build query with conditions', () => {
    builder.config = { table: 'users', conditions: { id: 1, name: 'test' } };
    const query = builder.build();
    expect(query).toContain('WHERE');
    expect(query).toContain('id = $1');
    expect(query).toContain('name = $2');
  });

  test('should build query with orderBy', () => {
    builder.config = { table: 'users', orderBy: ['name', 'id'] };
    const query = builder.build();
    expect(query).toContain('ORDER BY name, id');
  });

  test('should build query with limit and offset', () => {
    builder.config = { table: 'users', limit: 10, offset: 5 };
    const query = builder.build();
    expect(query).toContain('LIMIT 10');
    expect(query).toContain('OFFSET 5');
  });

  test('should reset builder state', () => {
    builder.config = { table: 'users' };
    builder.build();
    builder.reset();
    expect(builder.getQuery()).toBe('');
    expect(builder.getParams()).toEqual([]);
  });

  test('should get query', () => {
    builder.config = { table: 'users' };
    builder.build();
    expect(builder.getQuery()).toContain('users');
  });

  test('should get params', () => {
    builder.config = { table: 'users', conditions: { id: 1 } };
    builder.build();
    expect(builder.getParams()).toEqual([1]);
  });

  test('should return snapshot with metrics', () => {
    builder.config = { table: 'users' };
    builder.build();
    const snapshot = builder.getSnapshot();
    expect(snapshot.metrics.metrics).toHaveProperty('buildCount');
    expect(snapshot.metrics.metrics).toHaveProperty('resetCount');
  });

  test('should export metrics with version', () => {
    const metrics = builder.exportMetrics();
    expect(metrics.version).toBeDefined();
    expect(typeof metrics.version).toBe('string');
  });

  test('should get report', () => {
    builder.config = { table: 'users' };
    builder.build();
    const report = builder.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('users');
  });
});

describe('QueryExecutor', () => {
  let executor: QueryExecutor;

  beforeEach(() => {
    executor = new QueryExecutor();
  });

  test('should initialize with config', () => {
    expect(executor.config).toBeDefined();
  });

  test('should execute query', () => {
    const result = executor.execute('SELECT * FROM users', []);
    expect(result).toHaveProperty('rows');
    expect(result).toHaveProperty('duration');
  });

  test('should run query', () => {
    const result = executor.run('SELECT * FROM users');
    expect(result.rows).toBeDefined();
  });

  test('should return results array', () => {
    executor.execute('SELECT 1', []);
    const results = executor.getResults();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('should get execution stats', () => {
    executor.execute('SELECT 1', []);
    const stats = executor.getStats();
    expect(stats).toHaveProperty('totalExecutions');
    expect(stats).toHaveProperty('totalDuration');
  });

  test('should reset executor', () => {
    executor.execute('SELECT 1', []);
    executor.reset();
    const results = executor.getResults();
    expect(results.length).toBe(0);
  });

  test('should get snapshot', () => {
    executor.execute('SELECT 1', []);
    const snapshot = executor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should export metrics', () => {
    const metrics = executor.exportMetrics();
    expect(metrics.version).toBeDefined();
  });

  test('should get report', () => {
    executor.execute('SELECT 1', []);
    const report = executor.getReport();
    expect(typeof report).toBe('string');
  });

  test('should handle empty query error', () => {
    expect(() => executor.execute('', [])).toThrow();
  });
});

describe('QueryValidator', () => {
  let validator: QueryValidator;

  beforeEach(() => {
    validator = new QueryValidator();
  });

  test('should initialize with config', () => {
    expect(validator.config).toBeDefined();
  });

  test('should validate query', () => {
    const result = validator.validate('SELECT * FROM users', []);
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });

  test('should return valid for good query', () => {
    const result = validator.validate('SELECT * FROM users', []);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should detect invalid query', () => {
    const result = validator.validate('', []);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should get errors', () => {
    validator.validate('', []);
    const errors = validator.getErrors();
    expect(Array.isArray(errors)).toBe(true);
  });

  test('should check query validity', () => {
    const isValid = validator.check('SELECT * FROM users');
    expect(typeof isValid).toBe('boolean');
  });

  test('should get schema', () => {
    const schema = validator.getSchema();
    expect(schema).toBeNull();
  });

  test('should reset validator', () => {
    validator.validate('', []);
    validator.reset();
    const errors = validator.getErrors();
    expect(errors.length).toBe(0);
  });

  test('should get snapshot', () => {
    validator.validate('SELECT 1', []);
    const snapshot = validator.getSnapshot();
    expect(snapshot.metrics).toHaveProperty('validationCount');
  });

  test('should export metrics', () => {
    const metrics = validator.exportMetrics();
    expect(metrics.version).toBeDefined();
  });

  test('should get report', () => {
    const report = validator.getReport();
    expect(typeof report).toBe('string');
  });

  test('should detect SQL injection risk in strict mode', () => {
    const strictValidator = new QueryValidator({ strict: true });
    const result = strictValidator.validate('SELECT * FROM users; DROP TABLE users', []);
    expect(result.valid).toBe(false);
  });
});

describe('QueryMonitor', () => {
  let monitor: QueryMonitor;

  beforeEach(() => {
    monitor = new QueryMonitor();
  });

  test('should initialize with config', () => {
    expect(monitor.config).toBeDefined();
  });

  test('should track metrics', () => {
    monitor.track('query_time', 100);
    const status = monitor.getStatus();
    expect(status.trackedCount).toBe(1);
  });

  test('should get metrics', () => {
    monitor.track('query_time', 100);
    monitor.track('query_time', 200);
    const metrics = monitor.getMetrics('query_time');
    expect(metrics.length).toBe(2);
  });

  test('should get all metrics without name', () => {
    monitor.track('metric1', 100);
    monitor.track('metric2', 200);
    const allMetrics = monitor.getMetrics();
    expect(allMetrics.length).toBe(2);
  });

  test('should get history', () => {
    monitor.track('test', 100);
    monitor.track('test', 200);
    const history = monitor.getHistory(1);
    expect(history.length).toBeLessThanOrEqual(1);
  });

  test('should get status', () => {
    monitor.track('test', 100);
    const status = monitor.getStatus();
    expect(status).toHaveProperty('active');
    expect(status).toHaveProperty('trackedCount');
  });

  test('should reset monitor', () => {
    monitor.track('test', 100);
    monitor.reset();
    const status = monitor.getStatus();
    expect(status.trackedCount).toBe(0);
    expect(status.historySize).toBe(0);
  });

  test('should get snapshot', () => {
    monitor.track('test', 100);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics).toBeDefined();
  });

  test('should export metrics', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBeDefined();
  });

  test('should get report', () => {
    monitor.track('test', 100);
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
  });

  test('should limit history size', () => {
    const limitedMonitor = new QueryMonitor({ maxHistory: 3 });
    limitedMonitor.track('a', 1);
    limitedMonitor.track('b', 2);
    limitedMonitor.track('c', 3);
    limitedMonitor.track('d', 4);
    const history = limitedMonitor.getHistory();
    expect(history.length).toBe(3);
  });
});