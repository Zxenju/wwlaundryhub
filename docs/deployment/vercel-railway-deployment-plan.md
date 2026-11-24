# Wash-up Wash-up Laundry Hub: Vercel + Railway Deployment Plan

**Status (November 24, 2026):** Deployed. Vercel hosts the Angular frontend at `https://wwlaundryhub.vercel.app`; Railway hosts the API at `https://fearless-flexibility-production-df22d8e4.up.railway.app`; Railway MySQL is active. The Vercel `/api/*` rewrite was verified through `/api/health` (`storage: mysql`) and `/api/bookings` (currently empty).

This guide describes how to host the Angular user interface on Vercel and the Node.js API on Railway. It is based on the current repository structure and deployment platform documentation checked on **November 24, 2026**. Platform dashboards and plan limits can change, so recheck the linked official docs during deployment.

## Recommendation

Use two services:

1. **Vercel** serves the Angular frontend as static files.
2. **Railway** runs `api/server.mjs` as a long-lived Node.js web service.
3. **Railway MySQL** stores bookings and pricing for a durable shared application.

The deployed API uses Railway MySQL. Local development mode can still use JSON files under `api/.data`; those local files are separate from production and were not imported. A Railway Volume with JSON storage remains an alternative for temporary previews, but is not the selected deployment path.

## Architecture review

