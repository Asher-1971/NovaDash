/**
 * @file settings.js
 * @description Settings & Billing: accessible tabs (hash-linked), profile form
 * (`novadash:profile`), security controls, notification switches
 * (`novadash:notificationPreferences`), plan management (`novadash:selectedPlan`),
 * a DEMO payment form (test card only, nothing stored) and invoices.
 * @module settings
 */

import {
  getProfile, saveProfile, timezoneOptions, activeSessions,
  getNotificationPreferences, saveNotificationPreferences, notificationPreferenceLabels,
  pricingPlans, getCurrentSubscription, setSelectedPlan, demoPaymentMethod, invoiceHistory,
  sumValues, formatCurrency, formatDate,
} from './store.js';
import {
  attachFormValidation, initializePasswordToggles, showToast, setButtonBusy, simulateNetworkDelay, createIcon,
} from './forms.js';
import { renderSubscriptionSummary } from './dashboard.js';
import { downloadCsv, createElementWithClass } from './analytics.js';

/* ==========================================================================
   1. Tabs (WAI-ARIA tabs pattern, roving tabindex, URL hash)
   ========================================================================== */

function initializeSettingsTabs() {
  const tabList = document.querySelector('[data-tabs] [role="tablist"]');
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];

  /** @param {HTMLElement} selectedTab @param {boolean} [moveFocus] */
  function selectTab(selectedTab, moveFocus = false) {
    tabs.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !isSelected;
    });
    if (moveFocus) selectedTab.focus();
    window.history.replaceState(null, '', `#${selectedTab.dataset.tab}`);
  }

  tabList.addEventListener('click', (clickEvent) => {
    const clickedTab = clickEvent.target.closest('[role="tab"]');
    if (clickedTab) selectTab(clickedTab);
  });
  tabList.addEventListener('keydown', (keyboardEvent) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    const keyTargets = {
      ArrowRight: tabs[(currentIndex + 1) % tabs.length],
      ArrowLeft: tabs[(currentIndex - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    };
    if (keyTargets[keyboardEvent.key]) {
      keyboardEvent.preventDefault();
      selectTab(keyTargets[keyboardEvent.key], true);
    }
  });

  const selectTabFromHash = () => {
    const hashTab = tabs.find((tab) => `#${tab.dataset.tab}` === window.location.hash);
    if (hashTab) selectTab(hashTab);
  };
  window.addEventListener('hashchange', selectTabFromHash);
  selectTabFromHash();
}

/* ==========================================================================
   2. Profile
   ========================================================================== */

function initializeProfileForm() {
  const profileForm = document.querySelector('[data-profile-form]');
  const validateProfileForm = attachFormValidation(profileForm);
  const timezoneSelect = profileForm.elements.timezone;
  timezoneSelect.replaceChildren(...timezoneOptions.map((timezone) => new Option(timezone, timezone)));

  const fillProfileForm = () => {
    const profile = getProfile();
    ['fullName', 'email', 'role', 'company', 'timezone'].forEach((fieldName) => {
      profileForm.elements[fieldName].value = profile[fieldName];
    });
  };
  fillProfileForm();

  profileForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validateProfileForm()) return;
    const submitButton = profileForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay(400);
    saveProfile(Object.fromEntries(['fullName', 'email', 'role', 'company', 'timezone']
      .map((fieldName) => [fieldName, profileForm.elements[fieldName].value.trim()])));
    setButtonBusy(submitButton, false);
    // app.js listens for this and re-renders the name/initials in the topbar.
    window.dispatchEvent(new CustomEvent('novadash:profilechange'));
    showToast('Profile saved. Your name now shows across every page.');
  });

  profileForm.addEventListener('reset', (resetEvent) => {
    resetEvent.preventDefault();
    fillProfileForm();
    profileForm.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.setAttribute('aria-invalid', 'false'));
    profileForm.querySelectorAll('[data-field-error]').forEach((errorElement) => { errorElement.textContent = ''; });
    showToast('Changes discarded.', 'info');
  });
}

/* ==========================================================================
   3. Security: password form, two-factor switch, sessions
   ========================================================================== */

