# Phase 0 Security Checklist

## Implemented controls

- Exact dependency versions and committed lockfile
- Explicit pnpm build-script allowlist
- No service role, OpenAI or LINE secret exposed through `NEXT_PUBLIC_*`
- Runtime environment validation rejects secret-looking public Supabase keys
- Supabase anonymous sign-in and manual identity linking disabled
- Email confirmation required
- Password minimum 10 characters with lower/upper letters and digits locally
- Refresh-token rotation enabled
- TOTP enrollment/verification capability enabled for Admin MFA readiness
- RLS enabled on all Phase 0 public tables
- Explicit Data API grants; no blanket table writes
- Tenant membership and ownership checked by database policy
- Privileged signup trigger function kept in non-exposed `private` schema with public execute revoked
- Security headers disable framing/object embedding and restrict browser capabilities
- Structured logs redact common secret and contact-data keys recursively
- Vercel Functions configured for Singapore

## Production gates

- Configure production SMTP and verify email deliverability
- Enforce MFA for `platform_role = admin` in the Admin authorization flow
- Verify Supabase Auth URL allowlist for production/preview domains
- Store secrets only in Vercel/Supabase encrypted environment settings
- Run Supabase database advisors after migrations reach a linked environment
- Review DPA/data residency and PDPA retention baseline
- Confirm backup/PITR plan and perform a restore drill
- Configure rate limiting/WAF for public and provider endpoints when introduced
- Never link or run Phase 0 verification against the Production Project; use the guarded, dedicated Development Project only

## Prohibited patterns

- Authorization from `raw_user_meta_data`
- Service role or provider secret in browser code
- Tenant IDs accepted as trusted ownership claims from client input
- `SECURITY DEFINER` functions in exposed schemas
- Disabling RLS to solve a permission error
- Long-running AI work inside a LINE webhook request
