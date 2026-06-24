import React, { useCallback, useState } from 'react';
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { RootStackParamList } from '../../types';
import { Colors, Fonts, Radius, Spacing } from '../../theme';
import { StaggerMs } from '../../theme/motion';
import Icon, { IconName } from '../../components/Icon';
import { confirmSheet } from '../../components/ActionSheet';
import Button from '../../components/Button';
import Tappable from '../../components/Tappable';
import Sheen from '../../components/Sheen';
import { showToast } from '../../components/Toast';
import { AppSettings, getSettings, saveSettings, isPremium } from '../../store/settingsStorage';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import {
  PurchasesNotConfigured, PremiumOffer, BillingPeriod,
  purchasesAvailable, getPremiumOffers, purchase, restorePurchases,
} from '../../lib/purchases';
import { webPaymentsAvailable, startWebCheckout } from '../../lib/webPayments';
import { openPrivacy, openTerms } from '../../lib/legal';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const enter = (i: number) =>
  FadeInDown.delay(i * StaggerMs).springify().damping(26).stiffness(240).mass(1);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const FEATURES: { icon: IconName; title: string; sub: string }[] = [
  { icon: 'sparkle', title: 'Unlimited AI, every day', sub: 'Generate, import and scan as much as you cook' },
  { icon: 'calendar', title: 'Plan as far as you like', sub: 'Unlimited weeks of meal planning' },
  { icon: 'scale', title: 'Nutrition insights', sub: 'Calories and macros on every recipe' },
  { icon: 'people', title: 'Family recipe sharing', sub: 'One shelf the whole household can cook from' },
  { icon: 'leaf', title: 'No ads, ever', sub: 'Just you and the food' },
];

const COMPARISON: { label: string; free: string; premium: string }[] = [
  { label: 'Save & organize recipes', free: '✓', premium: '✓' },
  { label: 'Hands-free cooking mode', free: '✓', premium: '✓' },
  { label: 'AI imports & generation', free: '3 / month', premium: 'Unlimited' },
  { label: 'Meal planning', free: '1 week', premium: 'Unlimited' },
  { label: 'Nutrition insights', free: '—', premium: '✓' },
  { label: 'Family sharing', free: '—', premium: '✓' },
];

// Fallback prices shown when live store prices aren't available yet (web,
// Expo Go, or before products are approved). Real builds replace these with
// the localized priceString straight from the store.
const FALLBACK_PRICE: Record<BillingPeriod, { price: string; per: string }> = {
  monthly: { price: '$4.99', per: 'per month' },
  annual: { price: '$39.99', per: 'per year · $3.33/mo' },
};

