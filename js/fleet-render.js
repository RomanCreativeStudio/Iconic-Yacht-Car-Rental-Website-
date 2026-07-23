/**
 * Renders fleet-card markup from js/fleet-data.js.
 * Shared between the homepage fleet grid and the fleet detail
 * template's "Related Fleet" section — same markup, same classes,
 * one place to update the card layout.
 */
(function (global) {
  'use strict';

  var ICONS = {
    person: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21c0-3.9 3.6-7 8-7s8 3.1 8 7"/></svg>',
    length: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    bolt: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>',
    placeholderYacht: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 20c1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0"/><path d="M5 16 6 6l12 2-3 8Z"/></svg>',
    placeholderCar: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 13.5 5 8h14l2 5.5M3 13.5v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M3 13.5h18"/><circle cx="7" cy="16" r="1.4"/><circle cx="17" cy="16" r="1.4"/></svg>'
  };

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mediaMarkup(item) {
    if (item.cardImage) {
      return (
        '<picture>' +
        (item.cardImageWebp ? '<source srcset="' + item.cardImageWebp + '" type="image/webp" />' : '') +
        '<img src="' + item.cardImage + '" alt="' + escapeHtml(item.name) + ' — ' + escapeHtml(item.category) + '" loading="lazy" /></picture>'
      );
    }
    var icon = item.type === 'yacht' ? ICONS.placeholderYacht : ICONS.placeholderCar;
    return (
      '<div class="fleet-placeholder">' + icon + '<span>Image Coming Soon</span></div>'
    );
  }

  function metaMarkup(item) {
    if (item.type === 'yacht') {
      return (
        '<span>' + ICONS.person + item.capacity + ' Guests</span>' +
        '<span>' + ICONS.length + item.length + '</span>'
      );
    }
    return (
      '<span>' + ICONS.bolt + item.hp + '</span>' +
      '<span>' + ICONS.person + item.seats + ' Seats</span>'
    );
  }

  function featuresMarkup(item) {
    if (!item.features || !item.features.length) return '';
    return (
      '<div class="fleet-card-features">' +
      item.features.map(function (f) { return '<span>' + escapeHtml(f) + '</span>'; }).join('') +
      '</div>'
    );
  }

  function fleetCardHtml(item) {
    var bookAttr = item.type === 'yacht' ? 'data-book-yacht' : 'data-book-car';
    return (
      '<article class="fleet-card">' +
      '<div class="fleet-card-media">' +
      mediaMarkup(item) +
      '<span class="fleet-card-category">' + escapeHtml(item.category) + '</span>' +
      '</div>' +
      '<div class="fleet-card-body">' +
      '<h3>' + escapeHtml(item.name) + '</h3>' +
      '<div class="fleet-card-meta">' + metaMarkup(item) + '</div>' +
      featuresMarkup(item) +
      '<div class="fleet-card-footer">' +
      '<a class="btn btn-ghost" href="/fleet/vehicle.html?slug=' + encodeURIComponent(item.slug) + '">View Details</a>' +
      '<button class="btn btn-primary" ' + bookAttr + '="' + escapeHtml(item.bookLabel) + '">Book Now</button>' +
      '</div>' +
      '</div>' +
      '</article>'
    );
  }

  function renderFleetGrid(container, items) {
    if (!container) return;
    container.innerHTML = items.map(fleetCardHtml).join('');
  }

  global.IconicFleetRender = {
    fleetCardHtml: fleetCardHtml,
    renderFleetGrid: renderFleetGrid
  };
})(window);
