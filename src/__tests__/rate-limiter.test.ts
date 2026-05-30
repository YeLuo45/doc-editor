import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limiter/RateLimiter';
import { TokenBucket } from '../rate-limiter/TokenBucket';
import { SlidingWindow } from '../rate-limiter/SlidingWindow';
import { RateMonitor } from '../rate-limiter/RateMonitor';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 5, windowMs: 1000 });
  });

  it('should allow requests under limit', () => {
    expect(limiter.limit('user1', 3)).toBe(true);
    expect(limiter.limit('user1', 2)).toBe(true);
  });

  it('should block requests over limit', () => {
    limiter.limit('user1', 5);
    expect(limiter.limit('user1', 1)).toBe(false);
  });

  it('should track different identifiers separately', () => {
    expect(limiter.limit('user1', 5)).toBe(true);
    expect(limiter.limit('user2', 5)).toBe(true);
  });

  it('should check status correctly', () => {
    limiter.limit('user1', 3);
    const status = limiter.check('user1');
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(2);
  });

  it('should return correct getStatus', () => {
    limiter.limit('user1', 2);
    const status = limiter.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should return correct getStats', () => {
    limiter.limit('user1', 3);
    const stats = limiter.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.limit).toBe(5);
  });

  it('should getSnapshot', () => {
    limiter.limit('user1', 2);
    const snapshot = limiter.getSnapshot();
    expect(snapshot.metrics.totalRequests).toBe(2);
  });

  it('should reset all state', () => {
    limiter.limit('user1', 5);
    limiter.reset();
    const stats = limiter.getStats();
    expect(stats.totalRequests).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = limiter.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should getReport as string', () => {
    const report = limiter.getReport();
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  });
});

describe('TokenBucket', () => {
  let bucket: TokenBucket;

  beforeEach(() => {
    bucket = new TokenBucket({ capacity: 10, refillRate: 2 });
  });

  it('should consume tokens when available', () => {
    expect(bucket.consume('user1', 5)).toBe(true);
    expect(bucket.consume('user1', 5)).toBe(true);
  });

  it('should deny consumption when empty', () => {
    bucket.consume('user1', 10);
    expect(bucket.consume('user1', 1)).toBe(false);
  });

  it('should fill tokens', () => {
    bucket.consume('user1', 8);
    bucket.fill('user1', 5);
    expect(bucket.getTokens('user1')).toBe(7);
  });

  it('should refill tokens over time', async () => {
    bucket.consume('user1', 5);
    const tokensBefore = bucket.getTokens('user1');
    await new Promise(resolve => setTimeout(resolve, 1100));
    const tokensAfter = bucket.getTokens('user1');
    expect(tokensAfter).toBeGreaterThan(tokensBefore);
  });

  it('should get tokens correctly', () => {
    expect(bucket.getTokens('user1')).toBe(10);
  });

  it('should get refill rate', () => {
    expect(bucket.getRefillRate()).toBe(2);
  });

  it('should return healthy status', () => {
    const status = bucket.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should reset state', () => {
    bucket.consume('user1', 5);
    bucket.reset();
    expect(bucket.getTokens('user1')).toBe(10);
  });

  it('should export metrics with version', () => {
    const metrics = bucket.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });
});

describe('SlidingWindow', () => {
  let window: SlidingWindow;

  beforeEach(() => {
    window = new SlidingWindow({ limit: 5, windowSize: 1000 });
  });

  it('should add entries under limit', () => {
    expect(window.add('user1', 3)).toBe(true);
    expect(window.add('user1', 2)).toBe(true);
  });

  it('should reject entries over limit', () => {
    window.add('user1', 5);
    expect(window.add('user1', 1)).toBe(false);
  });

  it('should get count correctly', () => {
    window.add('user1', 3);
    expect(window.getCount('user1')).toBe(3);
  });

  it('should get window info', () => {
    window.add('user1', 2);
    const info = window.getWindow('user1');
    expect(info.entries).toBe(1);
    expect(info.start).toBeLessThan(info.end);
  });

  it('should get limit', () => {
    expect(window.getLimit()).toBe(5);
  });

  it('should return healthy status', () => {
    const status = window.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should reset state', () => {
    window.add('user1', 5);
    window.reset();
    expect(window.getCount('user1')).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = window.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get snapshot', () => {
    window.add('user1', 2);
    const snapshot = window.getSnapshot();
    expect(snapshot.metrics.totalAdded).toBe(2);
  });
});

describe('RateMonitor', () => {
  let monitor: RateMonitor;

  beforeEach(() => {
    monitor = new RateMonitor({ maxHistorySize: 100 });
  });

  it('should track success', () => {
    monitor.track('user1', true);
    monitor.track('user2', true);
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(2);
    expect(stats.successCount).toBe(2);
  });

  it('should track failure', () => {
    monitor.track('user1', false);
    const stats = monitor.getStats();
    expect(stats.failureCount).toBe(1);
  });

  it('should get metrics for identifier', () => {
    monitor.track('user1', true);
    monitor.track('user1', false);
    const metrics = monitor.getMetrics('user1');
    expect(metrics.length).toBe(2);
  });

  it('should get history', () => {
    monitor.track('user1', true);
    const history = monitor.getHistory();
    expect(history.length).toBe(1);
  });

  it('should limit history size', () => {
    const limitedMonitor = new RateMonitor({ maxHistorySize: 5 });
    for (let i = 0; i < 10; i++) {
      limitedMonitor.track(`user${i}`, true);
    }
    const stats = limitedMonitor.getStats();
    expect(stats.totalTracked).toBe(10);
  });

  it('should return healthy status when success rate >= 50', () => {
    monitor.track('user1', true);
    monitor.track('user1', true);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(true);
  });

  it('should return unhealthy status when success rate < 50', () => {
    monitor.track('user1', false);
    monitor.track('user1', false);
    const status = monitor.getStatus();
    expect(status.healthy).toBe(false);
  });

  it('should reset all state', () => {
    monitor.track('user1', true);
    monitor.reset();
    const stats = monitor.getStats();
    expect(stats.totalTracked).toBe(0);
  });

  it('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get report string', () => {
    monitor.track('user1', true);
    const report = monitor.getReport();
    expect(typeof report).toBe('string');
  });

  it('should get snapshot', () => {
    monitor.track('user1', true);
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalTracked).toBe(1);
  });
});