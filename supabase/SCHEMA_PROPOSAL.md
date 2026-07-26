# Database Schema Proposal — Phase 6.0 Foundation

**Status: proposal only. Nothing in this document has been created in the
database.** It exists so the tables built in a future phase have an agreed
shape before any `create table` runs, and so the mapping from today's
static JS data files to tomorrow's tables is written down in one place.

The only table that actually exists — in `supabase/schema.sql` and now
also `supabase/migrations/20260726120000_booking_requests_baseline.sql`
— is `booking_requests`. Everything below is new.

---

## 1. Current data architecture (what's being replaced)

Four files under `js/` currently hold every piece of marketing content on
the site as hand-edited JS arrays. All four already document their own
"CMS/API migration path" in a comment at the bottom of the file — this
proposal's table design follows those comments directly rather than
inventing a new shape:

| File | Global | Shape | Notes |
|---|---|---|---|
| `js/fleet-data.js` | `window.IconicFleet` | Array of 10 yacht/car objects | Largest and most structured file — each item has flat fields, a `specs` object, `features`/`amenities` arrays, a categorized `galleries` object (exterior/interior/lifestyle/drone, each a fixed list of named slots), and a categorized `videos` object (walkthrough/reels/tiktok/tours360) |
| `js/experiences-data.js` | `window.IconicExperiences` | Array (currently empty) + a fixed `EXPERIENCE_CATEGORIES` list | One entry per documented charter; links back to `fleet-data.js` by `yachtSlug`; has its own photos/videos, an optional Instagram post/reel link, and an optional client review |
| `js/instagram-data.js` | `window.IconicInstagram` | One `profile` object + two arrays (`posts`, `reels`) | Deliberately shaped to match the Instagram Graph API's `IG Media` object one-for-one, per its own header comment |
| `js/clientele-data.js` | `window.IconicClientele` | Fixed `CLIENTELE_CATEGORIES` list + an `endorsements` array (currently empty) | Categories are generic marketing copy; endorsements require `approved: true`, set only after a named client has given permission |

Every one of these files already treats "empty" as a valid, honestly-
rendered state (no invented placeholder content) — the proposed tables
preserve that behavior: an empty table renders the same "coming soon"
UI an empty array does today.

---

## 2. Proposed tables

Names are provisional. `jsonb` is used where the source data is already a
free-form object (`specs`) rather than inventing more join tables than
the data warrants.

### `fleet_items`
Replaces the `FLEET_DATA` array's flat fields.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `slug` | text, unique, not null | e.g. `azure-horizon` — used in URLs today, keep it |
| `type` | text, not null | `yacht` \| `car` (check constraint) |
| `name` | text, not null | |
| `category` | text, not null | e.g. "Motor Yacht", "Super Sport" |
| `tagline` | text | |
| `description` | text | |
| `specs` | jsonb, not null default `{}` | Mirrors the existing `specs` object exactly (`{"Length": "85 ft", ...}`) — order-sensitive display, so jsonb over a specs table |
| `features` | text[], not null default `{}` | Short badge list |
| `amenities` | text[], not null default `{}` | |
| `capacity` / `seats` | integer | Yachts use `capacity`, cars use `seats` — proposal: one nullable `capacity` column, repurposed per `type` |
| `book_label` | text | |
| `sort_order` | integer, not null default `0` | Explicit control over fleet-grid ordering, since array order did this implicitly before |
| `created_at` / `updated_at` | timestamptz | |

### `fleet_media`
Replaces `gallery`, `galleries.{exterior,interior,lifestyle,drone}`, and
`videos.{walkthrough,reels,tiktok,tours360}` — one flexible table instead
of eight near-identical ones, since every one of those is "a labeled slot
that's either a real asset or `null`."

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `fleet_item_id` | uuid, FK → `fleet_items.id`, not null | |
| `kind` | text, not null | `photo` \| `video` |
| `section` | text, not null | `hero` \| `card` \| `gallery` \| `exterior` \| `interior` \| `lifestyle` \| `drone` \| `walkthrough` \| `reels` \| `tiktok` \| `tours360` |
| `slot_key` | text | e.g. `bow`, `flybridge`, `full-walkthrough` — matches today's `key` field, kept for stable slot identity even while `storage_path` is null |
| `label` | text | e.g. "Bow", "Flybridge" — shown in the "coming soon" placeholder today |
| `storage_path` | text, nullable | Path into the `media` storage bucket (see below); **null is the expected default**, not implemented in this phase |
| `platform` | text, nullable | For video rows: `video` \| `instagram` \| `tiktok` \| `tour360` |
| `alt` | text | |
| `sort_order` | integer, not null default `0` | |

