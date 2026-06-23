# Gravy 🍕

A gamified chores, nutrition, and rewards PWA for kids — built with React 19,
TypeScript, and Vite. It's a client-side-only SPA: no server, no API. Data
persists to `localStorage`, with optional real-time cloud sync across
devices via Supabase.

Kids log food groups eaten and complete daily goals to earn points, climb a
24-tier rank ladder, build streaks, play mini-games, and unlock badges.
Points can be redeemed for rewards from a parent-managed store, with a
PIN-protected "Grown-ups" dashboard for approvals and configuration.

## Features

- **Home** — rank progress, streak/badge stats, food tray tracker, daily
  goals (including multi-step goals), and repeatable bonus-point items
- **Games hub** — Hangman, Math Facts, Word Scramble, and Memory Match;
  winning earns points up to a daily cap so kids can't farm easy rounds
- **Rank ladder** — a 24-tier progression (Noob → Sonic Snail) with a
  kid-facing screen showing locked/current/achieved tiers and progress
- **Store** — spend points on parent-defined rewards (pending approval)
- **Badges** — 65 unlockable badges across food, chores, points, streaks,
  store, combo, and games categories
- **Multi-profile households** — multiple kid profiles per device, each
  with independent progress/streaks but shared goals, rewards, badge
  config, and points settings; switch between them from a PIN-gated
  quick-switch list
- **Grown-ups dashboard** (PIN-protected, default `1234`)
  - Approve or decline reward requests
  - Manage daily goals, bonus items, and per-action point values
  - View and edit past days on a calendar
  - Manage store rewards
  - Customize badge names/emoji/icons/visibility
  - Manage PIN, recovery question, and household sync code
  - Reset today's progress or everything
- **Cloud sync** (optional) — create or join a household with a short code
  to sync the whole household's data across devices in real time via
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

There's no automated test suite configured. `verify_gravy.mjs` at the repo
root is an ad-hoc Playwright smoke-test script you can run manually against
a `npm run dev` server (`node verify_gravy.mjs`); otherwise testing is
manual via the browser.

## Project structure

```
src/
  data/             static data: ranks, foods, games, badge definitions, icons
  state/            Gravy state, localStorage persistence, Supabase sync, badge logic, React context
  components/       kid-facing screens and widgets (Home, Store, Badges, Games, Rank ladder, etc.)
  components/games/ individual mini-game components
  components/parent/ PIN-gated parent dashboard panels (approvals, goals, calendar, store, badges, settings)
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
GitHub Pages on every push to `main`.
