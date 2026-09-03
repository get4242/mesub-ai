# Mesub AI

Mesub AI is a multi-tenant property platform for Web, LINE OA, and LINE MINI App.

The repository contains the approved Phase 0–4 baseline plus the current Production Readiness work. The governing documents are:

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final Blueprint

## Requirements

- Node.js 22.x
- pnpm 11.19.0
- Separate Supabase projects for Development and Production
- Separate LINE Development/Review and Published Production configuration

## Local Development

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local` and replace every placeholder.
3. Put dedicated Cloud Development credentials in ignored `.env.cloud-test`.
4. Run `pnpm db:guard:dev` before every linked database operation.
5. Apply migrations only to Development with `pnpm db:push:dev`.
6. Run the Phase 0–4 database checks and the complete unit test suite.
7. Start Next.js with `pnpm dev`.

Never copy Production credentials into Development files. Local environment files are ignored and must not be committed.

## Production

Production is fail-closed. It requires matching application and LINE environments, a dedicated matching Supabase project ref, complete LINE credentials, and distinct Development LINE identifiers for reuse detection. Email delivery remains deliberately disabled until a real provider receives separate approval; in-app dashboard notifications continue to work.

Do not deploy until every owner-controlled prerequisite in [Production preflight](docs/runbooks/production-preflight.md) is complete. Production migrations must be applied in filename order to the dedicated Production Supabase project only after explicit release approval.
