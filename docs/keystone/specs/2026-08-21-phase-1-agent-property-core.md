# Phase 1 Agent and Property Core Specification

Status: Approved plan; implementation not authorized

## Goal and audience

Build the authenticated Agent foundation for managing a public/private Agent Profile, Property drafts and private Property media while preserving tenant isolation, critical-field versioning, limited disclosure and auditability.

Primary user: an authenticated, email-verified Agent who owns a Personal Tenant.

## Source-of-truth alignment

This specification implements Phase 1 of:

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final

It preserves the locked multi-tenant model, canonical Property ownership, approved taxonomy, limited disclosure and security-by-default requirements.

## In scope

- Email/password authentication UI, verification-aware routing and Auth callback.
- Atomic signup bootstrap extension for `agent_profiles` plus idempotent backfill.
- Public/private Agent Profile editing and minimal public Agent page.
- Property Draft CRUD, soft archive and the non-publishing portion of the Property state machine.
- Approved taxonomy, conditional fields and deterministic area normalization.
- Optimistic concurrency through `version` and confirmation-sensitive `critical_version`.
- Private media upload, validation, ordering, archive and Storage RLS.
- Allowlisted limited-disclosure selectors.
- Tenant RLS, server authorization, explicit Data API grants and append-only audit.
- Unit, database/RLS, Cloud integration, Storage and accessibility verification.

## Explicitly out of scope

- AI runs, suggestions, extraction and confirmation acceptance UX (Phase 2).
- Entitlements, Free-plan quota reservation, Publish transaction, public Property listing/search/detail and Lead routing (Phase 3).
- LINE OA (Phase 4).
- Admin moderation UI and production-readiness work (Phase 5).
- Google Login, LINE Login, payment collection and pricing.

## Product behavior

### Authentication and Agent context

- Unauthenticated users are redirected from `/dashboard/**` to `/login`.
- Email-unverified users cannot enter the Agent workflow.
- Server authorization resolves `userId`, active `tenantId`, owner membership and `agentProfileId` from the authenticated session and database.
- Browser input never supplies trusted Tenant, Owner, role or quota values.

### Agent Profile

- Signup creates Profile, Personal Tenant, owner Membership and Agent Profile atomically.
- Existing Phase 0 users receive exactly one Agent Profile through an idempotent backfill.
- Agent Profile includes public display name, slug, brand, bio, opt-in contact configuration and a system-controlled verification status.
- Public access uses an allowlist. Private phone/email, Tenant internals and operational fields are never returned by the public selector.

### Property taxonomy and fields

- Listing type: `sale | rent`.
- Property type: `land | detached_house | townhouse | condominium | commercial_building | other`.
- Land requires land area.
- Detached house, townhouse and condominium require bedrooms, bathrooms and building/usable area.
- Commercial building requires building area.
- Other requires land or building area.
- Every Property requires listing type, property type, title, description, province, district, price, currency and at least one normalized area.
- Input units: square metres, square wah, and rai-ngan-square-wah. Canonical searchable values are stored in square metres.

### Property lifecycle

- Phase 1 exposes Draft creation/editing, Draft-to-Pending Confirmation request, Pending-to-Draft return and soft archive.
- The schema contains the Blueprint lifecycle states, but no Phase 1 UI or action can transition to Published.
- Physical deletion is unavailable to application roles.
- A general edit increments `version`; a critical edit increments both `version` and `critical_version`.
- Updates require an expected version; stale updates fail without overwriting newer data.

Critical fields are listing/property type, price/terms, province/district/location/coordinates, area/units, ownership, sale/rent status and critical facts later accepted from AI.

### Media

- Intake and published buckets are private during Phase 1.
- Object paths are server-approved: `{tenant_id}/{property_id}/{media_id}/{filename}`.
- Allowed formats are JPEG, PNG and WebP.
- Safety limits are 10 MiB per file and 20 media records per Property. These are operational limits, not commercial entitlements.
- MIME, extension, magic bytes, size, dimensions and checksum are validated.
- Upload is non-upsert; incomplete uploads never become ready media.
- Application code uses the Storage API for object mutations and treats Storage metadata tables as read-only.

### UX states and copy

- Empty Property list: title “เพิ่มทรัพย์รายการแรก”, explanatory sentence and primary “เพิ่มทรัพย์” action.
- Saving: disable the submit control, retain field values and show “กำลังบันทึก…”.
- Validation failure: preserve input, show a summary and focus the first invalid field.
- Stale version: explain that newer data exists and offer reload; never silently overwrite.
- Upload failure: name the rejected file and recovery reason.
- Phase 1 shows no Publish CTA.
- Forms must support keyboard operation, associated labels, visible focus and mobile/desktop layouts.

## Technical boundaries

- Server Actions own authenticated form mutations.
- Runtime input validation uses Zod.
- `requireAgentContext()` owns session/membership resolution.
- Domain modules own taxonomy, area normalization, conditional validation and state transitions.
- Server Actions derive Tenant/Owner values and call domain/database boundaries.
- Public DTOs use field allowlists rather than object spreading.
- RLS protects every exposed table; grants explicitly opt roles into only required operations.
- Privileged functions remain in `private`, revoke Public execution, validate actor context and receive separate security review.
- Audit records use a safe metadata allowlist and exclude secrets, exact coordinates and unnecessary PII.

## Schema sequence

1. `phase1_agent_profiles_audit`: enums, Agent Profile, audit log, trigger extension and backfill.
2. `phase1_properties_core`: Property enums/table, constraints, ownership validation, indexes, grants and RLS.
3. `phase1_property_media_storage`: Property media, buckets, Storage policies and supporting indexes.

Applied Phase 0 migration files are immutable; Phase 1 extends or replaces functions/triggers through new migrations.

## Acceptance criteria

- Signup and backfill yield exactly one Agent Profile per Personal Tenant owner.
- Tenant A cannot read/write Tenant B Agent Profiles, Properties, Media or audit data.
- Anonymous users cannot access canonical Agent/Property/Media tables.
- Public Agent output contains only approved fields.
- Ownership columns cannot be reassigned through application access.
- Conditional taxonomy and area conversion tests pass at boundaries.
- Critical and non-critical edits change the correct version counters.
- Stale writes are rejected.
- Phase 1 cannot Publish a Property.
- Storage rejects forged paths, cross-tenant access, invalid files, oversized files and accidental overwrites.
- Intake/published buckets remain private.
- All important mutations append safe audit records.
- Unit tests, typecheck, lint, production build, dependency audit, pgTAP, Cloud integration, Storage isolation and database advisors pass.
- Cloud tests leave no users, rows or objects behind.
- Secrets remain ignored/untracked and no secret key reaches client code.

## Dependencies and risks

- Depends on the committed Phase 0 Auth/Tenancy baseline and dedicated Supabase Cloud Development Project.
- Supabase Free SMTP limits require Admin-created test users plus normal public sign-in for automated integration tests.
- Explicit Data API grants are required independently of RLS.
- Storage policies must verify bucket, membership and path; Storage metadata must not be mutated directly.
- Area conversion and rounding must be deterministic.
- Public selectors must remain allowlists to prevent future column leakage.
- Entitlement/Free subscription remains a Phase 3 prerequisite before Publish and is not added here.

## Expected artifacts

- Three new Supabase migrations and a Phase 1 pgTAP suite.
- Auth, Agent, Property and Media feature modules and tests.
- Dashboard/auth/public Agent routes listed in the implementation plan.
- Cloud verification script and Phase 1 architecture/security documentation.

## Approval gate

The specification is approved for planning artifacts only. Implementation, migration creation/application, commit and push require a separate explicit authorization.
