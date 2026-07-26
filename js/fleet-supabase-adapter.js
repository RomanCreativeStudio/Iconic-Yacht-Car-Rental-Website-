/**
 * Iconic Rentals — Fleet Data Compatibility Layer (Supabase)
 *
 * NOT loaded by any page yet. This is Phase 6.2 Part 2's "prepare the
 * migration without performing it": js/fleet-data.js remains the only
 * thing any public page actually reads from, unchanged. This file exists
 * so that a later, separately-scoped phase can switch the public site
 * over by following the exact steps fleet-data.js's own bottom-of-file
 * comment already documents — this module is built to satisfy that
 * contract, not to replace it today:
 *
 *   1. Replace the FLEET_DATA array with a fetch() call that resolves to
 *      the same array shape (same field names).       <- this file does that
 *   2. Populate FLEET_DATA once the fetch resolves, then dispatch
 *      'iconic:fleet-ready'.                            <- IconicFleetSupabase.load() does that
 *   3. Have fleet-render.js / fleet-detail.js's render calls run inside
 *      a listener for that event instead of at the bottom of the
 *      script, as they do today.                        <- deliberately NOT done in this phase
 *
 * window.IconicFleetSupabase mirrors window.IconicFleet's public surface
 * (data, getFleetItem, getFleetByType, getRelatedFleet) so that, when
 * that future phase is ready, swapping which script tag a page loads is
 * close to the entire change.
 *
 * Requires js/supabase-client.js (for the client) and js/booking-config.js
 * (for SUPABASE_URL, also used to build public Storage URLs) to be
 * loaded first — same dependency order as admin/fleet.html.
 */
