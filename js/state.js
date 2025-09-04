import { newId, crossBasketGradient } from './utils.js';

export const APP_KEY = 'aethernote.v9-advanced-theming';
export const THEMES_KEY = 'aethernote.themes.v3';

export let state = { bookshelves: [], active: 0, activeTheme: 'Cyber Glow' };
export let userThemes = [];

// This function will be set by app.js to avoid circular dependencies
let triggerRender = () => {};
export function setRenderFunction(renderFunc) {
  triggerRender = renderFunc;
}

export function updateUserThemes(newThemes) {
    userThemes = newThemes;
}

export function normalizeState(s) {
  (s.bookshelves || []).forEach(bs => {
    if (!bs.id) bs.id = newId();
    (bs.shelves || []).forEach(sh => {
      if (!sh.id) sh.id = newId();
      if (!sh.addGradient) sh.addGradient = crossBasketGradient();
      (sh.books || []).forEach(bk => {
        if (!bk.id) bk.id = newId();
        if (!bk.gradient) bk.gradient = crossBasketGradient();
        if (!bk.tags) bk.tags = [];
      });
    });
  });
}

export function saveToStorage() {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

export function loadFromStorage() {
  const raw = localStorage.getItem(APP_KEY);
  if (raw) {
    try {
      const loadedState = JSON.parse(raw);
      state = loadedState;
      normalizeState(state);
    } catch (e) {
      console.error("Failed to parse state", e);
      state = { bookshelves: [], active: 0, activeTheme: 'Cyber Glow' };
    }
  }
}

export function modifyState(callback, shouldRender = true) {
  callback(state);
  saveToStorage();
  if (shouldRender) {
    triggerRender();
  }
}