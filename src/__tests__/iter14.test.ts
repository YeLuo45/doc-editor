import { describe, it, expect } from 'vitest';
import { Vault, Key, Cipher, Token } from '../iter14';

describe('iter14 modules', () => {
  describe('Vault', () => {
    it('should store and retrieve', () => {
      const vault = new Vault();
      vault.store('key1', 'secret1');
      expect(vault.retrieve('key1')).toBe('secret1');
    });
    it('should delete', () => {
      const vault = new Vault();
      vault.store('k', 'v');
      vault.delete('k');
      expect(vault.retrieve('k')).toBeUndefined();
    });
    it('should list keys', () => {
      const vault = new Vault();
      vault.store('a', '1');
      vault.store('b', '2');
      expect(vault.listKeys()).toContain('a');
    });
    it('should get snapshot', () => {
      const vault = new Vault();
      expect(vault.getSnapshot().secrets).toBe(0);
    });
    it('should reset', () => {
      const vault = new Vault();
      vault.store('x', 'y');
      vault.reset();
      expect(vault.getSnapshot().secrets).toBe(0);
    });
    it('should get report', () => {
      const vault = new Vault();
      expect(typeof vault.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const vault = new Vault();
      expect(vault.exportMetrics()).toBeDefined();
    });
  });

  describe('Key', () => {
    it('should activate and deactivate', () => {
      const key = new Key('K1');
      key.activate();
      expect(key.isActive()).toBe(true);
      key.deactivate();
      expect(key.isActive()).toBe(false);
    });
    it('should have id', () => {
      const key = new Key('my-key');
      expect(key.id).toBe('my-key');
    });
    it('should get snapshot', () => {
      const key = new Key('K2');
      expect(key.getSnapshot().id).toBe('K2');
    });
    it('should reset', () => {
      const key = new Key('K3');
      key.activate();
      key.reset();
      expect(key.isActive()).toBe(false);
    });
    it('should get report', () => {
      const key = new Key('K4');
      expect(typeof key.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const key = new Key('K5');
      expect(key.exportMetrics()).toBeDefined();
    });
  });

  describe('Cipher', () => {
    it('should encrypt and decrypt', () => {
      const cipher = new Cipher();
      const encrypted = cipher.encrypt('hello');
      expect(encrypted).not.toBe('hello');
      expect(cipher.decrypt(encrypted)).toBe('hello');
    });
    it('should count operations', () => {
      const cipher = new Cipher();
      cipher.encrypt('a');
      expect(cipher.getOperations()).toBe(1);
    });
    it('should get snapshot', () => {
      const cipher = new Cipher();
      expect(cipher.getSnapshot()).toBeDefined();
    });
    it('should reset', () => {
      const cipher = new Cipher();
      cipher.encrypt('x');
      cipher.reset();
      expect(cipher.getOperations()).toBe(0);
    });
    it('should get report', () => {
      const cipher = new Cipher();
      expect(typeof cipher.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const cipher = new Cipher();
      expect(cipher.exportMetrics()).toBeDefined();
    });
  });

  describe('Token', () => {
    it('should generate and validate', () => {
      const token = new Token();
      token.generate('T1');
      expect(token.validate('T1')).toBe(true);
    });
    it('should revoke', () => {
      const token = new Token();
      token.generate('T2');
      token.revoke('T2');
      expect(token.validate('T2')).toBe(false);
    });
    it('should get snapshot', () => {
      const token = new Token();
      expect(token.getSnapshot().tokens).toBe(0);
    });
    it('should reset', () => {
      const token = new Token();
      token.generate('T3');
      token.reset();
      expect(token.getSnapshot().tokens).toBe(0);
    });
    it('should get report', () => {
      const token = new Token();
      expect(typeof token.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const token = new Token();
      expect(token.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const vault = new Vault();
    expect(typeof vault.store).toBe('function');
    expect(typeof vault.retrieve).toBe('function');
    expect(typeof vault.delete).toBe('function');
    expect(typeof vault.listKeys).toBe('function');
    expect(typeof vault.getSnapshot).toBe('function');
    expect(typeof vault.reset).toBe('function');
    expect(typeof vault.getReport).toBe('function');
    expect(typeof vault.exportMetrics).toBe('function');
  });
});
