import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { resolve } from 'node:path';
import { Store } from './db.js';
import { seed } from './seed.js';
import { createApp } from './app.js';
import { Commerce } from './commerce.js';
const production = process.argv.includes('--production');
if (production) process.env.NODE_ENV = 'production';
const store = new Store();
seed(store);
const commerce = new Commerce(store),
  app = createApp(store, commerce);
const port = Number(process.env.PORT || 3000);
if (production) {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { port: port + 21678 } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
const server = app.listen(port, process.env.HOST || '127.0.0.1', () =>
  console.log(`RECLAIM//RUN ready at http://localhost:${port} · sandbox only`),
);
const timer = setInterval(() => commerce.releaseExpired(), 60000);
timer.unref();
function shutdown() {
  clearInterval(timer);
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
