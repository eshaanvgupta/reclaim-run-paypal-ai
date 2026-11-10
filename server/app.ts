import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { Store, publicProduct } from './db.js';
import { Commerce } from './commerce.js';
import {
  attachSession,
  csrf,
  merchant,
  owner,
  signIn,
  createUser,
  checkPassword,
  canAccess,
} from './auth.js';
import { ProductInput, MissionInput, LinesInput, must, DomainError } from './types.js';
import { optimize, evaluate } from './optimizer.js';
import { ProviderInput, runAgent } from './agent.js';
export function createApp(store: Store, commerce = new Commerce(store)) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            ...(process.env.NODE_ENV === 'production' ? [] : ["'unsafe-inline'"]),
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'ws://localhost:*'],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }),
  );
  app.use(express.json({ limit: '512kb' }));
  app.use(cookieParser());
  // Signed webhook processing has its own authentication and no browser session.
  app.post('/api/paypal/webhook', async (req, res) => {
    await commerce.paypal.verifyWebhook(req.headers as Record<string, string>, req.body);
    const event = z
      .object({ id: z.string().max(100), event_type: z.string().max(100), resource: z.any() })
      .parse(req.body);
    if (store.one('SELECT id FROM payment_events WHERE id=?', event.id))
      return res.json({ received: true });
    const paypalId =
      event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
    const order = store.one<any>('SELECT * FROM orders WHERE paypal_id=?', paypalId);
    if (order) await commerce.reconcile(order.quote_id);
    store.run(
      'INSERT OR IGNORE INTO payment_events(id,order_id,kind,provider_status) VALUES(?,?,?,?)',
      event.id,
      order?.id || null,
      event.event_type,
      'VERIFIED',
    );
    res.json({ received: true });
  });
  app.use('/api', attachSession(store), csrf);
  app.get('/api/session', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { csrf, email, role } = req.session;
    res.json({ csrf, email, role });
  });
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.get('/api/status', async (_req, res) => {
    let ai = false,
      models: string[] = [];
    try {
      const r = await fetch((process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api/tags', {
        signal: AbortSignal.timeout(1200),
      });
      if (r.ok) {
        models = ((await r.json()) as any).models?.map((m: any) => m.name) || [];
        ai = models.length > 0;
      }
    } catch {}
    res.json({
      paypal: commerce.paypal.configured(),
      sandbox: true,
      ollama: ai,
      models,
      currency: 'USD',
      dataset: 'Synthetic demo inventory · no physical fulfillment',
    });
  });
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.post('/api/auth/:action', authLimit, (req, res) => {
    const action = req.params.action;
    if (action === 'logout') {
      store.run('DELETE FROM sessions WHERE id=?', req.session.id);
      res.clearCookie('rr_session', { path: '/' });
      return res.json({ ok: true });
    }
    const { email, password } = z
      .object({ email: z.email().max(200), password: z.string().min(10).max(128) })
      .parse(req.body);
    if (action === 'register') {
      must(
        !store.one('SELECT id FROM users WHERE email=?', email.toLowerCase()),
        'An account with this email exists.',
        409,
      );
      const u = createUser(store, email, password);
      return res.json(signIn(store, req, res, u));
    }
    must(action === 'login', 'Unknown action.', 404);
    const u = store.one<any>('SELECT * FROM users WHERE email=?', email.toLowerCase());
    must(u && checkPassword(password, u.password_hash), 'Email or password is incorrect.', 401);
    res.json(signIn(store, req, res, u));
  });
  app.get('/api/catalog', (_req, res) => {
    commerce.releaseExpired();
    res.json(store.catalog().map(publicProduct));
  });
  function saveMission(sessionId: string, body: any) {
    const m = MissionInput.parse(body),
      id = randomUUID();
    store.run(
      'INSERT INTO missions(id,session_id,goal,budget,required,quantity) VALUES(?,?,?,?,?,?)',
      id,
      sessionId,
      m.goal,
      m.budget,
      JSON.stringify(m.required),
      m.quantity,
    );
    return { m, id };
  }
  app.post('/api/missions', (req, res) => {
    commerce.releaseExpired();
    const { m, id } = saveMission(req.session.id, req.body);
    res.json({
      missionId: id,
      offers: optimize(store.catalog(), m),
      source: 'Deterministic offer engine',
      explanation:
        'Server-calculated bundles using your explicit budget and requirements. No model inference was used.',
    });
  });
  app.post(
    '/api/agent',
    rateLimit({ windowMs: 60000, limit: 6, standardHeaders: 'draft-8', legacyHeaders: false }),
    async (req, res) => {
      const config = ProviderInput.parse(req.body.config),
        { m, id } = saveMission(req.session.id, req.body.mission);
      commerce.releaseExpired();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180000);
      res.on('close', () => controller.abort());
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      const emit = (event: any) => {
        if (!res.writableEnded) res.write('data: ' + JSON.stringify(event) + '\n\n');
      };
      try {
        const result = await runAgent(
          store,
          id,
          m,
          config,
          emit,
          controller.signal,
          ['owner', 'staff'].includes(req.session.role),
        );
        emit({ type: 'done', ...result });
      } catch (e) {
        emit({
          type: 'error',
          message:
            e instanceof DomainError
              ? e.message
              : 'AI request stopped or failed. Check your provider settings and try again.',
        });
      } finally {
        clearTimeout(timeout);
        config.apiKey = '';
        res.end();
      }
    },
  );
  app.post('/api/bundles/evaluate', (req, res) => {
    const body = z
      .object({
        lines: LinesInput,
        budget: z.number().int().min(100).max(10000000),
        required: z.array(z.string()).max(6).default([]),
      })
      .parse(req.body);
    res.json(evaluate(store.catalog(), body.lines, body.budget, body.required));
  });
  app.post('/api/quotes', (req, res) => {
    const { lines, budget } = z
      .object({ lines: LinesInput, budget: z.number().int().min(100).max(10000000) })
      .parse(req.body);
    res.json(commerce.quote(req.session.id, lines, budget));
  });
  function ownQuote(req: express.Request) {
    const id = z.string().uuid().parse(req.params.id),
      q = store.one<any>('SELECT * FROM quotes WHERE id=?', id);
    must(q && canAccess(store, req.session, q.session_id), 'Quote not found.', 404);
    return q;
  }
  app.get('/api/quotes/:id', (req, res) => {
    const q = ownQuote(req);
    res.json({
      ...q,
      lines: commerce.lines(q.id).map(({ cost, ...line }) => line),
      order: store.one('SELECT * FROM orders WHERE quote_id=?', q.id),
    });
  });
  app.post('/api/quotes/:id/cancel', (req, res) => {
    const q = ownQuote(req);
    must(
      q.status === 'RESERVED',
      'A provider order exists. Reconcile it before releasing inventory.',
      409,
    );
    store.transaction(() => commerce.release(q.id, 'CANCELLED'));
    res.json({ ok: true });
  });
  app.post('/api/quotes/:id/paypal', async (req, res) => {
    const q = ownQuote(req);
    res.json(await commerce.createOrder(q.id));
  });
  app.post('/api/quotes/:id/capture', async (req, res) => {
    const q = ownQuote(req);
    res.json(await commerce.reconcile(q.id, true));
  });
  app.post('/api/quotes/:id/reconcile', async (req, res) => {
    const q = ownQuote(req);
    res.json(await commerce.reconcile(q.id));
  });
  const orders = () =>
    store.all<any>(
      'SELECT o.*,q.total,q.retail,q.currency,q.session_id FROM orders o JOIN quotes q ON q.id=o.quote_id ORDER BY o.created_at DESC',
    );
  app.get('/api/history', (req, res) =>
    res.json({
      missions: store
        .all<any>('SELECT * FROM missions ORDER BY created_at DESC')
        .filter((m) => canAccess(store, req.session, m.session_id))
        .slice(0, 100),
      orders: orders()
        .filter((o) => canAccess(store, req.session, o.session_id))
        .map(({ session_id, ...o }) => ({
          ...o,
          lines: commerce.lines(o.quote_id).map(({ cost, ...l }) => l),
          returnRequest: store.one('SELECT * FROM return_requests WHERE order_id=?', o.id),
        })),
    }),
  );
  app.post('/api/orders/:id/return', (req, res) => {
    const reason = z.string().trim().min(5).max(1000).parse(req.body.reason),
      o = orders().find((o) => o.id === req.params.id);
    must(o && canAccess(store, req.session, o.session_id), 'Order not found.', 404);
    must(o.status === 'COMPLETED', 'Only settled orders can request a return.', 409);
    must(
      !store.one('SELECT id FROM return_requests WHERE order_id=?', o.id),
      'A return was already requested.',
      409,
    );
    store.run(
      'INSERT INTO return_requests(id,order_id,reason) VALUES(?,?,?)',
      randomUUID(),
      o.id,
      reason,
    );
    res.json({ ok: true });
  });
  app.get('/api/merchant', merchant, (_req, res) => {
    commerce.releaseExpired();
    const products = store.catalog(),
      allOrders = orders(),
      settled = allOrders.filter((o) =>
        ['COMPLETED', 'REFUNDED', 'REFUND_PENDING'].includes(o.status),
      );
    const revenue = settled.reduce((s, o) => s + o.total - o.refunded, 0),
      discounts = settled.reduce((s, o) => s + o.retail - o.total, 0),
      cost = settled.reduce(
        (s, o) => s + commerce.lines(o.quote_id).reduce((s, l) => s + l.cost * l.quantity, 0),
        0,
      );
    res.json({
      products,
      orders: allOrders.map(({ session_id, ...o }) => ({
        ...o,
        lines: commerce.lines(o.quote_id),
        returnRequest: store.one('SELECT * FROM return_requests WHERE order_id=?', o.id),
      })),
      campaigns: store.all('SELECT * FROM campaigns ORDER BY created_at DESC'),
      metrics: {
        revenue,
        discounts,
        cost,
        grossMargin: revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0,
        completed: settled.length,
        refunded: allOrders.reduce((s, o) => s + o.refunded, 0),
        stockValue: products.reduce((s, p) => s + p.cost * p.available, 0),
        agingValue: products
          .filter((p) => p.ageDays >= 90)
          .reduce((s, p) => s + p.cost * p.available, 0),
        reserved: products.reduce((s, p) => s + p.reserved, 0),
        missions: Number(store.one<any>('SELECT COUNT(*) n FROM missions')!.n),
        quotes: Number(store.one<any>('SELECT COUNT(*) n FROM quotes')!.n),
      },
      demand: store
        .all<any>('SELECT required,COUNT(*) count FROM missions GROUP BY required')
        .map((m) => ({ categories: JSON.parse(m.required), count: m.count })),
      audit: store.all('SELECT action,entity,created_at FROM audit ORDER BY rowid DESC LIMIT 30'),
    });
  });
  function insertProduct(body: any, id = randomUUID()) {
    const p = ProductInput.parse(body);
    store.run(
      'INSERT INTO products(id,sku,name,description,category,cost,retail,floor,stock,age_days,quality,discount_bps,margin_bps,clearance,tags) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id,
      p.sku,
      p.name,
      p.description,
      p.category,
      p.cost,
      p.retail,
      p.floor,
      p.stock,
      p.ageDays,
      p.quality,
      p.discountBps,
      p.marginBps,
      p.clearance ? 1 : 0,
      p.tags,
    );
    return id;
  }
  app.post('/api/merchant/products', merchant, (req, res) => {
    const id = insertProduct(req.body);
    store.audit(req.session.userId!, 'PRODUCT_CREATED', id);
    res.status(201).json({ id });
  });
  app.put('/api/merchant/products/:id', merchant, (req, res) => {
    const p = ProductInput.parse(req.body),
      existing = store.catalog().find((p) => p.id === req.params.id);
    must(existing, 'Product not found.', 404);
    must(
      p.stock >= existing.reserved + existing.unavailable,
      'Stock cannot be below reserved and unavailable units.',
      409,
    );
    store.run(
      'UPDATE products SET sku=?,name=?,description=?,category=?,cost=?,retail=?,floor=?,stock=?,age_days=?,quality=?,discount_bps=?,margin_bps=?,clearance=?,tags=?,created_at=CURRENT_TIMESTAMP WHERE id=?',
      p.sku,
      p.name,
      p.description,
      p.category,
      p.cost,
      p.retail,
      p.floor,
      p.stock,
      p.ageDays,
      p.quality,
      p.discountBps,
      p.marginBps,
      p.clearance ? 1 : 0,
      p.tags,
      existing.id,
    );
    store.audit(req.session.userId!, 'PRODUCT_UPDATED', existing.id);
    res.json({ ok: true });
  });
  app.post('/api/merchant/import', merchant, (req, res) => {
    const body = z
      .object({
        csv: z.string().max(300000),
        mapping: z.record(z.string(), z.string()).default({}),
      })
      .parse(req.body);
    const records = parse(body.csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    }) as Record<string, string>[];
    must(records.length > 0 && records.length <= 500, 'Import must contain 1–500 rows.');
    const parsed = records.map((r, i) => {
      const p: any = Object.create(null);
      for (const [key, value] of Object.entries(r)) {
        const name = body.mapping[key] || key;
        must(
          Object.keys(ProductInput.shape).includes(name),
          `Row ${i + 2}: unsupported column ${name}. Map it to a supported field.`,
        );
        p[name] = value;
      }
      for (const key of [
        'cost',
        'retail',
        'floor',
        'stock',
        'ageDays',
        'quality',
        'discountBps',
        'marginBps',
      ]) {
        if (p[key] !== undefined && p[key] !== '') p[key] = Number(p[key]);
        else delete p[key];
      }
      if (p.clearance !== undefined) {
        must(
          ['true', 'false', '1', '0'].includes(String(p.clearance)),
          `Row ${i + 2}: invalid clearance flag.`,
        );
        p.clearance = ['true', '1'].includes(p.clearance);
      }
      const result = ProductInput.safeParse(p);
      must(
        result.success,
        `Row ${i + 2}: ${result.error?.issues[0]?.message || 'invalid product'}`,
      );
      return result.data;
    });
    store.transaction(() => {
      for (const p of parsed) insertProduct(p);
      store.audit(req.session.userId!, 'CSV_IMPORTED', String(parsed.length));
    });
    res.json({ imported: parsed.length });
  });
  app.post('/api/merchant/campaigns', owner, (req, res) => {
    const p = z
      .object({
        name: z.string().min(3).max(80),
        category: z.string().max(40),
        discountBps: z.number().int().min(0).max(8000),
      })
      .parse(req.body);
    must(
      store.catalog().some((x) => x.category === p.category),
      'Unknown category.',
    );
    store.transaction(() => {
      const id = randomUUID();
      store.run(
        'INSERT INTO campaigns(id,name,category,discount_bps) VALUES(?,?,?,?)',
        id,
        p.name,
        p.category,
        p.discountBps,
      );
      store.run(
        'UPDATE products SET discount_bps=?,clearance=1 WHERE category=?',
        p.discountBps,
        p.category,
      );
      store.audit(req.session.userId!, 'CAMPAIGN_APPROVED', id);
    });
    res.json({ ok: true });
  });
  app.post('/api/merchant/orders/:id/reconcile', merchant, async (req, res) => {
    const o = store.one<any>('SELECT * FROM orders WHERE id=?', String(req.params.id));
    must(o, 'Order not found.', 404);
    res.json(await commerce.reconcile(o.quote_id));
  });
  app.post('/api/merchant/orders/:id/refund', owner, async (req, res) => {
    must(req.body.confirm === true, 'Explicit refund confirmation required.');
    res.json(await commerce.refund(String(req.params.id), req.session.userId!));
  });
  app.post('/api/merchant/orders/:id/restock', owner, (req, res) => {
    const o = store.one<any>('SELECT * FROM orders WHERE id=?', String(req.params.id));
    must(o && o.status === 'REFUNDED', 'A completed refund is required.', 409);
    must(req.body.confirm === true, 'Confirm inspection and saleable condition.');
    store.transaction(() => {
      must(
        !store.one('SELECT id FROM audit WHERE action=? AND entity=?', 'RETURN_RESTOCKED', o.id),
        'Return was already restocked.',
        409,
      );
      for (const l of commerce.lines(o.quote_id))
        store.run(
          'UPDATE products SET stock=stock+?,returned=returned+? WHERE id=?',
          l.quantity,
          l.quantity,
          l.product_id,
        );
      store.audit(req.session.userId!, 'RETURN_RESTOCKED', o.id);
      store.run("UPDATE return_requests SET status='RESTOCKED' WHERE order_id=?", o.id);
    });
    res.json({ ok: true });
  });
  app.post('/api/merchant/staff', owner, (req, res) => {
    const p = z
      .object({ email: z.email().max(200), password: z.string().min(10).max(128) })
      .parse(req.body);
    const u = createUser(store, p.email, p.password, 'staff');
    store.audit(req.session.userId!, 'STAFF_CREATED', u.id);
    res.json({ email: u.email, role: u.role });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return res.end();
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (err?.code?.startsWith('ERR_SQLITE'))
      return res
        .status(409)
        .json({
          error:
            'This record conflicts with existing data. Check SKU, email, quantities, and retry.',
        });
    if (err?.type === 'entity.parse.failed')
      return res.status(400).json({ error: 'Invalid JSON request.' });
    res
      .status(err instanceof DomainError ? err.status : 500)
      .json({
        error:
          err instanceof DomainError
            ? err.message
            : 'Request failed. No payment success has been assumed. Try reconciliation if a payment was in progress.',
      });
  });
  return app;
}
