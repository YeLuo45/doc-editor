// Agent Context - Shared context management for agent conversations

import { AgentContext, AgentMessage, DocStatus, AgentType } from './types';

interface ContextPoolItem {
  context: AgentContext;
  lastAccessed: number;
  expiresAt: number;
}

export class ContextPool {
  private pool: Map<string, ContextPoolItem>;
  private defaultTTL: number; // milliseconds

  constructor(defaultTTL = 30 * 60 * 1000) {
    // 30 minutes default TTL
    this.pool = new Map();
    this.defaultTTL = defaultTTL;
  }

  createContext(
    conversationId: string,
    docId: string,
    initialStatus: DocStatus = DocStatus.DRAFT
  ): AgentContext {
    const context: AgentContext = {
      conversationId,
      docId,
      messages: [],
      currentStatus: initialStatus,
      metadata: {},
    };

    this.pool.set(conversationId, {
      context,
      lastAccessed: Date.now(),
      expiresAt: Date.now() + this.defaultTTL,
    });

    return context;
  }

  getContext(conversationId: string): AgentContext | null {
    const item = this.pool.get(conversationId);
    if (!item) return null;

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.pool.delete(conversationId);
      return null;
    }

    // Update access time
    item.lastAccessed = Date.now();
    item.expiresAt = Date.now() + this.defaultTTL;

    return item.context;
  }

  updateContext(conversationId: string, updates: Partial<AgentContext>): boolean {
    const item = this.pool.get(conversationId);
    if (!item) return false;

    item.context = { ...item.context, ...updates };
    item.lastAccessed = Date.now();
    return true;
  }

  addMessage(conversationId: string, message: AgentMessage): boolean {
    const item = this.pool.get(conversationId);
    if (!item) return false;

    item.context.messages.push(message);
    item.lastAccessed = Date.now();
    return true;
  }

  setStatus(conversationId: string, status: DocStatus): boolean {
    const item = this.pool.get(conversationId);
    if (!item) return false;

    item.context.currentStatus = status;
    item.lastAccessed = Date.now();
    return true;
  }

  setMetadata(
    conversationId: string,
    key: string,
    value: any
  ): boolean {
    const item = this.pool.get(conversationId);
    if (!item) return false;

    item.context.metadata[key] = value;
    item.lastAccessed = Date.now();
    return true;
  }

  deleteContext(conversationId: string): boolean {
    return this.pool.delete(conversationId);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, item] of this.pool.entries()) {
      if (now > item.expiresAt) {
        this.pool.delete(id);
      }
    }
  }

  getAllContexts(): AgentContext[] {
    this.cleanup();
    return Array.from(this.pool.values()).map((item) => item.context);
  }
}

// Singleton instance
export const contextPool = new ContextPool();