# Wash-up Wash-up Laundry Hub

A staff-facing Angular laundry booking manager for the Wash-up Wash-up Laundry Hub college final project. It records bookings, tracks laundry status, and shows a transparent price estimate only when the shop's billing unit has been confirmed.

## Requirements

- Node.js 22 or later
- npm (the existing project uses npm)

No new npm dependency is needed.

## Run the application

Open two terminals in the `Laundry-Hub` project folder.

Terminal 1 — start the writable local API:

```powershell
npm run start:api
```

The API listens at `http://127.0.0.1:3000`. On first start it writes fictional sample bookings and the default pricing configuration to `api/.data/`. That directory is ignored by Git and retains changes after the API restarts.

Terminal 2 — start Angular:

```powershell
npm start
```

Open `http://localhost:4200`. Keep the API terminal running while using the app. If the API is unavailable, the dashboard displays an error and a retry action.

To restore the initial fictional records and sign-rate defaults, stop the API and remove only these generated files if they exist:

- `api/.data/bookings.json`
- `api/.data/pricing.json`

The API recreates them on the next start.

## How to use the app

- **Overview:** see API-backed booking totals, jobs in progress, ready-for-pickup count, today's recorded revenue, and recent records. The initial records are explicitly marked as fictional demo data.
- **Bookings:** search by customer, phone, or service; filter by status; view or edit a booking; change its status; or delete it after confirming.
- **New booking:** enter the customer, service, rate type, weight, express choice (only if staff enables it), dates, and notes. Review the estimate before saving.
- **Pricing setup:** edit service names, labels, rates, billing units, express option, and demo weight validation limits. Save to persist changes through the local API.

The shop sign shows Wash / Dry / Fold / Repeat at ₱55 promo and ₱60 regular, Wash / Dry at ₱55 promo and ₱65 regular, and Drop-off at ₱30. These values are seeded in one editable pricing source, [`api/default-pricing.json`](./api/default-pricing.json), and can also be updated in the app's Pricing setup screen.

**Business details still requiring confirmation:** whether each sign rate is per kilogram, per load, or another unit; promo eligibility and terms; the Drop-off rate's billing basis and coverage; allowed weight limits; and whether express service is offered and what it costs. Default billing units are deliberately “unit confirm with shop,” so the app displays the rate but does not invent a total. If staff confirm a unit, the app calculates transparently (for example, a per-kilogram rate is multiplied by the entered kilograms). The initial 0.1–30 kg validation limits are demo settings, not shop policy. Express is disabled and has no surcharge until staff configure it.

The business contact shown in the app is **0945-881-9148** and the supplied sign says **Open Daily**. The location pin is at 14.8019605, 120.9241976. No other opening hours, service terms, or customer details are inferred. Sample customer names and contact numbers are fictional.

## Research and final submission

- [Philippine express laundry research](./docs/research/philippine-laundry-express-service.md) records public shop examples and explains why the seeded Express option stays disabled until Wash-up confirms its own terms.
- [Final project submission readiness](./docs/submission-readiness.md) maps the assignment requirements to the current project, lists the required PDF sections, and provides a test matrix for the group to run and record.

## Custom validators

[`src/app/validators/booking.validators.ts`](./src/app/validators/booking.validators.ts) contains the Reactive Forms validators:

- `philippineContactNumber` accepts common local `0…` and international `+63…` formats, with optional spaces, hyphens, and parentheses.
- `weightWithinLimits` requires a positive weight inside the current configurable demo range.
- `bookingDateNotInPast` rejects past booking dates.
- `pickupDateOnOrAfterBooking` validates the relationship between booking and pickup dates.

The booking form shows field-level messages and refuses invalid submissions. The API also checks required booking fields, configured weights, statuses, and dates before writing a record.

## Project structure

- `src/app/components/` — overview, booking list, booking form, booking details, and pricing setup components.
- `src/app/services/booking-api.service.ts` — injected Angular `HttpClient` service for API retrieval and mutations.
- `src/app/services/pricing.service.ts` — charge estimate and billing-unit presentation logic.
- `src/app/validators/` — custom booking validators.
- `api/server.mjs` — dependency-free local JSON API with persistent booking and pricing data.
- `api/default-pricing.json` — single seeded pricing configuration.

## Verify

```powershell
npm run build
npm test
```

## Official Angular references

- [Reactive forms](https://angular.dev/guide/forms/reactive-forms)
- [Form validation](https://angular.dev/guide/forms/form-validation)
- [Angular `ValidatorFn` API](https://angular.dev/api/forms/ValidatorFn)
- [HTTP client](https://angular.dev/guide/http)
- [Dependency injection](https://angular.dev/guide/di)
- [Components](https://angular.dev/guide/components)
- [Template control flow (`@if`, `@for`, `@switch`)](https://angular.dev/guide/templates/control-flow)
