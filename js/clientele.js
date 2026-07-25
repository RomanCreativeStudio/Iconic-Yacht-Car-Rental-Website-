/**
 * Populates the homepage "Who We Serve" section (#clientele) from
 * js/clientele-data.js. The category grid is general marketing copy and
 * always renders; the endorsements row only ever shows entries with
 * approved: true, and falls back to an honest empty state otherwise — see
 * the "do not fabricate" note at the top of js/clientele-data.js.
 */
(function () {
  'use strict';

  if (!window.IconicClientele || !window.IconicMedia) return;

  var escapeHtml = window.IconicMedia.escapeHtml;
  var ICON_STAR = window.IconicMedia.icons.star;
  var ICON_CAMERA = window.IconicMedia.icons.camera;

  var ICON_TROPHY = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 5H4v1a4 4 0 0 0 4 4"/><path d="M17 5h3v1a4 4 0 0 1-4 4"/><path d="M12 13v4"/><path d="M8 21h8"/><path d="M9 21c0-2 1.3-3 3-3s3 1 3 3"/></svg>';
  var ICON_CAP = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5"/><path d="M22 8v6"/></svg>';
  var ICON_GLOBE = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg>';
  var ICON_BRIEFCASE = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>';

  var CATEGORY_ICONS = {
    athlete: ICON_TROPHY,
    'college-athlete': ICON_CAP,
    influencer: ICON_CAMERA,
    'luxury-traveler': ICON_GLOBE,
    celebrity: ICON_STAR,
    corporate: ICON_BRIEFCASE
  };

  var categoriesEl = document.getElementById('clienteleCategories');
  if (categoriesEl) {
    categoriesEl.innerHTML = window.IconicClientele.categories.map(function (cat) {
      var icon = CATEGORY_ICONS[cat.key] || ICON_STAR;
      return (
        '<div class="clientele-card">' +
        '<div class="clientele-card-icon">' + icon + '</div>' +
        '<h3>' + escapeHtml(cat.label) + '</h3>' +
        '<p>' + escapeHtml(cat.description) + '</p>' +
        '</div>'
      );
    }).join('');
  }

  var endorsementsEl = document.getElementById('clienteleEndorsements');
  var endorsementsEmptyEl = document.getElementById('clienteleEndorsementsEmpty');
  if (endorsementsEl && endorsementsEmptyEl) {
    var approved = window.IconicClientele.getApproved();
    if (approved.length) {
      endorsementsEmptyEl.hidden = true;
      endorsementsEl.hidden = false;
      endorsementsEl.innerHTML = approved.map(function (entry) {
        var avatarHtml = entry.photo
          ? '<picture>' + (entry.photoWebp ? '<source srcset="' + escapeHtml(entry.photoWebp) + '" type="image/webp" />' : '') + '<img src="' + escapeHtml(entry.photo) + '" alt="' + escapeHtml(entry.name) + '" loading="lazy" /></picture>'
          : '<span class="author-avatar">' + escapeHtml((entry.name || '').slice(0, 2).toUpperCase()) + '</span>';
        return (
          '<article class="testimonial-card">' +
          '<p class="testimonial-quote">“' + escapeHtml(entry.quote) + '”</p>' +
          '<div class="testimonial-author">' + avatarHtml +
          '<div><strong>' + escapeHtml(entry.name) + '</strong><span>' + escapeHtml(entry.role || '') + '</span></div>' +
          '</div>' +
          '</article>'
        );
      }).join('');
    } else {
      endorsementsEl.hidden = true;
      endorsementsEmptyEl.hidden = false;
    }
  }
})();
