# FerryHub Admin System

A role-based Admin branch inside the Staff System. Same stack (HTML, CSS, vanilla JS, no build step) and same look.
Run it the same way: `python3 -m http.server 8000` in this folder, then open http://localhost:8000.

## Logins (prototype only, not secure)

| Role  | Username | Password   | Opens                          |
|-------|----------|------------|--------------------------------|
| Admin | `toby`   | `11111111` | `pages/admin-dashboard.html`   |
| Staff | `admin`  | `12345678` | `pages/passenger-records.html` |

The login page has an Admin tab and a Staff tab. Each tab accepts only its own accounts, so Admin credentials fail
on the Staff tab and the reverse. Page guards also stop a Staff session opening Admin pages and an Admin session
opening Staff pages. Staff accounts created in Account Management work on the Staff tab; disabled or deleted accounts
cannot log in and lose access on their next page load.

## New files

| File | Purpose |
|------|---------|
| `pages/admin-dashboard.html`, `js/admin/dashboard.js` | Dashboard with four category tabs and the period filter |
| `pages/admin-bookings.html`, `js/admin/bookings.js` | Booking Records (search, status pills, port and date filters, sorting, paging, details) |
| `pages/admin-accounts.html`, `js/admin/accounts.js` | Account Management (add, update/reset password, delete, search) |
| `js/admin/data-api.js` | `AdminAPI.getBookings()`: the one place booking data enters. Returns `[]` until connected |
| `js/admin/analytics.js` | Aggregation: KPIs, monthly series, heatmap, schedule demand, revenue by category, date ranges |
| `js/admin/forecast.js` | k-NN regression: preprocess, chronological split, predict, MAE/RMSE, recursive forecast |
| `js/admin/charts.js` | Dependency-free SVG line, bar and heatmap charts |
| `js/accounts-store.js` | Staff account store (salted PBKDF2 hashes) and audit log. Backend seam |
| `css/admin.css` | Admin styles |
| `assets/images/admin-logo.png`, `assets/icons/admin-*.svg` | Admin logo and sidebar icons |

Changed existing files: `js/auth.js` (two roles, guards), `js/navigation.js` (role-aware sidebar), `index.html`
(Admin tab enabled), and the three Staff pages only gained a `<script>` tag for `accounts-store.js`.

## Layers

`AdminAPI` (data) -> `Analytics` (aggregation) -> `Forecast` (prediction) -> `Charts` (markup) -> page controllers.
Charts never query data; controllers never calculate.

## Connecting the booking database

1. Replace the body of `AdminAPI.getBookings()` in `js/admin/data-api.js` with a request to your backend.
2. Return one object per booking:

| Field | Type | Meaning | Mockup column |
|-------|------|---------|---------------|
| `regNo` | string, unique | Booking / Registration No. | Registration No. |
| `pax` | integer >= 1 | Passengers in the booking | Pax |
| `port` | string | Port | Port |
| `departDate` | `YYYY-MM-DD` | Schedule date (Manila) | Schedule |
| `departTime` | `HH:MM` 24h | Schedule time | Schedule |
| `registeredAt` | ISO 8601 with offset | Registration timestamp | Registration date |
| `totalFee` | number >= 0 | Total fee in PHP | Total fee |
| `status` | `Confirmed` / `Verified` / `Cancelled` | Booking status | Status |
| `passengers` | `[{ category, fare }]` (optional) | Per-passenger fare, needed for revenue by category | none |

3. Reload. KPIs, charts, forecast and the Booking Records table fill in with no other changes.

Rules the code applies: records with a missing or invalid field, or a repeated `regNo`, are skipped and counted in a
notice. Cancelled bookings appear in Booking Records but are excluded from every KPI and chart. Revenue is the sum of
`totalFee` for Confirmed and Verified bookings (change `COUNTED_STATUSES` in `data-api.js` if your payment rule
differs). Bookings are dated by `registeredAt`; schedule demand uses `departDate`/`departTime`.

## Dates

All dates are Asia/Manila calendar dates. Weekly = Monday to Sunday, Monthly = calendar month, Yearly = calendar year,
Custom = any inclusive range. KPI change compares with the previous equivalent period. Monthly charts show the
months of the range up to the current month, or the last 12 months when the range is shorter than 3 months.
The forecast always uses all complete months of history and ignores the filter.

## Forecast

k-NN regression (k up to 5) on monthly bookings. Features: previous 3 months (standardized with training statistics)
plus month of year. The most recent 20% of months (at least 2) are held out for testing, so there is no leakage.
MAE and RMSE come from that held-out period. The final forecast refits on all history and predicts month by month.
Needs at least 12 complete months; otherwise an empty state explains why. No forecast values are hard-coded.

## Account Management

Admin sees Staff accounts only (ID, username, role, date created, last login, status, port). Passwords are stored as
salted PBKDF2 hashes, but all of this lives in browser storage, which cannot be made secure. Create, update, reset
password and delete write to an audit log (`Audit.list()` in `accounts-store.js`; no screen for it yet).

## Before going live

Move authentication, role checks, account storage, hashing and the audit log to a server. Frontend guards only keep
honest users in their lane. Replace `AccountStore`, `Audit`, `Auth.USERS.admin` and `AdminAPI` with API calls; the
pages call only those objects.
