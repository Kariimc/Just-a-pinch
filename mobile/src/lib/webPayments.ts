// Web-only payment path via Stripe Checkout. When the app runs in a browser
// react-native-purchases isn't available, so we redirect the user to a
// Stripe-hosted payment page instead. The stripe-checkout edge function creates
// the session; the stripe-webhook edge function flips profiles.ai_unlimited when
// payment succeeds; the AuthContext detects the ?payment_status=success redirect
// and marks the local plan as premium.

import { Platform } from 'react-native';
import { supabase } from './supabase';
import type { BillingPeriod } from './purchases';

export function webPaymentsAvailable(): boolean {
  return Platform.OS === 'web';
}

// Creates a Stripe Checkout Session and redirects the browser to it.
// The user lands back on the app with ?payment_status=success after paying.
export async function startWebCheckout(period: BillingPeriod): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to subscribe');

  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { period },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  const url: string | undefined = (data as { url?: string })?.url;
  if (!url) throw new Error('No checkout URL returned');

  // Navigate to Stripe's hosted checkout page. After payment Stripe redirects
  // back to the app with ?payment_status=success.
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}
