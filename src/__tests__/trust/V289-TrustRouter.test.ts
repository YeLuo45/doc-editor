import { describe, it, expect } from 'vitest';
import {
  createTrustRouterState, addValidatorRoute, setRouteActive, routeDoc, recordVerification,
  getRoute, getVerificationsForDoc, getFailedVerifications, clearRouterState, getTrustRouterReport,
} from '../../trust/V289-TrustRouter';

describe('V289 TrustRouter', () => {
  it('should create empty router', () => {
    const s = createTrustRouterState();
    expect(s.routes).toHaveLength(0);
  });

  it('should add route', () => {
    const s = createTrustRouterState();
    const r = addValidatorRoute(s, 'signer', 'signature', /.*/);
    expect(r.state.routes).toHaveLength(1);
  });

  it('should set route active', () => {
    let s = createTrustRouterState();
    const r = addValidatorRoute(s, 'signer', 'signature', /.*/);
    s = setRouteActive(r.state, r.routeId, false);
    expect(s.routes[0].active).toBe(false);
  });

  it('should route doc', () => {
    let s = createTrustRouterState();
    s = addValidatorRoute(s, 'signer', 'signature', /.*/).state;
    s = addValidatorRoute(s, 'hasher', 'hash', /.*/).state;
    const r = routeDoc(s, 'd1');
    expect(r.matched).toHaveLength(2);
  });

  it('should respect priority', () => {
    let s = createTrustRouterState();
    s = addValidatorRoute(s, 'a', 'signature', /.*/, 1).state;
    s = addValidatorRoute(s, 'b', 'hash', /.*/, 10).state;
    const r = routeDoc(s, 'd1');
    expect(r.matched[0].name).toBe('b');
  });

  it('should not route to inactive routes', () => {
    let s = createTrustRouterState();
    const r1 = addValidatorRoute(s, 'a', 'signature', /.*/);
    s = setRouteActive(r1.state, r1.routeId, false);
    s = addValidatorRoute(s, 'b', 'hash', /.*/).state;
    const r = routeDoc(s, 'd1');
    expect(r.matched).toHaveLength(1);
  });

  it('should record verification', () => {
    let s = createTrustRouterState();
    s = recordVerification(s, 'r1', 'd1', 'passed');
    expect(s.history).toHaveLength(1);
  });

  it('should get route', () => {
    let s = createTrustRouterState();
    const r = addValidatorRoute(s, 'a', 'signature', /.*/);
    s = r.state;
    expect(getRoute(s, r.routeId)).toBeDefined();
  });

  it('should get verifications for doc', () => {
    let s = createTrustRouterState();
    s = recordVerification(s, 'r1', 'd1', 'passed');
    s = recordVerification(s, 'r2', 'd2', 'failed');
    expect(getVerificationsForDoc(s, 'd1')).toHaveLength(1);
  });

  it('should get failed verifications', () => {
    let s = createTrustRouterState();
    s = recordVerification(s, 'r1', 'd1', 'passed');
    s = recordVerification(s, 'r2', 'd2', 'failed');
    expect(getFailedVerifications(s)).toHaveLength(1);
  });

  it('should clear state', () => {
    let s = createTrustRouterState();
    s = recordVerification(s, 'r1', 'd1', 'passed');
    s = clearRouterState(s);
    expect(s.history).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createTrustRouterState();
    s = recordVerification(s, 'r1', 'd1', 'failed');
    const r = getTrustRouterReport(s);
    expect(r.failed).toBe(1);
  });
});
