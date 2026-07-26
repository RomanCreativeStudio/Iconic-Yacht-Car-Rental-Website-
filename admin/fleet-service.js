/**
 * Iconic Rentals — Fleet Manager Data Service
 *
 * Thin wrapper around Supabase CRUD for fleet_items, shared by
 * admin/fleet.js (list view) and admin/fleet-editor.js (editor panel).
 * Mirrors admin/auth-guard.js's pattern: a plain object attached to
 * window, built on the same window.IconicSupabase.getClient() singleton
 * every admin page already uses.
 *
 * This file does not enforce access control — RLS (see
 * supabase/migrations/20260726130100_fleet_items.sql) is the real
 * boundary. A non-admin `staff` session can call every function here
 * exactly like an admin can call it; the ones that write will simply be
 * rejected by the database with a permission error, which callers must
 * already handle (see admin/fleet.js and admin/fleet-editor.js's error
 * banners).
 */
(function (global) {
  'use strict';

  var TABLE = 'fleet_items';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  /**
   * @param {Object} opts
   * @param {string} [opts.search] - matched against name/category/slug
   * @param {string} [opts.type] - 'yacht' | 'car'
   * @param {boolean} [opts.published]
   * @param {boolean} [opts.featured]
   * @param {boolean} [opts.available]
   * @param {string} [opts.sort] - 'name' | 'updated' | 'category' (default: 'category')
   */
  function list(opts) {
    opts = opts || {};
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });

    var query = supabase.from(TABLE).select('*');

    if (opts.type) query = query.eq('type', opts.type);
    if (typeof opts.published === 'boolean') query = query.eq('published', opts.published);
    if (typeof opts.featured === 'boolean') query = query.eq('featured', opts.featured);
    if (typeof opts.available === 'boolean') query = query.eq('available', opts.available);
    if (opts.search) {
      var term = '%' + opts.search.replace(/[%_]/g, '\\$&') + '%';
      query = query.or('name.ilike.' + term + ',category.ilike.' + term + ',slug.ilike.' + term);
    }

    switch (opts.sort) {
      case 'name':
        query = query.order('name', { ascending: true });
        break;
      case 'updated':
        query = query.order('updated_at', { ascending: false });
        break;
      case 'category':
      default:
        query = query.order('category', { ascending: true }).order('sort_order', { ascending: true });
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
    // .select() after delete() so a delete silently blocked by Row Level
    // Security (a signed-in `staff` session, per the admin-only write
    // policy) is distinguishable from a real success: RLS lets the
    // DELETE statement complete with zero rows affected and no thrown
    // error, so `data` coming back empty is the only signal callers have
    // that nothing actually happened.
    return supabase.from(TABLE).delete().eq('id', id).select().then(function (result) {
      if (result.error) return { error: result.error };
      if (!result.data || !result.data.length) {
        return { error: { message: 'Nothing was deleted — you may not have permission, or this vehicle no longer exists.' } };
      }
      return { error: null };
    });
  }

  /**
   * Builds a fresh, unsaved-yet copy of `source` suitable for create():
   * strips id/timestamps, appends "-copy" (then "-copy-2", etc.) to the
   * slug so the unique constraint never collides, and un-publishes the
   * copy so a duplicate never silently goes live.
   */
  function duplicatePayload(source, existingSlugs) {
    var base = source.slug + '-copy';
    var slug = base;
    var n = 2;
    while (existingSlugs.indexOf(slug) !== -1) {
      slug = base + '-' + n;
      n += 1;
    }
    return {
      slug: slug,
      type: source.type,
      name: source.name + ' (Copy)',
      category: source.category,
      tagline: source.tagline,
      description: source.description,
      capacity: source.capacity,
      specs: source.specs || {},
      features: source.features || [],
      amenities: source.amenities || [],
      book_label: null,
      sort_order: source.sort_order,
      featured: false,
      available: source.available,
      starting_price: source.starting_price,
      deposit_amount: source.deposit_amount,
      duration_options: source.duration_options || [],
      published: false
    };
  }

  /** name + category, e.g. "Azure Horizon — Motor Yacht" — matches the
   *  existing FLEET_DATA convention exactly. Derived, not hand-edited, so
   *  it can never drift from the two fields it's built from. */
  function deriveBookLabel(name, category) {
    if (!name || !category) return null;
    return name + ' — ' + category;
  }

  global.IconicFleetService = {
    list: list,
    get: get,
    create: create,
    update: update,
    remove: remove,
    duplicatePayload: duplicatePayload,
    deriveBookLabel: deriveBookLabel
  };
})(window);
