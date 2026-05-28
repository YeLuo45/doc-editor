// ============================================================
// ContentAnalyzer - Analyzes content structure, language, complexity, tone
// ============================================================

export type ContentLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'other';
export type ContentComplexity = 'simple' | 'moderate' | 'complex' | 'expert';
export type ContentTone = 'formal' | 'casual' | 'professional' | 'friendly' | 'technical' | 'academic' | 'neutral';

export interface ContentStructure {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  listItemCount: number;
  codeBlockCount: number;
  hasFrontMatter: boolean;
  hasTableOfContents: boolean;
  hasBibliography: boolean;
  mediaCount: number;
}

export interface ContentAnalysis {
  language: ContentLanguage;
  complexity: ContentComplexity;
  tone: ContentTone;
  structure: ContentStructure;
  readabilityScore: number;
  estimatedReadTime: number;
  keywords: string[];
  hasCode: boolean;
  hasMath: boolean;
  hasTables: boolean;
  contentType: 'prose' | 'documentation' | 'technical' | 'academic' | 'creative';
  sentiment: 'positive' | 'negative' | 'neutral';
  metadata: Record<string, unknown>;
}

export interface AnalyzeOptions {
  detectLanguage?: boolean;
  detectTone?: boolean;
  detectComplexity?: boolean;
  extractKeywords?: boolean;
}

const COMPLEXITY_PATTERNS = {
  simple: /\b(the|is|are|was|were|a|an|and|or|but|in|on|at|to|for|of|with)\b/gi,
  moderate: /\b(however|therefore|although|whereas|because|while|which|that|this)\b/gi,
  complex: /\b(furthermore|nevertheless|consequently|respectively|accordingly|notwithstanding)\b/gi,
  expert: /\b(hierarchical|paradigm|synthesize|methodology|ontological|epistemological)\b/gi,
};

const TONE_PATTERNS = {
  formal: /\b(shall|must|hereby|whereas|thereof|herein|pursuant|accordingly)\b/gi,
  casual: /\b(awesome|cool|gonna|gotta|kinda|yeah|hey|guys|well|like)\b/gi,
  professional: /\b(leverage|utilize|implement|facilitate|optimize|scalable|robust)\b/gi,
  friendly: /\b(great|thanks|please|helpful|together|let us|we hope|you can)\b/gi,
  technical: /\b(api|function|method|class|module|interface|parameter|algorithm)\b/gi,
  academic: /\b(hypothesis|methodology|qualitative|quantitative|empirical|theoretical)\b/gi,
};

const STOP_WORDS = new Set([
  'the','is','are','was','were','a','an','and','or','but','in','on','at','to','for','of','with',
  'as','by','from','that','this','it','be','has','have','had','not','have','has','do','does','did',
  'will','would','could','should','may','might','must','can','if','then','else','when','where',
  'what','which','who','how','why','all','any','some','no','so','up','out','about','into','over',
  'after','before','between','under','again','further','then','once','here','there','all','any',
  'both','each','few','more','most','other','some','such','only','own','same','so','than','too',
  'very','just','also',
]);

export class ContentAnalyzer {
  private options: AnalyzeOptions;

  constructor(options: AnalyzeOptions = {}) {
    this.options = {
      detectLanguage: options.detectLanguage ?? true,
      detectTone: options.detectTone ?? true,
      detectComplexity: options.detectComplexity ?? true,
      extractKeywords: options.extractKeywords ?? true,
    };
  }

  analyze(content: string): ContentAnalysis {
    const structure = this.analyzeStructure(content);
    const language = this.options.detectLanguage ? this.detectLanguage(content) : 'en';
    const complexity = this.options.detectComplexity ? this.detectComplexity(content, structure) : 'moderate';
    const tone = this.options.detectTone ? this.detectTone(content) : 'neutral';
    const keywords = this.options.extractKeywords ? this.extractKeywords(content) : [];
    const readabilityScore = this.calculateReadabilityScore(content, structure);
    const estimatedReadTime = this.estimateReadTime(structure);

    return {
      language,
      complexity,
      tone,
      structure,
      readabilityScore,
      estimatedReadTime,
      keywords,
      hasCode: this.containsCode(content),
      hasMath: this.containsMath(content),
      hasTables: this.containsTables(content),
      contentType: this.detectContentType(content, structure),
      sentiment: this.analyzeSentiment(content),
      metadata: {},
    };
  }

