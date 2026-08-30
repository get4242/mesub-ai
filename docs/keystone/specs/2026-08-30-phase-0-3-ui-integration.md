# Phase 0–3 UI Integration Specification

**Status:** Proposed for implementation approval

**Date:** 2026-08-30

**Boundary:** Specification only. This document does not authorize implementation, migration, Cloud change, Production access, commit, push, or Phase 4 work.

## 1. Goal

Apply the approved Mesub AI Design Preview direction to the real Phase 0–3 application while changing only presentation and narrowly required media-delivery seams. Preserve every verified domain, security, tenancy, AI, queue, metering, publication, quota, and lead-routing behavior.

The primary audience is a Thai property Agent who may not be technically confident. The public audience is a buyer or interested customer discovering a property and submitting a consented enquiry.

Success means the real product presents the approved public and Agent journeys consistently on desktop, tablet, and mobile without weakening or duplicating any Phase 0–3 capability.

## 2. Sources of truth

- PROJECT_CONSTITUTION_MESUB_AI.md
- MESUB_AI_V1_TECHNICAL_BLUEPRINT.md
- Phase 0–3 baseline code and approved specifications
- Existing ADRs and security checklists
- The approved bounded Design Preview under src/app/design-preview/
- Current database and Cloud Development state

When visual treatment conflicts with a verified Product Rule or backend contract, the Product Rule and backend contract win. The discrepancy becomes an approval gate rather than an implicit behavior change.

## 3. Scope

### In scope

1. Shared Mesub AI visual tokens, typography, spacing, cards, form controls, buttons, status badges, feedback, focus states, and responsive rules.
2. Public shell, landing page, property search, property cards, property detail, approved gallery presentation, Agent information, and lead form.
3. Agent shell, responsive sidebar/bottom navigation, dashboard, quota presentation, notifications, property management, Add/Edit Property, AI Assisted Intake, Leads, and Agent Profile.
4. Happy, empty, loading/pending, error/failure, and constraint states using existing capabilities and stable backend outcomes.
5. TDD and regression evidence that the Phase 0–3 behavior and security boundaries remain unchanged.

### Out of scope

- Database schema or migration changes.
- RLS, grants, tenant model, publication transaction, quota semantics, lead routing, queue/worker, retry/dead-letter, AI contracts/model profiles, usage metering, or server authority redesign.
- New CRM, follow-up status, appointments, payments, external email, CAPTCHA, external search, LINE, moderation, or Phase 4 capability.
- Production deployment, Production data, push, or an implementation baseline commit without later approval.
- Copying prototype fixture data or demo images into canonical application data.

## 4. Approved design-system contract

### 4.1 Visual rules

- Thai-first type stack with readable system fallbacks; body copy is at least 16 px on primary public/form surfaces and supporting copy is not smaller than 12 px.
- Green Mesub AI primary color, dark-green text/navigation, muted supporting text, off-white canvas, white cards, soft borders, and restrained shadows.
- Shared corner scale: small controls approximately 10 px, cards approximately 16 px, and prominent public surfaces approximately 20–22 px.
- Primary actions are filled green, appear once per decision region, and remain visually dominant. Secondary actions are bordered or neutral.
- Interactive targets are at least 44 by 44 CSS pixels on touch layouts.
- Inputs have persistent labels, visible focus, inline status/error placement, and do not rely on placeholder text as the label.
- Status badges use both text and color. Color alone never communicates lifecycle or delivery state.
- Property images have no required category. The first ordered ready image is the cover; reorder and delete/archive remain explicit actions.

### 4.2 Responsive rules

- Desktop: wider than 950 px. Agent shell uses a persistent sidebar and content can expand to a bounded wide workspace rather than a narrow form column.
- Tablet: 621–950 px. Agent sidebar collapses to icons while content uses one- or two-column layouts according to available width.
- Mobile: 620 px and below. Public content and forms become one column; Agent navigation becomes a four-destination bottom navigation with a separate prominent Add Property control.
- Mobile galleries prioritize the cover, retain a clear “view all” action, and provide touch-sized previous/next/close controls.
- No horizontal scrolling is allowed for page content. Filter/tab rows may scroll intentionally when each item remains independently operable.

### 4.3 Accessibility

- Semantic landmarks and headings retain a logical order.
- Every control has an accessible name; icon-only controls use aria-label.
- Focus is visible, keyboard order follows visual order, and modal gallery focus is contained and returned to its opener.
- Pending states announce through aria-live; destructive actions are named explicitly.
- Reduced-motion preferences disable nonessential transitions.

## 5. Screen contracts

### 5.1 Public Landing

Show Mesub AI identity, property search entry, representative published-property cards, property types, buyer CTA, and Agent CTA. The page reads only existing public projection data; an empty database produces an honest empty state rather than fixture listings.

