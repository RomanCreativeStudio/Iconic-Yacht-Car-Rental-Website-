# Iconic Rentals — Operations Guide

Day-to-day running of the site once it's live. This is the "what do I
actually do, and how often" reference — for how to use any specific
admin page, see `CLIENT_SETUP.md`; for what to do when something's
broken, see `DISASTER_RECOVERY.md`.

---

## Daily

**Review inquiries.** Sign in at `/admin/`, check the Inquiries
dashboard. Every new booking request lands here with status `New` —
respond promptly, and move each one through `Contacted` →
`Confirmed`/`Cancelled` → `Completed` as it progresses, so the dashboard
stays an accurate picture of what's actually pending. Nobody, including
admin accounts, can delete an inquiry through the app — that's
deliberate, a permanent record is worth more than a tidy list. If email
notifications ever stop arriving for new inquiries, the dashboard itself
is still the reliable source — check it directly rather than waiting on
email.

**Watch for anything that looks broken.** A quick glance at the
homepage and one vehicle detail page, especially after any content edit
the day before, catches most regressions before a customer does.

---

## Weekly

**Publish new fleet content.** Any new vehicle, updated pricing, new
photos, or availability change goes through **Fleet Manager** →
**Media**. A vehicle only appears publicly once **Published** is
checked — draft changes are safe to leave mid-edit without anything
going live prematurely.

**Update homepage content as needed.** Statistics (years in business,
experiences delivered), FAQ, and Hero copy don't need weekly attention
by default, but review **Homepage CMS** any week you've made a real
change worth reflecting (a new stat, a seasonal FAQ, a new photo set).

**Update Instagram content.** Add recent real posts/Reels in
**Instagram Manager** — each uploads its own thumbnail directly, no
manual URL needed for any media type. Keep this roughly in sync with
what's actually posted to the real Instagram account; a stale feed here
looks worse than an honest "coming soon" state.

**Check Storage usage.** The admin dashboard's summary cards include a
live **Storage Used** figure (`get_storage_usage()`, admin-only). Watch
for a sudden jump (someone uploaded an oversized batch, or a video
where an image was meant) more than the absolute number — Supabase's
free tier includes a meaningful amount of storage, and this is mostly
about catching mistakes early, not hitting a hard limit unexpectedly.

---

## Monthly

**Update testimonials.** As real customers agree to be quoted, add them
in **Clientele Manager** — only ever a real, named person or brand who's
explicitly agreed, never invented copy. If you're also using the
homepage's structured-data reviews (see `CLIENT_SETUP.md` → *Structured
Data & SEO*), keep those in sync with what's actually shown on the page;
Google's guidelines require the two to match.

**Review analytics**, if Google Analytics / Meta Pixel are active. Look
at which vehicles/pages get the most attention, where visitors drop off
before booking, and whether the tracked events
(`book_button_click`, `booking_form_submit`, `phone_click`,
`whatsapp_click`, `fleet_view_details`, `gallery_image_open` — see
`CLIENT_SETUP.md` → *Analytics & Tracking*) tell you anything worth
acting on.

**Back up.** See `DEPLOYMENT_GUIDE.md` → *Backup Recommendations*. If
you're on Supabase's free tier (no automatic managed backups), this is
the month's most important recurring task — a manual `supabase db dump`
plus a Storage sync, kept somewhere safe.

**Review Team access.** Open **Team** (`admin/team.html`) and confirm
everyone listed still needs access, and at the right role
(`admin`/`staff`/`read_only`). Remove anyone who's left or no longer
needs it — takes effect immediately, no SQL required.

---

## Quarterly

**Re-check every launch-checklist item that's date-sensitive.**
Business hours, seasonal pricing notes, and any "coming soon" states
that have quietly become permanent are worth a fresh look every few
months.

**Review Resend deliverability.** Check the Resend dashboard for bounce
rate and spam complaints on your sending domain — a rising bounce rate
usually means stale customer email addresses, not a problem with the
system itself.

**Full content audit.** Walk the entire public site as if you were a
first-time visitor — every section, every vehicle, every link — the
kind of thing that's easy to stop noticing once you're used to seeing
it every day.

---

## Maintenance Schedule (Technical)

This section is for whoever maintains the code — you, or a developer you
bring in — not day-to-day content work above.

| Task | Cadence | Notes |
|---|---|---|
| **Dependency updates** | Quarterly, or when a security advisory lands | This is a static site with almost no dependencies to track — the one real one is `js/vendor/supabase-js.min.js`. Check [supabase-js releases](https://github.com/supabase/supabase-js/releases) for breaking changes before updating; this codebase pins a specific version deliberately rather than auto-updating. |
| **Supabase project upgrades** | As Supabase announces them | Supabase manages Postgres version upgrades and platform changes on their end; watch your project dashboard for any upgrade prompts and read the changelog before accepting one, same as any managed database service. |
| **Cross-browser testing** | Quarterly, and after any significant CSS/JS change | Chrome, Safari, Firefox, and at least one mobile browser (iOS Safari, Chrome Android). This project has no automated cross-browser test suite — this is a manual pass. |
| **Lighthouse testing** | Quarterly | Run Chrome DevTools → Lighthouse (or [PageSpeed Insights](https://pagespeed.web.dev)) against the homepage and a vehicle detail page. Watch Performance and Best Practices scores especially — this project's images/scripts are optimized as of Phase 7.1's audit, but new content (large uploaded photos/videos) can regress this over time. |
| **Accessibility testing** | Quarterly | Run an automated pass (Lighthouse's Accessibility score, or [axe DevTools](https://www.deque.com/axe/devtools/)) plus a manual keyboard-only pass through the booking form and admin login. Phase 7.1's audit found a solid baseline (skip link, ARIA landmarks, alt text) but did not verify color contrast or full screen-reader behavior — worth a dedicated pass at least once. |
| **Security review** | Quarterly, or after any RLS/schema change | Re-run Supabase's built-in advisors (**Database → Advisors** in the dashboard, or the `get_advisors` check if you have Supabase MCP tooling available) for security and performance lints. Confirm no new tables/policies were added without RLS. Re-check `netlify.toml`'s CSP if any new third-party script was added — see `CLIENT_SETUP.md` → *Content Security Policy*. |
| **Admin account audit** | Quarterly | Covered above under Monthly Team review, but worth a deliberate second pass quarterly specifically — confirm no stale or over-privileged accounts remain. |
