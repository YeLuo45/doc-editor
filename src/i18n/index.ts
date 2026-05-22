import type { Locale, TranslationKey } from './types';
import { zhCN } from './locales/zh-CN';
import { enUS } from './locales/en-US';

type TranslationDict = typeof zhCN;

const translations: Record<Locale, TranslationDict> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const STORAGE_KEY = 'doc-editor-locale';

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
}

let currentLocale: Locale = 'en-US';

function loadStoredLocale(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh-CN' || stored === 'en-US') {
      currentLocale = stored;
    }
  } catch {
    // localStorage not available
  }
}

loadStoredLocale();

export function t(key: string, params?: Record<string, string>): string {
  const dict = translations[currentLocale];
  const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
  if (value === undefined) {
    // Fallback to en-US
    const fallback = getNestedValue(translations['en-US'] as unknown as Record<string, unknown>, key);
    if (fallback === undefined) {
      return key;
    }
    return interpolate(fallback, params);
  }
  return interpolate(value, params);
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getAvailableLocales(): Locale[] {
  return ['zh-CN', 'en-US'];
}
