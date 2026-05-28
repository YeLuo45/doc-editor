/**
 * DocumentLifecycleHooks - Hooks for document lifecycle events
 */

import { globalHookRegistry, DocumentHookEvent } from './HookRegistry';

export interface DocumentHookData {
  documentId: string;
  title?: string;
  content?: string;
  timestamp: number;
  userId?: string;
}

export class DocumentLifecycleHooks {
  private registry: typeof globalHookRegistry;

  constructor(registry: typeof globalHookRegistry = globalHookRegistry) {
    this.registry = registry;
  }

  /**
   * Fire document:create hook
   */
  onCreate(data: DocumentHookData): void {
    this.registry.fire('document:create', data);
  }

  /**
   * Fire document:open hook
   */
  onOpen(data: DocumentHookData): void {
    this.registry.fire('document:open', data);
  }

  /**
   * Fire document:close hook
   */
  onClose(data: DocumentHookData): void {
    this.registry.fire('document:close', data);
  }

  /**
   * Fire document:save hook
   */
  onSave(data: DocumentHookData): void {
    this.registry.fire('document:save', data);
  }

  /**
   * Fire document:delete hook
   */
  onDelete(data: DocumentHookData): void {
    this.registry.fire('document:delete', data);
  }

  /**
   * Fire document:rename hook
   */
  onRename(data: DocumentHookData & { oldTitle: string }): void {
    this.registry.fire('document:rename', data);
  }

  /**
   * Fire document:update hook
   */
  onUpdate(data: DocumentHookData): void {
    this.registry.fire('document:update', data);
  }

  /**
   * Register a handler for a specific event
   */
  register(
    event: DocumentHookEvent,
    name: string,
    handler: (data: DocumentHookData) => void,
    priority?: 'high' | 'normal' | 'low'
  ): string {
    return this.registry.register(event, name, handler, priority);
  }

  /**
   * Check if an event has handlers
   */
  hasHandlers(event: DocumentHookEvent): boolean {
    return this.registry.hasHandlers(event);
  }
}

export const documentLifecycleHooks = new DocumentLifecycleHooks();