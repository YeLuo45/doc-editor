// LanguageSwitcher — three radio-style buttons that switch the app's locale
// at runtime. Highlights the active locale. Self-contained (does not depend
// on the Dropdown component) so it remains easy to test and a11y-friendly.

import { useTranslation, LOCALES, type Locale } from '../i18n';

interface LocaleMeta {
  code: Locale;
  native: string;
  english: string;
  flag: string;
}

const LOCALE_META: LocaleMeta[] = [
  { code: 'zh-CN', native: '简体中文',  english: 'Simplified Chinese', flag: '🇨🇳' },
  { code: 'zh-TW', native: '繁體中文',  english: 'Traditional Chinese', flag: '🇭🇰' },
  { code: 'de',    native: 'Deutsch',   english: 'German',              flag: '🇩🇪' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div
      className="lang-switcher"
      role="radiogroup"
      aria-label={t('settings.general.language')}
      data-testid="lang-switcher"
    >
      {LOCALE_META.map((meta) => {
        const isActive = meta.code === locale;
        return (
          <button
            key={meta.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={
              'lang-switcher__option' +
              (isActive ? ' lang-switcher__option--active' : '')
            }
            onClick={() => setLocale(meta.code)}
            data-testid={`lang-option-${meta.code}`}
          >
            <span className="lang-switcher__flag" aria-hidden>{meta.flag}</span>
            <span className="lang-switcher__text">
              <span className="lang-switcher__native">{meta.native}</span>
              <span className="lang-switcher__english">{meta.english}</span>
            </span>
            <span className="lang-switcher__check" aria-hidden>
              {isActive ? '✓' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Re-export for advanced consumers
export { LOCALES };
export type { Locale };
