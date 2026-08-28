# Phase 3 Specification: Publish and Public Web

**Status:** Approved

**Date:** 2026-08-28

**Planning boundary:** Documentation only; no implementation or cloud change is authorized.

## 1. Goal

Complete the first safe path from an agent-confirmed property draft to a quota-controlled public listing and consented lead. Phase 3 makes approved inventory discoverable on the public web, routes property leads to the canonical owning tenant, places general enquiries in the Platform Intake Queue, and gives agents operational visibility.

Success means an eligible agent can publish atomically, the public sees only the approved limited-disclosure projection, leads are captured and routed without cross-tenant leakage, and Free-plan enforcement remains correct under concurrency.

## 2. Sources of truth

This specification preserves the Constitution v1.2, Final Blueprint, accepted ADRs, and the Phase 0, Phase 1, and Phase 2 baselines (`77ff57f`, `50c71b4`, `46dc6c6`). Existing Phase 2 AI intake, model profiles, queue/retry/dead-letter behavior, usage metering, and tenant isolation are dependencies and are not redesigned here.

## 3. Approved rules carried forward

- A new tenant defaults to the Free plan; `active_property_limit = 3`.
- For Phase 3, an active property is exactly a property in `Published` state. Draft, Pending, Sold, and Inactive do not consume an active slot.
- Publishing property four is blocked unless a slot is freed or an approved entitlement raises the limit. The draft remains intact.
- Payment collection and paid-plan activation remain off. No price or billing provider is selected.
- Agents may self-publish only after confirmation and validation. AI never publishes autonomously.
- Public pages use Limited Disclosure: no exact GPS, private contact data, internal notes, raw AI payloads, tenant identifiers, or private media paths.
- A property lead is routed to the property's canonical owning tenant. A general enquiry remains unassigned in the Platform Intake Queue; there is no random or round-robin routing.
- Public search is deterministic PostgreSQL search. External search and vector retrieval are not Phase 3 defaults.
- Dashboard notification is required. Email is represented by a provider-neutral adapter; real delivery requires separate approval.
- LINE delivery remains Phase 4; moderation/admin UI remains Phase 5.

## 4. Scope

### In scope

1. Plans, subscriptions, entitlements, and an append-only usage ledger sufficient to enforce active-property quota.
2. An atomic publish/unpublish lifecycle with concurrency-safe quota enforcement and stable domain errors.
3. A public property projection and public-media allowlist.
4. Public property search, listing, detail, pagination, filters, and basic SEO metadata.
5. Consented property-specific and general lead capture.
6. Canonical lead routing, routing events, and the Platform Intake Queue.
7. Dashboard notifications and an email notification abstraction.
8. Agent UI for publish status, quota, leads, and delivery state.
9. Supabase Cloud Development-only verification and cleanup.

### Out of scope

Payment processing, prices, Production changes, LINE notifications, admin moderation UI, external CRM delivery, external search/vector infrastructure, exact-location disclosure, autonomous AI publication, and any Phase 4 or Phase 5 capability.

## 5. Functional design

### 5.1 Plans, entitlements, and usage

Add tenant-scoped plan/subscription records, effective entitlements, and an append-only usage ledger. A default Free subscription is provisioned idempotently. Effective entitlement resolution is server-side and returns the active-property limit and relevant safety caps. The current Published count is computed transactionally from canonical property rows; cached summaries are informational, never authoritative. Phase 2 `ai_usage` remains the source for AI metering and is not duplicated.

### 5.2 Publication transaction

The server action accepts property ID plus an idempotency key. It verifies authentication, tenant membership, ownership, confirmed intake, required fields, allowed lifecycle transition, media eligibility, and effective entitlement. It locks the tenant quota boundary and relevant property row, recounts Published properties, then either publishes and appends usage/audit events or returns a stable error without partial state.

Stable outcomes include `published`, `already_published`, `quota_exceeded`, `validation_failed`, `forbidden`, and `conflict`. Retrying the same idempotency key cannot double-count usage or duplicate events. Unpublish, Sold, and Inactive transitions release capacity through canonical state; history remains append-only.

### 5.3 Database schema and migrations

Implementation is expected to add forward-only migrations for:

- `plans`, `plan_entitlements`, `tenant_subscriptions`, and `usage_ledger`;
- publication idempotency/audit data and lifecycle constraints;
- a security-barrier public projection (view or projection table selected by measured performance) and public-media mapping;
- `leads`, consent metadata, `lead_routing_events`, and notification delivery records;
- indexes supporting tenant quota counts, public filters/sorts, idempotency, and queue consumers.

Migration names and exact columns are finalized during Task RED tests. No migration is created during planning. Destructive or Production migrations are prohibited.

### 5.4 Server/API/actions

- Authenticated server actions: publish, unpublish/mark Sold/Inactive, read effective plan/quota, list tenant leads, and acknowledge dashboard notifications.
- Public read API/server query: allowlisted Published-property search and detail only.
- `POST /api/leads`: validates payload and consent, applies request/body safety caps, resolves canonical routing server-side, persists idempotently, and returns non-enumerating responses.
- Clients cannot supply a destination tenant, plan entitlement, publication owner, or usage value.

### 5.5 Public UI

