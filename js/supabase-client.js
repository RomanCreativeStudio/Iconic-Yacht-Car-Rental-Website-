/**
 * Iconic Rentals — Shared Supabase Client
 *
 * Foundation module added in Phase 6.0. Not loaded by any page yet — this
 * is scaffolding for future phases that move fleet-data.js,
 * experiences-data.js, instagram-data.js, and clientele-data.js from
 * static arrays to real Supabase tables (see supabase/SCHEMA_PROPOSAL.md).
 * Adding it now, ahead of any page wiring it in, means those later phases
 * are "swap a data source," not "invent a client setup."
 *
 * Deliberately mirrors admin/dashboard.js's existing pattern rather than
 * introducing a second way of doing the same thing: reads
 * window.IconicBookingConfig (already documented in CLIENT_SETUP.md,
 * "Environment Variables") and the same vendored js/vendor/supabase-js.min.js
 * UMD build the admin dashboard already loads. A page that wants a
 * Supabase client in the future needs only:
 *
 *   <script src="js/vendor/supabase-js.min.js"></script>
 *   <script src="js/booking-config.js"></script>
 *   <script src="js/supabase-client.js"></script>
 *
 * and then window.IconicSupabase.getClient().
 */
(function (global) {
  'use strict';

  var cachedClient = null;

  function getConfig() {
    return global.IconicBookingConfig || null;
  }

  function isConfigured() {
    var cfg = getConfig();
    return !!(
      cfg &&
      cfg.SUPABASE_URL &&
      cfg.SUPABASE_ANON_KEY &&
      cfg.SUPABASE_URL.indexOf('YOUR-PROJECT-REF') === -1 &&
      cfg.SUPABASE_ANON_KEY.indexOf('YOUR-SUPABASE-ANON-KEY') === -1
    );
  }

  /**
   * Returns a shared Supabase client instance, creating it once and
   * reusing it on subsequent calls (the official client manages its own
   * auth/session state, so a page should not construct more than one).
   * Returns null if the vendor script hasn't loaded or the site isn't
   * configured yet, so callers can fail gracefully the same way
   * js/booking-api.js already does for the REST-based booking flow.
   */
  function getClient() {
    if (cachedClient) return cachedClient;

    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      console.error('IconicSupabase: js/vendor/supabase-js.min.js is not loaded on this page.');
      return null;
    }

    if (!isConfigured()) {
      console.error('IconicSupabase: js/booking-config.js has not been filled in with real project values yet.');
      return null;
    }

    var cfg = getConfig();
    cachedClient = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return cachedClient;
  }

  global.IconicSupabase = {
    isConfigured: isConfigured,
    getClient: getClient
  };
})(window);
