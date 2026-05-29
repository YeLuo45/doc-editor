/**
 * V57 CollaborationHub - Core collaboration hub
 * Manages participant join/leave and message broadcasting
 */

export interface HubConfig {
  maxParticipants?: number;
  sessionTimeout?: number;
  enableLogging?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
}

export interface HubMetrics {
  totalJoins: number;
  totalLeaves: number;
  activeParticipants: number;
  messagesBroadcast: number;
  timestamp: number;
}

export class CollaborationHub {
  config: HubConfig;
  private participants: Map<string, Participant> = new Map();
  private joinCount: number = 0;
  private leaveCount: number = 0;
  private broadcastCount: number = 0;

  constructor(config: HubConfig = {}) {
    this.config = {
      maxParticipants: config.maxParticipants ?? 50,
      sessionTimeout: config.sessionTimeout ?? 3600000,
      enableLogging: config.enableLogging ?? false,
    };
  }

  join(participantId: string, name: string): boolean {
    if (this.participants.size >= (this.config.maxParticipants ?? 50)) {
      return false;
    }
    if (this.participants.has(participantId)) {
      const p = this.participants.get(participantId)!;
      p.isActive = true;
      p.joinedAt = Date.now();
      return true;
    }
    const participant: Participant = {
      id: participantId,
      name,
      joinedAt: Date.now(),
      isActive: true,
    };
    this.participants.set(participantId, participant);
    this.joinCount++;
    return true;
  }

  leave(participantId: string): boolean {
    const participant = this.participants.get(participantId);
    if (!participant) {
      return false;
    }
    participant.isActive = false;
    this.leaveCount++;
    return true;
  }

  broadcast(message: unknown, fromParticipantId?: string): string[] {
    const recipientIds: string[] = [];
    this.participants.forEach((participant, id) => {
      if (participant.isActive && id !== fromParticipantId) {
        recipientIds.push(id);
      }
    });
    this.broadcastCount++;
    return recipientIds;
  }

  getParticipants(): Participant[] {
    const active: Participant[] = [];
    this.participants.forEach((p) => {
      if (p.isActive) {
        active.push({ ...p });
      }
    });
    return active;
  }

  getParticipant(participantId: string): Participant | undefined {
    const p = this.participants.get(participantId);
    return p ? { ...p } : undefined;
  }

  removeParticipant(participantId: string): boolean {
    return this.participants.delete(participantId);
  }

  getSnapshot(): { metrics: HubMetrics } {
    return {
      metrics: {
        totalJoins: this.joinCount,
        totalLeaves: this.leaveCount,
        activeParticipants: this.participants.size,
        messagesBroadcast: this.broadcastCount,
        timestamp: Date.now(),
      },
    };
  }

  reset(): void {
    this.participants.clear();
    this.joinCount = 0;
    this.leaveCount = 0;
    this.broadcastCount = 0;
  }

  getReport(): string {
    const snap = this.getSnapshot();
    return [
      '=== CollaborationHub Report ===',
      `Total Joins: ${snap.metrics.totalJoins}`,
      `Total Leaves: ${snap.metrics.totalLeaves}`,
      `Active Participants: ${snap.metrics.activeParticipants}`,
      `Messages Broadcast: ${snap.metrics.messagesBroadcast}`,
      `Timestamp: ${new Date(snap.metrics.timestamp).toISOString()}`,
    ].join('\n');
  }

  exportMetrics(): { version: string } {
    return { version: 'V57-CollaborationHub-1.0.0' };
  }
}