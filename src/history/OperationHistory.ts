/**
 * Operation history manager
 */

import { Operation } from './Operation';

export class OperationHistory {
  private history: Operation[] = [];

  push(op: Operation): void {
    this.history.push(op);
  }

  getHistory(): Operation[] {
    return [...this.history];
  }

  undo(): Operation | undefined {
    return this.history.pop();
  }

  clear(): void {
    this.history = [];
  }

  getHistorySince(timestamp: number): Operation[] {
    return this.history.filter(op => op.timestamp >= timestamp);
  }

  get length(): number {
    return this.history.length;
  }
}

export default OperationHistory;
