import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import { generateRecipeAI } from '../../services/api';
import { saveRecipe } from '../../store/storage';
import { bumpBadgeStat } from '../../store/badges';
import { uid } from '../../utils/id';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Icon from '../../components/Icon';
import { showToast } from '../../components/Toast';
import { hapticSuccess } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'AIGenerator'>;

const SERVING_OPTIONS = [2, 4, 6];
const TIME_OPTIONS = [20, 40, 60];

export default function AIGeneratorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [servings, setServings] = useState(4);
  const [maxMinutes, setMaxMinutes] = useState(40);
  const [vegetarian, setVegetarian] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [genError, setGenError] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);

  function cycle<T>(options: T[], current: T): T {
    return options[(options.indexOf(current) + 1) % options.length];
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setGenError('Describe what you want to cook first.'); return; }
    setGenerating(true);
    setGenError('');
    setDraft(null);
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
        imageUri: data.imageUrl,
        imageColor: 'soup',
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        ingredients: data.ingredients.map(i => ({ ...i, id: uid(), checked: false })),
        steps: data.steps.map(s => ({ ...s, id: uid() })),
        tags: data.tags ?? [],
        collections: [],
        nutrition: data.nutrition,
        savedAt: Date.now(),
        createdAt: Date.now(),
      };
      setDraft(recipe);
      hapticSuccess();
    } catch (e: any) {
      if (e?.code === 'ai_limit') {
        setGenerating(false);
        navigation.navigate('Paywall', { source: 'settings' });
        return;
      }
      setGenError(e?.message ?? 'Generation failed — try a different prompt.');
    }
    setGenerating(false);
  }

  async function saveDraft(thenEdit: boolean) {
    if (!draft || savingDraft) return;
    setSavingDraft(true);
    try {
      await saveRecipe(draft);
    } catch {
      showToast("Couldn't save — please try again", 'info');
      setSavingDraft(false);
      return;
    }
    bumpBadgeStat('aiGenerated');
    showToast(`"${draft.title}" saved to your library`);
    if (thenEdit) navigation.replace('RecipeEditor', { recipeId: draft.id });
    else navigation.replace('RecipeDetail', { recipeId: draft.id });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.appbar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={20} color={Colors.ink} />
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Icon name="sparkle" size={17} color={Colors.accentDeep} />
          <Text style={styles.appbarTitle}>Generate</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.title}>What are you in the mood for?</Text>
      <TextInput
        style={styles.promptInput}
        placeholder="A cozy high-protein vegetarian dinner that uses up the chickpeas and spinach I have."
        placeholderTextColor={Colors.ink3}
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.constraintLabel}>CONSTRAINTS — TAP TO ADJUST</Text>
      <View style={styles.chips}>
        <Chip label={`Serves ${servings}`} soft active onPress={() => setServings(s => cycle(SERVING_OPTIONS, s))} />
        <Chip label={`≤ ${maxMinutes} min`} soft active onPress={() => setMaxMinutes(m => cycle(TIME_OPTIONS, m))} />
        <Chip label="Vegetarian" soft={vegetarian} active={vegetarian} onPress={() => setVegetarian(v => !v)} />
      </View>

      <Button
        label="Generate recipe"
        onPress={handleGenerate}
        loading={generating}
        style={{ marginTop: 18 }}
        leadingIcon={<Icon name="sparkle" size={18} color="#fff" />}
      />

      {genError ? (
        <View style={styles.errorBox}>
          <Icon name="info" size={15} color={Colors.error} />
          <Text style={styles.errorTxt}>{genError}</Text>
        </View>
      ) : null}

      {generating && (
        <Text style={styles.generatingHint}>Writing your recipe — this takes a few seconds…</Text>
      )}

      {draft && !generating && (
        <View style={styles.draftCard}>
          {draft.imageUri
            ? <Image source={{ uri: draft.imageUri }} style={styles.draftImg} resizeMode="cover" />
            : <FoodPlaceholder variant={draft.imageColor as any} style={styles.draftImg} />}
          <View style={styles.draftBody}>
            <View style={styles.aiBadge}>
              <Icon name="sparkle" size={12} color={Colors.accentInk} />
              <Text style={styles.aiBadgeTxt}>AI draft</Text>
            </View>
            <Text style={styles.draftTitle}>{draft.title}</Text>
            {draft.description ? (
              <Text style={styles.draftDesc} numberOfLines={2}>{draft.description}</Text>
            ) : null}
            <Text style={styles.draftSub}>
              {draft.prepMinutes + draft.cookMinutes} min · serves {draft.servings}
              {draft.nutrition ? ` · ${draft.nutrition.calories} kcal` : ''}
            </Text>
            <View style={styles.draftActions}>
              <Button label="Redo" variant="ghost" small onPress={handleGenerate} disabled={savingDraft} style={{ flex: 1 }} leadingIcon={<Icon name="refresh" size={15} color={Colors.ink} />} />
              <Button label="Edit" variant="ghost" small onPress={() => saveDraft(true)} disabled={savingDraft} style={{ flex: 1 }} leadingIcon={<Icon name="pencil" size={15} color={Colors.ink} />} />
              <Button label="Save" small onPress={() => saveDraft(false)} loading={savingDraft} disabled={savingDraft} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  content: { padding: 18, paddingBottom: 40 },
  appbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  iconBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appbarTitle: { fontFamily: Fonts.uiBold, fontSize: 16, color: Colors.ink },
  title: { fontFamily: Fonts.displayMedium, fontSize: 24, color: Colors.ink, letterSpacing: -0.3, marginBottom: 14 },
  promptInput: {
    minHeight: 84, padding: 14, fontFamily: Fonts.uiRegular, fontSize: 16,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line2,
    borderRadius: Radius.md, color: Colors.ink, textAlignVertical: 'top',
  },
  constraintLabel: { fontFamily: Fonts.uiBold, fontSize: 11.5, letterSpacing: 0.6, color: Colors.ink3, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  generatingHint: { fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2, textAlign: 'center', marginTop: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' },
  errorTxt: { flex: 1, fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.error, lineHeight: 19 },
  draftCard: { marginTop: 20, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  draftImg: { width: '100%', height: 120 },
  draftBody: { padding: 14 },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.accentSoft, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: 9,
  },
  aiBadgeTxt: { fontFamily: Fonts.uiBold, fontSize: 11.5, color: Colors.accentInk },
  draftTitle: { fontFamily: Fonts.displayMedium, fontSize: 20, color: Colors.ink },
  draftDesc: { fontFamily: Fonts.uiRegular, fontSize: 13.5, color: Colors.ink2, marginTop: 4, lineHeight: 19 },
  draftSub: { fontFamily: Fonts.uiSemiBold, fontSize: 13.5, color: Colors.ink2, marginTop: 6 },
  draftActions: { flexDirection: 'row', gap: 9, marginTop: 14 },
});
