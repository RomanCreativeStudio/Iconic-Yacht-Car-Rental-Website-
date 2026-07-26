/**
 * Iconic Rentals — Experience Manager Data Service
 *
 * Thin wrapper around Supabase CRUD for `experiences`, shared by
 * admin/experiences.js (list view) and admin/experience-editor.js (editor
 * panel) — mirrors admin/fleet-service.js's pattern exactly, including its
 * "this file does not enforce access control, RLS does" note (see
 * supabase/migrations/20260726130300_experiences.sql).
 */
(function (global) {
  'use strict';

  var TABLE = 'experiences';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  /**
   * @param {Object} opts
   * @param {string} [opts.search] - matched against title/category
   * @param {string} [opts.category]
   * @param {boolean} [opts.published]
   * @param {boolean} [opts.featured]
   * @param {boolean} [opts.archived]
   * @param {string} [opts.sort] - 'title' | 'updated' | 'sort_order' (default)
   */
  function list(opts) {
    opts = opts || {};
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });

    var query = supabase.from(TABLE).select('*');

    if (opts.category) query = query.eq('category', opts.category);
    if (typeof opts.published === 'boolean') query = query.eq('published', opts.published);
    if (typeof opts.featured === 'boolean') query = query.eq('featured', opts.featured);
    if (typeof opts.archived === 'boolean') query = query.eq('archived', opts.archived);
    if (opts.search) {
      var term = '%' + opts.search.replace(/[%_]/g, '\\$&') + '%';
      query = query.or('title.ilike.' + term + ',category.ilike.' + term);
    }

    switch (opts.sort) {
      case 'title':
        query = query.order('title', { ascending: true });
        break;
      case 'updated':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'sort_order':
      default:
        query = query.order('sort_order', { ascending: true }).order('title', { ascending: true });
        break;
    }

    return query.then(function (result) {
      return { data: result.data || [], error: result.error || null };
    });
  }

  function get(id) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
    return supabase.from(TABLE).select('*').eq('id', id).maybeSingle().then(function (result) {
      return { data: result.data || null, error: result.error || null };
    });
  }

  function create(payload) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
    return supabase.from(TABLE).insert(payload).select().maybeSingle().then(function (result) {
      return { data: result.data || null, error: result.error || null };
    });
  }

  function update(id, payload) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
    return supabase.from(TABLE).update(payload).eq('id', id).select().maybeSingle().then(function (result) {
      return { data: result.data || null, error: result.error || null };
    });
  }

  function remove(id) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ error: { message: 'Not connected.' } });
    // See fleet-service.js's remove() for why .select() after .delete()
    // matters: it's the only way to tell an RLS-blocked delete (0 rows
    // affected, no thrown error) apart from a real success.
    return supabase.from(TABLE).delete().eq('id', id).select().then(function (result) {
      if (result.error) return { error: result.error };
      if (!result.data || !result.data.length) {
        return { error: { message: 'Nothing was deleted — you may not have permission, or this experience no longer exists.' } };
      }
      return { error: null };
    });
  }

  /**
   * Builds a fresh, unsaved-yet copy of `source` suitable for create():
   * unlike fleet_items, experiences have no unique slug to dodge — just a
   * title, so "(Copy)" is enough. Un-published and un-featured so a
   * duplicate never silently goes live or jumps the queue.
   */
  function duplicatePayload(source) {
    return {
      title: source.title + ' (Copy)',
      category: source.category,
      date_text: source.date_text,
      yacht_slug: source.yacht_slug,
      description: source.description,
      instagram_post_url: source.instagram_post_url,
      instagram_reel_url: source.instagram_reel_url,
      client_review_quote: source.client_review_quote,
      client_review_guest_name: source.client_review_guest_name,
      client_review_rating: source.client_review_rating,
      featured: false,
      published: false,
      archived: false,
      sort_order: source.sort_order
    };
  }

  global.IconicExperienceService = {
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
    duplicatePayload: duplicatePayload
  };
})(window);
