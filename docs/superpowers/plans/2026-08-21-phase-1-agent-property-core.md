# Phase 1 Agent and Property Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver authenticated Agent Profile, Property Draft CRUD and private Property media with tenant isolation, critical-field versioning, limited disclosure and audit.

**Architecture:** Next.js Server Actions derive trusted Agent context from Supabase Auth and active membership. Domain modules own validation and transitions; Postgres constraints, explicit grants and RLS provide defense in depth. Supabase Storage remains private and uses server-approved Tenant/Property/Media paths.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 6.0.3, Zod 4.4.3, Supabase Auth/Postgres/Storage, Vitest 4.1.11, pgTAP.

**Spec:** `docs/keystone/specs/2026-08-21-phase-1-agent-property-core.md`

## Global Constraints

- Follow `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2 and `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final.
- Use Node.js 22+ and pnpm 11.19.0 with exact package versions and committed lockfile.
- Never edit an applied migration; create migrations with `supabase migration new <name>`.
- Apply/test only against the dedicated guarded Cloud Development Project, never Production.
- Every Tenant-owned table has `tenant_id NOT NULL`.
- Never trust Tenant, Owner, role, quota or critical ownership fields from browser input.
- Never use user-editable metadata for authorization.
- Every exposed table has RLS and explicit least-privilege grants.
- Service/secret keys remain server-only and untracked.
- No AI, Publish/quota, public Property marketplace, Lead, LINE or Admin implementation.
- Use TDD: observe the focused test fail before implementing and pass afterward.
- Do not push commits without separate authorization.

---

## File map

### Database and verification

- Create `supabase/migrations/*_phase1_agent_profiles_audit.sql`: Agent Profile, audit and bootstrap extension.
- Create `supabase/migrations/*_phase1_properties_core.sql`: Property schema, constraints, grants and RLS.
- Create `supabase/migrations/*_phase1_property_media_storage.sql`: Media schema, buckets and Storage policies.
- Create `supabase/tests/phase1_agent_property_rls_test.sql`: pgTAP schema/RLS suite.
- Create `scripts/verify-phase1-cloud.mjs`: Cloud Auth/Data API/Storage integration verification and cleanup.

### Shared authorization and audit

- Create `src/lib/auth/require-agent-context.ts`: verified session and active owner membership resolver.
- Create `src/lib/audit/audit-metadata.ts`: safe metadata allowlist used by server mutations.

### Feature modules

- Create `src/features/auth/{actions,schemas}.ts`.
- Create `src/features/agents/{actions,schemas,queries,public-disclosure}.ts`.
- Create `src/features/properties/{actions,area,schemas,state-machine,queries,public-disclosure}.ts`.
- Create `src/features/media/{actions,validation}.ts`.
- Co-locate `*.test.ts` beside focused domain files.

### Routes

- Create `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`, `src/app/auth/callback/route.ts`.
- Create `src/app/dashboard/layout.tsx`, `page.tsx`, `profile/page.tsx`.
- Create `src/app/dashboard/properties/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`.
- Create `src/app/agents/[slug]/page.tsx`.

---

### Task 1: Agent Profile and audit migration

**Files:**
- Create: `supabase/migrations/<timestamp>_phase1_agent_profiles_audit.sql`
- Create: `supabase/tests/phase1_agent_property_rls_test.sql`
- Modify: `scripts/verify-phase0-cloud.mjs` only if cleanup must recognize the new bootstrap row

**Interfaces:**
- Produces tables `public.agent_profiles`, `public.audit_logs`.
- Produces one Agent Profile for every new/existing Personal Tenant owner.
- Produces private audit-writing function with Public execution revoked.

- [ ] **Step 1: Create the migration through the CLI**

Run:

```text
pnpm exec supabase migration new phase1_agent_profiles_audit
```

Expected: one timestamped migration file under `supabase/migrations`.

- [ ] **Step 2: Write failing pgTAP assertions**

Assert table existence, RLS, explicit privileges, one-row backfill, atomic signup output, cross-tenant denial and append-only audit behavior.

Run:

```text
pnpm db:test:dev
```

Expected: FAIL because Phase 1 tables do not exist.

- [ ] **Step 3: Implement the migration**

Define verification enum `unverified | pending | verified | rejected`, Profile/audit tables, indexes, grants and policies. Replace the existing signup trigger function in the new migration so it inserts Profile, Tenant, Membership and Agent Profile in one transaction; backfill with `ON CONFLICT DO NOTHING`.

- [ ] **Step 4: Run database and Cloud bootstrap verification**

