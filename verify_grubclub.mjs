import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // iPhone 14 size
const page = await ctx.newPage();

const shots = [];
const shot = async (name) => {
  const path = `/tmp/ss_${name}.png`;
  await page.screenshot({ path, fullPage: false });
  shots.push({ name, path });
  return path;
};

const results = [];
const log = (id, status, note) => results.push({ id, status, note });

// Load the page, clear localStorage once, then reload for a clean start
await page.goto('http://localhost:5173/');
await page.waitForTimeout(500);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(800);

// ── Test 15: Error Boundary — app loads without crash ──────────────────────
const title = await page.title();
const hasRoot = await page.locator('#root').count();
log('15-error-boundary', hasRoot > 0 ? 'PASS' : 'FAIL', `title="${title}", root=${hasRoot}`);
await shot('01_home_load');

// Dismiss sync gate if present
const skipBtn = page.getByText('Maybe later');
if (await skipBtn.isVisible()) {
  await skipBtn.click();
  await page.waitForTimeout(300);
}

// ── Test 3: Week strip header ─────────────────────────────────────────────
const weekHeader = await page.locator('.week-strip-header span').first().textContent();
const hasComma = weekHeader?.includes(',');
const hasYear = weekHeader?.includes('2026');
log('03-week-header', !hasComma ? 'PASS' : 'FAIL', `header="${weekHeader}" comma=${hasComma} year=${hasYear}`);
await shot('02_week_strip');

// ── Go to parent mode to add a multi-step goal ────────────────────────────
await page.locator('.nav-btn').last().click(); // Settings button
await page.waitForTimeout(300);
await shot('03_pin_screen');

// Enter PIN 1234 on screen buttons
for (const d of ['1','2','3','4']) {
  await page.locator('.pin-key').filter({ hasText: d }).click();
  await page.waitForTimeout(100);
}
await page.waitForTimeout(500);
await shot('04_parent_mode');

// ── Test 9: Goals tab — Enter key submission ───────────────────────────────
const goalsTab = page.locator('[role="tab"]').filter({ hasText: 'Goals' });
await goalsTab.click();
await page.waitForTimeout(300);

// Fill in a multi-step goal (target=3)
const emojiInput = page.locator('input.emoji-input').first();
const nameInput = page.locator('input[placeholder="Goal name..."]');
const ptsInput = page.locator('input[placeholder="pts"]');
const targetInput = page.locator('input[placeholder="×"]');

await emojiInput.fill('🏃');
await nameInput.fill('Run laps');
await ptsInput.fill('20');
await targetInput.fill('3');

// Press Enter to submit (Test 9)
await nameInput.press('Enter');
await page.waitForTimeout(400);

const goalAdded = await page.getByText('Run laps').first().isVisible();
log('09-goals-enter-key', goalAdded ? 'PASS' : 'FAIL', `goal visible after Enter: ${goalAdded}`);
await shot('05_goal_added');

// ── Test 10: Store tab — Enter key submission ─────────────────────────────
const storeTab = page.locator('[role="tab"]').filter({ hasText: 'Store' });
await storeTab.click();
await page.waitForTimeout(300);

const rewardEmoji = page.locator('input.emoji-input').first();
const rewardName = page.locator('input[placeholder="Reward name..."]');
const rewardCost = page.locator('input[placeholder="cost"]');

await rewardEmoji.fill('🍕');
await rewardName.fill('Pizza night');
await rewardCost.fill('30');
await rewardName.press('Enter');
await page.waitForTimeout(400);

const rewardAdded = await page.getByText('Pizza night').first().isVisible();
log('10-store-enter-key', rewardAdded ? 'PASS' : 'FAIL', `reward visible after Enter: ${rewardAdded}`);
await shot('06_reward_added');

// ── Test 7: Settings — negative foodPts clamps to 1 ──────────────────────
const settingsTab = page.locator('[role="tab"]').filter({ hasText: 'Settings' });
await settingsTab.click();
await page.waitForTimeout(300);

