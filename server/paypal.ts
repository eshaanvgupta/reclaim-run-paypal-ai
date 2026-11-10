import { must, DomainError } from './types.js';
export const money = (cents: number) => (cents / 100).toFixed(2);
export function cents(value: string) {
  must(/^\d+\.\d{2}$/.test(value), 'Invalid provider money format.', 502);
  const [a, b] = value.split('.');
  const n = Number(a) * 100 + Number(b);
  must(Number.isSafeInteger(n), 'Invalid provider amount.', 502);
  return n;
}
export class PayPal {
  base = 'https://api-m.sandbox.paypal.com';
  token = '';
  expires = 0;
  configured() {
    return !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_MERCHANT_ID
    );
  }
  async accessToken() {
    must(
      this.configured(),
      'PayPal sandbox is not configured. Add the merchant client ID, secret, and merchant ID to .env.',
      503,
    );
    if (this.token && this.expires > Date.now()) return this.token;
    const r = await fetch(this.base + '/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            process.env.PAYPAL_CLIENT_ID + ':' + process.env.PAYPAL_CLIENT_SECRET,
          ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok)
      throw new DomainError(
        'PayPal sandbox authentication failed. Check the merchant credentials.',
        502,
      );
    const body = (await r.json()) as any;
    must(typeof body.access_token === 'string', 'PayPal returned no access token.', 502);
    this.token = body.access_token;
    this.expires = Date.now() + Math.max(0, body.expires_in - 60) * 1000;
    return this.token;
  }
  async request(path: string, method = 'GET', body?: unknown, requestId?: string): Promise<any> {
    const token = await this.accessToken();
    const r = await fetch(this.base + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
        Prefer: 'return=representation',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const issue = data.details?.[0]?.issue || data.name || 'PROVIDER_ERROR';
      throw new DomainError(
        `PayPal sandbox: ${String(issue)
          .replace(/[^A-Z0-9_]/g, '')
          .slice(0, 80)}. Reconcile the order before retrying.`,
        502,
      );
    }
    return data;
  }
  async create(quote: any, lines: any[], orderId: string) {
    const origin = process.env.APP_URL || 'http://localhost:3000';
    return this.request(
      '/v2/checkout/orders',
      'POST',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: quote.id,
            custom_id: quote.id,
            invoice_id: orderId,
            payee: { merchant_id: process.env.PAYPAL_MERCHANT_ID },
            amount: {
              currency_code: 'USD',
              value: money(quote.total),
              breakdown: { item_total: { currency_code: 'USD', value: money(quote.total) } },
            },
            items: lines.map((l) => ({
              name: l.name.slice(0, 120),
              quantity: String(l.quantity),
              unit_amount: { currency_code: 'USD', value: money(l.unit_price) },
              category: 'DIGITAL_GOODS',
            })),
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'RECLAIM//RUN Sandbox',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: origin + '/checkout/return?quote=' + quote.id,
              cancel_url: origin + '/checkout/cancel?quote=' + quote.id,
            },
          },
        },
      },
      quote.id,
    );
  }
  get(id: string) {
    return this.request('/v2/checkout/orders/' + encodeURIComponent(id));
  }
  capture(id: string, requestId: string) {
    return this.request(
      '/v2/checkout/orders/' + encodeURIComponent(id) + '/capture',
      'POST',
      {},
      requestId,
    );
  }
  refund(captureId: string, total: number, requestId: string) {
    return this.request(
      '/v2/payments/captures/' + encodeURIComponent(captureId) + '/refund',
      'POST',
      {
        amount: { value: money(total), currency_code: 'USD' },
        note_to_payer: 'RECLAIM//RUN sandbox merchant-authorized refund',
      },
      requestId,
    );
  }
  verifyOrder(data: any, quote: any) {
    must(data.purchase_units?.length === 1, 'Unexpected PayPal purchase units.', 502);
    const unit = data.purchase_units[0];
    must(
      unit.custom_id === quote.id && unit.reference_id === quote.id,
      'PayPal quote association mismatch.',
      502,
    );
    must(
      unit.amount?.currency_code === 'USD' && cents(unit.amount.value) === quote.total,
      'PayPal amount or currency mismatch.',
      502,
    );
    must(
      unit.payee?.merchant_id === process.env.PAYPAL_MERCHANT_ID,
      'PayPal merchant mismatch.',
      502,
    );
    return unit;
  }
  async verifyWebhook(headers: Record<string, string>, event: unknown) {
    must(process.env.PAYPAL_WEBHOOK_ID, 'Webhook ID not configured.', 503);
    const result = await this.request('/v1/notifications/verify-webhook-signature', 'POST', {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    });
    must(result.verification_status === 'SUCCESS', 'Webhook signature verification failed.', 403);
  }
}
