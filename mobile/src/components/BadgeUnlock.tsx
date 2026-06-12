import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation, interpolate, runOnJS, useAnimatedStyle, useSharedValue,
  withDelay, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeMetals, Colors, Fonts, Radius, Shadow } from '../theme';
import { Curves, Durations, Springs } from '../theme/motion';
import { subscribeBadgeUnlocks } from '../lib/badgeUnlockBus';
import { hapticSuccess } from '../lib/haptics';
import { navigationRef } from '../navigation/navigationRef';
import type { BadgeDef } from '../store/badges';
import BadgeMedallion from './BadgeMedallion';

// Slide-in unlock panel: anchors to the left screen edge, springs in with one
// overshoot (Springs.pop), bursts glitter as it settles, holds ~4.6s, then
// accelerates back out. Swipe left to dismiss early; tap to open Badges.
// Multiple unlocks queue and play one after another.

const HOLD_MS = 4600;
const BURST_DELAY_MS = 400;   // ≈ when the entry spring crosses its settle point
const BURST_MS = 760;
const QUEUE_GAP_MS = 350;
const MEDALLION = 58;

// ─── Celebratory glitter burst ───────────────────────────────────────────────

const BURST_COLORS = [
  '#F5CF64', '#FFE9A8', '#5C6847', '#A9B585',
  '#F4905E', '#E58BB4', '#7FB8DC', '#FFFFFF',
];

interface Particle {
  angle: number;     // radial direction
  dist: number;      // how far it flies
  size: number;
  color: string;
  spin: number;      // degrees of rotation over the flight
  star: boolean;     // four-point glint vs. plain dot
  delayFrac: number; // small per-particle phase so the ring feels organic
}

function makeParticles(count = 18): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
    dist: 40 + Math.random() * 46,
    size: 5 + Math.random() * 5,
    color: BURST_COLORS[i % BURST_COLORS.length],
    spin: 90 + Math.random() * 180,
    star: i % 3 !== 0,
    delayFrac: Math.random() * 0.12,
  }));
}

function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="-6 -6 12 12">
      <Path
        d="M0,-6 C0.9,-0.9 0.9,-0.9 6,0 C0.9,0.9 0.9,0.9 0,6 C-0.9,0.9 -0.9,0.9 -6,0 C-0.9,-0.9 -0.9,-0.9 0,-6"
        fill={color}
      />
    </Svg>
  );
}

function BurstParticle({ pt, p }: { pt: Particle; p: SharedValue<number> }) {
  const anim = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, (p.value - pt.delayFrac) / (1 - pt.delayFrac)));
    return {
      opacity: interpolate(t, [0, 0.1, 0.55, 1], [0, 1, 0.9, 0]),
      transform: [
        { translateX: t * Math.cos(pt.angle) * pt.dist },
        { translateY: t * Math.sin(pt.angle) * pt.dist },
        { scale: interpolate(t, [0, 0.14, 1], [0.2, 1.15, 0.5]) },
        { rotate: `${t * pt.spin}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        { marginLeft: -pt.size / 2, marginTop: -pt.size / 2 },
        anim,
      ]}
    >
      {pt.star ? (
        <Sparkle size={pt.size} color={pt.color} />
      ) : (
        <View style={{ width: pt.size * 0.7, height: pt.size * 0.7, borderRadius: pt.size, backgroundColor: pt.color }} />
      )}
    </Animated.View>
  );
}

// One-shot: mounts with each panel instance, erupts once after the panel
// settles, and never loops. All motion is transform/opacity.
function GlitterBurst() {
  const particles = useRef(makeParticles()).current;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(BURST_DELAY_MS, withTiming(1, { duration: BURST_MS, easing: Curves.enter }));
    return () => cancelAnimation(p);
  }, [p]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((pt, i) => (
        <BurstParticle key={i} pt={pt} p={p} />
      ))}
    </View>
  );
}

// ─── Host ────────────────────────────────────────────────────────────────────

export function BadgeUnlockHost() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelW = Math.min(width * 0.88, 380);
  const hiddenX = -(panelW + 60); // clears the drop shadow too

  const [current, setCurrent] = useState<BadgeDef | null>(null);
  const [instance, setInstance] = useState(0); // remount key → fresh burst per badge
  const queue = useRef<BadgeDef[]>([]);
  const showing = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tx = useSharedValue(hiddenX);

  function clearHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function armHold() {
    clearHold();
    holdTimer.current = setTimeout(hide, HOLD_MS);
  }

  function onHidden() {
    showing.current = false;
    setCurrent(null);
    if (queue.current.length) setTimeout(showNext, QUEUE_GAP_MS);
  }

  function hide() {
    clearHold();
    tx.value = withTiming(hiddenX, { duration: Durations.base, easing: Curves.exit }, (finished?: boolean) => {
      if (finished) runOnJS(onHidden)();
    });
  }

  function showNext() {
    const def = queue.current.shift();
    if (!def) return;
    showing.current = true;
    setCurrent(def);
    setInstance(i => i + 1);
    tx.value = hiddenX;
    tx.value = withSpring(0, Springs.pop);
    hapticSuccess();
    armHold();
  }

  function openBadges() {
    hide();
    if (navigationRef.isReady()) navigationRef.navigate('Badges');
  }

  useEffect(() => {
    const unsubscribe = subscribeBadgeUnlocks(def => {
      queue.current.push(def);
      if (!showing.current) showNext();
    });
    return () => {
      unsubscribe();
      clearHold();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .onBegin(() => {
      runOnJS(clearHold)();
    })
    .onChange(e => {
      // Free movement left; rubber-band resistance right.
      tx.value = e.translationX < 0 ? e.translationX : Math.min(e.translationX * 0.22, 22);
    })
    .onEnd(e => {
      if (e.translationX < -panelW * 0.22 || e.velocityX < -550) {
        runOnJS(hide)();
      } else {
        tx.value = withSpring(0, Springs.glide);
        runOnJS(armHold)();
      }
    });

  const tap = Gesture.Tap().maxDistance(8).onEnd(() => {
    runOnJS(openBadges)();
  });

  const gesture = Gesture.Race(pan, tap);

  const panelAnim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  if (!current) return null;
  const metals = BadgeMetals[current.metal];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.panel, Shadow.cardSoft, { width: panelW, top: insets.top + 70 }, panelAnim]}
        >
          {/* Metal-tinted strip on the anchored edge */}
          <View style={[styles.edgeStrip, { backgroundColor: metals.rimMid }]} />

          <View style={styles.medallionBox}>
            <BadgeMedallion metal={current.metal} icon={current.icon} size={MEDALLION} earned fx="full" />
            <GlitterBurst key={instance} />
          </View>

          <View style={styles.copy}>
            <Text style={styles.overline}>New Badge Unlocked!</Text>
            <Text style={styles.name} numberOfLines={1}>{current.name}</Text>
            <Text style={styles.epithet} numberOfLines={1}>{current.epithet}</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 13,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: Colors.surface,
    borderTopRightRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: Colors.line,
  },
  edgeStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  medallionBox: { width: MEDALLION, height: MEDALLION },
  particle: { position: 'absolute', left: '50%', top: '50%' },
  copy: { flex: 1 },
  overline: {
    fontFamily: Fonts.uiBold, fontSize: 11, letterSpacing: 0.8,
    textTransform: 'uppercase', color: Colors.accentDeep,
  },
  name: {
    fontFamily: Fonts.displayMedium, fontSize: 19, color: Colors.ink,
    letterSpacing: -0.2, marginTop: 1,
  },
  epithet: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink2, marginTop: 1 },
});
