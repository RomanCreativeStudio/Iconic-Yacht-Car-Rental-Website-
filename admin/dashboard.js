/**
 * Iconic Rentals — Admin Booking Dashboard
 *
 * Uses the official Supabase JS client (loaded via CDN in admin/index.html)
 * rather than raw fetch, unlike the public site's booking forms — session
 * management (login, token refresh) is genuinely fiddly to hand-roll
 * correctly, and this page is an internal tool, not part of the public
 * site's performance budget.
 *
 * Sign-in itself lives at admin/login.html; this file's job on load is
 * only to confirm the visitor already has a valid session *and* dashboard
 * access (profiles.role is 'admin' or 'staff', per admin/auth-guard.js),
 * redirecting to login.html otherwise. Access control is still ultimately
 * enforced by the database (Row Level Security — see
 * supabase/migrations), not by this file: treat this JS as a convenience
 * UI, not the security boundary.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var dashboardView = document.getElementById('dashboardView');
  var signOutBtn = document.getElementById('signOutBtn');
  var dashboardBanner = document.getElementById('dashboardBanner');
  var tableBody = document.getElementById('inquiriesTableBody');
  var filterTabs = document.querySelectorAll('.admin-filter-tab');
  var refreshBtn = document.getElementById('refreshBtn');
  var detailPanel = document.getElementById('detailPanel');
  var detailTitle = document.getElementById('detailPanelTitle');
  var detailBody = document.getElementById('detailPanelBody');
  var detailStatusSelect = document.getElementById('detailStatusSelect');
  var detailSaveBtn = document.getElementById('detailSaveBtn');

  var currentFilter = 'all';
  var currentRows = [];
  var activeDetailId = null;

  function showBanner(el, message) {
    el.textContent = message;
    el.hidden = false;
  }
  function hideBanner(el) {
    el.hidden = true;
    el.textContent = '';
  }

  function setButtonLoading(btn, isLoading) {
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = btn.dataset.loadingLabel || btn.dataset.originalText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  var canWrite = true; // narrowed once the session's role is known (read_only)

  function showDashboard() {
    dashboardView.hidden = false;
    signOutBtn.hidden = false;
    loadInquiries();
    loadSummary();
    loadRecentActivity();
  }

  /* Every load starts here: no session, or a session without dashboard
     access, goes straight to login.html rather than showing any part of
     the dashboard — including its markup, which stays `hidden` in the
     HTML until this resolves. */
  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    canWrite = result.role === 'admin';
    detailSaveBtn.hidden = !canWrite;
    showDashboard();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () {
      window.location.replace('login.html');
    });
  });

  /* -------------------------------------------------------------------
     Summary cards (task 8, extended Phase 6.9) — Fleet / Experiences /
     Media / Endorsements / Instagram Content / Homepage Sections /
     Pending Bookings / Published / Draft / Storage Usage. Each domain's
     count is its own small, independent query rather than one giant
     join (the underlying tables have no relationships to join on for
     this purpose), but each query result is reused wherever it's needed
     rather than re-fetched — e.g. fleet_items.published is fetched once
     and used for both the Fleet Vehicles count and its contribution to
     the sitewide Published/Draft rollup below.
  ------------------------------------------------------------------- */
  function setSummary(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 MB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Kept in sync by hand with admin/homepage.js's SECTIONS array length —
  // same "no shared constant" tradeoff already made for the category
  // lists duplicated across admin/experience-editor.js and
  // js/experiences-data.js, for a single small array that rarely changes.
  var HOMEPAGE_SECTION_COUNT = 9;

  function loadSummary() {
    var fleetItems = supabase.from('fleet_items').select('published').then(function (r) { return r.data || []; });
    var experiences = supabase.from('experiences').select('published').then(function (r) { return r.data || []; });
    var endorsements = supabase.from('clientele_endorsements').select('approved').then(function (r) { return r.data || []; });
    var instagramPosts = supabase.from('instagram_posts').select('published').then(function (r) { return r.data || []; });
    var instagramReels = supabase.from('instagram_reels').select('published').then(function (r) { return r.data || []; });

    fleetItems.then(function (rows) { setSummary('summaryFleet', rows.length); });
    experiences.then(function (rows) { setSummary('summaryExperiences', rows.length); });
    endorsements.then(function (rows) { setSummary('summaryEndorsements', rows.length); });
    Promise.all([instagramPosts, instagramReels]).then(function (results) {
      setSummary('summaryInstagram', results[0].length + results[1].length);
    });

    Promise.all([
      supabase.from('fleet_media').select('id'),
      supabase.from('experience_media').select('id')
    ]).then(function (results) {
      var total = (results[0].data || []).length + (results[1].data || []).length;
      setSummary('summaryMedia', total);
    });

    supabase.from('site_content').select('section').then(function (r) {
      setSummary('summaryHomepage', (r.data || []).length + ' / ' + HOMEPAGE_SECTION_COUNT);
    });

    supabase.from('booking_requests').select('id').eq('status', 'New').then(function (r) {
      setSummary('summaryPending', (r.data || []).length);
    });

    // Sitewide Published/Draft rollup — every domain with a publish-style
    // gate (fleet_items.published, experiences.published,
    // clientele_endorsements.approved, instagram_posts/reels.published),
    // reusing the same five queries already in flight above rather than
    // fetching any of them twice.
    Promise.all([fleetItems, experiences, endorsements, instagramPosts, instagramReels]).then(function (results) {
      var isLive = [
        function (r) { return r.published; },
        function (r) { return r.published; },
        function (r) { return r.approved; },
        function (r) { return r.published; },
        function (r) { return r.published; }
      ];
      var totalRows = 0;
      var liveRows = 0;
      results.forEach(function (rows, i) {
        totalRows += rows.length;
        liveRows += rows.filter(isLive[i]).length;
      });
      setSummary('summaryPublished', liveRows);
      setSummary('summaryDraft', totalRows - liveRows);
    });

    supabase.rpc('get_storage_usage').then(function (r) {
      if (r.error) { setSummary('summaryStorage', '—'); return; }
      var total = (r.data || []).reduce(function (sum, row) { return sum + Number(row.bytes || 0); }, 0);
      setSummary('summaryStorage', formatBytes(total));
    });
  }

  /* -------------------------------------------------------------------
     Recent Activity (task 9) — plain table, admin-only per activity_log's
     RLS (a non-admin session's select simply returns zero rows, which
     renders as the same empty state as "nothing logged yet").
  ------------------------------------------------------------------- */
  function loadRecentActivity() {
    var body = document.getElementById('activityTableBody');
    if (!body) return;
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(25).then(function (result) {
      if (result.error || !result.data || !result.data.length) {
        body.innerHTML = '<tr><td colspan="5" class="admin-table-empty">No activity recorded yet.</td></tr>';
        return;
      }
      body.innerHTML = result.data.map(function (row) {
        return (
          '<tr>' +
          '<td>' + formatDateTime(row.created_at) + '</td>' +
          '<td>' + escapeHtml(row.user_email || '—') + '</td>' +
          '<td>' + escapeHtml(row.action) + '</td>' +
          '<td>' + escapeHtml(row.entity) + (row.entity_id ? ' <span class="admin-muted">(' + escapeHtml(String(row.entity_id).slice(0, 8)) + ')</span>' : '') + '</td>' +
          '<td>' + escapeHtml(row.details ? JSON.stringify(row.details) : '—') + '</td>' +
          '</tr>'
        );
      }).join('');
    });
  }

  function statusBadgeClass(status) {
    return 'admin-badge admin-badge--' + status.toLowerCase();
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">No inquiries' + (currentFilter !== 'all' ? ' with status "' + currentFilter + '"' : '') + ' yet.</td></tr>';
      return;
    }

    tableBody.innerHTML = rows.map(function (row) {
      return (
        '<tr data-id="' + row.id + '" tabindex="0" class="admin-row">' +
        '<td>' + formatDateTime(row.created_at) + '</td>' +
        '<td>' + escapeHtml(row.name) + '</td>' +
        '<td><a href="tel:' + escapeHtml(row.phone) + '" onclick="event.stopPropagation()">' + escapeHtml(row.phone) + '</a><br><a href="mailto:' + escapeHtml(row.email) + '" onclick="event.stopPropagation()">' + escapeHtml(row.email) + '</a></td>' +
        '<td>' + escapeHtml(row.rental_type) + (row.fleet_item ? '<br><span class="admin-muted">' + escapeHtml(row.fleet_item) + '</span>' : '') + '</td>' +
        '<td>' + escapeHtml(row.date || '—') + '</td>' +
        '<td><span class="' + statusBadgeClass(row.status) + '">' + escapeHtml(row.status) + '</span></td>' +
        '<td><button type="button" class="btn btn-ghost admin-view-btn" data-id="' + row.id + '">View</button></td>' +
        '</tr>'
      );
    }).join('');
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadInquiries() {
    tableBody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">Loading inquiries…</td></tr>';
    hideBanner(dashboardBanner);

    var query = supabase.from('booking_requests').select('*').order('created_at', { ascending: false });
    if (currentFilter !== 'all') {
      query = query.eq('status', currentFilter);
    }

    query.then(function (result) {
      if (result.error) {
        tableBody.innerHTML = '<tr><td colspan="7" class="admin-table-empty">Couldn’t load inquiries.</td></tr>';
        showBanner(dashboardBanner, 'Error loading inquiries: ' + result.error.message);
        return;
      }
      currentRows = result.data || [];
      renderTable(currentRows);
    });
  }

  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.getAttribute('data-status');
      loadInquiries();
    });
  });

  refreshBtn.addEventListener('click', loadInquiries);

  function openDetail(id) {
    var row = currentRows.filter(function (r) { return r.id === id; })[0];
    if (!row) return;
    activeDetailId = id;

    detailTitle.textContent = row.name;
    detailBody.innerHTML =
      '<dt>Email</dt><dd><a href="mailto:' + escapeHtml(row.email) + '">' + escapeHtml(row.email) + '</a></dd>' +
      '<dt>Phone</dt><dd><a href="tel:' + escapeHtml(row.phone) + '">' + escapeHtml(row.phone) + '</a></dd>' +
      '<dt>Rental Type</dt><dd>' + escapeHtml(row.rental_type) + '</dd>' +
      '<dt>Fleet Selection</dt><dd>' + escapeHtml(row.fleet_item || '—') + '</dd>' +
      '<dt>Date</dt><dd>' + escapeHtml(row.date || '—') + '</dd>' +
      '<dt>Time</dt><dd>' + escapeHtml(row.time || '—') + '</dd>' +
      '<dt>Duration</dt><dd>' + escapeHtml(row.duration || '—') + '</dd>' +
      '<dt>Guests</dt><dd>' + escapeHtml(row.guests || '—') + '</dd>' +
      '<dt>Message</dt><dd>' + escapeHtml(row.message || '—') + '</dd>' +
      '<dt>Submitted</dt><dd>' + formatDateTime(row.created_at) + '</dd>' +
      '<dt>Source</dt><dd>' + (row.source === 'quick_form' ? 'Quick Book modal' : 'Full booking form') + '</dd>';

    detailStatusSelect.value = row.status;
    detailPanel.hidden = false;
    requestAnimationFrame(function () {
      detailPanel.classList.add('is-open');
    });
  }

  function closeDetail() {
    detailPanel.classList.remove('is-open');
    window.setTimeout(function () {
      detailPanel.hidden = true;
      activeDetailId = null;
    }, 250);
  }

  tableBody.addEventListener('click', function (e) {
    var viewBtn = e.target.closest('.admin-view-btn');
    var row = e.target.closest('.admin-row');
    var id = viewBtn ? viewBtn.getAttribute('data-id') : (row ? row.getAttribute('data-id') : null);
    if (id) openDetail(id);
  });

  tableBody.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      var row = e.target.closest('.admin-row');
      if (row) {
        e.preventDefault();
        openDetail(row.getAttribute('data-id'));
      }
    }
  });

  document.querySelectorAll('[data-detail-close]').forEach(function (el) {
    el.addEventListener('click', closeDetail);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !detailPanel.hidden) closeDetail();
  });

  detailSaveBtn.addEventListener('click', function () {
    if (!activeDetailId) return;
    setButtonLoading(detailSaveBtn, true);

    supabase
      .from('booking_requests')
      .update({ status: detailStatusSelect.value })
      .eq('id', activeDetailId)
      .then(function (result) {
        setButtonLoading(detailSaveBtn, false);
        if (result.error) {
          showBanner(dashboardBanner, 'Couldn’t update status: ' + result.error.message);
          return;
        }
        if (window.IconicActivityLog) window.IconicActivityLog.log('update', 'booking_request', activeDetailId, { status: detailStatusSelect.value });
        closeDetail();
        loadInquiries();
        loadSummary();
      });
  });
})();
