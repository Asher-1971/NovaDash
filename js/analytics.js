/**
 * @file analytics.js
 * @description Chart rendering (pure inline SVG / CSS, no libraries) and the
 * analytics page. Chart functions are exported so dashboard.js reuses the
 * exact same math.
 *
 * Formulas (PROJECT_BRIEF.json execution_guide.chart_math):
 *  - Bar:    heightPercent = value / axisMax * 100, axisMax = next "nice" number >= max
 *  - Ring:   C = 2*PI*r; dasharray = C; dashoffset = C * (1 - percent/100)
 *  - Line:   x_i = padLeft + i*(innerWidth/(n-1));
 *            y_i = padTop + innerHeight*(1 - (v_i - min)/(max - min)), guarded for max === min
 *  - Donut:  cumulative stops from percentages normalised to sum 100
 * Every value is rounded to 2 decimals and also exposed as text.
 * @module analytics
 */

import {
  reportingMonths, monthlyRecurringRevenueSeries, monthlyActiveUsersSeries,
  subscriberMetrics, cloudSpendByService, previousCloudSpendTotal, systemLogs,
  latencyDays, p95LatencySeries, reliabilityMetrics,
  calculateUptimePercent, calculateErrorBudgetUsedPercent, calculateCloudSpendTotal,
  calculatePercentChange, calculateAverageRevenuePerSubscriber, calculateRevenueAtRisk,
  getCurrentSubscription, roundTo, formatCurrency, formatNumber, formatCompactNumber,
  formatPercent, formatSignedPercent, formatMonthShort, formatMonthLong, formatDateTime,
} from './store.js';
import { createIcon } from './forms.js';

/* ==========================================================================
   1. Chart math (pure functions)
   ========================================================================== */

/**
 * The next "nice" axis maximum >= maxValue (1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 x 10^n).
 * @param {number} maxValue @returns {number}
 */
export function calculateNiceAxisMax(maxValue) {
  if (maxValue <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(maxValue));
  const niceSteps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const niceStep = niceSteps.find((step) => step * magnitude >= maxValue);
  return roundTo(niceStep * magnitude, 6);
}

/**
 * Bar heights in percent of the axis maximum.
 * @param {number[]} values @returns {{ axisMax: number, heights: number[] }}
 */
export function calculateBarHeights(values) {
  const axisMax = calculateNiceAxisMax(Math.max(...values));
  return { axisMax, heights: values.map((value) => roundTo((value / axisMax) * 100, 2)) };
}

/**
 * Progress-ring dash geometry.
 * @param {number} radius @param {number} percent 0..100
 * @returns {{ circumference: number, dashOffset: number }}
 */
export function calculateRingGeometry(radius, percent) {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const circumference = 2 * Math.PI * radius;
  // SVG geometry keeps 4 decimals: at 2 decimals the arc drifts ~0.002 points
  // from the displayed percent, outside the brief's 0.001 tolerance.
  return { circumference: roundTo(circumference, 4), dashOffset: roundTo(circumference * (1 - clampedPercent / 100), 4) };
}

/**
 * Trend-line points inside a fixed viewBox.
 * @param {number[]} values
 * @param {{ width?: number, height?: number, padTop?: number, padRight?: number, padBottom?: number, padLeft?: number }} [box]
 * @returns {{ x: number, y: number, value: number }[]}
 */
export function calculateTrendPoints(values, box = {}) {
  const { width = 600, height = 240, padTop = 16, padRight = 8, padBottom = 16, padLeft = 8 } = box;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue;
  const stepX = values.length > 1 ? innerWidth / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: roundTo(padLeft + index * stepX, 2),
    // Guard max === min: draw a flat line through the vertical middle.
    y: roundTo(valueRange === 0 ? padTop + innerHeight / 2 : padTop + innerHeight * (1 - (value - minValue) / valueRange), 2),
    value,
  }));
}

/**
 * Cumulative donut segments, normalised so percentages sum to exactly 100.
 * @param {number[]} amounts @returns {{ percent: number, start: number, end: number }[]}
 */
export function calculateDonutSegments(amounts) {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  let cumulativePercent = 0;
  return amounts.map((amount, index) => {
    const percent = roundTo((amount / total) * 100, 2);
    const start = cumulativePercent;
    // The last segment closes at exactly 100 so rounding never leaves a gap.
    cumulativePercent = index === amounts.length - 1 ? 100 : roundTo(cumulativePercent + percent, 2);
    return { percent, start, end: cumulativePercent };
  });
}

/* ==========================================================================
   2. Chart renderers (DOM)
   ========================================================================== */

