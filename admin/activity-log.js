/**
 * Iconic Rentals — Shared Activity Logger
 *
 * One function, called from every admin page's save/delete/publish/login/
 * logout/media-upload/media-delete handlers (task 9). Fire-and-forget on
 * purpose: a logging failure must never block or fail the real action it's
 * describing, so callers don't (and shouldn't) await this — same
 * philosophy as js/booking-api.js's email step after a booking is already
 * saved. RLS (activity_log's "insert own rows only" policy, see
 * supabase/migrations/20260727000000_phase_6_4_cms_extensions.sql) is what
 * actually constrains what gets written, not this file.
 */
(function (global) {
  'use strict';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  /**
   * @param {string} action - 'create'|'update'|'delete'|'publish'|'unpublish'|'login'|'logout'|'media_upload'|'media_delete'
   * @param {string} entity - e.g. 'fleet_item', 'experience', 'media', 'site_content', 'site_settings', 'session'
   * @param {?string} entityId
   * @param {?Object} details - small JSON-serializable context, e.g. { title } or { slug }
   */
  function log(action, entity, entityId, details) {
    var supabase = client();
    if (!supabase) return Promise.resolve();

    return supabase.auth.getSession().then(function (sessionResult) {
      var session = sessionResult.data && sessionResult.data.session;
      if (!session) return null;

      return supabase.from('activity_log').insert({
        user_id: session.user.id,
        user_email: session.user.email,
        action: action,
        entity: entity,
        entity_id: entityId != null ? String(entityId) : null,
        details: details || null
      });
    }).catch(function (err) {
      console.error('Activity log write failed (non-fatal):', err);
    });
  }

  global.IconicActivityLog = { log: log };
})(window);