| Area | Current project state | Deployment implication |
| --- | --- | --- |
| Frontend | Angular 22 application at the repository root; `outputMode: "static"`. Production URL: `https://wwlaundryhub.vercel.app`. | Vercel builds with `npm run build` and serves `dist/Laundry-Hub/browser`. A production build completed locally and Vercel deployed it successfully. [Angular deployment](https://angular.dev/tools/cli/deployment) · [Angular hybrid rendering](https://angular.dev/guide/hybrid-rendering) · [Vercel frontend frameworks](https://vercel.com/docs/frameworks/frontend) |
| Rendering and navigation | API data loads in `afterNextRender`; Angular routes are currently empty and the main modules are selected in the app shell. | Static hosting is suitable. Test page refresh at `/`. If real Angular URL routes are added later, configure the Vercel fallback/deep-link behavior and test direct links. [Angular deployment](https://angular.dev/tools/cli/deployment) |
| API client | `src/app/services/booking-api.service.ts` calls the same-origin `/api` path. `proxy.conf.json` points local Angular development to `127.0.0.1:3000`; `vercel.json` rewrites production `/api/*` requests to Railway. | No Vercel API URL environment variable or browser cross-origin request is needed. |
| API server | Railway runs `api/server.mjs` on the injected `PORT` and listens on `0.0.0.0`. Public health URL: `https://fearless-flexibility-production-df22d8e4.up.railway.app/api/health`. | Railway reports the service online and its health route returns `{"status":"ok","storage":"mysql"}`. [Railway health checks](https://docs.railway.com/deployments/healthchecks) |
| CORS | API supports a `CORS_ORIGINS` allowlist; local Angular origins remain the default. Vercel uses a same-origin rewrite. | Vercel requests are proxied server-side by its rewrite, so no Vercel browser origin needs to be added for the current architecture. If the frontend later calls Railway directly, add exact Vercel origins to `CORS_ORIGINS`. |
| Persistence | Railway MySQL is connected. Health check reports `storage: mysql`; the deployed `/api/bookings` currently returns `{"bookings":[],"demoData":false}`. | The database is ready, but it has no booking records yet. Add bookings through the app or intentionally import a chosen dataset; do not assume local sample records were copied. [Railway MySQL](https://docs.railway.com/databases/mysql) |
| Authentication | The API has no staff login or authorization layer. | Do not put real customer contact details or sensitive business data on a publicly reachable unauthenticated API. Add authentication/authorization before real operational use; use fictional data for a public class demo until then. |
| API endpoints | `GET /api/bookings`, `POST /api/bookings`, `PUT /api/bookings/:id`, `DELETE /api/bookings/:id`, `PATCH /api/bookings/:id/payment`, `GET /api/pricing`, `PUT /api/pricing`. | Preserve these contracts while deploying; exercise each one from the deployed frontend and check API/browser logs. |

### API fields currently used

Bookings include fields such as `id`, `customerName`, `contactNumber`, `serviceId`, `rateType`, `weightKg`, `express`, `bookingDate`, `pickupDate`, `notes`, `status`, `statusHistory`, `payment`, `charge`, `createdAt`, `updatedAt`, `completedAt`, and `demoRecord`. Pricing contains `services`, `express`, and `weightLimits`. Keep the existing model and API response shape compatible when moving the JSON records to MySQL.

## Deployment status and remaining work

Completed deployment setup and remaining production tasks:

- [x] **Static Angular output:** build mode is `outputMode: "static"`; `npm run build` completes and outputs `dist/Laundry-Hub/browser`. [Angular deployment](https://angular.dev/tools/cli/deployment)
- [x] **Production API routing:** service uses `/api`; local Angular uses `proxy.conf.json`; Vercel uses `vercel.json` to route API traffic to Railway.
- [x] **Railway host and health:** API uses the Railway port, listens on `0.0.0.0`, and `/api/health` returns healthy MySQL storage. [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [x] **MySQL persistence path:** Railway environment variables are connected and the database is initialized.
- [x] **Vercel production deployment:** `https://wwlaundryhub.vercel.app` is live and the API rewrite was confirmed from Vercel.
- [ ] **Initial records:** production `/api/bookings` is empty. Create intended records through the app or deliberately import a selected dataset. No local records were imported as part of deployment.
- [ ] **Security for real users:** add staff authentication and authorization before storing real customer information. Set up backups and rehearse database recovery.

### Static build note

The current Angular build is static. The production build uses the generated `browser` assets; it does not rely on the SSR server bundle. Angular documents that `outputMode: "static"` does not require a Node server to serve the app. [Angular hybrid rendering](https://angular.dev/guide/hybrid-rendering)

## Persistence path decision

### Recommended: Railway MySQL for shared use

- [x] Create a Railway MySQL service and keep it private to the Railway project.
- [x] Add database tables and update the API to use MySQL for booking records, status history, payment fields, and pricing.
- [x] Use Railway service-reference variables for MySQL; credentials are kept on Railway and are not copied into Vercel.
- [x] Production MySQL currently has no bookings, so no local JSON records were imported.
- [ ] Verify that a fictional booking, status change, payment update, pricing change, and deletion persist after an API redeploy.
- [ ] Enable and test database backups before recording real data. Railway’s MySQL guidance calls out backups and point-in-time recovery as production considerations. [Railway MySQL](https://docs.railway.com/databases/mysql)

### Temporary preview only: Railway Volume with the JSON store

If deployment needs to happen before the MySQL migration, use fictional records and one API instance:

- [ ] Add a Railway Volume to the API service.
- [ ] Make the JSON directory configurable (for example, `DATA_DIR`) rather than relying on a source-relative path.
- [ ] Mount the volume at the exact directory configured by `DATA_DIR`. Railway notes that relative application files live under `/app`; mounting a different directory will not persist `api/.data`. [Railway Volumes](https://docs.railway.com/volumes)
- [ ] Keep the API at one replica and manually verify the JSON files survive a redeploy.
- [ ] Back up the volume contents before code changes or data migration.

Railway Volumes provide durable files, but a file-backed JSON store still has no database transactions or safe concurrent multi-instance writes. Railway also documents deployment limitations for services with attached volumes. [Railway Volumes](https://docs.railway.com/volumes) · [Railway Volume reference](https://docs.railway.com/volumes/reference) · [Railway health checks](https://docs.railway.com/deployments/healthchecks)

## Deployment checklist

### Phase 1 — Prepare and confirm locally (complete)

- [x] Save/commit a known-good project version before changing deployment configuration.
- [ ] Back up `api/.data/` if the local records matter; this directory is not committed.
- [x] Select the persistence path: Railway MySQL.
- [x] Implement the API host/port, health check, same-origin API path, and Vercel rewrite.
- [x] Build Angular in static production mode; Vercel uses the generated browser artifacts.
- [ ] Exercise write endpoints using fictional records.
- [ ] Confirm there are no passwords, API keys, database URLs, or live customer data in tracked files.

### Phase 2 — Deploy the API on Railway (complete)

- [x] Create a Railway project and connect the service to the project GitHub repository at the repository root.
- [x] Set the service start command to `npm run start:api`. [Railway monorepo deployment](https://docs.railway.com/deployments/monorepo) · [Railway start command](https://docs.railway.com/deployments/start-command)
- [x] Railway installed dependencies and completed the deployment build.
- [x] Connect the MySQL service and its Railway reference variables.
- [x] Set Railway Healthcheck Path to `/api/health`.
- [x] Deploy, generate the HTTPS public domain, and verify the health route returns `200` with MySQL storage.
- [x] Verify public booking and pricing reads; the production bookings list is currently empty.
- [ ] Verify create, update, delete, payment, and data persistence using fictional records.

Railway can deploy services from a monorepo root and run a custom start command. [Railway monorepos](https://docs.railway.com/deployments/monorepo) · [Railway start command](https://docs.railway.com/deployments/start-command)

### Phase 3 — Deploy the frontend on Vercel (complete)

- [x] Import the same GitHub repository as a Vercel project with the repository root as the project root. Vercel detected Angular. [Vercel frontend frameworks](https://vercel.com/docs/frameworks/frontend) · [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [x] Use `npm run build` and output directory `dist/Laundry-Hub/browser`.
- [x] Deploy production at `https://wwlaundryhub.vercel.app`.
- [x] Route same-origin `/api/*` calls to Railway using `vercel.json`; no public API URL environment variable is needed.
- [x] Verify the app loads and the Vercel `/api/health` rewrite returns healthy MySQL status.
- [ ] Add custom domains later if wanted, after the default Vercel and Railway domains work. [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain) · [Railway domains](https://docs.railway.com/networking/domains/working-with-domains)

### Phase 4 — Verify the deployed system

- [x] Landing page loads over HTTPS.
- [x] Frontend uses the same-origin `/api` path, which Vercel rewrites to Railway (not localhost).
- [x] Health check and API reads return successful responses through Railway and the Vercel rewrite.
- [ ] Create, view, update, and delete a fictional booking.
- [ ] Move a booking through stations and confirm status history is retained.
- [ ] Record and undo a payment; verify the expected amount and payment method.
- [ ] Update pricing and verify estimates/reports use the saved rates.
- [ ] Verify report charts, CSV export, print report, and booking receipt from the deployed site.
- [ ] Confirm saved data survives Railway redeployment (and a database restart, when using MySQL).
- [ ] Check Vercel build logs, Railway deployment logs, and browser console for errors.
- [x] Vercel frontend API traffic uses a same-origin rewrite, avoiding browser CORS for this connection.
- [ ] Confirm no secrets or real customer records appear in source control, build output, or logs.

## Environment variable checklist

| Platform | Variable | Purpose | Secret? |
| --- | --- | --- | --- |
| Vercel | None required for the API URL | `vercel.json` rewrites same-origin `/api/*` requests to the public Railway domain | — |
| Railway | `PORT` | Port injected by Railway; API must listen on this value | No; platform-provided |
| Railway | `NODE_ENV=production` | Prevents production API from silently falling back to local JSON if database variables are missing | No |
| Railway | `CORS_ORIGINS` | Allowed direct browser origins; not needed for current Vercel server-side rewrite flow | No |
| Railway | `DATABASE_URL` or Railway MySQL reference variables | API-to-MySQL connection | **Yes** |
| Railway | `DATA_DIR` (only for Volume + JSON preview) | Absolute path mounted to the Railway Volume | No |

The Vercel deployment uses the routing rule in `vercel.json`, so no API base URL is injected into the browser bundle. Keep MySQL credentials exclusively in Railway variables. [Vercel environment variables](https://vercel.com/docs/environment-variables)

## Deployment risks and boundaries

- **Localhost URL:** production client code now uses relative `/api` requests; Vercel’s rewrite forwards them to Railway.
- **API binding:** port 3000 on `127.0.0.1` will not serve Railway public traffic; use the provided port and external bind address.
- **Data loss:** JSON in the container is not a persistent database; use MySQL or correctly mounted Volume storage.
- **Concurrency:** volume-backed JSON should remain a one-instance demo. Do not scale it to multiple API replicas.
- **Public access:** no login currently protects booking, pricing, and payment endpoints. Do not use real customer information until access control is added.
- **Preview origins:** the Vercel rewrite keeps preview requests same-origin too. If the app is changed to call Railway directly, add only the selected preview and production origins to `CORS_ORIGINS`.
- **Live data:** the production database currently has zero bookings. The app is deployed but needs records to demonstrate booking and reports workflows.

## Suggested order of work

1. Create fictional bookings and verify create, edit, station status, payment, pricing, and deletion against the deployed database.
2. Confirm data persists after an API redeploy.
3. Configure database backups and rehearse restore.
4. Add authentication before entering real shop or customer information.

## Official references

- [Angular deployment](https://angular.dev/tools/cli/deployment)
- [Angular hybrid rendering and static output](https://angular.dev/guide/hybrid-rendering)
- [Vercel frontend frameworks](https://vercel.com/docs/frameworks/frontend)
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)
- [Railway monorepo deployment](https://docs.railway.com/deployments/monorepo)
- [Railway start command](https://docs.railway.com/deployments/start-command)
- [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [Railway variables](https://docs.railway.com/variables)
- [Railway MySQL](https://docs.railway.com/databases/mysql)
- [Railway Volumes](https://docs.railway.com/volumes)
- [Railway domains](https://docs.railway.com/networking/domains/working-with-domains)
