# Database Schema Proposal — Phase 6.0 Foundation

**Status, as of Phase 6.1: the core tables below are implemented and
live** on the connected project (`booking_requests`, `profiles`,
`fleet_items`, `fleet_media`, `experiences`, `experience_media`, plus RLS
on all of them and the storage buckets in §5) — see §8 for exactly what
changed and what's still just a proposal. `instagram_profile`,
`instagram_posts`, `clientele_categories`, and `clientele_endorsements`
(§2) remain proposal only; no table for them exists yet.

**No frontend code reads from any of this yet.** `fleet-data.js`,
`experiences-data.js`, `instagram-data.js`, and `clientele-data.js` are
still the live source of truth for every page — the tables existing is
the foundation for a future, separately-scoped migration of the read
path, not that migration itself.

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

### `fleet_items` — ✅ implemented (Phase 6.1)
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

### `fleet_media` — ✅ implemented (Phase 6.1)
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
| `storage_path` | text, nullable | Path into the `fleet-images` or `fleet-videos` storage bucket, per `kind` (see §5); **null is the expected default** — no files have been uploaded |
| `platform` | text, nullable | For video rows: `video` \| `instagram` \| `tiktok` \| `tour360` |
| `alt` | text | |
| `sort_order` | integer, not null default `0` | |

A row with `storage_path is null` is exactly today's "coming soon"
placeholder slot — the frontend's existing empty-state rendering needs no
new concept, just a different data source.

### `experiences` — ✅ implemented (Phase 6.1)
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

### `experience_media` — ✅ implemented (Phase 6.1)
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

### `instagram_profile` — proposal only, not implemented
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

### `instagram_posts` — implemented differently (Phase 6.6)
Built as two separate tables, `instagram_posts` and `instagram_reels`,
each with a `published` gate and direct `media_url`/`thumbnail_url` text
fields rather than a cached `storage_path` — see
`supabase/migrations/20260727020000_phase_6_6_social_content_and_public_site_content_read.sql`.
The `is_reel` design below was superseded; kept here for the original
reasoning, not as the current schema.

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

### `clientele_categories` — implemented differently (Phase 6.4/6.5)
Built as a `site_content` row (`section = 'clientele_categories'`,
`data.items`) via Homepage CMS, not a dedicated table — reuses the same
single `site_content` table every other homepage-copy section uses,
rather than a one-off table for this one list. Live-read by the public
site as of Phase 6.5.

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

### `clientele_endorsements` — implemented differently (Phase 6.6)
Built with plain `photo`/`logo` text fields (a URL or path string) rather
than `photo_storage_path`/`logo_storage_path` — no dedicated Storage
bucket exists for endorsement photos/logos yet, so this stayed simpler
than the proposal below. See
`supabase/migrations/20260727020000_phase_6_6_social_content_and_public_site_content_read.sql`.

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

## 5. Storage buckets — implemented (revised from the original proposal)

The original version of this section proposed one unified `media` bucket,
folder-organized by content type. Phase 6.1 discovered that the site
owner had already created a set of storage buckets directly in the
Supabase dashboard *before* this document's tables existed — including
`fleet-images`, `fleet-videos`, `experience-images`, and
`experience-videos`, which map exactly to what this phase needed. Rather
than layer a second, competing bucket on top, Phase 6.1 configured RLS on
the real, pre-existing buckets instead. (A `media` bucket was briefly
created in error mid-phase, then had its policies removed and its
`public` flag reset to `false`, making it fully inert; it can't be
deleted via SQL — Storage blocks direct row deletion — so it remains as
an empty, unused, policy-less bucket until removed by hand in Dashboard >
Storage, a one-click cleanup, not a functional issue.)

**Buckets in scope for this phase** (all `public = true`, all four
sharing one RLS policy set):
```
fleet-images/{slug}/{section}/{slot_key}.{ext}
fleet-videos/{slug}/{section}/{slot_key}.{ext}
experience-images/{experience_id}/{kind}-{n}.{ext}
experience-videos/{experience_id}/{kind}-{n}.{ext}
```

- **Read:** public (`anon` and `authenticated`) — matches the existing
  `/images/*` folder's effective access today.
- **Write:** `authenticated` **and** `profiles.role = 'admin'` (the
  `is_admin()` check from §6) — no `anon` write policy, mirroring
  `booking_requests`' insert-only model in spirit (public can submit
  forms, never write files).
- No files are uploaded by this phase — every bucket is empty. Uploading
  real photography and wiring `fleet_media.storage_path` /
  `experience_media.storage_path` to point at real objects is separately
  scoped, later work.

**Buckets the owner already created but outside this phase's scope:**
`logos`, `hero`, `gallery`, `instagram`, `documents`, `avatars`. None of
these were touched — no policies added, no `public` flag changed. A
later phase should decide their access rules deliberately rather than
inheriting whatever this phase happened to configure for a different set
of buckets.

---

## 6. Authentication roles — implemented, with one addition