/**
 * Render a bar chart into an <ol data-bar-chart> plus its label row.
 * Sets the documented `--bar-height` custom property on each bar.
 * @param {HTMLOListElement} chartList
 * @param {HTMLElement} labelRow
 * @param {{ values: number[], labels: string[], longLabels: string[], formatValue: (v:number)=>string }} config
 * @returns {number} the axis maximum used
 */
export function renderBarChart(chartList, labelRow, { values, labels, longLabels, formatValue }) {
  const { axisMax, heights } = calculateBarHeights(values);
  chartList.dataset.axisMax = String(axisMax);
  chartList.replaceChildren(...values.map((value, index) => {
    const barItem = document.createElement('li');
    barItem.className = 'bar-chart__item';
    const bar = document.createElement('span');
    bar.className = 'bar-chart__bar';
    bar.dataset.value = String(value);
    bar.style.setProperty('--bar-height', `${heights[index]}%`);
    const valueText = document.createElement('span');
    valueText.className = 'bar-chart__value';
    valueText.style.setProperty('--bar-height', `${heights[index]}%`);
    valueText.textContent = formatValue(value);
    const accessibleLabel = document.createElement('span');
    accessibleLabel.className = 'visually-hidden';
    accessibleLabel.textContent = `${longLabels[index]}: `;
    barItem.append(accessibleLabel, bar, valueText);
    return barItem;
  }));
  labelRow.replaceChildren(...labels.map((label) => {
    const labelElement = document.createElement('span');
    labelElement.className = 'bar-chart__label';
    labelElement.textContent = label;
    return labelElement;
  }));
  return axisMax;
}

/**
 * Set a progress ring's arc and visible value.
 * @param {HTMLElement} ringFigure element containing [data-ring-indicator] and [data-ring-value]
 * @param {number} percent @param {string} valueText
 */
export function renderProgressRing(ringFigure, percent, valueText) {
  const indicator = ringFigure.querySelector('[data-ring-indicator]');
  const radius = Number(indicator.getAttribute('r'));
  const { circumference, dashOffset } = calculateRingGeometry(radius, percent);
  indicator.setAttribute('stroke-dasharray', String(circumference));
  indicator.setAttribute('stroke-dashoffset', String(circumference)); // start empty
  ringFigure.dataset.percent = String(percent);
  ringFigure.querySelector('[data-ring-value]').textContent = valueText;
  // Next frame: animate to the real value (CSS transition; disabled for reduced motion).
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    indicator.setAttribute('stroke-dashoffset', String(dashOffset));
  }));
}

/**
 * Draw a trend line into an <svg data-trend-line viewBox="0 0 600 240">.
 * @param {SVGSVGElement} trendSvg @param {number[]} values
 * @returns {{ x: number, y: number, value: number }[]} the plotted points
 */
export function renderTrendLine(trendSvg, values) {
  const [, , viewWidth, viewHeight] = trendSvg.getAttribute('viewBox').split(/\s+/).map(Number);
  const plotPoints = calculateTrendPoints(values, { width: viewWidth, height: viewHeight });
  const pointList = plotPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const baselineY = viewHeight;

  trendSvg.querySelector('[data-trend-path]').setAttribute('points', pointList);
  trendSvg.querySelector('[data-trend-area]').setAttribute(
    'd',
    `M ${plotPoints[0].x} ${baselineY} L ${plotPoints.map((point) => `${point.x} ${point.y}`).join(' L ')} L ${plotPoints[plotPoints.length - 1].x} ${baselineY} Z`,
  );
  const gridGroup = trendSvg.querySelector('[data-trend-grid]');
  if (gridGroup && !gridGroup.hasChildNodes()) {
    [0.25, 0.5, 0.75].forEach((fraction) => {
      const gridLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      gridLine.setAttribute('class', 'trend-line__grid');
      gridLine.setAttribute('x1', '0');
      gridLine.setAttribute('x2', String(viewWidth));
      gridLine.setAttribute('y1', String(viewHeight * fraction));
      gridLine.setAttribute('y2', String(viewHeight * fraction));
      gridGroup.append(gridLine);
    });
  }
  trendSvg.dataset.pointCount = String(plotPoints.length);
  return plotPoints;
}

/**
 * Render a conic-gradient donut plus its legend.
 * @param {HTMLElement} donutRing [data-donut-ring]
 * @param {HTMLUListElement} legendList
 * @param {{ label: string, amount: number }[]} segments
 * @param {(amount:number)=>string} formatAmount
 */
