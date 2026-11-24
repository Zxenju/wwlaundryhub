# Wash-up Wash-up Laundry Hub: Vercel + Railway Deployment Plan

**Status:** Deployment has not started. The API now supports MySQL mode, a health endpoint, Railway's injected port, CORS allowlists, and JSON import; the frontend URL/static build and Railway service variables are still pending.

This guide describes how to host the Angular user interface on Vercel and the Node.js API on Railway. It is based on the current repository structure and deployment platform documentation checked on **November 24, 2026**. Platform dashboards and plan limits can change, so recheck the linked official docs during deployment.

## Recommendation

Use two services:

1. **Vercel** serves the Angular frontend as static files.
2. **Railway** runs `api/server.mjs` as a long-lived Node.js web service.
3. **Railway MySQL** stores bookings and pricing for a durable shared application.

The app currently writes JSON files and does not connect to MySQL. For a short-lived classroom preview, a Railway Volume can keep those JSON files between restarts, but it is a temporary single-instance arrangement; the API should be migrated to MySQL before using real customer records or relying on concurrent updates.

## Architecture review

| Area | Current project state | Deployment implication |
| --- | --- | --- |
| Frontend | Angular 22 application at the repository root; Angular application builder currently uses `outputMode: "server"`. | Vercel can host Angular. Since this app does not need a Node SSR server, switch and verify a static production build before setting the Vercel output directory. [Angular deployment](https://angular.dev/tools/cli/deployment) · [Angular hybrid rendering](https://angular.dev/guide/hybrid-rendering) · [Vercel frontend frameworks](https://vercel.com/docs/frameworks/frontend) |
| Rendering and navigation | API data loads in `afterNextRender`; Angular routes are currently empty and the main modules are selected in the app shell. | Static hosting is suitable. Test page refresh at `/`. If real Angular URL routes are added later, configure the Vercel fallback/deep-link behavior and test direct links. [Angular deployment](https://angular.dev/tools/cli/deployment) |
| API client | `src/app/services/booking-api.service.ts` hardcodes `http://127.0.0.1:3000/api`. | Production browsers would try to contact each visitor’s own computer. Replace this with a configurable API base URL and set it to the Railway HTTPS domain. |
| API server | `api/server.mjs` now reads `PORT` and listens on `0.0.0.0`; default remains port 3000 locally. `GET /api/health` initializes/checks MySQL schema when configured. | The required Railway-compatible listener and health route are implemented; they still need a live Railway deployment check. [Railway health checks](https://docs.railway.com/deployments/healthchecks) |
| CORS | API CORS now uses a `CORS_ORIGINS` allowlist; local Angular origins are the default for local development. | Set production and selected Vercel Preview origins on the Railway API service and verify preflight requests. [Angular deployment: CORS](https://angular.dev/tools/cli/deployment) |
| Persistence | Local mode still uses `api/.data/*.json`. With MySQL connection variables, the API creates `bookings`, `booking_status_history`, and `app_settings` tables and uses MySQL. | MySQL persistence code and an idempotent JSON importer are implemented. Railway variables, database connectivity, migration, and persistence after redeploy still need verification. [Railway MySQL](https://docs.railway.com/databases/mysql) |
| Authentication | The API has no staff login or authorization layer. | Do not put real customer contact details or sensitive business data on a publicly reachable unauthenticated API. Add authentication/authorization before real operational use; use fictional data for a public class demo until then. |
| API endpoints | `GET /api/bookings`, `POST /api/bookings`, `PUT /api/bookings/:id`, `DELETE /api/bookings/:id`, `PATCH /api/bookings/:id/payment`, `GET /api/pricing`, `PUT /api/pricing`. | Preserve these contracts while deploying; exercise each one from the deployed frontend and check API/browser logs. |

### API fields currently used

Bookings include fields such as `id`, `customerName`, `contactNumber`, `serviceId`, `rateType`, `weightKg`, `express`, `bookingDate`, `pickupDate`, `notes`, `status`, `statusHistory`, `payment`, `charge`, `createdAt`, `updatedAt`, `completedAt`, and `demoRecord`. Pricing contains `services`, `express`, and `weightLimits`. Keep the existing model and API response shape compatible when moving the JSON records to MySQL.

## Required application changes before deployment

These are implementation tasks, not settings to guess during hosting:

- [ ] **Static Angular output:** change the application build to `outputMode: "static"`, then run a production build locally and inspect the generated `dist/Laundry-Hub/browser` directory. Angular’s static hosting output is the `browser` directory; confirm the exact output for this build before entering it in Vercel. [Angular deployment](https://angular.dev/tools/cli/deployment)
- [ ] **Production API URL:** remove the hardcoded localhost URL from `BookingApiService`. Introduce a public configuration value for the API base URL and use the Railway URL in the production frontend build. A browser-visible API URL is configuration, not a secret. Vercel environment variables are available during builds, and changing them requires a new deployment. [Vercel environment variables](https://vercel.com/docs/environment-variables)
- [x] **Railway host and port:** API reads `process.env.PORT` and listens on `0.0.0.0`; live Railway verification remains.
- [x] **Health endpoint:** API implements `GET /api/health`; configure Railway’s Healthcheck Path to `/api/health` and verify it on deployment. Railway uses health checks during deployment startup. [Railway health checks](https://docs.railway.com/deployments/healthchecks)
- [x] **CORS allowlist support:** API reads `CORS_ORIGINS`, handles `OPTIONS`, and rejects unlisted preflight origins. Set the production origins on Railway and verify from the deployed frontend.
- [x] **MySQL persistence path:** API creates booking, status history, and pricing/settings tables when Railway MySQL variables are present. Set Railway service-reference variables, then verify connectivity and redeploy persistence.
- [ ] **Migrate local records if needed:** export/back up local JSON first, then run the import command with Railway MySQL connection variables. Existing booking IDs are not overwritten; existing pricing is not replaced unless `--replace-pricing` is passed.
- [ ] **Error handling and startup:** make API startup fail clearly if required database configuration is absent; log readiness without printing passwords or customer data.
- [ ] **Security for real users:** add staff authentication and authorization before storing live customer data. Add backups and a recovery procedure for the database.

### Static build note

The current `angular.json` includes `server: "src/main.server.ts"`, `ssr.entry`, and `outputMode: "server"`. The planned Vercel target is static, so verify Angular’s static output before removing or changing server-related configuration. Do not deploy the SSR server bundle to Vercel’s static output directory. Angular documents that `outputMode: "static"` does not require a Node server to serve the app. [Angular hybrid rendering](https://angular.dev/guide/hybrid-rendering)

## Persistence path decision

### Recommended: Railway MySQL for shared use

- [ ] Create a Railway MySQL service and keep it private to the Railway project.
- [x] Add database tables and update the API to use MySQL for booking records, status history, payment fields, and pricing.
- [ ] Use Railway service-reference variables or the provided MySQL connection variables; do not commit credentials or copy secrets into Vercel.
- [ ] Back up/export the existing local JSON data before importing anything. Decide whether the fictional seed bookings should be preserved, replaced, or omitted.
- [ ] Verify that a booking, status change, payment update, pricing change, and deletion persist after an API redeploy.
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

### Phase 1 — Prepare and confirm locally

- [ ] Save/commit a known-good project version before changing deployment configuration.
- [ ] Back up `api/.data/` if the local records matter; this directory is not committed.
- [ ] Select the persistence path: **MySQL recommended** for shared use, or **Volume + JSON** for a temporary fictional-data preview.
- [ ] Implement the required API URL, host/port, CORS, and health-check changes.
- [ ] Build Angular in static production mode and confirm Vercel will receive the browser artifacts.
- [ ] Start the API locally and check all current API endpoints, including `OPTIONS` requests from the local Angular origin.
- [ ] Confirm there are no passwords, API keys, database URLs, or live customer data in tracked files.

### Phase 2 — Deploy the API on Railway

- [ ] Create a Railway project and add a service connected to the project GitHub repository. The repository root is the Angular project and API together, so use repository root `/` for the service.
- [ ] Set the service start command to `npm run start:api` (the script already exists in `package.json`). Railway supports overriding the start command for services in a shared repository. [Railway monorepo deployment](https://docs.railway.com/deployments/monorepo) · [Railway start command](https://docs.railway.com/deployments/start-command)
- [ ] Keep the install command as the standard lockfile-based install (`npm ci`) if Railway does not select it automatically.
- [ ] Add the chosen persistence service (MySQL or temporary Volume) and set only required variables.
- [ ] Set `CORS_ORIGINS` to the eventual Vercel origin(s).
- [ ] Set Railway Healthcheck Path to `/api/health` after the endpoint exists.
- [ ] Deploy, inspect logs, generate an HTTPS public domain for the API, and verify `GET https://<railway-domain>/api/health` returns `200`.
- [ ] Verify `GET https://<railway-domain>/api/bookings` and `/api/pricing` return expected JSON without browser CORS errors.

Railway can deploy services from a monorepo root and run a custom start command. [Railway monorepos](https://docs.railway.com/deployments/monorepo) · [Railway start command](https://docs.railway.com/deployments/start-command)

### Phase 3 — Deploy the frontend on Vercel

- [ ] Import the same GitHub repository as a Vercel project.
- [ ] Set **Root Directory** to the repository root (the directory containing `package.json` and `angular.json`). Vercel supports Angular and can detect framework settings; confirm its detected settings before overriding them. [Vercel frontend frameworks](https://vercel.com/docs/frameworks/frontend) · [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build)
- [ ] Use `npm ci` for install and `npm run build` for the production build.
- [ ] Set/confirm the output directory as `dist/Laundry-Hub/browser` only after confirming that exact folder is produced by the static build. Angular’s static deployment target is `dist/<project>/browser`. [Angular deployment](https://angular.dev/tools/cli/deployment)
- [ ] Add the public API base URL through the frontend configuration/build process, for example `https://<railway-domain>/api`. Do not put database credentials or other secrets in an Angular environment value; browser bundle values are visible to users.
- [ ] Deploy a Vercel Preview first. Open the app and check the browser Network panel for requests to the Railway domain, HTTP errors, and CORS failures.
- [ ] After Preview passes, configure the production domain and matching API CORS allowlist, then promote/deploy Production.
- [ ] Add custom domains later, after the default Vercel and Railway domains work. [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain) · [Railway domains](https://docs.railway.com/networking/domains/working-with-domains)

### Phase 4 — Verify the deployed system

- [ ] Landing page loads over HTTPS and survives a browser refresh.
- [ ] Frontend API requests go to the Railway domain, not localhost.
- [ ] Health check and API reads return successful responses.
- [ ] Create, view, update, and delete a fictional booking.
- [ ] Move a booking through stations and confirm status history is retained.
- [ ] Record and undo a payment; verify the expected amount and payment method.
- [ ] Update pricing and verify estimates/reports use the saved rates.
- [ ] Verify report charts, CSV export, print report, and booking receipt from the deployed site.
- [ ] Confirm saved data survives Railway redeployment (and a database restart, when using MySQL).
- [ ] Check Vercel build logs, Railway deployment logs, and browser console for errors.
- [ ] Confirm CORS blocks a test origin that is not on the allowlist.
- [ ] Confirm no secrets or real customer records appear in source control, build output, or logs.

## Environment variable checklist

| Platform | Variable | Purpose | Secret? |
| --- | --- | --- | --- |
| Vercel | `API_BASE_URL` (or equivalent Angular build setting) | Public Railway API URL, such as `https://<service>.up.railway.app/api` | No; embedded in client code |
| Railway | `PORT` | Port injected by Railway; API must listen on this value | No; platform-provided |
| Railway | `NODE_ENV=production` | Prevents production API from silently falling back to local JSON if database variables are missing | No |
| Railway | `CORS_ORIGINS` | Exact allowed Vercel production and selected preview origins | No |
| Railway | `DATABASE_URL` or Railway MySQL reference variables | API-to-MySQL connection | **Yes** |
| Railway | `DATA_DIR` (only for Volume + JSON preview) | Absolute path mounted to the Railway Volume | No |

Vercel variables are available during the build or supported runtime; Angular’s browser code does not automatically read server environment variables after deployment. Wire the public API URL into the Angular build/configuration explicitly, then redeploy after changing it. [Vercel environment variables](https://vercel.com/docs/environment-variables)

## Deployment risks and boundaries

- **Localhost URL:** production browser requests will fail until the hardcoded URL is replaced.
- **API binding:** port 3000 on `127.0.0.1` will not serve Railway public traffic; use the provided port and external bind address.
- **Data loss:** JSON in the container is not a persistent database; use MySQL or correctly mounted Volume storage.
- **Concurrency:** volume-backed JSON should remain a one-instance demo. Do not scale it to multiple API replicas.
- **Public access:** no login currently protects booking, pricing, and payment endpoints. Do not use real customer information until access control is added.
- **Preview origins:** Vercel preview URLs may differ from the production domain. Decide which preview origins should be trusted and avoid an unrestricted wildcard.
- **Static build output:** confirm actual generated folders and a successful production build before setting Vercel’s output directory.

## Suggested order of work

1. Pick data path (recommended: MySQL) and implement the API’s database persistence.
2. Make API host/port, CORS, health check, and frontend API URL configurable.
3. Change Angular to static output and confirm production build artifacts.
4. Deploy Railway API and verify health/API endpoints.
5. Deploy Vercel Preview and verify browser-to-API flows.
6. Add production domains and tighten CORS.
7. Add authentication before using real shop/customer data; configure backups and rehearse restore.

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
