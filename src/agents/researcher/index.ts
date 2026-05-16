// Researcher Agent - Information gathering, web search, and reference management

import { AgentLoop } from '../agentLoop';
import { AgentType, AgentMessage, MessageType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { messageBus } from '../messageBus';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class ResearcherAgent {
  private loop: AgentLoop;
  private static instance: ResearcherAgent;

  private constructor() {
    this.loop = new AgentLoop({
      type: AgentType.RESEARCHER,
      systemPrompt: 'You are an expert researcher specializing in information gathering and reference management.',
    });
  }

  static getInstance(): ResearcherAgent {
    if (!ResearcherAgent.instance) {
      ResearcherAgent.instance = new ResearcherAgent();
    }
    return ResearcherAgent.instance;
  }

  async start(conversationId?: string): Promise<string> {
    const convId = conversationId || uuidv4();
    await this.loop.start();
    return convId;
  }

  stop(): void {
    this.loop.stop();
  }

  // Request research
  async requestResearch(
    query: string,
    conversationId?: string
  ): Promise<SearchResult[]> {
    const message: AgentMessage = {
      id: uuidv4(),
      sender: AgentType.MANAGER,
      receiver: AgentType.RESEARCHER,
      type: MessageType.RESEARCH_REQUEST,
      payload: { query, action: 'search' },
      timestamp: Date.now(),
      conversationId: conversationId || this.loop.getConversationId(),
    };

    await messageBus.publish(message);

    // Return simulated results
    return [{
      title: `Research results for: ${query}`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}`,
      snippet: 'Relevant information found...',
    }];
  }

  // Search the web
  async search(query: string): Promise<SearchResult[]> {
    const { toolRegistry } = await import('../../tools/registry');
    const result = await toolRegistry.execute('web_search', { query });
    return JSON.parse(result.output || '[]');
  }

  // Fetch a URL
  async fetchUrl(url: string): Promise<{ title: string; content: string }> {
    const { toolRegistry } = await import('../../tools/registry');
    const result = await toolRegistry.execute('web_fetch', { url });
    return JSON.parse(result.output || '{}');
  }

  // Generate citation
  async citeReference(title: string, author?: string, year?: string, url?: string): Promise<string> {
    const { toolRegistry } = await import('../../tools/registry');
    const result = await toolRegistry.execute('cite_reference', { title, author, year, url });
    return result.output;
  }

  getConversationId(): string {
    return this.loop.getConversationId();
  }

  isActive(): boolean {
    return this.loop.isActive();
  }
}

export const researcherAgent = ResearcherAgent.getInstance();