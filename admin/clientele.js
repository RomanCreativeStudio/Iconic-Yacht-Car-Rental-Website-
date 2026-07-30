/**
 * Iconic Rentals — Clientele Manager (list view)
 *
 * Session + role check on load, exactly like admin/experiences.js. One
 * gate field (approved) rather than published+featured+archived, since
 * that's all clientele_endorsements has — matches the database exactly
 * rather than inventing a second "publish" toggle alongside it.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  window.IconicClienteleService = window.IconicEntityService.createTableService('clientele_endorsements', {
    searchColumns: ['name', 'quote'],
    gateField: 'approved'
  });

  var clienteleView = document.getElementById('clienteleView');
  var signOutBtn = document.getElementById('signOutBtn');
  var searchInput = document.getElementById('clSearch');
  var sortSelect = document.getElementById('clSort');
  var gridEl = document.getElementById('clGrid');
  var emptyEl = document.getElementById('clEmpty');
  var emptyTextEl = document.getElementById('clEmptyText');
  var bannerEl = document.getElementById('clBanner');
  var addBtn = document.getElementById('addEndorsementBtn');

  var gateFilter = ''; // '' | 'true' | 'false'
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

  function showClientele() {
    clienteleView.hidden = false;
    signOutBtn.hidden = false;
    loadEndorsements();
  }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    addBtn.hidden = !canWrite;
    showClientele();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function currentQueryOpts() {
    var opts = { search: searchInput.value.trim() };
    if (gateFilter) opts.gate = gateFilter === 'true';
    if (sortSelect.value === 'name') { opts.sortColumn = 'name'; opts.sortAscending = true; }
    else if (sortSelect.value === 'updated') { opts.sortColumn = 'updated_at'; opts.sortAscending = false; }
    return opts;
  }

  function loadEndorsements() {
    hideBanner();
    gridEl.innerHTML = '<p class="fleet-empty-loading admin-muted">Loading endorsements…</p>';
    emptyEl.hidden = true;

    window.IconicClienteleService.list(currentQueryOpts()).then(function (result) {
      if (result.error) {
        gridEl.innerHTML = '';
        showBanner('Couldn’t load endorsements: ' + result.error.message);
        return;
      }
      allItems = result.data;
      render(allItems);
    });
  }

  function cardMarkup(item) {
    var writeActions = canWrite ? (
      '<button type="button" class="btn btn-ghost" data-action="edit" data-id="' + item.id + '">Edit</button>' +
      '<button type="button" class="btn btn-ghost" data-action="toggle-approved" data-id="' + item.id + '">' + (item.approved ? 'Unapprove' : 'Approve') + '</button>' +
      '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + item.id + '">Delete</button>'
    ) : '';

    return (
      '<div class="fleet-card" data-id="' + item.id + '">' +
      '<div class="fleet-card-badges"><span class="fleet-badge ' + (item.approved ? 'fleet-badge--published' : 'fleet-badge--draft') + '">' + (item.approved ? 'Approved' : 'Unapproved') + '</span></div>' +
      '<div class="fleet-card-body">' +
      '<h4 class="fleet-card-title">' + escapeHtml(item.name) + '</h4>' +
      '<span class="fleet-card-category">' + escapeHtml(item.role || 'No role set') + '</span>' +
      '<p class="admin-muted" style="margin:.5rem 0 0;font-size:.85rem;">“' + escapeHtml((item.quote || '').slice(0, 120)) + (item.quote && item.quote.length > 120 ? '…' : '') + '”</p>' +
      '<div class="fleet-card-actions">' + writeActions + '</div></div></div>'
    );
  }

  function render(items) {
    if (!items.length) {
      gridEl.innerHTML = '';
      emptyEl.hidden = false;
      emptyTextEl.textContent = allItems.length === 0 && !hasActiveFilters()
        ? 'No endorsements added yet.'
        : 'No endorsements match your search and filters — try clearing one.';
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
    searchDebounceHandle = window.setTimeout(loadEndorsements, 300);
  });
  sortSelect.addEventListener('change', loadEndorsements);

  document.querySelectorAll('.admin-filter-tab[data-filter="approved"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var siblings = document.querySelectorAll('.admin-filter-tab[data-filter="approved"]');
      siblings.forEach(function (s) { s.classList.remove('is-active'); s.setAttribute('aria-selected', 'false'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      gateFilter = btn.getAttribute('data-value');
      loadEndorsements();
    });
  });

  function findItem(id) {
    return allItems.filter(function (i) { return i.id === id; })[0] || null;
  }

  addBtn.addEventListener('click', function () {
    window.IconicClienteleEditor.open('create', { name: '', role: null, quote: '', photo: null, logo: null, sort_order: 0, approved: false });
  });

  gridEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var item = findItem(btn.getAttribute('data-id'));
    if (!item) return;
    var action = btn.getAttribute('data-action');

    if (action === 'edit') {
      window.IconicClienteleEditor.open('edit', item);
    } else if (action === 'toggle-approved') {
      window.IconicClienteleService.update(item.id, { approved: !item.approved }).then(function (result) {
        if (result.error) {
          window.IconicAdminUI.showToast('Couldn’t update: ' + result.error.message, 'error');
          return;
        }
        if (window.IconicActivityLog) window.IconicActivityLog.log(item.approved ? 'unpublish' : 'publish', 'clientele_endorsement', item.id, { name: item.name });
        window.IconicAdminUI.showToast(item.approved ? 'Endorsement unapproved.' : 'Endorsement approved.', 'success');
        loadEndorsements();
      });
    } else if (action === 'delete') {
      window.IconicAdminUI.confirmDialog({
        title: 'Delete ' + item.name + '?',
        message: 'This permanently removes this endorsement. This cannot be undone.',
        confirmLabel: 'Delete Endorsement',
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (!confirmed) return;
        window.IconicClienteleService.remove(item.id).then(function (result) {
          if (result.error) {
            window.IconicAdminUI.showToast('Couldn’t delete: ' + result.error.message, 'error');
            return;
          }
          if (window.IconicActivityLog) window.IconicActivityLog.log('delete', 'clientele_endorsement', item.id, { name: item.name });
          window.IconicImageUploadField.removeIfManaged('avatars', item.photo);
          window.IconicImageUploadField.removeIfManaged('logos', item.logo);
          window.IconicAdminUI.showToast(item.name + ' deleted.', 'success');
          loadEndorsements();
        });
      });
    }
  });

  document.addEventListener('iconic-admin:endorsement-saved', loadEndorsements);
})();