### 5.2 Property Search

Preserve the existing PostgreSQL query contract, validated URL parameters, filters, deterministic ordering, pagination caps, and non-enumerating errors. Present responsive filters, result count, property cards, loading, empty, and error states. No external search is introduced.

### 5.3 Property Detail and Gallery

Render only fields from the Limited Disclosure projection. The gallery uses only public_property_media records belonging to the Published property, ordered by position. It must never place tenant IDs, exact GPS, private contacts, internal notes, AI payloads, private bucket names, or private object paths in HTML, client props, logs, metadata, or URLs.

The cover is the first ordered public media item. The page displays a cover, secondary images when present, “ดูรูปทั้งหมด · N รูป”, and an accessible previous/next lightbox. Zero-media properties receive a neutral branded fallback.

Public media byte delivery is blocked until Approval Gate 2 is resolved.

### 5.4 Agent Dashboard

Show overview counts, canonical Published quota usage, recent tenant-owned leads, notifications, and existing next actions. “+ เพิ่มทรัพย์” is reachable from every Agent screen. The browser never supplies tenant identity or usage values as authority.

### 5.5 Property Management

Display cover thumbnail when an authorized Agent media preview is available, title, updated time, lifecycle badge, and only state-supported actions. Publish remains the existing server action with its current confirmation, validation, idempotency, and quota outcomes.

### 5.6 Add/Edit Property

Use the approved order: basic information; price/location/area; free-text details; media; final actions. Add creates the same canonical Draft through the existing action. Edit keeps optimistic version checks and lifecycle transitions. Pending, conflict, validation, upload, reorder, and archive failures remain recoverable and visible.

The real media count and UI limit are blocked until Approval Gate 1 is resolved.

### 5.7 AI Assisted Intake

Present a simple three-stage journey: provide information and selected media; processing/retry status; review Accept/Reject suggestions and confirm the current version. Hide model, queue, worker, and structured-output terminology. Preserve selected-media authorization, idempotency, immutable snapshots, version conflicts, evidence, retry rules, and confirmation blockers.

### 5.8 Leads

Public forms retain consent, validation, idempotency, rate-limit feedback, non-enumerating responses, and server-side canonical routing. Agent Leads show tenant-owned canonical records only. No CRM status, appointment, or follow-up workflow is added.

### 5.9 Agent Profile

Present the existing private profile edit fields and disclosure toggles clearly. Public profile output continues to pass through the existing disclosure mapper; hidden email/phone remain absent.

## 6. Five-state UX requirements

- Happy: data and primary next action are visible without exposing implementation terminology.
- Empty: explain what is absent and provide one supported recovery/creation action.
- Loading/pending: disable duplicate submission, retain context, and announce progress.
- Error/failure: name the failed user action and recovery; never reveal internal IDs, tenant existence, provider payloads, or storage paths.
- Edge/constraint: show quota, lifecycle blockers, version conflict, media limit, no-media fallback, unavailable Published record, and AI retryability using stable backend outcomes.

## 7. Architecture boundary

- Server Components remain responsible for authenticated/public queries.
- Existing server actions and APIs remain responsible for mutations and authority.
- New UI components consume typed view data and callbacks; they do not call Supabase directly unless the existing upload flow already requires the browser Storage client.
- Pure view-model helpers translate existing statuses/outcomes into labels, badges, disabled states, and recovery copy.
- Design Preview remains a Development-only reference and is not imported by real application routes.
- No database migration is expected. If implementation requires one, stop and obtain approval with a revised specification.

## 8. Security and privacy invariants

1. RLS and tenant filters remain enforced; presentation props are never authorization.
2. Public routes query only approved projection tables/RPCs.
3. Limited Disclosure receives explicit regression tests for both rendered HTML and serialized client props.
4. Private media object paths and signed private URLs do not enter public markup.
5. Secrets remain server-only and absent from logs, bundles, fixtures, screenshots, and commits.
6. Lead contact data remains tenant-private and is not copied into public/client state beyond the submitting form.
7. AI evidence and raw payloads remain private and tenant-scoped.
8. Publication and quota remain server-controlled and concurrency-safe.

## 9. Approval gates

### Gate 1 — Real Property media limit: 10 versus 20

Current Phase 1 source of truth is 20 media records per Property:

- database position range is 0–19;
- database active-count enforcement rejects item 21;
- server upload/reorder validation uses 20;
- real Property Editor disables upload at 20;
- Phase 1 specification calls 20 an operational safety limit.

The approved Design Preview uses 10. Silent UI-only enforcement at 10 while the backend permits 20 is prohibited.

**Recommended approval:** preserve the verified real limit of 20 for this presentation-only integration and adapt the approved visual component to show N/20. Changing the Product Rule to 10 requires a separate Constitution/spec decision, forward migration, server/UI/test changes, and Cloud Development verification.

