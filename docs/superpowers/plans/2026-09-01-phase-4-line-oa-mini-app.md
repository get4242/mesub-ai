# Phase 4 Implementation Plan — LINE OA + LINE MINI App Integration

> **Status:** Proposed. Do not implement until the Specification and all Approval Gates are approved.

**Goal:** Add LINE channels around the existing Mesub web codebase and Phase 0–3 backend.
**Spec:** `docs/keystone/specs/2026-09-01-phase-4-line-oa-mini-app.md`

## Global constraints

- Development only until a later explicit Production gate.
- Preserve Phase 0–3 Auth, RLS, tenancy, property lifecycle/versioning, AI confirmation, queue/retry/dead-letter, 3 Published quota, lead routing/idempotency/consent, usage metering, notifications, and Limited Disclosure.
- Client LINE user ID, tenant, owner, property ownership, and destination Agent are never authority.
- Server verifies raw LINE token/signature against the exact environment channel before mapping internal identity.
- Reuse existing routes/components/backend; no parallel Agent app.
- TDD: RED → GREEN → REFACTOR and focused regressions after every task.
- Stop for any unresolved gate, paid service, Production access, material ADR/Product Rule, privacy/data-loss risk, or weakened RLS/Limited Disclosure.

## Task 1 — Decisions, ADRs, and Development readiness

**Deliverables:** gate record, architecture/environment diagrams, threat model, identity/session and platform-intake ADRs.

1. Confirm provider ownership, Thailand eligibility, verified/unverified pilot, and same-provider OA/MINI topology.
2. Confirm Development/Review HTTPS domains and endpoint/callback/permanent-link allowlists.
3. Confirm account cardinality, recent reauth, notification consent, retention, quota cap, and general-lead triage.
4. Record credential names only; verify presence without printing.
5. Test environment/channel mapping and forbidden Production target.

**Gate:** all Specification approval decisions resolved; no channel/resource creation without separate authorization.

## Task 2 — Persistence, RLS, and migration

1. RED pgTAP for identity-link uniqueness/immutability, challenge expiry/one-time use, webhook uniqueness, platform intake isolation, append-only delivery/audit, and anon/auth denial.
2. Add only approved tables/functions/indexes/retention metadata.
3. RLS/grants: Agent reads/revokes own link only through safe RPC; platform/service owns webhook/intake/delivery writes; no client tenant.
4. Add atomic link/unlink and append-only audit.
5. Apply after Development guard; run pgTAP and Tenant A/B checks.

## Task 3 — Verification gateway and session exchange

1. RED tests: valid token, wrong audience/channel/environment, expiry, nonce mismatch, malformed token, provider error, replay, and log redaction.
2. Implement server-only official LINE verification adapter.
3. Accept raw token over HTTPS with body/rate limits; never log/persist token.
4. Resolve provider-scoped subject to current link and establish the approved internal session.
5. Allow only relative allowlisted return path; browser login unchanged.

## Task 4 — Explicit link/unlink UX

1. RED tests: unlinked, verifying, confirm, linked, conflict, expired challenge, unlink, recovery.
2. Create recent-authenticated, one-time, session-bound challenge.
3. Verify LINE server-side, show safe confirmation, atomically link.
4. Unlink revokes link and LINE-derived sessions.
5. Prove no auto-link and no cross-user takeover.

## Task 5 — Shared LIFF context and MINI App shell

1. RED tests: LINE iOS/Android, external browser, no LINE, init timeout/error, linked/unlinked, destination preservation.
2. Lazy-initialize approved LIFF SDK at client boundary only.
3. Add environment LIFF ID/context capabilities; domain actions remain existing.
4. Reuse Dashboard, Properties, Add, AI, Leads, Profile routes/components.
5. Add safe-area/keyboard/viewport handling and accessible fallback.
6. Verify 390, 900, 1440 widths and supported LINE clients.

## Task 6 — Rich Menu and deep links

