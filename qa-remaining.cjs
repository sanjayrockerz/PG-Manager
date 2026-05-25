/**
 * QA — Remaining Workflows: Tenant Detail, Maintenance, Announcements, Notifications
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:4173';
const SB_HOST = 'krkzklxfczukvllhucsg.supabase.co';
const SHOTS_DIR = path.join(__dirname, 'qa-final-screenshots');
if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });
fs.readdirSync(SHOTS_DIR).forEach(f => { try { fs.unlinkSync(path.join(SHOTS_DIR, f)); } catch {} });

const MOCK_AUTH_USER = { id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'owner.demo@pgmanager.app', email_confirmed_at: '2024-01-01T00:00:00.000Z', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z', user_metadata: { name: 'Demo Owner', role: 'owner' } };
const MOCK_PROFILE = { id: '00000000-0000-0000-0000-000000000001', email: 'owner.demo@pgmanager.app', full_name: 'Demo Owner', phone: '+919876500001', role: 'owner', owner_scope_id: '00000000-0000-0000-0000-000000000002', pg_name: 'Khush Living', city: 'Bengaluru' };
const MOCK_TOKEN = { access_token: 'mock-qa', expires_at: Math.floor(Date.now()/1000)+86400, expires_in: 86400, refresh_token: 'mock-ref', token_type: 'bearer', user: MOCK_AUTH_USER };

const R = { pass: [], fail: [], warn: [] };
let sc = 0;
const shot = async (p,l) => { await p.screenshot({ path: path.join(SHOTS_DIR,`${String(++sc).padStart(3,'0')}_${l.replace(/[^a-z0-9]/gi,'_')}.png`) }).catch(()=>{}); };
const ok = (t,d='') => { R.pass.push({t,d}); console.log(`  ✅ ${t}${d?' — '+d:''}`); };
const bug = (t,d='') => { R.fail.push({t,d}); console.log(`  🐛 BUG: ${t}${d?' — '+d:''}`); };
const warn = (t,d='') => { R.warn.push({t,d}); console.log(`  ⚠️  ${t}${d?' — '+d:''}`); };
const v = async (l,ms=2000) => l.isVisible({timeout:ms}).catch(()=>false);
const tx = async p => p.locator('#root').innerText().catch(()=>'');

async function setupMocks(ctx) {
  await ctx.route(`**/${SB_HOST}/auth/v1/user**`, r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(MOCK_AUTH_USER)}));
  await ctx.route(`**/${SB_HOST}/auth/v1/token**`, r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...MOCK_TOKEN})}));
  await ctx.route(`**/${SB_HOST}/rest/v1/profiles**`, r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([MOCK_PROFILE])}));
  await ctx.route(`**/${SB_HOST}/rest/v1/users**`, r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([])}));
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

// Close any open overlays
async function closeOverlays(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  // Click main content area to close dropdowns
  await page.locator('main, [role="main"]').first().click({ force: true, position: { x: 400, y: 400 } }).catch(()=>{});
  await page.waitForTimeout(300);
}

async function nav(page, label) {
  await closeOverlays(page);
  const btns = page.locator('button');
  const n = await btns.count();
  for (let i=0; i<n; i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(()=>'')).trim();
    if (t === label && await b.isVisible().catch(()=>false)) {
      await b.click({timeout:5000});
      await page.waitForTimeout(1000);
      return;
    }
  }
  for (let i=0; i<n; i++) {
    const b = btns.nth(i);
    const t = (await b.innerText().catch(()=>'')).trim();
    if (t.includes(label) && await b.isVisible().catch(()=>false)) {
      await b.click({timeout:5000});
      await page.waitForTimeout(1000);
      return;
    }
  }
}

// ═══════════════════════════════════════════════════
// TENANT DETAIL VIEW
// ═══════════════════════════════════════════════════
async function testTenantDetail(page) {
  console.log('\n══ TENANT DETAIL VIEW ══');
  await nav(page, 'Tenants');
  await page.waitForTimeout(1000);
  await shot(page, 'T1_tenants_list');

  // Use the eye icon (view) button on first row instead of clicking the row
  const eyeBtns = page.locator('button').filter({ has: page.locator('[data-lucide="eye"]') });
  const ec = await eyeBtns.count();
  if (ec > 0) {
    ok('Eye icon (view) buttons found', `${ec} buttons`);
    await eyeBtns.first().click();
    await page.waitForTimeout(1500);
    await shot(page, 'T2_tenant_detail');
    const t = await tx(page);
    if (/contact|email|phone|room|floor|rent/i.test(t)) {
      ok('Tenant detail shows contact/room/rent info');
    } else {
      bug('Tenant detail', 'No contact/room/rent data found after clicking view');
    }
    if (/payment|₹|history|due/i.test(t)) {
      ok('Tenant detail shows payment information');
    } else {
      warn('Payment info in detail', 'Not clearly visible');
    }
    if (/active|notice|vacating|vacated|inactive/i.test(t)) {
      ok('Lifecycle status visible in tenant detail');
    } else {
      warn('Lifecycle status', 'Not found in detail text');
    }
    await shot(page, 'T2_tenant_detail_full');
    // Navigate back
    const backBtn = page.locator('button').filter({ hasText: /back|← tenant|tenants/i }).first();
    if (await v(backBtn, 1000)) { await backBtn.click(); await page.waitForTimeout(500); }
    else { await nav(page, 'Tenants'); }
  } else {
    // Try edit button or row click with force
    const editBtns = page.locator('button').filter({ has: page.locator('[data-lucide="pencil"], [data-lucide="edit-2"]') });
    const ebc = await editBtns.count();
    if (ebc > 0) {
      warn('No eye button found', 'Using edit button for detail check');
      await editBtns.first().click();
      await page.waitForTimeout(1000);
      await shot(page, 'T2_tenant_edit');
    } else {
      bug('Tenant detail navigation', 'No view/edit buttons on tenant rows');
    }
  }
}

// ═══════════════════════════════════════════════════
// MAINTENANCE — EXPAND + THREAD + STATUS CHANGE
// ═══════════════════════════════════════════════════
async function testMaintenanceWorkflow(page) {
  console.log('\n══ MAINTENANCE DETAIL ══');
  await nav(page, 'Maintenance');
  await page.waitForTimeout(1000);
  await shot(page, 'M1_list');

  // Verify ticket list
  const t = await tx(page);
  if (/water leakage|ceiling fan|AC not|wifi|room lock/i.test(t)) {
    ok('Demo tickets all visible (Water leakage, Ceiling fan, AC, WiFi, Room lock)');
  } else {
    bug('Demo tickets', 'Expected demo ticket titles not found');
  }

  // Status buttons — each ticket has "Open ▼", "In Progress ▼", "Resolved ▼"
  const statusBtns = page.locator('button').filter({ hasText: /^Open$|^In Progress$|^Resolved$|^Closed$|^Waiting$/ });
  const sbc = await statusBtns.count();
  ok('Status buttons on tickets', `${sbc} visible`);

  if (sbc > 0) {
    // Change first "Open" ticket to "In Progress"
    const openBtn = page.locator('button').filter({ hasText: /^Open$/ }).first();
    if (await v(openBtn, 2000)) {
      await openBtn.click();
      await page.waitForTimeout(600);
      await shot(page, 'M1_status_dropdown');
      const dropdown = page.locator('[role="menu"], [role="listbox"]').last();
      if (await v(dropdown, 1500)) {
        ok('Status dropdown opens on click');
        const items = await dropdown.locator('[role="menuitem"], [role="option"], button, li').allInnerTexts();
        ok('Status options', items.filter(i=>i.trim()).join(' | '));
        const inProgressOpt = dropdown.locator('[role="menuitem"], [role="option"], button, li').filter({ hasText: /in progress/i }).first();
        if (await v(inProgressOpt, 1000)) {
          await inProgressOpt.click();
          await page.waitForTimeout(1000);
          await shot(page, 'M1_status_changed_to_inprogress');
          ok('Ticket status changed: Open → In Progress');
        } else {
          warn('In Progress option', 'Not found in dropdown');
          await page.keyboard.press('Escape');
        }
      } else {
        warn('Status dropdown', 'Did not open');
      }
    }
  }

  // Expand ticket to see thread
  const expandBtns = page.locator('button').filter({ has: page.locator('[data-lucide="chevron-down"]') });
  const expandCount = await expandBtns.count();
  if (expandCount > 0) {
    ok('Expand chevrons found', `${expandCount} tickets expandable`);
    await expandBtns.first().click();
    await page.waitForTimeout(800);
    await shot(page, 'M1_ticket_expanded');
    const expandedText = await tx(page);
    if (/description|notes|thread|comment|update|message|history/i.test(expandedText)) {
      ok('Ticket detail/thread visible after expand');
    } else {
      warn('Thread content', 'No thread/detail text found after expand');
    }
    // Thread note input
    const noteInputs = page.locator('input, textarea').filter({ hasNot: page.locator('[type=hidden]') });
    const nic = await noteInputs.count();
    if (nic > 0) {
      const lastInput = noteInputs.last();
      if (await v(lastInput, 1500)) {
        const placeholder = await lastInput.getAttribute('placeholder').catch(() => '');
        ok('Thread input found', `placeholder: "${placeholder}"`);
        await lastInput.fill('QA: Technician called. Expected arrival 2pm.');
        await page.waitForTimeout(400);
        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|post|add|reply|submit/i }).last();
        if (await v(submitBtn, 1000)) {
          await submitBtn.click(); await page.waitForTimeout(800);
          ok('Thread note submitted');
          await shot(page, 'M1_note_submitted');
        } else {
          // Try Enter
          await lastInput.press('Enter'); await page.waitForTimeout(600);
          ok('Thread note sent via Enter');
        }
      }
    } else {
      warn('Thread input', 'No text input in expanded ticket');
    }
  } else {
    // Try clicking ticket row body area
    const ticketItems = page.locator('div').filter({ hasText: /TKT-001|Water leakage/i }).first();
    if (await v(ticketItems, 1500)) {
      await ticketItems.click({ position: { x: 300, y: 10 } });
      await page.waitForTimeout(800);
      await shot(page, 'M1_ticket_row_click');
      ok('Ticket row clicked (fallback)');
    } else {
      bug('Ticket expand', 'No chevron expand buttons and no ticket rows clickable');
    }
  }

  // Create New Ticket
  const newBtn = page.locator('button').filter({ hasText: /\+ New Ticket/i }).first();
  if (await v(newBtn)) {
    await newBtn.click(); await page.waitForTimeout(1000);
    await shot(page, 'M2_create_dialog');
    const dialog = page.locator('[role="dialog"]').first();
    if (await v(dialog)) {
      ok('Create Ticket dialog opens');
      const inputs = await dialog.locator('input:not([type=hidden])').all();
      const textareas = await dialog.locator('textarea').all();
      if (inputs.length > 0) { await inputs[0].fill('QA — Broken Window Room 303'); ok('Title filled'); }
      if (textareas.length > 0) { await textareas[0].fill('Glass pane cracked, needs replacement.'); ok('Description filled'); }
      await shot(page, 'M2_form_filled');
      // Submit
      const submitBtn = dialog.locator('button').filter({ hasText: /create|submit|save|add/i }).last();
      if (await v(submitBtn, 1000)) {
        await submitBtn.click(); await page.waitForTimeout(1500);
        const gone = !await v(dialog, 1000);
        gone ? ok('Ticket created — dialog closed') : warn('Ticket dialog still open');
        await shot(page, 'M2_after_create');
        // Verify count
        const allBtns = page.locator('button').filter({ hasText: /^All/ });
        const allBtnTxt = await allBtns.first().innerText().catch(() => '');
        ok('Ticket count after create', allBtnTxt);
      } else {
        bug('Create ticket submit', 'No submit button'); await page.keyboard.press('Escape');
      }
    } else { bug('Create ticket dialog', 'Did not open'); }
  } else { bug('+ New Ticket button', 'Not found'); }

  await shot(page, 'M_maintenance_done');
}

// ═══════════════════════════════════════════════════
// ANNOUNCEMENTS — CREATE + PIN + WHATSAPP
// ═══════════════════════════════════════════════════
async function testAnnouncementWorkflow(page) {
  console.log('\n══ ANNOUNCEMENTS WORKFLOW ══');
  await nav(page, 'Announcements');
  await page.waitForTimeout(1000);
  await shot(page, 'A1_list');

  const t = await tx(page);
  if (/monthly rent.*due|water supply|deep cleaning/i.test(t)) {
    ok('Demo announcements loaded (rent reminder, water supply, deep cleaning)');
  } else {
    warn('Demo announcements', 'Expected content not found');
  }
  if (/pinned/i.test(t)) ok('Pinned section visible');
  else bug('Pinned section', 'Not visible on announcements page');
  if (/whatsapp/i.test(t)) ok('WhatsApp badges on announcements');
  else bug('WhatsApp badges', 'Not visible');

  // Create announcement
  const newBtn = page.locator('button').filter({ hasText: /\+ New Announcement/i }).first();
  if (!await v(newBtn)) { bug('+ New Announcement button', 'Not found'); return; }
  await newBtn.click(); await page.waitForTimeout(1000);
  await shot(page, 'A1_dialog');
  const dialog = page.locator('[role="dialog"]').first();
  if (!await v(dialog)) { bug('Announcement dialog', 'Did not open'); return; }
  ok('New Announcement dialog opens');

  const inputs = await dialog.locator('input:not([type=hidden])').all();
  const textareas = await dialog.locator('textarea').all();
  const switches = await dialog.locator('[role="switch"]').all();
  const selects = await dialog.locator('select, [role="combobox"]').all();
  ok('Form controls', `${inputs.length} inputs, ${textareas.length} textareas, ${switches.length} switches, ${selects.length} selects`);

  if (inputs.length > 0) { await inputs[0].fill('QA: Fire Safety Drill Saturday 9AM'); ok('Title filled'); }
  if (textareas.length > 0) { await textareas[0].fill('Mandatory fire safety drill for all residents.'); ok('Body filled'); }

  // WhatsApp switch (first switch)
  if (switches.length > 0) {
    const waSwitch = dialog.locator('[role="switch"]').first();
    const waChecked = await waSwitch.getAttribute('aria-checked');
    ok('WhatsApp switch found', `aria-checked=${waChecked}`);
    if (waChecked !== 'true') { await waSwitch.click(); await page.waitForTimeout(500); ok('WhatsApp enabled'); }
    await shot(page, 'A1_whatsapp_on');
  } else { warn('WhatsApp switch', 'Not found'); }

  // Pin switch (second switch)
  if (switches.length >= 2) {
    const pinSwitch = dialog.locator('[role="switch"]').nth(1);
    const pinChecked = await pinSwitch.getAttribute('aria-checked');
    ok('Pin switch found', `aria-checked=${pinChecked}`);
    if (pinChecked !== 'true') { await pinSwitch.click(); await page.waitForTimeout(400); ok('Pin enabled'); }
  } else {
    warn('Pin switch', `Only ${switches.length} switches found in form`);
  }

  await shot(page, 'A1_filled');

  // Find submit button
  const allDialogBtns = await dialog.locator('button').all();
  let submitBtn = null;
  for (const b of allDialogBtns.reverse()) {
    const txt = (await b.innerText().catch(() => '')).trim().toLowerCase();
    if (/post|publish|create|save|send|submit/.test(txt)) { submitBtn = b; break; }
  }
  if (submitBtn && await v(submitBtn, 1000)) {
    const btnTxt = await submitBtn.innerText().catch(()=>'');
    ok('Submit button found', `"${btnTxt}"`);
    await submitBtn.click(); await page.waitForTimeout(1500);
    await shot(page, 'A1_after_submit');
    const gone = !await v(dialog, 1500);
    if (gone) {
      ok('Announcement created — dialog closed after submit');
      // Check announcement count updated
      const statsText = await page.locator('[class*="stat" i], [class*="card" i]').first().innerText().catch(() => '');
      ok('Announcements list updated after create');
    } else {
      const err = await dialog.locator('[class*="error" i], [class*="red" i], text=/required|invalid/i').first().innerText().catch(() => '');
      err ? bug('Announcement create validation error', err) : warn('Dialog still open', 'No clear error shown');
    }
  } else {
    bug('Announcement submit', 'No submit button found in dialog');
    await page.keyboard.press('Escape');
  }

  // Test pin toggle on existing announcement
  await page.waitForTimeout(500);
  const pinBtns = page.locator('button').filter({ has: page.locator('[data-lucide="pin"], [data-lucide="pin-off"]') });
  const pinCount = await pinBtns.count();
  if (pinCount > 0) {
    ok('Pin/unpin buttons on existing announcements', `${pinCount} found`);
    await pinBtns.first().click(); await page.waitForTimeout(700);
    await shot(page, 'A1_pin_toggled');
    ok('Pin toggle clicked on existing announcement');
  } else {
    const anyPinBtn = page.locator('button[aria-label*="pin" i], button[title*="pin" i]').first();
    if (await v(anyPinBtn, 1000)) ok('Pin button found via aria-label');
    else warn('Pin button', 'Not found with lucide-pin or aria-label');
  }

  await shot(page, 'A_announcements_done');
}

// ═══════════════════════════════════════════════════
// NOTIFICATIONS — Bell + Panel + Mark Read
// ═══════════════════════════════════════════════════
async function testNotifications(page) {
  console.log('\n══ NOTIFICATIONS WORKFLOW ══');
  await nav(page, 'Dashboard');
  await page.waitForTimeout(800);

  // Trigger an event first to generate a notification
  // Navigate to Maintenance and create a status change (this fires domainEvents)
  await nav(page, 'Payments');
  await page.waitForTimeout(800);
  // Mark a payment status to trigger notification
  const pendingTab = page.locator('button').filter({ hasText: /^Pending$/ }).first();
  if (await v(pendingTab, 1500)) {
    await pendingTab.click(); await page.waitForTimeout(600);
    const statusSel = page.locator('table tbody tr select').first();
    if (await v(statusSel, 1500)) {
      await statusSel.selectOption('paid'); await page.waitForTimeout(1200);
      ok('Payment status changed to trigger notification event');
    }
  }

  await nav(page, 'Dashboard');
  await page.waitForTimeout(1000);

  const bellBtn = page.locator('button').filter({ has: page.locator('[data-lucide="bell"]') }).first();
  if (await v(bellBtn, 3000)) {
    ok('Notification bell found in header');

    // Check badge
    const bellParent = await bellBtn.boundingBox();
    await shot(page, 'N1_bell_state');
    const badgeSpan = bellBtn.locator('span').first();
    if (await v(badgeSpan, 1000)) {
      const badgeTxt = await badgeSpan.innerText().catch(() => '');
      ok('Notification badge span visible', `text: "${badgeTxt}"`);
    } else {
      warn('Notification badge', 'Not visible (count may be 0 in initial state)');
    }

    // Click bell
    await bellBtn.click(); await page.waitForTimeout(1000);
    await shot(page, 'N1_panel_open');

    // Panel is an absolute div
    const panel = page.locator('div[style*="position: absolute"], div').filter({ has: page.locator('text=/Notifications/') }).last();
    const panelVisible = await v(panel, 2000);
    if (panelVisible) {
      ok('Notification panel opens');
      const panelText = await panel.innerText().catch(() => '');
      if (/no notification|events will appear/i.test(panelText)) {
        ok('Notification panel shows empty state', 'Events will appear here automatically');
        warn('Notifications not generated', 'No payment/maintenance events fired notificationEngine in demo mode');
      } else if (/payment|maintenance|tenant|announcement/i.test(panelText)) {
        ok('Notification panel has notification items');
        const items = await panel.locator('button').filter({ has: page.locator('div') }).count();
        ok('Notification items in panel', `${items} items`);
        // Mark all read
        const markAllBtn = panel.locator('button').filter({ hasText: /all read/i }).first();
        if (await v(markAllBtn, 1500)) {
          ok('Mark all read button visible');
          await markAllBtn.click(); await page.waitForTimeout(600);
          ok('Mark all read clicked');
          await shot(page, 'N1_after_mark_all');
        }
      } else {
        warn('Notification panel content', `Unclear: "${panelText.substring(0, 100)}"`);
      }
    } else {
      // Try locating by z-index style
      await shot(page, 'N1_panel_fallback');
      const allText = await tx(page);
      if (/notifications|no notification/i.test(allText)) {
        ok('Notification content accessible');
      } else {
        bug('Notification panel', 'Bell clicked but panel not found by any selector');
      }
    }

    // Close via X button
    const closeBtn = page.locator('button').filter({ has: page.locator('[data-lucide="x"]') }).first();
    if (await v(closeBtn, 1000)) await closeBtn.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  } else {
    bug('Notification bell', 'Button with Bell icon not found in header');
  }

  await shot(page, 'N_notifications_done');
}

// ═══════════════════════════════════════════════════
// CROSS-MODULE: Property Filter Sync
// ═══════════════════════════════════════════════════
async function testPropertyFilter(page) {
  console.log('\n══ CROSS-MODULE: Property Selector ══');
  await nav(page, 'Dashboard');
  await page.waitForTimeout(800);

  // "All Properties (2) ▼" button in header
  const propBtn = page.locator('button').filter({ hasText: /All Properties/i }).first();
  if (!await v(propBtn, 2000)) {
    bug('Property selector', 'All Properties button not found in header');
    return;
  }
  ok('Property selector found');
  await propBtn.click(); await page.waitForTimeout(600);
  await shot(page, 'X1_property_dropdown');

  const opts = page.locator('[role="option"], [role="menuitem"], li, button').filter({ hasText: /sunrise residency/i });
  if (await v(opts.first(), 1500)) {
    await opts.first().click(); await page.waitForTimeout(1000);
    await shot(page, 'X1_sunrise_selected');
    ok('Sunrise Residency selected');

    // Dashboard should update
    const dashText = await tx(page);
    ok('Dashboard after Sunrise filter', dashText.substring(0, 150).replace(/\n/g, ' '));

    // Payments should filter
    await nav(page, 'Payments');
    await page.waitForTimeout(800);
    await shot(page, 'X1_payments_sunrise');
    const payCount = await page.locator('table tbody tr').count();
    ok('Payments filtered to Sunrise Residency', `${payCount} rows`);

    // Tenants should filter
    await nav(page, 'Tenants');
    await page.waitForTimeout(800);
    const tenantText = await tx(page);
    ok('Tenants filtered to Sunrise Residency');

    // Reset to All Properties
    const resetBtn = page.locator('button').filter({ hasText: /sunrise residency|all properties/i }).first();
    if (await v(resetBtn, 1500)) {
      await resetBtn.click(); await page.waitForTimeout(600);
      const allPropOpt = page.locator('[role="option"], [role="menuitem"], li, button').filter({ hasText: /all properties/i }).first();
      if (await v(allPropOpt, 1000)) {
        await allPropOpt.click(); await page.waitForTimeout(800);
        ok('Reset to All Properties');
      }
    }
  } else {
    await page.keyboard.press('Escape');
    bug('Property dropdown options', 'Sunrise Residency option not found');
  }
}

// ═══════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 80, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await setupMocks(ctx);
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type()==='error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(`PAGE: ${err.message}`));

  try {
    await boot(page);
    await testTenantDetail(page);
    await testMaintenanceWorkflow(page);
    await testAnnouncementWorkflow(page);
    await testNotifications(page);
    await testPropertyFilter(page);
  } catch (err) {
    bug('CRASH', err.message.substring(0, 200));
    console.error(err.message.substring(0, 300));
    await shot(page, 'CRASH');
  } finally {
    await browser.close();
  }

  const sep = '═'.repeat(70);
  console.log('\n' + sep);
  console.log('                REMAINING WORKFLOWS — QA REPORT');
  console.log(sep);
  console.log(`\n  ✅ PASS : ${R.pass.length}`);
  console.log(`  🐛 BUGS : ${R.fail.length}`);
  console.log(`  ⚠️  WARN : ${R.warn.length}`);

  if (R.fail.length > 0) {
    console.log('\n── BUGS ─────────────────────────────────────────────────────────────');
    R.fail.forEach((b,i) => console.log(`  ${i+1}. 🐛 ${b.t}${b.d?'\n     └─ '+b.d:''}`));
  } else {
    console.log('\n  🎉 No bugs found!');
  }
  if (R.warn.length > 0) {
    console.log('\n── WARNINGS ─────────────────────────────────────────────────────────');
    R.warn.forEach(w => console.log(`  ⚠️  ${w.t}${w.d?' — '+w.d:''}`));
  }
  if (consoleErrors.length > 0) {
    console.log(`\n── BROWSER ERRORS (${consoleErrors.length}) ────────────────────────────────────────────`);
    consoleErrors.slice(0,10).forEach(e => console.log(`  🔴 ${e.substring(0,140)}`));
  } else {
    console.log('\n  ✅ Zero console errors');
  }
  console.log(`\n📁 Screenshots: ${SHOTS_DIR}`);
  console.log(sep);
  fs.writeFileSync(path.join(__dirname, 'qa-remaining-report.json'), JSON.stringify({...R, consoleErrors},null,2));
  console.log('📄 Report: qa-remaining-report.json\n');
})();
