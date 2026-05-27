/**
 * TrustHierarchy - Trust level management and permission control
 * Implements system > developer > user > guest trust hierarchy
 */

import { TrustLevel, TrustPermissions } from './types';

export class TrustHierarchy {
  private static readonly LEVEL_ORDER: TrustLevel[] = [
    TrustLevel.SYSTEM,
    TrustLevel.DEVELOPER,
    TrustLevel.USER,
    TrustLevel.GUEST,
  ];

  private static readonly STORAGE_KEY = 'doc-editor-hooks-trust-hierarchy';

  private permissionsCache: Map<TrustLevel, TrustPermissions>;

  constructor() {
    this.permissionsCache = new Map();
    this.initializePermissions();
  }

  /**
   * Initialize default permissions for each trust level
   */
  private initializePermissions(): void {
    this.permissionsCache.set(TrustLevel.SYSTEM, {
      canModify: true,
      canDelete: true,
      canPause: true,
      maxPriority: 1000,
    });

    this.permissionsCache.set(TrustLevel.DEVELOPER, {
      canModify: true,
      canDelete: true,
      canPause: true,
      maxPriority: 500,
    });

    this.permissionsCache.set(TrustLevel.USER, {
      canModify: true,
      canDelete: false,
      canPause: true,
      maxPriority: 100,
    });

    this.permissionsCache.set(TrustLevel.GUEST, {
      canModify: false,
      canDelete: false,
      canPause: false,
      maxPriority: 10,
    });
  }

  /**
   * Get the numeric order of a trust level (lower = more trusted)
   */
  public getLevelOrder(level: TrustLevel): number {
    return TrustHierarchy.LEVEL_ORDER.indexOf(level);
  }

  /**
   * Compare two trust levels (returns positive if a > b)
   */
  public compare(a: TrustLevel, b: TrustLevel): number {
    return this.getLevelOrder(a) - this.getLevelOrder(b);
  }

  /**
   * Check if levelA is more trusted than levelB
   */
  public isMoreTrusted(a: TrustLevel, b: TrustLevel): boolean {
    return this.compare(a, b) < 0;
  }

  /**
   * Check if levelA is less trusted than levelB
   */
  public isLessTrusted(a: TrustLevel, b: TrustLevel): boolean {
    return this.compare(a, b) > 0;
  }

  /**
   * Get the maximum priority allowed for a trust level
   */
  public getMaxPriority(level: TrustLevel): number {
    const perms = this.permissionsCache.get(level);
    return perms?.maxPriority ?? 0;
  }

  /**
   * Check if a priority value is allowed for a trust level
   */
  public isPriorityAllowed(level: TrustLevel, priority: number): boolean {
    return priority <= this.getMaxPriority(level);
  }

  /**
   * Clamp priority to allowed range for trust level
   */
  public clampPriority(level: TrustLevel, priority: number): number {
    const max = this.getMaxPriority(level);
    return Math.min(priority, max);
  }

  /**
   * Get permissions for a trust level
   */
  public getPermissions(level: TrustLevel): TrustPermissions {
    const cached = this.permissionsCache.get(level);
    if (cached) {
      return { ...cached };
    }
    return {
      canModify: false,
      canDelete: false,
      canPause: false,
      maxPriority: 0,
    };
  }

  /**
   * Check if a trust level can modify hooks
   */
  public canModify(level: TrustLevel): boolean {
    return this.getPermissions(level).canModify;
  }

  /**
   * Check if a trust level can delete hooks
   */
  public canDelete(level: TrustLevel): boolean {
    return this.getPermissions(level).canDelete;
  }

  /**
   * Check if a trust level can pause hooks
   */
  public canPause(level: TrustLevel): boolean {
    return this.getPermissions(level).canPause;
  }

  /**
   * Get the highest trust level from an array
   */
  public getHighest<T>(
    items: Array<{ trustLevel: TrustLevel }>,
    selector?: (item: { trustLevel: TrustLevel }) => T
  ): T | { trustLevel: TrustLevel } | undefined {
    if (items.length === 0) return undefined;
    const sorted = [...items].sort((a, b) => this.compare(a.trustLevel, b.trustLevel));
    return selector ? selector(sorted[0]) : sorted[0];
  }

  /**
   * Filter items by minimum trust level
   */
  public filterByMinimumTrust<T>(
    items: Array<{ trustLevel: TrustLevel } & T>,
    minimumLevel: TrustLevel
  ): Array<{ trustLevel: TrustLevel } & T> {
    return items.filter(item => this.compare(item.trustLevel, minimumLevel) <= 0);
  }

  /**
   * Get all trust levels sorted from highest to lowest
   */
  public getLevelsSorted(): TrustLevel[] {
    return [...TrustHierarchy.LEVEL_ORDER];
  }

  /**
   * Get trust level by name
   */
  public static fromName(name: string): TrustLevel | undefined {
    const normalized = name.toLowerCase().trim();
    return TrustHierarchy.LEVEL_ORDER.find(l => l === normalized);
  }

  /**
   * Get trust level display name
   */
  public getDisplayName(level: TrustLevel): string {
    const names: Record<TrustLevel, string> = {
      [TrustLevel.SYSTEM]: 'System',
      [TrustLevel.DEVELOPER]: 'Developer',
      [TrustLevel.USER]: 'User',
      [TrustLevel.GUEST]: 'Guest',
    };
    return names[level] || level;
  }

  /**
   * Save trust hierarchy config to localStorage
   */
  public save(): void {
    try {
      const data: Array<[TrustLevel, TrustPermissions]> = [];
      this.permissionsCache.forEach((perms, level) => {
        data.push([level, perms]);
      });
      localStorage.setItem(TrustHierarchy.STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage might be unavailable
    }
  }

  /**
   * Load trust hierarchy config from localStorage
   */
  public load(): void {
    try {
      const data = localStorage.getItem(TrustHierarchy.STORAGE_KEY);
      if (!data) return;
      const parsed: Array<[TrustLevel, TrustPermissions]> = JSON.parse(data);
      parsed.forEach(([level, perms]) => {
        this.permissionsCache.set(level, perms);
      });
    } catch {
      // localStorage might be unavailable or invalid
    }
  }

  /**
   * Reset permissions to defaults
   */
  public reset(): void {
    this.permissionsCache.clear();
    this.initializePermissions();
  }

  /**
   * Update permissions for a trust level
   */
  public updatePermissions(level: TrustLevel, perms: Partial<TrustPermissions>): void {
    const current = this.permissionsCache.get(level) || {
      canModify: false,
      canDelete: false,
      canPause: false,
      maxPriority: 0,
    };
    this.permissionsCache.set(level, { ...current, ...perms });
  }
}

export default TrustHierarchy;