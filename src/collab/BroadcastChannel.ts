/**
 * BroadcastChannel API wrapper for real-time collaboration
 */

export interface CollabMessage {
  type: 'cursor_move' | 'doc_update' | 'user_join' | 'user_leave';
  userId: string;
  payload: any;
  timestamp: number;
}

export class CollabChannel {
  private channel: globalThis.BroadcastChannel;
  private userId: string;
  private messageHandlers: Set<(msg: CollabMessage) => void> = new Set();

  constructor(channelName: string = 'doc-editor-collab') {
    this.channel = new globalThis.BroadcastChannel(channelName);
    this.userId = this.generateUserId();
    
    this.channel.onmessage = (event: MessageEvent<CollabMessage>) => {
      this.messageHandlers.forEach(handler => handler(event.data));
    };
  }

  private generateUserId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 11);
  }

  getUserId(): string {
    return this.userId;
  }

  broadcast(message: CollabMessage): void {
    this.channel.postMessage(message);
  }

  onMessage(callback: (msg: CollabMessage) => void): () => void {
    this.messageHandlers.add(callback);
    return () => {
      this.messageHandlers.delete(callback);
    };
  }

  close(): void {
    this.channel.close();
    this.messageHandlers.clear();
  }
}

export default CollabChannel;
