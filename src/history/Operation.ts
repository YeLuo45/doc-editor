/**
 * Operation type definitions for history tracking
 */

export type OperationType = 'insert' | 'delete' | 'format' | 'replace';

export interface Operation {
  type: OperationType;
  position: number;
  content: string;
  timestamp: number;
  userId: string;
}

export function createOperation(
  type: OperationType,
  position: number,
  content: string,
  userId: string
): Operation {
  return {
    type,
    position,
    content,
    timestamp: Date.now(),
    userId
  };
}

export default Operation;
