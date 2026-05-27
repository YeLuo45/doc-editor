import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPProviderFactory, resetProviderFactory, STORAGE_KEY } from '../mcp/ProviderFactory';
import type { AIProvider, ProviderConfig } from '../mcp/types';

describe('MCPProviderFactory', () => {
  let factory: MCPProviderFactory;

  beforeEach(() => {
    resetProviderFactory();
    localStorage.clear();
    factory = new MCPProviderFactory();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('register', () => {
    it('should register a valid provider', () => {
      const config: ProviderConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4',
      };
      factory.register(config);
      expect(factory.hasProvider('openai')).toBe(true);
    });

    it('should throw error for invalid provider', () => {
      const config = {
        provider: 'invalid' as AIProvider,
        apiKey: 'test-key',
      };
      expect(() => factory.register(config)).toThrow(`Invalid provider: invalid`);
    });

    it('should register multiple providers', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.register({ provider: 'azure', apiKey: 'key3' });
      expect(factory.listProviders()).toHaveLength(3);
    });
  });

  describe('getProvider', () => {
    it('should return registered provider', () => {
      factory.register({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4' });
      const provider = factory.getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('openai');
      expect(provider?.apiKey).toBe('test-key');
      expect(provider?.model).toBe('gpt-4');
    });

    it('should return undefined for unregistered provider', () => {
      const provider = factory.getProvider('anthropic');
      expect(provider).toBeUndefined();
    });
  });

  describe('getCurrentProvider', () => {
    it('should return undefined when no providers registered', () => {
      expect(factory.getCurrentProvider()).toBeUndefined();
    });

    it('should return current provider after registration', () => {
      factory.register({ provider: 'openai', apiKey: 'test-key' });
      expect(factory.getCurrentProvider()).toBeDefined();
      expect(factory.getCurrentProvider()?.name).toBe('openai');
    });

    it('should return updated provider after switch', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.setCurrentProvider('anthropic');
      expect(factory.getCurrentProvider()?.name).toBe('anthropic');
    });
  });

  describe('setCurrentProvider', () => {
    it('should set current provider and persist to storage', () => {
      factory.register({ provider: 'openai', apiKey: 'test-key' });
      factory.register({ provider: 'anthropic', apiKey: 'test-key' });
      const result = factory.setCurrentProvider('anthropic');
      expect(result).toBe(true);
      expect(factory.getCurrentProviderKey()).toBe('anthropic');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('anthropic');
    });

    it('should return false for invalid provider', () => {
      const result = factory.setCurrentProvider('invalid' as AIProvider);
      expect(result).toBe(false);
    });

    it('should return false for unregistered provider', () => {
      const result = factory.setCurrentProvider('azure');
      expect(result).toBe(false);
    });
  });

  describe('getCurrentProviderKey', () => {
    it('should return default provider key when no storage', () => {
      localStorage.clear();
      const newFactory = new MCPProviderFactory();
      expect(newFactory.getCurrentProviderKey()).toBe('openai');
    });
  });

  describe('listProviders', () => {
    it('should return empty array when no providers', () => {
      expect(factory.listProviders()).toHaveLength(0);
    });

    it('should return all registered providers', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      const providers = factory.listProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toHaveLength(2);
    });
  });

  describe('hasProvider', () => {
    it('should return false for unregistered provider', () => {
      expect(factory.hasProvider('openai')).toBe(false);
    });

    it('should return true for registered provider', () => {
      factory.register({ provider: 'openai', apiKey: 'key' });
      expect(factory.hasProvider('openai')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister existing provider', () => {
      factory.register({ provider: 'openai', apiKey: 'key' });
      const result = factory.unregister('openai');
      expect(result).toBe(true);
      expect(factory.hasProvider('openai')).toBe(false);
    });

    it('should return false for non-existent provider', () => {
      const result = factory.unregister('openai');
      expect(result).toBe(false);
    });

    it('should reset to default when unregistering current provider', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.setCurrentProvider('anthropic');
      factory.unregister('anthropic');
      expect(factory.getCurrentProviderKey()).toBe('openai');
    });
  });
});