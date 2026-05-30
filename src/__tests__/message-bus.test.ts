/**
 * V97 Message Bus Tests
 * Tests for MessageBus, MessageQueue, MessageRouter, MessageMonitor
 */

import { MessageBus } from '../message-bus/MessageBus';
import { MessageQueue } from '../message-bus/MessageQueue';
import { MessageRouter } from '../message-bus/MessageRouter';
import { MessageMonitor } from '../message-bus/MessageMonitor';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus({ enableLogging: false });
  });

  afterEach(() => {
    bus.reset();
  });

  test('should publish a message and notify subscribers', () => {
    let received: unknown = null;
    bus.subscribe('topic1', (msg) => { received = msg; });
    bus.publish('topic1', { data: 'test' });
    expect(received).toEqual({ data: 'test' });
  });

  test('should return message id on publish', () => {
    const id = bus.publish('topic1', 'test');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  test('should subscribe and receive messages on topic', () => {
    const messages: unknown[] = [];
    bus.subscribe('topic1', (msg) => messages.push(msg));
    bus.publish('topic1', 'msg1');
    bus.publish('topic1', 'msg2');
    expect(messages).toHaveLength(2);
  });

  test('should unsubscribe a subscriber', () => {
    let count = 0;
    const subId = bus.subscribe('topic1', () => count++);
    bus.publish('topic1', 'msg1');
    bus.unsubscribe(subId);
    bus.publish('topic1', 'msg2');
    expect(count).toBe(1);
  });

  test('should get subscribers for a topic', () => {
    bus.subscribe('topic1', () => {});
    bus.subscribe('topic1', () => {});
    const subs = bus.getSubscribers('topic1');
    expect(subs).toHaveLength(2);
  });

  test('should get all subscribers when no topic specified', () => {
    bus.subscribe('topic1', () => {});
    bus.subscribe('topic2', () => {});
    const all = bus.getSubscribers();
    expect(all).toHaveLength(2);
  });

  test('should throw when max subscribers reached', () => {
    const smallBus = new MessageBus({ maxSubscribers: 1 });
    smallBus.subscribe('topic1', () => {});
    expect(() => smallBus.subscribe('topic1', () => {})).toThrow('Maximum subscribers reached');
  });

  test('should get snapshot with metrics', () => {
    bus.publish('topic1', 'test');
    const snapshot = bus.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics).toHaveProperty('stats');
  });

  test('should export metrics with version', () => {
    const metrics = bus.exportMetrics();
    expect(metrics.version).toBe('v97');
    expect(metrics).toHaveProperty('published');
  });

  test('should generate report string', () => {
    bus.publish('topic1', 'test');
    const report = bus.getReport();
    expect(report).toContain('Message Bus Report');
    expect(report).toContain('Total Published: 1');
  });

  test('should reset all subscribers and messages', () => {
    bus.subscribe('topic1', () => {});
    bus.publish('topic1', 'test');
    bus.reset();
    const subs = bus.getSubscribers();
    expect(subs).toHaveLength(0);
    expect(bus.getMessageCount()).toBe(0);
  });
});

