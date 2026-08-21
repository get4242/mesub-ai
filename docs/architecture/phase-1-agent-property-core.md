# Phase 1 Agent and Property Core

Phase 1 adds verified Agent authentication, one Agent Profile per Personal Tenant, Property draft management, private media and limited public Agent disclosure. The modular Next.js application derives Tenant and Owner context on the server while PostgreSQL constraints, explicit grants and RLS enforce the same boundary.

## Database sequence

1. `phase1_agent_profiles_audit` adds Agent Profiles, append-only audit storage, atomic signup extension and idempotent backfill.
2. `phase1_properties_core` adds taxonomy, lifecycle-reserved Property records, optimistic versions, conditional constraints and tenant RLS.
3. `phase1_property_media_storage` adds media metadata, two private buckets, Storage policies, safety limits and atomic Property audit triggers.
4. `phase1_media_reorder_atomic` is a forward corrective migration that makes the media position constraint deferrable and exposes one authenticated, tenant-checked atomic reorder RPC. It was added after Cloud testing showed that multi-row swaps cannot be safe as separate updates.
5. `phase1_media_reorder_constraint_fix` is a forward-only Cloud-discovered fix that makes the deferrable constraint visible to the hardened reorder function without changing its authorization model.

Applied migrations are immutable and all verification targets the guarded Cloud Development project.

## Phase boundary

Phase 1 supports Draft, Pending Confirmation, return to Draft and archive. `Published` is schema-reserved but rejected by domain and database transitions. AI intake, confirmation acceptance, entitlement/quota enforcement, public Property pages, Leads, LINE and Admin remain later phases.

## Verification

Use ignored `.env.cloud-test`, then run:

```text
pnpm db:test:phase1:dev
pnpm db:test:integration:phase1:dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:audit
```
