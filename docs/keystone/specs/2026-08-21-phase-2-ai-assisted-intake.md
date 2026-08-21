# Phase 2 AI-Assisted Intake Specification

Status: Proposed for approval; implementation not authorized

## Goal and audience

Phase 2 enables an authenticated Agent to submit text and selected private Property images for asynchronous AI-assisted extraction and content drafting, review every suggestion with its evidence, explicitly accept or reject suggestions, and confirm the resulting Property facts without publishing it.

Primary user: the verified owner of a Personal Tenant managing their own Property draft.

Success means the Agent can complete `Draft → AI run → reviewed suggestions → accepted canonical edits → confirmation` with tenant isolation, evidence for important facts, repeatable metering, durable processing and no autonomous AI writes or publication.

## Source-of-truth alignment

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2 remains the product authority.
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final remains the technical authority.
- Phase 1 baseline commit `50c71b4b7b04bfcf8e7f889be684688401c56ce4` supplies Auth, Tenant context, Property versions, private Media, RLS and audit.
- Existing `src/config/ai-model-profiles.ts` is the only model-selection boundary. Business logic requests `extraction`, `vision`, `content` or `fallback`; it never embeds provider model names.
- Background execution follows the approved Durable Queue decision: Vercel Queues is preferred only after account/plan/cost validation; otherwise a PostgreSQL-backed queue is documented in an ADR while retaining the same dispatcher/consumer interface.

## In scope

- Immutable AI input snapshots containing Agent text, selected own-Tenant Media references and the Property version at submission.
- Durable, idempotent AI run/job state with bounded retry, timeout and dead-letter outcome.
- Structured extraction and content drafting using server-resolved task-based model profiles.
- Field-level suggestions, evidence/source references, confidence or unknown state and validation outcomes.
- Agent review, accept/reject actions and safe application to canonical Property fields.
- Property confirmation tied to the exact `critical_version` reviewed by the Agent.
- AI usage metering for requests, input/output tokens, selected images, latency, outcome and optional estimated cost.
- Configurable operational safety caps and rate limits separate from commercial Free Plan entitlements.
- Dashboard AI intake/review/confirmation UX.
- RLS, cross-tenant, anonymous/authenticated, worker authorization and audit verification on the dedicated Cloud Development project.

## Explicitly out of scope

- Publish, entitlement/free-three enforcement, public Property listing/search and Leads (Phase 3).
- LINE ingestion or conversations (Phase 4).
- Admin moderation UI or privileged retry UI (Phase 5); the schema may retain a dead-letter state and auditable retry metadata.
- Autonomous AI acceptance, confirmation, publication or modification of canonical facts.
- Training/fine-tuning models, vector search, recommendation ML or provider-specific product rules.
- Pricing, billing, checkout or payment.
- Final production model selection or Thai quality approval; those require evaluation evidence before Production.

## Product behavior

### Starting an AI-assisted intake

- Preconditions: verified Agent context; active owner membership; own non-archived Property in `draft` or `pending_confirmation`; selected Media belong to that same Property and are `ready` in the private intake bucket.
- Agent may provide text, select zero or more ready images, and choose the requested tasks supported by the UI. At least text or one image is required.
- Browser sends Property ID, selected Media IDs, expected Property version and an idempotency key. Tenant, Owner, resolved model ID, usage and job state remain server-controlled.
- The server records an immutable sanitized snapshot before dispatch and returns an accepted run ID without waiting for OpenAI.
- Repeating the same Tenant/idempotency key returns the existing run rather than creating duplicate provider work or usage.

### Durable processing

- Database `ai_runs` is the source of truth for `queued | running | succeeded | failed | dead_letter | cancelled` state.
- Queue payload contains only run ID, Tenant ID, trace ID and schema version; it contains no prompt text, image URL, secret or canonical Property payload.
- Delivery is at-least-once. A consumer claims a run idempotently and never calls the provider twice for an already terminal attempt.
- Retry is limited to classified transient provider/network failures with exponential backoff and a fixed maximum configured outside business logic.
- Schema/guardrail failures are recorded as failed outcomes and are not blindly retried.
- No long-running AI call remains attached to the initiating browser request.

