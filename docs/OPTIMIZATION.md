# Offer forge

The language model interprets intent and selects tools. `server/optimizer.ts` performs all arithmetic, filtering and bundle search. The UI labels deterministic runs explicitly.

All monetary values are safe bounded integer cents. Percentages use basis points. For each product:

```text
margin_floor = ceil(cost * 10000 / (10000 - minimum_margin_bps))
discount_floor = ceil(retail * (10000 - maximum_discount_bps) / 10000)
unit_price = max(contractual_floor, margin_floor, discount_floor)
```

Non-clearance products use retail instead of the discount floor. Product validation requires positive cost/retail/floor and a retail price that can satisfy the margin policy. A 100% margin is invalid. No LLM output can overwrite these formulas.

The optimizer groups eligible products by category, considers up to eight SKUs per category and enumerates selecting zero or one SKU per category. Every required category must be present. The selected quantity is the mission's number of people/sets. Exclusions match configured name and tag text; availability is on-hand less reserved and unavailable stock. Products whose current price cannot fit the budget are pruned.

It ranks candidate bundles by:

1. **Budget hunter:** minimum total, then higher configured quality.
2. **Maximum value:** highest sum of configured per-product quality, then lower total.
3. **Merchant rescue:** highest sum of stock age across included product types, then quality, subject to the same buyer budget/requirements.

Distinct combinations are selected in strategy order. When only one or two distinct combinations are feasible, the UI reports that instead of inventing a third. All totals, savings, stock and requirement coverage are derived from catalog records.

This is a bounded combinatorial search, **not a proof of global optimality**. It visits at most 150,000 search nodes, limits the per-category catalog and does not model arbitrary compatibility graphs, delivery calendars or multiple merchants. Demo products are generic universal accessories, not compatibility-certified kits. Quality and stock ages are clearly synthetic merchant data, not reviews or scientific utility measurements. Merchant rescue may include optional categories; the buyer must explicitly select the bundle.

Cart changes invoke server evaluation. The selected mission's budget is carried into the cart and may be explicitly edited by the buyer. A server quote revalidates all quantities and prices against current stock. After customization, the selected items define a custom bundle; removing a required item may reduce the original mission coverage. Review the contents before approval.

Tax and shipping are zero for labeled synthetic sandbox goods. Real tax calculation, shipping eligibility and jurisdiction-specific pricing are production work, not silently assumed to be implemented.
