/**
 * V62 Notification Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationCenter } from '../notif-engine/NotificationCenter';
import { NotificationPolicy } from '../notif-engine/NotificationPolicy';
import { NotificationFormatter } from '../notif-engine/NotificationFormatter';
import { NotificationQueue } from '../notif-engine/NotificationQueue';

describe('NotificationCenter', () => {
  let center: NotificationCenter;

  beforeEach(() => {
    center = new NotificationCenter({
      maxNotifications: 10,
      retentionPeriod: 60000,
      enablePersistence: false,
      deliveryMode: 'immediate',
      batchInterval: 1000,
    });
  });

  it('should have config property', () => {
    expect(center.config).toBeDefined();
    expect(center.config.maxNotifications).toBe(10);
  });

  it('should send notification', () => {
    const notif = center.send({
      type: 'info',
      title: 'Test',
      body: 'Test body',
    });
    expect(notif.id).toBeDefined();
    expect(notif.timestamp).toBeDefined();
    expect(notif.type).toBe('info');
  });

  it('should broadcast notification', () => {
    const notif = center.broadcast({
      type: 'success',
      title: 'Broadcast',
      body: 'Broadcast body',
    });
    expect(notif.id).toBeDefined();
    expect(center.notifications.length).toBe(1);
  });

  it('should subscribe and receive notification', () => {
    let received = false;
    center.subscribe('sub1', (n) => { received = true; });
    center.send({ type: 'info', title: 'T', body: 'B' });
    expect(received).toBe(true);
  });

  it('should unsubscribe', () => {
    center.subscribe('sub1', () => {});
    expect(center.unsubscribe('sub1')).toBe(true);
    expect(center.unsubscribe('sub1')).toBe(false);
  });

  it('should getNotifications with filter', () => {
    center.send({ type: 'info', title: 'T1', body: 'B1' });
    center.send({ type: 'error', title: 'T2', body: 'B2' });
    const errors = center.getNotifications({ type: 'error' });
    expect(errors.length).toBe(1);
    expect(errors[0].type).toBe('error');
  });

  it('should getSnapshot', () => {
    center.send({ type: 'info', title: 'T', body: 'B' });
    const snap = center.getSnapshot();
    expect(snap.metrics.totalSent).toBe(1);
    expect(snap.count).toBe(1);
  });

  it('should reset', () => {
    center.send({ type: 'info', title: 'T', body: 'B' });
    center.reset();
    expect(center.notifications.length).toBe(0);
    expect(center.getSnapshot().metrics.totalSent).toBe(0);
  });

  it('should getReport', () => {
    const report = center.getReport();
    expect(report).toContain('NotificationCenter Report');
    expect(report).toContain('Total Sent');
  });

  it('should exportMetrics', () => {
    const exported = center.exportMetrics();
    expect(exported.version).toBe('V62');
    expect(exported.metrics).toBeDefined();
  });
});

describe('NotificationPolicy', () => {
  let policy: NotificationPolicy;

  beforeEach(() => {
    policy = new NotificationPolicy({
      defaultPolicy: 'allow',
      enableLogging: true,
      maxRules: 10,
      evaluationMode: 'first-match',
    });
  });

  it('should have config property', () => {
    expect(policy.config).toBeDefined();
    expect(policy.config.defaultPolicy).toBe('allow');
  });

  it('should add rule', () => {
    const rule = policy.addRule({
      name: 'Block Errors',
      priority: 1,
      enabled: true,
      conditions: [{ field: 'type', operator: 'equals', value: 'error' }],
      action: { type: 'block' },
    });
    expect(rule.id).toBeDefined();
    expect(rule.name).toBe('Block Errors');
  });

  it('should remove rule', () => {
    const rule = policy.addRule({
      name: 'Test',
      priority: 1,
      enabled: true,
      conditions: [],
      action: { type: 'allow' },
    });
    expect(policy.removeRule(rule.id)).toBe(true);
    expect(policy.getRules().length).toBe(0);
  });

  it('should evaluate and allow', () => {
    policy.addRule({
      name: 'Allow Info',
      priority: 1,
      enabled: true,
      conditions: [{ field: 'type', operator: 'equals', value: 'info' }],
      action: { type: 'allow' },
    });
    const result = policy.evaluate({ type: 'info' });
    expect(result.allowed).toBe(true);
  });

  it('should evaluate and block', () => {
    policy.addRule({
      name: 'Block Errors',
      priority: 1,
      enabled: true,
      conditions: [{ field: 'type', operator: 'equals', value: 'error' }],
      action: { type: 'block' },
    });
    const result = policy.evaluate({ type: 'error' });
    expect(result.allowed).toBe(false);
  });

  it('should getRules with filter', () => {
    policy.addRule({ name: 'A', priority: 1, enabled: true, conditions: [], action: { type: 'allow' } });
    policy.addRule({ name: 'B', priority: 2, enabled: false, conditions: [], action: { type: 'allow' } });
    const enabled = policy.getRules({ enabled: true });
    expect(enabled.length).toBe(1);
  });

  it('should getSnapshot', () => {
    const snap = policy.getSnapshot();
    expect(snap.metrics).toBeDefined();
    expect(snap.ruleCount).toBe(0);
  });

  it('should reset', () => {
    policy.addRule({ name: 'T', priority: 1, enabled: true, conditions: [], action: { type: 'allow' } });
    policy.reset();
    expect(policy.getRules().length).toBe(0);
  });

  it('should getReport', () => {
    const report = policy.getReport();
    expect(report).toContain('NotificationPolicy Report');
  });

  it('should exportMetrics', () => {
    const exported = policy.exportMetrics();
    expect(exported.version).toBe('V62');
  });
});

describe('NotificationFormatter', () => {
  let formatter: NotificationFormatter;

  beforeEach(() => {
    formatter = new NotificationFormatter({
      defaultLocale: 'en-US',
      dateFormat: 'YYYY-MM-DD',
      enableHtml: true,
      maxTemplateSize: 500,
      strictMode: true,
    });
  });

  it('should have config property', () => {
    expect(formatter.config).toBeDefined();
    expect(formatter.config.defaultLocale).toBe('en-US');
  });

  it('should add template', () => {
    const tpl = formatter.addTemplate({
      name: 'Welcome',
      template: 'Hello {{name}}',
      variables: [{ name: 'name', type: 'string' }],
    });
    expect(tpl.id).toBeDefined();
    expect(tpl.name).toBe('Welcome');
  });

  it('should format with template', () => {
    const tpl = formatter.addTemplate({
      name: 'Greet',
      template: 'Hello {{name}}!',
      variables: [{ name: 'name', type: 'string' }],
    });
    const result = formatter.format(tpl.id, { name: 'World' });
    expect(result).toContain('World');
  });

  it('should applyTemplate', () => {
    const tpl = formatter.addTemplate({
      name: 'Test',
      template: 'Value: {{value}}',
      variables: [{ name: 'value', type: 'number' }],
    });
    const result = formatter.applyTemplate(tpl.id, { value: 42 });
    expect(result.formatted).toContain('42');
  });

  it('should throw on missing template', () => {
    expect(() => formatter.format('missing', {})).toThrow();
  });

  it('should getTemplates', () => {
    formatter.addTemplate({ name: 'T1', template: 'A', variables: [] });
    formatter.addTemplate({ name: 'T2', template: 'B', variables: [] });
    expect(formatter.getTemplates().length).toBe(2);
  });

  it('should remove template', () => {
    const tpl = formatter.addTemplate({ name: 'T', template: 'X', variables: [] });
    expect(formatter.removeTemplate(tpl.id)).toBe(true);
  });

  it('should getSnapshot', () => {
    const snap = formatter.getSnapshot();
    expect(snap.metrics).toBeDefined();
  });

  it('should reset', () => {
    formatter.addTemplate({ name: 'T', template: 'X', variables: [] });
    formatter.reset();
    expect(formatter.templates.length).toBe(0);
  });

  it('should getReport', () => {
    const report = formatter.getReport();
    expect(report).toContain('NotificationFormatter Report');
  });

  it('should exportMetrics', () => {
    const exported = formatter.exportMetrics();
    expect(exported.version).toBe('V62');
  });
});

describe('NotificationQueue', () => {
  let queue: NotificationQueue;

  beforeEach(() => {
    queue = new NotificationQueue({
      maxSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
      enableScheduling: true,
      processingMode: 'fifo',
      overflowPolicy: 'reject',
    });
  });

  it('should have config property', () => {
    expect(queue.config).toBeDefined();
    expect(queue.config.maxSize).toBe(10);
  });

  it('should enqueue notification', () => {
    const item = queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    expect(item.id).toBeDefined();
    expect(queue.size).toBe(1);
  });

  it('should dequeue notification', () => {
    queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    const item = queue.dequeue();
    expect(item).toBeDefined();
    expect(queue.size).toBe(0);
  });

  it('should peek without removing', () => {
    queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    const item = queue.peek();
    expect(item).toBeDefined();
    expect(queue.size).toBe(1);
  });

  it('should return undefined on empty peek', () => {
    expect(queue.peek()).toBeUndefined();
  });

  it('should getPending', () => {
    queue.enqueue({ type: 'info', title: 'T1', body: 'B' });
    queue.enqueue({ type: 'error', title: 'T2', body: 'B' });
    const pending = queue.getPending();
    expect(pending.length).toBe(2);
  });

  it('should throw on full queue with reject policy', () => {
    const fullQueue = new NotificationQueue({
      maxSize: 2,
      maxRetries: 3,
      retryDelay: 1000,
      enableScheduling: false,
      processingMode: 'fifo',
      overflowPolicy: 'reject',
    });
    fullQueue.enqueue({ type: 'info', title: 'T1', body: 'B' });
    fullQueue.enqueue({ type: 'info', title: 'T2', body: 'B' });
    expect(() => fullQueue.enqueue({ type: 'info', title: 'T3', body: 'B' })).toThrow();
  });

  it('should drop oldest on overflow with drop-oldest policy', () => {
    const dropQueue = new NotificationQueue({
      maxSize: 2,
      maxRetries: 3,
      retryDelay: 1000,
      enableScheduling: false,
      processingMode: 'fifo',
      overflowPolicy: 'drop-oldest',
    });
    dropQueue.enqueue({ type: 'info', title: 'T1', body: 'B' });
    dropQueue.enqueue({ type: 'info', title: 'T2', body: 'B' });
    dropQueue.enqueue({ type: 'info', title: 'T3', body: 'B' });
    expect(dropQueue.size).toBe(2);
  });

  it('should clear queue', () => {
    queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    queue.clear();
    expect(queue.size).toBe(0);
  });

  it('should getSnapshot', () => {
    queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    const snap = queue.getSnapshot();
    expect(snap.metrics.totalEnqueued).toBe(1);
    expect(snap.size).toBe(1);
  });

  it('should reset', () => {
    queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    queue.reset();
    expect(queue.size).toBe(0);
    expect(queue.getSnapshot().metrics.totalEnqueued).toBe(0);
  });

  it('should getReport', () => {
    const report = queue.getReport();
    expect(report).toContain('NotificationQueue Report');
  });

  it('should exportMetrics', () => {
    const exported = queue.exportMetrics();
    expect(exported.version).toBe('V62');
  });

  it('should remove specific item', () => {
    const item = queue.enqueue({ type: 'info', title: 'T', body: 'B' });
    expect(queue.remove(item.id)).toBe(true);
    expect(queue.size).toBe(0);
  });

  it('should handle priority ordering', () => {
    const pq = new NotificationQueue({
      maxSize: 10,
      maxRetries: 3,
      retryDelay: 1000,
      enableScheduling: false,
      processingMode: 'priority',
      overflowPolicy: 'reject',
    });
    pq.enqueue({ type: 'info', title: 'Low', body: 'B' }, 'low');
    pq.enqueue({ type: 'info', title: 'Critical', body: 'B' }, 'critical');
    pq.enqueue({ type: 'info', title: 'Normal', body: 'B' }, 'normal');
    expect(pq.peek()?.priority).toBe('critical');
  });
});