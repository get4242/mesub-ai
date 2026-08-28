# Phase 2 Security Checklist

- [x] OpenAI key is server-only and local secret files are Git-ignored.
- [x] Models resolve through task profiles; no model ID is accepted from the browser.
- [x] Queue payload is strict and ID-only.
- [x] Snapshots use a field allowlist and contain no signed URLs or credentials.
- [x] Structured output and source ownership are validated before persistence.
- [x] AI tables use tenant IDs, RLS, explicit grants, and anonymous denial.
- [x] Worker delivery is idempotent with bounded retry/dead-letter behavior.
- [x] Usage records distinguish measured and unknown counters.
- [x] Suggestion acceptance and confirmation use actor checks and optimistic versions.
- [x] No Phase 2 path publishes a Property.
