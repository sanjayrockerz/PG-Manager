# PG Management SaaS - Product + Technical + Architectural Report

**Date:** May 9, 2026
**Repository:** Khush Project (PG Management SaaS)

---

## 1. Project Overview

### What the product is
PG Management is a multi-property operations platform for Paying Guest (PG) owners and teams. It centralizes tenant onboarding, room allocation, rent tracking, maintenance, announcements, analytics, and role-based access for owners, staff, tenants, and platform admins.

### Target users
- PG owners
- Owner managers and staff
- Tenants
- Platform admins

### Business problem solved
- Fragmented rent tracking and tenant communication
- Manual handling of maintenance and announcements
- Poor visibility into occupancy and arrears
- Lack of one system for multi-property PG operations

### How PG owners use it
- Add and manage properties and rooms
- Onboard tenants and assign beds
- Track rent status and payment dues
- Handle maintenance requests and announcements
- Review occupancy and revenue analytics
- Configure WhatsApp automation and rules

### Current maturity level
- Frontend: high maturity
- Data layer: hybrid demo/live architecture
- Backend: partial and separated from the main frontend flow
- Production readiness: intermediate, with strong UI but incomplete operational hardening

---

## 2. Complete Tech Stack Analysis

### Frontend stack
- React 18
- TypeScript
- Tailwind CSS v4
- Vite
- React Router is not actively used; navigation is tab/state based
- Recharts
- Lucide React
- Framer Motion via motion/react in parts of the codebase

### Backend stack
- Express + TypeScript in the backend folder
- Zod for validation
- Multer for uploads
- In-memory store in backend demo layer

### Data and auth stack
- Supabase for authentication, database, realtime, and storage
- Supabase JS client used directly from the frontend
- Email magic-link auth and Google sign-in in the current implementation

### Deployment stack
- Vercel for frontend deployment
- Supabase-hosted PostgreSQL and Auth
- Local backend appears as a separate, not fully integrated service

### APIs used
- Supabase APIs
- Photon geocoding API
- OpenStreetMap-backed address lookup

### Architectural patterns
- Context-driven state management
- Demo/live mode switching in the data service
- Realtime refresh hooks for live sync
- Property-scoped data loading
- Role-aware view gating in App.tsx

### Strengths
- Clean Supabase-first architecture
- Good modular split between UI, services, utils, and contexts
- Strong typed domain model in service layer
- Realtime sync already considered in design

### Weaknesses
- No route-based navigation or protected route system
- Some documentation still describes OTP phone auth while code uses email magic links
- Demo/live mode is localStorage controlled
- Backend and frontend are not unified around one data source

### Scalability concerns
- Large lists are fetched without pagination
- Local cache can become stale
- Realtime subscriptions are broad and can become noisy
- Dashboard analytics rely on simple aggregation rather than historical modeling

### Improvement opportunities
- Add route-based auth and RBAC
- Add pagination, filtering, and cursor-based list APIs
- Consolidate backend strategy
- Add stronger caching and index strategy
- Add audit logging and historical ledger tables

---

## 3. Folder Structure + Codebase Analysis

### Frontend structure
- src/components for screens and feature modules
- src/contexts for global app state
- src/services for backend and Supabase access
- src/data for demo data and data access logic
- src/hooks for realtime and geocoding utilities
- src/utils for roles, phone, and validation helpers
- src/styles for global styling

### Backend structure
- backend/src/routes for feature APIs
- backend/src/store for in-memory data store
- backend/src/utils for validation and shared helpers
- backend/uploads for local file storage

### Code organization quality
The codebase is relatively well structured. Feature areas are separated into distinct components and service modules. There is a clear distinction between demo data, Supabase-backed live data, and UI concerns.

### Modularity
- Strong feature-level separation
- Shared contexts reduce prop drilling
- Service layer centralizes data operations
- UI primitives are reusable

### Maintainability
- Good TypeScript coverage
- Service abstractions are readable
- Data model definitions are fairly explicit
- The largest maintainability risk is duplicated logic between demo mode, frontend state, backend demo API, and Supabase services

### Technical debt areas
- Large component files with mixed UI, validation, and data orchestration logic
- Missing route layer for direct navigation and deep-linking
- Documentation drift relative to actual auth implementation
- Two backend strategies exist conceptually, but only one is actively used in the frontend

