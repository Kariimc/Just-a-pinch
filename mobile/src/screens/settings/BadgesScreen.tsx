import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  FadeIn, FadeInDown, FadeOut, ZoomIn, SharedValue,
  cancelAnimation, interpolate, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSpring, withTiming,
} from 'react-native-reanimated';
import { RootStackParamList } from '../../types';
import { BadgeMetals, Colors, Fonts, Radius, Spacing } from '../../theme';
import { Ambient, Curves, Durations, Springs, StaggerMs } from '../../theme/motion';
import Icon from '../../components/Icon';
import Tappable from '../../components/Tappable';
import Button from '../../components/Button';
import BadgeMedallion from '../../components/BadgeMedallion';
import {
  BadgeProgress, getBadgeProgress, markBadgesCelebrated,
} from '../../store/badges';
import { hapticLight, hapticSuccess } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Badges'>;

const enter = (i: number) =>
  FadeInDown.delay(i * StaggerMs).springify().damping(26).stiffness(240).mass(1);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(ms: number) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Motion helpers ────────────────────────────────────────────────────────────

// Slow vertical bob for the hero medallion — the badge feels suspended.
function FloatingView({ children }: { children: React.ReactNode }) {
  const f = useSharedValue(0);

  useEffect(() => {
    f.value = withRepeat(
      withTiming(1, { duration: Ambient.floatMs / 2, easing: Curves.drift }),
      -1,
      true,
    );
    return () => cancelAnimation(f);
  }, [f]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(f.value, [0, 1], [3, -5]) }],
  }));

  return <Animated.View style={anim}>{children}</Animated.View>;
}

// One-shot radial particle burst for a freshly unlocked badge.
function BurstDot({ i, count, p, size, color }: {
  i: number; count: number; p: SharedValue<number>; size: number; color: string;
}) {
  const angle = (i / count) * Math.PI * 2;
  const dot = i % 2 ? 5 : 8;

  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.15, 1], [0, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * p.value * size * 0.78 },
      { translateY: Math.sin(angle) * p.value * size * 0.78 },
      { scale: 1 - p.value * 0.65 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: size / 2 - dot / 2,
          top: size / 2 - dot / 2,
          width: dot, height: dot, borderRadius: dot / 2,
          backgroundColor: color,
        },
        anim,
      ]}
    />
  );
}

function UnlockBurst({ size, colors }: { size: number; colors: string[] }) {
  const p = useSharedValue(0);
  const COUNT = 12;

  useEffect(() => {
    // Fire just after the medallion's pop entrance lands.
    p.value = withDelay(420, withTiming(1, { duration: 800, easing: Curves.enter }));
    return () => cancelAnimation(p);
  }, [p]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ width: size, height: size }}>
        {Array.from({ length: COUNT }).map((_, i) => (
          <BurstDot key={i} i={i} count={COUNT} p={p} size={size} color={colors[i % colors.length]} />
        ))}
      </View>
    </View>
  );
}

// Progress bar that fills with a left-anchored scaleX — no layout per frame.
function ProgressBar({ pct, fill, track, height = 6, delayMs = 0 }: {
  pct: number; fill: string; track: string; height?: number; delayMs?: number;
}) {
  const w = useSharedValue(0);
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      delayMs,
      withTiming(Math.min(Math.max(pct, 0), 1), { duration: Durations.slow, easing: Curves.enter }),
    );
  }, [pct, delayMs, p]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: -w.value / 2 },
      { scaleX: Math.max(p.value, 0.0001) },
      { translateX: w.value / 2 },
    ],
  }));

  return (
    <View
      onLayout={e => { w.value = e.nativeEvent.layout.width; }}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}
    >
      <Animated.View
        style={[{ width: '100%', height: '100%', borderRadius: height / 2, backgroundColor: fill }, anim]}
      />
    </View>
  );
}

