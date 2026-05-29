/**
 * Debugger.ts - V37 Iteration 7
 * Debug support with debug, trace, and breakpoints capabilities
 */

export interface Breakpoint {
  id: string;
  moduleId: string;
  line: number;
  condition?: string;
  enabled: boolean;
  hitCount: number;
}

export interface TraceEntry {
  timestamp: number;
  moduleId: string;
  operation: string;
  data: unknown;
}

export interface DebugSession {
  id: string;
  moduleId: string;
  status: 'active' | 'paused' | 'stopped';
  startTime: number;
  breakpoints: string[];
}

export interface DebuggerSnapshot {
  sessions: Record<string, DebugSession>;
  breakpoints: Record<string, Breakpoint>;
  traces: TraceEntry[];
  metrics: {
    totalSessions: number;
    activeSessions: number;
    totalBreakpoints: number;
    breakpointHits: number;
    traceEntries: number;
  };
}

export class Debugger {
  private sessions: Map<string, DebugSession> = new Map();
  private breakpoints: Map<string, Breakpoint> = new Map();
  private traces: TraceEntry[] = [];
  private totalBreakpoints: number = 0;
  private breakpointHits: number = 0;
  private traceEntries: number = 0;

  constructor() {
    this.reset();
  }

  /**
   * Start a debug session for a module
   */
  debug(moduleId: string): DebugSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: DebugSession = {
      id,
      moduleId,
      status: 'active',
      startTime: Date.now(),
      breakpoints: [],
    };

    this.sessions.set(id, session);
    this.trace(`Session started for module ${moduleId}`, moduleId);
    return session;
  }

  /**
   * Pause an active debug session
   */
  pause(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return false;
    session.status = 'paused';
    this.trace(`Session paused`, session.moduleId);
    return true;
  }

  /**
   * Stop a debug session
   */
  stop(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = 'stopped';
    this.trace(`Session stopped`, session.moduleId);
    return true;
  }

  /**
   * Add a breakpoint to a module
   */
  addBreakpoint(moduleId: string, line: number, condition?: string): Breakpoint {
    const id = `bp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const breakpoint: Breakpoint = {
      id,
      moduleId,
      line,
      condition,
      enabled: true,
      hitCount: 0,
    };

    this.breakpoints.set(id, breakpoint);
    this.totalBreakpoints++;
    return breakpoint;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(breakpointId: string): boolean {
    const removed = this.breakpoints.delete(breakpointId);
    if (removed) this.totalBreakpoints--;
    return removed;
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(breakpointId: string): boolean {
    const bp = this.breakpoints.get(breakpointId);
    if (!bp) return false;
    bp.enabled = !bp.enabled;
    return true;
  }

  /**
   * Hit a breakpoint (for tracking)
   */
  hitBreakpoint(breakpointId: string): void {
    const bp = this.breakpoints.get(breakpointId);
    if (bp && bp.enabled) {
      bp.hitCount++;
      this.breakpointHits++;
    }
  }

  /**
   * Add trace entry
   */
  trace(operation: string, moduleId: string, data?: unknown): void {
    const entry: TraceEntry = {
      timestamp: Date.now(),
      moduleId,
      operation,
      data,
    };
    this.traces.push(entry);
    this.traceEntries++;
  }

  /**
   * Get breakpoints for a module
   */
  getBreakpoints(moduleId?: string): Breakpoint[] {
    const all = Array.from(this.breakpoints.values());
    return moduleId ? all.filter(bp => bp.moduleId === moduleId) : all;
  }

  /**
   * Get traces, optionally filtered by module
   */
  getTraces(moduleId?: string): TraceEntry[] {
    return moduleId ? this.traces.filter(t => t.moduleId === moduleId) : this.traces;
  }

  /**
   * Clear all traces
   */
  clearTraces(): void {
    this.traces = [];
  }

  /**
   * Get current snapshot of debugger state
   */
  getSnapshot(): DebuggerSnapshot {
    const sessionsObj: Record<string, DebugSession> = {};
    this.sessions.forEach((s, id) => { sessionsObj[id] = s; });

    const breakpointsObj: Record<string, Breakpoint> = {};
    this.breakpoints.forEach((b, id) => { breakpointsObj[id] = b; });

    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active').length;

    return {
      sessions: sessionsObj,
      breakpoints: breakpointsObj,
      traces: this.traces.slice(-100), // Last 100 traces
      metrics: {
        totalSessions: this.sessions.size,
        activeSessions,
        totalBreakpoints: this.totalBreakpoints,
        breakpointHits: this.breakpointHits,
        traceEntries: this.traceEntries,
      },
    };
  }

  /**
   * Reset all debugger state
   */
  reset(): void {
    this.sessions.clear();
    this.breakpoints.clear();
    this.traces = [];
    this.totalBreakpoints = 0;
    this.breakpointHits = 0;
    this.traceEntries = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Debugger Report ===',
      `Total Sessions: ${snap.metrics.totalSessions}`,
      `Active Sessions: ${snap.metrics.activeSessions}`,
      `Total Breakpoints: ${snap.metrics.totalBreakpoints}`,
      `Breakpoint Hits: ${snap.metrics.breakpointHits}`,
      `Trace Entries: ${snap.metrics.traceEntries}`,
      '',
      'Active Breakpoints:',
    ];

    const activeBps = Object.values(snap.breakpoints).filter(bp => bp.enabled);
    if (activeBps.length > 0) {
      activeBps.forEach(bp => {
        lines.push(`  [${bp.id}] ${bp.moduleId}:${bp.line} (hit ${bp.hitCount} times)`);
      });
    } else {
      lines.push('  (none)');
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as plain object
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalSessions: snap.metrics.totalSessions,
      activeSessions: snap.metrics.activeSessions,
      totalBreakpoints: snap.metrics.totalBreakpoints,
      breakpointHits: snap.metrics.breakpointHits,
      traceEntries: snap.metrics.traceEntries,
      sessions: Object.keys(snap.sessions).length,
      breakpoints: Object.keys(snap.breakpoints).length,
    };
  }
}

export default Debugger;