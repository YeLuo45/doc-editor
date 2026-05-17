// Agent Context - Shared context management for agent conversations

import { AgentContext, AgentMessage, DocStatus, AgentType } from './types';

interface ContextPoolItem {
  context: AgentContext;
  lastAccessed: number;
  expiresAt: number;
}

const STORAGE_KEY = 'doc-editor-agent-contexts';

export class ContextPool {
  private pool: Map<string, ContextPoolItem>;
  private defaultTTL: number; // milliseconds

  constructor(defaultTTL = 30 * 60 * 1000) {
    // 30 minutes default TTL
    this.pool = new Map();
    this.defaultTTL = defaultTTL;
    this.load(); // Load persisted contexts on initialization
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
    this.save(); // Persist after mutation
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
    this.save(); // Persist after mutation
    return true;
  }

  addMessage(conversationId: string, message: AgentMessage): boolean {
    const item = this.pool.get(conversationId);
    if (!item) return false;

    item.context.messages.push(message);
    item.lastAccessed = Date.now();
    this.save(); // Persist after mutation
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

  // Persist contexts to localStorage
  private save(): void {
    try {
      const data = Array.from(this.pool.entries()).map(([id, item]) => ({
        id,
        context: item.context,
        lastAccessed: item.lastAccessed,
        expiresAt: item.expiresAt,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[ContextPool] Failed to save contexts:', e);
    }
  }

  // Load contexts from localStorage
  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as Array<{
        id: string;
        context: AgentContext;
        lastAccessed: number;
        expiresAt: number;
      }>;

      for (const item of data) {
        // Skip expired contexts
        if (Date.now() > item.expiresAt) continue;
        this.pool.set(item.id, {
          context: item.context,
          lastAccessed: item.lastAccessed,
          expiresAt: item.expiresAt,
        });
      }
    } catch (e) {
      console.warn('[ContextPool] Failed to load contexts:', e);
    }
  }
}

// Singleton instance
export const contextPool = new ContextPool();