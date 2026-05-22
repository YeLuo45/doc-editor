import { Role, Permission, User } from './types';

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ['read', 'write', 'delete', 'manage_permissions', 'share', 'export'],
  editor: ['read', 'write', 'export'],
  reviewer: ['read', 'write_comments'],
  viewer: ['read_only'],
};

export function checkPermission(user: User, permission: Permission): boolean {
  const rolePermissions = PERMISSIONS[user.role];
  return rolePermissions.includes(permission);
}

export function requirePermission(user: User, permission: Permission): void {
  if (!checkPermission(user, permission)) {
    throw new Error(`User ${user.id} does not have permission: ${permission}`);
  }
}
