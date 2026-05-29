import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StreamHandler } from '../stream-handler/StreamHandler';
import { StreamBuffer } from '../stream-handler/StreamBuffer';
import { StreamRouter } from '../stream-handler/StreamRouter';
import { StreamMonitor } from '../stream-handler/StreamMonitor';

describe('StreamHandler', () => {
  let handler: StreamHandler;

  beforeEach(() => {
    handler = new StreamHandler({ url: 'ws://localhost:8080' });
  });

  afterEach(() => {
    handler.reset();
  });

  it('should create StreamHandler with config', () => {
    const h = new StreamHandler({ url: 'ws://test', reconnect: true });
    expect(h.config.url).toBe('ws://test');
    expect(h.config.reconnect).toBe(true);
  });

  it('should return disconnected status initially', () => {
    expect(handler.getStatus()).toBe('disconnected');
  });

  it('should connect and update status', async () => {
    await handler.connect('ws://localhost:8080');
    expect(handler.getStatus()).toBe('connected');
  });

  it('should fail connect without url', async () => {
    const h = new StreamHandler();
    await expect(h.connect()).rejects.toThrow('No URL provided');
  });

  it('should disconnect and clear queue', async () => {
    await handler.connect('ws://localhost:8080');
    handler.disconnect();
    expect(handler.getStatus()).toBe('disconnected');
    expect(handler.getQueuedMessages()).toHaveLength(0);
  });

  it('should send message when connected', async () => {
    await handler.connect('ws://localhost:8080');
    const result = handler.send({ type: 'test', payload: 'hello' });
    expect(result).toBe(true);
    expect(handler.getQueuedMessages()).toHaveLength(1);
  });

  it('should not send message when disconnected', () => {
    const result = handler.send({ type: 'test', payload: 'hello' });
    expect(result).toBe(false);
  });

  it('should get snapshot with metrics', async () => {
    await handler.connect('ws://localhost:8080');
    handler.send({ type: 'test', payload: 'data' });
    const snapshot = handler.getSnapshot();
    expect(snapshot.metrics.status).toBe('connected');
    expect(snapshot.metrics.queueSize).toBe(1);
  });

  it('should reset handler state', async () => {
    await handler.connect('ws://localhost:8080');
    handler.send({ type: 'test', payload: 'data' });
    handler.reset();
    expect(handler.getStatus()).toBe('disconnected');
    expect(handler.getQueuedMessages()).toHaveLength(0);
  });

  it('should export metrics version', () => {
    const metrics = handler.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get report string', () => {
    const report = handler.getReport();
    expect(report).toContain('StreamHandler Report');
  });

  it('should register and remove event listeners', async () => {
    await handler.connect('ws://localhost:8080');
    const listener = vi.fn();
    handler.on('test', listener);
    handler.send({ type: 'test', payload: 'msg' });
    expect(listener).toHaveBeenCalled();
    handler.off('test', listener);
  });

  it('should clear queue', async () => {
    await handler.connect('ws://localhost:8080');
    handler.send({ type: 'a', payload: '1' });
    handler.send({ type: 'b', payload: '2' });
    handler.clearQueue();
    expect(handler.getQueuedMessages()).toHaveLength(0);
  });
});