---

## 4. Database and Supabase Architecture

### Core tables
- profiles
- owner_settings
- properties
- rooms
- tenants
- payments
- payment_charges
- maintenance_tickets
- maintenance_notes
- announcements
- notifications
- owner_user_property_scopes
- owner_subscriptions
- support_tickets
- support_ticket_comments
- owner_invites

### Relationship overview
- A profile can own many properties
- A property can contain many rooms
- A property can contain many tenants
- A tenant can have many payments
- A payment can have many extra charges
- A tenant can have many maintenance tickets
- An owner can have one settings record
- An owner can have one subscription record
- Support tickets can have many comments
- Invites can create scoped staff access rows

### RLS and scoped access
- RLS is enabled across major app tables
- Owner, manager, staff, tenant, platform admin, admin, and super admin roles are represented
- Scoped property permissions are stored in owner_user_property_scopes
- Helper functions determine current role, scope, and property capability

### Schema quality
The schema is thoughtfully designed for a multi-owner SaaS model. It already includes RBAC, invites, subscriptions, support, notifications, and property scoping.

### Weaknesses
- Some foreign keys are still missing or only implied in application logic
- Room-to-tenant and maintenance-to-tenant relationships are not fully normalized in every place
- The dashboard-oriented data model may need more historical tables for analytics

### Recommended upgrades
- Add missing FKs where the application assumes them
- Add composite indexes for owner/property/status queries
- Add audit/event tables for important mutations
- Add materialized views or aggregate tables for dashboards
- Add uniqueness rules where owner-scoped duplicates are undesirable

### ER-style explanation
- Owner/profile sits at the top of the ownership tree
- Properties belong to an owner
- Rooms belong to a property
- Tenants belong to a property and owner scope
- Payments belong to tenants and properties
- Maintenance tickets belong to properties and often tenants
- Announcements and notifications are owner-scoped
- Staff access is property-scoped through explicit mapping rows

### Data flow
1. UI triggers service calls
2. Services decide demo or live mode
3. Demo mode uses localStorage-backed data mutation
4. Live mode calls Supabase APIs and realtime subscriptions
5. UI refreshes through hooks and cache invalidation

---

## 5. Authentication System Analysis

### Current flow
- Email magic-link login
- Google sign-in support
- Profile bootstrapping through Supabase auth metadata and profile upsert logic
- Role-based routing after login

### Session handling
- Supabase session persistence enabled
- Auto-refresh token enabled
- Redirect URL resolution prefers configured site URL or local origin

### Protected routes
- Protection is view-level, not route-level
- App.tsx uses role-aware tab selection and guard logic

### Role handling
- Owner
- Owner manager
- Staff
- Tenant
- Platform admin
- Admin
- Super admin

### Security assessment
- Strong baseline due to Supabase Auth
- Weakness: no router-level protection
- Weakness: auth docs and implementation are not fully aligned
- Weakness: no MFA or device trust layer in the current UI flow

### Better approaches
- Add route guards and URL-level authorization
- Add MFA for owner/admin roles
- Separate tenant and owner auth UX flows more explicitly
- Add admin audit trail and invite lifecycle events

---

## 6. UI/UX System Analysis

### Design language
- Soft SaaS card layout
- Rounded containers and status pills
- Indigo/purple accent system
- Many surfaces use light borders and subtle shadows

### Layout quality
- Very functional owner dashboard layout
- Good use of cards, tables, and responsive sections
- Clear feature segmentation across modules

### Typography hierarchy
- Understandable, but not yet fully tokenized
- Some global style overrides are broad and can affect unintended elements

### Spacing system
- Consistent enough for a prototype-to-product bridge
- Some areas still feel hand-tuned rather than systematized

### Color system
- Strong status-color mapping
- Some areas still feel demo-ish because of repeated gradient and blue-violet patterns

### Dashboard structure
- KPI cards
- Recent activity and charts
- Property filter in the header
- Realtime status badges

### Mobile behavior
- Mobile nav exists
- Many data tables still rely on horizontal scrolling
- Responsive patterns are present but not deeply specialized for dense enterprise operations

### UI problems
- Some surfaces still look like an advanced prototype rather than a polished enterprise tool
- Table-heavy screens can feel cramped on mobile
- Several modals are generic and need more visual refinement

