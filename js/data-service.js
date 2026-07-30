/**
 * Iconic Rentals — Data Service (Phase 6.5, extended in Phase 6.6)
 *
 * Single abstraction that tries Supabase first and automatically falls
 * back to the static *-data.js files this site has always used, for
 * fleet, experiences, clientele, and Instagram — plus, as of Phase 6.6,
 * the homepage's Hero/About/Trust/Statistics/FAQ/Videos-intro copy, which
 * has no static *-data.js file of its own (see the "Homepage content"
 * section below for why that domain works a little differently). This is
 * the "later phase" every static file's own header comment already
 * predicted and gave an exact migration recipe for — see
 * js/fleet-data.js, js/experiences-data.js, and js/instagram-data.js's
 * own "CMS/API migration path" notes. This file follows those recipes
 * rather than inventing a new mechanism.
 *
 * How the fallback actually works, for each domain:
 *   1. If Supabase isn't configured (placeholder js/booking-config.js) or
 *      the vendor script hasn't loaded, skip straight to static — no
 *      network call is attempted, so this never produces a console error
 *      or a failed request on a site that hasn't been connected yet.
 *   2. Otherwise attempt a live fetch, capped at LIVE_TIMEOUT_MS. A slow
 *      or hung connection can't block the page — it just falls back once
 *      the timeout fires, same as a hard error would.
 *   3. If the live fetch resolves with zero usable rows (nothing
 *      published/approved, or a query blocked by RLS), that's treated
 *      exactly like a failure: fall back to static. An empty-but-
 *      technically-successful response must never render an empty page
 *      when the static file has real content — that would be worse than
 *      not attempting Supabase at all.
 *   4. Either way, the static *-data.js globals (IconicFleet.data,
 *      IconicExperiences.data, etc.) end up populated — with live data if
 *      it was usable, with their original static content otherwise — and
 *      an `iconic:<domain>-ready` event fires so page scripts (which
 *      already expected exactly this event, per their own header
 *      comments) can render.
 *
 * Fleet reuses js/fleet-supabase-adapter.js's existing query + mapping
 * logic wholesale (added in Phase 6.1 for exactly this purpose) rather
 * than re-deriving it — this file only decides whether that result is
 * usable and copies it into window.IconicFleet.data, which is the global
 * every consumer (main.js, fleet-render.js, fleet-detail.js) actually
 * reads. Experiences has no existing adapter, so its query + mapping
 * lives here, next to fleet's for symmetry.
 *
 * Clientele and Instagram are, as of Phase 6.6, fully live-capable:
 * categories/endorsements and profile/posts/reels respectively all read
 * from real tables (clientele_endorsements, instagram_posts,
 * instagram_reels) or site_content, all reachable by `anon` now that
 * site_content's Phase 6.4 authenticated-only read policy has been
 * widened to public. js/clientele.js and js/instagram.js needed zero
 * changes for this — they already rendered off
 * window.IconicClientele.endorsements / window.IconicInstagram.posts
 * /.reels, so this file populating those same arrays with live rows
 * instead of leaving them at their static-file defaults was the entire
 * change.
 *
 * Homepage content (Hero/About/Trust/Statistics/FAQ/Videos-intro) is
 * architecturally different from every other domain here: index.html has
 * always hardcoded this copy directly, so there's no static *-data.js
 * global to overwrite and no existing render script to gate behind a
 * ready event. Phase 6.6 doesn't invent one either — a live section's
 * resolved content lands on window.IconicHomepageContent[sectionKey] only
 * when usable, and js/homepage-content.js (new consumer) patches specific
 * text nodes/attributes in place when it's present, leaving index.html's
 * markup completely untouched when it isn't. See that file's header
 * comment for exactly what "in place" means and why.
 */
