# PG Manager — Complete Product Feature Document
*Version 2.0 | May 2026 | Final reviewed scope*

---

## Overview

PG Manager is a three-portal SaaS platform for managing Paying Guest (PG) accommodations in India. It digitizes the entire PG business — from tenant onboarding to rent collection, maintenance, and communication.

**Three portals:**
- Owner Portal — for PG owners and their managers (day-to-day operations)
- Tenant Portal — for tenants living in the PG (self-service)
- Admin Portal — for the platform operator (you, internal use only)

**Tech stack:** React 18 + TypeScript + Tailwind CSS + Supabase + Vercel
**Primary communication channel:** WhatsApp for outbound notifications. Portal for all self-service actions.

---

# PORTAL 1 — OWNER PORTAL

---

## 1. Authentication & Onboarding

**Login options for owners:**
- Email + password
- Google OAuth
- Magic link (email)
- Standard multi-option login screen like major SaaS apps

**Try Demo button on login screen:**
- Loads demo mode for Owner Portal only
- Pre-populated with rich realistic demo data
- Anyone can explore the full product without signing up
- Demo mode is environment-controlled (not client-side toggle)

**New owner signup:**
- Name + email only (no PG name asked at signup)
- After signup → Quick Start onboarding guide appears:
  - Step 1: Add your first property
  - Step 2: Add your first room
  - Step 3: Add your first tenant
- Guided, welcoming, no empty dashboard

**Session management:**
- Supabase session persistence + auto token refresh
- Secure logout from header avatar menu

---

## 2. Dashboard

**Property filter (header):**
- Dropdown showing "All Properties" or a specific property
- All dashboard data filters based on selection
- When "All Properties" — data aggregates across all owned properties

**KPI Cards (top row):**
- Monthly Revenue — total paid this month, trend % vs last month
- Pending Payments — total amount pending, count of tenants due
- Total Tenants — active count, trend %
- Occupancy Rate — occupied ÷ total, shown as % with fraction (e.g. 16/25 rooms)

**Building View entry card:**
- A dedicated clickable card/section on the Dashboard
- Shows quick summary: "Green Valley PG — 16/25 beds occupied"
- Click → enters full Building View screen

**Recent Payments table:**
- Columns: Tenant, Property (shown only on All Properties view), Room, Amount, Status
- Last 5–10 payments
- Status badges: Paid (green), Pending (yellow), Overdue (red)

**Recent Activity feed:**
- Mixed feed: payment received, maintenance filed, tenant added, announcement posted
- Timestamp per event, click to navigate to relevant record

**Occupancy Overview chart:**
- Visual occupancy trend over time
- Per property or aggregated view

---

## 3. Building View

Accessed from the Dashboard entry card.

**Visual layout:**
- Full floor-by-floor diagram of selected property
- Each floor shows all rooms
- Each room shows occupancy (bed-level or room-level based on property setting)
- Color coding: Green = Occupied, Gray = Vacant, Orange = Maintenance

**Interactions:**
- Hover on room → tooltip showing tenant name(s)
- Click occupied room → opens Tenant Detail for that tenant
- Click vacant room → option to assign a tenant
- Property selector dropdown to switch between properties

---

## 4. Properties & Rooms

**Properties list:**
- Summary stats: Total Properties, Total Floors, Total Rooms, Total Beds
- Each property card: name, address, floors, rooms, total beds, contact person, date added
- Actions: Edit, Delete, Expand (shows rooms by floor)
- Add Property button

**Add / Edit Property form fields:**
- Property name
- Address (Google Places API autocomplete)
- City, State, Pincode
- Number of floors
- Contact person name, phone, email (on-ground caretaker)
- Tracking type toggle: Room-based or Bed-based

**Room management (inside expanded property):**
- Grouped by floor
- Each room card: number, type, bed count, rent, status, occupied beds
- Actions: Edit, Delete per room
- Add Room button per property

**Add / Edit Room form fields:**
- Room number
- Floor (limited to property floor count)
- Room type: Single / Double / Triple
- Number of beds (auto-set by type, editable)
- Monthly rent
- Status: Vacant / Occupied / Maintenance

**Bed-based vs Room-based tracking:**
- Set per property at creation (editable later)
- Room-based: occupancy tracked at room level only
- Bed-based: each bed tracked individually (Bed A, B, C) — each can be occupied/vacant independently

---

## 5. Tenants

