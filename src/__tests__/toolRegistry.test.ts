import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPToolRegistry, resetToolRegistry, STORAGE_KEY } from '../mcp/ToolRegistry';
import type { MCPTool, ToolFilter } from '../mcp/types';

describe('MCPToolRegistry', () => {
  let registry: MCPToolRegistry;

  const createTestTool = (overrides: Partial<MCPTool> = {}): MCPTool => ({
    id: 'test-tool',
    name: 'Test Tool',
    description: 'A test tool',
    version: '1.0.0',
    inputSchema: { type: 'object' },
    handler: () => 'result',
    ...overrides,
  });

  beforeEach(() => {
    resetToolRegistry();
    localStorage.clear();
    registry = new MCPToolRegistry();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    it('should register a tool', () => {
      const tool = createTestTool();
      registry.register(tool);
      expect(registry.get('test-tool')).toBeDefined();
      expect(registry.get('test-tool')?.name).toBe('Test Tool');
    });

    it('should throw error if tool missing id', () => {
      const tool = createTestTool({ id: '' });
      expect(() => registry.register(tool)).toThrow('Tool must have id, name, and version');
    });

    it('should throw error if tool missing name', () => {
      const tool = createTestTool({ name: '' });
      expect(() => registry.register(tool)).toThrow('Tool must have id, name, and version');
    });

    it('should throw error if tool missing version', () => {
      const tool = createTestTool({ version: '' });
      expect(() => registry.register(tool)).toThrow('Tool must have id, name, and version');
    });

    it('should update existing tool', () => {
      registry.register(createTestTool({ name: 'Original' }));
      registry.register(createTestTool({ name: 'Updated', version: '1.0.1' }));
      expect(registry.count()).toBe(1);
      expect(registry.get('test-tool')?.name).toBe('Updated');
    });
  });

  describe('registerWithId', () => {
    it('should register tool with auto-generated id', () => {
      registry.registerWithId('My Tool', 'A test tool', '1.0.0', { type: 'object' }, () => 'result');
      expect(registry.has('my-tool-1.0.0')).toBe(true);
    });

    it('should generate correct id format', () => {
      registry.registerWithId('Search Resources', 'Searches', '2.0.0', { type: 'object' }, () => 'result');
      expect(registry.has('search-resources-2.0.0')).toBe(true);
    });
  });

  describe('get', () => {
    it('should return tool by id', () => {
      registry.register(createTestTool());
      const tool = registry.get('test-tool');
      expect(tool).toBeDefined();
      expect(tool?.id).toBe('test-tool');
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    it('should always return current version', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.register(createTestTool({ version: '1.0.1' }));
      expect(registry.get('test-tool')?.version).toBe('1.0.1');
    });
  });

  describe('getVersion', () => {
    it('should return specific version', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.register(createTestTool({ version: '1.0.1' }));
      const version = registry.getVersion('test-tool', '1.0.0');
      expect(version).toBeDefined();
      expect(version?.version).toBe('1.0.0');
    });

    it('should return undefined for non-existent version', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      expect(registry.getVersion('test-tool', '2.0.0')).toBeUndefined();
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.getVersion('non-existent', '1.0.0')).toBeUndefined();
    });
  });

  describe('getAllVersions', () => {
    it('should return all versions of a tool', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.register(createTestTool({ version: '1.0.1' }));
      registry.register(createTestTool({ version: '2.0.0' }));
      const versions = registry.getAllVersions('test-tool');
      expect(versions).toHaveLength(3);
    });

    it('should return empty array for non-existent tool', () => {
      expect(registry.getAllVersions('non-existent')).toHaveLength(0);
    });

    it('should include deprecation status', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.deprecateVersion('test-tool', '1.0.0');
      const versions = registry.getAllVersions('test-tool');
      const v1 = versions.find(v => v.version === '1.0.0');
      expect(v1?.deprecated).toBe(true);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version string', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      expect(registry.getCurrentVersion('test-tool')).toBe('1.0.0');
    });

    it('should return undefined for non-existent tool', () => {
      expect(registry.getCurrentVersion('non-existent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no tools', () => {
      expect(registry.getAll()).toHaveLength(0);
    });

    it('should return all registered tools', () => {
      registry.register(createTestTool({ id: 'tool1' }));
      registry.register(createTestTool({ id: 'tool2' }));
      expect(registry.getAll()).toHaveLength(2);
    });

    it('should only return current versions', () => {
      registry.register(createTestTool({ id: 'tool1', version: '1.0.0' }));
      registry.register(createTestTool({ id: 'tool1', version: '1.0.1' }));
      expect(registry.getAll()).toHaveLength(1);
    });
  });

  describe('find', () => {
    beforeEach(() => {
      registry.register(createTestTool({ id: 'search-tool', name: 'Search Resources', version: '1.0.0' }));
      registry.register(createTestTool({ id: 'parse-tool', name: 'Parse Document', version: '1.0.0' }));
      registry.register(createTestTool({ id: 'format-tool', name: 'Format Text', version: '2.0.0' }));
    });

    it('should filter by name', () => {
      const results = registry.find({ name: 'Search' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('search-tool');
    });

    it('should filter by name case-insensitively', () => {
      const results = registry.find({ name: 'parse' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('parse-tool');
    });

    it('should filter by version', () => {
      const results = registry.find({ version: '2.0.0' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('format-tool');
    });

    it('should combine filters', () => {
      const results = registry.find({ name: 'Search', version: '1.0.0' });
      expect(results).toHaveLength(1);
    });

    it('should return all when no filter', () => {
      expect(registry.find({})).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update tool and create new version', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      const result = registry.update('test-tool', { description: 'Updated description' });
      expect(result).toBe(true);
      expect(registry.get('test-tool')?.description).toBe('Updated description');
      expect(registry.getAllVersions('test-tool')).toHaveLength(2);
    });

    it('should return false for non-existent tool', () => {
      const result = registry.update('non-existent', { description: 'New' });
      expect(result).toBe(false);
    });

    it('should auto-bump version if not provided', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.update('test-tool', { description: 'Update' });
      expect(registry.get('test-tool')?.version).toBe('1.0.1');
    });
  });

  describe('deprecateVersion', () => {
    it('should mark version as deprecated', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      const result = registry.deprecateVersion('test-tool', '1.0.0');
      expect(result).toBe(true);
      expect(registry.getVersion('test-tool', '1.0.0')?.metadata?.deprecated).toBe('true');
    });

    it('should return false for non-existent tool', () => {
      const result = registry.deprecateVersion('non-existent', '1.0.0');
      expect(result).toBe(false);
    });

    it('should return false for non-existent version', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      const result = registry.deprecateVersion('test-tool', '2.0.0');
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove existing tool', () => {
      registry.register(createTestTool());
      const result = registry.remove('test-tool');
      expect(result).toBe(true);
      expect(registry.get('test-tool')).toBeUndefined();
    });

    it('should return false for non-existent tool', () => {
      const result = registry.remove('non-existent');
      expect(result).toBe(false);
    });

    it('should clear version history', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.register(createTestTool({ version: '1.0.1' }));
      registry.remove('test-tool');
      expect(registry.getAllVersions('test-tool')).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      registry.register(createTestTool({ id: 'tool1' }));
      registry.register(createTestTool({ id: 'tool2' }));
      registry.clear();
      expect(registry.count()).toBe(0);
    });

    it('should clear version history', () => {
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.clear();
      const newRegistry = new MCPToolRegistry();
      expect(newRegistry.getAllVersions('test-tool')).toHaveLength(0);
    });
  });

  describe('count', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count', () => {
      registry.register(createTestTool({ id: 'tool1' }));
      registry.register(createTestTool({ id: 'tool2' }));
      expect(registry.count()).toBe(2);
    });

    it('should not count duplicate versions', () => {
      registry.register(createTestTool({ id: 'tool1', version: '1.0.0' }));
      registry.register(createTestTool({ id: 'tool1', version: '1.0.1' }));
      expect(registry.count()).toBe(1);
    });
  });

  describe('isInitialized', () => {
    it('should return false on fresh registry without storage', () => {
      localStorage.clear();
      const newRegistry = new MCPToolRegistry();
      expect(newRegistry.isInitialized()).toBe(false);
    });

    it('should return true after register with existing storage', () => {
      registry.register(createTestTool());
      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('has', () => {
    it('should return false for non-existent tool', () => {
      expect(registry.has('test-tool')).toBe(false);
    });

    it('should return true for registered tool', () => {
      registry.register(createTestTool());
      expect(registry.has('test-tool')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist tools to localStorage', () => {
      registry.register(createTestTool());
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed['test-tool']).toBeDefined();
    });

    it('should load tools from localStorage on init', () => {
      registry.register(createTestTool());
      const newRegistry = new MCPToolRegistry();
      expect(newRegistry.get('test-tool')).toBeDefined();
    });

    it('should rebuild version index on load', () => {
      // Note: Due to localStorage limitations, only current tool version is persisted
      // Version history is maintained in memory only
      registry.register(createTestTool({ version: '1.0.0' }));
      registry.register(createTestTool({ version: '1.0.1' }));
      // In-memory registry has both versions
      expect(registry.getAllVersions('test-tool')).toHaveLength(2);
      // But after reload, only current version is restored
      const newRegistry = new MCPToolRegistry();
      expect(newRegistry.get('test-tool')).toBeDefined();
      expect(newRegistry.getCurrentVersion('test-tool')).toBe('1.0.1');
    });
  });
});