/**
 * @file dashboard.js
 * @description The executive dashboard (alerts first, then KPIs, MRR trend,
 * plan summary and recent activity) and the live miniature of it used in the
 * landing-page hero. All figures come from store.js; chart math is shared
 * with analytics.js.
 * @module dashboard
 */

import {
  monthlyRecurringRevenueSeries, monthlyActiveUsersSeries, reportingMonths, reliabilityMetrics,
  previousCloudSpendTotal, recentActivity, attentionAlerts, demoToday,
  calculateUptimePercent, calculateErrorBudgetUsedPercent, calculateCloudSpendTotal,
  calculatePercentChange, calculateRevenueAtRisk, getCurrentSubscription, roundTo,
  formatCurrency, formatNumber, formatCompactNumber, formatPercent, formatSignedPercent,
  formatMonthShort, formatMonthLong, formatDate, formatDateTime,
} from './store.js';
import { renderTrendLine, renderTableRows, createElementWithClass, createEmptyState } from './analytics.js';
import { createIcon, showToast } from './forms.js';

/* ==========================================================================
   1. KPI summaries (shared by the dashboard and the landing preview)
   ========================================================================== */

/**
 * @typedef {Object} KpiSummary
 * @property {string} id @property {string} title @property {string} icon
 * @property {number} rawValue @property {string} displayValue
 * @property {number} change    signed change (percent, or points for uptime)
 * @property {string} changeText
 * @property {boolean} higherIsBetter
 * @property {string} periodText
 */

/** @returns {KpiSummary[]} the four health KPIs, derived from store.js */
export function buildKpiSummaries() {
  const currentMrr = monthlyRecurringRevenueSeries.at(-1);
  const currentUsers = monthlyActiveUsersSeries.at(-1);
  const uptimePercent = calculateUptimePercent();
  const uptimeChangePoints = roundTo(uptimePercent - reliabilityMetrics.previousUptimePercent, 2);
  const cloudSpendTotal = calculateCloudSpendTotal();
  const previousMonthName = formatMonthLong(reportingMonths.at(-2)).split(' ')[0];
  const mrrChange = calculatePercentChange(currentMrr, monthlyRecurringRevenueSeries.at(-2));
  const usersChange = calculatePercentChange(currentUsers, monthlyActiveUsersSeries.at(-2));
  const spendChange = calculatePercentChange(cloudSpendTotal, previousCloudSpendTotal);

  return [
    { id: 'mrr', title: 'Monthly recurring revenue', icon: 'chart-column', rawValue: currentMrr, displayValue: formatCurrency(currentMrr), change: mrrChange, changeText: formatSignedPercent(mrrChange, 2), higherIsBetter: true, periodText: `vs ${previousMonthName}` },
    { id: 'users', title: 'Monthly active users', icon: 'users', rawValue: currentUsers, displayValue: formatNumber(currentUsers), change: usersChange, changeText: formatSignedPercent(usersChange, 2), higherIsBetter: true, periodText: `vs ${previousMonthName}` },
    { id: 'uptime', title: 'Uptime, last 30 days', icon: 'gauge', rawValue: uptimePercent, displayValue: formatPercent(uptimePercent, 2), change: uptimeChangePoints, changeText: `${uptimeChangePoints > 0 ? '+' : ''}${uptimeChangePoints.toFixed(2)} pts`, higherIsBetter: true, periodText: 'vs previous 30 days' },
    { id: 'spend', title: 'Cloud spend, last 30 days', icon: 'cloud', rawValue: cloudSpendTotal, displayValue: formatCurrency(cloudSpendTotal), change: spendChange, changeText: formatSignedPercent(spendChange, 2), higherIsBetter: false, periodText: 'vs previous 30 days' },
  ];
}

/**
 * Build one KPI card (DESIGN.md 6.3). The trend colour reflects whether the
 * change is GOOD (spend going down is good), and the text states the direction.
 * @param {KpiSummary} kpi @param {string} headingTag 'h2' | 'h3'
 * @returns {HTMLElement}
 */