### Enterprise improvements
- Introduce a stronger design system with tokens
- Reduce visual noise and repetitive gradients
- Add density modes for tables
- Add more polished empty states and skeleton patterns
- Improve tablet layouts and filter ergonomics

---

## 7. Dashboard and Analytics System

### Current behavior
- Monthly revenue is derived from paid payments in the selected property scope
- Pending amount comes from pending and overdue payments
- Occupancy rate is calculated from occupied rooms over total rooms
- Recent payments and activity are shown from dashboard snapshots

### What is fake or demo-driven
- Demo mode data is local and synthetic
- Some activity timelines are still snapshot based rather than event-sourced

### What is live
- Supabase-backed dashboard data in live mode
- Realtime refresh subscriptions on related tables

### Risks
- Analytics are operational, not historical or predictive
- Revenue is not represented as a true ledger
- No month-by-month accounting history or invoice model

### Improvements
- Revenue ledger and invoice tables
- Aging buckets for overdue payments
- Occupancy trend graphs over time
- Revenue forecasting
- Property-level comparisons and filters

---

## 8. Demo Mode vs Live Mode Architecture

### Demo mode
- Backed by localStorage
- Uses seed demo data
- All CRUD mutates the local store
- No backend interaction is allowed

### Live mode
- Uses Supabase APIs
- Realtime subscriptions are enabled
- Data is persisted in the database

### Toggle architecture
- app_mode in localStorage
- Header mode toggle exposes the switch

### Risks
- Client-only mode switching is easy to misuse
- No server-enforced boundary between demo and live semantics
- Could produce confusion if persisted state and live data differ

### Better enterprise approach
- Environment-based demo mode only
- Explicit tenant-level demo workspace or sandbox account
- Server-side mode assertions
- Separate demo data seed and demo login path

---

## 9. Property Management Workflow

### Current workflow
Property -> Rooms -> Tenants -> Payments -> Maintenance -> Activity

### Workflow quality
- The core operational chain is represented well
- UI surfaces cover most owner workflows
- Tenant detail pages connect payments and maintenance history

### Missing business logic
- Tenant move-out flows
- Room transfer or swap logic
- Vacancy reservation and notice-period states
- Housekeeping and turnover tasks
- Asset inventory per room

### Operational gaps
- No true lifecycle state machine for tenants
- No room conflict resolution engine
- No automated churn or occupancy intelligence

### Recommended workflow upgrades
- Lead -> inquiry -> active -> notice -> vacated lifecycle
- Allocation rules for rooms and beds
- Turnover checklist and room readiness status
- Smart vacancy prediction and occupancy scoring

---

## 10. Payment System Analysis

### Current payment architecture
- Payment record per tenant
- Extra charges are tracked and added to total amount
- Payment status can be paid, pending, or overdue
- CSV export exists in UI

### What is missing
- No invoice entity
- No payment gateway reconciliation
- No receipt generation workflow
- No recurring billing engine
- No ledger or accounting trail

### Production-ready payment workflows
- Invoice generation per billing cycle
- Automated reminders before due date
- Failed payment retry handling
- Late fee application
- Receipt and ledger records
- Gateway integration preparation for Razorpay or Stripe

---

## 11. Address Autocomplete System Analysis

### Current implementation
- Photon API is used for geocoded suggestions
- Query is biased toward India
- Results are scored and normalized into structured address data

### Limitations
- Lower precision than Google Places for India-specific business addresses
- Fewer rich location semantics
- Less reliable for premium production onboarding

### Why Google Places is superior
- Better structured address metadata
- Stronger POI and locality coverage
- Higher match quality for Indian cities and commercial neighborhoods

### Hybrid architecture suggestion
- Primary: Google Places for production onboarding
- Fallback: Photon/OpenStreetMap for cost control or offline resilience
- Cache geocodes and place metadata in the database

---

## 12. Responsiveness and Mobile Analysis

### Current state
- Mobile bottom navigation exists
- Desktop sidebar is available
- Main feature pages are responsive

### Weak points
- Dense tables remain the hardest mobile surface
- Some dialogs are not optimized for smaller screens
- Mobile hierarchy is sometimes too visually busy

