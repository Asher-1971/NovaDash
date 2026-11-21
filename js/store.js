/**
 * @file store.js
 * @description The single source of NovaDash demo data, plus the state layer
 * (localStorage read/write for the allowed `novadash:` keys) and the shared
 * formatters, so every page renders the same figure the same way.
 *
 * All companies, people and figures are FICTIONAL demo content.
 * Rule: any number shown in the UI must be read or derived from this file.
 * @module store
 */

/* ==========================================================================
   1. Reference period
   ========================================================================== */

/** The "today" the demo data is anchored to (ISO date, UTC). */
export const demoToday = '2026-11-21';

/** Twelve reporting months, oldest first. Index 11 is the current month. */
export const reportingMonths = [
  '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
  '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
];

/* ==========================================================================
   2. Business metrics tracked by the demo company inside NovaDash
   ========================================================================== */

/** Monthly recurring revenue in USD, aligned with `reportingMonths`. */
export const monthlyRecurringRevenueSeries = [
  31200, 32850, 33900, 35400, 36100, 37950,
  39400, 41200, 42650, 44100, 45300, 48210,
];

/** Monthly active users, aligned with `reportingMonths`. */
export const monthlyActiveUsersSeries = [
  8420, 8790, 9130, 9480, 9910, 10240,
  10690, 11020, 11530, 11980, 12410, 12940,
];

/** Subscriber and churn figures for the current and previous month. */
export const subscriberMetrics = {
  currentSubscribers: 1042,
  previousSubscribers: 998,
  currentChurnRatePercent: 2.1,
  previousChurnRatePercent: 2.6,
};

/** Infrastructure reliability over the trailing 30 days. */
export const reliabilityMetrics = {
  periodMinutes: 43200, // 30 days
  downtimeMinutes: 21.6,
  previousUptimePercent: 99.91,
  serviceLevelObjectivePercent: 99.9,
  p95LatencyMs: 486,
  p95LatencyTargetMs: 400,
};

/** Cloud spend by service over the trailing 30 days (USD). Sum is the KPI. */
export const cloudSpendByService = [
  { service: 'Compute', amount: 2184 },
  { service: 'Database', amount: 1092 },
  { service: 'Storage', amount: 546 },
  { service: 'Network', amount: 378 },
];

/** Cloud spend total for the previous 30-day period (USD). */
export const previousCloudSpendTotal = 4410;

/** Tracked product events used in the current billing cycle. */
export const eventUsage = {
  eventsUsed: 3720000,
  cycleEndsOn: '2026-11-30',
};

/** Daily p95 latency (ms) for the last 14 days, oldest first. */
export const latencyDays = [
  '11-08', '11-09', '11-10', '11-11', '11-12', '11-13', '11-14',
  '11-15', '11-16', '11-17', '11-18', '11-19', '11-20', '11-21',
];
export const p95LatencySeries = [
  312, 298, 305, 331, 322, 318, 296,
  301, 344, 362, 351, 389, 412, 486,
];

/* ==========================================================================
   3. NovaDash plans, the demo account's subscription, invoices
   ========================================================================== */

/**
 * @typedef {Object} PricingPlan
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number|null} monthlyPrice   USD per month on monthly billing; null = custom
 * @property {number|null} annualMonthlyPrice USD per month when billed annually
 * @property {number|null} seatLimit
 * @property {number|null} eventLimit     tracked events per month
 * @property {string[]} highlights
 */

/** @type {PricingPlan[]} */
export const pricingPlans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For a founder watching the first revenue and the first users.',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    seatLimit: 2,
    eventLimit: 250000,
    highlights: ['2 seats', '250K tracked events / month', 'Revenue and usage dashboards', '7-day log history'],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For small teams running revenue, product and infrastructure from one place.',
    monthlyPrice: 49,
    annualMonthlyPrice: 39,
    seatLimit: 10,
    eventLimit: 5000000,
    highlights: ['10 seats', '5M tracked events / month', 'Infrastructure health and cloud spend', 'Alerts by email', '30-day log history'],
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'For companies with an on-call rotation and a finance owner.',
    monthlyPrice: 149,
    annualMonthlyPrice: 119,
    seatLimit: 25,
    eventLimit: 25000000,
    highlights: ['25 seats', '25M tracked events / month', 'SLO and error-budget tracking', 'Alerts by email and webhook', '1-year log history'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For regulated teams that need custom limits, SSO and a contract.',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    seatLimit: null,
    eventLimit: null,
    highlights: ['Unlimited seats', 'Custom event volume', 'SAML single sign-on', 'Dedicated success manager', 'Custom data retention'],
  },
];

