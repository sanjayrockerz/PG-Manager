Build a complete, beautiful, fully responsive web app called "RentCare" — Tenant Portal.

This is a consumer-facing product used by students and young professionals living in PG accommodations. The design should feel modern, colorful, friendly and premium — like a top consumer app (think Swiggy, Zepto, Urban Company level polish). Not corporate, not boring.

Tech stack: React + TypeScript + Tailwind CSS

=== DESIGN SYSTEM ===
Primary: #4F46E5 (purple)
Secondary gradient: #4F46E5 → #7C3AED (purple to violet)
Accent colors used throughout: 
- Green (#10B981) for paid/success states
- Amber (#F59E0B) for pending/warning
- Red (#EF4444) for overdue/danger
- Blue (#3B82F6) for informational
Background: #F8FAFC (very light gray)
Cards: white, 1px #E2E8F0 border, 12px radius, subtle shadow
Font: Inter
Icons: Tabler icons (outline style)
Use color generously — colored section headers, colored icon backgrounds, gradient buttons, colored stat cards. Make it feel alive.

=== SIDEBAR (desktop) ===
Width: 240px, white background, 1px right border
Top: RentCare logo (purple gradient icon + "RentCare" bold + "Tenant Portal" small gray)
Below logo: Tenant profile card with purple gradient background showing tenant avatar (initials circle), name, room number and PG name in white text
Navigation with section labels:
- OVERVIEW: Dashboard
- FINANCE: Payments
- OPERATIONS: Maintenance, Announcements  
- MY ACCOUNT: Documents, My Profile, Help & Rules
Bottom: Sign Out button (red text, border)
Active nav item: purple background, purple text, bold
On mobile (below 768px): sidebar hidden, slides in from left as drawer with dark overlay when hamburger tapped

=== TOPBAR (sticky, 56px) ===
Left: hamburger button (mobile only) + property chip showing building icon + "Green Valley PG · Room 205"
Right: notification bell with red badge + avatar circle + name + "tenant" role pill
White background, bottom border

=== AUTHENTICATION SCREENS ===

AUTH SCREEN 1 — Login:
Split layout (desktop):
Left panel (42%, purple gradient #4F46E5 to #7C3AED):
- RentCare logo white top left
- Large white headline: "Your PG, managed beautifully."
- White subtitle: "Track rent, file complaints, get announcements — all from one place."
- 3 white feature bullets with check icons:
  · Real-time rent tracking and payment history
  · File maintenance requests in seconds
  · Instant announcements from your PG
- Floating card mockup or illustration showing the dashboard (optional decorative)
- "Powered by RentCare" footer text white

Right panel (58%, white):
- Top right: "Are you a PG Owner? Sign in →" small link
- Centered form (max-width 420px):
  - "Welcome back 👋" heading (24px bold)
  - Subtitle: "Enter your mobile number to continue"
  - Phone input: Indian flag + "+91" gray prefix (non-editable) + 10-digit number input
  - "Send OTP →" full-width purple gradient button
  - Divider: "─── or ───"
  - Info box (light purple bg): "Don't have an account? Your PG owner adds you automatically. You'll receive a WhatsApp message with login instructions."
  - Support link: "Need help? support@rentcare.in"

AUTH SCREEN 2 — OTP Verification:
Same split layout:
Left: same purple panel
Right centered card:
- Back arrow link
- Phone icon in purple circle
- "Verify your number" heading
- "OTP sent to +91 XXXXX X3211" (partially masked)
- 6 OTP input boxes in a row (48×56px each, 8px gap, border, 10px radius, large font, auto-advance on input, highlight purple on focus)
- Timer: "Resend OTP in 0:29" countdown (gray). After 0: "Resend OTP" purple link
- "Verify & Continue →" full-width button (disabled + gray until 6 digits, purple when ready)
- Error state: red border on all boxes + "Incorrect OTP. Please try again." red text

AUTH SCREEN 3 — Welcome / First Login:
Left: same purple panel
Right centered card:
- Large animated green checkmark circle (56px)
- "Welcome to RentCare, Priya! 🎉" heading
- "Your account has been set up by Green Valley PG."
- Info card (light purple gradient bg, rounded):
  Room 205 · Bed A · Floor 2
  Monthly Rent: ₹6,000 · Due on 5th
  PG: Green Valley PG
- "Go to my Dashboard →" full-width purple button
- Small text: "Your payment history and documents will appear here as your PG manager updates them."

Mobile auth: hide left panel, show white page with RentCare logo at top, then form centered

=== MAIN APP SCREENS ===

SCREEN 1 — Dashboard:
Page title: "Good morning, Priya 👋" with subtitle "Green Valley PG · Room 205, Bed A · Floor 2"

Top stats row (4 cards):
Each card: white, colored left border accent, colored icon background on right
1. Monthly Rent — ₹6,000 — "Due on 5th every month" — purple icon
2. May Status — ₹6,450 Due — "Due by May 5, 2026" — amber icon (or green "All Clear ✓" if paid)
3. Security Deposit — ₹12,000 — "Active tenancy" — green icon
4. Staying Since — Feb 2024 — "15+ months" — blue icon

Middle row (2 columns):
Left — Rent Status card:
  Header: "Rent Status" + status pill
  If pending: amber banner with amount, due date, "Pay via UPI →" purple button
  If paid: green banner with checkmark, paid date and method
Right — Caretaker Contact card:
  Caretaker avatar (initials, colorful) + name + number
  Two buttons: "📞 Call" (outline) + "WhatsApp" (green outline)

Bottom row (2 columns):
Left — Recent Announcements card with "View all →" button
  Shows latest 3 announcements with category pill, unread red dot if unread, title, preview text, date
Right — Quick Access 2×2 grid:
  Payments (purple bg icon), Maintenance (amber bg icon), Documents (green bg icon), House Rules (blue bg icon)
  Each: colored icon, label, sub-label (e.g. "1 pending")

SCREEN 2 — Payments:
Title: "Payments" + subtitle

3 stat cards: Total Paid (green), Pending (amber), Security Deposit (purple)

Payment History table (desktop) / cards (mobile):
Columns: Month, Base Rent, Extra Charges (with breakdown tooltip), Total, Due Date, Paid On, Method, Status pill, Action
Status pills: Paid=green, Pending=amber, Overdue=red
Actions: "Pay Now" purple button (pending) / "Receipt ↓" ghost button (paid)
Extra charges column: shows total + small gray "(Electricity, Water)" breakdown

Mobile cards show: month + total + status pill + extras if any + action button

UPI Payment Modal:
Dark overlay + white centered card
Amount bold large, month and PG name subtitle
Light purple UPI ID box showing "pgowner@upi" and amount
"Open UPI App →" full-width purple button
"Cancel" ghost button

SCREEN 3 — Maintenance:
Title: "Maintenance" + "New Request" purple button top right

3 stat cards: Total (purple), Active (amber), Resolved (green)

Ticket table (desktop) / cards (mobile):
Desktop columns: Ticket ID (monospace purple), Issue, Description, Priority pill, Status pill, Date
Priority pills: High=red, Medium=amber, Low=green
Status pills: Open=blue, In Progress=amber, Resolved=green
Mobile cards: issue title bold, description small, pills row, ticket ID + date small gray

SCREEN 4 — New Maintenance Request:
Back button + "New Maintenance Request" title
Form card (max-width 580px):
  Issue title input
  Description textarea (4 rows)
  Priority: 3 toggle buttons (Low green, Medium amber, High red — colored when selected)
  Photo upload area (dashed border, upload icon, "Optional — add a photo of the issue")
  Info banner (blue bg): "We typically respond within 24 hours. You'll get a WhatsApp update when status changes."
  "Submit Request →" full-width purple button

Success state (after submit):
  Green circle checkmark (animated)
  "Request Submitted!" title
  "Ticket #TKT0013 · We'll respond within 24 hours"
  WhatsApp notification note
  "Back to Maintenance" button

SCREEN 5 — Announcements:
Title: "Announcements"
Filter chips: All / Maintenance / Payment / Rules / General

Important/Pinned section (amber border card):
  Each: category pill + red unread dot + date top row, title bold, full body text

All Notices section (white card):
  Each: category pill + date, title, body text

Category pill colors:
  Maintenance = amber, Payment = blue, Rules = purple, General = gray

SCREEN 6 — Documents:
Title: "Documents" + files count badge

Table (desktop):
  Columns: Document (file icon + name), Type pill, Date, Size, Download button
  File icon: colored square (purple for ID, blue for agreement, green for receipts)

Mobile: stacked file cards with colored icon, name, meta info, download button

SCREEN 7 — My Profile:
Title: "My Profile"
Two-column layout:
  Left col:
    Personal Info card: large avatar circle (purple gradient), name, "Active tenant" badge, phone (purple link), email (purple link)
    Emergency Contact card: name + phone
  Right col:
    Room & Tenancy card: 8 info rows (Property, Room, Bed, Floor, Monthly Rent, Deposit, Due Date, Joined)
    Verification card: ID Type + masked ID Number

SCREEN 8 — Help & Rules:
Title: "Help & Rules"
Two-column:
  Left: Contact card
    Caretaker row: avatar + name + phone + Call + WhatsApp buttons
    Support email row: mail icon + support@rentcare.in
  Right: House Rules card (numbered list, 6 rules)

=== RESPONSIVE BREAKPOINTS ===
Desktop 1200px+: full sidebar, 4-column stats, 2-column layouts, full tables
Tablet 900-1200px: sidebar visible, 2-column stats, some single-column layouts
Mobile below 768px:
  Sidebar hidden → hamburger → slide-in drawer with backdrop
  4-column stats → 2-column
  Tables hidden → mobile card list shown instead
  2-column layouts → single column
  All buttons full width

=== DEMO DATA ===
Tenant: Priya Sharma, Room 205, Bed A, Floor 2, Green Valley PG, ₹6,000/month, joined Feb 2024
Caretaker: Ramesh Gupta, +91 97654 32100
Payments: May 2026 pending ₹6,450 (base ₹6,000 + Electricity ₹350 + Water ₹100), Apr paid ₹6,320, Mar paid ₹6,000, Feb paid ₹6,600
Tickets: TKT0012 AC not cooling (high, in progress), TKT0008 Bathroom tap leaking (medium, resolved), TKT0004 WiFi slow (low, resolved)
Announcements: Water Supply Maintenance (maintenance, important), May Rent Reminder (payment, important), Common Area Rules (rules), WiFi Password Updated (general)
Documents: Aadhaar Card, Rental Agreement, Apr Receipt, Mar Receipt
Rules: 6 house rules