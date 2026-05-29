/**
 * V42 Iteration 12 - Node Module
 */

export type NodeState = 'online' | 'offline';
export type NodeConfig = { name?: string };
export type NodeSnapshot = { id: string; state: NodeState };
export type NodeMetrics = { version: string };

export class Node {
  config: NodeConfig;
  private state: NodeState = 'offline';
  readonly id: string;

  constructor(id: string, config: NodeConfig = {}) {
    this.id = id;
    this.config = config;
  }

  online(): void { this.state = 'online'; }
  offline(): void { this.state = 'offline'; }
  getState(): NodeState { return this.state; }
  getSnapshot(): NodeSnapshot { return { id: this.id, state: this.state }; }
  reset(): void { this.state = 'offline'; }
  getReport(): string { return `Node[${this.id}, state=${this.state}]`; }
  exportMetrics(): NodeMetrics { return { version: 'V42-I12' }; }
}
