/**
 * Document synchronization via BroadcastChannel
 */

import { CollabChannel, CollabMessage } from '../BroadcastChannel';

export class DocumentSync {
  private channel: CollabChannel;
  private updateHandlers: Set<(delta: string, position: number, userId: string) => void> = new Set();
  private currentUserId: string;

  constructor(channel?: CollabChannel) {
    this.channel = channel || new CollabChannel();
    this.currentUserId = this.channel.getUserId();

    this.channel.onMessage((msg: CollabMessage) => {
      if (msg.type === 'doc_update' && msg.userId !== this.currentUserId) {
        this.updateHandlers.forEach(handler =>
          handler(msg.payload.delta, msg.payload.position, msg.userId)
        );
      }
    });
  }

  sendUpdate(delta: string, position: number): void {
    const message: CollabMessage = {
      type: 'doc_update',
      userId: this.currentUserId,
      payload: { delta, position },
      timestamp: Date.now()
    };

    this.channel.broadcast(message);
  }

  onUpdate(callback: (delta: string, position: number, userId: string) => void): () => void {
    this.updateHandlers.add(callback);
    return () => {
      this.updateHandlers.delete(callback);
    };
  }

  getUserId(): string {
    return this.currentUserId;
  }
}

export default DocumentSync;