A row with `storage_path is null` is exactly today's "coming soon"
placeholder slot — the frontend's existing empty-state rendering needs no
new concept, just a different data source.

### `experiences`
Replaces `EXPERIENCES_DATA`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `title` | text, not null | |
| `category` | text, not null | Check constraint against the 10 keys in `EXPERIENCE_CATEGORIES` |
| `date_text` | text | Kept as free text ("June 2026"), matching today's shape, rather than forcing a real date the source data doesn't have |
| `yacht_slug` | text, nullable, FK → `fleet_items.slug` | Nullable exactly as today, for an experience not tied to one yacht |
| `description` | text | |
| `instagram_post_url` | text, nullable | |
| `instagram_reel_url` | text, nullable | |
| `client_review_quote` | text, nullable | Folded onto this table rather than a separate one — it's an optional 1:1, not a list |
| `client_review_guest_name` | text, nullable | |
| `client_review_rating` | integer, nullable | |
| `featured` | boolean, not null default `false` | |
| `created_at` | timestamptz | |

### `experience_media`
Replaces each experience's `photos` and `videos` arrays. Same shape
philosophy as `fleet_media`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `experience_id` | uuid, FK → `experiences.id`, not null | |
| `kind` | text, not null | `cover` \| `photo` \| `video` |
| `storage_path` | text | |
| `platform` | text, nullable | For video rows, per `js/media-components.js`'s existing platform types |
| `label` | text, nullable | |
| `alt` | text, nullable | |
| `sort_order` | integer, not null default `0` | |

### `instagram_profile`
Replaces the `profile` object. Singleton table (one row) rather than a
key/value settings table, so the shape stays obvious and typed.

| Column | Type | Notes |
|---|---|---|
| `id` | integer, PK, check `id = 1` | Enforces exactly one row |
| `handle` | text | |
| `name` | text | |
| `url` | text | |
| `bio` | text | |
| `avatar_storage_path` | text, nullable | |
| `follower_count` | integer, nullable | **Stays null until a real number exists** — same "never fabricate" rule the JS file already enforces in its own comment |
| `post_count` | integer, nullable | |
| `updated_at` | timestamptz | |

### `instagram_posts`
Replaces `INSTAGRAM_POSTS` and `INSTAGRAM_REELS` (`is_reel` distinguishes
them, rather than two tables, since they share every other field).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `ig_media_id` | text, unique, nullable | The real Graph API media id, once connected — nullable for today's manually-curated stand-in posts |
| `media_type` | text, not null | Mirrors Graph API's `IMAGE` \| `VIDEO` \| `CAROUSEL_ALBUM` |
| `is_reel` | boolean, not null default `false` | |
| `storage_path` | text, nullable | Cached copy — Graph API `media_url` values expire, so a real integration needs to persist a copy, not just store the URL |
| `permalink` | text | |
| `caption` | text | |
| `posted_at` | timestamptz, nullable | Maps to Graph API's `timestamp` |
| `sort_order` | integer, not null default `0` | |

### `clientele_categories`
Replaces `CLIENTELE_CATEGORIES`. Low-churn marketing copy — included for
completeness/editability, but arguably the weakest case for migrating out
of a static file of the four (see §4).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `key` | text, unique, not null | |
| `label` | text, not null | |
| `description` | text | |
| `sort_order` | integer, not null default `0` | |

### `clientele_endorsements`
Replaces `CLIENTELE_ENDORSEMENTS`. The `approved` gate that already exists
in the JS file's own contract carries over unchanged.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text, not null | |
| `role` | text | e.g. "PGA Tour" |
| `quote` | text | |
| `photo_storage_path` | text, nullable | |
| `logo_storage_path` | text, nullable | |
| `approved` | boolean, not null default `false` | **Every read path must filter on `approved = true`** — same rule as `getApproved()` in the JS file today |
| `sort_order` | integer, not null default `0` | |
| `created_at` | timestamptz | |

---

## 3. Relationships

