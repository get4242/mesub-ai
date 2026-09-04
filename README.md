# Mesub AI

Mesub AI is a multi-tenant property platform for Web, LINE OA, and LINE MINI App.

The repository contains the approved Phase 0–4 baseline plus the current Production Readiness work. The governing documents are:

- `PROJECT_CONSTITUTION_MESUB_AI.md` Version 1.2
- `MESUB_AI_V1_TECHNICAL_BLUEPRINT.md` Version 0.2 Final Blueprint

## Requirements

- Node.js 22.x
- pnpm 11.19.0
- The Supabase project pinned in `supabase/project-role.json` is the promoted Production backend
- Separate LINE Development/Review and Published Production configuration

## Local Development

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local` and replace every placeholder.
3. Use local/static tests for routine development.
4. Do not run Cloud Development mutation/regression scripts against the promoted project.
5. A future Cloud Development sandbox must use a different project ref; the common guard rejects the promoted ref.
6. Run the complete unit test suite.
7. Start Next.js with `pnpm dev`.

Never copy Production credentials into Development files. Local environment files are ignored and must not be committed.

## Production

Production is fail-closed. The previously named `mesub-ai-dev` Supabase project is now the approved promoted Production candidate. Runtime configuration must match the project ref pinned in `supabase/project-role.json`. LINE still requires distinct Development and Production identifiers; promotion of the Supabase project does not weaken LINE isolation. Email delivery remains deliberately disabled until a real provider receives separate approval; in-app dashboard notifications continue to work.

Use `pnpm db:audit:production` for the SELECT-only migration, residue, RLS, Storage, and queue audit. Do not deploy until every owner-controlled prerequisite in [Production preflight](docs/runbooks/production-preflight.md) is complete.