**Tenants list:**
- Search: name, room, phone, email
- Property filter (from header)
- Status filter: Active / Former (vacated)
- Table (desktop) / Card view (mobile)
- Columns: Avatar + name + email, Property, Room, Contact, Rent, Join Date, Status, Actions
- Actions per row: View Details, Edit, Delete

**Add / Edit Tenant — 6 sections:**

Section 1 — Basic Info:
- Profile photo (optional — first-letter avatar if not uploaded)
- Full name, phone (+91), email

Section 2 — Room Assignment:
- Select property → floor → room → bed (bed selector appears only if bed-based property)

Section 3 — Rent Details:
- Monthly rent, security deposit, rent due date (day of month 1–31)

Section 4 — Emergency Contact:
- Parent/guardian name + phone

Section 5 — Verification / KYC:
- ID type: Aadhaar / Passport / Driving Licence / Voter ID
- ID number
- ID document upload (PDF, JPG, PNG)

Section 6 — Stay Details:
- Join date, Status (Active / Inactive)

**Tenant Detail page:**

Top profile card shows:
- Photo (or first-letter avatar), name, phone, email
- Property, floor, room, bed, monthly rent, security deposit
- Join date, status, emergency contact, verification details

Four tabs:

Tab 1 — Payment History:
- All payment records for this tenant
- Row: month, amount, extra charges, total, due date, paid date, status, receipt download

Tab 2 — Extra Charges:
- All additional charges for this tenant
- Type, description, amount, date
- Add new charge button

Tab 3 — Maintenance:
- All tickets linked to this tenant
- Ticket ID, issue, priority, status, date, source

Tab 4 — Documents:
- ID document, rental agreement, receipts, any owner-uploaded files
- Download per file

**Tenant vacate flow:**
When owner marks tenant as vacated — panel captures:
- Vacate date
- Security deposit refund amount + refund date
- Final settlement note (e.g. last month proration)
- Reason for leaving (optional)
- Room auto-marks vacant on vacate date
- Tenant history fully preserved, never deleted
- Accessible via "Former Tenants" filter

**Tenant auto-account creation:**
When owner adds tenant:
- Supabase auth account auto-created for their phone number
- After configurable delay (15 min / 1 hr) → WhatsApp welcome message sent
- Message includes portal link + "Login with your mobile number"

---

## 6. Payments

**Summary stats:** Total Amount, Paid, Pending, Overdue

**Filters:** Search by tenant/property, status chips (All/Paid/Pending/Overdue), date range (Current Month / Last Month / All Time / Custom)

**Payment table columns:**
Tenant, Property (all-properties view), Room, Monthly Rent, Extra Charges, Total Amount, Due Date, Status (inline editable), Actions

**Actions per row:**
- Add Charge button
- Send Reminder (WhatsApp — active when WhatsApp connected)

**Payment record auto-generation:**
- System auto-creates one pending payment record per active tenant at month start

**Mark as paid — captures:**
- Status → Paid
- Payment date (auto today, editable)
- Payment method: UPI / Cash / Bank Transfer / Cheque
- Reference / Transaction ID (optional)
- Auto-generates receipt PDF on save

**Add Extra Charge modal:**
- Type: Electricity / Water / Maintenance / Laundry / Internet / Custom
- Description (optional), Amount
- Rolls into that month's total

**UPI payment link generation:**
- When sending rent reminder via WhatsApp
- System generates UPI deep link using owner's UPI ID + exact amount
- Tenant taps → goes directly to UPI payment screen
- No payment gateway needed for v1

**Invoice / Receipt generation:**
- Auto-generated PDF when payment marked paid
- Owner can download from Payments screen
- Tenant can download from Tenant Portal
- Receipt includes: tenant name, property, room, month, rent, extra charges, total, payment date, method, receipt number

**Export payments:**
- CSV / Excel download respecting current filters

**Automatic rent reminder:**
- Fires X days before due date (configured in Settings → WhatsApp)
- Manual trigger also available per tenant from Payments screen

---

## 7. Maintenance

**Summary stats:** Total Requests, Open, In Progress, Resolved

**Filter chips:** All / Open / In Progress / Resolved

**Each ticket card shows:**
- Priority badge: HIGH / MEDIUM / LOW (color coded)
- Source badge: Portal / Manual
- Ticket ID (TKT0001 format)
- Issue title + description
- Tenant name, room, property, phone, date
- Status + Update Status button

**Ticket sources:**
- Portal — filed by tenant via Tenant Portal
- Manual — filed by owner or manager directly

**Update Status modal:**
- Toggle: Open → In Progress → Resolved
- Add Note field with full notes thread (timestamped)
- Notes visible to owner/manager only

