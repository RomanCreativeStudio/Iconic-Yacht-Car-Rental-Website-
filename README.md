# Iconic Rentals — Yacht & Exotic Car Rental Website

A static marketing site with a live Supabase-backed content management
system: yacht/car fleet, luxury experiences, homepage copy, Instagram
feed, and client testimonials are all editable from an admin dashboard,
with automatic fallback to static content if the database is ever
unreachable. Booking inquiries are collected through Supabase and
emailed via a Resend-backed Edge Function.

No build step — plain HTML, CSS, and JavaScript, deployable to any
static host.

## Documentation

Start with whichever matches what you're trying to do:

| Guide | For |
|---|---|
| **[CLIENT_SETUP.md](./CLIENT_SETUP.md)** | The complete reference — every admin page, every content type, environment variables, security model. Read this to actually *use* the site day to day. |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Step-by-step: Supabase, Resend, Netlify, custom domain, DNS, SSL — going from this repository to a live production site. |
| **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** | What to check before, during, and after launch day. |
| **[OPERATIONS.md](./OPERATIONS.md)** | Ongoing maintenance — daily/weekly/monthly/quarterly routines, plus the technical maintenance schedule. |
| **[DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)** | What to do when something's actually broken. |

## Project Structure

```
├── index.html              Homepage
├── fleet/vehicle.html      Vehicle detail page (?slug=...)
├── admin/                  Admin dashboard (CMS)
├── css/, js/, images/, fonts/   Static assets
├── supabase/
│   ├── migrations/         Full, current database schema (source of truth)
│   ├── functions/          Edge Functions (booking emails)
│   └── schema.sql          Legacy booking_requests-only bootstrap script
├── netlify.toml             Netlify headers/caching config
└── CLIENT_SETUP.md, DEPLOYMENT_GUIDE.md, ...   Documentation (this list)
```

See `CLIENT_SETUP.md` → **Project Structure** for the full annotated
breakdown of every file.

## Quick Start (local preview)

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

The site works immediately on static fallback content with no setup.
To connect the live CMS/booking backend, follow `DEPLOYMENT_GUIDE.md`.

## License

Proprietary — built for Iconic Rentals. Not licensed for reuse.
