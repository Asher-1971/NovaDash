# NovaDash: UI Consistency Audit

Date: 2026-11-21 · Scope: all 8 routes, 3 modals, the mobile drawer, menus, toasts, empty states, and every form state.
Stack note: the project is vanilla HTML/CSS/JS by contract, so the "primitives" are the BEM blocks in `css/components.css`, and the single token source is `css/variables.css`.

## Method

1. **Inventory:** grep of every `<input>`, `<select>`, `<textarea>` and `<button>` in the HTML and in the JS-generated markup, plus a CSS audit for values that bypass tokens.
2. **Computed-style audit (automated, both themes):** a Playwright script opens every page, reveals every tab panel and dialog, and groups every control by kind. For each kind it records height, border, radius, font and padding, so any kind with more than one value set is an inconsistency. The same script keyboard-focuses one control of every kind and records the focus ring, and it checks every control for a label and every error for an `aria-describedby` link.
3. **Visual sweep:** error and filled states of login, register, settings security and the analytics log empty state, at 375 and 1440px. Screenshots are in `reports/screenshots/consistency/`.
4. **Re-review:** all of the above, plus row alignment, the 32-case responsive matrix, the 41-check interaction suite and the static greps, run in a fresh browser after the fixes.

## 1. Audit log

| # | Route / file | Component | Issue found | Fix applied |
|---|---|---|---|---|
| 1 | `css/layout.css`, `components.css`, `responsive.css` | Global | 5 `!important` declarations (`[hidden]`, `.visually-hidden`, 3 in reduced motion) | All removed. Blocks that set `display` declare `.block[hidden]` (`tabs__panel`, `user-menu__panel`, `empty-state`). Reduced motion now collapses the `--duration-*` tokens. `.visually-hidden` never needed it. |
| 2 | All pages, `pricing.js` | Button | `button--pill` changed size *and* shape (padding, font) | Split into a size scale (`--small` 36 / md 44 / new `--large` 48) and a shape-only `--pill`. Every pill CTA is now `button--pill button--large` (34 instances, all 48px). |
| 3 | All 8 pages | Theme toggle | Bespoke circle with a hairline border, different from the ghost icon buttons beside it (menu toggle, modal close) | Now `button button--ghost button--icon-only theme-toggle`; `.theme-toggle` only swaps icons. |
| 4 | `components.css` | Button | `.button--icon-only.button--small` stayed 44px wide on a 36px-high button | Width follows size: 36px. |
| 5 | `components.css` | Text inputs, selects | Focus used `outline: none` plus an inset box-shadow, while every other control used the 2px outline ring | One ring for all controls (global `:focus-visible`, 2px, 2px offset) plus a focus-colour border cue. |
| 6 | `components.css` | Text inputs, selects | No `:disabled` or `[readonly]` styling; selects had no invalid style | Added disabled (dashed border, raised fill, muted text), read-only and `select[aria-invalid]`. |
| 7 | `login.html`, `forgot-password.html` | Inputs | Decorative mail/lock leading icons on 3 fields, while the other 18 fields had none | Leading icons are reserved for search fields; the 3 decorative icons were removed. |
| 8 | `register.html`, `settings.html` | Password fields | 3 of 6 password fields had a show/hide toggle (register-confirm, settings-new and settings-confirm lacked it) | Every password field has the toggle (6/6), and the input reserves 44px on the right so text never runs under it. |
| 9 | `settings.html`, `pricing.html` | Email fields | Example placeholder on 3 of 5 email fields | `name@company.com` on all 5; the search placeholder ends with an ellipsis. |
| 10 | `settings.html` (Security) | Form grid | "Confirm new password" input sat about 18px lower than its row-mate, because `.form-field` rows stretched when the sibling had a hint (found in the visual sweep) | `.form-field { align-content: start }`. The re-check found 8 two-column rows, 0 misaligned. |
| 11 | `analytics.html` | Search input | Chrome's native "×" clear glyph is not from the Lucide icon system | Hidden; Escape still clears the field natively. |
| 12 | `settings.js`, `register.html` | Checkbox / radio | Plan radios used the browser default (about 13px), while checkboxes were 18px | Shared `--control-check-size` (18px) via `choice-field__input` and the new `plan-option__input`. |
| 13 | `components.css` | Switch | No disabled state | Added (50% opacity, not-allowed cursor). |
| 14 | Dashboard, analytics vs pricing | Segmented control / billing toggle | Options were 32px / 13px vs 36px / 15px (same primitive, two looks); no hover; focus offset 1px vs 2px | Both are 36px, 15px medium, with a hover colour and the 2px token offset. |
| 15 | Analytics section nav | Segmented links | Anchors inside `segmented-control` showed link underlines | `text-decoration: none` and pointer on the option label. |
| 16 | Login, forgot, pricing; `forms.js` | Feedback banner | Two primitives for the same job (`form-status` and `alert`) with different gaps and icon offsets | `form-status` merged into `alert` (`alert--success`/`--error`); `.alert:empty` hides the idle live region. |
| 17 | Dashboard, analytics; `dashboard.js`, `analytics.js` | Empty states | Three bespoke rules (`attention-list__empty`, `data-table__empty`, `log-list__empty`) with different alignment and fonts | One `empty-state` block (centred, 24px padding, 15px secondary text). |
| 18 | `components.css` | Modal | 12px marketing radius on a product dialog, while menus and toasts used 6px | Modals use the 6px application radius. |
| 19 | `components.css` | Toast dismiss | 32px target, below the 36px small-control size | 36px, plus a hover transition. |
| 20 | Dashboard, analytics | KPI card | 16px padding at every width, while panels grew to 24px from 768px | Shares the panel's responsive padding. |
| 21 | `layout.css`, `components.css` | Typography | 6 raw `line-height` values (0.98, 1, 1.2, 1.3) and 2 raw `letter-spacing` values (0.02em, 0) | New tokens `--line-height-display`, `-flat`, `-ui`, `-snug` and `--tracking-mono`; `0` maps to `--tracking-body`. Now 0 untokenised type values. |
| 22 | `components.css` | Spinner | Hard-coded `700ms` | `--duration-spin` token. |
| 23 | `components.css` | Tabs | Focus ring inset by a magic `-2px` | Kept as a **documented exception** (the horizontally scrolling tab list clips outward rings), expressed with the token: `calc(-1 * var(--focus-ring-offset))`. |
| 24 | Site-wide | 404 page | No custom 404 route exists; `python -m http.server` serves its own page and cannot be configured to serve another | **Not fixed (out of scope):** the brief's fixed file structure has no 404, and this server cannot route to one. Recorded here and in the completion report. |

