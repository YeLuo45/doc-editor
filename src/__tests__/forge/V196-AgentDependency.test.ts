import { describe, it, expect } from 'vitest';
import {
  createDependencyState, registerAgentDeps, addAvailablePackage,
  resolveDependencies, getUnresolvedDeps, hasUnresolvedRequiredDeps, getDependencyReport,
  type Dependency,
} from '../../forge/V196-AgentDependency';

describe('V196 AgentDependency', () => {
  it('should create empty state', () => {
    const s = createDependencyState();
    expect(s.agents.size).toBe(0);
  });

  it('should register agent deps', () => {
    let s = createDependencyState();
    s = registerAgentDeps(s, 'a', [{ name: 'tool1', type: 'tool', versionRange: '1.0.0', required: true }]);
    expect(s.agents.size).toBe(1);
  });

  it('should add available package', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 'tool1', ['1.0.0', '1.1.0', '2.0.0']);
    expect(s.available.get('tool1')!.latest).toBe('2.0.0');
  });

  it('should resolve exact version', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 't', ['1.0.0', '1.1.0']);
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '1.0.0', required: true }]);
    s = resolveDependencies(s, 'a');
    expect(s.agents.get('a')!.resolved.size).toBe(1);
  });

  it('should resolve caret range', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 't', ['1.0.0', '1.5.0', '2.0.0']);
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '^1.0.0', required: true }]);
    s = resolveDependencies(s, 'a');
    const resolved = s.agents.get('a')!.resolved.get('t');
    expect(resolved).toBeDefined();
  });

  it('should mark unresolved if not found', () => {
    let s = createDependencyState();
    s = registerAgentDeps(s, 'a', [{ name: 'missing', type: 'tool', versionRange: '1.0.0', required: true }]);
    s = resolveDependencies(s, 'a');
    expect(getUnresolvedDeps(s, 'a')).toContain('missing');
  });

  it('should check hasUnresolvedRequiredDeps', () => {
    let s = createDependencyState();
    s = registerAgentDeps(s, 'a', [{ name: 'missing', type: 'tool', versionRange: '1.0.0', required: true }]);
    s = resolveDependencies(s, 'a');
    expect(hasUnresolvedRequiredDeps(s, 'a')).toBe(true);
  });

  it('should fallback to latest for optional dep', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 't', ['1.0.0', '2.0.0']);
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '3.0.0', required: false }]);
    s = resolveDependencies(s, 'a');
    const resolved = s.agents.get('a')!.resolved.get('t');
    expect(resolved!.source).toBe('fallback');
  });

  it('should resolve wildcard range', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 't', ['1.0.0']);
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '*', required: true }]);
    s = resolveDependencies(s, 'a');
    expect(s.agents.get('a')!.resolved.size).toBe(1);
  });

  it('should resolve tilde range', () => {
    let s = createDependencyState();
    s = addAvailablePackage(s, 't', ['1.2.0', '1.2.5', '1.3.0']);
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '~1.2.0', required: true }]);
    s = resolveDependencies(s, 'a');
    expect(s.agents.get('a')!.resolved.size).toBe(1);
  });

  it('should produce report', () => {
    let s = createDependencyState();
    s = registerAgentDeps(s, 'a', [{ name: 't', type: 'tool', versionRange: '1.0.0', required: true }]);
    const r = getDependencyReport(s);
    expect(r.agents).toBe(1);
  });
});
