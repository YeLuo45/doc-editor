/**
 * Session.ts - V36 Iteration 6
 * Session management with create/destroy/validate/getSessions capabilities
 */

export interface SessionData {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionMetrics {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  creates: number;
  destroys: number;
  validations: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface SessionSnapshot {
  sessions: Record<string, SessionData>;
  metrics: SessionMetrics;
}

export class Session {
  private sessions: Map<string, SessionData> = new Map();
  private creates: number = 0;
  private destroys: number = 0;
  private validations: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private defaultTTL: number = 3600000; // 1 hour

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }
    this.reset();
  }

  /**
   * Create a new session
   */
  create(userId: string, initialData?: Record<string, unknown>, options?: {
    ttl?: number;
    ipAddress?: string;
    userAgent?: string;
  }): SessionData {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = Date.now();
    const ttl = options?.ttl ?? this.defaultTTL;

    const session: SessionData = {
      id,
      userId,
      data: initialData || {},
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + ttl,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    };

    this.sessions.set(id, session);
    this.creates++;

    return session;
  }

  /**
   * Destroy a session by ID
   */
  destroy(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    this.destroys++;
    return true;
  }

  /**
   * Validate a session is active and not expired
   */
  validate(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      this.cacheMisses++;
      return false;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.cacheMisses++;
      return false;
    }

    // Update last accessed time
    session.lastAccessedAt = Date.now();
    this.cacheHits++;
    this.validations++;

    return true;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastAccessedAt = Date.now();
    return session;
  }

  /**
   * Get all active sessions for a user
   */
  getSessions(userId: string): SessionData[] {
    const now = Date.now();
    const result: SessionData[] = [];

    this.sessions.forEach(session => {
      if (session.userId === userId && session.expiresAt > now) {
        result.push({ ...session });
      }
    });

    return result;
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): SessionData[] {
    const now = Date.now();
    const result: SessionData[] = [];

    this.sessions.forEach(session => {
      if (session.expiresAt > now) {
        result.push({ ...session });
      }
    });

    return result;
  }

  /**
   * Clean up expired sessions
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    this.sessions.forEach((session, id) => {
      if (session.expiresAt <= now) {
        this.sessions.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): SessionSnapshot {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    this.sessions.forEach(s => {
      if (s.expiresAt > now) {
        active++;
      } else {
        expired++;
      }
    });

    const sessionsObj: Record<string, SessionData> = {};
    this.sessions.forEach((s, id) => { sessionsObj[id] = s; });

    return {
      sessions: sessionsObj,
      metrics: {
        totalSessions: this.sessions.size,
        activeSessions: active,
        expiredSessions: expired,
        creates: this.creates,
        destroys: this.destroys,
        validations: this.validations,
        cacheHits: this.cacheHits,
        cacheMisses: this.cacheMisses,
      },
    };
  }

  /**
   * Reset all session state
   */
  reset(): void {
    this.sessions.clear();
    this.creates = 0;
    this.destroys = 0;
    this.validations = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Session Report ===',
      `Total Sessions: ${snap.metrics.totalSessions}`,
      `Active: ${snap.metrics.activeSessions}`,
      `Expired: ${snap.metrics.expiredSessions}`,
      `Creates: ${snap.metrics.creates}`,
      `Destroys: ${snap.metrics.destroys}`,
      `Validations: ${snap.metrics.validations}`,
      `Cache Hits: ${snap.metrics.cacheHits}`,
      `Cache Misses: ${snap.metrics.cacheMisses}`,
    ];

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalSessions: snap.metrics.totalSessions,
      activeSessions: snap.metrics.activeSessions,
      expiredSessions: snap.metrics.expiredSessions,
      creates: snap.metrics.creates,
      destroys: snap.metrics.destroys,
      validations: snap.metrics.validations,
      cacheHits: snap.metrics.cacheHits,
      cacheMisses: snap.metrics.cacheMisses,
    };
  }
}

export default Session;