### AI request and output rules

- The worker resolves the selected task through `parseAiModelProfiles()` and records the resolved model ID only as operational audit data.
- Extraction and vision use Structured Outputs/JSON schema. Content drafting returns bounded plain text; rich HTML is not accepted.
- Prompts contain only the current run snapshot and selected own-Property Media. The model receives no database credentials and cannot query other Tenant data.
- Every proposed factual field has `value | null`, `confidence | unknown`, validation status and at least one valid source reference when a non-null important fact is proposed.
- Missing evidence returns `unknown/null`; the model must not infer price, exact coordinates, ownership or sale/rent terms.
- Runtime schema and business/source validation run before suggestions are persisted. Invalid output never reaches canonical Property fields.

### Suggestion review and application

- Suggestions begin as `pending`; an Agent may accept or reject each item.
- Accepting a suggestion revalidates Agent/Tenant ownership, source availability, suggestion status and expected Property version.
- Critical facts require a source and explicit Agent acceptance. Acceptance performs an optimistic Property update, letting the Phase 1 database trigger update `version`/`critical_version` and audit atomically.
- Content-only suggestions may update title/description but are still explicit Agent actions and audited.
- Rejected suggestions never modify Property data.
- A stale Property version returns `VERSION_CONFLICT`; the UI offers reload and does not silently reapply the suggestion.
- Provider output and browser payload never set Tenant, Owner, lifecycle status, verification, audit, version or Published state.

### Confirmation

- Confirmation is an explicit Agent action after reviewing current canonical values and unresolved suggestions.
- A confirmation record stores Property ID, Tenant ID, confirming user, current `critical_version`, timestamp and confirmation schema version.
- The effective confirmation is valid only while its stored `critical_version` equals the Property current `critical_version` and the Property is not archived.
- Non-critical description/style changes increment `version` but do not invalidate confirmation.
- Critical changes invalidate confirmation by version mismatch without deleting history.
- Confirmation does not publish and does not bypass the Phase 1 database Published prohibition.

## UX states and copy

- Entry CTA: “ให้ AI ช่วยจัดข้อมูล” on an owned editable Property.
- Empty input: explain “เพิ่มข้อความหรือเลือกรูปอย่างน้อย 1 รายการ” and keep submit disabled.
- Submitting: disable duplicate submission and show “กำลังส่งงานให้ AI…” until a run ID is accepted.
- Queued/running: show durable status, submitted time and “คุณออกจากหน้านี้ได้ ระบบจะทำงานต่อให้”.
- Success: group suggestions by important facts and content; show value, source, confidence/unknown and validation status with individual Accept/Reject controls.
- Partial/unknown: show “AI ไม่พบหลักฐานเพียงพอ” rather than manufacturing a value.
- Failure: show a stable reason category and recovery action. Retry is offered only when policy marks the run retryable.
- Stale acceptance: “ข้อมูลทรัพย์มีเวอร์ชันใหม่กว่า กรุณาโหลดข้อมูลล่าสุดและตรวจอีกครั้ง”.
- Confirmation: show a critical-field summary and primary “ยืนยันข้อมูลปัจจุบัน”; never show Publish in Phase 2.
- Accessibility: labelled controls, keyboard-operable source expansion and decisions, focus moved to error summary, status announcements through an appropriate live region, and no meaning conveyed by color alone.

## Technical boundaries and data model

### Planned schema

1. `phase2_ai_runs_sources_usage`
   - Enums for AI task, run/attempt/outcome and source kinds.
   - `ai_runs`: Tenant/Property/requester, idempotency key, input snapshot, task set, prompt/schema versions, model profile key, resolved model ID, state, retry metadata, trace/provider request IDs and timestamps.
   - `ai_run_media`: immutable links to selected own-Property Media.
   - `ai_sources`: normalized text spans or Media-derived references; no public access.
   - `ai_usage_events`: append-only measured usage and outcome, with Tenant/run/attempt dimensions.
