// stripe-checkout: creates a Stripe Checkout Session for web users.
//
// Called by the web app's paywall when react-native-purchases isn't available.
// The user is already authenticated (Supabase JWT); we record their user ID as
// client_reference_id so the stripe-webhook can flip profiles.ai_unlimited when
// the payment completes.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY         — Stripe live/test secret key (sk_live_… / sk_test_…)
//   STRIPE_MONTHLY_PRICE_ID   — Stripe Price ID for $4.99/mo (price_…)
//   STRIPE_ANNUAL_PRICE_ID    — Stripe Price ID for $39.99/yr (price_…)
//
// Deploy:
//   supabase functions deploy stripe-checkout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const APP_URL = 'https://kariimc.github.io/Just-a-pinch/app';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Authenticate via the Supabase JWT in the Authorization header.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  if (!stripeKey) return json({ error: 'Stripe not configured' }, 503);

  const monthlyPriceId = Deno.env.get('STRIPE_MONTHLY_PRICE_ID') ?? '';
  const annualPriceId = Deno.env.get('STRIPE_ANNUAL_PRICE_ID') ?? '';
  if (!monthlyPriceId || !annualPriceId) {
    return json({ error: 'Stripe prices not configured' }, 503);
  }

  const body = await req.json() as { period?: string };
  const priceId = body.period === 'annual' ? annualPriceId : monthlyPriceId;

  // Build form-encoded params for the Stripe Checkout Sessions API.
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    // Lets the webhook identify which Supabase profile to upgrade.
    client_reference_id: user.id,
    // Pre-fill the email field in the Stripe hosted page.
    customer_email: user.email ?? '',
    // After successful payment Stripe redirects here; the app picks up
    // ?payment_status=success and shows the upgrade confirmation.
    success_url: `${APP_URL}/?payment_status=success`,
    cancel_url: `${APP_URL}/`,
    // Also stored on the subscription itself so the deletion webhook can
    // find the Supabase user if client_reference_id is unavailable.
    'subscription_data[metadata][supabase_user_id]': user.id,
  });

  const stripeResp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const session = await stripeResp.json();
  if (!stripeResp.ok) {
    return json({ error: session?.error?.message ?? 'Stripe API error' }, 500);
  }

  return json({ url: session.url });
});