export default function PaywallScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const source = route.params?.source ?? 'settings';
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [offers, setOffers] = useState<PremiumOffer[] | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    getSettings().then(s => {
      setSettings(s);
      setBilling(s.subscriptionBilling);
    });
    // Pull live, localized store prices when IAP is available. Silent no-op
    // otherwise — the screen falls back to FALLBACK_PRICE.
    if (purchasesAvailable()) {
      getPremiumOffers().then(setOffers).catch(() => setOffers(null));
    }
  }, []));

  const premiumActive = settings ? isPremium(settings) : false;
  const isPaid = settings?.subscriptionPlan === 'premium';

  const offerFor = (period: BillingPeriod) => offers?.find(o => o.period === period);
  const priceFor = (period: BillingPeriod) =>
    offerFor(period)?.priceString ?? FALLBACK_PRICE[period].price;

  async function setPlan(plan: AppSettings['subscriptionPlan']) {
    if (!settings) return settings;
    const updated: AppSettings = { ...settings, subscriptionPlan: plan, subscriptionBilling: billing };
    await saveSettings(updated);
    setSettings(updated);
    return updated;
  }

  // Primary CTA. Web → Stripe Checkout redirect; native → RevenueCat store sheet;
  // unconfigured → early-access "on the house" trial flag.
  async function handleSubscribe() {
    if (busy || !settings) return;

    // Web path: redirect to Stripe Checkout. The page navigates away; when
    // Stripe redirects back with ?payment_status=success the AuthContext picks
    // it up and marks the plan as premium.
    if (webPaymentsAvailable()) {
      setBusy(true);
      try {
        await startWebCheckout(billing);
        // startWebCheckout navigates away — execution stops here on success.
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not start checkout';
        showToast(msg, 'info');
        setBusy(false);
      }
      return;
    }

    if (!purchasesAvailable()) { await startTrial(); return; }
    const offer = offerFor(billing);
    if (!offer) { await startTrial(); return; }
    setBusy(true);
    try {
      const ok = await purchase(offer);
      if (ok) {
        // RevenueCat's webhook flips profiles.ai_unlimited server-side; mirror
        // it locally for instant UI.
        await setPlan('premium');
        hapticSuccess();
        showToast('Welcome to Premium!', 'sparkle');
        leave();
      }
    } catch (e) {
      if (e instanceof PurchasesNotConfigured) { await startTrial(); }
      else { showToast('Purchase could not be completed', 'info'); }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (busy) return;
    if (!purchasesAvailable()) { showToast('No previous purchases found', 'info'); return; }
    setBusy(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        await setPlan('premium');
        hapticSuccess();
        showToast('Premium restored', 'sparkle');
        leave();
      } else {
        showToast('No previous purchases found', 'info');
      }
    } catch {
      showToast('Could not restore purchases', 'info');
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    if (source === 'onboarding') {
      navigation.replace('Main');
    } else {
      navigation.goBack();
    }
  }

  async function startTrial() {
    if (!settings) return;
    const updated: AppSettings = {
      ...settings,
      subscriptionPlan: 'trial',
      subscriptionBilling: billing,
      trialStartedAt: Date.now(),
    };
    await saveSettings(updated);
    setSettings(updated);
    hapticSuccess();
    showToast('Premium trial started — enjoy!', 'sparkle');
    leave();
  }

  // Trial (early access) can be dropped locally. A real paid subscription is
  // managed in the App Store / Play Store — we can't and shouldn't cancel it
  // from here, so we point the user there.
  function manageSubscription() {
    if (isPaid) {
      confirmSheet({
        title: 'Manage subscription',
        message:
          Platform.OS === 'ios'
            ? 'Manage or cancel Premium from Settings → Apple Account → Subscriptions.'
            : 'Manage or cancel Premium from the Play Store → Payments & subscriptions.',
        confirmLabel: 'Got it',
        cancelLabel: 'Close',
        onConfirm: () => {},
      });
      return;
    }
    confirmSheet({
      title: 'Switch to free?',
      message: 'You can restart your trial any time.',
      confirmLabel: 'Switch to free',
      cancelLabel: 'Keep Premium',
      onConfirm: async () => {
        if (!settings) return;
        const updated: AppSettings = { ...settings, subscriptionPlan: 'free' };
        await saveSettings(updated);
        setSettings(updated);
        showToast('Back on the free plan');
      },
    });
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <Sheen radius={0} peak={0.18} delayMs={600} />
          <View style={styles.heroRing} />
          <View style={styles.heroTopRow}>
            {source === 'settings' ? (
              <TouchableOpacity style={styles.heroBack} onPress={() => navigation.goBack()}>
                <Icon name="back" size={19} color={Colors.surface} />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
            {source === 'onboarding' && (
              <TouchableOpacity onPress={leave} hitSlop={10}>
                <Text style={styles.heroSkip}>Not now</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.heroChip}>
            <Icon name="sparkle" size={13} color={Colors.surface} />
            <Text style={styles.heroChipTxt}>JUST A PINCH PREMIUM</Text>
          </View>
          <Text style={styles.heroTitle}>The whole kitchen,{'\n'}unlocked</Text>
          <Text style={styles.heroSub}>Save, cook, plan and shop — without limits.</Text>
        </View>

        <View style={styles.content}>
          {premiumActive ? (
            /* Manage state */
            <Animated.View entering={enter(0)} style={styles.activeCard}>
              <View style={styles.activeCheck}>
                <Icon name="check" size={22} color={Colors.surface} />
              </View>
              <Text style={styles.activeTitle}>
                {isPaid ? 'Premium active' : 'Premium trial active'}
              </Text>
              <Text style={styles.activeSub}>
                {isPaid
                  ? `${settings?.subscriptionBilling === 'annual' ? 'Annual' : 'Monthly'} plan`
                  : `Started ${settings?.trialStartedAt ? fmtDate(settings.trialStartedAt) : 'today'} · ${settings?.subscriptionBilling === 'annual' ? 'annual' : 'monthly'} plan selected`}
              </Text>
              {!isPaid && (
                <Text style={styles.activeNote}>
                  Payments aren't live during early access — Premium is on the house for now.
                </Text>
              )}
              <Button
                label={isPaid ? 'Manage subscription' : 'Switch to free plan'}
                variant="outline"
                onPress={manageSubscription}
                style={{ marginTop: Spacing.md }}
              />
            </Animated.View>
          ) : (
            <>
              {/* Billing toggle */}
              <Animated.View entering={enter(0)} style={styles.billingRow}>
                <Tappable
                  scaleTo={0.97}
                  haptic
                  style={[styles.planCard, billing === 'monthly' && styles.planCardOn]}
                  onPress={() => { hapticLight(); setBilling('monthly'); }}
                >
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planPrice}>{priceFor('monthly')}</Text>
                  <Text style={styles.planPer}>{FALLBACK_PRICE.monthly.per}</Text>
                </Tappable>
                <Tappable
                  scaleTo={0.97}
                  haptic
                  style={[styles.planCard, billing === 'annual' && styles.planCardOn]}
                  onPress={() => { hapticLight(); setBilling('annual'); }}
                >
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeTxt}>SAVE 33%</Text>
                  </View>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planPrice}>{priceFor('annual')}</Text>
                  <Text style={styles.planPer}>{FALLBACK_PRICE.annual.per}</Text>
                </Tappable>
              </Animated.View>

              {/* Feature list */}
              <Animated.View entering={enter(1)} style={styles.card}>
                {FEATURES.map((f, i) => (
                  <View key={f.title} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
                    <View style={styles.featureIcon}>
                      <Icon name={f.icon} size={19} color={Colors.accentDeep} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureSub}>{f.sub}</Text>
                    </View>
                  </View>
                ))}
              </Animated.View>

              {/* Comparison table */}
              <Animated.View entering={enter(2)}>
                <Text style={styles.sectionLabel}>Free vs Premium</Text>
                <View style={styles.card}>
                  <View style={[styles.tableRow, styles.tableHead]}>
                    <Text style={[styles.tableLabel, styles.tableHeadTxt]} />
                    <Text style={[styles.tableCell, styles.tableHeadTxt]}>Free</Text>
                    <Text style={[styles.tableCell, styles.tableHeadTxt, { color: Colors.accentDeep }]}>Premium</Text>
                  </View>
                  {COMPARISON.map(row => (
                    <View key={row.label} style={[styles.tableRow, styles.featureRowBorder]}>
                      <Text style={styles.tableLabel}>{row.label}</Text>
                      <Text style={[styles.tableCell, row.free === '—' && styles.tableDash]}>{row.free}</Text>
                      <Text style={[styles.tableCell, styles.tablePremium]}>{row.premium}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>

              {/* Family note */}
              <Animated.View entering={enter(3)} style={styles.familyNote}>
                <Icon name="people" size={17} color={Colors.ink2} />
                <Text style={styles.familyNoteTxt}>
                  Family plan — share Premium with up to 5 people. Coming soon.
                </Text>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Footer CTA */}
      {!premiumActive && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
          <Button
            label={
              webPaymentsAvailable()
                ? `Subscribe · ${priceFor(billing)}${billing === 'annual' ? '/yr' : '/mo'}`
                : purchasesAvailable() && offers
                  ? `Subscribe · ${priceFor(billing)}${billing === 'annual' ? '/yr' : '/mo'}`
                  : 'Start free trial'
            }
            onPress={handleSubscribe}
            loading={busy}
          />
          {source === 'onboarding' && (
            <TouchableOpacity onPress={leave} hitSlop={8} style={styles.freeLink}>
              <Text style={styles.freeLinkTxt}>Continue with the free plan</Text>
            </TouchableOpacity>
          )}
          {/* Web: secondary trial link so testers can try the app without paying */}
          {webPaymentsAvailable() && (
            <TouchableOpacity onPress={startTrial} hitSlop={8} style={styles.freeLink}>
              <Text style={styles.freeLinkTxt}>Start free trial instead</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleRestore}
            hitSlop={8}
            style={styles.restoreLink}
          >
            <Text style={styles.restoreTxt}>Restore purchases</Text>
          </TouchableOpacity>
          {/* App Store / Play subscription disclosure */}
          <Text style={styles.legalTxt}>
            Subscriptions renew automatically until cancelled. Cancel anytime in your
            store account.{' '}
            <Text style={styles.legalLink} onPress={openTerms}>Terms</Text>
            {' · '}
            <Text style={styles.legalLink} onPress={openPrivacy}>Privacy</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  hero: {
    backgroundColor: Colors.accentInk,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg + 6,
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
    overflow: 'hidden',
  },
  heroRing: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', top: -90, right: -70,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroSkip: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  heroChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 12, height: 26, borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroChipTxt: { fontFamily: Fonts.uiBold, fontSize: 10.5, letterSpacing: 1.1, color: Colors.surface },
  heroTitle: {
    fontFamily: Fonts.displayMedium, fontSize: 30, lineHeight: 34,
    letterSpacing: -0.4, color: Colors.surface, marginTop: Spacing.md,
  },
  heroSub: {
    fontFamily: Fonts.displayRegularItalic, fontSize: 15.5,
    color: 'rgba(255,255,255,0.78)', marginTop: 7,
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },

  billingRow: { flexDirection: 'row', gap: 10 },
  planCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.line, padding: Spacing.md,
  },
  planCardOn: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  planName: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2 },
  planPrice: { fontFamily: Fonts.displayMedium, fontSize: 26, color: Colors.ink, marginTop: 4, letterSpacing: -0.3 },
  planPer: { fontFamily: Fonts.uiRegular, fontSize: 12, color: Colors.ink3, marginTop: 2 },
  saveBadge: {
    position: 'absolute', top: -10, right: 10,
    backgroundColor: Colors.accent, borderRadius: Radius.pill,
    paddingHorizontal: 9, height: 21, justifyContent: 'center',
    transform: [{ rotate: '3deg' }],
  },
  saveBadgeTxt: { fontFamily: Fonts.uiBold, fontSize: 10, letterSpacing: 0.6, color: Colors.surface },

  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.line,
    marginTop: Spacing.md, overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
  },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: Colors.line },
  featureIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 14.5, color: Colors.ink },
  featureSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3, marginTop: 1 },

  sectionLabel: {
    fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.8,
    color: Colors.ink3, textTransform: 'uppercase',
    marginTop: Spacing.lg, marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  tableHead: { backgroundColor: Colors.surface2 },
  tableHeadTxt: { fontFamily: Fonts.uiBold, fontSize: 12, color: Colors.ink2 },
  tableLabel: { flex: 1.6, fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.ink, paddingRight: 6 },
  tableCell: { flex: 1, fontFamily: Fonts.uiSemiBold, fontSize: 12.5, color: Colors.ink2, textAlign: 'center' },
  tableDash: { color: Colors.ink3 },
  tablePremium: { color: Colors.accentDeep, fontFamily: Fonts.uiBold },

  familyNote: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: Colors.surface2, borderRadius: Radius.md,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  familyNoteTxt: { flex: 1, fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink2, lineHeight: 18 },

  activeCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.line,
    padding: Spacing.lg, alignItems: 'center',
  },
  activeCheck: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  activeTitle: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink, marginTop: Spacing.md, letterSpacing: -0.3 },
  activeSub: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2, marginTop: 5 },
  activeNote: {
    fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3,
    textAlign: 'center', marginTop: 9, lineHeight: 18,
  },

  footer: {
    paddingHorizontal: Spacing.lg, paddingTop: 12,
    backgroundColor: Colors.paper,
    borderTopWidth: 1, borderTopColor: Colors.line,
  },
  freeLink: { alignSelf: 'center', marginTop: 12 },
  freeLinkTxt: { fontFamily: Fonts.uiBold, fontSize: 14, color: Colors.accentDeep },
  restoreLink: { alignSelf: 'center', marginTop: 10 },
  restoreTxt: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3 },
  legalTxt: {
    fontFamily: Fonts.uiRegular, fontSize: 11, color: Colors.ink3,
    textAlign: 'center', marginTop: 10, lineHeight: 16, paddingHorizontal: 6,
  },
  legalLink: { color: Colors.accentDeep, fontFamily: Fonts.uiSemiBold },
});
