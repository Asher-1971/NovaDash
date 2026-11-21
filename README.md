# NovaDash

A framework-free SaaS control panel demo built with HTML5, CSS3 and vanilla JavaScript ES modules. It covers revenue, product usage and infrastructure on one screen, opening on what needs attention first.

> **Demo only.** Sign-in, registration, billing and every company, person and figure are simulated. Nothing is sent to a server, no password is stored, and the billing form only accepts the public test card `4242 4242 4242 4242`.

## Run it

ES modules do not load from `file://`. Browsers block module scripts on that origin. You need any local HTTP server; from the project root:

```bash
python -m http.server 5173 --bind 127.0.0.1
# or, without Python:
npx -y http-server -p 5173 -a 127.0.0.1
```

Then open <http://127.0.0.1:5173/>.

**Demo sign-in:** any well-formed email and a password of 8 or more characters. The app pages (dashboard, analytics, settings) redirect to the login page until you sign in.

## Pages

| Page | File |
|---|---|
| Landing (hero with live dashboard preview, features, interactive tiers, testimonials) | `index.html` |
| Pricing (monthly/annual toggle, comparison table, FAQ, Enterprise contact form) | `pages/pricing.html` |
| Sign in, Create account, Reset password | `pages/login.html`, `pages/register.html`, `pages/forgot-password.html` |
| Executive dashboard (alerts first, KPIs, MRR trend, plan, activity) | `pages/dashboard.html` |
| Analytics (bar chart, trend lines, progress rings, donut, logs) | `pages/analytics.html` |
| Settings & billing (profile, security, notifications, plan, payment, invoices) | `pages/settings.html` |

## Structure

```
css/variables.css    design tokens (the only file with colour values) + self-hosted @font-face
css/layout.css       base elements and page structure (app shell, marketing, auth)
css/components.css   BEM components from DESIGN.md section 6
css/responsive.css   min-width breakpoints, container query, reduced motion
js/app.js            single entry module: theme, navigation, session guard, page module loader
js/store.js          ALL demo data + localStorage state layer + shared formatters
js/theme.js          dark/light theme (novadash:theme), cross-tab sync
js/navigation.js     sidebar drawer/rail (novadash:sidebarCollapsed), site menu, user menu
js/forms.js          validation, toasts, simulated auth flows
js/dashboard.js      dashboard + landing-page preview
js/analytics.js      chart math + renderers (inline SVG / CSS), log viewer, CSV export
js/settings.js       tabs, profile, security, notifications, plan change, demo card, invoices
js/pricing.js        tiers, comparison, FAQ, features, testimonials, contact form
assets/icons/        Lucide icons (ISC) as an SVG sprite
assets/fonts/        Schibsted Grotesk + IBM Plex Mono (OFL), self-hosted
```

The design contract (palette, contrast table, tokens, BEM rules, component blueprints and banned practices) lives in `DESIGN.md`, under "NovaDash Architecture Contract". Product context lives in `PRODUCT.md`. The test results are in `reports/COMPLETION_REPORT.md`.

## Persistence

Only these `localStorage` keys are used: `novadash:theme`, `novadash:sidebarCollapsed`, `novadash:demoSession`, `novadash:profile`, `novadash:notificationPreferences` and `novadash:selectedPlan`. To reset the demo, clear site data for `127.0.0.1:5173`.

## Credits

- Icons: [Lucide](https://lucide.dev) (`lucide-static` 1.77.0, ISC licence, see `assets/icons/LICENSE`)
- Type: Schibsted Grotesk and IBM Plex Mono (SIL Open Font License 1.1, see `assets/fonts/`)
- Visual reference: a Sanity-inspired DESIGN.md generated with `getdesign`
