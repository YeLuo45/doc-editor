/**
 * V57 PresenceManager - User presence tracking
 * Manages user presence with join/leave/update/getPresence operations
 */

export interface PresenceConfig {
  heartbeatInterval?: number;
  presenceTimeout?: number;
  maxPresenceEntries?: number;
}

export interface UserPresence {
  oderId: string;
  name: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: number;
  cursorPosition?: { line: number; column: number };
  color?: string;
}

export interface PresenceMetrics {
  totalJoins: number;
  totalLeaves: number;
  totalUpdates: number;
  activePresences: number;
  timestamp: number;
}

export class PresenceManager {
  config: PresenceConfig;
  private presences: Map<string, UserPresence> = new Map();
  private joinCount: number = 0;
  private leaveCount: number = 0;
  private updateCount: number = 0;

  constructor(config: PresenceConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval ?? 5000,
      presenceTimeout: config.presenceTimeout ?? 30000,
      maxPresenceEntries: config.maxPresenceEntries ?? 100,
    };
  }

  join(userId: string, name: string, color?: string): boolean {
    if (this.presences.size >= (this.config.maxPresenceEntries ?? 100)) {
      return false;
    }
    const presence: UserPresence = {
      oderId: userId,
      name,
      status: 'online',
      lastSeen: Date.now(),
      color,
    };
    this.presences.set(userId, presence);
    this.joinCount++;
    return true;
  }

  leave(userId: string): boolean {
    const presence = this.presences.get(userId);
    if (!presence) {
      return false;
    }
    presence.status = 'offline';
    presence.lastSeen = Date.now();
    this.leaveCount++;
    return true;
  }

  update(
    userId: string,
    data: Partial<Pick<UserPresence, 'status' | 'cursorPosition' | 'name'>>
  ): boolean {
    const presence = this.presences.get(userId);
    if (!presence) {
      return false;
    }
    if (data.status !== undefined) {
      presence.status = data.status;
    }
    if (data.cursorPosition !== undefined) {
      presence.cursorPosition = data.cursorPosition;
    }
    if (data.name !== undefined) {
      presence.name = data.name;
    }
    presence.lastSeen = Date.now();
    this.updateCount++;
    return true;
  }

  getPresence(userId: string): UserPresence | undefined {
    const p = this.presences.get(userId);
    return p ? { ...p } : undefined;
  }

  getAllPresences(): UserPresence[] {
    const result: UserPresence[] = [];
    this.presences.forEach((p) => {
      result.push({ ...p });
    });
    return result;
  }

  removePresence(userId: string): boolean {
    return this.presences.delete(userId);
  }

  getSnapshot(): { metrics: PresenceMetrics } {
    return {
      metrics: {
        totalJoins: this.joinCount,
        totalLeaves: this.leaveCount,
        totalUpdates: this.updateCount,
        activePresences: this.presences.size,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this.presences.clear();
    this.joinCount = 0;
    this.leaveCount = 0;
    this.updateCount = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== PresenceManager Report ===',
      `Total Joins: ${snap.metrics.totalJoins}`,
      `Total Leaves: ${snap.metrics.totalLeaves}`,
      `Total Updates: ${snap.metrics.totalUpdates}`,
      `Active Presences: ${snap.metrics.activePresences}`,
      `Timestamp: ${new Date(snap.metrics.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'V57-PresenceManager-1.0.0' };
  }
}