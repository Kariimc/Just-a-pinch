import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Fonts } from '../../theme';
import { importFromUrl, ocrImage, parseTextRecipe } from '../../services/api';
import { saveRecipe } from '../../store/storage';
import { uid } from '../../utils/id';
import BottomSheet from '../../components/BottomSheet';
import Icon, { IconName } from '../../components/Icon';
import { hapticSuccess } from '../../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMenu'>;

const MENU_ITEMS: { icon: IconName; title: string; sub: string; key: string; ai?: boolean }[] = [
  { icon: 'link',    title: 'Import from link',   sub: 'Paste any recipe URL',           key: 'url' },
  { icon: 'camera',  title: 'Scan a photo or card', sub: 'Camera or photo library · OCR', key: 'ocr' },
  { icon: 'note',    title: 'Paste text',          sub: 'Paste a recipe from anywhere',   key: 'text' },
  { icon: 'pencil',  title: 'Create manually',     sub: 'Type it in yourself',            key: 'manual' },
  { icon: 'sparkle', title: 'Generate with AI',    sub: "Describe it, we'll write it",    key: 'ai', ai: true },
];

export default function AddMenuScreen({ navigation }: Props) {
  const [sheetVisible, setSheetVisible] = useState(true);
  const [urlMode, setUrlMode] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const [url, setUrl] = useState('');
  const [pastedText, setPastedText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState<string[]>([]);

  async function handleImportUrl() {
    if (!url.trim()) return;
    setImporting(true);
    setImportStep(['Fetching page…']);
    try {
      setImportStep(prev => [...prev, 'Parsing ingredients…']);
      const data = await importFromUrl(url.trim());
      setImportStep(prev => [...prev, 'Building recipe…']);
      const recipe: Recipe = {
        id: uid(), title: data.title, description: data.description,
        imageUri: data.imageUrl, imageColor: 'tomato',
        servings: data.servings, prepMinutes: data.prepMinutes, cookMinutes: data.cookMinutes,
        ingredients: data.ingredients.map(i => ({ ...i, id: uid(), checked: false })),
        steps: data.steps.map(s => ({ ...s, id: uid() })),
        tags: data.tags ?? [], collections: [], sourceUrl: data.sourceUrl,
        nutrition: data.nutrition,
        savedAt: Date.now(), createdAt: Date.now(),
      };
      await saveRecipe(recipe);
      hapticSuccess();
      setImporting(false);
      Alert.alert('Saved!', `"${recipe.title}" is in your library.`, [
        { text: 'View recipe', onPress: () => navigation.navigate('RecipeDetail', { recipeId: recipe.id }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setImporting(false);
      Alert.alert('Import failed', e.message ?? 'Could not read that recipe. Try a different link.');
    }
  }

  async function handleImportText() {
    if (!pastedText.trim()) return;
    setImporting(true);
    setImportStep(['Reading your text…']);
    try {
      setImportStep(prev => [...prev, 'Structuring the recipe…']);
      const data = await parseTextRecipe(pastedText.trim());
      setImportStep(prev => [...prev, 'Building recipe…']);
      const recipe: Recipe = {
        id: uid(), title: data.title ?? 'Pasted recipe', description: data.description,
        imageColor: 'greens', servings: data.servings ?? 4,
        prepMinutes: data.prepMinutes ?? 15, cookMinutes: data.cookMinutes ?? 30,
        ingredients: (data.ingredients ?? []).map(i => ({ ...i, id: uid(), checked: false })),
        steps: (data.steps ?? []).map((s, idx) => ({ ...s, id: uid(), number: s.number ?? idx + 1 })),
        tags: data.tags ?? [], collections: [],
        nutrition: data.nutrition,
        savedAt: Date.now(), createdAt: Date.now(),
      };
      await saveRecipe(recipe);
      hapticSuccess();
      setImporting(false);
      Alert.alert('Saved!', `"${recipe.title}" is in your library.`, [
        { text: 'View & edit', onPress: () => navigation.navigate('RecipeEditor', { recipeId: recipe.id }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setImporting(false);
      Alert.alert('Import failed', e.message ?? "Couldn't parse that text. Try cleaning it up.");
    }
  }

  async function launchOCR(useCamera: boolean) {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow access in Settings.'); return; }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7, base64: true });

    if (result.canceled || !result.assets[0]) return;
    const base64 = result.assets[0].base64;
    if (!base64) { Alert.alert('Could not read image'); return; }

    setImporting(true);
    setImportStep(['Reading image…']);
    try {
      setImportStep(prev => [...prev, 'Extracting recipe text…']);
      const data = await ocrImage(base64);
      setImportStep(prev => [...prev, 'Building recipe…']);
      const recipe: Recipe = {
        id: uid(), title: data.title ?? 'Scanned recipe', description: data.description,
        imageColor: 'cream', servings: data.servings ?? 4,
        prepMinutes: data.prepMinutes ?? 15, cookMinutes: data.cookMinutes ?? 30,
        ingredients: (data.ingredients ?? []).map(i => ({ ...i, id: uid(), checked: false })),
        steps: (data.steps ?? []).map((s, idx) => ({ ...s, id: uid(), number: s.number ?? idx + 1 })),
        tags: data.tags ?? [], collections: [],
        nutrition: data.nutrition,
        savedAt: Date.now(), createdAt: Date.now(),
      };
      await saveRecipe(recipe);
      hapticSuccess();
      setImporting(false);
      Alert.alert('Scanned!', `"${recipe.title}" is in your library.`, [
        { text: 'View & edit', onPress: () => navigation.navigate('RecipeEditor', { recipeId: recipe.id }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      setImporting(false);
      Alert.alert('Scan failed', 'Could not read that photo. Try a clearer image.');
    }
  }

  function handleOCRTap() {
    setSheetVisible(false);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        idx => { if (idx === 0) { setSheetVisible(true); return; } launchOCR(idx === 1); }
      );
    } else {
      Alert.alert('Scan recipe', undefined, [
        { text: 'Take Photo', onPress: () => launchOCR(true) },
        { text: 'Choose from Library', onPress: () => launchOCR(false) },
        { text: 'Cancel', style: 'cancel', onPress: () => setSheetVisible(true) },
      ]);
    }
  }

  function handleMenuItem(key: string) {
    setSheetVisible(false);
    if (key === 'url') setUrlMode(true);
    else if (key === 'text') setTextMode(true);
    else if (key === 'ai') (navigation as any).navigate('AIGenerator');
    else if (key === 'manual') (navigation as any).navigate('RecipeEditor');
    else if (key === 'ocr') handleOCRTap();
  }

  // Import progress
  if (importing) {
    return (
      <View style={styles.loadingContainer}>
        {url ? <Text style={styles.urlPreview} numberOfLines={1}>{url}</Text> : null}
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 30 }} />
        <Text style={styles.loadingTitle}>Reading the recipe…</Text>
        <Text style={styles.loadingSub}>Finding ingredients, steps, and timing.</Text>
        <View style={{ marginTop: 22, gap: 11 }}>
          {importStep.map((s, i) => (
            <View key={i} style={styles.checkRow}>
              <View style={styles.checkDone}>
                <Icon name="check" size={13} color="#fff" />
              </View>
              <Text style={styles.checkTxt}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Paste text mode
  if (textMode) {
    return (
      <KeyboardAvoidingView style={styles.urlContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.urlHeader}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setTextMode(false); setSheetVisible(true); }}
          >
            <Icon name="back" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={styles.urlTitle}>Paste a recipe</Text>
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Paste the whole thing — title, ingredients, steps. We'll sort it out."
          placeholderTextColor={Colors.ink3}
          value={pastedText}
          onChangeText={setPastedText}
          multiline
          textAlignVertical="top"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.importBtn, !pastedText.trim() && styles.importBtnDisabled]}
          onPress={handleImportText}
          disabled={!pastedText.trim()}
        >
          <Text style={styles.importBtnTxt}>Import Recipe</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // URL input mode
  if (urlMode) {
    return (
      <KeyboardAvoidingView style={styles.urlContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.urlHeader}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => { setUrlMode(false); setSheetVisible(true); }}
          >
            <Icon name="back" size={20} color={Colors.ink} />
          </TouchableOpacity>
          <Text style={styles.urlTitle}>Import from link</Text>
        </View>
        <TextInput
          style={styles.urlInput}
          placeholder="Paste a recipe URL…"
          placeholderTextColor={Colors.ink3}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleImportUrl}
          autoFocus
        />
        <TouchableOpacity
          style={[styles.importBtn, !url.trim() && styles.importBtnDisabled]}
          onPress={handleImportUrl}
          disabled={!url.trim()}
        >
          <Text style={styles.importBtnTxt}>Import Recipe</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  // Main action sheet
  return (
    <View style={styles.container}>
      <BottomSheet visible={sheetVisible} onClose={() => navigation.goBack()}>
        <Text style={styles.sheetTitle}>Add a recipe</Text>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.key} style={styles.menuRow} onPress={() => handleMenuItem(item.key)}>
            <View style={[styles.menuIconWrap, item.ai && styles.menuIconWrapAI]}>
              <Icon name={item.icon} size={22} color={item.ai ? '#fff' : Colors.ink2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Icon name="fwd" size={20} color={Colors.ink3} />
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  sheetTitle: { fontFamily: Fonts.uiBold, fontSize: 19, color: Colors.ink, marginBottom: 6 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line,
  },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  menuIconWrapAI: { backgroundColor: Colors.accent },
  menuTitle: { fontFamily: Fonts.uiBold, fontSize: 15, color: Colors.ink },
  menuSub: { fontFamily: Fonts.uiRegular, fontSize: 12.5, color: Colors.ink3, marginTop: 1 },

  // URL mode
  urlContainer: { flex: 1, backgroundColor: Colors.paper, padding: 22, paddingTop: 56 },
  urlHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  iconBtn: {
    width: 44, height: 44, borderRadius: Radius.pill,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  urlTitle: { fontFamily: Fonts.uiBold, fontSize: 19, color: Colors.ink },
  urlInput: {
    height: 52, backgroundColor: Colors.surface2, borderRadius: Radius.md,
    paddingHorizontal: 16, fontFamily: Fonts.uiRegular, fontSize: 16, color: Colors.ink,
  },
  textInput: {
    minHeight: 180, maxHeight: 320, backgroundColor: Colors.surface2, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: Fonts.uiRegular, fontSize: 15.5, color: Colors.ink, lineHeight: 21,
  },
  importBtn: { marginTop: 16, height: 54, backgroundColor: Colors.accent, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  importBtnDisabled: { opacity: 0.5 },
  importBtnTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 16, color: '#fff' },

  // Loading state
  loadingContainer: { flex: 1, backgroundColor: Colors.paper, padding: 22, paddingTop: 80, alignItems: 'center' },
  urlPreview: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, maxWidth: '90%' },
  loadingTitle: { fontFamily: Fonts.displayMedium, fontSize: 21, color: Colors.ink, marginTop: 20, letterSpacing: -0.2 },
  loadingSub: { fontFamily: Fonts.uiRegular, fontSize: 14, color: Colors.ink2, marginTop: 8, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDone: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  checkTxt: { fontFamily: Fonts.uiSemiBold, fontSize: 14, color: Colors.ink },
});
