# Iconic Rentals — Disaster Recovery Guide

What to actually do when something is broken. Each section assumes
you're in the middle of a real problem, not planning ahead — start with
the section matching what's broken, not the top of the file.

If you're looking for *preventing* problems rather than recovering from
one, see `DEPLOYMENT_GUIDE.md` → *Backup Recommendations* and
`OPERATIONS.md`'s recurring maintenance schedule instead.

---

## The site itself is down or broken (Netlify)

**Symptom:** the homepage doesn't load, shows a broken layout, or shows
old/wrong content after a change.

1. Go to Netlify → your site → **Deploys**. Every deploy this project
   has ever made is listed here, newest first.
2. Find the most recent deploy that you know was working.
3. Click it, then **Publish deploy**. This is instant — your live site
   switches to that exact version immediately, and nothing is deleted;
   you can publish forward again just as easily once the problem is
   fixed.
4. If the *current* deploy is the one that's broken (not an older one),
   check **Deploys → [the broken deploy] → Deploy log** for the actual
   error — a failed deploy usually means a typo in `netlify.toml` or a
   file that didn't push correctly, not application logic (there's no
   build step to fail).

**If the domain itself won't resolve at all** (not a Netlify issue, a
DNS one): check [dnschecker.org](https://dnschecker.org) for your
domain. If DNS looks wrong, re-check the records against Netlify's
**Domain settings** page — a changed nameserver or an accidentally
deleted record at your registrar is the most common cause, and the fix
is just re-adding the correct record.

---

## The database is broken or has bad data (Supabase)

**Symptom:** the admin dashboard shows an error, content that should be
there is missing, or content was accidentally deleted/overwritten.

**If it's a bad migration or schema change:**

Postgres migrations aren't cleanly "undo-able" the way a file revert is.
The reliable path is a **new migration that corrects the specific
change** — for example, if a column was accidentally dropped, a new
migration that re-adds it — rather than trying to roll back history.
This is a job for whoever manages your Supabase project (yourself, if
you're comfortable with SQL, or a developer) using the Supabase CLI:

```bash
supabase migration new fix_description_here
# edit the new file in supabase/migrations/
supabase db push
```

**If it's bad or lost content** (not a schema problem — an accidental
bulk delete, an overwritten row):

Your only real recovery path is a backup, because RLS-protected content
tables have no built-in "trash" the way some apps do (deliberately —
see `CLIENT_SETUP.md`'s note on `booking_requests`: even admins can't
delete an inquiry through the app, only cancel it. Other content tables
*can* be deleted by an admin, which is why backups matter for them
specifically):

- **On a paid Supabase plan with automatic backups:** Dashboard →
  **Database → Backups**, restore to a point in time before the problem.
  This restores the *entire* database to that moment — anything
  legitimate that happened after the restore point is lost too, so
  weigh that before restoring.
- **On the free tier (no automatic backups):** you can only recover
  what you manually backed up per `DEPLOYMENT_GUIDE.md`'s *Backup
  Recommendations*. If you have a `supabase db dump` export, restore it
  with `psql` against your project's connection string (**Settings →
  Database** for the connection details), or re-import via the SQL
  Editor for smaller amounts of data.
- **If you have no backup at all:** this is the scenario backups exist
  to prevent. For CMS content (fleet items, homepage copy, endorsements,
  Instagram posts), the static fallback files under `js/*-data.js` are
  still a partial safety net — they're not a live backup of your real
  edits, but they mean the public site keeps showing *something*
  reasonable rather than breaking outright while you rebuild the lost
  content by hand.

---

## Photos/videos are missing or corrupted (Storage)

**Symptom:** broken images on the public site or in the admin Media
Manager, or a bucket that's unexpectedly empty.

1. Check **Supabase Dashboard → Storage → [bucket name]** directly —
   confirm whether the file is actually gone, or whether the problem is
   just the *reference* to it (a `storage_path`/`media_url` value in the
   database pointing at a file that no longer exists, or vice versa).
2. If the file is genuinely gone and you have a Storage backup (a local
   sync made per `DEPLOYMENT_GUIDE.md`'s recommendations), re-upload it
   through the same path it originally used — for slotted fleet/
   experience media, re-uploading through the normal admin upload flow
   (Fleet Manager, Media Manager, etc.) is simpler than trying to
   restore the exact original Storage path by hand, since the app
   handles path generation and the matching database row together.
3. If there's no backup, the file has to be re-sourced (re-uploaded from
   wherever the original photo/video lives outside this system — your
   camera roll, a photographer's delivery, etc.) and re-added through
   the normal admin upload flow. There is no way to regenerate a lost
   media file from inside this system.
4. **Orphaned database rows** (a row pointing at a Storage path that no
   longer exists) won't crash anything — the affected `<img>`/`<video>`
   just shows broken — but are worth cleaning up: either re-upload to
   replace it, or delete the row/entry through the relevant admin page
   so it stops rendering broken.

---

## Configuration is lost (environment variables & secrets)

**Symptom:** you've lost access to, or need to recreate, your Supabase
project ref, anon key, or Resend API key.

- **Supabase URL and anon key:** never actually "lost" in the sense of
  being unrecoverable — both are visible any time in **Supabase
  Dashboard → Settings → API** for as long as the project exists. If
  they're wrong in `js/booking-config.js` (e.g. after connecting to a
  *different* Supabase project), just copy the current correct values in
  from that same page and redeploy.
- **Resend API key:** if lost (not just misplaced — Resend doesn't show
  a created key's value again after creation), generate a new one
  (**API Keys → Create API Key**) and update it:

  ```bash
  supabase secrets set RESEND_API_KEY=your_new_key
  supabase functions deploy send-booking-emails
  ```

  The old key still works until you revoke it in Resend, so this is safe
  to do without any downtime.
- **If the entire Supabase project is lost** (deleted, or access lost
  entirely): this means starting over per `DEPLOYMENT_GUIDE.md` Steps
  1–4 with a new project, restoring content from your most recent backup
  once the new project's schema is in place, and updating
  `js/booking-config.js` and the Edge Function secrets to point at the
  new project.

---

## The booking emails have stopped working (Edge Function)

**Symptom:** bookings save successfully (they appear in the admin
dashboard) but no notification/confirmation emails arrive.

1. **Supabase Dashboard → Edge Functions → `send-booking-emails` →
   Logs.** This shows every invocation and any error it hit — almost
   always either a Resend API error (expired/revoked key, unverified
   sending domain) or a missing secret.
2. Confirm all three secrets are still set:

   ```bash
   supabase secrets list
   ```

   You should see `RESEND_API_KEY`, `OWNER_EMAIL`, and `FROM_EMAIL`
   listed (values are never shown back, just confirmation they're set).
   Re-set any that are missing per `DEPLOYMENT_GUIDE.md` Step 2.
3. If the function itself is missing entirely (not just erroring) —
   check `supabase functions list`. If it's not there, redeploy it:

   ```bash
   supabase functions deploy send-booking-emails
   ```
4. If the function and secrets are all correct but email still isn't
   arriving, check Resend's own dashboard for delivery status on the
   specific email — a domain verification that's lapsed, or Resend-side
   rate limiting on the shared `resend.dev` address, are the most common
   remaining causes.
5. Bookings themselves are never at risk during any of this — they're
   written straight to the database independent of whether the email
   step succeeds, so a broken Edge Function means missed notifications,
   not lost inquiries. The Inquiries dashboard is always the reliable
   fallback while you fix email delivery.
