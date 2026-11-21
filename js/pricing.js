/**
 * @file pricing.js
 * @description Marketing-page module for index.html and pages/pricing.html:
 * interactive pricing tiers with a monthly/annual toggle, the plan comparison
 * table, FAQ, feature list, testimonials, and the "Contact sales" demo form.
 * All prices and content come from store.js.
 * @module pricing
 */

import {
  pricingPlans, planComparison, pricingQuestions, productFeatures, testimonials,
  getDemoSession, getSelectedPlan, setSelectedPlan, formatCurrency,
  recentActivity, monthlyActiveUsersSeries, reportingMonths, p95LatencySeries, reliabilityMetrics,
  calculateRevenueAtRisk, calculateUptimePercent, calculateErrorBudgetUsedPercent, calculatePercentChange,
  formatNumber, formatPercent, formatSignedPercent, formatDateTime, formatMonthShort,
} from './store.js';
import {
  createIcon, attachFormValidation, setButtonBusy, simulateNetworkDelay, showToast,
} from './forms.js';
import { createElementWithClass, renderTrendLine } from './analytics.js';
import { initializeModals } from './settings.js';

/** Prefix to reach /pages/ from the current document ('pages/' on index.html, '' inside /pages). */
const pagesPrefix = () => document.body.dataset.pagesPrefix ?? '';

/** The id of the plan rendered with polarity inversion (DESIGN.md: no "Most popular" badge). */
const featuredPlanId = 'growth';

/** @returns {number} the largest whole-percent annual saving across paid plans */
function calculateAnnualSavingPercent() {
  const savings = pricingPlans
    .filter((plan) => plan.monthlyPrice)
    .map((plan) => ((plan.monthlyPrice - plan.annualMonthlyPrice) / plan.monthlyPrice) * 100);
  return Math.floor(Math.min(...savings));
}

/* ==========================================================================
   1. Pricing tiers
   ========================================================================== */

/**
 * Build the call-to-action for a tier. Signed-in visitors switch plans
 * directly; visitors register with the plan preselected.
 * @param {import('./store.js').PricingPlan} plan
 * @param {'monthly'|'annual'} cycle
 * @returns {HTMLElement}
 */
function createTierCallToAction(plan, cycle) {
  const isSignedIn = Boolean(getDemoSession());
  const currentPlanId = isSignedIn ? getSelectedPlan().planId : null;
  const buttonModifier = plan.id === featuredPlanId ? 'button--brand' : 'button--primary';

  if (plan.monthlyPrice === null) {
    const contactButton = createElementWithClass('button', 'button button--secondary button--pill button--large button--block pricing-tier__cta', 'Contact sales');
    contactButton.type = 'button';
    contactButton.dataset.contactSales = '';
    return contactButton;
  }
  if (isSignedIn) {
    const switchButton = createElementWithClass('button', `button ${buttonModifier} button--pill button--large button--block pricing-tier__cta`, plan.id === currentPlanId ? 'Manage plan' : `Switch to ${plan.name}`);
    switchButton.type = 'button';
    switchButton.addEventListener('click', () => {
      if (plan.id !== currentPlanId) setSelectedPlan(plan.id, cycle);
      window.location.href = `${pagesPrefix()}settings.html${plan.id !== currentPlanId ? '?planChanged=1' : ''}#billing`;
    });
    return switchButton;
  }
  const registerLink = createElementWithClass('a', `button ${buttonModifier} button--pill button--large button--block pricing-tier__cta`, plan.monthlyPrice === 0 ? 'Start for free' : `Start ${plan.name} trial`);
  registerLink.href = `${pagesPrefix()}register.html?plan=${plan.id}`;
  return registerLink;
}

/**
 * Render all tiers for a billing cycle.
 * @param {HTMLElement} pricingGrid @param {'monthly'|'annual'} cycle
 */
