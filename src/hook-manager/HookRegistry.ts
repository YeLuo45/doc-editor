export type RegistryConfig = {
  maxSize?: number;
  allowDuplicates?: boolean;
  autoCleanup?: boolean;
};

export type RegistryEntry = {
  id: string;
  name: string;
  handler: Function;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
};

export type HookRegistryConfig = {
  defaultMaxSize?: number;
  enableAutoCleanup?: boolean;
  cleanupInterval?: number;
};

const defaultHookRegistryConfig: HookRegistryConfig = {
  defaultMaxSize: 200,
  enableAutoCleanup: false,
  cleanupInterval: 60000,
};

export class HookRegistry {
  public config: HookRegistryConfig;
  private entries: Map<string, RegistryEntry> = new Map();
  private byName: Map<string, string[]> = new Map();

  constructor(config: HookRegistryConfig = {}) {
    this.config = { ...defaultHookRegistryConfig, ...config };
  }

  add(entry: Omit<RegistryEntry, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `reg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newEntry: RegistryEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
    };
    if (this.config.defaultMaxSize && this.entries.size >= this.config.defaultMaxSize) {
      throw new Error(`Registry full: max ${this.config.defaultMaxSize}`);
    }
    this.entries.set(id, newEntry);
    const nameList = this.byName.get(entry.name) ?? [];
    nameList.push(id);
    this.byName.set(entry.name, nameList);
    return id;
  }

  remove(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry) return false;
    this.entries.delete(entryId);
    const nameList = this.byName.get(entry.name) ?? [];
    this.byName.set(entry.name, nameList.filter(id => id !== entryId));
    return true;
  }

  get(entryId: string): RegistryEntry | undefined {
    return this.entries.get(entryId);
  }

  getAll(name?: string): RegistryEntry[] {
    if (!name) return Array.from(this.entries.values());
    const ids = this.byName.get(name) ?? [];
    return ids.map(id => this.entries.get(id)).filter(Boolean) as RegistryEntry[];
  }

  has(entryId: string): boolean {
    return this.entries.has(entryId);
  }

  hasName(name: string): boolean {
    return this.byName.has(name);
  }

  update(entryId: string, updates: Partial<RegistryEntry>): boolean {
    const entry = this.entries.get(entryId);
    if (!entry) return false;
    const updated: RegistryEntry = { ...entry, ...updates, id: entryId, updatedAt: Date.now() };
    this.entries.set(entryId, updated);
    return true;
  }

  getSnapshot(): { entryCount: number; uniqueNames: number; oldestEntry: number | null } {
    const all = Array.from(this.entries.values());
    return {
      entryCount: this.entries.size,
      uniqueNames: this.byName.size,
      oldestEntry: all.length > 0 ? Math.min(...all.map(e => e.createdAt)) : null,
    };
  }

  reset(): void {
    this.entries.clear();
    this.byName.clear();
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      'HookRegistry Report',
      `  Total entries: ${snap.entryCount}`,
      `  Unique names: ${snap.uniqueNames}`,
      `  Oldest entry: ${snap.oldestEntry ? new Date(snap.oldestEntry).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } & ReturnType<typeof this.getSnapshot> {
    return {
      version: 'V84-HookRegistry-1.0',
      ...this.getSnapshot(),
    };
  }
}