# Local deployment and recovery

## Development

```sh
npm ci
npm run setup
npm run dev
```

Frontend and backend share http://localhost:3000. SQLite defaults to `data/reclaim.sqlite`. Owner credentials are printed only on first creation. Preserve them securely. Alternatively set first-run MERCHANT_EMAIL/MERCHANT_PASSWORD in your ignored .env. Existing passwords are not printed again.

## Production build, local sandbox service

```sh
npm run build
npm start
```

This still uses the PayPal sandbox. The server defaults to loopback. Set HOST=0.0.0.0 only when explicitly exposing it behind an appropriate trusted reverse proxy. APP_URL must match the externally reachable origin; use SECURE_COOKIES=true with HTTPS. Do not expose Vite's development server publicly.

## Optional Docker

```sh
docker build -t reclaim-run .
docker run --rm -p 3000:3000 --env-file .env -v reclaim-data:/app/data reclaim-run
```

The included image runs setup and the built server; a generated first-run owner password appears in local container logs. Docker configuration is provided but was not executed in this environment. Inside a container, localhost Ollama refers to the container itself; configure OLLAMA_URL to a trusted host address. Keep that URL under operator control.

## Backups and reconciliation

Stop the application before copying the SQLite file and associated WAL/SHM files, or use a proper online SQLite backup procedure. Never reset a database to fix an ambiguous payment. Inspect the merchant ledger and reconcile with PayPal first. CREATING/CAPTURE_PENDING orders retain reservations deliberately; do not manually decrement reserved counts while their provider outcome remains unknown.

Unstarted reservations expire automatically once a minute and on relevant catalog/checkout operations. Payment-started reservations do not time out blindly. External refunds or late captures that need review are visible and require accounting/PayPal investigation. No administrative "mark paid" shortcut exists.

## Hosting boundary

No publicly hosted functional app was deployed. GitHub hosts the source; GitHub Pages cannot run this app's Node server, SQLite, provider proxy or local model. A free compatible server may be used later, but no paid hosting was purchased and no external private credentials were uploaded. The official hackathon rules accept complete local setup instructions for a runnable build.
