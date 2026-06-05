import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius } from '../../theme';
import { importFromUrl, ocrImage } from '../../services/api';
import { saveRecipe } from '../../store/storage';
import { uid } from '../../utils/id';
import BottomSheet from '../../components/BottomSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeEditor'>;

const MENU_ITEMS = [
  { icon: '🔗', title: 'Import from link', sub: 'Paste any recipe URL', key: 'url' },
  { icon: '📷', title: 'Scan a photo or card', sub: 'Camera or photo library · OCR', key: 'ocr' },
  { icon: '✏️', title: 'Create manually', sub: 'Type it in yourself', key: 'manual' },
  { icon: '✨', title: 'Generate with AI', sub: 'Describe it, we\'ll write it', key: 'ai' },
];

export default function AddMenuScreen({ navigation }: Props) {
  const [sheetVisible, setSheetVisible] = useState(true);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStep, setImportStep] = useState<string[]>([]);

  // ── URL import ────────────────────────────────────────────────────────────

  async function handleImportUrl() {
    if (!url.trim()) return;
    setImporting(true);
    setImportStep(['Fetching page…']);
    try {
      setImportStep(prev => [...prev, 'Parsing ingredients…']);
      const data = await importFromUrl(url.trim());
      setImportStep(prev => [...prev, 'Building recipe…']);

      const recipe: Recipe = {
        id: uid(),
        title: data.title,
        description: data.description,
        imageUri: data.imageUrl,
        imageColor: 'tomato',
        servings: data.servings,
        prepMinutes: data.prepMinutes,
        cookMinutes: data.cookMinutes,
        ingredients: data.ingredients.map(i => ({ ...i, id: uid(), checked: false })),
        steps: data.steps.map(s => ({ ...s, id: uid() })),
        tags: data.tags ?? [],
        collections: [],
        sourceUrl: data.sourceUrl,
        savedAt: Date.now(),
        createdAt: Date.now(),
      };

      await saveRecipe(recipe);
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

  // ── OCR / Photo import ────────────────────────────────────────────────────

  async function launchOCR(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access in Settings.');
      return;
    }

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
        id: uid(),
        title: data.title ?? 'Scanned recipe',
        description: data.description,
        imageColor: 'cream',
        servings: data.servings ?? 4,
        prepMinutes: data.prepMinutes ?? 15,
        cookMinutes: data.cookMinutes ?? 30,
        ingredients: (data.ingredients ?? []).map(i => ({ ...i, id: uid(), checked: false })),
        steps: (data.steps ?? []).map((s, idx) => ({ ...s, id: uid(), number: s.number ?? idx + 1 })),
        tags: data.tags ?? [],
        collections: [],
        savedAt: Date.now(),
        createdAt: Date.now(),
      };

      await saveRecipe(recipe);
      setImporting(false);
      Alert.alert('Scanned!', `"${recipe.title}" is in your library.`, [
        { text: 'View & edit', onPress: () => navigation.navigate('RecipeEditor', { recipeId: recipe.id }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setImporting(false);
      Alert.alert('Scan failed', 'Could not read that photo. Try a clearer image.');
    }
  }

  function handleOCRTap() {
    setSheetVisible(false);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        idx => {
          if (idx === 0) { setSheetVisible(true); return; }
          launchOCR(idx === 1);
        }
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
    if (key === 'url') { setUrlMode(true); }
    else if (key === 'ai') { (navigation as any).navigate('AIGenerator'); }
    else if (key === 'manual') { (navigation as any).navigate('RecipeEditor'); }
    else if (key === 'ocr') { handleOCRTap(); }
  }

  // ── Loading state ─────────────────────────────────────────────────────────

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
              <View style={styles.checkDone}><Text style={{ color: '#fff', fontSize: 11 }}>✓</Text></View>
              <Text style={styles.checkTxt}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── URL input mode ────────────────────────────────────────────────────────

  if (urlMode) {
    return (
      <KeyboardAvoidingView style={styles.urlContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.urlHeader}>
          <TouchableOpacity onPress={() => { setUrlMode(false); setSheetVisible(true); }}>
            <Text style={styles.cancelTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.urlTitle}>Import from link</Text>
        </View>
        <TextInput
          style={styles.urlInput}
          placeholder="Paste a recipe URL…"
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

  // ── Main sheet ────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <BottomSheet visible={sheetVisible} onClose={() => navigation.goBack()}>
        <Text style={styles.sheetTitle}>Add a recipe</Text>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity key={item.key} style={styles.menuRow} onPress={() => handleMenuItem(item.key)}>
            <View style={[styles.menuIcon, item.key === 'ai' && styles.menuIconAI]}>
              <Text style={styles.menuEmoji}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            <Text style={{ color: Colors.ink3, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.line },
  menuIcon: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  menuIconAI: { backgroundColor: Colors.accent },
  menuEmoji: { fontSize: 20 },
  menuTitle: { fontWeight: '700', fontSize: 15, color: Colors.ink },
  menuSub: { fontSize: 12.5, color: Colors.ink3, marginTop: 1 },
  urlContainer: { flex: 1, backgroundColor: Colors.paper, padding: 22, paddingTop: 56 },
  urlHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  cancelTxt: { fontSize: 16, color: Colors.ink2 },
  urlTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink },
  urlInput: { height: 52, backgroundColor: Colors.surface2, borderRadius: Radius.md, paddingHorizontal: 16, fontSize: 16, color: Colors.ink },
  importBtn: { marginTop: 16, height: 54, backgroundColor: Colors.accent, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  importBtnDisabled: { opacity: 0.5 },
  importBtnTxt: { fontWeight: '600', fontSize: 16, color: '#fff' },
  loadingContainer: { flex: 1, backgroundColor: Colors.paper, padding: 22, paddingTop: 80, alignItems: 'center' },
  urlPreview: { fontSize: 14, color: Colors.ink2, maxWidth: '90%' },
  loadingTitle: { fontSize: 21, fontWeight: '600', color: Colors.ink, marginTop: 20, letterSpacing: -0.2 },
  loadingSub: { fontSize: 14, color: Colors.ink2, marginTop: 8, textAlign: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkDone: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  checkTxt: { fontSize: 14, fontWeight: '600', color: Colors.ink },
});
