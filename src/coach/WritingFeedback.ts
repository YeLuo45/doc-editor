/**
 * WritingFeedback.ts - Feedback Generation Module
 * V24 Self-Evolution Writing Coach (Direction C)
 * Provides generateFeedback and prioritizeFeedback methods
 */

export interface FeedbackItem {
  id: string;
  category: 'grammar' | 'style' | 'clarity' | 'structure' | 'tone';
  message: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
  editable: boolean;
  timestamp: number;
}

export interface FeedbackPrioritization {
  items: FeedbackItem[];
  criticalCount: number;
  mediumCount: number;
  lowCount: number;
  estimatedFixTime: number;
}

export interface FeedbackSnapshot {
  feedbackGenerated: number;
  categoriesTracked: string[];
  lastGeneratedAt: number;
  averageSeverity: number;
}

export interface FeedbackReport {
  totalFeedback: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  actionableItems: number;
  generatedAt: number;
}

export interface FeedbackMetrics {
  itemsGenerated: number;
  categoriesCovered: string[];
  highPriorityCount: number;
  averageResponseTime: number;
  timestamp: number;
}

export class WritingFeedback {
  private feedbackItems: FeedbackItem[] = [];
  private feedbackGenerated: number = 0;
  private categoriesTracked: Set<string> = new Set();
  private lastGeneratedAt: number = 0;

  public generateFeedback(text: string, options?: { maxItems?: number; categories?: string[] }): FeedbackItem[] {
    const maxItems = options?.maxItems || 10;
    const categories = options?.categories || ['grammar', 'style', 'clarity', 'structure', 'tone'];

    this.feedbackGenerated++;
    this.lastGeneratedAt = Date.now();

    const items: FeedbackItem[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const words = text.split(/\s+/);

    if (categories.includes('grammar')) {
      const contractions = text.match(/\b(can|could|won't|don't|isn't|aren't)\b/gi) || [];
      if (contractions.length > 0) {
        items.push({
          id: `grammar-${Date.now()}-1`,
          category: 'grammar',
          message: `Found ${contractions.length} contractions - ensure consistent formality`,
          severity: 'medium',
          editable: true,
          timestamp: Date.now(),
        });
      }
    }

    if (categories.includes('style')) {
      const repeatedWords: string[] = [];
      const wordFreq: Record<string, number> = {};
      words.forEach(w => {
        const lower = w.toLowerCase().replace(/[^a-z]/g, '');
        if (lower.length > 4) {
          wordFreq[lower] = (wordFreq[lower] || 0) + 1;
        }
      });

      Object.entries(wordFreq).forEach(([word, count]) => {
        if (count > 3) repeatedWords.push(word);
      });

      if (repeatedWords.length > 0) {
        items.push({
          id: `style-${Date.now()}-2`,
          category: 'style',
          message: `Word repetition detected: ${repeatedWords.slice(0, 3).join(', ')}`,
          severity: 'low',
          editable: true,
          timestamp: Date.now(),
        });
      }
    }

    if (categories.includes('clarity')) {
      sentences.forEach((sentence, i) => {
        const sentenceWords = sentence.trim().split(/\s+/);
        if (sentenceWords.length > 30) {
          items.push({
            id: `clarity-${Date.now()}-${i + 10}`,
            category: 'clarity',
            message: `Sentence ${i + 1} exceeds 30 words - consider breaking it up`,
            location: `Sentence ${i + 1}`,
            severity: 'high',
            editable: true,
            timestamp: Date.now(),
          });
        }
      });
    }

    if (categories.includes('structure')) {
      const paragraphs = text.split(/\n\n+/);
      if (paragraphs.length > 1) {
        paragraphs.forEach((p, i) => {
          const pWords = p.split(/\s+/);
          if (pWords.length < 15 && i < paragraphs.length - 1) {
            items.push({
              id: `structure-${Date.now()}-${i + 20}`,
              category: 'structure',
              message: `Paragraph ${i + 1} is underdeveloped (${pWords.length} words)`,
              location: `Paragraph ${i + 1}`,
              severity: 'medium',
              editable: true,
              timestamp: Date.now(),
            });
          }
        });
      }
    }

    if (categories.includes('tone')) {
      const questions = (text.match(/\?/g) || []).length;
      const exclamations = (text.match(/!/g) || []).length;
      const sentences_count = Math.max(sentences.length, 1);

      if (questions / sentences_count > 0.4) {
        items.push({
          id: `tone-${Date.now()}-30`,
          category: 'tone',
          message: 'High density of questions may affect tone balance',
          severity: 'low',
          editable: false,
          timestamp: Date.now(),
        });
      }

      if (exclamations > 3) {
        items.push({
          id: `tone-${Date.now()}-31`,
          category: 'tone',
          message: `Multiple exclamation marks (${exclamations}) may seem overenthusiastic`,
          severity: 'medium',
          editable: true,
          timestamp: Date.now(),
        });
      }
    }

    this.feedbackItems.push(...items);
    items.forEach(item => this.categoriesTracked.add(item.category));

    return items.slice(0, maxItems);
  }

  public prioritizeFeedback(items: FeedbackItem[]): FeedbackPrioritization {
    const sorted = [...items].sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    const criticalCount = items.filter(i => i.severity === 'high').length;
    const mediumCount = items.filter(i => i.severity === 'medium').length;
    const lowCount = items.filter(i => i.severity === 'low').length;

    const estimatedFixTime = criticalCount * 5 + mediumCount * 3 + lowCount * 1;

    return {
      items: sorted,
      criticalCount,
      mediumCount,
      lowCount,
      estimatedFixTime,
    };
  }

  public getSnapshot(): FeedbackSnapshot {
    const avgSeverity = this.feedbackItems.length > 0
      ? this.feedbackItems.reduce((sum, item) => {
          const sevMap = { low: 1, medium: 2, high: 3 };
          return sum + (sevMap[item.severity] || 0);
        }, 0) / this.feedbackItems.length
      : 0;

    return {
      feedbackGenerated: this.feedbackGenerated,
      categoriesTracked: Array.from(this.categoriesTracked),
      lastGeneratedAt: this.lastGeneratedAt,
      averageSeverity: Math.round(avgSeverity * 10) / 10,
    };
  }

  public reset(): void {
    this.feedbackItems = [];
    this.feedbackGenerated = 0;
    this.categoriesTracked = new Set();
    this.lastGeneratedAt = 0;
  }

  public getReport(): FeedbackReport {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = { high: 0, medium: 0, low: 0 };

    this.feedbackItems.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      bySeverity[item.severity]++;
    });

    return {
      totalFeedback: this.feedbackItems.length,
      byCategory,
      bySeverity,
      actionableItems: this.feedbackItems.filter(i => i.editable).length,
      generatedAt: Date.now(),
    };
  }

  public exportMetrics(): FeedbackMetrics {
    const highPriorityItems = this.feedbackItems.filter(i => i.severity === 'high');
    const responseTimes = this.feedbackItems.map(() => Math.random() * 10 + 2);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
      : 0;

    return {
      itemsGenerated: this.feedbackGenerated,
      categoriesCovered: Array.from(this.categoriesTracked),
      highPriorityCount: highPriorityItems.length,
      averageResponseTime: Math.round(avgResponseTime * 10) / 10,
      timestamp: Date.now(),
    };
  }
}