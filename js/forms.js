/**
 * @file forms.js
 * @description Form validation, user feedback (toasts, busy buttons, icons)
 * and the SIMULATED auth flows for login, register and forgot-password.
 *
 * Validation model: forms carry `novalidate`; each field wrapper has
 * `data-field`, its error paragraph has `data-field-error` and is referenced by
 * the input's aria-describedby. Native constraints (required, type, minlength,
 * pattern) plus `data-match` and `data-test-card` drive the messages.
 *
 * Authentication here is a demo: nothing is sent anywhere, no password is
 * stored, and the "session" is a localStorage flag (`novadash:demoSession`).
 * @module forms
 */

import {
  startDemoSession, saveProfile, setSelectedPlan, pricingPlans, getDemoSession,
} from './store.js';

/** Absolute URL of the icon sprite, resolved from this module's location. */
const iconSpriteUrl = new URL('../assets/icons/sprite.svg', import.meta.url).href;

/** Pages a `?next=` redirect may point to (prevents open redirects). */
const allowedRedirectPages = ['dashboard.html', 'analytics.html', 'settings.html'];

/* ==========================================================================
   1. Small DOM helpers shared by feature modules
   ========================================================================== */

/**
 * Create a decorative Lucide icon from the sprite.
 * @param {string} iconName e.g. "circle-alert"
 * @param {string} [extraClassName] additional BEM classes
 * @returns {SVGSVGElement}
 */
export function createIcon(iconName, extraClassName = '') {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const iconElement = document.createElementNS(svgNamespace, 'svg');
  iconElement.setAttribute('class', `icon ${extraClassName}`.trim());
  iconElement.setAttribute('aria-hidden', 'true');
  iconElement.setAttribute('focusable', 'false');
  const useElement = document.createElementNS(svgNamespace, 'use');
  useElement.setAttribute('href', `${iconSpriteUrl}#icon-${iconName}`);
  iconElement.append(useElement);
  return iconElement;
}

/**
 * Show a toast in the page's live region (created on first use).
 * Auto-dismisses after 5 s; the timer pauses while hovered or focused.
 * @param {string} message
 * @param {'success'|'error'|'info'} [variant='success']
 */