(function (global) {
  'use strict';

  var LIVE_TIMEOUT_MS = 3000;

  function isLiveCapable() {
    return !!(global.IconicSupabase && global.IconicSupabase.isConfigured() && global.supabase);
  }

  /** Races `promiseFactory()` against a timeout, rejecting either way —
   *  callers always follow this with .catch(), never assume success. */
  function attemptLive(promiseFactory) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = global.setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('Supabase request timed out after ' + LIVE_TIMEOUT_MS + 'ms.'));
      }, LIVE_TIMEOUT_MS);

      promiseFactory().then(
        function (result) {
          if (settled) return;
          settled = true;
          global.clearTimeout(timer);
          resolve(result);
        },
        function (err) {
          if (settled) return;
          settled = true;
          global.clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /** Public Storage URL builder — a trivial duplicate of the same helper
   *  already private inside fleet-supabase-adapter.js, kept local here
   *  rather than exported cross-module for a three-line function used
   *  across buckets that module doesn't know about (experience-images,
   *  experience-videos). Not worth a shared-utility file for this size. */
  function publicUrl(bucket, storagePath) {
    var cfg = global.IconicBookingConfig;
    if (!storagePath || !cfg || !cfg.SUPABASE_URL) return null;
    return cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/public/' + bucket + '/' + storagePath;
  }

  /**
   * Never dispatches before the document's own parser-blocking <script>
   * tags (including main.js, fleet-detail.js, etc. — every consumer) have
   * all finished executing and registered their addEventListener calls.
   *
   * A first attempt at this used setTimeout(fn, 0), reasoning that a
   * macrotask must wait for the current synchronous script to finish —
   * true, but not sufficient: each subsequent <script src="..."> tag
   * requires its own network fetch before it can execute, and that fetch
   * is exactly the kind of yield point a 0ms timer can fire during. That
   * let a *fast* fallback (e.g. Supabase not configured, no network
   * attempt at all) dispatch its ready event while a later script was
   * still being fetched — before it had executed and registered its
   * listener — which meant that listener missed the event permanently.
   * Caught this live: the homepage fleet grids rendered empty even though
   * window.IconicFleet.data held the correct static rows, because
   * main.js's listener simply wasn't attached yet when the event fired.
   *
   * `DOMContentLoaded` is the actual spec-guaranteed signal that every
   * parser-blocking script on the page — fetched and executed — is done.
   * Gating on it (or firing immediately if it's already passed, so a slow
   * network-bound domain loses no time waiting on a load that already
   * happened) is the correct fix, not a longer timer guess.
   */
  var domReady = new Promise(function (resolve) {
    if (document.readyState !== 'loading') {
      resolve();
    } else {
      document.addEventListener('DOMContentLoaded', function () { resolve(); }, { once: true });
    }
  });

  function dispatch(eventName) {
    domReady.then(function () {
      document.dispatchEvent(new CustomEvent(eventName));
    });
  }

  /* ======================================================================
     Fleet
  ====================================================================== */
  function loadFleet() {
    if (!global.IconicFleet) return; // fleet-data.js not loaded on this page
    if (!isLiveCapable() || !global.IconicFleetSupabase) {
      dispatch('iconic:fleet-ready');
      return;
    }
    attemptLive(function () { return global.IconicFleetSupabase.load(); })
      .then(function (liveData) {
        if (liveData && liveData.length) {
          var FLEET_DATA = global.IconicFleet.data;
          FLEET_DATA.length = 0;
          Array.prototype.push.apply(FLEET_DATA, liveData);
        }
      })
      .catch(function (err) {
        console.warn('IconicDataService: live fleet data unavailable, using fleet-data.js.', err);
      })
      .then(function () { dispatch('iconic:fleet-ready'); });
  }

  /* ======================================================================
     Experiences
  ====================================================================== */
  function toExperienceShape(item, mediaRows) {
    var cover = mediaRows.filter(function (r) { return r.kind === 'cover' && r.storage_path; })[0] || null;
    var photos = mediaRows.filter(function (r) { return r.kind === 'photo' && r.storage_path; });
    var videos = mediaRows.filter(function (r) { return r.kind === 'video' && r.storage_path; });

    return {
      id: item.id,
      title: item.title,
      category: item.category,
      date: item.date_text,
      yachtSlug: item.yacht_slug,
      coverImage: cover ? { src: publicUrl('experience-images', cover.storage_path), webp: null, alt: cover.alt || item.title } : null,
      photos: photos.map(function (p) {
        return { src: publicUrl('experience-images', p.storage_path), webp: null, alt: p.alt || item.title };
      }),
      videos: videos.map(function (v) {
        return { label: v.label || item.title, platform: v.platform || 'client', url: publicUrl('experience-videos', v.storage_path), thumbnail: null, thumbnailWebp: null };
      }),
      instagramPost: item.instagram_post_url,
      instagramReel: item.instagram_reel_url,
      description: item.description,
      clientReview: item.client_review_quote
        ? { quote: item.client_review_quote, guestName: item.client_review_guest_name, rating: item.client_review_rating }
        : null,
      featured: !!item.featured
    };
  }

  function fetchExperiencesLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return Promise.all([
      supabase.from('experiences').select('*').eq('published', true).eq('archived', false).order('sort_order', { ascending: true }),
      supabase.from('experience_media').select('*')
    ]).then(function (results) {
      var expResult = results[0];
      var mediaResult = results[1];
      if (expResult.error) throw expResult.error;
      if (mediaResult.error) throw mediaResult.error;

      var mediaByExpId = {};
      (mediaResult.data || []).forEach(function (row) {
        if (!mediaByExpId[row.experience_id]) mediaByExpId[row.experience_id] = [];
        mediaByExpId[row.experience_id].push(row);
      });

      return (expResult.data || []).map(function (item) {
        return toExperienceShape(item, mediaByExpId[item.id] || []);
      });
    });
  }

  function loadExperiences() {
    if (!global.IconicExperiences) return; // experiences-data.js not loaded on this page
    if (!isLiveCapable()) {
      dispatch('iconic:experiences-ready');
      return;
    }
    attemptLive(fetchExperiencesLive)
      .then(function (liveData) {
        if (liveData && liveData.length) {
          var EXPERIENCES_DATA = global.IconicExperiences.data;
          EXPERIENCES_DATA.length = 0;
          Array.prototype.push.apply(EXPERIENCES_DATA, liveData);
        }
      })
      .catch(function (err) {
        console.warn('IconicDataService: live experiences data unavailable, using experiences-data.js.', err);
      })
      .then(function () { dispatch('iconic:experiences-ready'); });
  }

  /* ======================================================================
     Clientele — categories (site_content) and, as of Phase 6.6,
     endorsements (their own table) are both live-capable.
  ====================================================================== */
  function fetchClienteleCategoriesLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('site_content').select('data').eq('section', 'clientele_categories').maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      var items = result.data && result.data.data && result.data.data.items;
      return (items || []).filter(function (i) { return i && i.key && i.label; });
    });
  }

  function fetchClienteleEndorsementsLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('clientele_endorsements').select('*').eq('approved', true).order('sort_order', { ascending: true }).then(function (result) {
      if (result.error) throw result.error;
      return (result.data || []).map(function (row) {
        return {
          id: row.id,
          name: row.name,
          role: row.role,
          quote: row.quote,
          photo: row.photo,
          photoWebp: null,
          logo: row.logo,
          approved: true
        };
      });
    });
  }

  function loadClientele() {
    if (!global.IconicClientele) return; // clientele-data.js not loaded on this page
    if (!isLiveCapable()) {
      dispatch('iconic:clientele-ready');
      return;
    }
    Promise.all([
      attemptLive(fetchClienteleCategoriesLive).catch(function (err) {
        console.warn('IconicDataService: live clientele categories unavailable, using clientele-data.js.', err);
        return null;
      }),
      attemptLive(fetchClienteleEndorsementsLive).catch(function (err) {
        console.warn('IconicDataService: live clientele endorsements unavailable, using clientele-data.js.', err);
        return null;
      })
    ]).then(function (results) {
      var liveCategories = results[0];
      var liveEndorsements = results[1];
      if (liveCategories && liveCategories.length) {
        var CATEGORIES = global.IconicClientele.categories;
        CATEGORIES.length = 0;
        Array.prototype.push.apply(CATEGORIES, liveCategories);
      }
      if (liveEndorsements && liveEndorsements.length) {
        var ENDORSEMENTS = global.IconicClientele.endorsements;
        ENDORSEMENTS.length = 0;
        Array.prototype.push.apply(ENDORSEMENTS, liveEndorsements);
      }
      dispatch('iconic:clientele-ready');
    });
  }

  /* ======================================================================
     Instagram — profile fields (site_content) and, as of Phase 6.6, posts
     and reels (their own tables) are all live-capable.
  ====================================================================== */
  function fetchInstagramProfileLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('site_content').select('data').eq('section', 'instagram_profile').maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      var d = result.data && result.data.data;
      if (!d || !Object.keys(d).length) return null;
      return {
        handle: d.handle || null,
        name: d.name || null,
        url: d.url || null,
        bio: d.bio || null,
        avatar: d.avatar || null,
        followerCount: d.follower_count != null && d.follower_count !== '' ? Number(d.follower_count) : null,
        postCount: d.post_count != null && d.post_count !== '' ? Number(d.post_count) : null
      };
    });
  }

  function fetchInstagramPostsLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('instagram_posts').select('*').eq('published', true).order('sort_order', { ascending: true }).then(function (result) {
      if (result.error) throw result.error;
      return (result.data || []).map(function (row) {
        return {
          id: row.id,
          media_type: row.media_type,
          media_url: row.media_url,
          media_url_webp: row.media_url_webp,
          permalink: row.permalink,
          caption: row.caption,
          timestamp: row.posted_at
        };
      });
    });
  }

  function fetchInstagramReelsLive() {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('instagram_reels').select('*').eq('published', true).order('sort_order', { ascending: true }).then(function (result) {
      if (result.error) throw result.error;
      return (result.data || []).map(function (row) {
        return {
          id: row.id,
          caption: row.caption,
          permalink: row.permalink,
          thumbnail_url: row.thumbnail_url,
          thumbnail_url_webp: row.thumbnail_url_webp
        };
      });
    });
  }

  function loadInstagram() {
    if (!global.IconicInstagram) return; // instagram-data.js not loaded on this page
    if (!isLiveCapable()) {
      dispatch('iconic:instagram-ready');
      return;
    }
    Promise.all([
      attemptLive(fetchInstagramProfileLive).catch(function (err) {
        console.warn('IconicDataService: live Instagram profile unavailable, using instagram-data.js.', err);
        return null;
      }),
      attemptLive(fetchInstagramPostsLive).catch(function (err) {
        console.warn('IconicDataService: live Instagram posts unavailable, using instagram-data.js.', err);
        return null;
      }),
      attemptLive(fetchInstagramReelsLive).catch(function (err) {
        console.warn('IconicDataService: live Instagram reels unavailable, using instagram-data.js.', err);
        return null;
      })
    ]).then(function (results) {
      var liveProfile = results[0];
      var livePosts = results[1];
      var liveReels = results[2];
      if (liveProfile) {
        var profile = global.IconicInstagram.profile;
        Object.keys(liveProfile).forEach(function (key) {
          if (liveProfile[key] != null) profile[key] = liveProfile[key];
        });
      }
      if (livePosts && livePosts.length) {
        var POSTS = global.IconicInstagram.posts;
        POSTS.length = 0;
        Array.prototype.push.apply(POSTS, livePosts);
      }
      if (liveReels && liveReels.length) {
        var REELS = global.IconicInstagram.reels;
        REELS.length = 0;
        Array.prototype.push.apply(REELS, liveReels);
      }
      dispatch('iconic:instagram-ready');
    });
  }

  /* ======================================================================
     Homepage content (Phase 6.6) — Hero, About, Trust, Statistics, FAQ,
     and the Videos section's intro copy. Unlike fleet/experiences/
     clientele/instagram, none of these have a static *-data.js file or an
     existing render script — index.html has always hardcoded this copy
     directly. So there's no "static global" to overwrite: instead, a live
     section's resolved content is exposed on window.IconicHomepageContent
     only when it's actually usable, and left unset otherwise. The
     dedicated consumer (js/homepage-content.js) treats "unset" as "leave
     index.html's existing markup exactly as it is" — which is already the
     correct fallback, since that markup *is* the static default.
  ====================================================================== */
  global.IconicHomepageContent = {};

  function fetchSiteContentSectionLive(sectionKey) {
    var supabase = global.IconicSupabase.getClient();
    if (!supabase) return Promise.reject(new Error('Supabase client unavailable.'));

    return supabase.from('site_content').select('data').eq('section', sectionKey).maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      var d = result.data && result.data.data;
      if (!d || !Object.keys(d).length) return null;
      return d;
    });
  }

  /** Shared by every Hero/About/Trust/Statistics/FAQ/Videos-intro loader —
   *  they differ only in which site_content row they read, which ready
   *  event they dispatch, and which element proves this page even has
   *  that section (fleet detail pages have none of them), not in the
   *  attempt/fallback/dispatch mechanics itself. */
  function loadHomepageSection(sectionKey, eventName, presenceSelector) {
    if (!document.querySelector(presenceSelector)) return; // section not on this page
    if (!isLiveCapable()) {
      dispatch(eventName);
      return;
    }
    attemptLive(function () { return fetchSiteContentSectionLive(sectionKey); })
      .then(function (liveData) {
        if (liveData) global.IconicHomepageContent[sectionKey] = liveData;
      })
      .catch(function (err) {
        console.warn('IconicDataService: live "' + sectionKey + '" content unavailable, keeping index.html\'s existing copy.', err);
      })
      .then(function () { dispatch(eventName); });
  }

  function loadHero() { loadHomepageSection('hero', 'iconic:hero-ready', '.hero'); }
  function loadAbout() { loadHomepageSection('about', 'iconic:about-ready', '#about'); }
  function loadTrust() { loadHomepageSection('trust', 'iconic:trust-ready', '#trust'); }
  function loadStatistics() { loadHomepageSection('statistics', 'iconic:statistics-ready', '.trust-grid'); }
  function loadFaq() { loadHomepageSection('faq', 'iconic:faq-ready', '#faq'); }
  function loadVideosIntro() { loadHomepageSection('videos_section', 'iconic:videos-intro-ready', '#videos'); }

  /* ======================================================================
     Boot — runs once, on script load. Each loader independently no-ops if
     its static file isn't present on the current page (see the guard at
     the top of each), so this is safe to call unconditionally from every
     page that includes this script, regardless of which data domains
     that particular page actually uses. The homepage-content loaders have
     no such guard (there's no per-page static file to check for) — they're
     cheap no-ops on any page without a matching site_content row, same as
     every other domain's "unconfigured" fast path.
  ====================================================================== */
  loadFleet();
  loadExperiences();
  loadClientele();
  loadInstagram();
  loadHero();
  loadAbout();
  loadTrust();
  loadStatistics();
  loadFaq();
  loadVideosIntro();

  global.IconicDataService = {
    // Exposed for the fallback verification step (temporarily forcing
    // fallback without editing js/booking-config.js) and for debugging —
    // not used by any consumer script.
    isLiveCapable: isLiveCapable
  };
})(window);
