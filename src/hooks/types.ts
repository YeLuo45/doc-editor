/**
 * Hook Lifecycle Engine - Core Type Definitions
 * 17 lifecycle hooks organized by category
 */

/** 17 Lifecycle Hook Types */
export const enum HookType {
  // Creation hooks
  BEFORE_CREATE = 'beforeCreate',
  AFTER_CREATE = 'afterCreate',
  // Update hooks
  BEFORE_UPDATE = 'beforeUpdate',
  AFTER_UPDATE = 'afterUpdate',
  // Delete hooks
  BEFORE_DELETE = 'beforeDelete',
  AFTER_DELETE = 'afterDelete',
  // Render hooks
  BEFORE_RENDER = 'beforeRender',
  AFTER_RENDER = 'afterRender',
  // Save hooks
  BEFORE_SAVE = 'beforeSave',
  AFTER_SAVE = 'afterSave',
  // Load hooks
  BEFORE_LOAD = 'beforeLoad',
  AFTER_LOAD = 'afterLoad',
  // Connect hooks
  BEFORE_CONNECT = 'beforeConnect',
  AFTER_CONNECT = 'afterConnect',
  // Disconnect hooks
  BEFORE_DISCONNECT = 'beforeDisconnect',
  AFTER_DISCONNECT = 'afterDisconnect',
  // Error hook
  ON_ERROR = 'onError',
}

/** Trust Hierarchy Levels */
export enum TrustLevel {
  SYSTEM = 'system',      // Highest trust - core engine hooks
  DEVELOPER = 'developer', // Developer-added hooks
  USER = 'user',          // User-defined hooks
  GUEST = 'guest',        // Lowest trust - untrusted code
}

/** Hook execution phases */
export enum HookPhase {
  BEFORE = 'before',
  AFTER = 'after',
  ERROR = 'error',
}

/** Hook execution result */
export interface HookResult {
  success: boolean;
  data?: unknown;
  error?: string;
  hooksExecuted: number;
  duration: number;
}

/** Hook execution metadata */
export interface HookMetadata {
  hookType: HookType;
  phase: HookPhase;
  trustLevel: TrustLevel;
  timestamp: number;
  duration?: number;
  success?: boolean;
}

/** Hook function signature */
export type HookFn<T = unknown> = (context: HookContext) => Promise<T> | T;

/** Hook configuration */
export interface HookConfig {
  id: string;
  type: HookType;
  fn: HookFn;
  trustLevel: TrustLevel;
  priority: number;
  once: boolean;
  condition?: (context: HookContext) => boolean;
  enabled?: boolean;
}

/** Hook execution context */
export interface HookContextPayload {
  [key: string]: unknown;
}

/** Hook execution context */
export interface HookContext {
  id: string;
  type: HookType;
  payload: HookContextPayload;
  metadata: HookMetadata;
  trustLevel: TrustLevel;
  chain: HookFn[];
  preventDefault?: boolean;
}

/** Hook registry entry */
export interface HookRegistryEntry extends HookConfig {
  executed: boolean;
  lastExecutedAt?: number;
}

/** Trust hierarchy permissions */
export interface TrustPermissions {
  canModify: boolean;
  canDelete: boolean;
  canPause: boolean;
  maxPriority: number;
}

/** Chain execution options */
export interface ChainOptions {
  stopOnError?: boolean;
  continueOnError?: boolean;
  timeout?: number;
}

/** Hook history entry */
export interface HookHistoryEntry {
  id: string;
  type: HookType;
  timestamp: number;
  duration: number;
  success: boolean;
  trustLevel: TrustLevel;
  result?: unknown;
}