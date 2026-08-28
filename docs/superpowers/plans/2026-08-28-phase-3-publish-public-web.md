# Phase 3 Publish and Public Web Implementation Plan

> **Approved on 2026-08-28.** Execute with TDD on Supabase Cloud Development only and stop before the Phase 3 baseline commit.

**Goal:** Deliver concurrency-safe publication, a limited-disclosure public marketplace, consented lead routing, and agent operational visibility without changing Phase 0–2 behavior.

**Architecture:** Database transactions and RLS remain the authority for tenant ownership, lifecycle, and quota. Public reads use an explicit projection; public writes enter a narrow lead API. Notification side effects use the accepted ID-only pgmq worker pattern. PostgreSQL provides search.

**Stack:** Next.js/TypeScript, Supabase Postgres/RLS/pgTAP, existing test runner, Supabase Queues/pgmq, existing validation and UI conventions.

## Global constraints

- Do not touch Production, push, begin Phase 4, or change approved Product Rules/ADRs.
- Every task follows RED → GREEN → REFACTOR and runs its focused tests before continuing.
- Migrations are forward-only and applied only to Cloud Development after local review.
- Do not hard-code credentials, model IDs, tenant destinations, plan limits in business logic, or paid providers.
- Preserve all Phase 2 AI gateway, structured output, queue, retry/dead-letter, and AI usage behavior.

## Expected file map

Exact repository names must follow existing conventions discovered at execution time. Expected changes are limited to:

- `supabase/migrations/` — Phase 3 schema, functions, constraints, indexes, RLS, and grants.
- `supabase/tests/` — pgTAP schema, RLS, quota-concurrency, projection, routing, and metering tests.
- `src/lib/entitlements/`, `src/lib/publication/`, `src/lib/leads/`, `src/lib/notifications/` — server-domain modules and tests.
- `src/app/api/leads/` — public lead endpoint and integration tests.
- `src/app/properties/` — public listing/detail UI and tests.
- existing agent property/dashboard routes — publish, quota, leads, and notification UI.
- worker entry points/config already established in Phase 2 — notification job handling only.
- project documentation and environment examples — non-secret configuration contract and verification notes.

### Task 1: Plans, subscriptions, entitlements, and usage ledger

1. Write failing pgTAP tests for Free-plan seed, idempotent tenant subscription, tenant isolation, immutable ledger, and entitlement resolution.
2. Write failing unit tests for effective entitlement and quota display contracts.
3. Add one forward-only migration with plan, entitlement, subscription, ledger, indexes, RLS, grants, and idempotent provisioning.
4. Implement the smallest typed server repository; keep active count derived from canonical properties.
5. Run focused unit tests and Cloud Development pgTAP; record migration version and assertion count.

### Task 2: Atomic publication and lifecycle enforcement

1. Write failing database tests for eligibility, allowed transitions, exact Free limit, concurrent fourth publish, release on Sold/Inactive, and idempotent retry.
2. Write failing action tests for stable outcomes and preserved drafts.
3. Add the publish/release RPC and audit/idempotency migration using tenant-boundary and property-row locks.
4. Implement authenticated server actions that derive tenant and owner server-side.
5. Run concurrency, action, regression, and Cloud Development pgTAP tests.

### Task 3: Limited Disclosure public projection and media

1. Create a field allowlist test that explicitly denies GPS, private contacts, notes, AI payloads, tenant IDs, and private media paths.
2. Add pgTAP tests for Published-only visibility, state changes, anonymous grants, and base-table denial.
3. Measure the two Blueprint-approved projection forms; document and implement the safer sufficient option in a forward migration.
4. Implement typed projection queries and approved public-media selection.
5. Run leakage, RLS, query-plan/index, and regression tests in Cloud Development.

### Task 4: Deterministic PostgreSQL search

1. Write failing tests for filters, normalized query text, stable sort tie-breakers, cursor/page boundaries, unavailable records, and safety caps.
2. Add only required indexes/search functions in a forward migration; do not introduce an external service.
3. Implement the server search contract against the public projection.
4. Verify query parameter validation, maximum page size, and non-enumerating failures.
5. Run unit, integration, pgTAP, and representative query-plan tests.

### Task 5: Public listing, detail, and SEO UI

1. Write failing component/route tests for loading, empty, error, filters, pagination, unavailable detail, and Limited Disclosure rendering.
2. Implement `/properties` with shareable validated query parameters and deterministic results.
3. Implement `/properties/[slug]` with approved media, metadata, canonical URL, and no private identifiers.
4. Add accessibility and responsive-state tests using existing design primitives.
5. Run route tests, TypeScript, ESLint, build, and a manual Development smoke check.

