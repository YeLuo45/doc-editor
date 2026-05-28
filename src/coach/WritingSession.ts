/**
 * WritingSession.ts - Writing Session Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides start, pause, resume, complete methods
 */

export type SessionStatus = 'idle' | 'active' | 'paused' | 'completed';

export interface SessionMetrics {
  wordsWritten: number;
  charactersWritten: number;
  sentencesWritten: number;
  paragraphsWritten: number;
  timeSpentMs: number;
  averageWordsPerMinute: number;
}

export interface WritingSession {
  id: string;
  status: SessionStatus;
  startedAt: number;
  pausedAt?: number;
  resumedAt?: number;
  completedAt?: number;
  totalPauseTime: number;
  metrics: SessionMetrics;
  content: string[];
}

export interface SessionSnapshot {
  currentSession: WritingSession | null;
  totalSessions: number;
  completedSessions: number;
  totalTimeSpent: number;
  lastSessionAt: number;
}

export interface SessionReport {
  totalSessions: number;
  completedSessions: number;
  averageDuration: number;
  averageWordsPerSession: number;
  completionRate: number;
  generatedAt: number;
}

export interface SessionMetricsExport {
  totalSessions: number;
  totalWordsWritten: number;
  totalTimeSpent: number;
  averageWpm: number;
  sessionsByStatus: Record<SessionStatus, number>;
  timestamp: number;
}

export class WritingSession {
  private currentSession: WritingSession | null = null;
  private totalSessions: number = 0;
  private completedSessions: number = 0;
  private totalTimeSpent: number = 0;
  private lastSessionAt: number = 0;
  private sessionHistory: WritingSession[] = [];

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public start(initialContent?: string): WritingSession {
    if (this.currentSession && this.currentSession.status === 'active') {
      this.complete();
    }

    const now = Date.now();
    const sessionId = this.generateSessionId();

    this.currentSession = {
      id: sessionId,
      status: 'active',
      startedAt: now,
      totalPauseTime: 0,
      metrics: {
        wordsWritten: 0,
        charactersWritten: 0,
        sentencesWritten: 0,
        paragraphsWritten: 0,
        timeSpentMs: 0,
        averageWordsPerMinute: 0,
      },
      content: initialContent ? [initialContent] : [],
    };

    this.totalSessions++;
    this.lastSessionAt = now;

    return this.currentSession;
  }

  public pause(): WritingSession | null {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return null;
    }

    this.currentSession.pausedAt = Date.now();
    this.currentSession.status = 'paused';

    return this.currentSession;
  }

  public resume(): WritingSession | null {
    if (!this.currentSession || this.currentSession.status !== 'paused') {
      return null;
    }

    const pausedDuration = Date.now() - (this.currentSession.pausedAt || 0);
    this.currentSession.totalPauseTime += pausedDuration;
    this.currentSession.resumedAt = Date.now();
    this.currentSession.status = 'active';

    return this.currentSession;
  }

  public complete(): WritingSession | null {
    if (!this.currentSession) {
      return null;
    }

    const now = Date.now();
    this.currentSession.completedAt = now;
    this.currentSession.status = 'completed';

    const activeTime = now - this.currentSession.startedAt - this.currentSession.totalPauseTime;
    this.currentSession.metrics.timeSpentMs = activeTime;

    if (activeTime > 0) {
      const minutes = activeTime / 60000;
      this.currentSession.metrics.averageWordsPerMinute =
        Math.round((this.currentSession.metrics.wordsWritten / minutes) * 10) / 10;
    }

    this.totalTimeSpent += activeTime;
    this.completedSessions++;
    this.sessionHistory.push({ ...this.currentSession });

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    return completedSession;
  }

  public addContent(text: string): void {
    if (!this.currentSession || this.currentSession.status !== 'active') {
      return;
    }

    this.currentSession.content.push(text);

    const words = text.split(/\s+/).filter(w => w.length > 0);
    this.currentSession.metrics.wordsWritten += words.length;
    this.currentSession.metrics.charactersWritten += text.length;
    this.currentSession.metrics.sentencesWritten += (text.split(/[.!?]+/).filter(s => s.trim()).length);
    this.currentSession.metrics.paragraphsWritten += (text.split(/\n\n+/).filter(p => p.trim()).length);
  }

  public getCurrentSession(): WritingSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public getSessionHistory(): WritingSession[] {
    return [...this.sessionHistory];
  }

  public getSnapshot(): SessionSnapshot {
    return {
      currentSession: this.currentSession ? { ...this.currentSession } : null,
      totalSessions: this.totalSessions,
      completedSessions: this.completedSessions,
      totalTimeSpent: this.totalTimeSpent,
      lastSessionAt: this.lastSessionAt,
    };
  }

  public reset(): void {
    this.currentSession = null;
    this.totalSessions = 0;
    this.completedSessions = 0;
    this.totalTimeSpent = 0;
    this.lastSessionAt = 0;
    this.sessionHistory = [];
  }

  public getReport(): SessionReport {
    const averageDuration = this.completedSessions > 0
      ? this.totalTimeSpent / this.completedSessions
      : 0;

    const totalWords = this.sessionHistory.reduce((sum, s) => sum + s.metrics.wordsWritten, 0);
    const averageWordsPerSession = this.completedSessions > 0
      ? totalWords / this.completedSessions
      : 0;

    const completionRate = this.totalSessions > 0
      ? (this.completedSessions / this.totalSessions) * 100
      : 0;

    return {
      totalSessions: this.totalSessions,
      completedSessions: this.completedSessions,
      averageDuration: Math.round(averageDuration),
      averageWordsPerSession: Math.round(averageWordsPerSession),
      completionRate: Math.round(completionRate * 10) / 10,
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): SessionMetricsExport {
    const totalWordsWritten = this.sessionHistory.reduce(
      (sum, s) => sum + s.metrics.wordsWritten, 0
    );

    const sessionsByStatus: Record<SessionStatus, number> = {
      idle: 0,
      active: this.currentSession ? 1 : 0,
      paused: 0,
      completed: this.completedSessions,
    };

    return {
      totalSessions: this.totalSessions,
      totalWordsWritten,
      totalTimeSpent: this.totalTimeSpent,
      averageWpm: this.sessionHistory.length > 0
        ? this.sessionHistory.reduce((sum, s) => sum + s.metrics.averageWordsPerMinute, 0) /
          this.sessionHistory.length
        : 0,
      sessionsByStatus,
      timestamp: Date.now(),
    };
  }
}