/**
 * Iconic Rentals — Booking Submission API
 *
 * Thin wrapper around Supabase's REST API (PostgREST) for inserting a row
 * into booking_requests, plus a best-effort call to the send-booking-emails
 * Edge Function. See supabase/schema.sql for the table/RLS this depends on,
 * and CLIENT_SETUP.md for how to configure js/booking-config.js with real
 * values.
 *
 * Design notes:
 *   - The booking INSERT and the email notification are two separate
 *     network calls. If the email call fails (Resend down, function not
 *     yet deployed, etc.) the booking is still saved — email is a
 *     notification layered on top of a durable save, never a precondition
 *     for the customer's "success" state.
 *   - isConfigured() lets the frontend fail gracefully — with a clear,
 *     honest error message — instead of pretending to work against
 *     placeholder credentials.
 *   - Customer ownership (booking_requests.customer_user_id, added
 *     alongside this change): the column defaults to auth.uid() on the
 *     database side, so nothing about the JSON payload built in
 *     js/main.js needs to change — the only thing that matters is which
 *     token this file sends as the request's Authorization bearer. A
 *     signed-in customer's own access token (not the anon key) is what
 *     lets auth.uid() resolve to them server-side; getAuthToken() below
 *     reuses the already-loaded js/supabase-client.js client to check
 *     for one, falling back to the anon key exactly as before for an
 *     anonymous visitor.
 */
(function (global) {
  'use strict';

  function getConfig() {
    return global.IconicBookingConfig || null;
  }

  /** Resolves to a signed-in customer's access token if one exists,
   *  otherwise the anon key — same fallback js/auth.js's own helpers use
   *  when the Supabase client isn't available/configured. Never rejects. */
  function getAuthToken(cfg) {
    var supabase = global.IconicSupabase && global.IconicSupabase.getClient();
    if (!supabase) return Promise.resolve(cfg.SUPABASE_ANON_KEY);
    return supabase.auth.getSession().then(function (result) {
      var session = result.data && result.data.session;
      return (session && session.access_token) || cfg.SUPABASE_ANON_KEY;
    }).catch(function () {
      return cfg.SUPABASE_ANON_KEY;
    });
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
   * Basic spam heuristics: a honeypot field that only bots fill in, plus a
   * minimum time-on-form. Neither burdens a real visitor, and both are
   * enough to filter the overwhelming majority of automated form spam
   * without a third-party CAPTCHA dependency. See CLIENT_SETUP.md for how
   * to upgrade to hCaptcha/Turnstile if spam volume ever calls for it.
   */
  function isLikelySpam(form, formRenderedAt) {
    var honeypot = form.querySelector('[data-honeypot]');
    if (honeypot && honeypot.value.trim() !== '') return true;
    if (typeof formRenderedAt === 'number' && Date.now() - formRenderedAt < 1500) return true;
    return false;
  }

  function submitBooking(payload) {
    var cfg = getConfig();

    if (!isConfigured()) {
      return Promise.reject({
        type: 'not_configured',
        message: 'Online booking isn’t connected yet — please call or email us directly and we’ll take care of it personally.'
      });
    }

    var endpoint = cfg.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/booking_requests';

    return getAuthToken(cfg)
      .then(function (bearerToken) {
        return fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: cfg.SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + bearerToken,
            Prefer: 'return=representation'
          },
          body: JSON.stringify(payload)
        });
      })
      .catch(function () {
        throw { type: 'network_error', message: 'We couldn’t reach the reservation system. Please check your connection and try again.' };
      })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (text) {
            // Logged for debugging; never shown to the visitor — a raw
            // PostgREST/Postgres error is not something a customer should see.
            console.error('Booking insert failed:', res.status, text);
            throw {
              type: 'server_error',
              status: res.status,
              message: 'We couldn’t save your request right now. Please try again in a moment, or call us directly.'
            };
          });
        }
        return res.json();
      })
      .then(function (rows) {
        var saved = rows && rows[0] ? rows[0] : payload;

        if (cfg.EMAIL_FUNCTION_URL) {
          fetch(cfg.EMAIL_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY
            },
            body: JSON.stringify(saved)
          }).catch(function (err) {
            // Intentionally swallowed: the booking is already saved by this
            // point, so an email failure must not surface as a booking failure.
            console.error('Booking confirmation email failed to send (the booking itself was saved):', err);
          });
        }

        return saved;
      });
  }

  global.IconicBookingAPI = {
    isConfigured: isConfigured,
    isLikelySpam: isLikelySpam,
    submitBooking: submitBooking
  };
})(window);
