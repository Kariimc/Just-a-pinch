import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius } from '../../theme';
import { generateRecipeAI } from '../../services/api';
import { saveRecipe } from '../../store/storage';
import { uid } from '../../utils/id';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import FoodPlaceholder from '../../components/FoodPlaceholder';

type Props = NativeStackScreenProps<RootStackParamList, 'AIGenerator'>;

export default function AIGeneratorScreen({ navigation }: Props) {
  const [prompt, setPrompt] = useState('');
  const [servings, setServings] = useState(4);
  const [maxMinutes, setMaxMinutes] = useState(40);
  const [vegetarian, setVegetarian] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Recipe | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) { Alert.alert('Describe what you want to cook'); return; }
    setGenerating(true);
    try {
      const data = await generateRecipeAI(prompt, {
        servings,
        maxMinutes,
        vegetarian,
      });
      const recipe: Recipe = {
        id: uid(),
        title: data.title,
        description: data.description,
        imageColor: 'soup',
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        ingredients: data.ingredients.map(i => ({ ...i, id: uid(), checked: false })),
        steps: data.steps.map(s => ({ ...s, id: uid() })),
        tags: data.tags ?? [],
        collections: [],
        savedAt: Date.now(),
        createdAt: Date.now(),
      };
      setDraft(recipe);
    } catch (e: any) {
      Alert.alert('Generation failed', e.message ?? 'Try a different prompt.');
    }
    setGenerating(false);
  }

  async function saveDraft() {
    if (!draft) return;
    await saveRecipe(draft);
    navigation.navigate('RecipeDetail', { recipeId: draft.id });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.appbar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>✨ Generate</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.title}>What are you in the mood for?</Text>
      <TextInput
        style={styles.promptInput}
        placeholder="A cozy high-protein vegetarian dinner that uses up the chickpeas and spinach I have."
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.constraintLabel}>CONSTRAINTS</Text>
      <View style={styles.chips}>
        <Chip label={`Serves ${servings}`} active />
        <Chip label={`≤ ${maxMinutes} min`} active />
        <Chip label="Vegetarian" soft={vegetarian} active={vegetarian} onPress={() => setVegetarian(v => !v)} />
      </View>

      <Button label="✨  Generate recipe" onPress={handleGenerate} loading={generating} style={{ marginTop: 18 }} />

      {draft && (
        <View style={styles.draftCard}>
          <FoodPlaceholder variant={draft.imageColor as any} style={styles.draftImg} />
          <View style={styles.draftBody}>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeTxt}>✨ AI draft</Text></View>
            <Text style={styles.draftTitle}>{draft.title}</Text>
            <Text style={styles.draftSub}>
              {draft.prepMinutes + draft.cookMinutes} min · serves {draft.servings}
            </Text>
            <View style={styles.draftActions}>
              <Button label="↺ Redo" variant="ghost" small onPress={handleGenerate} style={{ flex: 1 }} />
              <Button label="Edit & save" small onPress={saveDraft} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 18, paddingTop: 14, paddingBottom: 40 },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  backTxt: { fontSize: 22, color: Colors.ink },
  appbarTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  title: { fontSize: 24, fontWeight: '600', color: Colors.ink, letterSpacing: -0.3, marginBottom: 14 },
  promptInput: { minHeight: 84, padding: 14, fontSize: 16, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2, borderRadius: Radius.md, color: Colors.ink },
  constraintLabel: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.12, color: Colors.ink3, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  draftCard: { marginTop: 20, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  draftImg: { width: '100%', height: 120 },
  draftBody: { padding: 14 },
  aiBadge: { backgroundColor: Colors.accentSoft, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: 9 },
  aiBadgeTxt: { fontSize: 11.5, fontWeight: '700', color: Colors.accentInk },
  draftTitle: { fontSize: 20, fontWeight: '600', color: Colors.ink },
  draftSub: { fontSize: 13.5, color: Colors.ink2, marginTop: 4 },
  draftActions: { flexDirection: 'row', gap: 9, marginTop: 14 },
});
