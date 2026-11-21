/**
 * @file theme.js
 * @description Dark/light theme: reads `novadash:theme`, falls back to the OS
 * preference, writes `data-theme` on <html>, wires every [data-theme-toggle]
 * button and keeps open tabs in sync through the `storage` event.
 *
 * Utility module: intentionally does NOT import store.js (DESIGN.md section 8).
 * The key below mirrors `storageKeys.theme` in store.js.
 * @module theme
 */

/** localStorage key for the theme preference (mirrors store.storageKeys.theme). */
const THEME_STORAGE_KEY = 'novadash:theme';

/** @typedef {'dark'|'light'} ThemeName */

const prefersLightQuery = window.matchMedia('(prefers-color-scheme: light)');

/** @returns {ThemeName|null} the stored theme, or null when none/invalid */
function readStoredTheme() {
  try {
    const storedTheme = JSON.parse(window.localStorage.getItem(THEME_STORAGE_KEY));
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : null;
  } catch {
    return null;
  }
}

/** @param {ThemeName} themeName */
function writeStoredTheme(themeName) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeName));
  } catch {
    /* storage unavailable: theme still applies for this page view */
  }
}

/** @returns {ThemeName} the theme the page should show right now */
export function resolveActiveTheme() {
  return readStoredTheme() ?? (prefersLightQuery.matches ? 'light' : 'dark');
}

/**
 * Apply a theme to the document and refresh every toggle's accessible state.
 * @param {ThemeName} themeName
 */
export function applyTheme(themeName) {
  document.documentElement.dataset.theme = themeName;
  document.querySelectorAll('[data-theme-toggle]').forEach((toggleButton) => {
    const nextTheme = themeName === 'dark' ? 'light' : 'dark';
    toggleButton.setAttribute('aria-pressed', String(themeName === 'light'));
    toggleButton.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
    toggleButton.title = `Switch to ${nextTheme} theme`;
  });
}

/** Flip between dark and light, persist the choice, and return the new theme. */
export function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  writeStoredTheme(nextTheme);
  applyTheme(nextTheme);
  return nextTheme;
}

/** Wire toggles and listeners. Call once per page after the DOM is parsed. */
export function initializeTheme() {
  applyTheme(resolveActiveTheme());

  document.querySelectorAll('[data-theme-toggle]').forEach((toggleButton) => {
    toggleButton.addEventListener('click', toggleTheme);
  });

  // Another tab changed the theme: follow it.
  window.addEventListener('storage', (storageEvent) => {
    if (storageEvent.key === THEME_STORAGE_KEY) applyTheme(resolveActiveTheme());
  });

  // No stored choice: follow live OS changes.
  prefersLightQuery.addEventListener('change', () => {
    if (readStoredTheme() === null) applyTheme(resolveActiveTheme());
  });
}

// Apply as early as possible (module evaluation), before the rest of app.js runs.
applyTheme(resolveActiveTheme());
