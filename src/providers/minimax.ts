// MiniMax Provider - MiniMax API integration

import { LLMProvider, LLMMessage, LLMResponse } from './factory';

class MiniMaxProvider implements LLMProvider {
  name = 'minimax';
  models = ['MiniMax-01', 'abab5.5-chat', 'abab5.5s-chat'];
  defaultModel = 'MiniMax-01';
  private apiKey: string = '';
  private baseUrl = 'https://api.minimax.chat/v1';

  async chat(messages: LLMMessage[], model?: string): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      return { content: '', error: 'MiniMax API key not configured' };
    }

    const selectedModel = model || this.defaultModel;

    try {
      const response = await fetch(`${this.baseUrl}/text/chatcompletion_v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: messages.filter((m) => m.role !== 'system'),
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { content: '', error: `MiniMax API error: ${response.status} - ${error}` };
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: '', error: `MiniMax request failed: ${message}` };
    }
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }
}

export const minimaxProvider = new MiniMaxProvider();