export function renderDonutChart(donutRing, legendList, segments, formatAmount) {
  const computedSegments = calculateDonutSegments(segments.map((segment) => segment.amount));
  const gradientStops = computedSegments
    .map((segment, index) => `var(--color-chart-${index + 1}) ${segment.start}% ${segment.end}%`)
    .join(', ');
  donutRing.style.setProperty('--donut-stops', gradientStops);
  donutRing.setAttribute('aria-label', segments.map((segment, index) => `${segment.label} ${formatPercent(computedSegments[index].percent)}`).join(', '));

  legendList.replaceChildren(...segments.map((segment, index) => {
    const legendItem = createElementWithClass('li', 'chart-legend__item');
    legendItem.append(
      createElementWithClass('span', `chart-legend__swatch chart-legend__swatch--series-${index + 1}`),
      createElementWithClass('span', 'chart-legend__label', segment.label),
      createElementWithClass('span', 'chart-legend__value', `${formatAmount(segment.amount)} · ${formatPercent(computedSegments[index].percent)}`),
    );
    return legendItem;
  }));
  return computedSegments;
}

/**
 * Build the shared empty-state block: icon tile, title, description and an
 * optional recovery action. (Anatomy adapted from 21st.dev "Empty State" no. 27575,
 * rebuilt in BEM + tokens; no third-party code.)
 * @param {{ tagName?: string, icon: string, title: string, description: string,
 *           actionLabel?: string, onAction?: () => void }} options
 * @returns {HTMLElement}
 */
export function createEmptyState({ tagName = 'div', icon, title, description, actionLabel, onAction }) {
  const emptyState = createElementWithClass(tagName, 'empty-state');
  const iconTile = createElementWithClass('span', 'empty-state__icon');
  iconTile.append(createIcon(icon));
  emptyState.append(
    iconTile,
    createElementWithClass('p', 'empty-state__title', title),
    createElementWithClass('p', 'empty-state__description', description),
  );
  if (actionLabel && onAction) {
    const actionButton = createElementWithClass('button', 'button button--secondary button--small', actionLabel);
    actionButton.type = 'button';
    actionButton.addEventListener('click', onAction);
    const actions = createElementWithClass('div', 'empty-state__actions');
    actions.append(actionButton);
    emptyState.append(actions);
  }
  return emptyState;
}

/**
 * Create an element with BEM classes and optional text (no innerHTML).
 * @param {string} tagName @param {string} className @param {string} [text]
 * @returns {HTMLElement}
 */
