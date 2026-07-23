/**
 * Iconic Rentals — Analytics & Conversion Tracking
 *
 * See CLIENT_SETUP.md, "Analytics & Tracking" for activation steps.
 *
 * IconicAnalytics.track() is a safe no-op until Google Analytics (gtag)
 * and/or the Meta Pixel (fbq) are actually loaded — see the commented-out
 * snippets near the top of <head> in index.html / fleet/vehicle.html.
 * That means every tracking call already wired up below (book button
 * clicks, form submissions, phone clicks, fleet interactions) will start
 * working the moment a real GA4/Pixel ID is dropped in — no other code
 * changes required.
 */
(function (global) {
  'use strict';

  function track(eventName, params) {
    params = params || {};

    if (typeof global.gtag === 'function') {
      global.gtag('event', eventName, params);
    }

    if (typeof global.fbq === 'function') {
      global.fbq('trackCustom', eventName, params);
    }

    if (global.location.search.indexOf('debug_analytics=1') !== -1 && global.console) {
      // eslint-disable-next-line no-console
      console.log('[analytics]', eventName, params);
    }
  }

  global.IconicAnalytics = { track: track };

  document.addEventListener('DOMContentLoaded', function () {
    /* Book button clicks — every entry point into a booking flow */
    document.querySelectorAll(
      '[data-book-yacht], [data-book-car], [data-quick-book], #fdBookBtn, .sticky-cta .btn, .nav-cta'
    ).forEach(function (el) {
      el.addEventListener('click', function () {
        track('book_button_click', {
          label: (el.textContent || '').trim().slice(0, 80),
          location: el.closest('section, header, aside, .sticky-cta') ?
            (el.closest('section, header, aside, .sticky-cta').id || el.closest('section, header, aside, .sticky-cta').className) : 'unknown'
        });
      });
    });

    /* Phone clicks — floating menu, contact section, footer */
    document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('phone_click', { number: el.getAttribute('href').replace('tel:', '') });
      });
    });

    /* WhatsApp clicks */
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('whatsapp_click', {});
      });
    });

    /* Fleet interactions: viewing details, switching yacht/car tabs */
    document.querySelectorAll('.fleet-card-footer a.btn-ghost').forEach(function (el) {
      el.addEventListener('click', function () {
        var card = el.closest('.fleet-card');
        var name = card ? card.querySelector('h3') : null;
        track('fleet_view_details', { vehicle: name ? name.textContent.trim() : 'unknown' });
      });
    });

    document.querySelectorAll('.fleet-tab').forEach(function (el) {
      el.addEventListener('click', function () {
        track('fleet_tab_switch', { tab: el.textContent.trim() });
      });
    });

    /* Gallery / fleet-detail-gallery lightbox opens */
    document.querySelectorAll('[data-lightbox-src]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('gallery_image_open', { caption: el.getAttribute('data-lightbox-caption') || '' });
      });
    });
  });
})(window);