**Manual Ticket creation:**
- Tenant (dropdown), property, room, issue title, description, priority

---

## 8. Announcements

**List view:**
- New Announcement button
- Filter chips: All / Maintenance / Payment / Rules / General
- Pinned Announcements section at top
- All Announcements below

**Each card:** Category badge, WhatsApp badge (if sent), title, content, date, actions (Pin/Unpin, Edit, Send/Resend)

**Targeting:**
- All tenants across all properties
- Specific property
- Specific floor(s) within a property (multi-select)

**Create / Edit form:**
- Title, content, category, targeting, pin toggle, send via WhatsApp toggle (default on)

---

## 9. Notifications

**Notification bell (header):**
- Red badge when unread exist
- Desktop: dropdown with 5 latest
- Mobile: navigates to full Notifications screen

**Notification types:**
- Payment — "Rajesh Kumar paid ₹5,500 for Room 101"
- Maintenance — "New request: AC not working — Room 205"
- Tenant — "New tenant added: Priya Sharma in Room 303"
- Announcement — "Announcement posted: Electricity Maintenance"

**Full Notifications screen:**
- Full list with timestamps
- Mark all read button
- Click to mark individual as read
- Real-time via Supabase realtime subscription
- Empty state: "You're all caught up!"

---

## 10. Support

Owner's channel to contact the platform support team (you/admin).

**Support list view:**
- Filter chips: All / Open / In Progress / Resolved / Closed
- Sort by: Newest / Priority / Last Response
- Each ticket: subject, category, priority, status, date created, last reply date
- New Ticket button

**Create Support Ticket:**
- Subject
- Description (detailed)
- Category: Billing / Technical / Operations / Tenant Management / Other
- Priority: Low / Medium / High / Urgent
- Property (optional — which property is this about)

**Ticket detail:**
- Full conversation thread
- Add reply / comment
- Status shown (owner can see, cannot change — only admin changes status)
- Timestamps on all messages

**What owners can do:**
- Open a ticket for any issue
- Reply to admin responses
- See status updates
- Close a resolved ticket

---

## 11. Settings (Tab-based)

**Tab 1 — Basic Settings:**
- Profile: Name, Photo upload, Email (read-only)
- Notifications: Payment alerts, Maintenance alerts, Tenant updates, Email notifications (toggles)
- Security: Change password (sends reset email), Active sessions info
- Additional: Language (EN/HI/MR), Timezone (IST), Currency (INR)

**Tab 2 — Payment Settings:**
- UPI ID (used to generate payment links in reminders)
- Bank account number (reference)
- Save button

**Tab 3 — WhatsApp Settings:**
- WhatsApp Business number setup/status
- 4 automation templates (toggleable on/off + editable):
  1. Welcome Message
  2. Rent Reminder (includes UPI payment link)
  3. Payment Confirmation
  4. Complaint Status Update
- Template variables: `{{tenantName}}`, `{{room}}`, `{{amount}}`, `{{dueDate}}`, `{{pgName}}`
- Rent Reminder Timing: 1 / 2 / 3 / 5 / 7 days before due
- PG Rules: editable list fed into WhatsApp messages and tenant portal Help section

**Tab 4 — Team Members:**
- Current team list: name, role, assigned properties, invite status
- Invite by email → select properties → set permission (Viewer/Editor/Manager)
- Revoke access, resend invite
- Audit trail shows all manager actions

**Tab 5 — Subscription:**
- Current plan details (Free / Pro / Scale)
- Plan features + limits
- Upgrade CTA (for Free users)
- Billing history
- Next renewal date

**Tab 6 — Audit Log:**
- Chronological log of all actions on the account
- Each entry: timestamp, user, action, affected record
- Filter: All / Payments / Tenants / Settings / Maintenance / Announcements
- Critical for multi-user accounts

**Danger Zone:**
- Export All Data (CSV)
- Delete All Data (with confirmation)
- Close Account (with confirmation)

---

## 12. Multi-User System

**Two account types:**
- Owner — full control of their own properties
- Manager/Staff — their own properties + shared properties from owners

**Property selector for managers:**
- "My Properties" group — their own
- "Shared PGs" group — assigned by another owner, with shared badge
- "All Properties" aggregates their own only, never mixes shared

**Permission levels:**
- Viewer — read only, no edit/delete/add
- Editor — manage tenants and maintenance, no payments or settings
- Manager — full operational access, no subscription/billing

**Invite flow:**
Owner → Settings → Team Members → Invite by email → select properties → set permission → send. Invitee gets email → creates/logs into account → shared PGs appear.

