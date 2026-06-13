// revenuecat-webhook: the server source of truth for premium.
//
// RevenueCat POSTs here whenever a subscription changes (purchase, renewal,
// expiration, …). We flip profiles.ai_unlimited accordingly, which is what the
// recipe-api AI gate (consume_ai_credit) reads to grant paying users unlimited
// captures. The app mirrors entitlement state locally for instant UI, but this
// flag — set only here, server-side — is authoritative and can't be spoofed by
// a client.
//
// The customer is identified by app_user_id, which the app sets to the Supabase
// user id (Purchases.logIn(user.id) in mobile/src/lib/purchases.ts), so we map
// the event straight onto profiles.id.
//
// Auth: RevenueCat sends the Authorization header value you set under the
// webhook config in the dashboard. We compare it to the REVENUECAT_WEBHOOK_AUTH
// secret — there is no Supabase JWT here, so deploy with verify_jwt = false.
//
// Deploy:
//   supabase functions deploy revenuecat-webhook --no-verify-jwt
//   supabase secrets set REVENUECAT_WEBHOOK_AUTH=<the value you put in RevenueCat>

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Event types that mean the entitlement is currently active → grant.
const GRANT = new Set([
  'INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED',
]);
// Event types that mean access has ended → revoke. Note CANCELLATION is NOT
// here: it only turns off auto-renew; the user keeps access until EXPIRATION.
const REVOKE = new Set([
  'EXPIRATION', 'SUBSCRIPTION_PAUSED',
]);

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Shared-secret check — reject anything not coming from our RevenueCat config.
  const expected = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
  if (!expected) return json({ error: 'Webhook auth not configured' }, 500);
  if ((req.headers.get('Authorization') ?? '') !== expected) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json();
    const event = payload?.event ?? {};
    const type: string = event.type ?? '';
    // TRANSFER moves an entitlement between users; grant to the new owner.
    const appUserId: string | undefined =
      event.app_user_id ?? event.transferred_to?.[0] ?? event.original_app_user_id;

    if (!appUserId) return json({ ok: true, skipped: 'no app_user_id' });

    let grant: boolean | null = null;
    if (GRANT.has(type) || type === 'TRANSFER') grant = true;
    else if (REVOKE.has(type)) grant = false;

    // Events we don't act on (CANCELLATION, BILLING_ISSUE, TEST, …) are ack'd.
    if (grant === null) return json({ ok: true, ignored: type });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!serviceKey) return json({ error: 'Missing service role key' }, 500);

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin
      .from('profiles')
      .update({ ai_unlimited: grant })
      .eq('id', appUserId);
    if (error) return json({ error: error.message }, 500);

    return json({ ok: true, app_user_id: appUserId, ai_unlimited: grant });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
