import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { Commerce } from '../server/commerce.js';
import { PayPal, money } from '../server/paypal.js';
let db: Store, commerce: Commerce;
beforeEach(() => {
  db = new Store(':memory:');
  seed(db);
  commerce = new Commerce(db);
  process.env.PAYPAL_MERCHANT_ID = 'TEST-MERCHANT';
});
afterEach(() => {
  db.close();
  vi.restoreAllMocks();
  delete process.env.PAYPAL_MERCHANT_ID;
});
function quote() {
  const p = db.catalog()[0];
  return commerce.quote('buyer', [{ productId: p.id, quantity: 1 }], 100000);
}
function provider(q: any, status = 'COMPLETED') {
  return {
    id: 'PAYPAL-MOCK-ORDER',
    status,
    purchase_units: [
      {
        reference_id: q.id,
        custom_id: q.id,
        amount: { currency_code: 'USD', value: money(q.total) },
        payee: { merchant_id: 'TEST-MERCHANT' },
        payments: {
          captures: [
            {
              id: 'MOCK-CAPTURE',
              status: 'COMPLETED',
              amount: { currency_code: 'USD', value: money(q.total) },
            },
          ],
        },
      },
    ],
  };
}
function start(q: any) {
  db.run("UPDATE quotes SET status='PAYMENT_PENDING' WHERE id=?", q.id);
  db.run(
    "INSERT INTO orders(id,quote_id,paypal_id,status) VALUES(?,?,?,'APPROVED')",
    'internal-order',
    q.id,
    'PAYPAL-MOCK-ORDER',
  );
  return db.one<any>('SELECT * FROM orders WHERE id=?', 'internal-order');
}
describe('payment and inventory integrity — mocked provider only', () => {
  it('atomically reserves final stock and prevents a competing buyer', () => {
    const p = db.catalog()[0];
    db.run('UPDATE products SET stock=1 WHERE id=?', p.id);
    const q = commerce.quote('first', [{ productId: p.id, quantity: 1 }], 100000);
    expect(q.status).toBe('RESERVED');
    expect(() => commerce.quote('second', [{ productId: p.id, quantity: 1 }], 100000)).toThrow(
      'only 0 available',
    );
    expect(db.catalog().find((x) => x.id === p.id)?.stock).toBe(1);
    expect(db.catalog().find((x) => x.id === p.id)?.reserved).toBe(1);
  });
  it('releases only expired unstarted quotes, once', () => {
    const q = quote();
    db.run('UPDATE quotes SET expires=0 WHERE id=?', q.id);
    commerce.releaseExpired();
    commerce.releaseExpired();
    expect(db.one<any>('SELECT status FROM quotes WHERE id=?', q.id)?.status).toBe('EXPIRED');
    expect(db.catalog().every((p) => p.reserved === 0)).toBe(true);
  });
  it('retains payment-started reservations after quote expiry', () => {
    const q = quote();
    start(q);
    db.run('UPDATE quotes SET expires=0 WHERE id=?', q.id);
    commerce.releaseExpired();
    expect(db.catalog().reduce((s, p) => s + p.reserved, 0)).toBe(1);
  });
  it('rejects stale quote and missing PayPal credentials without pretending success', async () => {
    const q = quote();
    vi.spyOn(commerce.paypal, 'configured').mockReturnValue(true);
    db.run('UPDATE quotes SET expires=0 WHERE id=?', q.id);
    await expect(commerce.createOrder(q.id)).rejects.toThrow('expired');
    vi.spyOn(commerce.paypal, 'configured').mockReturnValue(false);
    await expect(commerce.createOrder(q.id)).rejects.toThrow('credentials');
    expect(db.one('SELECT id FROM orders')).toBeUndefined();
  });
  it('settles inventory exactly once for replayed capture confirmation', () => {
    const q = quote(),
      o = start(q),
      p = commerce.lines(q.id)[0],
      initial = db.catalog().find((x) => x.id === p.product_id)!;
    commerce.settle(o, q, 'CAPTURE-ONE');
    commerce.settle(o, q, 'CAPTURE-ONE');
    const after = db.catalog().find((x) => x.id === p.product_id)!;
    expect(after.stock).toBe(initial.stock - 1);
    expect(after.reserved).toBe(0);
    expect(after.sold).toBe(1);
    expect(db.all('SELECT * FROM payment_events')).toHaveLength(1);
  });
  it('records late confirmed payments for review without silently overselling', () => {
    const q = quote(),
      o = start(q);
    db.run("UPDATE quotes SET status='EXPIRED' WHERE id=?", q.id);
    const before = db.catalog().map((p) => p.stock);
    commerce.settle(o, q, 'LATE-CAPTURE');
    expect(db.one<any>('SELECT status FROM orders')?.status).toBe('REVIEW_REQUIRED');
    expect(db.catalog().map((p) => p.stock)).toEqual(before);
  });
  it('rejects wrong quote, merchant, amount and currency', () => {
    const q = quote(),
      paypal = new PayPal();
    for (const mutate of [
      (p: any) => (p.purchase_units[0].custom_id = 'other'),
      (p: any) => (p.purchase_units[0].payee.merchant_id = 'bad'),
      (p: any) => (p.purchase_units[0].amount.value = '0.01'),
      (p: any) => (p.purchase_units[0].amount.currency_code = 'EUR'),
    ]) {
      const p = provider(q);
      mutate(p);
      expect(() => paypal.verifyOrder(p, q)).toThrow();
    }
  });
  it('fetches authoritative capture details before settlement', async () => {
    const q = quote();
    start(q);
    vi.spyOn(commerce.paypal, 'get').mockResolvedValue(provider(q));
    vi.spyOn(commerce.paypal, 'request').mockResolvedValue({
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: money(q.total) },
      supplementary_data: { related_ids: { order_id: 'PAYPAL-MOCK-ORDER' } },
    });
    await commerce.reconcile(q.id);
    expect(db.one<any>('SELECT status FROM orders')?.status).toBe('COMPLETED');
  });
  it('does not settle when provider says approval only', async () => {
    const q = quote();
    start(q);
    const p = provider(q, 'APPROVED');
    delete (p.purchase_units[0] as any).payments;
    vi.spyOn(commerce.paypal, 'get').mockResolvedValue(p);
    await commerce.reconcile(q.id);
    expect(db.catalog().reduce((s, p) => s + p.sold, 0)).toBe(0);
    expect(db.one<any>('SELECT status FROM orders')?.status).toBe('APPROVED');
  });
  it('serializes duplicate capture callbacks; one capture call', async () => {
    const q = quote();
    start(q);
    let captured = false;
    const get = vi.spyOn(commerce.paypal, 'get').mockImplementation(async () => {
      const p = provider(q, captured ? 'COMPLETED' : 'APPROVED');
      if (!captured) delete (p.purchase_units[0] as any).payments;
      return p;
    });
    const cap = vi.spyOn(commerce.paypal, 'capture').mockImplementation(async () => {
      captured = true;
      return provider(q);
    });
    vi.spyOn(commerce.paypal, 'request').mockResolvedValue({
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: money(q.total) },
      supplementary_data: { related_ids: { order_id: 'PAYPAL-MOCK-ORDER' } },
    });
    await Promise.all([commerce.reconcile(q.id, true), commerce.reconcile(q.id, true)]);
    expect(cap).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalled();
    expect(db.catalog().reduce((s, p) => s + p.sold, 0)).toBe(1);
  });
  it('uses a stable order request ID when creation times out', async () => {
    const q = quote();
    vi.spyOn(commerce.paypal, 'configured').mockReturnValue(true);
    const c = vi
      .spyOn(commerce.paypal, 'create')
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(provider(q, 'CREATED'));
    await expect(commerce.createOrder(q.id)).rejects.toThrow('timeout');
    await commerce.createOrder(q.id);
    expect(c.mock.calls[0][2]).toBe(c.mock.calls[1][2]);
    expect(db.all('SELECT * FROM orders')).toHaveLength(1);
  });
  it('refund confirmation never restores inventory automatically and retries stay idempotent', async () => {
    const q = quote(),
      o = start(q);
    commerce.settle(o, q, 'CAPTURE-ONE');
    const stock = db.catalog().map((p) => p.stock);
    const fn = vi
      .spyOn(commerce.paypal, 'refund')
      .mockResolvedValue({
        id: 'MOCK-REFUND',
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: money(q.total) },
      });
    await commerce.refund(o.id, 'owner');
    await commerce.refund(o.id, 'owner');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(db.catalog().map((p) => p.stock)).toEqual(stock);
    expect(db.one<any>('SELECT status FROM orders')?.status).toBe('REFUNDED');
  });
  it('pending refund does not count as refunded money', async () => {
    const q = quote(),
      o = start(q);
    commerce.settle(o, q, 'CAPTURE-ONE');
    vi.spyOn(commerce.paypal, 'refund').mockResolvedValue({
      id: 'PENDING-REFUND',
      status: 'PENDING',
      amount: { currency_code: 'USD', value: money(q.total) },
    });
    await commerce.refund(o.id, 'owner');
    expect(db.one<any>('SELECT refunded FROM orders')?.refunded).toBe(0);
    expect(db.one<any>('SELECT status FROM orders')?.status).toBe('REFUND_PENDING');
  });
});
