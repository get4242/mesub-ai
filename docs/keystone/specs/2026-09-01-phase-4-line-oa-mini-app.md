# Phase 4 Specification — LINE OA + LINE MINI App Integration

**Status:** Proposed for approval
**Date:** 2026-09-01
**Scope:** Architecture/product planning only. No implementation, migration, LINE channel, Cloud, or Production change.

## Goal and success

Add LINE Official Account (LINE OA) as an authenticated entry, navigation, lead-intake, and Agent-notification channel around the existing Mesub web application and backend. Primary users are Thai property Agents with an existing Mesub account; customers may enter through the OA or public links.

Success means existing Dashboard, Properties, Add Property, AI Intake, Leads, and Profile routes work inside a MINI App; LINE identity links explicitly to one existing internal Agent; LINE never bypasses Supabase Auth/RLS/tenant membership; and duplicate webhooks cannot duplicate effects.

## Target architecture and ownership

```text
LINE OA → Rich Menu / Message → LINE MINI App → Mesub AI Web App → Existing Backend
Browser / Search / Shared Link → Mesub AI Public Web → Existing Backend
```

One codebase and canonical backend remain authoritative. LINE supplies verified external identity and transport context only.

| Capability | LINE surface | Mesub authority |
| --- | --- | --- |
| Chat entry/Rich Menu | OA Messaging API | Links/actions only |
| In-LINE UI | MINI App / LIFF | Existing Next.js routes/components |
| Authentication | LIFF/LINE Login token acquisition | Server verification + existing session |
| Link/unlink | MINI App UI | New server-owned identity-link domain |
| Property/AI/publish/quota | Existing UI inside MINI App | Existing Phase 0–3 actions/RPCs/RLS |
| Property lead | OA context or public form | Existing canonical lead routing |
| General lead | OA webhook | New Platform Intake Queue |
| Agent notification | Messaging API | Existing notification event/queue source |
| Public discovery | Browser/shared link | Existing projection/Limited Disclosure |

## Official LINE findings

