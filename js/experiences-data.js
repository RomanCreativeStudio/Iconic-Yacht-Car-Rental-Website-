/**
 * Iconic Rentals — Client Experiences & Charter Highlights
 *
 * Single source of truth for every documented charter/rental experience —
 * birthday charters, proposals, corporate events, and so on. Both the
 * homepage's "Luxury Experiences" section and each yacht detail page's
 * "Recent Experiences on this yacht" section render from this one array
 * (the yacht page filters it by yachtSlug) — so logging a new charter is
 * one object added here, not two.
 *
 * Shape of one entry:
 * {
 *   id: string,
 *   title: string,
 *   category: one of EXPERIENCE_CATEGORIES' keys below,
 *   date: string — human-readable, e.g. "June 2026",
 *   yachtSlug: string|null — links back to a fleet-data.js entry; null for
 *     an experience not tied to one particular yacht,
 *   coverImage: {src, webp, alt} | null,
 *   photos: [{src, webp, alt}] — additional gallery images beyond the cover,
 *   videos: [{label, platform, url, thumbnail, thumbnailWebp}] — rendered
 *     via window.IconicMedia.renderVideoCard (platform: 'walkthrough',
 *     'instagram', 'tiktok', 'drone', or 'client'),
 *   instagramPost: string|null — URL of the Instagram post, if any,
 *   instagramReel: string|null — URL of the Instagram Reel, if any,
 *   description: string — the short story,
 *   clientReview: {quote, guestName, rating}|null,
 *   featured: boolean — true surfaces it first on the homepage section
 * }
 *
 * Empty today — no charters have been documented yet. Do NOT add
 * placeholder/sample entries with invented guest names, quotes, or review
 * stars here; every consumer of this file is built to show an honest
 * "coming soon" state when the array (or a filtered slice of it) is empty,
 * exactly the way fleet-data.js's per-yacht galleries do for missing photos.
 */
(function (global) {
  'use strict';

  var EXPERIENCE_CATEGORIES = [
    { key: 'birthday', label: 'Birthday Charters' },
    { key: 'proposal', label: 'Proposal Cruises' },
    { key: 'bachelor', label: 'Bachelor & Bachelorette Parties' },
    { key: 'corporate', label: 'Corporate Events' },
    { key: 'sunset', label: 'Sunset Cruises' },
    { key: 'athlete', label: 'Professional Athlete Charters' },
    { key: 'influencer', label: 'Influencer Experiences' },
    { key: 'vacation', label: 'Luxury Vacations' }
  ];

  var EXPERIENCES_DATA = [];

  function getCategory(key) {
    for (var i = 0; i < EXPERIENCE_CATEGORIES.length; i++) {
      if (EXPERIENCE_CATEGORIES[i].key === key) return EXPERIENCE_CATEGORIES[i];
    }
    return null;
  }

  function getByYacht(yachtSlug) {
    return EXPERIENCES_DATA.filter(function (exp) { return exp.yachtSlug === yachtSlug; });
  }

  function getFeatured(limit) {
    var featured = EXPERIENCES_DATA.filter(function (exp) { return exp.featured; });
    var rest = EXPERIENCES_DATA.filter(function (exp) { return !exp.featured; });
    var ordered = featured.concat(rest);
    return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
  }

  global.IconicExperiences = {
    data: EXPERIENCES_DATA,
    categories: EXPERIENCE_CATEGORIES,
    getCategory: getCategory,
    getByYacht: getByYacht,
    getFeatured: getFeatured
  };

  /**
   * CMS/API migration path (same approach as fleet-data.js): replace
   * EXPERIENCES_DATA's contents with a fetch() result of the same shape,
   * then dispatch document.dispatchEvent(new CustomEvent('iconic:experiences-ready'))
   * once populated, and move each consumer's render call (fleet-detail.js,
   * the homepage experiences section) inside a listener for that event
   * instead of running at the bottom of the script, as they do today.
   */
})(window);
