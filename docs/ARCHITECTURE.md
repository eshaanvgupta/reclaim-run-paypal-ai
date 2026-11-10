# Architecture, permissions and security

## Runtime

React 19 + Vite + TypeScript form the client. A modular Express 5 server serves client assets, session/auth APIs, catalog operations, immutable commerce state and ephemeral AI adapters. Node 24's SQLite API uses a versioned SQL migration, WAL, foreign keys, database constraints, a busy timeout and explicit transactions. An ORM was intentionally omitted for a small reproducible local application.

`server/agent.ts` contains separate provider adapters and a limited tool allowlist. Model output can execute validated read/proposal tools only. SCOUT is intent extraction, FORGE is deterministic bundle proposal, WARDEN is server constraint enforcement and MERLIN is merchant analysis. These are capabilities of one actual tool loop, not four fictional independent agents. Model responses are not displayed as payment confirmation. Only summarized tool names/results are persisted; hidden reasoning and raw provider requests are not logged.

The runtime executes at most 24 tool calls, 12 per model response, 2–8 model requests and 256–4,096 output tokens per request, with a 180-second overall deadline. Invalid tools/arguments become tool errors. The configured key never enters a database write. UI SSE messages include status, tool summaries, completion or error—not a provider secret.

OpenAI-compatible providers use chat completions, Anthropic uses Messages tool blocks, Gemini uses function declarations/responses and Ollama uses its local chat tool API. Not every provider/model combination supports tools. Inference remains unverified until an actual user provider or local model is connected. There is no canned fallback: deterministic shopping is a separate labeled option.

## Accounts

| Role  | Scope                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- |
| Guest | Public catalog, owned missions/quotes/orders, own approved checkout and return requests           |
| Buyer | Same, plus history linked across their signed-in sessions                                         |
| Staff | Catalog changes, merchant analytics and order reconciliation                                      |
| Owner | Staff privileges plus campaign approval, refunds, return inspection/restocking and staff creation |

One local workspace and one merchant of record are implemented. This is not multi-tenant SaaS. Registration always creates a buyer; submitted role fields are ignored. Owner bootstrap is a local script and preserves existing users.

Passwords use salted scrypt and timing-safe verification. Session tokens are cryptographically random, stored hashed in SQLite, rotate on login and expire after seven days. HttpOnly, SameSite=Lax cookies support the PayPal top-level return. Production HTTPS requires SECURE_COOKIES=true and a matching APP_URL. Signed-in account history uses persisted session-to-user relationships; guest ownership does not depend on knowledge of a quote UUID alone.

## Controls

- Zod bounds all financial inputs, model arguments, key/model fields and imports.
- Cookie mutations require a per-session CSRF token and validate Origin when present.
- Public product/quote APIs omit merchant costs and margin policy. Merchant data requires a merchant role.
- SQL parameters prevent injection. React escapes imported/user text. No user HTML is rendered.
- Global, authentication and AI rate limits reduce local abuse. Do not assume they provide distributed DDoS protection.
- CSP, frame restrictions, MIME protections and HTTPS-ready cookie settings are configured with Helmet.
- Provider request deadlines and finite model/tool limits constrain resource usage.
- Custom AI URLs require public HTTPS, no credentials/query/alternate ports, no redirects, public DNS ranges and a pinned resolution. IPv4 and IPv6 are checked with ipaddr.js.
- PayPal client secrets remain in local environment variables. No card data is handled.
- Payment state and inventory mutations are transactional and audited. Repeated capture, webhook and restock events cannot repeat settlement.
- AI sees catalog/user text as untrusted data and has no capture, refund, secret-access or policy-write tool. Server enforcement—not prompt wording—is the permission boundary.

## Key privacy scope

The app never writes user AI keys to persistent stores or logs. Keys travel browser → app server → selected provider, so the server necessarily handles them transiently. Do not deploy request-body logging, analytics that record forms, session replay, or a proxy that records authorization headers/body payloads. Use HTTPS for non-local traffic. No implementation can promise secure erasure from browser/process memory or control provider retention. Treat model requests as information shared with the selected provider.

## Explicit production gaps

Before live commerce: independent security review, production PayPal onboarding/approval, HTTPS and operational secrets management, payment/provider live verification, access recovery/password reset, verified email and MFA, hosted database/backups, distributed locks/job processing, robust abandonment reconciliation, external-refund accounting, tax/shipping/fulfillment, monitoring and data retention policies. Staff password distribution is manual. There is no email service, multi-tenant provisioning, platform escrow, payment splitting, PostgreSQL adapter or production deployment claim.
