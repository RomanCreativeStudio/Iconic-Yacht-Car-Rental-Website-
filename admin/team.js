/**
 * Iconic Rentals — Team Manager (Phase 6.10)
 *
 * Deliberately admin-only end to end — not "staff/read_only can view,
 * only admin can write" like every other manager. This page lists
 * teammates' email addresses and access levels, which is more sensitive
 * than fleet/experience content; list_team_members() itself is gated by
 * is_admin() (see admin/team-service.js), so a staff/read_only session
 * would get a database error trying to load this page's data at all.
 * Rather than show a broken/erroring table, a non-admin sees the same
 * "Admins Only" screen auth-guard.js already uses for other fatal
 * states, checked right after the normal session/role gate.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var teamView = document.getElementById('teamView');
  var signOutBtn = document.getElementById('signOutBtn');
  var teamBanner = document.getElementById('teamBanner');
  var tableBody = document.getElementById('teamTableBody');

  var currentSession = null;
  var currentRows = [];

  function showBanner(message) { teamBanner.textContent = message; teamBanner.hidden = false; }
  function hideBanner() { teamBanner.hidden = true; teamBanner.textContent = ''; }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function showTeam() {
    teamView.hidden = false;
    signOutBtn.hidden = false;
    loadTeam();
  }

  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session || !auth.hasDashboardAccess(result.role)) {
      window.location.replace('login.html');
      return;
    }
    if (result.role !== 'admin') {
      auth.showFatalError(
        'Admins Only',
        'Team management is limited to admin accounts, since it shows every teammate’s email address and access level. Ask an admin if you need a role changed.'
      );
      return;
    }
    currentSession = result.session;
    showTeam();
  });

  signOutBtn.addEventListener('click', function () {
    if (window.IconicActivityLog) window.IconicActivityLog.log('logout', 'session', null, null);
    supabase.auth.signOut().then(function () { window.location.replace('login.html'); });
  });

  function findRow(id) {
    return currentRows.filter(function (r) { return r.id === id; })[0] || null;
  }

  function roleOptionsMarkup(currentRole) {
    return ['admin', 'staff', 'read_only'].map(function (r) {
      return '<option value="' + r + '"' + (r === currentRole ? ' selected' : '') + '>' + (r === 'read_only' ? 'Read Only' : r.charAt(0).toUpperCase() + r.slice(1)) + '</option>';
    }).join('');
  }

  function rowMarkup(row) {
    var isSelf = currentSession && row.id === currentSession.user.id;
    return (
      '<tr data-id="' + row.id + '">' +
      '<td>' + escapeHtml(row.email) + (isSelf ? ' <span class="admin-muted">(you)</span>' : '') + '</td>' +
      '<td>' + escapeHtml(row.full_name || '—') + '</td>' +
      '<td>' +
        (isSelf
          ? '<span class="admin-muted">' + (row.role === 'read_only' ? 'Read Only' : row.role.charAt(0).toUpperCase() + row.role.slice(1)) + '</span>'
          : '<select class="fleet-sort" data-role-select>' + roleOptionsMarkup(row.role) + '</select>'
        ) +
      '</td>' +
      '<td>' + formatDate(row.created_at) + '</td>' +
      '<td>' +
        (isSelf ? '' :
          '<button type="button" class="btn btn-ghost" data-action="save-role" data-id="' + row.id + '">Save Role</button> ' +
          '<button type="button" class="btn btn-danger" data-action="remove" data-id="' + row.id + '">Remove Access</button>'
        ) +
      '</td>' +
      '</tr>'
    );
  }

  function renderTable(rows) {
    if (!rows.length) {
      tableBody.innerHTML = '<tr><td colspan="5" class="admin-table-empty">No team members found.</td></tr>';
      return;
    }
    tableBody.innerHTML = rows.map(rowMarkup).join('');
  }

  function loadTeam() {
    hideBanner();
    tableBody.innerHTML = '<tr><td colspan="5" class="admin-table-empty">Loading team…</td></tr>';
    window.IconicTeamService.list().then(function (result) {
      if (result.error) {
        tableBody.innerHTML = '<tr><td colspan="5" class="admin-table-empty">Couldn’t load team members.</td></tr>';
        showBanner('Error loading team: ' + result.error.message);
        return;
      }
      currentRows = result.data;
      renderTable(currentRows);
    });
  }

  tableBody.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    var row = findRow(id);
    if (!row) return;
    var action = btn.getAttribute('data-action');

    if (action === 'save-role') {
      var select = tableBody.querySelector('tr[data-id="' + id + '"] [data-role-select]');
      var newRole = select ? select.value : row.role;
      if (newRole === row.role) {
        window.IconicAdminUI.showToast('No change to save.', 'success');
        return;
      }
      window.IconicTeamService.updateRole(id, newRole).then(function (result) {
        if (result.error) {
          window.IconicAdminUI.showToast('Couldn’t update role: ' + result.error.message, 'error');
          return;
        }
        if (window.IconicActivityLog) window.IconicActivityLog.log('update', 'team_member', id, { email: row.email, role: newRole });
        window.IconicAdminUI.showToast(row.email + '’s role is now ' + newRole + '.', 'success');
        loadTeam();
      });
    } else if (action === 'remove') {
      window.IconicAdminUI.confirmDialog({
        title: 'Remove ' + row.email + '’s access?',
        message: 'This immediately revokes their sign-in access to this dashboard. Their login itself isn’t deleted — see CLIENT_SETUP.md if you need to remove the account entirely.',
        confirmLabel: 'Remove Access',
        cancelLabel: 'Cancel'
      }).then(function (confirmed) {
        if (!confirmed) return;
        window.IconicTeamService.remove(id).then(function (result) {
          if (result.error) {
            window.IconicAdminUI.showToast('Couldn’t remove access: ' + result.error.message, 'error');
            return;
          }
          if (window.IconicActivityLog) window.IconicActivityLog.log('delete', 'team_member', id, { email: row.email });
          window.IconicAdminUI.showToast(row.email + '’s access was removed.', 'success');
          loadTeam();
        });
      });
    }
  });
})();
