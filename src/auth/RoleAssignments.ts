import { Role, User } from './types';

const STORAGE_KEY = 'doc-editor-role-assignments';

function getAssignments(): Record<string, Role> {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

function saveAssignments(assignments: Record<string, Role>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
}

export function assignRole(userId: string, role: Role): void {
  const assignments = getAssignments();
  assignments[userId] = role;
  saveAssignments(assignments);
}

export function getRole(userId: string): Role | undefined {
  const assignments = getAssignments();
  return assignments[userId];
}

export function getUsersByRole(role: Role): User[] {
  const assignments = getAssignments();
  return Object.entries(assignments)
    .filter(([, r]) => r === role)
    .map(([id, r]) => ({ id, name: id, role: r }));
}
