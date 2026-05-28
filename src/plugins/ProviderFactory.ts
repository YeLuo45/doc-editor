/**
 * ProviderFactory - Swappable LLM Provider System
 * Supports OpenAI/Anthropic/Azure/Ollama/Local providers
 */

import type { AIProvider, ProviderConfig, AIProviderInterface } from './types.js';

const STORAGE_PREFIX = 'doc-editor-plugins-';
const ENV_PROVIDER_KEY = 'VITE_AI_PROVIDER';
const STORAGE_KEY = `${STORAGE_PREFIX}provider`;
const DEFAULT_PROVIDER_KEY: AIProvider = 'openai';

interface ProviderRegistry {
  [key: string]: AIProviderInterface;
}

export class ProviderFactory {
  private providers: ProviderRegistry = {};
  private currentProviderKey: AIProvider;

  constructor() {
    this.currentProviderKey = this.resolveDefaultProvider();
  }

  /**
   * Resolve default provider from env or storage
   */
  private resolveDefaultProvider(): AIProvider {
    const envProvider = (import.meta.env as Record<string, string>)[ENV_PROVIDER_KEY] as AIProvider | undefined;
    if (envProvider && this.isValidProvider(envProvider)) {
      return envProvider;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && this.isValidProvider(stored)) {
      return stored as AIProvider;
    }
    return DEFAULT_PROVIDER_KEY;
  }

  /**
   * Validate provider key
   */
  private isValidProvider(key: string): key is AIProvider {
    return ['openai', 'anthropic', 'azure', 'ollama', 'local'].includes(key);
  }

  /**
   * Register a new provider
   */
  register(config: ProviderConfig): void {
    if (!this.isValidProvider(config.provider)) {
      throw new Error(`Invalid provider: ${config.provider}`);
    }
    this.providers[config.provider] = {
      name: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      extra: config.extra,
    };
  }

  /**
   * Get provider by key
   */
  getProvider(key: AIProvider): AIProviderInterface | undefined {
    return this.providers[key];
  }

  /**
   * Get current provider
   */
  getCurrentProvider(): AIProviderInterface | undefined {
    return this.providers[this.currentProviderKey];
  }

  /**
   * Get current provider key
   */
  getCurrentProviderKey(): AIProvider {
    return this.currentProviderKey;
  }

  /**
   * Set active provider
   */
  setCurrentProvider(key: AIProvider): boolean {
    if (!this.isValidProvider(key)) {
      return false;
    }
    if (!this.providers[key]) {
      return false;
    }
    this.currentProviderKey = key;
    localStorage.setItem(STORAGE_KEY, key);
    return true;
  }

  /**
   * List all registered providers
   */
  listProviders(): AIProvider[] {
    return Object.keys(this.providers) as AIProvider[];
  }

  /**
   * Check if provider is registered
   */
  hasProvider(key: AIProvider): boolean {
    return key in this.providers;
  }

  /**
   * Remove a provider
   */
  unregister(key: AIProvider): boolean {
    if (!(key in this.providers)) {
      return false;
    }
    delete this.providers[key];
    if (this.currentProviderKey === key) {
      this.currentProviderKey = DEFAULT_PROVIDER_KEY;
      localStorage.setItem(STORAGE_KEY, this.currentProviderKey);
    }
    return true;
  }

  /**
   * Update provider config
   */
  updateProvider(key: AIProvider, updates: Partial<ProviderConfig>): boolean {
    const provider = this.providers[key];
    if (!provider) {
      return false;
    }
    this.providers[key] = { ...provider, ...updates };
    return true;
  }

  /**
   * Get all provider configs
   */
  getAllProviders(): AIProviderInterface[] {
    return Object.values(this.providers);
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers = {};
    this.currentProviderKey = DEFAULT_PROVIDER_KEY;
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Singleton instance
let factoryInstance: ProviderFactory | null = null;

export function getProviderFactory(): ProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new ProviderFactory();
  }
  return factoryInstance;
}

export function resetProviderFactory(): void {
  factoryInstance = null;
}

export { STORAGE_KEY, STORAGE_PREFIX, ENV_PROVIDER_KEY, DEFAULT_PROVIDER_KEY };