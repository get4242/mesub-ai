# Phase 2 AI-Assisted Intake

Phase 2 stores immutable tenant-scoped snapshots in PostgreSQL, dispatches ID-only messages through Supabase Queues (`pgmq`), and treats `ai_runs` as the source of truth. The worker claims runs idempotently, resolves models through task profiles, calls the OpenAI Responses API through one server-only gateway, validates structured output and evidence, and persists append-only usage.

OpenAI JavaScript SDK `7.8.0` is pinned. The gateway uses Responses structured output with a strict JSON schema. Model IDs come only from `OPENAI_MODEL_EXTRACTION`, `OPENAI_MODEL_VISION`, `OPENAI_MODEL_CONTENT`, or `OPENAI_MODEL_FALLBACK`; business logic contains no provider model literals.

Retries are transient-only and bounded by `AI_MAX_ATTEMPTS`. Permanent/schema failures stop immediately; exhausted transient attempts become `dead_letter`. Queue messages contain only run, tenant, trace, and schema identifiers. AI output never writes canonical Property fields without explicit Agent acceptance.

All Cloud commands are guarded for the dedicated Development project. Production, publishing, commercial entitlement, Leads, LINE, and Admin features remain outside Phase 2.
