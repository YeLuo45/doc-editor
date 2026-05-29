/**
 * V70 Security Manager
 * Central authentication and authorization service
 */

export type SecurityConfig = {
  authProvider: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  enableMfa: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
};

interface User {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
}

interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

interface AuthSession {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SecurityManager {
  private config: SecurityConfig;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private metrics = {
    authentications: 0,
    authorizations: 0,
    validations: 0,
    failures: 0,
  };

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers(): void {
    const defaultUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        roles: ['admin', 'editor'],
        permissions: ['read', 'write', 'delete', 'manage'],
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '2',
        username: 'editor',
        roles: ['editor'],
        permissions: ['read', 'write'],
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '3',
        username: 'viewer',
        roles: ['viewer'],
        permissions: ['read'],
        lastLogin: new Date(),
        isActive: true,
      },
    ];
    defaultUsers.forEach((u) => this.users.set(u.username, u));
  }

  async authenticate(username: string, password: string): Promise<AuthResult> {
    this.metrics.authentications++;

    const attempts = this.loginAttempts.get(username) || 0;
    if (attempts >= this.config.maxLoginAttempts) {
      this.metrics.failures++;
      return { success: false, error: 'Account locked due to too many attempts' };
    }

    const user = this.users.get(username);
    if (!user || !user.isActive) {
      this.loginAttempts.set(username, attempts + 1);
      this.metrics.failures++;
      return { success: false, error: 'Invalid credentials' };
    }

    const token = `token_${username}_${Date.now()}`;
    const session: AuthSession = {
      id: `session_${Date.now()}`,
      userId: user.id,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout),
    };

    this.sessions.set(token, session);
    user.lastLogin = new Date();
    this.loginAttempts.set(username, 0);

    return { success: true, token, user };
  }

  async authorize(token: string, permission: string): Promise<boolean> {
    this.metrics.authorizations++;

    const session = this.sessions.get(token);
    if (!session) return false;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return false;
    }

    const user = this.users.get(
      [...this.users.values()].find((u) => u.id === session.userId)?.username || ''
    );
    if (!user || !user.isActive) return false;

    return user.permissions.includes(permission);
  }

  async validate(token: string): Promise<boolean> {
    this.metrics.validations++;

    const session = this.sessions.get(token);
    if (!session) return false;

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      this.metrics.failures++;
      return false;
    }

    return true;
  }

  async getPermissions(userId: string): Promise<string[]> {
    const user = [...this.users.values()].find((u) => u.id === userId);
    return user?.permissions || [];
  }

  getSnapshot(): { metrics: typeof this.metrics; sessionCount: number; userCount: number } {
    return {
      metrics: { ...this.metrics },
      sessionCount: this.sessions.size,
      userCount: this.users.size,
    };
  }

  reset(): void {
    this.sessions.clear();
    this.loginAttempts.clear();
    this.metrics = { authentications: 0, authorizations: 0, validations: 0, failures: 0 };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `SecurityManager Report:
- Users: ${snapshot.userCount}
- Active Sessions: ${snapshot.sessionCount}
- Authentications: ${snapshot.metrics.authentications}
- Authorizations: ${snapshot.metrics.authorizations}
- Validations: ${snapshot.metrics.validations}
- Failures: ${snapshot.metrics.failures}`;
  }

  exportMetrics(): { version: string; [key: string]: unknown } {
    return {
      version: 'V70',
      ...this.getSnapshot(),
    };
  }
}