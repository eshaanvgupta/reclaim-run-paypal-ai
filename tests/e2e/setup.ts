import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { Store } from '../../server/db.js';
import { seed } from '../../server/seed.js';
import { createUser } from '../../server/auth.js';
export default function setup() {
  const file = resolve(process.env.RR_E2E_DB!);
  const db = new Store(file);
  seed(db);
  if (!db.one('SELECT id FROM users WHERE email=?', 'merchant@example.test'))
    createUser(db, 'merchant@example.test', 'Test-only-password-2026', 'owner');
  db.close();
  mkdirSync('docs/screenshots', { recursive: true });
}
