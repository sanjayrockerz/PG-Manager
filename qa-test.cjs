/**
 * QA Test Script — Full workflow validation with Supabase auth mocking
 * Mocks: Supabase /auth/v1/user + /rest/v1/profiles so no real login needed
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:4173';
const SUPABASE_HOST = 'krkzklxfczukvllhucsg.supabase.co';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_OWNER_SCOPE_ID = '00000000-0000-0000-0000-000000000002';

const SHOTS_DIR = path.join(__dirname, 'qa-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.readdirSync(SHOTS_DIR).forEach(f => {
  try { fs.unlinkSync(path.join(SHOTS_DIR, f)); } catch {}
});

const results = [];
let shotIndex = 0;

function shot(page, label) {
  const file = path.join(SHOTS_DIR, `${String(++shotIndex).padStart(3, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`);
  return page.screenshot({ path: file, fullPage: false }).then(() => {
    console.log(`  📸 ${label}`);
    return file;
  }).catch(() => {});
}

function pass(test, detail = '') {
  results.push({ status: 'PASS', test, detail });
  console.log(`  ✅ PASS: ${test}${detail ? ' — ' + detail : ''}`);
}
function fail(test, detail = '') {
  results.push({ status: 'FAIL', test, detail });
  console.log(`  ❌ FAIL: ${test}${detail ? ' — ' + detail : ''}`);
}
function warn(test, detail = '') {
  results.push({ status: 'WARN', test, detail });
  console.log(`  ⚠️  WARN: ${test}${detail ? ' — ' + detail : ''}`);
}

// ── Supabase mock responses ─────────────────────────────────────────────────
const MOCK_AUTH_USER = {
  id: MOCK_USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'owner.demo@pgmanager.app',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  user_metadata: { name: 'Demo Owner', role: 'owner' },
  app_metadata: { provider: 'email', providers: ['email'] },
};

const MOCK_PROFILE_ROW = {
  id: MOCK_USER_ID,
  email: 'owner.demo@pgmanager.app',
  full_name: 'Demo Owner',
  phone: '+919876500001',
  role: 'owner',
  owner_scope_id: MOCK_OWNER_SCOPE_ID,
  pg_name: 'Khush Living',
  city: 'Bengaluru',
};

const MOCK_SESSION_TOKEN = {
  access_token: 'mock-access-token-qa-testing',
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  expires_in: 86400,
  refresh_token: 'mock-refresh-token-qa-testing',
  token_type: 'bearer',
  user: MOCK_AUTH_USER,
};

async function setupMocks(context) {
  await context.route(`**/${SUPABASE_HOST}/auth/v1/user**`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_USER) });
  });
  await context.route(`**/${SUPABASE_HOST}/auth/v1/token**`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token-qa-testing',
        expires_at: Math.floor(Date.now() / 1000) + 86400,
        expires_in: 86400, refresh_token: 'mock-refresh-token-qa-testing',
        token_type: 'bearer', user: MOCK_AUTH_USER,
      }),
    });
  });
  await context.route(`**/${SUPABASE_HOST}/rest/v1/profiles**`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PROFILE_ROW]) });
  });
  await context.route(`**/${SUPABASE_HOST}/rest/v1/users**`, async route => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    }
  });
}

async function injectSession(page) {
  await page.evaluate((token) => {
    localStorage.setItem('sb-krkzklxfczukvllhucsg-auth-token', JSON.stringify(token));
    localStorage.setItem('app_mode', 'demo');
    localStorage.removeItem('rentcare:selected-portal');
  }, MOCK_SESSION_TOKEN);
}

// ── Navigation helper ────────────────────────────────────────────────────────
async function clickTab(page, tabName) {
  const allClickable = page.locator('button, a[role="button"]');
  const count = await allClickable.count();
  for (let i = 0; i < count; i++) {
    const el = allClickable.nth(i);
    const txt = (await el.innerText().catch(() => '')).trim().toLowerCase();
    if (txt === tabName.toLowerCase()) {
      if (await el.isVisible().catch(() => false)) { await el.click(); await page.waitForTimeout(900); return true; }
    }
  }
  for (let i = 0; i < count; i++) {
    const el = allClickable.nth(i);
    const txt = (await el.innerText().catch(() => '')).trim().toLowerCase();
    if (txt.includes(tabName.toLowerCase())) {
      if (await el.isVisible().catch(() => false)) { await el.click(); await page.waitForTimeout(900); return true; }
    }
  }
  return false;
}

async function getMainText(page) {
  return page.locator('main, [role="main"], #root').innerText().catch(() => '');
}

async function isVisible(locator, timeout = 2000) {
  return locator.isVisible({ timeout }).catch(() => false);
}

// ── SUITE 1: Auth & Load ─────────────────────────────────────────────────────
async function testAuth(page) {
  console.log('\n━━━ Suite 1: Auth & Initial Load ━━━');
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await injectSession(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await shot(page, '01_post_auth');

  const body = await page.content();
  if (!body.includes('Send Magic Link') && !body.includes('Sign In')) {
    pass('Auth bypass via mock session — past login screen');
  } else {
    fail('Auth bypass failed', 'Still on login screen after session injection');
  }

  const hasSidebar = await page.locator('aside, nav, [class*="sidebar" i]').first().isVisible({ timeout: 2000 }).catch(() => false);
  const hasNavBtns = await page.locator('button').filter({ hasText: /dashboard|tenants|payments|maintenance/i }).count().then(c => c > 0);
  if (hasSidebar || hasNavBtns) {
    pass('App navigation visible');
  } else {
    warn('Navigation', 'No sidebar or nav buttons found');
  }
}

// ── SUITE 2: Dashboard ───────────────────────────────────────────────────────
async function testDashboard(page) {
  console.log('\n━━━ Suite 2: Dashboard ━━━');
  await clickTab(page, 'dashboard');
  await page.waitForTimeout(1200);
  await shot(page, '02_dashboard');
  const text = await getMainText(page);
  /occupancy|revenue|tenant|₹|\d+\s*%|\d+\s*room/i.test(text) ? pass('Dashboard metrics visible') : warn('Dashboard metrics', 'No metric text found');
  /activity|recent|event|ticket|payment/i.test(text) ? pass('Dashboard activity feed visible') : warn('Dashboard activity', 'No activity text');
}

// ── SUITE 3: Payments ────────────────────────────────────────────────────────
async function testPayments(page) {
  console.log('\n━━━ Suite 3: Payment Workflow ━━━');
  await clickTab(page, 'payments');
  await page.waitForTimeout(1500);
  await shot(page, '03_payments_list');
  const text = await getMainText(page);

  if (!/payment|rent|₹|due|paid|pending/i.test(text)) { fail('Payments page', 'No payment data'); return; }
  pass('Payments page has data');

  const rows = page.locator('tr, [class*="payment" i]').filter({ hasText: /₹|rent|paid|due|pending/i });
  const rc = await rows.count();
  rc > 0 ? pass('Payment rows visible', `${rc} items`) : warn('Payment rows', 'No rows found');

  const filterTabs = page.locator('[role="tab"], button').filter({ hasText: /all|paid|due|overdue|pending/i });
  (await filterTabs.count()) > 0 ? pass('Payment filter tabs visible') : warn('Payment filters', 'Not found');

  // Mark as Paid
  const markBtn = page.locator('button').filter({ hasText: /mark.*paid|collect|record payment/i }).first();
  if (await isVisible(markBtn)) {
    pass('Mark as Paid / Collect button visible');
    await markBtn.click(); await page.waitForTimeout(1000);
    await shot(page, '03b_mark_paid_action');
    const dialog = page.locator('[role="dialog"]').first();
    if (await isVisible(dialog)) {
      pass('Mark as Paid confirmation dialog opened');
      const confirmBtn = dialog.locator('button').filter({ hasText: /confirm|yes|mark|paid|save/i }).first();
      if (await isVisible(confirmBtn)) { await confirmBtn.click(); await page.waitForTimeout(1200); pass('Payment confirmation submitted'); }
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    } else {
      warn('Mark as Paid dialog', 'No dialog — inline action');
    }
  } else {
    warn('Mark as Paid button', 'Not found (may need "pending" filter)');
    // Try pending filter
    const pendingTab = page.locator('button, [role="tab"]').filter({ hasText: /pending|due/i }).first();
    if (await isVisible(pendingTab, 1000)) {
      await pendingTab.click(); await page.waitForTimeout(800);
      await shot(page, '03_pending_filter');
      const btn2 = page.locator('button').filter({ hasText: /mark.*paid|collect/i }).first();
      if (await isVisible(btn2, 1500)) { pass('Mark as Paid visible after pending filter'); }
    }
  }

  // Receipt
  const receiptBtn = page.locator('button').filter({ hasText: /receipt|invoice|download/i }).first();
  if (await isVisible(receiptBtn)) {
    pass('Receipt/Invoice button visible');
    await receiptBtn.click(); await page.waitForTimeout(800);
    await shot(page, '03c_receipt'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  } else { warn('Receipt button', 'Not found'); }

  // Export CSV
  const exportBtn = page.locator('button').filter({ hasText: /export|csv/i }).first();
  if (await isVisible(exportBtn)) {
    pass('Export CSV button visible');
    await exportBtn.click(); await page.waitForTimeout(800);
    await shot(page, '03d_export'); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  } else { warn('Export CSV', 'Not found'); }

  await shot(page, '03_payments_final');
}

// ── SUITE 4: Tenants ─────────────────────────────────────────────────────────
async function testTenants(page) {
  console.log('\n━━━ Suite 4: Tenant Workflow ━━━');
  await clickTab(page, 'tenants');
  await page.waitForTimeout(1500);
  await shot(page, '04_tenants_list');
  const text = await getMainText(page);

  if (!/tenant|resident|room/i.test(text)) { fail('Tenants page', 'No tenant data'); return; }
  pass('Tenants page loaded');

  const items = page.locator('tr, [class*="tenant" i]').filter({ hasText: /room|floor|₹|active|notice/i });
  const count = await items.count();
  count > 0 ? pass('Tenant items visible', `${count}`) : warn('Tenant items', 'No rows found');

  // Add Tenant
  const addBtn = page.locator('button').filter({ hasText: /add tenant|new tenant|\+/i }).first();
  if (await isVisible(addBtn)) {
    pass('Add Tenant button visible'); await addBtn.click(); await page.waitForTimeout(1000);
    await shot(page, '04b_add_tenant_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await isVisible(dialog)) {
      pass('Add Tenant dialog opens');
      const inputCount = await dialog.locator('input').count();
      pass('Add Tenant form fields', `${inputCount} inputs`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    } else { warn('Add Tenant dialog', 'Did not open'); }
  } else { warn('Add Tenant button', 'Not found'); }

  // CSV Import
  const importBtn = page.locator('button').filter({ hasText: /import|csv|bulk/i }).first();
  if (await isVisible(importBtn)) {
    pass('CSV Import button visible'); await importBtn.click(); await page.waitForTimeout(1000);
    await shot(page, '04c_csv_import');
    await isVisible(page.locator('[role="dialog"]').first()) ? pass('CSV Import dialog opens') : warn('CSV Import dialog', 'Did not open');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  } else { warn('CSV Import', 'Not found'); }

  // Tenant detail
  const firstRow = page.locator('tr, [class*="tenant-row" i]').filter({ hasText: /room|floor|₹|active/i }).first();
  if (await isVisible(firstRow, 2000)) {
    await firstRow.click(); await page.waitForTimeout(1200);
    await shot(page, '04d_tenant_detail');
    const det = await getMainText(page);
    /room|lease|payment|history|floor/i.test(det) ? pass('Tenant detail shows lifecycle data') : warn('Tenant detail', 'Limited detail data');
    const lifecycle = page.locator('select, [role="combobox"], [class*="status" i], [class*="badge" i]').filter({ hasText: /active|notice|vacating|inactive/i }).first();
    await isVisible(lifecycle, 1500) ? pass('Lifecycle status visible') : warn('Lifecycle status', 'Not found in detail');
    const backBtn = page.locator('button').filter({ hasText: /back|← tenant/i }).first();
    if (await isVisible(backBtn, 1000)) await backBtn.click();
    await page.waitForTimeout(500);
  } else { warn('Tenant detail', 'No clickable row'); }

  await shot(page, '04_tenants_final');
}

// ── SUITE 5: Maintenance ─────────────────────────────────────────────────────
async function testMaintenance(page) {
  console.log('\n━━━ Suite 5: Maintenance Workflow ━━━');
  await clickTab(page, 'maintenance');
  await page.waitForTimeout(1500);
  await shot(page, '05_maintenance_list');
  const text = await getMainText(page);

  if (!/ticket|maintenance|issue|repair/i.test(text)) { fail('Maintenance page', 'No ticket data'); return; }
  pass('Maintenance page loaded with tickets');

  const tickets = page.locator('[class*="ticket" i], tbody tr').filter({ hasText: /open|progress|resolved|pending|room/i });
  const tc = await tickets.count();
  tc > 0 ? pass('Tickets visible', `${tc}`) : warn('Tickets', 'No ticket rows found');

  const statusTabs = page.locator('[role="tab"], button').filter({ hasText: /all|open|progress|resolved|closed/i });
  (await statusTabs.count()) > 0 ? pass('Status filter tabs visible') : warn('Status filters', 'Not found');

  // Create ticket
  const newBtn = page.locator('button').filter({ hasText: /new ticket|create|add ticket|report|raise/i }).first();
  if (await isVisible(newBtn)) {
    pass('Create Ticket button visible'); await newBtn.click(); await page.waitForTimeout(1000);
    await shot(page, '05b_create_ticket');
    const dialog = page.locator('[role="dialog"]').first();
    if (await isVisible(dialog)) {
      pass('Create Ticket dialog opens');
      const titleInput = dialog.locator('input').first();
      if (await isVisible(titleInput, 1000)) { await titleInput.fill('QA Test — Plumbing Issue R101'); pass('Title fillable'); }
      const descInput = dialog.locator('textarea').first();
      if (await isVisible(descInput, 1000)) { await descInput.fill('Faucet dripping in bathroom.'); pass('Description fillable'); }
      const priorityEl = dialog.locator('select, [role="combobox"]').filter({ hasText: /low|medium|high|urgent/i }).first();
      await isVisible(priorityEl, 1000) ? pass('Priority selector visible') : warn('Priority selector', 'Not found');
      await shot(page, '05c_ticket_filled');
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    } else { warn('Create Ticket dialog', 'Did not open'); }
  } else { warn('Create Ticket button', 'Not found'); }

  // Ticket detail + thread
  const firstTicket = page.locator('[class*="ticket" i], tbody tr').filter({ hasText: /open|pending|room/i }).first();
  if (await isVisible(firstTicket, 2000)) {
    await firstTicket.click(); await page.waitForTimeout(1200);
    await shot(page, '05d_ticket_detail');
    const det = await getMainText(page);
    /thread|note|comment|update|message/i.test(det) ? pass('Thread/notes section visible') : warn('Thread', 'No thread content');
    const statusCtrl = page.locator('select, [role="combobox"], button').filter({ hasText: /open|progress|resolved|closed/i }).first();
    await isVisible(statusCtrl, 1500) ? pass('Status control in detail') : warn('Status control', 'Not found');
    const noteInput = page.locator('input, textarea').filter({ hasText: '' }).last();
    if (await isVisible(noteInput, 1000)) { await noteInput.fill('QA note'); pass('Note input fillable'); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  } else { warn('Ticket detail', 'No clickable ticket'); }

  await shot(page, '05_maintenance_final');
}

// ── SUITE 6: Announcements ───────────────────────────────────────────────────
async function testAnnouncements(page) {
  console.log('\n━━━ Suite 6: Announcement Workflow ━━━');
  await clickTab(page, 'announcements');
  await page.waitForTimeout(1500);
  await shot(page, '06_announcements_list');
  const text = await getMainText(page);

  if (!/announcement|notice|broadcast|post/i.test(text)) { fail('Announcements page', 'No data'); return; }
  pass('Announcements page loaded');

  const pinnedEl = page.locator('[class*="pin" i]').first();
  await isVisible(pinnedEl, 1500) ? pass('Pin indicator visible') : warn('Pin indicator', 'Not visible');

  const createBtn = page.locator('button').filter({ hasText: /new|create|add|post/i }).first();
  if (await isVisible(createBtn)) {
    pass('Create Announcement button visible'); await createBtn.click(); await page.waitForTimeout(1000);
    await shot(page, '06b_create_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await isVisible(dialog)) {
      pass('Create Announcement dialog opens');
      const titleInput = dialog.locator('input').first();
      if (await isVisible(titleInput, 1000)) { await titleInput.fill('Water Cut Tomorrow 10am-2pm'); pass('Title fillable'); }
      const waLabel = dialog.locator('text=/whatsapp/i').first();
      if (await isVisible(waLabel, 1500)) {
        pass('WhatsApp option visible');
        const waSwitch = dialog.locator('[role="switch"], input[type="checkbox"]').first();
        if (await isVisible(waSwitch, 1000)) { await waSwitch.click(); await page.waitForTimeout(400); pass('WhatsApp toggle clicked'); }
      } else { warn('WhatsApp toggle', 'Not found'); }
      const targetEl = dialog.locator('select, [role="combobox"]').first();
      await isVisible(targetEl, 1500) ? pass('Property/floor targeting visible') : warn('Targeting selector', 'Not found');
      await shot(page, '06c_announcement_filled');
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    } else { warn('Create dialog', 'Did not open'); }
  } else { warn('Create button', 'Not found'); }

  await shot(page, '06_announcements_final');
}

// ── SUITE 7: Notifications ───────────────────────────────────────────────────
async function testNotifications(page) {
  console.log('\n━━━ Suite 7: Notification Workflow ━━━');

  const bell = page.locator('[class*="NotificationBell" i], [aria-label*="notification" i]').first();
  if (await isVisible(bell, 2000)) {
    pass('Notification bell visible');
    const badge = bell.locator('span').filter({ hasText: /^\d+$/ }).first();
    if (await isVisible(badge, 1000)) {
      pass('Unread count badge visible', `count: ${await badge.innerText().catch(() => '?')}`);
    } else { warn('Unread badge', 'No numeric badge (may be zero)'); }
    await bell.click(); await page.waitForTimeout(800);
    await shot(page, '07_notification_panel');
    const panel = page.locator('[class*="dropdown" i], [class*="popover" i], [role="menu"]').first();
    if (await isVisible(panel, 2000)) {
      pass('Notification panel opens');
      const markAllBtn = panel.locator('button').filter({ hasText: /mark all|read all|clear/i }).first();
      if (await isVisible(markAllBtn, 1000)) { pass('Mark all read button visible'); await markAllBtn.click(); await page.waitForTimeout(500); pass('Mark all read clicked'); }
      else { warn('Mark all read', 'Not found'); }
    } else { warn('Notification panel', 'Did not open'); }
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  } else {
    const navigated = await clickTab(page, 'notifications');
    await page.waitForTimeout(800);
    await shot(page, '07_notifications_tab');
    /notification|alert/i.test(await getMainText(page)) ? pass('Notifications via tab') : warn('Notifications', 'Not found in header or tab');
  }
  await shot(page, '07_notifications_final');
}

// ── SUITE 8: Properties ──────────────────────────────────────────────────────
async function testProperties(page) {
  console.log('\n━━━ Suite 8: Properties ━━━');
  await clickTab(page, 'properties');
  await page.waitForTimeout(1500);
  await shot(page, '08_properties');
  const text = await getMainText(page);
  if (!/propert|room|floor|pg/i.test(text)) { fail('Properties page', 'No data'); return; }
  pass('Properties page loaded');
  const props = page.locator('[class*="property" i], [class*="card" i]').filter({ hasText: /room|floor|₹|occupied|vacant/i });
  const pc = await props.count();
  pc > 0 ? pass('Property cards visible', `${pc}`) : warn('Property cards', 'No cards');
}

// ── SUITE 9: Mode Toggle ─────────────────────────────────────────────────────
async function testModeToggle(page) {
  console.log('\n━━━ Suite 9: Demo/Live Mode Toggle ━━━');
  await clickTab(page, 'dashboard');
  await page.waitForTimeout(800);
  const demoBtn = page.locator('button').filter({ hasText: /^Demo$/ }).first();
  if (await isVisible(demoBtn, 2000)) {
    pass('Demo/Live mode toggle visible');
    const pressed = await demoBtn.getAttribute('aria-pressed').catch(() => null);
    pass('Demo mode state', `aria-pressed=${pressed}`);
  } else { warn('Mode toggle', 'Not found'); }
  await shot(page, '09_mode_toggle');
}

// ── SUITE 10: Cross-Module Checks ─────────────────────────────────────────────
async function testCrossModule(page) {
  console.log('\n━━━ Suite 10: Cross-Module Consistency ━━━');
  await clickTab(page, 'dashboard');
  await page.waitForTimeout(1000);
  const text = await getMainText(page);
  /\d+/.test(text) ? pass('Dashboard shows numeric counts') : warn('Dashboard numbers', 'No numerics');
  const propSelector = page.locator('select, [role="combobox"]').filter({ hasText: /property|all propert|khush/i }).first();
  await isVisible(propSelector, 2000) ? pass('Property selector visible (multi-property support)') : warn('Property selector', 'Not found');
  await shot(page, '10_cross_module');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  await setupMocks(context);
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`PAGE: ${err.message}`));
  page.on('requestfailed', req => {
    const url = req.url();
    if (!url.includes('supabase.co') && !url.includes('fonts.googleapis') && !url.includes('ws://')) {
      networkErrors.push(`${req.method()} ${url} — ${req.failure()?.errorText}`);
    }
  });

  try {
    await testAuth(page);
    await testDashboard(page);
    await testPayments(page);
    await testTenants(page);
    await testMaintenance(page);
    await testAnnouncements(page);
    await testNotifications(page);
    await testProperties(page);
    await testModeToggle(page);
    await testCrossModule(page);
  } catch (err) {
    fail('Test runner crash', err.message);
    console.error(err);
    await shot(page, 'CRASH').catch(() => {});
  } finally {
    await browser.close();
  }

  // ── REPORT ────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  console.log('                   QA REPORT SUMMARY');
  console.log('═'.repeat(65));
  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const warned = results.filter(r => r.status === 'WARN');

  console.log(`\n  ✅ PASS : ${passed.length}`);
  console.log(`  ❌ FAIL : ${failed.length}`);
  console.log(`  ⚠️  WARN : ${warned.length}`);
  console.log(`  Total  : ${results.length}`);

  if (failed.length > 0) {
    console.log('\n── FAILURES ──────────────────────────────────────────────────');
    failed.forEach(r => console.log(`  ❌ ${r.test}: ${r.detail}`));
  }
  if (warned.length > 0) {
    console.log('\n── WARNINGS ──────────────────────────────────────────────────');
    warned.forEach(r => console.log(`  ⚠️  ${r.test}: ${r.detail}`));
  }
  if (consoleErrors.length > 0) {
    console.log(`\n── CONSOLE ERRORS (${consoleErrors.length}) ──────────────────────────────────`);
    consoleErrors.slice(0, 20).forEach(e => console.log(`  🔴 ${e.substring(0, 130)}`));
  } else {
    console.log('\n  ✅ No browser console errors');
  }
  if (networkErrors.length > 0) {
    console.log(`\n── NETWORK FAILURES (${networkErrors.length}) ────────────────────────────────`);
    networkErrors.slice(0, 10).forEach(e => console.log(`  🔌 ${e}`));
  }

  console.log(`\n📁 Screenshots: ${SHOTS_DIR}`);
  console.log('═'.repeat(65));

  const report = { timestamp: new Date().toISOString(), summary: { total: results.length, pass: passed.length, fail: failed.length, warn: warned.length }, results, consoleErrors, networkErrors };
  fs.writeFileSync(path.join(__dirname, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log('📄 JSON report: qa-report.json\n');
})();