2. `phase2_ai_suggestions_confirmation`
   - `ai_suggestions`: run/source ownership, field key, proposed JSON value, confidence/unknown, validation result, decision and decision actor/time.
   - `property_confirmations`: immutable confirmation history tied to Property `critical_version`.
   - Private functions/RPCs for atomic suggestion acceptance and confirmation, with Public/anon execution revoked and authenticated execution granted only where actor context is validated.
3. Queue migration only if the approved capability gate selects the PostgreSQL-backed fallback. It creates durable jobs/attempts/dead-letter state behind the same dispatcher contract and is accompanied by an ADR. No fallback migration is created when Vercel Queues is selected.

Every Tenant-owned table has `tenant_id NOT NULL`, RLS, explicit grants, ownership constraints and indexes beginning with Tenant where query patterns require it. Anonymous receives no canonical AI/source/suggestion/usage/confirmation access.

### Interfaces

- `AiJobDispatcher.enqueue({ runId, tenantId, traceId, schemaVersion }): Promise<void>` is provider-neutral.
- `startAiIntakeAction(input): Promise<AiRunMutationResult>` persists then dispatches idempotently.
- `processAiRun(runId): Promise<void>` owns claim, provider call, validation, persistence, metering and terminal state.
- `acceptAiSuggestionAction(input)`, `rejectAiSuggestionAction(input)` and `confirmPropertyAction(input)` are authenticated Server Actions.
- `getAiRunForProperty()` and `listPropertySuggestions()` return tenant-scoped DTOs, never raw credentials or unrestricted provider payloads.
- No browser-facing route accepts a resolved model name or raw queue payload.

## Usage metering and safety limits

- Meter actual provider usage where returned: input/output tokens, image count, latency, attempt and outcome. Preserve provider request ID without secrets.
- When provider usage is missing, record an explicit `unknown` measurement rather than estimating as fact.
- Optional estimated cost is derived by an operational pricing configuration/version, never treated as billing truth.
- Enforce configurable safety caps for input text length, image count per run, concurrent active runs per Tenant, attempts and timeouts.
- These are abuse/cost controls, not the Constitution’s commercial Free Plan. Phase 2 does not implement the three-active-property entitlement.

## Security and privacy

- Worker credentials and OpenAI key are server-only; no `NEXT_PUBLIC_` prefix.
- Signed Media reads are short-lived or server-side downloads and are limited to run-linked own-Tenant objects.
- Snapshot sanitizer excludes private fields unrelated to the task, secrets, auth tokens and other Tenant data.
- Treat Agent text and image content as untrusted prompt input. Instructions inside content cannot override system/schema/business rules.
- Raw provider payload retention follows the Blueprint’s 90-day AI input/output baseline unless it remains a source for an active Property; deletion/retention automation is documented for later operational completion.
- Audit start, retry, accept/reject, confirmation and security-relevant denial without logging full prompts, exact coordinates or unnecessary PII.
- Service/secret-role access is restricted to worker/maintenance boundaries; authenticated UI remains under RLS.

## Dependencies and risks

- Blocking dependency: validate Vercel Queues availability, account plan and cost before queue implementation. Select fallback only with a committed ADR.
- OpenAI task profiles must be populated in server environment and evaluated for Thai extraction/content quality before Production; Phase 2 tests use deterministic fakes/fixtures, not assertions tied to a live model’s prose.
- Structured output/schema drift can invalidate runs; version prompts and schemas and retain raw failure diagnostics with safe redaction.
- At-least-once delivery can duplicate calls or usage unless claims and idempotency are database-backed.
- Images create token/bandwidth/cost and malicious-file risks; consume only Phase 1 `ready` validated Media and bound the selection.
- Suggestion acceptance can race Agent edits; expected Property version and atomic database operations are mandatory.
- Model hallucination and prompt injection remain safety risks; source validation, null/unknown behavior and explicit acceptance are mandatory.
- RLS policy recursion/performance and growing immutable run/source/usage tables require Tenant-first indexes and Cloud advisors/tests.
- Provider outage, timeout and rate limiting require visible durable states; never report a run as succeeded without validated persisted suggestions.

