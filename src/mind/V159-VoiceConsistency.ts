/**
 * V159 VoiceConsistency - Direction A Writing Mind (Iter 5/30)
 * thunderbolt: narrative voice stability check
 */
export type VoicePerson = 'first' | 'second' | 'third';
export type VoiceTense = 'past' | 'present' | 'future';
export type VoiceType = 'active' | 'passive' | 'mixed';

export interface VoiceMetrics {
  personCounts: Record<VoicePerson, number>;
  tenseCounts: Record<VoiceTense, number>;
  activeRatio: number;
  passiveRatio: number;
  consistencyScore: number;
}

export interface VoiceReport {
  dominantPerson: VoicePerson;
  dominantTense: VoiceTense;
  voiceType: VoiceType;
  metrics: VoiceMetrics;
  shiftCount: number;
  warnings: string[];
}

const FIRST_PATTERNS = [/\bI\b/gi, /\bme\b/gi, /\bmy\b/gi, /\bmine\b/gi, /我的?/g, /我们/g, /咱/g];
const SECOND_PATTERNS = [/\byou\b/gi, /\byour\b/gi, /\byours\b/gi, /你/g, /你们/g, /您的?/g, /您们/g];
const THIRD_PATTERNS = [/\bhe\b/gi, /\bshe\b/gi, /\bthey\b/gi, /\bthem\b/gi, /\btheir\b/gi, /\bhim\b/gi, /\bher\b/gi, /\bhis\b/gi, /\bit\b/gi, /\bits\b/gi, /他/g, /她/g, /它/g, /他们/g, /她们/g, /它们/g];
const PAST_PATTERNS = [/\b\w+ed\b/gi, /\bwas\b/gi, /\bwere\b/gi, /\bhad\b/gi, /\bdid\b/gi, /\bwent\b/gi, /了/g, /过/g, /曾经/g];
const PRESENT_PATTERNS = [/\bam\b/gi, /\bis\b/gi, /\bare\b/gi, /\bdo\b/gi, /\bdoes\b/gi, /\bhas\b/gi, /\bhaving\b/gi, /进行中/g, /正在/g, /此刻/g];
const FUTURE_PATTERNS = [/\bwill\b/gi, /\bshall\b/gi, /\bbe going to\b/gi, /\bwill be\b/gi, /将/g, /会/g, /要/g, /即将/g];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    p.lastIndex = 0;
    const matches = text.match(p);
    if (matches) count += matches.length;
  }
  return count;
}

export function createVoiceMetrics(): VoiceMetrics {
  return {
    personCounts: { first: 0, second: 0, third: 0 },
    tenseCounts: { past: 0, present: 0, future: 0 },
    activeRatio: 0,
    passiveRatio: 0,
    consistencyScore: 1,
  };
}

export function analyzeVoice(text: string): VoiceReport {
  const metrics = createVoiceMetrics();
  metrics.personCounts.first = countMatches(text, FIRST_PATTERNS);
  metrics.personCounts.second = countMatches(text, SECOND_PATTERNS);
  metrics.personCounts.third = countMatches(text, THIRD_PATTERNS);
  metrics.tenseCounts.past = countMatches(text, PAST_PATTERNS);
  metrics.tenseCounts.present = countMatches(text, PRESENT_PATTERNS);
  metrics.tenseCounts.future = countMatches(text, FUTURE_PATTERNS);
  const totalVerbs = metrics.tenseCounts.past + metrics.tenseCounts.present + metrics.tenseCounts.future;
  // Match "was/were/been/being" followed by any word (improved passive detection)
  const passiveMarkers = (text.match(/\b(was|were|been|being)\b\s+\w+|被\s*[\u4e00-\u9fa5]{1,3}/gi) || []).length;
  metrics.passiveRatio = totalVerbs > 0 ? passiveMarkers / totalVerbs : 0;
  metrics.activeRatio = 1 - metrics.passiveRatio;
  const personEntries = (Object.entries(metrics.personCounts) as Array<[VoicePerson, number]>).sort((a, b) => b[1] - a[1]);
  const tenseEntries = (Object.entries(metrics.tenseCounts) as Array<[VoiceTense, number]>).sort((a, b) => b[1] - a[1]);
  const dominantPerson: VoicePerson = personEntries[0][1] > 0 ? personEntries[0][0] : 'third';
  const dominantTense: VoiceTense = tenseEntries[0][1] > 0 ? tenseEntries[0][0] : 'present';
  const totalPersonNonZero = personEntries.filter(([_, v]) => v > 0).length;
  const totalTenseNonZero = tenseEntries.filter(([_, v]) => v > 0).length;
  const shiftCount = Math.max(0, (totalPersonNonZero - 1) + (totalTenseNonZero - 1));
  const consistencyScore = Math.max(0, 1 - shiftCount * 0.15);
  metrics.consistencyScore = consistencyScore;
  let voiceType: VoiceType;
  if (metrics.passiveRatio > 0.4) voiceType = 'passive';
  else if (metrics.activeRatio >= 0.8) voiceType = 'active';
  else if (metrics.passiveRatio > 0.15) voiceType = 'mixed';
  else voiceType = 'active';
  const warnings: string[] = [];
  if (totalPersonNonZero > 1) warnings.push('Document switches between narrative persons');
  if (totalTenseNonZero > 1) warnings.push('Document switches between tenses');
  if (metrics.passiveRatio > 0.4) warnings.push('High passive voice ratio');
  return { dominantPerson, dominantTense, voiceType, metrics, shiftCount, warnings };
}

export function getVoiceReport(text: string): VoiceReport {
  return analyzeVoice(text);
}

export function resetVoiceMetrics(): VoiceMetrics {
  return createVoiceMetrics();
}
