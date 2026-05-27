/**
 * MCPResourceRegistry - Resource Registry for Education Resources
 * Manages discoverable resources in doc-editor-L1-index format
 */

import type { MCPResource, ResourceFilter } from './types.js';
import { STORAGE_PREFIX } from './types.js';

const STORAGE_KEY = `${STORAGE_PREFIX}resources`;

interface ResourceStore {
  [id: string]: MCPResource;
}

export class MCPResourceRegistry {
  private resources: ResourceStore = {};
  private initialized: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load resources from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ResourceStore;
        this.resources = parsed;
        this.initialized = true;
      }
    } catch {
      this.resources = {};
      this.initialized = false;
    }
  }

  /**
   * Save resources to localStorage
   */
  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.resources));
  }

  /**
   * Register a new resource
   */
  register(resource: MCPResource): void {
    if (!resource.id) {
      throw new Error('Resource must have an id');
    }
    const now = new Date().toISOString();
    const existing = this.resources[resource.id];
    this.resources[resource.id] = {
      ...resource,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.initialized = true;
    this.saveToStorage();
  }

  /**
   * Batch register resources
   */
  registerBatch(resources: MCPResource[]): void {
    const now = new Date().toISOString();
    for (const resource of resources) {
      if (!resource.id) {
        throw new Error('Each resource must have an id');
      }
      const existing = this.resources[resource.id];
      this.resources[resource.id] = {
        ...resource,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
    }
    this.saveToStorage();
  }

  /**
   * Get resource by ID
   */
  get(id: string): MCPResource | undefined {
    return this.resources[id];
  }

  /**
   * Get all resources
   */
  getAll(): MCPResource[] {
    return Object.values(this.resources);
  }

  /**
   * Find resources by filter
   */
  find(filter: ResourceFilter): MCPResource[] {
    let results = Object.values(this.resources);

    if (filter.type) {
      results = results.filter(r => r.type === filter.type);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(r => {
        if (!r.tags) return false;
        return filter.tags!.some(tag => r.tags!.includes(tag));
      });
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(r =>
        r.name.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  /**
   * Update resource
   */
  update(id: string, updates: Partial<MCPResource>): boolean {
    const existing = this.resources[id];
    if (!existing) {
      return false;
    }
    this.resources[id] = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.saveToStorage();
    return true;
  }

  /**
   * Remove resource
   */
  remove(id: string): boolean {
    if (!(id in this.resources)) {
      return false;
    }
    delete this.resources[id];
    this.saveToStorage();
    return true;
  }

  /**
   * Clear all resources
   */
  clear(): void {
    this.resources = {};
    this.initialized = true;
    this.saveToStorage();
  }

  /**
   * Get count of registered resources
   */
  count(): number {
    return Object.keys(this.resources).length;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
let registryInstance: MCPResourceRegistry | null = null;

export function getResourceRegistry(): MCPResourceRegistry {
  if (!registryInstance) {
    registryInstance = new MCPResourceRegistry();
  }
  return registryInstance;
}

export function resetResourceRegistry(): void {
  registryInstance = null;
}

export { STORAGE_KEY, STORAGE_PREFIX };