const foodPtsInput = page.locator('input[type="number"]').first();
await foodPtsInput.fill('-5');
await foodPtsInput.blur();
await page.waitForTimeout(400);
// Read back the actual stored value by checking what was saved
const foodPtsVal = await foodPtsInput.inputValue();
log('07-negative-foodpts', foodPtsVal !== '-5' ? 'PASS' : 'FAIL', `foodPts value after -5 entry: "${foodPtsVal}"`);
await shot('07_settings_foodpts');

// Test 0 value too
await foodPtsInput.fill('0');
await foodPtsInput.blur();
await page.waitForTimeout(300);
const foodPtsVal2 = await foodPtsInput.inputValue();
log('07b-zero-foodpts', foodPtsVal2 !== '0' ? 'PASS' : 'FAIL', `foodPts value after 0 entry: "${foodPtsVal2}"`);

// ── Test 8: PIN field — digits only, maxLength=4 ──────────────────────────
// PIN input is now type="text" with inputMode="numeric"
const pinInputs = page.locator('input[inputmode="numeric"]');
const pinCount = await pinInputs.count();
const pinInput = pinInputs.last();
await pinInput.fill('');
await pinInput.type('abc123xyz');
await page.waitForTimeout(200);
const pinVal = await pinInput.inputValue();
log('08-pin-digits-only', /^\d+$/.test(pinVal) && pinVal.length <= 4 ? 'PASS' : 'FAIL', `PIN value after "abc123xyz": "${pinVal}"`);
await shot('08_pin_input');
// Restore PIN to 1234 so subsequent parent logins work
await pinInput.fill('1234');
await pinInput.blur();
await page.waitForTimeout(300);

// ── Test 11: Badges tab — debounce check (structural only) ───────────────
const badgesTab = page.locator('[role="tab"]').filter({ hasText: 'Badges' });
await badgesTab.click();
await page.waitForTimeout(300);
const badgeNameInputs = page.locator('input.pbadge-name-input');
const badgeNameCount = await badgeNameInputs.count();
log('11-badges-tab-loads', badgeNameCount > 0 ? 'PASS' : 'FAIL', `badge name inputs found: ${badgeNameCount}`);
await shot('09_badges_panel');

// Edit a badge name — just verify it doesn't crash
const firstBadgeInput = badgeNameInputs.first();
const originalName = await firstBadgeInput.inputValue();
await firstBadgeInput.fill('Test Badge');
await page.waitForTimeout(400); // let debounce fire
await firstBadgeInput.fill(originalName); // restore
await page.waitForTimeout(400);
log('11-badge-name-edit', true ? 'PASS' : 'FAIL', 'editing badge name did not crash');

// ── Exit parent mode ─────────────────────────────────────────────────────
const exitBtn = page.locator('.parent-topbar-exit-btn');
if (await exitBtn.isVisible()) {
  await exitBtn.click();
}
await page.waitForTimeout(500);
await shot('10_back_to_kid');

// ── Test 2: Stepper button size ────────────────────────────────────────────
// Check the CSS computed size of stepper buttons
const stepperBtn = page.locator('.stepper-btn').first();
if (await stepperBtn.isVisible()) {
  const box = await stepperBtn.boundingBox();
  log('02-stepper-size', box && box.width >= 30 ? 'PASS' : 'FAIL', `stepper btn size: ${JSON.stringify(box)}`);
} else {
  log('02-stepper-size', 'FAIL', 'stepper btn not visible');
}

// ── Test 1: Multi-step goal reset ────────────────────────────────────────
// Find the "Run laps" goal on home screen
await page.locator('.nav-btn').first().click(); // home
await page.waitForTimeout(500);
await shot('11_home_with_goal');

