import { describe, it, expect } from 'vitest';
import {
  createVersionState, parseVersion, formatVersion, bumpVersion, compareVersions,
  publishVersion, getVersionHistory, getLatestVersion, recordBump, getVersionReport,
} from '../../forge/V195-AgentVersioning';

describe('V195 AgentVersioning', () => {
  it('should create empty state', () => {
    const s = createVersionState();
    expect(s.agents.size).toBe(0);
  });

  it('should parse simple version', () => {
    const v = parseVersion('1.2.3');
    expect(v.major).toBe(1);
    expect(v.minor).toBe(2);
    expect(v.patch).toBe(3);
  });

  it('should parse prerelease version', () => {
    const v = parseVersion('1.0.0-alpha.1');
    expect(v.prerelease).toBe('alpha.1');
  });

  it('should format version', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
    expect(formatVersion({ major: 1, minor: 0, patch: 0, prerelease: 'rc1' })).toBe('1.0.0-rc1');
  });

  it('should bump major version', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('should bump minor version', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('should bump patch version', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4');
  });

  it('should compare versions', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('should publish version', () => {
    let s = createVersionState();
    s = publishVersion(s, 'agent1', '1.0.0', 'Initial release');
    expect(s.agents.size).toBe(1);
  });

  it('should get version history', () => {
    let s = createVersionState();
    s = publishVersion(s, 'a', '1.0.0', 'init');
    s = publishVersion(s, 'a', '1.1.0', 'add feature');
    expect(getVersionHistory(s, 'a')).toHaveLength(2);
  });

  it('should get latest version', () => {
    let s = createVersionState();
    s = publishVersion(s, 'a', '1.0.0', 'init');
    s = publishVersion(s, 'a', '2.0.0', 'major');
    expect(getLatestVersion(s, 'a')!.version).toBe('2.0.0');
  });

  it('should record bump', () => {
    let s = createVersionState();
    s = recordBump(s, 'major');
    s = recordBump(s, 'minor');
    s = recordBump(s, 'minor');
    const r = getVersionReport(s);
    expect(r.byBump.minor).toBe(2);
  });
});
