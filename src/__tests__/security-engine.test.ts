/**
 * V70 Security Engine Tests
 */

import { SecurityManager } from '../security-engine/SecurityManager';
import { EncryptionService } from '../security-engine/EncryptionService';
import { AccessControl } from '../security-engine/AccessControl';
import { SecurityAudit } from '../security-engine/SecurityAudit';

describe('V70 Security Engine', () => {
  describe('SecurityManager', () => {
    let sm: SecurityManager;

    beforeEach(() => {
      sm = new SecurityManager({
        authProvider: 'default',
        sessionTimeout: 300000,
        maxLoginAttempts: 3,
        enableMfa: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSymbols: false,
        },
      });
    });

    test('should authenticate valid user', async () => {
      const result = await sm.authenticate('admin', 'password');
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    test('should reject invalid credentials', async () => {
      const result = await sm.authenticate('invalid', 'wrong');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should authorize valid permission', async () => {
      const auth = await sm.authenticate('admin', 'password');
      const authorized = await sm.authorize(auth.token!, 'read');
      expect(authorized).toBe(true);
    });

    test('should deny unauthorized permission', async () => {
      const auth = await sm.authenticate('viewer', 'password');
      const authorized = await sm.authorize(auth.token!, 'delete');
      expect(authorized).toBe(false);
    });

    test('should validate active token', async () => {
      const auth = await sm.authenticate('admin', 'password');
      const valid = await sm.validate(auth.token!);
      expect(valid).toBe(true);
    });

    test('should get user permissions', async () => {
      const perms = await sm.getPermissions('1');
      expect(perms).toContain('read');
      expect(perms).toContain('write');
    });

    test('should get snapshot with metrics', () => {
      const snapshot = sm.getSnapshot();
      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.sessionCount).toBeDefined();
      expect(snapshot.userCount).toBeDefined();
    });

    test('should reset all state', () => {
      sm.reset();
      const snapshot = sm.getSnapshot();
      expect(snapshot.metrics.authentications).toBe(0);
      expect(snapshot.sessionCount).toBe(0);
    });

    test('should generate report', () => {
      const report = sm.getReport();
      expect(report).toContain('SecurityManager Report');
    });

    test('should export metrics with version', () => {
      const metrics = sm.exportMetrics();
      expect(metrics.version).toBe('V70');
      expect(metrics.metrics).toBeDefined();
    });
  });

  describe('EncryptionService', () => {
    let es: EncryptionService;

    beforeEach(() => {
      es = new EncryptionService({
        defaultCipher: 'aes-256-gcm',
        keyDerivation: {
          algorithm: 'pbkdf2',
          iterations: 10000,
          saltLength: 16,
        },
        hashAlgorithm: 'sha-256',
        enableHardwareAcceleration: true,
      });
    });

    test('should encrypt data', async () => {
      const result = await es.encrypt('sensitive data');
      expect(result.ciphertext).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.cipher).toBe('aes-256-gcm');
    });

    test('should decrypt data', async () => {
      const encrypted = await es.encrypt('secret message');
      const decrypted = await es.decrypt(encrypted);
      expect(decrypted).toBeDefined();
    });

    test('should hash data', async () => {
      const hash = await es.hash('test data');
      expect(hash).toBeDefined();
      expect(hash).toContain('hash');
    });

    test('should get cipher info', () => {
      const info = es.getCipherInfo('aes-256-gcm');
      expect(info.name).toBe('aes-256-gcm');
      expect(info.keySize).toBe(32);
      expect(info.ivSize).toBe(12);
      expect(info.support).toBe(true);
    });

    test('should get snapshot with metrics', () => {
      const snapshot = es.getSnapshot();
      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.availableCiphers).toContain('aes-256-gcm');
    });

    test('should reset metrics', () => {
      es.encrypt('test');
      es.reset();
      const snapshot = es.getSnapshot();
      expect(snapshot.metrics.encryptions).toBe(0);
    });

    test('should generate report', () => {
      const report = es.getReport();
      expect(report).toContain('EncryptionService Report');
    });

    test('should export metrics with version', () => {
      const metrics = es.exportMetrics();
      expect(metrics.version).toBe('V70');
    });
  });

  describe('AccessControl', () => {
    let ac: AccessControl;

    beforeEach(() => {
      ac = new AccessControl({
        defaultRole: 'viewer',
        enforceHierarchy: true,
        maxRolesPerUser: 5,
        enableAudit: true,
        roleHierarchy: {
          admin: 4,
          editor: 3,
          viewer: 2,
          guest: 1,
        },
      });
    });

    test('should grant role', async () => {
      const result = await ac.grant('user1', 'doc1', 'editor', 'admin');
      expect(result).toBe(true);
    });

    test('should revoke role', async () => {
      await ac.grant('user1', 'doc1', 'editor', 'admin');
      const result = await ac.revoke('user1', 'doc1', 'editor');
      expect(result).toBe(true);
    });

    test('should check permission', async () => {
      await ac.grant('user1', 'doc1', 'editor', 'admin');
      const hasAccess = await ac.check('user1', 'doc1', 'write');
      expect(hasAccess).toBe(true);
    });

    test('should deny without permission', async () => {
      const hasAccess = await ac.check('user1', 'doc1', 'delete');
      expect(hasAccess).toBe(false);
    });

    test('should get roles for user', async () => {
      await ac.grant('user1', 'doc1', 'editor', 'admin');
      await ac.grant('user1', 'doc1', 'viewer', 'admin');
      const roles = await ac.getRoles('user1', 'doc1');
      expect(roles.length).toBeGreaterThan(0);
    });

    test('should enforce max roles per user', async () => {
      for (let i = 0; i < 5; i++) {
        await ac.grant('user1', `doc${i}`, 'viewer', 'admin');
      }
      const result = await ac.grant('user1', 'doc5', 'viewer', 'admin');
      expect(result).toBe(false);
    });

    test('should get snapshot with metrics', () => {
      const snapshot = ac.getSnapshot();
      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.roleCount).toBe(4);
    });

    test('should reset state', () => {
      ac.reset();
      const snapshot = ac.getSnapshot();
      expect(snapshot.metrics.grants).toBe(0);
      expect(snapshot.accessCount).toBe(0);
    });

    test('should generate report', () => {
      const report = ac.getReport();
      expect(report).toContain('AccessControl Report');
    });

    test('should export metrics with version', () => {
      const metrics = ac.exportMetrics();
      expect(metrics.version).toBe('V70');
    });
  });

  describe('SecurityAudit', () => {
    let sa: SecurityAudit;

    beforeEach(() => {
      sa = new SecurityAudit({
        retentionDays: 30,
        enableRealTimeAlerts: true,
        alertThresholds: {
          failedAuthPerMinute: 5,
          failedAuthWindow: 60,
          suspiciousActivityThreshold: 10,
        },
        logRotation: 'daily',
        enableComplianceLogging: true,
      });
    });

    test('should log events', async () => {
      const id = await sa.log('AUTH_SUCCESS', 'info', { user: 'admin' });
      expect(id).toBeDefined();
    });

    test('should query logs with filters', async () => {
      await sa.log('AUTH_SUCCESS', 'info', { user: 'admin' });
      await sa.log('AUTH_FAILURE', 'high', { user: 'attacker' });
      const results = await sa.query({ eventType: 'AUTH_SUCCESS' });
      expect(results.length).toBeGreaterThan(0);
    });

    test('should query logs by severity', async () => {
      await sa.log('TEST_EVENT', 'critical', {});
      await sa.log('TEST_EVENT', 'low', {});
      const results = await sa.query({ severity: 'critical' });
      expect(results.every((r) => r.severity === 'critical')).toBe(true);
    });

    test('should get alerts', async () => {
      await sa.log('SECURITY_BREACH', 'critical', { detail: 'test' });
      const alerts = await sa.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    test('should filter alerts by severity', async () => {
      await sa.log('BREACH', 'critical', {});
      await sa.log('WARNING', 'low', {});
      const criticalAlerts = await sa.getAlerts({ severity: 'critical' });
      expect(criticalAlerts.every((a) => a.severity === 'critical')).toBe(true);
    });

    test('should generate report', async () => {
      await sa.log('AUTH_SUCCESS', 'info', { user: 'admin' });
      const logs = await sa.query({});
      expect(logs.length).toBe(1);
      const reportStr = sa.getReport();
      expect(typeof reportStr).toBe('string');
      expect(reportStr.length).toBeGreaterThan(0);
    });

    test('should get snapshot with metrics', () => {
      const snapshot = sa.getSnapshot();
      expect(snapshot.metrics).toBeDefined();
      expect(snapshot.logCount).toBeDefined();
    });

    test('should reset all logs and alerts', () => {
      sa.reset();
      const snapshot = sa.getSnapshot();
      expect(snapshot.metrics.loggedEvents).toBe(0);
      expect(snapshot.logCount).toBe(0);
      expect(snapshot.alertCount).toBe(0);
    });

    test('should generate string report', () => {
      const report = sa.getReport();
      expect(report).toContain('SecurityAudit Report');
    });

    test('should export metrics with version', () => {
      const metrics = sa.exportMetrics();
      expect(metrics.version).toBe('V70');
    });
  });
});