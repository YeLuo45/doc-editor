/**
 * ProviderFactory Tests
 * Testing LLM provider registration, switching and management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderFactory, getProviderFactory, resetProviderFactory } from '../plugins/ProviderFactory';
import type { AIProvider, ProviderConfig } from '../plugins/types';

describe('ProviderFactory', () => {
  let factory: ProviderFactory;

  beforeEach(() => {
    resetProviderFactory();
    localStorage.clear();
    factory = new ProviderFactory();
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

    it('should register openai provider', () => {
      factory.register({ provider: 'openai', apiKey: 'sk-openai' });
      expect(factory.hasProvider('openai')).toBe(true);
    });

    it('should register anthropic provider', () => {
      factory.register({ provider: 'anthropic', apiKey: 'sk-ant' });
      expect(factory.hasProvider('anthropic')).toBe(true);
    });

    it('should register azure provider', () => {
      factory.register({ provider: 'azure', apiKey: 'azure-key' });
      expect(factory.hasProvider('azure')).toBe(true);
    });

    it('should register ollama provider', () => {
      factory.register({ provider: 'ollama', apiKey: 'ollama-key', baseUrl: 'http://localhost:11434' });
      expect(factory.hasProvider('ollama')).toBe(true);
    });

    it('should register local provider', () => {
      factory.register({ provider: 'local', apiKey: 'local-key', baseUrl: 'http://localhost:8080' });
      expect(factory.hasProvider('local')).toBe(true);
    });

    it('should throw error for invalid provider', () => {
      const config = { provider: 'invalid' as AIProvider, apiKey: 'test-key' };
      expect(() => factory.register(config)).toThrow('Invalid provider: invalid');
    });

    it('should register multiple providers', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.register({ provider: 'azure', apiKey: 'key3' });
      expect(factory.listProviders()).toHaveLength(3);
    });

    it('should store provider with extra config', () => {
      const config: ProviderConfig = {
        provider: 'openai',
        apiKey: 'key1',
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4-turbo',
        extra: { organization: 'org-123', project: 'test' },
      };
      factory.register(config);
      const provider = factory.getProvider('openai');
      expect(provider?.extra).toEqual({ organization: 'org-123', project: 'test' });
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

    it('should return full provider config', () => {
      factory.register({
        provider: 'anthropic',
        apiKey: 'sk-ant',
        baseUrl: 'https://api.anthropic.com',
        model: 'claude-3-opus',
      });
      const provider = factory.getProvider('anthropic');
      expect(provider?.baseUrl).toBe('https://api.anthropic.com');
      expect(provider?.model).toBe('claude-3-opus');
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

  describe('getCurrentProviderKey', () => {
    it('should return default provider key when no storage', () => {
      localStorage.clear();
      const newFactory = new ProviderFactory();
      expect(newFactory.getCurrentProviderKey()).toBe('openai');
    });

    it('should return stored provider key', () => {
      localStorage.setItem('doc-editor-plugins-provider', 'anthropic');
      const newFactory = new ProviderFactory();
      expect(newFactory.getCurrentProviderKey()).toBe('anthropic');
    });
  });

  describe('setCurrentProvider', () => {
    it('should set current provider and persist to storage', () => {
      factory.register({ provider: 'openai', apiKey: 'test-key' });
      factory.register({ provider: 'anthropic', apiKey: 'test-key' });
      const result = factory.setCurrentProvider('anthropic');
      expect(result).toBe(true);
      expect(factory.getCurrentProviderKey()).toBe('anthropic');
      expect(localStorage.getItem('doc-editor-plugins-provider')).toBe('anthropic');
    });

    it('should return false for invalid provider', () => {
      const result = factory.setCurrentProvider('invalid' as AIProvider);
      expect(result).toBe(false);
    });

    it('should return false for unregistered provider', () => {
      const result = factory.setCurrentProvider('azure');
      expect(result).toBe(false);
    });

    it('should not switch if provider not registered', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.setCurrentProvider('ollama');
      expect(factory.getCurrentProviderKey()).not.toBe('ollama');
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

  describe('updateProvider', () => {
    it('should update existing provider', () => {
      factory.register({ provider: 'openai', apiKey: 'old-key', model: 'gpt-3.5' });
      factory.updateProvider('openai', { apiKey: 'new-key', model: 'gpt-4' });
      const provider = factory.getProvider('openai');
      expect(provider?.apiKey).toBe('new-key');
      expect(provider?.model).toBe('gpt-4');
    });

    it('should return false for non-existent provider', () => {
      const result = factory.updateProvider('unknown' as AIProvider, { apiKey: 'key' });
      expect(result).toBe(false);
    });
  });

  describe('getAllProviders', () => {
    it('should return all provider configs', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      const all = factory.getAllProviders();
      expect(all).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all providers', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.clear();
      expect(factory.listProviders()).toHaveLength(0);
    });

    it('should reset to default provider', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.setCurrentProvider('openai');
      factory.clear();
      expect(factory.getCurrentProviderKey()).toBe('openai');
    });
  });

  describe('singleton', () => {
    it('should return same instance from getProviderFactory', () => {
      const instance1 = getProviderFactory();
      const instance2 = getProviderFactory();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getProviderFactory();
      resetProviderFactory();
      const instance2 = getProviderFactory();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('provider switching', () => {
    it('should switch between all supported providers', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.register({ provider: 'azure', apiKey: 'key3' });

      factory.setCurrentProvider('azure');
      expect(factory.getCurrentProviderKey()).toBe('azure');

      factory.setCurrentProvider('anthropic');
      expect(factory.getCurrentProviderKey()).toBe('anthropic');

      factory.setCurrentProvider('openai');
      expect(factory.getCurrentProviderKey()).toBe('openai');
    });

    it('should persist provider choice', () => {
      factory.register({ provider: 'openai', apiKey: 'key1' });
      factory.register({ provider: 'anthropic', apiKey: 'key2' });
      factory.setCurrentProvider('anthropic');

      // Simulate page reload
      const newFactory = new ProviderFactory();
      expect(newFactory.getCurrentProviderKey()).toBe('anthropic');
    });
  });
});