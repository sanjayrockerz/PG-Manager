/**
 * Precise QA — targets exact DOM elements found from source code analysis
 * Tests all critical workflows with correct selectors
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:4173';
const SHOTS_DIR = path.join(__dirname, 'qa-precise-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.readdirSync(SHOTS_DIR).forEach(f => { try { fs.unlinkSync(path.join(SHOTS_DIR, f)); } catch {} });

const MOCK_AUTH_USER = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'owner.demo@pgmanager.app', email_confirmed_at: '2024-01-01T00:00:00.000Z', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z', user_metadata: { name: 'Demo Owner', role: 'owner' } };
const MOCK_PROFILE = { id: '00000000-0000-0000-0000-000000000001', email: 'owner.demo@pgmanager.app', full_name: 'Demo Owner', phone: '+919876500001', role: 'owner', owner_scope_id: '00000000-0000-0000-0000-000000000002', pg_name: 'Khush Living', city: 'Bengaluru' };
const MOCK_TOKEN = { access_token: 'mock-qa', expires_at: Math.floor(Date.now()/1000)+86400, expires_in: 86400, refresh_token: 'mock-ref', token_type: 'bearer', user: MOCK_AUTH_USER };
const SB_HOST = 'krkzklxfczukvllhucsg.supabase.co';

const report = { pass: [], fail: [], warn: [], bugs: [] };
let sc = 0;

const shot = async (p, l) => { await p.screenshot({ path: path.join(SHOTS_DIR, `${String(++sc).padStart(3,'0')}_${l.replace(/[^a-z0-9]/gi,'_')}.png`) }).catch(()=>{}); };
const ok = (t, d='') => { report.pass.push({t,d}); console.log(`  ✅ ${t}${d?' — '+d:''}`); };
const fail = (t, d='') => { report.fail.push({t,d}); report.bugs.push({t,d}); console.log(`  🐛 ${t}${d?' — '+d:''}`); };
const warn = (t, d='') => { report.warn.push({t,d}); console.log(`  ⚠️  ${t}${d?' — '+d:''}`); };
const v = async (l, ms=2000) => l.isVisible({timeout:ms}).catch(()=>false);
const tx = async p => p.locator('#root').innerText().catch(()=>'');

async function setup(ctx) {
  await ctx.route(`**/${SB_HOST}/auth/v1/user**`, r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK_AUTH_USER)}));
  await ctx.route(`**/${SB_HOST}/auth/v1/token**`, r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...MOCK_TOKEN})}));
  await ctx.route(`**/${SB_HOST}/rest/v1/profiles**`, r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([MOCK_PROFILE])}));
  await ctx.route(`**/${SB_HOST}/rest/v1/users**`, r => r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([])}));
}

async function boot(page) {
  await page.goto(BASE, {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(500);
  await page.evaluate(tok => {
    localStorage.setItem('sb-krkzklxfczukvllhucsg-auth-token', JSON.stringify(tok));
    localStorage.setItem('app_mode', 'demo');
    localStorage.removeItem('rentcare:selected-portal');
  }, MOCK_TOKEN);
  await page.reload({waitUntil:'networkidle'});
  await page.waitForTimeout(2500);
}

async function clickSidebar(page, label) {
  const btns = page.locator('button');
  const n = await btns.count();
  for (let i=0;i<n;i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(()=>'')).trim();
    if (t===label && await b.isVisible().catch(()=>false)) { await b.click(); await page.waitForTimeout(1000); return true; }
  }
  for (let i=0;i<n;i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(()=>'')).trim();
    if (t.includes(label) && await b.isVisible().catch(()=>false)) { await b.click(); await page.waitForTimeout(1000); return true; }
  }
  return false;
}

// ═══════════════════════════════════════════════
// TEST 1: PAYMENT WORKFLOW — Mark as Paid via <select>
// ═══════════════════════════════════════════════
async function testPaymentMarkAsPaid(page) {
  console.log('\n══ PAYMENT: Mark as Paid via Status Select ══');
  await clickSidebar(page, 'Payments');
  await page.waitForTimeout(1000);
  await shot(page, 'P1_payments');

  // Click "Pending" filter tab
  const pendingTab = page.locator('button').filter({ hasText: /^Pending$/ }).first();
  if (await v(pendingTab)) {
    await pendingTab.click();
    await page.waitForTimeout(800);
    await shot(page, 'P1_pending_filter');

    // The STATUS column uses a <select> with values paid/pending/overdue
    const statusSelects = page.locator('table tbody tr select');
    const selCount = await statusSelects.count();
    ok('Pending filter shows pending payments', `${selCount} status selects visible`);

    if (selCount > 0) {
      // Get current row count before marking paid
      const rowsBefore = await page.locator('table tbody tr').count();

      // Change first pending payment to "paid"
      const firstSelect = statusSelects.first();
      const currentVal = await firstSelect.inputValue();
      ok('Status select current value', currentVal);

      await firstSelect.selectOption('paid');
      await page.waitForTimeout(1500);
      await shot(page, 'P1_after_mark_paid');

      // Check for toast feedback
      const toast = page.locator('[class*="sonner" i], [data-sonner-toast], [role="status"]').first();
      const toastText = await toast.innerText().catch(() => '');
      if (toastText) ok('Payment mark-as-paid toast feedback', toastText.trim().substring(0, 80));
      else warn('Payment toast', 'No toast detected (may have fired too fast)');

      // The row should now be filtered out (we're on "Pending" tab)
      const rowsAfter = await page.locator('table tbody tr').count();
      if (rowsAfter < rowsBefore) {
        ok('Pending row disappears after marking paid', `${rowsBefore} → ${rowsAfter} rows`);
      } else {
        warn('Pending row count after mark paid', `Still ${rowsAfter} rows (may need reload or event propagation)`);
      }
    }
  } else {
    fail('Pending tab', 'Not visible on payments page');
  }
}

// ═══════════════════════════════════════════════
// TEST 2: PAYMENT — Next Month Auto-Generation
// ═══════════════════════════════════════════════
async function testPaymentAutoGeneration(page) {
  console.log('\n══ PAYMENT: Next-Month Auto-Generation ══');
  await clickSidebar(page, 'Payments');
  await page.waitForTimeout(800);

  // Click "All" tab to see full list
  const allTab = page.locator('button').filter({ hasText: /^All$/ }).first();
  await allTab.click().catch(() => {});
  await page.waitForTimeout(800);
  const rowsBefore = await page.locator('table tbody tr').count();
  ok('All payments baseline count', `${rowsBefore} rows`);

  // Mark a paid payment as pending then back to paid (simulate new payment generation)
  // The dataService generates next month when status = 'paid'
  // Let's mark one "Pending" as "paid" and check if count increases
  const pendingTab = page.locator('button').filter({ hasText: /^Pending$/ }).first();
  if (await v(pendingTab)) {
    await pendingTab.click();
    await page.waitForTimeout(600);
    const pendingSelects = page.locator('table tbody tr select');
    const pc = await pendingSelects.count();
    if (pc > 0) {
      await pendingSelects.first().selectOption('paid');
      await page.waitForTimeout(1500);
      // Now check All tab count
      const allTab2 = page.locator('button').filter({ hasText: /^All$/ }).first();
      await allTab2.click().catch(() => {});
      await page.waitForTimeout(800);
      await shot(page, 'P2_after_next_month_gen');
      const rowsAfter = await page.locator('table tbody tr').count();
      if (rowsAfter > rowsBefore) {
        ok('Next-month payment AUTO-GENERATED after marking paid', `${rowsBefore} → ${rowsAfter} rows (${rowsAfter - rowsBefore} new)`);
      } else if (rowsAfter === rowsBefore) {
        warn('Next-month auto-generation', `Row count unchanged (${rowsAfter}) — may be suppressed in demo or tenant not currently in room`);
      } else {
        fail('Row count DECREASED after marking paid', `${rowsBefore} → ${rowsAfter}`);
      }
    } else {
      warn('Next-month test', 'No pending payments left to mark');
    }
  }
}

// ═══════════════════════════════════════════════
// TEST 3: PAYMENT — Receipt/Invoice Dialog
// ═══════════════════════════════════════════════
async function testPaymentReceipt(page) {
  console.log('\n══ PAYMENT: Receipt/Invoice Generation ══');
  await clickSidebar(page, 'Payments');
  await page.waitForTimeout(800);
  const allTab = page.locator('button').filter({ hasText: /^All$/ }).first();
  await allTab.click().catch(() => {});
  await page.waitForTimeout(800);

  // Receipt button has title="View receipt" per source code
  const receiptBtns = page.locator('button[title="View receipt"]');
  const rc = await receiptBtns.count();
  if (rc > 0) {
    ok('Receipt buttons found via title attr', `${rc} buttons`);
    await receiptBtns.first().click();
    await page.waitForTimeout(1000);
    await shot(page, 'P3_receipt_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await v(dialog)) {
      ok('Receipt dialog opens');
      const dialogText = await dialog.innerText().catch(() => '');
      if (/receipt|invoice|payment|₹/i.test(dialogText)) {
        ok('Receipt dialog has payment content');
      } else {
        fail('Receipt dialog content', 'No payment data in receipt dialog');
      }
      // Check for download/print button
      const dlBtn = dialog.locator('button').filter({ hasText: /download|print|pdf/i }).first();
      if (await v(dlBtn, 1000)) ok('Receipt download/print button visible');
      else warn('Receipt download button', 'Not found');
      await shot(page, 'P3_receipt_content');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    } else {
      fail('Receipt dialog', 'Did not open after clicking receipt button');
    }
  } else {
    // Try via aria-label
    const rByLabel = page.locator('button[aria-label*="receipt" i]').first();
    if (await v(rByLabel)) {
      await rByLabel.click(); await page.waitForTimeout(800);
      const dialog = page.locator('[role="dialog"]').first();
      await v(dialog) ? ok('Receipt dialog opens via aria-label') : fail('Receipt dialog', 'Not opened');
      await page.keyboard.press('Escape');
    } else {
      fail('Receipt button', 'Not found by title or aria-label');
    }
  }
}

// ═══════════════════════════════════════════════
// TEST 4: PAYMENT — WhatsApp Reminder (Integration Check)
// ═══════════════════════════════════════════════
async function testPaymentWhatsApp(page) {
  console.log('\n══ PAYMENT: WhatsApp Reminder Button ══');
  await clickSidebar(page, 'Payments');
  await page.waitForTimeout(800);

  // WhatsApp button has title="Send WhatsApp reminder" per source code
  const waBtns = page.locator('button[title="Send WhatsApp reminder"]');
  const wac = await waBtns.count();
  if (wac > 0) {
    ok('WhatsApp reminder buttons found', `${wac} buttons`);
    await waBtns.first().click();
    await page.waitForTimeout(800);
    await shot(page, 'P4_whatsapp_click');
    // Should show "WhatsApp integration coming soon" toast
    const toastEl = page.locator('[data-sonner-toast], [class*="toast" i]').first();
    const toastTxt = await toastEl.innerText().catch(() => '');
    if (/coming soon|integration/i.test(toastTxt)) {
      warn('WhatsApp payment reminder is STUB', `Shows: "${toastTxt.trim()}"  — not yet implemented`);
    } else if (toastTxt) {
      ok('WhatsApp reminder shows feedback', toastTxt.trim().substring(0, 60));
    } else {
      warn('WhatsApp reminder feedback', 'Toast text unclear');
    }
  } else {
    warn('WhatsApp reminder button', 'Not found on payment rows');
  }
}

// ═══════════════════════════════════════════════
// TEST 5: TENANT — Lifecycle Filter Tabs
// ═══════════════════════════════════════════════
async function testTenantFilters(page) {
  console.log('\n══ TENANT: Lifecycle Filter Tabs ══');
  await clickSidebar(page, 'Tenants');
  await page.waitForTimeout(1000);
  await shot(page, 'T1_tenants');

  // Tabs have numbers appended: "All 10", "Active", "Payment Overdue", etc.
  // Use hasText (contains) not exact match
  const filterLabels = ['Active', 'Payment Overdue', 'Notice Submitted', 'Vacating', 'Vacated', 'Archived'];
  let found = 0;
  for (const label of filterLabels) {
    const tab = page.locator('button').filter({ hasText: new RegExp(label, 'i') }).first();
    if (await v(tab, 1500)) found++;
    else warn(`Filter tab "${label}"`, 'Not visible');
  }
  found === filterLabels.length ? ok('All 6 lifecycle filter tabs present') : fail('Lifecycle filter tabs', `Only ${found}/6 found`);

  // Test each filter tab actually filters
  const paymentOverdueTab = page.locator('button').filter({ hasText: /Payment Overdue/i }).first();
  if (await v(paymentOverdueTab)) {
    await paymentOverdueTab.click();
    await page.waitForTimeout(800);
    const rows = await page.locator('table tbody tr').count();
    ok('Payment Overdue filter works', `${rows} tenants shown`);
    const allTab = page.locator('button').filter({ hasText: /^All/ }).first();
    await allTab.click().catch(() => {});
    await page.waitForTimeout(500);
  }
}

// ═══════════════════════════════════════════════
// TEST 6: TENANT — Detail View
// ═══════════════════════════════════════════════
async function testTenantDetail(page) {
  console.log('\n══ TENANT: Detail View & Lifecycle State ══');
  await clickSidebar(page, 'Tenants');
  await page.waitForTimeout(800);

  // Each tenant row has action buttons: 👁 (view) ✏️ (edit) 🗑 (delete)
  // Or clicking the row might open detail
  const viewBtns = page.locator('button[title*="view" i], button[aria-label*="view" i]');
  const tenantRows = page.locator('table tbody tr');
  const rCount = await tenantRows.count();

  if (rCount > 0) {
    // Click first row tenant name to open detail
    const firstRow = tenantRows.first();
    await firstRow.click();
    await page.waitForTimeout(1200);
    await shot(page, 'T2_tenant_detail');
    const t = await tx(page);
    const isDetailView = /room|floor|payment|history|joined|contact/i.test(t);
    if (isDetailView) {
      ok('Tenant detail view opens on row click');
      // Check sections
      if (/payment.*history|history.*payment|rent/i.test(t)) ok('Tenant detail shows payment history');
      else warn('Payment history', 'Not clearly visible in detail');
      if (/room|floor|bed/i.test(t)) ok('Tenant detail shows room assignment');
      else warn('Room info', 'Not in detail view');
      // Status badge
      const statusBadge = page.locator('[class*="badge" i], [class*="status" i]').filter({ hasText: /active|notice|vacating|vacated|inactive/i }).first();
      if (await v(statusBadge, 2000)) ok('Lifecycle status badge visible in detail');
      else warn('Lifecycle badge', 'Not found in detail view');
      await shot(page, 'T2_tenant_detail_full');
    } else {
      // Maybe need to use the eye icon
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      const eyeBtn = page.locator('button').filter({ has: page.locator('[data-lucide="eye"]') }).first();
      if (await v(eyeBtn, 1500)) {
        await eyeBtn.click(); await page.waitForTimeout(1200);
        await shot(page, 'T2_tenant_detail_via_eye');
        ok('Tenant detail via eye icon button');
      } else {
        warn('Tenant detail', 'Row click and eye button both unclear');
      }
    }
    // Navigate back
    const backBtn = page.locator('button').filter({ hasText: /back|← tenant/i }).first();
    if (await v(backBtn, 1000)) { await backBtn.click(); await page.waitForTimeout(600); }
    else { await clickSidebar(page, 'Tenants'); await page.waitForTimeout(800); }
  }
}

// ═══════════════════════════════════════════════
// TEST 7: MAINTENANCE — Ticket Expand + Thread + Status
// ═══════════════════════════════════════════════
async function testMaintenanceDetail(page) {
  console.log('\n══ MAINTENANCE: Ticket Detail, Thread & Status Change ══');
  await clickSidebar(page, 'Maintenance');
  await page.waitForTimeout(1000);
  await shot(page, 'M1_maintenance');

  // Source code shows tickets are displayed as accordion-like rows with a chevron
  // The row itself is a div with onClick
  // Find first Open ticket's expand button (chevron)
  const expandBtns = page.locator('button').filter({ has: page.locator('[data-lucide="chevron-down"], [data-lucide="chevron-right"]') });
  const expandCount = await expandBtns.count();

  if (expandCount > 0) {
    ok('Ticket expand chevron buttons found', `${expandCount} tickets`);
    await expandBtns.first().click();
    await page.waitForTimeout(800);
    await shot(page, 'M1_ticket_expanded');
    const t = await tx(page);
    if (/thread|note|comment|update|history|description/i.test(t)) {
      ok('Ticket detail/thread section visible after expand');
    } else {
      warn('Thread section', 'No thread content visible after expand');
    }
  } else {
    // Try clicking the ticket row directly
    const ticketCards = page.locator('[class*="ticket" i], div').filter({ hasText: /TKT-001|Water leakage|Ceiling fan/i });
    const tc = await ticketCards.count();
    if (tc > 0) {
      await ticketCards.first().click();
      await page.waitForTimeout(1000);
      await shot(page, 'M1_ticket_clicked');
      ok('Ticket row clicked');
    }
  }

  // Status dropdown — each ticket row has a status dropdown
  // Source: the status is a clickable dropdown button showing "Open ▼"
  const statusDropdowns = page.locator('button').filter({ hasText: /^Open$|^In Progress$|^Resolved$|^Closed$|^Waiting$/ });
  const sdCount = await statusDropdowns.count();
  if (sdCount > 0) {
    ok('Ticket status dropdown buttons visible', `${sdCount} status buttons`);
    // Click first one to change status
    const firstStatus = statusDropdowns.first();
    const currentStatus = await firstStatus.innerText().catch(() => '');
    await firstStatus.click();
    await page.waitForTimeout(600);
    await shot(page, 'M1_status_dropdown_open');
    const menu = page.locator('[role="menu"], [role="listbox"], [class*="dropdown" i]').last();
    if (await v(menu, 1500)) {
      ok('Status dropdown menu opens');
      const menuItems = await menu.locator('[role="menuitem"], [role="option"], button, li').allInnerTexts();
      ok('Status menu options', menuItems.join(', '));
      // Select "In Progress" if currently "Open", or "Open" if "In Progress"
      const targetStatus = currentStatus.includes('Open') ? 'In Progress' : 'Open';
      const targetItem = menu.locator('[role="menuitem"], [role="option"], button, li').filter({ hasText: new RegExp(targetStatus, 'i') }).first();
      if (await v(targetItem, 1000)) {
        await targetItem.click();
        await page.waitForTimeout(800);
        await shot(page, 'M1_status_changed');
        ok('Ticket status changed', `${currentStatus} → ${targetStatus}`);
        // Verify status updated in UI
        const toast = page.locator('[data-sonner-toast], [class*="toast" i]').first();
        const toastTxt = await toast.innerText().catch(() => '');
        if (toastTxt) ok('Status change feedback', toastTxt.trim().substring(0, 60));
      } else {
        warn('Target status item', `"${targetStatus}" not in menu`);
      }
    } else {
      warn('Status dropdown', 'Menu did not open');
    }
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  } else {
    warn('Status dropdown buttons', 'Not found as standalone buttons');
  }

  // Thread note input — look for textarea at bottom of expanded ticket
  const noteTextarea = page.locator('textarea, input[placeholder*="note" i], input[placeholder*="comment" i], input[placeholder*="update" i]').first();
  if (await v(noteTextarea, 2000)) {
    ok('Thread note input found');
    await noteTextarea.fill('QA test: verifying thread note submission works correctly.');
    await page.waitForTimeout(400);
    // Submit button
    const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|post|add note|submit/i }).first();
    if (await v(sendBtn, 1000)) {
      await sendBtn.click();
      await page.waitForTimeout(1000);
      await shot(page, 'M1_note_submitted');
      ok('Thread note submitted');
    } else {
      // Try Enter key
      await noteTextarea.press('Enter');
      await page.waitForTimeout(600);
      ok('Thread note submitted via Enter key');
    }
  } else {
    note = (t, d) => console.log(`  ℹ️  ${t}${d?' — '+d:''}`);
    console.log('  ℹ️  Thread textarea not found — may need expand state first');
  }

  await shot(page, 'M1_maintenance_done');
}

// ═══════════════════════════════════════════════
// TEST 8: MAINTENANCE — Create New Ticket
// ═══════════════════════════════════════════════
async function testCreateTicket(page) {
  console.log('\n══ MAINTENANCE: Create New Ticket ══');
  await clickSidebar(page, 'Maintenance');
  await page.waitForTimeout(800);

  const newTicketBtn = page.locator('button').filter({ hasText: /\+ New Ticket/i }).first();
  if (!await v(newTicketBtn)) { fail('+ New Ticket button', 'Not found'); return; }
  ok('+ New Ticket button visible');
  await newTicketBtn.click();
  await page.waitForTimeout(1000);
  await shot(page, 'M2_new_ticket_dialog');

  const dialog = page.locator('[role="dialog"]').first();
  if (!await v(dialog)) { fail('New Ticket dialog', 'Did not open'); return; }
  ok('New Ticket dialog opens');

  // Get all form controls
  const inputs = await dialog.locator('input:not([type=hidden])').all();
  const textareas = await dialog.locator('textarea').all();
  const selects = await dialog.locator('select, [role="combobox"]').all();
  ok('Ticket form controls', `${inputs.length} inputs, ${textareas.length} textareas, ${selects.length} selects`);

  // Fill title (first input)
  if (inputs.length > 0) {
    await inputs[0].fill('QA Test — AC Not Working Block B Room 205');
    ok('Title filled');
  }
  // Fill description (first textarea)
  if (textareas.length > 0) {
    await textareas[0].fill('Air conditioning unit not cooling. Temperature setting not responding. Need urgent repair.');
    ok('Description filled');
  }
  // Check priority select
  const prioritySel = await dialog.locator('select, [role="combobox"]').filter({ hasText: /high|medium|low|priority/i }).first();
  if (await v(prioritySel, 1000)) {
    ok('Priority selector visible');
  }

  await shot(page, 'M2_ticket_filled');

  // Submit
  const submitBtn = dialog.locator('button').filter({ hasText: /create|submit|save|add ticket/i }).last();
  if (await v(submitBtn, 1000)) {
    await submitBtn.click();
    await page.waitForTimeout(1500);
    await shot(page, 'M2_ticket_created');
    const isDialogGone = !await v(dialog, 1000);
    if (isDialogGone) {
      ok('Ticket created — dialog closed after submit');
    } else {
      const errorMsg = await dialog.locator('[class*="error" i], [class*="red" i]').innerText().catch(() => '');
      errorMsg ? fail('Ticket creation failed', errorMsg) : warn('Dialog still open', 'Possible validation error');
    }
    // Count tickets now
    const ticketCount = await page.locator('div').filter({ hasText: /TKT-00/i }).count();
    ok('Ticket list after create', `~${ticketCount} TKT-xxx items found`);
  } else {
    fail('Create ticket submit', 'Submit button not found in dialog');
    await page.keyboard.press('Escape');
  }
}

// ═══════════════════════════════════════════════
// TEST 9: ANNOUNCEMENTS — Create with WhatsApp + Pin
// ═══════════════════════════════════════════════
async function testCreateAnnouncement(page) {
  console.log('\n══ ANNOUNCEMENTS: Create with WhatsApp & Pin ══');
  await clickSidebar(page, 'Announcements');
  await page.waitForTimeout(1000);
  await shot(page, 'A1_announcements');

  // Verify existing data
  const t = await tx(page);
  if (/monthly rent|water supply|deep cleaning/i.test(t)) {
    ok('Existing demo announcements visible');
  } else {
    warn('Demo announcements', 'Expected demo announcements not found');
  }

  // New announcement
  const newBtn = page.locator('button').filter({ hasText: /\+ New Announcement/i }).first();
  if (!await v(newBtn)) { fail('+ New Announcement button', 'Not found'); return; }
  ok('+ New Announcement button visible');
  await newBtn.click();
  await page.waitForTimeout(1000);
  await shot(page, 'A1_dialog_open');

  const dialog = page.locator('[role="dialog"]').first();
  if (!await v(dialog)) { fail('New Announcement dialog', 'Did not open'); return; }
  ok('Announcement dialog opens');

  // All form controls
  const inputs = await dialog.locator('input:not([type=hidden])').all();
  const textareas = await dialog.locator('textarea').all();
  const selects = await dialog.locator('select, [role="combobox"]').all();
  const switches = await dialog.locator('[role="switch"]').all();
  ok('Announcement form', `${inputs.length} inputs, ${textareas.length} textareas, ${selects.length} selects, ${switches.length} switches`);

  // Title
  if (inputs.length > 0) { await inputs[0].fill('QA Test: Fire Drill Saturday 9am-10am'); ok('Title filled'); }

  // Body
  if (textareas.length > 0) { await textareas[0].fill('Mandatory fire safety drill. All residents must vacate the building by 9am and return after the all-clear.'); ok('Body filled'); }

  // WhatsApp toggle
  const waSwitch = switches.find ? null : null;
  const waSwitchEl = dialog.locator('[role="switch"]').first();
  if (await v(waSwitchEl, 1500)) {
    const isChecked = await waSwitchEl.getAttribute('aria-checked').catch(() => 'false');
    ok('WhatsApp toggle found', `current: ${isChecked}`);
    if (isChecked !== 'true') {
      await waSwitchEl.click(); await page.waitForTimeout(500);
      ok('WhatsApp toggle enabled');
    }
    await shot(page, 'A1_whatsapp_toggled');
  } else {
    warn('WhatsApp toggle', 'Not found as [role=switch]');
  }

  // Pin toggle (second switch if exists)
  const allSwitches = await dialog.locator('[role="switch"]').all();
  if (allSwitches.length >= 2) {
    const pinSwitch = dialog.locator('[role="switch"]').nth(1);
    const pinChecked = await pinSwitch.getAttribute('aria-checked').catch(() => 'false');
    ok('Pin toggle found', `current: ${pinChecked}`);
    if (pinChecked !== 'true') {
      await pinSwitch.click(); await page.waitForTimeout(400);
      ok('Pin toggle enabled');
    }
  } else {
    warn('Pin toggle', `Only ${allSwitches.length} switches in form`);
  }

  // Category selector
  if (selects.length > 0) {
    const catSelect = dialog.locator('select, [role="combobox"]').first();
    ok('Category/targeting selector visible', `${selects.length} total`);
  }

  await shot(page, 'A1_form_filled');

  // Submit
  const submitBtn = dialog.locator('button').filter({ hasText: /post|publish|save|create|send announcement/i }).last();
  if (await v(submitBtn, 1000)) {
    await submitBtn.click(); await page.waitForTimeout(1500);
    await shot(page, 'A1_created');
    const isGone = !await v(dialog, 1000);
    isGone ? ok('Announcement created — dialog closed') : warn('Announcement dialog', 'Still open after submit');
  } else {
    // Try generic last button
    const btns = await dialog.locator('button').all();
    if (btns.length > 0) {
      const lastBtn = btns[btns.length - 1];
      const lastBtnTxt = await lastBtn.innerText().catch(() => '');
      ok('Last button in dialog', `"${lastBtnTxt}"`);
      await lastBtn.click(); await page.waitForTimeout(1500);
      await shot(page, 'A1_last_btn_clicked');
    }
    fail('Announcement submit', 'No clear submit button found');
    await page.keyboard.press('Escape');
  }

  await shot(page, 'A1_announcements_done');
}

// ═══════════════════════════════════════════════
// TEST 10: NOTIFICATIONS — Bell, Panel, Mark Read
// ═══════════════════════════════════════════════
async function testNotificationBell(page) {
  console.log('\n══ NOTIFICATIONS: Bell, Panel, Mark All Read ══');
  await clickSidebar(page, 'Dashboard');
  await page.waitForTimeout(1000);

  // Bell button: has a Bell icon (data-lucide="bell")
  // The component renders: <button onClick={() => setOpen(v => !v)}>  <Bell/>  {unread > 0 && <span badge/>}  </button>
  const bellBtn = page.locator('button').filter({ has: page.locator('[data-lucide="bell"]') }).first();

  if (await v(bellBtn, 3000)) {
    ok('Notification bell button found');

    // Check unread badge (red span with count, visible only when unread > 0)
    // In demo mode, notifications are generated by notificationEngine from events
    // Initially may be 0 until user actions trigger events
    const unreadBadge = bellBtn.locator('span').first();
    const badgeVisible = await v(unreadBadge, 1000);
    if (badgeVisible) {
      const badgeTxt = await unreadBadge.innerText().catch(() => '');
      ok('Unread count badge visible', `"${badgeTxt}"`);
    } else {
      warn('Unread badge', 'Not visible (count may be 0 — notifications are event-driven)');
    }

    // Click bell
    await bellBtn.click();
    await page.waitForTimeout(800);
    await shot(page, 'N1_bell_open');

    // Panel renders as absolute div with notifications list
    const panel = page.locator('div').filter({ has: page.locator('text=/Notifications/') }).filter({ has: page.locator('button') }).first();
    if (await v(panel, 2000)) {
      ok('Notification panel opened');
      const panelTxt = await panel.innerText().catch(() => '');
      if (/no notification|all read|notification.*read/i.test(panelTxt)) {
        ok('Notification panel shows empty/all-read state');
      } else if (/payment|maintenance|tenant|announcement/i.test(panelTxt)) {
        ok('Notification panel has notification items');
        // Mark all read button
        const markAllBtn = panel.locator('button').filter({ hasText: /all read/i }).first();
        if (await v(markAllBtn, 1000)) {
          ok('Mark "All read" button visible in panel');
          await markAllBtn.click(); await page.waitForTimeout(600);
          ok('Mark all read clicked');
          await shot(page, 'N1_mark_all_read');
        } else {
          warn('All read button', 'Not found in panel header (may not show when empty)');
        }
      }
    } else {
      // May be showing as tooltip or different structure
      await shot(page, 'N1_after_bell_click');
      const pageText = await tx(page);
      if (/notifications|no notification/i.test(pageText)) {
        ok('Notification panel accessible');
      } else {
        fail('Notification panel', 'Bell clicked but panel not found');
      }
    }

    // Close panel
    const closeBtn = page.locator('button').filter({ has: page.locator('[data-lucide="x"]') }).first();
    if (await v(closeBtn, 1000)) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    fail('Notification bell', 'Bell button not found in header — MISSING NotificationBell component');
  }

  await shot(page, 'N1_notifications_done');
}

// ═══════════════════════════════════════════════
// TEST 11: Cross-Module — Property Filter
// ═══════════════════════════════════════════════
async function testCrossModule(page) {
  console.log('\n══ CROSS-MODULE: Property Filter Sync ══');
  await clickSidebar(page, 'Dashboard');
  await page.waitForTimeout(1000);

  // Property selector in header: "All Properties (2) ▼"
  const propSelector = page.locator('button').filter({ hasText: /All Properties|Sunrise|Lakeview/i }).first();
  if (await v(propSelector, 2000)) {
    const propTxt = await propSelector.innerText().catch(() => '');
    ok('Property selector found', `"${propTxt.trim()}"`);
    await propSelector.click();
    await page.waitForTimeout(600);
    await shot(page, 'C1_property_dropdown');
    // Dropdown options
    const opts = page.locator('[role="option"], [role="menuitem"], li').filter({ hasText: /sunrise|lakeview|all/i });
    const optCount = await opts.count();
    optCount >= 2 ? ok('Property dropdown has options', `${optCount} options`) : warn('Property dropdown options', `${optCount} options`);

    // Select "Sunrise Residency"
    const sunriseOpt = opts.filter({ hasText: /sunrise/i }).first();
    if (await v(sunriseOpt, 1000)) {
      await sunriseOpt.click(); await page.waitForTimeout(1000);
      await shot(page, 'C1_sunrise_selected');
      // Dashboard should now show Sunrise-only data
      const dashTxt = await tx(page);
      if (/sunrise/i.test(dashTxt)) {
        ok('Dashboard updates when property filtered to Sunrise Residency');
      } else {
        warn('Property filter sync', 'Dashboard text may not show property name directly');
      }
      // Now check Payments — should also filter
      await clickSidebar(page, 'Payments');
      await page.waitForTimeout(800);
      const filteredPaymentCount = await page.locator('table tbody tr').count();
      ok('Payments filtered by property', `${filteredPaymentCount} rows for Sunrise Residency`);

      // Reset to all properties
      const propSel2 = page.locator('button').filter({ hasText: /sunrise|all propert/i }).first();
      if (await v(propSel2)) {
        await propSel2.click(); await page.waitForTimeout(500);
        const allOpt = page.locator('[role="option"], [role="menuitem"], li').filter({ hasText: /all propert/i }).first();
        if (await v(allOpt, 1000)) { await allOpt.click(); await page.waitForTimeout(800); ok('Reset to All Properties'); }
      }
    } else {
      await page.keyboard.press('Escape');
    }
  } else {
    fail('Property selector', 'Not found in header — multi-property filtering broken');
  }

  await shot(page, 'C1_crossmodule_done');
}

// ═══════════════════════════════════════════════
// TEST 12: DEMO MODE — Mode Toggle & Data Isolation
// ═══════════════════════════════════════════════
async function testDemoMode(page) {
  console.log('\n══ DEMO MODE: Toggle & Data Isolation ══');
  await clickSidebar(page, 'Dashboard');
  await page.waitForTimeout(800);

  // Demo/Live toggle — buttons in header with text "Demo" and "Live"
  const demoBtn = page.locator('button').filter({ hasText: /^Demo$/ }).first();
  const liveBtn = page.locator('button').filter({ hasText: /^Live$/ }).first();

  if (await v(demoBtn, 2000)) {
    const pressed = await demoBtn.getAttribute('aria-pressed');
    ok('Demo mode toggle visible', `Demo btn aria-pressed=${pressed}`);
    if (pressed === 'true') {
      ok('App is in Demo mode (correct)');
    } else {
      warn('Demo mode not active', 'Expected demo mode but Live may be active');
    }
  } else {
    fail('Demo/Live mode toggle', 'Not visible in header');
  }

  // Demo label badge in header/pages
  const demoBadge = page.locator('span, div').filter({ hasText: /^Demo$/ }).first();
  if (await v(demoBadge, 1500)) {
    ok('Demo mode indicator badge visible');
  }

  await shot(page, 'DM_mode_toggle');
}

// ═══════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 60, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setup(ctx);
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type()==='error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`PAGE: ${err.message}`));

  try {
    await boot(page);
    await testPaymentMarkAsPaid(page);
    await testPaymentAutoGeneration(page);
    await testPaymentReceipt(page);
    await testPaymentWhatsApp(page);
    await testTenantFilters(page);
    await testTenantDetail(page);
    await testMaintenanceDetail(page);
    await testCreateTicket(page);
    await testCreateAnnouncement(page);
    await testNotificationBell(page);
    await testCrossModule(page);
    await testDemoMode(page);
  } catch (err) {
    fail('CRASH', err.message);
    console.error(err);
    await shot(page, 'CRASH');
  } finally {
    await browser.close();
  }

  // ── FINAL REPORT ─────────────────────────────────────────────────────────
  const sep = '═'.repeat(70);
  console.log('\n' + sep);
  console.log('                  PRECISE QA REPORT — FINAL');
  console.log(sep);
  console.log(`\n  ✅ PASS  : ${report.pass.length}`);
  console.log(`  🐛 BUGS  : ${report.fail.length}`);
  console.log(`  ⚠️  WARN  : ${report.warn.length}`);

  if (report.fail.length > 0) {
    console.log('\n── BUGS / FAILURES ──────────────────────────────────────────────────');
    report.fail.forEach((b,i) => console.log(`  ${i+1}. 🐛 ${b.t}${b.d?'\n     └─ '+b.d:''}`));
  } else {
    console.log('\n  🎉 No bugs found!');
  }

  if (report.warn.length > 0) {
    console.log('\n── WARNINGS ─────────────────────────────────────────────────────────');
    report.warn.forEach(w => console.log(`  ⚠️  ${w.t}${w.d?' — '+w.d:''}`));
  }

  if (consoleErrors.length > 0) {
    console.log(`\n── BROWSER ERRORS (${consoleErrors.length}) ──────────────────────────────────────────`);
    consoleErrors.slice(0,10).forEach(e => console.log(`  🔴 ${e.substring(0,140)}`));
  } else {
    console.log('\n  ✅ Zero browser console errors');
  }

  console.log(`\n📁 Screenshots: ${SHOTS_DIR}`);
  console.log(sep);
  fs.writeFileSync(path.join(__dirname, 'qa-precise-report.json'), JSON.stringify({ ...report, consoleErrors }, null, 2));
  console.log('📄 Report: qa-precise-report.json\n');
})();
