/**
 * V74 Event Bus Tests
 * Tests for EventBus, EventRouter, EventFilter, and EventProcessor
 */

import { EventBus, Event } from '../event-bus/EventBus';
import { EventRouter, RouteRule } from '../event-bus/EventRouter';
import { EventFilterClass, FilterCriteria } from '../event-bus/EventFilter';
import { EventProcessor, ProcessedEvent } from '../event-bus/EventProcessor';

describe('V74 Event Bus', () => {
  // ========== EventBus Tests ==========
  describe('EventBus', () => {
    let eventBus: EventBus;

    beforeEach(() => {
      eventBus = new EventBus({ enableLogging: false });
    });

    test('should publish and subscribe to events', () => {
      const receivedEvents: Event[] = [];
      eventBus.subscribe('test', (event) => receivedEvents.push(event));
      
      eventBus.publish('test', { data: 'hello' });
      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].payload).toEqual({ data: 'hello' });
    });

    test('should return unsubscribe function', () => {
      const receivedEvents: Event[] = [];
      const unsubscribe = eventBus.subscribe('test', (event) => receivedEvents.push(event));
      
      eventBus.publish('test', { data: 1 });
      expect(receivedEvents.length).toBe(1);
      
      unsubscribe();
      eventBus.publish('test', { data: 2 });
      expect(receivedEvents.length).toBe(1); // Should not receive second event
    });

    test('should support multiple subscribers', () => {
      const events1: Event[] = [];
      const events2: Event[] = [];
      
      eventBus.subscribe('test', (e) => events1.push(e));
      eventBus.subscribe('test', (e) => events2.push(e));
      
      eventBus.publish('test', { data: 'multi' });
      expect(events1.length).toBe(1);
      expect(events2.length).toBe(1);
    });

    test('should get subscribers for specific type', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      eventBus.subscribe('test', callback1);
      eventBus.subscribe('test', callback2);
      
      const subscribers = eventBus.getSubscribers('test');
      expect(subscribers.length).toBe(2);
    });

    test('should return empty array for unknown type', () => {
      const subscribers = eventBus.getSubscribers('unknown');
      expect(subscribers).toEqual([]);
    });

    test('should get snapshot with metrics', () => {
      eventBus.publish('test', { data: 'snapshot' });
      
      const snapshot = eventBus.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('publishedCount');
      expect(snapshot.metrics.publishedCount).toBe(1);
    });

    test('should reset all state', () => {
      eventBus.subscribe('test', vi.fn());
      eventBus.publish('test', { data: 'reset' });
      eventBus.reset();
      
      const snapshot = eventBus.getSnapshot();
      expect(snapshot.metrics.publishedCount).toBe(0);
      expect(snapshot.metrics.subscribedCount).toBe(0);
    });

    test('should generate report', () => {
      const report = eventBus.getReport();
      expect(report).toContain('EventBus Report');
      expect(report).toContain('Published Events:');
    });

    test('should export metrics with version', () => {
      const metrics = eventBus.exportMetrics();
      expect(metrics.version).toBe('V74');
      expect(metrics.metrics).toHaveProperty('publishedCount');
    });

    test('should limit queue size', () => {
      const limitedBus = new EventBus({ maxQueueSize: 3, enableLogging: false });
      
      for (let i = 0; i < 5; i++) {
        limitedBus.publish('test', { index: i });
      }
      
      const snapshot = limitedBus.getSnapshot();
      expect(snapshot.metrics.queueLength).toBe(3);
    });
  });

  // ========== EventRouter Tests ==========
  describe('EventRouter', () => {
    let router: EventRouter;

    beforeEach(() => {
      router = new EventRouter({ enableLogging: false });
    });

    test('should add and route events', () => {
      router.addRoute('test', 'destination1');
      
      const event: Event = {
        id: '1',
        type: 'test',
        payload: { data: 'route' },
        timestamp: Date.now(),
      };
      
      const destinations = router.route(event);
      expect(destinations).toContain('destination1');
    });

    test('should route to multiple destinations', () => {
      router.addRoute('test', 'dest1');
      router.addRoute('test', 'dest2');
      
      const event: Event = { id: '2', type: 'test', payload: {}, timestamp: Date.now() };
      const destinations = router.route(event);
      
      expect(destinations).toContain('dest1');
      expect(destinations).toContain('dest2');
    });

    test('should remove routes', () => {
      const routeId = router.addRoute('test', 'dest1');
      expect(router.removeRoute(routeId)).toBe(true);
      expect(router.removeRoute('nonexistent')).toBe(false);
    });

    test('should get routes by event type', () => {
      router.addRoute('test', 'dest1');
      router.addRoute('test', 'dest2');
      router.addRoute('other', 'dest3');
      
      const testRoutes = router.getRoutes('test');
      expect(testRoutes.length).toBe(2);
      
      const otherRoutes = router.getRoutes('other');
      expect(otherRoutes.length).toBe(1);
    });

    test('should get all routes', () => {
      router.addRoute('test', 'dest1');
      router.addRoute('other', 'dest2');
      
      const allRoutes = router.getRoutes();
      expect(allRoutes.length).toBe(2);
    });

    test('should enable and disable routes', () => {
      const routeId = router.addRoute('test', 'dest1');
      const event: Event = { id: '3', type: 'test', payload: {}, timestamp: Date.now() };
      
      expect(router.route(event)).toContain('dest1');
      
      router.setRouteEnabled(routeId, false);
      expect(router.route(event)).not.toContain('dest1');
    });

    test('should respect priority order', () => {
      router.addRoute('test', 'low', { priority: 1 });
      router.addRoute('test', 'high', { priority: 100 });
      
      const event: Event = { id: '4', type: 'test', payload: {}, timestamp: Date.now() };
      const routes = router.route(event);
      
      expect(routes[0]).toBe('high');
    });

    test('should get snapshot with metrics', () => {
      router.addRoute('test', 'dest');
      
      const snapshot = router.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('totalRoutes');
    });

    test('should reset router state', () => {
      router.addRoute('test', 'dest');
      router.reset();
      
      const snapshot = router.getSnapshot();
      expect(snapshot.metrics.totalRoutes).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = router.exportMetrics();
      expect(metrics.version).toBe('V74');
    });
  });

  // ========== EventFilter Tests ==========
  describe('EventFilter', () => {
    let eventFilter: EventFilterClass;

    beforeEach(() => {
      eventFilter = new EventFilterClass({ enableLogging: false });
    });

    test('should add and filter events', () => {
      const strictFilter = new EventFilterClass({ enableLogging: false, strictMode: true });
      strictFilter.addFilter('numberFilter', [
        { field: 'payload.value', operator: 'gt', value: 10 },
      ]);
      
      const passingEvent: Event = { id: '1', type: 'test', payload: { value: 15 }, timestamp: Date.now() };
      const failingEvent: Event = { id: '2', type: 'test', payload: { value: 5 }, timestamp: Date.now() };
      
      expect(strictFilter.filter(passingEvent)).toBeTruthy();
      expect(strictFilter.filter(failingEvent)).toBeNull();
    });

    test('should filter with equality', () => {
      eventFilter.addFilter('equalsFilter', [
        { field: 'payload.type', operator: 'eq', value: 'important' },
      ]);
      
      const event: Event = { id: '3', type: 'test', payload: { type: 'important' }, timestamp: Date.now() };
      expect(eventFilter.filter(event)).toBeTruthy();
    });

    test('should remove filters', () => {
      const filterId = eventFilter.addFilter('test', [
        { field: 'payload.data', operator: 'eq', value: 'test' },
      ]);
      
      expect(eventFilter.removeFilter(filterId)).toBe(true);
      expect(eventFilter.removeFilter('nonexistent')).toBe(false);
    });

    test('should get all filters', () => {
      eventFilter.addFilter('filter1', []);
      eventFilter.addFilter('filter2', []);
      
      const filters = eventFilter.getFilters();
      expect(filters.length).toBe(2);
    });

    test('should enable and disable filters', () => {
      const filterId = eventFilter.addFilter('test', []);
      
      eventFilter.setFilterEnabled(filterId, false);
      expect(eventFilter.getFilterById(filterId)?.enabled).toBe(false);
      
      eventFilter.setFilterEnabled(filterId, true);
      expect(eventFilter.getFilterById(filterId)?.enabled).toBe(true);
    });

    test('should filter with contains operator', () => {
      const strictFilter = new EventFilterClass({ enableLogging: false, strictMode: true });
      strictFilter.addFilter('containsFilter', [
        { field: 'payload.text', operator: 'contains', value: 'hello' },
      ]);
      
      const event1: Event = { id: '4', type: 'test', payload: { text: 'hello world' }, timestamp: Date.now() };
      const event2: Event = { id: '5', type: 'test', payload: { text: 'goodbye world' }, timestamp: Date.now() };
      
      expect(strictFilter.filter(event1)).toBeTruthy();
      expect(strictFilter.filter(event2)).toBeNull();
    });

    test('should get snapshot with metrics', () => {
      eventFilter.addFilter('test', []);
      
      const snapshot = eventFilter.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('totalFilters');
    });

    test('should reset filter state', () => {
      eventFilter.addFilter('test', []);
      eventFilter.reset();
      
      const snapshot = eventFilter.getSnapshot();
      expect(snapshot.metrics.totalFilters).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = eventFilter.exportMetrics();
      expect(metrics.version).toBe('V74');
    });
  });

  // ========== EventProcessor Tests ==========
  describe('EventProcessor', () => {
    let processor: EventProcessor;

    beforeEach(() => {
      processor = new EventProcessor({ enableLogging: false });
    });

    test('should process events successfully', async () => {
      const event: Event = { id: '1', type: 'test', payload: { data: 'process' }, timestamp: Date.now() };
      
      const result = await processor.process(event, async (e) => {
        // Simulate async work
        await Promise.resolve();
      });
      
      expect(result.success).toBe(true);
      expect(result.event.id).toBe('1');
    });

    test('should track processing duration', async () => {
      const event: Event = { id: '2', type: 'test', payload: {}, timestamp: Date.now() };
      
      const result = await processor.process(event, async (e) => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });
      
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should batch process events', async () => {
      const events: Event[] = [
        { id: '3', type: 'test', payload: {}, timestamp: Date.now() },
        { id: '4', type: 'test', payload: {}, timestamp: Date.now() },
        { id: '5', type: 'test', payload: {}, timestamp: Date.now() },
      ];
      
      const results = await processor.batch(events, async (e) => {
        await Promise.resolve();
      });
      
      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    test('should get processed events', async () => {
      const event: Event = { id: '6', type: 'test', payload: {}, timestamp: Date.now() };
      
      await processor.process(event, async () => {});
      
      const processed = processor.getProcessed();
      expect(processed.length).toBeGreaterThan(0);
    });

    test('should get processing stats', async () => {
      const event: Event = { id: '7', type: 'test', payload: {}, timestamp: Date.now() };
      
      await processor.process(event, async () => {});
      
      const stats = processor.getStats();
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('failureCount');
    });

    test('should handle processing failures', async () => {
      const event: Event = { id: '8', type: 'test', payload: {}, timestamp: Date.now() };
      
      const result = await processor.process(event, async () => {
        throw new Error('Processing failed');
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
    });

    test('should enqueue and dequeue events', () => {
      const event: Event = { id: '9', type: 'test', payload: {}, timestamp: Date.now() };
      
      processor.enqueue(event);
      const dequeued = processor.dequeue();
      
      expect(dequeued?.id).toBe('9');
    });

    test('should get snapshot with metrics', async () => {
      const event: Event = { id: '10', type: 'test', payload: {}, timestamp: Date.now() };
      await processor.process(event, async () => {});
      
      const snapshot = processor.getSnapshot();
      expect(snapshot.metrics).toHaveProperty('totalProcessed');
    });

    test('should reset processor state', async () => {
      const event: Event = { id: '11', type: 'test', payload: {}, timestamp: Date.now() };
      await processor.process(event, async () => {});
      
      processor.reset();
      
      const snapshot = processor.getSnapshot();
      expect(snapshot.metrics.totalProcessed).toBe(0);
    });

    test('should export metrics', () => {
      const metrics = processor.exportMetrics();
      expect(metrics.version).toBe('V74');
      expect(metrics.metrics).toHaveProperty('totalProcessed');
    });
  });
});