  private analyzeStructure(content: string): ContentStructure {
    const paragraphs = content.split(/\n\s*\n/);

    const wordCount = this.countWords(content);
    const sentenceCount = this.countSentences(content);
    const paragraphCount = paragraphs.filter(p => p.trim().length > 0).length;
    const headingCount = this.countHeadings(content);
    const listItemCount = this.countListItems(content);
    const codeBlockCount = this.countCodeBlocks(content);
    const hasFrontMatter = content.trim().startsWith('---');
    const hasTableOfContents = /table\s+of\s+contents/i.test(content);
    const hasBibliography = /bibliography|references|works\s+cited/i.test(content);
    const mediaCount = this.countMedia(content);

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      headingCount,
      listItemCount,
      codeBlockCount,
      hasFrontMatter,
      hasTableOfContents,
      hasBibliography,
      mediaCount,
    };
  }

  private countWords(content: string): number {
    return content.split(/\s+/).filter(w => w.length > 0).length;
  }

  private countSentences(content: string): number {
    return (content.match(/[.!?]+(\s|$)/g) || []).length || 1;
  }

  private countHeadings(content: string): number {
    return (content.match(/^#{1,6}\s+.+$/gm) || []).length;
  }

  private countListItems(content: string): number {
    const bulletItems = (content.match(/^\s*[-*+]\s+/gm) || []).length;
    const numberedItems = (content.match(/^\s*\d+\.\s+/gm) || []).length;
    return bulletItems + numberedItems;
  }

  private countCodeBlocks(content: string): number {
    return (content.match(/```[\s\S]*?```/g) || []).length ||
           (content.match(/`[^`]+`/g) || []).length;
  }

  private countMedia(content: string): number {
    const imageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const videoCount = (content.match(/<video.*?>.*?<\/video>/gi) || []).length;
    const audioCount = (content.match(/<audio.*?>.*?<\/audio>/gi) || []).length;
    return imageCount + videoCount + audioCount;
  }

  private detectLanguage(content: string): ContentLanguage {
    const sample = content.substring(0, 500).toLowerCase();

    const langScores: Record<string, number> = {
      en: 0, es: 0, fr: 0, de: 0, zh: 0, ja: 0, ko: 0
    };

    const langIndicators: Record<string, string[]> = {
      en: ['the','is','are','was','were','and','or','but','in','at','to','for'],
      es: ['el','la','los','las','es','son','está','están','y','o','pero','en','por','de','que'],
      fr: ['le','la','les','est','sont','et','ou','mais','en','de','que','un','une','des','pour'],
      de: ['der','die','das','und','oder','aber','in','zu','von','den','mit','sein','ist'],
      zh: ['的','是','在','和','了','有','我','他','这','个','来','个','们'],
      ja: ['の','は','が','を','に','と','で','は','です','ます','が','から'],
      ko: ['이','그','저','은','는','가','을','를','에','와','과','의','가'],
    };

    for (const [lang, indicators] of Object.entries(langIndicators)) {
      for (const word of indicators) {
        if (sample.includes(word)) {
          langScores[lang]++;
        }
      }
    }

    const detected = Object.entries(langScores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    return detected[1] > 0 ? detected[0] as ContentLanguage : 'other';
  }

  private detectComplexity(content: string, structure: ContentStructure): ContentComplexity {
    let complexScore = 0;
    let moderateScore = 0;
    let simpleScore = 0;

    for (const _ of Object.keys(COMPLEXITY_PATTERNS.simple)) {
      simpleScore += (content.match(COMPLEXITY_PATTERNS.simple) || []).length;
    }
    for (const _ of Object.keys(COMPLEXITY_PATTERNS.moderate)) {
      moderateScore += (content.match(COMPLEXITY_PATTERNS.moderate) || []).length;
    }
    for (const _ of Object.keys(COMPLEXITY_PATTERNS.complex)) {
      complexScore += (content.match(COMPLEXITY_PATTERNS.complex) || []).length;
    }

    const avgSentenceLength = structure.wordCount / Math.max(structure.sentenceCount, 1);
    const codeRatio = structure.codeBlockCount / Math.max(structure.paragraphCount, 1);

    let complexityScore = (complexScore * 3 + moderateScore * 2 + simpleScore) / Math.max(structure.wordCount, 1);
    complexityScore += avgSentenceLength > 25 ? 0.2 : 0;
    complexityScore += codeRatio > 0.3 ? 0.3 : 0;
    complexityScore += structure.wordCount > 5000 ? 0.2 : 0;

    if (complexityScore > 0.05) return 'expert';
    if (complexityScore > 0.02) return 'complex';
    if (complexityScore > 0.005) return 'moderate';
    return 'simple';
  }

  private detectTone(content: string): ContentTone {
    const scores: Record<string, number> = {
      formal: 0,
      casual: 0,
      professional: 0,
      friendly: 0,
      technical: 0,
      academic: 0,
    };

    for (const _ of Object.entries(TONE_PATTERNS)) {
      scores['formal'] += (content.match(TONE_PATTERNS.formal) || []).length;
      scores['casual'] += (content.match(TONE_PATTERNS.casual) || []).length;
      scores['professional'] += (content.match(TONE_PATTERNS.professional) || []).length;
      scores['friendly'] += (content.match(TONE_PATTERNS.friendly) || []).length;
      scores['technical'] += (content.match(TONE_PATTERNS.technical) || []).length;
      scores['academic'] += (content.match(TONE_PATTERNS.academic) || []).length;
    }

    const detected = Object.entries(scores).reduce((a, b) =>
      a[1] > b[1] ? a : b
    );

    return detected[1] > 0 ? detected[0] as ContentTone : 'neutral';
  }

  private extractKeywords(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[#*`\[\]()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOP_WORDS.has(w));

    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  private calculateReadabilityScore(content: string, structure: ContentStructure): number {
    const avgSentenceLength = structure.wordCount / Math.max(structure.sentenceCount, 1);
    const avgSyllablesPerWord = this.estimateSyllables(content) / Math.max(structure.wordCount, 1);

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private estimateSyllables(content: string): number {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    return words.reduce((total, word) => {
      return total + Math.max(1, word.replace(/[^aeiouy]/g, '').length);
    }, 0);
  }

  private estimateReadTime(structure: ContentStructure): number {
    return Math.ceil(structure.wordCount / 200) * 60;
  }

  private containsCode(content: string): boolean {
    return /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
  }

  private containsMath(content: string): boolean {
    return /\$[a-zA-Z]/.test(content) || /\\\(.*?\\\)/.test(content) ||
           /\\\[.*?\\\]/.test(content) || /\{.*?\}/.test(content);
  }

  private containsTables(content: string): boolean {
    return /\|.*\|.*\|/.test(content) || /<table/.test(content);
  }

  private detectContentType(content: string, structure: ContentStructure): ContentAnalysis['contentType'] {
    if (structure.codeBlockCount > structure.paragraphCount * 0.3) return 'technical';
    if (/abstract|hypothesis|methodology|qualitative|quantitative/i.test(content)) return 'academic';
    if (structure.codeBlockCount > 0 && /api|function|method|class|interface/i.test(content)) return 'documentation';
    if (/chapter|section|paragraph|prose|narrative/i.test(content)) return 'creative';
    return 'prose';
  }

  private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = /\b(good|great|excellent|amazing|wonderful|helpful|best|better|improve|success|achieve)\b/gi;
    const negativeWords = /\b(bad|poor|wrong|error|fail|mistake|issue|problem|broken|fault|缺陷|问题)\b/gi;

    const posCount = (content.match(positiveWords) || []).length;
    const negCount = (content.match(negativeWords) || []).length;

    if (posCount > negCount * 2) return 'positive';
    if (negCount > posCount * 2) return 'negative';
    return 'neutral';
  }
}

export function createContentAnalyzer(options?: AnalyzeOptions): ContentAnalyzer {
  return new ContentAnalyzer(options);
}