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
  SUPABASE_URL: 'https://slokljslqyanbqabvzkk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsb2tsanNscXlhbmJxYWJ2emtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwMTE5NzIsImV4cCI6MjEwMDU4Nzk3Mn0.jV0v5ql8vBDdHiPJfMTmLfxcB8lOWCGpkjqKzozopew',
  EMAIL_FUNCTION_URL:''
