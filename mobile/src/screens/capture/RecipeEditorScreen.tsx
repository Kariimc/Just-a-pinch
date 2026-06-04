import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, Ingredient, Step } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import { saveRecipe, getRecipe } from '../../store/storage';
import { uid } from '../../utils/id';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeEditor'>;

export default function RecipeEditorScreen({ route, navigation }: Props) {
  const editId = route.params?.recipeId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepMin, setPrepMin] = useState(15);
  const [cookMin, setCookMin] = useState(30);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: uid(), quantity: '', unit: '', name: '' },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { id: uid(), number: 1, text: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      getRecipe(editId).then(r => {
        if (r) {
          setTitle(r.title);
          setDescription(r.description ?? '');
          setServings(r.servings);
          setPrepMin(r.prepMinutes);
          setCookMin(r.cookMinutes);
          setIngredients(r.ingredients.length ? r.ingredients : [{ id: uid(), quantity: '', unit: '', name: '' }]);
          setSteps(r.steps.length ? r.steps : [{ id: uid(), number: 1, text: '' }]);
        }
      });
    }
  }, [editId]);

  function addIngredient() {
    setIngredients(prev => [...prev, { id: uid(), quantity: '', unit: '', name: '' }]);
  }

  function updateIngredient(id: string, field: keyof Ingredient, value: string) {
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  function removeIngredient(id: string) {
    setIngredients(prev => prev.filter(i => i.id !== id));
  }

  function addStep() {
    setSteps(prev => [...prev, { id: uid(), number: prev.length + 1, text: '' }]);
  }

  function updateStep(id: string, text: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, number: i + 1 })));
  }

  async function handleSave() {
    if (!title.trim()) { Alert.alert('Please add a recipe title'); return; }
    setSaving(true);
    const recipe: Recipe = {
      id: editId ?? uid(),
      title: title.trim(),
      description: description.trim() || undefined,
      imageColor: 'toast',
      servings,
      prepMinutes: prepMin,
      cookMinutes: cookMin,
      ingredients: ingredients.filter(i => i.name.trim()),
      steps: steps.filter(s => s.text.trim()),
      tags: [],
      collections: [],
      savedAt: Date.now(),
      createdAt: Date.now(),
    };
    await saveRecipe(recipe);
    setSaving(false);
    navigation.navigate('RecipeDetail', { recipeId: recipe.id });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Appbar */}
        <View style={styles.appbar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.appbarTitle}>{editId ? 'Edit recipe' : 'New recipe'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveTxt}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Cover photo placeholder */}
        <View style={styles.coverPlaceholder}>
          <Text style={{ fontSize: 26 }}>📷</Text>
          <Text style={styles.coverTxt}>Add cover photo</Text>
        </View>

        <TextInput style={styles.titleInput} placeholder="Recipe title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.descInput} placeholder="A short note about this recipe…" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatInput label="Serves" value={String(servings)} onChange={v => setServings(Number(v) || servings)} />
          <StatInput label="Prep (min)" value={String(prepMin)} onChange={v => setPrepMin(Number(v) || prepMin)} numeric />
          <StatInput label="Cook (min)" value={String(cookMin)} onChange={v => setCookMin(Number(v) || cookMin)} numeric />
        </View>

        {/* Ingredients */}
        <View style={styles.sectionHeader}>
          <Text style={styles.secTitle}>Ingredients</Text>
        </View>
        {ingredients.map((ing, idx) => (
          <View key={ing.id} style={styles.ingredientRow}>
            <TextInput style={[styles.ingrInput, { width: 50 }]} placeholder="Qty" value={ing.quantity} onChangeText={v => updateIngredient(ing.id, 'quantity', v)} />
            <TextInput style={[styles.ingrInput, { width: 60 }]} placeholder="Unit" value={ing.unit} onChangeText={v => updateIngredient(ing.id, 'unit', v)} />
            <TextInput style={[styles.ingrInput, { flex: 1 }]} placeholder="Ingredient" value={ing.name} onChangeText={v => updateIngredient(ing.id, 'name', v)} />
            {ingredients.length > 1 && (
              <TouchableOpacity onPress={() => removeIngredient(ing.id)}>
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <Button label="+ Add ingredient" variant="ghost" small onPress={addIngredient} style={styles.addBtn} />

        {/* Steps */}
        <Text style={styles.secTitle}>Steps</Text>
        {steps.map((step, idx) => (
          <View key={step.id} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{step.number}</Text></View>
            <TextInput
              style={[styles.ingrInput, { flex: 1 }]}
              placeholder={`Step ${step.number}…`}
              value={step.text}
              onChangeText={v => updateStep(step.id, v)}
              multiline
            />
            {steps.length > 1 && (
              <TouchableOpacity onPress={() => removeStep(step.id)}>
                <Text style={styles.removeTxt}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <Button label="+ Add step" variant="ghost" small onPress={addStep} style={styles.addBtn} />

        <Button label="Save recipe" onPress={handleSave} loading={saving} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function StatInput({ label, value, onChange, numeric }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: Colors.ink3, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={styles.statInput}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'number-pad' : 'default'}
        textAlign="center"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 18, paddingTop: 14, paddingBottom: 40 },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: Colors.ink3 },
  appbarTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  saveTxt: { fontSize: 15, fontWeight: '700', color: Colors.accentDeep },
  coverPlaceholder: { height: 120, backgroundColor: Colors.surface2, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.line2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8 },
  coverTxt: { fontWeight: '600', fontSize: 13.5, color: Colors.ink2 },
  titleInput: { marginTop: 14, height: 56, backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 16, fontSize: 19, color: Colors.ink, fontWeight: '600' },
  descInput: { marginTop: 11, minHeight: 64, backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: Colors.ink },
  statsRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  statInput: { height: 44, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, width: '100%', fontSize: 16, fontWeight: '700', color: Colors.ink },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 },
  secTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink, marginTop: 20, marginBottom: 6 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  ingrInput: { height: 44, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line, borderRadius: Radius.md, paddingHorizontal: 10, fontSize: 14.5, color: Colors.ink },
  removeTxt: { fontSize: 16, color: Colors.ink3, paddingHorizontal: 4 },
  addBtn: { alignSelf: 'flex-start', marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  stepNumTxt: { fontWeight: '700', fontSize: 14, color: Colors.accentInk },
});
