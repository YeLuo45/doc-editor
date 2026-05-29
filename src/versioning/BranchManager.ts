/**
 * V58 Versioning System - BranchManager
 * Branch handling with create/delete/switch/getBranches
 */

export interface BranchConfig {
  defaultBranch: string;
  allowDeleteMain: boolean;
  maxBranches: number;
  autoMerge: boolean;
}

export interface Branch {
  id: string;
  name: string;
  createdAt: number;
  headVersionId: string | null;
  parentBranchId: string | null;
  metadata: Record<string, unknown>;
}

export class BranchManager {
  private _config: BranchConfig;
  private _branches: Map<string, Branch> = new Map();
  private _currentBranchId: string | null = null;
  private _versionBranchMap: Map<string, string> = new Map();

  constructor(config: Partial<BranchConfig> = {}) {
    this._config = {
      defaultBranch: config.defaultBranch ?? 'main',
      allowDeleteMain: config.allowDeleteMain ?? false,
      maxBranches: config.maxBranches ?? 50,
      autoMerge: config.autoMerge ?? false,
    };
    this.initializeDefaultBranch();
  }

  get config(): BranchConfig {
    return { ...this._config };
  }

  private initializeDefaultBranch(): void {
    const defaultBranch = this.createBranchInternal(this._config.defaultBranch, null, {});
    this._currentBranchId = defaultBranch.id;
  }

  private createBranchInternal(name: string, parentId: string | null, metadata: Record<string, unknown>): Branch {
    const branch: Branch = {
      id: `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: Date.now(),
      headVersionId: null,
      parentBranchId: parentId,
      metadata,
    };
    this._branches.set(branch.id, branch);
    return branch;
  }

  create(name: string, fromBranchId?: string, metadata: Record<string, unknown> = {}): Branch {
    if (this._branches.size >= this._config.maxBranches) {
      throw new Error(`Maximum number of branches (${this._config.maxBranches}) reached`);
    }
    if (this.getByName(name)) {
      throw new Error(`Branch with name '${name}' already exists`);
    }

    let parentId: string | null = null;
    if (fromBranchId) {
      const parentBranch = this._branches.get(fromBranchId);
      if (!parentBranch) {
        throw new Error(`Source branch '${fromBranchId}' not found`);
      }
      parentId = parentBranch.id;
    } else if (this._currentBranchId) {
      parentId = this._currentBranchId;
    }

    return this.createBranchInternal(name, parentId, metadata);
  }

  delete(branchId: string): boolean {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return false;
    }
    if (branch.name === this._config.defaultBranch && !this._config.allowDeleteMain) {
      throw new Error('Cannot delete the default branch');
    }
    if (this._currentBranchId === branchId) {
      throw new Error('Cannot delete the current branch');
    }

    this._branches.delete(branchId);
    this._versionBranchMap.forEach((bid, vid) => {
      if (bid === branchId) this._versionBranchMap.delete(vid);
    });
    return true;
  }

  switch(branchId: string): boolean {
    const branch = this._branches.get(branchId);
    if (!branch) {
      return false;
    }
    this._currentBranchId = branchId;
    return true;
  }

  getBranches(): Branch[] {
    return Array.from(this._branches.values());
  }

  getCurrentBranch(): Branch | undefined {
    if (!this._currentBranchId) return undefined;
    return this._branches.get(this._currentBranchId);
  }

  getByName(name: string): Branch | undefined {
    return Array.from(this._branches.values()).find(b => b.name === name);
  }

  getById(id: string): Branch | undefined {
    return this._branches.get(id);
  }

  setBranchHead(branchId: string, versionId: string): void {
    const branch = this._branches.get(branchId);
    if (branch) {
      branch.headVersionId = versionId;
      this._versionBranchMap.set(versionId, branchId);
    }
  }

  getBranchForVersion(versionId: string): Branch | undefined {
    const branchId = this._versionBranchMap.get(versionId);
    if (!branchId) return undefined;
    return this._branches.get(branchId);
  }

  getSnapshot(): { totalBranches: number; currentBranch: string | null } {
    return {
      totalBranches: this._branches.size,
      currentBranch: this._currentBranchId,
    };
  }

  reset(): void {
    this._branches.clear();
    this._currentBranchId = null;
    this._versionBranchMap.clear();
    this.initializeDefaultBranch();
  }

  getReport(): string {
    const lines = [
      '=== BranchManager Report ===',
      `Total branches: ${this._branches.size}`,
      `Current branch: ${this.getCurrentBranch()?.name ?? 'none'}`,
      `Default branch: ${this._config.defaultBranch}`,
      `Max branches: ${this._config.maxBranches}`,
      `Branches:`,
    ];
    this._branches.forEach(br => {
      const marker = br.id === this._currentBranchId ? ' * ' : '   ';
      lines.push(`${marker}${br.name} (${br.id})`);
    });
    return lines.join('\n');
  }

  exportMetrics(): { version: string; metrics: Record<string, number | string> } {
    return {
      version: 'V58-BranchManager',
      metrics: {
        branches: this._branches.size,
        maxBranches: this._config.maxBranches,
        currentBranch: this.getCurrentBranch()?.name ?? 'none',
      },
    };
  }
}