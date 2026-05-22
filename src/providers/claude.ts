// Claude Provider - Anthropic Claude API integration

import { LLMProvider, LLMMessage, LLMResponse } from './factory';

class ClaudeProvider implements LLMProvider {
  name = 'claude';
  models = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  defaultModel = 'claude-3-sonnet-20240229';
  private apiKey: string = '';
  private baseUrl = 'https://api.anthropic.com/v1';

  async chat(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { content: '', error: 'Claude API key not configured' };
    }

    const selectedModel = model || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 1024,
          messages: messages.map((m) => ({
            role: m.role === 'system' ? 'user' : m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { content: '', error: `Claude API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return {
        content: data.content?.[0]?.text || '',
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: '', error: `Claude request failed: ${message}` };
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }
}

export const claudeProvider = new ClaudeProvider();
