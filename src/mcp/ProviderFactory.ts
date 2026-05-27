/**
 * MCPProviderFactory - Provider Factory for AI Providers
 * Supports OpenAI/Anthropic/Azure multi-provider registration and switching
 */

import type {
  AIProvider,
  AIProviderInterface,
  ProviderConfig,
} from './types.js';
import {
  DEFAULT_PROVIDER_KEY,
  ENV_PROVIDER_KEY,
  STORAGE_PREFIX,
} from './types.js';

const STORAGE_KEY = `${STORAGE_PREFIX}provider`;

interface ProviderRegistry {
  [key: string]: AIProviderInterface;
}

export class MCPProviderFactory {
  private providers: ProviderRegistry = {};
  private currentProviderKey: AIProvider;

  constructor() {
    this.currentProviderKey = this.resolveDefaultProvider();
  }

  /**
   * Resolve default provider from environment variable or storage
   */
  private resolveDefaultProvider(): AIProvider {
    const envProvider = import.meta.env[ENV_PROVIDER_KEY] as AIProvider | undefined;
    if (envProvider && this.isValidProvider(envProvider)) {
      return envProvider;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && this.isValidProvider(stored as AIProvider)) {
      return stored as AIProvider;
    }
    return DEFAULT_PROVIDER_KEY as AIProvider;
  }

  /**
   * Validate provider key
   */
  private isValidProvider(key: string): key is AIProvider {
    return ['openai', 'anthropic', 'azure'].includes(key);
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
      this.currentProviderKey = DEFAULT_PROVIDER_KEY as AIProvider;
      localStorage.setItem(STORAGE_KEY, this.currentProviderKey);
    }
    return true;
  }
}

// Singleton instance
let factoryInstance: MCPProviderFactory | null = null;

export function getProviderFactory(): MCPProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new MCPProviderFactory();
  }
  return factoryInstance;
}

export function resetProviderFactory(): void {
  factoryInstance = null;
}

export { STORAGE_KEY, STORAGE_PREFIX, ENV_PROVIDER_KEY, DEFAULT_PROVIDER_KEY };