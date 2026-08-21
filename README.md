# Mesub AI

Mesub AI is a multi-agent, multi-tenant property platform for Web and LINE OA.

The repository implements the approved **Phase 1 Agent and Property Core**. The governing documents are:

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final Blueprint

Phase 2 remains out of scope until explicit approval.

## Requirements

- Node.js 22+
- pnpm 11.19.0
- A dedicated Supabase Cloud Development Project (never Production); Docker is not required

## Setup

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local` and replace every placeholder.
3. Put dedicated Cloud Development credentials in ignored `.env.cloud-test`.
4. Run `pnpm db:guard:dev` before every linked database operation.
5. Apply migrations only to Development with `pnpm db:push:dev`.
6. Run `pnpm db:test:phase1:dev` and `pnpm db:test:integration:phase1:dev`.
7. Start Next.js with `pnpm dev`.

See `docs/architecture/phase-1-agent-property-core.md` and `docs/security/phase-1-checklist.md`.
