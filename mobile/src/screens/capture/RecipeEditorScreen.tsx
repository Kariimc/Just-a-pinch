import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Image, ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe, Ingredient, Step } from '../../types';
import { Colors, Radius } from '../../theme';
import { saveRecipe, getRecipe } from '../../store/storage';
import { uploadRecipeImage } from '../../lib/db';
import { uid } from '../../utils/id';
import Button from '../../components/Button';
import FoodPlaceholder from '../../components/FoodPlaceholder';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeEditor'>;

export default function RecipeEditorScreen({ route, navigation }: Props) {
  const editId = route.params?.recipeId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(4);
  const [prepMin, setPrepMin] = useState(15);
  const [cookMin, setCookMin] = useState(30);
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageColor, setImageColor] = useState('toast');
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
          setImageUri(r.imageUri);
          setImageColor(r.imageColor ?? 'toast');
          setIngredients(r.ingredients.length ? r.ingredients : [{ id: uid(), quantity: '', unit: '', name: '' }]);
          setSteps(r.steps.length ? r.steps : [{ id: uid(), number: 1, text: '' }]);
        }
      });
    }
  }, [editId]);

  async function pickImage(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access in Settings.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  function handleCoverPhotoTap() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        idx => { if (idx === 1) pickImage(true); else if (idx === 2) pickImage(false); }
      );
    } else {
      Alert.alert('Add cover photo', undefined, [
        { text: 'Take Photo', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }

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

    const recipeId = editId ?? uid();
    let finalImageUri = imageUri;

    if (imageUri && imageUri.startsWith('file://')) {
      finalImageUri = await uploadRecipeImage(imageUri, recipeId);
    }

    const recipe: Recipe = {
      id: recipeId,
      title: title.trim(),
      description: description.trim() || undefined,
      imageUri: finalImageUri,
      imageColor: finalImageUri ? undefined : imageColor,
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

        {/* Cover photo */}
        <TouchableOpacity style={styles.coverPlaceholder} onPress={handleCoverPhotoTap} activeOpacity={0.8}>
          {imageUri ? (
            <>
              <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={styles.coverOverlay}>
                <Text style={styles.coverEditTxt}>📷  Change photo</Text>
              </View>
            </>
          ) : (
            <>
              <FoodPlaceholder variant={imageColor as any} style={StyleSheet.absoluteFill} />
              <View style={styles.coverOverlay}>
                <Text style={{ fontSize: 26 }}>📷</Text>
                <Text style={styles.coverTxt}>Add cover photo</Text>
              </View>
            </>
          )}
        </TouchableOpacity>

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
        {ingredients.map((ing) => (
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
        {steps.map((step) => (
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
  coverPlaceholder: { height: 160, backgroundColor: Colors.surface2, borderRadius: Radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)', gap: 6 },
  coverTxt: { fontWeight: '600', fontSize: 13.5, color: '#fff' },
  coverEditTxt: { fontWeight: '600', fontSize: 13.5, color: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
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
