import { randomUUID } from 'node:crypto';
import type { Store } from './db.js';
import { evaluate } from './optimizer.js';
import { PayPal, cents } from './paypal.js';
import { must, type LineInput } from './types.js';
export class Commerce {
  locks = new Map<string, Promise<unknown>>();
  constructor(
    public store: Store,
    public paypal = new PayPal(),
  ) {}
  async serial<T>(id: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(fn);
    this.locks.set(id, next);
    try {
      return await next;
    } finally {
      if (this.locks.get(id) === next) this.locks.delete(id);
    }
  }
  releaseExpired() {
    this.store.transaction(() => {
      for (const q of this.store.all<any>(
        "SELECT id FROM quotes WHERE status='RESERVED' AND expires<?",
        Date.now(),
      ))
        this.release(q.id, 'EXPIRED');
    });
  }
  release(id: string, status: string) {
    const q = this.store.one<any>('SELECT * FROM quotes WHERE id=?', id);
    if (!q || q.status !== 'RESERVED') return;
    for (const l of this.lines(id))
      this.store.run(
        'UPDATE products SET reserved=reserved-? WHERE id=?',
        l.quantity,
        l.product_id,
      );
    this.store.run('UPDATE quotes SET status=? WHERE id=?', status, id);
  }
  lines(id: string) {
    return this.store.all<any>('SELECT * FROM quote_lines WHERE quote_id=?', id);
  }
  quote(sessionId: string, lines: LineInput[], budget: number) {
    this.releaseExpired();
    return this.store.transaction(() => {
      const offer = evaluate(this.store.catalog(), lines, budget),
        id = randomUUID(),
        expires = Date.now() + 15 * 60000;
      this.store.run(
        "INSERT INTO quotes(id,session_id,status,total,retail,expires) VALUES(?,?,'RESERVED',?,?,?)",
        id,
        sessionId,
        offer.total,
        offer.retail,
        expires,
      );
      for (const l of offer.lines) {
        const p = this.store.catalog().find((p) => p.id === l.productId)!;
        const result = this.store.run(
          'UPDATE products SET reserved=reserved+? WHERE id=? AND stock-reserved-unavailable>=?',
          l.quantity,
          l.productId,
          l.quantity,
        );
        must(result.changes === 1, 'Stock was just reserved by another buyer.', 409);
        this.store.run(
          'INSERT INTO quote_lines(quote_id,product_id,name,category,quantity,unit_price,retail,cost) VALUES(?,?,?,?,?,?,?,?)',
          id,
          l.productId,
          l.name,
          l.category,
          l.quantity,
          l.unitPrice,
          l.retail,
          p.cost,
        );
      }
      this.store.audit(sessionId, 'QUOTE_RESERVED', id);
      return { ...offer, id, expires, status: 'RESERVED', currency: 'USD' };
    });
  }
  async createOrder(quoteId: string) {
    return this.serial(quoteId, async () => {
      must(
        this.paypal.configured(),
        'PayPal sandbox credentials are missing. Your quote is saved; no payment was attempted.',
        503,
      );
      const q = this.store.one<any>('SELECT * FROM quotes WHERE id=?', quoteId);
      must(q, 'Quote not found.', 404);
      const existing = this.store.one<any>('SELECT * FROM orders WHERE quote_id=?', quoteId);
      if (existing?.paypal_id) {
        const provider = await this.paypal.get(existing.paypal_id);
        this.paypal.verifyOrder(provider, q);
        return { order: existing, approvalUrl: this.approval(provider) };
      }
      must(
        (q.status === 'RESERVED' && q.expires > Date.now()) ||
          (q.status === 'PAYMENT_PENDING' && existing),
        'Quote expired. Request a new quote.',
        409,
      );
      const orderId = existing?.id || randomUUID();
      this.store.transaction(() => {
        if (!existing)
          this.store.run(
            "INSERT INTO orders(id,quote_id,status) VALUES(?,?,'CREATING')",
            orderId,
            quoteId,
          );
        this.store.run("UPDATE quotes SET status='PAYMENT_PENDING' WHERE id=?", quoteId);
      });
      try {
        const p = await this.paypal.create(q, this.lines(quoteId), orderId);
        this.paypal.verifyOrder(p, q);
        must(p.id, 'PayPal returned no order ID.', 502);
        this.store.run(
          "UPDATE orders SET paypal_id=?,status='AWAITING_APPROVAL',error=NULL WHERE id=?",
          p.id,
          orderId,
        );
        this.store.audit('server', 'PAYPAL_ORDER_CREATED', orderId);
        return {
          order: this.store.one('SELECT * FROM orders WHERE id=?', orderId),
          approvalUrl: this.approval(p),
        };
      } catch (e) {
        this.store.run(
          "UPDATE orders SET error='Creation needs reconciliation or idempotent retry' WHERE id=?",
          orderId,
        );
        throw e;
      }
    });
  }
  approval(data: any) {
    const url = data.links?.find((l: any) => ['payer-action', 'approve'].includes(l.rel))?.href;
    if (url) {
      const parsed = new URL(url);
      must(
        parsed.protocol === 'https:' &&
          (parsed.hostname === 'www.sandbox.paypal.com' ||
            parsed.hostname === 'sandbox.paypal.com'),
        'Unexpected approval host.',
        502,
      );
    }
    return url || null;
  }
  async reconcile(quoteId: string, capture = false) {
    return this.serial(quoteId, async () => {
      const q = this.store.one<any>('SELECT * FROM quotes WHERE id=?', quoteId),
        o = this.store.one<any>('SELECT * FROM orders WHERE quote_id=?', quoteId);
      must(q && o?.paypal_id, 'No provider order to reconcile.', 409);
      let data = await this.paypal.get(o.paypal_id);
      this.paypal.verifyOrder(data, q);
      if (data.status === 'APPROVED' && capture && !['COMPLETED', 'REFUNDED'].includes(o.status)) {
        this.store.run("UPDATE orders SET status='CAPTURE_PENDING' WHERE id=?", o.id);
        await this.paypal.capture(o.paypal_id, o.id);
        data = await this.paypal.get(o.paypal_id);
      }
      const unit = this.paypal.verifyOrder(data, q),
        captures = unit.payments?.captures || [];
      if (
        data.status === 'COMPLETED' &&
        captures.some((x: any) =>
          ['COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(x.status),
        )
      ) {
        must(
          captures.length === 1,
          'Unexpected capture count; manual reconciliation required.',
          502,
        );
        const c = captures[0];
        must(
          c.amount?.currency_code === 'USD' && cents(c.amount.value) === q.total,
          'Captured amount mismatch.',
          502,
        );
        const detail = await this.paypal.request(
          '/v2/payments/captures/' + encodeURIComponent(c.id),
        );
        must(
          detail.status === 'COMPLETED' ||
            detail.status === 'REFUNDED' ||
            detail.status === 'PARTIALLY_REFUNDED',
          'Capture is not settled.',
          409,
        );
        must(
          detail.amount.currency_code === 'USD' && cents(detail.amount.value) === q.total,
          'Capture detail mismatch.',
          502,
        );
        must(
          detail.supplementary_data?.related_ids?.order_id === o.paypal_id,
          'Capture order association mismatch.',
          502,
        );
        this.settle(o, q, c.id);
        if (o.refund_id) {
          const refund = await this.paypal.request(
            '/v2/payments/refunds/' + encodeURIComponent(o.refund_id),
          );
          must(
            refund.amount?.currency_code === 'USD' && cents(refund.amount.value) === q.total,
            'Refund reconciliation amount mismatch.',
            502,
          );
          if (refund.status === 'COMPLETED') {
            this.store.run(
              "UPDATE orders SET status='REFUNDED',refunded=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='REVIEW_REQUIRED'",
              q.total,
              o.id,
            );
            this.store.run(
              'INSERT OR IGNORE INTO payment_events(id,order_id,kind,provider_status) VALUES(?,?,?,?)',
              refund.id,
              o.id,
              'REFUND',
              'COMPLETED',
            );
          } else if (['FAILED', 'CANCELLED'].includes(refund.status)) {
            this.store.run(
              "UPDATE orders SET status='COMPLETED',error='Refund failed or cancelled; manual review required' WHERE id=? AND status='REFUND_PENDING'",
              o.id,
            );
          }
        } else if (detail.status === 'REFUNDED' || detail.status === 'PARTIALLY_REFUNDED') {
          this.store.run(
            "UPDATE orders SET status='REVIEW_REQUIRED',error='External refund detected; reconcile refund amount manually' WHERE id=?",
            o.id,
          );
          this.store.audit('server', 'EXTERNAL_REFUND_REVIEW', o.id);
        }
      } else if (['VOIDED'].includes(data.status)) {
        this.store.transaction(() => {
          const fresh = this.store.one<any>('SELECT * FROM orders WHERE id=?', o.id);
          if (fresh.status === 'COMPLETED' || fresh.capture_id) return;
          this.store.run("UPDATE quotes SET status='RESERVED' WHERE id=?", q.id);
          this.release(q.id, 'CANCELLED');
          this.store.run("UPDATE orders SET status='CANCELLED' WHERE id=?", o.id);
        });
      } else {
        const providerState = captures.some((c: any) => ['DECLINED', 'FAILED'].includes(c.status))
          ? 'DENIED'
          : captures.some((c: any) => c.status === 'PENDING')
            ? 'CAPTURE_PENDING'
            : data.status === 'APPROVED'
              ? 'APPROVED'
              : data.status === 'COMPLETED'
                ? 'CAPTURE_PENDING'
                : 'AWAITING_APPROVAL';
        this.store.run(
          'UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND capture_id IS NULL',
          providerState,
          o.id,
        );
      }
      return this.store.one('SELECT * FROM orders WHERE id=?', o.id);
    });
  }
  settle(o: any, q: any, captureId: string) {
    this.store.transaction(() => {
      const fresh = this.store.one<any>('SELECT * FROM orders WHERE id=?', o.id);
      if (fresh.capture_id) {
        must(fresh.capture_id === captureId, 'Duplicate capture mismatch.', 409);
        return;
      }
      const quote = this.store.one<any>('SELECT * FROM quotes WHERE id=?', q.id);
      if (quote.status !== 'PAYMENT_PENDING') {
        this.store.run(
          "UPDATE orders SET status='REVIEW_REQUIRED',capture_id=? WHERE id=?",
          captureId,
          o.id,
        );
        this.store.audit('server', 'LATE_CAPTURE_REVIEW', o.id);
        return;
      }
      for (const l of this.lines(q.id)) {
        const r = this.store.run(
          'UPDATE products SET stock=stock-?,reserved=reserved-?,sold=sold+? WHERE id=? AND stock>=? AND reserved>=?',
          l.quantity,
          l.quantity,
          l.quantity,
          l.product_id,
          l.quantity,
          l.quantity,
        );
        must(
          r.changes === 1,
          'Inventory settlement conflict. Reconcile payment; do not retry a new purchase.',
          409,
        );
      }
      this.store.run(
        "UPDATE orders SET status='COMPLETED',capture_id=?,error=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        captureId,
        o.id,
      );
      this.store.run("UPDATE quotes SET status='PAID' WHERE id=?", q.id);
      this.store.run(
        'INSERT OR IGNORE INTO payment_events(id,order_id,kind,provider_status) VALUES(?,?,?,?)',
        captureId,
        o.id,
        'CAPTURE',
        'COMPLETED',
      );
      this.store.audit('server', 'PAYMENT_SETTLED', o.id);
    });
  }
  async refund(orderId: string, actor: string) {
    return this.serial(orderId, async () => {
      const o = this.store.one<any>(
        'SELECT o.*,q.total FROM orders o JOIN quotes q ON q.id=o.quote_id WHERE o.id=?',
        orderId,
      );
      must(o?.capture_id, 'No confirmed capture.', 409);
      if (o.status === 'REFUNDED') return o;
      must(
        o.status === 'COMPLETED' || o.status === 'REFUND_PENDING',
        'Order cannot be refunded.',
        409,
      );
      const r = await this.paypal.refund(o.capture_id, o.total, o.id + '-r');
      must(
        r.id && r.amount?.currency_code === 'USD' && cents(r.amount.value) === o.total,
        'Refund response mismatch.',
        502,
      );
      must(['COMPLETED', 'PENDING'].includes(r.status), 'Refund was not accepted.', 409);
      this.store.run(
        'UPDATE orders SET refund_id=?,status=?,refunded=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',
        r.id,
        r.status === 'COMPLETED' ? 'REFUNDED' : 'REFUND_PENDING',
        r.status === 'COMPLETED' ? o.total : 0,
        o.id,
      );
      this.store.audit(actor, 'REFUND_' + r.status, o.id);
      return this.store.one('SELECT * FROM orders WHERE id=?', o.id);
    });
  }
}