## Tasks and acceptance criteria

### Task 1 — Durable Queue capability gate and ADR

- Record evidence for Vercel Queues availability/plan/cost and select Vercel or PostgreSQL fallback without changing the dispatcher interface.
- Acceptance: one ADR states evidence, selected adapter, retry/dead-letter policy and local/Cloud Development test strategy; no fire-and-forget adapter exists.

### Task 2 — AI run, source and usage schema

- Add immutable snapshots, run/media/source/usage tables, grants, RLS and indexes.
- Acceptance: atomic idempotent run creation; Tenant A cannot read/write Tenant B; anonymous has no access; only validated own-Property ready Media can be linked; usage is append-only to application roles.

### Task 3 — Suggestion and confirmation schema

- Add field-level suggestion/decision and confirmation history plus atomic database operations.
- Acceptance: rejected suggestions never change Property; accepted critical values require evidence and correct versions; stale acceptance changes nothing; effective confirmation follows exact `critical_version`; Published remains impossible.

### Task 4 — AI contracts, snapshot sanitizer and model-profile resolver

- Define versioned structured schemas, safe snapshot construction and task-to-profile resolution.
- Acceptance: missing important evidence becomes null/unknown; browser/model-controlled ownership/status/model names are rejected; no model ID literal exists in business logic.

### Task 5 — Durable dispatcher and idempotent worker

- Implement the selected queue adapter and provider-neutral consumer state machine.
- Acceptance: browser action returns after durable acceptance; redelivery does not duplicate terminal work; transient failure retries within limits; invalid output fails without retry; dead-letter is persisted and audited.

### Task 6 — OpenAI gateway and guarded output persistence

- Call the Responses API server-side through task profiles, structured output and validation boundaries.
- Acceptance: only sanitized snapshot data is sent; valid output becomes suggestions/sources; malformed or source-invalid output never changes canonical Property; provider usage and request metadata are recorded.

### Task 7 — Intake and suggestion Server Actions

- Add start, retry-when-allowed, accept and reject actions with stable result codes.
- Acceptance: all context is server-derived; idempotency works; cross-tenant IDs are indistinguishable from not-found; accepted updates use optimistic locking and append audit; retries obey policy.

### Task 8 — Confirmation domain and action

- Add confirmation rules, action and effective-status query.
- Acceptance: confirmation records the current critical version; critical edits invalidate it, non-critical edits do not; unreviewed/invalid critical suggestions prevent confirmation; action never publishes.

### Task 9 — AI intake/review/confirmation UI

- Add input/media selection, durable status polling/revalidation, evidence review, decisions and confirmation summary.
- Acceptance: happy, empty, queued/running, unknown, failed, stale and confirmation states follow approved copy/accessibility; leaving the page does not cancel work; no Publish control appears.

### Task 10 — Cloud verification, metering/security review and documentation

- Add repeatable Cloud Development pgTAP/integration verification, deterministic provider/queue tests, cleanup checks and operations documentation.
- Acceptance: unit/integration/type/lint/build/audit pass; two-Tenant AI/source/suggestion/usage/confirmation isolation passes; anonymous denial passes; redelivery/retry/dead-letter and usage tests pass; no test residue or secrets remain; migrations are up to date and advisors are clean.

## Approval gate

This document authorizes planning only. No Phase 2 migration, provider call, queue resource, environment mutation, production code, commit or push is authorized until the owner approves both this specification and its implementation plan. Phase 3 remains unauthorized.
