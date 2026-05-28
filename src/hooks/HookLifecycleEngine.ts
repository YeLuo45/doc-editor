/**
 * HookLifecycleEngine - Core engine managing 17 lifecycle hooks
 * Handles registration, triggering, and chain execution
 */

import { HookType, TrustLevel, type HookConfig, type HookResult, type HookHistoryEntry, type ChainOptions, type HookFn } from './types';
import { HookContext } from './HookContext';
import { HookRegistry } from './HookRegistry';
import { TrustHierarchy } from './TrustHierarchy';

export class HookLifecycleEngine {
  private registry: HookRegistry;
  private trustHierarchy: TrustHierarchy;
  private history: HookHistoryEntry[];
  private static readonly MAX_HISTORY = 100;
  private static readonly STORAGE_KEY = 'doc-editor-hooks-history';

  constructor(trustHierarchy?: TrustHierarchy) {
    this.trustHierarchy = trustHierarchy || new TrustHierarchy();
    this.registry = new HookRegistry(this.trustHierarchy);
    this.history = [];
    this.loadHistory();
  }

  /**
   * Get the registry instance
   */
  public getRegistry(): HookRegistry {
    return this.registry;
  }

  /**
   * Get the trust hierarchy instance
   */
  public getTrustHierarchy(): TrustHierarchy {
    return this.trustHierarchy;
  }

  // ============ Registration Methods ============

  /**
   * Register a hook
   */
  public register(config: HookConfig): boolean {
    return this.registry.registerFromConfig(config);
  }

