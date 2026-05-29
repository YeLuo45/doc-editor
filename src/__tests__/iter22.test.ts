import { describe, it, expect } from 'vitest';
import { Store, Cache, Database, Archive } from '../iter22';

describe('iter22 modules', () => {
  describe('Store', () => {
    it('should set and get', () => {
      const s = new Store();
      s.set('key1', 'value1');
      expect(s.get('key1')).toBe('value1');
    });
    it('should delete', () => {
      const s = new Store();
      s.set('k', 'v');
      s.delete('k');
      expect(s.get('k')).toBeUndefined();
    });
    it('should list keys', () => {
      const s = new Store();
      s.set('a', '1');
      s.set('b', '2');
      expect(s.keys()).toContain('a');
    });
    it('should get snapshot', () => {
      const s = new Store();
      expect(s.getSnapshot().keys).toBe(0);
    });
    it('should reset', () => {
      const s = new Store();
      s.set('x', 'y');
      s.reset();
      expect(s.getSnapshot().keys).toBe(0);
    });
    it('should get report', () => {
      const s = new Store();
      expect(typeof s.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const s = new Store();
      expect(s.exportMetrics()).toBeDefined();
    });
  });

  describe('Cache', () => {
    it('should put and get', () => {
      const c = new Cache();
      c.put('k1', 'v1');
      expect(c.get('k1')).toBe('v1');
    });
    it('should count hits', () => {
      const c = new Cache();
      c.put('k2', 'v2');
      c.get('k2');
      expect(c.getHits()).toBe(1);
    });
    it('should check has', () => {
      const c = new Cache();
      c.put('k3', 'v3');
      expect(c.has('k3')).toBe(true);
      expect(c.has('missing')).toBe(false);
    });
    it('should get snapshot', () => {
      const c = new Cache();
      expect(c.getSnapshot().entries).toBe(0);
    });
    it('should reset', () => {
      const c = new Cache();
      c.put('x', 'y');
      c.reset();
      expect(c.getSnapshot().entries).toBe(0);
    });
    it('should get report', () => {
      const c = new Cache();
      expect(typeof c.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const c = new Cache();
      expect(c.exportMetrics()).toBeDefined();
    });
  });

  describe('Database', () => {
    it('should create and drop table', () => {
      const db = new Database();
      db.createTable('users');
      expect(db.query('users').length).toBe(0);
      db.dropTable('users');
      expect(db.query('users').length).toBe(0);
    });
    it('should insert and query', () => {
      const db = new Database();
      db.createTable('items');
      db.insert('items', { id: 1, name: 'item1' });
      expect(db.query('items').length).toBe(1);
    });
    it('should get snapshot', () => {
      const db = new Database();
      expect(db.getSnapshot().tables).toBe(0);
    });
    it('should reset', () => {
      const db = new Database();
      db.createTable('t');
      db.reset();
      expect(db.getSnapshot().tables).toBe(0);
    });
    it('should get report', () => {
      const db = new Database();
      expect(typeof db.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const db = new Database();
      expect(db.exportMetrics()).toBeDefined();
    });
  });

  describe('Archive', () => {
    it('should add and extract', () => {
      const a = new Archive();
      a.add('file1.txt', 'content1');
      expect(a.extract('file1.txt')).toBe('content1');
    });
    it('should remove', () => {
      const a = new Archive();
      a.add('file2.txt', 'c');
      a.remove('file2.txt');
      expect(a.extract('file2.txt')).toBeUndefined();
    });
    it('should list', () => {
      const a = new Archive();
      a.add('a.txt', '1');
      a.add('b.txt', '2');
      expect(a.list()).toContain('a.txt');
    });
    it('should get snapshot', () => {
      const a = new Archive();
      expect(a.getSnapshot().files).toBe(0);
    });
    it('should reset', () => {
      const a = new Archive();
      a.add('x.txt', 'y');
      a.reset();
      expect(a.getSnapshot().files).toBe(0);
    });
    it('should get report', () => {
      const a = new Archive();
      expect(typeof a.getReport()).toBe('string');
    });
    it('should export metrics', () => {
      const a = new Archive();
      expect(a.exportMetrics()).toBeDefined();
    });
  });

  it('should have all required methods', () => {
    const s = new Store();
    expect(typeof s.set).toBe('function');
    expect(typeof s.get).toBe('function');
    expect(typeof s.delete).toBe('function');
    expect(typeof s.keys).toBe('function');
    expect(typeof s.getSnapshot).toBe('function');
    expect(typeof s.reset).toBe('function');
    expect(typeof s.getReport).toBe('function');
    expect(typeof s.exportMetrics).toBe('function');
  });
});