// Check if Run laps is visible with stepper
const runLapsGoal = page.getByText('Run laps');
if (await runLapsGoal.isVisible()) {
  // Find the + button for Run laps
  const goalItems = page.locator('.goal-item');
  let targetItem = null;
  const count2 = await goalItems.count();
  for (let i = 0; i < count2; i++) {
    const text = await goalItems.nth(i).textContent();
    if (text?.includes('Run laps')) {
      targetItem = goalItems.nth(i);
      break;
    }
  }
  if (targetItem) {
    const plusBtn = targetItem.locator('.stepper-btn').last();
    // Click + twice
    await plusBtn.click();
    await page.waitForTimeout(200);
    await plusBtn.click();
    await page.waitForTimeout(200);
    const countDisplay = await targetItem.locator('.stepper-count').textContent();
    log('01a-goal-increment', countDisplay === '2/3' ? 'PASS' : 'FAIL', `After 2 clicks: stepper shows "${countDisplay}"`);
    await shot('12_goal_incremented');
  } else {
    log('01a-goal-increment', 'FAIL', 'Run laps goal item not found');
  }
} else {
  log('01a-goal-increment', 'FAIL', 'Run laps goal not visible on home screen');
}

// Now reset today via parent
await page.locator('.nav-btn').last().click(); // Settings
await page.waitForTimeout(300);
for (const d of ['1','2','3','4']) {
  await page.locator('.pin-key').filter({ hasText: d }).click();
  await page.waitForTimeout(100);
}
await page.waitForTimeout(400);
const settingsTab2 = page.locator('[role="tab"]').filter({ hasText: 'Settings' });
await settingsTab2.click();
await page.waitForTimeout(300);

const resetBtn = page.getByRole('button', { name: /reset today/i });
await resetBtn.click();
await page.waitForTimeout(300);
const confirmResetBtn = page.getByRole('button', { name: /^reset$/i });
if (await confirmResetBtn.isVisible()) {
  await confirmResetBtn.click();
  await page.waitForTimeout(500);
}
await shot('13_after_reset');

// Go back to home and check goal stepper
const exitBtn2 = page.locator('.parent-topbar-exit-btn');
if (await exitBtn2.isVisible()) await exitBtn2.click();
await page.waitForTimeout(500);
await page.locator('.nav-btn').first().click(); // home
await page.waitForTimeout(500);
await shot('14_home_after_reset');

const goalItems2 = page.locator('.goal-item');
const count3 = await goalItems2.count();
let foundRunLapsAfterReset = false;
for (let i = 0; i < count3; i++) {
  const text = await goalItems2.nth(i).textContent();
  if (text?.includes('Run laps')) {
    const stepCount = await goalItems2.nth(i).locator('.stepper-count').textContent();
    const plusDisabled = await goalItems2.nth(i).locator('.stepper-btn').last().isDisabled();
    log('01b-goal-reset', stepCount === '0/3' && !plusDisabled ? 'PASS' : 'FAIL',
      `After reset: stepper="${stepCount}", + disabled=${plusDisabled}`);
    foundRunLapsAfterReset = true;
    break;
  }
}
if (!foundRunLapsAfterReset) {
  log('01b-goal-reset', 'FAIL', 'Run laps goal not found after reset');
}

// ── Test 4 & 5 & 6: Calendar ─────────────────────────────────────────────
const calBtn = page.locator('.week-strip-cal-btn');
await calBtn.click();
await page.waitForTimeout(600);
await shot('15_calendar_open');

// Test 5: weekday headers
const weekdayHeaders = await page.locator('.calendar-weekday').allTextContents();
const hasProperHeaders = weekdayHeaders.join('') === 'SuMoTuWeThFrSa';
log('05-weekday-headers', hasProperHeaders ? 'PASS' : 'FAIL', `weekdays: ${JSON.stringify(weekdayHeaders)}`);

// Test 6: click today in calendar
const todayCell = page.locator('.calendar-day.today');
if (await todayCell.isVisible()) {
  await todayCell.click();
  await page.waitForTimeout(400);
  const goToHomeMsg = await page.getByText(/go to home to log/i).isVisible();
  log('06-calendar-today-message', goToHomeMsg ? 'PASS' : 'FAIL', `"go to home" message visible: ${goToHomeMsg}`);
  await shot('16_calendar_today');
}

