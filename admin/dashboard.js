/**
 * Iconic Rentals — Admin Booking Dashboard
 *
 * Uses the official Supabase JS client (loaded via CDN in admin/index.html)
 * rather than raw fetch, unlike the public site's booking forms — session
 * management (login, token refresh) is genuinely fiddly to hand-roll
 * correctly, and this page is an internal tool, not part of the public
 * site's performance budget.
 *
 * Access control is enforced by the database (see supabase/schema.sql RLS
 * policies: "authenticated" role can SELECT/UPDATE, "anon" cannot), not by
 * this file — treat this JS as a convenience UI, not the security boundary.
 */
(function () {
  'use strict';

  var cfg = window.IconicBookingConfig;
  var configured = !!(
    cfg &&
    cfg.SUPABASE_URL &&
    cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1 &&
    cfg.SUPABASE_ANON_KEY.indexOf('YOUR-SUPABASE-ANON-KEY') === -1
  );

  var loginView = document.getElementById('loginView');
  var dashboardView = document.getElementById('dashboardView');
  var loginForm = document.getElementById('loginForm');
  var loginBanner = document.getElementById('loginBanner');
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

  function showFatalError(title, message) {
    document.body.innerHTML =
      '<main style="display:block;max-width:520px;margin:15vh auto;padding:2rem;text-align:center;font-family:sans-serif;color:#eee;">' +
      '<h1 style="font-family:serif;">' + title + '</h1>' +
      '<p>' + message + '</p>' +
      '</main>';
  }

  if (!configured) {
    showFatalError(
      'Not Configured Yet',
      'This admin dashboard needs your Supabase project URL and anon key in <code>js/booking-config.js</code> before it can sign in or load inquiries. See CLIENT_SETUP.md, "Environment Variables".'
    );
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    showFatalError(
      'Couldn’t Load the Dashboard',
      'A required script (js/vendor/supabase-js.min.js) failed to load. Try refreshing the page — if this keeps happening, check that the file exists and your connection is stable.'
    );
    return;
  }

  // @ts-ignore -- global from the self-hosted Supabase UMD bundle
  var supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    signOutBtn.hidden = false;
    loadInquiries();
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
    signOutBtn.hidden = true;
  }

  /* Restore an existing session on reload, so staff aren't logged out every visit */
  supabase.auth.getSession().then(function (result) {
    if (result.data && result.data.session) {
      showDashboard();
    } else {
      showLogin();
    }
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideBanner(loginBanner);
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    supabase.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) {
          showBanner(loginBanner, 'Incorrect email or password. Contact your administrator if you need access.');
          return;
        }
        loginForm.reset();
        showDashboard();
      })
      .catch(function () {
        showBanner(loginBanner, 'Couldn’t reach the sign-in service. Check your connection and try again.');
      })
      .then(function () {
        setButtonLoading(submitBtn, false);
      });
  });

  signOutBtn.addEventListener('click', function () {
    supabase.auth.signOut().then(showLogin);
  });

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
        closeDetail();
        loadInquiries();
      });
  });
})();
