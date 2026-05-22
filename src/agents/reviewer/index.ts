// Reviewer Agent - Quality review, grammar checking, and content validation

import { AgentLoop } from '../agentLoop';
import { AgentType, AgentMessage, MessageType, ReviewResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { messageBus } from '../messageBus';
import { toolRegistry } from '../tools/registry';
import { providerFactory } from '../../providers/factory';

export class ReviewerAgent {
  private loop: AgentLoop;
  private static instance: ReviewerAgent;

  private constructor() {
    this.loop = new AgentLoop({
      type: AgentType.REVIEWER,
      systemPrompt: 'You are an expert content reviewer specializing in grammar, style, and consistency checks.',
    });
  }

  static getInstance(): ReviewerAgent {
    if (!ReviewerAgent.instance) {
      ReviewerAgent.instance = new ReviewerAgent();
    }
    return ReviewerAgent.instance;
  }

  async start(conversationId?: string): Promise<string> {
    const convId = conversationId || uuidv4();
    await this.loop.start();
    return convId;
  }

  stop(): void {
    this.loop.stop();
  }

  // Request document review
  async requestReview(
    docId: string,
    content: string,
    conversationId?: string
  ): Promise<ReviewResult> {
    const message: AgentMessage = {
      id: uuidv4(),
      sender: AgentType.MANAGER,
      receiver: AgentType.REVIEWER,
      type: MessageType.REVIEW_REQUEST,
      payload: { docId, content },
      timestamp: Date.now(),
      conversationId: conversationId || this.loop.getConversationId(),
    };

    await messageBus.publish(message);

    // In real implementation, would wait for response
    // For now, return a default review result
    return {
      score: 0.9,
      issues: [],
      suggestions: [],
    };
  }

  // Run automated review checks using tools
  async runAutomatedReview(content: string): Promise<ReviewResult> {
    const [grammarResult, styleResult, spellResult] = await Promise.all([
      toolRegistry.execute('grammar_check', { content }),
      toolRegistry.execute('style_suggest', { content }),
      toolRegistry.execute('spell_check', { content }),
    ]);

    const grammarData = JSON.parse(grammarResult.output || '{"score":1,"issues":[]}');
    const styleData = JSON.parse(styleResult.output || '{"score":1,"suggestions":[]}');
    const spellData = JSON.parse(spellResult.output || '{"score":1,"issues":[]}');

    const overallScore = (grammarData.score + styleData.score + spellData.score) / 3;

    return {
      score: overallScore,
      issues: [...(grammarData.issues || []), ...(spellData.issues || [])],
      suggestions: styleData.suggestions || [],
    };
  }

  // Generate content summary
  async summarizeContent(content: string): Promise<string> {
    const result = await toolRegistry.execute('content_summary', { content, format: 'short' });
    const data = JSON.parse(result.output || '{}');
    return data.summary || '';
  }

  // Check if review passes threshold
  passesReview(reviewResult: ReviewResult, threshold = 0.8): boolean {
    return reviewResult.score >= threshold;
  }

  // Get available tools for this agent
  getAvailableTools() {
    return toolRegistry.getToolsForAgent(AgentType.REVIEWER);
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

export const reviewerAgent = ReviewerAgent.getInstance();
