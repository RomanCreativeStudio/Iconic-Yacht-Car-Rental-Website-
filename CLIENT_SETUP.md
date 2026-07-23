# Iconic Rentals — Client Setup Guide

This document explains how to maintain, configure, and deploy this website
day-to-day. It assumes no coding background beyond editing text in a file
and running one command from a terminal.

**Read the "Before You Launch" checklist first — one item on it (setting
up the booking database and email) is not optional.**

---

## Before You Launch — Required Checklist

- [ ] **Create your Supabase project and run the database schema.** See
      [Database Setup](#database-setup) below — until this is done, the
      booking forms will show a friendly "not connected yet" message
      instead of saving inquiries.
- [ ] **Add your real Supabase URL and anon key to
      `js/booking-config.js`.** See [Environment Variables](#environment-variables).
- [ ] **Connect Resend and deploy the email Edge Function** so you and
      your customers get emailed when a booking request comes in. See
      [Email Configuration](#email-configuration).
- [ ] **Create at least one admin login** so you can view and manage
      inquiries. See [Admin Dashboard Access](#admin-dashboard-access).
- [ ] Replace the phone number, email, Instagram handle, and hours with
      your real business information (see
      [Updating Business Information](#updating-business-information)).
- [ ] Replace placeholder fleet photography with real photos (see
      [Replacing Images](#replacing-images)).
- [ ] Replace the three placeholder testimonials with real, verifiable
      customer reviews, or remove them (see
      [Structured Data & SEO](#structured-data--seo) — this affects more
      than just what's visible on the page).
- [ ] Add your real street address to the structured data if you have a
      public office/marina address (optional but improves local SEO).
- [ ] Activate Google Analytics and/or the Meta Pixel if you plan to use
      them (see [Analytics & Tracking](#analytics--tracking)).
- [ ] Update the WhatsApp number in the floating contact menu, or remove
      that button if you don't use WhatsApp for business.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Replacing Images](#replacing-images)
3. [Adding or Editing Fleet Items](#adding-or-editing-fleet-items)
4. [Updating Business Information](#updating-business-information)
5. [How Booking Requests Work](#how-booking-requests-work)
6. [Database Setup](#database-setup)
7. [Environment Variables](#environment-variables)
8. [Email Configuration](#email-configuration)
9. [Analytics & Tracking](#analytics--tracking)
10. [Structured Data & SEO](#structured-data--seo)
11. [Future CMS Integration](#future-cms-integration)
12. [How Deployment Works](#how-deployment-works)
13. [Making Code Changes — the Minified Files](#making-code-changes--the-minified-files)

---

## Project Structure

```
├── index.html              Homepage — all sections live in this one file
├── fleet/
│   └── vehicle.html        Reusable fleet detail page template (one file,
│                            works for every yacht and car via a URL like
│                            fleet/vehicle.html?slug=azure-horizon)
├── css/
│   ├── style.css           Main stylesheet (source — edit this one)
│   ├── style.min.css       Minified copy actually loaded by the pages
│   ├── fleet-detail.css    Fleet detail page styles (source)
│   ├── fleet-detail.min.css
│   └── fonts.css / fonts.min.css   Self-hosted font declarations
├── js/
│   ├── fleet-data.js       Every yacht and car lives here — see below
│   ├── fleet-render.js     Turns fleet-data.js entries into the card HTML
│   ├── fleet-detail.js     Populates fleet/vehicle.html from fleet-data.js
│   ├── analytics.js        Google Analytics / Meta Pixel tracking helper
│   ├── main.js             Site-wide behavior (nav, forms, lightbox, etc.)
│   └── *.min.js            Minified copies actually loaded by the pages
├── images/                 Photography (JPEG + WebP pairs)
├── fonts/                  Self-hosted webfont files
└── CLIENT_SETUP.md         This file
```

**Source vs. minified files:** every CSS/JS file has a full-size version
(e.g. `main.js`) and a `.min.js`/`.min.css` version that's actually
referenced by the HTML pages. Always edit the full-size source file, then
re-minify — see [Making Code Changes](#making-code-changes--the-minified-files).

---

## Replacing Images

All photography lives in the `images/` folder as matched pairs — a
`.jpg` (universal fallback) and a `.webp` (smaller, modern browsers) with
the same filename. To replace a photo:

1. Prepare your new photo at roughly the same dimensions as the one
   you're replacing (check the existing file's pixel size first).
2. Export it as both a `.jpg` and a `.webp` with the **exact same
   filename** as the file you're replacing (e.g. `hero-yacht-miami.jpg`
   and `hero-yacht-miami.webp`).
3. Overwrite the existing files in `images/` with your new ones.

That's it — because every page references images by filename, no HTML
editing is required for a straight swap.

**If you're adding a photo for a fleet item that currently shows "Image
Coming Soon"** (all 7 cars and 1 yacht, Coastal Mirage, currently use a
styled placeholder instead of a photo), see
[Adding or Editing Fleet Items](#adding-or-editing-fleet-items) — you'll
need one small edit in `js/fleet-data.js` to point at the new filename.

**Image size guidance:** keep hero/card images under ~200KB and roughly
1200–1400px on the long edge — this site is tuned for fast loading, and
oversized images are the single easiest way to undo that.

---

## Adding or Editing Fleet Items

Every yacht and car on this site — the homepage cards, the tabbed fleet
grid, and the detail page at `fleet/vehicle.html` — is generated from a
single file: **`js/fleet-data.js`**. You never need to touch HTML to add,
edit, or remove a vehicle.

### To edit an existing vehicle

Open `js/fleet-data.js`, find the entry by its `name` (e.g.
`'Azure Horizon'`), and change any field: `description`, `specs`,
`amenities`, `capacity`, `length` (yachts) / `seats`, `hp` (cars), etc.
Save the file, then re-minify (see below) and re-upload.

### To add a new vehicle

Copy an existing entry that matches the type you're adding (a yacht
entry for a new yacht, a car entry for a new car), paste it as a new
item in the array, and update every field. Two fields matter most:

- **`slug`** — a unique, URL-safe id (lowercase, hyphens, no spaces).
  This becomes the vehicle's URL: `fleet/vehicle.html?slug=your-slug`.
- **`type`** — must be exactly `'yacht'` or `'car'`, since this decides
  which fields (guests/length vs. horsepower/seats) and which homepage
  tab the card appears under.

If you don't have photos yet, leave `heroImage`, `heroImageWebp`,
`cardImage`, and `cardImageWebp` as `null` and `gallery` as `[]` — the
site automatically shows the same elegant "Image Coming Soon" placeholder
used by the current placeholder vehicles.

### To remove a vehicle

Delete its entire `{ ... }` entry from the array in `js/fleet-data.js`.
Make sure you don't leave a trailing comma issue — each entry except the
last one in the array needs a comma after its closing `}`.

After any edit to `fleet-data.js`, re-minify it (see
[Making Code Changes](#making-code-changes--the-minified-files)) —
`index.html` and `fleet/vehicle.html` both load the minified copy.

---

## Updating Business Information

Your phone number, email, hours, and Instagram handle appear in several
places. Search-and-replace each of the following across `index.html`,
`fleet/vehicle.html`, and `js/fleet-detail.js`:

| What | Current placeholder value |
|---|---|
| Phone (display) | `(305) 555-0198` |
| Phone (link format) | `+13055550198` |
| Email | `concierge@iconicrentalsmiami.com` |
| Instagram handle | `@iconicrentalsmiami` / `iconicrentalsmiami` |
| WhatsApp number | `13055550198` (inside the `wa.me/` link in the floating contact menu) |
| Business hours | `Daily · 8:00 AM – 10:00 PM` (Contact section) and the `openingHoursSpecification` in the structured data block near the top of `index.html` |

A few notes:

- The phone number appears in **two formats** — `(305) 555-0198` for
  display and `+13055550198` / `13055550198` inside `tel:`/`wa.me` links.
  Replace both consistently.
- The business address is currently only a locality (`Miami, FL`) — there
  is no `streetAddress` in the structured data because we don't have a
  real one. If you have a public office or marina address, add it to the
  `address` object in the structured data block described in
  [Structured Data & SEO](#structured-data--seo).
- The footer, header, and JSON-LD structured data block all need to stay
  in sync — that's the tradeoff of a hand-built static site rather than a
  CMS. See [Future CMS Integration](#future-cms-integration) if this
  becomes a maintenance burden.

---

## How Booking Requests Work

There are two booking entry points on the site, and both are now backed
by a real database and email notifications — no more "success message
that goes nowhere."

1. **The full reservation form** (`#booking` section on the homepage) —
   name, phone, email, rental type, vehicle, date, time, duration,
   guests, special requests.
2. **The Quick Book modal** — a shorter form (name, phone, email, rental
   type, preferred date) that opens from the hero, header, and contact
   "Book Your Experience" buttons for a faster inquiry path.

### What happens on submit

1. The visitor's browser sends the form data directly to your Supabase
   project's database (a `booking_requests` table — see
   [Database Setup](#database-setup)) using `fetch()` — there's no custom
   server in between.
2. The instant that save succeeds, the browser separately calls a
   Supabase Edge Function (`send-booking-emails`), which uses
   [Resend](https://resend.com) to send:
   - A notification email to your business inbox with every detail of
     the inquiry.
   - A confirmation email to the customer.
3. The visitor sees the "Request Received" success message and animation
   only after the database save succeeds.

**Important: the database save and the email notification are
independent.** If Resend is briefly down, misconfigured, or its API key
hasn't been set yet, the inquiry is still saved permanently in your
database — you just won't get the email alert until that's fixed. Check
the admin dashboard periodically if you're ever unsure whether emails are
arriving. The booking itself is never silently lost.

### If something goes wrong during submission

- **Before you've connected your Supabase project** (i.e. straight out of
  the box): both forms detect that `js/booking-config.js` still has
  placeholder values and show a friendly banner — "Online booking isn't
  connected yet — please call or email us directly" — instead of
  pretending to succeed. See [Database Setup](#database-setup) and
  [Environment Variables](#environment-variables) to connect it.
- **After you've connected it**, a network hiccup or a temporary outage
  shows an on-form error banner ("We couldn't save your request right
  now...") and keeps everything the visitor typed intact so they can just
  hit submit again — nothing is cleared out from under them.
- Every submit button shows a loading spinner and disables itself while
  the request is in flight, so a slow connection never looks like an
  unresponsive click.

### Spam protection

Both forms include a honeypot field (invisible to real visitors and
screen readers, irresistible to unsophisticated bots) and a minimum
time-on-form check — a submission that arrives suspiciously fast is
silently accepted-looking to whatever submitted it, but never actually
saved. Neither check requires a visitor to solve a CAPTCHA or do anything
extra. If you start seeing spam get through despite this, an upgrade path
is to add [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/)
or [hCaptcha](https://www.hcaptcha.com) to the two forms — both offer a
free tier and a small JS snippet.

---

## Database Setup

The booking system is built on [Supabase](https://supabase.com) — a
hosted Postgres database with a built-in REST API, authentication, and
edge functions, all on a generous free tier for a business this size.

1. **Create a Supabase account and project** at
   [supabase.com](https://supabase.com/dashboard). Pick a region close to
   Miami (e.g. US East) for the best latency.
2. **Run the schema.** In your project dashboard, go to **SQL Editor >
   New query**, paste the entire contents of `supabase/schema.sql` from
   this project, and click **Run**. This creates the `booking_requests`
   table with the exact fields below, plus the security rules described
   next. It's safe to re-run if you're ever unsure whether it applied.

   | Field | Type | Notes |
   |---|---|---|
   | `id` | uuid | Generated automatically |
   | `created_at` | timestamp | Generated automatically |
   | `name` | text | Required |
   | `email` | text | Required |
   | `phone` | text | Required |
   | `rental_type` | text | Required — "Yacht Rental", "Car Rental", or "Not sure yet" |
   | `fleet_item` | text | Optional |
   | `date` | date | Optional |
   | `time` | time | Optional |
   | `duration` | text | Optional |
   | `guests` | integer | Optional |
   | `message` | text | Optional |
   | `status` | text | One of: New, Contacted, Confirmed, Completed, Cancelled |
   | `source` | text | "full_form" or "quick_form" — which form was used |

3. **Row Level Security (RLS) is already configured by the schema** and
   is the real security boundary for this data — not any secret key. In
   plain terms:
   - Anyone on the public website can *submit* a new inquiry (that's the
     whole point of the form), but can never read, edit, or delete any
     inquiry — including their own — through the public API.
   - Only someone signed in through the admin dashboard can view or
     update inquiries.
   - **Nobody, including admin staff, can delete an inquiry** through the
     app — cancelling sets `status = 'Cancelled'` instead. This is
     deliberate: a permanent record of every inquiry is worth more than
     the ability to tidy the list.

### Admin Dashboard Access

The dashboard at `admin/index.html` requires a Supabase Auth login —
there's no separate username/password system to manage.

1. In your Supabase dashboard, go to **Authentication > Users > Add
   user** and create an account for each staff member who needs access
   (email + password). Do this for every person individually — Supabase
   supports as many users as you need to add this way.
2. **Turn off public sign-ups** so a stranger can't create their own
   account: **Authentication > Providers > Email**, disable "Allow new
   users to sign up." Staff accounts are added by you, from the
   dashboard, not by anyone signing up themselves.
3. Staff sign in at `yourdomain.com/admin/` with the email/password you
   created for them.

The dashboard lets staff view every inquiry, filter by status, open one
for full details, and update its status as they work it — new inquiry →
contacted → confirmed → completed (or cancelled). This page is marked
`noindex` so search engines won't list it, but that alone doesn't secure
it — the Supabase Auth login and the RLS policies above are what actually
protect customer data, and both are already in place.

---

## Environment Variables

This is a static site with no server-side environment, so "environment
variables" here means two small config files with placeholder values
that you replace with your real project's details.

### `js/booking-config.js` (used by the public site and the admin dashboard)

```js
window.IconicBookingConfig = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-SUPABASE-ANON-KEY',
  EMAIL_FUNCTION_URL: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-booking-emails'
};
```

Find both values in your Supabase dashboard under **Settings > API**:
`SUPABASE_URL` is the "Project URL," and `SUPABASE_ANON_KEY` is the
"anon / public" key (not the "service_role" key — never use that one
here or anywhere in frontend code; it bypasses RLS entirely).

**The anon key is not a secret.** It's designed to be visible in frontend
code — anyone can already see it in your browser's network tab whether
you "hide" it or not. Row Level Security, configured by
`supabase/schema.sql`, is what actually protects the data. This is a
standard, intentional part of how Supabase is designed to be used.

### Edge Function secrets (kept on Supabase's servers, never in this codebase)

Set these using the Supabase CLI (see
[Email Configuration](#email-configuration) below for the full walkthrough):

| Secret | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key — this one **is** a real secret |
| `OWNER_EMAIL` | Where booking notifications should be sent |
| `FROM_EMAIL` | The "from" address emails are sent from, e.g. `Iconic Rentals <bookings@yourdomain.com>` |

---

## Email Configuration

Emails are sent by a Supabase Edge Function
(`supabase/functions/send-booking-emails`) using
[Resend](https://resend.com), a transactional email API with a free tier
that comfortably covers a business at this scale.

1. **Create a Resend account** at [resend.com](https://resend.com) and
   verify a sending domain (**Domains > Add Domain**, then add the DNS
   records Resend gives you at your domain registrar). Resend will not
   send email from an address on an unverified domain — this step isn't
   optional. Verification usually takes minutes to a few hours depending
   on your DNS provider.
2. **Create an API key** — **API Keys > Create API Key**.
3. **Install the Supabase CLI** if you haven't already (`npm install -g
   supabase`), then from this project's root folder:

   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set RESEND_API_KEY=your_real_resend_key
   supabase secrets set OWNER_EMAIL=concierge@yourdomain.com
   supabase secrets set FROM_EMAIL="Iconic Rentals <bookings@yourdomain.com>"
   supabase functions deploy send-booking-emails
   ```
4. **Test it** by submitting the booking form on your live (or locally
   served) site once `js/booking-config.js` has your real project
   details, and confirm both the owner notification and the customer
   confirmation email arrive.

If you'd rather not verify a domain right away, Resend's default
`onboarding@resend.dev` sending address works out of the box for testing
— swap in your own verified domain before relying on this for real
customer communication, since `resend.dev` addresses are shared across
all Resend users and can be rate-limited.

---

## Analytics & Tracking

Google Analytics 4 and the Meta (Facebook) Pixel are wired into the site
as **inert placeholders** — the tracking code that fires on every
important interaction is already built and tested, but the actual
Google/Meta scripts are commented out so nothing is sent anywhere until
you activate them with your real IDs.

### To activate Google Analytics

1. Get your GA4 Measurement ID (looks like `G-XXXXXXXXXX`) from
   [analytics.google.com](https://analytics.google.com).
2. In `index.html` and `fleet/vehicle.html`, find the commented-out block
   starting with `<!-- <script async src="https://www.googletagmanager.com/gtag/js...`
   near the top of `<head>`.
3. Remove the `<!--` and `-->` around that block.
4. Replace both instances of `G-XXXXXXXXXX` with your real ID.

### To activate the Meta Pixel

Same process, in the commented-out block just below the Google Analytics
one — replace `YOUR_PIXEL_ID` (it appears twice) with your real Pixel ID
and remove the surrounding `<!-- -->`.

### What's already being tracked

Once either platform is activated, `js/analytics.js` automatically starts
sending these events — no further code changes needed:

| Event | Fires when |
|---|---|
| `book_button_click` | Any "Book Now" / "Book Your Experience" button is clicked, anywhere on the site |
| `booking_form_submit` | The full booking form or the Quick Book modal is successfully submitted |
| `phone_click` | A visitor taps/clicks a phone number link |
| `whatsapp_click` | A visitor clicks the WhatsApp button in the floating contact menu |
| `fleet_view_details` | A visitor clicks "View Details" on a fleet card |
| `fleet_tab_switch` | A visitor switches between the Yacht Fleet and Car Fleet tabs |
| `gallery_image_open` | A visitor opens a gallery or fleet-detail photo in the lightbox |

You can test these locally before going live by opening the site with
`?debug_analytics=1` on the end of the URL (e.g.
`index.html?debug_analytics=1`) and watching your browser's developer
console — every tracked event is logged there regardless of whether
GA/Meta are active.

---

## Structured Data & SEO

`index.html` includes a `<script type="application/ld+json">` block near
the top of `<head>` — this is what lets Google show rich results (star
ratings, business hours, etc.) for this site. It describes:

- **LocalBusiness** — your business name, contact info, hours, and an
  aggregate star rating.
- **AutoRental** — the exotic/luxury car rental side of the business.
  *(Schema.org's official vocabulary uses "AutoRental," not "CarRental" —
  there is no "CarRental" type, so using the correct name here is what
  actually makes this valid to Google, rather than silently ignored.)*
- A **Service** entry describing the yacht/boat charter side.
  *(Schema.org has no official "BoatRental" type either. A generic
  Service entry with `serviceType: "Yacht & Boat Rental"` is the closest
  valid, Google-recognized equivalent.)*
- **Review** entries — one per testimonial currently shown in the
  Testimonials section, plus an aggregate rating.

**Important:** the three reviews in this structured data block are the
same placeholder testimonials currently shown on the page (Jonathan M.,
Alexandra R., David K.). Google's structured data guidelines require
review markup to reflect genuine reviews that visitors can actually see
on the page — **before launch, replace both the visible testimonials and
this structured data block with real, verifiable customer reviews**, or
remove the `review` and `aggregateRating` fields entirely if you don't
yet have real reviews to show. Publishing fabricated review markup can
result in a manual penalty from Google.

After updating your business info or reviews, it's worth re-validating
the structured data with
[Google's Rich Results Test](https://search.google.com/test/rich-results)
using your live URL once deployed.

---

## Future CMS Integration

This site is intentionally structured so that hooking it up to a CMS
later is a data change, not a rebuild:

- Every fleet item (yacht or car) is a single JavaScript object in
  `js/fleet-data.js`, with a flat, predictable shape (`slug`, `type`,
  `name`, `category`, `description`, `specs`, `amenities`, `gallery`,
  etc.). A CMS (Contentful, Sanity, WordPress via REST/GraphQL, etc.)
  would just need a content model matching those same field names.
- All rendering logic (`js/fleet-render.js` for cards,
  `js/fleet-detail.js` for the detail page) reads from `js/fleet-data.js`
  through a small set of functions (`getFleetItem`, `getFleetByType`,
  `getRelatedFleet`) — it never reaches into the data array directly.
  That indirection is what makes the swap possible.
- The exact migration steps (replacing the static array with a `fetch()`
  call, and the one event-based signal needed so the page waits for data
  to arrive) are documented directly in the comment block at the bottom
  of `js/fleet-data.js`.

A developer doing this migration would only need to change
`js/fleet-data.js` and add a short "wait for data" wrapper around the
existing render calls — the HTML templates, CSS, and card markup stay
untouched.

---

## How Deployment Works

The front end is a fully static site — HTML, CSS, and JavaScript files
with no build step or server-side rendering. The booking system adds one
piece of real backend infrastructure (Supabase database + Edge Function),
but that lives entirely on Supabase's servers — there is still nothing to
build or run on your static host. Deployment has two parts: the backend
(one-time setup, see below) and the static site (every time you make
content changes).

### Part 1 — Backend (do this once, before going live)

Complete these in order — each one depends on the last:

1. [Database Setup](#database-setup) — create the Supabase project and
   run `supabase/schema.sql`.
2. [Environment Variables](#environment-variables) — put your real
   Supabase URL and anon key into `js/booking-config.js`.
3. [Email Configuration](#email-configuration) — connect Resend and
   deploy the `send-booking-emails` Edge Function.
4. [Admin Dashboard Access](#admin-dashboard-access) — create a staff
   login so someone can actually see and manage the inquiries that come
   in.

You only need to repeat these steps if you move to a new Supabase
project — routine site edits (photos, prices, text) never touch this
part.

### Part 2 — Static site hosting

1. **Choose a static host.** Popular options: Netlify, Vercel, Cloudflare
   Pages, GitHub Pages, or a traditional shared-hosting provider.
2. **Upload the entire project folder** (everything in this repository)
   to your host, preserving the folder structure (`css/`, `js/`,
   `images/`, `fonts/`, `fleet/`, `admin/`, and `index.html` all need to
   stay at the same relative paths to each other).
3. **Set `index.html` as the site's entry point** (most hosts do this
   automatically for a file literally named `index.html` at the root).
4. **Point your domain at the host** following your host's DNS
   instructions.
5. **Verify after deploying:**
   - The homepage loads and every image appears.
   - `fleet/vehicle.html?slug=azure-horizon` (or any other slug from
     `js/fleet-data.js`) loads correctly.
   - Both booking forms submit successfully and you receive the owner
     notification email (once you've completed [Part 1](#part-1--backend-do-this-once-before-going-live) above).
   - `admin/index.html` (e.g. `yourdomain.com/admin/`) lets you sign in
     and see the test inquiry you just submitted.
   - The site loads correctly on a real phone, not just a browser resized
     to a phone width.

**Recommended (not required):** most static hosts offer free HTTPS,
gzip/brotli compression, and CDN caching automatically — enabling these
(usually on by default) will noticeably improve real-world load times
beyond what's observable when testing the raw files locally. Also
consider restricting the Edge Function's CORS header (currently `*` in
`supabase/functions/send-booking-emails/index.ts`) to your real domain
once you know it, and disabling public sign-ups in Supabase Auth so only
staff you personally invite can access `admin/`.

---

## Making Code Changes — the Minified Files

Every CSS and JS file exists in two versions:

- **Source** (`style.css`, `main.js`, `fleet-data.js`, etc.) — readable,
  commented, meant to be edited.
- **Minified** (`style.min.css`, `main.min.js`, `fleet-data.min.js`,
  etc.) — a compressed copy with no comments or extra whitespace, smaller
  and faster to load. **This is the version every HTML page actually
  references.**

If you edit a source file and don't regenerate its minified copy, your
changes won't appear on the live site. To regenerate, with
[Node.js](https://nodejs.org) installed, run from the project's root
folder:

```bash
# CSS
npx clean-css-cli -o css/style.min.css css/style.css
npx clean-css-cli -o css/fleet-detail.min.css css/fleet-detail.css
npx clean-css-cli -o css/fonts.min.css css/fonts.css

# JavaScript
npx terser js/main.js -o js/main.min.js --compress --mangle
npx terser js/fleet-data.js -o js/fleet-data.min.js --compress --mangle
npx terser js/fleet-render.js -o js/fleet-render.min.js --compress --mangle
npx terser js/fleet-detail.js -o js/fleet-detail.min.js --compress --mangle
npx terser js/analytics.js -o js/analytics.min.js --compress --mangle
```

Re-run only the command for the file(s) you actually changed. If you'd
rather not run commands at all, a developer can do this in a couple of
minutes any time you have content or code changes ready to publish.
