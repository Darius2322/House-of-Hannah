# House of Hannah — Laundry Web App

Booking, tracking, and staff management for **House of Hannah — All Laundry Services**.
React 18 + Vite on the front end; Supabase (Postgres, Auth, Storage, Edge Functions) behind it.

**Public site:** Home · Services · Price List · Book (multi-step, pickup/drop-off, GPS pin) · Confirmation with QR ticket ·
Track Request (timeline, PDF ticket/receipt, return preference, review) · Gallery · About · Pickup & Delivery · Reviews ·
Contact + feedback/complaints · FAQ · Privacy · Terms · site search · installable PWA.

**Staff:** `/admin` (requests, pickups, payments, workers, services & prices, gallery, reviews, feedback, legal pages,
business profile, activity log) and `/worker/login` (assigned jobs, status updates, live alerts). These routes are
not linked anywhere on the public site.

---

## 1. Set up Supabase

1. Create a project at supabase.com.
2. **SQL Editor →** paste and run `supabase/migrations/001_schema.sql` (one file; safe to re-run).
   It creates all tables, row-level security, rate limiting, the public RPCs, the gallery bucket, and seeds your price list.
3. **Authentication → Users → Add user** (your email + a strong password, "Auto Confirm"). Then in the SQL Editor:
   ```sql
   insert into public.profiles (id, full_name, role)
   select id, 'Your Name', 'admin' from auth.users where email = 'you@example.com';
   ```
4. Deploy the staff-management function (needed for Admin → Workers → Add / Reset password):
   ```bash
   supabase login && supabase link --project-ref YOUR-REF
   supabase functions deploy create-worker
   supabase secrets set ALLOWED_ORIGINS="https://www.yourdomain.com,https://yourdomain.com"
   ```

## 2. Run / deploy the site

```bash
npm install
cp .env.example .env     # fill in the three values
npm run dev              # local
npm run build            # production build → dist/
```

Deploy `dist/` to Vercel, Netlify or Cloudflare Pages and set the same three environment variables there.
Security headers (CSP, HSTS, frame/referrer policies) ship in `vercel.json` and `public/_headers`.
If you use a different Supabase region/domain, nothing changes — the CSP allows `*.supabase.co`.

## 3. Production checklist (do these before launch)

In the Supabase dashboard:

- [ ] **Authentication → Providers → Email:** turn **off** "Allow new users to sign up" (staff are created only by an admin).
- [ ] Authentication → Policies: set minimum password length to 10+, enable leaked-password protection.
- [ ] Authentication → URL configuration: set Site URL to your live domain.
- [ ] Authentication → Attack protection: enable CAPTCHA if you see abuse.
- [ ] Project Settings → Database: enable daily backups (Pro) or schedule your own export.
- [ ] Keep the **service_role** key out of the front end, out of Git, and out of `.env` here — only the edge function uses it.

In the app, sign in at `/admin` → **Business Profile** and fill in your **address, email, opening hours, Google Maps link and
social links**. Until you do, the site simply hides those items — nothing is guessed.

## 4. Where to change things

| What | Where |
|---|---|
| Phone number, brand name, colours | `src/lib/constants.js` |
| Prices, services, images | Admin → Services (live — no code change) |
| Address, hours, socials | Admin → Business Profile |
| Privacy / Terms text | Admin → Legal |
| Footer "Site by" credit | `DEVELOPER_CREDIT` in `src/lib/constants.js` (set to `null` to remove) |
| Gallery & hero photos | Hero images are in `public/images/` (replace with your own photos); gallery via Admin → Gallery |

## 5. Security notes

- Row-level security is enabled on every table. Customers can only use the public RPCs; they have no direct table access.
- Tracking needs **request number + the booking phone**; failed attempts are throttled per IP and per request number, and
  request numbers are random (not sequential).
- Submitting requests, reviews and feedback is rate limited per IP. Review contact details are never exposed to the public.
- Workers can only advance the status of jobs assigned to them; managers can only change status/assignment; both are
  enforced in the database, not just the UI. Paused staff lose access immediately.
- Gallery uploads are restricted to JPEG/PNG/WebP, 8 MB, admin/manager only.
- The edge function only accepts calls from your domain (`ALLOWED_ORIGINS`), verifies the caller is an active admin, and
  refuses to reset admin passwords.

## 6. Brand assets (`public/`)

`logo.png` (transparent, for dark backgrounds) · `logo-on-black.png` · `favicon.ico`, `favicon-16/32/48.png` ·
`apple-touch-icon.png` · `icon-192/512.png`, `icon-maskable-512.png` (PWA) · `og-image.png` (social sharing).
Fonts: **Cinzel** (headings) and **Inter** (body), via Google Fonts.

## 7. Deploying from GitHub

Repo: `Darius2322/HouseofHannah`. The SQL in `supabase/migrations/` has already been applied to the Supabase project
`House-of-Hannah`, and the `create-worker` edge function is deployed. On Vercel, import the repo (Framework: Vite) and set
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL`.

## 8. Two deployments from one repo

| Vercel project | Env var | Address |
|---|---|---|
| `house-of-hannah` | *(none)* | customer website — has no staff routes at all |
| `hannahhouse-admin` | `VITE_APP_MODE=admin` | staff portal — `/` goes straight to the admin login; `/worker/login` for workers |

Both use the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