function createKpiCard(kpi, headingTag) {
  const kpiCard = createElementWithClass('article', 'kpi-card');
  const titleId = `kpi-${kpi.id}-title-${headingTag}`;
  kpiCard.setAttribute('aria-labelledby', titleId);
  kpiCard.dataset.kpi = kpi.id;

  const header = createElementWithClass('header', 'kpi-card__header');
  const title = createElementWithClass(headingTag, 'kpi-card__title', kpi.title);
  title.id = titleId;
  header.append(title, createIcon(kpi.icon, 'kpi-card__icon'));

  const valueParagraph = createElementWithClass('p', 'kpi-card__value');
  const valueData = document.createElement('data');
  valueData.value = String(kpi.rawValue);
  valueData.textContent = kpi.displayValue;
  valueParagraph.append(valueData);

  const isGoodChange = kpi.change === 0 ? null : (kpi.change > 0) === kpi.higherIsBetter;
  const trendModifier = isGoodChange === null ? 'flat' : isGoodChange ? 'up' : 'down';
  const trendParagraph = createElementWithClass('p', `kpi-card__trend kpi-card__trend--${trendModifier}`);
  const delta = createElementWithClass('span', 'kpi-card__delta');
  delta.append(
    createIcon(kpi.change >= 0 ? 'trending-up' : 'trending-down', 'icon--sm'),
    createElementWithClass('span', 'visually-hidden', kpi.change >= 0 ? 'Up ' : 'Down '),
    document.createTextNode(kpi.changeText),
  );
  trendParagraph.append(delta, createElementWithClass('span', 'kpi-card__period', kpi.periodText));

  kpiCard.append(header, valueParagraph, trendParagraph);
  return kpiCard;
}

/**
 * Render KPI cards into a container.
 * @param {HTMLElement} container @param {string} [headingTag='h3']
 */
export function renderKpiCards(container, headingTag = 'h3') {
  container.replaceChildren(...buildKpiSummaries().map((kpi) => createKpiCard(kpi, headingTag)));
}

/* ==========================================================================
   2. Attention list (alerts first)
   ========================================================================== */

/** @returns {Array<{ id: string, severity: string, title: string, detail: string, actionLabel: string, actionHref: string, meta: string }>} */
export function buildAttentionItems() {
  const subscription = getCurrentSubscription();
  const items = attentionAlerts.map((alert) => {
    const relatedRows = recentActivity.filter((row) => alert.relatedActivityIds.includes(row.id));
    const detail = alert.detailTemplate
      .replace('{amount}', formatCurrency(calculateRevenueAtRisk(), { cents: true }))
      .replace('{latency}', `${reliabilityMetrics.p95LatencyMs} ms`)
      .replace('{target}', `${reliabilityMetrics.p95LatencyTargetMs} ms`)
      .replace('{budget}', formatPercent(calculateErrorBudgetUsedPercent()));
    const summary = alert.id === 'alert-failed-payments'
      ? `${formatCurrency(calculateRevenueAtRisk(), { cents: true })} at risk`
      : `p95 ${reliabilityMetrics.p95LatencyMs} ms · target ${reliabilityMetrics.p95LatencyTargetMs} ms`;
    return { ...alert, detail, summary, meta: formatDateTime(relatedRows[0].timestamp) };
  });

  // Derived alert: event quota above 70% of the CURRENT plan's limit.
  if (subscription.eventLimit) {
    const quotaPercent = roundTo((subscription.eventsUsed / subscription.eventLimit) * 100, 2);
    if (quotaPercent >= 70) {
      items.push({
        id: 'alert-event-quota',
        severity: 'info',
        title: `Event quota ${formatPercent(quotaPercent)} used`,
        detail: `${formatCompactNumber(subscription.eventsUsed)} of ${formatCompactNumber(subscription.eventLimit)} events on ${subscription.plan.name}. The cycle resets on ${formatDate(subscription.nextInvoiceDate)}.`,
        summary: `${formatCompactNumber(subscription.eventsUsed)} of ${formatCompactNumber(subscription.eventLimit)} events`,
        actionLabel: 'Manage plan',
        actionHref: 'settings.html#billing',
        meta: `As of ${formatDate(demoToday)}`,
      });
    }
  }
  return items;
}

