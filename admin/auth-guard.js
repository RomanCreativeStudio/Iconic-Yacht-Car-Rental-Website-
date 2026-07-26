/**
 * Iconic Rentals — Admin Auth Guard
 *
 * Shared by admin/login.html and admin/index.html so the "is this person
 * allowed in here" check is written once. Session state itself is
 * Supabase Auth's job (js/supabase-client.js's client persists it in
 * localStorage by default — "remember me" is the library default, not
 * something this file configures); this file only adds the role check on
 * top: a valid session alone isn't enough, `profiles.role` must also be
 * 'admin' or 'staff' (see supabase/migrations/20260726130000_profiles_
 * and_roles.sql).
 *
 * Like dashboard.js already said before this phase: the real security
 * boundary is the database's Row Level Security, not this JS — a role
 * check here only controls what the dashboard *shows*, not what the API
 * will actually accept. Deny-by-default: any error while checking the
 * session or the profile is treated as "no access," never as "let them
 * through."
 */
(function (global) {
  'use strict';

  var ALLOWED_ROLES = ['admin', 'staff'];

  function showFatalError(title, message) {
    document.body.innerHTML =
      '<main style="display:block;max-width:520px;margin:15vh auto;padding:2rem;text-align:center;font-family:sans-serif;color:#eee;">' +
      '<h1 style="font-family:serif;">' + title + '</h1>' +
      '<p>' + message + '</p>' +
      '</main>';
  }

  /**
   * Confirms js/booking-config.js has real values and the vendored
   * Supabase script loaded, rendering the same fatal-error page this
   * dashboard has always shown for either problem. Returns a ready
   * client, or null (having already rendered the error) if not.
   */
  function requireClient() {
    var cfg = global.IconicBookingConfig;
    var configured = !!(
      cfg &&
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1 &&
      cfg.SUPABASE_ANON_KEY.indexOf('YOUR-SUPABASE-ANON-KEY') === -1
    );

    if (!configured) {
      showFatalError(
        'Not Configured Yet',
        'This admin dashboard needs your Supabase project URL and anon key in <code>js/booking-config.js</code> before it can sign in. See CLIENT_SETUP.md, "Environment Variables".'
      );
      return null;
    }

    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      showFatalError(
        'Couldn’t Load the Dashboard',
        'A required script (js/vendor/supabase-js.min.js) failed to load. Try refreshing the page — if this keeps happening, check that the file exists and your connection is stable.'
      );
      return null;
    }

    return global.IconicSupabase.getClient();
  }

  /**
   * Resolves to { session, role }. `session` is null when signed out.
   * `role` is null when signed in but with no matching profiles row (or
   * the lookup failed) — hasDashboardAccess(null) is false, so that
   * fails closed rather than silently granting access.
   */
  function getSessionAndRole(supabase) {
    return supabase.auth.getSession().then(function (result) {
      var session = (result.data && result.data.session) || null;
      if (!session) return { session: null, role: null };

      return supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(function (profileResult) {
          var role = (!profileResult.error && profileResult.data) ? profileResult.data.role : null;
          return { session: session, role: role };
        })
        .catch(function () {
          return { session: session, role: null };
        });
    });
  }

  function hasDashboardAccess(role) {
    return ALLOWED_ROLES.indexOf(role) !== -1;
  }

  global.IconicAdminAuth = {
    showFatalError: showFatalError,
    requireClient: requireClient,
    getSessionAndRole: getSessionAndRole,
    hasDashboardAccess: hasDashboardAccess
  };
})(window);
