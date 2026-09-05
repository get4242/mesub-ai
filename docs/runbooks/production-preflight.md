# Mesub AI Production preflight

This runbook prepares the existing Phase 0–4 system for release. It does not authorize deployment or any Production data change.

## Supabase Production

The existing Supabase project previously named `mesub-ai-dev` is the approved promoted Production candidate. Its immutable project ref is pinned in `supabase/project-role.json`. Do not create a replacement project merely because the old display name contains `dev`, and do not treat that historical label as an environment authority.

Migrations 1–27 are already applied. Migration 28 (`20260905090000_ai_tenant_operational_caps.sql`) adds atomic AI-run admission and must remain unapplied until its separate Cloud-change gate is approved. Do not rerun fixture-producing Development regressions against this project. Use `pnpm db:audit:production`, which validates its SQL as read-only and binds queries to the promoted project marker. Confirm migration parity, zero queues, RLS, private Storage, and residual-data counts before release.

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

Generate encryption and trigger secrets locally with a cryptographically secure generator and enter them directly in the provider console. The initial Production pilot model profiles are extraction and LINE conversation on `gpt-5.6-luna`, with vision, content, and fallback on `gpt-5.6-terra`. Runtime safety limits are a 30-second timeout, three attempts, 12,000 text characters, ten images, 5,000 generated characters, one active run per tenant, and ten admitted runs per tenant per UTC calendar day. The UTC day begins at `00:00:00Z`; idempotent reuse does not consume another admission. Keep the operational OpenAI budget target at USD 50/month with alerts at 50%, 75%, and 90%; this is pilot guidance, not a Free Plan entitlement. Never configure a fake email or fake LINE driver.

On Vercel Hobby, the worker endpoint remains protected and deployable but a useful sub-daily Cron cadence is unavailable. Do not add an unsupported schedule. Before release, approve either a Vercel plan that supports the required cadence or a separately reviewed external scheduler that sends only the bearer trigger secret over HTTPS. Do not expose the worker endpoint without authentication.

## LINE Production

Use the approved Mesub AI Provider for Developing, Review, and Published; a separate Production Provider is not required. Select the Production OA Messaging API channel and Published LINE MINI App configuration. `LINE_LOGIN_CHANNEL_ID` is the expected ID-token audience and must be the Published internal Channel ID for this environment, not an unrelated LINE Login channel. The Published internal Channel ID and Published LIFF ID must differ from their Developing counterparts even though the Provider ID may be the same. Enter the final Vercel HTTPS URL as the Published endpoint, the approved callback URL, and /api/line/webhook as the Messaging API webhook.

Enable webhook delivery and redelivery. Configure Rich Menu and deep links only with the final HTTPS origin and Published MINI App identifiers. Server checks continue to cover token audience, expiry and nonce where applicable; exact raw-body signatures; event idempotency; explicit recent-auth account linking; active links; notification consent; and safety caps.

## Release gates

Run unit tests, TypeScript, ESLint, production build, dependency audit, secret scan, the read-only Production audit, LINE Production isolation tests, and queue retry/dead-letter tests. Historical Supabase Development naming is allowed only for the promoted ref pinned by the marker. Verify no localhost, tunnel, Preview URL, Development LINE identifier, fake driver, or secret is present in the Production deployment.

Only the owner may approve migration application, LINE Published setting changes, and the final Production deployment.
