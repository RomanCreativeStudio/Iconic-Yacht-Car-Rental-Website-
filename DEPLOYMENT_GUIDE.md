# Iconic Rentals — Production Deployment Guide

This is the step-by-step path from "code in a repository" to "real
website, taking real bookings." Follow it in order — each step depends
on the one before it. It's written for a non-technical business owner:
every step says exactly where to click, and nothing here requires
writing code.

This guide covers *deployment* — getting everything connected and live.
For day-to-day content editing once you're live, see `CLIENT_SETUP.md`
(the full reference for every admin page). For what to check on launch
day and after, see `LAUNCH_CHECKLIST.md`. For ongoing maintenance, see
`OPERATIONS.md`. If something breaks, see `DISASTER_RECOVERY.md`.

---

## What You'll Need Before Starting

- A **domain name** you own (e.g. from Namecheap, GoDaddy, Google
  Domains) and access to its DNS settings.
- A **Supabase account** — [supabase.com](https://supabase.com), free
  tier is enough to start.
- A **Netlify account** (or another static host — see "Choosing a Host"
  below) — [netlify.com](https://netlify.com), free tier is enough to
  start.
- A **Resend account** for transactional email —
  [resend.com](https://resend.com), free tier is enough to start.
- Access to your **domain registrar's DNS settings** — you'll add a few
  records there.
- Your **real business information** ready to enter: phone number,
  email, hours, and at least a handful of real vehicle/yacht photos.

No credit card is required for any of the above at this scale. Total
setup time, working through this guide once, is usually **1–3 hours** —
most of it is waiting for DNS and domain verification to propagate, not
active work.

---

## Step 1 — Create and Configure the Supabase Project

Full reference: `CLIENT_SETUP.md` → **Database Setup**.

1. Create a Supabase project at
   [supabase.com/dashboard](https://supabase.com/dashboard). Pick a
   region near your customers (e.g. US East for a Miami business).
2. Install the Supabase CLI and apply every migration:

   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```

   This creates every table (`booking_requests`, `profiles`,
   `fleet_items`, `fleet_media`, `fleet_item_private_notes`,
   `experiences`, `experience_media`, `site_content`, `site_settings`,
   `clientele_endorsements`, `instagram_posts`, `instagram_reels`,
   `activity_log`), all Row Level Security policies, and the admin-only
   database functions (`is_admin()`, `get_storage_usage()`, Team
   management).
3. Create three Storage buckets by hand: **Storage → New bucket**,
   named exactly `logos`, `avatars`, and `instagram`. (Four other
   buckets — `fleet-images`, `fleet-videos`, `experience-images`,
   `experience-videos` — are created automatically by the migration in
   step 2.) After creating these three, run `supabase db push` again so
   their public-read/admin-write configuration applies.
4. **Verify:** Table Editor shows all 13 tables; Storage shows all 7
   buckets.

## Step 2 — Connect the Email System (Resend + Edge Function)

Full reference: `CLIENT_SETUP.md` → **Email Configuration**.

1. Create a Resend account, verify a sending domain (**Domains → Add
   Domain**, then add the DNS records Resend gives you at your
   registrar — this can take minutes to hours to verify).
2. Create a Resend API key (**API Keys → Create API Key**).
3. From this project's folder:

   ```bash
   supabase secrets set RESEND_API_KEY=your_real_resend_key
   supabase secrets set OWNER_EMAIL=you@yourdomain.com
   supabase secrets set FROM_EMAIL="Iconic Rentals <bookings@yourdomain.com>"
   supabase functions deploy send-booking-emails
   ```
4. **Verify:** Supabase Dashboard → **Edge Functions** shows
   `send-booking-emails` as deployed. (You'll do an end-to-end email test
   in Step 8, once the site itself is live.)

If you're not ready to verify a domain yet, Resend's shared
`onboarding@resend.dev` address works for testing — switch to your own
verified domain before relying on this for real customers.

## Step 3 — Create Your Admin Account

Full reference: `CLIENT_SETUP.md` → **Admin Dashboard Access**.

1. In Supabase: **Authentication → Users → Add user**, create an account
   with your real email and a strong password.
2. **Authentication → Providers → Email**, disable **"Allow new users to
   sign up"** — this is what keeps the admin dashboard invite-only, not
   a public sign-up form.
3. This account defaults to the `staff` role. To make it `admin` (full
   read/write access), you'll need one manual SQL step the very first
   time, since nobody with `admin` access exists yet to do it for you
   through the Team page: **SQL Editor → New query**:

   ```sql
   update public.profiles set role = 'admin' where id =
     (select id from auth.users where email = 'you@yourdomain.com');
   ```

   Every admin or role change after this first one is a two-click action
   in **Team** (`admin/team.html`) — no SQL required.

## Step 4 — Point the Site at Your Supabase Project

Edit `js/booking-config.js` in this repository:

```js
window.IconicBookingConfig = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'your-real-anon-key',
  EMAIL_FUNCTION_URL: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-booking-emails'
};
```

Find your URL and anon key in **Supabase Dashboard → Settings → API**.
The anon key is safe to put here — it's meant to be public; Row Level
Security is what actually protects your data (see `CLIENT_SETUP.md`
→ **Security notes** if you want the full explanation). **Never** put
your `service_role` key or your Resend API key in this file, or anywhere
else the browser can read.

Commit and push this change — it needs to be in the deployed files, not
just saved locally.

## Step 5 — Deploy to Netlify

1. Sign in at [app.netlify.com](https://app.netlify.com).
2. **Add new site → Import an existing project**, connect your GitHub
   account, and pick this repository.
3. Build settings: **leave them all blank/default.** This is a static
   site with no build step — `netlify.toml` (already in this repo) tells
   Netlify to publish the project root as-is, and pre-configures caching
   and security headers (including the Content Security Policy and HSTS
   header added in Phase 7.2 — see `CLIENT_SETUP.md` → **Content
   Security Policy** if you ever add a new third-party script and need
   to know what to update).
4. Click **Deploy site**. Netlify gives you a temporary
   `random-name-123.netlify.app` URL immediately — use it to verify
   everything works before connecting your real domain.
5. **Verify:** the temporary URL loads the homepage, every image
   appears, and `/fleet/vehicle.html?slug=azure-horizon` (or any slug
   from `js/fleet-data.js`) loads correctly.

**Choosing a different host:** `netlify.toml` only takes effect on
Netlify — it's ignored (harmlessly) by any other static host. Vercel,
Cloudflare Pages, GitHub Pages, or traditional shared hosting all work
equally well; you'd just need to recreate the caching/security headers
in that host's own config format if you want to keep them, and CSP/HSTS
specifically matter enough to be worth the extra step (see
`CLIENT_SETUP.md`'s Content Security Policy section for the exact
header values to port over).

## Step 6 — Connect Your Custom Domain

1. In Netlify: **Domain settings → Add a domain**, enter your domain
   (e.g. `iconicrentalsmiami.com`).
2. Netlify shows you the DNS records to add. Two common setups:
   - **Using Netlify DNS** (Netlify manages your DNS entirely): Netlify
     gives you nameservers to set at your registrar. Simplest option,
     Netlify handles everything after that.
   - **Keeping your current DNS provider:** add an `A` record (or
     `ALIAS`/`ANAME` if your provider supports it) for the apex domain
     pointing at Netlify's load balancer IP, and a `CNAME` for `www`
     pointing at your `*.netlify.app` address. Netlify's domain settings
     page shows you the exact values to use.
3. **DNS propagation** can take anywhere from a few minutes to 48 hours,
   though it's usually under an hour. Use
   [dnschecker.org](https://dnschecker.org) to check progress.
4. Also update `robots.txt` and `sitemap.xml` in this repository if your
   real domain differs from `https://www.iconicrentalsmiami.com` — both
   currently reference that exact domain.

## Step 7 — SSL / HTTPS

Netlify automatically provisions a free SSL certificate (via Let's
Encrypt) for your domain once DNS is pointed at it — usually within a
few minutes of the domain resolving correctly. No action needed beyond:

1. **Domain settings → HTTPS**, confirm the certificate shows as
   provisioned.
2. Enable **"Force HTTPS"** if it isn't already — this redirects any
   `http://` visitor to `https://` automatically.
3. The `Strict-Transport-Security` header (already in `netlify.toml`
   since Phase 7.2) tells browsers to *always* use HTTPS for your domain
   going forward, once they've visited once. See `CLIENT_SETUP.md`'s
   **Content Security Policy** section for the `includeSubDomains`
   caveat — confirm you don't have an HTTP-only subdomain (an old mail
   or FTP service, for example) before this fully takes effect.

## Step 8 — End-to-End Verification

With your real domain live and HTTPS working:

- [ ] Homepage loads, every image and section appears correctly.
- [ ] Submit a real test booking through both the full form and the
      Quick Book modal.
- [ ] Confirm **you** receive the owner-notification email, and the
      **test email address you used** receives the customer-confirmation
      email.
- [ ] Sign in at `yourdomain.com/admin/` with your admin account and see
      the test booking(s) you just submitted.
- [ ] Check the site on a real phone, not just a resized browser window.
- [ ] Open your browser's developer console on a few pages and confirm
      there are no errors (a CSP violation would show here specifically
      if something's misconfigured).

## Step 9 — Publish Your Real Content

The site works and looks complete on static fallback content the moment
it's deployed — but nothing in Supabase is published yet, so you're not
actually running on the CMS until you do this. All of the following
happen in the admin dashboard at `yourdomain.com/admin/`, sign in first:

- **Fleet items** — **Fleet** tab. Ten sample vehicles already exist in
  the database from setup; review each one's details, replace stock
  photos with real ones in **Media**, and toggle **Published** on for
  each vehicle that's ready to show publicly. Nothing shows on the
  live site from here until you publish it.
- **Homepage content** — **Homepage** tab. Hero copy, About section,
  Trust pillars, Statistics, FAQ, Instagram profile info, and Clientele
  categories are all editable here; each section saves independently.
- **Instagram** — **Instagram** tab. Add real posts and Reels (each
  uploads its own thumbnail image directly — see `CLIENT_SETUP.md` →
  **Instagram Manager**), and toggle **Published**.
- **Clientele endorsements** — **Clientele** tab. Only add a real,
  named endorsement once that person or brand has explicitly agreed to
  be quoted — toggle **Approved** once it's ready to show.

`LAUNCH_CHECKLIST.md` has the full, ordered pre-launch content list
(including the business-info and structured-data items that aren't
Supabase-related at all, like the placeholder phone number).

---

## Backup Recommendations

- **Database:** Supabase takes automatic daily backups on every paid
  plan (7-day retention on Pro, longer on higher tiers); the free tier
  does **not** include managed backups. If you're on the free tier,
  export your data periodically: **Database → Backups** if available on
  your plan, or `supabase db dump` from the CLI as a manual export you
  store somewhere safe. Do this at minimum before any major change
  (a schema migration, a bulk content import).
- **Storage (photos/videos):** not covered by database backups — back up
  separately. The Supabase CLI can sync a bucket to local disk; there's
  no built-in scheduled backup for Storage on any tier, so this is worth
  automating yourself if your fleet photography represents real,
  hard-to-replace work.
- **Code:** already backed up by virtue of living in this Git
  repository — as long as you're pushing your changes (or, for CMS
  content, that content lives in Supabase, not in Git, so it needs its
  own backup as above).
- **Environment configuration:** `js/booking-config.js`'s values and
  your Resend/Supabase secrets exist only where you set them (this repo
  for the former, Supabase's secret store for the latter) — keep a
  private, secure copy of your Supabase project ref, anon key, and
  Resend API key somewhere outside of both (a password manager is
  ideal), so a lost secret doesn't mean starting over.

See `DISASTER_RECOVERY.md` for what to actually do with any of this if
something goes wrong.

## Rollback Procedure

**The static site (Netlify):** every deploy is kept in Netlify's deploy
history. To roll back: **Deploys → find the last known-good deploy →
Publish deploy**. This is instant and reversible — nothing is deleted,
you can roll forward again just as easily. This covers any bad code
push, a broken layout, or a regression in `index.html`/CSS/JS.

**The database (Supabase):** rolling back a *migration* (schema change)
isn't as clean — Postgres migrations aren't automatically reversible.
For a bad migration, the safest path is usually a new, corrective
migration that undoes the specific change, not reverting history. For
bad *content* (an accidental delete, a wrong bulk edit), your recourse
depends entirely on having a backup per the section above — this is the
main reason database backups matter more than code backups here, since
code always has Git as a safety net and content usually doesn't.

**Full procedure, including what to do if something is actually broken
right now, is in `DISASTER_RECOVERY.md`.**
