import { describe, it, expect } from 'vitest';
import {
  createSyncRouterState, addRouteRule, removeRouteRule, route,
  getRulesForTarget, getRoutesByMessage, getSyncRouterReport,
} from '../../federation/V226-SyncRouter';

describe('V226 SyncRouter', () => {
  it('should create empty state', () => {
    const s = createSyncRouterState();
    expect(s.rules).toHaveLength(0);
  });

  it('should add rule', () => {
    const s = createSyncRouterState();
    const r = addRouteRule(s, 'doc.*', ['d1', 'd2']);
    expect(r.state.rules).toHaveLength(1);
  });

  it('should remove rule', () => {
    let s = createSyncRouterState();
    const r = addRouteRule(s, 'doc.*', ['d1']);
    s = removeRouteRule(r.state, r.ruleId);
    expect(s.rules).toHaveLength(0);
  });

  it('should route with exact match', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, 'doc.update', ['d1']).state;
    const r = route(s, 'msg1', 'doc.update');
    expect(r.route!.targetDeviceIds).toContain('d1');
  });

  it('should route with wildcard pattern', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, 'doc.*', ['d1']).state;
    const r = route(s, 'msg1', 'doc.update');
    expect(r.route!.targetDeviceIds).toContain('d1');
  });

  it('should route with universal wildcard', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, '*', ['d1']).state;
    const r = route(s, 'msg1', 'anything');
    expect(r.route!.targetDeviceIds).toContain('d1');
  });

  it('should drop unmatched', () => {
    const s = createSyncRouterState();
    const r = route(s, 'msg1', 'unmatched');
    expect(r.route).toBeUndefined();
    expect(r.state.dropped).toBe(1);
  });

  it('should respect priority', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, 'doc.update', ['d1'], 1).state;
    s = addRouteRule(s, 'doc.update', ['d2'], 10).state;
    const r = route(s, 'msg1', 'doc.update');
    expect(r.route!.targetDeviceIds).toContain('d2');
  });

  it('should get rules for target', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, 'doc.*', ['d1', 'd2']).state;
    s = addRouteRule(s, 'user.*', ['d1']).state;
    expect(getRulesForTarget(s, 'd1')).toHaveLength(2);
  });

  it('should get routes by message', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, '*', ['d1']).state;
    s = route(s, 'msg1', 'a').state;
    expect(getRoutesByMessage(s, 'msg1')).toHaveLength(1);
  });

  it('should produce report', () => {
    let s = createSyncRouterState();
    s = addRouteRule(s, 'doc.*', ['d1']).state;
    s = route(s, 'msg1', 'doc.update').state;
    s = route(s, 'msg2', 'unmatched').state;
    const r = getSyncRouterReport(s);
    expect(r.routed).toBe(1);
    expect(r.dropped).toBe(1);
  });
});