**Audit trail:**
All manager actions logged with identity. Owner sees full history.

---

## 13. AI Assistant (v1)

**For:** Owners and managers only
**Access:** Floating chat button in owner portal

**Capabilities (read-only):**
- "How many pending payments do I have?"
- "Which tenants are overdue this month?"
- "What's my occupancy rate?"
- "Show me all open maintenance tickets"
- "How much revenue did I collect last month?"

**Powered by:** Claude API, scoped to owner's own Supabase data

---

# PORTAL 2 — TENANT PORTAL

Mobile-first, WhatsApp-like simplicity. Everything in 2 taps max. Feels personal, not corporate.

**Access:** Separate URL, phone OTP login only. Account auto-created when owner adds tenant.

---

## 1. Home (Dashboard)

- Personalized greeting: "Good morning, Priya 👋"
- PG name + room always visible
- **Rent status card** — the most prominent element:
  - Paid: green "All Clear ✓" with paid date
  - Pending: amount + due date + Pay Now button
  - Overdue: red alert + amount + Pay Now button
- 4 Quick action cards: Payments, Complaints, Notices, Documents (each with badge count)
- Caretaker contact — always visible, one tap to call or WhatsApp
- "View House Rules" shortcut — pulls from owner's PG Rules in Settings
- Recent Announcements (latest 2, View All link)

---

## 2. Payments

- Summary: total paid, pending, overdue
- Full payment history — all time
- Each month shows:
  - Rent amount + itemized extra charges (electricity, water, etc.)
  - Status: Paid / Pending / Overdue
  - Paid date (if paid)
  - Pay Now via UPI link (if pending/overdue)
  - Download Receipt (if paid)
- Security deposit info: amount paid, refund status (if vacated)

---

## 3. Maintenance / Complaints

- Active tickets at top (Open + In Progress)
- Past tickets below (Resolved)
- Each ticket: issue title, priority badge, status badge, date, ticket ID
- New Request button (prominent)

**New Request form:**
- Issue title
- Description
- Priority: Low / Medium / High
- Photo upload (optional)
- Submit → confirmation with ticket ID + "We'll respond within 24 hours"

---

## 4. Announcements / Notices

- Pinned / Important notices at top (highlighted)
- All announcements below, newest first
- Filter: All / Maintenance / Payment / Rules / General
- Unread dot on unseen announcements
- Each card: category badge, title, full content, date

---

## 5. Documents

- ID proof (uploaded during onboarding)
- Rental agreement
- Payment receipts (auto-added monthly when paid)
- Any owner-uploaded files
- Download per file
- File cards with: name, type, date, size

---

## 6. Profile (Read-only)

- Photo (or first-letter avatar)
- Name, phone, email
- Property, floor, room, bed
- Monthly rent, security deposit, due date, join date
- Emergency contact details
- ID type (number masked for privacy)
- Sign Out button

---

## 7. Notifications (In-app)

- Bell icon in header with unread count
- Types: Payment confirmation, Maintenance update, New announcement, Rent reminder
- Click notification → navigates to relevant screen
- Mark all read
- Real-time updates

---

## 8. Help / Contact

