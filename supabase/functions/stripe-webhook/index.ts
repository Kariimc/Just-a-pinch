// stripe-webhook: handles Stripe payment events for web subscriptions.
//
// Stripe POSTs here when a Checkout session completes (payment successful) or
// a subscription is cancelled/expired. We flip profiles.ai_unlimited the same
// way the revenuecat-webhook does for native IAP — keeping a single server flag
// as the source of truth regardless of which platform the purchase came from.
//
// Required secrets:
//   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Webhooks → signing secret (whsec_…)
//
// Required Stripe events (configure in the Stripe Webhooks dashboard):
//   checkout.session.completed
//   customer.subscription.deleted
//
// Deploy:
//   supabase functions deploy stripe-webhook --no-verify-jwt
//   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_…

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Stripe signs each webhook delivery with HMAC-SHA256 over `${timestamp}.${rawBody}`.
async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const chunk of signatureHeader.split(',')) {
    const eq = chunk.indexOf('=');
    if (eq > 0) parts[chunk.slice(0, eq)] = chunk.slice(eq + 1);
  }
  const { t: timestamp, v1 } = parts;
  if (!timestamp || !v1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${rawBody}`),
  );
  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computed === v1;
}

async function setAiUnlimited(userId: string, value: boolean): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin
    .from('profiles')
    .update({ ai_unlimited: value })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
  if (!webhookSecret) return json({ error: 'Webhook secret not configured' }, 500);

  const rawBody = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';

  const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
  if (!valid) return json({ error: 'Invalid signature' }, 401);

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      // client_reference_id is the Supabase user ID set when creating the session.
      const userId = event.data.object.client_reference_id as string | undefined;
      if (!userId) return json({ ok: true, skipped: 'no client_reference_id' });
      await setAiUnlimited(userId, true);
      return json({ ok: true, event: event.type, userId });
    }

    if (event.type === 'customer.subscription.deleted') {
      // Try metadata first; fall back to a best-effort lookup isn't needed since
      // we always set the metadata when creating the session.
      const metadata = event.data.object.metadata as Record<string, string> | undefined;
      const userId = metadata?.supabase_user_id;
      if (!userId) return json({ ok: true, skipped: 'no supabase_user_id in metadata' });
      await setAiUnlimited(userId, false);
      return json({ ok: true, event: event.type, userId });
    }

    // All other event types are acknowledged but not acted on.
    return json({ ok: true, ignored: event.type });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
