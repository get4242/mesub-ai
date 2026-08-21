# Phase 1 Security Checklist

- [x] Dedicated Supabase Cloud Development target guard; Production ref rejected.
- [x] Signup atomically creates Profile, Personal Tenant, owner Membership and Agent Profile.
- [x] Browser input cannot assign Tenant, Owner, role, verification or Published status.
- [x] Agent Profile, Property and Media canonical tables deny anonymous access.
- [x] Explicit authenticated grants are narrower than table-wide privileges.
- [x] RLS verifies active membership and tenant ownership on reads/writes.
- [x] Cross-tenant Property and Media access is exercised with two real test users.
- [x] Property ownership is immutable; physical application DELETE is unavailable.
- [x] Critical edits increment `critical_version`; all edits increment `version`.
- [x] Phase 1 rejects every Published transition.
- [x] Both Storage buckets are private with 10 MiB and JPEG/PNG/WebP limits.
- [x] Media paths contain server-derived Tenant/Property/Media identifiers and uploads are non-upsert.
- [x] Finalization re-downloads the object and verifies actual magic bytes, byte size, dimensions and checksum.
- [x] Media reorder runs atomically and rechecks active owner membership in PostgreSQL.
- [x] Public DTOs are explicit allowlists and omit exact coordinates and private identifiers.
- [x] Property mutations append audit rows in the database transaction.
- [x] `.env.cloud-test` and real credentials stay ignored/untracked.

Cloud integration tests create synthetic users, tenants, properties and objects and remove them in `finally`. A failed cleanup is a release blocker and must be resolved before Production use.