- `/properties`: deterministic filters, sort, pagination, loading/empty/error states, and shareable query parameters.
- `/properties/[slug]`: Limited Disclosure details, approved public media, contact form, metadata, canonical URL, and unavailable state.
- Lead forms show purpose, consent, validation, duplicate-safe success, rate-limit feedback, and a privacy link.

### 5.6 Agent UI

The property workspace shows lifecycle, validation blockers, Publish control, used/limit quota, and quota recovery guidance without deleting drafts. Agent pages show tenant-owned leads, routing status, dashboard notifications, and email delivery state. Cross-tenant identifiers are never accepted from browser state as authority.

### 5.7 Background processing

Publication and lead persistence are synchronous transactions. Notification delivery is asynchronous through the accepted Supabase Queues/pgmq architecture, using ID-only payloads, idempotent claims, bounded retries, and dead-letter handling. Email failure cannot roll back a lead or generate duplicate routing events.

## 6. RLS and multi-tenant impact

All new private tables enable RLS. Tenant members can read only their effective subscription, usage, owned properties, leads, and notifications. Mutations requiring canonical ownership or entitlements execute through narrowly scoped server/RPC boundaries. Public roles can read only the projection and cannot query base property, tenant, subscription, lead, usage, routing, or notification tables. Cross-tenant pgTAP cases cover reads, writes, guessed IDs, routing, quota, and service boundaries.

## 7. Security and privacy

- Lead data is personal data: minimize collection, record consent purpose/time/version, restrict retention/export access, and redact logs.
- Public responses and errors must not reveal tenant existence, private property state, email delivery detail, or internal IDs.
- Apply schema validation, size limits, server-side rate limiting/safety caps, idempotency, and safe text handling.
- Media must be explicitly public-approved; signed private URLs cannot enter the projection.
- Secrets remain environment-only, server-only, ignored by Git, and absent from logs and client bundles.
- CAPTCHA/anti-bot integration is not selected and is an approval gate if baseline controls prove insufficient.

## 8. Usage metering impact

Record append-only events for publish, release, lead accepted, notification attempted/delivered/failed, and relevant safety-cap rejection. Metering must include tenant, event type, source object, idempotency key, and timestamp without copying lead message content. Active quota is enforced from current canonical Published state, not the ledger. Phase 2 AI token/cost metering remains unchanged.

## 9. Cloud Development verification

Only the linked Supabase Cloud Development project may be inspected or changed during implementation. Each migration is applied there in order and compared with repository status. Verification covers pgTAP/RLS/cross-tenant isolation, concurrent publish attempts at the Free limit, public projection leakage, lead routing, queue retry/dead-letter behavior, usage events, TypeScript, lint, unit/integration tests, production build, dependency audit, secret scan, migration parity, and removal of test data/jobs. Production credentials and projects are prohibited.

## 10. Dependencies and risks

- Depends on Phase 1 auth/tenant/property foundations and Phase 2 confirmed intake, queue, worker, and metering foundations.
- Concurrency can oversubscribe quota unless publication serializes on a tenant-level boundary.
- Projection drift can expose private fields; allowlist tests must fail closed.
- Slug changes and pagination instability can harm links/search; use immutable identifiers plus deterministic tie-breakers.
- Lead endpoints invite spam and privacy risk; enforce caps first and gate any vendor integration.
- Email delivery introduces paid-service, data-processing, residency, pricing, and secret-management decisions.

## 11. Acceptance criteria

1. Default Free entitlement is provisioned idempotently with a limit of three Published properties.
2. Three eligible properties publish; a concurrent fourth cannot oversubscribe and its draft remains unchanged.
3. Repeated publish requests are idempotent and create one publication/usage history.
4. Sold or Inactive properties release capacity without erasing history.
5. Public queries return only Published records and the explicit Limited Disclosure allowlist.
6. Private GPS, contact data, notes, AI payloads, tenant IDs, and private media never appear publicly.
7. Search filters, ordering, and pagination are deterministic and covered by tests.
8. Property leads route only to the canonical owning tenant; client-supplied tenant IDs are ignored/rejected.
9. General enquiries enter the unassigned Platform Intake Queue without random assignment.
10. Consent, minimization, idempotency, caps, and non-enumerating errors are verified for lead capture.
11. Dashboard notification works; queue retries and dead-letter behavior do not duplicate leads or routing.
12. RLS and service-boundary tests prove cross-tenant isolation for every new private table.
13. Usage events are append-only, deduplicated, content-minimized, and do not alter Phase 2 AI metering.
14. Cloud Development migrations match the repository and all verification suites pass with cleanup complete.
15. No Production resource, Phase 4/5 feature, secret, commit, or push is included without separate approval.

## 12. Approved implementation gates

1. **Transactional quota boundary — approved:** use a tenant-scoped database lock and canonical Published count. The append-only usage ledger is audit/metering evidence only.
2. **Public projection form — approved with implementation evaluation:** select a security-aware view or maintained projection table from measured correctness, security, maintainability, and query requirements. Stop if the result requires a material architecture change.
3. **Real email delivery — not approved:** implement the adapter and deterministic fake Development driver only. A real provider requires separate approval of provider, pricing, identity, privacy terms, credentials, and environment.
4. **CAPTCHA/anti-bot vendor — not approved:** use provider-independent validation, idempotency, rate limiting, safety caps, and non-enumerating responses while keeping an extensible boundary.
5. **External search — not approved:** use PostgreSQL only. Any future external service requires a new ADR and explicit approval.
