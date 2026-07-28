/**
 * Iconic Rentals — Instagram Manager (list view)
 *
 * One page, two tabs (Posts / Reels) sharing a single toolbar/grid rather
 * than duplicating the whole list UI twice — the two tables share the
 * same shape (published gate, sort_order, caption) closely enough that
 * one render path with a small per-kind config object covers both,
 * mirroring how admin/homepage.js drives nine different site_content
 * sections from one SECTIONS config instead of nine forms.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  window.IconicInstagramPostService = window.IconicEntityService.createTableService('instagram_posts', {
    searchColumns: ['caption', 'permalink'],
    gateField: 'published'
  });
  window.IconicInstagramReelService = window.IconicEntityService.createTableService('instagram_reels', {
    searchColumns: ['caption', 'permalink'],
    gateField: 'published'
  });

  var KINDS = {
    post: {
      label: 'Post', labelPlural: 'Posts', service: function () { return window.IconicInstagramPostService; },
      editor: function () { return window.IconicInstagramPostEditor; }, entity: 'instagram_post',
      savedEvent: 'iconic-admin:instagram-post-saved',
      blank: { media_type: 'IMAGE', media_url: '', media_url_webp: null, permalink: '', caption: null, sort_order: 0, published: false }
    },
    reel: {
      label: 'Reel', labelPlural: 'Reels', service: function () { return window.IconicInstagramReelService; },
      editor: function () { return window.IconicInstagramReelEditor; }, entity: 'instagram_reel',
      savedEvent: 'iconic-admin:instagram-reel-saved',
      blank: { caption: null, permalink: '', thumbnail_url: null, thumbnail_url_webp: null, sort_order: 0, published: false }
    }
  };

  var instagramView = document.getElementById('instagramView');
  var signOutBtn = document.getElementById('signOutBtn');
  var searchInput = document.getElementById('igSearch');
  var sortSelect = document.getElementById('igSort');
  var gridEl = document.getElementById('igGrid');
  var emptyEl = document.getElementById('igEmpty');
  var emptyTextEl = document.getElementById('igEmptyText');
  var bannerEl = document.getElementById('igBanner');
  var addBtn = document.getElementById('addInstagramBtn');

  var activeKind = 'post';
  var gateFilter = '';
  var searchDebounceHandle = null;
  var allItems = [];
  var canWrite = true;

  function showBanner(message) { bannerEl.textContent = message; bannerEl.hidden = false; }
  function hideBanner() { bannerEl.hidden = true; bannerEl.textContent = ''; }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showInstagram() {
    instagramView.hidden = false;
    signOutBtn.hidden = false;
    loadItems();
  }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    addBtn.hidden = !canWrite;
    showInstagram();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function currentQueryOpts() {
    var opts = { search: searchInput.value.trim() };
    if (gateFilter) opts.gate = gateFilter === 'true';
    if (sortSelect.value === 'updated') { opts.sortColumn = 'updated_at'; opts.sortAscending = false; }
    return opts;
  }

  function loadItems() {
    hideBanner();
    gridEl.innerHTML = '<p class="fleet-empty-loading admin-muted">Loading ' + KINDS[activeKind].labelPlural.toLowerCase() + '…</p>';
    emptyEl.hidden = true;
    addBtn.textContent = '+ Add ' + KINDS[activeKind].label;

    KINDS[activeKind].service().list(currentQueryOpts()).then(function (result) {
      if (result.error) {
        gridEl.innerHTML = '';
        showBanner('Couldn’t load ' + KINDS[activeKind].labelPlural.toLowerCase() + ': ' + result.error.message);
        return;
      }
      allItems = result.data;
      render(allItems);
    });
  }

  function cardMarkup(item) {
    var writeActions = canWrite ? (
      '<button type="button" class="btn btn-ghost" data-action="edit" data-id="' + item.id + '">Edit</button>' +
      '<button type="button" class="btn btn-ghost" data-action="toggle-published" data-id="' + item.id + '">' + (item.published ? 'Unpublish' : 'Publish') + '</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + item.id + '">Delete</button>'
    ) : '';

    var subtitle = activeKind === 'post' ? (item.media_type || 'IMAGE') : 'Reel';

    return (
      '<div class="fleet-card" data-id="' + item.id + '">' +
      '<div class="fleet-card-badges"><span class="fleet-badge ' + (item.published ? 'fleet-badge--published' : 'fleet-badge--draft') + '">' + (item.published ? 'Published' : 'Draft') + '</span></div>' +
      '<div class="fleet-card-body">' +
      '<h4 class="fleet-card-title">' + escapeHtml((item.caption || 'No caption').slice(0, 60)) + '</h4>' +
      '<span class="fleet-card-category">' + escapeHtml(subtitle) + '</span>' +
      '<div class="fleet-card-actions">' + writeActions + '</div></div></div>'
    );
  }

  function render(items) {
    if (!items.length) {
      gridEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyTextEl.textContent = allItems.length === 0 && !hasActiveFilters()
        ? 'No ' + KINDS[activeKind].labelPlural.toLowerCase() + ' added yet.'
        : 'No ' + KINDS[activeKind].labelPlural.toLowerCase() + ' match your search and filters — try clearing one.';
      return;
    }
    emptyEl.hidden = true;
    gridEl.innerHTML = items.map(cardMarkup).join('');
  }

  function hasActiveFilters() {
    return !!(searchInput.value.trim() || gateFilter);
  }

  searchInput.addEventListener('input', function () {
    window.clearTimeout(searchDebounceHandle);
    searchDebounceHandle = window.setTimeout(loadItems, 300);
  });
  sortSelect.addEventListener('change', loadItems);

  document.querySelectorAll('.admin-filter-tab[data-filter="published"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var siblings = document.querySelectorAll('.admin-filter-tab[data-filter="published"]');
      siblings.forEach(function (s) { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      gateFilter = btn.getAttribute('data-value');
      loadItems();
    });
  });

  document.querySelectorAll('.admin-filter-tab[data-filter="kind"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var kind = btn.getAttribute('data-value');
      if (kind === activeKind) return;
      var siblings = document.querySelectorAll('.admin-filter-tab[data-filter="kind"]');
      siblings.forEach(function (s) { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      activeKind = kind;
      searchInput.value = '';
      gateFilter = '';
      document.querySelectorAll('.admin-filter-tab[data-filter="published"]').forEach(function (s, i) {
        s.classList.toggle('is-active', i === 0);
        s.setAttribute('aria-selected', i === 0);
      });
      loadItems();
    });
  });

  function findItem(id) {
    return allItems.filter(function (i) { return i.id === id; })[0] || null;
  }

  addBtn.addEventListener('click', function () {
    KINDS[activeKind].editor().open('create', KINDS[activeKind].blank);
  });

  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var item = findItem(btn.getAttribute('data-id'));
    if (!item) return;
    var action = btn.getAttribute('data-action');
    var kind = KINDS[activeKind];

    if (action === 'edit') {
      kind.editor().open('edit', item);
    } else if (action === 'toggle-published') {
      kind.service().update(item.id, { published: !item.published }).then(function (result) {
        if (result.error) {
          window.IconicAdminUI.showToast('Couldn’t update: ' + result.error.message, 'error');
          return;
        }
        if (window.IconicActivityLog) window.IconicActivityLog.log(item.published ? 'unpublish' : 'publish', kind.entity, item.id, { caption: item.caption });
        window.IconicAdminUI.showToast(item.published ? kind.label + ' unpublished.' : kind.label + ' published.', 'success');
        loadItems();
      });
    } else if (action === 'delete') {
      window.IconicAdminUI.confirmDialog({
        title: 'Delete this ' + kind.label.toLowerCase() + '?',
        message: 'This permanently removes this ' + kind.label.toLowerCase() + '. This cannot be undone.',
        confirmLabel: 'Delete ' + kind.label,
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (!confirmed) return;
        kind.service().remove(item.id).then(function (result) {
          if (result.error) {
            window.IconicAdminUI.showToast('Couldn’t delete: ' + result.error.message, 'error');
            return;
          }
          if (window.IconicActivityLog) window.IconicActivityLog.log('delete', kind.entity, item.id, { caption: item.caption });
          window.IconicAdminUI.showToast(kind.label + ' deleted.', 'success');
          loadItems();
        });
      });
    }
  });

  document.addEventListener('iconic-admin:instagram-post-saved', function () { if (activeKind === 'post') loadItems(); });
  document.addEventListener('iconic-admin:instagram-reel-saved', function () { if (activeKind === 'reel') loadItems(); });
})();