function renderPricingTiers(pricingGrid, cycle) {
  const isSignedIn = Boolean(getDemoSession());
  const currentPlanId = isSignedIn ? getSelectedPlan().planId : null;
  // Remember the prices on screen so the new ones can count from them.
  const previousAmounts = Object.fromEntries([...pricingGrid.querySelectorAll('[data-plan-id]')]
    .map((tier) => [tier.dataset.planId, Number(tier.querySelector('data')?.value)]));
  queueMicrotask(() => animateChangedPrices(pricingGrid, previousAmounts));

  pricingGrid.replaceChildren(...pricingPlans.map((plan) => {
    const tier = createElementWithClass('article', `pricing-tier${plan.id === featuredPlanId ? ' pricing-tier--featured' : ''}`);
    tier.dataset.planId = plan.id;
    const nameId = `tier-${plan.id}-name`;
    tier.setAttribute('aria-labelledby', nameId);

    const name = createElementWithClass('h3', 'pricing-tier__name', plan.name);
    name.id = nameId;
    const header = createElementWithClass('header', '');
    header.removeAttribute('class');
    header.append(name, createElementWithClass('p', 'pricing-tier__description', plan.description));
    // Reserved status row (always present) keeps every tier on the same subgrid rows.
    const status = createElementWithClass('div', 'pricing-tier__status');
    if (plan.id === currentPlanId) status.append(createElementWithClass('span', 'status-badge status-badge--success', 'Your current plan'));

    const price = createElementWithClass('p', 'pricing-tier__price');
    if (plan.monthlyPrice === null) {
      price.append(createElementWithClass('span', 'pricing-tier__amount', 'Custom'), createElementWithClass('span', 'pricing-tier__billing-note', 'Annual contract, invoiced'));
    } else {
      const monthlyAmount = cycle === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;
      const amount = createElementWithClass('span', 'pricing-tier__amount');
      const amountData = document.createElement('data');
      amountData.value = String(monthlyAmount);
      amountData.textContent = formatCurrency(monthlyAmount);
      amount.append(amountData);
      const billingNote = plan.monthlyPrice === 0
        ? 'Free forever, no card needed'
        : cycle === 'annual'
          ? `${formatCurrency(plan.annualMonthlyPrice * 12)}/year, you save ${formatCurrency((plan.monthlyPrice - plan.annualMonthlyPrice) * 12)}`
          : 'Billed monthly, cancel anytime';
      price.append(amount, createElementWithClass('span', 'pricing-tier__period', '/month'), createElementWithClass('span', 'pricing-tier__billing-note', billingNote));
    }

    const features = createElementWithClass('ul', 'pricing-tier__features');
    features.setAttribute('aria-label', `${plan.name} includes`);
    features.append(...plan.highlights.map((highlight) => {
      const featureItem = createElementWithClass('li', 'pricing-tier__feature');
      featureItem.append(createIcon('check', 'icon--sm'), document.createTextNode(highlight));
      return featureItem;
    }));

    tier.append(header, status, price, createTierCallToAction(plan, cycle), features);
    return tier;
  }));
}

/**
 * Count each changed price from its old value to its new one (ease-out cubic).
 * Idea adapted from 21st.dev "Pricing Section with Monthly/Yearly Toggle" no. 36083;
 * rebuilt in vanilla JS. The duration is the --duration-slow token, which the
 * reduced-motion media query collapses to ~0, so motion turns itself off there.
 * The <data value> is already final, so assistive tech and tests read the real price.
 * @param {HTMLElement} pricingGrid @param {Record<string, number>} previousAmounts
 */
