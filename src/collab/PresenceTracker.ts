/**
 * PresenceTracker.ts
 * Tracks active users, cursor positions, and selection ranges
 * for real-time collaborative presence
 */

export interface CursorPosition {
  position: number;
  line?: number;
  column?: number;
}

export interface SelectionRange {
  start: number;
  end: number;
}

export interface UserPresence {
  userId: string;
  userName: string;
  color: string;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
  lastActive: number;
  isOnline: boolean;
}

export interface PresenceState {
  users: Map<string, UserPresence>;
  totalUsers: number;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export class PresenceTracker {
  private users: Map<string, UserPresence> = new Map();
  private colorIndex = 0;

  constructor(_nodeId: string) {
    // nodeId for future use
  }

  getColor(): string {
    const color = COLORS[this.colorIndex % COLORS.length];
    this.colorIndex++;
    return color;
  }

  join(userId: string, userName: string): UserPresence {
    const existing = this.users.get(userId);
    if (existing) {
      existing.isOnline = true;
      existing.lastActive = Date.now();
      existing.userName = userName;
      return existing;
    }

    const presence: UserPresence = {
      userId,
      userName,
      color: this.getColor(),
      cursor: null,
      selection: null,
      lastActive: Date.now(),
      isOnline: true,
    };

    this.users.set(userId, presence);
    return presence;
  }

  leave(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = false;
      user.lastActive = Date.now();
    }
  }

  updateCursor(userId: string, cursor: CursorPosition | null): void {
    const user = this.users.get(userId);
    if (user) {
      user.cursor = cursor;
      user.lastActive = Date.now();
    }
  }

  updateSelection(userId: string, selection: SelectionRange | null): void {
    const user = this.users.get(userId);
    if (user) {
      user.selection = selection;
      user.lastActive = Date.now();
    }
  }

  updatePresence(userId: string, presence: Partial<UserPresence>): void {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, presence, { lastActive: Date.now() });
    }
  }

  getUser(userId: string): UserPresence | undefined {
    return this.users.get(userId);
  }

  getOnlineUsers(): UserPresence[] {
    return Array.from(this.users.values()).filter((u) => u.isOnline);
  }

  getAllUsers(): UserPresence[] {
    return Array.from(this.users.values());
  }

  isOnline(userId: string): boolean {
    const user = this.users.get(userId);
    return user?.isOnline ?? false;
  }

  removeUser(userId: string): void {
    this.users.delete(userId);
  }

  clear(): void {
    this.users.clear();
  }

  getState(): PresenceState {
    return {
      users: new Map(this.users),
      totalUsers: this.users.size,
    };
  }

  loadState(state: PresenceState): void {
    this.users = new Map(state.users);
    this.colorIndex = state.totalUsers % COLORS.length;
  }

  mergeRemote(remoteUsers: Map<string, UserPresence>): void {
    for (const [userId, remote] of remoteUsers) {
      const local = this.users.get(userId);
      if (!local) {
        this.users.set(userId, remote);
      } else {
        if (remote.lastActive > local.lastActive) {
          this.users.set(userId, remote);
        }
      }
    }
  }

  getUsersAtPosition(position: number): UserPresence[] {
    return this.getOnlineUsers().filter((user) => {
      if (!user.cursor) return false;
      return user.cursor.position === position;
    });
  }

  getUsersWithSelectionAt(position: number): UserPresence[] {
    return this.getOnlineUsers().filter((user) => {
      if (!user.selection) return false;
      const { start, end } = user.selection;
      return position >= Math.min(start, end) && position <= Math.max(start, end);
    });
  }

  toBroadcastPayload(): Record<string, UserPresence> {
    const payload: Record<string, UserPresence> = {};
    for (const [userId, presence] of this.users) {
      payload[userId] = presence;
    }
    return payload;
  }
}

export default PresenceTracker;
