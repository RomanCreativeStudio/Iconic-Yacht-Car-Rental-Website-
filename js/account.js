/**
 * Iconic Rentals — Customer Account Page
 *
 * requireAuth() (js/auth.js) redirects to /login.html before any of this
 * runs if nobody's signed in — everything below can assume a real user.
 *
 * The full_name update writes directly to profiles via
 * supabase.from('profiles').update({ full_name }).eq('id', user.id) —
 * safe under RLS because of the column-scoped grant added alongside the
 * matching policy (see supabase/migrations/*_customer_auth_profile_self_
 * update.sql): a customer can only ever touch their own row's full_name
 * column this way, nothing else, no matter what a request tries to
 * include.
 *
 * Bookings: booking_requests has no column linking a row to a signed-in
 * user, and its existing SELECT policy isn't scoped per-user — building
 * a live query here would either show every customer every booking, or
 * require a schema/RLS change beyond this phase's scope. Showing an
 * honest "coming soon" message instead of attempting that query is the
 * deliberate choice here, not an oversight.
 */
(function () {
  'use strict';

  var supabase = window.IconicSupabase && window.IconicSupabase.getClient();
  var nameDisplay = document.getElementById('accountName');
  var emailDisplay = document.getElementById('accountEmail');
  var nameForm = document.getElementById('accountNameForm');
  var nameInput = document.getElementById('accountNameInput');
  var banner = document.getElementById('accountBanner');
  var successBanner = document.getElementById('accountSuccessBanner');
  var logoutBtn = document.getElementById('accountLogoutBtn');

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = false;
    successBanner.hidden = true;
  }
  function showSuccess(message) {
    successBanner.textContent = message;
    successBanner.hidden = false;
    banner.hidden = true;
  }

  var currentUser = null;

  // requireAuth() treats "Supabase isn't configured" the same as "nobody's
  // signed in" (js/auth.js's getCurrentUser() resolves null either way) and
  // redirects to /login.html either way — this must run unconditionally,
  // before any early-return on `!supabase`, or an unconfigured deployment
  // would render this "protected" page's shell instead of ever redirecting.
  window.IconicAuth.requireAuth().then(function (user) {
    if (!user) return; // already redirected to /login.html
    if (!supabase) {
      showBanner('Account access isn’t connected yet — please check back soon.');
      return;
    }
    currentUser = user;
    emailDisplay.textContent = user.email || '—';

    return window.IconicAuth.getProfile().then(function (profile) {
      var fullName = (profile && profile.full_name) || '';
      nameDisplay.textContent = fullName || '(no name on file)';
      nameInput.value = fullName;
    });
  });

  nameForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentUser) return;

    var newName = nameInput.value.trim();
    if (!newName) {
      showBanner('Full name can’t be empty.');
      return;
    }

    var submitBtn = nameForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    supabase
      .from('profiles')
      .update({ full_name: newName })
      .eq('id', currentUser.id)
      .then(function (result) {
        submitBtn.disabled = false;
        if (result.error) {
          showBanner('Couldn’t save your name: ' + result.error.message);
          return;
        }
        nameDisplay.textContent = newName;
        showSuccess('Your name has been updated.');
      })
      .catch(function () {
        submitBtn.disabled = false;
        showBanner('Couldn’t reach the server. Check your connection and try again.');
      });
  });

  logoutBtn.addEventListener('click', function () {
    window.IconicAuth.logout();
  });
})();
