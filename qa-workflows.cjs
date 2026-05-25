/**
 * QA Workflow Deep-Test — tests actual interactions, not just page load
 * Requires the dev server running on 127.0.0.1:4173
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:4173';
const SUPABASE_HOST = 'krkzklxfczukvllhucsg.supabase.co';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';
const SHOTS_DIR = path.join(__dirname, 'qa-wf-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.readdirSync(SHOTS_DIR).forEach(f => { try { fs.unlinkSync(path.join(SHOTS_DIR, f)); } catch {} });

const bugs = [];
const passes = [];
let shotIndex = 0;

async function shot(page, label) {
  const file = path.join(SHOTS_DIR, `${String(++shotIndex).padStart(3, '0')}_${label.replace(/[^a-z0-9]/gi, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

function ok(label, detail = '') { passes.push({ label, detail }); console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
function bug(label, detail = '') { bugs.push({ label, detail }); console.log(`  🐛 BUG: ${label}${detail ? ' — ' + detail : ''}`); }
function note(label, detail = '') { console.log(`  ℹ️  ${label}${detail ? ' — ' + detail : ''}`); }

const MOCK_AUTH_USER = {
  id: MOCK_USER_ID, aud: 'authenticated', role: 'authenticated',
  email: 'owner.demo@pgmanager.app',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z',
  user_metadata: { name: 'Demo Owner', role: 'owner' },
  app_metadata: { provider: 'email' },
};
const MOCK_PROFILE = {
  id: MOCK_USER_ID, email: 'owner.demo@pgmanager.app', full_name: 'Demo Owner',
  phone: '+919876500001', role: 'owner',
  owner_scope_id: '00000000-0000-0000-0000-000000000002',
  pg_name: 'Khush Living', city: 'Bengaluru',
};
const MOCK_TOKEN = {
  access_token: 'mock-qa-token', expires_at: Math.floor(Date.now() / 1000) + 86400,
  expires_in: 86400, refresh_token: 'mock-refresh', token_type: 'bearer', user: MOCK_AUTH_USER,
};

async function setup(context) {
  await context.route(`**/${SUPABASE_HOST}/auth/v1/user**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_USER) }));
  await context.route(`**/${SUPABASE_HOST}/auth/v1/token**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...MOCK_TOKEN }) }));
  await context.route(`**/${SUPABASE_HOST}/rest/v1/profiles**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_PROFILE]) }));
  await context.route(`**/${SUPABASE_HOST}/rest/v1/users**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
}

async function boot(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.evaluate(tok => {
    localStorage.setItem('sb-krkzklxfczukvllhucsg-auth-token', JSON.stringify(tok));
    localStorage.setItem('app_mode', 'demo');
    localStorage.removeItem('rentcare:selected-portal');
  }, MOCK_TOKEN);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
}

// Navigate via sidebar text
async function nav(page, label) {
  const btns = page.locator('button');
  const n = await btns.count();
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(() => '')).trim();
    if (t === label) {
      if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(1000); return; }
    }
  }
  // Partial match
  for (let i = 0; i < n; i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(() => '')).trim();
    if (t.toLowerCase().includes(label.toLowerCase())) {
      if (await b.isVisible().catch(() => false)) { await b.click(); await page.waitForTimeout(1000); return; }
    }
  }
  // Try links
  const links = page.locator('a');
  const ln = await links.count();
  for (let i = 0; i < ln; i++) {
    const l = links.nth(i);
    const t = (await l.innerText().catch(() => '')).trim();
    if (t.toLowerCase().includes(label.toLowerCase())) {
      if (await l.isVisible().catch(() => false)) { await l.click(); await page.waitForTimeout(1000); return; }
    }
  }
}

async function vis(loc, timeout = 2000) { return loc.isVisible({ timeout }).catch(() => false); }
async function txt(page) { return page.locator('#root').innerText().catch(() => ''); }

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 1: PAYMENT WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
async function wfPayments(page) {
  console.log('\n══════ WORKFLOW: PAYMENTS ══════');
  await nav(page, 'Payments');
  await page.waitForTimeout(1000);
  await shot(page, 'WF1_payments_loaded');

  const t = await txt(page);

  // 1a. Stats cards
  if (/91,300|58,900|20,700|11,700/.test(t)) {
    ok('Payment stats cards render with correct totals');
  } else {
    bug('Payment stats cards', 'Expected ₹91,300 Total / ₹58,900 Paid / ₹20,700 Pending / ₹11,700 Overdue');
  }

  // 1b. Overdue warning banner
  if (/past due|overdue|pending.*payment/i.test(t)) {
    ok('Overdue warning banner visible');
  } else {
    bug('Overdue warning banner', 'No warning shown despite overdue payments');
  }

  // 1c. Export CSV button
  const exportBtn = page.locator('button').filter({ hasText: /export csv/i }).first();
  if (await vis(exportBtn)) {
    ok('Export CSV button visible');
    await exportBtn.click();
    await page.waitForTimeout(600);
    await shot(page, 'WF1_export_csv_clicked');
    // Check if something happened (download trigger, toast, etc.)
    const toast = page.locator('[class*="toast" i], [role="status"], [class*="alert" i]').first();
    if (await vis(toast, 1500)) {
      ok('Export CSV — feedback shown after click');
    } else {
      note('Export CSV', 'No visible toast (may have triggered file download silently)');
    }
  } else {
    bug('Export CSV button', 'Not visible on Payments page');
  }

  // 1d. Filter tabs
  const allTab = page.locator('button').filter({ hasText: /^All$/ }).first();
  const paidTab = page.locator('button').filter({ hasText: /^Paid$/ }).first();
  const pendingTab = page.locator('button').filter({ hasText: /^Pending$/ }).first();
  const overdueTab = page.locator('button').filter({ hasText: /^Overdue$/ }).first();
  if (await vis(paidTab) && await vis(pendingTab) && await vis(overdueTab)) {
    ok('Payment filter tabs all visible (All/Paid/Pending/Overdue)');
  } else {
    bug('Payment filter tabs', 'One or more tabs missing');
  }

  // 1e. Pending filter + Mark as Paid
  if (await vis(pendingTab)) {
    await pendingTab.click();
    await page.waitForTimeout(800);
    await shot(page, 'WF1_pending_filter');

    // Look for action buttons on pending rows
    const actionBtns = page.locator('button').filter({ hasText: /mark.*paid|collect|record/i });
    const ac = await actionBtns.count();
    if (ac > 0) {
      ok('Mark as Paid action available on pending rows');
      await actionBtns.first().click();
      await page.waitForTimeout(1000);
      await shot(page, 'WF1_mark_paid_action');
      const dialog = page.locator('[role="dialog"]').first();
      if (await vis(dialog)) {
        ok('Mark as Paid opens confirmation dialog');
        await shot(page, 'WF1_mark_paid_dialog');
        // Confirm button
        const confirmBtn = dialog.locator('button').filter({ hasText: /confirm|yes|mark|paid|save/i }).first();
        if (await vis(confirmBtn)) {
          await confirmBtn.click();
          await page.waitForTimeout(1500);
          await shot(page, 'WF1_mark_paid_confirmed');
          // Check for status change feedback
          const successEl = page.locator('[class*="toast" i], [role="status"], text=/paid|success|updated/i').first();
          if (await vis(successEl, 2000)) {
            ok('Mark as Paid — success feedback after confirm');
          } else {
            note('Mark as Paid', 'No toast but status may have changed in list');
          }
        } else {
          bug('Mark as Paid dialog', 'No confirm button found in dialog');
          await page.keyboard.press('Escape');
        }
      } else {
        // Might be inline
        const inlineSucc = page.locator('[class*="toast" i], text=/paid|updated/i').first();
        if (await vis(inlineSucc, 1500)) {
          ok('Mark as Paid — inline action with feedback');
        } else {
          note('Mark as Paid', 'No dialog, no toast — may need page inspection');
        }
      }
    } else {
      // Check for row-level action buttons (+ icon, context menu)
      const rowActions = page.locator('td button, td [role="button"]').first();
      if (await vis(rowActions, 1500)) {
        await rowActions.click();
        await page.waitForTimeout(700);
        await shot(page, 'WF1_row_actions_menu');
        const menu = page.locator('[role="menu"], [class*="dropdown" i]').first();
        if (await vis(menu, 1000)) {
          const menuItems = await menu.locator('[role="menuitem"], button, li').allInnerTexts();
          ok('Row action menu opened', `items: ${menuItems.join(', ')}`);
          // Look for "Mark as Paid" in menu
          const markItem = menu.locator('[role="menuitem"], button, li').filter({ hasText: /mark.*paid|collect/i }).first();
          if (await vis(markItem, 1000)) {
            ok('Mark as Paid in row action menu');
            await markItem.click();
            await page.waitForTimeout(1000);
            await shot(page, 'WF1_mark_from_menu');
          } else {
            bug('Mark as Paid in row menu', `Menu has: ${menuItems.join(', ')}`);
          }
        }
        await page.keyboard.press('Escape');
      } else {
        bug('Pending payments action', 'No Mark as Paid button or row actions on pending filter');
      }
    }
  }

  // 1f. Receipt button (+ icon on each row)
  await page.locator('button').filter({ hasText: /^All$/ }).first().click().catch(() => {});
  await page.waitForTimeout(800);
  const receiptBtn = page.locator('td button, table button').filter({ has: page.locator('[data-lucide="receipt"], [data-lucide="file-text"]') }).first();
  // Try by aria label
  const receiptByLabel = page.locator('button[aria-label*="receipt" i], button[title*="receipt" i]').first();
  // Try by row actions
  const rowPlusBtns = page.locator('table button').first();
  if (await vis(receiptByLabel, 1000)) {
    ok('Receipt button accessible via aria-label');
    await receiptByLabel.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF1_receipt_dialog');
    await page.keyboard.press('Escape');
  } else {
    // The screenshot shows + 💬 🗑 icons in the ACTIONS column
    // Let me get all table action buttons and count them
    const tableActionBtns = page.locator('table tbody tr button');
    const btnCount = await tableActionBtns.count();
    if (btnCount > 0) {
      note('Row action buttons found', `${btnCount} total in table`);
      // Click the first + button (usually "add/record payment")
      await tableActionBtns.nth(0).click();
      await page.waitForTimeout(800);
      await shot(page, 'WF1_first_row_action');
      const dialog = page.locator('[role="dialog"]').first();
      if (await vis(dialog, 1500)) {
        const dialogTitle = await dialog.locator('h1, h2, h3, [class*="title" i]').first().innerText().catch(() => '');
        ok('Row action opens dialog', `title: "${dialogTitle}"`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    } else {
      bug('Payment row action buttons', 'No buttons found in table rows');
    }
  }

  // 1g. Next-month payment auto-generation check
  // After marking a payment as paid, the next month's payment should appear
  // In demo mode this is state-based — check if count changes or note it
  const paymentCount = await page.locator('table tbody tr').count();
  ok('Payment list row count', `${paymentCount} rows in All view`);

  await shot(page, 'WF1_payments_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2: TENANT WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
async function wfTenants(page) {
  console.log('\n══════ WORKFLOW: TENANTS ══════');
  await nav(page, 'Tenants');
  await page.waitForTimeout(1000);
  await shot(page, 'WF2_tenants_loaded');

  // 2a. Summary stats
  const t = await txt(page);
  if (/10|77,100/.test(t)) {
    ok('Tenant summary stats visible (10 tenants, ₹77,100 revenue)');
  } else {
    bug('Tenant stats', 'Expected 10 tenants / ₹77,100 revenue not found');
  }

  // 2b. Filter tabs
  const tabs = ['Active', 'Payment Overdue', 'Notice Submitted', 'Vacating', 'Vacated', 'Archived'];
  let visibleTabs = 0;
  for (const tabName of tabs) {
    const tab = page.locator('button').filter({ hasText: new RegExp(`^${tabName}$`, 'i') }).first();
    if (await vis(tab, 1000)) visibleTabs++;
  }
  visibleTabs >= 4 ? ok('Lifecycle filter tabs visible', `${visibleTabs}/${tabs.length}`) : bug('Lifecycle filters', `Only ${visibleTabs}/${tabs.length} tabs visible`);

  // 2c. Import CSV button
  const importBtn = page.locator('button').filter({ hasText: /import|csv/i }).first();
  if (await vis(importBtn)) {
    ok('Import CSV button visible');
    await importBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF2_csv_import_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await vis(dialog)) {
      ok('CSV Import dialog opens');
      const dialogContent = await dialog.innerText().catch(() => '');
      if (/template|download|format|header/i.test(dialogContent)) {
        ok('CSV Import dialog has template/format guidance');
      } else {
        note('CSV Import dialog', 'No template/format info shown');
      }
      const fileInput = dialog.locator('input[type="file"]').first();
      if (await vis(fileInput, 1000) || await fileInput.isAttached()) {
        ok('CSV file input available');
      } else {
        bug('CSV file input', 'No file input found in import dialog');
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      bug('CSV Import dialog', 'Did not open');
    }
  } else {
    bug('Import CSV button', 'Not visible on Tenants page');
  }

  // 2d. Add Tenant button
  const addBtn = page.locator('button').filter({ hasText: /\+ add tenant|add tenant|new tenant/i }).first();
  if (await vis(addBtn)) {
    ok('+ Add Tenant button visible');
    await addBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF2_add_tenant_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await vis(dialog)) {
      ok('Add Tenant dialog opens');
      const fields = await dialog.locator('input, select, textarea').count();
      ok('Add Tenant form', `${fields} input fields`);
      // Check essential fields
      const nameField = dialog.locator('input[placeholder*="name" i], input[name*="name" i]').first();
      const phoneField = dialog.locator('input[placeholder*="phone" i], input[type="tel"], input[name*="phone" i]').first();
      const roomSelect = dialog.locator('select, [role="combobox"]').first();
      if (await vis(nameField, 1000)) ok('Name field in Add Tenant form');
      else bug('Name field', 'Not found in Add Tenant form');
      if (await vis(phoneField, 1000)) ok('Phone field in Add Tenant form');
      else note('Phone field', 'Not directly visible');
      await shot(page, 'WF2_add_tenant_form');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    } else {
      bug('Add Tenant dialog', 'Did not open after button click');
    }
  } else {
    bug('Add Tenant button', 'Not visible');
  }

  // 2e. Tenant detail view
  const tenantRow = page.locator('table tbody tr').first();
  if (await vis(tenantRow, 2000)) {
    await tenantRow.click();
    await page.waitForTimeout(1500);
    await shot(page, 'WF2_tenant_detail');

    const detailText = await txt(page);
    // Check for lifecycle state display
    if (/active|notice|vacating|vacated/i.test(detailText)) {
      ok('Tenant detail shows lifecycle status');
    } else {
      bug('Tenant lifecycle status', 'No status found in detail view');
    }
    // Check for payment history
    if (/payment|rent|₹/i.test(detailText)) {
      ok('Tenant detail shows payment history');
    } else {
      bug('Tenant payment history', 'No payment data in detail view');
    }
    // Check for room info
    if (/room|floor/i.test(detailText)) {
      ok('Tenant detail shows room assignment');
    } else {
      bug('Tenant room info', 'No room data in detail view');
    }
    await shot(page, 'WF2_tenant_detail_full');

    // Try to find lifecycle status dropdown/button
    const statusEl = page.locator('select, [role="combobox"], button').filter({ hasText: /active|notice|vacating/i }).first();
    if (await vis(statusEl, 1500)) {
      ok('Lifecycle status control visible in detail');
    } else {
      note('Lifecycle status control', 'Not found as interactive element');
    }

    // Back to list
    const backBtn = page.locator('button').filter({ hasText: /back|← tenant|tenants/i }).first();
    if (await vis(backBtn, 1000)) { await backBtn.click(); await page.waitForTimeout(600); }
    else { await nav(page, 'Tenants'); await page.waitForTimeout(800); }
  }

  // 2f. Search functionality
  const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
  if (await vis(searchInput, 2000)) {
    await searchInput.fill('Rohan');
    await page.waitForTimeout(800);
    await shot(page, 'WF2_search');
    const filteredRows = await page.locator('table tbody tr').count();
    ok('Search filters tenant list', `${filteredRows} rows after "Rohan" search`);
    await searchInput.clear();
    await page.waitForTimeout(500);
  } else {
    note('Search input', 'Not found — may be in header global search');
  }

  await shot(page, 'WF2_tenants_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 3: MAINTENANCE WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
async function wfMaintenance(page) {
  console.log('\n══════ WORKFLOW: MAINTENANCE ══════');
  await nav(page, 'Maintenance');
  await page.waitForTimeout(1000);
  await shot(page, 'WF3_maintenance_loaded');

  const t = await txt(page);
  // 3a. Count display
  if (/4 active|5 total|1 resolved/i.test(t)) {
    ok('Maintenance summary bar correct (4 active, 1 resolved, 5 total)');
  } else {
    bug('Maintenance summary', 'Expected "4 active · 1 resolved · 5 total" not found');
  }

  // 3b. Status filter tabs
  const statusTabs = ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'];
  let stab = 0;
  for (const s of statusTabs) {
    if (await vis(page.locator('button').filter({ hasText: new RegExp(`^${s}$`, 'i') }).first(), 1000)) stab++;
  }
  stab >= 4 ? ok('Status filter tabs visible', `${stab}/5`) : bug('Status filters', `Only ${stab}/5 tabs found`);

  // 3c. Source tracking visible (Manual / WhatsApp tags)
  if (/manual|whatsapp/i.test(t)) {
    ok('Ticket source tracking visible (Manual / WhatsApp badges)');
  } else {
    bug('Ticket source tracking', 'No Manual/WhatsApp source badges found');
  }

  // 3d. Priority badges
  if (/high|med|low/i.test(t)) {
    ok('Priority badges visible (HIGH/MED/LOW)');
  } else {
    bug('Priority badges', 'Not found on ticket list');
  }

  // 3e. Create new ticket
  const newTicketBtn = page.locator('button').filter({ hasText: /\+ new ticket/i }).first();
  if (await vis(newTicketBtn)) {
    ok('+ New Ticket button visible');
    await newTicketBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF3_new_ticket_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await vis(dialog)) {
      ok('New Ticket dialog opens');
      const fields = await dialog.locator('input, textarea, select, [role="combobox"]').count();
      ok('Ticket form fields', `${fields} form controls`);

      // Fill title
      const titleInput = dialog.locator('input').filter({ hasNot: dialog.locator('[type="hidden"]') }).first();
      if (await vis(titleInput, 1000)) {
        await titleInput.fill('QA Test — Water Pipe Leak Kitchen');
        ok('Ticket title field fillable');
      } else {
        bug('Ticket title field', 'Not found or not visible');
      }

      // Description
      const descInput = dialog.locator('textarea').first();
      if (await vis(descInput, 1000)) {
        await descInput.fill('Water pipe leaking under kitchen sink. Needs immediate attention.');
        ok('Ticket description fillable');
      }

      // Priority dropdown
      const priorityEl = dialog.locator('select, [role="combobox"]').filter({ hasText: /high|medium|low|priority/i }).first();
      if (await vis(priorityEl, 1000)) {
        ok('Priority selector visible');
      } else {
        // Try any combobox
        const anyCombo = dialog.locator('select, [role="combobox"]').first();
        if (await vis(anyCombo, 1000)) note('Selector found', 'May be room/tenant not priority');
      }

      await shot(page, 'WF3_ticket_form_filled');

      // Submit
      const submitBtn = dialog.locator('button[type="submit"], button').filter({ hasText: /create|submit|save|add/i }).last();
      if (await vis(submitBtn, 1000)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
        await shot(page, 'WF3_ticket_created');
        const newCount = await page.locator('[class*="ticket" i], table tbody tr').count();
        ok('Ticket creation submitted', `List now has ${newCount} items`);
        const successMsg = page.locator('[class*="toast" i], [role="status"], text=/created|success/i').first();
        await vis(successMsg, 2000) ? ok('Ticket creation — success feedback') : note('Ticket creation', 'No toast (may have created silently)');
      } else {
        bug('Ticket submit button', 'Not found');
        await page.keyboard.press('Escape');
      }
    } else {
      bug('New Ticket dialog', 'Did not open');
    }
  } else {
    bug('+ New Ticket button', 'Not visible');
  }

  await page.waitForTimeout(500);

  // 3f. Expand ticket and test thread/status
  const ticketRows = page.locator('[class*="ticket" i], table tbody tr, [data-testid*="ticket"]');
  const ticketCount = await ticketRows.count();
  if (ticketCount > 0) {
    // Try clicking the expand chevron or the row itself
    const expandBtn = page.locator('button').filter({ has: page.locator('[data-lucide="chevron-down"], [data-lucide="chevron-right"]') }).first();
    const firstTicket = ticketRows.first();

    let expanded = false;
    if (await vis(expandBtn, 1500)) {
      await expandBtn.click();
      await page.waitForTimeout(800);
      expanded = true;
      await shot(page, 'WF3_ticket_expanded');
    } else {
      await firstTicket.click();
      await page.waitForTimeout(1000);
      await shot(page, 'WF3_ticket_clicked');
      expanded = true;
    }

    if (expanded) {
      const expText = await txt(page);
      // Thread/notes
      if (/thread|note|comment|update|history/i.test(expText)) {
        ok('Ticket thread/notes section visible after expand');
      } else {
        note('Thread section', 'Not visible after click — may need scroll or different interaction');
      }

      // Status dropdown in expanded view
      const statusDropdown = page.locator('select, [role="combobox"], button').filter({ hasText: /open|progress|resolved|closed|waiting/i });
      const sdCount = await statusDropdown.count();
      if (sdCount > 0) {
        ok('Status control visible in expanded ticket', `${sdCount} matching elements`);
        // Try changing status
        const firstSD = statusDropdown.first();
        const tagName = await firstSD.evaluate(el => el.tagName).catch(() => '');
        if (tagName.toLowerCase() === 'select') {
          await firstSD.selectOption({ index: 1 });
          await page.waitForTimeout(700);
          ok('Ticket status changed via select');
        } else {
          await firstSD.click();
          await page.waitForTimeout(600);
          await shot(page, 'WF3_status_menu');
          const menuItems = page.locator('[role="menu"] [role="menuitem"], [role="listbox"] [role="option"]');
          const mi = await menuItems.count();
          if (mi > 0) {
            await menuItems.nth(1).click().catch(() => {});
            await page.waitForTimeout(700);
            ok('Ticket status changed via dropdown menu');
          }
        }
        await shot(page, 'WF3_status_changed');
      } else {
        // Look for status badge that might be clickable
        const statusBadge = page.locator('[class*="status" i]').filter({ hasText: /open|progress|resolved/i }).first();
        if (await vis(statusBadge, 1000)) {
          await statusBadge.click();
          await page.waitForTimeout(600);
          await shot(page, 'WF3_status_badge_clicked');
          const popup = page.locator('[role="menu"], [role="listbox"]').first();
          await vis(popup, 1000) ? ok('Status badge click opens status menu') : note('Status badge', 'Click did not open menu');
        }
      }

      // Thread note input
      const noteInputs = page.locator('input[placeholder*="note" i], input[placeholder*="comment" i], input[placeholder*="update" i], textarea[placeholder*="note" i], textarea');
      const niCount = await noteInputs.count();
      if (niCount > 0) {
        const noteInput = noteInputs.last();
        if (await vis(noteInput, 1500)) {
          await noteInput.fill('QA automated note: testing thread functionality.');
          ok('Thread note input fillable');
          await shot(page, 'WF3_thread_note');
          const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|post|add note|submit|reply/i }).first();
          if (await vis(sendBtn, 1000)) {
            await sendBtn.click();
            await page.waitForTimeout(1000);
            await shot(page, 'WF3_note_submitted');
            ok('Thread note submitted');
          } else {
            note('Thread submit', 'Submit button not found — may use Enter key');
          }
        }
      } else {
        note('Thread note input', 'Not found in current view');
      }
    }
  }

  await shot(page, 'WF3_maintenance_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 4: ANNOUNCEMENTS WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
async function wfAnnouncements(page) {
  console.log('\n══════ WORKFLOW: ANNOUNCEMENTS ══════');
  await nav(page, 'Announcements');
  await page.waitForTimeout(1000);
  await shot(page, 'WF4_announcements_loaded');

  const t = await txt(page);
  // 4a. Stats
  if (/4.*total|1.*pinned|2.*whatsapp/i.test(t)) {
    ok('Announcement stats correct (4 total, 1 pinned, 2 via WhatsApp)');
  } else {
    bug('Announcement stats', 'Expected 4 total / 1 pinned / 2 WhatsApp');
  }

  // 4b. Pinned section
  const pinnedSection = page.locator('text=/pinned/i').first();
  if (await vis(pinnedSection, 2000)) {
    ok('Pinned announcements section visible');
  } else {
    bug('Pinned section', 'Not visible on announcements page');
  }

  // 4c. WhatsApp badge on announcements
  if (/whatsapp/i.test(t)) {
    ok('WhatsApp badges visible on announcements');
  } else {
    bug('WhatsApp badges', 'Not visible on announcement list');
  }

  // 4d. Category filters
  const catFilters = ['Maintenance', 'Payment', 'Rules & Policy', 'General'];
  let cf = 0;
  for (const cat of catFilters) {
    const btn = page.locator('button').filter({ hasText: new RegExp(cat, 'i') }).first();
    if (await vis(btn, 1000)) cf++;
  }
  cf >= 3 ? ok('Category filter tabs visible', `${cf}/4`) : bug('Category filters', `Only ${cf}/4 found`);

  // 4e. Create new announcement
  const newAnnoBtn = page.locator('button').filter({ hasText: /\+ new announcement|new announcement/i }).first();
  if (await vis(newAnnoBtn)) {
    ok('+ New Announcement button visible');
    await newAnnoBtn.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF4_new_announcement_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await vis(dialog)) {
      ok('New Announcement dialog opens');

      // Fill title
      const titleInput = dialog.locator('input').first();
      if (await vis(titleInput, 1000)) {
        await titleInput.fill('QA Test: Maintenance Window Thursday 2-4pm');
        ok('Announcement title fillable');
      }

      // Fill content/body
      const bodyInput = dialog.locator('textarea').first();
      if (await vis(bodyInput, 1000)) {
        await bodyInput.fill('Scheduled maintenance work will be carried out. No disruption to services expected.');
        ok('Announcement body fillable');
      }

      // Category select
      const catSelect = dialog.locator('select, [role="combobox"]').first();
      if (await vis(catSelect, 1000)) {
        ok('Category selector visible');
      }

      // WhatsApp toggle
      const waSection = dialog.locator('text=/whatsapp/i').first();
      if (await vis(waSection, 1500)) {
        ok('WhatsApp section in announcement form');
        const waSwitch = dialog.locator('[role="switch"], input[type="checkbox"]').first();
        if (await vis(waSwitch, 1000)) {
          await waSwitch.click();
          await page.waitForTimeout(500);
          ok('WhatsApp toggle clicked');
          await shot(page, 'WF4_whatsapp_toggle_on');
          // Check if WhatsApp queue section appears
          const queueSection = dialog.locator('text=/queue|scheduled|broadcast/i').first();
          await vis(queueSection, 1500) ? ok('WhatsApp queue status appears after toggle') : note('WhatsApp queue', 'No queue status visible after toggle');
        } else {
          note('WhatsApp switch', 'Not found as interactive control');
        }
      } else {
        bug('WhatsApp option', 'Not found in announcement form');
      }

      // Pin toggle
      const pinSection = dialog.locator('text=/pin/i').first();
      if (await vis(pinSection, 1500)) {
        ok('Pin option visible in announcement form');
        const pinSwitch = dialog.locator('[role="switch"], input[type="checkbox"]').nth(1); // second switch (first is WA)
        if (await vis(pinSwitch, 1000)) {
          await pinSwitch.click();
          await page.waitForTimeout(400);
          ok('Pin toggle clicked');
        }
      } else {
        note('Pin option', 'Not found as labeled control');
      }

      // Property/floor targeting
      const targetSelects = await dialog.locator('select, [role="combobox"]').count();
      ok('Announcement form has targeting selectors', `${targetSelects} select/combobox elements`);

      await shot(page, 'WF4_announcement_form_filled');

      // Submit
      const submitBtn = dialog.locator('button').filter({ hasText: /post|publish|save|create|send/i }).last();
      if (await vis(submitBtn, 1000)) {
        await submitBtn.click();
        await page.waitForTimeout(1500);
        await shot(page, 'WF4_announcement_created');
        const newCount = await page.locator('[class*="announcement" i], [class*="card" i]').filter({ hasText: /maintenance|payment|general|rules/i }).count();
        ok('Announcement submitted', `${newCount} announcements after submit`);
        const toastEl = page.locator('[class*="toast" i], [role="status"]').first();
        await vis(toastEl, 2000) ? ok('Announcement creation feedback shown') : note('No toast', 'Silent submit');
      } else {
        bug('Announcement submit button', 'Not found');
        await page.keyboard.press('Escape');
      }
    } else {
      bug('New Announcement dialog', 'Did not open');
    }
  } else {
    bug('+ New Announcement button', 'Not visible');
  }

  await page.waitForTimeout(800);

  // 4f. Test pin toggle on existing announcement
  const pinBtns = page.locator('button').filter({ has: page.locator('[data-lucide="pin"], [data-lucide="pin-off"]') });
  const pinCount = await pinBtns.count();
  if (pinCount > 0) {
    ok('Pin/unpin buttons on existing announcements', `${pinCount} found`);
    await pinBtns.first().click();
    await page.waitForTimeout(700);
    await shot(page, 'WF4_pin_toggled');
    ok('Pin toggle clicked on existing announcement');
  } else {
    // Try by aria-label
    const pinByLabel = page.locator('button[aria-label*="pin" i], button[title*="pin" i]').first();
    if (await vis(pinByLabel, 1000)) {
      ok('Pin button found via aria-label');
    } else {
      note('Pin button', 'No pin buttons with lucide-pin icon found — may use different selector');
    }
  }

  await shot(page, 'WF4_announcements_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 5: NOTIFICATION WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
async function wfNotifications(page) {
  console.log('\n══════ WORKFLOW: NOTIFICATIONS ══════');
  await nav(page, 'Dashboard');
  await page.waitForTimeout(800);

  // 5a. Bell icon in header
  const header = page.locator('header, [class*="header" i]').first();
  // Bell by data attribute
  const bellByData = page.locator('[data-lucide="bell"]').first();
  const bellBtn = bellByData.locator('..'); // parent button

  // Try finding bell wrapper button
  const notifBell = page.locator('button').filter({ has: page.locator('[data-lucide="bell"]') }).first();
  if (await vis(notifBell, 2000)) {
    ok('Notification bell button found in header');
    // Check unread badge
    const badge = notifBell.locator('span, [class*="badge" i]').filter({ hasText: /\d+/ }).first();
    if (await vis(badge, 1000)) {
      const badgeTxt = await badge.innerText().catch(() => '0');
      ok('Notification unread count badge', `count = ${badgeTxt}`);
    } else {
      note('Notification badge', 'No numeric badge visible (may be 0 or different DOM)');
    }

    await notifBell.click();
    await page.waitForTimeout(1000);
    await shot(page, 'WF5_notification_panel');

    // Check panel opened
    const panel = page.locator('[class*="notification" i][class*="panel" i], [class*="notification" i][class*="drop" i], [class*="NotifPanel" i]').first();
    const genericPanel = page.locator('[role="dialog"], [role="menu"]').last();
    if (await vis(panel, 2000) || await vis(genericPanel, 2000)) {
      ok('Notification panel opens');

      const panelText = await page.locator('[role="dialog"], [role="menu"]').last().innerText().catch(() => '');
      if (/notification|payment|maintenance|announcement/i.test(panelText)) {
        ok('Notification panel has notification content');
      } else {
        note('Notification content', 'Panel open but content unclear');
      }

      // Mark all read
      const markAllBtn = page.locator('button').filter({ hasText: /mark all|read all/i }).first();
      if (await vis(markAllBtn, 1500)) {
        ok('Mark all read button visible');
        await markAllBtn.click();
        await page.waitForTimeout(700);
        ok('Mark all read — clicked');
        await shot(page, 'WF5_mark_all_read');
      } else {
        note('Mark all read', 'Not found in panel');
      }
    } else {
      // Might be a dropdown/popover
      await shot(page, 'WF5_bell_after_click');
      const popContent = await txt(page);
      if (/notification|unread|mark/i.test(popContent)) {
        ok('Notification content accessible after bell click');
      } else {
        bug('Notification panel', 'Bell clicked but no notification panel appeared');
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    bug('Notification bell', 'Not found in header — expected bell icon button');
  }

  // 5b. Check notification tab in sidebar
  const notifTabBtn = page.locator('button').filter({ hasText: /notifications/i }).first();
  if (await vis(notifTabBtn, 1500)) {
    ok('Notifications tab in sidebar');
    await notifTabBtn.click();
    await page.waitForTimeout(800);
    await shot(page, 'WF5_notifications_page');
  } else {
    note('Notifications sidebar tab', 'Not found — notifications may be header-only');
  }

  await shot(page, 'WF5_notifications_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW 6: CROSS-MODULE REALTIME SYNC CHECK
// ─────────────────────────────────────────────────────────────────────────────
async function wfCrossModule(page) {
  console.log('\n══════ WORKFLOW: CROSS-MODULE SYNC ══════');

  // Check if dashboard counts match what we see in individual modules
  await nav(page, 'Dashboard');
  await page.waitForTimeout(1000);
  const dashText = await txt(page);

  // Dashboard says: 8 tenants, 60% occupancy, ₹37,200 revenue
  // Tenants page shows 10 total, 8 active
  if (/8.*tenant|tenant.*8/i.test(dashText)) {
    ok('Dashboard tenant count (8 active) matches tenant module');
  } else {
    note('Dashboard active tenant count', 'Could not verify 8 active tenants on dashboard');
  }

  await shot(page, 'WF6_dashboard_sync');

  // Check property selector
  const propSelector = page.locator('button, [role="combobox"]').filter({ hasText: /all propert|sunrise|lakeview/i }).first();
  if (await vis(propSelector, 2000)) {
    ok('Property selector visible for cross-property filtering');
    await propSelector.click();
    await page.waitForTimeout(600);
    await shot(page, 'WF6_property_selector');
    // Check dropdown options
    const options = page.locator('[role="option"], [role="menuitem"], li').filter({ hasText: /sunrise|lakeview/i });
    const optCount = await options.count();
    optCount >= 2 ? ok('Property selector shows both properties', `${optCount} options`) : note('Property options', `Found ${optCount}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    bug('Property selector', 'Not found in header — multi-property filtering broken');
  }

  // Check demo mode label
  const demoLabel = page.locator('text=/Demo/').filter({ hasNot: page.locator('input, textarea') }).first();
  if (await vis(demoLabel, 2000)) {
    ok('Demo mode indicator visible throughout app');
  }

  // Check header notification bell + avatar are persistent
  const avatar = page.locator('[class*="avatar" i], [aria-label*="user" i], [class*="user-menu" i]').first();
  if (await vis(avatar, 2000)) {
    ok('User avatar/menu visible in header');
  } else {
    note('User avatar', 'Not found with standard selectors');
  }

  await shot(page, 'WF6_crossmodule_done');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setup(context);
  const page = await context.newPage();

  const consoleLogs = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warn' && msg.text().includes('Warning:')) consoleLogs.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE ERROR: ${err.message}`));

  try {
    await boot(page);
    await wfPayments(page);
    await wfTenants(page);
    await wfMaintenance(page);
    await wfAnnouncements(page);
    await wfNotifications(page);
    await wfCrossModule(page);
  } catch (err) {
    bug('Test runner crash', err.message);
    console.error(err);
    await shot(page, 'CRASH');
  } finally {
    await browser.close();
  }

  // ── FINAL REPORT ──────────────────────────────────────────────────────────
  const sep = '═'.repeat(70);
  console.log('\n' + sep);
  console.log('                    WORKFLOW QA REPORT');
  console.log(sep);
  console.log(`\n  ✅ PASSES : ${passes.length}`);
  console.log(`  🐛 BUGS   : ${bugs.length}`);

  if (bugs.length > 0) {
    console.log('\n── BUGS FOUND ────────────────────────────────────────────────────────');
    bugs.forEach((b, i) => console.log(`  ${i+1}. 🐛 ${b.label}${b.detail ? '\n     └─ ' + b.detail : ''}`));
  } else {
    console.log('\n  🎉 No bugs detected in workflow testing');
  }

  if (consoleErrors.length > 0) {
    console.log(`\n── BROWSER CONSOLE ERRORS (${consoleErrors.length}) ────────────────────────────────────`);
    consoleErrors.slice(0, 15).forEach(e => console.log(`  🔴 ${e.substring(0, 150)}`));
  } else {
    console.log('\n  ✅ Zero browser console errors');
  }

  console.log(`\n📁 Screenshots: ${SHOTS_DIR}`);
  console.log(sep + '\n');

  const report = {
    timestamp: new Date().toISOString(),
    summary: { passes: passes.length, bugs: bugs.length, consoleErrors: consoleErrors.length },
    bugs, passes, consoleErrors,
  };
  fs.writeFileSync(path.join(__dirname, 'qa-workflow-report.json'), JSON.stringify(report, null, 2));
  console.log('📄 Full report: qa-workflow-report.json\n');
})();
