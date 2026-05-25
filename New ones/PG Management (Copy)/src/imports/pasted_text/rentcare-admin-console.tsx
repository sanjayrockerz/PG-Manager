Build a complete, fully responsive internal admin portal called "RentCare Admin Console".

This is an internal SaaS operations tool used by the platform operator to manage all PG owners, subscriptions, revenue, analytics and support. Design should feel professional, data-dense, and authoritative — like Stripe Dashboard or Vercel Admin. Dark navy sidebar, clean white content area.

Tech stack: React + TypeScript + Tailwind CSS

=== DESIGN SYSTEM ===
Sidebar background: #0F172A (dark navy)
Sidebar text: white and gray
Content background: #F8FAFC
Cards: white, 1px #E2E8F0 border, 12px radius
Primary action: #4F46E5 purple
Font: Inter
Stat cards: white with colored icon box on right (same as owner portal)
Tables: uppercase gray headers on #F8FAFC background row
Pills/badges: same color system (green=success, amber=warning, red=danger, blue=info, purple=primary)

=== SIDEBAR ===
Width: 240px, dark navy (#0F172A) background
Top: RentCare logo (purple "R" icon + "RentCare" white bold) + "Admin Console" gray small
Below: Admin profile card (slightly lighter navy bg) showing purple avatar "K", "Khush Goyal" white, "Super Admin" purple pill
Navigation (white icons and text, active = purple bg with white text):
  OVERVIEW: Dashboard
  USERS: All Owners, (User Detail opens as a page not nav item)
  REVENUE: Subscriptions, Transactions
  INSIGHTS: Analytics
  SUPPORT: Support Tickets
  SYSTEM: Platform Settings, Audit Log
Bottom: Sign Out (red text)
Mobile: collapses to hamburger, slide-in drawer

=== TOPBAR ===
White, 56px, sticky
Left: hamburger (mobile) + "RentCare Admin" bold + green dot + "All systems operational" pill
Right: bell icon + avatar + "Khush Goyal" + "Super Admin" dark pill

=== AUTH SCREENS ===

AUTH SCREEN 1 — Admin Login:
Full page dark navy background (#0F172A)
Center: white card (max-width 440px, 40px padding, 16px radius)
  RentCare logo mark + "RentCare" + "Admin Console" gray pill
  Thin divider
  "Admin Sign In" heading (20px bold)
  Lock icon + "Restricted access. Authorized personnel only." small gray text
  Email input with label
  Password input with label + show/hide eye icon
  "Sign In →" full-width purple button
  "Forgot password? Contact your system administrator." small gray
  "← Back to RentCare.in" small link
Outside card at bottom: shield icon + "Secure admin area. All actions are logged and monitored." gray small text

AUTH SCREEN 2 — Error State:
Same + red bordered inputs + red error banner "Invalid credentials. Please try again."

AUTH SCREEN 3 — Loading:
Same + spinner button "Signing in..."

=== MAIN SCREENS ===

SCREEN 1 — Dashboard:
Title: "Platform Overview" + today's date
Row 1 — 4 stat cards:
  MRR ₹68,000 (+18% green trend), purple icon
  Paying Customers 42 (+12 this month), blue icon
  Free Users 156 (21% conversion rate), gray icon
  Churn Rate 2.3% (↓ good), amber icon
Row 2 — 4 stat cards:
  Total Properties 89 across platform, blue icon
  Total Tenants 634 across platform, purple icon
  Open Support Tickets 7 (needs attention), red icon
  WhatsApp Messages 1,247 this month, green icon
Recent Activity card (full width):
  Feed: colored icon + action text + owner name + timestamp
  Items: new signups, plan upgrades, cancellations, support tickets, payment failures
  "View all activity →" link

SCREEN 2 — All Owners:
Title: "PG Owners" + "All registered owners on the platform"
4 stat cards: Total Users (198), Active (167), Free Tier (156), Paid (42)
Search bar (full width) + filter chips: All / Free / Pro / Scale / Trial / Suspended
Sort dropdown: Newest / Most Revenue / Most Tenants / Last Active
Table:
  Owner (avatar initials + name + email), Plan badge (gray=Free, purple=Pro, blue=Scale), City, Properties, Tenants, MRR contribution, Last Active, Status badge, View button
Status: Active=green pill, Trial=amber pill, Suspended=red pill
Pagination at bottom

SCREEN 3 — User Detail:
Back button + "Owner Details"
Top section:
  Large initials avatar (colored) + name (20px bold) + email + phone + city + joined date
  Plan badge + Status badge inline
  Row of 3 stat cards: Properties count, Tenants count, Monthly Revenue collected
Admin Actions row (horizontal buttons):
  "Send Email" ghost, "Change Plan" ghost with dropdown (Free/Pro/Scale), "Extend Trial" ghost, "Give Free Month" ghost, "Suspend Account" red outline, "View As Owner" purple primary
Internal note section: "Add internal note" expandable textarea with Save button

7 data tabs:
Tab 1 Properties: table (name, address, floors, rooms, occupancy %, tracking type)
Tab 2 Tenants: table (name, property, room, rent, join date, status)
Tab 3 Payments: table (tenant, month, amount, extra charges, status, paid date)
Tab 4 Maintenance: table (ticket ID, issue, property, priority, status, date)
Tab 5 Announcements: table (title, category, date, WhatsApp sent y/n, views)
Tab 6 Team: table (name, email, role, properties assigned, joined date, status)
Tab 7 Activity Log: chronological list (timestamp, user, action, target, details)

Use demo data for owner "Raj Mehta" — Pro plan, Jaipur, 2 properties, 8 tenants

SCREEN 4 — Subscriptions & Revenue:
Title: "Subscriptions & Revenue"
4 stat cards: MRR ₹68,000, New MRR ₹12,400, Churned MRR ₹3,200, Net Growth +₹9,200 (green)
Plan Distribution card:
  3 rows: Free (156 users, ₹0 MRR), Pro (38 users, ₹57,000 MRR), Scale (4 users, ₹11,000 MRR)
  Each row has horizontal progress bar
Upcoming Renewals card:
  Table: owner name, plan, renewal date, amount, days remaining
  Red row if under 3 days, amber if under 7 days
Failed Payments card:
  Table: owner, plan, amount, failure date, retries, Retry + Contact buttons
Recent Transactions table:
  Transaction ID, owner, plan, amount, date, status pill

SCREEN 5 — Transactions:
Title: "All Transactions"
Filter bar: date range picker + plan filter + status filter (All/Success/Failed/Refunded)
Full table:
  Transaction ID (monospace), Owner (avatar + name), Plan, Amount, Date, Method, Status pill
Export CSV button top right
Summary stats at top: Total Revenue, Successful, Failed, Refunded (4 small cards)

SCREEN 6 — Analytics:
Title: "Platform Analytics"
User Growth chart (line, 12 months) — card full width
Revenue Trend chart (bar, 12 months) — card full width
Two columns:
  Left: Feature Usage — horizontal bars (Payments, Tenants, Maintenance, Announcements, WhatsApp, Documents) with count + %
  Right: Top Cities — list with progress bars (Jaipur 28, Bangalore 19, Mumbai 14, Delhi 11, Pune 8, Others 22)
Two columns below:
  Left: Most Active Owners — table (rank, owner, logins, last active, properties, tenants)
  Right: Churn Risk — table (owner, plan, last login, days inactive, "Send Re-engagement" button per row red outline)

SCREEN 7 — Support Tickets:
Title: "Support Tickets"
4 stat cards: Total, Open, In Progress, Avg Response Time
Filter chips: All / Open / In Progress / Resolved / Urgent
Ticket cards list (not table):
  Each card:
    Left color bar (red=urgent, amber=high, blue=medium, gray=low)
    Owner avatar + name + email (small)
    Subject bold + description preview (1 line truncated)
    Category pill + Priority pill + Status pill
    Created date + Last reply date
    "View & Reply →" button right side
Reply panel (slides in from right when View & Reply clicked):
  Owner summary bar at top: plan badge + properties + tenants + member since
  Chat-style thread: owner messages left (gray bg), admin replies right (purple bg)
  Internal note input (yellow bg, eye-slash icon, "Only you can see this")
  Reply textarea + "Send Reply" button
  Status dropdown + Priority dropdown
  Ticket ID and created date footer

SCREEN 8 — Platform Settings:
Title: "Platform Settings"
5 tabs: General / Email Templates / WhatsApp / Billing / Security

General tab:
  Platform name field "RentCare"
  Support email field
  Maintenance mode toggle with red warning banner "Enabling this shows maintenance page to all users"
  Feature Flags section: toggle switches for WhatsApp Integration, AI Assistant, Tenant Portal, Multi-User, Receipt Generation, Building View

Email Templates tab:
  List of templates: Welcome Email, Rent Reminder, Payment Receipt, Subscription Confirmation, Password Reset
  Each row: template name + description + last edited + Edit button
  Clicking Edit opens inline card with subject + body editable fields + variable chips ({{name}}, {{amount}} etc.) + Save + Cancel

WhatsApp tab:
  Connection status (green dot "Connected" or red "Disconnected")
  Phone number registered
  Monthly usage: messages sent vs limit (progress bar)
  Template status table: template name + status pill (Approved=green, Pending=amber, Rejected=red) + last used

Billing tab:
  Razorpay: connection status + API key (masked) + Webhook URL
  Test mode / Live mode toggle with amber warning
  "Verify Connection" button

Security tab:
  Admin accounts table (Khush Goyal, Super Admin, last login, 2FA status)
  Session timeout dropdown
  "Download Full Audit Log" button purple

SCREEN 9 — Audit Log:
Title: "Audit Log" + "Complete record of all platform admin actions"
Filter bar: date range picker + action type dropdown (All / User Management / Subscription / Support / Settings / Login)
Export CSV button
Full table:
  Timestamp, Admin, Action (color-coded: green=create, amber=update, red=delete/suspend, blue=login), Target, Details, IP Address
Demo rows:
  "Changed plan: Raj Mehta → Pro to Scale"
  "Suspended account: Anita Sharma (non-payment)"
  "Replied to ticket #47: Payment issue"
  "Updated email template: Welcome Email"
  "Admin login: Khush Goyal from 106.51.x.x"
  "Feature flag enabled: AI Assistant"
  "Extended trial: Vikram Patel +14 days"

=== RESPONSIVE ===
Desktop 1200px+: full dark sidebar, all columns
Tablet 900px: sidebar visible smaller, some grids 2-col
Mobile 768px: sidebar hidden, hamburger, tables become cards

=== DEMO DATA ===
Platform: 198 users, 42 paying, ₹68,000 MRR
Owners: Raj Mehta (Pro, Jaipur), Anita Sharma (Scale, Bangalore), Vikram Patel (Free, Mumbai)
Support: 7 open tickets, avg 4hr response
Transactions: mix of success/failed/refunded