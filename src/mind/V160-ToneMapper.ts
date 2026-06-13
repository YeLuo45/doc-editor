/**
 * V160 ToneMapper - Direction A Writing Mind (Iter 6/30)
 * thunderbolt: emotional tone over time (sentiment arcs)
 */
export type Sentiment = 'negative' | 'neutral' | 'positive';
export type ToneIntensity = 'mild' | 'moderate' | 'strong' | 'extreme';

export interface TonePoint {
  position: number;       // 0..1
  sentiment: Sentiment;
  intensity: ToneIntensity;
  score: number;          // -1..1
}

export interface ToneMap {
  points: TonePoint[];
  overallSentiment: Sentiment;
  averageScore: number;
  arc: 'ascending' | 'descending' | 'flat' | 'volatile';
  shiftCount: number;
}

const POSITIVE_WORDS = ['good', 'great', 'love', 'happy', 'wonderful', 'amazing', 'excellent', '好', '棒', '喜欢', '开心', '优秀'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'hate', 'sad', 'awful', 'horrible', 'disappointing', '差', '糟', '讨厌', '难过', '失望'];

function detectSentimentScore(text: string): number {
  const lower = text.toLowerCase();
  let positive = 0, negative = 0;
  for (const w of POSITIVE_WORDS) {
    const m = lower.match(new RegExp(w, 'g'));
    if (m) positive += m.length;
  }
  for (const w of NEGATIVE_WORDS) {
    const m = lower.match(new RegExp(w, 'g'));
    if (m) negative += m.length;
  }
  const total = positive + negative;
  if (total === 0) return 0;
  return (positive - negative) / total;
}

function getSentiment(score: number): Sentiment {
  if (score > 0.1) return 'positive';
  if (score < -0.1) return 'negative';
  return 'neutral';
}

function getIntensity(score: number): ToneIntensity {
  const abs = Math.abs(score);
  if (abs < 0.3) return 'mild';
  if (abs < 0.6) return 'moderate';
  if (abs < 0.85) return 'strong';
  return 'extreme';
}

export function createToneMap(): ToneMap {
  return { points: [], overallSentiment: 'neutral', averageScore: 0, arc: 'flat', shiftCount: 0 };
}

export function mapTone(text: string, windows: number = 5): ToneMap {
  if (!text || text.length === 0) return createToneMap();
  const chunks: string[] = [];
  const chunkSize = Math.ceil(text.length / windows);
  for (let i = 0; i < windows; i++) {
    chunks.push(text.slice(i * chunkSize, (i + 1) * chunkSize));
  }
  const points: TonePoint[] = chunks.map((chunk, i) => {
    const score = detectSentimentScore(chunk);
    return {
      position: i / (windows - 1 || 1),
      sentiment: getSentiment(score),
      intensity: getIntensity(score),
      score,
    };
  });
  const avgScore = points.reduce((s, p) => s + p.score, 0) / points.length;
  const overallSentiment = getSentiment(avgScore);
  let shiftCount = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].sentiment !== points[i - 1].sentiment) shiftCount++;
  }
  const first = points[0].score;
  const last = points[points.length - 1].score;
  const trendDiff = last - first;
  let arc: ToneMap['arc'] = 'flat';
  if (Math.abs(trendDiff) < 0.2) arc = 'flat';
  else if (trendDiff > 0) arc = 'ascending';
  else arc = 'descending';
  if (shiftCount >= 3) arc = 'volatile';
  return { points, overallSentiment, averageScore: avgScore, arc, shiftCount };
}

export function getToneArc(map: ToneMap): string {
  return map.arc;
}

export function getToneReport(text: string): ToneMap {
  return mapTone(text);
}

export function resetToneMap(): ToneMap {
  return createToneMap();
}
