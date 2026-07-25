/**
 * Populates the homepage "Luxury Experiences" section (#luxury-experiences)
 * from js/experiences-data.js. Same card markup and shared CSS
 * (.fd-experience-card, in css/media-components.css) as each yacht page's
 * "Recent Experiences on this yacht" panel, so both look and behave
 * identically — see js/fleet-detail.js for that consumer.
 */
(function () {
  'use strict';

  if (!window.IconicExperiences || !window.IconicMedia) return;

  var escapeHtml = window.IconicMedia.escapeHtml;
  var ICONS = window.IconicMedia.icons;

  var filtersEl = document.getElementById('experiencesFilters');
  var gridEl = document.getElementById('experiencesGrid');
  var emptyEl = document.getElementById('experiencesEmpty');

  if (!gridEl || !emptyEl) return;

  var all = window.IconicExperiences.getFeatured();

  if (!all.length) {
    gridEl.hidden = true;
    if (filtersEl) filtersEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  emptyEl.hidden = true;
  gridEl.hidden = false;

  function cardHtml(exp) {
    var cover = exp.coverImage;
    var categoryInfo = window.IconicExperiences.getCategory(exp.category);
    var mediaHtml = cover
      ? '<picture>' + (cover.webp ? '<source srcset="' + escapeHtml(cover.webp) + '" type="image/webp" />' : '') + '<img src="' + escapeHtml(cover.src) + '" alt="' + escapeHtml(cover.alt || exp.title) + '" loading="lazy" /></picture>'
      : '<div class="fd-experience-media-placeholder">' + ICONS.camera + '</div>';
    var categoryTag = categoryInfo ? '<span class="fd-experience-category">' + escapeHtml(categoryInfo.label) + '</span>' : '';

    var reviewHtml = '';
    if (exp.clientReview) {
      var stars = Array(exp.clientReview.rating || 5).fill(ICONS.star).join('');
      reviewHtml =
        '<div class="testimonial-stars" aria-hidden="true">' + stars + '</div>' +
        '<p class="testimonial-quote">“' + escapeHtml(exp.clientReview.quote) + '”</p>' +
        '<div class="testimonial-author"><span>' + escapeHtml(exp.clientReview.guestName) + '</span></div>';
    }

    var linkParts = [];
    if (exp.instagramPost) linkParts.push('<a href="' + escapeHtml(exp.instagramPost) + '" target="_blank" rel="noopener">View Post</a>');
    if (exp.instagramReel) linkParts.push('<a href="' + escapeHtml(exp.instagramReel) + '" target="_blank" rel="noopener">Watch Reel</a>');
    var linksHtml = linkParts.length ? '<div class="fd-experience-links">' + linkParts.join('') + '</div>' : '';

    return (
      '<article class="fd-experience-card" data-category="' + escapeHtml(exp.category || '') + '">' +
      '<div class="fd-experience-media">' + mediaHtml + categoryTag + '</div>' +
      '<div class="fd-experience-body">' +
      (exp.date ? '<span class="fd-experience-date">' + escapeHtml(exp.date) + '</span>' : '') +
      '<h3>' + escapeHtml(exp.title) + '</h3>' +
      (exp.description ? '<p class="fd-experience-desc">' + escapeHtml(exp.description) + '</p>' : '') +
      reviewHtml +
      linksHtml +
      '</div>' +
      '</article>'
    );
  }

  function render(filterKey) {
    var list = filterKey && filterKey !== 'all' ? all.filter(function (exp) { return exp.category === filterKey; }) : all;
    gridEl.innerHTML = list.map(cardHtml).join('');
  }

  /* Filter tabs only appear once experiences span more than one category —
     otherwise a row of tabs would imply more variety than exists yet. */
  if (filtersEl) {
    var usedCategories = window.IconicExperiences.categories.filter(function (cat) {
      return all.some(function (exp) { return exp.category === cat.key; });
    });

    if (usedCategories.length > 1) {
      filtersEl.hidden = false;
      filtersEl.innerHTML =
        '<button type="button" class="fleet-tab is-active" data-filter="all" aria-pressed="true">All</button>' +
        usedCategories.map(function (cat) {
          return '<button type="button" class="fleet-tab" data-filter="' + escapeHtml(cat.key) + '" aria-pressed="false">' + escapeHtml(cat.label) + '</button>';
        }).join('');

      filtersEl.addEventListener('click', function (event) {
        var btn = event.target.closest('button[data-filter]');
        if (!btn) return;
        var buttons = filtersEl.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
          buttons[i].classList.remove('is-active');
          buttons[i].setAttribute('aria-pressed', 'false');
        }
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        render(btn.getAttribute('data-filter'));
      });
    } else {
      filtersEl.hidden = true;
    }
  }

  render('all');
})();
