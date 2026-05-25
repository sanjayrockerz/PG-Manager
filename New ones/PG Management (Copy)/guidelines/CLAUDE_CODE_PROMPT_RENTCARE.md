# Claude Code Prompt — RentCare PG Management Portal Restructuring

> Paste this entire file as your opening message in a Claude Code session opened at your project root.

---

## CONTEXT & ROLE

You are a senior full-stack engineer and careful refactoring assistant. You are working on an existing Next.js (or React) SaaS project called **RentCare** — a PG (Paying Guest) property management platform. The project uses Supabase for auth and database, and is deployed on Vercel.

The codebase already has a working **Owner Portal** (the main portal). The client has provided a new Figma design. There are two additional portals to wire up: **Admin Portal** and **Tenant Portal**. A landing page ("portal selector") already exists or needs to be created so users choose which portal to enter after visiting the root URL.

---

## STEP 0 — READ BEFORE TOUCHING ANY FILE

Before making any change, do the following analysis and **print all findings** as a structured report. Do not skip any section.

### 0.1 — Project structure scan
```
list all files and folders from the project root, 2 levels deep.
```
Then look for and list:
- Framework: Next.js pages router / Next.js app router / Vite+React / CRA
- Auth provider: Supabase / Firebase / Clerk / custom
- State management: Context / Zustand / Redux / none
- Styling: Tailwind / CSS Modules / Styled Components / plain CSS
- Routing file(s): `_app.tsx`, `app/layout.tsx`, `App.tsx`, `router.tsx` — whichever exists

### 0.2 — Portal-related files
Search for any file whose path or name contains:
`portal`, `owner`, `admin`, `tenant`, `dashboard`, `landlord`, `pg-`, `property`

List every match with its full relative path.

### 0.3 — Login & post-login routing
Find the login component/page. Trace:
1. Where does login submit go? (Supabase `signInWithPassword` / `signIn` / similar)
2. After successful login, what route does the app redirect to?
3. Is there role-based routing? (check for `user.role`, `user.user_metadata`, `profile.role`, or similar)
4. Are there any route guards / middleware / `useEffect` redirects?

Print the relevant code snippets (just the routing logic, not entire files).

### 0.4 — Existing Owner Portal layout
Find the main Owner Portal layout file (likely `DashboardLayout`, `OwnerLayout`, `MainLayout`, or similar).
Print:
- The sidebar navigation items (labels + routes)
- The top navbar structure
- Any property switcher / dropdown component

### 0.5 — Supabase schema hints
Look for any of: `types/database.ts`, `lib/supabase.ts`, `utils/supabase.ts`, `schema.sql`, or type definitions that hint at table names.
List table names and key columns you can infer.

### 0.6 — Zip / reference files
The user has provided reference files at:
```
C:\Users\motis\Downloads\Khush Project\New ones\PG Management (Copy).zip
```
If you can access this path (Windows local path), unzip and list its contents.
If not accessible from your current working directory, note that and proceed using the Figma screenshots as the UI reference instead.

---

## STEP 1 — ANALYSIS REPORT (print before any code changes)

After Step 0, output a report with these sections:

```
### Current project structure summary
[Your findings from 0.1]

### Portal-related files found
[Your findings from 0.2]

### Login / post-login routing summary
[Your findings from 0.3 — include code snippets]

### Recommended architecture for 3 portals
[See the architecture spec below — adapt to what you found]

### Owner Portal files that need modification
[List specific files, what needs to change, and why]

### Risk areas
[List anything that could break: auth guards, Supabase RLS, hardcoded routes, etc.]

### Safe implementation plan (ordered steps)
[List steps 1–N, each small and reversible]
```

**Wait for user approval before proceeding to Step 2.**

---

## STEP 2 — PORTAL SELECTOR PAGE

### Target UI (from Figma / screenshot)
The root page (`/` or `/select-portal`) should show:
- RentCare logo (purple gradient icon + bold "RentCare" wordmark)
- Subtitle: "Select your portal to continue"
- Three portal cards side by side:
  1. **Main Portal** — Owner & Manager Dashboard — "Manage properties, tenants, payments, and operations" — purple gradient icon (spreadsheet/grid icon)
  2. **Admin Portal** — Super Admin Dashboard — "Platform management, subscriptions, and analytics" — pink/magenta gradient icon (shield/check icon)
  3. **Tenant Portal** — For Residents — "Track rent, make payments, request maintenance, and more" — teal/blue gradient icon (home icon)
