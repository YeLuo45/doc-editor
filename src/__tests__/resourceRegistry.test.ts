import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPResourceRegistry, resetResourceRegistry, STORAGE_KEY } from '../mcp/ResourceRegistry';
import type { MCPResource, ResourceFilter } from '../mcp/types';

describe('MCPResourceRegistry', () => {
  let registry: MCPResourceRegistry;

  const createTestResource = (overrides: Partial<MCPResource> = {}): MCPResource => ({
    id: 'test-resource',
    type: 'document',
    name: 'Test Resource',
    description: 'A test resource',
    uri: 'https://example.com/resource',
    ...overrides,
  });

  beforeEach(() => {
    resetResourceRegistry();
    localStorage.clear();
    registry = new MCPResourceRegistry();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    it('should register a resource', () => {
      const resource = createTestResource();
      registry.register(resource);
      expect(registry.get('test-resource')).toBeDefined();
      expect(registry.get('test-resource')?.name).toBe('Test Resource');
    });

    it('should throw error if resource has no id', () => {
      const resource = createTestResource({ id: '' });
      expect(() => registry.register(resource)).toThrow('Resource must have an id');
    });

    it('should update existing resource instead of duplicating', () => {
      const resource1 = createTestResource({ name: 'Original' });
      const resource2 = createTestResource({ name: 'Updated' });
      registry.register(resource1);
      registry.register(resource2);
      expect(registry.count()).toBe(1);
      expect(registry.get('test-resource')?.name).toBe('Updated');
    });

    it('should preserve createdAt on update', () => {
      const resource1 = createTestResource();
      registry.register(resource1);
      const createdAt = registry.get('test-resource')!.createdAt;
      const resource2 = createTestResource({ description: 'Updated desc' });
      registry.register(resource2);
      expect(registry.get('test-resource')!.createdAt).toBe(createdAt);
    });
  });

  describe('registerBatch', () => {
    it('should register multiple resources', () => {
      const resources = [
        createTestResource({ id: 'res1' }),
        createTestResource({ id: 'res2' }),
        createTestResource({ id: 'res3' }),
      ];
      registry.registerBatch(resources);
      expect(registry.count()).toBe(3);
    });

    it('should throw error if any resource has no id', () => {
      const resources = [
        createTestResource({ id: 'res1' }),
        createTestResource({ id: '' }),
      ];
      expect(() => registry.registerBatch(resources)).toThrow('Each resource must have an id');
    });
  });

  describe('get', () => {
    it('should return resource by id', () => {
      registry.register(createTestResource());
      const resource = registry.get('test-resource');
      expect(resource).toBeDefined();
      expect(resource?.id).toBe('test-resource');
    });

    it('should return undefined for non-existent resource', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no resources', () => {
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should return all registered resources', () => {
      registry.register(createTestResource({ id: 'res1' }));
      registry.register(createTestResource({ id: 'res2' }));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('find', () => {
    beforeEach(() => {
      registry.registerBatch([
        createTestResource({ id: 'res1', type: 'document', name: 'Document One', tags: ['math', 'algebra'] }),
        createTestResource({ id: 'res2', type: 'video', name: 'Video Tutorial', tags: ['science'] }),
        createTestResource({ id: 'res3', type: 'document', name: 'Document Two', tags: ['math', 'geometry'] }),
      ]);
    });

    it('should filter by type', () => {
      const results = registry.find({ type: 'document' });
      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'document')).toBe(true);
    });

    it('should filter by tags', () => {
      const results = registry.find({ tags: ['math'] });
      expect(results).toHaveLength(2);
    });

    it('should filter by search term', () => {
      const results = registry.find({ search: 'Document' });
      expect(results).toHaveLength(2);
    });

    it('should search in description', () => {
      const results = registry.find({ search: 'Tutorial' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('res2');
    });

    it('should search case-insensitively', () => {
      const results = registry.find({ search: 'document' });
      expect(results).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const results = registry.find({ type: 'document', tags: ['math'] });
      expect(results).toHaveLength(2);
    });

    it('should return all when no filter provided', () => {
      const results = registry.find({});
      expect(results).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update existing resource', () => {
      registry.register(createTestResource());
      const result = registry.update('test-resource', { name: 'Updated Name' });
      expect(result).toBe(true);
      expect(registry.get('test-resource')?.name).toBe('Updated Name');
    });

    it('should return false for non-existent resource', () => {
      const result = registry.update('non-existent', { name: 'New Name' });
      expect(result).toBe(false);
    });

    it('should update updatedAt timestamp', async () => {
      registry.register(createTestResource());
      const originalUpdatedAt = registry.get('test-resource')!.updatedAt;
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      registry.update('test-resource', { description: 'New description' });
      expect(registry.get('test-resource')!.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('remove', () => {
    it('should remove existing resource', () => {
      registry.register(createTestResource());
      const result = registry.remove('test-resource');
      expect(result).toBe(true);
      expect(registry.get('test-resource')).toBeUndefined();
    });

    it('should return false for non-existent resource', () => {
      const result = registry.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all resources', () => {
      registry.register(createTestResource({ id: 'res1' }));
      registry.register(createTestResource({ id: 'res2' }));
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe('count', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count', () => {
      registry.register(createTestResource({ id: 'res1' }));
      registry.register(createTestResource({ id: 'res2' }));
      expect(registry.count()).toBe(2);
    });
  });

  describe('isInitialized', () => {
    it('should return false on fresh registry without storage', () => {
      localStorage.clear();
      const newRegistry = new MCPResourceRegistry();
      expect(newRegistry.isInitialized()).toBe(false);
    });

    it('should return true after register with existing storage', () => {
      registry.register(createTestResource());
      // After any operation that writes to localStorage, it's initialized
      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist resources to localStorage', () => {
      registry.register(createTestResource());
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed['test-resource']).toBeDefined();
    });

    it('should load resources from localStorage on init', () => {
      registry.register(createTestResource());
      const newRegistry = new MCPResourceRegistry();
      expect(newRegistry.get('test-resource')).toBeDefined();
    });
  });
});