/**
 * @file navigation.js
 * @description Navigation behaviour shared by every page:
 *  - app sidebar: mobile drawer (open/close, scrim, Escape, focus return)
 *  - app sidebar: desktop collapse, persisted in `novadash:sidebarCollapsed`
 *  - marketing header: mobile menu toggle
 *  - user menu: accessible dropdown (Escape, arrow keys, outside click)
 *
 * Utility module: intentionally does NOT import store.js (DESIGN.md section 8).
 * @module navigation
 */

/** Mirrors store.storageKeys.sidebarCollapsed. */
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'novadash:sidebarCollapsed';

const desktopSidebarQuery = window.matchMedia('(min-width: 64em)');

/* --------------------------------------------------------------------------
   App sidebar
   -------------------------------------------------------------------------- */

/** @returns {boolean} */
function readSidebarCollapsed() {
  try {
    return JSON.parse(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)) === true;
  } catch {
    return false;
  }
}

/** @param {boolean} isCollapsed */
function writeSidebarCollapsed(isCollapsed) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, JSON.stringify(isCollapsed));
  } catch {
    /* storage unavailable */
  }
}

/** Wire the sidebar drawer (mobile) and rail collapse (desktop). */
function initializeSidebarNavigation() {
  const appShell = document.querySelector('[data-app-shell]');
  const sidebar = document.querySelector('[data-sidebar]');
  if (!appShell || !sidebar) return;

  const openButton = document.querySelector('[data-sidebar-open]');
  const scrim = document.querySelector('[data-sidebar-scrim]');
  const collapseButton = document.querySelector('[data-sidebar-collapse]');

  /** @param {boolean} shouldOpen */
  function setMobileSidebarOpen(shouldOpen) {
    sidebar.classList.toggle('is-open', shouldOpen);
    scrim.hidden = !shouldOpen;
    openButton?.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) {
      sidebar.querySelector('a, button')?.focus();
    } else if (!desktopSidebarQuery.matches) {
      openButton?.focus();
    }
  }

  openButton?.addEventListener('click', () => setMobileSidebarOpen(true));
  scrim?.addEventListener('click', () => setMobileSidebarOpen(false));
  document.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'Escape' && sidebar.classList.contains('is-open')) setMobileSidebarOpen(false);
  });

  // Leaving mobile width with the drawer open: reset it.
  desktopSidebarQuery.addEventListener('change', () => {
    sidebar.classList.remove('is-open');
    if (scrim) scrim.hidden = true;
    openButton?.setAttribute('aria-expanded', 'false');
  });

  /** @param {boolean} isCollapsed */
  function applySidebarCollapsed(isCollapsed) {
    appShell.classList.toggle('is-sidebar-collapsed', isCollapsed);
    if (!collapseButton) return;
    collapseButton.setAttribute('aria-expanded', String(!isCollapsed));
    collapseButton.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    const collapseIcon = collapseButton.querySelector('use');
    collapseIcon?.setAttribute('href', collapseIcon.getAttribute('href').replace(/#icon-.*$/, isCollapsed ? '#icon-panel-left-open' : '#icon-panel-left-close'));
    // Collapsed rail hides labels, so expose each link's name as a tooltip.
    sidebar.querySelectorAll('nav a').forEach((sidebarLink) => {
      if (isCollapsed) sidebarLink.title = sidebarLink.textContent.trim();
      else sidebarLink.removeAttribute('title');
    });
  }

  applySidebarCollapsed(readSidebarCollapsed());
  collapseButton?.addEventListener('click', () => {
    const isCollapsed = !appShell.classList.contains('is-sidebar-collapsed');
    writeSidebarCollapsed(isCollapsed);
    applySidebarCollapsed(isCollapsed);
  });

  window.addEventListener('storage', (storageEvent) => {
    if (storageEvent.key === SIDEBAR_COLLAPSED_STORAGE_KEY) applySidebarCollapsed(readSidebarCollapsed());
  });
}

/* --------------------------------------------------------------------------
   Marketing header (mobile menu)
   -------------------------------------------------------------------------- */

function initializeSiteHeaderMenu() {
  const menuButton = document.querySelector('[data-site-menu-toggle]');
  const siteNav = document.querySelector('[data-site-nav]');
  if (!menuButton || !siteNav) return;

  /** @param {boolean} shouldOpen */
  function setSiteMenuOpen(shouldOpen) {
    siteNav.classList.toggle('is-open', shouldOpen);
    menuButton.setAttribute('aria-expanded', String(shouldOpen));
    menuButton.setAttribute('aria-label', shouldOpen ? 'Close menu' : 'Open menu');
    menuButton.querySelector('use')?.setAttribute('href', menuButton.querySelector('use').getAttribute('href').replace(/#icon-.*$/, shouldOpen ? '#icon-x' : '#icon-menu'));
  }

  menuButton.addEventListener('click', () => setSiteMenuOpen(!siteNav.classList.contains('is-open')));
  siteNav.addEventListener('click', (clickEvent) => {
    if (clickEvent.target.closest('a')) setSiteMenuOpen(false);
  });
  document.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'Escape' && siteNav.classList.contains('is-open')) {
      setSiteMenuOpen(false);
      menuButton.focus();
    }
  });
}

/* --------------------------------------------------------------------------
   User menu (menu-button pattern)
   -------------------------------------------------------------------------- */

function initializeUserMenu() {
  const userMenu = document.querySelector('[data-user-menu]');
  if (!userMenu) return;
  const triggerButton = userMenu.querySelector('[data-user-menu-trigger]');
  const menuPanel = userMenu.querySelector('[data-user-menu-panel]');
  const getMenuItems = () => [...menuPanel.querySelectorAll('[role="menuitem"]')];

  /** @param {boolean} shouldOpen @param {boolean} [focusFirst] */
  function setUserMenuOpen(shouldOpen, focusFirst = false) {
    menuPanel.hidden = !shouldOpen;
    triggerButton.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen && focusFirst) getMenuItems()[0]?.focus();
  }

  triggerButton.addEventListener('click', () => setUserMenuOpen(menuPanel.hidden, true));

  triggerButton.addEventListener('keydown', (keyboardEvent) => {
    if (keyboardEvent.key === 'ArrowDown') {
      keyboardEvent.preventDefault();
      setUserMenuOpen(true, true);
    }
  });

  menuPanel.addEventListener('keydown', (keyboardEvent) => {
    const menuItems = getMenuItems();
    const currentIndex = menuItems.indexOf(document.activeElement);
    if (keyboardEvent.key === 'Escape') {
      setUserMenuOpen(false);
      triggerButton.focus();
    } else if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
      keyboardEvent.preventDefault();
      const step = keyboardEvent.key === 'ArrowDown' ? 1 : -1;
      menuItems[(currentIndex + step + menuItems.length) % menuItems.length].focus();
    } else if (keyboardEvent.key === 'Home' || keyboardEvent.key === 'End') {
      keyboardEvent.preventDefault();
      menuItems[keyboardEvent.key === 'Home' ? 0 : menuItems.length - 1].focus();
    } else if (keyboardEvent.key === 'Tab') {
      setUserMenuOpen(false);
    }
  });

  document.addEventListener('click', (clickEvent) => {
    if (!menuPanel.hidden && !userMenu.contains(clickEvent.target)) setUserMenuOpen(false);
  });
}

/** Initialise every navigation behaviour present on the current page. */
export function initializeNavigation() {
  initializeSidebarNavigation();
  initializeSiteHeaderMenu();
  initializeUserMenu();
}
