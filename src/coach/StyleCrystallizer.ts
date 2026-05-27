/**
 * StyleCrystallizer - Crystallizes good writing patterns into L3 skills
 * Part of Self-Evolution Writing Coach (Direction C)
 */
import type { WritingPattern } from './types';

const COACH_STORAGE_PREFIX = 'doc-editor-coach-';
const MAX_SKILLS = 50;

export interface CrystallizedSkill {
  id: string;
  name: string;
  description: string;
  trigger: string;
  pattern: WritingPattern;
  examples: string[];
  createdAt: number;
  usageCount: number;
  effectiveness: number;
}

export interface SkillTemplate {
  name: string;
  description: string;
  trigger: string;
  patternType: string;
  getExamples: (patterns: WritingPattern[]) => string[];
  getAdvice: () => string;
}

const SKILL_TEMPLATES: SkillTemplate[] = [
  {
    name: '节奏短句',
    description: '使用短句营造紧凑的阅读节奏',
    trigger: 'short_punchy',
    patternType: 'sentence_structure',
    getExamples: (patterns) => {
      const found = patterns.find(p => p.trigger === 'short_punchy');
      return found?.examples || [];
    },
    getAdvice: () => '使用短句时保持信息密度，避免过度碎片化',
  },
  {
    name: '流畅长句',
    description: '使用复合句增强描述深度',
    trigger: 'descriptive_flow',
    patternType: 'sentence_structure',
    getExamples: (patterns) => {
      const found = patterns.find(p => p.trigger === 'descriptive_flow');
      return found?.examples || [];
    },
    getAdvice: () => '长句确保逻辑连贯，适度使用连词',
  },
  {
    name: '均衡段落',
    description: '段落长度适中，保持阅读节奏',
    trigger: 'balanced_paragraphs',
    patternType: 'paragraph_structure',
    getExamples: () => [],
    getAdvice: () => '每个段落聚焦一个主题，控制长度在3-6句',
  },
  {
    name: '词汇丰富',
    description: '词汇使用多样，避免重复',
    trigger: 'rich_vocabulary',
    patternType: 'vocabulary',
    getExamples: () => [],
    getAdvice: () => '使用同义词和表达方式增加文本变化',
  },
  {
    name: '多变开头',
    description: '段落开头多样化，避免单调',
    trigger: 'varied_openings',
    patternType: 'paragraph_structure',
    getExamples: () => [],
    getAdvice: () => '段落开头可以使用不同句式、问句、感叹句等',
  },
];

export function getCoachSkills(): CrystallizedSkill[] {
  try {
    const stored = localStorage.getItem(COACH_STORAGE_PREFIX + 'skills');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setCoachSkills(skills: CrystallizedSkill[]): void {
  localStorage.setItem(COACH_STORAGE_PREFIX + 'skills', JSON.stringify(skills.slice(0, MAX_SKILLS)));
}

function generateSkillId(): string {
  return 'skill_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function crystallizeFromPatterns(patterns: WritingPattern[]): CrystallizedSkill[] {
  const skills: CrystallizedSkill[] = [];

  for (const template of SKILL_TEMPLATES) {
    const matchedPattern = patterns.find(p => p.trigger === template.trigger);
    if (matchedPattern) {
      const skill: CrystallizedSkill = {
        id: generateSkillId(),
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        pattern: matchedPattern,
        examples: template.getExamples(patterns),
        createdAt: Date.now(),
        usageCount: 0,
        effectiveness: matchedPattern.priority * 20,
      };
      skills.push(skill);
    }
  }

  return skills;
}

export function saveSkills(skills: CrystallizedSkill[]): void {
  const existing = getCoachSkills();
  const merged = [...skills, ...existing].slice(0, MAX_SKILLS);
  setCoachSkills(merged);
}

export function getSkillById(id: string): CrystallizedSkill | undefined {
  const skills = getCoachSkills();
  return skills.find(s => s.id === id);
}

export function incrementSkillUsage(skillId: string): void {
  const skills = getCoachSkills();
  const skill = skills.find(s => s.id === skillId);
  if (skill) {
    skill.usageCount++;
    setCoachSkills(skills);
  }
}

export function rateSkillEffectiveness(skillId: string, rating: number): void {
  const skills = getCoachSkills();
  const skill = skills.find(s => s.id === skillId);
  if (skill) {
    skill.effectiveness = (skill.effectiveness + rating) / 2;
    setCoachSkills(skills);
  }
}

export function deleteSkill(skillId: string): boolean {
  const skills = getCoachSkills();
  const filtered = skills.filter(s => s.id !== skillId);
  if (filtered.length < skills.length) {
    setCoachSkills(filtered);
    return true;
  }
  return false;
}

export function getTopSkills(limit = 5): CrystallizedSkill[] {
  const skills = getCoachSkills();
  return skills
    .sort((a, b) => {
      const scoreA = a.effectiveness * (1 + a.usageCount * 0.1);
      const scoreB = b.effectiveness * (1 + b.usageCount * 0.1);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function getSkillsByTrigger(trigger: string): CrystallizedSkill[] {
  const skills = getCoachSkills();
  return skills.filter(s => s.trigger === trigger);
}

export function clearAllSkills(): void {
  localStorage.removeItem(COACH_STORAGE_PREFIX + 'skills');
}

export function exportSkills(): string {
  const skills = getCoachSkills();
  return JSON.stringify(skills, null, 2);
}

export function importSkills(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const imported = JSON.parse(jsonString) as CrystallizedSkill[];
    if (!Array.isArray(imported)) {
      return { success: false, count: 0, error: 'Invalid format: expected array' };
    }
    const validSkills = imported.filter(s =>
      typeof s.id === 'string' &&
      typeof s.name === 'string' &&
      typeof s.trigger === 'string'
    );
    saveSkills(validSkills);
    return { success: true, count: validSkills.length };
  } catch (e) {
    return { success: false, count: 0, error: String(e) };
  }
}

export function getSkillStats(): {
  total: number;
  byTrigger: Record<string, number>;
  avgEffectiveness: number;
  mostUsed: CrystallizedSkill | null;
} {
  const skills = getCoachSkills();
  const byTrigger: Record<string, number> = {};
  let totalEffectiveness = 0;
  let mostUsed: CrystallizedSkill | null = null;

  for (const skill of skills) {
    byTrigger[skill.trigger] = (byTrigger[skill.trigger] || 0) + 1;
    totalEffectiveness += skill.effectiveness;
    if (!mostUsed || skill.usageCount > mostUsed.usageCount) {
      mostUsed = skill;
    }
  }

  return {
    total: skills.length,
    byTrigger,
    avgEffectiveness: skills.length > 0 ? totalEffectiveness / skills.length : 0,
    mostUsed,
  };
}