Run:

```text
pnpm db:push:dev
pnpm db:test:dev
pnpm db:test:integration:dev
```

Expected: migration applies only to Development; Phase 0 and new Agent Profile assertions pass.

- [ ] **Step 5: Run advisors and commit the isolated migration**

Run `supabase db advisors --linked --type all --level warn --fail-on error`.

Commit message:

```text
feat: add phase 1 agent profile and audit schema
```

### Task 2: Authentication UI and Agent context

**Files:**
- Create: `src/features/auth/schemas.ts`
- Create: `src/features/auth/actions.ts`
- Create: `src/lib/auth/require-agent-context.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/lib/auth/require-agent-context.test.ts`

**Interfaces:**
- Produces `requireAgentContext(): Promise<{ userId: string; tenantId: string; membershipId: string; agentProfileId: string }>`.
- Produces `loginAction`, `signupAction`, `logoutAction` with stable result codes.

- [ ] **Step 1: Write failing schema and context tests**

Cover invalid email/password, missing session, unverified email, inactive membership and active owner success.

Run `pnpm test -- src/lib/auth/require-agent-context.test.ts`.

Expected: FAIL because the resolver and schemas do not exist.

- [ ] **Step 2: Implement Zod input/result contracts**

Use:

```ts
type AuthActionResult =
  | { ok: true }
  | { ok: false; code: "INVALID_INPUT" | "INVALID_CREDENTIALS" | "EMAIL_UNVERIFIED" | "AUTH_UNAVAILABLE"; message: string };
```

- [ ] **Step 3: Implement server actions and context resolver**

Resolve session with Supabase server client, require verified email, query one active membership and Agent Profile, and never accept Tenant ID from form data.

- [ ] **Step 4: Build auth pages and callback**

Provide labelled fields, pending state, preserved invalid input, Thai recovery messages and safe redirect targets restricted to same-origin dashboard paths.

- [ ] **Step 5: Verify and commit**

