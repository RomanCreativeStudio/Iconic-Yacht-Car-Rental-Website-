# Iconic Rentals — Client Setup Guide

This document explains how to maintain, configure, and deploy this website
day-to-day. It assumes no coding background beyond editing text in a file
and running one command from a terminal.

**Read the "Before You Launch" checklist first — one item on it (the
booking forms) is not optional.**

---

## Before You Launch — Required Checklist

- [ ] **Connect the booking forms to a real destination.** See
      [How Booking Requests Work](#how-booking-requests-work) below —
      this is the single most important item on this list.
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
6. [Analytics & Tracking](#analytics--tracking)
7. [Structured Data & SEO](#structured-data--seo)
8. [Future CMS Integration](#future-cms-integration)
9. [How Deployment Works](#how-deployment-works)
10. [Making Code Changes — the Minified Files](#making-code-changes--the-minified-files)

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

**Read this section carefully — it describes the one thing you must fix
before this site can actually generate leads.**

There are two booking entry points on the site:

1. **The full reservation form** (`#booking` section on the homepage) —
   name, phone, email, rental type, vehicle, date, time, duration,
   guests, special requests.
2. **The Quick Book modal** — a shorter form (name, phone, email, rental
   type, preferred date) that opens from the hero, header, and contact
   "Book Your Experience" buttons for a faster inquiry path.

**Both forms currently validate and show a "Request Received" success
message entirely in the visitor's browser — neither one sends the
submitted information anywhere.** There is no backend, no email
notification, and no database. A visitor can fill out the form, see a
polished confirmation message, and your team will never know they were
there. This is intentional at this stage of the build (there was no
backend service to connect to), but **it must be wired up before this
site goes live**, or every reservation request will be silently lost.

### Fixing this — three options, easiest first

**Option A — Formspree (or a similar form backend), no server needed.**
Services like [Formspree](https://formspree.io) let a plain HTML form
POST directly to their service, which emails you the submission. Add an
`action="https://formspree.io/f/YOUR_FORM_ID"` and `method="POST"`
attribute to the `<form id="bookingForm">` and `<form id="quickBookForm">`
tags, and add `name="..."` attributes are already present on every field.
You'd then adjust the JS submit handlers in `js/main.js` to `fetch()` the
form action instead of only doing client-side validation, still showing
the same success panel on a successful response. This requires no
backend hosting of your own — usually the fastest path to "actually
receiving leads."

**Option B — Your hosting provider's built-in form handling.** Netlify,
Vercel, and several others offer built-in form capture with zero backend
code. The integration specifics vary by host; check your host's docs for
"form handling" or "form submissions."

**Option C — A custom backend/serverless function.** If you want
submissions to land in a CRM, database, or trigger custom workflows
(e.g. a Zapier automation), a small serverless function (AWS Lambda,
Vercel Functions, Cloudflare Workers, etc.) receiving a `fetch()` POST
from the same two forms is the most flexible option, but needs a
developer to build and maintain.

Whichever option you choose, the actual on-page experience (validation,
shake animation on errors, the "Request Received" success message) should
stay exactly as it is — you're only adding a destination for the data
that's already being collected and validated correctly.

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

This is a fully static site — HTML, CSS, and JavaScript files with no
build step, server-side code, or database. That makes it deployable to
almost any static host:

1. **Choose a static host.** Popular options: Netlify, Vercel, Cloudflare
   Pages, GitHub Pages, or a traditional shared-hosting provider.
2. **Upload the entire project folder** (everything in this repository)
   to your host, preserving the folder structure (`css/`, `js/`,
   `images/`, `fonts/`, `fleet/`, and `index.html` all need to stay at
   the same relative paths to each other).
3. **Set `index.html` as the site's entry point** (most hosts do this
   automatically for a file literally named `index.html` at the root).
4. **Point your domain at the host** following your host's DNS
   instructions.
5. **Verify after deploying:**
   - The homepage loads and every image appears.
   - `fleet/vehicle.html?slug=azure-horizon` (or any other slug from
     `js/fleet-data.js`) loads correctly.
   - Both booking forms submit successfully (once you've completed the
     [booking backend setup](#how-booking-requests-work) above).
   - The site loads correctly on a real phone, not just a browser resized
     to a phone width.

**Recommended (not required):** most static hosts offer free HTTPS,
gzip/brotli compression, and CDN caching automatically — enabling these
(usually on by default) will noticeably improve real-world load times
beyond what's observable when testing the raw files locally.

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
