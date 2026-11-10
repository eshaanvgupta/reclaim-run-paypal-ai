import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Server } from 'node:http';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { createApp } from '../server/app.js';
import { createUser } from '../server/auth.js';
let db: Store, server: Server, base: string;
beforeEach(async () => {
  db = new Store(':memory:');
  seed(db);
  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.on('listening', r));
  base = 'http://127.0.0.1:' + (server.address() as any).port;
});
afterEach(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  db.close();
  vi.restoreAllMocks();
});
async function client() {
  const r = await fetch(base + '/api/session'),
    session = (await r.json()) as any;
  let cookie = r.headers.get('set-cookie')!.split(';')[0],
    csrf = session.csrf;
  return {
    async request(path: string, body?: any, method = body === undefined ? 'GET' : 'POST') {
      const r = await fetch(base + '/api' + path, {
        method,
        headers: { cookie, 'x-csrf-token': csrf, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await r.json()) as any;
      if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie')!.split(';')[0];
      if (data.csrf) csrf = data.csrf;
      return { status: r.status, data };
    },
    cookie,
    csrf,
  };
}
async function owner() {
  createUser(db, 'owner@test.local', 'a-secure-password', 'owner');
  const c = await client();
  expect(
    (await c.request('/auth/login', { email: 'owner@test.local', password: 'a-secure-password' }))
      .status,
  ).toBe(200);
  return c;
}
describe('API authorization, persistence and import', () => {
  it('public catalog never leaks costs, margin rules or reserved quantities', async () => {
    const c = await client(),
      r = await c.request('/catalog');
    expect(r.status).toBe(200);
    expect(r.data.length).toBe(17);
    expect(r.data[0]).not.toHaveProperty('cost');
    expect(r.data[0]).not.toHaveProperty('marginBps');
    expect(r.data[0]).not.toHaveProperty('reserved');
  });
  it('guest cannot read merchant finance or mutate stock', async () => {
    const c = await client();
    expect((await c.request('/merchant')).status).toBe(403);
    expect((await c.request('/merchant/products', {})).status).toBe(403);
    expect((await c.request('/merchant/orders/invented/refund', { confirm: true })).status).toBe(
      403,
    );
  });
  it('rejects missing CSRF tokens and cross origin mutation', async () => {
    const c = await client();
    let r = await fetch(base + '/api/quotes', {
      method: 'POST',
      headers: { cookie: c.cookie, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(r.status).toBe(403);
    r = await fetch(base + '/api/quotes', {
      method: 'POST',
      headers: {
        cookie: c.cookie,
        'Content-Type': 'application/json',
        'x-csrf-token': c.csrf,
        Origin: 'https://evil.example',
      },
      body: '{}',
    });
    expect(r.status).toBe(403);
  });
  it('server quote ignores client prices and is private to its session', async () => {
    const a = await client(),
      b = await client(),
      p = db.catalog()[0];
    const r = await a.request('/quotes', {
      lines: [{ productId: p.id, quantity: 1, unitPrice: 1 }],
      budget: 100000,
      total: 1,
    });
    expect(r.status).toBe(200);
    expect(r.data.total).toBe(p.price);
    expect((await b.request('/quotes/' + r.data.id)).status).toBe(404);
    const mine = await a.request('/quotes/' + r.data.id);
    expect(mine.data.lines[0]).not.toHaveProperty('cost');
  });
  it('creates products and imports mapped CSV transactionally', async () => {
    const c = await owner();
    const csv =
      'Code,Name,category,cost,retail,floor,stock\nTEST-01,Test Product,Lighting,1000,3000,1800,7';
    expect(
      (await c.request('/merchant/import', { csv, mapping: { Code: 'sku', Name: 'name' } })).data
        .imported,
    ).toBe(1);
    expect(db.catalog().find((p) => p.sku === 'TEST-01')?.stock).toBe(7);
    const before = db.catalog().length;
    const bad =
      'sku,name,category,cost,retail,floor,stock\nTEST-02,Valid,Audio,1000,3000,1800,7\nTEST-01,Duplicate,Audio,1000,3000,1800,7';
    expect((await c.request('/merchant/import', { csv: bad })).status).toBe(409);
    expect(db.catalog().length).toBe(before);
  });
  it('rejects negative stock and impossible policies on imports', async () => {
    const c = await owner();
    expect(
      (
        await c.request('/merchant/import', {
          csv: 'sku,name,category,cost,retail,floor,stock\nBAD-01,Bad Product,Lighting,1000,100,2000,-1',
        })
      ).status,
    ).toBe(400);
  });
  it('refuses to edit on-hand below held reservations', async () => {
    const c = await owner(),
      p = db.catalog()[0];
    await c.request('/quotes', { lines: [{ productId: p.id, quantity: 1 }], budget: 100000 });
    expect((await c.request('/merchant/products/' + p.id, { ...p, stock: 0 }, 'PUT')).status).toBe(
      409,
    );
  });
  it('keeps owner-only operations unavailable to staff', async () => {
    const c = await owner();
    expect(
      (
        await c.request('/merchant/staff', {
          email: 'staff@test.local',
          password: 'staff-password-123',
        })
      ).status,
    ).toBe(200);
    const s = await client();
    await s.request('/auth/login', { email: 'staff@test.local', password: 'staff-password-123' });
    expect((await s.request('/merchant')).status).toBe(200);
    expect(
      (
        await s.request('/merchant/campaigns', {
          name: 'Denied',
          category: 'Audio',
          discountBps: 1000,
        })
      ).status,
    ).toBe(403);
  });
  it('buyer registration cannot escalate role and preserves guest quote ownership', async () => {
    const c = await client(),
      p = db.catalog()[0];
    const q = await c.request('/quotes', {
      lines: [{ productId: p.id, quantity: 1 }],
      budget: 100000,
    });
    const r = await c.request('/auth/register', {
      email: 'buyer@test.local',
      password: 'buyer-password-123',
      role: 'owner',
    });
    expect(r.data.role).toBe('buyer');
    expect((await c.request('/quotes/' + q.data.id)).status).toBe(200);
    expect((await c.request('/merchant')).status).toBe(403);
  });
  it('rejects unsigned webhooks and records no payment success', async () => {
    const r = await fetch(base + '/api/paypal/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'fake', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} }),
    });
    expect(r.status).toBe(503);
    expect(db.all('SELECT * FROM payment_events')).toHaveLength(0);
  });
  it('never stores provider API keys in mission or audit records (mocked failed provider)', async () => {
    const c = await client();
    const original = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) =>
      String(input).startsWith('https://api.openai.com')
        ? Promise.resolve(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }))
        : original(input, init),
    );
    const r = await c
      .request('/agent', {
        config: {
          provider: 'openai',
          apiKey: 'PRIVATE-TEST-KEY-DO-NOT-SAVE',
          model: 'test',
          maxTokens: 256,
          maxSteps: 2,
        },
        mission: { goal: 'A test desk', budget: 10000, required: ['Lighting'], quantity: 1 },
      })
      .catch(() => null);
    const dumps = ['missions', 'audit', 'agent_actions']
      .map((t) => JSON.stringify(db.all('SELECT * FROM ' + t)))
      .join('');
    expect(dumps).not.toContain('PRIVATE-TEST-KEY');
    expect(db.all('SELECT * FROM missions')).toHaveLength(1);
  });
});
