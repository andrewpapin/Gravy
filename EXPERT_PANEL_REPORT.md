# Gravy — Expert Panel Review (July 2026)

## What this document is

A structured critical review of Gravy from the perspective of a **25-member expert panel**, each
persona "using" the app across a simulated week of family life. **This is a simulated heuristic
review, not real user research**: no human participants were recruited. Each persona is a lens —
a named, credentialed viewpoint applied rigorously to the app's *actual, verified* behavior. Every
finding below is grounded in the shipped code (file paths, real point values, real copy) and in a
live headless-browser walkthrough of the running app (v1.1.205, 390×844 viewport); nothing is
speculated about behavior that wasn't checked. Treat conclusions the way you'd treat a strong
expert audit: directionally reliable on facts, but no substitute for watching real kids and
parents use the product.

Findings feed `BACKLOG.md` **Epic 15**. Where the panel independently re-discovered an
already-tracked gap, that's recorded in [§10 Corroborated known items](#10-corroborated-known-items)
rather than duplicated as a new backlog entry.

Severity scale: **Critical** (undermines the product's core promise or safety),
**High** (materially hurts a major user group), **Medium** (real but bounded harm/friction),
**Low** (polish).

---

## The panel

| # | Persona | Expertise / usage lens |
|---|---------|------------------------|
| 1 | Dr. Maya Okafor | Child clinical psychologist; behavioral reward systems |
| 2 | Dr. Sam Lindqvist | Developmental psychologist; self-determination theory, ages 5–12 |
| 3 | Priya Raman, RD | Pediatric registered dietitian |
| 4 | Elena Vasquez, RD | Feeding-therapy specialist (responsive-feeding / division-of-responsibility model) |
| 5 | Jordan Wells, LMFT | Family therapist & parenting coach |
| 6 | Dana Kowalczyk | 2nd-grade teacher; classroom reward-chart veteran |
| 7 | Marcus Bell | Special-education teacher (ADHD/autism supports) |
| 8 | Aisha Thompson | Accessibility auditor; daily screen-reader user (WCAG 2.2) |
| 9 | Rob Ferreira | Accessibility specialist; motor impairment & switch access |
| 10 | Lena Fischer | Application-security engineer |
| 11 | Katherine Doyle, JD | Privacy attorney; COPPA / children's-data compliance |
| 12 | Noor Haddad | UX researcher, children's products |
| 13 | Theo Marchetti | Senior mobile product designer |
| 14 | Ivy Chen | Content designer / UX writer |
| 15 | Diego Santana | Game-economy designer (F2P economies) |
| 16 | Hana Sato | Casual-games designer, kids' titles |
| 17 | Dr. Felix Braun | Behavioral economist |
| 18 | Renee Palmer | Parent of 3; two-household custody arrangement |
| 19 | Tomás Reyes | Parent; rotating-shift nurse (irregular evenings) |
| 20 | Barbara Ellison | Grandparent caregiver; low tech confidence |
| 21 | Dr. Anaya Krishnan | Pediatrician |
| 22 | Sofia Marino, OTR/L | Pediatric occupational therapist |
| 23 | Wei Zhang | Frontend/PWA engineer |
| 24 | Grace Nakamura | QA engineer |
| 25 | Amara Diallo | Localization & internationalization specialist |

---

## 1. What the panel praised

Credit where due — several panelists expected worse from a hobby-scale PWA:

- **Approval economics are honest.** Pending reward requests reserve points so they can't be
  double-spent (`src/components/StoreScreen.tsx:16-21`), and a negative bonus item never drives a
  kid's balance below zero, with undo reversing only what was actually applied
  (`src/state/points.ts`). Braun (#17): "the ledger arithmetic is more principled than most
  shipped loyalty programs."
- **Touch targets and semantics.** Consistent 44×44px targets, real `<button>` elements
  throughout, focus traps on open modals, and descriptive labels like "Fruit, logged. Tap to
  undo." Marino (#22) and Ferreira (#9) both called the tap ergonomics genuinely good for small
  hands and for switch users — *when a surface is open* (see F8).
- **The privacy floor is high.** No analytics, no trackers, no birthdate, no photos; child name is
  the only in-app PII (`DATA_HANDLING.md`). Doyle (#11): "the data-minimization posture is better
  than 90% of kids' apps I review — the gaps are in the sync layer, not the philosophy."
- **Kind failure modes in copy.** Declining a reward says "Your child can ask for it again
  later"; capped game wins say "keep playing for fun!" — Chen (#14) flagged both as model
  child-facing microcopy.
- **The rank curve is tuned with intent** — thresholds documented against a realistic
  points-per-day ceiling so max rank lands in about a school year (`src/data/ranks.ts:11-16`).

---

## 2. Nutrition model — Raman (#3), Vasquez (#4), Krishnan (#21)

**F1. The app pays the same points for Sweets as for Veggies — and its top streaks *require*
eating sweets daily.** *Severity: Critical (for the nutrition pillar).* The six food groups are
hardcoded as Fruit / Veggie / Protein / Dairy / Grain / **Sweets** (`src/data/foods.ts:10-17`),
each defaulting to +10 (`DEFAULT_FOOD_PTS`, `src/state/defaultState.ts:17`). "Full Tray" (+25
bonus) and therefore `foodStreak` and `megaStreak` are computed as `FOODS.every(...)` — all six
groups, Sweets included (`src/state/defaultState.ts:590-596`). A child who skips dessert **cannot
ever hold a Food Streak or Mega Streak**; a child who eats candy daily is structurally rewarded
for it. Raman: "This inverts the entire premise. No pediatric guidance treats sweets as a daily
required group — MyPlate doesn't even list it." The kid-facing stats screen then celebrates it:
after the walkthrough logged one Fruit and one Sweets, "Favorite Foods" displayed "Fruit 1x,
Sweets 1x" as equals.

**F2. Parents cannot fix F1 themselves — food groups are not editable.** *Severity: High.*
`PointsPanel` only edits per-group point *values*; the `FOODS` array itself has no CRUD anywhere
(unlike goals and rewards, which have full parent CRUD in `GoalsPanel`/`StorePanel`). A parent
can set Sweets to 0 points, but it still counts toward (in fact, still gates) Full Tray and both
food streaks. There is no way to remove or rename a group.

**F3. Mixed messages: Sweets earns +10 while "Junk food as a 'meal'" deducts −20.** *Severity:
Medium.* The seeded bonus list (`src/state/defaultState.ts:68`) punishes junk food while the tray
rewards it. Vasquez added a responsive-feeding objection to the deduction itself: penalizing a
child for what they ate — often a food decision an adult made — contradicts
division-of-responsibility feeding guidance and risks food-shame dynamics. Krishnan (#21) noted
the binary one-tap-per-group model (`logFood` caps each count at 1) also has no portion concept:
"a single blueberry closes out Fruit" — acceptable for a habit nudge, but then the habit being
nudged must be the right one (see F1).

---

## 3. Behavioral design & motivation — Okafor (#1), Lindqvist (#2), Wells (#5), Bell (#7)

**F4. Streaks hard-reset to zero with no grace mechanism.** *Severity: High.* One sick day, one
travel day, one day at the other parent's house and all four streaks (`streak`, `foodStreak`,
`goalStreak`, `megaStreak`) reset to 0 (`applyDayRollover`,
`src/state/defaultState.ts:585-596` — streaks extend only if *yesterday* was closed out with real
activity). Okafor: "For the 7–10 age band this is the single most demotivating pattern you can
ship. The kid who loses a 40-day Mega Streak to a stomach bug doesn't re-engage — they quit."
Duolingo-style streak freezes / one forgiveness day per week exist precisely for this. Note the
codebase already implements *point* forgiveness elegantly (`points.ts`); streaks got no such
design pass.

**F5. Punitive deduction items live in the kid's daily UI as tappable rows.** *Severity: Medium
(decision).* "Swear jar −10", "Sore loser or rage quitting −15", "Junk food as a 'meal' −20" are
seeded bonus items rendered on the home screen with kid-tappable "Log Swear jar" buttons (live
walkthrough, tab stops 37–39). Wells: response-cost systems can work, but shipping them as
*defaults*, visible to the child all day, frames the app as surveillance rather than
encouragement; Bell added that for ADHD kids, a permanently visible "Sore loser" row is a
standing provocation. The panel's consensus: deductions should be a parent-opt-in pattern, not
seeded content, and arguably parent-side-only.

**F6. The Arcade's daily dice game imports gambling mechanics wholesale.** *Severity: Medium
(decision).* Roll to the Goal is 5d6 with hold/reroll decisions, a daily target, near-miss payout
tiers (exact 100% / 1-away 60% / 2-away 30%, `src/data/rollToGoal.ts:69-74`), a "Bust!" outcome,
and a separate inflated 0–500 display score with bonuses for unused rerolls. Braun (#17) and Sato
(#16) jointly: hold-and-reroll dice with near-miss tiering is the canonical variable-ratio
reinforcement package; fine in adult casual games, worth a deliberate decision in a product for
7-year-olds. The dual-currency presentation (500 "score" vs ~15 real points) also confused the
teacher personas — the big number is bragging rights only, and nothing on screen says so.

**F7. Rank names undermine the tone the rest of the copy works hard to set.** *Severity: Low.*
The ladder starts at "Noob" and includes "Granny" as the second-lowest rank
(`src/data/ranks.ts:18-19`) — Chen (#14): labeling a beginner "Noob" is mild negging, and
"Granny" as an insult-tier rank is casually ageist (Ellison, #20, did not love it). "Aura Farmer"
(#25 flagged it as untranslatable trend slang) will date badly. The top rank being a snail is
charming; the bottom two are the problem.

---

## 4. Accessibility — Thompson (#8), Ferreira (#9)

**F8. Every closed screen in the app remains in the accessibility tree and keyboard tab order.**
*Severity: Critical (for non-visual/keyboard use).* There is no router; every overlay (Store,
Arcade, Stats, Grown-Up Menu, parent panels, Sign-In…) is always mounted and hidden only by
`opacity: 0; pointer-events: none` (`src/index.css:889-894`) — never `display:none`,
`visibility:hidden`, `aria-hidden`, or `inert` (zero matches for `inert`/`aria-hidden` on
containers in `src/`). Each carries a permanent `role="dialog" aria-modal="true"`
(`src/components/Modal.tsx:28-29`). Empirically, on the home screen the cold-start DOM dump
contained *the entire app's copy* (store, parent panels, sign-in form), and pressing Tab 40 times
walked focus **into the closed Reward Store dialog** ("Close store" received focus while
invisible). A screen-reader user is presented a dozen simultaneous "modal dialogs"; a keyboard
user tabs into invisible UI. Focus traps only engage for *open* modals (`useFocusTrap(open, …)`),
so nothing contains focus once it wanders into a closed one.

**F9. Every dynamic announcement is silent for screen-reader users.** *Severity: High.* There are
zero `aria-live`, `role="status"`, or `role="alert"` usages in `src/`. Point awards, celebrations
("Rank Up!", "Full Tray!"), the game-win banner, sync errors, and the storage-failure banner all
appear visually with no assistive-tech announcement. Thompson: "A blind parent or kid gets no
feedback that tapping 'Fruit' did anything."

**F10. Duplicate tab stops on every daily-goal row.** *Severity: Medium.* The live tab-order
probe hit each goal twice in sequence ("Read for 30 minutes. Tap to complete." at stops 16 *and*
17, and so on for all 8): the row is a `role="button"` div and contains a second focusable
element. Sixteen stops to traverse eight goals doubles the keyboard cost of the core loop.

**F11. Reduced-motion support is a sledgehammer.** *Severity: Low.* The only
`prefers-reduced-motion` handling is `* { animation: none !important; transition: none !important; }`
(`src/index.css:2667-2669`). It works, but it also kills non-vestibular affordances (opacity
fades, the celebration's appearance). Ferreira: acceptable v1, but it should become targeted
rules; also noted theme contrast has never been measured against WCAG ratios (corroborates the
audit).

---

## 5. UX & information architecture — Haddad (#12), Marchetti (#13), Chen (#14), Ellison (#20)

**F12. A kid who does chores on an approval-gated device sees "0 Coins" with no explanation.**
*Severity: High.* On a device without a signed-in parent, every earn is queued at 0 points
pending approval. In the live walkthrough, after logging two foods and completing a goal, the
StatsCard still read "0/250 pts · 0 Coins"; the only signal is a small count badge on the bell
(`src/components/TopBar.tsx:15,37`). Haddad: "The core loop for the kid persona is do-thing →
see-number-go-up. On exactly the devices kids use most, the number doesn't go up and nothing says
why." A "+15 waiting for a grown-up ✓" inline state would preserve the loop.

**F13. The "Daily" pill opens a screen titled "Arcade".** *Severity: Medium.* The home
quick-links row is Daily / Stats / Prizes; tapping "Daily" opens the games hub titled "Arcade"
with the banner "0/3 wins earn points today" (live walkthrough). Docs call this deliberate
(`docs/systems.md`), but three panelists independently mis-predicted it, and Ellison (#20) never
found the games at all in her simulated week. Naming the pill what the screen is called (or vice
versa) is free.

**F14. Currency naming is split: "Coins" on the home card, "pts" everywhere else.** *Severity:
Low.* `StatsCard` renders "{n} Coins" (`src/components/StatsCard.tsx:64`); the store, goals,
rank bar, and arcade all use "pts"/"points". One currency, one name.

**F15. Kids have no way to look at their own past days.** *Severity: Medium.* The calendar
(month grid + day detail) is parent-gated behind sign-in (`AccountMenu` disables it when locked,
`src/components/AccountMenu.tsx:88`); the kid-facing stats screen offers only aggregates
(heatmap, trends). Kids ask "what did I do Tuesday?"; teachers (#6) use yesterday-review as a
core reflection ritual. Note: `CLAUDE.md:85` claims a "read-only kid history view via
`viewedDate`/`CalendarGrid`" exists — **it does not**; `viewedDate` appears nowhere in `src/`
(docs drift, see F22).

**F16. A shared family tablet is either permanently unlocked or painful.** *Severity: Medium.*
`grownUpUnlocked` derives solely from the signed-in account; the only way to re-lock is a full
sign-out, and the only way back in is retyping the password (`AccountMenu` header toggles sign-in
/ log-out). Palmer (#18) and Reyes (#19), whose households run on one kitchen tablet: in
practice the parent stays signed in, so the kid has standing access to Approvals (self-approving
their own points), Game Settings, and Profiles. A quick re-lock (timeout, or per-open
confirmation) is the missing middle; Epic 10's planned biometric re-entry solves the native half.

**F17. First-run copy still greets every child as "Zack".** *Severity: Low.* Default
`childName: 'Zack'` (`src/state/defaultState.ts:82`) shows as "Good evening, Zack!" before
`FirstKidPrompt` completes (and forever if it's skipped). A neutral fallback ("Hey there!") costs
nothing. (The greeting itself *is* time-of-day-aware and timezone-correct —
`src/components/Greeting.tsx:4-11` — contrary to one panelist's guess; verified.)

**F18. The "What's New" ticker has shipped exactly one note ever.** *Severity: Low.*
`RELEASE_NOTES` contains a single v1 entry (`src/data/releaseNotes.ts:10-12`) while the app is at
v1.1.205. Machinery without a habit; either feed it per release (its own file says to) or drop
the drawer.

---

## 6. Game design & economy — Santana (#15), Sato (#16), Braun (#17), Kowalczyk (#6)

**F19. One fixed difficulty for every age.** *Severity: High (for the games pillar).* Math Facts
generates one band forever: +/− up to 50/100, × up to 10×10 (`src/data/mathFacts.ts:15-30`);
Hangman/Scramble draw from one curated 3rd-grade word list (`src/data/hangmanWords.ts:6`).
Kowalczyk: her 2nd-graders can't do 87−49 under time pressure ("3 strikes"), while a 6th-grader
finds all five games trivial — and the app supports multi-kid profiles with per-kid state, so a
per-profile difficulty setting has an obvious home. Sato: without it, the Arcade has a
2-3-year age window in a product marketed for "kids".

**F20. Default reward pricing makes the top reward a daily purchase.** *Severity: Medium.* A
strong day plausibly yields 200+ points (8 daily goals = 105, full tray = 85, capped game wins =
45+), and "$5 allowance" costs 200 (`src/state/defaultState.ts:76`). Santana: as seeded, a
diligent kid mints ~$150/month; parents will discover this the expensive way and lose trust in
the defaults. Either reprice the money reward relative to the daily ceiling or ship a
seeded-economy note in the parent dashboard. (All values are parent-editable; the critique is
about defaults, which most families keep.)

---

## 7. Security & privacy — Fischer (#10), Doyle (#11)

The panel's independent findings here all landed on already-tracked items — a good sign for the
backlog's coverage, a bad sign for how long they've been open. Fischer re-derived the open-SELECT
RLS policy on `households` (any holder of the public key can enumerate and read every household's
full state, child names included), the parent email embedded in the synced audit log (which
`DATA_HANDLING.md` explicitly claims doesn't happen), the absence of server-side authorization
behind the client-only parent gate, and bypassable IP-based rate limiting. Doyle re-derived the
missing privacy policy/ToS and the unreviewed signup flow. See §10 — all map to Epics 9, 6, and
13. Doyle's one new emphasis: F1/F5-type *content* decisions (food shaming, behavior deductions)
are also reputational-risk items for a kids' product, not just design debates.

---

## 8. Engineering & QA — Zhang (#23), Nakamura (#24)

Mostly corroboration (see §10): the forced PWA update reload (Nakamura hit it conceptually: a
mid-round Roll to the Goal reload eats the round with no confirmation — `UpdatePrompt` reloads on
detection despite `registerType: 'prompt'`), the single global ErrorBoundary, TS strict off, zero
component tests, and the stale `verify_gravy.mjs` still asserting against the removed PIN system.
New items:

**F21. "1 active days in the last 12 weeks."** *Severity: Low.* No pluralization on the heatmap
caption (`src/components/stats/ActivityHeatmapSection.tsx:23`); observed live. The only such bug
found, but with zero i18n infrastructure every count-noun in the app is hand-pluralized (Diallo,
#25: `TopBar.tsx:38` does it correctly — consistency is luck, not system).

**F22. Two authoritative docs contain verifiably false claims.** *Severity: Medium (process).*
`CLAUDE.md:85` describes a kid-facing read-only history view (`viewedDate`/`CalendarGrid`) that
does not exist in `src/`; `AUDIT_REPORT.md` §3.6 references removed themes. Both files are
positioned as the ground truth future work is built on (and per repo policy, both are *read every
session*). Whatever process moved `CODE_REVIEW.md` to "known stale" status needs to run again.

**F23. No internationalization path at all.** *Severity: Low (decision).* Every string is
hardcoded English JSX. Diallo: fine as an explicit choice for a US-family product, but it should
*be* a choice in the backlog, because retrofitting i18n after more surface accretes only gets
more expensive. Related detail: `todayStr` uses the `en-CA` locale trick and the greeting
`en-US` — harmless today, load-bearing if locales ever vary.

---

## 9. Family logistics — Palmer (#18), Reyes (#19), Ellison (#20)

Beyond F16: Palmer's two-household custody week surfaced that a household is a single unit with
one timezone and one parent-approval pool — workable when co-parents share one household code,
but there is no model for "kid splits time between two data-separate homes" (the panel judged
this a niche P2 discussion, not an actionable gap; noted here for the record). Reyes confirmed
the household-wide timezone (`Settings.timezone` drives `todayStr`) behaves *correctly* for his
schedule — day boundaries don't wobble with device clocks — and the panel commends that design.
Ellison's week was the onboarding stress test: mandatory email account + confirmation loop before
anything renders was her hardest step (she succeeded; her confusion feeding F13/F16 is recorded
above). No new backlog items from this section.

---

## 10. Corroborated known items

Panel findings that re-discovered tracked backlog items — kept out of Epic 15 by design. The
independent rediscovery is itself signal for prioritization:

| Panel finding | Tracked at |
|---|---|
| Open-SELECT RLS on `households` (Fischer) | Epic 9 (P1) |
| Parent email in synced audit log, contradicting `DATA_HANDLING.md` (Fischer, Doyle) | Epic 9 (P0) |
| No server-side authz behind client parent gate (Fischer) | Epic 13 · Security (P2) |
| Privacy policy / ToS / COPPA review missing (Doyle) | Epics 6, 9, 10 |
| Forced PWA update reload mid-session (Nakamura) | Epic 13 · Bugs (P2 — panel argues for P1, see Epic 15 note) |
| No `eslint-plugin-jsx-a11y`; placeholder-only inputs (Thompson) | Epic 13 · Accessibility (P1/P2) |
| Single global ErrorBoundary; zero component tests; TS strict off; stale `verify_gravy.mjs` & `CODE_REVIEW.md` (Zhang, Nakamura) | Epic 13 |
| Unmemoized `GravyContext` value (Zhang) | Epic 13 · Architecture (P2) |
| Push/reminder notifications absent (multiple parents) | Epics 5, 10 (P1) |
| Sibling comparison view (Palmer) | Epic 5 (P2) |
| Offline write queue (Reyes — dead zones during commutes) | Epic 9 (P1) |
| Denser home layout for older kids (Marchetti) | Epic 11 (P2) |

---

## 11. Priority synthesis

If the panel had one week of engineering to spend: **F1/F2 (Sweets in the streak-gating tray)**
is the reputational risk — it contradicts the app's own premise and a parent-facing reviewer
*will* find it; **F8/F9 (closed-dialog a11y model + silent announcements)** is the largest
structural defect — it makes the app effectively unusable non-visually despite excellent
per-control semantics; **F4 (streak grace)** and **F12 (invisible pending points)** are the two
highest-leverage retention fixes; **F19 (difficulty)** is what makes the Arcade serve the actual
age range. Everything else is polish or process. See `BACKLOG.md` Epic 15 for the actionable
breakdown with priorities and sizes.
