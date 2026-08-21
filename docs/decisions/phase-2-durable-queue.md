# ADR: Phase 2 Durable Queue Capability Gate

- Status: Accepted
- Date reviewed: 2026-08-21
- Scope: Phase 2 Task 1 only
- Decision owner: Project owner

## Context

Phase 2 requires durable background processing for AI-assisted intake. The approved Blueprint prefers Vercel Queues
when the active Vercel account and project pass a capability and cost gate, with a PostgreSQL-backed queue as the
approved fallback. Database state remains authoritative regardless of adapter.

This review used current official documentation and inspected the local workspace. The workspace has `vercel.json`
configured for Next.js in `sin1`, but it has no `.vercel/project.json`, authenticated Vercel CLI, Vercel account or
project identifiers, plan metadata, billing metadata, or Vercel environment credentials. Therefore generic product
availability cannot establish availability or cost for the actual Mesub AI project.

## Evidence

### Vercel Queues

Official Vercel documentation states that Queues is in Beta and available on all plans. It provides durable event
streaming, automatic retries, sharding, and delivery guarantees:

- <https://vercel.com/docs/queues>
- <https://vercel.com/docs/queues/concepts>
- <https://vercel.com/docs/queues/pricing>
- <https://vercel.com/pricing>

Verified behavior and constraints:

- Delivery is at least once. A consumer must be idempotent and must tolerate duplicate delivery.
- A message is leased and must be acknowledged. If processing or acknowledgement fails, it becomes visible for
  redelivery after the visibility timeout.
- Ordering is approximate; FIFO is not guaranteed, including with consumer concurrency set to one.
- Retention is configurable from 60 seconds to 7 days and defaults to 24 hours.
- Visibility timeout is configurable up to 60 minutes and defaults to 60 seconds.
- Maximum message size is 100 MB, but the Mesub contract must remain ID-only.
- Idempotency keys deduplicate for the original message lifetime/TTL; the publish response can succeed before
  asynchronous deduplication completes, so application-level idempotency is still required.
- Push consumers are deployment-configured private Functions using the experimental `queue/v2beta` trigger. Poll
  consumers are also supported.
- Queues is offered in Vercel regions and replicates within three availability zones of the selected region. During a
  regional incident Vercel may temporarily store data in a neighboring region, so strict regional data residency is
  not guaranteed.
- Queue API operations are metered as Send, Receive, Delete/acknowledge, visibility changes, and Notify. Payloads are
  charged in 4 KiB operation units. Idempotent sends and push delivery with maximum concurrency consume additional
  operation units; invoked Functions are billed separately.
- The current pricing page shows the first 1,000,000 queue API operations included for Hobby. It labels excess rates
  as regional, but the exact regional unit price was not exposed in the reviewed public page. Vercel's general pricing
  page lists Hobby at USD 0/month and Pro at USD 20/month with USD 20 usage credit; this does not establish the
  Mesub project's actual plan or Queue bill.
- The first 32 retry attempts use the configured retry delay; Vercel enforces increasing backoff after that point.

### Current account/project capability

Not verified. No local Vercel link or authenticated account context exists, so this review cannot confirm:

- which Vercel team and project host Mesub AI;
- whether that project is Hobby, Pro, or Enterprise;
- whether Queues Beta can be created and invoked on that project today;
- the selectable queue region and alignment with the current Vercel/Supabase deployment;
- the exact regional operation rate, Function cost, included allowance, spend controls, or expected monthly charge;
- whether Preview and Production deployments can use safely separated queues and deterministic Development tests.

### PostgreSQL-backed fallback

Supabase documents Supabase Queues as a Postgres-native durable queue built on `pgmq`, with guaranteed delivery,
visibility-window semantics, durable storage and optional archival. Access can be controlled through API permissions
and Row Level Security:

- <https://supabase.com/docs/guides/queues>
- <https://supabase.com/docs/guides/queues/quickstart>
- <https://supabase.com/docs/guides/database/extensions/pgmq>

