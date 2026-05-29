/**
 * SessionStorage.ts
 * V75 Session Manager - Persistent session storage
 */

export interface StorageConfig {
  storageType: 'memory' | 'localStorage' | 'sessionStorage';
  encryptionEnabled: boolean;
  maxSize: number;
  ttl: number;
  namespace: string;
}

interface StoredSession {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
}

type StorageEventHandler = (key: string, value?: unknown) => void;

export class SessionStorage {
  private store: Map<string, StoredSession> = new Map();
  private eventHandlers: Map<string, StorageEventHandler[]> = new Map();
  private metrics = {
    stores: 0,
    retrieves: 0,
    deletions: 0,
    clears: 0,
    hits: 0,
    misses: 0,
  };

  readonly config: StorageConfig = {
    storageType: 'memory',
    encryptionEnabled: false,
    maxSize: 100,
    ttl: 86400000,
    namespace: 'session_storage',
  };

  setItem(key: string, data: Record<string, unknown>, ttl?: number): boolean {
    try {
      const now = Date.now();
      const session: StoredSession = {
        id: key,
        data,
        createdAt: now,
        expiresAt: now + (ttl ?? this.config.ttl),
      };

      if (this.store.size >= this.config.maxSize) {
        this.evictOldest();
      }

      this.store.set(key, session);
      this.metrics.stores++;
      this.emit('storage:stored', key, data);
      return true;
    } catch {
      return false;
    }
  }

  retrieve(key: string): Record<string, unknown> | null {
    const session = this.store.get(key);
    if (!session) {
      this.metrics.misses++;
      this.metrics.retrieves++;
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.store.delete(key);
      this.metrics.misses++;
      this.metrics.retrieves++;
      return null;
    }

    this.metrics.hits++;
    this.metrics.retrieves++;
    this.emit('storage:retrieved', key, session.data);
    return session.data;
  }

  delete(key: string): boolean {
    const existed = this.store.has(key);
    if (existed) {
      this.store.delete(key);
      this.metrics.deletions++;
      this.emit('storage:deleted', key);
      return true;
    }
    return false;
  }

  clear(): void {
    this.store.clear();
    this.metrics.clears++;
    this.emit('storage:cleared', '*');
  }

  has(key: string): boolean {
    const session = this.store.get(key);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  getSnapshot(): { metrics: typeof this.metrics; size: number } {
    return {
      metrics: { ...this.metrics },
      size: this.store.size,
    };
  }

  reset(): void {
    this.store.clear();
    this.metrics = { stores: 0, retrieves: 0, deletions: 0, clears: 0, hits: 0, misses: 0 };
  }

  getReport(): string {
    return [
      '=== Session Storage Report ===',
      `Stored Items: ${this.store.size}/${this.config.maxSize}`,
      `Config: ttl=${this.config.ttl}ms, encryption=${this.config.encryptionEnabled}`,
      `Metrics: stores=${this.metrics.stores}, retrieves=${this.metrics.retrieves}, hits=${this.metrics.hits}, misses=${this.metrics.misses}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics } {
    return {
      version: 'V75-1.0.0',
      metrics: { ...this.metrics },
    };
  }

  on(event: string, handler: StorageEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: StorageEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit(event: string, key: string, value?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(h => h(key, value));
    }
  }

  private evictOldest(): void {
    let oldest: StoredSession | null = null;
    for (const session of this.store.values()) {
      if (!oldest || session.createdAt < oldest.createdAt) {
        oldest = session;
      }
    }
    if (oldest) {
      this.store.delete(oldest.id);
    }
  }
}