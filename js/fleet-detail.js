/**
 * Populates the fleet detail template (fleet/vehicle.html) from
 * js/fleet-data.js based on the ?slug= query parameter.
 *
 * Runs synchronously before main.js, so by the time main.js's
 * lightbox/reveal-scroll wiring executes, the gallery and related
 * fleet grid it needs to find are already in the DOM.
 */
(function () {
  'use strict';

  if (!window.IconicFleet || !window.IconicFleetRender) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  var item = slug ? window.IconicFleet.getFleetItem(slug) : null;

  if (!item) {
    window.location.replace('../index.html#fleet');
    return;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ICON_PERSON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21c0-3.9 3.6-7 8-7s8 3.1 8 7"/></svg>';
  var ICON_LENGTH = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICON_BOLT = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>';
  var ICON_CHECK = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m5 13 4 4L19 7"/></svg>';

  /* Document metadata */
  document.title = item.name + ' | ' + item.category + ' | Iconic Rentals';
  var metaDesc = document.getElementById('metaDescription');
  if (metaDesc) metaDesc.setAttribute('content', item.tagline + ' Reserve the ' + item.name + ' with Iconic Rentals, Miami’s private luxury concierge.');
  var ogTitle = document.getElementById('ogTitle');
  if (ogTitle) ogTitle.setAttribute('content', item.name + ' | Iconic Rentals');
  var canonical = document.getElementById('canonicalLink');
  if (canonical) canonical.setAttribute('href', 'https://www.iconicrentalsmiami.com/fleet/vehicle.html?slug=' + item.slug);

  /* Breadcrumb */
  var fleetTypeCrumb = document.getElementById('fleetTypeCrumb');
  var vehicleNameCrumb = document.getElementById('vehicleNameCrumb');
  if (fleetTypeCrumb) {
    fleetTypeCrumb.textContent = item.type === 'yacht' ? 'Yacht Fleet' : 'Car Fleet';
    fleetTypeCrumb.setAttribute('href', '../index.html#' + (item.type === 'yacht' ? 'yacht-fleet' : 'car-fleet'));
  }
  if (vehicleNameCrumb) vehicleNameCrumb.textContent = item.name;

  /* Hero */
  var heroMedia = document.getElementById('fdHeroMedia');
  if (heroMedia) {
    if (item.heroImage) {
      heroMedia.innerHTML =
        '<picture>' +
        (item.heroImageWebp ? '<source srcset="../' + item.heroImageWebp + '" type="image/webp" />' : '') +
        '<img src="../' + item.heroImage + '" alt="' + escapeHtml(item.name) + '" fetchpriority="high" /></picture>';
    } else {
      heroMedia.classList.add('fd-hero-media--placeholder');
    }
  }
  document.getElementById('fdCategory').textContent = item.category;
  document.getElementById('fdName').textContent = item.name;
  document.getElementById('fdTagline').textContent = item.tagline;

  /* Gallery (falls back to the hero image, or a styled placeholder) */
  var galleryEl = document.getElementById('fdGallery');
  var galleryImages = item.gallery && item.gallery.length
    ? item.gallery
    : (item.heroImage ? [{ src: item.heroImage, webp: item.heroImageWebp, alt: item.name }] : []);

  if (galleryImages.length) {
    galleryEl.innerHTML = galleryImages.map(function (img, i) {
      return (
        '<button type="button" class="fd-gallery-item" data-lightbox-src="../' + img.src + '" data-lightbox-caption="' + escapeHtml(item.name) + '" aria-label="View larger image ' + (i + 1) + ' of ' + galleryImages.length + '">' +
        '<picture>' + (img.webp ? '<source srcset="../' + img.webp + '" type="image/webp" />' : '') + '<img src="../' + img.src + '" alt="' + escapeHtml(img.alt || item.name) + '" loading="lazy" /></picture>' +
        '</button>'
      );
    }).join('');
  } else {
    galleryEl.innerHTML =
      '<div class="fd-gallery-placeholder">' +
      '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 17c1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0"/><path d="M6 13 7 5l10 1.5-2 6.5Z"/></svg>' +
      '<span>Gallery Coming Soon</span></div>';
  }

  /* Description */
  document.getElementById('fdDescription').textContent = item.description;

  /* Specs */
  var specsEl = document.getElementById('fdSpecs');
  specsEl.innerHTML = Object.keys(item.specs).map(function (key) {
    return '<div class="fd-spec"><dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(item.specs[key]) + '</dd></div>';
  }).join('');

  /* Amenities */
  var amenitiesEl = document.getElementById('fdAmenities');
  var allAmenities = (item.features || []).concat(item.amenities || []);
  amenitiesEl.innerHTML = allAmenities.map(function (a) {
    return '<li>' + ICON_CHECK + '<span>' + escapeHtml(a) + '</span></li>';
  }).join('');

  /* Sidebar */
  document.getElementById('fdSidebarName').textContent = item.name;
  var sidebarMeta = document.getElementById('fdSidebarMeta');
  if (item.type === 'yacht') {
    sidebarMeta.innerHTML =
      '<li>' + ICON_PERSON + '<span>' + item.capacity + ' Guests</span></li>' +
      '<li>' + ICON_LENGTH + '<span>' + escapeHtml(item.length) + '</span></li>';
  } else {
    sidebarMeta.innerHTML =
      '<li>' + ICON_BOLT + '<span>' + escapeHtml(item.hp) + '</span></li>' +
      '<li>' + ICON_PERSON + '<span>' + item.seats + ' Seats</span></li>';
  }

  var bookBtn = document.getElementById('fdBookBtn');
  bookBtn.addEventListener('click', function () {
    window.location.href = '../index.html?book=' + encodeURIComponent(item.slug) + '#booking';
  });

  var quickInquiryBtn = document.getElementById('fdQuickInquiryBtn');
  quickInquiryBtn.setAttribute('data-quick-book', '');

  /* Related fleet */
  var relatedGrid = document.getElementById('relatedFleetGrid');
  var related = window.IconicFleet.getRelatedFleet(item, 3);
  if (related.length) {
    window.IconicFleetRender.renderFleetGrid(relatedGrid, related);
    // Card links point at the site root; fix them up for this page's depth.
    relatedGrid.querySelectorAll('a[href^="/fleet/"]').forEach(function (a) {
      a.setAttribute('href', '..' + a.getAttribute('href'));
    });
  } else {
    document.getElementById('relatedFleetSection').style.display = 'none';
  }
})();
