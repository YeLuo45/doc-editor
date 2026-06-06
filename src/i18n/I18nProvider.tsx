// I18n core: locale registry, translation function with parameter interpolation,
// React context + provider, localStorage persistence.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import { de } from './de';
import type { TranslationKey } from './types';

export type Locale = 'zh-CN' | 'zh-TW' | 'de';

export const LOCALES: readonly Locale[] = ['zh-CN', 'zh-TW', 'de'] as const;

export const DEFAULT_LOCALE: Locale = 'zh-CN';

export const LOCALE_STORAGE_KEY = 'doc-editor:locale';

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  de,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Read locale from localStorage, falling back to DEFAULT_LOCALE. SSR-safe. */
export function readStoredLocale(): Locale {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return DEFAULT_LOCALE;
  }
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    // ignore (e.g. storage disabled / quota / private mode)
  }
  return DEFAULT_LOCALE;
}

/** Persist locale to localStorage. Best-effort. */
export function writeStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }
}

/**
 * Resolve a translation key against a locale with fallback chain:
 *   requested locale  ->  DEFAULT_LOCALE ('zh-CN')  ->  key itself
 * Supports {param} interpolation. Missing keys (after fallback) are returned
 * as the original key in [brackets] so the gap is visible in UI.
 */
export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const lookup = (l: Locale): string | undefined => TRANSLATIONS[l]?.[key];
  let template = lookup(locale);
  if (template === undefined && locale !== DEFAULT_LOCALE) {
    template = lookup(DEFAULT_LOCALE);
  }
  if (template === undefined) {
    return `[${key}]`;
  }
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const v = params[name];
    return v === undefined || v === null ? match : String(v);
  });
}

// ---- React Context ----

export interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  /** Optional initial locale; defaults to localStorage / DEFAULT_LOCALE. */
  initialLocale?: Locale;
  /** Skip localStorage persistence (useful in tests). */
  noStorage?: boolean;
}

export function I18nProvider(props: I18nProviderProps) {
  const { children, initialLocale, noStorage = false } = props;
  const [locale, setLocaleState] = useState<Locale>(
    () => initialLocale ?? readStoredLocale(),
  );

  // Persist on change (unless disabled).
  useEffect(() => {
    if (noStorage) return;
    writeStoredLocale(locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, noStorage]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error('useI18n must be used inside <I18nProvider>');
  }
  return ctx;
}

/** Convenience hook: returns the full I18nContextValue. */
export function useTranslation(): I18nContextValue {
  return useI18n();
}

/** Convenience hook: returns current locale + setter. */
export function useLocale(): { locale: Locale; setLocale: (next: Locale) => void } {
  const { locale, setLocale } = useI18n();
  return { locale, setLocale };
}
