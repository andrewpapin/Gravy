# Grub Club 🍕

A gamified chores, nutrition, and rewards app for kids — built with React, TypeScript, and Vite.

Kids log food groups eaten and chores completed to earn points, climb ranks, build
streaks, and unlock badges. Points can be redeemed for rewards from a parent-managed
store, with a PIN-protected "Grown-ups" dashboard for approvals and configuration.

## Features

- **Home** — rank progress, daily streak, food tray tracker, and chore checklist
- **Store** — spend points on parent-defined rewards (pending approval)
- **Badges** — 55 unlockable badges across food, chores, points, streaks, store, and combo categories
- **Grown-ups dashboard** (PIN-protected, default `1234`)
  - Approve or decline reward requests
  - Manage chores and store rewards
  - Configure badge names/emoji/visibility
  - Adjust points settings and PIN
  - Reset today's progress or everything

All data is stored locally in the browser via `localStorage`.

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

## Project structure

```
src/
  data/        static data: ranks, food groups, badge definitions
  state/       GrubClub state, localStorage persistence, badge logic, React context
  components/  UI screens and widgets (Home, Store, Badges, Parent dashboard, etc.)
```
