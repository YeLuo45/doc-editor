/**
 * HookContext - Execution context for hook lifecycle
 * Provides payload, metadata, and trust level for hook execution
 */

import { HookType, TrustLevel, HookPhase, type HookContextPayload, type HookMetadata } from './types';

export class HookContext {
  public readonly id: string;
  public readonly type: HookType;
  public readonly payload: HookContextPayload;
  public readonly metadata: HookMetadata;
  public readonly trustLevel: TrustLevel;
  public chain: Array<() => unknown>;
  public preventDefault: boolean;

  private static STORAGE_KEY_PREFIX = 'doc-editor-hooks-context-';

  constructor(params: {
    id?: string;
    type: HookType;
    payload?: HookContextPayload;
    trustLevel?: TrustLevel;
    chain?: Array<() => unknown>;
    preventDefault?: boolean;
  }) {
    this.id = params.id || HookContext.generateId();
    this.type = params.type;
    this.payload = params.payload || {};
    this.trustLevel = params.trustLevel || TrustLevel.USER;
    this.chain = params.chain || [];
    this.preventDefault = params.preventDefault || false;

    this.metadata = {
      hookType: params.type,
      phase: HookContext.inferPhase(params.type),
      trustLevel: this.trustLevel,
      timestamp: Date.now(),
    };
  }

  private static inferPhase(type: HookType): HookPhase {
    if (type === HookType.ON_ERROR) {
      return HookPhase.ERROR;
    }
    if (type.startsWith('before')) {
      return HookPhase.BEFORE;
    }
    return HookPhase.AFTER;
  }

  private static generateId(): string {
    return `hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new context for a before hook
   */
  public static forBefore<T extends HookType>(
    type: T,
    payload?: HookContextPayload,
    trustLevel?: TrustLevel
  ): HookContext {
    return new HookContext({
      type,
      payload,
      trustLevel,
    });
  }

  /**
   * Create a new context for an after hook
   */
  public static forAfter<T extends HookType>(
    type: T,
    payload?: HookContextPayload,
    trustLevel?: TrustLevel
  ): HookContext {
    return new HookContext({
      type,
      payload,
      trustLevel,
    });
  }

  /**
   * Create a new context for an error hook
   */
  public static forError(
    payload?: HookContextPayload,
    trustLevel?: TrustLevel
  ): HookContext {
    return new HookContext({
      type: HookType.ON_ERROR,
      payload,
      trustLevel,
    });
  }

  /**
   * Set value in payload
   */
  public set<T = unknown>(key: string, value: T): void {
    this.payload[key] = value;
  }

  /**
   * Get value from payload
   */
  public get<T = unknown>(key: string): T | undefined {
    return this.payload[key] as T | undefined;
  }

  /**
   * Get all payload keys
   */
  public keys(): string[] {
    return Object.keys(this.payload);
  }

  /**
   * Check if payload has key
   */
  public has(key: string): boolean {
    return key in this.payload;
  }

  /**
   * Merge additional data into payload
   */
  public merge(data: HookContextPayload): void {
    Object.assign(this.payload, data);
  }

  /**
   * Mark to prevent default behavior
   */
  public doPreventDefault(): void {
    this.preventDefault = true;
  }

  /**
   * Add to execution chain
   */
  public addToChain(fn: () => unknown): void {
    this.chain.push(fn);
  }

  /**
   * Update metadata with execution info
   */
  public updateMetadata(updates: Partial<HookMetadata>): void {
    Object.assign(this.metadata, updates);
  }

  /**
   * Get storage key for this context
   */
  public getStorageKey(): string {
    return `${HookContext.STORAGE_KEY_PREFIX}${this.id}`;
  }

  /**
   * Save context to localStorage
   */
  public save(): void {
    try {
      const data = {
        id: this.id,
        type: this.type,
        payload: this.payload,
        metadata: this.metadata,
        trustLevel: this.trustLevel,
      };
      localStorage.setItem(this.getStorageKey(), JSON.stringify(data));
    } catch {
      // localStorage might be unavailable
    }
  }

  /**
   * Load context from localStorage
   */
  public static load(id: string): HookContext | null {
    try {
      const key = `${HookContext.STORAGE_KEY_PREFIX}${id}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      const parsed = JSON.parse(data);
      return new HookContext({
        id: parsed.id,
        type: parsed.type,
        payload: parsed.payload,
        trustLevel: parsed.trustLevel,
      });
    } catch {
      return null;
    }
  }

  /**
   * Clear all stored contexts
   */
  public static clearAll(): void {
    try {
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith(HookContext.STORAGE_KEY_PREFIX)
      );
      keys.forEach(k => localStorage.removeItem(k));
    } catch {
      // localStorage might be unavailable
    }
  }

  /**
   * Clone the context
   */
  public clone(): HookContext {
    return new HookContext({
      id: this.id,
      type: this.type,
      payload: { ...this.payload },
      trustLevel: this.trustLevel,
      chain: [...this.chain],
      preventDefault: this.preventDefault,
    });
  }
}

export default HookContext;