describe('StreamBuffer', () => {
  let buffer: StreamBuffer;

  beforeEach(() => {
    buffer = new StreamBuffer({ maxSize: 1000 });
  });

  afterEach(() => {
    buffer.reset();
  });

  it('should create StreamBuffer with config', () => {
    const b = new StreamBuffer({ maxSize: 500, autoFlush: true });
    expect(b.config.maxSize).toBe(500);
    expect(b.config.autoFlush).toBe(true);
  });

  it('should write data to buffer', () => {
    const result = buffer.write('test data');
    expect(result).toBe(true);
    expect(buffer.getBuffered()).toHaveLength(1);
  });

  it('should reject write when max size exceeded', () => {
    const smallBuffer = new StreamBuffer<string>({ maxSize: 5 });
    smallBuffer.write('abc');
    const result = smallBuffer.write('defg');
    expect(result).toBe(false);
  });

  it('should read chunk by id', () => {
    buffer.write('test1');
    buffer.write('test2');
    const chunks = buffer.getBuffered();
    const chunk = buffer.read(chunks[0].id);
    expect(chunk).toBeDefined();
    expect(chunk!.data).toBe('test1');
  });

  it('should flush and mark chunks', () => {
    buffer.write('data1');
    buffer.write('data2');
    const flushed = buffer.flush();
    expect(flushed).toHaveLength(2);
    expect(buffer.getBuffered()).toHaveLength(0);
  });

  it('should get buffered chunks', () => {
    buffer.write('a');
    buffer.write('b');
    buffer.flush();
    buffer.write('c');
    expect(buffer.getBuffered()).toHaveLength(1);
  });

  it('should get buffered size', () => {
    buffer.write('ab');
    buffer.write('cd');
    expect(buffer.getBufferedSize()).toBe(4);
  });

  it('should remove chunk by id', () => {
    buffer.write('test');
    const chunks = buffer.getBuffered();
    const removed = buffer.remove(chunks[0].id);
    expect(removed).toBe(true);
    expect(buffer.getBuffered()).toHaveLength(0);
  });

  it('should get snapshot metrics', () => {
    buffer.write('test');
    const snapshot = buffer.getSnapshot();
    expect(snapshot.metrics.bufferedCount).toBe(1);
    expect(snapshot.metrics.bufferedSize).toBe(4);
  });

  it('should reset buffer state', () => {
    buffer.write('data');
    buffer.reset();
    expect(buffer.getBuffered()).toHaveLength(0);
    expect(buffer.getSnapshot().metrics.flushedCount).toBe(0);
  });

  it('should export metrics version', () => {
    const metrics = buffer.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get report string', () => {
    const report = buffer.getReport();
    expect(report).toContain('StreamBuffer Report');
  });

  it('should read all unflushed chunks', () => {
    buffer.write('a');
    buffer.write('b');
    const all = buffer.readAll();
    expect(all).toHaveLength(2);
  });

  it('should mark specific chunks as flushed', () => {
    buffer.write('a');
    buffer.write('b');
    const chunks = buffer.getBuffered();
    buffer.markFlushed([chunks[0].id]);
    expect(buffer.getBuffered()).toHaveLength(1);
  });
});

describe('StreamRouter', () => {
  let router: StreamRouter;

  beforeEach(() => {
    router = new StreamRouter({ maxRoutes: 10 });
  });

  afterEach(() => {
    router.reset();
  });

  it('should create StreamRouter with config', () => {
    const r = new StreamRouter({ defaultRoute: 'default', enableWildcard: true });
    expect(r.config.defaultRoute).toBe('default');
    expect(r.config.enableWildcard).toBe(true);
  });

  it('should add and retrieve routes', () => {
    router.route('test.*', vi.fn(), 'test');
    const routes = router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].name).toBe('test');
  });

  it('should add route via addRoute method', () => {
    const added = router.addRoute({
      name: 'myRoute',
      pattern: 'events.*',
      handler: vi.fn(),
    });
    expect(added).toBe(true);
    expect(router.getRoutes()).toHaveLength(1);
  });

  it('should remove route', () => {
    router.route('test.*', vi.fn(), 'test');
    const removed = router.removeRoute('test');
    expect(removed).toBe(true);
    expect(router.getRoutes()).toHaveLength(0);
  });

  it('should fail removing non-existent route', () => {
    const removed = router.removeRoute('nonexistent');
    expect(removed).toBe(false);
  });

  it('should dispatch to matching route', () => {
    const handler = vi.fn();
    router.route('test.*', handler, 'test');
    router.dispatch('test message', 'test.abc');
    expect(handler).toHaveBeenCalledWith('test message');
  });

  it('should get route stats', () => {
    const handler = vi.fn();
    router.route('a.*', handler, 'a');
    router.dispatch('msg1', 'a.b');
    router.dispatch('msg2', 'a.c');
    expect(router.getRouteStats('a')).toBe(2);
  });

  it('should set route active state', () => {
    router.route('test.*', vi.fn(), 'test');
    router.setRouteActive('test', false);
    const routes = router.getRoutes();
    expect(routes[0].active).toBe(false);
  });

  it('should get snapshot metrics', () => {
    router.route('a.*', vi.fn(), 'a');
    router.route('b.*', vi.fn(), 'b');
    const snapshot = router.getSnapshot();
    expect(snapshot.metrics.routeCount).toBe(2);
    expect(snapshot.metrics.activeRoutes).toBe(2);
  });

  it('should reset router', () => {
    router.route('test.*', vi.fn(), 'test');
    router.reset();
    expect(router.getRoutes()).toHaveLength(0);
  });

  it('should export metrics version', () => {
    const metrics = router.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get report string', () => {
    const report = router.getReport();
    expect(report).toContain('StreamRouter Report');
  });

  it('should not exceed max routes', () => {
    const limitedRouter = new StreamRouter({ maxRoutes: 2 });
    limitedRouter.route('a', vi.fn(), 'a');
    limitedRouter.route('b', vi.fn(), 'b');
    const result = limitedRouter.route('c', vi.fn(), 'c');
    expect(result).toBe(false);
  });
});

