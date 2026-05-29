/**
 * SessionManager.ts
 * V75 Session Manager - Core session lifecycle management
 */

export interface SessionConfig {
  maxSessions: number;
  sessionTimeout: number;
  autoDestroy: boolean;
  enableHistory: boolean;
  storagePrefix: string;
}

export interface Session {
  id: string;
  createdAt: number;
  lastActiveAt: number;
  userId?: string;
  metadata: Record<string, unknown>;
}

type SessionEventHandler = (session: Session) => void;

export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private history: Session[] = [];
  private eventHandlers: Map<string, SessionEventHandler[]> = new Map();
  private metrics = {
    created: 0,
    destroyed: 0,
    errors: 0,
    activeCount: 0,
  };

  readonly config: SessionConfig = {
    maxSessions: 10,
    sessionTimeout: 3600000,
    autoDestroy: true,
    enableHistory: true,
    storagePrefix: 'sess_',
  };

  create(userId?: string, metadata: Record<string, unknown> = {}): Session {
    const now = Date.now();
    const id = `${this.config.storagePrefix}${now}_${Math.random().toString(36).slice(2, 9)}`;
    
    if (this.sessions.size >= this.config.maxSessions) {
      const oldest = this.findOldestSession();
      if (oldest) this.destroy(oldest.id);
    }

    const session: Session = {
      id,
      createdAt: now,
      lastActiveAt: now,
      userId,
      metadata,
    };

    this.sessions.set(id, session);
    this.metrics.created++;
    this.metrics.activeCount = this.sessions.size;
    this.emit('session:created', session);
    return session;
  }

  destroy(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      this.metrics.errors++;
      return false;
    }

    this.sessions.delete(id);
    if (this.config.enableHistory) {
      this.history.push({ ...session, lastActiveAt: Date.now() });
      if (this.history.length > 100) this.history.shift();
    }

    this.metrics.destroyed++;
    this.metrics.activeCount = this.sessions.size;
    this.emit('session:destroyed', session);
    return true;
  }

  getActive(): Session[] {
    return Array.from(this.sessions.values());
  }

  getActiveSession(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActiveAt = Date.now();
    }
    return session;
  }

  getHistory(): Session[] {
    return [...this.history];
  }

  getSnapshot(): { metrics: typeof this.metrics; activeCount: number; historyCount: number } {
    return {
      metrics: { ...this.metrics },
      activeCount: this.sessions.size,
      historyCount: this.history.length,
    };
  }

  reset(): void {
    this.sessions.clear();
    this.history = [];
    this.metrics = { created: 0, destroyed: 0, errors: 0, activeCount: 0 };
  }

  getReport(): string {
    return [
      '=== Session Manager Report ===',
      `Active Sessions: ${this.sessions.size}/${this.config.maxSessions}`,
      `History Size: ${this.history.length}`,
      `Metrics: created=${this.metrics.created}, destroyed=${this.metrics.destroyed}, errors=${this.metrics.errors}`,
      `Config: timeout=${this.config.sessionTimeout}ms, autoDestroy=${this.config.autoDestroy}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics } {
    return {
      version: 'V75-1.0.0',
      metrics: { ...this.metrics },
    };
  }

  on(event: string, handler: SessionEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: SessionEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit(event: string, session: Session): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(h => h(session));
    }
  }

  private findOldestSession(): string | null {
    let oldest: Session | null = null;
    for (const session of this.sessions.values()) {
      if (!oldest || session.lastActiveAt < oldest.lastActiveAt) {
        oldest = session;
      }
    }
    return oldest?.id ?? null;
  }
}