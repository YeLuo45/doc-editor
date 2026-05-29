/**
 * V70 Access Control
 * Role-based access control with grant/revoke/check operations
 */

export type RoleType = 'admin' | 'editor' | 'viewer' | 'guest';

export type AccessControlConfig = {
  defaultRole: RoleType;
  enforceHierarchy: boolean;
  maxRolesPerUser: number;
  enableAudit: boolean;
  roleHierarchy: Record<RoleType, number>;
};

interface Role {
  name: RoleType;
  permissions: string[];
  description: string;
}

interface AccessEntry {
  userId: string;
  resourceId: string;
  roles: RoleType[];
  grantedAt: Date;
  grantedBy: string;
}

export class AccessControl {
  readonly config: AccessControlConfig;
  private roles: Map<RoleType, Role> = new Map();
  private accessList: AccessEntry[] = [];
  private metrics = {
    grants: 0,
    revokes: 0,
    checks: 0,
    denied: 0,
  };

  constructor(config: AccessControlConfig) {
    this.config = config;
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        name: 'admin',
        permissions: ['read', 'write', 'delete', 'manage', 'configure'],
        description: 'Full administrative access',
      },
      {
        name: 'editor',
        permissions: ['read', 'write', 'comment'],
        description: 'Can edit and create content',
      },
      {
        name: 'viewer',
        permissions: ['read'],
        description: 'Read-only access',
      },
      {
        name: 'guest',
        permissions: [],
        description: 'No permissions',
      },
    ];
    defaultRoles.forEach((r) => this.roles.set(r.name, r));
  }

  async grant(
    userId: string,
    resourceId: string,
    role: RoleType,
    grantedBy: string
  ): Promise<boolean> {
    this.metrics.grants++;

    const userRoleCount = this.accessList.filter((e) => e.userId === userId).length;
    if (userRoleCount >= this.config.maxRolesPerUser) {
      this.metrics.denied++;
      return false;
    }

    const existingIndex = this.accessList.findIndex(
      (e) => e.userId === userId && e.resourceId === resourceId && e.roles.includes(role)
    );
    if (existingIndex >= 0) {
      return true;
    }

    const entry: AccessEntry = {
      userId,
      resourceId,
      roles: [role],
      grantedAt: new Date(),
      grantedBy,
    };
    this.accessList.push(entry);

    if (this.config.enforceHierarchy) {
      await this.promoteBasedOnHierarchy(userId, resourceId);
    }

    return true;
  }

  async revoke(userId: string, resourceId: string, role: RoleType): Promise<boolean> {
    this.metrics.revokes++;

    const index = this.accessList.findIndex(
      (e) => e.userId === userId && e.resourceId === resourceId && e.roles.includes(role)
    );
    if (index < 0) {
      this.metrics.denied++;
      return false;
    }

    const entry = this.accessList[index];
    entry.roles = entry.roles.filter((r) => r !== role);
    if (entry.roles.length === 0) {
      this.accessList.splice(index, 1);
    }

    return true;
  }

  async check(userId: string, resourceId: string, permission: string): Promise<boolean> {
    this.metrics.checks++;

    const entries = this.accessList.filter(
      (e) => e.userId === userId && e.resourceId === resourceId
    );
    if (entries.length === 0) {
      this.metrics.denied++;
      return false;
    }

    for (const entry of entries) {
      for (const roleName of entry.roles) {
        const role = this.roles.get(roleName);
        if (role && role.permissions.includes(permission)) {
          return true;
        }
      }
    }

    this.metrics.denied++;
    return false;
  }

  async getRoles(userId: string, resourceId?: string): Promise<RoleType[]> {
    const entries = resourceId
      ? this.accessList.filter((e) => e.userId === userId && e.resourceId === resourceId)
      : this.accessList.filter((e) => e.userId === userId);

    const roles = new Set<RoleType>();
    entries.forEach((e) => e.roles.forEach((r) => roles.add(r)));
    return Array.from(roles);
  }

  private async promoteBasedOnHierarchy(userId: string, resourceId: string): Promise<void> {
    const entries = this.accessList.filter(
      (e) => e.userId === userId && e.resourceId === resourceId
    );
    const topRole = entries
      .flatMap((e) => e.roles)
      .sort((a, b) => {
        const hierarchy = this.config.roleHierarchy;
        return (hierarchy[b] || 0) - (hierarchy[a] || 0);
      })[0];

    if (topRole) {
      entries.forEach((e) => {
        if (!e.roles.includes(topRole)) {
          e.roles.push(topRole);
        }
      });
    }
  }

  getSnapshot(): { metrics: typeof this.metrics; roleCount: number; accessCount: number } {
    return {
      metrics: { ...this.metrics },
      roleCount: this.roles.size,
      accessCount: this.accessList.length,
    };
  }

  reset(): void {
    this.accessList = [];
    this.metrics = { grants: 0, revokes: 0, checks: 0, denied: 0 };
  }

  getReport(): string {
    const snapshot = this.getSnapshot();
    return `AccessControl Report:
- Defined Roles: ${snapshot.roleCount}
- Access Entries: ${snapshot.accessCount}
- Grants: ${snapshot.metrics.grants}
- Revokes: ${snapshot.metrics.revokes}
- Checks: ${snapshot.metrics.checks}
- Denied: ${snapshot.metrics.denied}`;
  }

  exportMetrics(): { version: string; [key: string]: unknown } {
    return {
      version: 'V70',
      ...this.getSnapshot(),
    };
  }
}