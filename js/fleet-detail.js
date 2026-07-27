/**
 * Populates the fleet detail template (fleet/vehicle.html) from
 * js/fleet-data.js based on the ?slug= query parameter.
 *
 * Waits for 'iconic:fleet-ready' (and 'iconic:experiences-ready', for the
 * Recent Experiences panel below) before rendering — Phase 6.5's
 * js/data-service.js may still be deciding between live Supabase data and
 * the static fallback when this script first executes, so
 * window.IconicFleet.data/window.IconicExperiences.data aren't guaranteed
 * to hold their final content until those events fire. Still runs before
 * main.js's lightbox/reveal-scroll wiring either way, since that wiring
 * itself only activates once the gallery/related-fleet markup this
 * produces actually exists in the DOM.
 */
(function () {
  'use strict';

  var fleetReady = false;
  var experiencesReady = false;

  function tryRender() {
    if (!fleetReady) return;
    // Only wait on experiences if this page actually loaded that module —
    // fleet/vehicle.html always does today, but render() must not hang
    // forever on an event that will never fire if that ever changes.
    if (window.IconicExperiences && !experiencesReady) return;
    render();
  }

  document.addEventListener('iconic:fleet-ready', function () { fleetReady = true; tryRender(); });
  document.addEventListener('iconic:experiences-ready', function () { experiencesReady = true; tryRender(); });

  function render() {
  if (!window.IconicFleet || !window.IconicFleetRender || !window.IconicMedia) return;

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');
  var item = slug ? window.IconicFleet.getFleetItem(slug) : null;

  if (!item) {
    window.location.replace('../index.html#fleet');
    return;
  }

  var escapeHtml = window.IconicMedia.escapeHtml;
  var ICONS = window.IconicMedia.icons;

  /* Fleet-detail-specific icons (spec/sidebar meta) — everything shared
     with the Instagram/Experiences sections lives in media-components.js. */
  var ICON_PERSON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21c0-3.9 3.6-7 8-7s8 3.1 8 7"/></svg>';
  var ICON_LENGTH = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICON_BOLT = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>';

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
    { key: 'lifestyle', label: 'Lifestyle' },
    { key: 'drone', label: 'Drone' }
  ];

  /* Contextual placeholder copy: "{label} {suffix} coming soon." instead of
     a generic "Coming Soon" tag repeated on every empty slot — e.g. "Master
     Cabin photography coming soon.", "Flybridge gallery coming soon." One
     suffix per category keeps 15+ placeholder cards from reading like the
     same sentence copy-pasted over and over. */
  var GALLERY_PLACEHOLDER_SUFFIX = {
    exterior: 'gallery',
    interior: 'photography',
    lifestyle: 'moments',
    drone: 'aerial footage'
  };

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

  /* Videos & Tours panel: walkthrough video, Instagram Reels, TikTok, and a
     future 360° tour, flattened into one grid via the shared media
     component (window.IconicMedia.renderVideoGrid) so this exact card
     look/behavior is reused verbatim by the homepage Instagram and
     Experiences sections instead of being reimplemented per page. */
  function renderVideosPanel(vehicle) {
    var videos = vehicle.videos || {};
    var allItems = [].concat(videos.walkthrough || [], videos.reels || [], videos.tiktok || [], videos.tours360 || []);
    var itemsHtml = window.IconicMedia.renderVideoGrid(allItems, { pathPrefix: '../', captionPrefix: vehicle.name });

    return (
      '<div class="fleet-panel" data-panel="videos" id="fdGalPanel-videos" role="tabpanel" aria-labelledby="fdGalTab-videos">' +
        '<div class="fd-gallery">' + itemsHtml + '</div>' +
      '</div>'
    );
  }

  /* Categorized brochure gallery (Exterior / Interior / Lifestyle / Drone /
     Videos & Tours tabs) for yachts that have the new `galleries` field;
     everything else (cars, or any yacht missing it) falls back to the
     original flat gallery. */
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

    /* Videos & Tours rides in the same tab bar as one more entry, but its
       panel renders link-out cards (see renderVideoCard) instead of a photo
       grid — so it's appended here rather than folded into GALLERY_CATEGORIES,
       which drives the contextual-placeholder-by-category-suffix logic that
       only makes sense for photo categories. */
    var allTabs = GALLERY_CATEGORIES.concat([{ key: 'videos', label: 'Videos & Tours' }]);

    var tabsHtml = allTabs.map(function (cat, i) {
      return (
        '<button type="button" class="fleet-tab' + (i === 0 ? ' is-active' : '') + '" data-category="' + cat.key + '" role="tab" aria-selected="' + (i === 0 ? 'true' : 'false') + '" id="fdGalTab-' + cat.key + '" aria-controls="fdGalPanel-' + cat.key + '">' + cat.label + '</button>'
      );
    }).join('');

    var panelsHtml = GALLERY_CATEGORIES.map(function (cat, i) {
      var shots = vehicle.galleries[cat.key] || [];
      var suffix = GALLERY_PLACEHOLDER_SUFFIX[cat.key] || 'gallery';
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
        return window.IconicMedia.renderPlaceholder(shot.label, ICONS.camera, shot.label + ' ' + suffix + ' coming soon.');
      }).join('');

      return (
        '<div class="fleet-panel' + (i === 0 ? ' is-active' : '') + '" data-panel="' + cat.key + '" id="fdGalPanel-' + cat.key + '" role="tabpanel" aria-labelledby="fdGalTab-' + cat.key + '">' +
          '<div class="fd-gallery">' + shotsHtml + '</div>' +
        '</div>'
      );
    }).join('') + renderVideosPanel(vehicle);

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
    return '<li>' + ICONS.check + '<span>' + escapeHtml(a) + '</span></li>';
  }).join('');

  /* What's Included — yachts only; a car detail page has no crew/fuel/dockage
     inclusions to speak of, so the section stays out of the DOM entirely. */
  var includedSection = document.getElementById('fdIncludedSection');
  if (includedSection && item.type === 'yacht') {
    document.getElementById('fdIncludedList').innerHTML = YACHT_INCLUDED.map(function (a) {
      return '<li>' + ICONS.check + '<span>' + escapeHtml(a) + '</span></li>';
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

  /* Recent Experiences — real charter highlights (photos/video + a guest
     review) as they come in, pulled from the single shared
     js/experiences-data.js source (filtered to this yacht) rather than a
     per-yacht array, so there's exactly one data object to edit no matter
     whether a charter is being added here or to the homepage's own
     Luxury Experiences section. Yacht-only, same reasoning as What's
     Included. Empty today for every yacht (none documented yet); the
     empty state says so rather than showing nothing, and the populated
     branch below is what actually renders once entries exist — no further
     code changes needed to go live, only data. */
  var experiencesSection = document.getElementById('fdExperiencesSection');
  if (experiencesSection && item.type === 'yacht' && window.IconicExperiences) {
    experiencesSection.hidden = false;
    var experiences = window.IconicExperiences.getByYacht(item.slug);
    var experiencesGrid = document.getElementById('fdExperiencesGrid');
    var experiencesEmpty = document.getElementById('fdExperiencesEmpty');

    if (experiences.length) {
      experiencesEmpty.hidden = true;
      experiencesGrid.hidden = false;
      experiencesGrid.innerHTML = experiences.map(function (exp) {
        var cover = exp.coverImage;
        var categoryInfo = window.IconicExperiences.getCategory(exp.category);
        var mediaHtml = cover
          ? '<picture>' + (cover.webp ? '<source srcset="../' + cover.webp + '" type="image/webp" />' : '') + '<img src="../' + cover.src + '" alt="' + escapeHtml(cover.alt || exp.title) + '" loading="lazy" /></picture>'
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
          '<article class="fd-experience-card">' +
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
      }).join('');
    } else {
      experiencesGrid.hidden = true;
      experiencesEmpty.hidden = false;
      var emptyText = experiencesEmpty.querySelector('[data-experiences-empty-text]');
      if (emptyText) {
        emptyText.textContent = 'Charter highlights for ' + item.name + ' are on their way — as we photograph and film upcoming trips, real guest moments, video, and reviews will appear here.';
      }
    }
  }

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
  } // end render()
})();
