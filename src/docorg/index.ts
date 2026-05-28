/**
 * DocOrg - Smart Document Organization Module
 * 
 * Features:
 * - DocumentClassifier: Categorize docs by type
 * - TagExtractor: Extract key terms and topics
 * - DocumentGraph: Build document relationship graph
 * - SearchEngine: Full-text search with filters
 * - FolderManager: Intelligent folder structure
 * - RecommendationEngine: Recommend related documents
 */

// DocumentClassifier
export { classifyDocument, classifyDocuments, getClassificationStats } from './DocumentClassifier';
export type { DocumentType, ClassificationResult, DocumentContent } from './DocumentClassifier';

// TagExtractor
export { extractTags, extractTopics, extractEntities, generateSummary, extractFromDocument, extractFromDocuments } from './TagExtractor';
export type { Tag, ExtractionResult, TagExtractorOptions } from './TagExtractor';

// DocumentGraph
export { documentGraph, DocumentGraphImpl } from './DocumentGraph';
export type { DocumentNode, GraphEdge, DocumentGraph, GraphStats } from './DocumentGraph';

// SearchEngine
export { searchEngine, SearchEngineImpl } from './SearchEngine';
export type { SearchableDocument, SearchOptions, SearchFilters, SearchResult, SearchStats, SearchResponse } from './SearchEngine';

// FolderManager
export { folderManager, FolderManagerImpl, FOLDER_COLORS, FOLDER_ICONS } from './FolderManager';
export type { Folder, FolderTree, FolderStats } from './FolderManager';

// RecommendationEngine
export { recommendationEngine, RecommendationEngineImpl } from './RecommendationEngine';
export type { UserInteraction, Recommendation, RecommendationOptions } from './RecommendationEngine';

// Utils
export { wordCount, hasCodePatterns, hasConfigPatterns, extractKeywords, textSimilarity, truncateText } from './utils/textAnalysis';