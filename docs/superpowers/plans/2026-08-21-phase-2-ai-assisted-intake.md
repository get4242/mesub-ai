# Phase 2 AI-Assisted Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver durable, tenant-isolated AI-assisted Property intake with evidence-backed suggestions, explicit Agent decisions, critical-version confirmation and AI usage metering without publication.

**Architecture:** Next.js Server Actions persist immutable Tenant-scoped run snapshots and dispatch only IDs through a provider-neutral durable queue. An idempotent worker resolves task-based model profiles, calls OpenAI server-side, validates structured output and evidence, then persists suggestions/sources/usage; atomic database operations apply accepted suggestions and confirmations under RLS and optimistic Property versions.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 6.0.3, Zod 4.4.3, Supabase Auth/PostgreSQL/Storage, OpenAI Responses API with an exact SDK version selected from official documentation at execution time, Vercel Queues when capability gate passes or PostgreSQL-backed fallback, Vitest 4.1.11 and pgTAP.

**Spec:** `docs/keystone/specs/2026-08-21-phase-2-ai-assisted-intake.md`

## Global Constraints

- Follow `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2 and `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final.
- Treat Phase 1 commit `50c71b4b7b04bfcf8e7f889be684688401c56ce4` and its applied migrations as immutable baseline.
- Use TDD: every production behavior begins with a focused failing test and ends with focused plus regression verification.
- Apply and test migrations only on guarded Supabase Cloud Development, never Production.
- Every Tenant-owned table has `tenant_id NOT NULL`, explicit grants, RLS and cross-tenant tests.
- Never trust Tenant, Owner, run status, resolved model, usage, decision actor or confirmation version from browser/model input.
- Resolve models only through `parseAiModelProfiles()` task keys; never hard-code an OpenAI model ID in business logic.
- Use database state as job/run source of truth; queue payloads contain IDs/correlation metadata only.
- At-least-once consumers are idempotent and have bounded retry/dead-letter handling; no fire-and-forget in-memory jobs.
- AI never directly writes canonical Property facts, confirms, publishes or changes lifecycle/ownership.
- Phase 2 adds no Publish, entitlement/free-three, public Property, Lead, LINE, Admin or payment implementation.
- Provider secrets remain server-only and no real credentials enter tracked fixtures, logs or snapshots.
- Do not push or begin Phase 3 without separate authorization.

---

## File map

### Decisions and configuration

- Create `docs/decisions/phase-2-durable-queue.md`: evidence and selected queue adapter.
- Modify `src/config/ai-model-profiles.ts`: preserve task-key-only resolution; add no literal model IDs.
- Create `src/config/ai-runtime.ts`: bounded timeout/retry/input/image/concurrency safety configuration.
- Modify `.env.example`: placeholder-only AI/queue configuration.

### Database and verification

- Create `supabase/migrations/*_phase2_ai_runs_sources_usage.sql`.
- Create `supabase/migrations/*_phase2_ai_suggestions_confirmation.sql`.
- Conditionally create `supabase/migrations/*_phase2_postgres_ai_queue.sql` only if Task 1 selects the fallback.
- Create `supabase/tests/phase2_ai_intake_rls_test.sql`.
- Create `scripts/verify-phase2-cloud.mjs` and `scripts/run-phase2-pgtap.mjs`.

### AI domain and infrastructure

- Create `src/features/ai/contracts.ts`, `snapshot.ts`, `output-validator.ts`, `usage.ts` and focused tests.
- Create `src/features/ai/actions.ts`, `queries.ts`, `confirmation.ts` and focused tests.
- Create `src/features/ai/provider/openai-gateway.ts` and `provider.ts`.
- Create `src/features/ai/worker/process-ai-run.ts`, `run-state-machine.ts` and focused tests.
- Create `src/lib/queue/ai-job-dispatcher.ts` plus exactly one selected adapter and its contract tests.

### UI

- Create `src/app/dashboard/properties/[id]/ai/page.tsx`.
- Create `src/features/ai/ai-intake-panel.tsx`, `ai-run-status.tsx`, `suggestion-review.tsx`, `confirmation-panel.tsx` and UI-state tests.
- Modify `src/features/properties/property-editor.tsx` to link to the AI workflow and show effective confirmation without a Publish control.

### Operations

- Create `docs/architecture/phase-2-ai-assisted-intake.md` and `docs/security/phase-2-checklist.md`.
- Modify `package.json`, `README.md` and `.github/workflows/ci.yml` with guarded deterministic verification commands.