function initializeSecurityPanel() {
  const passwordForm = document.querySelector('[data-password-form]');
  passwordForm.querySelector('[data-profile-username]').value = getProfile().email;
  const validatePasswordForm = attachFormValidation(passwordForm);
  passwordForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validatePasswordForm()) return;
    const submitButton = passwordForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    setButtonBusy(submitButton, false);
    passwordForm.reset();
    showToast('Password updated (simulated). Nothing was sent or stored.');
  });

  const twoFactorSwitch = document.querySelector('[data-two-factor-switch]');
  const twoFactorStatus = document.querySelector('[data-two-factor-status]');
  twoFactorSwitch.addEventListener('change', () => {
    const isEnabled = twoFactorSwitch.checked;
    twoFactorStatus.textContent = isEnabled ? 'On. Codes from your authenticator app are required at sign-in.' : 'Off. Turn on two-factor authentication to protect billing changes.';
    showToast(isEnabled ? 'Two-factor authentication turned on for this demo visit.' : 'Two-factor authentication turned off.', isEnabled ? 'success' : 'info');
  });

  const sessionList = document.querySelector('[data-session-list]');
  const signOutOthersButton = document.querySelector('[data-sign-out-others]');
  let remainingSessions = [...activeSessions];

  function renderSessions() {
    sessionList.replaceChildren(...remainingSessions.map((session) => {
      const sessionItem = createElementWithClass('li', 'session-list__item');
      const deviceText = createElementWithClass('div', '');
      deviceText.removeAttribute('class');
      deviceText.append(
        createElementWithClass('span', 'session-list__device', session.device),
        createElementWithClass('span', 'session-list__meta', `${session.location} · ${session.lastActive}`),
      );
      let actionElement;
      if (session.isCurrent) {
        actionElement = createElementWithClass('span', 'status-badge status-badge--success', 'This device');
      } else {
        actionElement = createElementWithClass('button', 'button button--secondary button--small', 'Sign out');
        actionElement.type = 'button';
        actionElement.setAttribute('aria-label', `Sign out ${session.device}`);
        actionElement.addEventListener('click', () => {
          remainingSessions = remainingSessions.filter((remaining) => remaining.id !== session.id);
          renderSessions();
          showToast(`Signed out ${session.device}.`);
          signOutOthersButton.focus();
        });
      }
      sessionItem.append(createIcon(session.device.includes('iPhone') ? 'smartphone' : 'server'), deviceText, actionElement);
      return sessionItem;
    }));
    signOutOthersButton.disabled = remainingSessions.length <= 1;
  }

  signOutOthersButton.addEventListener('click', () => {
    remainingSessions = remainingSessions.filter((session) => session.isCurrent);
    renderSessions();
    showToast('Signed out of every other session.');
  });
  renderSessions();
}

/* ==========================================================================
   4. Notifications (persisted)
   ========================================================================== */

function initializeNotificationSwitches() {
  const switchList = document.querySelector('[data-notification-list]');
  const preferences = getNotificationPreferences();

  switchList.replaceChildren(...Object.entries(notificationPreferenceLabels).map(([preferenceKey, labelText]) => {
    const switchRow = createElementWithClass('div', 'switch-field');
    const inputId = `notification-${preferenceKey}`;
    const textWrapper = createElementWithClass('div', 'switch-field__text');
    const label = createElementWithClass('label', 'switch-field__label', labelText.label);
    label.htmlFor = inputId;
    const description = createElementWithClass('p', 'switch-field__description', labelText.description);
    description.id = `${inputId}-description`;
    textWrapper.append(label, description);
    const switchInput = createElementWithClass('input', 'switch-field__input');
    switchInput.type = 'checkbox';
    switchInput.id = inputId;
    switchInput.setAttribute('role', 'switch');
    switchInput.setAttribute('aria-describedby', description.id);
    switchInput.checked = preferences[preferenceKey];
    switchInput.addEventListener('change', () => {
      const updatedPreferences = { ...getNotificationPreferences(), [preferenceKey]: switchInput.checked };
      saveNotificationPreferences(updatedPreferences);
      showToast(`${labelText.label} ${switchInput.checked ? 'on' : 'off'}. Saved.`);
    });
    switchRow.append(textWrapper, switchInput);
    return switchRow;
  }));
}

/* ==========================================================================
   5. Billing: modals, plan change, demo payment method, invoices
   ========================================================================== */

