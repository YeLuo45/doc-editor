// Researcher Agent - Information gathering, web search, and reference management

import { AgentLoop } from '../agentLoop';
import { AgentType, AgentMessage, MessageType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { messageBus } from '../messageBus';
import { toolRegistry } from '../tools/registry';
import { providerFactory } from '../../providers/factory';
import { agentStateManager } from '../state/AgentStateManager';
import { agentEventBus, Events } from '../events/AgentEventBus';

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
    agentStateManager.updateState('researcher', { status: 'working' });
    const convId = conversationId || uuidv4();
    await this.loop.start();
    return convId;
  }

  stop(): void {
    this.loop.stop();
    agentStateManager.updateState('researcher', { status: 'idle' });
  }

  // Request research
  async requestResearch(
    query: string,
    conversationId?: string
  ): Promise<SearchResult[]> {
    agentStateManager.updateState('researcher', { status: 'working', currentTask: 'request_research' });
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
    const results: SearchResult[] = [{
      title: `Research results for: ${query}`,
      url: `https://example.com/search?q=${encodeURIComponent(query)}`,
      snippet: 'Relevant information found...',
    }];
    
    // Emit research complete event
    agentEventBus.emit(Events.RESEARCHER_RESEARCH_COMPLETE, { query, results });
    agentStateManager.updateState('researcher', { status: 'completed' });
    
    return results;
  }

  // Search the web using tool
  async search(query: string): Promise<SearchResult[]> {
    const result = await toolRegistry.execute('web_search', { query });
    const data = JSON.parse(result.output || '{"results":[]}');
    return data.results || [];
  }

  // Fetch a URL using tool
  async fetchUrl(url: string): Promise<{ title: string; content: string }> {
    const result = await toolRegistry.execute('web_fetch', { url });
    return JSON.parse(result.output || '{}');
  }

  // Generate citation using tool
  async citeReference(
    title: string,
    author?: string,
    year?: string,
    url?: string
  ): Promise<string> {
    const result = await toolRegistry.execute('citation_insert', {
      citation: { title, author, year, url },
      format: 'plain',
    });
    return result.output;
  }

  // Generate content summary
  async summarizeContent(content: string): Promise<string> {
    const result = await toolRegistry.execute('content_summary', { content, format: 'short' });
    const data = JSON.parse(result.output || '{}');
    return data.summary || '';
  }

  // Get available tools for this agent
  getAvailableTools() {
    return toolRegistry.getToolsForAgent(AgentType.RESEARCHER);
  }

  // Chat with LLM provider
  async chatWithLLM(messages: { role: string; content: string }[]): Promise<string> {
    const response = await providerFactory.chat(messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    })));
    return response.content || response.error || '';
  }

  getConversationId(): string {
    return this.loop.getConversationId();
  }

  isActive(): boolean {
    return this.loop.isActive();
  }
}

export const researcherAgent = ResearcherAgent.getInstance();
