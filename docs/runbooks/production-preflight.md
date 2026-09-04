# Mesub AI Production preflight

This runbook prepares the existing Phase 0–4 system for release. It does not authorize deployment or any Production data change.

## Supabase Production

The existing Supabase project previously named `mesub-ai-dev` is the approved promoted Production candidate. Its immutable project ref is pinned in `supabase/project-role.json`. Do not create a replacement project merely because the old display name contains `dev`, and do not treat that historical label as an environment authority.

All 27 migrations are already applied. Do not rerun fixture-producing Development regressions against this project. Use `pnpm db:audit:production`, which validates its SQL as read-only and binds queries to the promoted project marker. Confirm migration parity, zero queues, RLS, private Storage, and residual-data counts before release.

Enter the promoted project's URL, publishable key, server secret key, and exact project ref directly into the Vercel Production environment. Never paste them into chat or tracked files. After a Vercel Production HTTPS URL exists, update Supabase Auth Site URL and exact redirect URLs in a separately approved cloud-configuration step.

## Vercel Production

Set these Production variables directly in Vercel:

- APP_ENV=production
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SECRET_KEY
- SUPABASE_EXPECTED_PROJECT_REF
- OPENAI_API_KEY
- WORKER_TRIGGER_SECRET
- OPENAI_MODEL_EXTRACTION
- OPENAI_MODEL_VISION
- OPENAI_MODEL_LINE_CONVERSATION
- OPENAI_MODEL_CONTENT
- OPENAI_MODEL_FALLBACK
- AI operational limits documented in .env.example
- LINE_ENVIRONMENT=production
- LINE_PROVIDER_ID
- LINE_LOGIN_CHANNEL_ID
- LINE_MINI_APP_LIFF_ID
- LINE_MESSAGING_CHANNEL_SECRET
- LINE_MESSAGING_CHANNEL_ACCESS_TOKEN
- LINE_IDENTITY_HASH_KEY
- LINE_DESTINATION_ENCRYPTION_KEY
- LINE_DEVELOPMENT_PROVIDER_ID
- LINE_DEVELOPMENT_LOGIN_CHANNEL_ID
- LINE_DEVELOPMENT_MINI_APP_LIFF_ID

Generate encryption and trigger secrets locally with a cryptographically secure generator and enter them directly in the provider console. Production model IDs and operational budget caps are release blockers until explicitly approved. Never configure a fake email or fake LINE driver.

## LINE Production

Under the approved Production Provider, select the Production OA Messaging API channel and Published LINE MINI App / LINE Login configuration. Enter the final Vercel HTTPS URL as the Published endpoint, the approved callback URL, and /api/line/webhook as the Messaging API webhook.

Enable webhook delivery and redelivery. Configure Rich Menu and deep links only with the final HTTPS origin and Published MINI App identifiers. Server checks continue to cover token audience, expiry and nonce where applicable; exact raw-body signatures; event idempotency; explicit recent-auth account linking; active links; notification consent; and safety caps.

## Release gates

Run unit tests, TypeScript, ESLint, production build, dependency audit, secret scan, the read-only Production audit, LINE Production isolation tests, and queue retry/dead-letter tests. Historical Supabase Development naming is allowed only for the promoted ref pinned by the marker. Verify no localhost, tunnel, Preview URL, Development LINE identifier, fake driver, or secret is present in the Production deployment.

Only the owner may approve migration application, LINE Published setting changes, and the final Production deployment.
