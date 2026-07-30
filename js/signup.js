/**
 * Iconic Rentals — Customer Sign Up
 *
 * Calls Supabase Auth's signUp() with account_type: 'customer' in the
 * user metadata — this is the marker public.handle_new_user() checks to
 * assign role='customer' instead of its 'staff' default (see
 * supabase/migrations/*_customer_auth_signup_role_fix.sql). full_name is
 * passed the same way so the trigger copies it into profiles.full_name
 * without a second write from here.
 *
 * signUp() succeeding does not always mean an active session exists —
 * if this Supabase project has "Confirm email" enabled (Authentication >
 * Providers > Email), the user must click a confirmation link before
 * they can sign in, and no session comes back from this call. Both
 * outcomes are handled below rather than assuming one.
 */
(function () {
  'use strict';

  var supabase = window.IconicSupabase && window.IconicSupabase.getClient();
  var form = document.getElementById('signupForm');
  var banner = document.getElementById('signupBanner');
  var successPanel = document.getElementById('signupSuccess');
  var successText = document.getElementById('signupSuccessText');

  function showBanner(message) {
    banner.textContent = message;
    banner.hidden = false;
  }
  function hideBanner() {
    banner.hidden = true;
    banner.textContent = '';
  }
  // Same is-hidden/is-visible handoff as the booking form's own success
  // state (js/main.js) — reusing that exact pattern rather than a plain
  // banner for a moment this important.
  function showSuccess(message) {
    successText.textContent = message;
    form.classList.add('is-hidden');
    successPanel.classList.add('is-visible');
  }

  if (!supabase) {
    showBanner('Account creation isn’t connected yet — please check back soon, or call or email us directly and we’ll set up your booking personally.');
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  function setFieldError(fieldEl, message) {
    var wrap = fieldEl.closest('.form-field');
    var errorEl = wrap && wrap.querySelector('.form-error');
    if (wrap) wrap.classList.toggle('has-error', !!message);
    if (errorEl) errorEl.textContent = message || '';
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

  // Already signed in (e.g. a bookmark straight to signup.html) — no
  // reason to show the form again.
  window.IconicAuth.getCurrentUser().then(function (user) {
    if (user) window.location.replace('/account.html');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hideBanner();

    var fullNameEl = document.getElementById('signupFullName');
    var emailEl = document.getElementById('signupEmail');
    var passwordEl = document.getElementById('signupPassword');
    [fullNameEl, emailEl, passwordEl].forEach(function (el) { setFieldError(el, ''); });

    var fullName = fullNameEl.value.trim();
    var email = emailEl.value.trim();
    var password = passwordEl.value;

    var hasError = false;
    if (!fullName) { setFieldError(fullNameEl, 'Full name is required.'); hasError = true; }
    if (!email) { setFieldError(emailEl, 'Email is required.'); hasError = true; }
    if (!password || password.length < 6) { setFieldError(passwordEl, 'Password must be at least 6 characters.'); hasError = true; }
    if (hasError) return;

    var submitBtn = form.querySelector('button[type="submit"]');
    setButtonLoading(submitBtn, true);

    supabase.auth
      .signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: fullName, account_type: 'customer' }
        }
      })
      .then(function (result) {
        if (result.error) {
          showBanner(result.error.message || 'Couldn’t create your account. Please try again.');
          return;
        }
        if (result.data && result.data.session) {
          // Confirmation not required (or already auto-confirmed) — signed
          // in immediately.
          window.location.replace('/account.html');
          return;
        }
        // signUp() succeeded but no session — email confirmation is
        // required before this account can sign in.
        form.reset();
        showSuccess('We’ve sent a confirmation link to ' + email + '. Click it to activate your account, then sign in.');
      })
      .catch(function () {
        showBanner('Couldn’t reach the sign-up service. Check your connection and try again.');
      })
      .then(function () {
        setButtonLoading(submitBtn, false);
      });
  });
})();
