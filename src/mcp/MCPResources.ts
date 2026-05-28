/**
 * MCPResources - Standard MCP Resources Implementation
 * Provides documents, agents, and hooks resources
 */

import type { MCPResource } from './types.js';

export interface MCPResourcesMetrics {
  documentAccessCount: number;
  agentAccessCount: number;
  hookAccessCount: number;
  cacheHits: number;
  cacheMisses: number;
  lastAccessAt?: number;
}

/**
 * MCPResources - Standard resources for MCP server
 */
export class MCPResources {
  private metrics: MCPResourcesMetrics;
  private cache: Map<string, MCPResource> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.metrics = {
      documentAccessCount: 0,
      agentAccessCount: 0,
      hookAccessCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Initialize resources
   */
  init(): void {
    this.initialized = true;
    this.cacheStandardResources();
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cache standard resources
   */
  private cacheStandardResources(): void {
    const standardResources = this.getStandardResources();
    for (const resource of standardResources) {
      this.cache.set(resource.id, resource);
    }
  }

  /**
   * Get standard MCP resources
   */
  getStandardResources(): MCPResource[] {
    return [
      this.createDocumentsResource(),
      this.createAgentsResource(),
      this.createHooksResource(),
    ];
  }

  /**
   * Create documents resource
   */
  private createDocumentsResource(): MCPResource {
    return {
      id: 'documents://',
      type: 'collection',
      name: 'Documents',
      description: 'Document collection resource',
      uri: 'documents://',
      metadata: { scope: 'documents', count: '0' },
      tags: ['documents', 'collection'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create agents resource
   */
  private createAgentsResource(): MCPResource {
    return {
      id: 'agents://',
      type: 'collection',
      name: 'Agents',
      description: 'Agent registry resource',
      uri: 'agents://',
      metadata: { scope: 'agents', count: '0' },
      tags: ['agents', 'registry'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create hooks resource
   */
  private createHooksResource(): MCPResource {
    return {
      id: 'hooks://',
      type: 'collection',
      name: 'Hooks',
      description: 'Hook lifecycle resource',
      uri: 'hooks://',
      metadata: { scope: 'hooks', count: '0' },
      tags: ['hooks', 'lifecycle'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Access document resource
   */
  async accessDocument(id: string): Promise<MCPResource | undefined> {
    this.metrics.documentAccessCount++;
    this.metrics.lastAccessAt = Date.now();
    const cached = this.cache.get(id);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    return undefined;
  }

  /**
   * Access agent resource
   */
  async accessAgent(id: string): Promise<MCPResource | undefined> {
    this.metrics.agentAccessCount++;
    this.metrics.lastAccessAt = Date.now();
    const cached = this.cache.get(id);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    return undefined;
  }

  /**
   * Access hook resource
   */
  async accessHook(id: string): Promise<MCPResource | undefined> {
    this.metrics.hookAccessCount++;
    this.metrics.lastAccessAt = Date.now();
    const cached = this.cache.get(id);
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    this.metrics.cacheMisses++;
    return undefined;
  }

  /**
   * List all cached resources
   */
  listCachedResources(): MCPResource[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get resources snapshot
   */
  getSnapshot(): Record<string, unknown> {
    return {
      initialized: this.initialized,
      metrics: { ...this.metrics },
      cacheSize: this.cache.size,
      resources: this.getStandardResources().map(r => ({ id: r.id, name: r.name })),
    };
  }

  /**
   * Get report
   */
  getReport(): string {
    return [
      '=== MCP Resources Report ===',
      `Initialized: ${this.initialized}`,
      `Cache Size: ${this.cache.size}`,
      `Document Access Count: ${this.metrics.documentAccessCount}`,
      `Agent Access Count: ${this.metrics.agentAccessCount}`,
      `Hook Access Count: ${this.metrics.hookAccessCount}`,
      `Cache Hits: ${this.metrics.cacheHits}`,
      `Cache Misses: ${this.metrics.cacheMisses}`,
      `Last Access: ${this.metrics.lastAccessAt ? new Date(this.metrics.lastAccessAt).toISOString() : 'N/A'}`,
    ].join('\n');
  }

  /**
   * Export metrics
   */
  exportMetrics(): Record<string, unknown> {
    return {
      resources: this.metrics,
      cacheSize: this.cache.size,
      standardResourceCount: this.getStandardResources().length,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
    };
  }

  /**
   * Reset state
   */
  reset(): void {
    this.metrics = {
      documentAccessCount: 0,
      agentAccessCount: 0,
      hookAccessCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.cache.clear();
    this.initialized = false;
  }
}
