import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { price, optimize, evaluate } from '../server/optimizer.js';
import { MissionInput, ProductInput } from '../server/types.js';
let db: Store;
beforeEach(() => {
  db = new Store(':memory:');
  seed(db);
});
afterEach(() => db.close());
const mission = () =>
  MissionInput.parse({
    goal: 'A creator desk',
    budget: 16000,
    required: ['Lighting', 'Audio', 'Organization'],
  });
describe('deterministic offer engine', () => {
  it('generates distinct feasible strategies with exact integer totals and full coverage', () => {
    const products = db.catalog(),
      offers = optimize(products, mission());
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => JSON.stringify(o.lines))).size).toBe(3);
    for (const o of offers) {
      expect(o.total).toBeLessThanOrEqual(16000);
      expect(Number.isInteger(o.total)).toBe(true);
      expect(o.total).toBe(o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
      expect(o.coverage).toBe(100);
      expect(o.retail - o.total).toBe(o.savings);
    }
  });
  it('enforces the maximum of contractual, discount and rounded margin floors', () => {
    expect(
      price({
        cost: 1001,
        retail: 2000,
        floor: 1200,
        discountBps: 8000,
        marginBps: 2500,
        clearance: true,
      }),
    ).toBe(1335);
    expect(
      price({
        cost: 100,
        retail: 2000,
        floor: 1701,
        discountBps: 5000,
        marginBps: 2500,
        clearance: true,
      }),
    ).toBe(1701);
  });
  it('never discounts non-clearance products', () => {
    const p = db.catalog()[0];
    expect(price({ ...p, clearance: false })).toBe(p.retail);
  });
  it('enforces every product margin and floor for every offer line', () => {
    const products = db.catalog();
    for (const offer of optimize(products, mission()))
      for (const l of offer.lines) {
        const p = products.find((p) => p.id === l.productId)!;
        expect(l.unitPrice).toBeGreaterThanOrEqual(p.floor);
        expect((l.unitPrice - p.cost) * 10000).toBeGreaterThanOrEqual(l.unitPrice * p.marginBps);
      }
  });
  it('rejects impossible budgets with a useful explanation', () => {
    expect(() => optimize(db.catalog(), { ...mission(), budget: 100 })).toThrow(
      'No feasible bundle',
    );
  });
  it('changes value bundles with budget and respects exclusions', () => {
    const a = optimize(db.catalog(), { ...mission(), budget: 9500 }),
      b = optimize(db.catalog(), { ...mission(), budget: 25000 });
    expect(a[1].total).not.toBe(b[1].total);
    const c = optimize(db.catalog(), { ...mission(), excluded: ['mic'] });
    expect(c.every((o) => o.lines.every((l) => !l.name.toLowerCase().includes('mic')))).toBe(true);
  });
  it('is deterministic apart from proposal IDs', () => {
    const shape = () => optimize(db.catalog(), mission()).map(({ id, ...o }) => o);
    expect(shape()).toEqual(shape());
  });
  it('respects quantity and availability', () => {
    const products = db.catalog().map((p) => ({ ...p, available: 0 }));
    expect(() => optimize(products, mission())).toThrow('No available products');
    const offers = optimize(db.catalog(), { ...mission(), budget: 40000, quantity: 3 });
    expect(offers.every((o) => o.lines.every((l) => l.quantity === 3))).toBe(true);
  });
  it('rejects duplicate or nonexistent bundle lines and budget overflow', () => {
    const p = db.catalog()[0];
    expect(() =>
      evaluate(db.catalog(), [
        { productId: p.id, quantity: 1 },
        { productId: p.id, quantity: 1 },
      ]),
    ).toThrow('duplicate');
    expect(() => evaluate(db.catalog(), [{ productId: 'invented', quantity: 1 }])).toThrow(
      'no longer exists',
    );
    expect(() => evaluate(db.catalog(), [{ productId: p.id, quantity: 1 }], 1)).toThrow('budget');
  });
  it('rejects invalid merchant pricing and malicious structured mission values', () => {
    const p = db.catalog()[0];
    expect(ProductInput.safeParse({ ...p, cost: p.retail + 1 }).success).toBe(false);
    expect(ProductInput.safeParse({ ...p, stock: -1 }).success).toBe(false);
    expect(ProductInput.safeParse({ ...p, marginBps: 10000 }).success).toBe(false);
    expect(MissionInput.safeParse({ ...mission(), budget: 1.23 }).success).toBe(false);
  });
});
