// i18n index — public surface
export type { TranslationKey } from './types';
export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_STORAGE_KEY,
  I18nProvider,
  isLocale,
  readStoredLocale,
  translate,
  useI18n,
  useLocale,
  useTranslation,
  writeStoredLocale,
  type I18nContextValue,
  type I18nProviderProps,
  type Locale,
} from './I18nProvider';
