# Phase 4 LINE Development runbook

- Allowed environments: Development and Review only. Production is hard-failed in configuration.
- Required server secret names: LINE_MESSAGING_CHANNEL_SECRET, LINE_MESSAGING_CHANNEL_ACCESS_TOKEN, LINE_IDENTITY_HASH_KEY, LINE_DESTINATION_ENCRYPTION_KEY. Never print or expose values.
- Public value: Development/Review LIFF ID only.
- Webhook: HTTPS POST /api/line/webhook; verify the exact raw body before JSON parsing; return quickly after durable receipt/queue acceptance.
- Identity: explicit Profile link/unlink; no matching by email, display name, or client-provided user ID.
- Retention: normalized webhook receipt 30 days; conversation 90 days after close; lead up to 2 years; security/admin audit 2 years.
- Incident response: revoke channel token, rotate server secrets, disable Development channel mapping, preserve append-only audit, and investigate dedupe/dead-letter metrics.
- Rich Menu ownership: one Development menu owner only; routes are Dashboard, Properties, Add Property, Leads, Profile via approved MINI App permanent links.
- No LINE Console/OA mutation is performed by repository verification. Real channel setup remains an external approval/credential gate.