- Caretaker: name, phone (tap to call), WhatsApp button
- Owner contact (for escalations)
- PG House Rules (full list pulled from owner's Settings)
- FAQ section (common questions)
- "Something wrong with your account?" → support email link

---

# PORTAL 3 — ADMIN PORTAL

Your command center for running the SaaS business. Data-dense, fast, everything actionable.

**Access:** Completely separate URL + login page. Password-based only. Your credentials.

---

## 1. Dashboard (Platform Overview)

**Business health (top row):**
- MRR with trend vs last month
- Total paying customers + new this month
- Total free users + conversion rate
- Platform churn rate

**Product health (second row):**
- Total properties across all owners
- Total tenants across platform
- Total open maintenance tickets platform-wide
- Total payments tracked this month

**Recent Activity feed:**
- New signups (with plan)
- Plan upgrades / downgrades
- Cancellations
- Support tickets opened
- Payment failures

---

## 2. Users (All PG Owners)

- Search by name, email, city
- Filter: All / Free / Pro / Scale / Trial / Suspended
- Sort: Newest / Most Revenue / Most Tenants / Last Active
- Each row: name + email, plan badge, city, properties, tenants, MRR contribution, last active, status
- Quick actions: View, Suspend, Change Plan

---

## 3. User Detail (Universal Data View)

Everything about one owner in one place.

**Owner info:**
- Name, email, phone, city, join date, plan, billing status

**Their business snapshot:**
- Properties count, tenants count, occupancy rate, monthly revenue collected, total payments tracked

**7 data tabs:**
- Tab 1 — Properties: all their properties, room count, occupancy, rent totals
- Tab 2 — Tenants: full tenant list with room, rent, payment status
- Tab 3 — Payments: all payment records, paid/pending/overdue
- Tab 4 — Maintenance: all tickets, statuses
- Tab 5 — Announcements: all broadcasts sent
- Tab 6 — Team: all managers/staff invited, their roles and properties
- Tab 7 — Activity Log: everything that happened in their account

**Admin actions:**
- Send Email (pre-filled with their email)
- Change Plan (Free / Pro / Scale)
- Extend Trial (add X days)
- Give Free Month (manual override)
- Suspend Account (with reason)
- Reactivate Account
- Add Internal Note (only you see)
- View As Owner (impersonate — see exactly what they see, for debugging)
- Delete Account (danger zone)

---

## 4. Subscriptions & Revenue

- MRR graph (last 12 months)
- Plan distribution: count on each plan
- Per-plan MRR breakdown
- New MRR this month (upgrades + new signups)
- Churned MRR (cancellations + downgrades)
- Net MRR growth
- Transaction history: every payment with date, owner, plan, amount, status
- Failed payments list
- Upcoming renewals (next 7 / 30 days)

**Manual subscription management:**
- Change any owner's plan directly
- Set custom renewal dates
- Apply discounts or free months
- Track special pricing per user (early customer deals, lifetime discounts)

---

## 5. Analytics

- User growth chart (signups per week/month)
- Retention curve (% active after 1/3/6 months)
- Feature usage across platform (which features most used)
- Geographic distribution (cities with most owners)
- Most active owners (by logins, data added)
- Churn risk list (inactive users flagged automatically — no login in 14+ days)

---

## 6. Support Tickets

- All tickets from all owners
- Filter: All / Open / In Progress / Resolved / Urgent
- Sort: Newest / Priority / Last Response
- Each ticket: owner name, subject, category, priority, status, created, last reply
- Click to open: full thread, add reply, change status/priority
- Internal notes (only admin sees)
- One-click email reply to owner
- Full owner account context visible on same screen as ticket

---

## 7. Platform Settings

- Admin profile
- Feature flags: enable/disable features platform-wide
- Maintenance mode toggle
- System email templates (welcome, receipts, subscription confirmation)
- WhatsApp platform credentials (Meta Business API)
- Billing / payment gateway config (Razorpay keys for future)
- Admin audit log: every admin action logged

---

# WHATSAPP INTEGRATION

**Provider:** Meta WhatsApp Business API (direct)

**5 outbound message triggers:**

1. Welcome — on tenant add (configurable delay)
   - Variables: `{{tenantName}}`, `{{pgName}}`, `{{room}}`, `{{portalLink}}`

2. Rent Reminder — auto X days before due + manual trigger
   - Variables: `{{tenantName}}`, `{{amount}}`, `{{dueDate}}`, `{{upiLink}}`

3. Payment Confirmation — when owner marks paid
   - Variables: `{{tenantName}}`, `{{amount}}`, `{{month}}`

4. Announcement Broadcast — when owner sends with WhatsApp on
   - Variables: `{{tenantName}}`, `{{title}}`, `{{content}}`

5. Complaint Status Update — when ticket status changes
   - Variables: `{{tenantName}}`, `{{ticketId}}`, `{{issue}}`, `{{status}}`

**Inbound:** Minimal. Any tenant message → auto-reply with portal link. Full chatbot after cost research.

---

# AI ASSISTANT

**Portal:** Owner Portal only (v1)
**Type:** Floating chat button
**Function:** Natural language queries on owner's own data (read-only)
**Powered by:** Claude API

---

# FUTURE SCOPE (Post v1)

- Razorpay / Stripe payment gateway
- Tenant mobile app (iOS + Android)
- PG Discovery marketplace
- Mess / food management
- Smart entry / biometric security
- Rating and review system
- White-label for PG chains
- Own PG chain brand
- Land and property brokerage
- Investment advisory platform
- Hostel / co-living / Airbnb expansion
- WhatsApp interactive chatbot (after cost research)
- UIDAI Aadhaar e-KYC
- Ticket assignment to staff
- Advanced analytics / occupancy forecasting
- Bulk tenant import
- Discount codes / promo system

---

*Document version: 2.0 | Final reviewed scope | Khush Goyal*
