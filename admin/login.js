/**
 * Iconic Rentals — Admin Login
 *
 * Signs in with Supabase Auth, then checks profiles.role (via
 * admin/auth-guard.js) before sending the user on to the dashboard — a
 * valid password alone doesn't guarantee dashboard access. Session
 * persistence ("remember me") is handled by the Supabase client itself
 * (js/supabase-client.js), not configured here.
 */
(function () {
  'use strict';

  var auth = window.IconicAdminAuth;
  var supabase = auth && auth.requireClient();
  if (!supabase) return;

  var loginForm = document.getElementById('loginForm');
  var loginBanner = document.getElementById('loginBanner');

  function showBanner(message) {
    loginBanner.textContent = message;
    loginBanner.hidden = false;
  }
  function hideBanner() {
    loginBanner.hidden = true;
    loginBanner.textContent = '';
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

  function goToDashboard() {
    window.location.replace('index.html');
  }

  // Already signed in with dashboard access (e.g. a bookmark straight to
  // login.html) — skip the form. A session that exists but lacks access
  // is signed out here rather than left dangling on this page.
  auth.getSessionAndRole(supabase).then(function (result) {
    if (!result.session) return;
    if (auth.hasDashboardAccess(result.role)) {
      goToDashboard();
    } else {
      supabase.auth.signOut();
    }
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hideBanner();
    var email = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var submitBtn = loginForm.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    supabase.auth
      .signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) {
          showBanner('Incorrect email or password. Contact your administrator if you need access.');
          return null;
        }
        return auth.getSessionAndRole(supabase);
      })
      .then(function (sessionResult) {
        if (!sessionResult) return; // sign-in itself already failed above
        if (!sessionResult.session) {
          showBanner('Couldn’t start a session. Please try again.');
          return;
        }
        if (!auth.hasDashboardAccess(sessionResult.role)) {
          supabase.auth.signOut();
          showBanner('Your account doesn’t have dashboard access. Contact your administrator.');
          return;
        }
        loginForm.reset();
        goToDashboard();
      })
      .catch(function () {
        showBanner('Couldn’t reach the sign-in service. Check your connection and try again.');
      })
      .then(function () {
        setButtonLoading(submitBtn, false);
      });
  });
})();
