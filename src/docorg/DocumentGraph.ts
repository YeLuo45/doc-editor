/**
 * DocumentGraph - Build and manage relationship graph between documents
 */

import { textSimilarity } from './utils/textAnalysis';

export interface DocumentNode {
  id: string;
  title: string;
  content: string;
  type?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  type: 'reference' | 'similarity' | 'temporal' | 'hierarchy';
}

export interface DocumentGraph {
  nodes: Map<string, DocumentNode>;
  edges: Map<string, GraphEdge[]>;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  averageConnections: number;
  mostConnected: string[];
}

const SIMILARITY_THRESHOLD = 0.2;

export class DocumentGraphImpl implements DocumentGraph {
  nodes: Map<string, DocumentNode> = new Map();
  edges: Map<string, GraphEdge[]> = new Map();

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  /**
   * Add a document to the graph
   */
  addDocument(doc: DocumentNode): void {
    this.nodes.set(doc.id, { ...doc, createdAt: doc.createdAt || Date.now(), updatedAt: Date.now() });
    if (!this.edges.has(doc.id)) {
      this.edges.set(doc.id, []);
    }
  }

  /**
   * Remove a document from the graph
   */
  removeDocument(id: string): void {
    this.nodes.delete(id);
    this.edges.delete(id);
    // Remove all edges referencing this document
    for (const [source, edges] of this.edges.entries()) {
      this.edges.set(source, edges.filter(e => e.target !== id && e.source !== id));
    }
  }

  /**
   * Update a document in the graph
   */
  updateDocument(id: string, updates: Partial<DocumentNode>): void {
    const existing = this.nodes.get(id);
    if (existing) {
      const newUpdatedAt = updates.updatedAt !== undefined ? updates.updatedAt : Date.now();
      this.nodes.set(id, { ...existing, ...updates, updatedAt: newUpdatedAt });
    }
  }

  /**
   * Add a reference edge between documents
   */
  addReference(sourceId: string, targetId: string, weight = 1.0): boolean {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return false;
    }

