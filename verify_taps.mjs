// Ad-hoc touch-behavior check for the home screen, in the same spirit as verify_gravy.mjs:
// not wired into npm, run it by hand against a running `npm run dev`:
//
//   npm run dev
//   node verify_taps.mjs            # screenshots land in /tmp, or $SHOT_DIR
//
// It drives real touch input (CDP touch events, not synthetic clicks) to cover the guarantees
// src/lib/pressable.ts is responsible for — a tap with a little finger drift still counts, a
// scroll during the press does not, toggles don't undo themselves on a fast double-tap, goal
// rows stay tappable once their stepper has started, and keyboard activation still works.
// Exits non-zero if any check fails.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const OUT = process.env.SHOT_DIR ?? '/tmp';
const results = [];
const check = (id, pass, note) => { results.push({ id, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${note ?? ''}`); };

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});
const page = await ctx.newPage();

await page.goto('http://localhost:5173/');
await page.waitForTimeout(600);

// Seed a state that skips onboarding/tour and includes a multi-step daily goal plus a bonus item.
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('gravy_onboarded', 'true');
  localStorage.setItem('gravy_home_tour_done', 'true');
});
await page.reload();
await page.waitForTimeout(900);

// Dismiss any first-run gate that still shows (sync gate / release notes).
for (const label of ['Maybe later', 'Not now', 'Skip', 'Got it', 'Continue as Kid']) {
  const btn = page.getByRole('button', { name: label });
  if (await btn.count() && await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    await page.waitForTimeout(400);
  }
}
// Close the release-notes drawer if it auto-opened.
const closeBtn = page.locator('.calendar-modal-overlay.show .calendar-modal-close');
if (await closeBtn.count() && await closeBtn.first().isVisible().catch(() => false)) {
  await closeBtn.first().click();
  await page.waitForTimeout(400);
}

// The release-notes drawer can auto-open a beat after first paint; make sure nothing is
// covering the home screen before the tap sequence starts.
for (let i = 0; i < 3; i++) {
  const c0 = page.locator('.calendar-modal-overlay.show .calendar-modal-close').first();
  if (await c0.count() && await c0.isVisible().catch(() => false)) { await c0.click(); await page.waitForTimeout(400); }
  else await page.waitForTimeout(400);
}

await page.screenshot({ path: `${OUT}/home.png` });

// Turn goal #1 into a multi-step goal so the stepper path is exercised.
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('gravy_v1'));
  const st = (raw.profiles.find((p) => p.id === raw.activeProfileId) ?? raw.profiles[0]).state;
  st.goals[0].target = 3;
  localStorage.setItem('gravy_v1', JSON.stringify(raw));
});
await page.reload();
await page.waitForTimeout(900);

// Points can be queued for parent approval rather than credited immediately, so assert on the
// visible state instead: how many food tiles are logged.
const points = () => page.locator('.tray-grid .gtile.checked').count();

const tapAt = async (x, y, driftX = 0, driftY = 0) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  if (driftX || driftY) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + driftX, y: y + driftY }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(350);
};

const centerOf = async (locator) => {
  const box = await locator.boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// ── 1. A tap with ~8px of finger drift still registers ──────────────────────
const tile = page.locator('.tray-grid .gtile').first();
await tile.scrollIntoViewIfNeeded();
let before = await points();
let c = await centerOf(tile);
await tapAt(c.x, c.y, 6, 5); // 7.8px of drift — inside PRESS_SLOP_PX (12)
let after = await points();
check('tap-with-drift-fires', after > before, `points ${before} -> ${after}`);

// ── 2. A fast double-tap on a toggle tile does not silently undo itself ─────
before = await points();
c = await centerOf(tile.locator('xpath=following-sibling::button[1]'));
const cdp2 = await page.context().newCDPSession(page);
for (let i = 0; i < 2; i++) {
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
  await cdp2.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(80);
}
await cdp2.detach();
await page.waitForTimeout(400);
after = await points();
check('double-tap-does-not-undo', after > before, `points ${before} -> ${after} (should be logged once, not logged+unlogged)`);

// ── 3. Dragging to scroll does not fire the control under the finger ────────
const tile3 = page.locator('.tray-grid .gtile').nth(2);
await tile3.scrollIntoViewIfNeeded();
before = await points();
c = await centerOf(tile3);
const cdp3 = await page.context().newCDPSession(page);
await cdp3.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
for (let dy = 10; dy <= 120; dy += 20) {
  await cdp3.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y - dy }] });
  await page.waitForTimeout(16);
}
await cdp3.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await cdp3.detach();
await page.waitForTimeout(500);
after = await points();
check('scroll-drag-does-not-fire', after === before, `points ${before} -> ${after}`);

// ── 3b. A scroll that happens *during* a motionless press cancels it ───────────
// (the iOS "tap to stop momentum scrolling" case — zero drift, so the scroll signal from
// src/lib/scrollActivity.ts is the only thing that can catch it). Scrolled down then back so
// the tile is under the same point at pointerup, isolating the scroll signal from hit-testing.
const tile3b = page.locator('.tray-grid .gtile').nth(3);
await tile3b.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
before = await points();
c = await centerOf(tile3b);
const cdp3b = await page.context().newCDPSession(page);
await cdp3b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y }] });
// Two separate tasks so both scrolls actually dispatch events (a single synchronous
// down-then-up pair coalesces to no net movement and fires nothing).
await page.evaluate(() => { window.scrollBy(0, 20); });
await page.waitForTimeout(80);
await page.evaluate(() => { window.scrollBy(0, -20); });
await page.waitForTimeout(80);
await cdp3b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await cdp3b.detach();
await page.waitForTimeout(500);
after = await points();
const stillOnTile = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.gtile'), [c.x, c.y]);
check('scroll-during-press-cancels', after === before && stillOnTile, `tiles logged ${before} -> ${after}, tile still under point=${stillOnTile}`);

// ── 4. A started multi-step row body is still tappable ─────────────────────
const stepRow = page.locator('.goal-row').first();
await stepRow.scrollIntoViewIfNeeded();
const stepBody = stepRow.locator('.goal-row-box');
c = await centerOf(stepBody);
await tapAt(c.x, c.y);                       // first log -> stepper appears
const stepperVisible = await stepRow.locator('.gtile-stepper').count();
const countAfterFirst = await stepRow.locator('.gstep-count').textContent().catch(() => null);
before = await points();
c = await centerOf(stepBody);
await tapAt(c.x, c.y);                       // second tap on the SAME spot must still count
const countAfterSecond = await stepRow.locator('.gstep-count').textContent().catch(() => null);
after = await points();
check(
  'started-stepper-row-body-still-tappable',
  stepperVisible > 0 && countAfterFirst === '1/3' && countAfterSecond === '2/3',
  `stepper=${stepperVisible} count ${countAfterFirst} -> ${countAfterSecond}`,
);
check('row-body-is-clickable-class', await stepBody.evaluate((el) => el.classList.contains('goal-row-box-clickable')), '');

// ── 5. Quick-link pills open their overlay on a single tap ─────────────────
for (const [name, sel] of [['Prizes', '.home-pill-prizes'], ['Stats', '.home-pill-stats'], ['Daily', '.home-pill-daily']]) {
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.scroll-area').scrollTop = 0; });
  await page.waitForTimeout(300);
  c = await centerOf(page.locator(sel));
  await tapAt(c.x, c.y, 4, 3);
  await page.waitForTimeout(600);
  const opened = await page.locator('.calendar-modal-overlay.show, .onb-screen, .fullpage-overlay').count();
  check(`pill-${name}-opens-on-one-tap`, opened > 0, `overlays=${opened}`);
  await page.screenshot({ path: `${OUT}/pill_${name}.png` });
  const close = page.locator('.calendar-modal-overlay.show .calendar-modal-close').first();
  if (await close.count()) { await close.click(); await page.waitForTimeout(500); }
}

// ── 6. Top bar buttons ────────────────────────────────────────────────────
await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.scroll-area').scrollTop = 0; });
await page.waitForTimeout(300);
c = await centerOf(page.locator('.topbar-icon-btn').last());
await tapAt(c.x, c.y);
await page.waitForTimeout(500);
check('topbar-menu-opens-on-one-tap', await page.locator('.calendar-modal-overlay.show, .onb-screen, .fullpage-overlay').count() > 0, '');
await page.screenshot({ path: `${OUT}/account_menu.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// ── 6b. Keyboard activation still works (the onClick fallback path) ───────
await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.scroll-area').scrollTop = 0; });
await page.waitForTimeout(300);
await page.locator('.home-pill-prizes').focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(900);
check('keyboard-enter-opens-pill', await page.locator('.calendar-modal-overlay.show').count() > 0, '');
{
  const cl = page.locator('.calendar-modal-overlay.show .calendar-modal-close').first();
  if (await cl.count()) { await cl.click(); await page.waitForTimeout(500); }
}
// A goal row is a role="button" div, activated through its own onKeyDown.
const kbRow = page.locator('.goal-rows .goal-row').nth(1).locator('.goal-row-box');
await kbRow.scrollIntoViewIfNeeded();
const kbBefore = await page.locator('.goal-row.done').count();
await kbRow.focus();
await page.keyboard.press('Enter');
await page.waitForTimeout(500);
const kbAfter = await page.locator('.goal-row.done').count();
check('keyboard-enter-on-goal-row', kbAfter !== kbBefore, `done rows ${kbBefore} -> ${kbAfter}`);

// ── 7. Collapse toggle ────────────────────────────────────────────────────
const header = page.locator('.card-collapse-toggle').first();
await header.scrollIntoViewIfNeeded();
c = await centerOf(header);
const expandedBefore = await header.getAttribute('aria-expanded');
await tapAt(c.x, c.y);
const expandedAfter = await header.getAttribute('aria-expanded');
check('collapse-toggle-fires-on-one-tap', expandedBefore !== expandedAfter, `${expandedBefore} -> ${expandedAfter}`);
await tapAt(c.x, c.y); // restore

await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('.scroll-area').evaluate((el) => { el.scrollTop = 0; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/home_final.png` });
await page.locator('.scroll-area').evaluate((el) => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/home_bottom.png` });

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
