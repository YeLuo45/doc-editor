export type Role = 'owner' | 'editor' | 'reviewer' | 'viewer';

export type Permission = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'manage_permissions' 
  | 'share' 
  | 'export' 
  | 'write_comments' 
  | 'read_only';

export interface User {
  id: string;
  name: string;
  role: Role;
}