Run `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.

Commit message: `feat: add verified agent authentication flow`.

### Task 3: Property domain contracts

**Files:**
- Create: `src/features/properties/area.ts`
- Create: `src/features/properties/area.test.ts`
- Create: `src/features/properties/schemas.ts`
- Create: `src/features/properties/schemas.test.ts`
- Create: `src/features/properties/state-machine.ts`
- Create: `src/features/properties/state-machine.test.ts`

**Interfaces:**
- Produces `normalizeArea(input): { squareMetres: string }`.
- Produces `propertyDraftSchema`, `propertyUpdateSchema`, `CRITICAL_PROPERTY_FIELDS`.
- Produces `assertPhase1Transition(from, to): void`.

- [ ] **Step 1: Write failing area conversion tests**

Required examples:

```ts
expect(normalizeArea({ unit: "sqwah", value: "100" }).squareMetres).toBe("400");
expect(normalizeArea({ unit: "rai_ngan_sqwah", rai: 1, ngan: 2, sqwah: 50 }).squareMetres).toBe("2600");
```

- [ ] **Step 2: Implement decimal-safe normalization**

Avoid binary floating-point persistence; return canonical decimal strings suitable for Postgres numeric columns.

- [ ] **Step 3: Write failing taxonomy and conditional-field tests**

Cover every approved Property type, required common fields, non-negative values and invalid combinations.

- [ ] **Step 4: Implement Zod schemas and critical-field set**

The schemas exclude `tenant_id`, `owner_agent_id`, moderation status and Published status from browser-controlled inputs.

- [ ] **Step 5: Write and pass state-machine tests**

Allow Draft→Pending, Pending→Draft and soft archive flows. Assert every transition to Published throws `PUBLISH_NOT_AVAILABLE_IN_PHASE_1`.

- [ ] **Step 6: Verify and commit**

Run focused tests, then `pnpm test && pnpm typecheck && pnpm lint`.

Commit message: `feat: define property taxonomy and lifecycle rules`.

### Task 4: Property schema, constraints and RLS

**Files:**
- Create: `supabase/migrations/<timestamp>_phase1_properties_core.sql`
- Modify: `supabase/tests/phase1_agent_property_rls_test.sql`

**Interfaces:**
- Produces `public.properties` with `version` and `critical_version`.
- Guarantees Owner Agent belongs to Property Tenant.
- Grants authenticated CRUD only where policies allow; grants no anonymous canonical access.

- [ ] **Step 1: Create migration through the CLI**

Run `pnpm exec supabase migration new phase1_properties_core`.

- [ ] **Step 2: Add failing pgTAP cases**

Test constraints, explicit grants, Tenant A/B isolation, ownership reassignment denial, anonymous denial, soft archive and version checks.

- [ ] **Step 3: Implement enum/table/index/constraint schema**

Use numeric price/area columns, private exact coordinates, lifecycle timestamps and `archived_at`. Add indexes for Tenant/status, Owner and updated ordering.

- [ ] **Step 4: Implement least-privilege RLS**

Policies require active membership for SELECT/INSERT/UPDATE and validate both old/new ownership on UPDATE. Application roles receive no DELETE grant.

- [ ] **Step 5: Apply and verify on Cloud Development**

Run guard, dry-run, push, pgTAP, cross-tenant integration and advisors.

- [ ] **Step 6: Commit**

Commit message: `feat: add tenant-isolated property core schema`.

### Task 5: Property Server Actions

**Files:**
- Create: `src/features/properties/actions.ts`
- Create: `src/features/properties/actions.test.ts`
- Create: `src/features/properties/queries.ts`
- Create: `src/lib/audit/audit-metadata.ts`
- Create: `src/lib/audit/audit-metadata.test.ts`

**Interfaces:**
- Produces `createPropertyDraftAction`, `updatePropertyDraftAction`, `requestPropertyConfirmationAction`, `returnPropertyToDraftAction`, `archivePropertyAction`.
- All updates consume `propertyId` and `expectedVersion`; Tenant/Owner comes only from `requireAgentContext()`.

- [ ] **Step 1: Write failing action tests**

Cover trusted context derivation, idempotent create, stale version, critical/non-critical version increments, cross-tenant ID and safe audit metadata.

- [ ] **Step 2: Implement stable mutation results**

```ts
type PropertyMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN" | "VERSION_CONFLICT" | "INVALID_TRANSITION"; message: string };
```

- [ ] **Step 3: Implement minimal actions and queries**

Use conditional updates by ID/Tenant/version, derive Owner Agent, write audit in the same business transaction boundary where available, and revalidate affected dashboard routes.

- [ ] **Step 4: Verify and commit**

Run focused tests and the full application verification set.

Commit message: `feat: add audited property draft mutations`.

### Task 6: Media schema, Storage policies and actions

**Files:**
- Create: `supabase/migrations/<timestamp>_phase1_property_media_storage.sql`
- Modify: `supabase/tests/phase1_agent_property_rls_test.sql`
- Create: `src/features/media/validation.ts`
- Create: `src/features/media/validation.test.ts`
- Create: `src/features/media/actions.ts`
- Create: `src/features/media/actions.test.ts`

**Interfaces:**
- Produces `requestPropertyMediaUploadAction`, `finalizePropertyMediaAction`, `reorderPropertyMediaAction`, `archivePropertyMediaAction`.
- Produces paths `tenant/property/media/server-filename`.

- [ ] **Step 1: Create migration and failing Storage pgTAP tests**

Assert buckets are private, policies require active membership and matching path, cross-tenant operations fail, and direct application deletes are unavailable.

- [ ] **Step 2: Implement Media table, buckets and policies**

Set 10 MiB bucket limit, JPEG/PNG/WebP allowlist and private access. Do not add anonymous/public read to either bucket.

- [ ] **Step 3: Write failing validation/action tests**

Cover MIME/extension/magic-byte mismatch, dimensions, checksum, 20-file safety limit, forged path, accidental overwrite and incomplete finalization.

- [ ] **Step 4: Implement validation and actions**

Generate IDs/paths server-side, default `upsert: false`, finalize only validated objects, and use Storage API rather than SQL mutations of Storage metadata.

- [ ] **Step 5: Run Cloud Storage integration and cleanup checks**

Create two users/two Properties, upload one valid fixture, assert isolation, archive it and verify no test objects remain.

- [ ] **Step 6: Commit**

Commit message: `feat: add private tenant-scoped property media`.

### Task 7: Agent Profile and Property dashboard UI

**Files:**
- Create: dashboard/auth/profile/property route files from the file map
- Create: `src/features/agents/actions.ts`, `schemas.ts`, `queries.ts`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Test: component/action tests co-located under `src/features/agents` and `src/features/properties`

**Interfaces:**
- Consumes Auth/Agent context, Agent/Profile queries, Property actions and Media actions.
- Produces accessible dashboard navigation and forms; no Publish control.

- [ ] **Step 1: Write failing UI behavior tests**

Cover empty list copy/CTA, pending save state, field summary/focus, conditional fields, upload error, keyboard reorder and version-conflict recovery.

- [ ] **Step 2: Implement dashboard layout and Profile form**

Server-render authorized data; submit through Agent actions. Keep private/public contact choices explicit.

- [ ] **Step 3: Implement Property list/new/edit forms**

Render conditional sections from the shared taxonomy. Preserve values on error and display stable Thai recovery messages.

- [ ] **Step 4: Implement Media controls**

Show upload progress, ready/error state, preview, accessible reorder controls and archive action.

- [ ] **Step 5: Run accessibility and application verification**

Check keyboard paths and labels; run `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.