**Conflicts resolved, and the pattern kept:** mark optional fields rather than required ones (only 2 fields are optional, so asterisks on 20+ fields would be noise); leading icons only for search; the outline focus ring over the box-shadow ring (it works in forced-colours mode and matches the rest of the UI); and `alert` over `form-status` (the more complete primitive).

## 2. Code changes (by file)

- **`css/variables.css`:** new tokens `--line-height-display|flat|ui|snug`, `--tracking-mono`, `--duration-spin`, `--control-height-lg` (48px) and `--control-check-size` (18px).
- **`css/components.css`:**
  - Button size and shape split, plus the icon-only small size.
  - Theme-toggle visuals removed (now the ghost icon button).
  - Unified input focus and states; the trailing-toggle padding rule.
  - Shared check size; switch disabled state.
  - `form-status` deleted and merged into `alert`.
  - New `empty-state` block (three bespoke rules deleted).
  - Segmented and billing option parity.
  - Explicit `[hidden]` rules, the modal radius and the toast target.
  - Tokenised line-heights, tracking and spinner timing.
  - `.form-field { align-content: start }`; the search clear glyph hidden.
- **`css/layout.css`:** `[hidden]` without `!important`; the hero line-height token.
- **`css/responsive.css`:** reduced motion via token collapse (no `!important`); KPI cards share panel padding.
- **HTML (all 8 pages):**
  - Pill CTAs gain `button--large`; the theme toggle uses the button primitive.
  - Decorative auth icons removed; 3 password toggles added; 2 email placeholders added.
  - `form-status` becomes `alert`; `data-table__empty` becomes `empty-state`.
- **JS:**
  - `forms.js`: `showFormStatus` renders `alert` markup.
  - `dashboard.js` and `analytics.js`: empty items use `empty-state`.
  - `settings.js`: plan radios get `plan-option__input`.
  - `pricing.js`: tier CTAs get `button--large`.
  - No business logic, validation rules, handlers or state changed. All 41 interaction checks still pass.
- **`DESIGN.md`:** Banned Practice #1 tightened (no `!important` at all); the button blueprint rewritten as hierarchy, size and shape; the control rules for inputs; `alert` and `empty-state` documented; the tab focus exception recorded.

## 3. Final A-to-Z sign-off (step 4 re-review, fresh browser, current code)