Phase 6.0 proposed reusing Supabase's two built-in roles unchanged.
Phase 6.1 implemented that for `booking_requests` (genuinely unchanged)
but added one thing this section didn't originally call for: a
`profiles` table (one row per Supabase Auth user, `role` = `'admin'` or
`'staff'`) and an `is_admin()` helper function, so the new content
tables' "authenticated admin: full CRUD" requirement is actually role-
gated rather than granted to any signed-in user. See
`supabase/migrations/20260726130000_profiles_and_roles.sql` for the full
design, including the auto-provisioning trigger and the backfill that
grants any pre-existing staff account `admin` by default.

| Role | Access, as implemented |
|---|---|
| `anon` (public website) | `SELECT` on `fleet_items`/`experiences` where `published = true` (and their `fleet_media`/`experience_media` rows, via a join back to the parent's `published` flag); `INSERT`-only on `booking_requests`, unchanged from before this phase. No `anon` write access to any content table or to Storage. `instagram_profile`, `instagram_posts`, `clientele_categories`, `clientele_endorsements` remain proposal-only — not implemented. |
| `authenticated`, non-admin (`profiles.role = 'staff'`, the default for any new account) | Same read access as `anon` on the new content tables — no elevated read tier for non-admin staff was implemented, since nothing in this phase called for one. Retains the existing `SELECT`/`UPDATE` on `booking_requests` (that policy checks `authenticated`, not role, unchanged). |
| `authenticated`, admin (`profiles.role = 'admin'`) | Full read (including unpublished drafts) and full `INSERT`/`UPDATE`/`DELETE` on `fleet_items`, `fleet_media`, `experiences`, `experience_media`, and the four storage buckets in §5, via `is_admin()`. Whether content tables should have a `DELETE` policy at all long-term is still the open question from §4 — this phase granted it via the blanket `for all` admin policy, which does include delete. |
| `service_role` | Not used by any browser-loaded code — reserved for trusted server-side tooling only (e.g. a future scheduled Edge Function syncing the real Instagram Graph API, which `js/instagram-data.js`'s own migration-path comment already notes has to run server-side). |

This keeps the security model identical in spirit to the one already
documented in CLIENT_SETUP.md for `booking_requests`: RLS is the actual
boundary, not which key is or isn't visible in a browser's network tab.

---

## 7. What remains proposal-only after Phase 6.1

- `instagram_profile`, `instagram_posts`, `clientele_categories`,
  `clientele_endorsements` — no tables created.
- No frontend code was changed to read from Supabase — `fleet-data.js`,
  `experiences-data.js`, `instagram-data.js`, and `clientele-data.js` are
  still the live source of truth for every page.
- No admin dashboard changes — staff still manage bookings the same way;
  there is no UI yet for editing `fleet_items`/`experiences` or for
  promoting a user to `admin` (that's a one-off SQL Editor statement for
  now, per §6 / the profiles migration).
- No files uploaded to any storage bucket.
- The `booking_requests.fleet_item` free-text-vs-FK question (§4) and
  the `clientele_categories`-as-a-table question (§4) remain open.

A later phase, scoped separately, should pick one table (`fleet_items` is
the natural first candidate — the most-used data file, with the clearest
1:1 field mapping), build the admin UI to manage it, and migrate exactly
one page's read path over — proving the pattern before repeating it.

---

## 8. Phase 6.1 implementation log

Applied directly to the connected project (`slokljslqyanbqabvzkk`) via
the migrations listed below, each idempotent and safe to re-run:

| Migration | What it did |
|---|---|
| `20260726120000_booking_requests_baseline.sql` | Applied for the first time in this phase — it existed as a file since Phase 6.0 but had never actually been run against this project. |
| `20260726130000_profiles_and_roles.sql` | `profiles` table, auto-provisioning trigger, `is_admin()`, RLS on `profiles` itself. |
| `20260726130100_fleet_items.sql` | `fleet_items` table, indexes, RLS. |
| `20260726130200_fleet_media.sql` | `fleet_media` table, indexes, RLS (join-based, follows parent `published`). |
| `20260726130300_experiences.sql` | `experiences` + `experience_media` tables, indexes, RLS. |
| `20260726130400_storage_fleet_experience_buckets.sql` | RLS + `public = true` on the four pre-existing buckets in §5 (see that section for the `media`-bucket correction story). |

Verified directly against the live project (not just locally) after
applying:
- `anon` can read a `published = true` row and cannot read an
  `published = false` one, on `fleet_items`.
- `anon` cannot `INSERT` into `fleet_items` (RLS rejects it,
  `42501`).
- `anon` cannot `SELECT` from `profiles` (empty result — no blanket
  policy exists).
- `anon` can still `INSERT` into `booking_requests` — the pre-existing
  public booking flow is unaffected.
- All temporary rows used for the above were deleted immediately after;
  every table was confirmed empty again afterward. No seed/example data
  was left in place — verifying directly against the real (empty) tables
  and cleaning up made a committed seed file unnecessary for this phase.
