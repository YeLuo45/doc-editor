/**
 * RecommendationEngine - Suggest related documents based on usage patterns
 */

import { documentGraph } from './DocumentGraph';
import { searchEngine } from './SearchEngine';
import type { SearchableDocument } from './SearchEngine';
import { textSimilarity } from './utils/textAnalysis';

export interface UserInteraction {
  userId: string;
  documentId: string;
  action: 'view' | 'edit' | 'search' | 'link';
  timestamp: number;
  duration?: number;
}

export interface Recommendation {
  documentId: string;
  score: number;
  reason: string;
  type: 'similar' | 'frequently_viewed' | 'related_by_graph' | 'recent' | 'trending';
}

export interface RecommendationOptions {
  maxResults?: number;
  includeTypes?: string[];
  excludeIds?: string[];
  recencyWeight?: number;
  graphWeight?: number;
  searchWeight?: number;
}

interface DocumentStats {
  viewCount: number;
  editCount: number;
  lastViewed: number;
  totalDuration: number;
}

class RecommendationEngineImpl {
  private interactionHistory: UserInteraction[] = [];
  private documentStats: Map<string, DocumentStats> = new Map();
  private userFavorites: Map<string, Set<string>> = new Map();

  constructor() {
    this.interactionHistory = [];
    this.documentStats = new Map();
    this.userFavorites = new Map();
  }

  /**
   * Record a user interaction with a document
   */
  recordInteraction(interaction: UserInteraction): void {
    this.interactionHistory.push(interaction);

    // Update document stats
    const stats = this.documentStats.get(interaction.documentId) || {
      viewCount: 0,
      editCount: 0,
      lastViewed: 0,
      totalDuration: 0,
    };

    switch (interaction.action) {
      case 'view':
        stats.viewCount++;
        stats.lastViewed = interaction.timestamp;
        if (interaction.duration) {
          stats.totalDuration += interaction.duration;
        }
        break;
      case 'edit':
        stats.editCount++;
        stats.lastViewed = interaction.timestamp;
        break;
      case 'search':
        stats.viewCount++;
        break;
      case 'link':
        stats.editCount++;
        break;
    }

    this.documentStats.set(interaction.documentId, stats);

    // Update user's favorites if view duration is long
    if (interaction.action === 'view' && (interaction.duration || 0) > 30000) {
      let favorites = this.userFavorites.get(interaction.userId);
      if (!favorites) {
        favorites = new Set();
        this.userFavorites.set(interaction.userId, favorites);
      }
      favorites.add(interaction.documentId);
    }
  }

  /**
   * Get recommendations for a document
   */
  getRecommendationsForDocument(
    documentId: string,
    options: RecommendationOptions = {}
  ): Recommendation[] {
    const {
      maxResults = 10,
      includeTypes,
      excludeIds = [],
      recencyWeight = 0.2,
      graphWeight = 0.3,
      searchWeight = 0.5,
    } = options;

    const recommendations: Recommendation[] = [];
    const doc = searchEngine.getAllDocuments().find(d => d.id === documentId);
    if (!doc) return [];

    excludeIds.push(documentId);

    // 1. Graph-based recommendations (documents connected via edges)
    const relatedEdges = documentGraph.getRelated(documentId, 0.1);
    for (const edge of relatedEdges) {
      if (excludeIds.includes(edge.target)) continue;
      const targetDoc = searchEngine.getAllDocuments().find(d => d.id === edge.target);
      if (targetDoc && (!includeTypes || includeTypes.includes(targetDoc.type || ''))) {
        recommendations.push({
          documentId: edge.target,
          score: edge.weight * graphWeight,
          reason: `Connected via ${edge.type} relationship`,
          type: 'related_by_graph',
        });
        excludeIds.push(edge.target);
      }
    }

    // 2. Content similarity recommendations using search
    const searchResults = searchEngine.search({
      query: doc.title,
      limit: 20,
    });

    for (const result of searchResults.results) {
      if (excludeIds.includes(result.document.id)) continue;
      if (!includeTypes || includeTypes.includes(result.document.type || '')) {
        recommendations.push({
          documentId: result.document.id,
          score: result.score * searchWeight * 0.5,
          reason: 'Similar content found via search',
          type: 'similar',
        });
        excludeIds.push(result.document.id);
      }
    }

    // 3. Tag-based similarity
    if (doc.tags && doc.tags.length > 0) {
      const tagQuery = doc.tags.slice(0, 3).join(' ');
      const tagResults = searchEngine.search({
        query: tagQuery,
        limit: 10,
      });

      for (const result of tagResults.results) {
        if (excludeIds.includes(result.document.id)) continue;
        if (!includeTypes || includeTypes.includes(result.document.type || '')) {
          recommendations.push({
            documentId: result.document.id,
            score: result.score * searchWeight * 0.3,
            reason: 'Shares tags with this document',
            type: 'similar',
          });
          excludeIds.push(result.document.id);
        }
      }
    }

    // 4. Frequently viewed together (based on interaction patterns)
    const viewTogether = this.getFrequentlyViewedTogether(documentId);
    for (const [relatedId, count] of viewTogether) {
      if (excludeIds.includes(relatedId)) continue;
      const relatedDoc = searchEngine.getAllDocuments().find(d => d.id === relatedId);
      if (relatedDoc && (!includeTypes || includeTypes.includes(relatedDoc.type || ''))) {
        recommendations.push({
          documentId: relatedId,
          score: (count / 10) * recencyWeight,
          reason: 'Often viewed together',
          type: 'frequently_viewed',
        });
        excludeIds.push(relatedId);
      }
    }

    // Normalize and deduplicate scores
    const seen = new Set<string>();
    const deduplicated: Recommendation[] = [];

    for (const rec of recommendations) {
      if (!seen.has(rec.documentId)) {
        seen.add(rec.documentId);
        deduplicated.push(rec);
      } else {
        const existing = deduplicated.find(r => r.documentId === rec.documentId);
        if (existing) {
          existing.score = Math.max(existing.score, rec.score);
          existing.reason = `${existing.reason}; ${rec.reason}`;
        }
      }
    }

    return deduplicated
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Get documents frequently viewed together
   */
  private getFrequentlyViewedTogether(documentId: string): Array<[string, number]> {
    const viewSessions = new Map<string, number>();

    // Group interactions by time window (5 minutes)
    const WINDOW_MS = 5 * 60 * 1000;
    const sessions: UserInteraction[][] = [];
    let currentSession: UserInteraction[] = [];
    let lastTimestamp = 0;

    const sortedInteractions = this.interactionHistory
      .filter(i => i.action === 'view' && i.documentId === documentId)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const interaction of sortedInteractions) {
      if (interaction.timestamp - lastTimestamp > WINDOW_MS) {
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = [];
      }
      currentSession.push(interaction);
      lastTimestamp = interaction.timestamp;
    }

    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }

