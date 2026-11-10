import { randomUUID } from 'node:crypto';
import {
  DomainError,
  must,
  type Product,
  type Mission,
  type LineInput,
  type Offer,
} from './types.js';
export function price(
  p: Pick<Product, 'cost' | 'retail' | 'floor' | 'marginBps' | 'discountBps' | 'clearance'>,
) {
  return Math.max(
    p.floor,
    Math.ceil((p.cost * 10000) / (10000 - p.marginBps)),
    p.clearance ? Math.ceil((p.retail * (10000 - p.discountBps)) / 10000) : p.retail,
  );
}
export function evaluate(
  products: Product[],
  lines: LineInput[],
  budget = 10000000,
  required: string[] = [],
): Offer {
  must(
    new Set(lines.map((x) => x.productId)).size === lines.length,
    'Combine duplicate product lines.',
  );
  const resolved = lines.map((l) => {
    const p = products.find((p) => p.id === l.productId);
    must(p, 'Product no longer exists.');
    must(p.available >= l.quantity, `${p.name}: only ${p.available} available.`, 409);
    return {
      productId: p.id,
      name: p.name,
      category: p.category,
      quantity: l.quantity,
      unitPrice: price(p),
      retail: p.retail,
      ageDays: p.ageDays,
    };
  });
  const total = resolved.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    retail = resolved.reduce((s, l) => s + l.retail * l.quantity, 0);
  must(total <= budget, 'This bundle exceeds your budget.', 422);
  const needs = required.filter((c) => resolved.some((l) => l.category === c)).length;
  return {
    id: randomUUID(),
    strategy: 'Custom bundle',
    objective: 'Your selected items, repriced against merchant rules.',
    lines: resolved,
    total,
    retail,
    savings: retail - total,
    remaining: budget - total,
    coverage: required.length ? Math.round((needs / required.length) * 100) : 100,
    needs,
    required: required.length,
    units: resolved.reduce((s, l) => s + l.quantity, 0),
    ageScore: resolved.reduce((s, l) => s + l.ageDays * l.quantity, 0),
  };
}
export function optimize(products: Product[], mission: Mission): Offer[] {
  const eligible = products.filter(
    (p) =>
      p.available >= mission.quantity &&
      !mission.excluded.some((x) =>
        (p.name + ' ' + p.tags).toLowerCase().includes(x.toLowerCase()),
      ),
  );
  const groups = [...new Set(eligible.map((p) => p.category))].map((category) => ({
    category,
    items: eligible
      .filter((p) => p.category === category)
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, 8),
  }));
  for (const c of mission.required)
    must(
      groups.some((g) => g.category === c),
      `No available products satisfy ${c}. Try a different requirement.`,
      422,
    );
  const candidates: { lines: LineInput[]; total: number; quality: number; age: number }[] = [];
  let visited = 0;
  function visit(i: number, lines: LineInput[], total: number, quality: number, age: number) {
    if (++visited > 150000) return;
    if (i === groups.length) {
      if (lines.length) candidates.push({ lines: [...lines], total, quality, age });
      return;
    }
    const g = groups[i];
    if (!mission.required.includes(g.category)) visit(i + 1, lines, total, quality, age);
    for (const p of g.items) {
      const next = total + price(p) * mission.quantity;
      if (next > mission.budget) continue;
      lines.push({ productId: p.id, quantity: mission.quantity });
      visit(i + 1, lines, next, quality + p.quality, age + p.ageDays);
      lines.pop();
    }
  }
  visit(0, [], 0, 0, 0);
  if (!candidates.length)
    throw new DomainError(
      'No feasible bundle fits all requirements at this budget. Increase the budget or remove a required category.',
      422,
    );
  const strategies = [
    {
      name: 'Budget hunter',
      objective: 'Lowest merchandise total among enumerated feasible bundles.',
      sort: (a: (typeof candidates)[0], b: (typeof candidates)[0]) =>
        a.total - b.total || b.quality - a.quality,
    },
    {
      name: 'Maximum value',
      objective: 'Highest sum of configured product quality scores; ties favor lower cost.',
      sort: (a: (typeof candidates)[0], b: (typeof candidates)[0]) =>
        b.quality - a.quality || a.total - b.total,
    },
    {
      name: 'Merchant rescue',
      objective: 'Highest total stock age among useful, feasible bundles; ties favor quality.',
      sort: (a: (typeof candidates)[0], b: (typeof candidates)[0]) =>
        b.age - a.age || b.quality - a.quality,
    },
  ];
  const seen = new Set<string>();
  const offers: Offer[] = [];
  for (const s of strategies) {
    const c = [...candidates].sort(s.sort).find((c) => !seen.has(JSON.stringify(c.lines)));
    if (!c) continue;
    seen.add(JSON.stringify(c.lines));
    offers.push({
      ...evaluate(products, c.lines, mission.budget, mission.required),
      strategy: s.name,
      objective:
        s.objective +
        (visited > 150000
          ? ' Search bounded at 150,000 nodes; heuristic result.'
          : ' Exhaustive within at most eight products per category.'),
    });
  }
  return offers;
}
