/**
 * Iconic Rentals — Shared Media Components
 *
 * A small, dependency-free toolkit of markup builders reused across the
 * homepage Instagram section, the homepage Luxury Experiences section, and
 * the yacht detail page's Videos & Tours / Recent Experiences panels — so
 * a "video card" or "coming soon" placeholder looks and behaves the same
 * everywhere instead of being reimplemented per page.
 *
 * Load this before any script that calls window.IconicMedia.
 */
(function (global) {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICON_CHECK = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 13 4 4L19 7"/></svg>';
  var ICON_CAMERA = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 17c1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0"/><path d="M6 13 7 5l10 1.5-2 6.5Z"/></svg>';
  var ICON_PLAY = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M10.5 8.3v7.4l6-3.7-6-3.7Z" fill="currentColor" stroke="none"/></svg>';
  var ICON_INSTAGRAM = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>';
  var ICON_TIKTOK = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M14 3.5v11a3.3 3.3 0 1 1-3.3-3.3c.3 0 .6.02.9.08"/><path d="M14 3.5c.35 2.3 2.15 4.1 4.4 4.35"/></svg>';
  var ICON_TOUR360 = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="3.6" ry="9"/></svg>';
  var ICON_DRONE = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M6.4 6.4 10.5 10.5M17.6 6.4 13.5 10.5M6.4 17.6 10.5 13.5M17.6 17.6 13.5 13.5"/><rect x="10" y="10" width="4" height="4" rx="1"/></svg>';
  var ICON_CLIENT = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>';
  var ICON_STAR = '<svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L10 14.9 4.4 18l1.4-6.2L1 7.5l6.4-.6L10 1Z"/></svg>';

  var ICONS = {
    check: ICON_CHECK,
    camera: ICON_CAMERA,
    play: ICON_PLAY,
    instagram: ICON_INSTAGRAM,
    tiktok: ICON_TIKTOK,
    tour360: ICON_TOUR360,
    drone: ICON_DRONE,
    client: ICON_CLIENT,
    star: ICON_STAR
  };

  var PLATFORM_ICONS = {
    video: ICON_PLAY,
    walkthrough: ICON_PLAY,
    instagram: ICON_INSTAGRAM,
    tiktok: ICON_TIKTOK,
    tour360: ICON_TOUR360,
    drone: ICON_DRONE,
    client: ICON_CLIENT
  };

  /* A single empty-slot card: icon + label + a contextual "coming soon"
     sentence, e.g. "Master Cabin photography coming soon." Used for both
     unfilled photo categories and unfilled video/social slots so every
     "nothing here yet" moment across the site looks and reads the same. */
  function renderPlaceholder(label, icon, message) {
    return (
      '<div class="fd-gallery-item fd-gallery-item-placeholder">' +
      (icon || ICON_CAMERA) +
      '<span class="fd-gallery-item-caption">' + escapeHtml(label) + '</span>' +
      '<span class="fd-gallery-item-message">' + escapeHtml(message) + '</span>' +
      '</div>'
    );
  }

  /**
   * Renders one video/social card: Instagram Reel, TikTok, walkthrough,
   * drone footage, or client-submitted video. Real entries (item.url set)
   * render as a link-out card — thumbnail + play icon, opens the source
   * platform in a new tab — rather than an embed, so there's no per-platform
   * embed script to maintain; just as easy to fill in with a URL later.
   *
   * @param {{label:string, platform:string, url:?string, thumbnail:?string, thumbnailWebp:?string}} item
   * @param {{pathPrefix?:string, captionPrefix?:string}} [opts]
   *   pathPrefix: relative path back to the site root for image src
   *   (e.g. '../' from fleet/vehicle.html, '' from index.html).
   *   captionPrefix: prepended to the accessible caption, e.g. a vehicle
   *   or experience name — "Azure Horizon — Instagram Reel".
   */
  function renderVideoCard(item, opts) {
    opts = opts || {};
    var pathPrefix = opts.pathPrefix || '';
    var caption = (opts.captionPrefix ? opts.captionPrefix + ' — ' : '') + item.label;
    var icon = PLATFORM_ICONS[item.platform] || ICON_PLAY;

    if (!item.url) {
      return renderPlaceholder(item.label, icon, item.label + ' coming soon.');
    }

    return (
      '<a class="fd-gallery-item fd-video-item' + (item.thumbnail ? '' : ' fd-video-item--no-thumb') + '" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" aria-label="Watch: ' + escapeHtml(caption) + '">' +
      (item.thumbnail
        ? '<picture>' + (item.thumbnailWebp ? '<source srcset="' + pathPrefix + item.thumbnailWebp + '" type="image/webp" />' : '') + '<img src="' + pathPrefix + item.thumbnail + '" alt="' + escapeHtml(caption) + '" loading="lazy" /></picture>'
        : '') +
      '<span class="fd-video-play-icon">' + ICON_PLAY + '</span>' +
      '<span class="fd-gallery-item-caption">' + escapeHtml(item.label) + '</span>' +
      '</a>'
    );
  }

  /**
   * Renders a set of video/social items (e.g. a yacht's walkthrough + reel
   * + TikTok + 360 tour, or a whole platform's worth of Reels) as one grid
   * of cards via renderVideoCard, real or placeholder as appropriate.
   */
  function renderVideoGrid(items, opts) {
    return items.map(function (item) { return renderVideoCard(item, opts); }).join('');
  }

  global.IconicMedia = {
    escapeHtml: escapeHtml,
    icons: ICONS,
    platformIcons: PLATFORM_ICONS,
    renderPlaceholder: renderPlaceholder,
    renderVideoCard: renderVideoCard,
    renderVideoGrid: renderVideoGrid
  };
})(window);
