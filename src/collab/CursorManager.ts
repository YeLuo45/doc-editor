/**
 * Cursor position synchronization manager
 */

import { CollabChannel, CollabMessage } from './BroadcastChannel';

export class CursorManager {
  private channel: CollabChannel;
  private cursorPosition: number = 0;
  private cursorUpdateHandlers: Set<(userId: string, position: number) => void> = new Set();
  private currentUserId: string;

  constructor(channel?: CollabChannel) {
    this.channel = channel || new CollabChannel();
    this.currentUserId = this.channel.getUserId();

    this.channel.onMessage((msg: CollabMessage) => {
      if (msg.type === 'cursor_move' && msg.userId !== this.currentUserId) {
        this.cursorUpdateHandlers.forEach(handler => 
          handler(msg.userId, msg.payload.position)
        );
      }
    });
  }

  setCursorPosition(position: number): void {
    this.cursorPosition = position;
    
    const message: CollabMessage = {
      type: 'cursor_move',
      userId: this.currentUserId,
      payload: { position },
      timestamp: Date.now()
    };
    
    this.channel.broadcast(message);
  }

  getCursorPosition(): number {
    return this.cursorPosition;
  }

  onCursorUpdate(callback: (userId: string, position: number) => void): () => void {
    this.cursorUpdateHandlers.add(callback);
    return () => {
      this.cursorUpdateHandlers.delete(callback);
    };
  }

  getUserId(): string {
    return this.currentUserId;
  }
}

export default CursorManager;