/** Icon per alert severity (shared by the dashboard and the landing preview). */
const iconForSeverity = { critical: 'circle-alert', warning: 'zap', info: 'info' };

function initializeAttentionList() {
  const attentionList = document.querySelector('[data-attention-list]');
  const attentionCount = document.querySelector('[data-attention-count]');
  let visibleItems = buildAttentionItems();

  function renderAttentionItems() {
    attentionCount.textContent = visibleItems.length === 0 ? 'All clear' : `${visibleItems.length} open`;
    if (visibleItems.length === 0) {
      attentionList.replaceChildren(createEmptyState({
        tagName: 'li',
        icon: 'circle-check',
        title: 'All clear',
        description: 'Nothing needs your attention right now. New alerts appear here as they happen.',
      }));
      return;
    }
    attentionList.replaceChildren(...visibleItems.map((item) => {
      const listItem = createElementWithClass('li', `attention-list__item attention-list__item--${item.severity}`);
      const iconWrapper = createElementWithClass('span', 'attention-list__icon');
      iconWrapper.append(createIcon(iconForSeverity[item.severity]), createElementWithClass('span', 'visually-hidden', `${item.severity}: `));
      const body = createElementWithClass('div', 'attention-list__body');
      body.append(
        createElementWithClass('h3', 'attention-list__title', item.title),
        createElementWithClass('p', 'attention-list__detail', item.detail),
        createElementWithClass('p', 'attention-list__meta', item.meta),
      );
      const actions = createElementWithClass('div', 'attention-list__actions');
      const reviewLink = createElementWithClass('a', 'button button--secondary button--small', item.actionLabel);
      reviewLink.href = item.actionHref;
      const dismissButton = createElementWithClass('button', 'button button--ghost button--small', 'Dismiss');
      dismissButton.type = 'button';
      dismissButton.setAttribute('aria-label', `Dismiss: ${item.title}`);
      dismissButton.addEventListener('click', () => {
        visibleItems = visibleItems.filter((visibleItem) => visibleItem.id !== item.id);
        renderAttentionItems();
        attentionList.closest('section').querySelector('h2').focus();
        showToast(`Dismissed "${item.title}" for this visit.`, 'info');
      });
      actions.append(reviewLink, dismissButton);
      listItem.append(iconWrapper, body, actions);
      return listItem;
    }));
  }
  renderAttentionItems();
}

/* ==========================================================================
   3. MRR trend + plan summary + activity table
   ========================================================================== */

function renderRevenueTrend() {
  const trendSvg = document.querySelector('[data-dashboard-trend]');
  const plotPoints = renderTrendLine(trendSvg, monthlyRecurringRevenueSeries);
  trendSvg.setAttribute('aria-label', `MRR grew from ${formatCurrency(plotPoints[0].value)} in ${formatMonthLong(reportingMonths[0])} to ${formatCurrency(plotPoints.at(-1).value)} in ${formatMonthLong(reportingMonths.at(-1))}.`);
  document.querySelector('[data-dashboard-trend-start]').textContent = formatMonthShort(reportingMonths[0]);
  document.querySelector('[data-dashboard-trend-end]').textContent = formatMonthShort(reportingMonths.at(-1));
  document.querySelector('[data-dashboard-trend-summary]').textContent = `${formatCurrency(monthlyRecurringRevenueSeries.at(-1))} this month`;
  renderTableRows(document.querySelector('[data-dashboard-trend-table]'), monthlyRecurringRevenueSeries.map((value, index) => [
    { text: formatMonthLong(reportingMonths[index]) },
    { text: formatCurrency(value), numeric: true },
  ]));
}

