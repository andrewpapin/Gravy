# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check (tsc -b) then bundle to ./dist
npm run lint      # Run ESLint
npm run preview   # Serve ./dist locally
```

There is **no test framework configured**. All testing is manual via the browser.

## Architecture Overview

GrubClub is a gamified chores + nutrition + rewards PWA for kids built with React 19, TypeScript, and Vite. It is a client-side-only SPA — no server, no API. Data persists to `localStorage` with optional cloud sync via Supabase.

### Two User Surfaces

- **Kid view** (`src/components/`) — the main UI: home screen with daily goals/food tray, rewards store, badges, calendar
- **Parent dashboard** (`src/components/parent/`) — PIN-protected (default PIN: `1234`); manages goals, rewards, badge customization, approves reward requests, configures settings

### Global State

All state flows through a single React Context defined in `src/state/GrubClubContext.tsx`. Components consume it via `useGrubClub()`. The context owns:

- The `GrubClubState` object (see `src/state/types.ts` for full shape)
- Auto-save to `localStorage` on every state change
- Supabase sync (`src/state/sync.ts`) — households share a 6-char code; entire state is stored as a JSON blob per code
- Toast notifications with optional undo actions
- Celebration/confetti triggers
- Badge-earned detection on each action

### Key State Concepts

- **Goals** — chores assigned to the child (formerly called "chores"; a `migrateLegacyState()` in `defaultState.ts` renames old keys)
- **Day rollover** — handled by `applyDayRollover()` in `src/state/defaultState.ts`; archives today's food counts and completed goals into `dayLogs[dateStr]`, updates streak (increments if last active was yesterday, resets if a day was skipped), clears daily goals
- **Counters** — `src/state/types.ts` `Counters` object aggregates lifetime stats (total foods by type, total goals, full-tray days, combo days, etc.) used for badge progress
- **Pending rewards** — kids request rewards; they sit in `pendingRewards` until a parent approves/declines

### Badge System

55 unlockable badges defined in `src/data/badges.ts`, evaluated in `src/state/badges.ts`. Badges are triggered by:
- First-time events (`first_food`, `first_chore`, `first_reward`)
- Cumulative counter thresholds (`fruit:N`, `veggie:N`, `pts:N`, `streak:N`, `chore_count:N`, etc.)

`findNewlyEarnedBadges()` is called after each state-mutating action. Parents can customize badge name/emoji/visibility via `badgeConfig` in state.

### Persistence & Sync

- Primary: `localStorage` key `grubclub_state`
- Optional cloud: Supabase `households` table — `{ code TEXT PK, state JSONB, updated_at, created_at }`
- Household codes use an unambiguous character set (no `0/O`, `1/I/l`)
- Real-time sync via Supabase `postgres_changes` subscription; conflict resolution is last-write-wins

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to `main`. The Vite `base` is `/GrubClub/`.
