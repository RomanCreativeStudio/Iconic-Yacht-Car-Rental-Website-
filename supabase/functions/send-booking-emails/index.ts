// ============================================================================
// Iconic Rentals — Booking Notification Emails
//
// Supabase Edge Function (Deno runtime). Called by the frontend right after
// a booking_requests row is successfully inserted. Sends two emails via
// Resend:
//   1. A notification to the business owner with the full inquiry.
//   2. A confirmation to the customer.
//
// The database row is already saved before this function is ever called —
// if Resend is down, misconfigured, or this function errors, the inquiry
// itself is NOT lost. Email is a best-effort notification layered on top
// of a durable save, not a requirement for the booking to "count."
//
// Deploy with:  supabase functions deploy send-booking-emails
// Configure secrets with:
//   supabase secrets set RESEND_API_KEY=your_real_key
//   supabase secrets set OWNER_EMAIL=owner@yourdomain.com
//   supabase secrets set FROM_EMAIL="Iconic Rentals <bookings@yourdomain.com>"
// See CLIENT_SETUP.md, "Email Configuration" for the full walkthrough,
// including domain verification (Resend will not send from an address on
// an unverified domain).
// ============================================================================

// deno-lint-ignore-file no-explicit-any
// @ts-ignore -- Deno global is provided by the Supabase Edge Functions runtime
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// @ts-ignore
const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'concierge@iconicrentalsmiami.com';
// @ts-ignore
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Iconic Rentals <onboarding@resend.dev>';

// Allow the public site to call this function directly from the browser.
// Restrict this to your real domain once you've deployed (see
// CLIENT_SETUP.md) instead of leaving it wide open.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function escapeHtml(value: unknown): string {
  return String(value ?? '—').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function ownerEmailHtml(b: Record<string, any>): string {
  const row = (label: string, value: unknown) =>
    `<tr><td style="padding:6px 12px;color:#8a8a8a;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 12px;color:#111;font-size:14px;">${escapeHtml(value)}</td></tr>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#0a0a0b;">New Booking Inquiry</h2>
    <p style="color:#444;">A new reservation request just came in through the website.</p>
    <table style="border-collapse:collapse;width:100%;background:#f7f6f3;border-radius:8px;overflow:hidden;">
      ${row('Name', b.name)}
      ${row('Email', b.email)}
      ${row('Phone', b.phone)}
      ${row('Rental Type', b.rental_type)}
      ${row('Fleet Selection', b.fleet_item)}
      ${row('Date', b.date)}
      ${row('Time', b.time)}
      ${row('Duration', b.duration)}
      ${row('Guests', b.guests)}
      ${row('Message', b.message)}
      ${row('Source', b.source === 'quick_form' ? 'Quick Book modal' : 'Full booking form')}
    </table>
    <p style="color:#999;font-size:12px;margin-top:16px;">Reply directly to this email to reach the customer at ${escapeHtml(b.email)}.</p>
  </div>`;
}

function customerEmailHtml(b: Record<string, any>): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
    <h2 style="color:#0a0a0b;">Thank You, ${escapeHtml(b.name)}</h2>
    <p style="color:#444;line-height:1.6;">
      We've received your reservation request${b.fleet_item ? ` for the ${escapeHtml(b.fleet_item)}` : ''}.
      One of our concierge specialists will contact you shortly at
      ${escapeHtml(b.phone)} or this email address to confirm every detail.
    </p>
    <table style="border-collapse:collapse;width:100%;background:#f7f6f3;border-radius:8px;overflow:hidden;margin-top:16px;">
      <tr><td style="padding:6px 12px;color:#8a8a8a;font-size:13px;">Rental Type</td><td style="padding:6px 12px;color:#111;font-size:14px;">${escapeHtml(b.rental_type)}</td></tr>
      <tr><td style="padding:6px 12px;color:#8a8a8a;font-size:13px;">Date</td><td style="padding:6px 12px;color:#111;font-size:14px;">${escapeHtml(b.date)}</td></tr>
      <tr><td style="padding:6px 12px;color:#8a8a8a;font-size:13px;">Duration</td><td style="padding:6px 12px;color:#111;font-size:14px;">${escapeHtml(b.duration)}</td></tr>
    </table>
    <p style="color:#999;font-size:12px;margin-top:16px;">— Iconic Rentals, Miami's private luxury concierge</p>
  </div>`;
}

// @ts-ignore -- Deno.serve is provided by the Edge Functions runtime
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  if (!RESEND_API_KEY) {
    // Not configured yet — fail loudly in logs, but don't throw a 500 that
    // could confuse the frontend into thinking the booking itself failed.
    console.error('RESEND_API_KEY is not set. Skipping email send.');
    return new Response(JSON.stringify({ ok: false, reason: 'email_not_configured' }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  let booking: Record<string, any>;
  try {
    booking = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  if (!booking?.email || !booking?.name) {
    return new Response(JSON.stringify({ error: 'Missing required booking fields' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const sendEmail = async (to: string, subject: string, html: string) => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend error sending to ${to}:`, res.status, body);
      return { to, ok: false, status: res.status };
    }
    return { to, ok: true };
  };

  const results = await Promise.all([
    sendEmail(OWNER_EMAIL, `New Booking Inquiry — ${booking.name}`, ownerEmailHtml(booking)),
    sendEmail(booking.email, 'Your Reservation Request — Iconic Rentals', customerEmailHtml(booking))
  ]);

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
});
