import type { L1Index } from '../types';

const STORAGE_KEY = 'doc-editor-L1-index';

export function getL1Index(): L1Index {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { skillRoutes: {} };
  } catch { return { skillRoutes: {} }; }
}

export function setL1Index(index: L1Index): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

export function registerSkillRoute(taskPattern: string, skillId: string): void {
  const index = getL1Index();
  index.skillRoutes[taskPattern] = skillId;
  setL1Index(index);
}

export function findSkillRoute(task: string): string | undefined {
  const index = getL1Index();
  for (const [pattern, skillId] of Object.entries(index.skillRoutes)) {
    if (task.includes(pattern)) return skillId;
  }
  return undefined;
}