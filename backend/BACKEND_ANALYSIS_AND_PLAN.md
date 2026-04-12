# Backend Analysis and Execution Plan (UI as Source of Truth)

## 1) Repository and UI Analysis

### App entry points and route structure
- Frontend entry: `src/main.tsx` -> `src/App.tsx`
- Navigation model: tab/state-driven, no React Router.
- Auth gate: `AuthContext` controls `OTPLogin` / `OTPSignup` before main app.
- Core navigation tabs from `Sidebar` and `MobileNav`:
  - dashboard
  - properties
  - tenants (with `tenant-detail` drilldown)
  - payments
  - maintenance
  - announcements
  - settings
  - notifications
  - pricing
  - mobile-mockup
  - admin-section
  - tenant-portal

### Page/module organization
- Core owner/operator screens: dashboard, properties, tenants, payments, maintenance, announcements, settings.
- Auxiliary surfaces: notifications, pricing, mobile mockup.
- Role-specific experiences: admin panel and tenant portal.

### Reusable components and contexts
- Reusable UI primitives: `src/components/ui/*`.
- Shared business contexts:
  - `src/contexts/AuthContext.tsx`
  - `src/contexts/PropertyContext.tsx`
- Shared mock utilities:
  - `src/utils/mockData.ts`

### Form-heavy screens and CRUD-heavy workflows
- Properties: property + room CRUD.
- Tenants: large onboarding/edit form with profile + KYC + emergency contacts + rent details.
- Payments: status transitions + extra charges.
- Maintenance: ticket creation + status updates + notes.
- Announcements: create/edit, category filters, pin, WhatsApp broadcast flags.
- Settings: PG rules + WhatsApp template automation settings.

### Dashboards, tables, cards, workflows
- Dashboard KPIs and revenue charts.
- Tenant and payments data tables with mobile card alternatives.
- Maintenance ticket lifecycle cards.
- Admin analytics tables (users, subscriptions, support tickets).

## 2) User Roles Visible in UI
- owner (primary app operator)
- admin (alternate privileged app user in auth type)
- tenant (tenant portal persona)
- super_admin (platform-level admin section behavior implied)

## 3) Entities Inferred from UI
- UserAccount
- Property
- Room
- Tenant
- Payment
- ExtraCharge
- MaintenanceTicket
- Announcement
- Notification
- AppSettings (PG rules + WhatsApp templates)
- AdminUser (SaaS operator surface)
- SupportTicket

## 4) Screen-by-screen Backend Needs (summary)
- Dashboard: aggregate KPIs, recent payments, recent maintenance.
- Properties: property/room list + CRUD.
- Tenants: list/search + CRUD + tenant detail relations.
- Tenant Detail: payment history, maintenance history, extra charges, documents.
- Payments: filter by property/status/date, status update, add charges.
- Maintenance: create ticket, status transitions, notes, source tagging.
- Announcements: list/filter/create/update/delete/pin, WhatsApp-send marker.
- Settings: PG rules and WhatsApp template config update.
- Notifications: list + read/mark-all-read.
- Admin Section: user list, support tickets, platform metrics.
- Tenant Portal: tenant profile + tenant payments/maintenance/announcements/documents.

## 5) Missing Integrations / Mocks / Placeholders Found
- Auth OTP verification is simulated in frontend context.
- Property context stores all CRUD in local state.
- `mockData.ts` drives tenants/rooms/payments/maintenance lists.
- Notifications, announcements, admin panel, tenant portal all mock-driven.
- Payments WhatsApp reminder and announcements WhatsApp broadcast are placeholder alert flows.
- File upload UI exists but no persistent backend integration existed before this implementation.

## 6) Backend Design Derived from UI

### Database entities and relationships
- Property 1..N Room
- Property 1..N Tenant
- Tenant 1..N Payment
- Payment 1..N ExtraCharge
- Property 1..N MaintenanceTicket
- Property/Global 1..N Announcement
- UserAccount 1..N Property (owner)

### Required backend modules/services
- auth
- properties (with nested rooms)
- tenants
- payments
- maintenance
- announcements
- settings
- notifications
- dashboard (aggregation)
- admin
- uploads

