// Editor Agent - Content editing, formatting, and document manipulation

import { AgentLoop } from '../agentLoop';
import { AgentType, AgentMessage, MessageType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { messageBus } from '../messageBus';
import { toolRegistry } from '../tools/registry';
import { providerFactory } from '../../providers/factory';

export class EditorAgent {
  private loop: AgentLoop;
  private static instance: EditorAgent;

  private constructor() {
    this.loop = new AgentLoop({
      type: AgentType.EDITOR,
      systemPrompt: 'You are an expert content editor specializing in document formatting and writing quality.',
    });
  }

  static getInstance(): EditorAgent {
    if (!EditorAgent.instance) {
      EditorAgent.instance = new EditorAgent();
    }
    return EditorAgent.instance;
  }

  async start(conversationId?: string): Promise<string> {
    const convId = conversationId || uuidv4();
    await this.loop.start();
    return convId;
  }

  stop(): void {
    this.loop.stop();
  }

  // Request document edit
  async requestEdit(
    docId: string,
    content: string,
    instruction: string,
    conversationId?: string
  ): Promise<any> {
    const message: AgentMessage = {
      id: uuidv4(),
      sender: AgentType.MANAGER,
      receiver: AgentType.EDITOR,
      type: MessageType.EDIT_REQUEST,
      payload: { docId, content, instruction },
      timestamp: Date.now(),
      conversationId: conversationId || this.loop.getConversationId(),
    };

    await messageBus.publish(message);

    // Wait for response (simplified - in real implementation would use callback)
    return { success: true, message: 'Edit request submitted' };
  }

  // Format document using tool
  async formatDocument(docId: string, content: string): Promise<string> {
    const result = await toolRegistry.execute('text_format', { content });
    if (result.success) {
      // Save formatted content via provider if needed
      await toolRegistry.execute('doc_export', { content: result.output, format: 'html' });
    }
    return result.output || content;
  }

  // Export document
  async exportDocument(content: string, format: string): Promise<string> {
    const result = await toolRegistry.execute('doc_export', { content, format });
    return result.output || content;
  }

  // Get available tools for this agent
  getAvailableTools() {
    return toolRegistry.getToolsForAgent(AgentType.EDITOR);
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

export const editorAgent = EditorAgent.getInstance();