---

### Task 1: Durable Queue capability gate and adapter contract

**Files:**
- Create: `docs/decisions/phase-2-durable-queue.md`
- Create: `src/lib/queue/ai-job-dispatcher.ts`
- Create: `src/lib/queue/ai-job-dispatcher.contract.test.ts`
- Create one after evidence: `src/lib/queue/vercel-ai-job-dispatcher.ts` or `src/lib/queue/postgres-ai-job-dispatcher.ts`
- Conditionally create later migration entry in the file map only for PostgreSQL fallback

**Interfaces:**
- Produces `AiJobMessage = { runId: string; tenantId: string; traceId: string; schemaVersion: number }`.
- Produces `AiJobDispatcher.enqueue(message): Promise<{ accepted: true }>`.
- Records adapter selection without leaking provider concepts into Tasks 5–10.

- [ ] **Step 1: Gather capability evidence**

Check the project’s Vercel account/plan, current official Vercel Queues availability and expected Phase 2 usage/cost. Record date, account scope, source links, limits and whether Development can run deterministic queue tests. Do not infer availability from the Blueprint’s preference.

- [ ] **Step 2: Write the ADR before adapter code**

Document exactly one outcome:

```text
Decision: Vercel Queues | PostgreSQL-backed queue
Evidence: account/plan/price/limits/test-environment findings
Invariant: database ai_runs is source of truth
Delivery: at-least-once
Retry: transient-only, bounded, exponential backoff
Dead letter: persisted database state
Payload: runId, tenantId, traceId, schemaVersion only
```

If evidence is unavailable or materially changes approved cost/operations, stop for owner approval rather than choosing.

- [ ] **Step 3: Write failing adapter contract tests**

Assert accepted payload shape, rejection of prompt text/secret/additional fields, deterministic duplicate message handling and surfaced enqueue failure. Run `pnpm test -- src/lib/queue/ai-job-dispatcher.contract.test.ts`; expect missing interface/adapter failure.

- [ ] **Step 4: Implement the provider-neutral contract and selected adapter**

Keep provider SDK imports inside the selected adapter. The application imports only `AiJobDispatcher`. Pin any new dependency exactly and update the lockfile.

- [ ] **Step 5: Verify the gate deliverable**

Run focused tests, `pnpm typecheck`, `pnpm lint` and the selected adapter’s Development integration check. Acceptance: no prompt, image URL, credentials or Property payload appears in a queue message; no in-memory/fire-and-forget implementation exists.

Suggested isolated commit: `docs: record phase 2 durable queue decision` plus adapter code only after the decision is approved.

### Task 2: AI run, source and usage schema

**Files:**
- Create: `supabase/migrations/<timestamp>_phase2_ai_runs_sources_usage.sql`
- Create: `supabase/tests/phase2_ai_intake_rls_test.sql`
- Modify: `scripts/verify-phase1-cloud.mjs` only if cleanup must recognize new bootstrap-dependent rows

**Interfaces:**
- Produces `public.ai_runs`, `public.ai_run_media`, `public.ai_sources`, `public.ai_usage_events`.
- Produces immutable run snapshot and unique `(tenant_id, idempotency_key)` semantics.
- Supplies run IDs and state to dispatcher/worker tasks.

- [ ] **Step 1: Create the migration shell through Supabase CLI**

Run `supabase migration new phase2_ai_runs_sources_usage`; do not edit Phase 0/1 migrations.

- [ ] **Step 2: Write failing pgTAP assertions**

Cover tables/enums, `tenant_id NOT NULL`, RLS, explicit grants, unique idempotency, own-Property/ready-Media constraints, immutable snapshot/media links, append-only usage, anonymous denial and Tenant A/B read/write denial. Run `pnpm db:test:phase2:dev`; expect missing tables.

- [ ] **Step 3: Implement schema and constraints**

Use run states `queued | running | succeeded | failed | dead_letter | cancelled` and task keys limited to `extraction | vision | content`. Persist sanitized snapshot JSON, input Property version, prompt/schema version, model profile key, resolved model ID, attempt/retry timestamps and redacted error category. Store usage as measured nullable counters with explicit measurement status.

- [ ] **Step 4: Implement least-privilege access**

Authenticated Agents may select their Tenant runs/sources/usage and create runs only through an actor-validating operation; application roles cannot forge worker state, resolved model, usage or requester. Worker writes use a reviewed server boundary. Anonymous receives no privileges.

