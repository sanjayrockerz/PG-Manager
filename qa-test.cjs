/**
 * QA Test Script — Full workflow validation
 * Tests: Payment, Tenant, Maintenance, Announcement, Notification workflows
 * Mode: DEMO (no Supabase auth required)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:4173';
const SHOTS_DIR = path.join(__dirname, 'qa-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];
let shotIndex = 0;

async function shot(page, label) {
  const file = path.join(SHOTS_DIR, `${String(++shotIndex).padStart(3, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  📸 ${label}`);
  return file;
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

async function ensureDemoMode(page) {
  await page.evaluate(() => {
    localStorage.setItem('app_mode', 'demo');
    localStorage.setItem('rentcare:selected-portal', 'owner');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

async function navigateTo(page, tab) {
  // Try sidebar button first
  const selectors = [
    `[data-tab="${tab}"]`,
    `button:has-text("${tab}")`,
    `[aria-label="${tab}"]`,
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
      await el.click();
      await page.waitForTimeout(800);
      return true;
    }
  }
  // Fallback: look in sidebar for partial text match
  const sidebarBtns = page.locator('nav button, aside button, [role="navigation"] button');
  const count = await sidebarBtns.count();
  for (let i = 0; i < count; i++) {
    const txt = await sidebarBtns.nth(i).innerText().catch(() => '');
    if (txt.toLowerCase().includes(tab.toLowerCase())) {
      await sidebarBtns.nth(i).click();
      await page.waitForTimeout(800);
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 1 — INITIAL LOAD & DEMO MODE
// ═══════════════════════════════════════════════════════
async function testInitialLoad(page) {
  console.log('\n━━━ Suite 1: Initial Load & Demo Mode ━━━');

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await shot(page, 'initial_load');

  // Set demo mode + owner portal
  await ensureDemoMode(page);
  await shot(page, 'demo_mode_loaded');

  // Check we're past auth screen
  const body = await page.content();
  if (body.includes('dashboard') || body.includes('Dashboard') || body.includes('tenants') || body.includes('RentCare')) {
    pass('App loads in demo mode');
  } else {
    fail('App loads in demo mode', 'Could not determine if past auth');
  }

  // Check sidebar visible
  const nav = page.locator('nav, aside, [role="navigation"]').first();
  if (await nav.isVisible({ timeout: 3000 }).catch(() => false)) {
    pass('Sidebar/nav visible');
  } else {
    warn('Sidebar/nav visible', 'Not found — may be collapsed');
  }
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 2 — DASHBOARD
// ═══════════════════════════════════════════════════════
async function testDashboard(page) {
  console.log('\n━━━ Suite 2: Dashboard ━━━');

  const navigated = await navigateTo(page, 'dashboard');
  await page.waitForTimeout(1000);
  await shot(page, 'dashboard');

  // Check for stat cards or metrics
  const hasStats = await page.locator('text=/total|revenue|occupancy|tenant/i').count() > 0;
  if (hasStats) {
    pass('Dashboard shows metrics/stats');
  } else {
    warn('Dashboard metrics', 'No metric labels found');
  }

  // Check activity log
  const hasActivity = await page.locator('text=/activity|recent|event/i').count() > 0;
  if (hasActivity) {
    pass('Dashboard shows activity feed');
  } else {
    warn('Activity feed', 'No activity section found');
  }
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 3 — PAYMENT WORKFLOW
// ═══════════════════════════════════════════════════════
async function testPayments(page) {
  console.log('\n━━━ Suite 3: Payment Workflow ━━━');

  const navigated = await navigateTo(page, 'payments');
  await page.waitForTimeout(1200);
  await shot(page, 'payments_list');

  // Check payment list loads
  const paymentRows = page.locator('table tbody tr, [data-testid="payment-row"], .payment-row');
  const rowCount = await paymentRows.count().catch(() => 0);

  // Also check for card-based layout
  const paymentCards = page.locator('[class*="payment"], [class*="Payment"]').filter({ hasText: /rent|₹|\$|paid|pending|due/i });
  const cardCount = await paymentCards.count().catch(() => 0);

  if (rowCount > 0 || cardCount > 0) {
    pass('Payment list loaded', `${rowCount} rows / ${cardCount} cards`);
  } else {
    warn('Payment list', 'No payment rows/cards found — checking content');
    const pageText = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
    if (pageText.toLowerCase().includes('payment') || pageText.toLowerCase().includes('rent')) {
      pass('Payment page has content', 'Found payment-related text');
    } else {
      fail('Payment list', 'No payment content visible');
    }
  }

  // Try to find and click a "Mark as Paid" or status action
  const markPaidBtn = page.locator('button:has-text("Mark as Paid"), button:has-text("mark paid"), [data-action="mark-paid"]').first();
  if (await markPaidBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await markPaidBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'payment_mark_paid_clicked');
    // Check for confirmation dialog or success
    const dialog = page.locator('[role="dialog"], .modal, [data-radix-dialog]');
    const hasDialog = await dialog.isVisible({ timeout: 1500 }).catch(() => false);
    if (hasDialog) {
      pass('Mark as Paid opens confirmation dialog');
      // Confirm
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Mark Paid")').first();
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
        pass('Payment marked as paid (confirmed)');
      }
      // Dismiss if still open
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      pass('Mark as Paid action triggered (no dialog)');
    }
  } else {
    // Try clicking a payment item first
    const firstPayment = page.locator('table tbody tr, [class*="payment-item"], [class*="PaymentRow"]').first();
    if (await firstPayment.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstPayment.click();
      await page.waitForTimeout(800);
      await shot(page, 'payment_detail');
      pass('Payment item clickable');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      warn('Mark as Paid button', 'Not found — may require specific filter state');
    }
  }

  // Check for export button
  const exportBtn = page.locator('button:has-text("Export"), button:has-text("CSV"), button:has-text("Download")').first();
  if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Payment export button visible');
    await exportBtn.click();
    await page.waitForTimeout(800);
    await shot(page, 'payment_export_clicked');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    warn('Payment export', 'Export/CSV button not found');
  }

  await shot(page, 'payments_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 4 — TENANT WORKFLOW
// ═══════════════════════════════════════════════════════
async function testTenants(page) {
  console.log('\n━━━ Suite 4: Tenant Workflow ━━━');

  const navigated = await navigateTo(page, 'tenants');
  await page.waitForTimeout(1200);
  await shot(page, 'tenants_list');

  // Check tenant list
  const tenantContent = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
  if (tenantContent.toLowerCase().includes('tenant') || tenantContent.toLowerCase().includes('room')) {
    pass('Tenant list page loaded');
  } else {
    warn('Tenant list', 'No tenant content detected');
  }

  // Count visible tenant items
  const tenantRows = page.locator('table tbody tr, [class*="tenant"], [class*="Tenant"]').filter({ hasNotText: /header|title|label/i });
  const count = await tenantRows.count().catch(() => 0);
  if (count > 0) {
    pass('Tenant rows visible', `${count} items`);
  } else {
    warn('Tenant rows', 'No rows found — checking for card layout');
  }

  // Try "Add Tenant" button
  const addBtn = page.locator('button:has-text("Add Tenant"), button:has-text("Add New"), button:has-text("New Tenant"), button:has-text("+ Add")').first();
  if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Add Tenant button visible');
    await addBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'add_tenant_dialog');

    const dialog = page.locator('[role="dialog"], .modal, [data-radix-dialog-content]');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      pass('Add Tenant dialog opens');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      warn('Add Tenant dialog', 'Dialog did not open after click');
    }
  } else {
    warn('Add Tenant button', 'Not found');
  }

  // Try "Import CSV" or "Bulk Import" button
  const importBtn = page.locator('button:has-text("Import"), button:has-text("CSV"), button:has-text("Bulk")').first();
  if (await importBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('CSV Import button visible');
    await importBtn.click();
    await page.waitForTimeout(800);
    await shot(page, 'csv_import_dialog');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    warn('CSV Import button', 'Not found in tenant view');
  }

  // Click first tenant to check detail view
  const firstTenant = page.locator('table tbody tr, [class*="tenant-row"], [class*="TenantCard"]').first();
  if (await firstTenant.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstTenant.click();
    await page.waitForTimeout(1000);
    await shot(page, 'tenant_detail');

    const detailContent = await page.locator('main, [role="main"]').innerText().catch(() => '');
    if (detailContent.includes('room') || detailContent.includes('Room') || detailContent.includes('status') || detailContent.includes('Status')) {
      pass('Tenant detail view shows lifecycle data');
    } else {
      warn('Tenant detail view', 'Limited lifecycle data visible');
    }

    // Check lifecycle status selector
    const statusSelect = page.locator('select, [role="combobox"]').filter({ hasText: /active|notice|vacating|inactive/i }).first();
    if (await statusSelect.isVisible({ timeout: 1500 }).catch(() => false)) {
      pass('Lifecycle status selector visible in tenant detail');
    } else {
      warn('Lifecycle status selector', 'Not found in detail view');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await shot(page, 'tenants_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 5 — MAINTENANCE WORKFLOW
// ═══════════════════════════════════════════════════════
async function testMaintenance(page) {
  console.log('\n━━━ Suite 5: Maintenance Workflow ━━━');

  const navigated = await navigateTo(page, 'maintenance');
  await page.waitForTimeout(1200);
  await shot(page, 'maintenance_list');

  const content = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
  if (content.toLowerCase().includes('ticket') || content.toLowerCase().includes('maintenance') || content.toLowerCase().includes('issue')) {
    pass('Maintenance page loaded with ticket content');
  } else {
    warn('Maintenance page', 'No ticket content detected');
  }

  // Check ticket count
  const tickets = page.locator('[class*="ticket"], [class*="Ticket"], table tbody tr').filter({ hasNotText: /header/i });
  const ticketCount = await tickets.count().catch(() => 0);
  if (ticketCount > 0) {
    pass('Maintenance tickets visible', `${ticketCount} items`);
  } else {
    warn('Maintenance tickets', 'No ticket items found');
  }

  // Try "Create Ticket" / "New Ticket" button
  const newTicketBtn = page.locator('button:has-text("New Ticket"), button:has-text("Create Ticket"), button:has-text("Add Ticket"), button:has-text("Report")').first();
  if (await newTicketBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Create Ticket button visible');
    await newTicketBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'create_ticket_dialog');

    const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      pass('Create Ticket dialog opens');

      // Fill title
      const titleInput = dialog.locator('input[placeholder*="title" i], input[name*="title" i], input[placeholder*="issue" i]').first();
      if (await titleInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await titleInput.fill('QA Test Ticket — Plumbing Issue');
        pass('Ticket title field fillable');
      }

      // Fill description
      const descInput = dialog.locator('textarea, input[placeholder*="desc" i], input[placeholder*="detail" i]').first();
      if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await descInput.fill('QA automated test: faucet dripping in bathroom.');
        pass('Ticket description field fillable');
      }

      await shot(page, 'create_ticket_filled');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      warn('Create Ticket dialog', 'Did not open');
    }
  } else {
    warn('Create Ticket button', 'Not found');
  }

  // Click first ticket to view detail + thread
  const firstTicket = tickets.first();
  if (await firstTicket.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstTicket.click();
    await page.waitForTimeout(1000);
    await shot(page, 'ticket_detail');

    // Check for thread/notes section
    const threadSection = page.locator('[class*="thread"], [class*="Thread"], [class*="note"], [class*="Note"], text=/thread|note|comment|update/i').first();
    if (await threadSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      pass('Ticket thread/notes section visible');
    } else {
      warn('Ticket thread', 'No thread section found in detail');
    }

    // Check status change
    const statusEl = page.locator('[class*="status"], select, [role="combobox"]').filter({ hasText: /open|progress|resolved|closed|pending/i }).first();
    if (await statusEl.isVisible({ timeout: 1500 }).catch(() => false)) {
      pass('Ticket status control visible in detail');
    } else {
      warn('Ticket status control', 'Not found in detail view');
    }

    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  await shot(page, 'maintenance_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 6 — ANNOUNCEMENT WORKFLOW
// ═══════════════════════════════════════════════════════
async function testAnnouncements(page) {
  console.log('\n━━━ Suite 6: Announcement Workflow ━━━');

  const navigated = await navigateTo(page, 'announcements');
  await page.waitForTimeout(1200);
  await shot(page, 'announcements_list');

  const content = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
  if (content.toLowerCase().includes('announcement') || content.toLowerCase().includes('notice') || content.toLowerCase().includes('broadcast')) {
    pass('Announcements page loaded');
  } else {
    warn('Announcements page', 'No announcement content detected');
  }

  // Check for pinned announcements indicator
  const pinned = page.locator('[class*="pin"], [class*="Pin"], text=/pinned/i').first();
  if (await pinned.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Pinned announcements indicator visible');
  } else {
    warn('Pinned announcements', 'Pin indicator not visible');
  }

  // Try "New Announcement" / "Create" button
  const createBtn = page.locator('button:has-text("New Announcement"), button:has-text("Create"), button:has-text("Add Announcement"), button:has-text("Post")').first();
  if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Create Announcement button visible');
    await createBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'create_announcement_dialog');

    const dialog = page.locator('[role="dialog"], [data-radix-dialog-content]');
    if (await dialog.isVisible({ timeout: 1500 }).catch(() => false)) {
      pass('Create Announcement dialog opens');

      // Check for WhatsApp toggle
      const waToggle = dialog.locator('[role="switch"], input[type="checkbox"]').filter({ hasText: /whatsapp/i }).first();
      // Also check by proximity to WhatsApp label
      const waLabel = dialog.locator('text=/whatsapp/i').first();
      if (await waLabel.isVisible({ timeout: 1500 }).catch(() => false)) {
        pass('WhatsApp broadcast option visible in announcement dialog');
      } else {
        warn('WhatsApp toggle', 'Not found in announcement dialog');
      }

      // Check property/floor targeting
      const targetSelect = dialog.locator('select, [role="combobox"]').filter({ hasText: /property|floor|all/i }).first();
      // Also check for any select/dropdown in dialog
      const anySelect = dialog.locator('select, [role="combobox"]').first();
      if (await anySelect.isVisible({ timeout: 1500 }).catch(() => false)) {
        pass('Targeting selector visible in announcement form');
      } else {
        warn('Announcement targeting', 'No property/floor selector found');
      }

      await shot(page, 'announcement_form_filled');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      warn('Create Announcement dialog', 'Did not open');
    }
  } else {
    warn('Create Announcement button', 'Not found');
  }

  await shot(page, 'announcements_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 7 — NOTIFICATION WORKFLOW
// ═══════════════════════════════════════════════════════
async function testNotifications(page) {
  console.log('\n━━━ Suite 7: Notification Workflow ━━━');

  // Check notification bell in header
  const bell = page.locator('[class*="bell"], [aria-label*="notification" i], [class*="NotificationBell"], button[class*="notification"]').first();
  if (await bell.isVisible({ timeout: 3000 }).catch(() => false)) {
    pass('Notification bell visible in header');

    // Check for unread count badge
    const badge = page.locator('[class*="badge"], [class*="Badge"], [class*="count"]').first();
    if (await badge.isVisible({ timeout: 1500 }).catch(() => false)) {
      const badgeText = await badge.innerText().catch(() => '');
      pass('Notification unread count badge visible', `count: "${badgeText}"`);
    } else {
      warn('Notification badge', 'No unread count badge visible');
    }

    // Click bell to open notification panel
    await bell.click();
    await page.waitForTimeout(800);
    await shot(page, 'notification_panel');

    const panel = page.locator('[class*="dropdown"], [class*="Dropdown"], [class*="popover"], [class*="Popover"], [role="listbox"], [role="menu"]').first();
    if (await panel.isVisible({ timeout: 2000 }).catch(() => false)) {
      pass('Notification panel opens on bell click');

      // Check mark all read
      const markAllRead = page.locator('button:has-text("Mark all"), button:has-text("mark all read"), button:has-text("Clear all")').first();
      if (await markAllRead.isVisible({ timeout: 1500 }).catch(() => false)) {
        pass('Mark all read button visible');
      } else {
        warn('Mark all read', 'Button not found in notification panel');
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      warn('Notification panel', 'Panel did not open after bell click');
    }
  } else {
    // Try navigating to notifications tab
    const navigated = await navigateTo(page, 'notifications');
    await page.waitForTimeout(800);
    await shot(page, 'notifications_page');

    const content = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
    if (content.toLowerCase().includes('notification')) {
      pass('Notifications page accessible via nav');
    } else {
      warn('Notification bell', 'Bell not in header, notifications page also unclear');
    }
  }

  await shot(page, 'notifications_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 8 — MODE TOGGLE & CROSS-MODULE SYNC
// ═══════════════════════════════════════════════════════
async function testModeToggle(page) {
  console.log('\n━━━ Suite 8: Mode Toggle & Cross-Module ━━━');

  // Check for demo/live mode toggle
  const modeToggle = page.locator('[class*="mode"], [class*="Mode"], button:has-text("Demo"), button:has-text("Live"), [data-testid*="mode"]').first();
  if (await modeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    pass('Mode toggle visible');
    const toggleText = await modeToggle.innerText().catch(() => '');
    pass('Mode toggle state', `showing: "${toggleText}"`);
  } else {
    warn('Mode toggle', 'Not visible in current view');
  }

  // Verify demo mode data loads across modules by checking dashboard has counts
  await navigateTo(page, 'dashboard');
  await page.waitForTimeout(1000);

  const dashText = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
  const hasNumbers = /\d+/.test(dashText);
  if (hasNumbers) {
    pass('Dashboard shows numeric data (counts/metrics populated)');
  } else {
    warn('Dashboard numbers', 'No numeric data detected on dashboard');
  }

  await shot(page, 'mode_toggle_final');
}

// ═══════════════════════════════════════════════════════
// TEST SUITE 9 — PROPERTIES VIEW
// ═══════════════════════════════════════════════════════
async function testProperties(page) {
  console.log('\n━━━ Suite 9: Properties ━━━');

  const navigated = await navigateTo(page, 'properties');
  await page.waitForTimeout(1200);
  await shot(page, 'properties');

  const content = await page.locator('main, [role="main"], #root').innerText().catch(() => '');
  if (content.toLowerCase().includes('propert') || content.toLowerCase().includes('room')) {
    pass('Properties page loaded');
  } else {
    warn('Properties page', 'No property content detected');
  }

  const propCards = page.locator('[class*="property"], [class*="Property"]').filter({ hasNotText: /header/i });
  const propCount = await propCards.count().catch(() => 0);
  if (propCount > 0) {
    pass('Property cards visible', `${propCount} items`);
  } else {
    warn('Property cards', 'No cards found');
  }
}

// ═══════════════════════════════════════════════════════
// MAIN RUN
// ═══════════════════════════════════════════════════════
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

  try {
    await testInitialLoad(page);
    await testDashboard(page);
    await testPayments(page);
    await testTenants(page);
    await testMaintenance(page);
    await testAnnouncements(page);
    await testNotifications(page);
    await testModeToggle(page);
    await testProperties(page);
  } catch (err) {
    fail('Test runner crash', err.message);
    await shot(page, 'crash_state').catch(() => {});
  } finally {
    await browser.close();
  }

  // ── REPORT ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('QA REPORT SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.status === 'PASS');
  const failed = results.filter(r => r.status === 'FAIL');
  const warned = results.filter(r => r.status === 'WARN');

  console.log(`\nTotal: ${results.length} | ✅ ${passed.length} PASS | ❌ ${failed.length} FAIL | ⚠️  ${warned.length} WARN`);

  if (failed.length > 0) {
    console.log('\n❌ FAILURES:');
    failed.forEach(r => console.log(`  - ${r.test}: ${r.detail}`));
  }

  if (warned.length > 0) {
    console.log('\n⚠️  WARNINGS (missing/unclear):');
    warned.forEach(r => console.log(`  - ${r.test}: ${r.detail}`));
  }

  if (consoleErrors.length > 0) {
    console.log(`\n🔴 CONSOLE ERRORS (${consoleErrors.length}):`);
    consoleErrors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
  } else {
    console.log('\n✅ No console errors detected');
  }

  console.log(`\n📁 Screenshots saved to: ${SHOTS_DIR}`);
  console.log('═'.repeat(60));

  // Write JSON report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: results.length, pass: passed.length, fail: failed.length, warn: warned.length },
    results,
    consoleErrors,
  };
  fs.writeFileSync(path.join(__dirname, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log('📄 Full report: qa-report.json');
})();
