import type { L3Skill } from '../types';

const STORAGE_KEY = 'doc-editor-L3-skills';
const MAX_SKILLS = 50;

export function getL3Skills(): L3Skill[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function setL3Skills(skills: L3Skill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills.slice(0, MAX_SKILLS)));
}

export function saveSkill(skill: Omit<L3Skill, 'id' | 'createdAt' | 'usageCount'>): L3Skill {
  const skills = getL3Skills();
  const newSkill: L3Skill = {
    ...skill,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
    usageCount: 0,
  };
  skills.unshift(newSkill);
  setL3Skills(skills);
  return newSkill;
}

export function incrementSkillUsage(skillId: string): void {
  const skills = getL3Skills();
  const skill = skills.find(s => s.id === skillId);
  if (skill) {
    skill.usageCount++;
    setL3Skills(skills);
  }
}