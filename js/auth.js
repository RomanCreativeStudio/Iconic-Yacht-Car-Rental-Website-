/**
 * Iconic Rentals — Customer Auth Utilities
 *
 * Shared by js/signup.js, js/login.js, js/account.js, and every public
 * page's nav (auto-runs on DOMContentLoaded, same self-contained pattern
 * as js/analytics.js — including this file is enough, no separate init
 * call needed). Mirrors admin/auth-guard.js's shape (a shared utility
 * object on window, fail closed on any error) for the customer-facing
 * side of Supabase Auth — kept as a separate file rather than extending
 * auth-guard.js, since the two serve different jobs: auth-guard.js gates
 * the admin dashboard by role (admin/staff/read_only); this file has no
 * role gating at all — any signed-in user, regardless of role, counts as
 * "logged in" as far as the public site and account.html are concerned.
 *
 * All redirects use root-relative absolute paths (`/login.html`, not
 * `login.html`) so this file behaves identically whether it's loaded
 * from a root page (index.html, account.html) or a subfolder page
 * (fleet/vehicle.html) — this site is deployed at the domain root (see
 * netlify.toml, sitemap.xml), so absolute paths are always correct.
 */
(function (global) {
  'use strict';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  /** Resolves to the current Supabase Auth user, or null if signed out
   *  or the client isn't available/configured. */
  function getCurrentUser() {
    var supabase = client();
    if (!supabase) return Promise.resolve(null);
    return supabase.auth.getUser().then(function (result) {
      return (result.data && result.data.user) || null;
    }).catch(function () {
      return null;
    });
  }

  /** Resolves to the signed-in user's profiles row ({id, role, full_name})
   *  or null if signed out, no matching row, or the lookup failed — fails
   *  closed, same as admin/auth-guard.js's getSessionAndRole(). */
  function getProfile() {
    var supabase = client();
    if (!supabase) return Promise.resolve(null);
    return getCurrentUser().then(function (user) {
      if (!user) return null;
      return supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .maybeSingle()
        .then(function (result) {
          return (!result.error && result.data) ? result.data : null;
        })
        .catch(function () {
          return null;
        });
    });
  }

  /** Call at the top of a customer-only page (account.html). Redirects to
   *  /login.html if nobody's signed in; otherwise resolves to the signed-in
   *  user, so the caller doesn't need a second getCurrentUser() lookup. */
  function requireAuth() {
    return getCurrentUser().then(function (user) {
      if (!user) {
        global.location.replace('/login.html');
        return null;
      }
      return user;
    });
  }

  function logout() {
    var supabase = client();
    if (!supabase) {
      global.location.href = '/index.html';
      return Promise.resolve();
    }
    return supabase.auth.signOut().then(function () {
      global.location.href = '/index.html';
    });
  }

  /**
   * Toggles the public nav between guest state (Sign In / Sign Up) and
   * signed-in state (Account / Logout) — see index.html/fleet/vehicle.html
   * for the matching markup: any element with data-auth-state="guest" or
   * data-auth-state="user" gets shown/hidden based on session state, and
   * any element with data-logout-link becomes a working sign-out control.
   * Path-agnostic on purpose: hrefs live in each page's own markup (so
   * index.html can use "login.html" while fleet/vehicle.html uses
   * "../login.html"), this function only ever toggles `hidden`.
   */
  function initNavAuthState() {
    var guestEls = document.querySelectorAll('[data-auth-state="guest"]');
    var userEls = document.querySelectorAll('[data-auth-state="user"]');
    if (!guestEls.length && !userEls.length) return;

    getCurrentUser().then(function (user) {
      var isSignedIn = !!user;
      guestEls.forEach(function (el) { el.hidden = isSignedIn; });
      userEls.forEach(function (el) { el.hidden = !isSignedIn; });
    });

    document.querySelectorAll('[data-logout-link]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        logout();
      });
    });
  }

  // These auth pages don't load js/main.js (a large file mostly built
  // for the homepage's own sections) just for this one line — same
  // footer-year behavior main.js already provides on index.html and
  // fleet/vehicle.html, kept here instead of a CSP-violating inline
  // <script> (Phase 7.2's script-src has no 'unsafe-inline').
  function setFooterYear() {
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  global.IconicAuth = {
    getCurrentUser: getCurrentUser,
    getProfile: getProfile,
    requireAuth: requireAuth,
    logout: logout
  };

  document.addEventListener('DOMContentLoaded', function () {
    initNavAuthState();
    setFooterYear();
  });
})(window);