    const edges = this.edges.get(sourceId) || [];
    // Check if edge already exists
    const existingIndex = edges.findIndex(e => e.target === targetId);
    if (existingIndex >= 0) {
      edges[existingIndex].weight = weight;
    } else {
      edges.push({ source: sourceId, target: targetId, weight, type: 'reference' });
    }
    this.edges.set(sourceId, edges);
    return true;
  }

  /**
   * Build similarity edges between all documents
   */
  buildSimilarityEdges(): void {
    const docs = Array.from(this.nodes.values());

    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const docA = docs[i];
        const docB = docs[j];

        // Calculate content similarity
        const contentSim = textSimilarity(docA.content, docB.content);

        // Calculate tag similarity if both have tags
        let tagSim = 0;
        if (docA.tags && docB.tags && docA.tags.length > 0 && docB.tags.length > 0) {
          const tagsA = new Set(docA.tags.map(t => t.toLowerCase()));
          const tagsB = new Set(docB.tags.map(t => t.toLowerCase()));
          const intersection = new Set([...tagsA].filter(t => tagsB.has(t)));
          tagSim = intersection.size / Math.max(tagsA.size, tagsB.size);
        }

        const combinedSim = (contentSim * 0.7) + (tagSim * 0.3);

        if (combinedSim >= SIMILARITY_THRESHOLD) {
          this.addSimilarityEdge(docA.id, docB.id, combinedSim);
        }
      }
    }
  }

  /**
   * Add a similarity edge between documents
   */
  addSimilarityEdge(sourceId: string, targetId: string, similarity: number): void {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return;
    }

    // Add edge in both directions
    const edgesA = this.edges.get(sourceId) || [];
    const existingA = edgesA.findIndex(e => e.target === targetId && e.type === 'similarity');
    if (existingA >= 0) {
      edgesA[existingA].weight = similarity;
    } else {
      edgesA.push({ source: sourceId, target: targetId, weight: similarity, type: 'similarity' });
    }
    this.edges.set(sourceId, edgesA);

    const edgesB = this.edges.get(targetId) || [];
    const existingB = edgesB.findIndex(e => e.target === sourceId && e.type === 'similarity');
    if (existingB >= 0) {
      edgesB[existingB].weight = similarity;
    } else {
      edgesB.push({ source: targetId, target: sourceId, weight: similarity, type: 'similarity' });
    }
    this.edges.set(targetId, edgesB);
  }

  /**
   * Get all edges for a document
   */
  getEdges(documentId: string): GraphEdge[] {
    return this.edges.get(documentId) || [];
  }

  /**
   * Get documents related to a given document
   */
  getRelated(documentId: string, minWeight = 0): GraphEdge[] {
    const edges = this.getEdges(documentId);
    return edges
      .filter(e => e.weight >= minWeight)
      .sort((a, b) => b.weight - a.weight);
  }

  /**
   * Get the most connected documents
   */
  getMostConnected(count = 10): string[] {
    const connectionCounts: Array<{ id: string; count: number }> = [];

    for (const [id] of this.nodes) {
      const edges = this.getEdges(id);
      connectionCounts.push({ id, count: edges.length });
    }

    return connectionCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, count)
      .map(c => c.id);
  }

  /**
   * Find shortest path between two documents
   */
  findPath(startId: string, endId: string): string[] | null {
    if (!this.nodes.has(startId) || !this.nodes.has(endId)) {
      return null;
    }

    if (startId === endId) {
      return [startId];
    }

    // BFS
    const visited = new Set<string>();
    const queue: Array<{ id: string; path: string[] }> = [{ id: startId, path: [startId] }];
    visited.add(startId);

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const edges = this.getEdges(id);

      for (const edge of edges) {
        if (edge.target === endId) {
          return [...path, endId];
        }

        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({ id: edge.target, path: [...path, edge.target] });
        }
      }
    }

    return null;
  }

  /**
   * Get graph statistics
   */
  getStats(): GraphStats {
    const totalNodes = this.nodes.size;
    let totalEdges = 0;

    for (const edges of this.edges.values()) {
      totalEdges += edges.length;
    }

    // Count unique edges (since edges are bidirectional for similarity)
    const uniqueEdgeSet = new Set<string>();
    for (const edges of this.edges.values()) {
      for (const edge of edges) {
        if (edge.type === 'reference') {
          uniqueEdgeSet.add(`${edge.source}->${edge.target}`);
        }
        totalEdges++;
      }
    }

    const averageConnections = totalNodes > 0 ? totalEdges / totalNodes : 0;
    const mostConnected = this.getMostConnected(5);

    return {
      totalNodes,
      totalEdges: uniqueEdgeSet.size + (totalEdges - uniqueEdgeSet.size) / 2,
      averageConnections: Math.round(averageConnections * 100) / 100,
      mostConnected,
    };
  }

  /**
   * Clear all edges of a specific type
   */
  clearEdgesOfType(type: GraphEdge['type']): void {
    for (const [id, edges] of this.edges.entries()) {
      this.edges.set(id, edges.filter(e => e.type !== type));
    }
  }

  /**
   * Export graph as JSON-serializable object
   */
  export(): { nodes: DocumentNode[]; edges: GraphEdge[] } {
    const nodes = Array.from(this.nodes.values());
    const edges: GraphEdge[] = [];

    for (const edgeList of this.edges.values()) {
      edges.push(...edgeList);
    }

    return { nodes, edges };
  }

  /**
   * Import graph from JSON object
   */
  import(data: { nodes: DocumentNode[]; edges: GraphEdge[] }): void {
    this.clear();

    for (const node of data.nodes) {
      this.addDocument(node);
    }

    for (const edge of data.edges) {
      const edges = this.edges.get(edge.source) || [];
      edges.push(edge);
      this.edges.set(edge.source, edges);
    }
  }

  /**
   * Clear the entire graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
  }
}

// Singleton instance
export const documentGraph = new DocumentGraphImpl();

export default documentGraph;