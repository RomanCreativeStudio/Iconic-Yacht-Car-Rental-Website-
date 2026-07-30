/**
 * Iconic Rentals — Experience Manager (list view)
 *
 * Session + role check on load, exactly like admin/fleet.js. Card actions
 * add two quick-toggle buttons beyond Fleet Manager's set (Publish/
 * Unpublish, Archive/Unarchive) since task 2 calls those out as distinct
 * top-level actions, not just fields buried in the editor.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var experiencesView = document.getElementById('experiencesView');
  var signOutBtn = document.getElementById('signOutBtn');
  var searchInput = document.getElementById('expSearch');
  var sortSelect = document.getElementById('expSort');
  var gridEl = document.getElementById('expGrid');
  var emptyEl = document.getElementById('expEmpty');
  var emptyTextEl = document.getElementById('expEmptyText');
  var bannerEl = document.getElementById('expBanner');
  var addBtn = document.getElementById('addExperienceBtn');

  var viewPanel = document.getElementById('expViewPanel');
  var viewEyebrow = document.getElementById('expViewEyebrow');
  var viewTitle = document.getElementById('expViewTitle');
  var viewBody = document.getElementById('expViewBody');
  var viewEditBtn = document.getElementById('expViewEditBtn');

  var filters = { published: '', featured: '', archived: '' };
  var searchDebounceHandle = null;
  var allItems = [];
  var viewingId = null;
  var canWrite = true; // narrowed once the session's role is known (read_only)

  function showBanner(message) { bannerEl.textContent = message; bannerEl.hidden = false; }
  function hideBanner() { bannerEl.hidden = true; bannerEl.textContent = ''; }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function showExperiences() {
    experiencesView.hidden = false;
    signOutBtn.hidden = false;
    loadExperiences();
  }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    addBtn.hidden = !canWrite;
    showExperiences();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function currentQueryOpts() {
    var opts = { sort: sortSelect.value, search: searchInput.value.trim() };
    if (filters.published) opts.published = filters.published === 'true';
    if (filters.featured) opts.featured = filters.featured === 'true';
    if (filters.archived) opts.archived = filters.archived === 'true';
    return opts;
  }

  function loadExperiences() {
    hideBanner();
    gridEl.innerHTML = '<p class="fleet-empty-loading admin-muted">Loading experiences…</p>';
    emptyEl.hidden = true;

    window.IconicExperienceService.list(currentQueryOpts()).then(function (result) {
      if (result.error) {
        gridEl.innerHTML = '';
        showBanner('Couldn’t load experiences: ' + result.error.message);
        return;
      }
      allItems = result.data;
      render(allItems);
    });
  }

  function badgesMarkup(item) {
    var badges = [];
    if (item.archived) {
      badges.push('<span class="fleet-badge fleet-badge--unavailable">Archived</span>');
    } else {
      badges.push('<span class="fleet-badge ' + (item.published ? 'fleet-badge--published' : 'fleet-badge--draft') + '">' + (item.published ? 'Published' : 'Draft') + '</span>');
    }
    if (item.featured) badges.push('<span class="fleet-badge fleet-badge--featured">Featured</span>');
    return badges.join('');
  }

  function cardMarkup(item) {
    var writeActions = canWrite ? (
      '<button type="button" class="btn btn-ghost" data-action="edit" data-id="' + item.id + '">Edit</button>' +
      '<button type="button" class="btn btn-ghost" data-action="duplicate" data-id="' + item.id + '">Duplicate</button>' +
      '<button type="button" class="btn btn-ghost" data-action="toggle-published" data-id="' + item.id + '">' + (item.published ? 'Unpublish' : 'Publish') + '</button>' +
      '<button type="button" class="btn btn-ghost" data-action="toggle-archived" data-id="' + item.id + '">' + (item.archived ? 'Unarchive' : 'Archive') + '</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + item.id + '">Delete</button>'
    ) : '';

    return (
      '<div class="fleet-card" data-id="' + item.id + '">' +
      '<div class="fleet-card-media"><span class="admin-muted" style="font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;">' + escapeHtml(item.category) + '</span></div>' +
      '<div class="fleet-card-badges">' + badgesMarkup(item) + '</div>' +
      '<div class="fleet-card-body">' +
      '<h4 class="fleet-card-title">' + escapeHtml(item.title) + '</h4>' +
      '<span class="fleet-card-category">' + escapeHtml(item.date_text || 'No date set') + '</span>' +
      '<div class="fleet-card-actions">' +
      '<button type="button" class="btn btn-ghost" data-action="view" data-id="' + item.id + '">View</button>' +
      writeActions +
      '</div></div></div>'
    );
  }

  function render(items) {
    if (!items.length) {
      gridEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyTextEl.textContent = allItems.length === 0 && !hasActiveFilters()
        ? 'No experiences documented yet.'
        : 'No experiences match your search and filters — try clearing one.';
      return;
    }
    emptyEl.hidden = true;
    gridEl.innerHTML = items.map(cardMarkup).join('');
  }

  function hasActiveFilters() {
    return !!(searchInput.value.trim() || filters.published || filters.featured || filters.archived);
  }

  searchInput.addEventListener('input', function () {
    window.clearTimeout(searchDebounceHandle);
    searchDebounceHandle = window.setTimeout(loadExperiences, 300);
  });
  sortSelect.addEventListener('change', loadExperiences);

  document.querySelectorAll('.admin-filter-tab[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.getAttribute('data-filter');
      var value = btn.getAttribute('data-value');
      if (group === 'featured' || group === 'archived') {
        var isActive = btn.classList.contains('is-active');
        btn.classList.toggle('is-active', !isActive);
        filters[group] = isActive ? '' : value;
      } else {
        var siblings = document.querySelectorAll('.admin-filter-tab[data-filter="' + group + '"]');
        siblings.forEach(function (s) { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        filters[group] = value;
      }
      loadExperiences();
    });
  });

  function findItem(id) {
    return allItems.filter(function (i) { return i.id === id; })[0] || null;
  }

  function openView(item) {
    viewingId = item.id;
    viewEyebrow.textContent = item.category;
    viewTitle.textContent = item.title;
    viewBody.innerHTML =
      '<dt>Status</dt><dd>' + (item.archived ? 'Archived' : (item.published ? 'Published' : 'Draft')) + (item.featured ? ' · Featured' : '') + '</dd>' +
      '<dt>Date</dt><dd>' + escapeHtml(item.date_text || '—') + '</dd>' +
      '<dt>Vehicle</dt><dd>' + escapeHtml(item.yacht_slug || '—') + '</dd>' +
      '<dt>Description</dt><dd>' + escapeHtml(item.description || '—') + '</dd>' +
      '<dt>Client Review</dt><dd>' + (item.client_review_quote ? escapeHtml(item.client_review_quote) + ' — ' + escapeHtml(item.client_review_guest_name || 'Anonymous') : '—') + '</dd>' +
      '<dt>Last Updated</dt><dd>' + new Date(item.updated_at).toLocaleString() + '</dd>';
    viewEditBtn.hidden = !canWrite;
    viewPanel.hidden = false;
    requestAnimationFrame(function () { viewPanel.classList.add('is-open'); });
  }
  function closeView() {
    viewPanel.classList.remove('is-open');
    window.setTimeout(function () { viewPanel.hidden = true; viewingId = null; }, 250);
  }
  document.querySelectorAll('[data-view-close]').forEach(function (el) { el.addEventListener('click', closeView); });
  viewEditBtn.addEventListener('click', function () {
    var item = findItem(viewingId);
    closeView();
    if (item) window.IconicExperienceEditor.open('edit', item);
  });

  function quickUpdate(item, patch, successMessage, action) {
    window.IconicExperienceService.update(item.id, patch).then(function (result) {
      if (result.error) {
        window.IconicAdminUI.showToast('Couldn’t update: ' + result.error.message, 'error');
        return;
      }
      if (window.IconicActivityLog) window.IconicActivityLog.log(action, 'experience', item.id, { title: item.title });
      window.IconicAdminUI.showToast(successMessage, 'success');
      loadExperiences();
    });
  }

  // 'edit' mode always calls update(currentId, ...) — a brand-new,
  // never-saved experience has no id to update, so "create blank" reuses
  // 'duplicate' mode instead (currentId stays null, routing to create()),
  // the same trick fleet.js doesn't need only because Fleet Manager has
  // no blank-create flow at all yet.
  addBtn.addEventListener('click', function () {
    window.IconicExperienceEditor.open('duplicate', {
      title: '', category: 'birthday', yacht_slug: null, date_text: null, sort_order: 0,
      description: null, instagram_post_url: null, instagram_reel_url: null,
      client_review_quote: null, client_review_guest_name: null, client_review_rating: null,
      published: false, featured: false, archived: false
    });
  });

  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var item = findItem(btn.getAttribute('data-id'));
    if (!item) return;
    var action = btn.getAttribute('data-action');

    if (action === 'view') {
      openView(item);
    } else if (action === 'edit') {
      window.IconicExperienceEditor.open('edit', item);
    } else if (action === 'duplicate') {
      window.IconicExperienceEditor.open('duplicate', window.IconicExperienceService.duplicatePayload(item));
    } else if (action === 'toggle-published') {
      quickUpdate(item, { published: !item.published }, item.published ? 'Experience unpublished.' : 'Experience published.', item.published ? 'unpublish' : 'publish');
    } else if (action === 'toggle-archived') {
      var patch = { archived: !item.archived };
      if (patch.archived) patch.published = false; // archiving un-publishes, matches experience-editor.js
      quickUpdate(item, patch, item.archived ? 'Experience unarchived.' : 'Experience archived.', item.archived ? 'update' : 'update');
    } else if (action === 'delete') {
      window.IconicAdminUI.confirmDialog({
        title: 'Delete ' + item.title + '?',
        message: 'This permanently removes this experience. This cannot be undone.',
        confirmLabel: 'Delete Experience',
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (!confirmed) return;
        window.IconicExperienceService.remove(item.id).then(function (result) {
          if (result.error) {
            window.IconicAdminUI.showToast('Couldn’t delete: ' + result.error.message, 'error');
            return;
          }
          if (window.IconicActivityLog) window.IconicActivityLog.log('delete', 'experience', item.id, { title: item.title });
          window.IconicAdminUI.showToast(item.title + ' deleted.', 'success');
          loadExperiences();
        });
      });
    }
  });

  document.addEventListener('iconic-admin:experience-saved', loadExperiences);
})();
