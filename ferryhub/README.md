# FerryHub: passenger site, staff portal and API

Static site (HTML/CSS/vanilla JS) + Vercel serverless functions in `/api` + Supabase (Postgres and private file storage).

## 1. Supabase (once)
1. Supabase dashboard > SQL Editor > New query > paste all of `supabase/01_schema.sql` > Run. It is safe to run twice.
2. Check: Table Editor shows `ports`, `schedule_templates`, `slots`, `registrations`, `passengers`, `announcements`, `registration_counters`; Storage shows a private bucket `ids`.
3. Project Settings > API keys: copy the **secret** key (`sb_secret_...`). Never put it in code or share it.

## 2. GitHub + Vercel
1. Put this folder in a GitHub repository (the `.gitignore` already skips `node_modules` and secrets).
2. Vercel > Add New > Project > import the repository. Framework preset: **Other**. Leave Build Command and Output Directory empty.
3. Before the first deploy, Settings > Environment Variables (Production, Preview, Development):
   - `SUPABASE_URL` = `https://lusaxphiqliaopjsrxzi.supabase.co`
   - `SUPABASE_SECRET_KEY` = your secret key
4. Deploy. Open the site, make a test registration, scan the QR with a phone.
5. Optional: add your photo as `assets/images/hero.jpg` (until then a sky-to-sea gradient shows).

## 3. How it works
- Booking: `/api/slots` returns open times for the chosen port and date (from `schedule_templates` / `slots`). Arrival is always the other port.
- Registration: `/api/register` validates everything again on the server, then one database transaction creates the registration (number `RN` + MM + YY + sequence, e.g. `RN112601`) and its passengers. A repeat with the same `submission_key` returns the same record, so refresh or double-click never duplicates. IDs go through `/api/upload-id` into the private `ids` bucket.
- QR code: contains only `https://<your-site>/pages/ticket.html?t=<long random token>`. `/api/ticket` returns a limited view (names, categories, ports, schedule, registered date). Email, address and ID files are never returned publicly.
- Registrations do not use seats. Seat counts change only when staff validate tickets (Stage 2).

## 4. Announcements (future integration)
`js/config.js` > `ANNOUNCEMENTS`. Default `source: 'api'` reads Active rows from the `announcements` table. To use another system set `source: 'url'` and `url` to a JSON endpoint (CORS enabled) returning an array, or `{ "announcements": [...] }`, of
`{ id, title, body, imageUrl, publishedAt, status }`. Only `status` "Active" (any case) is shown. Titles and bodies are shown as plain text.

## 5. Address data
`data/ph/` is split from https://github.com/wilfredpine/philippine-address-selector (MIT). One file per province (cities and barangays) loads when a province is chosen.


# Stage 2: staff portal (`/staff/`)

Open `https://<your-site>/staff/`. Staff and Admin log in with a username and password.

## One-time setup
1. Supabase > SQL Editor > paste all of `supabase/02_staff.sql` > Run (after `01_schema.sql`).
2. Create the first admin login: Supabase > Authentication > Users > Add user > Create new user. Enter an email and a password and tick **Auto Confirm User**.
3. Make that user an admin: SQL Editor > run this, with YOUR email in place of the example:
   `insert into public.profiles (id, username, display_name, role) select id, 'admin', 'Administrator', 'admin' from auth.users where email = 'YOUR-ADMIN-EMAIL@example.com';`
4. Vercel > Settings > Environment Variables: add `SUPABASE_PUBLISHABLE_KEY` (your `sb_publishable_...` key). Then Deployments > Redeploy. (`SUPABASE_URL` and `SUPABASE_SECRET_KEY` stay as they are.)
5. Log in at `/staff/` on the **Admin** tab with username `admin` and the password from step 2. Create staff logins under Account Management and pick each one's port.

Optional variable: `STAFF_EMAIL_DOMAIN` (default `staff.ferryhub.app`). Staff logins are stored as `<username>@<that domain>` inside Supabase Auth. If Supabase refuses to create a staff account because of the email, set this to a domain you control.

## Rules built in
- Staff see and change only their own port. Admin sees both and picks a port at the top.
- Validate Ticket: own port only, only on the travel date, only once. It adds the booking's passengers to that departure's booked count and is blocked when it would exceed capacity.
- Default departure times (Manage Schedule > Default departure times) are what passengers can book. A time with upcoming registered passengers cannot be moved or switched off. A slot can still be cancelled for a date, or a one-off time added.
- Registering does not take seats. Seats count only when a ticket is validated.
- Announcements are shared by both ports. Active ones appear on the passenger site.
- Reserved, not built: Trip Information Records, Register Passenger (shown as "Under Progress").