/**
 * Fill every [data-subscription-field] and [data-meter] in a container from the
 * current subscription. Shared with settings.js so both pages always agree.
 * @param {ParentNode} [scope=document]
 */
export function renderSubscriptionSummary(scope = document) {
  const subscription = getCurrentSubscription();
  const isCustom = subscription.plan.monthlyPrice === null;
  const fieldValues = {
    planName: subscription.plan.name,
    planPrice: isCustom ? 'Custom contract' : `${formatCurrency(subscription.monthlyEquivalent)}/month, billed ${subscription.cycle === 'annual' ? 'annually' : 'monthly'}`,
    nextInvoiceAmount: isCustom ? 'Per contract' : formatCurrency(subscription.nextInvoiceAmount, { cents: true }),
    nextInvoiceDate: formatDate(subscription.nextInvoiceDate),
    billingCycle: subscription.cycle === 'annual' ? 'Annual' : 'Monthly',
  };
  scope.querySelectorAll('[data-subscription-field]').forEach((fieldElement) => {
    fieldElement.textContent = fieldValues[fieldElement.dataset.subscriptionField];
  });

  const meterValues = {
    seats: { used: subscription.seatsUsed, limit: subscription.seatLimit, format: formatNumber, unit: 'seats' },
    events: { used: subscription.eventsUsed, limit: subscription.eventLimit, format: formatCompactNumber, unit: 'events' },
  };
  scope.querySelectorAll('[data-meter]').forEach((meterElement) => {
    const meterData = meterValues[meterElement.dataset.meter];
    const fillPercent = meterData.limit ? roundTo(Math.min(meterData.used / meterData.limit, 1) * 100, 2) : 0;
    meterElement.querySelector('[data-meter-fill]').style.setProperty('--meter-fill', `${fillPercent}%`);
    meterElement.querySelector('[data-meter-value]').textContent = meterData.limit
      ? `${meterData.format(meterData.used)} / ${meterData.format(meterData.limit)}`
      : `${meterData.format(meterData.used)} / custom`;
    const meterTrack = meterElement.querySelector('[role="meter"]');
    meterTrack.setAttribute('aria-valuenow', String(meterData.used));
    meterTrack.setAttribute('aria-valuemax', String(meterData.limit ?? meterData.used));
    meterTrack.setAttribute('aria-valuetext', meterData.limit ? `${meterData.format(meterData.used)} of ${meterData.format(meterData.limit)} ${meterData.unit}` : `${meterData.format(meterData.used)} ${meterData.unit}, custom limit`);
  });
}

/** Maps activity statuses to status-badge modifiers. */
const statusBadgeModifiers = { Failed: 'error', Open: 'warning', Done: 'success', Info: 'neutral', Churned: 'neutral' };

