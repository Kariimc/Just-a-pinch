// In-app purchases via RevenueCat (react-native-purchases), which wraps both
// StoreKit (iOS) and Play Billing (Android) behind one API and validates
// receipts server-side. Like social sign-in, this is a NATIVE module: it does
// nothing in Expo Go or on web — it needs a custom dev/production build and
// live store products. Until then every call degrades to PurchasesNotConfigured
// so the paywall can fall back gracefully instead of crashing.
//
// The server source of truth for premium is profiles.ai_unlimited, flipped by
// the `revenuecat-webhook` edge function when an entitlement starts/ends. We
// identify the RevenueCat customer by the Supabase user id (logIn below) so the
// webhook knows which profile to update. The client mirrors entitlement state
// into local settings for instant UI; the server flag gates the AI cap.

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// The entitlement identifier configured in the RevenueCat dashboard. A customer
// who owns either subscription product has this entitlement active.
export const PREMIUM_ENTITLEMENT = 'premium';

// Store product / RevenueCat package identifiers. Create these in App Store
// Connect + Play Console with matching IDs, then add them to a RevenueCat
// offering. $MONTHLY/$ANNUAL are RevenueCat's standard package identifiers.
export const PRODUCT_MONTHLY = 'premium_monthly'; // $4.99 / month
export const PRODUCT_ANNUAL = 'premium_annual';   // $39.99 / year

export type BillingPeriod = 'monthly' | 'annual';

// Raised when IAP isn't available yet — the native module is missing (Expo Go /
// web) or no RevenueCat API key has been set in app.json `extra`. Screens catch
// this to fall back to the early-access "on the house" flow instead of erroring.
export class PurchasesNotConfigured extends Error {
  constructor() {
    super(
      "In-app purchases aren't set up yet. Add a RevenueCat API key and run a " +
        'custom dev build to enable them.',
    );
    this.name = 'PurchasesNotConfigured';
  }
}

function apiKey(): string {
  const extra = Constants.expoConfig?.extra ?? {};
  const key = Platform.OS === 'ios' ? extra.revenueCatApiKeyIos : extra.revenueCatApiKeyAndroid;
  return typeof key === 'string' ? key : '';
}

// Lazily load react-native-purchases. Wrapped in a try so the bundle still runs
// in Expo Go / on web (where the native module is absent) — there we simply
// report "not configured". On a real build with the package installed this
// resolves to the SDK.
type PurchasesModule = typeof import('react-native-purchases');
let cached: PurchasesModule['default'] | null = null;
let configured = false;

function load(): PurchasesModule['default'] | null {
  if (cached) return cached;
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases') as PurchasesModule;
    cached = mod.default;
    return cached;
  } catch {
    return null; // package not installed (e.g. Expo Go) → not configured
  }
}

// True only when the native SDK is present AND an API key is set. Screens use
// this to decide whether to show real prices/CTAs or the early-access fallback.
export function purchasesAvailable(): boolean {
  return !!load() && !!apiKey();
}

// Configure the SDK once and bind the RevenueCat customer to the signed-in
// Supabase user, so the webhook can map entitlement changes back to the profile.
// Safe to call on every app start and after auth changes; no-ops when unavailable.
export async function configurePurchases(): Promise<void> {
  const Purchases = load();
  const key = apiKey();
  if (!Purchases || !key) return;
  try {
    if (!configured) {
      Purchases.configure({ apiKey: key });
      configured = true;
    }
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      await Purchases.logIn(data.user.id);
    }
  } catch {
    // A configuration failure shouldn't break app start — the paywall will
    // simply report purchases as unavailable.
  }
}

export interface PremiumOffer {
  period: BillingPeriod;
  priceString: string;     // localized, e.g. "$4.99"
  productId: string;
  // Opaque RevenueCat package handed back to purchase(); typed loosely so this
  // module doesn't hard-depend on the SDK's types when it isn't installed.
  pkg: unknown;
}

// Fetch the current offering's monthly + annual packages with localized prices.
// Throws PurchasesNotConfigured when IAP isn't available.
export async function getPremiumOffers(): Promise<PremiumOffer[]> {
  const Purchases = load();
  if (!Purchases || !apiKey()) throw new PurchasesNotConfigured();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const offers: PremiumOffer[] = [];
  for (const pkg of current.availablePackages) {
    const period: BillingPeriod | null =
      pkg.product.identifier === PRODUCT_ANNUAL ? 'annual'
      : pkg.product.identifier === PRODUCT_MONTHLY ? 'monthly'
      : null;
    if (!period) continue;
    offers.push({
      period,
      priceString: pkg.product.priceString,
      productId: pkg.product.identifier,
      pkg,
    });
  }
  return offers;
}

// Run the native purchase sheet for the chosen package. Returns true when the
// premium entitlement is active afterwards, false if the user cancelled.
export async function purchase(offer: PremiumOffer): Promise<boolean> {
  const Purchases = load();
  if (!Purchases || !apiKey()) throw new PurchasesNotConfigured();
  try {
    const { customerInfo } = await Purchases.purchasePackage(offer.pkg as never);
    return isEntitled(customerInfo);
  } catch (e: unknown) {
    // RevenueCat marks user cancellation with userCancelled — treat as a no-op.
    if (e && typeof e === 'object' && (e as { userCancelled?: boolean }).userCancelled) {
      return false;
    }
    throw e;
  }
}

// Restore prior purchases (App Store requirement). Returns true if premium is
// active after restoring.
export async function restorePurchases(): Promise<boolean> {
  const Purchases = load();
  if (!Purchases || !apiKey()) throw new PurchasesNotConfigured();
  const customerInfo = await Purchases.restorePurchases();
  return isEntitled(customerInfo);
}

// Current entitlement state from the cached customer info. Returns false (not
// premium) when IAP is unavailable rather than throwing — callers treat the
// early-access build as "free with generous limits".
export async function isPremiumActive(): Promise<boolean> {
  const Purchases = load();
  if (!Purchases || !apiKey()) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return isEntitled(customerInfo);
  } catch {
    return false;
  }
}

function isEntitled(customerInfo: { entitlements?: { active?: Record<string, unknown> } }): boolean {
  return !!customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT];
}
