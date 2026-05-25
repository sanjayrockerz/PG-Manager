Build the complete RentCare Owner Portal — the main product used daily by PG owners and their managers to run their PG business.

This is an existing design being upgraded. Match the current design language precisely while adding all new features and screens. Professional SaaS tool — clean, functional, data-focused.

Tech stack: React + TypeScript + Tailwind CSS

=== DESIGN SYSTEM ===
Primary: #4F46E5 (purple)
Background: #F8FAFC
Sidebar: white, 1px #E2E8F0 right border
Cards: white, 1px #E2E8F0 border, 12px radius
Stat cards: white with colored icon box on right (42px, 10px radius)
Tables: uppercase gray column headers, #F8FAFC header row background, 1px #F1F5F9 row dividers
Buttons: purple primary, outline secondary, ghost with border
Status pills: green=Active/Paid, amber=Pending/Warning, red=Overdue/Danger, blue=Info
Font: Inter
Icons: Tabler icons (outline)
Section labels in sidebar: 10px uppercase gray letter-spaced

=== SIDEBAR ===
Width: 230px, white background
Logo: purple square mark "R" + "RentCare" bold + "Owner Portal" small gray
Navigation sections and items:
  MANAGEMENT: Dashboard, Properties, Tenants
  FINANCE: Payments
  OPERATIONS: Maintenance, Announcements
  SUPPORT: Support (new — owner raises tickets to RentCare team)
  SETTINGS: Settings
Bottom: "Upgrade to Pro" card (purple gradient bg, small text, upgrade button) — visible only for free users
Footer: Sign Out
Active item: purple bg, purple text, bold
Mobile: hamburger + slide-in drawer with dark overlay

=== TOPBAR ===
White, 56px, sticky, 1px bottom border
Left: hamburger (mobile) + Property selector dropdown ("All Properties (2)" or specific property name with property count badge) + city + floors + rooms info chip (desktop only)
Center: Search bar "Search tenants, rooms, payments..." (desktop)
Right: Notification bell with red unread badge (opens dropdown panel on desktop, navigates to full screen on mobile) + user name + "owner" or "manager" role pill + avatar

=== AUTH SCREENS ===

