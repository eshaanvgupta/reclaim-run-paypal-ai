import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { price } from './optimizer.js';
import type { Product } from './types.js';
export class Store {
  db: DatabaseSync;
  constructor(path = process.env.DATABASE_PATH || './data/reclaim.sqlite') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec(readFileSync(new URL('../db/migrations/001.sql', import.meta.url), 'utf8'));
  }
  all<T = Record<string, unknown>>(sql: string, ...params: (string | number | null)[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }
  one<T = Record<string, unknown>>(
    sql: string,
    ...params: (string | number | null)[]
  ): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  run(sql: string, ...params: (string | number | null)[]) {
    return this.db.prepare(sql).run(...params);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  audit(actor: string, action: string, entity: string) {
    this.run(
      'INSERT INTO audit(id,actor,action,entity) VALUES(?,?,?,?)',
      randomUUID(),
      actor,
      action,
      entity,
    );
  }
  catalog(): Product[] {
    return this.all<any>('SELECT * FROM products ORDER BY age_days DESC')
      .map((p) => {
        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(p.created_at + 'Z').getTime()) / 86400000),
        );
        const x = {
          ...p,
          ageDays: p.age_days + elapsed,
          discountBps: p.discount_bps,
          marginBps: p.margin_bps,
          clearance: !!p.clearance,
          createdAt: p.created_at,
          available: p.stock - p.reserved - p.unavailable,
        };
        return { ...x, price: price(x) };
      })
      .sort((a, b) => b.ageDays - a.ageDays);
  }
  close() {
    this.db.close();
  }
}
export function publicProduct(p: Product) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    category: p.category,
    retail: p.retail,
    price: p.price,
    available: p.available,
    ageDays: p.ageDays,
    quality: p.quality,
    tags: p.tags,
  };
}
