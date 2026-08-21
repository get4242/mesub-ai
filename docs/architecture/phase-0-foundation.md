# Phase 0 Foundation

Status: Implemented baseline; Phase 1 not authorized

## Scope

- Next.js App Router and strict TypeScript application scaffold
- Vercel Singapore (`sin1`) compute configuration
- Supabase SSR client boundaries and session-refresh proxy
- Dedicated Supabase Cloud Development Project, versioned migration, pgTAP and API integration tests
- Personal Tenant bootstrap on verified Auth user creation path
- Task-based OpenAI model configuration contract without model IDs in business logic
- Structured logging with recursive secret/PII redaction
- CI, dependency pinning, build-script allowlist and security audit commands

## Identity and tenancy baseline

An Auth user insert creates exactly one `profiles` row, one Personal Tenant and one active owner membership in the same database transaction. Public application roles cannot call the privileged bootstrap function directly.

Authorization is enforced by explicit grants and RLS:

- An authenticated user reads and edits only approved columns of their profile.
- A member reads only their memberships and tenants.
- Only an active owner can edit the allowed Tenant columns.
- Membership ownership cannot be reassigned by an application user.
- Admin authorization must never rely on user-editable metadata.

Agent Profile, Property, Media, Lead, notification delivery and business UI belong to later phases and are intentionally absent.

## Development verification prerequisites

- Node.js 22 or newer
- pnpm 11.19.0
- A dedicated Supabase Cloud Development Project that contains no production data
- Supabase personal access token and Development Project database password for CLI migration/test access
- Development Project URL, publishable (or legacy anon) key and secret (or legacy service-role) key for API integration tests

Copy `.env.example` to `.env.local` for application development. For CLI verification, load the same values into the current shell; pnpm scripts do not automatically read `.env.local`. Never commit secrets. The guard requires `SUPABASE_TARGET_ENV=development`, validates the project URL against the allowlisted `SUPABASE_DEV_PROJECT_REF`, and, when `SUPABASE_PRODUCTION_PROJECT_REF` is supplied, refuses identical Development and Production refs.

## Verification

Application checks:

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm security:audit
```

Database checks (Cloud Development Project only; Docker is not required):

```text
pnpm db:guard:dev
pnpm db:link:dev
pnpm db:push:dev
pnpm db:test:dev
pnpm db:test:integration:dev
```

`db:push:dev` applies committed migrations to the linked Development Project. `db:test:dev` sends the transactional pgTAP suite through `supabase db query --linked --file`, avoiding the Docker-backed `pg_prove` runner; its Cloud wrapper raises a SQL exception if `finish()` reports any failure. The integration test creates two uniquely named, already-confirmed test users through the Admin Auth API to avoid Free Project SMTP limits, verifies the Auth user trigger output, signs in through the public Auth API, checks real Data API RLS behavior, and deletes those test users and tenants. Stop after recording Phase 0 results; Phase 1 remains unauthorized.
