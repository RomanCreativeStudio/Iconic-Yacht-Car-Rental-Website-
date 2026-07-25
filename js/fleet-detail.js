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
  var ICON_CAMERA = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 17c1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0"/><path d="M6 13 7 5l10 1.5-2 6.5Z"/></svg>';

  /* Service inclusions are the same for every yacht charter (crew, fuel,
     safety, cleaning) — unlike Amenities, which describes onboard hardware
     and does vary per vessel, so it stays data-driven per fleet item. */
  var YACHT_INCLUDED = [
    'Professional, licensed captain & crew',
    'Fuel for a standard itinerary within Biscayne Bay',
    'Ice, bottled water & soft drinks',
    'Pre-departure safety briefing & required safety equipment',
    'Vessel cleaning before and after your charter',
    'Sales tax & standard dockage fees'
  ];

  var GALLERY_CATEGORIES = [
    { key: 'exterior', label: 'Exterior' },
    { key: 'interior', label: 'Interior' },
    { key: 'lifestyle', label: 'Lifestyle' }
  ];

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

  /* Categorized brochure gallery (Exterior / Interior / Lifestyle tabs) for
     yachts that have the new `galleries` field; everything else (cars,
     or any yacht missing it) falls back to the original flat gallery. */
  function renderCategorizedGallery(vehicle, container) {
    /* Reuses the homepage's .fleet-tab / .fleet-panel components (see
       style.css) rather than inventing new tab styling — same visual
       treatment, and .fleet-panel already toggles via .is-active alone
       (no [hidden] attribute), sidestepping the [hidden]-vs-author-CSS
       specificity bug this project has hit more than once elsewhere. */

    /* #fdGallery ships with class="fd-gallery" in the markup so the flat
       (non-categorized) fallback path below can drop gallery items straight
       into it as a 3-column grid. The categorized layout wraps its own grid
       per panel instead, so that class has to come off the outer container
       here or it doubles up as a 3-column grid one level too high, squashing
       the tabs and every panel into a sliver a third of the page width. */
    container.classList.remove('fd-gallery');

    var tabsHtml = GALLERY_CATEGORIES.map(function (cat, i) {
      return (
        '<button type="button" class="fleet-tab' + (i === 0 ? ' is-active' : '') + '" data-category="' + cat.key + '" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" id="fdGalTab-' + cat.key + '" aria-controls="fdGalPanel-' + cat.key + '">' + cat.label + '</button>'
      );
    }).join('');

    var panelsHtml = GALLERY_CATEGORIES.map(function (cat, i) {
      var shots = vehicle.galleries[cat.key] || [];
      var shotsHtml = shots.map(function (shot) {
        if (shot.src) {
          var caption = vehicle.name + ' — ' + shot.label;
          return (
            '<button type="button" class="fd-gallery-item" data-lightbox-src="../' + shot.src + '" data-lightbox-group="' + vehicle.slug + '-' + cat.key + '" data-lightbox-caption="' + escapeHtml(caption) + '" aria-label="View larger image: ' + escapeHtml(caption) + '">' +
            '<picture>' + (shot.webp ? '<source srcset="../' + shot.webp + '" type="image/webp" />' : '') + '<img src="../' + shot.src + '" alt="' + escapeHtml(shot.alt || caption) + '" loading="lazy" /></picture>' +
            '<span class="fd-gallery-item-caption">' + escapeHtml(shot.label) + '</span>' +
            '</button>'
          );
        }
        return (
          '<div class="fd-gallery-item fd-gallery-item-placeholder">' +
          ICON_CAMERA +
          '<span class="fd-gallery-item-caption">' + escapeHtml(shot.label) + '</span>' +
          '<span class="fd-gallery-item-tag">Coming Soon</span>' +
          '</div>'
        );
      }).join('');

      return (
        '<div class="fleet-panel' + (i === 0 ? ' is-active' : '') + '" data-panel="' + cat.key + '" id="fdGalPanel-' + cat.key + '" role="tabpanel" aria-labelledby="fdGalTab-' + cat.key + '">' +
          '<div class="fd-gallery">' + shotsHtml + '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML =
      '<div class="fleet-tabs" role="tablist" aria-label="Gallery categories">' + tabsHtml + '</div>' +
      panelsHtml;

    var tabs = Array.prototype.slice.call(container.querySelectorAll('.fleet-tab'));
    var panels = Array.prototype.slice.call(container.querySelectorAll('.fleet-panel'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-category');
        tabs.forEach(function (t) {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');

        panels.forEach(function (panel) {
          panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target);
        });
      });
    });
  }

  /* Gallery (falls back to the hero image, or a styled placeholder) */
  var galleryEl = document.getElementById('fdGallery');

  if (item.type === 'yacht' && item.galleries) {
    renderCategorizedGallery(item, galleryEl);
  } else {
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

  /* What's Included — yachts only; a car detail page has no crew/fuel/dockage
     inclusions to speak of, so the section stays out of the DOM entirely. */
  var includedSection = document.getElementById('fdIncludedSection');
  if (includedSection && item.type === 'yacht') {
    document.getElementById('fdIncludedList').innerHTML = YACHT_INCLUDED.map(function (a) {
      return '<li>' + ICON_CHECK + '<span>' + escapeHtml(a) + '</span></li>';
    }).join('');
    includedSection.hidden = false;
  }

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
