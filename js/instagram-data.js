/**
 * Iconic Rentals — Instagram Data
 *
 * Backs the homepage Instagram section. Shaped deliberately close to what
 * the Instagram Graph API's `IG Media` object actually returns (id,
 * media_type, media_url, thumbnail_url, permalink, caption, timestamp) so
 * that connecting the real API later is a data-source swap, not a UI
 * rewrite — see the migration note at the bottom of this file.
 *
 * For now (no API connection yet): INSTAGRAM_POSTS is manually populated
 * with the site's own photography as stand-in preview content, each with a
 * written caption — exactly the "use placeholders or manually populated
 * content" approach called for until the Graph API is connected.
 * INSTAGRAM_REELS is empty (no reels have been shot yet); the section
 * shows an honest "coming soon" state rather than fabricated video posts.
 */
(function (global) {
  'use strict';

  var INSTAGRAM_PROFILE = {
    handle: '@iconic_yacht',
    name: 'Iconic Rentals',
    url: 'https://www.instagram.com/iconic_yacht/',
    bio: "Miami's private concierge for luxury yacht charters & exotic car rentals.",
    avatar: null,
    avatarWebp: null,
    /* Real, checkable numbers only — never invent a follower/post count.
       Both stay null (rendered as "—") until the client shares real figures
       or the Graph API is connected and can report them automatically. */
    followerCount: null,
    postCount: null
  };

  var INSTAGRAM_POSTS = [
    {
      id: 'manual-1',
      media_type: 'IMAGE',
      media_url: '/images/hero-yacht-miami-thumb.jpg',
      media_url_webp: '/images/hero-yacht-miami-thumb.webp',
      permalink: 'https://www.instagram.com/iconic_yacht/',
      caption: 'Golden hour on Biscayne Bay — this is the moment every charter is built around.',
      timestamp: null
    },
    {
      id: 'manual-2',
      media_type: 'IMAGE',
      media_url: '/images/yacht-marina-dusk-thumb.jpg',
      media_url_webp: '/images/yacht-marina-dusk-thumb.webp',
      permalink: 'https://www.instagram.com/iconic_yacht/',
      caption: 'Docked and dressed for the evening. Miami after dark, from the water.',
      timestamp: null
    },
    {
      id: 'manual-3',
      media_type: 'IMAGE',
      media_url: '/images/car-mood-night-thumb.jpg',
      media_url_webp: '/images/car-mood-night-thumb.webp',
      permalink: 'https://www.instagram.com/iconic_yacht/',
      caption: 'Some arrivals need no introduction.',
      timestamp: null
    },
    {
      id: 'manual-4',
      media_type: 'IMAGE',
      media_url: '/images/yacht-aerial-thumb.jpg',
      media_url_webp: '/images/yacht-aerial-thumb.webp',
      permalink: 'https://www.instagram.com/iconic_yacht/',
      caption: 'Open water, no itinerary but the one you choose.',
      timestamp: null
    },
    {
      id: 'manual-5',
      media_type: 'IMAGE',
      media_url: '/images/about-yacht-deck-thumb.jpg',
      media_url_webp: '/images/about-yacht-deck-thumb.webp',
      permalink: 'https://www.instagram.com/iconic_yacht/',
      caption: 'Champagne on ice, skyline on the horizon.',
      timestamp: null
    }
  ];

  /* No reels shot/posted yet — left empty rather than filled with
     placeholder video URLs; the homepage section renders an honest
     "coming soon" state for this row until real Reels exist. */
  var INSTAGRAM_REELS = [];

  global.IconicInstagram = {
    profile: INSTAGRAM_PROFILE,
    posts: INSTAGRAM_POSTS,
    reels: INSTAGRAM_REELS
  };

  /**
   * Instagram Graph API migration path:
   *   1. Server-side (this can't run client-side — it needs a long-lived
   *      access token), call GET /me/media?fields=id,media_type,media_url,
   *      thumbnail_url,permalink,caption,timestamp on a schedule, and GET
   *      /me?fields=followers_count,media_count for the profile stats.
   *   2. Replace INSTAGRAM_POSTS/INSTAGRAM_REELS (split by media_type:
   *      VIDEO items tagged as Reels go to the reels array) with that
   *      response, and followerCount/postCount with the real numbers.
   *   3. Populate window.IconicInstagram as above, then dispatch
   *      document.dispatchEvent(new CustomEvent('iconic:instagram-ready'))
   *      so page scripts know the data has arrived.
   *   4. Move the render calls in js/instagram.js inside a listener for
   *      that event instead of running at the bottom of the script, as
   *      they do today.
   * No HTML/CSS changes are required for this migration.
   */
})(window);
