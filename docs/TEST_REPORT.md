# Verification report

Build session: November 10, 2026 (client timezone Asia/Calcutta). Test evidence is local and reproducible. No external account transaction or model inference is implied by mocks.

| Check                            | Evidence                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript and production bundle | `npm run build` passes. Merchant/AG Grid code loads separately; the grid chunk is about 300 KB gzip and triggers Vite's advisory size warning.                                                                  |
| Unit/integration/security        | `npm test`: **39 passing tests**, 4 files. Real SQLite, deterministic arithmetic and local HTTP routes; explicitly mocked provider responses.                                                                   |
| Desktop/mobile browser           | `npm run test:e2e`: **5 passing tests** in Chromium. Desktop catalog, mission/cart/quote persistence, BYOK memory-only behavior, merchant login/create/import/campaign/ledger, mobile flow and overflow checks. |
| Dependency audit                 | `npm audit`: **0 vulnerabilities** after upgrading csv-parse.                                                                                                                                                   |
| Local server                     | Frontend HTTP 200; public catalog returns 17 seeded products.                                                                                                                                                   |
| Real provider AI                 | Not verified. No user API key supplied and no Ollama/model installed. The user selected BYOK rather than an automatic 2.5 GB model install.                                                                     |
| Real PayPal OAuth                | Not verified. Sandbox client ID, secret and merchant ID unavailable.                                                                                                                                            |
| Real create/approve/capture      | Not verified. Requires the merchant credentials and actual sandbox buyer approval. No fake completed purchase was substituted.                                                                                  |
| Real refund/webhook              | Not verified. Requires genuine captured transaction and, for delivery, a reachable HTTPS webhook endpoint.                                                                                                      |
| Docker                           | Configuration supplied; Docker runtime unavailable, not executed.                                                                                                                                               |
| Public server                    | Not deployed. Runnable local build supplied.                                                                                                                                                                    |
| YouTube / Devpost                | Not uploaded/submitted. No URLs or receipts fabricated.                                                                                                                                                         |

## Covered invariants

- Exact integer-cent line totals, savings and budget boundaries.
- Price floors and rounded gross margin enforcement; invalid policy rejection.
- Non-clearance products keep retail; exclusions, category coverage and set counts.
- Distinct reproducible strategies and informative infeasible-budget errors.
- Final-unit reservation contention; expired unstarted hold release; payment-started hold retention.
- Stale quote rejection and an honest missing-credentials error.
- One inventory settlement per capture, replay safety and late-capture review.
- Payee, amount, currency and quote-association mismatch rejection.
- Approval-only provider states cannot settle inventory.
- Stable order-create request IDs across network failure and duplicate-callback serialization.
- Completed refunds do not auto-restock; pending refunds do not reduce recorded revenue prematurely.
- Quote/session isolation, buyer role escalation rejection and staff/owner boundaries.
- No merchant costs in public catalog or quote lines.
- CSRF/origin validation; signed-webhook requirement.
- Transactional mapped imports, duplicate rollback and invalid stock/policy rejection.
- Model-selected tools execute actual local catalog/optimizer logic under mocked model transport.
- Unknown payment/policy tools are denied even when model text requests them.
- Provider fields and limits validate; custom private/credential-bearing endpoints reject.
- Provider keys never reach SQLite/audit tables or browser persistent storage.

## Screenshots and recording

Screenshots under `docs/screenshots/` are taken from functioning browser flows. Checkout evidence deliberately shows a credentials-required state. The merchant screenshot shows zero captured revenue because no payment has actually been confirmed. A later local demo recording shows the same honest boundaries; it is not evidence of external provider success.

Before claiming full hackathon acceptance, complete genuine model tool invocation, PayPal sandbox OAuth/create/approval/capture/refund/webhook checks, review the final video and submit actual public URLs. The code and local tests alone do not satisfy those remaining external verification items.
