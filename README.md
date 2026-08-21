# Mesub AI

Mesub AI is a multi-agent, multi-tenant property platform for Web and LINE OA.

The repository is currently authorized through **Phase 0 only**. The governing documents are:

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final Blueprint

Phase 1 product development must not begin without explicit approval.

## Requirements

- Node.js 22+
- pnpm 11.19.0
- A dedicated Supabase Cloud Development Project (never Production); Docker is not required

## Setup

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local` and replace every placeholder.
3. Start Supabase with `pnpm db:start`.
4. Reset/apply migrations with `pnpm db:reset`.
5. Start Next.js with `pnpm dev`.

See `docs/architecture/phase-0-foundation.md` for boundaries and verification commands.