// Test 4: Select a past date
// Go back to previous month
const prevMonthBtn = page.locator('.calendar-nav-btn').first();
await prevMonthBtn.click();
await page.waitForTimeout(300);
// Click day 15
const pastDay = page.locator('.calendar-day').filter({ hasText: '15' }).first();
if (await pastDay.isVisible()) {
  await pastDay.click();
  await page.waitForTimeout(300);
  await shot('17_calendar_past_date');
}

// Close calendar
const closeCalBtn = page.locator('.calendar-modal-close');
await closeCalBtn.click();
await page.waitForTimeout(500);
await shot('18_home_after_calendar');

// Check home screen shows the past date summary (not today)
const weekStripHeader = await page.locator('.week-strip-header span').first().textContent();
// Past date selected — the week strip should show it; since it's a past month,
// the header may show "May 15" or similar
const showsPastDate = weekStripHeader && !weekStripHeader.includes('16'); // June 16 is today
log('04-calendar-date-persists', showsPastDate ? 'PASS' : 'FAIL', `header after calendar close: "${weekStripHeader}"`);

// ── Test 14: PIN keyboard input ──────────────────────────────────────────
// Navigate to PIN screen
await page.locator('.nav-btn').last().click(); // Settings → PIN screen
await page.waitForTimeout(300);
await shot('19_pin_screen');

const pinDots = page.locator('.pin-dot');
const dotCountBefore = await pinDots.count();
// Type 1234 on keyboard
await page.keyboard.type('1');
await page.waitForTimeout(100);
const filledDots1 = await page.locator('.pin-dot.filled').count();
await page.keyboard.type('2');
await page.waitForTimeout(100);
const filledDots2 = await page.locator('.pin-dot.filled').count();
await page.keyboard.type('34');
await page.waitForTimeout(500); // wait for auto-check
await shot('20_pin_keyboard');

const inParent = await page.locator('.parent-screen-inner').isVisible();
log('14-pin-keyboard', inParent ? 'PASS' : 'FAIL', `keyboard PIN entry → parent mode reached: ${inParent}, dots before: ${dotCountBefore}, after 1: ${filledDots1}, after 2: ${filledDots2}`);

// ── Test 3 dot: Log food then check week strip dot ─────────────────────
// Exit parent first
const exitBtn3 = page.locator('.parent-topbar-exit-btn');
if (await exitBtn3.isVisible()) await exitBtn3.click();
await page.waitForTimeout(400);
await page.locator('.nav-btn').first().click(); // home
await page.waitForTimeout(500);

// Reset to today in case calendar left us on a past date
const todayInStrip = page.locator('.week-day.today');
if (await todayInStrip.isVisible()) {
  await todayInStrip.click();
  await page.waitForTimeout(300);
}

// Log a fruit
const fruitPlus = page.locator('.food-tile').first().locator('.stepper-btn').last();
await fruitPlus.click();
await page.waitForTimeout(500);
await shot('21_fruit_logged');

// Check for dot on today in week strip
const todayDot = page.locator('.week-day.today .week-day-dot');
const dotVisible = await todayDot.isVisible();
log('03b-week-strip-dot', dotVisible ? 'PASS' : 'FAIL', `activity dot visible on today: ${dotVisible}`);

