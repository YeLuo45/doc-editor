// Provider Factory - LLM Provider registration and management
// Based on claude-code ProviderFactory pattern

import { AgentType } from '../types/agent';
import { claudeProvider } from './claude';
import { openaiProvider } from './openai';
import { minimaxProvider } from './minimax';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

export interface LLMProvider {
  name: string;
  models: string[];
  defaultModel: string;
  chat(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
  isAvailable(): boolean;
}

class ProviderFactoryImpl {
  private providers: Map<string, LLMProvider>;
  private defaultProvider: string;
  private static instance: ProviderFactoryImpl;

  private constructor() {
    this.providers = new Map();
    this.defaultProvider = 'claude';
    this.registerProviders();
  }

  static getInstance(): ProviderFactoryImpl {
    if (!ProviderFactoryImpl.instance) {
      ProviderFactoryImpl.instance = new ProviderFactoryImpl();
    }
    return ProviderFactoryImpl.instance;
  }

  private registerProviders(): void {
    this.register('claude', claudeProvider);
    this.register('openai', openaiProvider);
    this.register('minimax', minimaxProvider);
  }

  /**
   * Register a new provider
   */
  register(name: string, provider: LLMProvider): void {
    if (this.providers.has(name)) {
      console.warn(`Provider '${name}' is already registered. Overwriting.`);
    }
    this.providers.set(name.toLowerCase(), provider);
  }

  /**
   * Unregister a provider
   */
  unregister(name: string): boolean {
    return this.providers.delete(name.toLowerCase());
  }

  /**
   * Get a specific provider
   */
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * List all registered providers
   */
  listProviders(): { name: string; available: boolean; models: string[] }[] {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      available: provider.isAvailable(),
      models: provider.models,
    }));
  }

  /**
   * Set the default provider
   */
  setDefault(name: string): boolean {
    if (!this.providers.has(name.toLowerCase())) {
      console.error(`Provider '${name}' is not registered.`);
      return false;
    }
    this.defaultProvider = name.toLowerCase();
    return true;
  }

  /**
   * Get the default provider
   */
  getDefault(): LLMProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  /**
   * Get default provider name
   */
  getDefaultName(): string {
    return this.defaultProvider;
  }

  /**
   * Check if a provider exists
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name.toLowerCase());
  }

  /**
   * Get provider count
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Create a chat completion using the default provider
   */
  async chat(
    messages: LLMMessage[],
    model?: string,
    providerName?: string
  ): Promise<LLMResponse> {
    const provider = providerName
      ? this.providers.get(providerName.toLowerCase())
      : this.providers.get(this.defaultProvider);

    if (!provider) {
      return { content: '', error: `Provider '${providerName || this.defaultProvider}' not found` };
    }

    return provider.chat(messages, model);
  }
}

// Singleton instance
export const providerFactory = ProviderFactoryImpl.getInstance();

export { ProviderFactoryImpl };
