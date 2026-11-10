import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { PayPal } from '../server/paypal.js';
import { runAgent, ProviderInput } from '../server/agent.js';
import { MissionInput } from '../server/types.js';
if (process.argv.includes('--paypal')) {
  const paypal = new PayPal();
  if (!paypal.configured()) {
    console.log(
      'BLOCKED: set sandbox PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_MERCHANT_ID in .env. No provider calls made.',
    );
    process.exit(2);
  }
  await paypal.accessToken();
  console.log(
    'VERIFIED: sandbox OAuth token acquisition. Token redacted. No order creation, buyer approval, capture, webhook, or refund has been tested by this command.',
  );
} else {
  const provider = process.env.VERIFY_AI_PROVIDER || 'ollama',
    apiKey = process.env.VERIFY_AI_KEY || '',
    model = process.env.VERIFY_AI_MODEL || process.env.OLLAMA_MODEL || 'qwen3:4b';
  const db = new Store();
  seed(db);
  const id = randomUUID(),
    mission = MissionInput.parse({
      goal: 'Build a creator desk with lighting, audio and organization. Call actual catalog and bundle tools.',
      budget: 16000,
      required: ['Lighting', 'Audio', 'Organization'],
    });
  db.run(
    'INSERT INTO missions(id,session_id,goal,budget,required,quantity) VALUES(?,?,?,?,?,?)',
    id,
    'verification',
    mission.goal,
    mission.budget,
    JSON.stringify(mission.required),
    1,
  );
  try {
    const result = await runAgent(
      db,
      id,
      mission,
      ProviderInput.parse({
        provider,
        model,
        apiKey,
        endpoint: process.env.VERIFY_AI_ENDPOINT,
        maxSteps: 6,
        maxTokens: 1500,
      }),
      (e) => {
        if (e.type === 'tool') console.log('TOOL:', e.name, e.summary);
      },
      AbortSignal.timeout(180000),
    );
    console.log(
      JSON.stringify(
        {
          verified: true,
          missionId: id,
          provider,
          model,
          toolCalls: result.toolCalls,
          bundleTotals: result.offers.map((o) => o.total),
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
  }
}
