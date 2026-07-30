# Iconic Rentals — Owner Launch Checklist

A practical, ordered checklist for taking this site live. Each item is
something you can actually check off — for the "how," follow the link
to the relevant guide. Work through **Before Launch** completely before
touching DNS; everything else follows launch day itself.

---

## Before Launch

**Infrastructure**

- [ ] Supabase project created, every migration applied (`supabase db
      push`) — see `DEPLOYMENT_GUIDE.md` Step 1.
- [ ] `logos`, `avatars`, `instagram` Storage buckets created by hand;
      all 7 buckets confirmed in Storage — Step 1.
- [ ] Resend account created, sending domain verified, Edge Function
      deployed — Step 2.
- [ ] Your real admin account created and confirmed as `admin` role
      (not the default `staff`) — Step 3.
- [ ] `js/booking-config.js` has your real Supabase URL and anon key,
      committed and pushed — Step 4.
- [ ] Site deployed to Netlify (or your chosen host) on its temporary
      URL, verified working — Step 5.

**Real business information** (see `CLIENT_SETUP.md` → *Updating
Business Information*)

- [ ] Replace the placeholder phone number, `(305) 555-0198`, with your
      real number — it appears in the header, footer, floating contact
      widget, and the structured data block, on both `index.html` and
      `fleet/vehicle.html`.
- [ ] Confirm `concierge@iconicrentalsmiami.com` (or your real address)
      is a real, monitored mailbox — replace it if not.
- [ ] Replace placeholder business hours with your real hours.
- [ ] Set your real WhatsApp number in the floating contact menu, or
      remove that button if you don't use WhatsApp for business.

**Content — the CMS side** (see `DEPLOYMENT_GUIDE.md` Step 9 and
`CLIENT_SETUP.md`'s per-Manager sections)

- [ ] Review the 10 sample fleet items in **Fleet Manager**; replace
      placeholder photography with real photos in **Media**; **Publish**
      each vehicle that's ready.
- [ ] Fill in **Homepage CMS** with your real Hero/About/Trust/Statistics/
      FAQ/Instagram-profile copy.
- [ ] Add real Instagram posts/Reels in **Instagram Manager**, or leave
      it empty for an honest "coming soon" state — never invented posts.
- [ ] Add real, named clientele endorsements in **Clientele Manager**
      *only* once that person/brand has explicitly agreed to be quoted —
      or leave empty.
- [ ] As real charters happen, add them to `js/experiences-data.js` (see
      `CLIENT_SETUP.md` → *Luxury Experiences & Recent Charters*).

**SEO / structured data — the one with a real external risk**

- [ ] Replace the three placeholder JSON-LD reviews (Jonathan M. /
      Alexandra R. / David K.) and the fabricated 5.0★ `aggregateRating`
      with real, verifiable reviews — or remove the `review` and
      `aggregateRating` fields entirely if you don't have real ones yet.
      **Do this before your first Google crawl, not after** — publishing
      fabricated review markup risks a manual penalty. Full detail:
      `CLIENT_SETUP.md` → *Structured Data & SEO*.
- [ ] Add your real street address to the structured data if you have a
      public office/marina address (optional, improves local SEO).
- [ ] Decide on Google Analytics / Meta Pixel — activate with real IDs
      (`CLIENT_SETUP.md` → *Analytics & Tracking*) or leave both
      commented out.

**Domain & hosting**

- [ ] Custom domain connected in Netlify, DNS records added at your
      registrar — `DEPLOYMENT_GUIDE.md` Step 6.
- [ ] SSL certificate provisioned, "Force HTTPS" enabled —
      `DEPLOYMENT_GUIDE.md` Step 7.
- [ ] `robots.txt` and `sitemap.xml` updated if your real domain differs
      from `www.iconicrentalsmiami.com`.

---

## Launch Day

- [ ] Do a final full read-through of the live site on your real domain
      — every section, every image, every link.
- [ ] Submit one real test booking through each form (full form and
      Quick Book) and confirm both notification emails arrive.
- [ ] Sign in to `/admin/` on the real domain and confirm you can see
      and update the test booking(s).
- [ ] Check the site on an actual phone (not just a resized desktop
      browser) — homepage, a vehicle detail page, the booking form.
- [ ] Open browser dev tools on 2–3 pages and confirm zero console
      errors.
- [ ] Delete or archive the test booking(s) you just created, so your
      first real inquiry isn't buried under test data.
- [ ] Announce/share the live link.

---

## Immediately After Launch (first 24–48 hours)

- [ ] Watch the **Inquiries** dashboard for the first real booking and
      respond promptly — this is the moment that matters most for a
      first impression.
- [ ] Re-check both notification emails aren't landing in spam for you
      or, as best you can tell, for customers.
- [ ] Spot-check the site loads correctly from a different network
      (mobile data, not just your home wifi) in case of any DNS/caching
      surprise.
- [ ] If you activated Google Analytics, confirm real-time visitors are
      showing up in the GA4 dashboard.
- [ ] Re-validate your structured data at
      [Google's Rich Results Test](https://search.google.com/test/rich-results)
      using your live URL, now that real business info is in place.

---

## First Week

- [ ] Submit your sitemap to
      [Google Search Console](https://search.google.com/search-console)
      and [Bing Webmaster Tools](https://www.bing.com/webmasters) if you
      haven't already.
- [ ] Review every inquiry that's come in; confirm your response
      turnaround feels right.
- [ ] Check **Settings → Storage Used** on the admin dashboard summary
      to get a baseline for normal usage.
- [ ] Ask 2–3 recent real customers for a review/testimonial you can add
      to Clientele Manager and, once you have enough, the structured
      data.
- [ ] Re-read `OPERATIONS.md`'s Daily/Weekly routines and fold them into
      your actual schedule.

---

## First Month

- [ ] Do a full pass replacing any remaining stock/placeholder
      photography with real photos.
- [ ] Review analytics (if activated) for which pages/vehicles get the
      most attention — useful for deciding what to feature.
- [ ] Confirm your Resend sending domain reputation looks healthy (no
      bounces/spam complaints building up) in the Resend dashboard.
- [ ] Do one full backup per `DEPLOYMENT_GUIDE.md`'s *Backup
      Recommendations* if you haven't set up anything automatic yet.
- [ ] Revisit `LAUNCH_CHECKLIST.md`'s **Before Launch** section — confirm
      nothing was left as a placeholder that you meant to come back to.
- [ ] Skim `OPERATIONS.md`'s Monthly/Quarterly maintenance schedule and
      put the recurring items on your actual calendar.