describe('MessageQueue', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue({ enableLogging: false });
  });

  afterEach(() => {
    queue.reset();
  });

  test('should enqueue a message', () => {
    const id = queue.enqueue('test');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  test('should dequeue a message in FIFO order', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    const msg = queue.dequeue();
    expect(msg?.payload).toBe('first');
  });

  test('should return null when dequeuing empty queue', () => {
    const msg = queue.dequeue();
    expect(msg).toBeNull();
  });

  test('should peek at the next message without removing', () => {
    queue.enqueue('first');
    queue.enqueue('second');
    const msg = queue.peek();
    expect(msg?.payload).toBe('first');
    expect(queue.size()).toBe(2);
  });

  test('should return null when peeking empty queue', () => {
    const msg = queue.peek();
    expect(msg).toBeNull();
  });

  test('should get queue size', () => {
    queue.enqueue('a');
    queue.enqueue('b');
    queue.enqueue('c');
    expect(queue.size()).toBe(3);
  });

  test('should get pending messages', () => {
    queue.enqueue('a');
    queue.enqueue('b');
    const pending = queue.getPending();
    expect(pending).toHaveLength(2);
  });

  test('should throw when queue is full', () => {
    const smallQueue = new MessageQueue({ maxSize: 2 });
    smallQueue.enqueue('a');
    smallQueue.enqueue('b');
    expect(() => smallQueue.enqueue('c')).toThrow('Queue is full');
  });

  test('should check if queue is empty', () => {
    expect(queue.isEmpty()).toBe(true);
    queue.enqueue('a');
    expect(queue.isEmpty()).toBe(false);
  });

  test('should check if queue is full', () => {
    const smallQueue = new MessageQueue({ maxSize: 2 });
    expect(smallQueue.isFull()).toBe(false);
    smallQueue.enqueue('a');
    smallQueue.enqueue('b');
    expect(smallQueue.isFull()).toBe(true);
  });

  test('should get snapshot with metrics', () => {
    queue.enqueue('test');
    const snapshot = queue.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.stats).toHaveProperty('totalEnqueued');
  });

  test('should export metrics with version', () => {
    const metrics = queue.exportMetrics();
    expect(metrics.version).toBe('v97');
    expect(metrics).toHaveProperty('enqueued');
  });

  test('should generate report string', () => {
    queue.enqueue('test');
    const report = queue.getReport();
    expect(report).toContain('Message Queue Report');
    expect(report).toContain('Total Enqueued: 1');
  });

  test('should reset the queue', () => {
    queue.enqueue('a');
    queue.enqueue('b');
    queue.reset();
    expect(queue.size()).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });
});

describe('MessageRouter', () => {
  let router: MessageRouter;

  beforeEach(() => {
    router = new MessageRouter({ enableLogging: false });
  });

  afterEach(() => {
    router.reset();
  });

  test('should add a route', () => {
    const id = router.addRoute('topic1', 'destination1');
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
  });

  test('should route a message to destinations', () => {
    router.addRoute('test', 'dest1');
    const dests = router.route('test message', 'msg_1');
    expect(dests).toContain('dest1');
  });

  test('should route to default when no match', () => {
    const dests = router.route('unmatched', 'msg_1');
    expect(dests).toContain('default');
  });

  test('should remove a route', () => {
    const id = router.addRoute('topic1', 'dest1');
    const removed = router.removeRoute(id);
    expect(removed).toBe(true);
    expect(router.getRoutes()).toHaveLength(0);
  });

  test('should get all routes', () => {
    router.addRoute('topic1', 'dest1');
    router.addRoute('topic2', 'dest2');
    const routes = router.getRoutes();
    expect(routes).toHaveLength(2);
  });

  test('should get routes by pattern', () => {
    router.addRoute('topic1', 'dest1');
    router.addRoute('topic1', 'dest2');
    const routes = router.getRoutes('topic1');
    expect(routes).toHaveLength(2);
  });

  test('should get a specific route', () => {
    const id = router.addRoute('topic1', 'dest1');
    const route = router.getRoute(id);
    expect(route).toBeDefined();
    expect(route?.pattern).toBe('topic1');
  });

  test('should update a route', () => {
    const id = router.addRoute('topic1', 'dest1');
    const updated = router.updateRoute(id, { priority: 5 });
    expect(updated).toBe(true);
    expect(router.getRoute(id)?.priority).toBe(5);
  });

  test('should track routing history', () => {
    router.addRoute('test', 'dest1');
    router.route('test', 'msg_1');
    const history = router.getHistory();
    expect(history).toHaveLength(1);
  });

  test('should get snapshot with metrics', () => {
    router.addRoute('topic1', 'dest1');
    const snapshot = router.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.stats).toHaveProperty('totalRoutes');
  });

  test('should export metrics with version', () => {
    const metrics = router.exportMetrics();
    expect(metrics.version).toBe('v97');
    expect(metrics).toHaveProperty('routes');
  });

  test('should generate report string', () => {
    router.addRoute('topic1', 'dest1');
    const report = router.getReport();
    expect(report).toContain('Message Router Report');
    expect(report).toContain('Total Routes: 1');
  });

  test('should reset all routes', () => {
    router.addRoute('topic1', 'dest1');
    router.reset();
    expect(router.getRoutes()).toHaveLength(0);
  });

  test('should throw when max routes reached', () => {
    const smallRouter = new MessageRouter({ maxRoutes: 1 });
    smallRouter.addRoute('topic1', 'dest1');
    expect(() => smallRouter.addRoute('topic2', 'dest2')).toThrow('Maximum routes reached');
  });
});