- [ ] **Step 5: Apply and verify on Cloud Development**

Run guard, dry-run, push, Phase 1 regression pgTAP, Phase 2 pgTAP and advisors. Acceptance: duplicate Tenant/idempotency returns one run; selected Media from another Property/Tenant or non-ready status is rejected; cross-tenant and anonymous checks pass.

Suggested commit: `feat: add tenant-isolated ai run and usage schema`.

### Task 3: Suggestion decisions and Property confirmation schema

**Files:**
- Create: `supabase/migrations/<timestamp>_phase2_ai_suggestions_confirmation.sql`
- Modify: `supabase/tests/phase2_ai_intake_rls_test.sql`

**Interfaces:**
- Produces `public.ai_suggestions` and `public.property_confirmations`.
- Produces atomic operations `accept_ai_suggestion`, `reject_ai_suggestion` and `confirm_property_current_version` with exact signatures documented in migration comments.
- Consumes Phase 1 Property `version`/`critical_version` and ownership constraints.

- [ ] **Step 1: Create migration and failing database tests**

Test field-key allowlist, source ownership, pending/accepted/rejected decisions, actor/time immutability, stale Property version, critical source requirement, accepted Property update/version increment, rejection no-op, confirmation version and Published prohibition.

- [ ] **Step 2: Implement field-level suggestions**

Store proposed value as validated JSON plus field key, confidence nullable/unknown flag, validation status and decision metadata. Constrain each suggestion to the same Tenant/run and sources to the same run.

- [ ] **Step 3: Implement atomic decision operations**

Inside one transaction, validate `auth.uid()`, active owner membership, pending decision, allowed canonical field, expected Property version and required evidence. Update only the allowlisted Property column, let Phase 1 version/audit triggers execute, and mark the suggestion accepted. Rejection changes decision metadata only.

- [ ] **Step 4: Implement confirmation history**

Insert immutable confirmation for the current `critical_version`; define effective confirmation as version equality plus non-archived Property. Require no unresolved invalid critical suggestion selected for the current review set. Do not change status to Published.

- [ ] **Step 5: Run Cloud isolation and concurrency verification**

Acceptance: Tenant B cannot observe or decide Tenant A suggestions; two concurrent accepts with the same expected version yield exactly one success; critical edit invalidates prior confirmation while description-only edit does not.

Suggested commit: `feat: add ai suggestion decisions and property confirmation`.

### Task 4: Versioned AI contracts, snapshot sanitizer and model profiles

**Files:**
- Create: `src/features/ai/contracts.ts`
- Create: `src/features/ai/contracts.test.ts`
- Create: `src/features/ai/snapshot.ts`
- Create: `src/features/ai/snapshot.test.ts`
- Create: `src/features/ai/output-validator.ts`
- Create: `src/features/ai/output-validator.test.ts`
- Create: `src/config/ai-runtime.ts`
- Modify: `src/config/ai-model-profiles.ts`, `.env.example`

**Interfaces:**
- Produces `AiInputSnapshotV1`, `AiStructuredOutputV1`, `ValidatedSuggestion` and `AiRuntimeLimits`.
- Produces `buildAiInputSnapshot(context, property, media, agentText)` and `validateAiOutput(output, snapshot)`.
- Consumes task keys from existing model profiles, never model literals.

- [ ] **Step 1: Write failing snapshot tests**

Fixtures include another Tenant row, auth token, private Agent contact, exact fields not selected, archived Media and prompt-injection text. Assert the snapshot includes only current own Property facts, bounded Agent text, selected ready Media IDs/checksums and immutable versions; injection text remains quoted data, not instructions.

- [ ] **Step 2: Implement versioned snapshot construction**

Use an explicit field allowlist. Reject empty text plus zero Media, excess text/images and version mismatch. Do not create signed URLs in the snapshot.

- [ ] **Step 3: Write failing structured-output/source tests**

Cover null/unknown, unsupported field keys, malformed numeric values, important facts without sources, sources from another run, invented price/coordinates and content exceeding bounds.

- [ ] **Step 4: Implement Zod and business validation**

Return validated suggestions or stable failure categories `SCHEMA_INVALID | SOURCE_REQUIRED | VALUE_INVALID | UNSUPPORTED_FIELD`. No validator mutates Property data.

- [ ] **Step 5: Test model-profile resolution and runtime caps**