  /**
   * Register a before hook
   */
  public beforeCreate(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_CREATE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterCreate(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_CREATE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeUpdate(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_UPDATE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterUpdate(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_UPDATE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeDelete(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_DELETE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterDelete(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_DELETE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeRender(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_RENDER, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterRender(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_RENDER, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeSave(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_SAVE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterSave(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_SAVE, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeLoad(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_LOAD, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterLoad(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_LOAD, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeConnect(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_CONNECT, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterConnect(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_CONNECT, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public beforeDisconnect(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.BEFORE_DISCONNECT, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public afterDisconnect(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.AFTER_DISCONNECT, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  public onError(id: string, fn: (ctx: HookContext) => unknown, trustLevel?: TrustLevel, priority?: number): boolean {
    return this.register({ id, type: HookType.ON_ERROR, fn: fn as HookFn, trustLevel: trustLevel || TrustLevel.USER, priority: priority || 50, once: false });
  }

  // ============ Trigger Methods ============

  /**
   * Trigger a hook type with context
   */
  public async trigger(type: HookType, context: HookContext): Promise<HookResult> {
    const startTime = performance.now();
    const hooks = this.registry.getHooksFiltered(type, context);
    let hooksExecuted = 0;
    const results: unknown[] = [];

    for (const hook of hooks) {
      try {
        const result = await hook.fn(context);
        results.push(result);
        hooksExecuted++;
        if (hook.once) {
          this.registry.markExecuted(type, hook.id);
        }
      } catch (error) {
        // Only trigger ON_ERROR if not already in an ON_ERROR handler (prevent recursion)
        if (type !== HookType.ON_ERROR) {
          const errorCtx = HookContext.forError({ error: String(error) }, hook.trustLevel);
          await this.trigger(HookType.ON_ERROR, errorCtx);
        }
        if (context.preventDefault) break;
      }
    }

    const duration = performance.now() - startTime;
    const success = hooksExecuted > 0;

    this.addHistoryEntry({ id: context.id, type, timestamp: Date.now(), duration, success, trustLevel: context.trustLevel, result: results });

    return { success, data: results, hooksExecuted, duration };
  }

  /**
   * Trigger with chain execution (before -> main -> after pattern)
   */
  public async triggerChain(type: HookType, payload: Record<string, unknown>, _options?: ChainOptions): Promise<HookResult> {
    const beforeType = HookType.BEFORE_CREATE;
    const afterType = HookType.AFTER_CREATE;
    const context = new HookContext({ type, payload });
    const startTime = performance.now();

    const beforeResult = await this.trigger(beforeType, context);
    if (context.preventDefault) {
      return { success: false, hooksExecuted: beforeResult.hooksExecuted, duration: performance.now() - startTime };
    }

    let mainResult: HookResult = { success: true, hooksExecuted: 0, duration: 0 };
    const afterResult = await this.trigger(afterType, context);

    const totalHooks = beforeResult.hooksExecuted + mainResult.hooksExecuted + afterResult.hooksExecuted;
    return {
      success: beforeResult.success && afterResult.success,
      data: { before: beforeResult.data, after: afterResult.data },
      hooksExecuted: totalHooks,
      duration: performance.now() - startTime,
    };
  }

  // ============ Convenience Trigger Methods ============

  public async triggerCreate(payload: Record<string, unknown>): Promise<HookResult> {
    return this.triggerChain(HookType.BEFORE_CREATE, payload);
  }

  public async triggerUpdate(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_UPDATE, payload);
    const result = await this.trigger(HookType.BEFORE_UPDATE, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_UPDATE, HookContext.forAfter(HookType.AFTER_UPDATE, payload));
    }
    return result;
  }

  public async triggerDelete(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_DELETE, payload);
    const result = await this.trigger(HookType.BEFORE_DELETE, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_DELETE, HookContext.forAfter(HookType.AFTER_DELETE, payload));
    }
    return result;
  }

  public async triggerRender(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_RENDER, payload);
    const result = await this.trigger(HookType.BEFORE_RENDER, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_RENDER, HookContext.forAfter(HookType.AFTER_RENDER, payload));
    }
    return result;
  }

  public async triggerSave(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_SAVE, payload);
    const result = await this.trigger(HookType.BEFORE_SAVE, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_SAVE, HookContext.forAfter(HookType.AFTER_SAVE, payload));
    }
    return result;
  }

  public async triggerLoad(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_LOAD, payload);
    const result = await this.trigger(HookType.BEFORE_LOAD, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_LOAD, HookContext.forAfter(HookType.AFTER_LOAD, payload));
    }
    return result;
  }

  public async triggerConnect(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_CONNECT, payload);
    const result = await this.trigger(HookType.BEFORE_CONNECT, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_CONNECT, HookContext.forAfter(HookType.AFTER_CONNECT, payload));
    }
    return result;
  }

  public async triggerDisconnect(payload: Record<string, unknown>): Promise<HookResult> {
    const context = HookContext.forBefore(HookType.BEFORE_DISCONNECT, payload);
    const result = await this.trigger(HookType.BEFORE_DISCONNECT, context);
    if (!context.preventDefault) {
      await this.trigger(HookType.AFTER_DISCONNECT, HookContext.forAfter(HookType.AFTER_DISCONNECT, payload));
    }
    return result;
  }

  public async triggerError(error: unknown): Promise<HookResult> {
    const context = HookContext.forError({ error }, TrustLevel.SYSTEM);
    return this.trigger(HookType.ON_ERROR, context);
  }

  // ============ History Methods ============

  /**
   * Get execution history
   */
  public getHistory(): HookHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  /**
   * Add entry to history
   */
  private addHistoryEntry(entry: HookHistoryEntry): void {
    this.history.unshift(entry);
    if (this.history.length > HookLifecycleEngine.MAX_HISTORY) {
      this.history = this.history.slice(0, HookLifecycleEngine.MAX_HISTORY);
    }
    this.saveHistory();
  }

  /**
   * Save history to localStorage
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(HookLifecycleEngine.STORAGE_KEY, JSON.stringify(this.history));
    } catch {
      // localStorage might be unavailable
    }
  }

  /**
   * Load history from localStorage
   */
  private loadHistory(): void {
    try {
      const data = localStorage.getItem(HookLifecycleEngine.STORAGE_KEY);
      if (data) {
        this.history = JSON.parse(data);
      }
    } catch {
      this.history = [];
    }
  }

  // ============ Utility Methods ============

  /**
   * Get all registered hook types
   */
  public getRegisteredTypes(): HookType[] {
    return Object.values(HookType).filter(type => this.registry.count(type) > 0);
  }

  /**
   * Get hook statistics
   */
  public getStats(): { total: number; byType: Record<string, number>; byTrustLevel: Record<string, number> } {
    const byType: Record<string, number> = {};
    const byTrustLevel: Record<string, number> = {};

    Object.values(HookType).forEach(type => {
      byType[type] = this.registry.count(type);
    });

    Object.values(TrustLevel).forEach(level => {
      byTrustLevel[level] = this.registry.getByTrustLevel(level).length;
    });

    return { total: this.registry.totalCount(), byType, byTrustLevel };
  }

  /**
   * Unregister a hook
   */
  public unregister(id: string): boolean {
    return this.registry.unregister(id);
  }

  /**
   * Enable a hook
   */
  public enable(id: string): boolean {
    return this.registry.enable(id);
  }

  /**
   * Disable a hook
   */
  public disable(id: string): boolean {
    return this.registry.disable(id);
  }
}

export default HookLifecycleEngine;