AUTH SCREEN 1 — Login / Sign In:
Split layout (desktop):
Left panel (40%, purple gradient #4F46E5 to #7C3AED):
  RentCare logo white top left
  Large white headline: "Run your PG business from one place."
  White subtitle: "Properties, tenants, payments, maintenance — all managed digitally."
  4 feature bullets white:
    · Multi-property management
    · Automated rent reminders via WhatsApp
    · Real-time occupancy and revenue tracking
    · Tenant self-service portal included
  "Trusted by 200+ PG owners across India" social proof white
  "Powered by RentCare" footer

Right panel (60%, white):
  Top right: "Need help? support@rentcare.in"
  Centered form card (max-width 440px):
    "Sign in to RentCare" heading
    Subtitle "Manage your PG properties"
    Google OAuth button (white, border, Google logo icon, "Continue with Google" text)
    Divider "─── or sign in with email ───"
    Email input
    Password input + show/hide toggle
    "Forgot password?" right-aligned link
    "Sign In →" full-width purple button
    Divider
    "New to RentCare? Create a free account →" link

AUTH SCREEN 2 — Sign Up:
Same split layout:
Left: same purple panel
Right centered card:
  "Create your account" heading
  "Start managing your PG for free"
  Google OAuth button
  Divider "─── or sign up with email ───"
  Full name input
  Email input
  Password input + strength indicator bar
  "Create Account →" full-width purple button
  "Already have an account? Sign in →"
  Small terms text: "By creating an account you agree to our Terms and Privacy Policy"

AUTH SCREEN 3 — Forgot Password:
Same split layout:
Right centered card:
  Back arrow link
  Email icon purple circle
  "Reset your password" heading
  "Enter your email and we'll send you a reset link"
  Email input
  "Send Reset Link →" button
  Success state: green checkmark + "Reset link sent to your email"

AUTH SCREEN 4 — Quick Start Onboarding (after first signup):
Full white page (no split):
Progress bar at top showing 3 steps
Step 1: "Add your first property"
  Form: property name, address (Google Places autocomplete), city, state, number of floors, tracking type toggle (Room-based / Bed-based), caretaker name + phone + email
  "Continue →" button + "Skip for now" link
Step 2: "Add your first room"
  Shows property just created
  Form: room number, floor, type (Single/Double/Triple), beds (auto from type), monthly rent, status
  "+ Add another room" link
  "Continue →" + "Skip"
Step 3: "Add your first tenant"
  Form: photo upload, name, phone, email, select property/room/bed, rent amount, security deposit, due date, join date
  "Finish setup →" button
Completion: confetti animation + "You're all set! Let's go to your dashboard." with dashboard button

=== MAIN SCREENS ===

SCREEN 1 — Dashboard:
Title: "Dashboard" + "Viewing all X properties" subtitle
Demo data badge: green dot + "Demo data · Updated Xs ago" (same as current)
4 stat cards:
  Monthly Revenue ₹19,400 (+98% trend green), credit card icon purple
  Pending Payments ₹19,800 (2 invoices open, "1 Overdue" red tag), clock icon red
  Total Tenants 4 (across properties), people icon purple
  Occupancy Rate 71% (5/7 rooms occupied), bed icon green

Revenue Trend chart (line chart, full left column):
  X-axis months, Y-axis rupees, purple line
  "Monthly collections vs target" subtitle
  Hover tooltip showing exact amount

Recent Activity feed (right column):
  Title "Recent Activity" + "Latest events across the workspace"
  Mixed items: payment received, maintenance request, tenant added
  Each: colored icon in circle, description, property name, relative time
  Scrollable if many items

Building View entry card (new — below charts):
  Purple gradient card with building icon
  "Visual Building View" title
  Quick stats: "4 occupied · 3 vacant · 1 maintenance"
  "View Building →" white button

SCREEN 2 — Properties & Rooms:
Title: "Properties & Rooms" + "Manage all your PG properties and room configurations"
4 stat cards: Total Properties, Total Floors, Total Rooms, Total Beds
"+ Add Property" button top right

Property cards list:
  Each: purple-gray gradient top bar with building icon, property name, date added
  Address with pin icon
  3 mini stats: Floors, Rooms, Total Beds
  Contact person: name + phone + email
  Actions: chevron expand, edit pencil, delete trash

Expanded property (click chevron):
  "Room Management" section header + "+ Add Room" button
  Grouped by floor (Floor 1 — 4 rooms, Floor 2 — 3 rooms etc.)
  Each floor: gray header card
  Room cards in grid: room number (bold), type (Single/Double/Triple), beds count, rent amount, status badge (Occupied green / Vacant gray / Maintenance amber), occupied/total beds count
  Room card actions: edit + delete icons

Add Property modal:
  Multi-section form: Property Details (name, address, city, state, pincode, floors), Tracking Type toggle (Room-based / Bed-based), Contact Person (name, phone, email)
  Google Places API autocomplete on address

Add Room modal:
  Room number, Floor dropdown (limited to property floors), Type (Single/Double/Triple), Beds (auto-set, editable), Monthly Rent, Status dropdown

Building View screen (accessed from dashboard card and within Properties as a tab):
  Property selector dropdown at top
  Visual floor-by-floor grid of all rooms and beds
  Color coded: Green = Occupied, Light gray = Vacant, Amber = Maintenance
  Hover on room: tooltip showing tenant name(s) in that room
  Click occupied room: navigate to that tenant's detail page
  Click vacant room: show "Assign Tenant" option
  Floor labels on left

SCREEN 3 — Tenants:
Title: "Tenants" + "Manage all your tenants"
Demo data badge (same style as dashboard)
"+ Add Tenant" button top right
Search bar full width: "Search by name, room, phone or email..."
Table (desktop):
  Columns: Tenant (avatar initials circle + name + email), Property, Room Number, Contact (phone + email), Rent, Join Date, Status pill, Actions (eye view, pencil edit, trash delete)
  Property column only shown when "All Properties" selected
  Status: Active=green pill, Inactive=gray pill
Mobile: card list with 3-dot menu (View / Edit / Delete)

Add Tenant modal (6 sections):
Section 1 Basic Info: photo upload circle, full name, phone (+91), email
Section 2 Room Assignment: property dropdown → floor dropdown → room dropdown → bed dropdown (only if bed-based property)
Section 3 Rent Details: monthly rent, security deposit, rent due date (day 1-31)
Section 4 Emergency Contact: parent/guardian name, phone
Section 5 Verification: ID type (Aadhaar/Passport/DL/Voter), ID number, document upload
Section 6 Stay Details: join date, status toggle Active/Inactive
"Add Tenant" / "Update Tenant" button at bottom

Tenant Detail page (clicking view on any tenant):
Back button + "Tenant Details" + tenant name subtitle
Top profile card (white card):
  Large avatar (first letter, colored), name (20px bold), property + room + bed + floor
  Grid of info: phone, email, monthly rent, security deposit, join date, status badge, emergency contact, ID type + masked number
4 tabs:
  Tab 1 Payment History: table (date, room, amount, extra charges, total, status, receipt download button)
  Tab 2 Extra Charges: table (type pill, description, amount, date added) + "Add Charge" button
  Tab 3 Maintenance: table (ticket ID, issue, priority, status, date, source pill)
  Tab 4 Documents: file cards (icon, name, type, date, size, download button)

Tenant Vacate Flow:
When owner changes status to Inactive, slide-down panel appears:
  Vacate date picker, Security deposit refund amount, Refund date, Final settlement note textarea, Reason for leaving dropdown (optional)
  "Confirm Vacate" red button + "Cancel" link

SCREEN 4 — Payments:
Title: "Payments" + "Track and manage rent payments and charges"
Demo data badge
"Export" button top right with download icon

4 stat cards: Total Amount, Paid (green icon), Pending (amber icon), Overdue (red icon)
Search bar + filter chips (All / Paid / Pending / Overdue) + date dropdown (Current Month / Last Month / All Time / Custom Range)

Table:
  Tenant Name + room small, Property (all-props view), Room Number, Monthly Rent, Extra Charges, Total Amount, Due Date, Status (inline editable colored dropdown!), Actions
  Status dropdown: click to change between Paid/Pending/Overdue inline
  Actions: "+ Add Charge" purple button + send reminder icon button (WhatsApp icon, tooltip "Send WhatsApp reminder")

Add Charge modal:
  Tenant name (auto-filled), Charge type (Electricity/Water/Maintenance/Laundry/Internet/Custom dropdown), Description input, Amount input
  "Add Charge" button

Mark as Paid flow:
  When status changed to Paid: small inline form appears
  Payment date (auto today), Payment method dropdown (UPI/Cash/Bank Transfer/Cheque), Reference/Transaction ID (optional)
  "Confirm Payment" button → receipt auto-generated

SCREEN 5 — Maintenance:
Title: "Maintenance" + "Track and manage maintenance requests via WhatsApp"
"+ Manual Ticket" button top right

4 stat cards: Total Requests, Open (red), In Progress (amber), Resolved (green)
Filter chips: All / Open / In Progress / Resolved

Ticket cards (not table — cards for better readability):
  Each card:
    Left colored priority bar (red=HIGH, amber=MEDIUM, green=LOW)
    Top row: issue title (bold) + priority pill + source pill (WhatsApp green / Portal blue / Manual gray)
    Description text (1 line)
    Meta row: Ticket ID (monospace purple) + property name + tenant name + room + phone + date
    Notes preview if any notes exist
    Right side: status pill (colored) + "Update Status" purple button

Update Status panel (slides in or modal):
  Status toggle buttons (Open / In Progress / Resolved)
  Issue details section (read-only)
  Add note textarea with "Add Update Note" button
  Notes thread below (all previous notes with timestamp and author)

Manual Ticket form:
  Tenant dropdown, Property, Room number, Issue title, Description, Priority selector

SCREEN 6 — Announcements:
Title: "Announcements" + "Broadcast messages to tenants via WhatsApp"
"+ New Announcement" button top right
Filter chips: All / Maintenance / Payment / Rules / General

Pinned Announcements section (purple gradient subtle bg):
  Each: pin icon + category pill + WhatsApp pill (if sent) + views count (eye icon) + title + content + date
  Actions: Unpin, Edit, Resend (WhatsApp icon)

All Announcements:
  Each: bell icon + category pill + WhatsApp badge (if sent) + views count + title + content + date
  Actions: Pin, Edit, Send/Resend

New Announcement form modal:
  Title input
  Content textarea
  Category: 4 toggle buttons (Maintenance / Payment / Rules / General)
  Targeting section:
    "Send to" dropdown: All Properties / Specific Property
    If specific property selected: Floor multi-select checkboxes appear
  Pin this announcement toggle
  Send via WhatsApp toggle (default ON, shows estimated recipient count)
  "Create Announcement" button

SCREEN 7 — Notifications (full screen):
Title: "Notifications"
"Mark all as read" button top right
Filter chips: All / Payments / Maintenance / Tenants / Announcements
Notification items:
  Unread: white card with left purple border + blue dot
  Read: light gray card, no dot
  Each: colored icon circle + bold title + description + property name + relative time
  Click to mark as read
  Link icon to navigate to related record
Live status badge at top: green dot + "Maintenance stream · Updated Xs ago"

SCREEN 8 — Support:
Title: "Support" + "Get help from the RentCare team"
"+ New Ticket" button top right
Filter chips: All / Open / In Progress / Resolved / Closed
Ticket list:
  Each: subject (bold) + description preview + category pill + priority pill + status pill + created date + last reply date
  "View" button per ticket
  
New Ticket form:
  Subject, Description (textarea), Category (Billing/Technical/Operations/Tenant Management/Other), Priority (Low/Medium/High/Urgent), Property dropdown (optional)

Ticket detail (clicking View):
  Full conversation thread
  Admin replies shown (with "RentCare Support" avatar)
  Reply textarea + "Add Reply" button
  Status indicator (owner cannot change, only view)

SCREEN 9 — Settings (Tab-based):
Title: "Settings" + "Manage your account settings"

Tab 1 — Basic:
  Profile: avatar upload, full name, email (read-only)
  Notifications toggles: Payment notifications, Maintenance alerts, Tenant updates, Email notifications
  Security: "Change Password" button, Active Sessions info
  Additional: Language dropdown (English/Hindi/Marathi), Timezone (IST UTC+5:30), Currency (INR ₹)
  Danger Zone (red bg section): Export All Data, Delete All Data, Close Account buttons

Tab 2 — Payment Settings:
  UPI ID input (used to generate payment links in WhatsApp reminders)
  Bank Account Number input
  "Save Payment Settings" button
  Info box: "Your UPI ID is used to generate direct payment links sent to tenants in rent reminder WhatsApp messages."

Tab 3 — WhatsApp:
  WhatsApp Business number field + connection status
  4 automation templates (each):
    Toggle on/off
    Template name
    "Edit Template" button → opens modal with editable text and variable chips ({{tenantName}}, {{room}}, {{amount}}, etc.)
  Rent Reminder Timing: "Send reminder X days before due date" dropdown (1/2/3/5/7 days)
  PG Rules section:
    Numbered list of editable rules
    Edit/Delete per rule
    "+ Add Rule" button
    Info: "These rules are shared with tenants via WhatsApp and visible in the Tenant Portal"

Tab 4 — Team Members:
  "Invite Member" button top right
  Team list table: avatar + name + email, Role pill (Viewer/Editor/Manager), Properties assigned, Invite status (Accepted/Pending/Expired), Actions (Edit/Revoke)
  Invite modal: email input, Properties multi-select, Permission level (3 option cards: Viewer/Editor/Manager with description of each)
  
  Property selector behavior info box: "Managers see their own properties under 'My Properties' and your shared properties under 'Shared PGs' — they never mix."

Tab 5 — Subscription:
  Current plan card: plan name (Free/Pro/Scale), features list, renewal date, price
  For Free users: prominent "Upgrade to Pro" card with features comparison
  For paid users: "Manage Billing" and "Cancel Subscription" options
  Billing history table: date, description, amount, status, invoice download

Tab 6 — Audit Log:
  Full log of all important account actions
  Each: timestamp, user (owner/manager name), action description, affected record
  Filter: All / Payments / Tenants / Settings / Maintenance
  Color coded: green=created, amber=updated, red=deleted
  Especially shows manager actions: "Priya (Manager) marked Rahul Kumar's May payment as Paid"

=== MULTI-USER BEHAVIOR ===
When manager logs in (role = owner_manager or staff):
  Sidebar shows "My Properties" section and "Shared PGs" section
  Property selector dropdown has two groups:
    "My Properties" — properties the manager owns themselves
    "Shared PGs" — properties shared by owners, each with a "Shared" badge
  "All Properties" in dropdown only aggregates their own properties
  Dashboard stats only show their own properties when "All Properties" selected
  Shared PG data shown only when that specific shared PG is selected
  Permission-based UI: Viewer sees no edit/delete buttons. Editor cannot see Payments tab. Manager has full access except Subscription tab.

=== RESPONSIVE ===
Desktop 1200px+: full 230px sidebar, all multi-column layouts, full tables
Tablet 900-1200px: sidebar visible, 2-column stat grids, some layouts compress
Mobile below 768px:
  Sidebar hidden → hamburger → slide-in drawer with dark overlay
  Stats: 4-col → 2-col
  Tables → mobile card list
  2-col layouts → single column
  Modals: full screen on mobile
  Bottom navigation bar alternative: Home, Tenants, Payments, Settings (4 items only, for quick access on mobile)

=== DEMO DATA ===
Owner: Khush Goyal, goyalkhush1214@gmail.com, Jaipur
Properties: Sunrise Residency (Indiranagar, 3 floors, 4 rooms, 6 beds) + Lakeview PG (HSR Layout, 2 floors, 3 rooms, 4 beds)
Tenants: 5 active tenants across both properties
Payments: mix of paid/pending/overdue for current month
Maintenance: 0 tickets (clean state matches current live build)
Mode toggle: Demo Mode / Live Mode toggle in topbar (matches current build exactly)