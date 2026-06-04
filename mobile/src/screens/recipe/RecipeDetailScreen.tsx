import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Recipe } from '../../types';
import { Colors, Radius, Spacing } from '../../theme';
import { getRecipe, saveRecipe, getShoppingItems, saveShoppingItems } from '../../store/storage';
import { formatTime, scaleQuantity, uid } from '../../utils/id';
import FoodPlaceholder from '../../components/FoodPlaceholder';
import Button from '../../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'RecipeDetail'>;
type Tab = 'ingredients' | 'method' | 'nutrition';
type Unit = 'us' | 'metric';

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState(4);
  const [unit, setUnit] = useState<Unit>('us');
  const [checkedIngr, setCheckedIngr] = useState<Set<string>>(new Set());

  useEffect(() => {
    getRecipe(recipeId).then(r => {
      if (r) { setRecipe(r); setServings(r.servings); }
    });
  }, [recipeId]);

  async function addToShoppingList() {
    if (!recipe) return;
    const existing = await getShoppingItems();
    const newItems = recipe.ingredients.map(ing => ({
      id: uid(),
      name: ing.name,
      quantity: scaleQuantity(ing.quantity, recipe.servings, servings),
      unit: ing.unit,
      category: 'Uncategorised',
      checked: false,
      recipeIds: [recipe.id],
    }));
    await saveShoppingItems([...existing, ...newItems]);
    Alert.alert('Added!', `${newItems.length} ingredients added to your shopping list.`);
  }

  function toggleIngr(id: string) {
    setCheckedIngr(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (!recipe) return <View style={styles.loading}><Text>Loading…</Text></View>;

  const totalMin = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero */}
        <View style={{ height: 248 }}>
          {recipe.imageUri
            ? <Image source={{ uri: recipe.imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <FoodPlaceholder variant={recipe.imageColor as any} style={StyleSheet.absoluteFill} />}
          <View style={styles.heroOverlay}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.iconBtnTxt}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconBtnTxt}>🔖</Text></TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconBtnTxt}>⋯</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{recipe.collections[0] ?? 'My recipes'}</Text>
          <Text style={styles.title}>{recipe.title}</Text>
          <View style={styles.metaRow}>
            {recipe.rating ? <Text style={styles.rating}>★ {recipe.rating}</Text> : null}
            {recipe.cookedCount ? <Text style={styles.meta}>· {recipe.cookedCount} cooks</Text> : null}
            {recipe.sourceUrl ? <Text style={styles.meta}>· from web</Text> : null}
          </View>

          {/* Stats */}
          <View style={styles.statsCard}>
            <StatItem label="Prep" value={formatTime(recipe.prepMinutes)} />
            <StatItem label="Cook" value={formatTime(recipe.cookMinutes)} />
            <StatItem label="Total" value={formatTime(totalMin)} />
            <StatItem label="Cal" value={recipe.nutrition ? String(recipe.nutrition.calories) : '—'} />
          </View>

          {/* Servings + Unit */}
          <View style={styles.controls}>
            <View style={styles.stepperRow}>
              <Text style={styles.controlLabel}>Servings</Text>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(s => Math.max(1, s - 1))}>
                  <Text style={styles.stepBtnTxt}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{servings}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setServings(s => s + 1)}>
                  <Text style={styles.stepBtnTxt}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.seg}>
              <TouchableOpacity style={[styles.segBtn, unit === 'us' && styles.segActive]} onPress={() => setUnit('us')}>
                <Text style={[styles.segTxt, unit === 'us' && styles.segActiveTxt]}>US</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segBtn, unit === 'metric' && styles.segActive]} onPress={() => setUnit('metric')}>
                <Text style={[styles.segTxt, unit === 'metric' && styles.segActiveTxt]}>Metric</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['ingredients','method','nutrition'] as Tab[]).map(t => (
              <TouchableOpacity key={t} style={[styles.tabItem, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabTxt, tab === t && styles.tabActiveTxt]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'ingredients' && (
            <View>
              <View style={styles.ingrHeader}>
                <Text style={styles.secTitle}>{recipe.ingredients.length} ingredients</Text>
                <Text style={styles.scaled}>Scaled for {servings}</Text>
              </View>
              {recipe.ingredients.map(ing => (
                <TouchableOpacity key={ing.id} style={styles.ingrRow} onPress={() => toggleIngr(ing.id)}>
                  <View style={[styles.check, checkedIngr.has(ing.id) && styles.checkOn]}>
                    {checkedIngr.has(ing.id) && <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>}
                  </View>
                  <Text style={[styles.ingrTxt, checkedIngr.has(ing.id) && styles.ingrDone]}>
                    <Text style={{ fontWeight: '700' }}>{scaleQuantity(ing.quantity, recipe.servings, servings)} {ing.unit}</Text> {ing.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <Button label="🛒  Add all to shopping list" variant="ghost" onPress={addToShoppingList} style={{ marginTop: 14 }} />
            </View>
          )}

          {tab === 'method' && (
            <View>
              {recipe.steps.map(step => (
                <View key={step.id} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumTxt}>{step.number}</Text></View>
                  <Text style={styles.stepTxt}>{step.text}</Text>
                </View>
              ))}
            </View>
          )}

          {tab === 'nutrition' && recipe.nutrition && (
            <View style={styles.nutritionCard}>
              <View style={styles.calRow}>
                <Text style={styles.calLabel}>Per serving</Text>
                <Text style={styles.calVal}>{recipe.nutrition.calories} <Text style={styles.calUnit}>kcal</Text></Text>
              </View>
              <NutrBar label="Carbs" value={recipe.nutrition.carbs} max={80} color={Colors.accent} />
              <NutrBar label="Protein" value={recipe.nutrition.protein} max={60} color={Colors.accentDeep} />
              <NutrBar label="Fat" value={recipe.nutrition.fat} max={60} color="#D9602F" />
            </View>
          )}

          {recipe.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesTxt}>"{recipe.notes}"</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <Button label="🔥  Start Cooking" onPress={() => navigation.navigate('CookingMode', { recipeId })} />
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statKey}>{label}</Text>
    </View>
  );
}

function NutrBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.nutrLabel}>{label}</Text>
        <Text style={styles.nutrLabel}>{value}g</Text>
      </View>
      <View style={styles.nutrTrack}>
        <View style={[styles.nutrFill, { width: `${Math.min(100, (value / max) * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.paper },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 52, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  iconBtnTxt: { fontSize: 18 },
  body: { padding: 18, paddingTop: 16 },
  eyebrow: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.14, textTransform: 'uppercase', color: Colors.accentDeep },
  title: { fontSize: 28, fontWeight: '600', color: Colors.ink, marginTop: 8, lineHeight: 33 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  rating: { color: Colors.accentDeep, fontWeight: '700', fontSize: 13.5 },
  meta: { fontSize: 13.5, color: Colors.ink2 },
  statsCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, marginTop: 16, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 13, borderLeftWidth: 1, borderLeftColor: Colors.line },
  statVal: { fontWeight: '700', fontSize: 15, color: Colors.ink },
  statKey: { fontSize: 11, color: Colors.ink2, marginTop: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  controlLabel: { fontWeight: '700', fontSize: 14.5, color: Colors.ink, marginRight: 11 },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.line2, borderRadius: Radius.pill, overflow: 'hidden' },
  stepBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  stepBtnTxt: { fontSize: 19, color: Colors.ink },
  stepVal: { minWidth: 46, textAlign: 'center', fontWeight: '700', fontSize: 15, color: Colors.ink },
  seg: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 4, gap: 2 },
  segBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: Radius.pill },
  segActive: { backgroundColor: Colors.surface },
  segTxt: { fontWeight: '600', fontSize: 13.5, color: Colors.ink2 },
  segActiveTxt: { color: Colors.ink },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface2, borderRadius: Radius.pill, padding: 4, marginTop: 18, gap: 2 },
  tabItem: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.surface },
  tabTxt: { fontWeight: '600', fontSize: 13.5, color: Colors.ink2 },
  tabActiveTxt: { color: Colors.ink },
  ingrHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 18 },
  secTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink },
  scaled: { fontSize: 12.5, fontWeight: '700', color: Colors.accentDeep },
  ingrRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.line },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: Colors.line2, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  ingrTxt: { flex: 1, fontSize: 15, color: Colors.ink },
  ingrDone: { color: Colors.ink3, textDecorationLine: 'line-through' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.line },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { fontWeight: '700', fontSize: 14, color: Colors.accentInk },
  stepTxt: { flex: 1, fontSize: 14.5, color: Colors.ink, lineHeight: 22 },
  nutritionCard: { marginTop: 16, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.line, padding: 16 },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  calLabel: { fontWeight: '700', fontSize: 15, color: Colors.ink },
  calVal: { fontSize: 30, fontWeight: '600', color: Colors.ink },
  calUnit: { fontSize: 15, color: Colors.ink2 },
  nutrLabel: { fontSize: 13.5, fontWeight: '600', color: Colors.ink },
  nutrTrack: { height: 6, borderRadius: 99, backgroundColor: Colors.surface2, marginTop: 5, overflow: 'hidden' },
  nutrFill: { height: '100%', borderRadius: 99 },
  notesCard: { marginTop: 18, padding: 15, backgroundColor: '#FFF9EC', borderWidth: 1, borderColor: '#F0E2C0', borderRadius: Radius.lg },
  notesTxt: { fontStyle: 'italic', fontSize: 15.5, color: '#5C4A1E', lineHeight: 23 },
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, paddingHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.93)', borderTopWidth: 1, borderTopColor: Colors.line },
});