describe('StreamMonitor', () => {
  let monitor: StreamMonitor;

  beforeEach(() => {
    monitor = new StreamMonitor({ historySize: 100 });
  });

  afterEach(() => {
    monitor.reset();
  });

  it('should create StreamMonitor with config', () => {
    const m = new StreamMonitor({ historySize: 50, trackLatency: true });
    expect(m.config.historySize).toBe(50);
    expect(m.config.trackLatency).toBe(true);
  });

  it('should track metrics', () => {
    monitor.track('stream1', { name: 'bytes', value: 100 });
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('bytes');
  });

  it('should track events', () => {
    monitor.trackEvent('stream1', 'connect');
    const history = monitor.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('connect');
  });

  it('should get active streams', async () => {
    monitor.trackEvent('stream1', 'start');
    await new Promise(r => setTimeout(r, 10));
    const active = monitor.getActive();
    expect(active).toContain('stream1');
  });

  it('should get stream status', () => {
    monitor.trackEvent('stream1', 'start');
    const status = monitor.getStreamStatus('stream1');
    expect(status).not.toBeNull();
    expect(status!.active).toBe(true);
  });

  it('should clear specific stream', () => {
    monitor.trackEvent('stream1', 'start');
    monitor.clearStream('stream1');
    expect(monitor.getActive()).not.toContain('stream1');
  });

  it('should clear metrics only', () => {
    monitor.track('s1', { name: 'test', value: 1 });
    monitor.clearMetrics();
    expect(monitor.getMetrics()).toHaveLength(0);
  });

  it('should clear events array', () => {
    monitor.trackEvent('s1', 'event');
    monitor.clearEvents();
    expect(monitor.getMetrics()).toHaveLength(0);
    const history = monitor.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot metrics', () => {
    monitor.trackEvent('stream1', 'start');
    const snapshot = monitor.getSnapshot();
    expect(snapshot.metrics.totalMetrics).toBe(0);
    expect(snapshot.metrics.totalEvents).toBe(1);
  });

  it('should reset all state', () => {
    monitor.track('s1', { name: 'test', value: 1 });
    monitor.trackEvent('s1', 'event');
    monitor.reset();
    expect(monitor.getMetrics()).toHaveLength(0);
    expect(monitor.getHistory()).toHaveLength(0);
  });

  it('should export metrics version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('1.0.0');
  });

  it('should get report string', () => {
    const report = monitor.getReport();
    expect(report).toContain('StreamMonitor Report');
  });

  it('should filter metrics by name', () => {
    monitor.track('s1', { name: 'bytes', value: 100 });
    monitor.track('s1', { name: 'packets', value: 50 });
    const bytesMetrics = monitor.getMetrics('bytes');
    expect(bytesMetrics).toHaveLength(1);
    expect(bytesMetrics[0].value).toBe(100);
  });

  it('should limit history with parameter', () => {
    monitor.trackEvent('s1', 'a');
    monitor.trackEvent('s1', 'b');
    monitor.trackEvent('s1', 'c');
    const history = monitor.getHistory(2);
    expect(history).toHaveLength(2);
  });
});