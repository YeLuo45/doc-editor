// Provider Configuration
// Defines available LLM providers and their settings

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  enabled?: boolean;
}

// Note: API keys should be set via environment variables VITE_CLAUDE_API_KEY, VITE_OPENAI_API_KEY, VITE_MINIMAX_API_KEY
// For browser builds, these are accessed via import.meta.env which requires the vite/client types reference
declare const __ENV__: Record<string, string>;

export const providerConfigs: Record<string, ProviderConfig> = {
  claude: {
    name: 'Claude',
    apiKey: '',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-sonnet-20240229',
    enabled: true,
  },
  openai: {
    name: 'OpenAI',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4-turbo-preview',
    enabled: true,
  },
  minimax: {
    name: 'MiniMax',
    apiKey: '',
    baseUrl: 'https://api.minimax.chat/v1',
    defaultModel: 'MiniMax-01',
    enabled: true,
  },
};

export function getProviderConfig(provider: string): ProviderConfig | undefined {
  return providerConfigs[provider.toLowerCase()];
}

export function isProviderEnabled(provider: string): boolean {
  const config = providerConfigs[provider.toLowerCase()];
  return config?.enabled ?? false;
}
