# Phase 0–3 UI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with RED → GREEN → REFACTOR. Do not start until Approval Gates 1 and 2 in the specification are resolved.

**Goal:** Apply the approved Mesub AI Design Preview to the real Phase 0–3 UI without changing verified product behavior or security boundaries.

**Architecture:** Existing Server Components, server actions, APIs, Supabase queries, RLS, queues, and domain helpers remain authoritative. New focused presentation components and pure view models consume the existing typed data/outcomes. Public media is implemented only through the separately approved opaque delivery boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS, Vitest, Supabase SSR/Storage, existing pgTAP and Cloud Development verification scripts.

**Spec:** docs/keystone/specs/2026-08-30-phase-0-3-ui-integration.md

## Global constraints

- Development only; do not access Production, push, start Phase 4, or add an external provider.
- No database schema, migration, RLS, grant, tenancy, AI, queue, metering, publication, quota, routing, or Product Rule change is authorized.
- Preserve existing server action names, form field names, API payloads, idempotency keys, version checks, stable outcomes, and server-derived authority.
- Follow RED → GREEN → REFACTOR for each task and run focused regressions before continuing.
- Do not import from src/app/design-preview into real application routes.
- Do not commit a checkpoint or baseline without explicit approval. Each task ends with a working-tree checkpoint report instead.
- Stop immediately if implementation requires a migration, new paid/external service, Production access, new Product Rule, material ADR, or disclosure of a private media path.

## Expected file map

### Create

- src/components/ui/mesub-button.tsx — primary, secondary, destructive, pending, and link-style actions.
- src/components/ui/mesub-card.tsx — shared card/panel surface.
- src/components/ui/status-badge.tsx — lifecycle/delivery labels with non-color text.
- src/components/ui/form-field.tsx — label, hint, error, and control association.
- src/components/layout/public-shell.tsx — Public header/footer/navigation.
- src/components/layout/agent-shell.tsx — Desktop sidebar, tablet icon rail, mobile bottom navigation, Add Property, quota, public-site link, and logout placement.
- src/features/properties/property-card.tsx — public result card.
- src/features/properties/property-list-row.tsx — Agent property state/action row.
- src/features/properties/property-form.tsx — Add/Edit canonical field layout.
- src/features/properties/property-media-manager.tsx — authorized upload/cover/order/archive presentation.
- src/features/properties/public-property-gallery.tsx — accessible gallery/lightbox.
- src/features/properties/ui-model.ts and test — state-to-label/action mapping.
- src/features/ui/design-contract.ts and test — breakpoints, navigation destinations, and shared UI rules.
- Gate 2 only: src/app/api/public-property-media/[mediaId]/route.ts and route test.

### Modify

- src/app/globals.css and src/app/layout.tsx.
- src/app/page.tsx.
- src/app/properties/page.tsx.
- src/app/properties/[slug]/page.tsx.
- src/app/agents/[slug]/page.tsx.
- src/app/dashboard/layout.tsx.
- src/app/dashboard/page.tsx.
- src/app/dashboard/properties/page.tsx.
- src/app/dashboard/properties/new/page.tsx.
- src/app/dashboard/properties/[id]/edit/page.tsx.
- src/app/dashboard/properties/[id]/ai/page.tsx.
- src/app/dashboard/leads/page.tsx.
- src/app/dashboard/profile/page.tsx.
- src/features/properties/property-editor.tsx.
- src/features/properties/queries.ts only when additional already-authorized presentation fields are required.
- src/features/ai/ai-intake-panel.tsx.
- src/features/ai/ai-run-status.tsx.
- src/features/ai/suggestion-review.tsx.
- src/features/ai/confirmation-panel.tsx.
- src/features/leads/LeadForm.tsx.

### Explicitly unchanged