1. RED tests for permanent-link construction, route allowlist, encoded IDs, open-redirect denial, browser fallback.
2. Map approved menu to existing routes using permanent links.
3. Use opaque IDs/slugs; server reauthorizes protected resources.
4. Select OA Manager or Messaging API ownership per menu; never mix one menu.
5. Apply only to Development OA after explicit external-state authorization.

## Task 7 — Signed webhook and durable processing

1. RED tests: exact raw-body HMAC, missing/invalid signature, oversized body, malformed/wrong-environment event, duplicate ID, redelivery/reordering, unsupported event, fast 2xx.
2. Verify signature before parse; insert receipt by `webhookEventId`; enqueue receipt ID only.
3. Reuse existing bounded retry/backoff/dead-letter conventions.
4. Normalize/redact under approved retention; no raw token/body in logs.
5. Add cleanup and operational metrics.

## Task 8 — Lead intake and canonical routing

1. RED tests: Published property context, invalid/unpublished property, duplicate, no consent, spoofed tenant/destination, general message, Tenant A/B.
2. Route property leads through existing lead contract and canonical property owner.
3. Put context-free OA enquiries into platform intake only; no auto-assignment.
4. Add non-enumerating replies, abuse/rate caps, and routing audit.

## Task 9 — Consent-aware Agent notifications

1. RED tests: active consent/link, revoked link, blocked OA, quota exhausted, retryable/permanent failure, duplicate, minimal content, dead-letter.
2. Consume internal notification ID only; resolve link/consent/content server-side.
3. Use Messaging API push for approved Agent notifications; service messages only for eligible action confirmations.
4. Meter counted sends/attempts and enforce approved daily/monthly caps.
5. Exclude storage paths, notes, raw consent payload, tenant IDs, and AI payloads.

## Task 10 — Full Development verification and handoff

1. Unit/integration, TypeScript, ESLint, build, audit, secret scan, `git diff --check`.
2. Phase 0–3 full regression unchanged.
3. Phase 4 pgTAP/integration: token/channel/nonce and takeover defenses; link atomicity/Tenant A/B; webhook signature/replay/idempotency/retry/dead-letter; property/general lead routing; notification consent/quota/disclosure; browser/MINI sessions/deep links; responsive/safe-area; retention/cleanup.
4. Confirm migrations equal Cloud Development, Production untouched, no secrets tracked/logged, and no provider beyond LINE.
5. Stop before Phase 4 baseline commit or Published/Production LINE setup.

## Expected areas — provisional

- `src/features/line/**`: environment contract, verification, link/session, LIFF, webhook normalization, delivery adapter.
- `src/app/api/line/auth/**` and `src/app/api/line/webhook/route.ts`: narrow server endpoints.
- Existing Dashboard layout/Profile: context/link UI only.
- Existing lead/notification/queue seams: adapters only; canonical rules unchanged.
- `supabase/migrations/**` and `supabase/tests/**`: only after Task 2 gate approval.
- `docs/runbooks/**`: channels, secret rotation, retention, incident response.

## Verification matrix

| Boundary | Proof |
| --- | --- |
| Client → identity server | Raw token only; audience/expiry/nonce verified; spoofed ID rejected |
| LINE → webhook | Exact-body HMAC; event dedupe; body bound |
| LINE link → internal user | Explicit link, recent reauth, one-to-one lock, revoke |
| Internal user → tenant | Existing membership/RLS only |
| Lead → Agent | Published property's canonical owner only |
| General lead | Platform queue only |
| Notification → LINE | Active link + consent + quota + minimal allowlist |
| Public media/data | Existing projection/proxy/Limited Disclosure |
| Environment | Development channel/project guard; Production denied |

## Approval checkpoint

Implementation is blocked pending the eleven gates in Specification “Approval gates.” After approval, use TDD implementation. This plan authorizes no Phase 4 code, migration, LINE channel mutation, commit, push, or Production access.
