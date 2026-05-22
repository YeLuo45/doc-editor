export type TemplateCategory = 'academic' | 'tech-doc' | 'business' | 'creative';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  author: string;
  tags: string[];
  content: string;
}
