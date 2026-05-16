// AgentLoop - Session management and context building for agent conversations

import { v4 as uuidv4 } from 'uuid';
import { AgentType, AgentMessage, MessageType, AgentContext, DocStatus } from './types';
import { messageBus } from './messageBus';
import { contextPool } from './context';
import { toolRegistry } from '../tools/registry';

export interface AgentConfig {
  type: AgentType;
  systemPrompt?: string;
  autoApprove?: boolean;
}

export class AgentLoop {
  private agentConfig: AgentConfig;
  private conversationId: string;
  private isRunning: boolean;
  private messageHandler: ((msg: AgentMessage) => Promise<void>) | null;

  constructor(config: AgentConfig) {
    this.agentConfig = config;
    this.conversationId = uuidv4();
    this.isRunning = false;
    this.messageHandler = null;
  }

  async start(): Promise<string> {
    this.isRunning = true;

    // Subscribe to messages
    messageBus.subscribe(this.agentConfig.type, this.handleMessage.bind(this));

    return this.conversationId;
  }

  stop(): void {
    this.isRunning = false;
    messageBus.unsubscribe(this.agentConfig.type, this.handleMessage.bind(this));
  }

  private async handleMessage(message: AgentMessage): Promise<void> {
    if (!this.isRunning) return;

    // Add to context pool
    contextPool.addMessage(this.conversationId, message);

    // Process the message based on type
    try {
      switch (message.type) {
        case MessageType.EDIT_REQUEST:
          await this.handleEditRequest(message);
          break;
        case MessageType.REVIEW_REQUEST:
          await this.handleReviewRequest(message);
          break;
        case MessageType.RESEARCH_REQUEST:
          await this.handleResearchRequest(message);
          break;
        case MessageType.ORCHESTRATE:
          await this.handleOrchestration(message);
          break;
        case MessageType.APPROVAL_REQUEST:
          await this.handleApprovalRequest(message);
          break;
        default:
          console.log(`[AgentLoop:${this.agentConfig.type}] Unhandled message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`[AgentLoop:${this.agentConfig.type}] Error handling message:`, error);
      await this.sendErrorResponse(message, String(error));
    }
  }

  private async handleEditRequest(message: AgentMessage): Promise<void> {
    const { content, docId, action } = message.payload || {};

    // Use tools to perform edit
    if (action === 'format') {
      const result = await toolRegistry.execute('format_doc', { content });
      await this.sendResponse(message, { success: result.success, output: result.output });
    } else {
      // Default: just acknowledge
      await this.sendResponse(message, { success: true, output: 'Edit request processed' });
    }
  }

  private async handleReviewRequest(message: AgentMessage): Promise<void> {
    const { content } = message.payload || {};

    // Run review tools
    const [grammarResult, styleResult, consistencyResult] = await Promise.all([
      toolRegistry.execute('grammar_check', { content }),
      toolRegistry.execute('style_check', { content }),
      toolRegistry.execute('consistency_check', { content }),
    ]);

    // Calculate overall score
    const grammarScore = JSON.parse(grammarResult.output || '{"score":1}').score || 1;
    const styleScore = JSON.parse(styleResult.output || '{"score":1}').score || 1;
    const consistencyScore = JSON.parse(consistencyResult.output || '{"score":1}').score || 1;
    const overallScore = (grammarScore + styleScore + consistencyScore) / 3;

    const reviewResult = {
      score: overallScore,
      grammar: JSON.parse(grammarResult.output || '{}'),
      style: JSON.parse(styleResult.output || '{}'),
      consistency: JSON.parse(consistencyResult.output || '{}'),
      passed: overallScore >= 0.8,
    };

    await this.sendResponse(message, reviewResult);
  }

  private async handleResearchRequest(message: AgentMessage): Promise<void> {
    const { query, action } = message.payload || {};

    if (action === 'search') {
      const result = await toolRegistry.execute('web_search', { query });
      await this.sendResponse(message, { success: result.success, output: JSON.parse(result.output || '[]') });
    } else if (action === 'fetch') {
      const { url } = message.payload || {};
      const result = await toolRegistry.execute('web_fetch', { url });
      await this.sendResponse(message, { success: result.success, output: JSON.parse(result.output || '{}') });
    } else {
      await this.sendResponse(message, { success: true, output: 'Research request processed' });
    }
  }

  private async handleOrchestration(message: AgentMessage): Promise<void> {
    // Manager agent handles orchestration
    await this.sendResponse(message, { success: true, output: 'Orchestration handled' });
  }

  private async handleApprovalRequest(message: AgentMessage): Promise<void> {
    const { score, requiresApproval } = message.payload || {};

    // Auto-approve if score >= 0.8 or requiresApproval is false
    const autoApprove = !requiresApproval || score >= 0.8;

    if (autoApprove) {
      await this.sendResponse(message, { approved: true, autoApproved: true });
    } else {
      await this.sendResponse(message, { approved: false, autoApproved: false, reason: 'Requires manual approval' });
    }
  }

  private async sendResponse(originalMessage: AgentMessage, payload: any): Promise<void> {
    const response: AgentMessage = {
      id: uuidv4(),
      sender: this.agentConfig.type,
      receiver: originalMessage.sender,
      type: MessageType.APPROVAL_RESPONSE,
      payload,
      timestamp: Date.now(),
      conversationId: this.conversationId,
      parentId: originalMessage.id,
    };

    await messageBus.publish(response);
  }

  private async sendErrorResponse(originalMessage: AgentMessage, error: string): Promise<void> {
    const response: AgentMessage = {
      id: uuidv4(),
      sender: this.agentConfig.type,
      receiver: originalMessage.sender,
      type: MessageType.ERROR,
      payload: { error },
      timestamp: Date.now(),
      conversationId: this.conversationId,
      parentId: originalMessage.id,
    };

    await messageBus.publish(response);
  }

  // Send a message to another agent or broadcast
  async send(
    receiver: AgentType | 'broadcast',
    type: MessageType,
    payload: any,
    options?: { requiresApproval?: boolean }
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: uuidv4(),
      sender: this.agentConfig.type,
      receiver,
      type,
      payload,
      timestamp: Date.now(),
      conversationId: this.conversationId,
      requiresApproval: options?.requiresApproval,
    };

    await messageBus.publish(message);
    return message;
  }

  getConversationId(): string {
    return this.conversationId;
  }

  getContext(): AgentContext | null {
    return contextPool.getContext(this.conversationId);
  }

  isActive(): boolean {
    return this.isRunning;
  }
}