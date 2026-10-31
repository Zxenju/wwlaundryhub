# Final project submission readiness

This guide maps the Angular finals brief to the current Wash-up Wash-up Laundry Hub project. The app and source are present, but the group still needs to run and record its test cases, add team information and screenshots, and export the final documentation as a PDF.

## Project scope

The assigned scenario is a Laundry Booking Manager. The app records customer and booking details, calculates charges from configured shop rates, tracks work through laundry stations, and persists bookings and pricing through a writable local API. The supplied shop sign confirms displayed rates, but it does not confirm rate billing units, promotion terms, weight limits, or Express service terms. The app keeps those details configurable and labels unconfirmed demo settings instead of treating them as shop policy.

## Requirements and code map

| Brief requirement | Current implementation |
| --- | --- |
| Four or more meaningful Angular components | `src/app/components/` contains dashboard, booking list, booking form, booking detail, and pricing settings components. |
| Interpolation, property and event binding, two-way binding | Templates use `{{ }}`, property and event bindings; pricing settings use `[(ngModel)]`. |
| `@if`, `@for`, and `@switch` | Used in `src/app/app.html` and component templates. |
| Injected service and HTTP API operations | `src/app/services/booking-api.service.ts`; API routes are implemented in `api/server.mjs`. |
| Observables | API calls use `HttpClient` and `.subscribe()` in `src/app/app.ts`. |
| CRUD, search/filter, and persistence | Booking list and API support create, read, update, delete, search/filter, and JSON file persistence. |
| Loading, success, validation, empty and error states | Dashboard and forms provide loading, toast, field validation, empty-state, and API error feedback. |
| Assigned exploration: custom validators | `src/app/validators/booking.validators.ts` validates Philippine contact numbers, names, configured weight range, booking dates, and pickup-date relationship. Tests are in `src/app/validators/booking.validators.spec.ts`. |
| Charge calculation and Express option | `src/app/services/pricing.service.ts`; Express is disabled in `api/default-pricing.json` until the shop confirms availability, turnaround, and fees. |

## API reference

Start the API in one terminal with `npm run start:api` and Angular in another with `npm start`. The API listens at `http://127.0.0.1:3000`.

| Method and path | Purpose |
| --- | --- |
| `GET /api/bookings` | Return bookings and a demo-data flag. |
| `POST /api/bookings` | Validate and create a booking; returns `201` and the created record. |
| `PUT /api/bookings/:id` | Validate and update a booking; recalculates the charge when pricing inputs change. |
| `DELETE /api/bookings/:id` | Delete a booking. |
| `GET /api/pricing` | Return service rates, Express configuration, and weight limits. |
| `PUT /api/pricing` | Validate and save pricing configuration. |

Booking fields include `customerName`, `contactNumber`, `serviceId`, `rateType`, `weightKg`, `express`, `bookingDate`, `pickupDate`, `notes`, `status`, and a calculated `charge`. The API assigns the record `id`, timestamps, and demo flag. Do not put real customer information into screenshots or the submitted sample data.

## Test matrix to run and record

The brief requires at least ten test cases and results. The following cases cover normal actions, invalid input, persistence, API failure, and the assigned validators. Record the date, actual result, pass/fail, and evidence for each; these are planned checks, not claimed results.

| # | Test | Expected result | Result |
| --- | --- | --- | --- |
| 1 | Load the app with the API running. | Bookings and pricing load; loading state clears. | To run |
| 2 | Create a valid booking with confirmed billing unit. | Booking saves and estimate/charge is shown. | To run |
| 3 | Search by customer name or contact number. | Matching bookings remain visible. | To run |
| 4 | Filter bookings by status. | Only bookings in the chosen status appear. | To run |
| 5 | Edit a booking and save. | Changes persist and the record keeps its ID. | To run |
| 6 | Delete a booking and confirm; repeat and cancel. | Confirm removes it; cancel leaves it unchanged. | To run |
| 7 | Enter zero or below-minimum weight. | Weight validator blocks save and explains the range. | To run |
| 8 | Enter above-maximum weight. | Weight validator blocks save. | To run |
| 9 | Enter a malformed Philippine contact number. | Contact validator blocks save. | To run |
| 10 | Enter a booking date in the past. | Booking-date validator blocks save. | To run |
| 11 | Set pickup before booking date. | Cross-field validator blocks save. | To run |
| 12 | Save a booking, refresh the page, and reload the list. | API-backed booking remains present. | To run |
| 13 | Stop the API and reload the app, then restore the API. | Error and retry state appear; app recovers when API returns. | To run |
| 14 | Leave Express disabled and attempt to select it. | Booking form does not offer it; API rejects an Express request if submitted directly. | To run |

The repo includes unit tests for validators, price calculations, and app setup. Manual API, refresh, search, and failure-state checks above still need to be performed and recorded by the group.

**Automated run on 31 October 2026:** all 3 test files passed (10 tests). In this Windows environment, the default sandbox temp directory caused an `ENOENT` in `app.spec.ts`; redirecting `TEMP` and `TMP` to a writable project-local directory fixed it. To reproduce in PowerShell from `Laundry-Hub`:

```powershell
$testTemp = Join-Path (Get-Location) '.test-tmp'
New-Item -ItemType Directory -Force -Path $testTemp | Out-Null
$env:TEMP = $testTemp
$env:TMP = $testTemp
npm test -- --watch=false
```

The production build also completes. Record the manual results in the PDF; do not present the planned test matrix as already executed.

## PDF documentation outline

1. Cover page: project title, group number, member names, subject, and submission date.
2. Overview: laundry-shop problem, intended staff users, objectives, scope, and limitations.
3. Interface plan: initial sketch and clean screenshots of the finished responsive app.
4. Application structure: components, services, validators, API files, and responsibilities.
5. Topic mapping: explain data binding, control flow, DI, HTTP, Observables, forms, and persistence with actual file references.
6. API documentation: endpoints, fields, methods, and sample request/response bodies.
7. Custom-validator exploration: source consulted, small experiment, what failed/worked, how it was integrated, and why.
8. Test results: at least ten completed cases, including the cases above, with actual pass/fail results.
9. Installation guide: exact Node/npm requirements and the two-terminal startup steps from this README.
10. Member contributions, reflections, and references.

Before exporting to PDF, fill in team/course details and contributions, replace or remove all demo records, capture screenshots with fictional data, run the test matrix, and check that every filename and command still matches the submitted source.

## Demonstration flow

For the assigned 12–15 minute presentation: introduce the staff workflow; create, view, search, edit, and delete a booking; refresh to prove persistence; demonstrate invalid contact, weight, and date inputs; show API error and recovery; then explain how the custom validators work and where each lives in the code. Have every member ready to explain their contribution and the main data path through the app.

## Next iteration ideas

1. Add booking status history with timestamps and staff initials, then show the history in booking details. This makes the intake-to-pickup process easier to explain and audit.
2. Add a daily due-today and pickup-ready queue, using existing pickup dates and statuses.
3. Add confirmed Express capacity, cutoff, and promised completion time only after Wash-up provides its actual operating terms. See the [Philippine express research](./research/philippine-laundry-express-service.md); competitor examples must not be copied into Wash-up pricing.

Complete the required app, documentation, and demonstration before adding optional features. A narrow feature that the group can test and defend is stronger than a larger feature with unverified business rules.
