/**
 * CollabRoom.ts
 * Room management for collaborative editing sessions
 */

import type { Operation } from './OperationTransform.js';

export interface CollabRoomOptions {
  roomId: string;
  maxUsers?: number;
  autoDelete?: boolean;
}

export interface RoomState {
  roomId: string;
  documentId: string;
  activeUsers: string[];
  createdAt: number;
  isActive: boolean;
}

type BroadcastHandler = (userId: string, data: unknown) => void;
type JoinHandler = (userId: string, userName: string) => void;
type LeaveHandler = (userId: string) => void;
type OperationHandler = (op: Operation, userId: string) => void;

export class CollabRoom {
  readonly roomId: string;
  readonly documentId: string;
  private maxUsers: number;
  private autoDelete: boolean;
  private activeUsers: Set<string> = new Set();
  private createdAt: number;
  private isActive: boolean = true;
  private broadcastHandler?: BroadcastHandler;
  private joinHandler?: JoinHandler;
  private leaveHandler?: LeaveHandler;
  private operationHandler?: OperationHandler;

  constructor(documentId: string, options: CollabRoomOptions) {
    this.roomId = options.roomId;
    this.documentId = documentId;
    this.maxUsers = options.maxUsers ?? 50;
    this.autoDelete = options.autoDelete ?? false;
    this.createdAt = Date.now();
  }

  onBroadcast(handler: BroadcastHandler): void {
    this.broadcastHandler = handler;
  }

  onJoin(handler: JoinHandler): void {
    this.joinHandler = handler;
  }

  onLeave(handler: LeaveHandler): void {
    this.leaveHandler = handler;
  }

  onOperation(handler: OperationHandler): void {
    this.operationHandler = handler;
  }

  join(userId: string, userName: string): boolean {
    if (!this.isActive) return false;
    if (this.activeUsers.size >= this.maxUsers) return false;

    this.activeUsers.add(userId);
    this.joinHandler?.(userId, userName);
    return true;
  }

  leave(userId: string): void {
    this.activeUsers.delete(userId);
    this.leaveHandler?.(userId);

    if (this.autoDelete && this.activeUsers.size === 0) {
      this.close();
    }
  }

  broadcast(senderId: string, data: unknown): void {
    this.broadcastHandler?.(senderId, data);
  }

  broadcastOperation(op: Operation, senderId: string): void {
    this.operationHandler?.(op, senderId);
  }

  hasUser(userId: string): boolean {
    return this.activeUsers.has(userId);
  }

  getActiveUsers(): string[] {
    return Array.from(this.activeUsers);
  }

  getUserCount(): number {
    return this.activeUsers.size;
  }

  isRoomActive(): boolean {
    return this.isActive;
  }

  close(): void {
    this.isActive = false;
    this.activeUsers.clear();
  }

  getState(): RoomState {
    return {
      roomId: this.roomId,
      documentId: this.documentId,
      activeUsers: Array.from(this.activeUsers),
      createdAt: this.createdAt,
      isActive: this.isActive,
    };
  }
}

// Room Manager
export class CollabRoomManager {
  private rooms: Map<string, CollabRoom> = new Map();
  private userRooms: Map<string, string> = new Map();

  createRoom(documentId: string, options: CollabRoomOptions): CollabRoom {
    const room = new CollabRoom(documentId, options);
    this.rooms.set(options.roomId, room);
    return room;
  }

  getRoom(roomId: string): CollabRoom | undefined {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  userJoin(userId: string, roomId: string, userName: string): CollabRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const joined = room.join(userId, userName);
    if (joined) {
      const prevRoomId = this.userRooms.get(userId);
      if (prevRoomId && prevRoomId !== roomId) {
        const prevRoom = this.rooms.get(prevRoomId);
        prevRoom?.leave(userId);
      }

      this.userRooms.set(userId, roomId);
    }

    return joined ? room : null;
  }

  userLeave(userId: string): void {
    const roomId = this.userRooms.get(userId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      room?.leave(userId);
      this.userRooms.delete(userId);
    }
  }

  getUserRoom(userId: string): CollabRoom | undefined {
    const roomId = this.userRooms.get(userId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getAllRooms(): CollabRoom[] {
    return Array.from(this.rooms.values());
  }

  getActiveRooms(): CollabRoom[] {
    return this.getAllRooms().filter((r) => r.isRoomActive());
  }

  clear(): void {
    this.rooms.clear();
    this.userRooms.clear();
  }
}

export default CollabRoom;