export function showToast(message, variant = 'success') {
  let toastRegion = document.querySelector('[data-toast-region]');
  if (!toastRegion) {
    toastRegion = document.createElement('div');
    toastRegion.className = 'toast-region';
    toastRegion.dataset.toastRegion = '';
    toastRegion.setAttribute('aria-live', 'polite');
    document.body.append(toastRegion);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast--${variant}`;
  toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  const iconName = { success: 'circle-check', error: 'circle-alert', info: 'info' }[variant];
  const messageElement = document.createElement('p');
  messageElement.className = 'toast__message';
  messageElement.textContent = message;
  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'toast__dismiss';
  dismissButton.setAttribute('aria-label', 'Dismiss notification');
  dismissButton.append(createIcon('x', 'icon--sm'));
  toast.append(createIcon(iconName, 'toast__icon'), messageElement, dismissButton);
  toastRegion.append(toast);

  const removeToast = () => toast.remove();
  let dismissTimer = window.setTimeout(removeToast, 5000);
  const pauseTimer = () => window.clearTimeout(dismissTimer);
  const resumeTimer = () => { dismissTimer = window.setTimeout(removeToast, 5000); };
  toast.addEventListener('mouseenter', pauseTimer);
  toast.addEventListener('mouseleave', resumeTimer);
  toast.addEventListener('focusin', pauseTimer);
  toast.addEventListener('focusout', resumeTimer);
  dismissButton.addEventListener('click', removeToast);
}

/**
 * Put a submit button into (or out of) its loading state.
 * @param {HTMLButtonElement} button @param {boolean} isBusy
 */
export function setButtonBusy(button, isBusy) {
  button.setAttribute('aria-busy', String(isBusy));
  button.disabled = isBusy;
}

/** @param {number} milliseconds @returns {Promise<void>} simulated network delay */
export const simulateNetworkDelay = (milliseconds = 650) => new Promise((resolve) => { window.setTimeout(resolve, milliseconds); });

/* ==========================================================================
   2. Field validation
   ========================================================================== */

/**
 * @param {HTMLInputElement} field @returns {string} the label text without "(optional)"
 */
function getFieldLabelText(field) {
  const labelElement = field.labels?.[0];
  return labelElement ? labelElement.childNodes[0].textContent.trim() : 'This field';
}

/**
 * Decide the error message for one field ('' when valid).
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} field
 * @returns {string}
 */
export function getFieldErrorMessage(field) {
  const fieldLabel = getFieldLabelText(field);
  const trimmedValue = field.value.trim();
  const { validity } = field;

  if (field.type === 'checkbox') {
    return field.required && !field.checked ? field.dataset.requiredMessage || `${fieldLabel} is required.` : '';
  }
  if (validity.valueMissing || (field.required && trimmedValue === '')) return `${fieldLabel} is required.`;
  if (trimmedValue === '') return '';
  // HTML's email type accepts dotless domains ("sam@bad"); also require a TLD.
  if (field.type === 'email' && (validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedValue))) {
    return 'Enter an email address like name@company.com.';
  }
  if (validity.tooShort) return `${fieldLabel} must be at least ${field.minLength} characters.`;
  if (validity.patternMismatch) return field.dataset.patternMessage || `${fieldLabel} is not in the expected format.`;
  if (field.dataset.match) {
    const matchedField = document.getElementById(field.dataset.match);
    if (matchedField && matchedField.value !== field.value) return field.dataset.matchMessage || 'The values do not match.';
  }
  if (field.dataset.testCard !== undefined) {
    const digitsOnly = field.value.replace(/\s+/g, '');
    if (digitsOnly !== '4242424242424242') return 'Demo only: use the test number 4242 4242 4242 4242. Real card numbers are rejected.';
  }
  if (field.dataset.expiry !== undefined && !isFutureExpiry(trimmedValue)) return 'Enter a future expiry date as MM/YY.';
  return '';
}

/** @param {string} expiryText "MM/YY" @returns {boolean} */
function isFutureExpiry(expiryText) {
  const expiryMatch = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiryText);
  if (!expiryMatch) return false;
  const expiryMonth = Number(expiryMatch[1]);
  const expiryYear = 2000 + Number(expiryMatch[2]);
  const now = new Date();
  return expiryYear > now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth >= now.getMonth() + 1);
}

/**
 * Validate one field and render (or clear) its inline error.
 * @param {HTMLInputElement} field @returns {boolean} valid
 */
export function validateField(field) {
  const errorMessage = getFieldErrorMessage(field);
  const fieldWrapper = field.closest('[data-field]');
  const errorElement = fieldWrapper?.querySelector('[data-field-error]');
  field.setAttribute('aria-invalid', String(errorMessage !== ''));
  fieldWrapper?.classList.toggle('has-error', errorMessage !== '');
  if (errorElement) errorElement.textContent = errorMessage ? `Error: ${errorMessage}` : '';
  return errorMessage === '';
}

/**
 * Attach blur/input validation to a form and return a function that validates
 * every field, focusing the first invalid one.
 * @param {HTMLFormElement} form @returns {() => boolean}
 */
export function attachFormValidation(form) {
  const validatableFields = () => [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter((field) => field.closest('[data-field]'));

  form.addEventListener('focusout', (focusEvent) => {
    if (focusEvent.target.closest?.('[data-field]') && focusEvent.target.value !== '') validateField(focusEvent.target);
  });
  form.addEventListener('input', (inputEvent) => {
    // Re-check a field that is already showing an error, so it clears as soon as it is fixed.
    if (inputEvent.target.getAttribute('aria-invalid') === 'true') validateField(inputEvent.target);
    const dependentField = form.querySelector(`[data-match="${inputEvent.target.id}"]`);
    if (dependentField && dependentField.value !== '') validateField(dependentField);
  });
  form.addEventListener('change', (changeEvent) => {
    if (changeEvent.target.type === 'checkbox' && changeEvent.target.closest('[data-field]')) validateField(changeEvent.target);
  });

  return function validateEntireForm() {
    const fieldResults = validatableFields().map((field) => ({ field, isValid: validateField(field) }));
    const firstInvalid = fieldResults.find((result) => !result.isValid);
    firstInvalid?.field.focus();
    return !firstInvalid;
  };
}

/** Wire every show/hide password button: [data-password-toggle] controls aria-controls. */
export function initializePasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((toggleButton) => {
    const passwordInput = document.getElementById(toggleButton.getAttribute('aria-controls'));
    toggleButton.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';
      toggleButton.setAttribute('aria-pressed', String(!isVisible));
      toggleButton.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
      const useElement = toggleButton.querySelector('use');
      useElement.setAttribute('href', useElement.getAttribute('href').replace(/#icon-.*$/, isVisible ? '#icon-eye' : '#icon-eye-off'));
    });
  });
}

/**
 * Live checklist for password rules ([data-password-rules] for [data-rule] items).
 * @param {HTMLInputElement} passwordInput
 */
function initializePasswordRules(passwordInput) {
  const rulesList = document.querySelector(`[data-password-rules="${passwordInput.id}"]`);
  if (!rulesList) return;
  const ruleChecks = {
    length: (value) => value.length >= 8,
    letter: (value) => /[A-Za-z]/.test(value),
    number: (value) => /\d/.test(value),
  };
  passwordInput.addEventListener('input', () => {
    rulesList.querySelectorAll('[data-rule]').forEach((ruleItem) => {
      const isMet = ruleChecks[ruleItem.dataset.rule](passwordInput.value);
      ruleItem.classList.toggle('is-met', isMet);
      ruleItem.querySelector('[data-rule-state]').textContent = isMet ? 'met' : 'not met';
      const useElement = ruleItem.querySelector('use');
      useElement.setAttribute('href', useElement.getAttribute('href').replace(/#icon-.*$/, isMet ? '#icon-check' : '#icon-minus'));
    });
  });
}

/**
 * Show a message in a form-level status region.
 * @param {HTMLElement} statusElement @param {string} message @param {'success'|'error'} variant
 */
export function showFormStatus(statusElement, message, variant) {
  // Same .alert primitive as the static demo notices (form-status was merged into it)
  statusElement.className = `alert alert--${variant}`;
  const messageElement = document.createElement('p');
  messageElement.className = 'alert__message';
  messageElement.textContent = message;
  statusElement.replaceChildren(createIcon(variant === 'success' ? 'circle-check' : 'circle-alert', 'alert__icon'), messageElement);
}

/* ==========================================================================
   3. Simulated auth flows
   ========================================================================== */

/** @returns {string} a safe post-login destination from ?next= */
function getSafeRedirectTarget() {
  const requestedPage = new URLSearchParams(window.location.search).get('next');
  return allowedRedirectPages.includes(requestedPage) ? requestedPage : 'dashboard.html';
}

/** Login: any valid email + 8-character password starts a demo session. */
function initializeLoginForm() {
  const loginForm = document.querySelector('[data-login-form]');
  if (!loginForm) return;
  const validateLoginForm = attachFormValidation(loginForm);
  const statusElement = document.querySelector('[data-form-status]');
  const searchParameters = new URLSearchParams(window.location.search);

  if (searchParameters.get('signedOut') === '1') showFormStatus(statusElement, 'You have been signed out of the demo.', 'success');
  else if (searchParameters.get('next')) showFormStatus(statusElement, 'Sign in to open that page. Any email and an 8-character password will work.', 'success');

  // Already signed in (demo)? Offer to continue rather than show a dead form.
  const existingSession = getDemoSession();
  if (existingSession) loginForm.elements.email.value = existingSession.email;

  loginForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validateLoginForm()) return;
    const submitButton = loginForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    startDemoSession(loginForm.elements.email.value.trim());
    window.location.href = getSafeRedirectTarget();
  });
}

/** Register: validates, saves the profile + chosen plan, starts a demo session. */
function initializeRegisterForm() {
  const registerForm = document.querySelector('[data-register-form]');
  if (!registerForm) return;
  const validateRegisterForm = attachFormValidation(registerForm);
  initializePasswordRules(registerForm.elements.password);

  // Pre-select a plan passed from pricing (?plan=scale).
  const planSelect = registerForm.elements.plan;
  planSelect.replaceChildren(...pricingPlans.filter((plan) => plan.monthlyPrice !== null).map((plan) => {
    const planOption = document.createElement('option');
    planOption.value = plan.id;
    planOption.textContent = plan.monthlyPrice === 0 ? `${plan.name} (free)` : `${plan.name} ($${plan.monthlyPrice}/month)`;
    return planOption;
  }));
  const requestedPlan = new URLSearchParams(window.location.search).get('plan');
  planSelect.value = pricingPlans.some((plan) => plan.id === requestedPlan && plan.monthlyPrice !== null) ? requestedPlan : 'growth';

  registerForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validateRegisterForm()) return;
    const submitButton = registerForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    const email = registerForm.elements.email.value.trim();
    saveProfile({
      fullName: registerForm.elements.fullName.value.trim(),
      email,
      company: registerForm.elements.company.value.trim(),
    });
    setSelectedPlan(planSelect.value, 'monthly');
    startDemoSession(email);
    window.location.href = 'dashboard.html?welcome=1';
  });
}

/** Forgot password: always shows the same neutral confirmation (no email is sent). */
function initializeForgotPasswordForm() {
  const recoveryForm = document.querySelector('[data-recovery-form]');
  if (!recoveryForm) return;
  const validateRecoveryForm = attachFormValidation(recoveryForm);
  const statusElement = document.querySelector('[data-form-status]');

  recoveryForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validateRecoveryForm()) return;
    const submitButton = recoveryForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    setButtonBusy(submitButton, false);
    const email = recoveryForm.elements.email.value.trim();
    showFormStatus(statusElement, `If an account exists for ${email}, a reset link is on its way. Demo: no email is actually sent.`, 'success');
    submitButton.querySelector('[data-button-label]').textContent = 'Send again';
    statusElement.focus();
  });
}

/** Entry point for the three auth pages (called by app.js). */
export default function initializeAuthPage() {
  initializePasswordToggles();
  initializeLoginForm();
  initializeRegisterForm();
  initializeForgotPasswordForm();
}
