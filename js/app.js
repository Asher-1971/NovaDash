/**
 * @file app.js
 * @description The single entry module loaded by every page:
 *   <script type="module" src="js/app.js"></script>        (index.html)
 *   <script type="module" src="../js/app.js"></script>     (pages/*.html)
 *
 * Responsibilities:
 *  1. Apply the theme and wire navigation (theme.js, navigation.js).
 *  2. Guard app pages behind the SIMULATED session (`data-requires-session`).
 *  3. Render the shared profile (name, email, initials) and sign-out controls.
 *  4. Keep state in sync across pages and open tabs (`storage` event).
 *  5. Load the feature module(s) for `<body data-page="...">`.
 *
 * ES modules need an HTTP origin. Serve the project root with:
 *   python -m http.server 5173 --bind 127.0.0.1
 * @module app
 */

import { initializeTheme } from './theme.js';
import { initializeNavigation } from './navigation.js';
import {
  getDemoSession, endDemoSession, getProfile, storageKeys,
} from './store.js';

/**
 * Feature modules per page. Each loader resolves once the page is rendered.
 * @type {Record<string, Array<() => Promise<void>>>}
 */
const pageModuleLoaders = {
  landing: [
    () => import('./dashboard.js').then((module) => module.initializeLandingPreview()),
    () => import('./pricing.js').then((module) => module.default()),
  ],
  pricing: [() => import('./pricing.js').then((module) => module.default())],
  login: [() => import('./forms.js').then((module) => module.default())],
  register: [() => import('./forms.js').then((module) => module.default())],
  'forgot-password': [() => import('./forms.js').then((module) => module.default())],
  dashboard: [() => import('./dashboard.js').then((module) => module.default())],
  analytics: [() => import('./analytics.js').then((module) => module.default())],
  settings: [() => import('./settings.js').then((module) => module.default())],
};

/** @returns {boolean} true when the page requires a (simulated) session */
const pageRequiresSession = () => document.body.hasAttribute('data-requires-session');

/**
 * Redirect app pages to login when there is no demo session.
 * @returns {boolean} true when a redirect was triggered
 */
function enforceDemoSession() {
  if (!pageRequiresSession() || getDemoSession()) return false;
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  window.location.replace(`login.html?next=${encodeURIComponent(currentPage)}`);
  return true;
}

/** @param {string} fullName @returns {string} up to two initials, e.g. "PR" */
function getInitials(fullName) {
  return fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((namePart) => namePart[0].toUpperCase()).join('') || 'ND';
}

/** Fill every [data-profile-*] slot from the stored profile. */
export function renderProfileIdentity() {
  const profile = getProfile();
  document.querySelectorAll('[data-profile-name]').forEach((element) => { element.textContent = profile.fullName; });
  document.querySelectorAll('[data-profile-first-name]').forEach((element) => { element.textContent = profile.fullName.split(' ')[0]; });
  document.querySelectorAll('[data-profile-email]').forEach((element) => { element.textContent = profile.email; });
  document.querySelectorAll('[data-profile-initials]').forEach((element) => { element.textContent = getInitials(profile.fullName); });
}

/** Sign-out buttons end the demo session and return to login. */
function initializeSignOut() {
  document.querySelectorAll('[data-sign-out]').forEach((signOutButton) => {
    signOutButton.addEventListener('click', () => {
      endDemoSession();
      window.location.href = signOutButton.dataset.signOut || 'login.html?signedOut=1';
    });
  });
}

/** Marketing pages: swap "Sign in" for "Open dashboard" when a demo session exists. */
function renderSessionAwareLinks() {
  if (!getDemoSession()) return;
  document.querySelectorAll('[data-session-link]').forEach((sessionLink) => {
    sessionLink.href = sessionLink.dataset.sessionHref;
    sessionLink.textContent = 'Open dashboard';
  });
}

/** React to changes made in other tabs (theme is handled inside theme.js). */
function synchronizeAcrossTabs() {
  window.addEventListener('storage', (storageEvent) => {
    if (storageEvent.key === storageKeys.profile) renderProfileIdentity();
    if (storageEvent.key === storageKeys.demoSession) enforceDemoSession();
  });
  // Same-tab profile edits (settings.js dispatches this after saving).
  window.addEventListener('novadash:profilechange', renderProfileIdentity);
}

/** Boot sequence for every page. */
async function startApplication() {
  initializeTheme();
  if (enforceDemoSession()) return;
  initializeNavigation();
  renderProfileIdentity();
  initializeSignOut();
  renderSessionAwareLinks();
  synchronizeAcrossTabs();

  const loaders = pageModuleLoaders[document.body.dataset.page] ?? [];
  const results = await Promise.allSettled(loaders.map((loadModule) => loadModule()));
  results
    .filter((result) => result.status === 'rejected')
    .forEach((failure) => console.error('[NovaDash] Feature module failed to load:', failure.reason));
  document.documentElement.dataset.ready = 'true';
}

startApplication();