- [ ] **Step 6: Commit**

Commit message: `feat: add agent property management dashboard`.

### Task 8: Limited public disclosure

**Files:**
- Create: `src/features/agents/public-disclosure.ts`
- Create: `src/features/agents/public-disclosure.test.ts`
- Create: `src/features/properties/public-disclosure.ts`
- Create: `src/features/properties/public-disclosure.test.ts`
- Create: `src/app/agents/[slug]/page.tsx`

**Interfaces:**
- Produces allowlisted `PublicAgentProfile` and reserved `PublicPropertyDisclosure` DTOs.
- Property DTO is not exposed through a public Property route until Phase 3.

- [ ] **Step 1: Write failing allowlist/snapshot tests**

Fixtures include exact coordinates, private contact, Tenant/Owner IDs and audit metadata; assert none appear in serialized DTOs.

- [ ] **Step 2: Implement explicit DTO mappers**

Construct every output field individually. Do not use object spread followed by deletion.

- [ ] **Step 3: Implement minimal public Agent page**

Return not-found for missing/suspended profiles and show only Agent-approved contact methods.

- [ ] **Step 4: Verify anonymous canonical-table denial on Cloud**

Use publishable key requests to confirm direct canonical reads fail or return no rows while the server-rendered allowlisted page works.

- [ ] **Step 5: Commit**

Commit message: `feat: enforce limited agent disclosure`.

### Task 9: Phase 1 verification and documentation gate

**Files:**
- Create: `scripts/verify-phase1-cloud.mjs`
- Create: `docs/architecture/phase-1-agent-property-core.md`
- Create: `docs/security/phase-1-checklist.md`
- Modify: `package.json`, `.env.example`, `README.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces repeatable guarded Phase 1 Cloud verification and cleanup.
- Produces documented Phase 1 operating/verification commands.

- [ ] **Step 1: Build a failing Cloud verification script**

Cover Agent Profile bootstrap, two-Tenant Property CRUD, critical versioning, anonymous denial, Media isolation and cleanup. Confirm the script fails before all Phase 1 dependencies are present.

- [ ] **Step 2: Add guarded package commands**

Add commands for Phase 1 pgTAP and integration verification that load no secret from tracked files and target the allowlisted Development ref.

- [ ] **Step 3: Run final verification**

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:audit
pnpm db:guard:dev
pnpm db:push:dev
pnpm db:test:dev
pnpm db:test:phase1:dev
pnpm db:test:integration:phase1:dev
supabase db advisors --linked --type all --level warn --fail-on error
```

Expected: every command exits 0; migration dry-run is up to date; advisors return no errors.

- [ ] **Step 4: Prove cleanup and secret safety**

Query for zero Phase 1 test users, rows and Storage objects. Confirm `.env.cloud-test` is ignored/untracked and scan staged blobs for real key/token patterns.

- [ ] **Step 5: Review Phase boundaries**

Search routes/actions for Publish, AI, Lead, LINE and Admin implementations. Only schema-reserved states/types and documentation references may exist.

- [ ] **Step 6: Prepare Phase 1 baseline commit for approval**

Summarize files, test evidence and Cloud state. Do not commit or push until the user explicitly authorizes the baseline commit.

---

## Self-review ledger

- Spec coverage: Tasks 1–9 cover Auth/Agent Profile, Property core, taxonomy/units/versioning, Media, disclosure, isolation, audit, UI and verification.
- Phase boundary: AI/confirmation acceptance, Publish/quota/public Property marketplace, Lead, LINE and Admin remain excluded.
- Interface consistency: `requireAgentContext`, mutation result codes, version fields and Media action names match across tasks.
- Migration integrity: all Phase 1 changes use new CLI-generated migrations.
- Security: explicit grants, RLS, private Storage, server-derived ownership and allowlisted disclosure are represented in schema, code and tests.
- Execution gate: implementation requires separate explicit authorization.
