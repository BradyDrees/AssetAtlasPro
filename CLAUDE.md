# CLAUDE.md — Asset Atlas Pro

## What This Is

Asset Atlas is a platform for real estate operations. It serves three functions:

1. **Acquisition Verification** — DD walks to assess whether a property is worth purchasing. Mobile field capture, unit grading, photo/video documentation, structured exports.
2. **Facilities Management** — Ongoing property operations: inspections, unit turns, maintenance tracking, work orders, capital improvement management.
3. **Vendor Business Software** — Vendors run their business on the platform: build estimates, generate reports, manage jobs, invoice clients. Their customers (asset managers/owners) are already on it, creating a two-sided network effect.

The current product (V1) focuses on DD walks, property inspections, and unit turns. Future versions will add financial reporting, vendor assignment, estimates, invoicing, communications, and portfolio analytics.

**Live product:** https://www.assetatlaspro.com
**Repo:** https://github.com/BradyDrees/AssetAtlasPro.git

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) with RLS enabled |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage — bucket `dd-captures` |
| Offline Data | Dexie v4 (IndexedDB) — offline CRUD + sync queue |
| PWA | Serwist service worker for offline caching |
| i18n | next-intl v4.8.3 (English/Spanish, cookie-persisted) |
| PDF Export | jsPDF + jspdf-autotable + sharp (image resizing) |
| Excel Export | ExcelJS |
| Deployment | Vercel (from `main` branch) |

---

## Architecture Principles

### Offline-First
This is a field tool. Users capture data on properties with unreliable connectivity. All capture workflows must work fully offline using Dexie/IndexedDB and sync to Supabase when connectivity returns. Never assume network availability during capture flows.

### Mobile-First
Primary usage is on phones and tablets during property walks. All UI must be designed for one-handed mobile use. Touch targets, swipe gestures, and camera integration are critical. Desktop is secondary.

### Modular Design
The platform will grow significantly. New modules (vendor tools, estimating, invoicing, messaging) will be added over time. Keep code organized so new features can be added without refactoring existing modules. Use feature-based folder structure.

### Data Model Awareness
Every model you create may eventually connect to vendors, estimates, invoices, and financial reports. Design with relationships in mind:
- Properties have many inspections, DD walks, and unit turns
- Entries/findings will eventually link to work orders and estimates
- Users will eventually have roles (owner, asset manager, property manager, vendor)
- Media (photos/video) is shared across modules and referenced by multiple entities

### Two-Sided Platform
This is not a single-user tool. The architecture must support multiple user types interacting with shared data. Even if current features are single-user, build auth, permissions, and data access patterns that can expand to multi-tenant, role-based access.

---

## Key Patterns

### Database
- Supabase PostgreSQL with Row Level Security (RLS) on all tables
- Supabase instance: `https://kxncmufhzgjzduwyjmwq.supabase.co`
- All queries should respect RLS policies
- Use Supabase client libraries, not raw SQL from the frontend

### Auth & Security
- All server actions use `assertAuth()` / ownership verification (defense-in-depth with RLS)
- Owner-scoped storage paths with integrity triggers and CHECK constraints
- `src/lib/auth-helpers.ts` — `assertAuth`, `assertOwnership`

### Offline Sync
- Dexie v4 handles local IndexedDB storage
- Sync queue pattern: capture locally -> queue for sync -> push to Supabase when online
- Conflict resolution: last-write-wins unless otherwise specified
- Media files cache locally and upload in background
- Field Mode toggle renders from Dexie snapshots even when online
- Soft-delete with `isDeletedPending` flag, synced via queue with dependency resolution

### Internationalization
- next-intl v4.8.3 with English and Spanish
- All user-facing strings must use translation keys
- Cookie-persisted locale preference

### Exports
- PDF: jsPDF + jspdf-autotable for structured reports, sharp for image resizing
- Excel: ExcelJS for spreadsheet exports
- Export pipeline uses direct public storage URLs (no Supabase client passed to generators)
- Both export types must work with locally-cached data (offline-capable)

### Styling
- **Tailwind CSS v4** with custom variant: `@custom-variant dark (&:where(.dark, .dark *));`
- **Semantic CSS tokens** — use `surface-primary/secondary/tertiary`, `content-primary/secondary/tertiary/quaternary/muted`, `edge-primary/secondary/tertiary` instead of raw colors
- **Brand palette**: green (`brand-*`), gold accent (`gold-*`), charcoal grays (`charcoal-*`)
- **Dark mode scoped** to dashboard via `.dark` class on wrapper div — does not affect landing page
- Theme + locale persisted via secure cookies (`SameSite=Lax`, `Max-Age=31536000`)
- Headers: dual-corner radial gradients with `bg-charcoal-900`

---

## Project Structure

```
src/
  app/
    (dashboard)/     # Authenticated pages (dark mode)
    (auth)/          # Login/signup pages
    (public)/        # Landing page (no dark mode)
    api/             # Export routes (PDF, ZIP, Excel)
  components/        # Shared components
  lib/
    supabase/        # Server/client Supabase helpers
    pdf/             # Export generators + data fetchers
    offline/         # Dexie DB, sync engine, hooks
    inspection-sections.ts   # Inspection group order, slugs
    dd-sections.ts           # DD group order, slugs
    auth-helpers.ts          # assertAuth, assertOwnership
  i18n/
    request.ts       # next-intl config (cookie-based locale)
  messages/
    en.json          # English translations
    es.json          # Spanish translations
```

---

## Current Modules

### DD Walks (Due Diligence)
Full-property acquisition inspections. Walk buildings, photograph conditions, document mechanical systems, exteriors, common areas, amenities, and unit interiors. Structured section groups. Export acquisition-ready reports.

### Inspections
Unit-level inspections across bedrooms, bathrooms, kitchens, flooring, appliances, cabinets, countertops. Flag items, track conditions, attach photos with notes.

### Unit Turns
Make-ready checklists with room-by-room workflows. Scope paint/flooring, assess appliance condition, capture before/after photos. Export turn packages as PDF or Excel.

---

## Future Roadmap (Do Not Build Yet — But Design For)

These are coming. Make architectural decisions that don't block them:

- **V2: Financial Reports** — Auto-generate investor-ready DD reports from captured data
- **V3: Vendor Assignment** — Push work orders to vendors from DD findings
- **V4: Estimates & Approvals** — Vendors build estimates in-platform, owners approve
- **V5: Invoicing & Payments** — Estimates convert to invoices, payment tracking
- **V6: Communications** — Real-time messaging, push notifications, activity feeds
- **V7: Portfolio Intelligence** — Cross-property analytics, vendor scoring, capital planning

The core workflow spine: **DD Walk -> Vendor Assignment -> Estimates -> Financial Report -> Invoicing**

---

## Code Quality

- TypeScript strict mode — no `any` types without justification
- All components must be responsive (mobile-first)
- All user-facing text must use i18n translation keys
- Test offline behavior for any capture/data entry feature
- Keep bundle size in check — this is a PWA that needs to load fast on mobile
- Use existing patterns in the codebase before introducing new ones

---

## Dev Server

```bash
PATH="/c/Program Files/nodejs:$PATH" npm run dev
```

Runs on `localhost:3000`. Kill stale port 3000 processes and remove `.next/dev/lock` if needed before starting.

---

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

---

## Deployment

- Vercel from `main` branch
- Environment variables managed in Vercel dashboard
- Supabase connection details in `.env.local` (not committed)
- PWA service worker via Serwist — test cache invalidation after deployments
- Only push when explicitly asked
- Run `npm run build` to verify before pushing