function animateChangedPrices(pricingGrid, previousAmounts) {
  const durationMs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-slow')) || 0;
  if (durationMs < 1) return;
  pricingGrid.querySelectorAll('[data-plan-id]').forEach((tier) => {
    const amountData = tier.querySelector('data');
    const fromValue = previousAmounts[tier.dataset.planId];
    const toValue = Number(amountData?.value);
    if (!amountData || !Number.isFinite(fromValue) || fromValue === toValue) return;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      amountData.textContent = formatCurrency(Math.round(fromValue + (toValue - fromValue) * eased));
      if (progress < 1 && amountData.isConnected) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function initializePricingTiers() {
  const pricingGrid = document.querySelector('[data-pricing-grid]');
  if (!pricingGrid) return;
  const cycleToggle = document.querySelector('[data-billing-cycle]');
  document.querySelectorAll('[data-annual-saving]').forEach((savingElement) => {
    savingElement.textContent = `Save ${calculateAnnualSavingPercent()}%`;
  });
  const getCycle = () => cycleToggle.querySelector('input:checked').value;
  cycleToggle.addEventListener('change', () => {
    renderPricingTiers(pricingGrid, getCycle());
    document.querySelector('[data-cycle-announcement]').textContent = `Showing ${getCycle()} prices.`;
  });
  renderPricingTiers(pricingGrid, getCycle());

  // Contact-sales buttons are re-created on every render, so delegate the click.
  pricingGrid.addEventListener('click', (clickEvent) => {
    if (clickEvent.target.closest('[data-contact-sales]')) openContactSales(clickEvent.target.closest('[data-contact-sales]'));
  });
}

/* ==========================================================================
   2. Contact sales (Enterprise)
   ========================================================================== */

/** @param {HTMLElement} trigger */
function openContactSales(trigger) {
  const contactDialog = document.querySelector('[data-contact-dialog]');
  if (!contactDialog) {
    // Landing page: the form lives on the pricing page.
    window.location.href = `${pagesPrefix()}pricing.html?contact=1`;
    return;
  }
  contactDialog.showModal();
  contactDialog.addEventListener('close', () => trigger.focus(), { once: true });
}

function initializeContactSales() {
  const contactDialog = document.querySelector('[data-contact-dialog]');
  if (!contactDialog) return;
  const contactForm = contactDialog.querySelector('form');
  const validateContactForm = attachFormValidation(contactForm);
  const statusElement = contactDialog.querySelector('[data-form-status]');

  contactForm.addEventListener('submit', async (submitEvent) => {
    submitEvent.preventDefault();
    if (!validateContactForm()) return;
    const submitButton = contactForm.querySelector('[type="submit"]');
    setButtonBusy(submitButton, true);
    await simulateNetworkDelay();
    setButtonBusy(submitButton, false);
    const firstName = contactForm.elements.contactName.value.trim().split(' ')[0];
    contactForm.reset();
    contactDialog.close();
    showToast(`Thanks, ${firstName}. This is a demo, so no one will actually call, but your form passed validation.`);
    statusElement.replaceChildren();
  });

  if (new URLSearchParams(window.location.search).get('contact') === '1') {
    contactDialog.showModal();
    window.history.replaceState(null, '', 'pricing.html');
  }
}

/* ==========================================================================
   3. Comparison table, FAQ, features, testimonials
   ========================================================================== */

function renderComparisonTable() {
  const tableBody = document.querySelector('[data-comparison-table]');
  if (!tableBody) return;
  const rows = [];
  planComparison.forEach((group) => {
    const groupRow = createElementWithClass('tr', 'data-table__row');
    const groupCell = createElementWithClass('th', 'data-table__cell data-table__cell--group', group.group);
    groupCell.scope = 'colgroup';
    groupCell.colSpan = pricingPlans.length + 1;
    groupRow.append(groupCell);
    rows.push(groupRow);
    group.rows.forEach((row) => {
      const featureRow = createElementWithClass('tr', 'data-table__row');
      const featureCell = createElementWithClass('th', 'data-table__cell', row.feature);
      featureCell.scope = 'row';
      featureRow.append(featureCell);
      row.values.forEach((value, planIndex) => {
        const valueCell = createElementWithClass('td', 'data-table__cell data-table__cell--numeric');
        if (value === true) {
          valueCell.append(createIcon('check', 'icon--sm data-table__check'), createElementWithClass('span', 'visually-hidden', `Included in ${pricingPlans[planIndex].name}`));
        } else if (value === false) {
          valueCell.append(createElementWithClass('span', 'data-table__cell--muted', '—'), createElementWithClass('span', 'visually-hidden', `Not included in ${pricingPlans[planIndex].name}`));
        } else {
          valueCell.textContent = value;
        }
        featureRow.append(valueCell);
      });
      rows.push(featureRow);
    });
  });
  tableBody.replaceChildren(...rows);
}

function renderFrequentlyAskedQuestions() {
  const faqList = document.querySelector('[data-faq-list]');
  if (!faqList) return;
  faqList.replaceChildren(...pricingQuestions.map((item) => {
    const details = createElementWithClass('details', 'faq-list__item');
    const summary = createElementWithClass('summary', 'faq-list__question', item.question);
    summary.append(createIcon('chevron-down'));
    details.append(summary, createElementWithClass('p', 'faq-list__answer', item.answer));
    return details;
  }));
}

/**
 * Build a compact trend-line SVG (same markup contract as the HTML charts).
 * @param {number[]} values @param {string} accessibleLabel @returns {SVGSVGElement}
 */
function createCompactTrendLine(values, accessibleLabel) {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const trendSvg = document.createElementNS(svgNamespace, 'svg');
  trendSvg.setAttribute('class', 'trend-line trend-line--compact');
  trendSvg.setAttribute('viewBox', '0 0 600 160');
  trendSvg.setAttribute('preserveAspectRatio', 'none');
  trendSvg.setAttribute('role', 'img');
  trendSvg.setAttribute('aria-label', accessibleLabel);
  const grid = document.createElementNS(svgNamespace, 'g');
  grid.dataset.trendGrid = '';
  const area = document.createElementNS(svgNamespace, 'path');
  area.setAttribute('class', 'trend-line__area');
  area.dataset.trendArea = '';
  const path = document.createElementNS(svgNamespace, 'polyline');
  path.setAttribute('class', 'trend-line__path');
  path.dataset.trendPath = '';
  trendSvg.append(grid, area, path);
  renderTrendLine(trendSvg, values);
  return trendSvg;
}

/**
 * One label/value row of a signal slice.
 * @param {string} label @param {string} value @param {string} [meta]
 */
function createSignalRow(label, value, meta) {
  const row = createElementWithClass('li', 'signal-slice__row');
  row.append(createElementWithClass('span', 'signal-slice__label', label), createElementWithClass('span', 'signal-slice__value', value));
  if (meta) row.append(createElementWithClass('span', 'signal-slice__meta', meta));
  return row;
}

/** Live slices of demo data, one per feature signal (finish review: prove, don't claim). */
const signalSliceBuilders = {
  revenue() {
    const failedPayments = recentActivity.filter((row) => row.status === 'Failed');
    const list = createElementWithClass('ul', 'signal-slice');
    list.append(...failedPayments.map((row) => createSignalRow(`Payment failed: ${row.subject.split(',')[0]}`, formatCurrency(row.amount, { cents: true }), formatDateTime(row.timestamp))));
    const total = createElementWithClass('p', 'signal-slice__total');
    total.append(createElementWithClass('span', '', 'MRR at risk'), createElementWithClass('span', '', formatCurrency(calculateRevenueAtRisk(), { cents: true })));
    total.querySelectorAll('span').forEach((span) => span.removeAttribute('class'));
    return [list, total];
  },
  usage() {
    const currentUsers = monthlyActiveUsersSeries.at(-1);
    const figure = createElementWithClass('p', 'signal-slice__figure');
    figure.append(
      createElementWithClass('span', 'signal-slice__figure-value', formatNumber(currentUsers)),
      createElementWithClass('span', 'signal-slice__caption', `monthly active users, ${formatSignedPercent(calculatePercentChange(currentUsers, monthlyActiveUsersSeries.at(-2)), 2)} vs ${formatMonthShort(reportingMonths.at(-2))}`),
    );
    const trend = createCompactTrendLine(monthlyActiveUsersSeries, `Monthly active users from ${formatNumber(monthlyActiveUsersSeries[0])} to ${formatNumber(currentUsers)} over 12 months`);
    return [figure, trend];
  },
  infrastructure() {
    const list = createElementWithClass('ul', 'signal-slice');
    list.append(
      createSignalRow('p95 latency, api-gateway', `${reliabilityMetrics.p95LatencyMs} ms`, `Target ${reliabilityMetrics.p95LatencyTargetMs} ms · alert open`),
      createSignalRow('Uptime, last 30 days', formatPercent(calculateUptimePercent(), 2)),
      createSignalRow('Error budget used', formatPercent(calculateErrorBudgetUsedPercent())),
    );
    const trend = createCompactTrendLine(p95LatencySeries, `p95 latency over 14 days, from ${p95LatencySeries[0]} to ${p95LatencySeries.at(-1)} milliseconds`);
    return [list, trend];
  },
};

function renderFeatureList() {
  const featureList = document.querySelector('[data-feature-list]');
  if (!featureList) return;
  featureList.replaceChildren(...productFeatures.map((feature) => {
    const featureItem = createElementWithClass('li', 'feature-list__item');
    const title = createElementWithClass('h3', 'feature-list__title');
    title.append(createIcon(feature.icon, 'icon--lg'), document.createTextNode(feature.title));

    const sliceWindow = createElementWithClass('div', 'product-window');
    sliceWindow.setAttribute('role', 'figure');
    sliceWindow.setAttribute('aria-label', `Live ${feature.title.toLowerCase()} data from the demo account`);
    const chrome = createElementWithClass('div', 'product-window__chrome');
    chrome.setAttribute('aria-hidden', 'true');
    chrome.append(
      createElementWithClass('span', 'product-window__dot'), createElementWithClass('span', 'product-window__dot'), createElementWithClass('span', 'product-window__dot'),
      createElementWithClass('span', 'product-window__address', `novadash.example/${feature.windowPath}`),
    );
    const windowBody = createElementWithClass('div', 'product-window__body');
    windowBody.append(...signalSliceBuilders[feature.signal]());
    sliceWindow.append(chrome, windowBody);

    // Left column: heading + description. Right column: the live window alone.
    const intro = createElementWithClass('div', 'feature-list__intro');
    intro.append(title, createElementWithClass('p', 'feature-list__text', feature.text));
    featureItem.append(intro, sliceWindow);
    return featureItem;
  }));
}

function renderTestimonials() {
  const testimonialList = document.querySelector('[data-testimonials]');
  if (!testimonialList) return;
  testimonialList.replaceChildren(...testimonials.map((item) => {
    const figure = createElementWithClass('figure', 'testimonial');
    const quote = createElementWithClass('blockquote', 'testimonial__quote', `“${item.quote}”`);
    const caption = createElementWithClass('figcaption', 'testimonial__author', item.author);
    caption.append(createElementWithClass('span', 'testimonial__role', item.role));
    figure.append(quote, caption);
    const listItem = document.createElement('li');
    listItem.append(figure);
    return listItem;
  }));
}

/** Entry point for index.html and pages/pricing.html (called by app.js). */
export default function initializeMarketingPage() {
  initializePricingTiers();
  initializeModals();
  initializeContactSales();
  renderComparisonTable();
  renderFrequentlyAskedQuestions();
  renderFeatureList();
  renderTestimonials();
}
