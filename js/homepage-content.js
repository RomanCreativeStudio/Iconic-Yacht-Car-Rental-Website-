/**
 * Iconic Rentals — Homepage Content Consumer (Phase 6.6)
 *
 * Patches Hero/About/Trust/Statistics/FAQ/Videos-intro copy from
 * window.IconicHomepageContent[sectionKey] (populated by js/data-service.js)
 * onto the markup index.html already hardcodes for these sections. Unlike
 * every other *-ready consumer on this site, there's no static *-data.js
 * file backing this content and no render-from-scratch step: the six
 * ready events below fire whether or not live data was found, and this
 * file only *mutates* existing text/attributes when it was — it never
 * calls innerHTML on a whole section or removes/creates elements.
 *
 * That constraint is deliberate, not an oversight. Three separate pieces
 * of interactive behavior are already wired to these exact DOM nodes by
 * the time these ready events can possibly fire (they're gated on
 * DOMContentLoaded, same as every other domain — see data-service.js):
 *   - main.js's scroll-reveal IntersectionObserver, watching the
 *     .reveal-stagger *containers* (.about-pillars, .trust-pillars,
 *     .trust-grid, .faq-list) themselves, not their children — safe as
 *     long as those containers are never replaced, only their children's
 *     text.
 *   - main.js's counter-animation IntersectionObserver, watching each
 *     individual [data-counter] <span> and reading its data-count-to /
 *     data-suffix attributes at animation time (not setup time) — safe to
 *     update those attributes in place, unsafe to replace the <span>
 *     itself, which would silently drop it from the observer.
 *   - main.js's FAQ accordion, with click listeners bound to the specific
 *     .faq-question buttons present at load time, keyed by their
 *     aria-controls/id pairing — safe to retext, unsafe to regenerate.
 *   - Video card lightbox, card layout are all untouched by any of this,
 *     because none of the elements this file rewrites are anywhere in
 *     that lightbox/gallery path in the first place.
 *
 * List-shaped fields (hero.stats, about.pillars, trust.pillars,
 * statistics.items, faq.items) are only ever applied when the live array's
 * length exactly matches the number of elements already in index.html —
 * enough to update every item's text in place, never enough to justify
 * adding or removing one. A count mismatch is logged (console.info, not a
 * warning or error — this is an expected, sanctioned outcome, not a
 * failure) and that list is left exactly as index.html already has it.
 * Icons (the `icon` field on pillar entries) are intentionally never
 * touched — there is no icon-key-to-SVG lookup on the public site today,
 * only inline SVG markup per pillar, so an icon field is accepted from the
 * CMS but has nowhere to render yet; only each pillar's text updates.
 */
(function () {
  'use strict';

  function setText(selector, value) {
    if (value == null || value === '') return;
    var el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function setHref(selector, value) {
    if (!value) return;
    var el = document.querySelector(selector);
    if (el) el.setAttribute('href', value);
  }

  /** Applies `apply(el, item)` to each of `items` against the
   *  corresponding element in `els`, only when the lengths match exactly.
   *  Logs and no-ops otherwise — see the header comment for why a
   *  mismatch is never treated as an error. */
  function patchList(containerSelector, itemSelector, items, sectionLabel, apply) {
    if (!items || !items.length) return;
    var container = document.querySelector(containerSelector);
    if (!container) return;
    var els = Array.prototype.slice.call(container.querySelectorAll(itemSelector));
    if (els.length !== items.length) {
      console.info('IconicHomepageContent: "' + sectionLabel + '" has ' + items.length + ' live item(s) but index.html has ' + els.length + ' — counts must match to patch in place, keeping index.html\'s existing content.');
      return;
    }
    els.forEach(function (el, i) { apply(el, items[i]); });
  }

  document.addEventListener('iconic:hero-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.hero;
    if (!data) return;

    setText('.hero .eyebrow', data.eyebrow);
    setText('.hero-title', data.title);
    setText('.hero-text', data.subtitle);
    setText('.hero-ctas .btn-primary', data.cta_primary_label);
    setHref('.hero-ctas .btn-primary', data.cta_primary_href);
    setText('.hero-ctas .btn-ghost', data.cta_secondary_label);
    setHref('.hero-ctas .btn-ghost', data.cta_secondary_href);

    patchList('.hero-stats', '.hero-stat', data.stats, 'hero.stats', function (el, item) {
      var strong = el.querySelector('strong');
      var span = el.querySelector('span');
      if (strong && item.value) strong.textContent = item.value;
      if (span && item.label) span.textContent = item.label;
    });
  });

  document.addEventListener('iconic:about-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.about;
    if (!data) return;

    setText('#about .eyebrow', data.eyebrow);
    setText('#about-heading', data.title);
    setText('#about .section-sub', data.body);

    patchList('.about-pillars', '.pillar', data.pillars, 'about.pillars', function (el, item) {
      var title = el.querySelector('h3');
      var desc = el.querySelector('p');
      if (title && item.title) title.textContent = item.title;
      if (desc && item.description) desc.textContent = item.description;
    });
  });

  document.addEventListener('iconic:trust-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.trust;
    if (!data) return;

    setText('#trust-heading', data.title);

    patchList('.trust-pillars', '.trust-pillar', data.pillars, 'trust.pillars', function (el, item) {
      var span = el.querySelector('span');
      if (span && item.label) span.textContent = item.label;
    });
  });

  document.addEventListener('iconic:statistics-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.statistics;
    if (!data) return;

    patchList('.trust-grid', '.trust-stat', data.items, 'statistics.items', function (el, item) {
      var number = el.querySelector('.trust-number');
      var label = el.querySelector('.trust-label');
      if (number && item.count != null && item.count !== '') {
        number.setAttribute('data-count-to', item.count);
        number.setAttribute('data-suffix', item.suffix || '');
      }
      if (label && item.label) label.textContent = item.label;
    });
  });

  document.addEventListener('iconic:faq-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.faq;
    if (!data) return;

    patchList('.faq-list', '.faq-item', data.items, 'faq.items', function (el, item) {
      var question = el.querySelector('.faq-question span');
      var answer = el.querySelector('.faq-answer p');
      if (question && item.question) question.textContent = item.question;
      if (answer && item.answer) answer.textContent = item.answer;
    });
  });

  document.addEventListener('iconic:videos-intro-ready', function () {
    var data = window.IconicHomepageContent && window.IconicHomepageContent.videos_section;
    if (!data) return;

    setText('#videos .eyebrow', data.eyebrow);
    setText('#videos-heading', data.title);
    setText('#videos .section-sub', data.subtitle);
  });
})();
