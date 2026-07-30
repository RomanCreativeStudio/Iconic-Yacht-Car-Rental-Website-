/**
 * Iconic Rentals — Customer Login
 *
 * Mirrors admin/login.js's shape (signInWithPassword, banner-based error
 * handling) but with no role gate — this is the public site, not the
 * admin dashboard, so any successfully authenticated user (whatever
 * their profiles.role is) goes to account.html. Role-based access control
 * for /admin/ is entirely admin/auth-guard.js's job, unaffected by and
 * unrelated to this file.
 */
(function () {
  'use strict';

  var supabase = window.IconicSupabase && window.IconicSupabase.getClient();
  var form = document.getElementById('loginForm');
  var banner = document.getElementById('loginBanner');

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = false;
  }
  function hideBanner() {
    banner.hidden = true;
    banner.textContent = '';
  }

  if (!supabase) {
    showBanner('Sign in isn’t connected yet — please check back soon, or call or email us directly.');
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  function setButtonLoading(btn, isLoading) {
    if (isLoading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
      btn.textContent = btn.dataset.loadingLabel || btn.dataset.originalText;
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.originalText || btn.textContent;
    }
  }

  // Already signed in — skip the form.
  window.IconicAuth.getCurrentUser().then(function (user) {
    if (user) window.location.replace('/account.html');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideBanner();

    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    supabase.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) {
          showBanner('Incorrect email or password. If you haven’t created an account yet, sign up first.');
          return;
        }
        form.reset();
        window.location.replace('/account.html');
      })
      .catch(function () {
        showBanner('Couldn’t reach the sign-in service. Check your connection and try again.');
      })
      .then(function () {
        setButtonLoading(submitBtn, false);
      });
  });
})();
