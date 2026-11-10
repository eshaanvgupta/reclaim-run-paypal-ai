import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { existsSync, copyFileSync } from 'node:fs';
import { Store } from '../server/db.js';
import { seed } from '../server/seed.js';
import { createUser } from '../server/auth.js';
if (!existsSync('.env')) copyFileSync('.env.example', '.env');
const store = new Store();
seed(store);
if (!store.one("SELECT id FROM users WHERE role='owner'")) {
  const email = process.env.MERCHANT_EMAIL || 'merchant@reclaim.local',
    password = process.env.MERCHANT_PASSWORD || randomBytes(15).toString('base64url');
  createUser(store, email, password, 'owner');
  console.log(
    `Merchant account created. Save these local credentials:\nEmail: ${email}\nPassword: ${password}`,
  );
} else console.log('Existing merchant account preserved.');
console.log(
  'SQLite initialized with labeled synthetic inventory.\nRun npm run dev, then open http://localhost:3000\nPayPal sandbox keys belong in .env. Buyer AI keys are entered in the app and never persisted.',
);
store.close();
