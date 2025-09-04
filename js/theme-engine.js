import { ICONS, cleanSvg } from './icons.js';
import { state, modifyState, userThemes, updateUserThemes, THEMES_KEY } from './state.js';

export const SYSTEM_THEMES = [
  { 
    name: 'Cyber Glow', 
    isSystem: true, 
    styles: {
      colors: { 
        '--bg-1': '#0d0221', 
        '--bg-2': '#24174d', 
        '--accent': '#00d5ff', 
        '--ink': '#f0f0f0', 
        '--ink-dim':'#a0a0a0', 
        '--panel-10': 'rgba(36, 23, 77, 0.6)',
        '--panel-16': 'rgba(13, 2, 33, 0.6)',
        '--panel-24': 'rgba(36, 23, 77, 0.7)',
        '--panel-border': 'rgba(255, 255, 255, 0.1)'
      },
      dimensions: { '--r-sm': '10px', '--r-md': '12px', '--border-thickness': '1px' },
      shadows: { 
        '--shadow-1': '0 8px 30px rgba(13, 2, 33, 0.4)',
        '--shadow-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)' 
      }
    }
  },
  { 
    name: 'Soft Material', 
    isSystem: true, 
    styles: {
      colors: { 
        '--bg-1': '#F4F6F8', 
        '--bg-2': '#FFFFFF', 
        '--accent': '#3498DB', 
        '--ink': '#2C3E50', 
        '--ink-dim': '#7F8C8D', 
        '--panel-10': 'rgba(255, 255, 255, 0.5)',
        '--panel-16': 'rgba(244, 246, 248, 0.5)',
        '--panel-24': 'rgba(255, 255, 255, 0.6)',
        '--panel-border': 'rgba(0, 0, 0, 0.1)'
      },
      dimensions: { '--r-sm': '8px', '--r-md': '16px', '--border-thickness': '1px' },
      shadows: { 
        '--shadow-1': '0 4px 12px rgba(220, 220, 220, 0.5)',
        '--shadow-inset': 'inset 0 1px 2px rgba(0, 0, 0, 0.05)' 
      }
    }
  },
];

let systemThemes = [];

export function getIconsForTheme(theme) {
  const themeIcons = (theme && theme.styles && theme.styles.icons) || {};
  const mergedIcons = { ...ICONS.default };
  Object.keys(themeIcons).forEach(key => {
    if (themeIcons[key]) {
      mergedIcons[key] = cleanSvg(themeIcons[key]);
    }
  });
  return mergedIcons;
}

export function applyTheme(theme) {
  if (!theme || !theme.styles) return;
  for (const category in theme.styles) {
    if (category !== 'icons') {
      for (const key in theme.styles[category]) {
        document.documentElement.style.setProperty(key, theme.styles[category][key]);
      }
    }
  }
  modifyState(s => s.activeTheme = theme.name);
}

export function loadUserThemes() {
  const raw = localStorage.getItem(THEMES_KEY);
  if (raw) {
    updateUserThemes(JSON.parse(raw));
  }
}

export function saveUserThemes() {
  localStorage.setItem(THEMES_KEY, JSON.stringify(userThemes));
}

export async function loadSystemThemes() {
  try {
    const response = await fetch('./themes.json');
    if (response.ok) {
      const themesData = await response.json();
      if (themesData.themes && Array.isArray(themesData.themes)) {
        systemThemes = themesData.themes.map(theme => ({ ...theme, isSystem: true }));
        return;
      }
      console.error('Invalid themes.json format');
    }
  } catch (error) {
    console.error('Failed to load themes.json', error);
  }
}

export function getAllThemes() {
  return [...SYSTEM_THEMES, ...systemThemes, ...userThemes];
}

export function getThemeByName(name) {
  return getAllThemes().find(t => t.name === name) || SYSTEM_THEMES[0];
}