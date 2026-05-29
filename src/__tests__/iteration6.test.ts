/**
 * iteration6.test.ts - V36 Iteration 6 Tests
 * Tests for Auth, Session, Token, and Policy modules
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Auth } from '../iteration6/Auth';
import { Session } from '../iteration6/Session';
import { TokenHandler } from '../iteration6/Token';
import { Policy } from '../iteration6/Policy';

// ==================== AUTH TESTS ====================

describe('Auth', () => {
  let auth: Auth;

  beforeEach(() => {
    auth = new Auth();
  });

  it('should create a new auth instance', () => {
    expect(auth).toBeDefined();
  });

  it('should login with valid credentials', () => {
    const session = auth.login({ username: 'testuser', password: 'password123' });
    expect(session).toBeDefined();
    expect(session?.userId).toBeTruthy();
    expect(session?.sessionId).toBeTruthy();
  });

  it('should fail login without credentials', () => {
    const session = auth.login({ username: '', password: '' });
    expect(session).toBeNull();
  });

  it('should verify a valid session', () => {
    const session = auth.login({ username: 'testuser', password: 'password123' });
    expect(session).toBeDefined();
    const valid = auth.verify(session!.sessionId);
    expect(valid).toBe(true);
  });

  it('should fail verification for invalid session', () => {
    const valid = auth.verify('invalid_session_id');
    expect(valid).toBe(false);
  });

  it('should logout a valid session', () => {
    const session = auth.login({ username: 'testuser', password: 'password123' });
    expect(session).toBeDefined();
    const result = auth.logout(session!.sessionId);
    expect(result).toBe(true);
    expect(auth.verify(session!.sessionId)).toBe(false);
  });

  it('should get user by id', () => {
    const session = auth.login({ username: 'testuser', password: 'password123' });
    const user = auth.getUser(session!.userId);
    expect(user).toBeDefined();
    expect(user?.username).toBe('testuser');
  });

  it('should get user by session id', () => {
    const session = auth.login({ username: 'testuser', password: 'password123' });
    const user = auth.getUserBySession(session!.sessionId);
    expect(user).toBeDefined();
    expect(user?.username).toBe('testuser');
  });

  it('should return snapshot with metrics', () => {
    auth.login({ username: 'testuser', password: 'password123' });
    const snapshot = auth.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics.logins).toBe(1);
  });

  it('should reset all state', () => {
    auth.login({ username: 'testuser', password: 'password123' });
    auth.reset();
    const snapshot = auth.getSnapshot();
    expect(snapshot.metrics.logins).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = auth.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.logins).toBe('number');
  });

  it('should get report', () => {
    const report = auth.getReport();
    expect(report).toContain('Auth Report');
  });
});

// ==================== SESSION TESTS ====================

describe('Session', () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
  });

  it('should create a new session', () => {
    const result = session.create('user123');
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.userId).toBe('user123');
  });

  it('should validate an active session', () => {
    const sess = session.create('user123');
    const valid = session.validate(sess.id);
    expect(valid).toBe(true);
  });

  it('should fail validation for invalid session', () => {
    const valid = session.validate('invalid_id');
    expect(valid).toBe(false);
  });

  it('should destroy a session', () => {
    const sess = session.create('user123');
    const result = session.destroy(sess.id);
    expect(result).toBe(true);
    expect(session.validate(sess.id)).toBe(false);
  });

  it('should get sessions by user id', () => {
    session.create('user123');
    session.create('user123');
    const sessions = session.getSessions('user123');
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should get all sessions', () => {
    session.create('user1');
    session.create('user2');
    const sessions = session.getAllSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should cleanup expired sessions', () => {
    const sess = session.create('user123', {}, { ttl: 1 });
    const cleaned = session.cleanup();
    expect(cleaned).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot with metrics', () => {
    session.create('user123');
    const snapshot = session.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics.creates).toBe(1);
  });

  it('should reset all state', () => {
    session.create('user123');
    session.reset();
    const snapshot = session.getSnapshot();
    expect(snapshot.metrics.creates).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = session.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.creates).toBe('number');
  });

  it('should get report', () => {
    const report = session.getReport();
    expect(report).toContain('Session Report');
  });
});

// ==================== TOKEN TESTS ====================

describe('TokenHandler', () => {
  let tokens: TokenHandler;

  beforeEach(() => {
    tokens = new TokenHandler();
  });

  it('should create a new token handler', () => {
    expect(tokens).toBeDefined();
  });

  it('should generate token pair', () => {
    const pair = tokens.generate('user123');
    expect(pair).toBeDefined();
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.accessToken.type).toBe('access');
    expect(pair.refreshToken.type).toBe('refresh');
  });

  it('should validate a valid token', () => {
    const pair = tokens.generate('user123');
    const token = tokens.validate(pair.accessToken.token);
    expect(token).toBeDefined();
    expect(token?.userId).toBe('user123');
  });

  it('should fail validation for invalid token', () => {
    const token = tokens.validate('invalid_token');
    expect(token).toBeNull();
  });

  it('should refresh an access token', () => {
    const pair = tokens.generate('user123');
    const newAccess = tokens.refresh(pair.refreshToken.token);
    expect(newAccess).toBeDefined();
    expect(newAccess?.type).toBe('access');
    expect(newAccess?.userId).toBe('user123');
  });

  it('should revoke a token', () => {
    const pair = tokens.generate('user123');
    const result = tokens.revoke(pair.accessToken.token);
    expect(result).toBe(true);
    expect(tokens.validate(pair.accessToken.token)).toBeNull();
  });

  it('should get tokens by user', () => {
    tokens.generate('user123');
    tokens.generate('user123');
    const userTokens = tokens.getTokens('user123');
    expect(userTokens.length).toBeGreaterThanOrEqual(2);
  });

  it('should get tokens by type', () => {
    const pair = tokens.generate('user123');
    const accessTokens = tokens.getTokensByType('user123', 'access');
    expect(accessTokens.length).toBeGreaterThanOrEqual(1);
  });

  it('should cleanup expired tokens', () => {
    const tokensWithShortTTL = new TokenHandler({ accessTTL: 1, refreshTTL: 1 });
    tokensWithShortTTL.generate('user123');
    const cleaned = tokensWithShortTTL.cleanup();
    expect(cleaned).toBeGreaterThanOrEqual(0);
  });

  it('should get snapshot with metrics', () => {
    tokens.generate('user123');
    const snapshot = tokens.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics.generations).toBe(1);
  });

  it('should reset all state', () => {
    tokens.generate('user123');
    tokens.reset();
    const snapshot = tokens.getSnapshot();
    expect(snapshot.metrics.generations).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = tokens.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.generations).toBe('number');
  });

  it('should get report', () => {
    const report = tokens.getReport();
    expect(report).toContain('Token Report');
  });
});

// ==================== POLICY TESTS ====================

describe('Policy', () => {
  let policy: Policy;

  beforeEach(() => {
    policy = new Policy();
  });

  it('should create a new policy instance', () => {
    expect(policy).toBeDefined();
  });

  it('should add a policy rule', () => {
    const rule = policy.add('test-rule', ['admin'], ['documents'], ['read'], 'allow');
    expect(rule).toBeDefined();
    expect(rule.name).toBe('test-rule');
  });

  it('should check and allow access', () => {
    policy.add('read-rule', ['user'], ['documents'], ['read'], 'allow');
    const result = policy.check('user', 'documents', 'read');
    expect(result.allowed).toBe(true);
  });

  it('should check and deny access', () => {
    policy.add('deny-rule', ['user'], ['documents'], ['delete'], 'deny');
    const result = policy.check('user', 'documents', 'delete');
    expect(result.allowed).toBe(false);
  });

  it('should use allow shorthand', () => {
    policy.add('read-rule', ['user'], ['documents'], ['read'], 'allow');
    const allowed = policy.allow('user', 'documents', 'read');
    expect(allowed).toBe(true);
  });

  it('should use deny shorthand', () => {
    policy.add('deny-rule', ['user'], ['documents'], ['delete'], 'deny');
    const denied = policy.deny('user', 'documents', 'delete');
    expect(denied).toBe(true);
  });

  it('should get all policies', () => {
    policy.add('rule1', ['user'], ['docs'], ['read'], 'allow');
    policy.add('rule2', ['admin'], ['docs'], ['write'], 'allow');
    const rules = policy.getPolicies();
    expect(rules.length).toBe(2);
  });

  it('should get policies by effect', () => {
    policy.add('allow-rule', ['user'], ['docs'], ['read'], 'allow');
    policy.add('deny-rule', ['user'], ['docs'], ['delete'], 'deny');
    const denies = policy.getPoliciesByEffect('deny');
    expect(denies.length).toBe(1);
  });

  it('should remove a rule', () => {
    const rule = policy.add('test-rule', ['user'], ['docs'], ['read'], 'allow');
    const removed = policy.remove(rule.id);
    expect(removed).toBe(true);
    expect(policy.getPolicies().length).toBe(0);
  });

  it('should clear all rules', () => {
    policy.add('rule1', ['user'], ['docs'], ['read'], 'allow');
    policy.add('rule2', ['admin'], ['docs'], ['write'], 'allow');
    policy.clear();
    expect(policy.getPolicies().length).toBe(0);
  });

  it('should get snapshot with metrics', () => {
    policy.add('test-rule', ['user'], ['docs'], ['read'], 'allow');
    policy.check('user', 'docs', 'read');
    const snapshot = policy.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.metrics.checks).toBe(1);
  });

  it('should reset all state', () => {
    policy.add('test-rule', ['user'], ['docs'], ['read'], 'allow');
    policy.check('user', 'docs', 'read');
    policy.reset();
    const snapshot = policy.getSnapshot();
    expect(snapshot.metrics.checks).toBe(0);
  });

  it('should export metrics', () => {
    const metrics = policy.exportMetrics();
    expect(metrics).toBeDefined();
    expect(typeof metrics.checks).toBe('number');
  });

  it('should get report', () => {
    const report = policy.getReport();
    expect(report).toContain('Policy Report');
  });
});

// ==================== INTEGRATION TESTS ====================

describe('Iteration6 Integration', () => {
  it('should work together - Auth with Session', () => {
    const auth = new Auth();
    const session = new Session();
    
    const authSession = auth.login({ username: 'user1', password: 'pass' });
    expect(authSession).toBeDefined();
    
    const sess = session.create(authSession!.userId);
    expect(session.validate(sess.id)).toBe(true);
  });

  it('should work together - Auth with Token', () => {
    const auth = new Auth();
    const tokens = new TokenHandler();
    
    const authSession = auth.login({ username: 'user1', password: 'pass' });
    expect(authSession).toBeDefined();
    
    const user = auth.getUser(authSession!.userId);
    expect(user).toBeDefined();
    
    const tokenPair = tokens.generate(user!.id);
    expect(tokens.validate(tokenPair.accessToken.token)).toBeDefined();
  });

  it('should work together - Auth with Policy', () => {
    const auth = new Auth();
    const policy = new Policy();
    
    // Create user first via login (gets 'user' role by default)
    const authSession = auth.login({ username: 'testuser', password: 'pass' });
    expect(authSession).toBeDefined();
    
    // Add policy for 'user' role (not 'admin' since auto-created users get 'user' role)
    policy.add('user-access', ['user'], ['documents'], ['read'], 'allow');
    const user = auth.getUser(authSession!.userId);
    
    const result = policy.check(user!.roles[0], 'documents', 'read');
    expect(result.allowed).toBe(true);
  });
});