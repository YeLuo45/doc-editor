import { describe, it, expect, beforeEach } from 'vitest';
import { getL0Meta, addL0Rule } from '../memory/layers/L0Meta';
import { registerSkillRoute, findSkillRoute } from '../memory/layers/L1Index';
import { setUserPreference, getUserPreference } from '../memory/layers/L2Facts';
import { getL3Skills, saveSkill } from '../memory/layers/L3Skills';
import { saveSession, getRecentValidSessions } from '../memory/layers/L4Sessions';

describe('L0 Layer', () => {
  beforeEach(() => localStorage.clear());
  
  it('should return default L0 meta', () => {
    const meta = getL0Meta();
    expect(meta.rules.length).toBeGreaterThan(0);
    expect(meta.version).toBe('1.0');
  });

  it('should add rule', () => {
    addL0Rule('Test rule');
    const meta = getL0Meta();
    expect(meta.rules).toContain('Test rule');
  });
});

describe('L1 Layer', () => {
  beforeEach(() => localStorage.clear());
  
  it('should register and find skill route', () => {
    registerSkillRoute('format', 'format-skill-1');
    expect(findSkillRoute('how to format document')).toBe('format-skill-1');
  });

  it('should return undefined for unknown route', () => {
    expect(findSkillRoute('unknown task')).toBeUndefined();
  });
});

describe('L2 Layer', () => {
  beforeEach(() => localStorage.clear());
  
  it('should set and get user preference', () => {
    setUserPreference('theme', 'dark');
    expect(getUserPreference('theme')).toBe('dark');
  });
});

describe('L3 Layer', () => {
  beforeEach(() => localStorage.clear());
  
  it('should save and retrieve skills', () => {
    saveSkill({ name: 'Test Skill', description: 'desc', steps: ['step1', 'step2'] });
    const skills = getL3Skills();
    expect(skills.length).toBe(1);
    expect(skills[0].name).toBe('Test Skill');
  });
});

describe('L4 Layer', () => {
  beforeEach(() => localStorage.clear());
  
  it('should save and retrieve sessions', () => {
    saveSession({ startedAt: Date.now() - 60000, endedAt: Date.now(), messageCount: 10, contextSummary: 'test', isActive: false });
    const sessions = getRecentValidSessions();
    expect(sessions.length).toBe(1);
  });
});