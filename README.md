# Wash-up Wash-up Laundry Hub

A staff-facing Angular app for creating laundry bookings, tracking work through shop stations, managing rates, and recording payments.

## Requirements

- Node.js 22 or later
- npm

The Angular app talks to a Node.js API. By default, local development stores bookings and pricing as JSON under `api/.data/`. When `DATABASE_URL` or Railway's `MYSQLHOST`, `MYSQLUSER`, and `MYSQLDATABASE` variables are present, the API creates its MySQL tables and reads/writes through MySQL instead.

## Run locally

Open two terminals in the `Laundry-Hub` folder.

Terminal 1 — API:

```powershell
npm run start:api
```

Terminal 2 — Angular:

```powershell
npm start
```

Open `http://localhost:4200`. Keep both processes running. If port 3000 is already in use, use the existing API terminal or stop that process before starting another copy.

On first local JSON-backed API start, the app creates fictional demo bookings and a pricing file from `api/default-pricing.json`. Local data is ignored by Git in `api/.data/`. MySQL mode starts with default pricing and an empty booking table; import local records with `npm run db:import-json` after setting the MySQL connection variables. Existing booking IDs are never replaced. Existing database pricing is left unchanged by default; use `npm run db:import-json -- --replace-pricing` if the database still has only its initial defaults and you want to copy the local pricing file.

## Main features

- **Overview:** current station counts, due pickups, ready-for-pickup work, and recent bookings.
- **Bookings:** search by customer, phone, or service; filter by status; create, edit, view, and delete bookings; and change station status.
- **Booking details:** price breakdown, status history, printable receipt, and payment recording.
- **Payment tracking:** mark the full configured booking charge paid by Cash, GCash, Maya, Bank transfer, or Other; the API records the method and timestamp. Payment is recorded manually; there is no payment gateway or partial-payment ledger.
- **Reports:** filter by date range, view booking and service trends, compare estimated charges with payments recorded by payment date, print the report, and export the selected period as Excel-compatible CSV.
- **Pricing setup:** manage per-kilogram service rates, promo/regular labels, Express configuration, and demo weight validation limits.
- **Custom validators:** validate customer name/contact, weight range, booking date, and pickup date.

## Default pricing and limitations

`api/default-pricing.json` seeds the rates shown on the Wash-up sign:

| Service | Promo | Regular | Configured billing basis |
| --- | ---: | ---: | --- |
| Wash / Dry / Fold / Repeat | ₱55 | ₱60 | Per kilogram |
| Wash / Dry | ₱55 | ₱65 | Per kilogram |
| Drop-off | — | ₱30 | Per kilogram |

The app calculates estimates from these editable settings. Express is disabled by default. The default weight validation range of 0.1–30 kg is a configurable project setting.

The API supports local JSON storage for development and MySQL storage when configured. The Railway deployment still needs its MySQL variables and a Vercel-origin `CORS_ORIGINS` allowlist. Demo names and numbers are fictional. Payment records represent staff-entered full payments and do not connect to a bank or e-wallet. The API does not yet provide staff authentication; do not use real customer data until access control is added.

## API

Local base URL: `http://127.0.0.1:3000/api`. Production should use the Railway HTTPS API domain.

`GET /api/health` is available for deployment health checks. It verifies that the configured MySQL schema can be initialized before returning success.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/bookings` | List bookings and demo-data flag |
| POST | `/bookings` | Create a booking |
| PUT | `/bookings/:id` | Update a booking and its status |
| PATCH | `/bookings/:id/payment` | Record a full payment or mark it unpaid |
| DELETE | `/bookings/:id` | Delete a booking |
| GET | `/pricing` | Read service pricing and weight limits |
| PUT | `/pricing` | Save pricing configuration |
| GET | `/health` | API/database health check |

## Project structure

- `src/app/components/` — dashboard, booking list/form/detail, daily report and pricing settings.
- `src/app/services/booking-api.service.ts` — Angular `HttpClient` calls to the local API.
- `src/app/services/pricing.service.ts` — charge estimate calculation.
- `src/app/validators/booking.validators.ts` — custom reactive-form validators.
- `src/app/models/booking.ts` — booking, pricing, status-history, and payment types.
- `api/server.mjs` — API routes, CORS, health check, and Railway-compatible host/port binding.
- `api/mysql-store.mjs` — MySQL tables and persistence; JSON files remain the local fallback.
- `api/import-json-to-mysql.mjs` — repeat-safe importer for local JSON bookings and pricing.
- `api/default-pricing.json` — seed rates and settings.
- `docs/` — research and submission-readiness notes.

## Verify

```powershell
npm run build
npm test -- --watch=false
```

For the final submission, include the Angular source, `package.json`, `package-lock.json`, API source and default seed pricing. Exclude `node_modules`, generated `dist`, local `api/.data`, passwords, and secrets. Replace demo records with safe fictional examples before capturing screenshots.
