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
- [ ] Replace the phone number, email, and hours with your real business
      information (see
      [Updating Business Information](#updating-business-information)) —
      Instagram is already set to the real handle.
- [ ] Replace placeholder fleet photography with real photos (see
      [Replacing Images](#replacing-images)).
- [ ] Replace the three placeholder testimonials with real, verifiable
      customer reviews, or remove them (see
      [Structured Data & SEO](#structured-data--seo) — this affects more
      than just what's visible on the page).
- [ ] As you document real charters, add them to `js/experiences-data.js`
      so the homepage Luxury Experiences section and each yacht's Recent
      Experiences panel stop showing "coming soon" (see
      [Luxury Experiences & Recent Charters](#luxury-experiences--recent-charters)).
- [ ] If a high-profile client agrees to be named and quoted, add their
      endorsement to `js/clientele-data.js` — never before they've
      explicitly approved it (see
      [Clientele / Social Proof Section](#clientele--social-proof-section)).
- [ ] Add your real street address to the structured data if you have a
      public office/marina address (optional but improves local SEO).
- [ ] Activate Google Analytics and/or the Meta Pixel if you plan to use
      them (see [Analytics & Tracking](#analytics--tracking)).
- [ ] Update the WhatsApp number in the floating contact menu, or remove
      that button if you don't use WhatsApp for business.
- [ ] As real yacht walkthroughs, drone footage, Reels, TikTok videos, or
      client videos are filmed, add them to the relevant data file
      (`fleet-data.js`, `experiences-data.js`, or `instagram-data.js`) so
      the homepage Videos section stops showing "coming soon" for that
      category (see [Videos Section](#videos-section)).

The official logo is already integrated sitewide (nav, footer, favicon,
apple touch icon, and social share image) — see
[Brand Logo](#brand-logo) if the client ever sends a revised logo file.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Brand Logo](#brand-logo)
3. [Replacing Images](#replacing-images)
4. [Adding or Editing Fleet Items](#adding-or-editing-fleet-items)
5. [Fleet Manager (Admin CMS)](#fleet-manager-admin-cms)
6. [Media Manager (Admin CMS)](#media-manager-admin-cms)
7. [Updating Business Information](#updating-business-information)
8. [Instagram Section](#instagram-section)
9. [Luxury Experiences & Recent Charters](#luxury-experiences--recent-charters)
10. [Clientele / Social Proof Section](#clientele--social-proof-section)
11. [Videos Section](#videos-section)
12. [How Booking Requests Work](#how-booking-requests-work)
13. [Database Setup](#database-setup)
14. [Environment Variables](#environment-variables)
15. [Email Configuration](#email-configuration)
16. [Analytics & Tracking](#analytics--tracking)
17. [Structured Data & SEO](#structured-data--seo)
18. [Future CMS Integration](#future-cms-integration)
19. [How Deployment Works](#how-deployment-works)
20. [Making Code Changes — the Minified Files](#making-code-changes--the-minified-files)

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
│   ├── media-components.css   Shared gallery/video/experience-card
│   │                           styles — loaded by every page that uses
│   │                           IconicMedia (see below)
│   ├── media-components.min.css
│   └── fonts.css / fonts.min.css   Self-hosted font declarations
├── js/
│   ├── fleet-data.js       Every yacht and car lives here — see below
│   ├── fleet-render.js     Turns fleet-data.js entries into the card HTML
│   ├── fleet-detail.js     Populates fleet/vehicle.html from fleet-data.js
│   ├── media-components.js    Shared icon/video-card/placeholder toolkit
│   │                           (window.IconicMedia) reused by the
│   │                           Instagram, Experiences, and fleet-detail
│   │                           scripts
│   ├── instagram-data.js  Instagram profile/posts/reels — see below
│   ├── instagram.js        Populates the homepage Instagram section
│   ├── experiences-data.js    Every documented charter — see below
│   ├── experiences.js      Populates the homepage Luxury Experiences section
│   ├── clientele-data.js  Clientele categories + approved endorsements
│   ├── clientele.js        Populates the homepage Clientele section
│   ├── videos.js           Populates the homepage Videos section from
│   │                        fleet/experiences/Instagram video content
│   ├── analytics.js        Google Analytics / Meta Pixel tracking helper
│   ├── main.js             Site-wide behavior (nav, forms, lightbox, etc.)
│   └── *.min.js            Minified copies actually loaded by the pages
├── images/                 Photography (JPEG + WebP pairs) + logo/favicon
│                            files (logo-icon.png, logo-full.png,
│                            favicon-*.png, apple-touch-icon.png,
│                            og-image-brand.jpg — see "Brand Logo" below)
├── favicon.ico             Multi-size favicon, referenced from the site root
├── fonts/                  Self-hosted webfont files
└── CLIENT_SETUP.md         This file
```

**Source vs. minified files:** every CSS/JS file has a full-size version
(e.g. `main.js`) and a `.min.js`/`.min.css` version that's actually
referenced by the HTML pages. Always edit the full-size source file, then
re-minify — see [Making Code Changes](#making-code-changes--the-minified-files).

---

## Brand Logo

The official logo (the yacht/palm mark with the "IconicYacht Experience"
wordmark) is now integrated across the site:

- **Nav (desktop + mobile)** and **footer** use just the icon mark (boat +
  palm + wave), in a small gold-tinted badge, next to the site's existing
  "Iconic Rentals" text. The full lockup's wordmark is navy-on-transparent
  and nearly invisible against the site's near-black nav/footer — that was
  tested directly and only the icon (which reads clearly on dark) is used
  in either spot. The full lockup (icon + wordmark) appears on the
  branded social-share image instead, sized much larger there.
- **Favicon**: `favicon.ico` (multi-size) plus `images/favicon-32.png` and
  `images/favicon-192.png`, all on a dark rounded-square backdrop so the
  mark stays visible in both light and dark browser chrome.
- **Apple touch icon**: `images/apple-touch-icon.png` (180×180), same
  dark rounded-square treatment (iOS fills transparent areas with black
  otherwise).
- **Social sharing preview (Open Graph)**: `images/og-image-brand.jpg`
  (1200×630) — the full logo lockup centered on a branded dark/gold
  gradient background, used for `og:image` and `twitter:image` on both
  `index.html` and `fleet/vehicle.html`.

**If the client provides a new or updated logo file:** the source files
these were generated from are the master assets — replace
`images/logo-icon.png` / `.webp` (icon only, transparent background) and
`images/logo-full.png` / `.webp` (icon + wordmark, transparent
background) with new versions in the same aspect ratio, then regenerate
`favicon.ico`, `images/favicon-32.png`, `images/favicon-192.png`,
`images/apple-touch-icon.png`, and `images/og-image-brand.jpg` from the
new icon/lockup (any image editor, or ask a developer — this is a
five-minute job). No HTML/CSS changes are needed as long as the new files
keep the same filenames.

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

**This is still the only way to change what visitors actually see.** A
Fleet Manager now exists in the admin dashboard (below) backed by a real
database — but the public site doesn't read from that database yet, on
purpose (see "Fleet Manager" below for why). Editing `fleet-data.js` the
way this section describes remains the real, live editing path today.

---

## Fleet Manager (Admin CMS)

`admin/fleet.html` (linked from the "Fleet" tab in the admin dashboard
header) is a database-backed fleet management tool, separate from — and
not yet connected to — the public website. Think of it as the staging
ground for a CMS the site will eventually run on, not a live editor yet.

### What it does today

- Lists every vehicle stored in the database, grouped into Yachts and
  Cars, with search, filters (type, published, draft, featured,
  available), and sorting (name, category, recently updated).
- **View** opens a read-only summary. **Edit** opens the full editor —
  name, slug, category, tagline, description, pricing, capacity,
  specifications, features, and amenities, plus three independent status
  toggles (see below). **Duplicate** opens the editor pre-filled from an
  existing vehicle, saved as a new one once you save. **Delete** removes
  a vehicle permanently, after a confirmation prompt.
- Everything you change here is saved to the real database immediately —
  this part is real, not a mockup. What it isn't connected to yet is the
  public site.

### Publishing, Availability, and Featured — three separate switches

- **Published** — whether this vehicle is meant to be public at all.
  Turning this on today does **not** make it appear on the live site
  (see "Why the public site doesn't read from here yet" below) — it's
  groundwork for when it does.
- **Available** — whether it's currently bookable, independent of
  whether it's published. A published yacht getting serviced can be
  marked unavailable without hiding it from the site entirely — once the
  frontend migration below happens, this is how a temporary "currently
  unavailable" state would work without unpublishing anything.
- **Featured** — surfaces a vehicle first wherever "featured" vehicles
  are shown. Has no visible effect on the public site today, for the
  same reason as Published.

### How new vehicles will be added later

There's no "Add Vehicle from scratch" button in this phase — **Duplicate**
is the only way to create a new database row today, by starting from an
existing vehicle and changing every field. A dedicated blank-slate
"Add Vehicle" flow is planned for a later phase, deliberately paired with
photo/video upload (not yet built either) — a brand-new vehicle needs
real photography before it makes sense to publish, so the two are being
built together rather than shipping a vehicle record with no way to add
its pictures.

### Why the public site doesn't read from here yet

Two things have to both be true before the public site can safely switch
from `fleet-data.js` to this database: every vehicle's real photography
needs to exist in Supabase Storage (the Media Manager below can now do
that part — see [Media Manager (Admin CMS)](#media-manager-admin-cms)),
and the frontend templates need to be pointed at the new data source.
That second part hasn't happened yet, on purpose — see "Future CMS
Integration" below for the exact mechanism already prepared for when
that switch happens.

Who can use it: the same sign-in as the booking dashboard (see "Admin
Dashboard Access" above) — both `admin` and `staff` accounts can sign in
and use the Fleet Manager today; only `admin` accounts can actually save
changes (create, edit, duplicate, or delete a vehicle). A `staff` account
attempting to save sees a clear "you may not have permission" message
rather than a silent failure.

---

## Media Manager (Admin CMS)

`admin/media.html` (linked from the "Media" tab in the admin dashboard
header, and from a "Media" button on each vehicle card / a "Open Media
Manager" button inside the Fleet Editor) is where real photos and videos
actually get uploaded to Supabase Storage and attached to a vehicle or
experience. Like the Fleet Manager, this is real — every upload, replace,
and delete here happens against the live database and Storage buckets
immediately.

**The Fleet Manager itself never uploads files.** Editing a vehicle's
name, pricing, or specs happens in the Fleet Editor; attaching its
photos and videos always happens here, in the Media Manager.

### Uploading media

1. Click **+ Upload Media**.
2. Choose what the file(s) attach to — a **Vehicle** (pick it from the
   dropdown, then a media kind and section/slot) or an **Experience**
   (pick it from the dropdown — this stays empty until an experience
   exists to attach media to; documenting a charter in
   `js/experiences-data.js` today doesn't create a database row yet, so
   there's nothing to select until a later phase adds an Experience
   Manager).
3. For vehicles, most sections (Exterior, Interior, Lifestyle, Drone,
   and all four video categories) are made of fixed slots — Bow, Master
   Cabin, Full Walkthrough, and so on — so you upload one file per slot.
   **Gallery** is the exception: it's an open list, so drag in as many
   photos as you like at once.
4. Drag files onto the dropzone, or click **Browse Files**. Each file
   gets its own progress bar; you can **Cancel** an in-flight upload or
   **Retry** one that failed (wrong file type, too large, a dropped
   connection) without re-selecting everything else in the batch.
5. Click **Upload All**.

### Replacing media

Every item in the Media Library has a **Replace** button. Pick a new
file of the same kind (a photo slot only accepts another photo, a video
slot only another video) and confirm — the old file is swapped out
immediately; nothing needs to be deleted and re-uploaded separately.

### Deleting media

Click **Delete** on any item and confirm. This removes both the file in
Storage and its database record together — Iconic Rentals' Media Manager
never leaves one without the other, so there's nothing to clean up by
hand afterward.

### The Media Library

The main view lists every uploaded item across every vehicle and
experience, with:

- **Filters** — Vehicle vs. Experience, Images vs. Videos, Published vs.
  Draft (this follows the parent vehicle's/experience's own Published
  toggle from the Fleet Editor — a media item has no separate published
  state of its own).
- **Search** — matches filename, the vehicle/experience name, or the
  section/slot.
- **Sort** — Newest, Oldest, or Filename.

There's no pagination yet — fine for the current fleet size, worth
revisiting if the library grows into the hundreds of items.

### Storage buckets

Four buckets, all pre-existing on the Supabase project and reused as-is
(no new buckets were created for this):

| Bucket | Holds |
|---|---|
| `fleet-images` | Vehicle photos (hero, card, gallery, exterior, interior, lifestyle, drone) |
| `fleet-videos` | Vehicle videos (walkthrough, Reels, TikTok, 360° tours) |
| `experience-images` | Experience cover photos and photo galleries |
| `experience-videos` | Experience videos |

All four are public-read (matching how `/images/*` already works on the
public site today) with admin-only upload/replace/delete, enforced by
Row Level Security on `storage.objects` — the same `is_admin()` check
used everywhere else in the dashboard.

### Supported formats

- **Images:** JPG, JPEG, PNG, WEBP
- **Videos:** MP4, MOV, WEBM

Anything else is rejected before it uploads, both by the Media Manager
itself and — as a second, server-side check that a direct API call
can't bypass — by the Storage buckets' own `allowed_mime_types`
configuration.

### Maximum upload sizes

- **Images:** 20 MB per file
- **Videos:** 500 MB per file

Also enforced twice (client-side and on the bucket itself), same
reasoning as file types above. If you need larger video files than this,
increase the relevant buckets' `file_size_limit` in **Supabase Dashboard
> Storage** (or via
`supabase/migrations/20260726220000_media_storage_constraints.sql`) —
just confirm your Supabase plan's own per-file limit can accommodate it
first.

### Recommended image sizes

For sharp results without unnecessarily large page weight:

- **Hero / Card images:** 1600×1200px (4:3), optimized to roughly
  200–500 KB.
- **Gallery / Exterior / Interior / Lifestyle / Drone:** 1600×1200px
  (4:3) is a good default; wider aerial/drone shots can go up to
  1920×1080px (16:9).

### Recommended video sizes

- **Walkthrough videos:** 1080p (1920×1080), H.264 MP4, under ~2 minutes
  where possible.
- **Reels / TikTok:** vertical 1080×1920 (9:16), matching how they're
  filmed for those platforms natively.
- **360° tours:** whatever your tour provider exports — these are
  usually embedded/linked rather than re-encoded.

None of this is enforced by the Media Manager — they're recommendations
for what looks good and loads quickly on the public site once the
frontend migration in [Future CMS Integration](#future-cms-integration)
happens.

---

## Updating Business Information

Your phone number, email, and hours are still placeholders and appear in
several places. Search-and-replace each of the following across
`index.html`, `fleet/vehicle.html`, and `js/fleet-detail.js`:

| What | Current placeholder value |
|---|---|
| Phone (display) | `(305) 555-0198` |
| Phone (link format) | `+13055550198` |
| Email | `concierge@iconicrentalsmiami.com` |
| WhatsApp number | `13055550198` (inside the `wa.me/` link in the floating contact menu) |
| Business hours | `Daily · 8:00 AM – 10:00 PM` (Contact section) and the `openingHoursSpecification` in the structured data block near the top of `index.html` |

**Instagram is already configured** with the real handle,
[@iconic_yacht](https://www.instagram.com/iconic_yacht/) — every link on
the site (Instagram section, footer, contact section, structured data)
already points there. See
[Instagram Section](#instagram-section) below for how the feed itself
works and how to keep it updated.

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

## Instagram Section

The homepage "Follow the Journey" section (profile card, Recent Posts
grid, and Reels row) is entirely data-driven from `js/instagram-data.js`.
To update it, edit that one file — no HTML/CSS changes are needed.

**Profile card** — edit the `INSTAGRAM_PROFILE` object: `bio`, `avatar`
(path to a square photo, or leave `null` to keep the "IR" monogram),
`followerCount`, and `postCount`. Both counts are `null` today and render
as an em dash (`—`) rather than a guessed number — only fill them in with
real, current figures.

**Recent Posts** — `INSTAGRAM_POSTS` is an array of `{ id, media_type,
media_url, media_url_webp, permalink, caption, timestamp }` objects. Add,
remove, or reorder entries to change what shows in the grid; each needs a
real image path and a `permalink` (link to the actual post, or the profile
URL if you'd rather not link a specific post).

**Reels** — `INSTAGRAM_REELS` is empty until you have real Reels to
feature. Leave it empty and the section shows an honest "Reels are coming
soon" message; add entries in the same shape once you have them
(`caption`, `permalink`, `thumbnail_url`).

**Connecting the real Instagram Graph API later:** the data shape here
already matches what the Graph API's `IG Media` endpoint returns, so
swapping manual entries for a live feed is a data-source change, not a
redesign — see the migration note at the bottom of `js/instagram-data.js`
for the exact steps.

After editing, re-minify `js/instagram-data.js` (see
[Making Code Changes](#making-code-changes--the-minified-files)).

---

## Luxury Experiences & Recent Charters

Every documented charter — a birthday party, a proposal, a corporate
event, and so on — lives in one file: `js/experiences-data.js`. A single
entry there automatically shows up in **two** places: the homepage
"Luxury Experiences" section, and (if it's tied to a specific yacht) that
yacht's own "Recent Experiences on This Yacht" panel on its detail page.

To add a real, completed charter, push a new object into the
`EXPERIENCES_DATA` array. The full shape (documented at the top of the
file) is:

```
{
  id, title, category, date, yachtSlug,
  coverImage: { src, webp, alt } | null,
  photos: [{ src, webp, alt }],
  videos: [{ label, platform, url, thumbnail, thumbnailWebp }],
  instagramPost, instagramReel,
  description,
  clientReview: { quote, guestName, rating } | null,
  featured
}
```

- `category` must be one of the keys in `EXPERIENCE_CATEGORIES` (birthday,
  proposal, bachelor, corporate, sunset, athlete, influencer, vacation,
  family, vip).
- `yachtSlug` should match a `slug` from `js/fleet-data.js` if the charter
  happened on a specific yacht (so it also appears on that yacht's page);
  leave it `null` for a car rental or a general charter.
- Only add a `clientReview` if the guest actually gave one and agreed to
  have it published — never write one in on their behalf.
- `featured: true` moves that entry to the front of the homepage grid.

The array is empty today — no charters have been documented yet — so both
the homepage section and every yacht page show an honest "coming soon"
message instead of invented example content. Nothing else needs to
change when you add the first real entry; the empty states disappear on
their own.

After editing, re-minify `js/experiences-data.js`.

---

## Clientele / Social Proof Section

The homepage "Trusted by Miami's Most Discerning Clientele" section has
two parts, both driven by `js/clientele-data.js`:

- **Category cards** (Professional Athletes, College Athletes, Influencers
  & Creators, Luxury Travelers, Celebrities & Public Figures, Corporate
  Clients) — general descriptions of the kinds of guests you serve, not
  tied to any named individual. Edit `CLIENTELE_CATEGORIES` if you want to
  change the wording or add another category.
- **Endorsements** — real, named quotes from real clients or brands.
  `CLIENTELE_ENDORSEMENTS` is intentionally empty. **Only add an entry
  once that specific person or brand has explicitly agreed to be named and
  quoted on the site.** Each entry needs `approved: true` to render at
  all — this is a deliberate safeguard, not just a formality. Never invent
  a name, quote, logo, or endorsement here; until an entry is added, the
  section shows an honest "endorsements will appear here once approved"
  message rather than fabricated social proof.

After editing, re-minify `js/clientele-data.js`.

---

## Videos Section

The homepage "Videos" section shows one card per video type — Yacht
Walkthroughs, Drone Footage, Instagram Reels, TikTok Videos, Charter
Highlights, and Client Videos — driven entirely by `js/videos.js`. This
file doesn't hold its own content; it just looks for the first available
real video in each category across three existing sources, in this order:

- **Yacht Walkthroughs / Drone Footage / TikTok Videos**: the `videos`
  object on each yacht/car entry in `js/fleet-data.js` (fields like
  `videos.walkthrough`, `videos.tiktok` — same data that powers each
  vehicle's own "Videos & Tours" tab).
- **Instagram Reels**: `INSTAGRAM_REELS` in `js/instagram-data.js` first,
  falling back to any yacht/car's `videos.reels`.
- **Charter Highlights / Client Videos**: the `videos` array on each entry
  in `js/experiences-data.js` (`platform: 'client'` for Client Videos).

There is nothing to edit in `js/videos.js` itself — add a real video URL
to whichever of those three files it actually belongs to (a yacht's
walkthrough, an experience's highlight reel, an Instagram Reel), and it
automatically appears here too. A category with no real video yet shows
the same "coming soon" placeholder used everywhere else on the site.

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
there's no separate username/password system to manage. Signing in
happens on its own page, `admin/login.html`; `admin/index.html` itself
checks for a valid, authorized session the moment it loads and sends
anyone without one to the login page instead of showing any inquiry
data.

#### How you (the owner) log in

1. Go to `yourdomain.com/admin/` (or `admin/login.html` directly). If
   you're not already signed in, you'll land on the sign-in form
   automatically.
2. Enter the email and password for your account (see below for creating
   one if you haven't yet).
3. On success you're taken straight to the inquiries dashboard. Your
   session is remembered across visits — you won't need to sign in again
   on the same browser until you sign out or the session naturally
   expires.
4. Click **Sign Out** in the top-right corner when you're done on a
   shared or public computer. This ends the session and returns you to
   the sign-in page.

#### Creating another admin or staff account

There's no self-service sign-up (deliberately — see the security notes
below), so every account is created by hand, once, in the Supabase
dashboard:

1. Go to **Authentication > Users > Add user** and create an account
   (email + password) for the person who needs access. Repeat for each
   person individually.
2. That's enough for **staff-level** access on its own — a newly created
   account defaults to the `staff` role automatically and can already
   sign in and use the dashboard.
3. To grant **admin** instead of staff (there's no functional difference
   between the two yet — see "Roles today vs. later" below, but the
   distinction exists for tables added in a future phase), open
   **SQL Editor > New query** and run, filling in the new user's ID from
   the Users list:
   ```sql
   update profiles set role = 'admin' where id = '<the-user-id>';
   ```
4. **Turn off public sign-ups** once, the first time you set this up, so
   a stranger can never create their own account: **Authentication >
   Providers > Email**, disable "Allow new users to sign up." Staff
   accounts are only ever added by you, from the dashboard.

Removing someone's access: delete their row in **Authentication > Users**
— their profile record and dashboard access go with it.

#### Roles today vs. later

Every account is one of two roles, tracked in a `profiles` table:

- **`staff`** — the default for a brand-new account. Can sign in and use
  the booking inquiries dashboard exactly like an admin can today.
- **`admin`** — the same access today, plus it's the role that will gate
  full content-management (fleet, experiences) once that's built in a
  future phase. Granting `admin` now to whoever should eventually manage
  that content saves a step later.

Both roles are allowed into the dashboard as it exists today — the
distinction is groundwork for later, not a restriction you'll notice yet.

#### Security notes

- **Row Level Security (RLS), not this login screen, is what actually
  protects the data.** The sign-in form and the role check are a
  convenience UI — even if someone found a way around them, the database
  itself refuses to hand back `booking_requests` rows (or the other
  tables) to anyone who isn't signed in with a valid session, no matter
  what request they send.
- **Only the anon key is ever in the site's code**, never the
  `service_role` key — the anon key is meant to be public (see
  "Environment Variables" below) and RLS is what makes that safe.
- A signed-in session with no matching `profiles` row (or a role outside
  `admin`/`staff`) is treated as **no access** and sent back to the login
  page — access fails closed, not open, if anything about a user's
  profile is missing or unexpected.
- This page is marked `noindex` so search engines won't list it, but
  that alone doesn't secure it — the points above are what do.

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
later is a data change, not a rebuild — and as of the Fleet Manager
(above), the database half of that CMS already exists:

- Every fleet item (yacht or car) is a single JavaScript object in
  `js/fleet-data.js`, with a flat, predictable shape (`slug`, `type`,
  `name`, `category`, `description`, `specs`, `amenities`, `gallery`,
  etc.). The `fleet_items` / `fleet_media` tables in Supabase (see
  `supabase/SCHEMA_PROPOSAL.md`) already use that same shape — that
  wasn't a coincidence, it was designed this way from the start.
- All rendering logic (`js/fleet-render.js` for cards,
  `js/fleet-detail.js` for the detail page) reads from `js/fleet-data.js`
  through a small set of functions (`getFleetItem`, `getFleetByType`,
  `getRelatedFleet`) — it never reaches into the data array directly.
  That indirection is what makes the swap possible.
- `js/fleet-supabase-adapter.js` already implements the Supabase side of
  that swap — same function names, same data shape, built to satisfy the
  exact migration steps documented in the comment block at the bottom of
  `js/fleet-data.js`. It is **not loaded by any page yet.**

A developer doing this migration would: (1) make sure every vehicle
meant to go live has `published = true` and real photos uploaded to the
`fleet-images`/`fleet-videos` Storage buckets, (2) swap the `<script
src="js/fleet-data.js">` tag for `js/fleet-supabase-adapter.js` plus a
call to its `.load()` method, and (3) move the existing render calls in
`fleet-render.js`/`fleet-detail.js` inside a listener for the
`iconic:fleet-ready` event that `.load()` dispatches, instead of running
at the bottom of the script as they do today. The HTML templates, CSS,
and card markup stay untouched either way.

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
   `netlify.toml` in the project root pre-configures cache headers
   (long-lived caching for images/fonts/minified CSS/JS, always-
   revalidate for HTML pages) and baseline security headers for
   Netlify specifically — it's ignored by every other host and safe to
   delete if you deploy elsewhere.
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
npx clean-css-cli -o css/media-components.min.css css/media-components.css
npx clean-css-cli -o css/fonts.min.css css/fonts.css

# JavaScript
npx terser js/main.js -o js/main.min.js --compress --mangle
npx terser js/fleet-data.js -o js/fleet-data.min.js --compress --mangle
npx terser js/fleet-render.js -o js/fleet-render.min.js --compress --mangle
npx terser js/fleet-detail.js -o js/fleet-detail.min.js --compress --mangle
npx terser js/media-components.js -o js/media-components.min.js --compress --mangle
npx terser js/instagram-data.js -o js/instagram-data.min.js --compress --mangle
npx terser js/instagram.js -o js/instagram.min.js --compress --mangle
npx terser js/experiences-data.js -o js/experiences-data.min.js --compress --mangle
npx terser js/experiences.js -o js/experiences.min.js --compress --mangle
npx terser js/clientele-data.js -o js/clientele-data.min.js --compress --mangle
npx terser js/clientele.js -o js/clientele.min.js --compress --mangle
npx terser js/videos.js -o js/videos.min.js --compress --mangle
npx terser js/analytics.js -o js/analytics.min.js --compress --mangle
```

Re-run only the command for the file(s) you actually changed. If you'd
rather not run commands at all, a developer can do this in a couple of
minutes any time you have content or code changes ready to publish.
