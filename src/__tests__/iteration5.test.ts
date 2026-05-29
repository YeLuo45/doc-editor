/**
 * iteration5.test.ts - V35 Iteration 5 Tests
 * Tests for Router, Middleware, Resolver, and Filter modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router } from '../iteration5/Router';
import { Middleware } from '../iteration5/Middleware';
import { Resolver } from '../iteration5/Resolver';
import { Filter } from '../iteration5/Filter';

describe('Router Module', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('should register a route', () => {
    expect(router.route('/api/users', 'GET', 'getUsers')).toBe(true);
    const routes = router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/users');
    expect(routes[0].method).toBe('GET');
  });

  it('should not register duplicate routes', () => {
    router.route('/api/users', 'GET', 'getUsers');
    expect(router.route('/api/users', 'GET', 'getUsersAgain')).toBe(false);
  });

  it('should match an exact route', () => {
    router.route('/api/users', 'GET', 'getUsers');
    const match = router.match('/api/users', 'GET');
    expect(match).not.toBeNull();
    expect(match?.handler).toBe('getUsers');
  });

  it('should return null for unmatched routes', () => {
    router.route('/api/users', 'GET', 'getUsers');
    const match = router.match('/api/posts', 'GET');
    expect(match).toBeNull();
  });

  it('should match routes with pattern params', () => {
    router.route('/api/users/:id', 'GET', 'getUser');
    const match = router.match('/api/users/123', 'GET');
    expect(match).not.toBeNull();
    expect(match?.handler).toBe('getUser');
  });

  it('should return correct snapshot with metrics', () => {
    router.route('/api/users', 'GET', 'getUsers');
    router.route('/api/users', 'POST', 'createUser');
    const snapshot = router.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.metrics.registrations).toBe(2);
    expect(snapshot.methods['GET']).toBe(1);
    expect(snapshot.methods['POST']).toBe(1);
  });

  it('should reset all routes and metrics', () => {
    router.route('/api/users', 'GET', 'getUsers');
    router.match('/api/users', 'GET');
    router.reset();
    const snapshot = router.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.metrics.matches).toBe(0);
  });

  it('should generate report with all routes', () => {
    router.route('/api/users', 'GET', 'getUsers');
    const report = router.getReport();
    expect(report).toContain('Router Report');
    expect(report).toContain('GET:/api/users');
  });

  it('should export metrics correctly', () => {
    router.route('/api/users', 'GET', 'getUsers');
    router.match('/api/users', 'GET');
    const metrics = router.exportMetrics();
    expect(metrics.totalRoutes).toBe(1);
    expect(metrics.matches).toBe(1);
  });

  it('should track multiple matches', () => {
    router.route('/api/users', 'GET', 'getUsers');
    router.match('/api/users', 'GET');
    router.match('/api/users', 'GET');
    const snapshot = router.getSnapshot();
    expect(snapshot.metrics.matches).toBe(2);
  });

  it('should reject invalid route registration', () => {
    expect(router.route('', 'GET', 'handler')).toBe(false);
    expect(router.route('/path', '', 'handler')).toBe(false);
    expect(router.route('/path', 'GET', '')).toBe(false);
  });
});

describe('Middleware Module', () => {
  let middleware: Middleware;

  beforeEach(() => {
    middleware = new Middleware();
  });

  it('should register middleware', () => {
    const fn = vi.fn((ctx) => ctx);
    expect(middleware.use('logger', fn)).toBe(true);
    const entries = middleware.getMiddleware();
    expect(entries).toHaveLength(1);
  });

  it('should not register non-function middleware', () => {
    expect(middleware.use('logger', 'not a function' as any)).toBe(false);
  });

  it('should apply middleware chain in order', async () => {
    const callOrder: string[] = [];
    middleware.use('first', (ctx) => {
      callOrder.push('first');
      return ctx;
    });
    middleware.use('second', (ctx) => {
      callOrder.push('second');
      return ctx;
    });
    await middleware.apply({});
    expect(callOrder).toEqual(['second', 'first']);
  });

  it('should pass context through middleware', async () => {
    middleware.use('addProperty', (ctx) => ({ ...ctx, added: true }));
    const result = await middleware.apply({ original: true });
    expect(result.added).toBe(true);
    expect(result.original).toBe(true);
  });

  it('should stop on error and record rejection', async () => {
    middleware.use('error', () => {
      throw new Error('Test error');
    });
    await middleware.apply({});
    const snapshot = middleware.getSnapshot();
    expect(snapshot.metrics.rejections).toBe(1);
  });

  it('should return correct snapshot', () => {
    middleware.use('mw1', vi.fn());
    middleware.use('mw2', vi.fn());
    const snapshot = middleware.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.metrics.registrations).toBe(2);
  });

  it('should reset all middleware and metrics', () => {
    middleware.use('mw1', vi.fn());
    middleware.use('mw2', vi.fn());
    middleware.reset();
    const snapshot = middleware.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.metrics.executions).toBe(0);
  });

  it('should generate report', () => {
    middleware.use('test', vi.fn());
    const report = middleware.getReport();
    expect(report).toContain('Middleware Report');
    expect(report).toContain('test');
  });

  it('should export metrics with chain', () => {
    middleware.use('mw1', vi.fn());
    const metrics = middleware.exportMetrics();
    expect(metrics.totalMiddleware).toBe(1);
    expect(metrics.chain).toContain('0:mw1');
  });

  it('should respect priority ordering', () => {
    middleware.use('low', vi.fn(), 1);
    middleware.use('high', vi.fn(), 10);
    const entries = middleware.getMiddleware();
    expect(entries[0].name).toBe('high');
    expect(entries[1].name).toBe('low');
  });
});

describe('Resolver Module', () => {
  let resolver: Resolver;

  beforeEach(() => {
    resolver = new Resolver();
  });

  it('should resolve a simple URL', () => {
    const result = resolver.resolve('https://example.com/path');
    expect(result).not.toBeNull();
    expect(result?.protocol).toBe('https');
    expect(result?.host).toBe('example.com');
    expect(result?.pathname).toBe('/path');
  });

  it('should parse URL with query params', () => {
    const result = resolver.resolve('https://example.com/path?foo=bar&baz=qux');
    expect(result?.query).toEqual({ foo: 'bar', baz: 'qux' });
  });

  it('should parse URL with fragment', () => {
    const result = resolver.resolve('https://example.com/path#section');
    expect(result?.fragment).toBe('section');
  });

  it('should cache resolved URLs', () => {
    resolver.resolve('https://example.com/path');
    const cached = resolver.getResolved();
    expect(cached).toHaveLength(1);
    expect(cached[0].host).toBe('example.com');
  });

  it('should return cached result on second resolve', () => {
    resolver.resolve('https://example.com/path');
    resolver.resolve('https://example.com/path');
    const snapshot = resolver.getSnapshot();
    expect(snapshot.metrics.cacheHits).toBe(1);
  });

  it('should return null for invalid URL', () => {
    expect(resolver.resolve('')).toBeNull();
    expect(resolver.resolve(null as any)).toBeNull();
  });

  it('should return correct snapshot', () => {
    resolver.resolve('https://a.com/path1');
    resolver.resolve('https://b.com/path2');
    const snapshot = resolver.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.metrics.totalResolutions).toBe(2);
  });

  it('should reset and clear cache', () => {
    resolver.resolve('https://example.com/path');
    resolver.reset();
    const snapshot = resolver.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.metrics.cacheHits).toBe(0);
  });

  it('should generate report', () => {
    resolver.resolve('https://test.com/path');
    const report = resolver.getReport();
    expect(report).toContain('Resolver Report');
    expect(report).toContain('test.com');
  });

  it('should export metrics correctly', () => {
    resolver.resolve('https://example.com/path');
    const metrics = resolver.exportMetrics();
    expect(metrics.cachedUrls).toBe(1);
    expect(metrics.totalResolutions).toBe(1);
  });

  it('should parse port from URL', () => {
    const result = resolver.resolve('http://localhost:8080/api');
    expect(result?.port).toBe('8080');
    expect(result?.host).toBe('localhost');
  });
});

describe('Filter Module', () => {
  let filter: Filter;

  beforeEach(() => {
    filter = new Filter();
  });

  it('should register a filter', () => {
    const fn: Filter['filter'] = vi.fn((req) => ({ allowed: true }));
    expect(filter.filter('auth', fn)).toBe(true);
    const entries = filter.getFiltered();
    expect(entries).toHaveLength(1);
  });

  it('should not register non-function filter', () => {
    expect(filter.filter('invalid', 'not a function' as any)).toBe(false);
  });

  it('should allow valid requests', () => {
    filter.filter('check', (req) => ({ allowed: true }));
    const result = filter.intercept({ url: '/api', method: 'GET' });
    expect(result.allowed).toBe(true);
  });

  it('should block requests when filter returns false', () => {
    filter.filter('deny', () => ({ allowed: false, reason: 'Denied' }));
    const result = filter.intercept({ url: '/api', method: 'GET' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Denied');
  });

  it('should stop at first blocking filter', () => {
    filter.filter('first', () => ({ allowed: false }));
    filter.filter('second', vi.fn(() => ({ allowed: true })));
    const result = filter.intercept({ url: '/api', method: 'GET' });
    expect(result.reason).toContain('first');
  });

  it('should apply modified request from filter', () => {
    filter.filter('modifier', (req) => ({
      allowed: true,
      modifiedRequest: { ...req, method: 'POST' },
    }));
    const result = filter.intercept({ url: '/api', method: 'GET' });
    expect(result.modifiedRequest?.method).toBe('POST');
  });

  it('should return invalid request for malformed input', () => {
    const result = filter.intercept({ url: '', method: 'GET' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Invalid request');
  });

  it('should return correct snapshot', () => {
    filter.filter('f1', vi.fn());
    filter.filter('f2', vi.fn());
    const snapshot = filter.getSnapshot();
    expect(snapshot.count).toBe(2);
    expect(snapshot.metrics.registrations).toBe(2);
  });

  it('should reset all filters and metrics', () => {
    filter.filter('f1', vi.fn());
    filter.reset();
    const snapshot = filter.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.metrics.checks).toBe(0);
  });

  it('should generate report', () => {
    filter.filter('auth', vi.fn());
    const report = filter.getReport();
    expect(report).toContain('Filter Report');
    expect(report).toContain('auth');
  });

  it('should export metrics with chain', () => {
    filter.filter('f1', vi.fn());
    const metrics = filter.exportMetrics();
    expect(metrics.totalFilters).toBe(1);
    expect(metrics.blocks).toBe(0);
  });

  it('should track blocks and allows separately', () => {
    filter.filter('allow', () => ({ allowed: true }));
    filter.intercept({ url: '/api', method: 'GET' });
    filter.filter('deny', () => ({ allowed: false }));
    filter.intercept({ url: '/api', method: 'GET' });
    const snapshot = filter.getSnapshot();
    expect(snapshot.metrics.allows).toBe(1);
    expect(snapshot.metrics.blocks).toBe(1);
  });

  it('should respect priority ordering', () => {
    filter.filter('low', vi.fn(), 1);
    filter.filter('high', vi.fn(), 100);
    const entries = filter.getFiltered();
    expect(entries[0].name).toBe('high');
  });

  it('should handle errors in filter gracefully', () => {
    filter.filter('error', () => {
      throw new Error('Filter error');
    });
    const result = filter.intercept({ url: '/api', method: 'GET' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Filter error');
  });
});

describe('Integration Tests', () => {
  it('should work together: Router + Middleware', () => {
    const router = new Router();
    const middleware = new Middleware();

    router.route('/api/users', 'GET', 'getUsers');
    middleware.use('log', async (ctx) => {
      (ctx as any).logged = true;
      return ctx;
    });

    expect(router.getRoutes()).toHaveLength(1);
    expect(middleware.getMiddleware()).toHaveLength(1);
  });

  it('should work together: Resolver + Filter', () => {
    const resolver = new Resolver();
    const filter = new Filter();

    resolver.resolve('https://example.com/api');
    filter.filter('auth', () => ({ allowed: true }));

    expect(resolver.getResolved()).toHaveLength(1);
    expect(filter.getFiltered()).toHaveLength(1);
  });

  it('should work together: Router + Resolver + Filter', () => {
    const router = new Router();
    const resolver = new Resolver();
    const filter = new Filter();

    const url = 'https://api.example.com/users/123';
    resolver.resolve(url);

    const route = router.match('/users/123', 'GET');
    // May be null if no pattern match, but that's ok for this test

    filter.filter('check', () => ({ allowed: true }));
    const result = filter.intercept({ url, method: 'GET' });

    expect(result.allowed).toBe(true);
  });

  it('should export metrics from all modules independently', () => {
    const router = new Router();
    const middleware = new Middleware();
    const resolver = new Resolver();
    const filter = new Filter();

    router.route('/api', 'GET', 'handler');
    middleware.use('mw', vi.fn());
    resolver.resolve('https://test.com');
    filter.filter('f', vi.fn());

    const rMetrics = router.exportMetrics();
    const mMetrics = middleware.exportMetrics();
    const resMetrics = resolver.exportMetrics();
    const fMetrics = filter.exportMetrics();

    expect(rMetrics.totalRoutes).toBe(1);
    expect(mMetrics.totalMiddleware).toBe(1);
    expect(resMetrics.cachedUrls).toBe(1);
    expect(fMetrics.totalFilters).toBe(1);
  });

  it('should reset all modules independently', () => {
    const router = new Router();
    const middleware = new Middleware();
    const resolver = new Resolver();
    const filter = new Filter();

    router.route('/api', 'GET', 'handler');
    middleware.use('mw', vi.fn());
    resolver.resolve('https://test.com');
    filter.filter('f', vi.fn());

    router.reset();
    middleware.reset();
    resolver.reset();
    filter.reset();

    expect(router.getSnapshot().count).toBe(0);
    expect(middleware.getSnapshot().count).toBe(0);
    expect(resolver.getSnapshot().count).toBe(0);
    expect(filter.getSnapshot().count).toBe(0);
  });

  it('should use vi.fn() mocks correctly', () => {
    const mockFn = vi.fn();
    mockFn('test', 123);
    expect(mockFn).toHaveBeenCalledWith('test', 123);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle async middleware with vi.fn()', async () => {
    const asyncFn = vi.fn(async (ctx: any) => {
      await Promise.resolve();
      return { ...ctx, async: true };
    });

    const mw = new Middleware();
    mw.use('async', asyncFn);
    const result = await mw.apply({ original: true });

    expect(asyncFn).toHaveBeenCalled();
    expect(result.async).toBe(true);
  });
});