### Required API endpoints (implemented foundation)
- `/api/v1/auth/*`
- `/api/v1/properties/*`
- `/api/v1/tenants/*`
- `/api/v1/payments/*`
- `/api/v1/maintenance/*`
- `/api/v1/announcements/*`
- `/api/v1/settings/*`
- `/api/v1/notifications/*`
- `/api/v1/dashboard/stats`
- `/api/v1/admin/*`
- `/api/v1/uploads/*`

### Validation rules
- Zod validation added for auth, property, room, tenant, payment status/charge, maintenance ticket/status/note, announcement, settings updates.

### Authentication and authorization model (foundation)
- OTP-based auth endpoints included in demo mode contract.
- Returns user + token payload for frontend continuity.
- Full JWT and RBAC enforcement remains a next-phase hardening task.

### File upload/storage needs
- Added upload endpoints and local disk storage (`backend/uploads`).
- Returns URL references for tenant photo/document linkage.

### Notification and event flows
- Notification read-state endpoints added.
- Event-triggered notifications (on payment/maintenance changes) are planned next-phase automation.

### Reporting/analytics
- Dashboard stats endpoint implemented.
- Admin platform metrics endpoint implemented.

## 7) Feature-to-Backend Mapping
- Auth UI -> `auth` module
- Property/Room UI -> `properties` module
- Tenant UI and detail tabs -> `tenants`, `payments`, `maintenance`, uploads
- Payments UI -> `payments` module
- Maintenance UI -> `maintenance` module
- Announcements UI -> `announcements` module
- Settings UI -> `settings` module
- Notifications UI -> `notifications` module
- Dashboard UI -> `dashboard` module
- Admin UI -> `admin` module

## 8) Route/Page-to-API Mapping
- Dashboard -> `GET /dashboard/stats`
- Properties -> `GET/POST/PUT/DELETE /properties`, room nested endpoints
- Tenants -> `GET/POST/PUT/DELETE /tenants`, `GET /tenants/:id/*`
- Payments -> `GET /payments`, `PATCH /payments/:id/status`, `POST /payments/:id/charges`
- Maintenance -> `GET/POST /maintenance`, `PATCH /maintenance/:id/status`, `POST /maintenance/:id/notes`
- Announcements -> `GET/POST/PUT/DELETE /announcements`, `PATCH /announcements/:id/pin`
- Settings -> `GET /settings`, `PUT /settings/pg-rules`, `PUT /settings/whatsapp/:templateType`
- Notifications -> `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read`
- Admin -> `GET /admin/users`, `GET /admin/support-tickets`, `GET /admin/metrics`
- Uploads -> `POST /uploads/tenant-photo`, `POST /uploads/tenant-document`

## 9) Proposed Schema (implemented in typed model form)
- See `backend/src/types/entities.ts` for current schema contracts.

## 10) Inferred Enums/Statuses
- userRole: owner, admin, tenant, super_admin
- roomType: single, double, triple
- roomStatus: occupied, vacant, maintenance
- tenantStatus: active, inactive
- paymentStatus: paid, pending, overdue
- maintenanceStatus: open, in-progress, resolved
- maintenancePriority: low, medium, high
- announcementCategory: maintenance, payment, rules, general
- notificationType: payment, maintenance, tenant, announcement
- adminPlan: free, basic, pro, enterprise
- adminUserStatus: active, suspended, trial

## 11) Assumptions and Ambiguities
- No explicit frontend router; backend contract mapped by tab screens and UI actions.
- Payments currently modeled monthly, tenant-linked; recurring billing lifecycle not fully specified in UI.
- Document storage metadata is implied; retention/security policies not yet defined.
- Tenant portal currently mock-only; owner and tenant auth realms are not yet separated in UI state.
- WhatsApp integration remains contract-level only (template + trigger points), not provider-integrated yet.

## 12) Prioritized Backend Build Order
1. Auth + session contract
2. Properties + rooms CRUD
3. Tenant CRUD + tenant detail relations
4. Payments + charge adjustments + status lifecycle
5. Maintenance tickets + notes + transitions
6. Announcements + pin/broadcast flags
7. Settings + WhatsApp templates + PG rules
8. Notifications event automation
9. Admin and analytics hardening
10. Persistent database + migrations + production auth/RBAC
