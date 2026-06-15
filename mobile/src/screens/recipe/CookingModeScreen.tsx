import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInRight, FadeInLeft, FadeOut,
  useSharedValue, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import * as Speech from 'expo-speech';
import { RootStackParamList, Recipe, Step } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import { Curves } from '../../theme/motion';
import { getRecipe, saveRecipe } from '../../store/storage';
import { getSettings, saveSettings } from '../../store/settingsStorage';
import { hapticStep, hapticSuccess } from '../../lib/haptics';
import { scheduleTimerNotification, cancelTimerNotification } from '../../lib/notifications';
import Icon from '../../components/Icon';
import AnimatedCheck from '../../components/AnimatedCheck';
import Skeleton from '../../components/Skeleton';
import { showToast } from '../../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'CookingMode'>;

interface TimerState {
  id: string;
  label: string;
  totalSeconds: number;
  remaining: number;
  running: boolean;
  notificationId?: string;
}

export default function CookingModeScreen({ route, navigation }: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngr, setShowIngr] = useState(false);
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [checkedIngr, setCheckedIngr] = useState<Set<string>>(new Set());
  const [largerText, setLargerText] = useState(false);
  const [speakOn, setSpeakOn] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirRef = useRef<1 | -1>(1);
  // The 1s tick lives in a stable effect, so it reads "speak aloud" through a
  // ref to announce timer events without re-subscribing the interval.
  const speakRef = useRef(false);

  const fillWidth = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: fillWidth.value }));

  // Derive step info before any early returns so hooks stay at the top.
  const steps = recipe?.steps ?? [];
  const stepCount = steps.length;

  useEffect(() => {
    getRecipe(recipeId).then(r => { if (r) setRecipe(r); });
    getSettings().then(s => { setLargerText(s.largerText); setSpeakOn(s.speakSteps); });
  }, [recipeId]);

  useEffect(() => {
    Speech.stop();
    const text = recipe?.steps[stepIndex]?.text;
    if (speakOn && text) {
      Speech.speak(`Step ${stepIndex + 1}. ${text}`, { rate: 0.95 });
    }
  }, [speakOn, stepIndex, recipe]);
  useEffect(() => () => { Speech.stop(); }, []);
  useEffect(() => { speakRef.current = speakOn; }, [speakOn]);

  // Animate the progress fill whenever step or track size changes.
  useEffect(() => {
    if (trackWidth > 0 && stepCount > 0) {
      fillWidth.value = withTiming(
        (trackWidth / stepCount) * (stepIndex + 1),
        { duration: 280, easing: Curves.enter },
      );
    }
  }, [stepIndex, trackWidth, stepCount]);

  async function toggleSpeak() {
    hapticStep();
    const next = !speakOn;
    setSpeakOn(next);
    const s = await getSettings();
    await saveSettings({ ...s, speakSteps: next });
  }

  useEffect(() => {
    tickRef.current = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (!t.running || t.remaining <= 0) return t;
        const next = t.remaining - 1;
        if (next === 0) {
          hapticSuccess();
          showToast(`${t.label} timer done!`, 'timer');
          // Hands-free: call it out loud so you don't have to glance at the screen.
          if (speakRef.current) Speech.speak(`${t.label} timer is done`, { rate: 0.95 });
        }
        return { ...t, remaining: next, running: next > 0 };
      }));
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  useEffect(() => {
    return () => {
      timers.forEach(t => { if (t.notificationId) cancelTimerNotification(t.notificationId); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startTimer(step: Step) {
    if (!step.timerSeconds) return;
    const label = `Step ${step.number}`;
    const notificationId = await scheduleTimerNotification(label, step.timerSeconds);
    setTimers(prev => [...prev, {
      id: `${step.id}-${Date.now()}`,
      label,
      totalSeconds: step.timerSeconds!,
      remaining: step.timerSeconds!,
      running: true,
      notificationId,
    }]);
    hapticStep();
    if (speakRef.current) Speech.speak(`Timer started for ${spokenDuration(step.timerSeconds)}`, { rate: 0.95 });
  }

  async function dismissTimer(id: string) {
    hapticStep();
    const t = timers.find(x => x.id === id);
    if (t?.notificationId) await cancelTimerNotification(t.notificationId);
    setTimers(prev => prev.filter(x => x.id !== id));
  }

  async function toggleTimer(id: string) {
    const t = timers.find(x => x.id === id);
    if (!t) return;
    if (t.running) {
      if (t.notificationId) await cancelTimerNotification(t.notificationId);
      setTimers(prev => prev.map(x => x.id === id ? { ...x, running: false, notificationId: undefined } : x));
    } else if (t.remaining > 0) {
      const notificationId = await scheduleTimerNotification(t.label, t.remaining);
      setTimers(prev => prev.map(x => x.id === id ? { ...x, running: true, notificationId } : x));
    }
  }

  async function finishCooking() {
    hapticSuccess();
    if (recipe) {
      await saveRecipe({ ...recipe, cookedCount: (recipe.cookedCount ?? 0) + 1 });
    }
    showToast('Nice cooking! Marked as cooked.', 'flame');
    navigation.goBack();
  }

  function fmtTimer(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // Natural-language duration for the spoken timer confirmation.
  function spokenDuration(s: number) {
    if (s < 60) return `${s} seconds`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const mins = `${m} minute${m === 1 ? '' : 's'}`;
    return sec === 0 ? mins : `${mins} and ${sec} seconds`;
  }

  // Horizontal swipe to move between steps; failOffsetY hands vertically
  // dominant gestures back to the ScrollView so long steps still scroll.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -60 && stepIndex < stepCount - 1) {
        hapticStep();
        dirRef.current = 1;
        setStepIndex(i => i + 1);
      } else if (e.translationX > 60 && stepIndex > 0) {
        hapticStep();
        dirRef.current = -1;
        setStepIndex(i => i - 1);
      }
    });

  if (!recipe) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 8, paddingHorizontal: 26, justifyContent: 'center' }]}>
        <Skeleton width="90%" height={34} style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <Skeleton width="70%" height={34} style={{ marginTop: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />
      </View>
    );
  }

  const current = steps[stepIndex];

  return (
    <GestureDetector gesture={swipe}>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          {/* Step pill: absolutely centred so it never pushes the edge buttons off-screen */}
          <View style={styles.stepPillWrap} pointerEvents="none">
            <View style={styles.stepPill}>
              <Text style={styles.stepPillTxt} numberOfLines={1}>Step {stepIndex + 1} of {steps.length}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.ctrlBtn} onPress={() => navigation.goBack()}>
            <Icon name="x" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.ctrlBtn, speakOn && styles.ctrlBtnOn]}
              onPress={toggleSpeak}
              accessibilityLabel={speakOn ? 'Stop reading steps aloud' : 'Read steps aloud'}
            >
              <Icon name="soundwave" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowIngr(true)}>
              <Icon name="list" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segmented progress bar */}
        <View
          style={styles.progressTrack}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.progressFill, fillStyle]} />
          {/* Segment dividers */}
          {steps.length > 1 && steps.map((_, i) => i < steps.length - 1 && (
            <View
              key={i}
              style={[styles.progressDivider, { left: `${((i + 1) / steps.length) * 100}%` as any }]}
            />
          ))}
        </View>

        {/* Step content */}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Animated.View
            key={stepIndex}
            entering={(dirRef.current === 1 ? FadeInRight : FadeInLeft).duration(280)}
            exiting={FadeOut.duration(120)}
          >
            <Text style={[styles.stepText, largerText && styles.stepTextLarge]}>{current?.text}</Text>
            {current?.timerSeconds ? (
              <TouchableOpacity style={styles.timerBtn} onPress={() => startTimer(current)}>
                <Icon name="timer" size={18} color="#fff" />
                <Text style={styles.timerBtnTxt}>Start {fmtTimer(current.timerSeconds)} timer</Text>
              </TouchableOpacity>
            ) : null}
          </Animated.View>

          {/* Active timers */}
          {timers.length > 0 && (
            <View style={styles.activeTimers}>
              {timers.map(t => {
                const done = t.remaining === 0;
                const frac = t.totalSeconds > 0 ? t.remaining / t.totalSeconds : 0;
                return (
                  <View key={t.id} style={[styles.timerChip, done && styles.timerChipDone]}>
                    <View style={styles.timerChipRow}>
                      <Icon name="timer" size={15} color={done ? Colors.accent : 'rgba(255,255,255,0.75)'} />
                      <Text style={[styles.timerChipTxt, done && { color: Colors.accent }]}>
                        {t.label} · {done ? 'Done!' : fmtTimer(t.remaining)}
                      </Text>
                      <View style={{ flex: 1 }} />
                      {!done && (
                        <TouchableOpacity onPress={() => toggleTimer(t.id)} hitSlop={8} style={styles.timerIconBtn}>
                          <Icon name={t.running ? 'pause' : 'play'} size={16} color="#fff" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => dismissTimer(t.id)}
                        hitSlop={8}
                        style={styles.timerIconBtn}
                        accessibilityLabel={`Dismiss ${t.label} timer`}
                      >
                        <Icon name="x" size={15} color="rgba(255,255,255,0.6)" />
                      </TouchableOpacity>
                    </View>
                    {!done && (
                      <View style={styles.timerTrack}>
                        <View style={[styles.timerTrackFill, { width: `${frac * 100}%` as any }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Nav */}
        <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
          <TouchableOpacity
            style={[styles.backBtn, stepIndex === 0 && { opacity: 0.4 }]}
            onPress={() => { hapticStep(); dirRef.current = -1; setStepIndex(i => Math.max(0, i - 1)); }}
            disabled={stepIndex === 0}
          >
            <Icon name="back" size={22} color="#fff" />
          </TouchableOpacity>
          {stepIndex < steps.length - 1 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={() => { hapticStep(); dirRef.current = 1; setStepIndex(i => i + 1); }}>
              <Text style={styles.nextBtnTxt}>Next step</Text>
              <Icon name="fwd" size={18} color="#14110c" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextBtn, { backgroundColor: Colors.accent }]} onPress={finishCooking}>
              <Text style={[styles.nextBtnTxt, { color: '#fff' }]}>Done — I cooked it!</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Ingredient overlay */}
        <Modal visible={showIngr} transparent animationType="slide" onRequestClose={() => setShowIngr(false)}>
          <View style={styles.ingrOverlay}>
            <View style={[styles.ingrSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
              <View style={styles.ingrHandle} />
              <Text style={styles.ingrTitle}>Ingredients</Text>
              <ScrollView>
                {recipe.ingredients.map(ing => (
                  <TouchableOpacity
                    key={ing.id}
                    style={styles.ingrRow}
                    onPress={() => setCheckedIngr(prev => { const n = new Set(prev); n.has(ing.id) ? n.delete(ing.id) : n.add(ing.id); return n; })}
                  >
                    <AnimatedCheck checked={checkedIngr.has(ing.id)} borderColor="rgba(255,255,255,0.3)" />
                    <Text style={[styles.ingrTxt, checkedIngr.has(ing.id) && styles.ingrDone]}>
                      <Text style={{ fontFamily: Fonts.uiBold }}>{ing.quantity} {ing.unit}</Text> {ing.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.gotItBtn} onPress={() => setShowIngr(false)}>
                <Text style={styles.gotItTxt}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13110C' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  ctrlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ctrlBtnOn: { backgroundColor: Colors.accent },
  headerRight: { flexDirection: 'row', gap: 8 },
  stepPillWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  stepPill: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, maxWidth: '55%' },
  stepPillTxt: { fontFamily: Fonts.uiBold, fontSize: 13, color: '#fff' },
  progressTrack: {
    height: 4, marginHorizontal: 22, marginTop: 18,
    borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden', position: 'relative',
  },
  progressFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#fff', borderRadius: 99 },
  progressDivider: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#13110C' },
  body: { flex: 1, paddingHorizontal: 26 },
  bodyContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  stepText: { fontFamily: Fonts.displayMedium, fontSize: 34, color: '#fff', lineHeight: 43 },
  stepTextLarge: { fontSize: 44, lineHeight: 56 },
  timerBtn: { marginTop: 24, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 99 },
  timerBtnTxt: { fontFamily: Fonts.uiBold, color: '#fff', fontSize: 16 },
  activeTimers: { marginTop: 16, gap: 8 },
  timerChip: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12 },
  timerChipDone: { backgroundColor: 'rgba(46,158,87,0.18)', borderWidth: 1, borderColor: Colors.accent },
  timerChipRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  timerChipTxt: { fontFamily: Fonts.uiBold, color: '#fff', fontSize: 14 },
  timerIconBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  timerTrack: { height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginTop: 9 },
  timerTrackFill: { height: '100%', borderRadius: 99, backgroundColor: Colors.accent },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 },
  backBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, height: 56, backgroundColor: '#fff', borderRadius: 99, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  nextBtnTxt: { fontFamily: Fonts.uiBold, color: '#14110c', fontSize: 16 },
  ingrOverlay: { flex: 1, backgroundColor: 'rgba(10,8,4,0.55)', justifyContent: 'flex-end' },
  ingrSheet: { backgroundColor: '#211c15', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: 22, paddingTop: 10, maxHeight: '70%' },
  ingrHandle: { width: 42, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 16 },
  ingrTitle: { fontFamily: Fonts.uiBold, fontSize: 17, color: '#fff', marginBottom: 6 },
  ingrRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ingrTxt: { fontFamily: Fonts.uiRegular, flex: 1, fontSize: 15, color: '#fff' },
  ingrDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  gotItBtn: { marginTop: 16, height: 54, backgroundColor: '#fff', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  gotItTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: '#14110c' },
});