function initializeActivityTable() {
  const tableBody = document.querySelector('[data-activity-table]');
  const domainFilter = document.querySelector('[data-activity-filter]');
  const emptyMessage = document.querySelector('[data-activity-empty]');
  const resultCount = document.querySelector('[data-activity-count]');

  function renderActivityRows() {
    const selectedDomain = domainFilter.querySelector('input:checked').value;
    const filteredRows = recentActivity.filter((row) => selectedDomain === 'All' || row.domain === selectedDomain);
    resultCount.textContent = `${filteredRows.length} of ${recentActivity.length} events`;
    emptyMessage.hidden = filteredRows.length > 0;
    if (filteredRows.length === 0) {
      emptyMessage.replaceChildren(createEmptyState({
        icon: 'activity',
        title: `No ${selectedDomain.toLowerCase()} activity yet`,
        description: 'Events in this area will appear here as they happen.',
        actionLabel: 'Show all activity',
        onAction: () => {
          domainFilter.querySelector('input[value="All"]').checked = true;
          renderActivityRows();
          domainFilter.querySelector('input[value="All"]').focus();
        },
      }));
    }
    tableBody.replaceChildren(...filteredRows.map((row) => {
      const tableRow = createElementWithClass('tr', 'data-table__row');
      const eventCell = createElementWithClass('th', 'data-table__cell');
      eventCell.scope = 'row';
      eventCell.append(createElementWithClass('span', 'data-table__primary', row.event), createElementWithClass('span', 'data-table__secondary', row.subject));
      const domainCell = createElementWithClass('td', 'data-table__cell data-table__cell--muted', row.domain);
      const timeCell = createElementWithClass('td', 'data-table__cell data-table__cell--mono');
      const timeElement = createElementWithClass('time', '', formatDateTime(row.timestamp));
      timeElement.removeAttribute('class');
      timeElement.dateTime = row.timestamp;
      timeCell.append(timeElement);
      const amountText = row.amount === null ? '—' : `${row.amount < 0 ? '−' : ''}${formatCurrency(Math.abs(row.amount), { cents: true })}`;
      const amountCell = createElementWithClass('td', 'data-table__cell data-table__cell--numeric', amountText);
      const statusCell = createElementWithClass('td', 'data-table__cell');
      statusCell.append(createElementWithClass('span', `status-badge status-badge--${statusBadgeModifiers[row.status]}`, row.status));
      tableRow.append(eventCell, domainCell, timeCell, amountCell, statusCell);
      return tableRow;
    }));
  }
  domainFilter.addEventListener('change', renderActivityRows);
  renderActivityRows();
}

/** Entry point for pages/dashboard.html (called by app.js). */
export default function initializeDashboardPage() {
  initializeAttentionList();
  renderKpiCards(document.querySelector('[data-kpi-grid]'), 'h3');
  renderRevenueTrend();
  renderSubscriptionSummary();
  initializeActivityTable();
  document.querySelector('[data-data-as-of]').textContent = formatDate(demoToday);

  if (new URLSearchParams(window.location.search).get('welcome') === '1') {
    showToast('Welcome to NovaDash. Your demo workspace is ready.', 'success');
    window.history.replaceState(null, '', 'dashboard.html');
  }
}

/* ==========================================================================
   4. Landing-page hero: live miniature of the dashboard
   ========================================================================== */

/** Render the product-window preview on index.html (called by app.js). */
export function initializeLandingPreview() {
  // Alerts first, rendered with the dashboard's own row treatment (no actions:
  // the preview is a picture of the product, so it carries no dead controls).
  document.querySelector('[data-preview-attention]').replaceChildren(...buildAttentionItems().slice(0, 3).map((item) => {
    const listItem = createElementWithClass('li', `attention-list__item attention-list__item--${item.severity}`);
    const iconWrapper = createElementWithClass('span', 'attention-list__icon');
    iconWrapper.append(createIcon(iconForSeverity[item.severity], 'icon--sm'), createElementWithClass('span', 'visually-hidden', `${item.severity}: `));
    const body = createElementWithClass('div', 'attention-list__body');
    body.append(
      createElementWithClass('p', 'attention-list__title', item.title),
      createElementWithClass('p', 'attention-list__meta', `${item.summary} · ${item.meta}`),
    );
    listItem.append(iconWrapper, body);
    return listItem;
  }));
  renderKpiCards(document.querySelector('[data-preview-kpis]'), 'h3');
  const trendSvg = document.querySelector('[data-preview-trend]');
  renderTrendLine(trendSvg, monthlyRecurringRevenueSeries);
  trendSvg.setAttribute('aria-label', `MRR trend over 12 months, ending at ${formatCurrency(monthlyRecurringRevenueSeries.at(-1))}.`);
  document.querySelector('[data-preview-trend-value]').textContent = formatCurrency(monthlyRecurringRevenueSeries.at(-1));
}