```
fleet_items 1───* fleet_media
fleet_items 1───* experiences        (experiences.yacht_slug → fleet_items.slug, nullable)
experiences 1───* experience_media
instagram_profile (singleton, no FK)
instagram_posts    (no FK — standalone, matches today's flat array)
clientele_categories (no FK — standalone marketing copy)
clientele_endorsements (no FK — standalone; not linked to categories today, and
                         the source data doesn't imply that link either)
booking_requests   (already live; fleet_item is a free-text label today,
                     not a FK — see §4 for whether that should change)
```

No table in this proposal has a foreign key into `booking_requests`, and
`booking_requests` doesn't reference `fleet_items` by id — it stores
`fleet_item` as the display label text, matching how the booking form
submits it today. Whether to normalize that into a real FK is flagged as
an open question in §4, not decided here.

---

## 4. Open questions for the next phase (not decided by this document)

- **`booking_requests.fleet_item` as free text vs. FK to `fleet_items.id`.**
  A real FK would guarantee referential integrity, but the current column
  also has to accept `"Not sure yet"` and free-text guesses from the
  Quick Book modal — worth deciding deliberately rather than as a side
  effect of adding `fleet_items`.
- **Does `clientele_categories` need to be a table at all?** It's six
  rows of marketing copy that changes rarely; a case can be made for
  leaving it a static JS file even after everything else migrates, purely
  to keep the migration surface smaller.
- **DELETE policy for content tables.** `booking_requests` deliberately
  has no delete policy (a permanent record matters more than a tidy
  list). That reasoning doesn't obviously carry over to, say, a
  `fleet_items` row for a car that's left the fleet — worth a real
  decision rather than copying the booking table's policy by default.

---

## 5. Storage buckets

One bucket, folder-organized by content type, rather than one bucket per
table — simpler access-policy surface, and every folder shares the same
trust model: this is all public marketing photography, exactly as public
today as the files already sitting in `/images/` that anyone can already
view directly.

**`media`** (public read)
```
/fleet/{slug}/{section}/{slot_key}.{ext}
/experiences/{experience_id}/{kind}-{n}.{ext}
/clientele/{endorsement_id}/{photo|logo}.{ext}
/instagram/{post_id}.{ext}
```

- **Read:** public (`anon` and `authenticated`) — matches the existing
  `/images/*` folder's effective access today.
- **Write:** `authenticated` only (staff, via a future admin upload flow)
  — no `anon` write policy, mirroring `booking_requests`' insert-only
  model in spirit (public can submit forms, never write files or rows
  outside their own submission).
- Not created in this phase. Declaring `[storage.buckets.media]` in
  `supabase/config.toml` is the actual creation step, deferred to when
  the `fleet_media`/`experience_media` tables that reference it exist.

---

## 6. Authentication roles

No new roles — reuses the two Supabase already provides and that
`supabase/schema.sql` already relies on for `booking_requests`:

| Role | Access once the tables above exist |
|---|---|
| `anon` (public website) | `SELECT` on every content table (`fleet_items`, `fleet_media`, `experiences`, `experience_media`, `instagram_profile`, `instagram_posts`, `clientele_categories`, and `clientele_endorsements` filtered to `approved = true`); `INSERT`-only on `booking_requests`, unchanged from today. No `anon` write access to any content table or to Storage. |
| `authenticated` (staff, via `admin/`) | Full read/write on every content table, plus the existing `SELECT`/`UPDATE` on `booking_requests`. Whether that includes `DELETE` per table is an open question — see §4. |
| `service_role` | Not used by any browser-loaded code, today or in this proposal — reserved for trusted server-side tooling only (e.g. a future scheduled Edge Function syncing the real Instagram Graph API, which `js/instagram-data.js`'s own migration-path comment already notes has to run server-side because it needs a long-lived access token). |

This keeps the security model identical to the one already documented in
CLIENT_SETUP.md for `booking_requests`: RLS is the actual boundary, not
which key is or isn't visible in a browser's network tab.

---

## 7. What Phase 6.0 Part 1 deliberately did not do

- No `create table` statements beyond the pre-existing `booking_requests`
  baseline migration.
- No storage buckets declared or created.
- No frontend code was changed to read from Supabase — `fleet-data.js`,
  `experiences-data.js`, `instagram-data.js`, and `clientele-data.js` are
  still the live source of truth for every page.
- No admin dashboard changes.

A later phase, scoped separately, should pick one table from §2 (`fleet_
items` is the natural first candidate — it's the most-used data file and
already has the clearest 1:1 field mapping), write its migration, and
migrate exactly one page's read path over — proving the pattern before
repeating it three more times.