### Gate 2 — Public media byte delivery

public_property_media safely exposes only opaque media ID, property ID, position, MIME type, width, and height. Both Storage buckets remain private, and the projection intentionally contains no object path. The current real public page does not render media.

**Recommended approval:** add a narrow same-origin read-only route such as /api/public-property-media/[mediaId] that:

- accepts only opaque media ID;
- verifies membership in public_property_media and its Published property server-side;
- resolves the private object path only on the server;
- streams allowed image bytes with safe MIME type, cache, size, and failure headers;
- returns a non-enumerating not-found response;
- never redirects to or returns a private Storage URL/path.

This is a narrow delivery boundary, not a schema, RLS, or Product Rule change. If it is considered a material architecture change, implementation must stop until separately approved. Alternatives are to keep a no-image fallback or approve a future opaque public-asset architecture with its own ADR/migration.

### Gate 3 — Planning/design checkpoint

The approved Design Preview and these documents are currently uncommitted. Any checkpoint or baseline commit requires explicit authorization. Implementation must not begin from an ambiguous mixed staging set.

## 10. Expected file/component impact

### Shared presentation

- Modify src/app/globals.css.
- Modify src/app/layout.tsx.
- Create focused primitives under src/components/ui/.
- Create src/components/layout/public-shell.tsx and src/components/layout/agent-shell.tsx.
- Add pure UI/view-model tests beside those components.

### Public

- Modify src/app/page.tsx.
- Modify src/app/properties/page.tsx.
- Modify src/app/properties/[slug]/page.tsx.
- Modify src/app/agents/[slug]/page.tsx.
- Modify src/features/leads/LeadForm.tsx.
- Create public property card/gallery presentation components.
- Gate-dependent: create a same-origin public media route and focused security tests.

### Agent

- Modify src/app/dashboard/layout.tsx.
- Modify src/app/dashboard/page.tsx.
- Modify src/app/dashboard/properties/page.tsx.
- Modify src/app/dashboard/properties/new/page.tsx.
- Modify src/app/dashboard/properties/[id]/edit/page.tsx.
- Modify src/app/dashboard/properties/[id]/ai/page.tsx.
- Modify src/app/dashboard/leads/page.tsx.
- Modify src/app/dashboard/profile/page.tsx.
- Modify src/features/properties/property-editor.tsx.
- Modify the four existing src/features/ai UI components.
- Create reusable Agent property/list/media presentation components and view-model tests.

No file under supabase/migrations/ is expected to change.

## 11. Regression and security risks

- A visual form refactor can rename or omit canonical form fields and break server actions.
- Client-side convenience logic can accidentally become authority for tenant, lifecycle, quota, or routing.
- Public gallery work can leak private paths or permit enumeration.
- Rendering media thumbnails can create long-lived signed URL leakage or cross-tenant access.
- UI state mapping can enable actions that the lifecycle does not permit.
- AI screen restructuring can lose selected media, idempotency, version-conflict, retry, or evidence semantics.
- Responsive navigation can hide logout, Add Property, or recovery actions.
- Loading UI can submit mutations twice.
- Copy can imply autonomous AI publication or guaranteed accuracy.
- A broad global CSS change can unintentionally affect Development-only Preview or authentication pages.

## 12. Acceptance criteria

1. All nine approved surfaces match the shared visual and responsive contract.
2. Desktop forms use the available workspace; tablet and mobile layouts remain usable without horizontal page scrolling.
3. Primary actions are visually dominant, touch-sized, and disabled during existing pending states.
4. Add/Edit Property retains every canonical field, action payload, version check, upload validation, reorder, and archive behavior.
5. The approved media limit decision is implemented consistently across UI copy and enforcement; no UI/backend mismatch exists.
6. Public gallery renders only through the approved safe delivery boundary and never exposes a private path or signed private URL.
7. Limited Disclosure rendered-output tests deny GPS, private contacts, tenant IDs, notes, AI payloads, and private media paths.
8. Search parameters/results, publication/quota, AI workflow, lead routing/consent/idempotency, notifications, usage metering, and RLS behavior pass existing regressions unchanged.
9. Tenant A cannot render or mutate Tenant B data through any redesigned screen.
10. Anonymous users cannot access canonical/private property or Agent data.
11. Keyboard, focus, accessible names, live regions, and mobile touch targets meet this specification.
12. Tests, TypeScript, ESLint, optimized build, dependency audit, secret scan, Cloud Development regressions, and git diff --check pass.
13. No migration, Product Rule, Architecture Decision, external provider, Production access, push, Phase 4 work, or unapproved commit occurs.

## 13. Recommended next step

Resolve Approval Gates 1 and 2, then approve the companion implementation plan. After approval, execute sequentially with TDD and stop before the UI Integration baseline commit.
