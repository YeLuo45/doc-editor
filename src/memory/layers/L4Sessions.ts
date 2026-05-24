import type { L4Session } from '../types';

const STORAGE_KEY = 'doc-editor-L4-sessions';
const MAX_SESSIONS = 20;
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function getL4Sessions(): L4Session[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function setL4Sessions(sessions: L4Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}

export function saveSession(session: Omit<L4Session, 'id'>): L4Session {
  const sessions = getL4Sessions();
  const newSession: L4Session = {
    ...session,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
  };
  sessions.unshift(newSession);
  setL4Sessions(sessions);
  return newSession;
}

export function getActiveSession(): L4Session | undefined {
  return getL4Sessions().find(s => s.isActive);
}

export function getRecentValidSessions(): L4Session[] {
  const now = Date.now();
  return getL4Sessions().filter(s => !s.isActive && (now - s.endedAt) < SESSION_EXPIRY_MS);
}

export function setSessionActive(sessionId: string, active: boolean): void {
  const sessions = getL4Sessions();
  const session = sessions.find(s => s.id === sessionId);
  if (session) {
    session.isActive = active;
    if (active) session.startedAt = Date.now();
    else session.endedAt = Date.now();
    setL4Sessions(sessions);
  }
}