- Below cards: "Version 1 (Classic)" option (gray card, gear icon) linking to old version
- Footer: "Need help? Contact support at support@rentcare.in"
- Background: very light lavender (#F0EFFF or similar)

### Implementation rules
- **Do not replace** the existing login page. The portal selector comes BEFORE login, or can redirect to a portal-specific login.
- If the app already has a portal selector, update its UI to match the above. If it doesn't exist, create it.
- Each portal card click should navigate to that portal's login or dashboard (if already authenticated with correct role).
- Use existing component patterns from the codebase (same icon library, same button style, same font).
- File location: follow existing routing convention. In Next.js pages router: `pages/index.tsx`. In app router: `app/page.tsx`. In Vite React: update `App.tsx` router.

### Do NOT change
- Supabase auth logic
- Existing login form
- Any database calls

---

## STEP 3 — POST-LOGIN ROUTING (role-based)

After login, users must be routed to the correct portal based on their role. Implement this safely:

### Role detection logic
Look for the user's role in this priority order:
1. `user.user_metadata.role`
2. A `profiles` table row: `SELECT role FROM profiles WHERE id = user.id`
3. A `users` table row with a `role` column
4. If no role system exists, ask the user before inventing one

### Routing map
```
role = 'owner'  OR 'manager'   →  /owner/dashboard   (Owner Portal)
role = 'admin'  OR 'superadmin' →  /admin/dashboard   (Admin Portal)
role = 'tenant' OR 'resident'   →  /tenant/dashboard  (Tenant Portal)
no role / unknown               →  /select-portal     (back to selector)
```

### Implementation
- Add or update the post-login redirect logic in the auth callback / login success handler.
- If a `middleware.ts` (Next.js) or route guard exists, update it to enforce portal isolation (owner can't access /admin, etc.).
- If no middleware exists, add lightweight client-side guards using `useEffect` + router push in each portal's layout component.
- **Minimal change**: only modify the redirect target, not the auth flow itself.

---

## STEP 4 — OWNER PORTAL UI UPDATE

This is the primary UI work. Match the Figma design shown in the screenshots.

### Reference UI elements (from screenshots)

**Sidebar (left nav)**
- Width: ~230px expanded, collapses to ~70px (icons only) on toggle
- Top: RentCare logo + "R" avatar + "Owner Portal" label
- Property switcher: "All Properties (2)" dropdown button at top of content area (NOT in sidebar)
- Sections and items:
  - MANAGEMENT: Dashboard, Properties, Tenants
  - FINANCE: Payments
  - OPERATIONS: Maintenance, Announcements
  - UPGRADE: Pricing
  - SUPPORT: Support
  - SETTINGS (section header, collapsible)
- Bottom of sidebar: "Upgrade to Pro" card (purple gradient, "Unlock all features", "Upgrade Now" button)
- Sign Out link at very bottom
- Collapse toggle: arrow button on the right edge of sidebar

**Topbar**
- Search bar: "Search tenants, rooms, payments..."
- Bell icon (notifications)
- User avatar + name + role ("Khush Goyal / owner")

**Dashboard page content**
- Page title: "Dashboard" with "Building View" toggle button (top right)
- Subtitle: "Viewing all 2 properties · Demo data · Updated Xs ago"
- 4 stat cards in a row:
  - Monthly Revenue: ₹19,400 (+98% badge, green)
  - Pending Payments: ₹19,800 (2 invoices open, "1 Overdue" red badge)
  - Total Tenants: 4 (across properties)
  - Occupancy Rate: 71% (5/7 rooms occupied)
- Revenue Trend chart (bar chart, purple actual vs gray target, "Last 5 months" selector)
- Recent Activity panel (right side): Payment received, Maintenance request, New tenant added
- Occupancy by Property (progress bars per property)
- Recent Payments table
- Upcoming Dues table

**Color palette (extract from Figma)**
- Primary purple: #7C3AED or similar (sidebar active state, buttons, badges)
- Gradient: purple-to-blue for header elements
- Stat card icons: colored circle backgrounds (purple, red/orange, blue, green)
- Sidebar background: white with subtle border-right
- Active nav item: purple gradient pill/background
- "Overdue" badge: red (#EF4444 bg, white text)
- Growth badge: green (#10B981 or similar)

### Implementation approach

1. **Sidebar component**: Find the existing sidebar file. Update:
   - Add collapse toggle button (positioned outside/overlapping sidebar right edge)
   - Add "Upgrade to Pro" card at bottom
   - Update nav items to match the section groupings above
   - Add smooth CSS transition for collapse (width: 230px ↔ 70px)
   - Use `localStorage` to persist collapsed state
   - On collapse: hide text labels, show only icons with tooltips

2. **Header/Topbar component**: Find existing header. Update:
   - Move property switcher (All Properties dropdown) from sidebar to top of main content area
   - Keep search, notifications, user info in topbar

3. **Dashboard page**: Find existing dashboard. Update:
   - Ensure 4 stat cards are present with correct labels
   - Revenue Trend chart: if using recharts/chart.js, update colors to purple (#7C3AED) for actual, gray (#D1D5DB) for target
   - Add "Recent Activity" panel if missing
   - Add "Occupancy by Property" section with progress bars if missing

4. **Color/theme tokens**: If Tailwind is used, check `tailwind.config.js` for custom colors. Add/update the purple palette if needed. Do not change base Tailwind colors.

### Do NOT change
- Any Supabase data fetching hooks or queries
- The data structures / types
- Any working form logic (add tenant, add payment, etc.)
- Backend API routes

---

## STEP 5 — ADMIN PORTAL SCAFFOLD

Create a minimal but correct scaffold. Do not build all features — just the structure.

### Files to create
Following the existing file structure pattern:
- Layout: `pages/admin/layout.tsx` OR `app/admin/layout.tsx` (match existing convention)
- Dashboard: `pages/admin/dashboard.tsx` OR `app/admin/dashboard/page.tsx`

### Content
The Admin Portal layout should:
- Have its own sidebar (different from Owner Portal)
- Admin nav items: Dashboard, Users, Properties, Subscriptions, Analytics, Settings
- Use same UI component library as Owner Portal
- Show "Super Admin Dashboard" as the portal label
- Be protected: only accessible to users with `role = 'admin'` or `role = 'superadmin'`

The Admin dashboard page should show a placeholder:
```
<h1>Admin Dashboard</h1>
<p>Platform overview — coming soon</p>
```

---

## STEP 6 — TENANT PORTAL SCAFFOLD

Same approach as Admin Portal.

### Files to create
- Layout: `pages/tenant/layout.tsx` OR `app/tenant/layout.tsx`
- Dashboard: `pages/tenant/dashboard.tsx` OR `app/tenant/dashboard/page.tsx`

### Content
The Tenant Portal layout should:
- Have a simplified sidebar or bottom nav (mobile-first, as tenants use phones)
- Nav items: Home, Rent, Maintenance, Announcements, Profile
- Be protected: only accessible to users with `role = 'tenant'` or `role = 'resident'`

The Tenant dashboard page should show a placeholder:
```
<h1>Welcome, [Tenant Name]</h1>
<p>Your dashboard — coming soon</p>
```

---

## IMPLEMENTATION RULES (NON-NEGOTIABLE)

1. **Small safe steps only.** Make one change at a time. After each file change, state what you changed and why.
2. **No destructive refactors.** Do not delete files. Do not rename existing working components. Do not rewrite files from scratch — edit in place.
3. **No backend changes.** Do not touch Supabase schema, RLS policies, Edge Functions, or API route business logic.
4. **Reuse existing components.** If a Button, Card, or Icon component exists, use it. Do not introduce a new UI library.
5. **Preserve all working state.** If a feature works today (e.g., adding a tenant, recording a payment), it must still work after your changes.
6. **Ask before assuming.** If you find an ambiguity (e.g., two sidebar files, unclear role system), stop and ask before proceeding.
7. **TypeScript safety.** If the project uses TypeScript, do not introduce `any` types. Extend existing types.
8. **No new dependencies** without asking. If you think a library would help, propose it and wait for approval.

---

## FINAL OUTPUT REQUIRED

After all changes are complete, output this summary:

```
### Changed files
[List every file modified or created, with a one-line description of what changed]

### Portal integration summary
[How the 3 portals are now structured and routed]

### Owner Portal UI updates
[What UI elements were updated to match Figma]

### Backend / database impact
[Confirm: no schema changes / list any RLS or query changes if unavoidable]

### Remaining blockers
[List anything that could not be completed and why]

### Suggested next steps
[What to do in the next session]
```

---

## REFERENCE: Figma Design Key Observations

From the provided screenshots:

**Portal Selector page:**
- Clean white cards on lavender background
- Three equal-width portal cards with gradient icon badges
- Card hover state likely has subtle shadow or border highlight
- "Version 1 (Classic)" is a fourth smaller card below the three main ones

**Owner Portal Dashboard:**
- Sidebar: white bg, active item has full purple gradient pill (text + icon)
- Collapse button: circular arrow button overlapping the sidebar's right edge
- Stat cards: white bg with colored icon circle (top-right of each card)
- Revenue Trend: dual bar chart (purple = actual, light gray = target)
- Recent Activity: right sidebar panel with icon + title + subtitle + timestamp format
- All monetary values in Indian Rupee (₹) format
- Property selector is a dropdown button at the top, not in the sidebar

---

*End of prompt. Begin with Step 0 analysis and print the full report before touching any file.*
