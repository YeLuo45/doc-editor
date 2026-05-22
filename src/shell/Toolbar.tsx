// Toolbar - Top toolbar with theme, language, template selection and collab status

import React, { useState, useEffect } from 'react';
import { Switch } from '../components/Switch';
import { Dropdown } from '../components/Dropdown';
import { themeManager } from '../theme/ThemeManager';
import { setLocale, getLocale, getAvailableLocales } from '../i18n/index';
import { getTemplates, getCategories } from '../templates/registry';
import { type Template, type TemplateCategory } from '../templates/types';
import { CollabChannel, type CollabMessage } from '../collab/BroadcastChannel';

interface ToolbarProps {
  onTemplateSelect?: (template: Template) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onTemplateSelect }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [locale, setCurrentLocale] = useState(getLocale());
  const [collabUsers, setCollabUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initialize theme from ThemeManager
    const currentTheme = themeManager.getCurrentTheme();
    setTheme(currentTheme.id as 'light' | 'dark');

    // Subscribe to theme changes
    const checkTheme = setInterval(() => {
      const newTheme = themeManager.getCurrentTheme();
      if (newTheme.id !== (theme === 'light' ? 'light' : 'dark')) {
        setTheme(newTheme.id as 'light' | 'dark');
      }
    }, 500);

    return () => clearInterval(checkTheme);
  }, []);

  useEffect(() => {
    // Set up collab channel for online users
    const channel = new CollabChannel();
    const userId = channel.getUserId();

    const handleMessage = (msg: CollabMessage) => {
      if (msg.type === 'user_join') {
        setCollabUsers(prev => new Set([...prev, msg.userId]));
      } else if (msg.type === 'user_leave') {
        setCollabUsers(prev => {
          const next = new Set(prev);
          next.delete(msg.userId);
          return next;
        });
      }
    };

    channel.onMessage(handleMessage);

    // Announce join
    channel.broadcast({
      type: 'user_join',
      userId,
      payload: {},
      timestamp: Date.now(),
    });

    return () => {
      channel.broadcast({
        type: 'user_leave',
        userId,
        payload: {},
        timestamp: Date.now(),
      });
      channel.close();
    };
  }, []);

  const handleThemeToggle = (checked: boolean): void => {
    const newTheme = checked ? 'dark' : 'light';
    themeManager.setTheme(newTheme);
    setTheme(newTheme);
  };

  const handleLocaleChange = (value: string): void => {
    setLocale(value as 'zh-CN' | 'en-US');
    setCurrentLocale(value as 'zh-CN' | 'en-US');
  };

  const handleTemplateChange = (value: string): void => {
    const categories = getCategories();
    for (const cat of categories) {
      const templates = getTemplates(cat);
      const found = templates.find(t => t.id === value);
      if (found) {
        onTemplateSelect?.(found);
        break;
      }
    }
  };

  // Build template options grouped by category
  const categories = getCategories();
  const templateOptions: { value: string; label: string }[] = [];
  
  // Add blank option first
  templateOptions.push({ value: 'blank', label: 'Blank Document' });

  categories.forEach(category => {
    const templates = getTemplates(category);
    templates.forEach(t => {
      templateOptions.push({ value: t.id, label: t.name });
    });
  });

  const localeOptions = getAvailableLocales().map(l => ({
    value: l,
    label: l === 'en-US' ? 'English' : '中文',
  }));

  const toolbarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: 'var(--color-surface)',
    borderBottom: `1px solid var(--color-border)`,
    fontFamily: 'var(--font-primary)',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'var(--color-primary)',
    marginRight: '16px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'var(--color-secondary)',
  };

  return (
    <div style={toolbarStyle}>
      <div style={leftSectionStyle}>
        <span style={logoStyle}>📝 DocEditor</span>
        
        {/* Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={labelStyle}>☀️</span>
          <Switch
            checked={theme === 'dark'}
            onChange={handleThemeToggle}
          />
          <span style={labelStyle}>🌙</span>
        </div>

        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={labelStyle}>🌐</span>
          <Dropdown
            options={localeOptions}
            onSelect={handleLocaleChange}
            placeholder="Language"
          />
        </div>

        {/* Template Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={labelStyle}>📋</span>
          <Dropdown
            options={templateOptions}
            onSelect={handleTemplateChange}
            placeholder="Select Template"
          />
        </div>
      </div>

      <div style={rightSectionStyle}>
        {/* Collaboration Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: 'var(--color-background)',
            borderRadius: '6px',
            fontSize: '13px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: collabUsers.size > 0 ? 'var(--color-success)' : 'var(--color-border)',
            }}
          />
          <span style={{ color: 'var(--color-text)' }}>
            {collabUsers.size + 1} online
          </span>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
