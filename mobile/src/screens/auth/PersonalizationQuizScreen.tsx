import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import { getProfile, saveProfile } from '../../store/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalizationQuiz'>;

const DIETARY = ['Vegetarian','Vegan','Gluten-free','Keto','Pescatarian','Dairy-free','Low-carb','Paleo','Halal','No restrictions'];
const SKILLS = [
  { key: 'beginner', label: 'Just getting comfortable', sub: 'Clear steps, no jargon' },
  { key: 'confident', label: 'Confident home cook', sub: 'I improvise happily' },
];

export default function PersonalizationQuizScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [dietary, setDietary] = useState<string[]>([]);
  const [skill, setSkill] = useState<'beginner' | 'confident'>('confident');
  const [household, setHousehold] = useState(2);

  function toggleDiet(d: string) {
    setDietary(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  async function finish() {
    const profile = await getProfile();
    if (profile) {
      await saveProfile({ ...profile, dietaryPrefs: dietary, skillLevel: skill, householdSize: household });
    }
    navigation.replace('Main');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.stepTxt}>Step {step + 1} of 2</Text>
        <TouchableOpacity onPress={() => navigation.replace('Main')}>
          <Text style={styles.skip}>Skip for now</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bar}><View style={[styles.barFill, { width: `${((step + 1) / 2) * 100}%` }]} /></View>

      {step === 0 && (
        <>
          <Text style={styles.title}>How do you eat?</Text>
          <Text style={styles.sub}>Pick any that apply — we'll filter and flag for you.</Text>
          <View style={styles.chips}>
            {DIETARY.map(d => (
              <Chip key={d} label={d} active={dietary.includes(d)} onPress={() => toggleDiet(d)} />
            ))}
          </View>
          <Button label="Continue →" onPress={() => setStep(1)} style={{ marginTop: 26 }} />
        </>
      )}

      {step === 1 && (
        <>
          <Text style={styles.title}>A bit about your kitchen</Text>
          <Text style={styles.sub}>Sets your default servings and the right level of detail.</Text>
          <Text style={styles.label}>Cooking confidence</Text>
          {SKILLS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.skillCard, skill === s.key && styles.skillCardOn]}
              onPress={() => setSkill(s.key as any)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.skillTitle}>{s.label}</Text>
                <Text style={styles.skillSub}>{s.sub}</Text>
              </View>
              <View style={[styles.check, skill === s.key && styles.checkOn]}>
                {skill === s.key && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
          <Text style={[styles.label, { marginTop: 18 }]}>Household size</Text>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>People at the table</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setHousehold(h => Math.max(1, h - 1))}>
                <Text style={styles.stepBtnTxt}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{household}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setHousehold(h => h + 1)}>
                <Text style={styles.stepBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Button label="Let's cook →" onPress={finish} style={{ marginTop: 24 }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 22, paddingTop: 56, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepTxt: { fontSize: 12.5, fontWeight: '700', color: Colors.ink2 },
  skip: { fontSize: 13.5, fontWeight: '700', color: Colors.accentDeep },
  bar: { height: 6, borderRadius: 99, backgroundColor: Colors.surface2, marginTop: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 99 },
  title: { fontSize: 24, fontWeight: '600', color: Colors.ink, marginTop: 22, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: Colors.ink2, marginTop: 6, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.ink2, marginBottom: 10, marginTop: 22 },
  skillCard: { padding: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, gap: 13, marginBottom: 10 },
  skillCardOn: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  skillTitle: { fontWeight: '700', fontSize: 15, color: Colors.ink },
  skillSub: { fontSize: 12.5, color: Colors.ink3, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.line2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, padding: 13 },
  stepperLabel: { fontWeight: '600', fontSize: 14.5, color: Colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.line2, borderRadius: Radius.pill, overflow: 'hidden' },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepBtnTxt: { fontSize: 19, color: Colors.ink },
  stepVal: { minWidth: 46, textAlign: 'center', fontWeight: '700', fontSize: 15, color: Colors.ink },
});
