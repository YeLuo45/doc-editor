/**
 * V48 Iteration 18 - Tree Module
 */

export type TreeConfig = { root?: string };
export type TreeSnapshot = { root: string; nodes: number };
export type TreeMetrics = { version: string };

export class Tree {
  config: TreeConfig;
  private root: string;
  private children: Map<string, string[]> = new Map();

  constructor(root: string, config: TreeConfig = {}) {
    this.root = root;
    this.config = config;
  }

  addChild(parent: string, child: string): boolean {
    if (!this.children.has(parent)) this.children.set(parent, []);
    this.children.get(parent)!.push(child);
    return true;
  }
  getChildren(parent: string): string[] { return [...(this.children.get(parent) || [])]; }
  hasNode(id: string): boolean {
    if (id === this.root) return true;
    for (const children of this.children.values()) {
      if (children.includes(id)) return true;
    }
    return false;
  }
  getRoot(): string { return this.root; }
  getSnapshot(): TreeSnapshot { return { root: this.root, nodes: this.children.size + 1 }; }
  reset(): void { this.children.clear(); }
  getReport(): string { return `Tree[root=${this.root}, nodes=${this.getSnapshot().nodes}]`; }
  exportMetrics(): TreeMetrics { return { version: 'V48-I18' }; }
}
