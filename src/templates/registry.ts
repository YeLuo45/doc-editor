import type { Template, TemplateCategory } from './types';
import { academicTemplate } from './builtin/academic';
import { techDocTemplate } from './builtin/tech-doc';
import { businessTemplate } from './builtin/business';
import { creativeTemplate } from './builtin/creative';

const templates: Template[] = [
  academicTemplate,
  techDocTemplate,
  businessTemplate,
  creativeTemplate,
];

export function getTemplates(category?: TemplateCategory): Template[] {
  if (category) {
    return templates.filter(t => t.category === category);
  }
  return [...templates];
}

export function getTemplateById(id: string): Template | undefined {
  return templates.find(t => t.id === id);
}

export function getCategories(): TemplateCategory[] {
  return ['academic', 'tech-doc', 'business', 'creative'];
}