Assert `extraction`, `vision`, `content`, `fallback` resolve solely from environment configuration and empty values fail closed. Search production files for provider model ID literals and fail the review if found.

Suggested commit: `feat: define guarded ai intake contracts`.

### Task 5: Durable run dispatcher and idempotent worker

**Files:**
- Create: `src/features/ai/worker/run-state-machine.ts`
- Create: `src/features/ai/worker/run-state-machine.test.ts`
- Create: `src/features/ai/worker/process-ai-run.ts`
- Create: `src/features/ai/worker/process-ai-run.test.ts`
- Modify selected queue adapter from Task 1
- Conditionally create: `supabase/migrations/<timestamp>_phase2_postgres_ai_queue.sql`

**Interfaces:**
- Produces `processAiRun(runId: string): Promise<void>`.
- Consumes `AiJobDispatcher`, AI provider interface from Task 6 and database repositories.
- Owns claims, attempts, retry classification, terminal state and usage persistence.

- [ ] **Step 1: Write failing state-machine tests**

Cover queued→running→succeeded, transient retry, permanent/schema failure, max-attempt dead letter, cancellation-before-claim and prohibited terminal-state transitions.

- [ ] **Step 2: Implement atomic claim/idempotency boundary**

A delivery claims only a due non-terminal run/attempt. Duplicate delivery while running or terminal performs no provider call. Database state, not queue acknowledgement, decides work.

- [ ] **Step 3: Write failing worker orchestration tests**

Use deterministic fake provider/clock/dispatcher. Assert sanitized snapshot read, task-profile resolution, one provider call per claimed attempt, validated persistence, measured usage, trace propagation and redacted errors.

- [ ] **Step 4: Implement bounded retry/dead-letter behavior**

Retry only configured transient categories. Persist `next_attempt_at`, attempt count and terminal outcome before acknowledging. Queue payload stays ID-only.

- [ ] **Step 5: Run adapter integration verification**

Exercise duplicate/redelivery and provider timeout in Development. Acceptance: no duplicate terminal suggestions/usage; max attempts create dead-letter state; no request lifecycle waits for provider completion.

Suggested commit: `feat: add durable idempotent ai run worker`.

### Task 6: OpenAI gateway and guarded persistence

**Files:**
- Create: `src/features/ai/provider/provider.ts`
- Create: `src/features/ai/provider/openai-gateway.ts`
- Create: `src/features/ai/provider/openai-gateway.test.ts`
- Create: `src/features/ai/usage.ts`
- Create: `src/features/ai/usage.test.ts`
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Produces `AiProvider.generate(request): Promise<AiProviderResult>` with structured output, usage, provider request ID and resolved model ID.
- Consumes server-only API key, task profile and versioned schemas.
- Supplies validated raw result to `processAiRun`; it cannot access canonical mutation actions.

- [ ] **Step 1: Verify official SDK/API requirements at execution time**

Use current official OpenAI documentation only. Select and pin an exact SDK version; record API/Structured Output assumptions in architecture docs. Do not select hard-coded model IDs in source.

- [ ] **Step 2: Write failing gateway boundary tests**

Assert task-profile model parameter, JSON schema, timeout/abort, minimal image inputs, no Tenant secrets, provider request ID extraction and complete usage mapping. Mock only the external HTTP/SDK boundary with the full documented response shape.

- [ ] **Step 3: Implement the server-only Responses API gateway**

Construct system/developer instructions separately from quoted Agent content, select the configured profile, request structured output and return raw result without writing Property data.

- [ ] **Step 4: Implement usage normalization**

Persist actual token/image/latency values when present and explicit unknown markers otherwise. Optional estimated cost uses versioned operations configuration, not billing or entitlement logic.

- [ ] **Step 5: Run deterministic provider contract tests**

Cover success, invalid schema, timeout, rate limit, transient 5xx and permanent provider rejection. No test depends on nondeterministic live prose; optional live smoke test is Development-only and separately authorized for cost.

Suggested commit: `feat: add task-profile openai gateway`.

### Task 7: Intake, retry and suggestion decision Server Actions

**Files:**
- Create: `src/features/ai/actions.ts`
- Create: `src/features/ai/actions.test.ts`
- Create: `src/features/ai/queries.ts`
- Modify: `src/lib/audit/audit-metadata.ts`