// Touch-tracking 3D tilt: the medallion leans toward your finger like a coin
// balanced on a pin, then springs flat with a soft pop on release.
function TiltMedallion({ size, children }: { size: number; children: React.ReactNode }) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const sc = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
      { scale: sc.value },
    ],
  }));

  function lean(x: number, y: number) {
    ry.value = withSpring((x / size - 0.5) * 22, Springs.press);
    rx.value = withSpring(-(y / size - 0.5) * 22, Springs.press);
  }

  function settle() {
    sc.value = withSpring(1, Springs.pop);
    rx.value = withSpring(0, Springs.glide);
    ry.value = withSpring(0, Springs.glide);
  }

  return (
    <Animated.View
      style={anim}
      onTouchStart={e => {
        sc.value = withSpring(1.06, Springs.press);
        lean(e.nativeEvent.locationX, e.nativeEvent.locationY);
        hapticLight();
      }}
      onTouchMove={e => lean(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      onTouchEnd={settle}
      onTouchCancel={settle}
    >
      {children}
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BadgesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<BadgeProgress[] | null>(null);
  const [sel, setSel] = useState<BadgeProgress | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let live = true;
    getBadgeProgress().then(all => {
      if (!live) return;
      setProgress(all);
      const fresh = all.filter(b => b.isNew);
      if (fresh.length) {
        const star = [...fresh].sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0))[0];
        setCelebrating(prev => prev ?? star.id);
        hapticSuccess();
        markBadgesCelebrated(fresh.map(f => f.id));
      }
    });
    return () => { live = false; };
  }, []));

  // Android back closes the detail overlay before leaving the screen.
  useEffect(() => {
    if (!sel) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSel(null);
      return true;
    });
    return () => sub.remove();
  }, [sel]);

  const all = progress ?? [];
  const earnedList = all
    .filter(b => b.earned)
    .sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0));
  const nextUp =
    all.filter(b => !b.earned && b.stat !== 'badgesEarned')
      .sort((a, b) => b.current / b.target - a.current / a.target)[0]
    ?? all.find(b => !b.earned);
  const hero = (celebrating && all.find(b => b.id === celebrating)) || earnedList[0] || nextUp || all[0];
  const heroPalette = hero ? BadgeMetals[hero.metal] : BadgeMetals.gold;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Badges</Text>
        <View style={styles.countPill}>
          <Icon name="star" size={13} color={Colors.accentDeep} />
          <Text style={styles.countTxt}>{earnedList.length}/{all.length || 12}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero showcase */}
        {hero && (
          <Animated.View entering={enter(0)} style={styles.hero}>
            <View style={styles.heroRingA} />
            <View style={styles.heroRingB} />
            <View style={styles.heroChip}>
              <Text style={styles.heroChipTxt}>
                {celebrating ? 'NEW BADGE EARNED' : hero.earned ? 'LATEST BADGE' : 'UP NEXT'}
              </Text>
            </View>

            <View style={styles.heroStage}>
              <FloatingView>
                <Animated.View
                  key={hero.id}
                  entering={ZoomIn.delay(120).springify().damping(14).stiffness(340).mass(0.9)}
                >
                  <BadgeMedallion metal={hero.metal} icon={hero.icon} size={104} earned fx="full" />
                </Animated.View>
              </FloatingView>
              {celebrating === hero.id && (
                <UnlockBurst
                  size={104}
                  colors={[heroPalette.sparkle, heroPalette.rimLight, Colors.white]}
                />
              )}
            </View>

            <Text style={styles.heroName}>{hero.name}</Text>
            <Text style={styles.heroEpithet}>{hero.epithet}</Text>
            <Text style={styles.heroGoal}>
              {hero.earned
                ? `Earned ${hero.earnedAt ? fmtDate(hero.earnedAt) : ''}`.trim()
                : `${hero.goal} · ${Math.min(hero.current, hero.target)}/${hero.target}`}
            </Text>

            <View style={styles.shelf}>
              <View style={styles.shelfRow}>
                <Text style={styles.shelfLabel}>BADGE SHELF</Text>
                <Text style={styles.shelfCount}>{earnedList.length} of {all.length}</Text>
              </View>
              <ProgressBar
                pct={all.length ? earnedList.length / all.length : 0}
                fill={Colors.accent}
                track="rgba(255,255,255,0.16)"
                delayMs={300}
              />
            </View>
          </Animated.View>
        )}

        {/* How badges work */}
        <Animated.View entering={enter(1)} style={styles.howCard}>
          <View style={styles.howIcon}>
            <Icon name="sparkle" size={19} color={Colors.accentDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.howTitle}>How badges work</Text>
            <Text style={styles.howBody}>
              Badges celebrate the cooking you already do — saving recipes, cooking them
              hands-free, planning your week, ticking off groceries. Progress counts
              automatically, even offline. Tap any badge to see exactly how to earn it.
            </Text>
          </View>
        </Animated.View>

        {/* Trophy grid */}
        <Animated.View entering={enter(2)}>
          <Text style={styles.sectionLabel}>All badges</Text>
        </Animated.View>
        <View style={styles.grid}>
          {all.map((b, i) => (
            <Animated.View
              key={b.id}
              entering={FadeInDown.delay(160 + Math.min(i, 9) * 40).springify().damping(26).stiffness(240)}
              style={styles.cell}
            >
              <Tappable scaleTo={0.93} haptic onPress={() => setSel(b)} style={styles.cellTap}>
                <BadgeMedallion
                  metal={b.metal}
                  icon={b.icon}
                  size={70}
                  earned={b.earned}
                  fx="sheen"
                  sheenDelayMs={(i % 4) * 700}
                />
                <Text style={[styles.cellName, !b.earned && styles.cellNameLocked]} numberOfLines={2}>
                  {b.name}
                </Text>
                {b.earned ? (
                  <Text style={styles.cellEarned}>Earned ✓</Text>
                ) : (
                  <>
                    <Text style={styles.cellCount}>{Math.min(b.current, b.target)}/{b.target}</Text>
                    <View style={styles.cellBar}>
                      <ProgressBar
                        pct={b.current / b.target}
                        fill={Colors.accent}
                        track={Colors.line}
                        height={4}
                        delayMs={260 + i * 40}
                      />
                    </View>
                  </>
                )}
              </Tappable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Badge detail overlay */}
      {sel && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            entering={FadeIn.duration(Durations.fast)}
            exiting={FadeOut.duration(Durations.fast)}
            style={styles.backdrop}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSel(null)} />
          </Animated.View>

          <View style={styles.sheetWrap} pointerEvents="box-none">
            <Animated.View
              entering={FadeInDown.springify().damping(26).stiffness(240).mass(1)}
              exiting={FadeOut.duration(Durations.fast)}
              style={styles.detailCard}
            >
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSel(null)}>
                <Icon name="x" size={18} color={Colors.ink2} />
              </TouchableOpacity>

              <Animated.View entering={ZoomIn.delay(80).springify().damping(14).stiffness(340).mass(0.9)}>
                <TiltMedallion size={112}>
                  <BadgeMedallion metal={sel.metal} icon={sel.icon} size={112} earned={sel.earned} fx="full" />
                </TiltMedallion>
              </Animated.View>

              <View
                style={[
                  styles.tierChip,
                  sel.earned && {
                    backgroundColor: BadgeMetals[sel.metal].faceLight,
                    borderColor: BadgeMetals[sel.metal].rimMid,
                  },
                ]}
              >
                <Text
                  style={[styles.tierChipTxt, sel.earned && { color: BadgeMetals[sel.metal].ink }]}
                >
                  {sel.metal} badge{sel.earned ? ' · earned' : ''}
                </Text>
              </View>

              <Text style={styles.detailName}>{sel.name}</Text>
              <Text style={styles.detailEpithet}>{sel.epithet}</Text>

              {sel.earned ? (
                <View style={styles.earnedRow}>
                  <Icon name="check" size={15} color={Colors.accentDeep} />
                  <Text style={styles.earnedTxt}>
                    {sel.earnedAt ? `Earned ${fmtDate(sel.earnedAt)}` : 'Earned'}
                  </Text>
                </View>
              ) : (
                <View style={styles.detailProgress}>
                  <ProgressBar
                    pct={sel.current / sel.target}
                    fill={BadgeMetals[sel.metal].rimMid}
                    track={Colors.line}
                    delayMs={200}
                  />
                  <View style={styles.detailProgressRow}>
                    <Text style={styles.detailProgressTxt}>
                      {Math.min(sel.current, sel.target)} of {sel.target}
                    </Text>
                    <Text style={styles.detailProgressHint}>
                      {sel.target - Math.min(sel.current, sel.target)} to go
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.howToBlock}>
                <Text style={styles.howToLabel}>HOW TO EARN IT</Text>
                <Text style={styles.howToBody}>{sel.howTo}</Text>
              </View>

              <Button label="Done" onPress={() => setSel(null)} />
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Fonts.displayMedium, fontSize: 22, color: Colors.ink, letterSpacing: -0.3 },
  countPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    height: 36, paddingHorizontal: 13, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
  },
  countTxt: { fontFamily: Fonts.uiBold, fontSize: 13, color: Colors.ink },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 80 },

  hero: {
    backgroundColor: Colors.accentInk, borderRadius: Radius.xl,
    paddingVertical: Spacing.lg + 4, paddingHorizontal: Spacing.lg,
    alignItems: 'center', overflow: 'hidden',
  },
  heroRingA: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', top: -60, right: -70,
  },
  heroRingB: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', bottom: -50, left: -60,
  },
  heroChip: {
    paddingHorizontal: 12, height: 26, borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center',
    marginBottom: Spacing.md + 2,
  },
  heroChipTxt: {
    fontFamily: Fonts.uiBold, fontSize: 10.5, letterSpacing: 1.2, color: Colors.surface,
  },
  heroStage: { width: 104, height: 104, marginBottom: Spacing.md },
  heroName: {
    fontFamily: Fonts.displayMedium, fontSize: 25, color: Colors.surface, letterSpacing: -0.3,
  },
  heroEpithet: {
    fontFamily: Fonts.displayRegularItalic, fontSize: 15, color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  heroGoal: {
    fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.sm + 2,
  },
  shelf: { alignSelf: 'stretch', marginTop: Spacing.lg },
  shelfRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 7,
  },
  shelfLabel: {
    fontFamily: Fonts.uiBold, fontSize: 10.5, letterSpacing: 1, color: 'rgba(255,255,255,0.65)',
  },
  shelfCount: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.surface },

  howCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.line,
    padding: Spacing.md, marginTop: Spacing.md,
  },
  howIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  howTitle: { fontFamily: Fonts.uiSemiBold, fontSize: 15, color: Colors.ink },
  howBody: {
    fontFamily: Fonts.uiRegular, fontSize: 13, color: Colors.ink2,
    lineHeight: 19.5, marginTop: 3,
  },

  sectionLabel: {
    fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.8,
    color: Colors.ink3, textTransform: 'uppercase',
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    rowGap: Spacing.lg,
  },
  cell: { width: '31%' },
  cellTap: { alignItems: 'center' },
  cellName: {
    fontFamily: Fonts.uiSemiBold, fontSize: 12.5, color: Colors.ink,
    textAlign: 'center', marginTop: 9, lineHeight: 16,
  },
  cellNameLocked: { color: Colors.ink2 },
  cellEarned: {
    fontFamily: Fonts.uiBold, fontSize: 11, color: Colors.accentDeep, marginTop: 4,
  },
  cellCount: { fontFamily: Fonts.uiSemiBold, fontSize: 11, color: Colors.ink3, marginTop: 4 },
  cellBar: { alignSelf: 'stretch', marginTop: 5, paddingHorizontal: 6 },

  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(20,16,10,0.45)',
  },
  sheetWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', padding: Spacing.lg,
  },
  detailCard: {
    width: '100%', maxWidth: 380,
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, zIndex: 2,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  tierChip: {
    paddingHorizontal: 12, height: 26, borderRadius: Radius.pill,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.line2,
    justifyContent: 'center', marginTop: Spacing.md,
  },
  tierChipTxt: {
    fontFamily: Fonts.uiBold, fontSize: 10.5, letterSpacing: 1,
    color: Colors.ink2, textTransform: 'uppercase',
  },
  detailName: {
    fontFamily: Fonts.displayMedium, fontSize: 26, color: Colors.ink,
    letterSpacing: -0.3, marginTop: Spacing.sm,
  },
  detailEpithet: {
    fontFamily: Fonts.displayRegularItalic, fontSize: 15.5, color: Colors.ink2, marginTop: 2,
  },
  earnedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentSoft, borderRadius: Radius.pill,
    paddingHorizontal: 14, height: 32, marginTop: Spacing.md,
  },
  earnedTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 13, color: Colors.accentInk },
  detailProgress: { alignSelf: 'stretch', marginTop: Spacing.md + 2 },
  detailProgressRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 6,
  },
  detailProgressTxt: { fontFamily: Fonts.uiBold, fontSize: 12.5, color: Colors.ink },
  detailProgressHint: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3 },
  howToBlock: {
    alignSelf: 'stretch', backgroundColor: Colors.surface2,
    borderRadius: Radius.md, padding: Spacing.md,
    marginTop: Spacing.md + 2, marginBottom: Spacing.md + 2,
  },
  howToLabel: {
    fontFamily: Fonts.uiBold, fontSize: 10.5, letterSpacing: 1, color: Colors.ink3,
  },
  howToBody: {
    fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2,
    lineHeight: 20, marginTop: 6,
  },
});
