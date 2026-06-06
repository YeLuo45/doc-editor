// SettingsPanel — a Tabs-rooted three-tab settings surface
// (General / Appearance / About). The General tab is the home of the
// LanguageSwitcher.

import { useState } from 'react';
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './Tabs';
import { useTranslation } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

const APP_VERSION = 'v145';
const MODULE_COUNT = 145;

export function SettingsPanel() {
  const t = useTranslation();
  const [tab, setTab] = useState<string>('general');

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <TabsRoot value={tab} onChange={setTab} defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t('settings.tab.general')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('settings.tab.appearance')}</TabsTrigger>
          <TabsTrigger value="about">{t('settings.tab.about')}</TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general">
          <div className="settings-section" data-testid="settings-section-general">
            <div className="settings-section__header">
              <h2 className="settings-section__title">
                {t('settings.general.title')}
              </h2>
            </div>

            <div className="settings-row">
              <div className="settings-row__label">
                <div className="settings-row__label-main">
                  {t('settings.general.language')}
                </div>
                <div className="settings-row__label-desc">
                  {t('settings.general.languageDesc')}
                </div>
              </div>
              <div className="settings-row__control">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Appearance tab */}
        <TabsContent value="appearance">
          <div className="settings-section" data-testid="settings-section-appearance">
            <div className="settings-section__header">
              <h2 className="settings-section__title">
                {t('settings.appearance.title')}
              </h2>
            </div>

            <div className="settings-row">
              <div className="settings-row__label">
                <div className="settings-row__label-main">
                  {t('settings.appearance.theme')}
                </div>
                <div className="settings-row__label-desc">
                  {t('settings.appearance.themeDesc')}
                </div>
              </div>
              <div className="settings-row__control">
                <span className="pill pill--cyan" style={{ padding: '2px 10px' }}>
                  {t('inspector.value.on')}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* About tab */}
        <TabsContent value="about">
          <div className="settings-section" data-testid="settings-section-about">
            <div className="settings-section__header">
              <h2 className="settings-section__title">
                {t('settings.about.title')}
              </h2>
            </div>

            <div className="settings-row">
              <div className="settings-row__label">
                <div className="settings-row__label-main">
                  {t('settings.about.version', { version: APP_VERSION })}
                </div>
                <div className="settings-row__label-desc">
                  {t('settings.about.modules', { count: MODULE_COUNT })}
                </div>
              </div>
            </div>

            <div
              className="settings-row"
              style={{ borderTop: '1px solid var(--color-border-subtle)', marginTop: 'var(--space-3)' }}
            >
              <div className="settings-row__label">
                <div className="settings-row__label-desc" style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {t('settings.about.description')}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </TabsRoot>
    </div>
  );
}
