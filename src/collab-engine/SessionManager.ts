/**
 * V57 SessionManager - Session management
 * Manages collaboration sessions with create/close/getSession/getActiveSessions
 */

export interface SessionConfig {
  maxSessions?: number;
  sessionDuration?: number;
  autoCloseOnEmpty?: boolean;
  maxParticipantsPerSession?: number;
}

export interface Session {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  participantCount: number;
  metadata?: Record<string, unknown>;
}

export interface SessionMetrics {
  totalCreated: number;
  totalClosed: number;
  activeSessions: number;
  totalParticipants: number;
  timestamp: number;
}

export class SessionManager {
  config: SessionConfig;
  private sessions: Map<string, Session> = new Map();
  private sessionCount: number = 0;
  private closeCount: number = 0;
  private participantCounts: Map<string, number> = new Map();

  constructor(config: SessionConfig = {}) {
    this.config = {
      maxSessions: config.maxSessions ?? 100,
      sessionDuration: config.sessionDuration ?? 7200000,
      autoCloseOnEmpty: config.autoCloseOnEmpty ?? true,
      maxParticipantsPerSession: config.maxParticipantsPerSession ?? 20,
    };
  }

  create(sessionId: string, name: string, createdBy: string, metadata?: Record<string, unknown>): Session | null {
    if (this.sessions.size >= (this.config.maxSessions ?? 100)) {
      return null;
    }
    if (this.sessions.has(sessionId)) {
      return null;
    }
    const session: Session = {
      id: sessionId,
      name,
      createdBy,
      createdAt: Date.now(),
      isActive: true,
      participantCount: 0,
      metadata,
    };
    this.sessions.set(sessionId, session);
    this.participantCounts.set(sessionId, 0);
    this.sessionCount++;
    return { ...session };
  }

  close(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    session.isActive = false;
    this.closeCount++;
    return true;
  }

  getSession(sessionId: string): Session | undefined {
    const s = this.sessions.get(sessionId);
    return s ? { ...s } : undefined;
  }

  getActiveSessions(): Session[] {
    const active: Session[] = [];
    this.sessions.forEach((s) => {
      if (s.isActive) {
        active.push({ ...s });
      }
    });
    return active;
  }

  addParticipant(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) {
      return false;
    }
    const count = this.participantCounts.get(sessionId) ?? 0;
    if (count >= (this.config.maxParticipantsPerSession ?? 20)) {
      return false;
    }
    this.participantCounts.set(sessionId, count + 1);
    session.participantCount = count + 1;
    return true;
  }

  removeParticipant(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    const count = this.participantCounts.get(sessionId) ?? 0;
    if (count <= 0) {
      return false;
    }
    const newCount = count - 1;
    this.participantCounts.set(sessionId, newCount);
    session.participantCount = newCount;
    if (newCount === 0 && (this.config.autoCloseOnEmpty ?? true)) {
      session.isActive = false;
    }
    return true;
  }

  deleteSession(sessionId: string): boolean {
    this.participantCounts.delete(sessionId);
    return this.sessions.delete(sessionId);
  }

  getSnapshot(): { metrics: SessionMetrics } {
    let totalParticipants = 0;
    this.participantCounts.forEach((count) => {
      totalParticipants += count;
    });
    return {
      metrics: {
        totalCreated: this.sessionCount,
        totalClosed: this.closeCount,
        activeSessions: this.sessions.size,
        totalParticipants,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this.sessions.clear();
    this.participantCounts.clear();
    this.sessionCount = 0;
    this.closeCount = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== SessionManager Report ===',
      `Total Created: ${snap.metrics.totalCreated}`,
      `Total Closed: ${snap.metrics.totalClosed}`,
      `Active Sessions: ${snap.metrics.activeSessions}`,
      `Total Participants: ${snap.metrics.totalParticipants}`,
      `Timestamp: ${new Date(snap.metrics.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'V57-SessionManager-1.0.0' };
  }
}