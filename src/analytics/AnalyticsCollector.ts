/**
 * V67 Analytics Engine - AnalyticsCollector
 * Collects and tracks analytics events for doc-editor
 */

export type AnalyticsConfig = {
  appId: string;
  sessionTimeout: number;
  enableLogging: boolean;
  batchSize: number;
  flushInterval: number;
};

export type AnalyticsEvent = {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
  sessionId: string;
};

export type Metrics = {
  totalEvents: number;
  eventsByType: Record<string, number>;
  sessionStart: number;
  lastUpdated: number;
};

export type SessionData = {
  sessionId: string;
  startTime: number;
  events: AnalyticsEvent[];
  metadata: Record<string, unknown>;
};

export class AnalyticsCollector {
  config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private sessionStart: number;
  private metrics: Metrics;
  private logs: string[] = [];

  constructor(config: AnalyticsConfig) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      sessionStart: this.sessionStart,
      lastUpdated: this.sessionStart,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  track(eventType: string, data: Record<string, unknown> = {}): void {
    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: eventType,
      timestamp: Date.now(),
      data,
      sessionId: this.sessionId,
    };

    this.events.push(event);
    this.metrics.totalEvents++;
    this.metrics.eventsByType[eventType] = (this.metrics.eventsByType[eventType] || 0) + 1;
    this.metrics.lastUpdated = Date.now();

    if (this.config.enableLogging) {
      this.log(`[TRACK] ${eventType}`, data);
    }

    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  log(level: string, message: string, data?: Record<string, unknown>): void {
    const entry = `[${level}] ${message} ${data ? JSON.stringify(data) : ''}`;
    this.logs.push(entry);
    
    if (this.config.enableLogging) {
      console.log(`[Analytics] ${entry}`);
    }
  }

  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  getSessionData(): SessionData {
    return {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      events: [...this.events],
      metadata: {
        appId: this.config.appId,
        totalEvents: this.metrics.totalEvents,
      },
    };
  }

  private flush(): void {
    if (this.events.length === 0) return;
    this.log('INFO', `Flushing ${this.events.length} events`);
    this.events = [];
  }

  getSnapshot(): { metrics: Metrics } {
    return {
      metrics: this.getMetrics(),
    };
  }

  reset(): void {
    this.events = [];
    this.logs = [];
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      sessionStart: Date.now(),
      lastUpdated: Date.now(),
    };
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.log('INFO', 'Analytics reset');
  }

  getReport(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      metrics: this.metrics,
      eventCount: this.events.length,
      config: this.config,
    }, null, 2);
  }

  exportMetrics(): { version: string } {
    return {
      version: 'v67.0.0',
    };
  }
}