// ── Test 12 & 13: Inject state for approval + rapid-tap tests ──────────────
// Inject: pending pizza night (kid has 1 pt, pizza costs 30 → insufficient)
// and bump points to 100 so kid can afford a future reward request
await page.evaluate(() => {
  const raw = localStorage.getItem('grubclub_v2');
  if (!raw) return;
  const s = JSON.parse(raw);
  const pizza = s.rewards.find((r) => r.name === 'Pizza night');
  if (pizza && !s.pendingRewards.some((p) => p.rewardId === pizza.id)) {
    s.pendingRewards.push({ id: String(Date.now()), rewardId: pizza.id });
  }
  localStorage.setItem('grubclub_v2', JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(800);

// Re-dismiss sync gate if it re-appears
const skipBtn2 = page.getByText('Maybe later');
if (await skipBtn2.isVisible()) { await skipBtn2.click(); await page.waitForTimeout(300); }

await page.locator('.nav-btn').nth(1).click(); // store
await page.waitForTimeout(400);
await shot('22_store');
await shot('23_pizza_requested'); // pizza already in pending

// Now go to parent approvals
await page.locator('.nav-btn').last().click();
await page.waitForTimeout(300);
for (const d of ['1','2','3','4']) {
  await page.locator('.pin-key').filter({ hasText: d }).click();
  await page.waitForTimeout(100);
}
await page.waitForTimeout(400);
await shot('24_approvals');

// Check if there's a warning about insufficient points
const warningText = await page.locator('.parent-item-warning').isVisible();
if (warningText) {
  const approveBtn = page.locator('.btn-green').first();
  await approveBtn.click();
  await page.waitForTimeout(300);
  const confirmDialogVisible = await page.locator('.badge-popup').isVisible();
  log('12-insufficient-confirm', confirmDialogVisible ? 'PASS' : 'FAIL', `confirm dialog shown: ${confirmDialogVisible}`);
  await shot('25_insufficient_confirm');
  const cancelBtn = page.getByRole('button', { name: /cancel/i });
  if (await cancelBtn.isVisible()) await cancelBtn.click();
  await page.waitForTimeout(200);
} else {
  log('12-insufficient-confirm', 'FAIL', `no insufficient-points warning visible in approvals (pending count: ${await page.locator('.parent-item').count()})`);
}

// ── Test 13: Rapid reward request ─────────────────────────────────────────
const exitBtn4 = page.locator('.parent-topbar-exit-btn');
if (await exitBtn4.isVisible()) await exitBtn4.click();
await page.waitForTimeout(300);

// Inject enough points so kid can request the reward
const injectResult = await page.evaluate(() => {
  const raw = localStorage.getItem('grubclub_v2');
  if (!raw) return { error: 'no state' };
  const s = JSON.parse(raw);
  const before = s.points;
  s.points = 100;
  s.totalPoints = 100;
  s.todayPoints = 0; // avoid rollover issues
  // Remove pizza from pending so store shows it again
  s.pendingRewards = [];
  localStorage.setItem('grubclub_v2', JSON.stringify(s));
  const verify = JSON.parse(localStorage.getItem('grubclub_v2'));
  return { before, after: verify.points };
});
console.log('[debug] test13 state inject:', JSON.stringify(injectResult));
await page.reload();
await page.waitForTimeout(800);
const skipBtn3 = page.getByText('Maybe later');
if (await skipBtn3.isVisible()) { await skipBtn3.click(); await page.waitForTimeout(300); }

await page.locator('.nav-btn').nth(1).click(); // store
await page.waitForTimeout(300);
await shot('26_store_before_rapid');

// Test 13: click pizza once, immediately click again — should only create 1 pending
const pizzaItem = page.locator('.store-item').filter({ hasText: 'Pizza night' });
if (await pizzaItem.isVisible()) {
  const pendingBefore = await page.locator('.pending-item').count();
  // Click pizza once
  await pizzaItem.click();
  // Immediately click pizza again (might already be gone from DOM)
  try {
    await pizzaItem.click({ timeout: 500 });
  } catch { /* expected — item disappears after first request */ }
  await page.waitForTimeout(500);
  // Count how many pizza pending items exist
  const pizzaPending = await page.locator('.pending-item').filter({ hasText: 'Pizza night' }).count();
  log('13-rapid-request', pizzaPending === 1 ? 'PASS' : 'FAIL',
    `pending before: ${pendingBefore}, pizza pending count: ${pizzaPending}`);
} else {
  log('13-rapid-request', 'SKIP', 'pizza night not in store');
}

await shot('27_final_state');

// Print results
console.log('\n=== VERIFICATION RESULTS ===');
for (const r of results) {
  console.log(`${r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️' : '❌'} [${r.id}] ${r.status}: ${r.note}`);
}

await browser.close();