/** Generic <dialog> wiring: [data-modal-open="dialogId"] and [data-modal-close]. */
export function initializeModals() {
  let lastTrigger = null;
  document.querySelectorAll('[data-modal-open]').forEach((openButton) => {
    openButton.addEventListener('click', () => {
      lastTrigger = openButton;
      document.getElementById(openButton.dataset.modalOpen).showModal();
    });
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.querySelectorAll('[data-modal-close]').forEach((closeButton) => closeButton.addEventListener('click', () => dialog.close()));
    // Click on the backdrop (outside the panel) closes the dialog.
    dialog.addEventListener('click', (clickEvent) => { if (clickEvent.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { lastTrigger?.focus(); });
  });
}

function renderPlanOptions() {
  const subscription = getCurrentSubscription();
  const planOptionList = document.querySelector('[data-plan-options]');
  const selfServePlans = pricingPlans.filter((plan) => plan.monthlyPrice !== null);
  const fieldsetLegend = planOptionList.querySelector('legend');
  planOptionList.replaceChildren(fieldsetLegend, ...selfServePlans.map((plan) => {
    const optionLabel = createElementWithClass('label', 'plan-option');
    const radio = document.createElement('input');
    radio.className = 'plan-option__input';
    radio.type = 'radio';
    radio.name = 'planId';
    radio.value = plan.id;
    radio.checked = plan.id === subscription.plan.id;
    const textWrapper = createElementWithClass('span', '');
    textWrapper.removeAttribute('class');
    textWrapper.append(
      createElementWithClass('span', 'plan-option__name', plan.id === subscription.plan.id ? `${plan.name} (current)` : plan.name),
      createElementWithClass('span', 'plan-option__detail', plan.highlights.slice(0, 2).join(' · ')),
    );
    const price = createElementWithClass('span', 'plan-option__price', plan.monthlyPrice === 0 ? 'Free' : `$${plan.monthlyPrice}/mo`);
    optionLabel.append(radio, textWrapper, price);
    return optionLabel;
  }));
  document.querySelector('[data-plan-cycle-select]').value = subscription.cycle;
}

function initializePlanChange() {
  const planForm = document.querySelector('[data-plan-form]');
  renderPlanOptions();
  document.querySelector('[data-modal-open="changePlanModal"]').addEventListener('click', renderPlanOptions);

  planForm.addEventListener('submit', (submitEvent) => {
    submitEvent.preventDefault();
    const chosenPlanId = planForm.elements.planId.value;
    const chosenCycle = planForm.elements.cycle.value;
    const previousSubscription = getCurrentSubscription();
    setSelectedPlan(chosenPlanId, chosenCycle);
    planForm.closest('dialog').close();
    renderSubscriptionSummary();
    const updatedSubscription = getCurrentSubscription();
    const changed = previousSubscription.plan.id !== chosenPlanId || previousSubscription.cycle !== chosenCycle;
    showToast(changed
      ? `Switched to ${updatedSubscription.plan.name}, billed ${chosenCycle === 'annual' ? 'annually' : 'monthly'}. Next invoice: ${formatCurrency(updatedSubscription.nextInvoiceAmount, { cents: true })}.`
      : 'No change: you are already on this plan.', changed ? 'success' : 'info');
  });

  const planChangedParam = new URLSearchParams(window.location.search).get('planChanged');
  if (planChangedParam) {
    showToast(`You are now on the ${getCurrentSubscription().plan.name} plan.`);
    window.history.replaceState(null, '', 'settings.html#billing');
  }
}

function initializePaymentMethod() {
  const cardDetails = { ...demoPaymentMethod };
  const renderCard = () => {
    document.querySelector('[data-card-number]').textContent = `${cardDetails.brand} ending in ${cardDetails.last4}`;
    document.querySelector('[data-card-expiry]').textContent = `Expires ${String(cardDetails.expiryMonth).padStart(2, '0')}/${cardDetails.expiryYear} · ${cardDetails.holderName}`;
  };
  renderCard();

  const paymentForm = document.querySelector('[data-payment-form]');
  const validatePaymentForm = attachFormValidation(paymentForm);
  paymentForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validatePaymentForm()) return;
    const submitButton = paymentForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    setButtonBusy(submitButton, false);
    const [expiryMonth, expiryYear] = paymentForm.elements.cardExpiry.value.split('/');
    cardDetails.expiryMonth = Number(expiryMonth);
    cardDetails.expiryYear = 2000 + Number(expiryYear);
    cardDetails.holderName = paymentForm.elements.cardName.value.trim();
    renderCard();
    // Clear every field: card data is never kept, even in memory.
    paymentForm.reset();
    paymentForm.closest('dialog').close();
    showToast('Demo card updated. Nothing was charged, sent or stored.');
  });
}

function renderInvoices() {
  const tableBody = document.querySelector('[data-invoice-table]');
  tableBody.replaceChildren(...invoiceHistory.map((invoice) => {
    const tableRow = createElementWithClass('tr', 'data-table__row');
    const idCell = createElementWithClass('th', 'data-table__cell data-table__cell--mono', invoice.id);
    idCell.scope = 'row';
    const dateCell = createElementWithClass('td', 'data-table__cell', formatDate(invoice.issuedOn));
    const descriptionCell = createElementWithClass('td', 'data-table__cell data-table__cell--muted', invoice.description);
    const amountCell = createElementWithClass('td', 'data-table__cell data-table__cell--numeric', formatCurrency(invoice.amount, { cents: true }));
    const statusCell = createElementWithClass('td', 'data-table__cell');
    statusCell.append(createElementWithClass('span', 'status-badge status-badge--success', invoice.status));
    tableRow.append(idCell, dateCell, descriptionCell, amountCell, statusCell);
    return tableRow;
  }));
  document.querySelector('[data-invoice-total]').textContent = formatCurrency(sumValues(invoiceHistory.map((invoice) => invoice.amount)), { cents: true });
  document.querySelector('[data-invoice-count]').textContent = `${invoiceHistory.length} invoices`;
  document.querySelector('[data-invoice-export]').addEventListener('click', () => {
    downloadCsv('novadash-invoices.csv', [['invoice', 'issued_on', 'description', 'amount_usd', 'status'], ...invoiceHistory.map((invoice) => [invoice.id, invoice.issuedOn, invoice.description, invoice.amount.toFixed(2), invoice.status])]);
    showToast('Invoice history downloaded as CSV.');
  });
}

/** Entry point for pages/settings.html (called by app.js). */
export default function initializeSettingsPage() {
  initializeSettingsTabs();
  initializePasswordToggles();
  initializeProfileForm();
  initializeSecurityPanel();
  initializeNotificationSwitches();
  initializeModals();
  initializePlanChange();
  initializePaymentMethod();
  renderSubscriptionSummary();
  renderInvoices();
}
