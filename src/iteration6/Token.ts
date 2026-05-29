/**
 * Token.ts - V36 Iteration 6
 * Token handler with generate/validate/refresh/getTokens capabilities
 */

export interface Token {
  id: string;
  token: string;
  type: 'access' | 'refresh' | 'reset';
  userId: string;
  scope: string[];
  createdAt: number;
  expiresAt: number;
  lastUsedAt?: number;
}

export interface TokenPair {
  accessToken: Token;
  refreshToken: Token;
}

export interface TokenSnapshot {
  tokens: Record<string, Token>;
  metrics: {
    totalTokens: number;
    accessTokens: number;
    refreshTokens: number;
    resetTokens: number;
    generations: number;
    validations: number;
    refreshes: number;
    revocations: number;
    expiredTokens: number;
  };
}

export class TokenHandler {
  private tokens: Map<string, Token> = new Map();
  private tokenByValue: Map<string, string> = new Map(); // token value -> token id
  private generations: number = 0;
  private validations: number = 0;
  private refreshes: number = 0;
  private revocations: number = 0;
  private expiredTokens: number = 0;
  private accessTTL: number = 900000; // 15 minutes
  private refreshTTL: number = 604800000; // 7 days

  constructor(options?: { accessTTL?: number; refreshTTL?: number }) {
    if (options?.accessTTL) this.accessTTL = options.accessTTL;
    if (options?.refreshTTL) this.refreshTTL = options.refreshTTL;
    this.reset();
  }

  /**
   * Generate a random token string
   */
  private generateTokenValue(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
  }

  /**
   * Create a new token
   */
  private createToken(
    userId: string,
    type: 'access' | 'refresh' | 'reset',
    scope: string[] = []
  ): Token {
    const id = `tokid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const value = this.generateTokenValue();
    const now = Date.now();

    const ttl = type === 'access' ? this.accessTTL :
                type === 'refresh' ? this.refreshTTL : 3600000;

    const token: Token = {
      id,
      token: value,
      type,
      userId,
      scope,
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.tokens.set(id, token);
    this.tokenByValue.set(value, id);

    return token;
  }

  /**
   * Generate access and refresh token pair
   */
  generate(userId: string, scope: string[] = []): TokenPair {
    const accessToken = this.createToken(userId, 'access', scope);
    const refreshToken = this.createToken(userId, 'refresh', scope);

    this.generations++;

    return { accessToken, refreshToken };
  }

  /**
   * Validate a token by its value
   */
  validate(tokenValue: string): Token | null {
    const id = this.tokenByValue.get(tokenValue);
    if (!id) {
      this.validations++;
      return null;
    }

    const token = this.tokens.get(id);
    if (!token) {
      this.validations++;
      return null;
    }

    if (Date.now() > token.expiresAt) {
      this.revoke(tokenValue);
      this.expiredTokens++;
      this.validations++;
      return null;
    }

    token.lastUsedAt = Date.now();
    this.validations++;

    return token;
  }

  /**
   * Refresh an access token using a refresh token
   */
  refresh(refreshTokenValue: string): Token | null {
    const token = this.validate(refreshTokenValue);
    
    if (!token || token.type !== 'refresh') {
      return null;
    }

    // Create new access token with same user and scope
    const newAccessToken = this.createToken(token.userId, 'access', token.scope);
    
    this.refreshes++;

    return newAccessToken;
  }

  /**
   * Revoke a token by its value
   */
  revoke(tokenValue: string): boolean {
    const id = this.tokenByValue.get(tokenValue);
    if (!id) {
      return false;
    }

    const token = this.tokens.get(id);
    if (token) {
      this.tokenByValue.delete(tokenValue);
      this.tokens.delete(id);
      this.revocations++;
      return true;
    }

    return false;
  }

  /**
   * Get all tokens for a user
   */
  getTokens(userId: string): Token[] {
    const result: Token[] = [];
    
    this.tokens.forEach(token => {
      if (token.userId === userId) {
        result.push({ ...token });
      }
    });

    return result;
  }

  /**
   * Get tokens by type for a user
   */
  getTokensByType(userId: string, type: 'access' | 'refresh' | 'reset'): Token[] {
    return this.getTokens(userId).filter(t => t.type === type);
  }

  /**
   * Clean up expired tokens
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    this.tokens.forEach((token, id) => {
      if (token.expiresAt <= now) {
        this.tokenByValue.delete(token.token);
        this.tokens.delete(id);
        cleaned++;
        this.expiredTokens++;
      }
    });

    return cleaned;
  }

  /**
   * Get current snapshot
   */
  getSnapshot(): TokenSnapshot {
    let accessTokens = 0;
    let refreshTokens = 0;
    let resetTokens = 0;

    this.tokens.forEach(t => {
      if (t.type === 'access') accessTokens++;
      else if (t.type === 'refresh') refreshTokens++;
      else if (t.type === 'reset') resetTokens++;
    });

    const tokensObj: Record<string, Token> = {};
    this.tokens.forEach((t, id) => { tokensObj[id] = t; });

    return {
      tokens: tokensObj,
      metrics: {
        totalTokens: this.tokens.size,
        accessTokens,
        refreshTokens,
        resetTokens,
        generations: this.generations,
        validations: this.validations,
        refreshes: this.refreshes,
        revocations: this.revocations,
        expiredTokens: this.expiredTokens,
      },
    };
  }

  /**
   * Reset all token state
   */
  reset(): void {
    this.tokens.clear();
    this.tokenByValue.clear();
    this.generations = 0;
    this.validations = 0;
    this.refreshes = 0;
    this.revocations = 0;
    this.expiredTokens = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Token Report ===',
      `Total Tokens: ${snap.metrics.totalTokens}`,
      `Access: ${snap.metrics.accessTokens}`,
      `Refresh: ${snap.metrics.refreshTokens}`,
      `Reset: ${snap.metrics.resetTokens}`,
      `Generations: ${snap.metrics.generations}`,
      `Validations: ${snap.metrics.validations}`,
      `Refreshes: ${snap.metrics.refreshes}`,
      `Revocations: ${snap.metrics.revocations}`,
      `Expired: ${snap.metrics.expiredTokens}`,
    ];

    return lines.join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, unknown> {
    const snap = this.getSnapshot();
    return {
      totalTokens: snap.metrics.totalTokens,
      accessTokens: snap.metrics.accessTokens,
      refreshTokens: snap.metrics.refreshTokens,
      resetTokens: snap.metrics.resetTokens,
      generations: snap.metrics.generations,
      validations: snap.metrics.validations,
      refreshes: snap.metrics.refreshes,
      revocations: snap.metrics.revocations,
      expiredTokens: snap.metrics.expiredTokens,
    };
  }
}

export default TokenHandler;