### Recommended mobile improvements
- Switch tables to cards below a breakpoint
- Add sticky filter bars
- Use compact metrics on mobile dashboard
- Optimize modal height and keyboard behavior
- Improve tablet-specific spacing and panel composition

---

## 13. Performance and Scalability Analysis

### Current performance profile
- Acceptable for small to medium PG datasets
- Realtime updates are already in use
- Local caches reduce reload friction

### Bottlenecks
- Full collection reads for list-heavy views
- No pagination or server-side search in the current flow
- Some charts and lists re-render frequently

### Optimization opportunities
- Paginate tenants, payments, support, and notifications
- Use query caching and invalidation strategies
- Add list virtualization for large tables
- Precompute dashboard metrics
- Add composite indexes and selective fetches

---

## 14. Security Analysis

### Current posture
- Supabase Auth plus RLS gives a solid baseline
- Demo data is isolated from live data in the frontend service layer
- Role separation exists in the UI and database policies

### Main risks
- View-level authorization is weaker than route and backend authorization
- Mode toggle is client-side only
- Admin and support surfaces need stronger auditability
- File uploads need stronger validation and storage policy clarity

### Production-grade security practices
- Add route-level authorization guards
- Add audit logs for sensitive actions
- Add MFA for privileged users
- Enforce strict Supabase RLS on every table
- Add content security headers and safer upload rules
- Add rate limits and abuse protection for public auth flows

---

## 15. Business and Product Analysis

### Monetization ideas
- Free tier for a single property
- Paid tier by property count or bed count
- Add-ons for WhatsApp automation, analytics, and premium support
- Enterprise plan for PG chains and multi-manager teams

### Subscription structure
- Free
- Pro
- Business
- Enterprise

### B2B opportunities
- PG chains
- Co-living brands
- Hostel operators
- Property managers handling multiple buildings

### Onboarding improvements
- Guided property setup
- Sample data sandbox
- Assisted first tenant import
- Checklist for payment and WhatsApp setup

### Retention systems
- Auto reminders
- Owner health score
- Occupancy alerts
- Renewal and overdue nudges
- Monthly operational summaries

---

## 16. AI and Automation Opportunities

- Late-payment prediction
- Tenant churn risk scoring
- Maintenance issue classification
- Smart WhatsApp follow-up automation
- Auto-generated reminders and escalations
- AI-assisted support triage
- Occupancy forecasting
- Revenue trend alerts

---

## 17. Feature Roadmap

### Critical
- Route-based RBAC
- Payment gateway integration
- Invoice and receipt system
- Tenant lifecycle workflows
- Pagination and query optimization

### Important
- Full audit logs
- Better mobile/tablet UX
- Notification center improvements
- Support workflow hardening
- Team invite and permissions UX improvements

### Nice-to-have
- AI insights and recommendations
- Better onboarding wizard
- Advanced search and filters
- Export/report center
- Improved visual analytics

### Enterprise-only
- White-labeling
- Multi-brand support
- Advanced billing controls
- SLA workflows
- Dedicated admin operations console

---

## 18. Final Professional Verdict

### Scores
- Architectural score: 7.5 / 10
- UI/UX maturity score: 8 / 10
- Scalability score: 6 / 10
- SaaS readiness score: 7 / 10
- Production readiness score: 6.5 / 10

### What is impressive
- Strong, polished frontend feature coverage
- Thoughtful Supabase data model
- Clear property, tenant, and payment workflows
- Good support for demo and live product modes

### What is weak
- Router-less application structure
- Documentation and implementation mismatch in auth flow
- Demo/live switching is too client-centric
- Data model needs more historical and ledger-grade depth

### What should be rebuilt
- Routing and auth guard architecture
- Payment accounting and invoice systems
- Tenant lifecycle and move-out flows
- Analytics architecture for scale

### Immediate priorities
1. Add route-based RBAC
2. Add invoice and payment ledger support
3. Add tenant lifecycle workflows
4. Add pagination and indexing for scale
5. Add audit logging and privileged action tracking

---

## 19. Summary for Claude Handoff

This codebase is already a strong SaaS prototype with a surprisingly complete operational surface area. The next stage is not more UI pages, but system maturity: route-level security, stable data architecture, payment accounting, tenant lifecycle depth, and enterprise-grade analytics. The product is well positioned to evolve from a polished PG management dashboard into a serious multi-tenant operations platform.