export function createElementWithClass(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

/**
 * Fill a <tbody> from rows of cell definitions.
 * @param {HTMLTableSectionElement} tableBody
 * @param {Array<Array<{ text: string, numeric?: boolean, muted?: boolean }>>} rows
 */
export function renderTableRows(tableBody, rows) {
  tableBody.replaceChildren(...rows.map((cells) => {
    const tableRow = document.createElement('tr');
    tableRow.className = 'data-table__row';
    cells.forEach((cell, cellIndex) => {
      const tableCell = document.createElement(cellIndex === 0 ? 'th' : 'td');
      if (cellIndex === 0) tableCell.scope = 'row';
      tableCell.className = `data-table__cell${cell.numeric ? ' data-table__cell--numeric' : ''}${cell.muted ? ' data-table__cell--muted' : ''}`;
      tableCell.textContent = cell.text;
      tableRow.append(tableCell);
    });
    return tableRow;
  }));
}

/** @param {string} selector @returns {HTMLElement} */
const requireElement = (selector) => document.querySelector(selector);

/* ==========================================================================
   3. Analytics page sections
   ========================================================================== */

function renderRevenueSection() {
  const currentMrr = monthlyRecurringRevenueSeries.at(-1);
  const previousMrr = monthlyRecurringRevenueSeries.at(-2);
  const axisMax = renderBarChart(requireElement('[data-revenue-bars]'), requireElement('[data-revenue-bar-labels]'), {
    values: monthlyRecurringRevenueSeries,
    labels: reportingMonths.map(formatMonthShort),
    longLabels: reportingMonths.map(formatMonthLong),
    formatValue: (value) => `$${roundTo(value / 1000, 1)}k`,
  });
  requireElement('[data-revenue-bars]').setAttribute('aria-label', `Monthly recurring revenue, ${formatMonthLong(reportingMonths[0])} to ${formatMonthLong(reportingMonths.at(-1))}. Axis maximum ${formatCurrency(axisMax)}.`);
  requireElement('[data-revenue-summary]').textContent = `${formatCurrency(currentMrr)} in ${formatMonthLong(reportingMonths.at(-1))}, ${formatSignedPercent(calculatePercentChange(currentMrr, previousMrr), 2)} vs ${formatMonthShort(reportingMonths.at(-2))}`;
  requireElement('[data-revenue-axis-max]').textContent = formatCurrency(axisMax);

  renderTableRows(requireElement('[data-revenue-table]'), monthlyRecurringRevenueSeries.map((value, index) => [
    { text: formatMonthLong(reportingMonths[index]) },
    { text: formatCurrency(value), numeric: true },
    { text: index === 0 ? '—' : formatSignedPercent(calculatePercentChange(value, monthlyRecurringRevenueSeries[index - 1]), 2), numeric: true, muted: true },
  ]));

  const statValues = {
    subscribers: formatNumber(subscriberMetrics.currentSubscribers),
    churn: formatPercent(subscriberMetrics.currentChurnRatePercent),
    arpu: formatCurrency(calculateAverageRevenuePerSubscriber(), { cents: true }),
    atRisk: formatCurrency(calculateRevenueAtRisk(), { cents: true }),
  };
  document.querySelectorAll('[data-revenue-stat]').forEach((statElement) => {
    statElement.textContent = statValues[statElement.dataset.revenueStat];
  });
}

function renderUsageSection() {
  const trendSvg = requireElement('[data-usage-trend]');
  const plotPoints = renderTrendLine(trendSvg, monthlyActiveUsersSeries);
  trendSvg.setAttribute('aria-label', `Monthly active users rose from ${formatNumber(plotPoints[0].value)} in ${formatMonthLong(reportingMonths[0])} to ${formatNumber(plotPoints.at(-1).value)} in ${formatMonthLong(reportingMonths.at(-1))}.`);
  requireElement('[data-usage-axis-start]').textContent = formatMonthShort(reportingMonths[0]);
  requireElement('[data-usage-axis-end]').textContent = formatMonthShort(reportingMonths.at(-1));
  const currentUsers = monthlyActiveUsersSeries.at(-1);
  requireElement('[data-usage-summary]').textContent = `${formatNumber(currentUsers)} in ${formatMonthLong(reportingMonths.at(-1))}, ${formatSignedPercent(calculatePercentChange(currentUsers, monthlyActiveUsersSeries.at(-2)), 2)} vs ${formatMonthShort(reportingMonths.at(-2))}`;
  renderTableRows(requireElement('[data-usage-table]'), monthlyActiveUsersSeries.map((value, index) => [
    { text: formatMonthLong(reportingMonths[index]) },
    { text: formatNumber(value), numeric: true },
  ]));
}

function renderInfrastructureSection() {
  const subscription = getCurrentSubscription();
  const uptimePercent = calculateUptimePercent();
  const errorBudgetPercent = calculateErrorBudgetUsedPercent();
  const eventQuotaPercent = subscription.eventLimit ? roundTo((subscription.eventsUsed / subscription.eventLimit) * 100, 2) : 0;

  const ringValues = {
    uptime: { percent: uptimePercent, text: formatPercent(uptimePercent, 2), detail: `${reliabilityMetrics.downtimeMinutes} min downtime in 30 days` },
    errorBudget: { percent: errorBudgetPercent, text: formatPercent(errorBudgetPercent), detail: `of the ${reliabilityMetrics.serviceLevelObjectivePercent}% SLO budget` },
    eventQuota: {
      percent: eventQuotaPercent,
      text: subscription.eventLimit ? formatPercent(eventQuotaPercent) : 'Custom',
      detail: subscription.eventLimit ? `${formatCompactNumber(subscription.eventsUsed)} of ${formatCompactNumber(subscription.eventLimit)} events (${subscription.plan.name})` : `${formatCompactNumber(subscription.eventsUsed)} events, custom limit`,
    },
  };
  document.querySelectorAll('[data-ring]').forEach((ringFigure) => {
    const ringData = ringValues[ringFigure.dataset.ring];
    renderProgressRing(ringFigure, ringData.percent, ringData.text);
    ringFigure.querySelector('[data-ring-detail]').textContent = ringData.detail;
  });

  const latencySvg = requireElement('[data-latency-trend]');
  renderTrendLine(latencySvg, p95LatencySeries);
  latencySvg.setAttribute('aria-label', `p95 latency over 14 days, from ${p95LatencySeries[0]} ms to ${p95LatencySeries.at(-1)} ms. Target ${reliabilityMetrics.p95LatencyTargetMs} ms.`);
  requireElement('[data-latency-summary]').textContent = `${p95LatencySeries.at(-1)} ms today · target ${reliabilityMetrics.p95LatencyTargetMs} ms`;
  requireElement('[data-latency-axis-start]').textContent = `Nov ${latencyDays[0].slice(3)}`;
  requireElement('[data-latency-axis-end]').textContent = `Nov ${latencyDays.at(-1).slice(3)}`;
  renderTableRows(requireElement('[data-latency-table]'), p95LatencySeries.map((latency, index) => [
    { text: `Nov ${Number(latencyDays[index].slice(3))}, 2026` },
    { text: `${latency} ms`, numeric: true },
  ]));

  const spendTotal = calculateCloudSpendTotal();
  const donutSegments = renderDonutChart(
    requireElement('[data-spend-donut]'),
    requireElement('[data-spend-legend]'),
    cloudSpendByService.map((item) => ({ label: item.service, amount: item.amount })),
    (amount) => formatCurrency(amount),
  );
  requireElement('[data-spend-total]').textContent = formatCurrency(spendTotal);
  requireElement('[data-spend-summary]').textContent = `${formatCurrency(spendTotal)} in the last 30 days, ${formatSignedPercent(calculatePercentChange(spendTotal, previousCloudSpendTotal), 2)} vs the previous period`;
  renderTableRows(requireElement('[data-spend-table]'), cloudSpendByService.map((item, index) => [
    { text: item.service },
    { text: formatCurrency(item.amount), numeric: true },
    { text: formatPercent(donutSegments[index].percent, 2), numeric: true, muted: true },
  ]));
  requireElement('[data-spend-table-total]').textContent = formatCurrency(spendTotal);
}

/* ==========================================================================
   4. Log viewer: level filter, text search, CSV export
   ========================================================================== */

function initializeLogViewer() {
  const logList = requireElement('[data-log-list]');
  const levelFilter = requireElement('[data-log-level-filter]');
  const searchInput = requireElement('[data-log-search]');
  const resultCount = requireElement('[data-log-count]');

  const getFilteredLogs = () => {
    const selectedLevel = levelFilter.querySelector('input:checked').value;
    const searchText = searchInput.value.trim().toLowerCase();
    return systemLogs.filter((logEntry) => (selectedLevel === 'ALL' || logEntry.level === selectedLevel)
      && (searchText === '' || `${logEntry.service} ${logEntry.message}`.toLowerCase().includes(searchText)));
  };

  function renderLogEntries() {
    const filteredLogs = getFilteredLogs();
    resultCount.textContent = `${filteredLogs.length} of ${systemLogs.length} entries`;
    if (filteredLogs.length === 0) {
      const searchText = searchInput.value.trim();
      const levelLabel = levelFilter.querySelector('input:checked + label').textContent.toLowerCase();
      logList.replaceChildren(createEmptyState({
        tagName: 'li',
        icon: 'search',
        title: 'No log entries match',
        description: levelLabel === 'all'
          ? `No entries match “${searchText}”.`
          : searchText ? `No ${levelLabel} match “${searchText}”.` : `There are no ${levelLabel} in this period.`,
        actionLabel: 'Clear filters',
        onAction: () => {
          levelFilter.querySelector('input[value="ALL"]').checked = true;
          searchInput.value = '';
          renderLogEntries();
          searchInput.focus();
        },
      }));
      return;
    }
    logList.replaceChildren(...filteredLogs.map((logEntry) => {
      const logItem = createElementWithClass('li', `log-list__entry log-list__entry--${logEntry.level.toLowerCase()}`);
      const timeElement = createElementWithClass('time', 'log-list__time', formatDateTime(logEntry.timestamp));
      timeElement.dateTime = logEntry.timestamp;
      logItem.append(
        timeElement,
        createElementWithClass('span', 'log-list__level', logEntry.level),
        createElementWithClass('span', 'log-list__service', logEntry.service),
        createElementWithClass('span', 'log-list__message', logEntry.message),
      );
      return logItem;
    }));
  }

  levelFilter.addEventListener('change', renderLogEntries);
  searchInput.addEventListener('input', renderLogEntries);
  requireElement('[data-log-export]').addEventListener('click', () => {
    downloadCsv('novadash-logs.csv', [['timestamp', 'level', 'service', 'message'], ...getFilteredLogs().map((entry) => [entry.timestamp, entry.level, entry.service, entry.message])]);
  });
  renderLogEntries();
}

/**
 * Build a CSV file in the browser and trigger a download.
 * @param {string} fileName @param {string[][]} rows
 */
export function downloadCsv(fileName, rows) {
  const csvText = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(new Blob([csvText], { type: 'text/csv;charset=utf-8' }));
  downloadLink.download = fileName;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadLink.href);
}

/** Entry point for pages/analytics.html (called by app.js). */
export default function initializeAnalyticsPage() {
  renderRevenueSection();
  renderUsageSection();
  renderInfrastructureSection();
  initializeLogViewer();
}
