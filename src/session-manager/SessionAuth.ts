/**
 * SessionAuth.ts
 * V75 Session Manager - Session authentication and user management
 */

export interface AuthConfig {
  loginTimeout: number;
  sessionDuration: number;
  maxLoginAttempts: number;
  enableMFA: boolean;
  tokenRotation: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  lastLogin: number;
}

export interface AuthSession {
  userId: string;
  token: string;
  createdAt: number;
  expiresAt: number;
  isValid: boolean;
}

type AuthEventHandler = (user: User, session?: AuthSession) => void;

export class SessionAuth {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private tokens: Map<string, string> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private eventHandlers: Map<string, AuthEventHandler[]> = new Map();
  private metrics = {
    loginAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    logouts: 0,
    tokenRefreshes: 0,
  };

  readonly config: AuthConfig = {
    loginTimeout: 300000,
    sessionDuration: 3600000,
    maxLoginAttempts: 5,
    enableMFA: false,
    tokenRotation: true,
  };

  login(username: string, password: string): AuthSession | null {
    this.metrics.loginAttempts++;
    const attempts = (this.loginAttempts.get(username) ?? 0) + 1;
    
    if (attempts > this.config.maxLoginAttempts) {
      this.metrics.failedLogins++;
      this.emit('auth:locked', {} as User);
      return null;
    }

    this.loginAttempts.set(username, attempts);

    const user = this.findUser(username);
    if (!user) {
      this.metrics.failedLogins++;
      return null;
    }

    if (!this.verifyPassword(password)) {
      this.metrics.failedLogins++;
      return null;
    }

    this.loginAttempts.set(username, 0);
    user.lastLogin = Date.now();

    const token = this.generateToken();
    const now = Date.now();
    const session: AuthSession = {
      userId: user.id,
      token,
      createdAt: now,
      expiresAt: now + this.config.sessionDuration,
      isValid: true,
    };

    this.sessions.set(token, session);
    this.tokens.set(user.id, token);
    this.metrics.successfulLogins++;
    this.emit('auth:login', user, session);
    return session;
  }

  logout(token: string): boolean {
    const session = this.sessions.get(token);
    if (!session) return false;

    this.sessions.delete(token);
    this.tokens.delete(session.userId);
    this.metrics.logouts++;
    this.emit('auth:logout', {} as User);
    return true;
  }

  check(token: string): boolean {
    const session = this.sessions.get(token);
    if (!session) return false;
    if (!session.isValid) return false;
    if (Date.now() > session.expiresAt) {
      session.isValid = false;
      return false;
    }
    return true;
  }

  getUser(token: string): User | null {
    const session = this.sessions.get(token);
    if (!session || !session.isValid) return null;
    return this.users.get(session.userId) ?? null;
  }

  refreshToken(token: string): string | null {
    const session = this.sessions.get(token);
    if (!session || !session.isValid) return null;

    // Invalidate old token
    this.sessions.delete(token);
    
    const newToken = this.generateToken();
    const newSession: AuthSession = {
      userId: session.userId,
      token: newToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.sessionDuration,
      isValid: true,
    };
    this.sessions.set(newToken, newSession);
    this.tokens.set(session.userId, newToken);
    this.metrics.tokenRefreshes++;
    return newToken;
  }

  registerUser(username: string, email: string, roles: string[] = ['user']): User {
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      username,
      email,
      roles,
      lastLogin: 0,
    };
    this.users.set(user.id, user);
    this.emit('auth:registered', user);
    return user;
  }

  getSnapshot(): { metrics: typeof this.metrics; activeSessions: number; totalUsers: number } {
    return {
      metrics: { ...this.metrics },
      activeSessions: this.sessions.size,
      totalUsers: this.users.size,
    };
  }

  reset(): void {
    this.users.clear();
    this.sessions.clear();
    this.tokens.clear();
    this.loginAttempts.clear();
    this.metrics = { loginAttempts: 0, successfulLogins: 0, failedLogins: 0, logouts: 0, tokenRefreshes: 0 };
  }

  getReport(): string {
    return [
      '=== Session Auth Report ===',
      `Active Sessions: ${this.sessions.size}`,
      `Total Users: ${this.users.size}`,
      `Metrics: logins=${this.metrics.successfulLogins}, failed=${this.metrics.failedLogins}, logout=${this.metrics.logouts}`,
      `Config: timeout=${this.config.loginTimeout}ms, duration=${this.config.sessionDuration}ms, mfa=${this.config.enableMFA}`,
    ].join('\n');
  }

  exportMetrics(): { version: string; metrics: typeof this.metrics } {
    return {
      version: 'V75-1.0.0',
      metrics: { ...this.metrics },
    };
  }

  on(event: string, handler: AuthEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: AuthEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }

  emit(event: string, user: User, session?: AuthSession): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(h => h(user, session));
    }
  }

  private findUser(username: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return undefined;
  }

  private verifyPassword(password: string): boolean {
    return password && password.length >= 8;
  }

  private generateToken(): string {
    return `tok_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
  }
}