**Interfaces:**
- Produces `startAiIntakeAction`, `retryAiRunAction`, `acceptAiSuggestionAction`, `rejectAiSuggestionAction`.
- Returns stable `AiRunMutationResult` codes: `INVALID_INPUT | NOT_FOUND | FORBIDDEN | VERSION_CONFLICT | RUN_NOT_RETRYABLE | SUGGESTION_ALREADY_DECIDED | LIMIT_REACHED | SERVICE_UNAVAILABLE`.
- Consumes trusted Agent context, Task 2/3 operations and Task 1 dispatcher.

- [ ] **Step 1: Write failing action tests**

Cover forged Tenant/Owner/model/status/usage fields, same idempotency key, own vs cross-Tenant Property/Media, stale expected version, enqueue failure after durable persistence, retry eligibility and duplicate suggestion decision.

- [ ] **Step 2: Implement start action transaction boundary**

Validate input, derive context, build snapshot, atomically get-or-create run by Tenant/idempotency, then enqueue its ID. If enqueue fails, retain recoverable queued state and return stable service status without deleting evidence.

- [ ] **Step 3: Implement retry action**

Allow only failed/dead-letter outcomes marked retryable by policy and record actor/reason/attempt audit. Do not accept arbitrary retry count or next-attempt time from browser.

- [ ] **Step 4: Implement accept/reject actions**

Call atomic database operations using expected Property version. Map zero/stale/unauthorized results without revealing cross-Tenant existence and revalidate the Property AI/review routes.

- [ ] **Step 5: Run full application and Cloud action verification**

Acceptance: start returns before provider completion; duplicate submission maps to one run; cross-Tenant inputs cause no rows/provider calls; accept/reject behavior and audit are correct.

Suggested commit: `feat: add ai intake and suggestion actions`.

### Task 8: Confirmation rules and action

**Files:**
- Create: `src/features/ai/confirmation.ts`
- Create: `src/features/ai/confirmation.test.ts`
- Modify: `src/features/ai/actions.ts`, `src/features/ai/queries.ts`

**Interfaces:**
- Produces `getEffectiveConfirmation(property)` and `confirmPropertyAction({ propertyId, expectedVersion, expectedCriticalVersion, reviewRunId })`.
- Consumes Task 3 confirmation operation and Phase 1 Property versions.

- [ ] **Step 1: Write failing confirmation tests**

Cover no confirmation, matching critical version, critical mismatch, archived Property, description-only edit, unresolved invalid critical suggestions, forged confirming user and repeated confirmation.

- [ ] **Step 2: Implement pure effective-status rules**

Return `unconfirmed | confirmed | invalidated` plus the stored/current critical versions. Do not derive validity from AI confidence alone.

- [ ] **Step 3: Implement confirmation action**

Derive actor/Tenant, require current Property version and reviewed critical facts, invoke atomic confirmation insertion and audit the action. Confirmation may retain `pending_confirmation` but must never set `published`.

- [ ] **Step 4: Run Property regression tests**

Verify critical accepted suggestion invalidates an older confirmation; content-only accepted suggestion preserves it; Phase 1 state machine/database still reject Published.

Suggested commit: `feat: add critical-version property confirmation`.

### Task 9: AI intake, review and confirmation UI

**Files:**
- Create: `src/app/dashboard/properties/[id]/ai/page.tsx`
- Create: `src/features/ai/ai-intake-panel.tsx`
- Create: `src/features/ai/ai-run-status.tsx`
- Create: `src/features/ai/suggestion-review.tsx`
- Create: `src/features/ai/confirmation-panel.tsx`
- Create focused UI-state tests beside components/domain view models
- Modify: `src/features/properties/property-editor.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes Tasks 7–8 actions/queries and Phase 1 ready Media.
- Produces accessible intake, durable status, evidence decisions and confirmation summary; no Publish control.

- [ ] **Step 1: Write failing UI-state tests**

Assert empty input disables submit with approved explanation; submitting/queued/running copy; unknown evidence display; grouped critical/content suggestions; per-item decision pending; stale reload recovery; retry visibility by policy; confirmation summary and absence of Publish control.

- [ ] **Step 2: Implement intake panel**

Show bounded text count and own ready Media selection with labels/previews. Generate an idempotency key per intentional submission, preserve input on validation failure and announce accepted run status.

- [ ] **Step 3: Implement durable run status**

Server-render initial state and use bounded revalidation/polling for non-terminal runs. Leaving the page does not cancel. Stop polling at terminal state and expose retry only for retryable failure.

- [ ] **Step 4: Implement suggestion review**

Show proposed/current value, source expansion, confidence or unknown and validation result. Accept/reject controls are keyboard operable, disable while pending and surface version conflicts without silent overwrite.

- [ ] **Step 5: Implement confirmation panel**

Show critical-field summary, unresolved blockers, current/effective critical versions and “ยืนยันข้อมูลปัจจุบัน”. Link from Property editor as “ให้ AI ช่วยจัดข้อมูล”. Do not add Publish UI.

- [ ] **Step 6: Verify accessibility and responsive behavior**

Run component/state tests, keyboard/focus review, typecheck, lint and production build. Acceptance: happy, empty, loading, failure and edge states match the specification.

Suggested commit: `feat: add ai intake review and confirmation ui`.

### Task 10: Cloud verification, operations and Phase 2 gate

**Files:**
- Create: `scripts/verify-phase2-cloud.mjs`
- Create: `scripts/run-phase2-pgtap.mjs`
- Create: `docs/architecture/phase-2-ai-assisted-intake.md`
- Create: `docs/security/phase-2-checklist.md`
- Modify: `package.json`, `README.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces guarded repeatable Phase 2 Cloud verification and cleanup.
- Documents queue/provider operations, retry/dead-letter diagnosis, metering semantics, retention boundary and Phase 3 handoff.

