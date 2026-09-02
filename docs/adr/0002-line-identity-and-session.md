# ADR 0002 — LINE identity and internal session boundary

Status: Accepted for Phase 4 Development.

Mesub AI keeps Supabase Auth user ID and active tenant membership as authority. The browser submits a LINE ID token, never a LINE user ID or tenant. The server verifies the token against the exact Development/Review LINE Login channel, hashes the verified subject for lookup, and exchanges an existing one-to-one active link for an internal Supabase session. Unknown identities are not auto-linked. Linking requires an authenticated Mesub user, recent authentication, explicit consent, and a one-time challenge. Unlinking revokes the mapping and local LINE-derived session.

The notification destination is AES-256-GCM encrypted at rest with a server-only key; the hash remains the uniqueness/lookup field. Neither value is exposed to anonymous or Agent clients.
