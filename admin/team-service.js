/**
 * Iconic Rentals — Team Service (Phase 6.10)
 *
 * Thin wrapper around three RPC calls rather than direct table access —
 * `profiles` has no UPDATE policy and `auth.users` isn't exposed via
 * PostgREST at all, so unlike every other *-service.js in this codebase,
 * there's no `supabase.from(table)...` to wrap here. See
 * supabase/migrations for list_team_members()/update_user_role()/
 * remove_team_member(), each a SECURITY DEFINER function gated by
 * is_admin() — same "this file does not enforce access control" note as
 * every other service: the database is what actually rejects an
 * unauthorized call, not this JS.
 */
(function (global) {
  'use strict';

  function client() {
    return global.IconicSupabase && global.IconicSupabase.getClient();
  }

  function list() {
    var supabase = client();
    if (!supabase) return Promise.resolve({ data: [], error: { message: 'Not connected.' } });
    return supabase.rpc('list_team_members').then(function (result) {
      return { data: result.data || [], error: result.error || null };
    });
  }

  function updateRole(id, role) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ error: { message: 'Not connected.' } });
    return supabase.rpc('update_user_role', { target_id: id, new_role: role }).then(function (result) {
      return { error: result.error || null };
    });
  }

  function remove(id) {
    var supabase = client();
    if (!supabase) return Promise.resolve({ error: { message: 'Not connected.' } });
    return supabase.rpc('remove_team_member', { target_id: id }).then(function (result) {
      return { error: result.error || null };
    });
  }

  global.IconicTeamService = { list: list, updateRole: updateRole, remove: remove };
})(window);
