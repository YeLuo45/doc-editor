/**
 * V25 Offline-first Sync Engine - Protocol Module
 * Sync packet creation, parsing, and validation
 */

export interface SyncPacket {
  version: number;
  type: 'full' | 'delta' | 'ack' | 'conflict' | 'heartbeat';
  timestamp: number;
  payload: unknown;
  checksum: string;
  sequenceNumber: number;
  metadata?: Record<string, unknown>;
}

export interface SyncPacketHeader {
  version: number;
  type: SyncPacket['type'];
  timestamp: number;
  sequenceNumber: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProtocolConfig {
  version: number;
  maxPayloadSize: number;
  checksumAlgorithm: 'md5' | 'sha256' | 'crc32';
  enableCompression: boolean;
}

export class SyncProtocol {
  private config: ProtocolConfig;
  private sequenceNumber: number = 0;
  private lastAckedSequence: number = -1;

  constructor(config?: Partial<ProtocolConfig>) {
    this.config = {
      version: config?.version ?? 25,
      maxPayloadSize: config?.maxPayloadSize ?? 1024 * 1024, // 1MB
      checksumAlgorithm: config?.checksumAlgorithm ?? 'sha256',
      enableCompression: config?.enableCompression ?? false,
    };
  }

  /**
   * Create a sync packet
   */
  createSyncPacket(
    type: SyncPacket['type'],
    payload: unknown,
    metadata?: Record<string, unknown>
  ): SyncPacket {
    this.sequenceNumber++;

    const packet: SyncPacket = {
      version: this.config.version,
      type,
      timestamp: Date.now(),
      payload,
      checksum: this.generateChecksum(payload),
      sequenceNumber: this.sequenceNumber,
      metadata,
    };

    return packet;
  }

  /**
   * Parse a sync packet from raw data
   */
  parseSyncPacket(data: string | object): SyncPacket | null {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (!this.isValidPacketStructure(parsed)) {
        return null;
      }

      return parsed as SyncPacket;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate a sync packet
   */
  validateSync(packet: SyncPacket | unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!packet || typeof packet !== 'object') {
      errors.push('Packet must be a non-null object');
      return { valid: false, errors, warnings };
    }

    const p = packet as SyncPacket;

    // Version check
    if (p.version !== this.config.version) {
      if (p.version < this.config.version) {
        errors.push(`Packet version ${p.version} is older than expected ${this.config.version}`);
      } else {
        warnings.push(`Packet version ${p.version} is newer than expected ${this.config.version}`);
      }
    }

    // Type check
    const validTypes: SyncPacket['type'][] = ['full', 'delta', 'ack', 'conflict', 'heartbeat'];
    if (!validTypes.includes(p.type)) {
      errors.push(`Invalid packet type: ${p.type}`);
    }

    // Timestamp check
    if (!p.timestamp || p.timestamp < 0) {
      errors.push('Invalid timestamp');
    }

    // Sequence number check
    if (typeof p.sequenceNumber !== 'number' || p.sequenceNumber < 0) {
      errors.push('Invalid sequence number');
    }

    // Checksum check
    if (!p.checksum || typeof p.checksum !== 'string') {
      errors.push('Missing or invalid checksum');
    } else {
      const expectedChecksum = this.generateChecksum(p.payload);
      if (p.checksum !== expectedChecksum) {
        errors.push('Checksum mismatch - payload may have been corrupted');
      }
    }

    // Payload size check
    const payloadSize = JSON.stringify(p.payload).length;
    if (payloadSize > this.config.maxPayloadSize) {
      errors.push(`Payload size ${payloadSize} exceeds maximum ${this.config.maxPayloadSize}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create an acknowledgment packet
   */
  createAckPacket(sequenceNumber: number, success: boolean): SyncPacket {
    return this.createSyncPacket('ack', { sequenceNumber, success });
  }

  /**
   * Create a heartbeat packet
   */
  createHeartbeatPacket(): SyncPacket {
    return this.createSyncPacket('heartbeat', { status: 'alive' });
  }

  /**
   * Create a conflict packet
   */
  createConflictPacket(localChange: unknown, remoteChange: unknown): SyncPacket {
    return this.createSyncPacket('conflict', { localChange, remoteChange });
  }

  /**
   * Get current sequence number
   */
  getSequenceNumber(): number {
    return this.sequenceNumber;
  }

  /**
   * Check if we should resend unacknowledged packets
   */
  shouldResend(missedSequence: number): boolean {
    return missedSequence > this.lastAckedSequence;
  }

  /**
   * Update last acknowledged sequence
   */
  acknowledge(sequenceNumber: number): void {
    if (sequenceNumber > this.lastAckedSequence) {
      this.lastAckedSequence = sequenceNumber;
    }
  }

  /**
   * Serialize packet to string
   */
  serialize(packet: SyncPacket): string {
    return JSON.stringify(packet);
  }

  /**
   * Get current snapshot for debugging
   */
  getSnapshot(): object {
    return {
      sequenceNumber: this.sequenceNumber,
      lastAckedSequence: this.lastAckedSequence,
      config: { ...this.config },
    };
  }

  /**
   * Reset protocol state
   */
  reset(): void {
    this.sequenceNumber = 0;
    this.lastAckedSequence = -1;
  }

  /**
   * Get a report of protocol state
   */
  getReport(): object {
    return {
      version: this.config.version,
      sequenceNumber: this.sequenceNumber,
      lastAckedSequence: this.lastAckedSequence,
      pendingAcks: this.sequenceNumber - this.lastAckedSequence,
      config: { ...this.config },
    };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): object {
    return {
      ...this.config,
      currentSequence: this.sequenceNumber,
      lastAckedSequence: this.lastAckedSequence,
      acknowledgmentRate: this.sequenceNumber > 0
        ? this.lastAckedSequence / this.sequenceNumber
        : 1,
    };
  }

  private isValidPacketStructure(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    const required = ['version', 'type', 'timestamp', 'payload', 'checksum', 'sequenceNumber'];
    return required.every(field => field in obj);
  }

  private generateChecksum(payload: unknown): string {
    const str = JSON.stringify(payload);
    switch (this.config.checksumAlgorithm) {
      case 'md5':
        return this.simpleHash(str);
      case 'sha256':
        return this.simpleHash(str + str); // Simplified
      case 'crc32':
        return this.crc32(str);
      default:
        return this.simpleHash(str);
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private crc32(str: string): string {
    let crc = 0xffffffff;
    const table = this.getCrc32Table();
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xff];
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16);
  }

  private getCrc32Table(): number[] {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table.push(c >>> 0);
    }
    return table;
  }
}

export default SyncProtocol;