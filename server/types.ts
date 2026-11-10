import { z } from 'zod';
export const categories = [
  'Lighting',
  'Audio',
  'Organization',
  'Desk',
  'Stationery',
  'Hobby',
] as const;
export const Category = z.enum(categories);
export const ProductInput = z
  .object({
    sku: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(2).max(100),
    description: z.string().max(1000).default(''),
    category: Category,
    cost: z.number().int().min(1).max(10000000),
    retail: z.number().int().min(1).max(10000000),
    floor: z.number().int().min(1).max(10000000),
    stock: z.number().int().min(0).max(100000),
    ageDays: z.number().int().min(0).max(3650).default(0),
    quality: z.number().int().min(1).max(100).default(70),
    discountBps: z.number().int().min(0).max(8000).default(2000),
    marginBps: z.number().int().min(0).max(9000).default(2000),
    clearance: z.boolean().default(true),
    tags: z.string().max(300).default(''),
  })
  .refine(
    (p) =>
      p.cost <= p.retail &&
      p.floor <= p.retail &&
      Math.ceil((p.cost * 10000) / (10000 - p.marginBps)) <= p.retail,
    { message: 'Retail must cover cost, floor, and required gross margin.' },
  );
export type Product = z.infer<typeof ProductInput> & {
  id: string;
  reserved: number;
  sold: number;
  returned: number;
  unavailable: number;
  available: number;
  price: number;
  createdAt: string;
};
export const MissionInput = z.object({
  goal: z.string().trim().min(3).max(2000),
  budget: z.number().int().min(100).max(10000000),
  required: z.array(Category).min(1).max(6),
  quantity: z.number().int().min(1).max(20).default(1),
  excluded: z.array(z.string().max(80)).max(20).default([]),
});
export type Mission = z.infer<typeof MissionInput>;
export const LinesInput = z
  .array(
    z.object({ productId: z.string().min(1).max(80), quantity: z.number().int().min(1).max(20) }),
  )
  .min(1)
  .max(30);
export type LineInput = z.infer<typeof LinesInput>[number];
export type Line = {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  retail: number;
  ageDays: number;
};
export type Offer = {
  id: string;
  strategy: string;
  objective: string;
  lines: Line[];
  total: number;
  retail: number;
  savings: number;
  remaining: number;
  coverage: number;
  needs: number;
  required: number;
  units: number;
  ageScore: number;
};
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function must(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new DomainError(message, status);
}
