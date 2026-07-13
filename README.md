# Gravy 🍕

A gamified chores, nutrition, and rewards PWA for kids — built with React 19,
TypeScript, and Vite. It's a client-side-only SPA: no server, no API. Data
persists to `localStorage`, with optional real-time cloud sync across
devices via Supabase.

Kids log food groups eaten and complete daily goals to earn points, climb a
24-tier rank ladder, build streaks, and play mini-games.
Points can be redeemed for rewards from a parent-managed store, with a
parent menu (approvals and configuration) locked behind a required parent
account — there's no PIN.

## Features

- **Home** — rank progress, streak stats, food tray tracker, daily
  goals (including multi-step goals), and repeatable bonus-point items
- **Arcade** — Hangman, Math Facts, Word Scramble, and Memory Match, where
  winning earns points up to a daily cap so kids can't farm easy rounds;
  plus **Roll to the Goal**, a daily dice challenge (roll five dice,
  hold what you like, reroll toward a shared daily target) with an
  accuracy-scaled payout and its own three-rounds-per-day limit,
  independent of the other games' win cap
- **Rank ladder** — a 24-tier progression (Noob → Sonic Snail) with a
  kid-facing screen showing locked/current/achieved tiers and progress, plus a
  "Stats" view with charts covering points history, an activity heatmap,
  personal bests, goals trend, favorite foods, games breakdown, and rewards
  history
- **Store** — spend points on parent-defined rewards (pending approval)
- **Pending points** — on a device that's never signed in with a parent
  account (joined via family code only), a kid's chores/food/bonus
  items/games still complete live, but the points sit pending until a
  parent approves or declines them from Approvals; a signed-in parent's
  own device posts points immediately, same as before
- **Multi-profile households** — multiple kid profiles per device, each
  with independent progress/streaks but shared goals, rewards,
  and points settings; switch between them from a parent
  account-gated quick-switch list
- **Approvals** — a bell icon next to the menu (hamburger) icon, marked
  with a count pill for the number waiting; approve or decline pending points and reward
  requests. Tapping it prompts sign-in first if the device isn't unlocked.
- **Parent menu** (locked to a signed-in parent account)
  - **Game Settings** — manage daily goals, bonus items, per-action point
    values, and store rewards
  - **Calendar** — view and edit past days
  - **Advanced Settings** — time zone, family code, Log (history of every
    action, including admin changes), and reset today's progress or
    everything
- **Parent accounts + family code** (required) — creating an account
  auto-creates and owns a household's family code; a device can also join
  an existing family by just entering that code, but only a signed-in
  member account can reach the parent menu — sync happens in real time via
  Supabase
- **Onboarding + guided tour** — a three-way first-run fork (New Family /
  Existing Parent / Existing Kid), with real email confirmation for new
  accounts; new families are then prompted for their first kid's name and
  walked through a one-time spotlight tour of the home screen
- **Release notes** — a drawer summarizing what's new each version, reachable
  from the account menu

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm test` — run the Vitest unit suite

`npm test` runs the Vitest unit suite, which covers pure state logic — points/
streaks (`src/state/points.ts`, `src/state/defaultState.ts`), auth
(`src/state/auth.ts`), cloud-sync merge (`src/state/merge.ts`), and other
`src/state/*.ts` modules (storage, sync, pending points, action/audit log,
release notes, stats snapshot) — via colocated `*.test.ts` files.
There's no component/UI test setup. `verify_gravy.mjs` at the repo root is an
ad-hoc Playwright smoke-test script, but it's currently broken — it still
asserts against the removed PIN-unlock flow and fails immediately (repair or
deprecation is tracked in `BACKLOG.md` Epic 13) — so UI testing is manual
via the browser.

## Project structure

```
src/
  data/               static data: ranks, foods, games, icons, tour steps, release notes
  state/              Gravy state, localStorage persistence, Supabase sync, React context
  components/         kid-facing screens and widgets (Home, Store, Arcade, Rank ladder, etc.)
  components/games/   individual mini-game components
  components/parent/  account-gated parent panels (approvals, goals, calendar, store, settings)
  components/stats/   chart sections shown in the Rank screen's Stats view
  components/charts/  shared chart primitives (bar chart, sparkline, heatmap grid, stat tile)
  components/tour/    first-run spotlight tour and first-kid-name prompt
```

## Learn more

- `docs/` — subsystem deep-dives: state model, persistence & cloud sync,
  UI surfaces, games/ranks/theming/timezone systems, and the Capacitor
  native wrap
- `DATA_HANDLING.md` — what the app collects and stores, where it lives,
  and how to delete it (COPPA notes)
- `BACKLOG.md` / `BACKLOG_DONE.md` — the living backlog of open work and
  the decision record of what shipped and why
- `AUDIT_REPORT.md` — an independent engineering & security audit
  (July 2026), the basis for backlog Epic 13
- `EXPERT_PANEL_REPORT.md` — a simulated 25-persona expert review of the
  product (nutrition, child psychology, accessibility, security, game
  design), the basis for backlog Epic 15

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
GitHub Pages on every push to `main`.

## Native wrap (experimental)

A Capacitor-based native shell (`npm run build:native`, `npm run cap:sync`,
`npm run cap:open:ios`/`cap:open:android`) wraps the same build for iOS/
Android app store distribution, alongside the PWA. See `docs/capacitor.md`
for status and details.
