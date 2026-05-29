import { describe, test, expect } from 'vitest';
import { StorageManager } from '../storage-engine/StorageManager';

describe('Debug StorageManager', () => {
  test('check class methods', () => {
    const m = new StorageManager({ namespace: 'test' });
    console.log('manager keys:', Object.keys(m));
    console.log('prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(m)));
    console.log('has store property:', 'store' in m);
    console.log('store type:', typeof (m as any).store);
    console.log('config:', m.config);
    expect(typeof m.store).toBe('function');
  });
});
