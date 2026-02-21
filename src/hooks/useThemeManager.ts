import { useState, useCallback, useEffect } from 'react';

export interface ThemeConfig {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  accent: string;
  muted: string;
}

const THEME_PRESETS: Record<string, ThemeConfig> = {
  void: { primary: '#8b5cf6', secondary: '#4c1d95', background: '#0a0a0f', foreground: '#e2e8f0', accent: '#a78bfa', muted: '#64748b' },
  aurora: { primary: '#06b6d4', secondary: '#0e7490', background: '#0f172a', foreground: '#e2e8f0', accent: '#22d3ee', muted: '#64748b' },
  cyber: { primary: '#f59e0b', secondary: '#d97706', background: '#0c0c14', foreground: '#fbbf24', accent: '#f59e0b', muted: '#92400e' },
  nature: { primary: '#22c55e', secondary: '#15803d', background: '#0f1f0f', foreground: '#dcfce7', accent: '#4ade80', muted: '#166534' },
  cosmic: { primary: '#ec4899', secondary: '#be185d', background: '#0f0519', foreground: '#fce7f3', accent: '#f472b6', muted: '#9d174d' },
  ocean: { primary: '#3b82f6', secondary: '#1d4ed8', background: '#0c1929', foreground: '#dbeafe', accent: '#60a5fa', muted: '#1e40af' },
  sunset: { primary: '#f97316', secondary: '#c2410c', background: '#1a0f0a', foreground: '#fff7ed', accent: '#fb923c', muted: '#9a3412' },
};

export function useThemeManager() {
  const [currentTheme, setCurrentTheme] = useState<string>(() =>
    localStorage.getItem('gyeol_theme') ?? 'void'
  );
  const [customColors, setCustomColors] = useState<Partial<ThemeConfig>>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_custom_theme') ?? '{}'); } catch { return {}; }
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [schedule, setSchedule] = useState<{ light: string; dark: string }>({ light: '07:00', dark: '19:00' });
  const [fontScale, setFontScale] = useState(() => {
    const saved = localStorage.getItem('gyeol_font_scale');
    return saved ? parseFloat(saved) : 1;
  });

  const applyTheme = useCallback((name: string) => {
    setCurrentTheme(name);
    localStorage.setItem('gyeol_theme', name);
    const config = THEME_PRESETS[name];
    if (config) {
      const root = document.documentElement;
      Object.entries(config).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
    }
  }, []);

  const updateFontScale = useCallback((scale: number) => {
    setFontScale(scale);
    localStorage.setItem('gyeol_font_scale', String(scale));
    document.documentElement.style.fontSize = `${scale * 16}px`;
  }, []);

  const saveCustomTheme = useCallback((colors: Partial<ThemeConfig>) => {
    setCustomColors(colors);
    localStorage.setItem('gyeol_custom_theme', JSON.stringify(colors));
  }, []);

  const exportTheme = useCallback(() => {
    const config = THEME_PRESETS[currentTheme] ?? customColors;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyeol-theme-${currentTheme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentTheme, customColors]);

  const importTheme = useCallback((json: string) => {
    try {
      const config = JSON.parse(json) as ThemeConfig;
      saveCustomTheme(config);
      const root = document.documentElement;
      Object.entries(config).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });
      setCurrentTheme('custom');
      localStorage.setItem('gyeol_theme', 'custom');
    } catch { /* invalid JSON */ }
  }, [saveCustomTheme]);

  const shareThemeCode = useCallback(async () => {
    const config = THEME_PRESETS[currentTheme] ?? customColors;
    const code = btoa(JSON.stringify(config));
    await navigator.clipboard.writeText(code);
    return code;
  }, [currentTheme, customColors]);

  useEffect(() => {
    if (!scheduleEnabled) return;
    const check = () => {
      const now = new Date();
      const h = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      if (h >= schedule.light && h < schedule.dark) {
        applyTheme('nature');
      } else {
        applyTheme('void');
      }
    };
    const interval = setInterval(check, 60000);
    check();
    return () => clearInterval(interval);
  }, [scheduleEnabled, schedule, applyTheme]);

  return {
    currentTheme, presets: THEME_PRESETS,
    applyTheme, customColors, saveCustomTheme,
    exportTheme, importTheme, shareThemeCode,
    scheduleEnabled, setScheduleEnabled,
    schedule, setSchedule,
    fontScale, updateFontScale,
  };
}
