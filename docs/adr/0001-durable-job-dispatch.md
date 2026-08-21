# ADR 0001: Durable Job Dispatch

Date: 20 Aug 2026
Status: Accepted, conditional validation pending

## Context

LINE webhook ingestion must acknowledge quickly, OpenAI tasks may be long-running, and delivery may occur more than once. Blueprint Version 0.2 selects Vercel Queues as the preferred option when the project account, plan and cost support it. PostgreSQL remains the source of truth.

## Decision

- Use a small `JobDispatcher` boundary between business use cases and the queue provider.
- Prefer Vercel Queues in Production.
- Put only stable record IDs, job type, idempotency key and correlation ID in queue messages.
- Persist business state, attempts and terminal outcome in PostgreSQL.
- Require idempotent consumers because delivery is at least once.
- Do not run long OpenAI processing inside the LINE webhook request lifecycle.

## Validation gate

Before Phase 2/4 queue implementation, confirm Vercel account access, plan availability and estimated operations cost. This cannot be validated from the local repository alone.

If the validation fails, use a PostgreSQL-backed queue. Record the provider change in a follow-up ADR; the dispatcher/consumer contract and business state model remain unchanged.

## Consequences

- Business domains do not import a provider-specific queue SDK.
- Consumers need idempotency and dead-letter tests.
- Queue loss cannot remove authoritative business state.
- Phase 0 adds no queue SDK and no asynchronous feature implementation.
