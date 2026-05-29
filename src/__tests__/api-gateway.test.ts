/**
 * api-gateway.test.ts - V78 API Gateway Tests
 * Tests for APIGateway, RequestHandler, ResponseFormatter, and RateLimiter
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { APIGateway } from '../api-gateway/APIGateway';
import { RequestHandler } from '../api-gateway/RequestHandler';
import { ResponseFormatter, FormatType } from '../api-gateway/ResponseFormatter';
import { RateLimiter } from '../api-gateway/RateLimiter';

describe('APIGateway', () => {
  let gateway: APIGateway;

  beforeEach(() => {
    gateway = new APIGateway();
  });

  test('should route a new path', () => {
    expect(gateway.route('GET', '/api/test', 'TestHandler')).toBe(true);
    expect(gateway.getRoutes().length).toBe(1);
  });

  test('should not allow duplicate routes', () => {
    gateway.route('GET', '/api/test', 'TestHandler');
    expect(gateway.route('GET', '/api/test', 'AnotherHandler')).toBe(false);
  });

  test('should handle a routed request', () => {
    gateway.route('GET', '/api/test', 'TestHandler');
    const result = gateway.handle('GET', '/api/test');
    expect(result.success).toBe(true);
    expect(result.response).toHaveProperty('handler', 'TestHandler');
  });

  test('should return error for unhandled route', () => {
    const result = gateway.handle('GET', '/api/unknown');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Route not found');
  });

  test('should getRoutes return all routes', () => {
    gateway.route('GET', '/api/a', 'HandlerA');
    gateway.route('POST', '/api/b', 'HandlerB');
    expect(gateway.getRoutes().length).toBe(2);
  });

  test('should getStats return gateway statistics', () => {
    gateway.route('GET', '/api/test', 'TestHandler');
    gateway.handle('GET', '/api/test');
    const stats = gateway.getStats();
    expect(stats.totalRoutes).toBe(1);
    expect(stats.totalRequests).toBe(1);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = gateway.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalRoutes');
  });

  test('should reset gateway', () => {
    gateway.route('GET', '/api/test', 'TestHandler');
    gateway.reset();
    expect(gateway.getRoutes().length).toBe(0);
  });

  test('should getReport return string', () => {
    const report = gateway.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('API Gateway Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = gateway.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('RequestHandler', () => {
  let handler: RequestHandler;

  beforeEach(() => {
    handler = new RequestHandler();
  });

  test('should register a handler', () => {
    const fn = (x: unknown) => x;
    expect(handler.registerHandler('test', fn)).toBe(true);
    expect(handler.getHandlers()).toContain('test');
  });

  test('should not register duplicate handler', () => {
    const fn = (x: unknown) => x;
    handler.registerHandler('test', fn);
    expect(handler.registerHandler('test', fn)).toBe(false);
  });

  test('should handle a registered request', () => {
    handler.registerHandler('test', (x) => ({ processed: x }));
    const result = handler.handle('test', { data: 'test' });
    expect(result.success).toBe(true);
    expect(result.result).toEqual({ processed: { data: 'test' } });
  });

  test('should return error for unknown handler', () => {
    const result = handler.handle('unknown', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should process multiple requests', () => {
    handler.registerHandler('add', (x: { a: number }) => x.a + 1);
    const results = handler.process([
      { name: 'add', request: { a: 1 } },
      { name: 'add', request: { a: 2 } },
    ]);
    expect(results.length).toBe(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
  });

  test('should getHandlers return registered handlers', () => {
    handler.registerHandler('h1', (x: unknown) => x);
    handler.registerHandler('h2', (x: unknown) => x);
    expect(handler.getHandlers().length).toBe(2);
  });

  test('should getMetrics return handler metrics', () => {
    handler.registerHandler('test', (x) => x);
    handler.handle('test', {});
    const metrics = handler.getMetrics();
    expect(metrics.totalHandled).toBe(1);
    expect(metrics.successful).toBe(1);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = handler.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
  });

  test('should reset handler', () => {
    handler.registerHandler('test', (x) => x);
    handler.handle('test', {});
    handler.reset();
    const metrics = handler.getMetrics();
    expect(metrics.totalHandled).toBe(0);
  });

  test('should getReport return string', () => {
    const report = handler.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Request Handler Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = handler.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('ResponseFormatter', () => {
  let formatter: ResponseFormatter;

  beforeEach(() => {
    formatter = new ResponseFormatter({ prettyPrint: true });
  });

  test('should format data as JSON', () => {
    const result = formatter.format({ test: 'value' }, 'json');
    expect(result).toContain('"test"');
    expect(result).toContain('"value"');
  });

  test('should format data as XML', () => {
    const result = formatter.format({ test: 'value' }, 'xml');
    expect(result).toContain('<test>');
    expect(result).toContain('value');
    expect(result).toContain('<?xml');
  });

  test('should format data as HTML', () => {
    const result = formatter.format({ test: 'value' }, 'html');
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<pre>');
  });

  test('should format data as text', () => {
    const result = formatter.format({ test: 'value' }, 'text');
    expect(result).toContain('test');
  });

  test('should parse JSON input', () => {
    const result = formatter.parse('{"test":"value"}', 'json');
    expect(result).toEqual({ test: 'value' });
  });

  test('should getFormats return supported formats', () => {
    const formats = formatter.getFormats();
    expect(formats).toContain('json');
    expect(formats).toContain('xml');
    expect(formats).toContain('html');
  });

  test('should getStats return formatter stats', () => {
    formatter.format({ test: 'value' }, 'json');
    const stats = formatter.getStats();
    expect(stats.totalFormatted).toBe(1);
    expect(stats.jsonCount).toBe(1);
  });

  test('should getSnapshot return metrics', () => {
    const snapshot = formatter.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalFormatted');
  });

  test('should reset formatter', () => {
    formatter.format({ test: 'value' }, 'json');
    formatter.reset();
    const stats = formatter.getStats();
    expect(stats.totalFormatted).toBe(0);
  });

  test('should getReport return string', () => {
    const report = formatter.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Response Formatter Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = formatter.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
  });

  test('should allow requests within limit', () => {
    const result = limiter.limit('key1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeLessThanOrEqual(5);
  });

  test('should deny requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.limit('key1');
    }
    const result = limiter.limit('key1');
    expect(result.allowed).toBe(false);
  });

  test('should check without consuming quota', () => {
    limiter.limit('key1');
    const result = limiter.check('key1');
    expect(result.allowed).toBe(true);
  });

  test('should getLimits return limit entry', () => {
    limiter.limit('key1');
    const limits = limiter.getLimits('key1');
    expect(limits).toHaveProperty('count');
  });

  test('should getLimits return all entries when no key provided', () => {
    limiter.limit('key1');
    limiter.limit('key2');
    const limits = limiter.getLimits();
    expect(limits.size).toBe(2);
  });

  test('should getStatus return rate limiter status', () => {
    limiter.limit('key1');
    const status = limiter.getStatus();
    expect(status).toHaveProperty('totalKeys');
    expect(status).toHaveProperty('blockedKeys');
  });

  test('should getSnapshot return metrics', () => {
    limiter.limit('key1');
    const snapshot = limiter.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('totalKeys');
  });

  test('should reset rate limiter', () => {
    limiter.limit('key1');
    limiter.reset();
    const limits = limiter.getLimits('key1');
    expect(limits.count).toBe(0);
  });

  test('should getReport return string', () => {
    const report = limiter.getReport();
    expect(typeof report).toBe('string');
    expect(report).toContain('Rate Limiter Report');
  });

  test('should exportMetrics return version', () => {
    const metrics = limiter.exportMetrics();
    expect(metrics).toHaveProperty('version');
  });

  test('should block key when limit exceeded', () => {
    for (let i = 0; i < 6; i++) {
      limiter.limit('key1');
    }
    const limits = limiter.getLimits('key1') as { blocked: boolean };
    expect(limits.blocked).toBe(true);
  });

  test('should support burst mode', () => {
    const burstLimiter = new RateLimiter({ maxRequests: 2, windowMs: 1000, enableBurst: true, burstMultiplier: 3 });
    const result1 = burstLimiter.limit('key1');
    const result2 = burstLimiter.limit('key1');
    const result3 = burstLimiter.limit('key1');
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });
});

describe('API Gateway Integration', () => {
  test('should work together across all components', () => {
    const gateway = new APIGateway();
    const handler = new RequestHandler();
    const formatter = new ResponseFormatter();
    const limiter = new RateLimiter({ maxRequests: 10 });

    gateway.route('POST', '/api/echo', 'EchoHandler');
    handler.registerHandler('EchoHandler', (req) => req);

    limiter.limit('client1');
    const check = limiter.check('client1');
    expect(check.allowed).toBe(true);

    const response = formatter.format({ success: true }, 'json');
    expect(response).toContain('"success"');

    const result = gateway.handle('POST', '/api/echo', { data: 'test' });
    expect(result.success).toBe(true);

    expect(gateway.getSnapshot().metrics).toHaveProperty('totalRoutes');
    expect(handler.getSnapshot().metrics).toHaveProperty('totalHandlers');
    expect(formatter.getSnapshot().metrics).toHaveProperty('totalFormatted');
    expect(limiter.getSnapshot().metrics).toHaveProperty('totalKeys');
  });
});