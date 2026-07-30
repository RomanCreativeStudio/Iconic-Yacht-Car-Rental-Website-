/**
 * Iconic Rentals — Fleet Manager (list view)
 *
 * Session + role check on load, exactly like admin/dashboard.js — see
 * that file's header comment for why the real security boundary is
 * still the database's RLS, not this JS. Everything below this file's
 * auth check is new for Phase 6.2 Part 2.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var ICONS = {
    yacht: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 20c1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0 1.5 1.3 3.5 1.3 5 0"/><path d="M5 16 6 6l12 2-3 8Z"/></svg>',
    car: '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 13.5 5 8h14l2 5.5M3 13.5v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M3 13.5h18"/><circle cx="7" cy="16" r="1.4"/><circle cx="17" cy="16" r="1.4"/></svg>'
  };

  var fleetView = document.getElementById('fleetView');
  var signOutBtn = document.getElementById('signOutBtn');
  var searchInput = document.getElementById('fleetSearch');
  var sortSelect = document.getElementById('fleetSort');
  var availabilityFilterSelect = document.getElementById('fleetAvailabilityFilter');
  var groupsEl = document.getElementById('fleetGroups');
  var emptyEl = document.getElementById('fleetEmpty');
  var emptyTextEl = document.getElementById('fleetEmptyText');
  var bannerEl = document.getElementById('fleetBanner');
  var categoryDatalist = document.getElementById('fleetCategoryOptions');

  var viewPanel = document.getElementById('fleetViewPanel');
  var viewEyebrow = document.getElementById('fleetViewEyebrow');
  var viewTitle = document.getElementById('fleetViewTitle');
  var viewBody = document.getElementById('fleetViewBody');
  var viewEditBtn = document.getElementById('fleetViewEditBtn');

  var filters = { type: '', published: '', featured: '', availabilityStatus: '' };
  var searchDebounceHandle = null;
  var allItems = [];
  var viewingId = null;
  var canWrite = true; // narrowed once the session's role is known (read_only)

  function showBanner(message) {
    bannerEl.textContent = message;
    bannerEl.hidden = false;
  }
  function hideBanner() {
    bannerEl.hidden = true;
    bannerEl.textContent = '';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showDashboard() {
    fleetView.hidden = false;
    signOutBtn.hidden = false;
    loadFleet();
  }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    showDashboard();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () {
      window.location.replace('login.html');
    });
  });

  /* -------------------------------------------------------------------
     Loading + rendering
  ------------------------------------------------------------------- */
  function currentQueryOpts() {
    var opts = { sort: sortSelect.value, search: searchInput.value.trim() };
    if (filters.type) opts.type = filters.type;
    if (filters.published) opts.published = filters.published === 'true';
    if (filters.featured) opts.featured = filters.featured === 'true';
    if (filters.availabilityStatus) opts.availabilityStatus = filters.availabilityStatus;
    return opts;
  }

  availabilityFilterSelect.addEventListener('change', function () {
    filters.availabilityStatus = availabilityFilterSelect.value;
    loadFleet();
  });

  function loadFleet() {
    hideBanner();
    groupsEl.innerHTML = '<p class="fleet-empty-loading admin-muted">Loading fleet…</p>';
    emptyEl.hidden = true;

    window.IconicFleetService.list(currentQueryOpts()).then(function (result) {
      if (result.error) {
        groupsEl.innerHTML = '';
        showBanner('Couldn’t load the fleet: ' + result.error.message);
        return;
      }
      allItems = result.data;
      updateCategoryOptions(allItems);
      render(allItems);
    });
  }

  function updateCategoryOptions(items) {
    var seen = {};
    var html = '';
    items.forEach(function (item) {
      if (item.category && !seen[item.category]) {
        seen[item.category] = true;
        html += '<option value="' + escapeHtml(item.category) + '"></option>';
      }
    });
    categoryDatalist.innerHTML = html;
  }

  function fleetCardMedia(item) {
    var icon = item.type === 'yacht' ? ICONS.yacht : ICONS.car;
    return '<div class="fleet-card-media">' + icon + '</div>';
  }

  var AVAILABILITY_LABELS = { unavailable: 'Unavailable', maintenance: 'Maintenance', reserved: 'Reserved' };

  function badgesMarkup(item) {
    var badges = [];
    badges.push('<span class="fleet-badge ' + (item.published ? 'fleet-badge--published' : 'fleet-badge--draft') + '">' + (item.published ? 'Published' : 'Draft') + '</span>');
    if (item.featured) badges.push('<span class="fleet-badge fleet-badge--featured">Featured</span>');
    if (item.availability_status && item.availability_status !== 'available') {
      badges.push('<span class="fleet-badge fleet-badge--unavailable">' + (AVAILABILITY_LABELS[item.availability_status] || item.availability_status) + '</span>');
    }
    return badges.join('');
  }

  function cardMarkup(item) {
    var writeActions = canWrite ? (
      '<button type="button" class="btn btn-ghost" data-action="edit" data-id="' + item.id + '">Edit</button>' +
      '<button type="button" class="btn btn-ghost" data-action="media" data-id="' + item.id + '">Media</button>' +
      '<button type="button" class="btn btn-ghost" data-action="duplicate" data-id="' + item.id + '">Duplicate</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + item.id + '">Delete</button>'
    ) : '<button type="button" class="btn btn-ghost" data-action="media" data-id="' + item.id + '">Media</button>';

    return (
      '<div class="fleet-card" data-id="' + item.id + '">' +
      fleetCardMedia(item) +
      '<div class="fleet-card-badges">' + badgesMarkup(item) + '</div>' +
      '<div class="fleet-card-body">' +
      '<h4 class="fleet-card-title">' + escapeHtml(item.name) + '</h4>' +
      '<span class="fleet-card-category">' + escapeHtml(item.category) + '</span>' +
      '<div class="fleet-card-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="view" data-id="' + item.id + '">View</button>' +
      writeActions +
      '</div></div></div>'
    );
  }

  function groupMarkup(label, items) {
    return (
      '<div class="fleet-group">' +
      '<h3 class="fleet-group-title">' + label + ' <span class="fleet-group-count">(' + items.length + ')</span></h3>' +
      '<div class="fleet-grid">' + items.map(cardMarkup).join('') + '</div>' +
      '</div>'
    );
  }

  function render(items) {
    if (!items.length) {
      groupsEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyTextEl.textContent = allItems.length === 0 && !hasActiveFilters()
        ? 'The fleet table is empty.'
        : 'No vehicles match your search and filters — try clearing one.';
      return;
    }
    emptyEl.hidden = true;

    var yachts = items.filter(function (i) { return i.type === 'yacht'; });
    var cars = items.filter(function (i) { return i.type === 'car'; });
    var html = '';
    if (yachts.length) html += groupMarkup('Yachts', yachts);
    if (cars.length) html += groupMarkup('Cars', cars);
    groupsEl.innerHTML = html;
  }

  function hasActiveFilters() {
    return !!(searchInput.value.trim() || filters.type || filters.published || filters.featured || filters.available);
  }

  /* -------------------------------------------------------------------
     Toolbar: search / filter chips / sort
  ------------------------------------------------------------------- */
  searchInput.addEventListener('input', function () {
    window.clearTimeout(searchDebounceHandle);
    searchDebounceHandle = window.setTimeout(loadFleet, 300);
  });

  sortSelect.addEventListener('change', loadFleet);

  document.querySelectorAll('.admin-filter-tab[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.getAttribute('data-filter');
      var value = btn.getAttribute('data-value');

      // Featured / Unavailable behave as simple on/off toggles rather
      // than a mutually-exclusive group (there's no "not featured"
      // button to pair with, by design — the absence of the filter
      // already means "any").
      if (group === 'featured' || group === 'available') {
        var isActive = btn.classList.contains('is-active');
        btn.classList.toggle('is-active', !isActive);
        filters[group] = isActive ? '' : value;
      } else {
        var siblings = document.querySelectorAll('.admin-filter-tab[data-filter="' + group + '"]');
        siblings.forEach(function (s) {
          s.classList.remove('is-active');
          s.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        filters[group] = value;
      }
      loadFleet();
    });
  });

  /* -------------------------------------------------------------------
     Card actions: view / edit / duplicate / delete
  ------------------------------------------------------------------- */
  function findItem(id) {
    return allItems.filter(function (i) { return i.id === id; })[0] || null;
  }

  function openView(item) {
    viewingId = item.id;
    viewEyebrow.textContent = item.category;
    viewTitle.textContent = item.name;

    var specsHtml = Object.keys(item.specs || {}).map(function (key) {
      return '<dt>' + escapeHtml(key) + '</dt><dd>' + escapeHtml(item.specs[key]) + '</dd>';
    }).join('');

    var priceDisplay = item.starting_price != null
      ? '$' + Number(item.starting_price).toLocaleString() + (item.pricing_public ? ' (public)' : ' (internal only)')
      : 'Available upon request';

    viewBody.innerHTML =
      '<dt>Status</dt><dd>' + (item.published ? 'Published' : 'Draft') + (item.featured ? ' · Featured' : '') + '</dd>' +
      '<dt>Availability</dt><dd>' + escapeHtml((item.availability_status || 'available').replace(/^\w/, function (c) { return c.toUpperCase(); })) + '</dd>' +
      '<dt>Tagline</dt><dd>' + escapeHtml(item.tagline || '—') + '</dd>' +
      '<dt>Capacity</dt><dd>' + escapeHtml(item.capacity != null ? item.capacity : '—') + '</dd>' +
      '<dt>Starting Price</dt><dd>' + priceDisplay + '</dd>' +
      '<dt>Seasonal Notes</dt><dd>' + escapeHtml(item.seasonal_notes || '—') + '</dd>' +
      '<dt>Description</dt><dd>' + escapeHtml(item.description || '—') + '</dd>' +
      specsHtml +
      '<dt>Amenities</dt><dd>' + (item.amenities && item.amenities.length ? escapeHtml(item.amenities.join(', ')) : '—') + '</dd>' +
      '<dt>Last Updated</dt><dd>' + new Date(item.updated_at).toLocaleString() + '</dd>';

    viewEditBtn.hidden = !canWrite;
    viewPanel.hidden = false;
    requestAnimationFrame(function () { viewPanel.classList.add('is-open'); });
  }

  function closeView() {
    viewPanel.classList.remove('is-open');
    window.setTimeout(function () { viewPanel.hidden = true; viewingId = null; }, 250);
  }

  document.querySelectorAll('[data-view-close]').forEach(function (el) {
    el.addEventListener('click', closeView);
  });

  viewEditBtn.addEventListener('click', function () {
    var item = findItem(viewingId);
    closeView();
    if (item) window.IconicFleetEditor.open('edit', item);
  });

  groupsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var item = findItem(btn.getAttribute('data-id'));
    if (!item) return;

    if (action === 'view') {
      openView(item);
    } else if (action === 'edit') {
      window.IconicFleetEditor.open('edit', item);
    } else if (action === 'media') {
      window.open('media.html?fleetItemId=' + encodeURIComponent(item.id), '_blank');
    } else if (action === 'duplicate') {
      var existingSlugs = allItems.map(function (i) { return i.slug; });
      var payload = window.IconicFleetService.duplicatePayload(item, existingSlugs);
      window.IconicFleetEditor.open('duplicate', payload);
    } else if (action === 'delete') {
      window.IconicAdminUI.confirmDialog({
        title: 'Delete ' + item.name + '?',
        message: 'This permanently removes this vehicle from the fleet. This cannot be undone.',
        confirmLabel: 'Delete Vehicle',
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (!confirmed) return;
        window.IconicFleetService.remove(item.id).then(function (result) {
          if (result.error) {
            window.IconicAdminUI.showToast('Couldn’t delete: ' + result.error.message, 'error');
            return;
          }
          if (window.IconicActivityLog) window.IconicActivityLog.log('delete', 'fleet_item', item.id, { slug: item.slug });
          window.IconicAdminUI.showToast(item.name + ' deleted.', 'success');
          loadFleet();
        });
      });
    }
  });

  document.addEventListener('iconic-admin:fleet-saved', loadFleet);
})();