The fallback fits the existing Supabase database and tenant-security boundary and can be migrated and verified on the
dedicated Cloud Development project. It also avoids introducing a second state system for queue records. However, it
requires an independently scheduled or long-running consumer, careful claim/visibility logic, connection management,
retention and archival cleanup, monitoring, and database-capacity budgeting. Queue access must be server-only by
default; any exposed API requires explicit least-privilege grants and RLS. PostgreSQL queue guarantees do not remove
the need for idempotent business processing.

## Architecture comparison

| Concern | Vercel Queues | PostgreSQL-backed queue |
| --- | --- | --- |
| Fit with Vercel + Supabase | Native Vercel trigger and scaling; database still owns run state | Native to current Supabase data boundary; worker scheduling must be supplied |
| Delivery | At least once; duplicate-safe consumer required | Visibility/claim redelivery; duplicate-safe consumer still required |
| Retry | Platform retry plus configured delay; bounded application policy required | Application/SQL retry schedule, attempt cap, and dead-letter state required |
| Ordering | No FIFO guarantee | Must not rely on ordering unless explicitly implemented and tested |
| Tenant isolation | Queue payload carries trusted IDs only; authorization occurs against DB | Server-only queue access plus RLS/grants where exposed |
| Development | Requires a verified Vercel project, isolated queue resources, and deployment behavior tests | Can use guarded migrations/tests on the existing Supabase Cloud Development project |
| Operations/cost | Managed service, but account enablement and exact regional charges are unverified | Adds Postgres load, worker operations, cleanup, and monitoring to existing Supabase cost envelope |
| Portability | Provider adapter keeps business logic independent | Provider adapter keeps business logic independent |

## Required invariants for either adapter

- `ai_runs` in PostgreSQL is the source of truth; queue acknowledgement never determines business completion.
- Queue payload is limited to `runId`, `tenantId`, `traceId`, and `schemaVersion`. It contains no prompt, Property
  snapshot, image URL, credential, personal data, or model name.
- Enqueue uses a stable idempotency key, but a database uniqueness constraint and atomic run claim are the primary
  duplicate barriers.
- Consumers are idempotent: terminal or already-claimed runs cause no provider call and no duplicate suggestion or
  usage rows.
- Retry applies only to classified transient failures, uses bounded exponential backoff with jitter, and ends in a
  persisted database dead-letter state after the configured attempt limit.
- Persist attempt state and the next retry time before acknowledging the delivery. Errors are categorized and
  redacted.
- Development, Preview, and Production use separate queue resources and credentials. Local tests use deterministic
  fakes; Cloud integration tests run only against Development. Production is never used for verification.
- Secrets remain server-only environment variables and are never committed.

## Decision

**Outcome 2: Use Supabase Queues / PostgreSQL-backed `pgmq` as the durable transport for Mesub AI V1.**

The project owner accepted this decision on 2026-08-21. It removes V1's dependency on Vercel Queues Beta capability,
plan, regional-pricing, and project-enablement evidence while keeping PostgreSQL/Supabase as the authoritative system.

The selected adapter must use Supabase Queues/`pgmq`; it must not implement an in-memory or request-lifecycle job.
Privileged send, read/claim, acknowledge/delete, archive, and administrative operations remain server-only through
private database functions or an equivalently reviewed server boundary. The queue is not exposed directly to browser
clients. Queue payload, idempotency, retry, visibility, dead-letter/archive, usage/observability, tenant isolation,
cleanup, and retention must satisfy the invariants in this ADR and the Phase 2 Specification.

Vercel Queues may be evaluated again in a future architecture review if it provides a material operational benefit
and its account capability, regional behavior, pricing, and migration cost can be verified. That evaluation is not a
blocker for Mesub AI V1 and must not silently replace the accepted adapter.

## Consequences

- Phase 2 implements exactly one provider-neutral dispatcher backed by Supabase Queues/`pgmq`.
- A guarded migration enables/configures the queue and private operations on Supabase Cloud Development before any
  Production consideration.
- Worker execution must be scheduled outside the originating request and remain safe under repeated delivery.
- Queue-job attempts, timings, outcomes, error categories, and correlation identifiers must be observable without
  storing raw sensitive input in the transport.
- A documented retention and cleanup policy covers completed messages, archived/dead-letter records, and associated
  operational metadata.
- No Product Rule or unrelated Architecture Decision changes.
- No Production environment is accessed or modified during Phase 2 verification.