- supabase/migrations/** and all RLS/grants.
- Phase 0–3 domain validation/actions except type-preserving presentation adapters.
- OpenAI gateway/model profiles, queue/worker, retry/dead-letter, usage metering, publication transaction, quota authority, lead API/routing, and notification worker.

---

### Task 1: Resolve gates and lock the UI integration contract

**Files:**

- Modify: docs/keystone/specs/2026-08-30-phase-0-3-ui-integration.md after approval.
- Create: src/features/ui/design-contract.ts.
- Test: src/features/ui/design-contract.test.ts.

**Produces:** DESIGN_BREAKPOINTS, AGENT_NAVIGATION, and touch-target constants consumed by later presentation components.

- [ ] Record the approved answer for real media limit: preserve 20 or authorize a separate Product Rule/migration change. The recommended value for this plan is 20.
- [ ] Record the approved answer for public media delivery: same-origin opaque proxy, no-image fallback, or stop for a separate ADR. The recommended value is the proxy.
- [ ] Write a failing test asserting breakpoints desktop >950, tablet 621–950, mobile <=620; the four Agent destinations; Add Property availability; and a 44 px minimum touch target.
- [ ] Run pnpm vitest run src/features/ui/design-contract.test.ts and verify failure because the contract does not exist.
- [ ] Implement only the constants/types required by the failing test.
- [ ] Re-run the focused test and pnpm typecheck.
- [ ] Report the gate decisions and file diff. Do not commit.

### Task 2: Shared visual primitives and responsive shells

**Files:**

- Modify: src/app/globals.css.
- Modify: src/app/layout.tsx.
- Modify: src/app/dashboard/layout.tsx.
- Create: src/components/ui/mesub-button.tsx.
- Create: src/components/ui/mesub-card.tsx.
- Create: src/components/ui/status-badge.tsx.
- Create: src/components/ui/form-field.tsx.
- Create: src/components/layout/public-shell.tsx.
- Create: src/components/layout/agent-shell.tsx.
- Test: colocated view-model/static-render tests.

**Consumes:** Task 1 design contract.

**Produces:** Stable PublicShell, AgentShell, Button, Card, StatusBadge, and FormField interfaces.

- [ ] Write failing static-render/view-model tests for Public navigation, four Agent destinations, Add Property, Free Plan region, public-site link, logout, accessible labels, and no developer terminology.
- [ ] Run focused tests and confirm expected missing-component failures.
- [ ] Add Mesub tokens for Thai typography, color, spacing, radii, shadows, focus, reduced motion, and 44 px controls without changing backend code.
- [ ] Implement PublicShell and AgentShell with desktop sidebar, tablet rail, and mobile bottom navigation.
- [ ] Implement the four focused primitives; do not add a UI framework dependency.
- [ ] Migrate only layout chrome and authentication-safe navigation; retain requireAgentContext and logoutAction exactly.
- [ ] Run focused tests, pnpm typecheck, pnpm lint, and route rendering for / and /dashboard.
- [ ] Report responsive shell evidence. Do not commit.

### Task 3: Public Landing and Property Search

**Files:**

- Modify: src/app/page.tsx.
- Modify: src/app/properties/page.tsx.
- Create: src/features/properties/property-card.tsx.
- Test: src/features/properties/public-view-model.test.ts plus focused presentation tests.

**Consumes:** PublicShell, Button, Card, existing parsePublicPropertySearch, search_public_properties RPC, and toPublicPropertyCard.

**Produces:** Public landing/search presentation with honest data states.

- [ ] Write failing tests for public card content, search parameter preservation, result/empty/error states, and absence of tenant/private fields.
- [ ] Run the focused tests and confirm the intended RED failures.
- [ ] Implement the approved Landing hierarchy using only Published projection data; do not ship Design Preview fixtures as records.
- [ ] Implement responsive search/filter/result cards while preserving every existing RPC parameter, sort, page, and cap.
- [ ] Add loading and error boundaries only if they wrap existing reads without changing error semantics.
- [ ] Verify rendered output never contains tenant_id, latitude, longitude, internal notes, AI payload keys, or private paths.
- [ ] Run focused tests, search regressions, typecheck, lint, and / plus /properties route rendering.
- [ ] Report Public Landing/Search evidence. Do not commit.

### Task 4: Safe Property Detail and Gallery

**Files:**

- Modify: src/app/properties/[slug]/page.tsx.
- Create: src/features/properties/public-property-gallery.tsx.
- Gate 2 only create: src/app/api/public-property-media/[mediaId]/route.ts.
- Gate 2 only test: src/app/api/public-property-media/[mediaId]/route.test.ts.
- Test: rendered Limited Disclosure and gallery view-model tests.

**Consumes:** public_properties, public_property_media, LeadForm, and the approved Gate 2 delivery decision.

**Produces:** Opaque public media source contract and accessible gallery/lightbox.

- [ ] Stop if Gate 2 is unresolved.
- [ ] Write failing route tests for a valid public media ID, unknown/private/unpublished media, wrong MIME/oversize failures, non-enumerating status, and no path/redirect disclosure.
- [ ] Write failing gallery tests for zero, one, and multiple images; ordered cover; count; previous/next wrap; escape/close; and focus return.
- [ ] Run focused tests and confirm the expected RED failures.
- [ ] Implement the narrow server route only if the proxy option is approved: verify public projection membership, resolve the path server-side, stream bytes, and never return the path or signed URL.
- [ ] Implement cover/secondary/lightbox presentation using opaque same-origin URLs and metadata only.
- [ ] Preserve the current metadata allowlist and canonical URL; do not place media paths in Open Graph fields.
- [ ] Run route/gallery/Limited Disclosure tests, anonymous/private access regressions, typecheck, lint, and detail-route rendering.
- [ ] Inspect rendered HTML and network-facing URLs for forbidden fields/paths.
- [ ] Report Gallery security evidence. Do not commit.

### Task 5: Agent Dashboard and Property Management

**Files:**

- Modify: src/app/dashboard/page.tsx.
- Modify: src/app/dashboard/properties/page.tsx.
- Create: src/features/properties/property-list-row.tsx.
- Create: src/features/properties/ui-model.ts.
- Test: src/features/properties/ui-model.test.ts and existing dashboard/publication tests.

**Consumes:** AgentShell, canonical Published count, effective entitlement, listAgentProperties, publishPropertyFormAction, notifications, and tenant-scoped lead reads.

**Produces:** State-safe property rows and dashboard cards.

- [ ] Write failing tests mapping draft, pending confirmation, AI-review, confirmed/eligible, published, sold/inactive, and archived states to only supported actions.
- [ ] Write failing tests for quota labels 0/3 through 3/3 and blocked-fourth guidance using supplied server values rather than client authority.
- [ ] Run focused tests and confirm RED.
- [ ] Implement overview cards, next actions, notifications, quota presentation, property cover thumbnail fallback, lifecycle badges, and clear state-specific actions.
- [ ] Preserve publish hidden fields, idempotency key, expected version, and server-side enforcement exactly.
- [ ] Verify no browser-supplied tenant, owner, entitlement, or usage value is introduced.
- [ ] Run focused tests, publication/concurrency regressions, typecheck, lint, and dashboard/property route rendering.
- [ ] Report Agent Dashboard → Property Management evidence. Do not commit.

### Task 6: Add/Edit Property and media management

**Files:**

- Modify: src/app/dashboard/properties/new/page.tsx.
- Modify: src/app/dashboard/properties/[id]/edit/page.tsx.
- Modify: src/features/properties/property-editor.tsx.
- Create: src/features/properties/property-form.tsx.
- Create: src/features/properties/property-media-manager.tsx.
- Test: existing property/media tests plus new UI view-model tests.

**Consumes:** Gate 1 limit decision; existing create/update/transition/media actions and canonical form field names.

**Produces:** Shared Add/Edit layout and authorized media UI.

- [ ] Stop if Gate 1 is unresolved.
- [ ] Write failing contract tests listing every canonical form name: listingType, propertyType, title, description, province, district, subdistrict, price, landAreaSquareMetres, buildingAreaSquareMetres, bedrooms, and bathrooms.
- [ ] Write failing media UI tests for approved limit, upload-disabled boundary, cover-as-first, reorder rollback, archive, pending, and error copy.
- [ ] Run focused tests and confirm RED.
- [ ] Extract one presentation form used by Add/Edit without renaming FormData keys or changing action signatures.
- [ ] Implement the approved four-section hierarchy and primary/secondary actions; Add still creates a Draft and Edit still uses expected version.
- [ ] Adapt the existing signed upload flow, ready-state finalization, ordering RPC, and archive action to the visual media manager.
- [ ] If the approved limit is 20, display N/20 and retain all 20 validations. Do not preserve the prototype-only N/10 copy in the real UI.
- [ ] Run property schema/action/media tests, typecheck, lint, and Add/Edit route rendering.
- [ ] Report Property form/media evidence. Do not commit.

### Task 7: AI Assisted Intake presentation

**Files:**

- Modify: src/app/dashboard/properties/[id]/ai/page.tsx.
- Modify: src/features/ai/ai-intake-panel.tsx.
- Modify: src/features/ai/ai-run-status.tsx.
- Modify: src/features/ai/suggestion-review.tsx.
- Modify: src/features/ai/confirmation-panel.tsx.
- Test: existing AI UI-state, confirmation, action, snapshot, contracts, gateway, and worker tests plus presentation mappings.

**Consumes:** startAiIntakeAction, retryAiRunAction, Accept/Reject actions, confirmPropertyAction, media authorization, runStatusCopy, suggestionGroups, and existing version fields.

**Produces:** Three-stage nontechnical AI journey.

- [ ] Write failing view-model tests for input readiness, processing/pending/retryable/failure, grouped suggestions, accepted/rejected/pending decisions, confirmation blocker, and version-conflict recovery.
- [ ] Run focused tests and confirm RED.
- [ ] Implement the approved three-stage hierarchy without exposing model, profile, queue, worker, structured output, or provider terminology.
- [ ] Keep agentText maximum, selected authorized media IDs, task list, idempotency key generation, immutable run state, evidence details, expected property version, and critical version unchanged.
- [ ] Prevent duplicate submissions while pending and announce status through aria-live.
- [ ] Run all Phase 2 AI unit/contract/worker regressions, typecheck, lint, and AI route rendering.
- [ ] Report Add Property → AI Assisted Intake evidence. Do not commit.

### Task 8: Leads and Agent Profile

**Files:**

- Modify: src/features/leads/LeadForm.tsx.
- Modify: src/app/dashboard/leads/page.tsx.
- Modify: src/app/dashboard/profile/page.tsx.
- Modify: src/app/agents/[slug]/page.tsx.
- Test: lead capture, public disclosure, Agent schema, and presentation-state tests.

**Consumes:** existing POST /api/leads contract, tenant-scoped lead query, updateAgentProfileFormAction, getOwnAgentProfile, and toPublicAgentProfile.

**Produces:** Consistent public/Agent lead and profile surfaces.

- [ ] Write failing tests for lead idle/sending/accepted/rate-limited/error states, consent text, no destination tenant input, and no CRM/follow-up/appointment controls.
- [ ] Write failing tests for private profile form field names/disclosure toggles and public hidden-contact omission.
- [ ] Run focused tests and confirm RED.
- [ ] Apply shared form/cards/status treatment without changing lead payload, consent version, idempotency, rate-limit behavior, routing, or profile action fields.
- [ ] Preserve public disclosure mapping as the only source for public Agent contacts.
- [ ] Run lead API/domain, profile schema/disclosure, cross-tenant regressions, typecheck, lint, and route rendering.
- [ ] Report Leads/Profile evidence. Do not commit.

### Task 9: Responsive, accessibility, and rendered-security review

**Files:**

- Modify only presentation files with failures discovered by this task.
- Test: focused pure/static-render regression files created in Tasks 1–8.

**Consumes:** all completed presentation surfaces.

**Produces:** Desktop/tablet/mobile and accessibility evidence.

- [ ] Verify each of the nine surfaces at representative widths: 1440, 900, and 390 CSS pixels.
- [ ] Check no page-level horizontal overflow, readable Thai typography, 44 px targets, visible focus, heading order, landmarks, labels, live regions, keyboard gallery navigation, and mobile bottom-navigation reachability.
- [ ] Check happy, empty, loading/pending, error/failure, and constraint states for every relevant screen.
- [ ] Inspect rendered Public HTML/client props for the full forbidden-field list and inspect Agent screens for cross-tenant identifiers used as authority.
- [ ] For every defect, add a failing regression test first, apply the smallest presentation fix, and rerun the focused test.
- [ ] Run pnpm test, pnpm typecheck, pnpm lint, and pnpm build.
- [ ] Report viewport/state/accessibility/security findings. Do not commit.

### Task 10: Full Phase 0–3 regression and handoff

**Files:** No planned feature files; only regression fixes proven by a RED test are allowed.

**Produces:** Final UI Integration verification report and clean Development state.

- [ ] Confirm no file under supabase/migrations changed and Cloud Development migration status remains identical to the Phase 3 baseline.
- [ ] Run pnpm test and report test-file/assertion counts.
- [ ] Run Phase 0, Phase 1, Phase 2, and Phase 3 Cloud Development pgTAP/integration scripts using the Development guard.
- [ ] Re-run RLS/cross-tenant, anonymous canonical-data denial, Limited Disclosure, quota concurrency, lifecycle/publication, AI queue/worker/retry/dead-letter, usage metering, lead routing/consent/idempotency, and notification fake-driver regressions.
- [ ] Run pnpm typecheck, pnpm lint, pnpm build, pnpm security:audit, dependency review, secret scan, and git diff --check.
- [ ] Verify .env.local remains ignored/untracked, no secret or private path is in tracked/staged content, Production is untouched, and no Phase 4 work exists.
- [ ] Remove any Development test rows/jobs created by verification and confirm expected queue/dead-letter state.
- [ ] Produce a screen-by-screen product-journey report and list deviations.
- [ ] Stop before any UI Integration baseline commit or push.

## Task dependencies and stop conditions

Tasks run sequentially. Task 1 gates Tasks 4 and 6. Task 2 supplies the shared system. Tasks 3–8 integrate bounded surfaces without changing domain ownership. Task 9 performs responsive and rendered-security review. Task 10 proves Phase 0–3 regression safety.

Stop and request approval if:

- the real limit must change from 20 to 10;
- the opaque media proxy cannot satisfy Limited Disclosure;
- a migration/RLS/grant change is required;
- a backend action/API contract must materially change;
- Production, an external provider, a paid service, a new Product Rule, or a new ADR is required;
- any Phase 0–3 security or behavior guarantee cannot be preserved.

## Plan consistency checklist

- Nine requested surfaces map to Tasks 2–8.
- Responsive Desktop/Tablet/Mobile and accessibility map to Task 9.
- Media limit and safe public bytes are explicit gates, not assumptions.
- No schema/migration/Cloud mutation is planned.
- Existing Phase 0–3 tests are retained and rerun in Task 10.
- No task adds Phase 4 or speculative capability.
- Implementation stops before commit and push.
