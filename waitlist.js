// Waitlist storage — Supabase REST, no SDK.
//
// SETUP (see setup-supabase.md for the full walkthrough):
//   1. Create a Supabase project in the Mumbai region.
//   2. Run the SQL in setup-supabase.md — it creates the table AND the
//      insert-only RLS policy. The policy is not optional: without it the
//      anon key below lets anyone read every number you have collected.
//   3. Paste your project URL and anon (publishable) key here.
//
// The anon key is meant to be public — it is safe in client code ONLY because
// row-level security restricts it to INSERT. Never paste the service_role key.

export const SUPABASE_URL = 'https://ujdvlxbhnzdmhnstzbrr.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqZHZseGJobnpkbWhuc3R6YnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzExNjMsImV4cCI6MjEwMTI0NzE2M30.4IQZVwhYtFXKZ8nfR7q59eVlcE0WMZu-v-UWoEXefM4';

const configured = () =>
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') && !SUPABASE_ANON_KEY.includes('YOUR-ANON');

// Indian mobile numbers: 10 digits starting 6-9. Accepts pasted +91/0 prefixes
// and any spacing, returns E.164 or null.
export function normalisePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? '+91' + d : null;
}

// Resolves { ok, message }. Never throws — the caller shows `message` verbatim.
export async function joinWaitlist({ phone, consent, source }) {
  const e164 = normalisePhone(phone);
  if (!e164) return { ok: false, message: 'That does not look like an Indian mobile number.' };
  if (!consent) return { ok: false, message: 'Tick the box so we know we may message you.' };

  if (!configured()) {
    console.error('[waitlist] Supabase is not configured — edit waitlist.js');
    return { ok: false, message: 'The list is not open yet. Try again shortly.' };
  }

  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        phone: e164,
        city: 'Indore',
        consent: true,
        source: source || 'hero',
      }),
    });

    // 23505 = unique violation. Already on the list is a success, not an error.
    if (res.status === 409) return { ok: true, message: 'You are already on the list.' };
    if (!res.ok) {
      console.error('[waitlist]', res.status, await res.text());
      return { ok: false, message: 'Something went wrong. Try again in a moment.' };
    }
    return { ok: true, message: 'You are on the list. Munshi has noted it.' };
  } catch (err) {
    console.error('[waitlist]', err);
    return { ok: false, message: 'No connection. Check your network and try again.' };
  }
}