    // Count co-views
    const coViewCounts: Record<string, number> = {};
    for (const session of sessions) {
      const viewedDocs = new Set(session.map(i => i.documentId));
      for (const docId of viewedDocs) {
        if (docId !== documentId) {
          coViewCounts[docId] = (coViewCounts[docId] || 0) + 1;
        }
      }
    }

    return Object.entries(coViewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) as Array<[string, number]>;
  }

  /**
   * Get recommendations for a user
   */
  getRecommendationsForUser(
    userId: string,
    options: RecommendationOptions = {}
  ): Recommendation[] {
    const {
      maxResults = 10,
      includeTypes,
    } = options;

    const recommendations: Recommendation[] = [];
    const excludeIds: string[] = [];

    // Get user's recently viewed documents
    const userInteractions = this.interactionHistory
      .filter(i => i.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);

    const recentDocIds = userInteractions.slice(0, 10).map(i => i.documentId);

    // Get recommendations based on each recent document
    for (const docId of recentDocIds) {
      const recs = this.getRecommendationsForDocument(docId, { excludeIds, includeTypes });
      for (const rec of recs) {
        recommendations.push({
          ...rec,
          score: rec.score * 0.8, // Slightly lower weight for user recommendations
        });
        excludeIds.push(rec.documentId);
      }
    }

    // Add trending documents (high view count in recent time)
    const trendingDocs = this.getTrendingDocuments(5);
    for (const docId of trendingDocs) {
      if (!excludeIds.includes(docId)) {
        recommendations.push({
          documentId: docId,
          score: 0.3,
          reason: 'Trending document',
          type: 'trending',
        });
        excludeIds.push(docId);
      }
    }

    // Normalize and return top recommendations
    const seen = new Set<string>();
    const deduplicated: Recommendation[] = [];

    for (const rec of recommendations) {
      if (!seen.has(rec.documentId)) {
        seen.add(rec.documentId);
        deduplicated.push(rec);
      }
    }

    return deduplicated
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Get trending documents (most viewed in last 24 hours)
   */
  getTrendingDocuments(count = 10): string[] {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const recentInteractions = this.interactionHistory.filter(
      i => i.timestamp > now - ONE_DAY_MS
    );

    const viewCounts: Record<string, number> = {};
    for (const interaction of recentInteractions) {
      viewCounts[interaction.documentId] = (viewCounts[interaction.documentId] || 0) + 1;
    }

    return Object.entries(viewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([id]) => id);
  }

  /**
   * Get similar documents using direct content comparison
   */
  getSimilarDocuments(documentId: string, limit = 5): string[] {
    const doc = searchEngine.getAllDocuments().find(d => d.id === documentId);
    if (!doc) return [];

    const allDocs = searchEngine.getAllDocuments();
    const similarities: Array<{ id: string; similarity: number }> = [];

    for (const other of allDocs) {
      if (other.id === documentId) continue;
      const sim = textSimilarity(doc.content, other.content);
      if (sim > 0.1) {
        similarities.push({ id: other.id, similarity: sim });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(s => s.id);
  }

  /**
   * Get document statistics
   */
  getDocumentStats(documentId: string): DocumentStats | undefined {
    return this.documentStats.get(documentId);
  }

  /**
   * Get popular documents
   */
  getPopularDocuments(count = 10): string[] {
    const docs = Array.from(this.documentStats.entries())
      .map(([id, stats]) => ({ id, score: stats.viewCount + stats.editCount * 2 }))
      .sort((a, b) => b.score - a.score);

    return docs.slice(0, count).map(d => d.id);
  }

  /**
   * Get user's favorite documents
   */
  getUserFavorites(userId: string): string[] {
    const favorites = this.userFavorites.get(userId);
    return favorites ? Array.from(favorites) : [];
  }

  /**
   * Clear interaction history
   */
  clearHistory(): void {
    this.interactionHistory = [];
    this.documentStats.clear();
    this.userFavorites.clear();
  }

  /**
   * Export interaction data
   */
  exportInteractions(): UserInteraction[] {
    return [...this.interactionHistory];
  }

  /**
   * Import interaction data
   */
  importInteractions(interactions: UserInteraction[]): void {
    for (const interaction of interactions) {
      this.recordInteraction(interaction);
    }
  }
}

export const recommendationEngine = new RecommendationEngineImpl();
export { RecommendationEngineImpl };
export default recommendationEngine;