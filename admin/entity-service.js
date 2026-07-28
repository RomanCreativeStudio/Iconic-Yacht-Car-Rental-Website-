/**
 * Iconic Rentals — Generic Admin Entity Service (Phase 6.7)
 *
 * `clientele_endorsements`, `instagram_posts`, and `instagram_reels` all
 * share the exact same CRUD shape as admin/fleet-service.js and
 * admin/experience-service.js's own list/get/create/update/remove
 * pattern — search, one boolean gate field, sort_order — so rather than
 * write three near-identical service files, this factory produces one
 * per table. Same "this file does not enforce access control, RLS does"
 * note applies here as it does in every other *-service.js.
 *
 * @param {string} table
 * @param {Object} opts
 * @param {string[]} [opts.searchColumns] - text columns matched via ilike
 *   when list({ search }) is passed. Omit for tables with nothing worth
 *   searching.
 * @param {string} [opts.gateField] - the one boolean "is this publicly
 *   visible" column, e.g. 'approved' or 'published'. Passed to
 *   list({ gate: true|false }) as an .eq() filter.
 */
(function (global) {
  'use strict';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  function createTableService(table, opts) {
    opts = opts || {};
    var searchColumns = opts.searchColumns || [];
    var gateField = opts.gateField || null;

    /**
     * @param {Object} [queryOpts]
     * @param {string} [queryOpts.search]
     * @param {boolean} [queryOpts.gate] - filters on gateField when set
     * @param {string} [queryOpts.sortColumn] - defaults to 'sort_order'
     * @param {boolean} [queryOpts.sortAscending] - defaults to true
     */
    function list(queryOpts) {
      queryOpts = queryOpts || {};
      var supabase = client();
      if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });

      var query = supabase.from(table).select('*');

      if (gateField && typeof queryOpts.gate === 'boolean') {
        query = query.eq(gateField, queryOpts.gate);
      }
      if (queryOpts.search && searchColumns.length) {
        var term = '%' + queryOpts.search.replace(/[%_]/g, '\\$&') + '%';
        query = query.or(searchColumns.map(function (col) { return col + '.ilike.' + term; }).join(','));
      }

      var sortColumn = queryOpts.sortColumn || 'sort_order';
      var sortAscending = queryOpts.sortAscending !== false;
      query = query.order(sortColumn, { ascending: sortAscending });
      if (sortColumn !== 'sort_order') query = query.order('sort_order', { ascending: true });

      return query.then(function (result) {
        return { data: result.data || [], error: result.error || null };
      });
    }

    function get(id) {
      var supabase = client();
      if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
      return supabase.from(table).select('*').eq('id', id).maybeSingle().then(function (result) {
        return { data: result.data || null, error: result.error || null };
      });
    }

    function create(payload) {
      var supabase = client();
      if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
      return supabase.from(table).insert(payload).select().maybeSingle().then(function (result) {
        return { data: result.data || null, error: result.error || null };
      });
    }

    function update(id, payload) {
      var supabase = client();
      if (!supabase) return Promise.resolve({ data: null, error: { message: 'Not connected.' } });
      return supabase.from(table).update(payload).eq('id', id).select().maybeSingle().then(function (result) {
        return { data: result.data || null, error: result.error || null };
      });
    }

    function remove(id) {
      var supabase = client();
      if (!supabase) return Promise.resolve({ error: { message: 'Not connected.' } });
      // .select() after .delete() is the only way to tell an RLS-blocked
      // delete (0 rows affected, no thrown error) apart from a real
      // success — same reasoning as fleet-service.js's remove().
      return supabase.from(table).delete().eq('id', id).select().then(function (result) {
        if (result.error) return { error: result.error };
        if (!result.data || !result.data.length) {
          return { error: { message: 'Nothing was deleted — you may not have permission, or this row no longer exists.' } };
        }
        return { error: null };
      });
    }

    return { list: list, get: get, create: create, update: update, remove: remove };
  }

  global.IconicEntityService = { createTableService: createTableService };
})(window);
