import type { L2Facts } from '../types';

const STORAGE_KEY = 'doc-editor-L2-facts';

export function getL2Facts(): L2Facts {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { userPreferences: {}, environment: {} };
  } catch { return { userPreferences: {}, environment: {} }; }
}

export function setL2Facts(facts: L2Facts): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
}

export function setUserPreference(key: string, value: unknown): void {
  const facts = getL2Facts();
  facts.userPreferences[key] = value;
  setL2Facts(facts);
}

export function getUserPreference(key: string): unknown {
  return getL2Facts().userPreferences[key];
}