describe('MessageMonitor', () => {
  let monitor: MessageMonitor;

  beforeEach(() => {
    monitor = new MessageMonitor({ enableLogging: false });
  });

  afterEach(() => {
    monitor.reset();
  });

  test('should track a message', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
  });

  test('should get specific message metric', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    const metric = monitor.getMetrics('msg_1');
    expect(metric.messageId).toBe('msg_1');
    expect(metric.topic).toBe('topic1');
  });

  test('should get message history', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.track('msg_2', 'topic1', 'delivered');
    const history = monitor.getHistory();
    expect(history).toHaveLength(2);
  });

  test('should get message history with limit', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.track('msg_2', 'topic1', 'delivered');
    const history = monitor.getHistory(1);
    expect(history).toHaveLength(1);
  });

  test('should get monitor status', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    const status = monitor.getStatus();
    expect(status.isMonitoring).toBe(true);
    expect(status.totalTracked).toBe(1);
  });

  test('should calculate average latency', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.track('msg_2', 'topic1', 'sent');
    const avgLatency = monitor.getAverageLatency();
    expect(avgLatency).toBeGreaterThan(0);
  });

  test('should calculate success rate', () => {
    monitor.track('msg_1', 'topic1', 'delivered');
    monitor.track('msg_2', 'topic1', 'failed');
    const rate = monitor.getSuccessRate();
    expect(rate).toBe(50);
  });

  test('should get snapshot with metrics', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    const snapshot = monitor.getSnapshot();
    expect(snapshot).toHaveProperty('metrics');
    expect(snapshot.metrics.stats).toHaveProperty('totalTracked');
  });

  test('should export metrics with version', () => {
    const metrics = monitor.exportMetrics();
    expect(metrics.version).toBe('v97');
    expect(metrics).toHaveProperty('totalTracked');
  });

  test('should generate report string', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    const report = monitor.getReport();
    expect(report).toContain('Message Monitor Report');
    expect(report).toContain('Total Tracked: 1');
  });

  test('should reset all tracked messages', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.track('msg_2', 'topic1', 'sent');
    monitor.reset();
    expect(monitor.getStatus().totalTracked).toBe(0);
  });

  test('should clear metrics without reset', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.clearMetrics();
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(0);
    expect(monitor.getStatus().totalTracked).toBe(0);
  });

  test('should clear history', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.clearHistory();
    const history = monitor.getHistory();
    expect(history).toHaveLength(0);
  });

  test('should track with metadata', () => {
    monitor.track('msg_1', 'topic1', 'sent', { key: 'value' });
    const metric = monitor.getMetrics('msg_1');
    expect(metric.metadata).toEqual({ key: 'value' });
  });

  test('should get stats', () => {
    monitor.track('msg_1', 'topic1', 'sent');
    monitor.track('msg_2', 'topic1', 'delivered');
    monitor.track('msg_3', 'topic1', 'failed');
    const stats = monitor.getStats();
    expect(stats.sent).toBe(1);
    expect(stats.delivered).toBe(1);
    expect(stats.failed).toBe(1);
  });
});