(function (global) {
  'use strict';

  /* --------------------------------------------------------------------
     Fixed slot schema — mirrors the per-item `galleries`/`videos` shape
     every entry in js/fleet-data.js's FLEET_DATA repeats today. A slot
     with no matching fleet_media row (or one with a null storage_path)
     renders exactly like fleet-data.js's own `src: null` entries do:
     an honest "coming soon" placeholder, not an error.

     Keep these in sync with fleet-data.js until it's retired — that
     file is still the source of truth for what pages actually render.
  -------------------------------------------------------------------- */
  var GALLERY_SLOTS = {
    exterior: [
      { key: 'bow', label: 'Bow' },
      { key: 'stern', label: 'Stern' },
      { key: 'side-profile', label: 'Side Profile' },
      { key: 'flybridge', label: 'Flybridge' },
      { key: 'water-views', label: 'Water Views' }
    ],
    interior: [
      { key: 'main-salon', label: 'Main Salon' },
      { key: 'dining-area', label: 'Dining Area' },
      { key: 'master-cabin', label: 'Master Cabin' },
      { key: 'guest-cabins', label: 'Guest Cabins' },
      { key: 'bathrooms', label: 'Bathrooms' },
      { key: 'galley', label: 'Galley' },
      { key: 'helm', label: 'Helm' }
    ],
    lifestyle: [
      { key: 'dining-setup', label: 'Dining Setup' },
      { key: 'champagne-service', label: 'Champagne Service' },
      { key: 'guests-relaxing', label: 'Guests Relaxing' },
      { key: 'water-toys', label: 'Water Toys' },
      { key: 'swimming-platform', label: 'Swimming Platform' },
      { key: 'sunset-cruise', label: 'Sunset Cruise' },
      { key: 'night-lighting', label: 'Night Lighting' }
    ],
    drone: [
      { key: 'aerial-overview', label: 'Aerial Overview' },
      { key: 'departure-sequence', label: 'Departure Sequence' },
      { key: 'anchored-cove', label: 'Anchored Cove' },
      { key: 'golden-hour-aerial', label: 'Golden Hour Aerial' }
    ]
  };

  var VIDEO_SLOTS = {
    walkthrough: [{ key: 'full-walkthrough', label: 'Full Walkthrough', platform: 'video' }],
    reels: [{ key: 'instagram-reel', label: 'Instagram Reel', platform: 'instagram' }],
    tiktok: [{ key: 'tiktok-video', label: 'TikTok Video', platform: 'tiktok' }],
    tours360: [{ key: 'virtual-tour', label: '360° Virtual Tour', platform: 'tour360' }]
  };

  function publicUrl(bucket, storagePath) {
    var cfg = global.IconicBookingConfig;
    if (!storagePath || !cfg || !cfg.SUPABASE_URL) return null;
    return cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/' + bucket + '/' + storagePath;
  }

  function mediaBucketFor(kind) {
    return kind === 'video' ? 'fleet-videos' : 'fleet-images';
  }

  /** Every fleet_media row for one fleet_item_id, grouped by section. */
  function groupMediaBySection(mediaRows) {
    var bySection = {};
    mediaRows.forEach(function (row) {
      if (!bySection[row.section]) bySection[row.section] = [];
      bySection[row.section].push(row);
    });
    return bySection;
  }

  function findSlotRow(rowsForSection, slotKey) {
    var matches = (rowsForSection || []).filter(function (r) { return r.slot_key === slotKey; });
    return matches[0] || null;
  }

  function buildGalleryCategory(rowsForSection, slotDefs, itemName) {
    return slotDefs.map(function (slot) {
      var row = findSlotRow(rowsForSection, slot.key);
      var storagePath = row ? row.storage_path : null;
      return {
        key: slot.key,
        label: slot.label,
        src: publicUrl('fleet-images', storagePath),
        webp: null, // Storage doesn't auto-generate a webp variant; same as a real upload pipeline would need to provide one explicitly
        alt: storagePath ? (row.alt || (itemName + ' — ' + slot.label)) : null
      };
    });
  }

  function buildVideoCategory(rowsForSection, slotDefs) {
    return slotDefs.map(function (slot) {
      var row = findSlotRow(rowsForSection, slot.key);
      var storagePath = row ? row.storage_path : null;
      return {
        key: slot.key,
        label: slot.label,
        platform: slot.platform,
        url: publicUrl('fleet-videos', storagePath),
        thumbnail: null,
        thumbnailWebp: null
      };
    });
  }

  function heroAndCard(mediaBySection) {
    var hero = findSlotRow(mediaBySection.hero, null) || (mediaBySection.hero || [])[0];
    var card = findSlotRow(mediaBySection.card, null) || (mediaBySection.card || [])[0];
    return {
      heroImage: hero ? publicUrl(mediaBucketFor(hero.kind), hero.storage_path) : null,
      heroImageWebp: null,
      cardImage: card ? publicUrl(mediaBucketFor(card.kind), card.storage_path) : null,
      cardImageWebp: null
    };
  }

  function flatGallery(mediaBySection, itemName) {
    return (mediaBySection.gallery || [])
      .filter(function (row) { return !!row.storage_path; })
      .map(function (row) {
        return {
          src: publicUrl(mediaBucketFor(row.kind), row.storage_path),
          webp: null,
          alt: row.alt || itemName
        };
      });
  }

  /** Transforms one fleet_items row (+ its fleet_media rows) into the
   *  exact shape FLEET_DATA already uses. */
  function toFleetDataShape(item, mediaRows) {
    var bySection = groupMediaBySection(mediaRows);
    var media = heroAndCard(bySection);

    var out = {
      slug: item.slug,
      type: item.type,
      name: item.name,
      category: item.category,
      tagline: item.tagline,
      heroImage: media.heroImage,
      heroImageWebp: media.heroImageWebp,
      cardImage: media.cardImage,
      cardImageWebp: media.cardImageWebp,
      gallery: flatGallery(bySection, item.name),
      galleries: {
        exterior: buildGalleryCategory(bySection.exterior, GALLERY_SLOTS.exterior, item.name),
        interior: buildGalleryCategory(bySection.interior, GALLERY_SLOTS.interior, item.name),
        lifestyle: buildGalleryCategory(bySection.lifestyle, GALLERY_SLOTS.lifestyle, item.name),
        drone: buildGalleryCategory(bySection.drone, GALLERY_SLOTS.drone, item.name)
      },
      videos: {
        walkthrough: buildVideoCategory(bySection.walkthrough, VIDEO_SLOTS.walkthrough),
        reels: buildVideoCategory(bySection.reels, VIDEO_SLOTS.reels),
        tiktok: buildVideoCategory(bySection.tiktok, VIDEO_SLOTS.tiktok),
        tours360: buildVideoCategory(bySection.tours360, VIDEO_SLOTS.tours360)
      },
      description: item.description,
      capacity: item.capacity,
      specs: item.specs || {},
      features: item.features || [],
      amenities: item.amenities || [],
      bookLabel: item.book_label
    };

    // fleet-data.js also carries a couple of yacht/car-specific
    // convenience aliases (length/cabins/crew for yachts; seats/hp for
    // cars) pulled straight out of `specs` today — mirrored here from
    // the same jsonb column so a caller doesn't have to know which shape
    // it's reading from.
    if (item.type === 'yacht') {
      out.length = item.specs && item.specs.Length;
      out.cabins = item.specs && item.specs.Cabins;
      out.crew = item.specs && item.specs.Crew;
    } else {
      out.seats = item.specs && item.specs.Seats;
      out.hp = item.specs && item.specs.Horsepower;
    }

    return out;
  }

  var FLEET_DATA = [];

  function getFleetItem(slug) {
    for (var i = 0; i < FLEET_DATA.length; i++) {
      if (FLEET_DATA[i].slug === slug) return FLEET_DATA[i];
    }
    return null;
  }

  function getFleetByType(type) {
    return FLEET_DATA.filter(function (item) { return item.type === type; });
  }

  function getRelatedFleet(item, limit) {
    return FLEET_DATA.filter(function (other) {
      return other.type === item.type && other.slug !== item.slug;
    }).slice(0, limit || 3);
  }

  /**
   * Fetches every published fleet_items row (RLS already enforces
   * "published only" for the anon key this would run under) plus all
   * fleet_media, transforms them, populates FLEET_DATA, and dispatches
   * 'iconic:fleet-ready' — the exact event fleet-data.js's own migration
   * note says a future consumer should listen for. Not called by
   * anything in this phase.
   */
  function load() {
    var supabase = global.IconicSupabase && global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('IconicSupabase client not available.'));

    return Promise.all([
      supabase.from('fleet_items').select('*').eq('published', true).order('sort_order', { ascending: true }),
      supabase.from('fleet_media').select('*')
    ]).then(function (results) {
      var itemsResult = results[0];
      var mediaResult = results[1];
      if (itemsResult.error) throw itemsResult.error;
      if (mediaResult.error) throw mediaResult.error;

      var mediaByItemId = {};
      (mediaResult.data || []).forEach(function (row) {
        if (!mediaByItemId[row.fleet_item_id]) mediaByItemId[row.fleet_item_id] = [];
        mediaByItemId[row.fleet_item_id].push(row);
      });

      FLEET_DATA.length = 0;
      (itemsResult.data || []).forEach(function (item) {
        FLEET_DATA.push(toFleetDataShape(item, mediaByItemId[item.id] || []));
      });

      document.dispatchEvent(new CustomEvent('iconic:fleet-ready'));
      return FLEET_DATA;
    });
  }

  global.IconicFleetSupabase = {
    data: FLEET_DATA,
    load: load,
    getFleetItem: getFleetItem,
    getFleetByType: getFleetByType,
    getRelatedFleet: getRelatedFleet
  };
})(window);
