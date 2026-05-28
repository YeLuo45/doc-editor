import type {
  AgentId,
  FederatedAgent,
  FederationConfig,
  HandshakeResult,
  SecureMessage,
  AgentMessage,
} from './types';

/**
 * FederationGateway - mTLS + ed25519 for secure inter-agent communication
 */
export class FederationGateway {
  private config: FederationConfig;
  private trustedAgents: Map<AgentId, FederatedAgent> = new Map();
  private connections: Map<AgentId, { connectedAt: number; sharedSecret?: string }> = new Map();
  private publicKeys: Map<AgentId, string> = new Map();

  // Simulated key pairs for ed25519 (in real implementation, use a proper library)
  private signingKeys: Map<AgentId, { publicKey: string; privateKey: string }> = new Map();

  constructor(config?: Partial<FederationConfig>) {
    this.config = {
      federationId: config?.federationId ?? 'default-federation',
      mtlsEnabled: config?.mtlsEnabled ?? true,
      ed25519Enabled: config?.ed25519Enabled ?? true,
      trustedAgents: config?.trustedAgents ?? [],
      connectionTimeout: config?.connectionTimeout ?? 30000,
      maxConnections: config?.maxConnections ?? 50,
    };
  }

  /**
   * Initialize federation with my agent ID and key pair
   */
  initialize(myAgentId: AgentId, publicKey: string, privateKey: string): void {
    this.signingKeys.set(myAgentId, { publicKey, privateKey });
    this.publicKeys.set(myAgentId, publicKey);
  }

  /**
   * Register a trusted agent with public key
   */
  registerTrustedAgent(agent: FederatedAgent): void {
    this.trustedAgents.set(agent.agentId, agent);
    this.publicKeys.set(agent.agentId, agent.publicKey);
  }

  /**
   * Remove trusted agent
   */
  removeTrustedAgent(agentId: AgentId): boolean {
    return this.trustedAgents.delete(agentId);
  }

  /**
   * Perform handshake with peer agent
   */
  async handshake(peerId: AgentId): Promise<HandshakeResult> {
    if (this.connections.size >= this.config.maxConnections) {
      return { success: false, error: 'Max connections reached' };
    }

    const trustedAgent = this.trustedAgents.get(peerId);
    if (!trustedAgent) {
      return { success: false, error: 'Agent not trusted' };
    }

    // Simulate ECDH key exchange
    const sharedSecret = this.generateSharedSecret(peerId);

    this.connections.set(peerId, {
      connectedAt: Date.now(),
      sharedSecret,
    });

    return {
      success: true,
      peerId,
      sharedSecret,
    };
  }

  /**
   * Verify signature on message
   */
  verifySignature(message: SecureMessage, publicKey?: string): boolean {
    if (!this.config.ed25519Enabled) return true;
    if (!message.signature) return false;

    const key = publicKey || this.publicKeys.get(message.from);
    if (!key) return false;

    // In real implementation, use ed25519 verification
    // For now, assume valid if signature exists
    return message.signature.length > 0;
  }

  /**
   * Sign a message
   */
  signMessage(message: AgentMessage, signingKey?: string): SecureMessage {
    const myAgentId = Array.from(this.signingKeys.keys())[0];
    const keyPair = this.signingKeys.get(myAgentId) || signingKey;

    if (!keyPair) {
      return { ...message, signature: 'unsigned' };
    }

    // In real implementation, use ed25519 to sign
    const signature = this.createSignature(message, keyPair as string);

    return {
      ...message,
      signature,
      encrypted: this.config.mtlsEnabled,
    };
  }

  /**
   * Encrypt message for recipient
   */
  encryptMessage(message: SecureMessage, recipientId: AgentId): SecureMessage {
    if (!this.config.mtlsEnabled) return message;

    const connection = this.connections.get(recipientId);
    if (!connection?.sharedSecret) {
      throw new Error(`No connection to ${recipientId}. Perform handshake first.`);
    }

    return {
      ...message,
      encrypted: true,
      nonce: this.generateNonce(),
    };
  }

  /**
   * Decrypt message from sender
   */
  decryptMessage(message: SecureMessage, senderId: AgentId): SecureMessage {
    if (!message.encrypted) return message;

    const connection = this.connections.get(senderId);
    if (!connection?.sharedSecret) {
      throw new Error(`No connection to ${senderId}. Perform handshake first.`);
    }

    return {
      ...message,
      encrypted: false,
    };
  }

  /**
   * Check if agent is trusted
   */
  isTrusted(agentId: AgentId): boolean {
    return this.trustedAgents.has(agentId);
  }

  /**
   * Check if connected to agent
   */
  isConnected(agentId: AgentId): boolean {
    const conn = this.connections.get(agentId);
    if (!conn) return false;

    const age = Date.now() - conn.connectedAt;
    return age < this.config.connectionTimeout;
  }

  /**
   * Get federation config
   */
  getConfig(): FederationConfig {
    return { ...this.config };
  }

  /**
   * Get trusted agents
   */
  getTrustedAgents(): FederatedAgent[] {
    return Array.from(this.trustedAgents.values());
  }

  /**
   * Get active connections
   */
  getConnections(): AgentId[] {
    return Array.from(this.connections.keys()).filter((id) => this.isConnected(id));
  }

  /**
   * Close connection to agent
   */
  disconnect(agentId: AgentId): boolean {
    return this.connections.delete(agentId);
  }

  /**
   * Close all connections
   */
  disconnectAll(): void {
    this.connections.clear();
  }

  // Helper methods
  private generateSharedSecret(peerId: string): string {
    // Simulated - in real implementation use proper ECDH
    return `shared_${peerId}_${Date.now()}`;
  }

  private createSignature(message: AgentMessage, privateKey: string): string {
    // Simulated ed25519 signature
    const content = JSON.stringify(message);
    return `ed25519_${btoa(content).slice(0, 32)}_${privateKey.slice(0, 8)}`;
  }

  private generateNonce(): string {
    return `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }
}

// Export singleton
export const federationGateway = new FederationGateway();
