/**
 * Iconic Rentals — Supabase Connection Config
 *
 * See CLIENT_SETUP.md, "Environment Variables" for where these values
 * come from. The anon key below is NOT a secret — Supabase's anon key is
 * designed to be public and shipped in frontend code; Row Level Security
 * (see supabase/schema.sql) is what actually protects the data, not
 * hiding this key. Never put your Resend API key or any Supabase
 * "service_role" key here or anywhere else in frontend code.
 *
 * This file ships with placeholder values on purpose — until you replace
 * them, booking submissions fail gracefully with a friendly error message
 * instead of silently doing nothing (see js/booking-api.js).
 */
window.IconicBookingConfig = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-SUPABASE-ANON-KEY',
  EMAIL_FUNCTION_URL: 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-booking-emails'
};
