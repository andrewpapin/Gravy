# Gravy 🍕

A gamified chores, nutrition, and rewards PWA for kids — built with React 19,
TypeScript, and Vite. It's a client-side-only SPA: no server, no API. Data
persists to `localStorage`, with optional real-time cloud sync across
devices via Supabase.

Kids log food groups eaten and complete daily goals to earn points, climb a
24-tier rank ladder, build streaks, play mini-games, and unlock badges.
Points can be redeemed for rewards from a parent-managed store, with a
parent menu (approvals and configuration) locked behind a required parent
account — there's no PIN.

## Features

- **Home** — rank progress, streak/badge stats, food tray tracker, daily
  goals (including multi-step goals), and repeatable bonus-point items
- **Arcade** — Hangman, Math Facts, Word Scramble, and Memory Match;
  winning earns points up to a daily cap so kids can't farm easy rounds
- **Rank ladder** — a 24-tier progression (Noob → Sonic Snail) with a
  kid-facing screen showing locked/current/achieved tiers and progress
- **Store** — spend points on parent-defined rewards (pending approval)
- **Pending points** — on a device that's never signed in with a parent
  account (joined via family code only), a kid's chores/food/bonus
  items/games still complete live, but the points sit pending until a
  parent approves or declines them from Approvals; a signed-in parent's
  own device posts points immediately, same as before
- **Badges** — 71 unlockable badges across food, chores, points, streaks,
  store, combo, and games categories
- **Multi-profile households** — multiple kid profiles per device, each
  with independent progress/streaks but shared goals, rewards, badge
  config, and points settings; switch between them from a parent
  account-gated quick-switch list
- **Approvals** — a bell icon next to the menu (hamburger) icon, badged
  with the number waiting; approve or decline pending points and reward
  requests. Tapping it prompts sign-in first if the device isn't unlocked.
- **Parent menu** (locked to a signed-in parent account)
  - **Game Settings** — manage daily goals, bonus items, per-action point
    values, store rewards, and badge names/emoji/icons/visibility
  - **Calendar** — view and edit past days
  - **Log** — history of every action, including admin changes
  - **Advanced Settings** — time zone, family code, and reset today's
    progress or everything
- **Parent accounts + family code** (required) — creating an account
  auto-creates and owns a household's family code; a device can also join
  an existing family by just entering that code, but only a signed-in
  member account can reach the parent menu — sync happens in real time via
  Supabase

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

`npm test` runs the Vitest unit suite, which covers the pure
point/streak/badge logic (`src/state/points.ts`, `src/state/defaultState.ts`,
`src/state/badges.ts`, `src/state/auth.ts`) via colocated `*.test.ts` files.
There's no component/UI test setup. `verify_gravy.mjs` at the repo root is an
ad-hoc Playwright smoke-test script you can run manually against a
`npm run dev` server (`node verify_gravy.mjs`); otherwise UI testing is
manual via the browser.

## Project structure

```
src/
  data/             static data: ranks, foods, games, badge definitions, icons
  state/            Gravy state, localStorage persistence, Supabase sync, badge logic, React context
  components/       kid-facing screens and widgets (Home, Store, Badges, Arcade, Rank ladder, etc.)
  components/games/ individual mini-game components
  components/parent/ account-gated parent panels (approvals, goals, calendar, store, badges, settings)
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
GitHub Pages on every push to `main`.