| Check | Result |
|---|---|
| Computed-style audit, every route, both themes | Single value set per kind: text inputs/selects (50, plus 2 search with icon padding), textarea, field label (52), password toggle (12), checkbox/radio (8), switch (10), segmented/toggle option (32), button sm/rect (28), md/rect (28), md/icon (22), lg/pill (34). The only intentional variants: search-icon padding, per-theme hint colour, inset tab ring. |
| Focus ring on every control kind (13 kinds) | 2px solid, 2px offset; tabs inset (documented). 0 kinds failed `:focus-visible`. |
| Labels and error links | 0 unlabelled controls, 0 errors missing an `aria-describedby` link, 0 controls without an accessible name. |
| Two-column form row alignment (settings, pricing; 768 and 1440) | 8 rows, 0 misaligned. |
| Responsive matrix (8 routes at 375/768/1024/1440) | 32/32 with no horizontal overflow; 0 console errors; 0 failed requests. |
| Interaction suite (forms empty/malformed/valid, keyboard, modals, drawer, theme, links, data consistency) | 41/41. |
| Static greps | 0 `style=""`; 0 `!important` declarations; 0 raw hex in CSS or JS outside `variables.css`; 0 untokenised font-size/line-height/letter-spacing/weight; 0 ID selectors; 0 utility classes; 0 stale class references; CSS braces balanced. |

### Route checklist

- [x] `index.html`: header and mobile menu, hero CTAs (lg pill), live preview, feature windows, billing toggle, tier CTAs, footer
- [x] `pages/pricing.html`: billing toggle, tiers, comparison table, FAQ, contact-sales modal (empty, invalid and valid states)
- [x] `pages/login.html`: empty, malformed and valid; password toggle; signed-out and redirect notices (`alert`)
- [x] `pages/register.html`: all fields empty, malformed and mismatched; live password rules; 2 password toggles; terms checkbox; plan select
- [x] `pages/forgot-password.html`: empty and valid; success `alert`
- [x] `pages/dashboard.html`: attention rows, dismiss, empty state, KPI cards, segmented filter, activity table, meters
- [x] `pages/analytics.html`: section nav, charts plus data tables, log filters, search, empty state, CSV export
- [x] `pages/settings.html`: 4 tabs (keyboard), profile (invalid and saved), security (3 password toggles, mismatch, 2FA switch, sessions), notifications (persisted switches), billing (plan modal, payment modal: real card, past expiry and short CVC rejected), invoice export
- [x] Shared: sidebar rail and drawer, user menu (keyboard), toasts, theme toggle in both themes
- [ ] Custom 404: does not exist (item 24)

## Addendum: 21st.dev inspiration pass (same day)

The account is on the free tier with AI generation disabled (`21st usage --json`: `aiGenerationEnabled: false`, 0 credits), so no sketches were generated. I searched the catalog (free, about 18 candidates across stat cards, alerts, pricing, empty states, activity feeds and KPI tiles) and spent the 2 daily free retrievals on:

| 21st component | What was taken | What was rejected | Where it landed |
|---|---|---|---|
| Pricing Section with Monthly/Yearly Toggle (no. 36083, React) | Price ticker (count from the old to the new value, ease-out cubic, off under reduced motion); a savings line | Hard-coded hex palette, hatched background, corner brackets, "Most popular" badge (banned by DESIGN.md), hover lift, React | `pricing.js` `animateChangedPrices()`; annual notes on index and pricing |
| Empty State (no. 27575, React, framer-motion, Tailwind) | Anatomy: icon tile, title, description, action; pop-in | Tailwind utilities, framer-motion, the inbox SVG (Lucide icons are used instead) | `.empty-state__*` in `components.css`; `createEmptyState()`; logs ("Clear filters"), activity ("Show all activity"), attention ("All clear") |

Skipped on purpose: KPI sparkline tiles (the craft floor rejects sparklines standing in for content), alert banners and the activity timeline (they duplicate existing blocks).

**Verification:** the ticker shows intermediate values mid-animation ($43, $131) and lands on the store values ($39, $119), with `<data>` final throughout. Savings are $120 and $360. "Clear filters" restores 14/14 entries, resets the level to All, empties the search and refocuses it; no console messages. Re-run: matrix 32/32, interactions 41/41, consistency audit unchanged (only the documented variants), static checks clean. One matrix run logged a cancelled `ibm-plex-mono-latin-400-normal.woff2` request; the file serves 200 (14,708 bytes) and a re-run was clean, so it was a request cancelled by the test's rapid navigation, not a missing asset. No third-party code was copied: the brief forbids React and Tailwind, so both components were rebuilt in BEM, tokens and vanilla JS.
