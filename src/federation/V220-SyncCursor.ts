/**
 * V220 SyncCursor - Direction C Doc Federation (Iter 6/30)
 * thunderbolt: Cursor/selection position sync across devices
 */
export interface CursorPosition {
  docId: string;
  userId: string;
  deviceId: string;
  line: number;
  column: number;
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  timestamp: number;
}

export interface CursorState {
  cursors: Map<string, CursorPosition>;  // key = userId:deviceId
  lastUpdate: number;
}

export function createCursorState(): CursorState {
  return { cursors: new Map(), lastUpdate: 0 };
}

export function updateCursor(state: CursorState, position: CursorPosition): CursorState {
  const key = `${position.userId}:${position.deviceId}`;
  return {
    ...state,
    cursors: new Map(state.cursors).set(key, position),
    lastUpdate: Date.now(),
  };
}

export function removeCursor(state: CursorState, userId: string, deviceId: string): CursorState {
  const key = `${userId}:${deviceId}`;
  const cursors = new Map(state.cursors);
  cursors.delete(key);
  return { ...state, cursors };
}

export function getCursor(state: CursorState, userId: string, deviceId: string): CursorPosition | undefined {
  return state.cursors.get(`${userId}:${deviceId}`);
}

export function getCursorsForDoc(state: CursorState, docId: string): CursorPosition[] {
  return Array.from(state.cursors.values()).filter(c => c.docId === docId);
}

export function getCursorsForUser(state: CursorState, userId: string): CursorPosition[] {
  return Array.from(state.cursors.values()).filter(c => c.userId === userId);
}

export function clearStaleCursors(state: CursorState, maxAge: number = 30000): CursorState {
  const now = Date.now();
  const cursors = new Map(state.cursors);
  for (const [k, c] of Array.from(cursors.entries())) {
    if (now - c.timestamp > maxAge) cursors.delete(k);
  }
  return { ...state, cursors };
}

export function getCursorReport(state: CursorState): { totalCursors: number; byDoc: Record<string, number>; byUser: Record<string, number> } {
  const byDoc: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  for (const c of state.cursors.values()) {
    byDoc[c.docId] = (byDoc[c.docId] || 0) + 1;
    byUser[c.userId] = (byUser[c.userId] || 0) + 1;
  }
  return { totalCursors: state.cursors.size, byDoc, byUser };
}