/** Feature comparison rows for pricing.html. Values align with `pricingPlans` order. */
export const planComparison = [
  { group: 'Usage', rows: [
    { feature: 'Seats', values: ['2', '10', '25', 'Unlimited'] },
    { feature: 'Tracked events / month', values: ['250K', '5M', '25M', 'Custom'] },
    { feature: 'Log history', values: ['7 days', '30 days', '1 year', 'Custom'] },
  ] },
  { group: 'Dashboards', rows: [
    { feature: 'Revenue: MRR, churn, invoices', values: [true, true, true, true] },
    { feature: 'Product usage and retention', values: [true, true, true, true] },
    { feature: 'Infrastructure health and cloud spend', values: [false, true, true, true] },
    { feature: 'SLO and error-budget tracking', values: [false, false, true, true] },
  ] },
  { group: 'Alerts and access', rows: [
    { feature: 'Email alerts', values: [false, true, true, true] },
    { feature: 'Webhook alerts', values: [false, false, true, true] },
    { feature: 'Two-factor authentication', values: [true, true, true, true] },
    { feature: 'SAML single sign-on', values: [false, false, false, true] },
  ] },
];

/** Pricing FAQ. */
export const pricingQuestions = [
  { question: 'Can I switch plans later?', answer: 'Yes. Plan changes take effect immediately in this demo, and the next invoice in Settings updates to the new price.' },
  { question: 'How does annual billing work?', answer: 'Annual billing charges twelve months up front at the discounted monthly rate shown on each plan.' },
  { question: 'What counts as a tracked event?', answer: 'Any product event, page view or API call you send to NovaDash. Infrastructure metrics never count toward the limit.' },
  { question: 'Is this a real service?', answer: 'No. NovaDash is a front-end demonstration. Sign-in, billing and every figure on these pages are simulated.' },
];

/** The demo account's default subscription (overridden by `novadash:selectedPlan`). */
export const defaultSubscription = {
  planId: 'growth',
  cycle: 'monthly',
  seatsUsed: 8,
  renewsOn: '2026-12-01',
};

/** The demo payment method. Uses the public 4242 test number; never a real card. */
export const demoPaymentMethod = {
  brand: 'Visa',
  last4: '4242',
  expiryMonth: 8,
  expiryYear: 2028,
  holderName: 'Priya Raman',
};

