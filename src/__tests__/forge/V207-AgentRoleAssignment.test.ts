import { describe, it, expect } from 'vitest';
import {
  createRoleState, defineTaskRoles, assignRole, unassignRole,
  getAssignmentsForTask, getAssignmentsForAgent, getBestAgentForRole, clearAssignments, getRoleReport,
} from '../../forge/V207-AgentRoleAssignment';

describe('V207 AgentRoleAssignment', () => {
  it('should create empty state', () => {
    const s = createRoleState();
    expect(s.assignments).toHaveLength(0);
  });

  it('should define task roles', () => {
    let s = createRoleState();
    s = defineTaskRoles(s, 'task1', ['primary', 'reviewer']);
    expect(s.taskRoles.size).toBe(1);
  });

  it('should assign role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    expect(s.assignments).toHaveLength(1);
  });

  it('should unassign role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    s = unassignRole(s, 'a1', 'task1', 'primary');
    expect(s.assignments).toHaveLength(0);
  });

  it('should get assignments for task', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    s = assignRole(s, 'a2', 'task1', 'reviewer', 0.8);
    expect(getAssignmentsForTask(s, 'task1')).toHaveLength(2);
  });

  it('should get assignments for agent', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    s = assignRole(s, 'a1', 'task2', 'primary', 0.9);
    expect(getAssignmentsForAgent(s, 'a1')).toHaveLength(2);
  });

  it('should get best agent for role', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.5);
    s = assignRole(s, 'a2', 'task1', 'primary', 0.9);
    const best = getBestAgentForRole(s, 'task1', 'primary');
    expect(best!.agentId).toBe('a2');
  });

  it('should track role in taskRoles', () => {
    let s = createRoleState();
    s = defineTaskRoles(s, 'task1', ['primary']);
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    expect(s.taskRoles.get('task1')).toContain('primary');
  });

  it('should clear assignments', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'primary', 0.9);
    s = clearAssignments(s);
    expect(s.assignments).toHaveLength(0);
  });

  it('should produce report', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 't1', 'primary', 0.9);
    s = assignRole(s, 'a2', 't1', 'reviewer', 0.8);
    const r = getRoleReport(s);
    expect(r.total).toBe(2);
    expect(r.byRole.primary).toBe(1);
    expect(r.uniqueAgents).toBe(2);
    expect(r.uniqueTasks).toBe(1);
  });

  it('should add new role to taskRoles on assign', () => {
    let s = createRoleState();
    s = assignRole(s, 'a1', 'task1', 'observer', 0.5);
    expect(s.taskRoles.get('task1')).toContain('observer');
  });
});
