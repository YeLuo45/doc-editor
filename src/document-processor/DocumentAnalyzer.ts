export interface DocumentAnalyzerConfig {
  enableDeepAnalysis?: boolean;
  includeStatistics?: boolean;
  maxDepth?: number;
  computeComplexity?: boolean;
}

export interface AnalysisResult {
  id: string;
  document: unknown;
  metrics: DocumentMetrics;
  analyzedAt: Date;
}

export interface DocumentMetrics {
  size: number;
  depth: number;
  complexity: number;
  tokenCount: number;
  entityCount: number;
  wordCount: number;
  lineCount: number;
}

export class DocumentAnalyzer {
  public config: DocumentAnalyzerConfig;
  private analysisResults: Map<string, AnalysisResult> = new Map();
  private stats = {
    totalAnalyzed: 0,
    totalFailed: 0,
    currentlyAnalyzing: 0,
    documentsAnalyzed: 0,
  };

  constructor(config: DocumentAnalyzerConfig = {}) {
    this.config = {
      enableDeepAnalysis: config.enableDeepAnalysis ?? true,
      includeStatistics: config.includeStatistics ?? true,
      maxDepth: config.maxDepth ?? 10,
      computeComplexity: config.computeComplexity ?? true,
    };
  }

  async analyze(document: unknown, id?: string): Promise<AnalysisResult> {
    const docId = id ?? `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    this.stats.currentlyAnalyzing++;

    try {
      const metrics = this.computeMetrics(document);

      const result: AnalysisResult = {
        id: docId,
        document,
        metrics,
        analyzedAt: new Date(),
      };

      this.analysisResults.set(docId, result);
      this.stats.totalAnalyzed++;
      this.stats.documentsAnalyzed++;

      return result;
    } catch (error) {
      this.stats.totalFailed++;
      throw new Error(`Failed to analyze document: ${error}`);
    } finally {
      this.stats.currentlyAnalyzing--;
    }
  }

  private computeMetrics(document: unknown): DocumentMetrics {
    const docString = typeof document === 'string' ? document : JSON.stringify(document);

    return {
      size: docString.length,
      depth: this.computeDepth(document),
      complexity: this.config.computeComplexity ? this.computeComplexity(document) : 0,
      tokenCount: this.countTokens(docString),
      entityCount: this.countEntities(document),
      wordCount: this.countWords(docString),
      lineCount: docString.split('\n').length,
    };
  }

  private computeDepth(obj: unknown, currentDepth = 0): number {
    if (currentDepth > (this.config.maxDepth ?? 10)) return currentDepth;
    if (obj === null || typeof obj !== 'object') return currentDepth;

    const arr = Array.isArray(obj) ? obj : Object.values(obj as Record<string, unknown>);
    if (arr.length === 0) return currentDepth;

    let maxDepth = currentDepth;
    for (const item of arr) {
      const itemDepth = this.computeDepth(item, currentDepth + 1);
      if (itemDepth > maxDepth) maxDepth = itemDepth;
    }
    return maxDepth;
  }

  private computeComplexity(document: unknown): number {
    const docString = typeof document === 'string' ? document : JSON.stringify(document);
    let complexity = docString.length / 100;

    if (typeof document === 'object' && document !== null) {
      const keys = Object.keys(document as object);
      complexity += keys.length * 2;

      const values = Object.values(document as object);
      for (const val of values) {
        if (typeof val === 'object' && val !== null) {
          complexity += this.computeComplexity(val) * 0.5;
        }
      }
    }

    return Math.round(complexity * 100) / 100;
  }

  private countTokens(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  private countEntities(document: unknown): number {
    if (typeof document !== 'object' || document === null) return 0;

    if (Array.isArray(document)) {
      return document.length;
    }

    return Object.keys(document as object).length;
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }

  getAnalysis(): AnalysisResult[] {
    return Array.from(this.analysisResults.values());
  }

  getAnalysisById(id: string): AnalysisResult | undefined {
    return this.analysisResults.get(id);
  }

  getMetrics(): DocumentMetrics[] {
    return this.getAnalysis().map((a) => a.metrics);
  }

  getStats(): {
    totalAnalyzed: number;
    totalFailed: number;
    currentlyAnalyzing: number;
    documentsAnalyzed: number;
  } {
    return { ...this.stats };
  }

  getReport(): string {
    const analyses = this.getAnalysis();
    const avgComplexity =
      analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.metrics.complexity, 0) / analyses.length
        : 0;

    return `DocumentAnalyzer Report: analyzed=${this.stats.totalAnalyzed}, ` +
      `failed=${this.stats.totalFailed}, analyzing=${this.stats.currentlyAnalyzing}, ` +
      `avgComplexity=${avgComplexity.toFixed(2)}`;
  }

  getSnapshot(): { metrics: Record<string, number> } {
    return {
      metrics: {
        totalAnalyzed: this.stats.totalAnalyzed,
        totalFailed: this.stats.totalFailed,
        currentlyAnalyzing: this.stats.currentlyAnalyzing,
        documentsAnalyzed: this.stats.documentsAnalyzed,
        storedAnalyses: this.analysisResults.size,
      },
    };
  }

  reset(): void {
    this.analysisResults.clear();
    this.stats = {
      totalAnalyzed: 0,
      totalFailed: 0,
      currentlyAnalyzing: 0,
      documentsAnalyzed: 0,
    };
  }

  exportMetrics(): { version: string } {
    return { version: '1.0.0' };
  }
}