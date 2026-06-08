import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import { RootStackParamList, Recipe, Step } from '../../types';
import { Colors, Radius } from '../../theme';
import { getRecipe } from '../../store/storage';
import { hapticStep, hapticSuccess } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'CookingMode'>;

interface TimerState {
  label: string;
  totalSeconds: number;
  remaining: number;
  running: boolean;
}

export default function CookingModeScreen({ route, navigation }: Props) {
  useKeepAwake();
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [showIngr, setShowIngr] = useState(false);
  const [timers, setTimers] = useState<TimerState[]>([]);
  const [checkedIngr, setCheckedIngr] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getRecipe(recipeId).then(r => { if (r) setRecipe(r); });
  }, [recipeId]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (!t.running || t.remaining <= 0) return t;
        const next = t.remaining - 1;
        if (next === 0) Alert.alert('Timer done!', `${t.label} timer finished!`);
        return { ...t, remaining: next, running: next > 0 };
      }));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startTimer(step: Step) {
    if (!step.timerSeconds) return;
    const label = `Step ${step.number}`;
    setTimers(prev => [...prev, { label, totalSeconds: step.timerSeconds!, remaining: step.timerSeconds!, running: true }]);
  }

  function fmtTimer(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  if (!recipe) return <View style={styles.loading}><Text style={styles.loadingTxt}>Loading…</Text></View>;

  const steps = recipe.steps;
  const current = steps[stepIndex];
  const progress = (stepIndex + 1) / steps.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.ctrlTxt}>✕</Text>
        </TouchableOpacity>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillTxt}>Step {stepIndex + 1} of {steps.length}</Text>
        </View>
        <TouchableOpacity style={styles.ctrlBtn} onPress={() => setShowIngr(true)}>
          <Text style={styles.ctrlTxt}>📋</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= stepIndex ? '#fff' : 'rgba(255,255,255,0.22)' }]} />
        ))}
      </View>

      {/* Step content */}
      <View style={styles.body}>
        <Text style={styles.stepText}>{current?.text}</Text>
        {current?.timerSeconds && (
          <TouchableOpacity style={styles.timerBtn} onPress={() => startTimer(current)}>
            <Text style={styles.timerBtnTxt}>⏱  Start {fmtTimer(current.timerSeconds)} timer</Text>
          </TouchableOpacity>
        )}

        {/* Active timers */}
        {timers.length > 0 && (
          <View style={styles.activeTimers}>
            {timers.map((t, i) => (
              <View key={i} style={styles.timerChip}>
                <Text style={styles.timerChipTxt}>{t.label}: {fmtTimer(t.remaining)}</Text>
                <TouchableOpacity onPress={() => setTimers(prev => prev.map((x, j) => j === i ? { ...x, running: !x.running } : x))}>
                  <Text style={styles.timerChipTxt}>{t.running ? '⏸' : '▶'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setStepIndex(i => Math.max(0, i - 1))}
          disabled={stepIndex === 0}
        >
          <Text style={styles.backBtnTxt}>←</Text>
        </TouchableOpacity>
        {stepIndex < steps.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => { hapticStep(); setStepIndex(i => i + 1); }}>
            <Text style={styles.nextBtnTxt}>Next step →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={() => { hapticSuccess(); navigation.goBack(); }}>
            <Text style={styles.nextBtnTxt}>Done! 🎉</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ingredient overlay */}
      <Modal visible={showIngr} transparent animationType="slide" onRequestClose={() => setShowIngr(false)}>
        <View style={styles.ingrOverlay}>
          <View style={styles.ingrSheet}>
            <View style={styles.ingrHandle} />
            <Text style={styles.ingrTitle}>Ingredients</Text>
            <ScrollView>
              {recipe.ingredients.map(ing => (
                <TouchableOpacity
                  key={ing.id}
                  style={styles.ingrRow}
                  onPress={() => setCheckedIngr(prev => { const n = new Set(prev); n.has(ing.id) ? n.delete(ing.id) : n.add(ing.id); return n; })}
                >
                  <View style={[styles.check, checkedIngr.has(ing.id) && styles.checkOn]}>
                    {checkedIngr.has(ing.id) && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
                  </View>
                  <Text style={[styles.ingrTxt, checkedIngr.has(ing.id) && styles.ingrDone]}>
                    <Text style={{ fontWeight: '700' }}>{ing.quantity} {ing.unit}</Text> {ing.name}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#13110C' },
  loading: { flex: 1, backgroundColor: '#13110C', alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { color: '#fff', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 22 },
  ctrlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  ctrlTxt: { fontSize: 18, color: '#fff' },
  stepPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99 },
  stepPillTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  dots: { flexDirection: 'row', gap: 6, paddingHorizontal: 22, marginTop: 18 },
  dot: { flex: 1, height: 4, borderRadius: 99 },
  body: { flex: 1, paddingHorizontal: 26, justifyContent: 'center' },
  stepText: { fontSize: 36, fontWeight: '500', color: '#fff', lineHeight: 44 },
  timerBtn: { marginTop: 24, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 99 },
  timerBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  activeTimers: { marginTop: 16, gap: 8 },
  timerChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  timerChipTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingBottom: 44 },
  backBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  backBtnTxt: { color: '#fff', fontSize: 22 },
  nextBtn: { flex: 1, height: 56, backgroundColor: '#fff', borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  nextBtnTxt: { color: '#14110c', fontWeight: '700', fontSize: 16 },
  ingrOverlay: { flex: 1, backgroundColor: 'rgba(10,8,4,0.55)', justifyContent: 'flex-end' },
  ingrSheet: { backgroundColor: '#211c15', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, paddingHorizontal: 22, paddingBottom: 36, paddingTop: 10, maxHeight: '70%' },
  ingrHandle: { width: 42, height: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'center', marginBottom: 16 },
  ingrTitle: { fontWeight: '700', fontSize: 17, color: '#fff', marginBottom: 6 },
  ingrRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ingrTxt: { flex: 1, fontSize: 15, color: '#fff' },
  ingrDone: { opacity: 0.5, textDecorationLine: 'line-through' },
  gotItBtn: { marginTop: 16, height: 54, backgroundColor: '#fff', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  gotItTxt: { fontWeight: '600', fontSize: 16, color: '#14110c' },
});
