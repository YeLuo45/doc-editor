/**
 * CollaborativeHooks - Hooks for collaboration events
 */

import { globalHookRegistry, CollabHookEvent } from './HookRegistry';

export interface CollabHookData {
  roomId: string;
  userId: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface OperationHookData extends CollabHookData {
  operation: unknown;
  transformed?: boolean;
}

export interface SyncHookData extends CollabHookData {
  direction: 'push' | 'pull';
  syncedVersion: number;
}

export interface ConflictHookData extends CollabHookData {
  conflictType: string;
  resolution: 'local' | 'remote' | 'merged';
}

export class CollaborativeHooks {
  private registry: typeof globalHookRegistry;

  constructor(registry: typeof globalHookRegistry = globalHookRegistry) {
    this.registry = registry;
  }

  onJoin(data: CollabHookData): void {
    this.registry.fire('collab:join', data);
  }

  onLeave(data: CollabHookData): void {
    this.registry.fire('collab:leave', data);
  }

  onOperation(data: OperationHookData): void {
    this.registry.fire('collab:operation', data);
  }

  onSync(data: SyncHookData): void {
    this.registry.fire('collab:sync', data);
  }

  onConflict(data: ConflictHookData): void {
    this.registry.fire('collab:conflict', data);
  }

  onPresence(data: CollabHookData & { presence: Record<string, unknown> }): void {
    this.registry.fire('collab:presence', data);
  }

  register(
    event: CollabHookEvent,
    name: string,
    handler: (data: CollabHookData) => void,
    priority?: 'high' | 'normal' | 'low'
  ): string {
    return this.registry.register(event, name, handler, priority);
  }

  hasHandlers(event: CollabHookEvent): boolean {
    return this.registry.hasHandlers(event);
  }
}

export const collaborativeHooks = new CollaborativeHooks();