/** NovaDash invoices billed to the demo account, newest first. */
export const invoiceHistory = [
  { id: 'NVD-2026-1101', issuedOn: '2026-11-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
  { id: 'NVD-2026-1001', issuedOn: '2026-10-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
  { id: 'NVD-2026-0901', issuedOn: '2026-09-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
  { id: 'NVD-2026-0801', issuedOn: '2026-08-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
  { id: 'NVD-2026-0701', issuedOn: '2026-07-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
  { id: 'NVD-2026-0601', issuedOn: '2026-06-01', description: 'Growth plan, monthly', amount: 49, status: 'Paid' },
];

/* ==========================================================================
   4. Activity, alerts, logs
   ========================================================================== */

/**
 * Recent activity across all three domains, newest first.
 * `amount` is a signed MRR change in USD or null; `status` maps to a status-badge.
 */
export const recentActivity = [
  { id: 'act-012', timestamp: '2026-11-21T07:42:00Z', domain: 'Revenue', event: 'Payment failed', subject: 'Halcyon Labs, Scale plan', amount: 149, status: 'Failed' },
  { id: 'act-011', timestamp: '2026-11-21T07:40:00Z', domain: 'Revenue', event: 'Payment failed', subject: 'Brightwater Co, custom plan', amount: 129, status: 'Failed' },
  { id: 'act-010', timestamp: '2026-11-21T07:38:00Z', domain: 'Revenue', event: 'Payment failed', subject: 'Okapi Studio, custom plan', amount: 134, status: 'Failed' },
  { id: 'act-009', timestamp: '2026-11-21T06:12:00Z', domain: 'Infrastructure', event: 'Latency alert opened', subject: 'api-gateway p95 at 486 ms', amount: null, status: 'Open' },
  { id: 'act-008', timestamp: '2026-11-21T05:55:00Z', domain: 'Infrastructure', event: 'Deploy succeeded', subject: 'web-app v2.41.0', amount: null, status: 'Done' },
  { id: 'act-007', timestamp: '2026-11-20T22:18:00Z', domain: 'Revenue', event: 'Upgrade', subject: 'Northwind Analytics, Growth to Scale', amount: 100, status: 'Done' },
  { id: 'act-006', timestamp: '2026-11-20T20:47:00Z', domain: 'Product', event: 'Adoption milestone', subject: 'Saved reports: 1,000 weekly users', amount: null, status: 'Info' },
  { id: 'act-005', timestamp: '2026-11-20T18:05:00Z', domain: 'Revenue', event: 'New subscription', subject: 'Fieldnote Inc, Growth plan', amount: 49, status: 'Done' },
  { id: 'act-004', timestamp: '2026-11-20T16:30:00Z', domain: 'Product', event: 'Retention report', subject: 'October cohort: 41% active at day 30', amount: null, status: 'Info' },
  { id: 'act-003', timestamp: '2026-11-20T14:02:00Z', domain: 'Infrastructure', event: 'Backup completed', subject: 'primary-db snapshot, 112 GB', amount: null, status: 'Done' },
  { id: 'act-002', timestamp: '2026-11-20T11:26:00Z', domain: 'Revenue', event: 'Cancellation', subject: 'Lattice Works, Growth plan', amount: -49, status: 'Churned' },
  { id: 'act-001', timestamp: '2026-11-20T09:15:00Z', domain: 'Infrastructure', event: 'Cost anomaly resolved', subject: 'Storage egress back to baseline', amount: null, status: 'Done' },
];

/**
 * Items that need the operator's attention. Static alerts live here; the
 * event-quota alert is derived in dashboard.js from `eventUsage` + current plan.
 * `relatedActivityIds` ties each alert to the rows it summarises.
 */
export const attentionAlerts = [
  {
    id: 'alert-failed-payments',
    severity: 'critical',
    title: '3 card payments failed overnight',
    relatedActivityIds: ['act-012', 'act-011', 'act-010'],
    detailTemplate: '{amount} of MRR at risk. Automatic retries run at 14:00 UTC.',
    actionLabel: 'Review revenue',
    actionHref: 'analytics.html#revenue',
  },
  {
    id: 'alert-latency',
    severity: 'warning',
    title: 'api-gateway latency is above target',
    relatedActivityIds: ['act-009'],
    detailTemplate: 'p95 reached {latency} against a {target} target. Error budget {budget} used.',
    actionLabel: 'Open infrastructure',
    actionHref: 'analytics.html#infrastructure',
  },
];

/** System log lines for the analytics log viewer, newest first. */
export const systemLogs = [
  { timestamp: '2026-11-21T07:42:10Z', level: 'ERROR', service: 'billing', message: 'Charge declined for Halcyon Labs (card_declined). Retry scheduled 14:00 UTC.' },
  { timestamp: '2026-11-21T07:40:02Z', level: 'ERROR', service: 'billing', message: 'Charge declined for Brightwater Co (insufficient_funds). Retry scheduled 14:00 UTC.' },
  { timestamp: '2026-11-21T07:38:45Z', level: 'ERROR', service: 'billing', message: 'Charge declined for Okapi Studio (expired_card). Customer emailed.' },
  { timestamp: '2026-11-21T06:12:31Z', level: 'WARN', service: 'api-gateway', message: 'p95 latency 486 ms exceeds 400 ms target for 15 min. Alert opened.' },
  { timestamp: '2026-11-21T06:02:09Z', level: 'WARN', service: 'api-gateway', message: 'Upstream pool for reports-service at 92% utilisation.' },
  { timestamp: '2026-11-21T05:55:40Z', level: 'INFO', service: 'deploy', message: 'web-app v2.41.0 rolled out to 100% of traffic in 4m12s.' },
  { timestamp: '2026-11-21T04:30:00Z', level: 'INFO', service: 'scheduler', message: 'Nightly MRR rollup completed: 1,042 active subscriptions.' },
  { timestamp: '2026-11-20T22:18:04Z', level: 'INFO', service: 'billing', message: 'Northwind Analytics upgraded Growth to Scale (+$100.00 MRR).' },
  { timestamp: '2026-11-20T18:05:51Z', level: 'INFO', service: 'billing', message: 'New subscription: Fieldnote Inc on Growth ($49.00 MRR).' },
  { timestamp: '2026-11-20T14:02:17Z', level: 'INFO', service: 'primary-db', message: 'Snapshot completed (112 GB) and copied to cold storage.' },
  { timestamp: '2026-11-20T11:26:33Z', level: 'WARN', service: 'billing', message: 'Lattice Works cancelled Growth plan (-$49.00 MRR). Reason: budget.' },
  { timestamp: '2026-11-20T09:15:00Z', level: 'INFO', service: 'cost-monitor', message: 'Storage egress anomaly resolved; spend back within 5% of baseline.' },
  { timestamp: '2026-11-20T03:41:26Z', level: 'ERROR', service: 'reports-service', message: 'Export job 88123 timed out after 120 s; retried successfully.' },
  { timestamp: '2026-11-19T23:00:00Z', level: 'INFO', service: 'scheduler', message: 'Weekly usage digest sent to 8 team members.' },
];

/* ==========================================================================
   5. Account, security and marketing content
   ========================================================================== */

/** Default profile for the demo account (overridden by `novadash:profile`). */
export const defaultProfile = {
  fullName: 'Priya Raman',
  email: 'priya@lumenledger.example',
  role: 'Founder & COO',
  company: 'Lumen Ledger',
  timezone: 'UTC',
};

/** Timezone options for the profile form. */
export const timezoneOptions = ['UTC', 'Europe/London', 'Europe/Berlin', 'Asia/Karachi', 'Asia/Singapore', 'America/New_York', 'America/Los_Angeles'];

/** Signed-in devices shown on the Security tab (demo). */
export const activeSessions = [
  { id: 'session-current', device: 'Chrome on Windows', location: 'This device', lastActive: 'Active now', isCurrent: true },
  { id: 'session-iphone', device: 'Safari on iPhone', location: 'Mobile app web view', lastActive: '2 days ago', isCurrent: false },
  { id: 'session-linux', device: 'Firefox on Ubuntu', location: 'Office workstation', lastActive: '6 days ago', isCurrent: false },
];

/** Default notification preferences (overridden by `novadash:notificationPreferences`). */
export const defaultNotificationPreferences = {
  paymentFailures: true,
  incidentAlerts: true,
  weeklyDigest: true,
  productUpdates: false,
};

/** Labels for the notification switches, keyed like the preferences object. */
export const notificationPreferenceLabels = {
  paymentFailures: { label: 'Failed payments', description: 'Email me when a subscriber payment fails.' },
  incidentAlerts: { label: 'Incident alerts', description: 'Email me when latency or uptime breaks its target.' },
  weeklyDigest: { label: 'Weekly digest', description: 'A Monday summary of revenue, usage and spend.' },
  productUpdates: { label: 'Product updates', description: 'Occasional notes about new NovaDash features.' },
};

/**
 * Landing-page feature list: one entry per domain NovaDash covers. `signal`
 * names the live store.js slice pricing.js renders beside each row, so every
 * claim is shown working with the same data the dashboard uses.
 */
export const productFeatures = [
  { signal: 'revenue', icon: 'chart-column', title: 'Revenue', windowPath: 'overview/revenue', text: 'MRR, subscribers, churn and failed payments in one ledger. This is last night, straight from the demo account.' },
  { signal: 'usage', icon: 'activity', title: 'Product usage', windowPath: 'analytics/usage', text: 'Active users and adoption without opening a separate analytics tool. Twelve months of monthly active users.' },
  { signal: 'infrastructure', icon: 'server', title: 'Infrastructure', windowPath: 'analytics/infrastructure', text: 'Latency, uptime and the error budget sit next to the revenue they protect. Fourteen days of p95 latency.' },
];

/** Testimonials from FICTIONAL demo personas (labelled as such in the UI). */
export const testimonials = [
  { quote: 'I used to open four tabs before coffee. Now the failed payments and the latency spike are on the same screen, and I know which one to deal with first.', author: 'Amara Velez', role: 'COO, Fieldnote (demo persona)' },
  { quote: 'Seeing cloud spend next to MRR changed how we talk about infrastructure. It is a margin line now, not an engineering mystery.', author: 'Tobias Lindqvist', role: 'Founder, Northwind Analytics (demo persona)' },
  { quote: 'The error-budget ring is the first thing our on-call lead checks. It replaced a status page nobody read.', author: 'Hana Sato', role: 'Head of Ops, Halcyon Labs (demo persona)' },
];

/* ==========================================================================
   6. Derived figures (single place to compute values shown on many pages)
   ========================================================================== */

/** @param {number[]} values @returns {number} */
export const sumValues = (values) => values.reduce((total, value) => total + value, 0);

/** @returns {number} uptime percent for the trailing 30 days, 2 decimals */
export function calculateUptimePercent() {
  const { periodMinutes, downtimeMinutes } = reliabilityMetrics;
  return roundTo(((periodMinutes - downtimeMinutes) / periodMinutes) * 100, 2);
}

/** @returns {number} share of the SLO error budget already used, in percent */
export function calculateErrorBudgetUsedPercent() {
  const { periodMinutes, downtimeMinutes, serviceLevelObjectivePercent } = reliabilityMetrics;
  const allowedDowntimeMinutes = periodMinutes * (1 - serviceLevelObjectivePercent / 100);
  return roundTo((downtimeMinutes / allowedDowntimeMinutes) * 100, 2);
}

/** @returns {number} total cloud spend for the trailing 30 days */
export const calculateCloudSpendTotal = () => sumValues(cloudSpendByService.map((item) => item.amount));

/** @returns {number} USD of MRR at risk from failed payments */
export function calculateRevenueAtRisk() {
  return sumValues(recentActivity.filter((row) => row.status === 'Failed').map((row) => row.amount));
}

/**
 * Percentage change between two values.
 * @param {number} current @param {number} previous @returns {number}
 */
export function calculatePercentChange(current, previous) {
  if (previous === 0) return 0;
  return roundTo(((current - previous) / previous) * 100, 2);
}

/** @returns {number} average revenue per subscriber (USD, 2 decimals) */
export function calculateAverageRevenuePerSubscriber() {
  const currentMrr = monthlyRecurringRevenueSeries[monthlyRecurringRevenueSeries.length - 1];
  return roundTo(currentMrr / subscriberMetrics.currentSubscribers, 2);
}

/**
 * Round half away from zero to a fixed number of decimals.
 * @param {number} value @param {number} decimals @returns {number}
 */
export function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/* ==========================================================================
   7. State layer: localStorage (allowed keys only, brief C7)
   ========================================================================== */

/** Every localStorage key NovaDash may use. Nothing else is ever written. */
export const storageKeys = Object.freeze({
  theme: 'novadash:theme',
  sidebarCollapsed: 'novadash:sidebarCollapsed',
  demoSession: 'novadash:demoSession',
  profile: 'novadash:profile',
  notificationPreferences: 'novadash:notificationPreferences',
  selectedPlan: 'novadash:selectedPlan',
});

/**
 * Read and JSON-parse a stored value. Returns `fallbackValue` when the key is
 * missing, unparsable, or storage is unavailable (private mode, blocked).
 * @template T @param {string} storageKey @param {T} fallbackValue @returns {T}
 */
export function readStoredValue(storageKey, fallbackValue) {
  try {
    const rawValue = window.localStorage.getItem(storageKey);
    return rawValue === null ? fallbackValue : JSON.parse(rawValue);
  } catch {
    return fallbackValue;
  }
}

/**
 * JSON-serialise and store a value. Silently ignores storage failures so the
 * demo keeps working without persistence.
 * @param {string} storageKey @param {unknown} value @returns {boolean} saved
 */
export function writeStoredValue(storageKey, value) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** @param {string} storageKey */
export function removeStoredValue(storageKey) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    /* storage unavailable: nothing to remove */
  }
}

/** @returns {typeof defaultProfile} the saved profile merged over the default */
export function getProfile() {
  return { ...defaultProfile, ...readStoredValue(storageKeys.profile, {}) };
}

/** @param {Partial<typeof defaultProfile>} profileChanges @returns {typeof defaultProfile} */
export function saveProfile(profileChanges) {
  const updatedProfile = { ...getProfile(), ...profileChanges };
  writeStoredValue(storageKeys.profile, updatedProfile);
  return updatedProfile;
}

/** @returns {typeof defaultNotificationPreferences} */
export function getNotificationPreferences() {
  return { ...defaultNotificationPreferences, ...readStoredValue(storageKeys.notificationPreferences, {}) };
}

/** @param {typeof defaultNotificationPreferences} preferences */
export function saveNotificationPreferences(preferences) {
  writeStoredValue(storageKeys.notificationPreferences, preferences);
}

/**
 * The plan the demo account is on: the stored choice, else the default.
 * Invalid stored ids fall back to the default plan.
 * @returns {{ planId: string, cycle: 'monthly'|'annual' }}
 */
export function getSelectedPlan() {
  const storedSelection = readStoredValue(storageKeys.selectedPlan, null);
  const isValidPlan = storedSelection && pricingPlans.some((plan) => plan.id === storedSelection.planId);
  const isValidCycle = storedSelection && ['monthly', 'annual'].includes(storedSelection.cycle);
  if (isValidPlan && isValidCycle) return { planId: storedSelection.planId, cycle: storedSelection.cycle };
  return { planId: defaultSubscription.planId, cycle: defaultSubscription.cycle };
}

/** @param {string} planId @param {'monthly'|'annual'} cycle */
export function setSelectedPlan(planId, cycle) {
  writeStoredValue(storageKeys.selectedPlan, { planId, cycle });
}

/** @param {string} planId @returns {PricingPlan|undefined} */
export const findPlanById = (planId) => pricingPlans.find((plan) => plan.id === planId);

/**
 * Everything the UI needs about the current subscription, derived once so the
 * dashboard, analytics and settings pages always agree.
 */
export function getCurrentSubscription() {
  const { planId, cycle } = getSelectedPlan();
  const plan = findPlanById(planId);
  const monthlyEquivalent = cycle === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;
  const nextInvoiceAmount = plan.monthlyPrice === null ? null : cycle === 'annual' ? monthlyEquivalent * 12 : monthlyEquivalent;
  return {
    plan,
    cycle,
    monthlyEquivalent,
    nextInvoiceAmount,
    nextInvoiceDate: defaultSubscription.renewsOn,
    seatsUsed: defaultSubscription.seatsUsed,
    seatLimit: plan.seatLimit,
    eventsUsed: eventUsage.eventsUsed,
    eventLimit: plan.eventLimit,
  };
}

/** @returns {{ email: string, startedAt: string }|null} the simulated session */
export const getDemoSession = () => readStoredValue(storageKeys.demoSession, null);

/** Start a SIMULATED session. Stores the email only; never a password. @param {string} email */
export function startDemoSession(email) {
  writeStoredValue(storageKeys.demoSession, { email, startedAt: new Date().toISOString() });
}

/** End the simulated session. */
export const endDemoSession = () => removeStoredValue(storageKeys.demoSession);

/* ==========================================================================
   8. Formatters (shared so every page prints figures identically)
   ========================================================================== */

const currencyWholeFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const currencyCentsFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

/**
 * @param {number} amount @param {{ cents?: boolean }} [options]
 * @returns {string} e.g. "$48,210" or "$49.00"
 */
export function formatCurrency(amount, { cents = false } = {}) {
  return (cents ? currencyCentsFormatter : currencyWholeFormatter).format(amount);
}

/** @param {number} value @returns {string} e.g. "12,940" */
export const formatNumber = (value) => numberFormatter.format(value);

/** @param {number} value @returns {string} e.g. "3.72M" */
export const formatCompactNumber = (value) => compactFormatter.format(value);

/** @param {number} value @param {number} [decimals=1] @returns {string} e.g. "99.95%" */
export const formatPercent = (value, decimals = 1) => `${value.toFixed(decimals)}%`;

/** @param {number} value @returns {string} signed percent, e.g. "+6.42%" / "-4.76%" */
export const formatSignedPercent = (value, decimals = 1) => `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;

/** @param {string} isoDate "2026-11-01" @returns {string} "Nov 1, 2026" (UTC) */
export function formatDate(isoDate) {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

/** @param {string} isoTimestamp @returns {string} "Nov 21, 07:42 UTC" */
export function formatDateTime(isoTimestamp) {
  const date = new Date(isoTimestamp);
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const timePart = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${datePart}, ${timePart} UTC`;
}

/** @param {string} yearMonth "2026-11" @returns {string} "Nov" */
export function formatMonthShort(yearMonth) {
  return new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

/** @param {string} yearMonth "2026-11" @returns {string} "November 2026" */
export function formatMonthLong(yearMonth) {
  return new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}
