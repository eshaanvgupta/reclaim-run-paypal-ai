# Two-minute demonstration

The local video records the real app using synthetic catalog data. It demonstrates implemented local flows and explicitly shows the unconfigured payment/model boundary. It does not stage a completed PayPal capture or a real model tool call. Local Windows speech synthesis provides narration; no copyrighted music is used.

The requested recording is saved beside the project directory as **RECLAIM-RUN-demo.mp4** after the source is published. The reproducible recording script is `scripts/record-demo.ts`; it uses an isolated SQLite dataset and a real production-built server. No mocked provider response is used. A local file is not a YouTube publication.

## Current recording script / 2:00

| Time      | Actual view                                                        | Narration focus                                                                                                                                                |
| --------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:15 | Landing and interactive warehouse                                  | Good products can be overlooked; start from an outcome rather than another clearance scroll.                                                                   |
| 0:15–0:31 | Stock catalog, search, product details                             | Real workspace quantities, configured prices, labeled synthetic goods.                                                                                         |
| 0:31–0:54 | Mission brief, deterministic forge, three offers, comparison table | Budget and required needs are enforced by the server; strategies use actual catalog records.                                                                   |
| 0:54–1:12 | Bundle customization, server quote, checkout                       | Stock reservation, clear total and honest missing-credentials gate; no fake payment.                                                                           |
| 1:12–1:30 | Provider popup and privacy controls                                | Any supported provider via the user's own key, optional local Ollama, memory-only keys and bounded runs. No genuine inference is claimed without a connection. |
| 1:30–1:52 | Merchant command, inventory grid, recovery radar, ledger           | Catalog operations, approved floors, stock age and zero fabricated sales.                                                                                      |
| 1:52–2:00 | Landing close / repository                                         | Runnable open source and a clear integration-verification boundary.                                                                                            |

## Recording commands (Windows)

```powershell
npm run build
npx playwright install chromium
python -m pip install --target data/video-tools imageio-ffmpeg
npm run demo:record
```

The script uses Microsoft Zira Desktop if installed, otherwise the default Windows voice. It emits the actual Playwright screen recording, chapter narration and caption source under ignored `data/video-assets/`, and encodes the final MP4 at 1280×800 with H.264 video and AAC audio. Recording requires a local compatible FFmpeg binary supplied by imageio-ffmpeg; the binary is not redistributed in Git.

## Stronger final competition video after credentials are configured

Replace the setup-boundary chapters with an actual local/provider AI tool trace and a real buyer-approved sandbox capture. Record the receipt's genuine capture ID, then show exactly one stock decrement and the corresponding merchant sale. Keep the full video under three minutes. Do not edit footage to imply an unavailable operation happened.

Suggested YouTube title: **RECLAIM//RUN — Inventory Rescue with Constrained AI and PayPal Sandbox**.

Suggested description: **A runnable open-source inventory rescue arcade. Goal-based bundles, deterministic merchant constraints, ephemeral bring-your-own-key AI, and PayPal sandbox commerce. This recording labels which external integrations are configured and verified. Source and setup: https://github.com/eshaanvgupta/reclaim-run-paypal-ai. Synthetic demonstration inventory; no physical goods shipped.**

Thumbnail concept: original lime warehouse crate on near-black, orange “GOOD PRODUCTS. SECOND CHANCES.” lettering, with a small “SANDBOX DEMO” label. Avoid transaction IDs, account identities and secrets.

No public YouTube URL, uploaded video receipt or completed Devpost entry is claimed.
