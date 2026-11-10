# RECLAIM//RUN — The Agentic Inventory Rescue Arcade

**Tagline:** Save the stock. Forge a deal. Pay for real.

**Elevator pitch:** A commerce arcade that turns overlooked inventory into goal-based bundles, constrains every offer to real stock and merchant economics, and uses PayPal sandbox confirmation as the authority for completed purchases.

**Repository:** https://github.com/eshaanvgupta/reclaim-run-paypal-ai

**Demo access:** Local Node 24 build; follow README. Public app hosting is not claimed. Generate your own local merchant credentials with `npm run setup`.

**Video:** A local two-minute demo is prepared in the working directory after publication. Insert a genuine publicly accessible YouTube URL after uploading it. No YouTube URL or Devpost submission receipt is currently available.

## Inspiration

An item does not become less useful because it has been sitting on a shelf. Yet clearance shopping often starts with endless unrelated products and a blanket discount. We wanted to start with the buyer's desired outcome and preserve the merchant's actual pricing boundaries. The result is an inventory rescue arcade where a good deal is the solution to a useful mission.

## What it does

Buyers set a goal, a maximum budget, the categories they need and the number of sets. The Offer Forge explores the actual SQLite catalog and compares a budget-focused bundle, a configured-value bundle and an aging-stock recovery bundle. Buyers inspect every item, customize quantities and obtain a server-created quote that reserves real workspace stock.

Merchants can import inventory, edit products, set cost and price boundaries, approve category campaigns and inspect stock aging, aggregated mission demand, audit events and the payment ledger. These views compute from the application's records. The initial products, quality scores and inventory ages are labeled synthetic demonstration data; no actual customer traction or environmental impact is claimed.

AI is optional and uses a user-selected provider or local Ollama. The provider popup accepts the user's own API key, exact model ID and per-run limits. Keys stay in memory and are not saved. A constrained tool loop can read the catalog, inspect items, extract structured intent, invoke deterministic proposals and explain trade-offs. It has no payment-capture or pricing-write tool. Deterministic shopping remains available separately without an active model.

The PayPal sandbox adapter creates CAPTURE-intent orders server-side and redirects to PayPal-hosted buyer approval. The app requires authoritative order and capture details, checks amount, currency, payee and quote association, then settles inventory once. Browser return alone never means payment success. The ledger also supports authenticated reconciliation, owner-authorized full refunds and inspected return restocking.

## How we built it

React, TypeScript, Vite and custom CSS power a responsive interface with original isometric warehouse artwork, original category illustrations, Bungee display typography and self-hosted fonts. The merchant inventory view uses genuinely loaded AG Grid Community.

An Express modular monolith handles sessions, scrypt password hashing, CSRF checks, role permissions, CSV validation, server pricing and payment boundaries. Node 24's SQLite API provides transactional persistence with versioned SQL migrations, inventory constraints and durable audit records.

The optimizer calculates integer-cent prices using the maximum of permitted discount, contractual floor and required gross-margin floor. It performs bounded category-combination search and reports its limits instead of pretending to prove global optimality. Separate provider adapters support OpenAI-compatible tools, Anthropic Messages, Gemini functions and Ollama's local tool protocol.

## Challenges

The difficult boundary is between a plausible recommendation and a valid commercial action. A language model can describe a product or suggest a price, but the server must own stock, budgets, permission checks and financial state.

Payment timeouts and reservation expiry are also different problems. Once a provider order may exist, releasing inventory without knowing whether money was captured risks overselling. We keep ambiguous payment-started holds for reconciliation and retain actual capture IDs when exceptional cases require review. Duplicate callbacks and repeated requests must not produce repeated inventory deductions.

## Accomplishments

The local app includes working inventory persistence, validated transactional CSV import, constrained bundle generation, customization, immutable reservation quotes, a complete merchant console, owner/staff permissions and a real sandbox API integration behind honest setup boundaries. Automated tests exercise arithmetic, stock contention, ownership, role enforcement, capture replays, mismatched provider data, refund behavior, key non-persistence and desktop/mobile commerce flows.

**Verification disclosure:** Payment and model responses in automated tests are explicitly mocked. Live PayPal OAuth/order creation/approval/capture/refund/webhook delivery have not been verified because merchant credentials and buyer approval were unavailable. Live AI inference/tool calling has not been verified because a user provider key or installed local model was unavailable. The UI does not substitute a fake success for either condition. The exact test report is included in the repository. Do not remove this disclosure until genuine evidence exists.

## What we learned

AI-generated offers need deterministic commercial enforcement. User autonomy is stronger when each user controls their own provider connection and limits, without requiring the app operator to fund a shared service. Clear disconnected states are part of a credible product. PayPal's confirmed financial result—not an animation or callback URL—must be the event that changes the ledger and settles inventory.

## Future direction

Independent merchants could use this approach as software for inventory recovery and buyer discovery. Future work includes approved production PayPal onboarding, real tax/shipping and fulfillment, robust operational reconciliation, catalog connectors, hosted account recovery and multi-tenant infrastructure. These are future capabilities, not implemented integrations or validated business outcomes. Goal-based shopping, bundling and clearance are established concepts; our contribution is their combination with explicit constrained tools and an interactive rescue-run experience.

## Sponsor disclosure

AG Grid Community powers the real inventory table; AG Studio and Studio Agent Framework are not used. Official PayPal documentation informed the sandbox integration; the APIMatic context plugin was not connected or used. No AG Studio/APIMatic-specific prize eligibility is asserted. The app does not use an unauthorized platform escrow or multi-merchant payment split.

## Built with

TypeScript, React, Vite, Node.js, Express, SQLite, PayPal Orders v2 and Payments v2, Zod, AG Grid Community, Ollama-compatible tool runtime, custom BYOK adapters, Vitest and Playwright. Original code is Apache-2.0; fonts retain SIL OFL notices.