### Task 6: Lead, consent, routing, and Platform Intake schema

1. Write failing pgTAP tests for minimal lead data, consent fields, property routing, unassigned general intake, routing history, idempotency, and cross-tenant denial.
2. Add forward migration for leads, consent metadata, routing events, indexes, RLS, and grants.
3. Implement canonical property-owner resolution in a transaction; never accept a destination tenant from the client.
4. Add content-minimized usage events without storing message text in metering.
5. Run focused pgTAP and cross-tenant tests in Cloud Development.

### Task 7: Public lead capture API and abuse boundary

1. Write failing API tests for valid property/general requests, malformed input, missing consent, duplicate idempotency key, limits, unavailable property, and tenant-enumeration attempts.
2. Implement `POST /api/leads` with schema validation, body/request caps, server-side routing, idempotent persistence, safe errors, and redacted logging.
3. Add internal rate-limit/safety-cap storage only if existing infrastructure cannot satisfy the tests; cover it with a forward migration and RLS.
4. Implement public lead forms with purpose, consent, success, validation, duplicate, and rate-limit states.
5. Run unit/integration/security tests and Development smoke tests. Stop for approval before adding CAPTCHA or another external vendor.

### Task 8: Notification abstraction and reliable delivery

1. Write failing tests for dashboard creation, one queue job per routing event, ID-only payloads, idempotent claims, bounded retry, dead-letter, and non-rollback of leads.
2. Add notification/delivery schema and queue functions in a forward migration, reusing the accepted pgmq architecture.
3. Implement provider-neutral adapters and the dashboard adapter; use a fake Development email driver unless a real provider is explicitly approved.
4. Extend the worker with notification dispatch, structured redacted logs, usage events, retry, and dead-letter behavior.
5. Run worker, queue, duplicate-delivery, failure, pgTAP, and Phase 2 regression tests.

### Task 9: Agent publish, quota, leads, and notifications UI

1. Write failing UI/action tests for publish preconditions, quota 0–3, blocked fourth draft, already-published retry, lifecycle release, tenant lead list, and notification acknowledgement.
2. Implement property Publish controls and validation/blocker feedback through the Task 2 actions.
3. Add Plan/Usage presentation using effective entitlements and canonical Published count.
4. Add tenant-scoped Leads and dashboard notification views with safe delivery status.
5. Run component, action, accessibility, RLS integration, TypeScript, ESLint, and build checks.

### Task 10: Full Phase 3 Cloud Development verification and handoff

1. Confirm the selected Supabase project is Development by project reference and safety checks; abort on any Production indicator.
2. Compare local migration order with Cloud Development, apply only unapplied Phase 3 migrations, and rerun all pgTAP assertions.
3. Run the full unit/integration suite; RLS/cross-tenant checks; concurrent quota; projection leak; search; lead routing; queue/retry/dead-letter; usage metering; TypeScript; ESLint; production build; dependency/security audit; and secret scan.
4. Verify `.env.local` remains ignored/untracked, no secret appears in tracked or staged content, no Production config changed, and no Phase 4/5 work exists.
5. Remove Development test rows/jobs, confirm queues and dead letters are in the expected state, rerun migration status, `git diff --check`, and documentation consistency checks.
6. Produce the verification report with task results, migration list, assertion counts, RLS/security evidence, deviations, and approval-gated items. Stop before commit and push.

## Task dependencies

Tasks execute sequentially. Task 1 supplies entitlement authority; Task 2 supplies publication; Tasks 3–5 expose safe public reads; Tasks 6–7 capture/rout leads; Task 8 delivers notifications; Task 9 integrates agent UX; Task 10 verifies the complete system. Focused RED tests may be authored ahead of a migration, but no dependent production code is implemented early.

## Resolved approval gates

- The specification and plan are approved for Tasks 1–10.
- Tenant-scoped locking and canonical Published count are approved; measured selection of the Blueprint-approved projection form is permitted unless it creates a material architecture change.
- No real email provider is approved. Use the deterministic fake Development driver only.
- No CAPTCHA/anti-bot vendor or external search service is approved. Use provider-independent controls and PostgreSQL search.
- Production deployment, baseline commit, and push each require later, separate authorization.

## Plan consistency checklist

- Ten tasks cover schema, server/API/actions, UI, background processing, RLS, privacy, usage, Cloud Development, risks, and acceptance evidence.
- Phase 0–2 capabilities are dependencies rather than duplicates.
- Free limit, lifecycle, Limited Disclosure, routing, notification channel, PostgreSQL search, and payment-off rules match the Constitution and Final Blueprint.
- No implementation placeholder, provider assumption, Production step, migration file, commit, or push is authorized by this document.