- MINI Apps are LIFF web apps; an operating web app can be reused, but needs a Business ID, MINI App channel, HTTPS endpoint, and review for verified publication: [Web app to MINI App](https://developers.line.biz/en/docs/line-mini-app/develop/web-to-mini-app/).
- MINI App channels have Developing, Review, and Published internal channels. In Thailand, verified review requires a certified provider: [Getting started](https://developers.line.biz/en/docs/line-mini-app/develop/develop-overview/).
- LINE user IDs are provider-scoped. Channels correlating the same user must be under the same provider, and channels cannot later move provider.
- Client sends a raw token, never user ID/profile as authority. Server verifies authenticity, expected channel/client ID, expiry, and nonce: [Secure login](https://developers.line.biz/en/docs/line-login/secure-login-process/), [ID token](https://developers.line.biz/en/docs/line-login/verify-id-token/), [Checklist](https://developers.line.biz/en/docs/line-login/security-checklist/).
- Permanent links preserve route paths/query/hash and are preferred for Rich Menus/sharing: [Permanent links](https://developers.line.biz/en/docs/line-mini-app/develop/permanent-links/).
- Webhooks require exact raw-body `x-line-signature` HMAC-SHA256 verification. Redelivery may duplicate/reorder; `webhookEventId` is the dedupe key: [Signature](https://developers.line.biz/en/tips/2026/06/18/verify-webhook-signature/), [Redelivery](https://developers.line.biz/en/docs/messaging-api/receiving-messages/).
- Rich Menus open URLs or postbacks and do not appear on LINE for PC: [Rich Menus](https://developers.line.biz/en/docs/messaging-api/rich-menus-overview/).
- MINI Apps may open in an external browser, with different context/fallback: [Specifications](https://developers.line.biz/en/docs/line-mini-app/discover/specifications/).
- Push messages consume OA plan quota and can cost money; replies are not counted. Thailand pricing must be checked in OA Manager: [Pricing](https://developers.line.biz/en/docs/messaging-api/pricing/).
- Service messages are only confirmations/responses to user actions and have template/count constraints; they are not general notifications: [Service operation](https://developers.line.biz/en/docs/line-mini-app/service/service-operation/).

## Product flows

### Agent entry and session

1. Agent taps a Rich Menu permanent link and an existing responsive route opens.
2. LIFF initializes. If a Mesub session exists, existing authorization continues.
3. Otherwise client sends only the raw LINE token to a server exchange endpoint.
4. Server verifies token and expected environment channel.
5. A current explicit link maps to an internal user; the approved session bridge establishes the existing Mesub/Supabase session and returns to an allowlisted relative path.
6. Without a link, show “Sign in to Mesub to link LINE.” LINE identity alone never creates/selects a tenant.

### Link/unlink

Linking requires an authenticated Mesub Agent, recent reauthentication, fresh verified LINE token, one-time session-bound challenge, and explicit consent. A transaction enforces one active provider/environment subject per internal user and one internal user per subject. Record consent/version and audit timestamps. Never auto-link by email, phone, display name, avatar, OA friendship, or client user ID.

Unlink requires recent reauthentication, revokes LINE-derived sessions, and preserves the Mesub account/data. Existing email/password login remains recovery. LINE-only login would be a separate Product Rule.

### Navigation and leads

Rich Menu permanent links target `/dashboard`, `/dashboard/properties`, `/dashboard/properties/new`, `/dashboard/leads`, `/dashboard/profile`, and `/properties`. AI Intake remains property-specific and server-authorized.

A property-specific lead carries only opaque public property context. Server resolves the Published projection and invokes the existing consent/idempotent lead contract; tenant derives from canonical ownership. Context-free OA enquiries enter a Platform Intake Queue and are never auto-assigned to a tenant/Agent.

### Agent notifications

Existing canonical notification events remain source of truth. A LINE adapter receives internal notification ID only, resolves current link/consent server-side, sends allowlisted minimal content, meters attempts, and records delivered/retryable/dead-letter outcomes. Messaging API push is expected; service messages are only for separately eligible action confirmations.

## Security and durable processing

- External identity key is `(provider, channel environment, LINE subject)`, never a bare user ID across providers/environments.
- LINE tokens are short-lived credentials: verify server-side; never persist in browser storage, database, logs, analytics, or queues.
- Verify issuer/signature, expected audience/client ID, expiry, nonce, and intended environment. Use authorization-code + PKCE for external-browser LINE Login where appropriate.
- Issue an application session after verification; never reuse a LINE token as a long-lived Mesub session.
- Bind link/exchange challenges to session, nonce, allowlisted return path, expiry, and one-time consumption. Reject open redirects.
- Supabase Auth user ID and active tenant membership remain authorization authority. Rate-limit exchanges, linking, invalid signatures, and general intake.

Webhook flow:

1. Read a bounded exact raw HTTPS body.
2. Verify signature before parsing or durable acceptance.
3. Validate event/environment; insert receipt keyed by `webhookEventId`.
4. Duplicate returns 2xx without repeating effects.
5. Store minimum normalized fields and retention metadata; no raw body by default.
6. Enqueue an ID-only job using existing retry/backoff/dead-letter conventions.
7. Worker routes domains and calls LINE; event timestamp, not delivery order, governs context.
8. Meter counted outbound attempts/results separately from AI usage.

## Privacy, sessions, and responsive behavior

- Separate consent for LINE linking, Agent notifications, and lead processing. Privacy notice names LINE/LY Corporation, data categories, purposes, retention, unlink/revocation, and cross-system behavior.
- Public MINI App pages use the same projection and opaque media proxy. Never expose tenant ID, exact GPS, private contacts, notes, AI payloads, storage paths, LINE secrets/tokens, or raw webhooks.
- Existing routes remain canonical. A thin LINE context adapter adds initialization, auth exchange, safe-area variables, and close/share helpers without forking screens.
- Without LIFF, public routes work normally and protected routes use existing login. External browser never assumes LIFF APIs. LINE PC falls back to shared/permanent links.
- Preserve destination only as allowlisted relative paths. Respect safe-area insets, LINE header viewport, keyboard, 44 px targets, and 390 px layout.

## Environment strategy

| Environment | LINE assets | Mesub target |
| --- | --- | --- |
| Development | Developing MINI App + dedicated Development OA/Messaging channel | Cloud Development only |
| Review/Staging | Review MINI App + non-Production OA where feasible | Separate Staging project required |
| Production | Published MINI App + Production OA | Production only after separate approval |

Each has distinct IDs, secrets/tokens, webhook/endpoint/callback URLs, link namespace, and allowlists. Credentials are server-only environment variables.

## Proposed persistence — migration approval required

- `line_identity_links`: provider/environment subject reference, internal user, status, consent, revocation.
- `line_link_challenges`: hashed one-time challenge/nonce, session binding, expiry/consumption.
- `line_webhook_receipts`: event ID, normalized type/state, retention deadline; no raw body by default.
- LINE delivery jobs through the existing durable queue pattern: internal notification reference and outcome only.
- `platform_intake_leads`: platform-owned general intake, never tenant-assigned from client input.
- Append-only integration audit and usage events.

All require explicit RLS/grants, platform authorization, retention jobs, and pgTAP. No migration is created in this planning round.

## Scope and non-goals

In scope after approval: LIFF adapter over existing UI; explicit link/unlink and server verification; Rich Menu/deep links; signed/idempotent webhook worker; canonical property leads; Platform Intake Queue; consent-aware LINE notifications; Development verification.

Out: a second Agent app, LINE-only Product Rules, CRM/appointments, automated general-lead assignment, chatbot recommendations, payments, Production setup, external search/CAPTCHA/email changes, or replacing Supabase Auth.

## Approval gates

1. Business ID/provider owner, Thailand certified-provider eligibility, and verified vs unverified pilot.
2. OA Messaging and MINI App channels under the same provider; Development/Review/Production topology.
3. Existing Mesub login remains primary; one-to-one explicit link/unlink and recent-reauth method.
4. Secure Supabase session bridge after verified LINE identity; likely ADR.
5. Notification opt-in/revocation, message classes, quiet-hours decision, quota/cost cap.
6. Webhook normalized fields, no-raw-body default, retention/audit duration, deletion schedule.
7. General-lead consent, operator access, retention, and manual routing Product Rule.
8. HTTPS Development/Review domains, callback/permanent-link URLs, CSP, redirect allowlist.
9. Thailand OA plan, monthly cap, monitoring threshold, quota-exhausted behavior.
10. Owners/rotation/incident process for LINE secrets and access tokens.
11. Integration schema/RLS/platform-scope authorization and queue reuse ADR.

## Risks and acceptance criteria

Mitigations: token verification + nonce/recent reauth for takeover; provider-scoped identity for mismatch; raw-body HMAC + event uniqueness for replay; canonical property owner for routing; server-only redacted secrets; browser fallback and bounded retry for outages; shared UI routes; minimum retained data; environment guards.

Acceptance requires:

- Every LINE-derived internal session comes from a server-verified token, expected channel/audience, and current explicit link.
- No LINE user ID, tenant, destination Agent, email, or display name is authority.
- Link/unlink is atomic, auditable, consented, replay-safe, and fails closed on conflicts.
- Browser login and Phase 0–3 journeys remain unchanged; existing UI renders inside MINI App.
- Invalid webhook signature is rejected; duplicates create one effect; retry/dead-letter is deterministic.
- Property leads use canonical ownership; general leads enter platform intake only.
- LINE delivery requires active link/consent and quota/safety caps.
- Limited Disclosure, opaque public media, RLS, Tenant A/B, and cleanup remain proven.
- No implementation or Production access occurs before approval.

## Recommended next step

Resolve the eleven gates and approve required ADR/Product Rules, then execute the TDD implementation plan in Cloud Development only.
