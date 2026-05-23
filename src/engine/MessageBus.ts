import type { AgentId, AgentMessage } from '../agents/types';

type MessageHandler = (msg: AgentMessage) => void;

export class MessageBus {
  private subscriptions: Map<AgentId, Set<MessageHandler>> = new Map();
  private messageQueue: AgentMessage[] = [];

  publish(msg: AgentMessage): void {
    this.messageQueue.push(msg);
    const handlers = this.subscriptions.get(msg.to);
    if (handlers) {
      handlers.forEach(handler => handler(msg));
    }
    if (msg.to === 'broadcast') {
      this.subscriptions.forEach((handlers) => {
        handlers.forEach(handler => handler(msg));
      });
    }
  }

  subscribe(agentId: AgentId, callback: MessageHandler): () => void {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }
    this.subscriptions.get(agentId)!.add(callback);
    return () => {
      this.subscriptions.get(agentId)?.delete(callback);
    };
  }

  request(from: AgentId, to: AgentId, payload: any): Promise<AgentMessage> {
    return new Promise((resolve) => {
      const handler = (msg: AgentMessage) => {
        if (msg.from === to && msg.type === 'response') {
          resolve(msg);
        }
      };
      this.subscribe(to, handler);
      this.publish({
        id: `msg-${Date.now()}`,
        from,
        to,
        type: 'request',
        payload,
        timestamp: Date.now(),
      });
    });
  }

  getMessages(agentId: AgentId): AgentMessage[] {
    return this.messageQueue.filter(m => m.to === agentId || m.to === 'broadcast');
  }

  clear(): void {
    this.messageQueue = [];
    this.subscriptions.clear();
  }
}
