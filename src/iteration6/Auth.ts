/**
 * Auth.ts - V36 Iteration 6
 * Core authentication module with login/logout/verify/getUser capabilities
 */

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt: number;
  lastLogin?: number;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  userId: string;
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthSnapshot {
  users: Record<string, User>;
  sessions: Record<string, AuthSession>;
  metrics: {
    totalUsers: number;
    activeSessions: number;
    logins: number;
    logouts: number;
    verifications: number;
    failures: number;
  };
}

export class Auth {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private sessionsByUser: Map<string, string[]> = new Map();
  private logins: number = 0;
  private logouts: number = 0;
  private verifications: number = 0;
  private failures: number = 0;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.sessionsByUser = new Map();
    this.reset();
  }

  /**
   * Authenticate user and create session
   */
  login(credentials: AuthCredentials): AuthSession | null {
    if (!credentials?.username || !credentials?.password) {
      this.failures++;
      return null;
    }

    // Find user by username
    let user: User | undefined;
    this.users.forEach(u => {
      if (u.username === credentials.username) {
        user = u;
      }
    });

    // Auto-create user if not exists (simplified for demo)
    if (!user) {
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        username: credentials.username,
        email: `${credentials.username}@example.com`,
        roles: ['user'],
        createdAt: Date.now(),
      };
      this.users.set(newUser.id, newUser);
      user = newUser;
    }

    // Create session
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const session: AuthSession = {
      userId: user.id,
      sessionId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    };

    this.sessions.set(sessionId, session);
    
    // Track sessions by user
    const userSessions = this.sessionsByUser.get(user.id) || [];
    userSessions.push(sessionId);
    this.sessionsByUser.set(user.id, userSessions);

    // Update last login
    user.lastLogin = Date.now();

    this.logins++;
    return session;
  }

  /**
   * Terminate a user session
   */
  logout(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.failures++;
      return false;
    }

    this.sessions.delete(sessionId);
    
    // Remove from user sessions
    const userSessions = this.sessionsByUser.get(session.userId) || [];
    const idx = userSessions.indexOf(sessionId);
    if (idx !== -1) {
      userSessions.splice(idx, 1);
      this.sessionsByUser.set(session.userId, userSessions);
    }

    this.logouts++;
    return true;
  }

  /**
   * Verify if a session is valid
   */
  verify(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.failures++;
      return false;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      this.failures++;
      return false;
    }

    this.verifications++;
    return true;
  }

  /**
   * Get user by user ID
   */
  getUser(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by session ID
   */
  getUserBySession(sessionId: string): User | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return this.users.get(session.userId) || null;
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): AuthSession[] {
    const sessionIds = this.sessionsByUser.get(userId) || [];
    return sessionIds
      .map(id => this.sessions.get(id))
      .filter((s): s is AuthSession => s !== undefined && Date.now() <= s.expiresAt);
  }

  /**
   * Get current snapshot of auth state
   */
  getSnapshot(): AuthSnapshot {
    const usersObj: Record<string, User> = {};
    this.users.forEach((u, id) => { usersObj[id] = u; });

    const sessionsObj: Record<string, AuthSession> = {};
    this.sessions.forEach((s, id) => { sessionsObj[id] = s; });

    return {
      users: usersObj,
      sessions: sessionsObj,
      metrics: {
        totalUsers: this.users.size,
        activeSessions: this.sessions.size,
        logins: this.logins,
        logouts: this.logouts,
        verifications: this.verifications,
        failures: this.failures,
      },
    };
  }

  /**
   * Reset all auth state
   */
  reset(): void {
    this.users.clear();
    this.sessions.clear();
    this.sessionsByUser.clear();
    this.logins = 0;
    this.logouts = 0;
    this.verifications = 0;
    this.failures = 0;
  }

  /**
   * Generate human-readable report
   */
  getReport(): string {
    const snap = this.getSnapshot();
    const lines = [
      '=== Auth Report ===',
      `Total Users: ${snap.metrics.totalUsers}`,
      `Active Sessions: ${snap.metrics.activeSessions}`,
      `Logins: ${snap.metrics.logins}`,
      `Logouts: ${snap.metrics.logouts}`,
      `Verifications: ${snap.metrics.verifications}`,
      `Failures: ${snap.metrics.failures}`,
      '',
      'Users:',
    ];

    if (snap.users && Object.keys(snap.users).length > 0) {
      Object.values(snap.users).forEach(u => {
        lines.push(`  [${u.id}] ${u.username} (${u.email})`);
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
      totalUsers: snap.metrics.totalUsers,
      activeSessions: snap.metrics.activeSessions,
      logins: snap.metrics.logins,
      logouts: snap.metrics.logouts,
      verifications: snap.metrics.verifications,
      failures: snap.metrics.failures,
      users: Object.keys(snap.users).length,
      sessions: Object.keys(snap.sessions).length,
    };
  }
}

export default Auth;