- [ ] **Step 1: Write failing Cloud integration harness**

Use two real Development test users/Tenants/Properties and deterministic provider/queue adapters. Cover idempotent start, own ready Media snapshot, cross-Tenant denial, redelivery, transient retry, permanent failure, dead letter, validated suggestions, accept/reject, version conflict, confirmation invalidation and usage rows.

- [ ] **Step 2: Add guarded package/CI commands**

Add `db:test:phase2:dev` and `db:test:integration:phase2:dev` using ignored credentials. CI runs deterministic application/provider/dispatcher tests without live secrets; protected Cloud jobs remain Development-only.

- [ ] **Step 3: Run full verification**

Run:

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:audit
pnpm db:guard:dev
pnpm db:test:phase1:dev
pnpm db:test:phase2:dev
pnpm db:test:integration:phase1:dev
pnpm db:test:integration:phase2:dev
supabase db push --linked --dry-run
supabase db advisors --linked --type all --level warn --fail-on error
```

Expected: every command exits zero, Development migrations are up to date and advisors report no errors.

- [ ] **Step 4: Prove cleanup, metering and secret safety**

Assert no Phase 2 test Auth users, runs, sources, suggestions, confirmations, usage events, queue jobs or Storage objects remain. Confirm `.env.cloud-test` is ignored/untracked and scan all staged blobs for publishable/secret/PAT/JWT/provider-key patterns.

- [ ] **Step 5: Review Phase boundaries and model/queue invariants**

Search production code for model ID literals, direct provider calls outside the gateway, prompt/payload data in queue messages, canonical AI writes without acceptance, and Publish/entitlement/Lead/LINE/Admin implementation. Only documentation, reserved schema and approved abstractions may reference later phases.

- [ ] **Step 6: Prepare Phase 2 baseline for owner approval**

Summarize Tasks 1–10, migrations (including conditional queue migration), UI/actions, queue decision evidence, tests, Cloud state, usage semantics, deviations and file list. Do not commit implementation, push or begin Phase 3 until explicitly authorized.

---

## Self-review ledger

- Spec coverage: Tasks 1–10 cover queue decision, immutable runs/sources, suggestions, structured output, OpenAI gateway, explicit decisions, confirmation, UI, metering, RLS/security and Cloud verification.
- Phase boundary: Publish/entitlement/public Property/Lead remain Phase 3; LINE remains Phase 4; Admin remains Phase 5.
- Model consistency: business code uses `extraction | vision | content | fallback` task profiles only; resolved model IDs are operational records.
- Queue consistency: one provider-neutral dispatcher; database state is authoritative; ID-only payload; at-least-once idempotency and dead letter are mandatory.
- Version consistency: run snapshot records Property version; suggestion acceptance uses expected `version`; confirmation validity uses `critical_version`.
- Security consistency: Tenant-derived context, own ready Media, RLS/explicit grants, source validation, server-only secrets, prompt-injection boundary and safe audit metadata appear in schema, actions, worker and tests.
- Usage consistency: measured/unknown provider usage is operational metering and safety control, not Phase 3 commercial entitlement.
- Placeholder scan: no deferred implementation placeholder is permitted; the conditional queue adapter is resolved by the evidence gate before implementation proceeds.
